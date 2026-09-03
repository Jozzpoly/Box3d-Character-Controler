import { ConstraintVelocityCharacter } from './constraint-velocity-character.js';
import { installVelocityOnlyDynamicContactMemory } from './donor/contact-memory.js';

const IDENTITY_QUAT = [0, 0, 0, 1];

function clampMagnitude3(vector, maxLength) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= maxLength || length < 1e-12) return [...vector];
  const scale = maxLength / length;
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function upFromQuat(q) {
  const [x, y, z, w] = q;
  return [
    2 * (x * y - w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z + w * x),
  ];
}

function finiteVector(vector) {
  return vector.every(Number.isFinite);
}

/**
 * E15 disposable hybrid bridge.
 *
 * The accepted Donor v1 controller remains authoritative for traversal and intent.
 * A separate finite-mass Box3D upper-body mass is driven toward that carrier by
 * bounded linear impulses and bounded upright torque. Its uncommanded horizontal
 * physics response during the world step is fed back into Donor velocity as a
 * bounded perturbation.
 *
 * This deliberately does NOT claim mass-equivalent whole-body physics. It asks a
 * narrower question: can accepted responsive agency coexist with a physical body
 * layer that can lag, rotate, collide, and causally disturb the player?
 */
export class E15HybridCharacter extends ConstraintVelocityCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);

    this.bodyHalf = [...(options.bodyHalf ?? [0.30, 0.42, 0.22])];
    this.bodyMassTarget = options.bodyMass ?? 35;
    this.bodyOffsetY = options.bodyOffsetY ?? 0.72;
    this.followRate = options.followRate ?? 11;
    this.maxFollowAcceleration = options.maxFollowAcceleration ?? 90;
    this.uprightKp = options.uprightKp ?? 950;
    this.uprightKd = options.uprightKd ?? 150;
    this.maxUprightTorque = options.maxUprightTorque ?? 700;
    this.feedbackGain = options.feedbackGain ?? 1;
    this.maxFeedbackDeltaV = options.maxFeedbackDeltaV ?? 0.65;

    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [
      this.position[0],
      this.position[1] + this.bodyOffsetY,
      this.position[2],
    ];
    bodyDef.linearDamping = 0.02;
    bodyDef.angularDamping = 0.08;
    bodyDef.enableSleep = false;
    bodyDef.enableContactRecycling = false;
    this.embodimentBody = b3.b3CreateBody(world, bodyDef);

    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.density = densityForBoxMass(this.bodyMassTarget, this.bodyHalf);
    shapeDef.baseMaterial.friction = options.bodyFriction ?? 0.55;
    shapeDef.baseMaterial.restitution = 0;
    this.embodimentShape = b3.b3CreateBoxShape(
      this.embodimentBody,
      shapeDef,
      this.bodyHalf[0],
      this.bodyHalf[1],
      this.bodyHalf[2],
    );
    this.bodyMass = b3.b3Body_GetMass(this.embodimentBody);

    this.bodyPosition = [0, 0, 0];
    this.bodyVelocity = [0, 0, 0];
    this.bodyRotation = [0, 0, 0, 1];
    this.bodyAngularVelocity = [0, 0, 0];
    this.bodyTarget = [0, 0, 0];
    this._bodyPreSolveVelocity = [0, 0, 0];
    this._bodyContacts = b3.createContactsBuffer();

    this.lastFollowImpulse = 0;
    this.lastUprightTorque = 0;
    this.lastBodyPhysicsImpulse = 0;
    this.lastBodyFeedbackImpulse = 0;
    this.lastBodyContacts = 0;
    this.lastFeedbackClipped = false;
    this.bodyOffsetDistance = 0;
    this.bodyTilt = 0;
    this.peakBodyOffset = 0;
    this.peakBodyTilt = 0;

    this._syncBody();
  }

  reset(position = this.startPosition) {
    super.reset(position);
    if (!this.embodimentBody) return;
    const target = [position[0], position[1] + this.bodyOffsetY, position[2]];
    this.b3.b3Body_SetTransform(this.embodimentBody, target, IDENTITY_QUAT);
    this.b3.b3Body_SetLinearVelocity(this.embodimentBody, [0, 0, 0]);
    this.b3.b3Body_SetAngularVelocity(this.embodimentBody, [0, 0, 0]);
    this.lastFollowImpulse = 0;
    this.lastUprightTorque = 0;
    this.lastBodyPhysicsImpulse = 0;
    this.lastBodyFeedbackImpulse = 0;
    this.lastBodyContacts = 0;
    this.lastFeedbackClipped = false;
    this.bodyOffsetDistance = 0;
    this.bodyTilt = 0;
    this.peakBodyOffset = 0;
    this.peakBodyTilt = 0;
    this._syncBody();
  }

  preStep(dt, intent) {
    super.preStep(dt, intent);
    this._syncBody();

    this.bodyTarget[0] = this.position[0];
    this.bodyTarget[1] = this.position[1] + this.bodyOffsetY;
    this.bodyTarget[2] = this.position[2];

    const error = [
      this.bodyTarget[0] - this.bodyPosition[0],
      this.bodyTarget[1] - this.bodyPosition[1],
      this.bodyTarget[2] - this.bodyPosition[2],
    ];
    const desiredVelocity = [
      this.velocity[0] + this.followRate * error[0],
      this.velocity[1] + this.followRate * error[1],
      this.velocity[2] + this.followRate * error[2],
    ];
    const requestedDeltaV = [
      desiredVelocity[0] - this.bodyVelocity[0],
      desiredVelocity[1] - this.bodyVelocity[1],
      desiredVelocity[2] - this.bodyVelocity[2],
    ];
    const deltaV = clampMagnitude3(requestedDeltaV, this.maxFollowAcceleration * dt);
    const followImpulse = [
      this.bodyMass * deltaV[0],
      this.bodyMass * deltaV[1],
      this.bodyMass * deltaV[2],
    ];
    this.lastFollowImpulse = Math.hypot(...followImpulse);
    if (this.lastFollowImpulse > 1e-9) {
      this.b3.b3Body_ApplyLinearImpulseToCenter(this.embodimentBody, followImpulse, true);
    }

    const up = upFromQuat(this.bodyRotation);
    const correctionAxis = [-up[2], 0, up[0]];
    const requestedTorque = [
      this.uprightKp * correctionAxis[0] - this.uprightKd * this.bodyAngularVelocity[0],
      -this.uprightKd * 0.18 * this.bodyAngularVelocity[1],
      this.uprightKp * correctionAxis[2] - this.uprightKd * this.bodyAngularVelocity[2],
    ];
    const torque = clampMagnitude3(requestedTorque, this.maxUprightTorque);
    this.lastUprightTorque = Math.hypot(...torque);
    if (this.lastUprightTorque > 1e-9) {
      this.b3.b3Body_ApplyAngularImpulse(
        this.embodimentBody,
        [torque[0] * dt, torque[1] * dt, torque[2] * dt],
        true,
      );
    }

    this.b3.b3Body_GetLinearVelocity(this._bodyPreSolveVelocity, this.embodimentBody);
  }

  postStep(dt) {
    super.postStep(dt);
    this._syncBody();

    this.b3.getBodyContactData(this._bodyContacts, this.embodimentBody);
    this.lastBodyContacts = this.b3.getNumContacts(this._bodyContacts);

    const physicsDeltaV = [
      this.bodyVelocity[0] - this._bodyPreSolveVelocity[0],
      this.bodyVelocity[1] - this._bodyPreSolveVelocity[1],
      this.bodyVelocity[2] - this._bodyPreSolveVelocity[2],
    ];
    const horizontalPhysicsImpulse = [
      this.bodyMass * physicsDeltaV[0],
      0,
      this.bodyMass * physicsDeltaV[2],
    ];
    this.lastBodyPhysicsImpulse = Math.hypot(horizontalPhysicsImpulse[0], horizontalPhysicsImpulse[2]);

    const requestedFeedback = [
      this.feedbackGain * horizontalPhysicsImpulse[0] / this.virtualMass,
      0,
      this.feedbackGain * horizontalPhysicsImpulse[2] / this.virtualMass,
    ];
    const feedback = clampMagnitude3(requestedFeedback, this.maxFeedbackDeltaV);
    this.lastFeedbackClipped = Math.hypot(...requestedFeedback) > this.maxFeedbackDeltaV + 1e-12;
    this.lastBodyFeedbackImpulse = this.virtualMass * Math.hypot(feedback[0], feedback[2]);
    this.velocity[0] += feedback[0];
    this.velocity[2] += feedback[2];

    const dx = this.bodyTarget[0] - this.bodyPosition[0];
    const dy = this.bodyTarget[1] - this.bodyPosition[1];
    const dz = this.bodyTarget[2] - this.bodyPosition[2];
    this.bodyOffsetDistance = Math.hypot(dx, dy, dz);
    const up = upFromQuat(this.bodyRotation);
    this.bodyTilt = Math.acos(Math.max(-1, Math.min(1, up[1])));
    this.peakBodyOffset = Math.max(this.peakBodyOffset, this.bodyOffsetDistance);
    this.peakBodyTilt = Math.max(this.peakBodyTilt, this.bodyTilt);

    if (!finiteVector(this.bodyPosition) || !finiteVector(this.bodyVelocity) || !Number.isFinite(this.bodyTilt)) {
      throw new Error('E15 body state became non-finite');
    }
  }

  applyBodyImpulse(impulse, point = null) {
    if (point) {
      this.b3.b3Body_ApplyLinearImpulse(this.embodimentBody, impulse, point, true);
    } else {
      this.b3.b3Body_ApplyLinearImpulseToCenter(this.embodimentBody, impulse, true);
    }
  }

  telemetry() {
    const base = super.telemetry();
    return {
      ...base,
      mode: 'e15-hybrid',
      bodyMass: this.bodyMass,
      bodyOffset: this.bodyOffsetDistance,
      bodyTilt: this.bodyTilt,
      peakBodyOffset: this.peakBodyOffset,
      peakBodyTilt: this.peakBodyTilt,
      bodyContacts: this.lastBodyContacts,
      bodyFollowImpulse: this.lastFollowImpulse,
      bodyUprightTorque: this.lastUprightTorque,
      bodyPhysicsImpulse: this.lastBodyPhysicsImpulse,
      bodyFeedbackImpulse: this.lastBodyFeedbackImpulse,
      bodyFeedbackClipped: this.lastFeedbackClipped,
    };
  }

  _syncBody() {
    this.b3.b3Body_GetPosition(this.bodyPosition, this.embodimentBody);
    this.b3.b3Body_GetLinearVelocity(this.bodyVelocity, this.embodimentBody);
    this.b3.b3Body_GetRotation(this.bodyRotation, this.embodimentBody);
    this.b3.b3Body_GetAngularVelocity(this.bodyAngularVelocity, this.embodimentBody);
  }
}

export function createE15HybridCharacter(b3, world, options = {}) {
  const character = new E15HybridCharacter(b3, world, options);
  return installVelocityOnlyDynamicContactMemory(character);
}
