import { E15HybridCharacter } from './e15-hybrid-character.js';

const E16_EMBODIMENT_CATEGORY = 1n << 63n;

function clampMagnitude3(vector, maxLength) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= maxLength || length < 1e-12) return [...vector];
  const scale = maxLength / length;
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function densityForSphereMass(mass, radius) {
  return mass / ((4 / 3) * Math.PI * radius * radius * radius);
}

function finiteVector(vector) {
  return vector.every(Number.isFinite);
}

/**
 * E16 active-contact-organ topology probe.
 *
 * E15.1 kept Donor agency but Owner free play showed that the physical torso was
 * mostly secondary motion: Donor performed the game and the body reacted afterward.
 * E16 tests a different route to embodiment: give one solver-owned physical part a
 * deliberate task-space capability while keeping ordinary locomotion intact.
 *
 * The end effector is driven relative to the physical core by an INTERNAL actuator:
 * +J is applied to the effector and -J to the core. Therefore actuator motion alone
 * conserves the physical subsystem's total linear momentum.
 *
 * Immediately after all internal/carrier actuation we record the aggregate horizontal
 * momentum of {core + effector}. After the Box3D world step we record it again.
 * Internal impulses cancel in the aggregate. A horizontal delta therefore represents
 * net external world action on the physical subsystem (within this bounded model).
 * That external impulse can be mapped back to the analytical Donor carrier as a
 * separate consequence channel.
 *
 * This is deliberately not a humanoid arm, final anatomy, IK system or production
 * controller. It is a feasibility test for "physical organ owns a capability" and
 * for aggregate momentum accounting that can later scale to several physical parts.
 */
export class E16ActiveContactOrganCharacter extends E15HybridCharacter {
  constructor(b3, world, options = {}) {
    // Disable E15's core-only feedback. E16 owns feedback from aggregate physical
    // subsystem momentum instead, otherwise internal effector/core reactions could be
    // double-counted as external consequence.
    super(b3, world, { ...options, feedbackGain: 0 });

    this.organMassTarget = options.organMass ?? 5;
    this.organRadius = options.organRadius ?? 0.16;
    this.organMotorRate = options.organMotorRate ?? 12;
    this.organMaxMotorForce = options.organMaxMotorForce ?? 360;
    this.organMaxReach = options.organMaxReach ?? 0.9;
    this.subsystemFeedbackGain = options.subsystemFeedbackGain ?? 1;
    this.maxSubsystemFeedbackDeltaV = options.maxSubsystemFeedbackDeltaV ?? 0.65;
    this.organTargetOffset = [...(options.organTargetOffset ?? [0.42, 0, 0])];

    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [
      this.bodyPosition[0] + this.organTargetOffset[0],
      this.bodyPosition[1] + this.organTargetOffset[1],
      this.bodyPosition[2] + this.organTargetOffset[2],
    ];
    bodyDef.linearDamping = 0;
    bodyDef.angularDamping = 0.04;
    bodyDef.enableSleep = false;
    bodyDef.enableContactRecycling = false;
    this.organBody = b3.b3CreateBody(world, bodyDef);

    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.density = densityForSphereMass(this.organMassTarget, this.organRadius);
    shapeDef.baseMaterial.friction = options.organFriction ?? 0.55;
    shapeDef.baseMaterial.restitution = options.organRestitution ?? 0.02;
    shapeDef.filter.categoryBits = E16_EMBODIMENT_CATEGORY;
    // Do not let the physical organ collide with the physical core. Both are parts of
    // the same bounded embodiment subsystem; their interaction is owned by the
    // explicit internal actuator below. They continue to collide normally with the
    // default world because world shapes use the default all-bits category.
    shapeDef.filter.maskBits &= ~E16_EMBODIMENT_CATEGORY;
    this.organShape = b3.b3CreateSphereShape(
      this.organBody,
      shapeDef,
      { center: [0, 0, 0], radius: this.organRadius },
    );
    this.organMass = b3.b3Body_GetMass(this.organBody);

    this.organPosition = [0, 0, 0];
    this.organVelocity = [0, 0, 0];
    this.organTarget = [0, 0, 0];
    this._organContacts = b3.createContactsBuffer();
    this._aggregatePreSolveMomentum = [0, 0, 0];

    this.lastOrganMotorImpulse = 0;
    this.lastOrganContacts = 0;
    this.lastAggregateWorldImpulse = [0, 0, 0];
    this.lastAggregateWorldImpulseMagnitude = 0;
    this.lastSubsystemFeedbackImpulse = 0;
    this.lastSubsystemFeedbackClipped = false;
    this.lastOrganTargetError = 0;
    this.peakOrganTargetError = 0;
    this._subsystemContactActive = false;
    this.subsystemContactEpisodes = 0;
    this.lastSubsystemFeedbackPersistent = false;
    this.lastPersistentSubsystemFeedbackImpulse = 0;
    this.lastConstraintSubsystemFeedbackImpulse = 0;

    this._syncOrgan();
    this._recordAggregatePreSolveMomentum();
  }

  setOrganTargetOffset(offset) {
    const requested = [...offset];
    const length = Math.hypot(requested[0], requested[1], requested[2]);
    if (length > this.organMaxReach && length > 1e-12) {
      const scale = this.organMaxReach / length;
      requested[0] *= scale;
      requested[1] *= scale;
      requested[2] *= scale;
    }
    this.organTargetOffset = requested;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    if (!this.organBody) return;
    const target = [
      this.bodyPosition[0] + this.organTargetOffset[0],
      this.bodyPosition[1] + this.organTargetOffset[1],
      this.bodyPosition[2] + this.organTargetOffset[2],
    ];
    this.b3.b3Body_SetTransform(this.organBody, target, [0, 0, 0, 1]);
    this.b3.b3Body_SetLinearVelocity(this.organBody, [0, 0, 0]);
    this.b3.b3Body_SetAngularVelocity(this.organBody, [0, 0, 0]);
    this.lastOrganMotorImpulse = 0;
    this.lastOrganContacts = 0;
    this.lastAggregateWorldImpulse = [0, 0, 0];
    this.lastAggregateWorldImpulseMagnitude = 0;
    this.lastSubsystemFeedbackImpulse = 0;
    this.lastSubsystemFeedbackClipped = false;
    this.lastOrganTargetError = 0;
    this.peakOrganTargetError = 0;
    this._subsystemContactActive = false;
    this.subsystemContactEpisodes = 0;
    this.lastSubsystemFeedbackPersistent = false;
    this.lastPersistentSubsystemFeedbackImpulse = 0;
    this.lastConstraintSubsystemFeedbackImpulse = 0;
    this._syncOrgan();
    this._recordAggregatePreSolveMomentum();
  }

  preStep(dt, intent) {
    super.preStep(dt, intent);
    this._syncBody();
    this._syncOrgan();

    this.organTarget[0] = this.bodyPosition[0] + this.organTargetOffset[0];
    this.organTarget[1] = this.bodyPosition[1] + this.organTargetOffset[1];
    this.organTarget[2] = this.bodyPosition[2] + this.organTargetOffset[2];

    const error = [
      this.organTarget[0] - this.organPosition[0],
      this.organTarget[1] - this.organPosition[1],
      this.organTarget[2] - this.organPosition[2],
    ];
    this.lastOrganTargetError = Math.hypot(...error);
    this.peakOrganTargetError = Math.max(this.peakOrganTargetError, this.lastOrganTargetError);

    // Relative task-space control. Desired relative velocity is proportional to the
    // organ/core positional error. The impulse pair is solved against reduced mass so
    // +J/-J creates the requested RELATIVE velocity change while conserving total
    // subsystem linear momentum.
    const relativeVelocity = [
      this.organVelocity[0] - this.bodyVelocity[0],
      this.organVelocity[1] - this.bodyVelocity[1],
      this.organVelocity[2] - this.bodyVelocity[2],
    ];
    const desiredRelativeVelocity = [
      this.organMotorRate * error[0],
      this.organMotorRate * error[1],
      this.organMotorRate * error[2],
    ];
    const requestedRelativeDeltaV = [
      desiredRelativeVelocity[0] - relativeVelocity[0],
      desiredRelativeVelocity[1] - relativeVelocity[1],
      desiredRelativeVelocity[2] - relativeVelocity[2],
    ];

    const effectiveMass = 1 / (1 / this.organMass + 1 / this.bodyMass);
    const requestedImpulse = [
      effectiveMass * requestedRelativeDeltaV[0],
      effectiveMass * requestedRelativeDeltaV[1],
      effectiveMass * requestedRelativeDeltaV[2],
    ];
    const impulse = clampMagnitude3(requestedImpulse, this.organMaxMotorForce * dt);
    this.lastOrganMotorImpulse = Math.hypot(...impulse);

    if (this.lastOrganMotorImpulse > 1e-9) {
      this.b3.b3Body_ApplyLinearImpulseToCenter(this.organBody, impulse, true);
      this.b3.b3Body_ApplyLinearImpulseToCenter(
        this.embodimentBody,
        [-impulse[0], -impulse[1], -impulse[2]],
        true,
      );
    }

    // Important ordering: record AFTER all carrier-follow and internal organ actuation,
    // immediately before the world step. Internal commands are therefore part of the
    // baseline and cannot masquerade as external world impulse.
    this._syncBody();
    this._syncOrgan();
    this._recordAggregatePreSolveMomentum();
  }

  postStep(dt) {
    // Parent keeps Donor movement semantics and records core contact state, but core-only
    // body feedback is disabled in the constructor. E16 applies only aggregate subsystem
    // feedback below.
    super.postStep(dt);
    this._syncOrgan();
    this.b3.getBodyContactData(this._organContacts, this.organBody);
    this.lastOrganContacts = this.b3.getNumContacts(this._organContacts);

    const aggregatePost = [
      this.bodyMass * this.bodyVelocity[0] + this.organMass * this.organVelocity[0],
      this.bodyMass * this.bodyVelocity[1] + this.organMass * this.organVelocity[1],
      this.bodyMass * this.bodyVelocity[2] + this.organMass * this.organVelocity[2],
    ];
    this.lastAggregateWorldImpulse = [
      aggregatePost[0] - this._aggregatePreSolveMomentum[0],
      0,
      aggregatePost[2] - this._aggregatePreSolveMomentum[2],
    ];
    this.lastAggregateWorldImpulseMagnitude = Math.hypot(
      this.lastAggregateWorldImpulse[0],
      this.lastAggregateWorldImpulse[2],
    );

    const requestedFeedback = [
      this.subsystemFeedbackGain * this.lastAggregateWorldImpulse[0] / this.virtualMass,
      0,
      this.subsystemFeedbackGain * this.lastAggregateWorldImpulse[2] / this.virtualMass,
    ];
    const feedback = clampMagnitude3(requestedFeedback, this.maxSubsystemFeedbackDeltaV);
    const feedbackMagnitude = Math.hypot(feedback[0], feedback[2]);
    this.lastSubsystemFeedbackClipped = Math.hypot(...requestedFeedback) >
      this.maxSubsystemFeedbackDeltaV + 1e-12;
    this.lastSubsystemFeedbackImpulse = this.virtualMass * feedbackMagnitude;

    const inContact = this.lastBodyContacts > 0 || this.lastOrganContacts > 0;
    const contactStarted = inContact && !this._subsystemContactActive;
    if (contactStarted) this.subsystemContactEpisodes += 1;
    const persistent = feedbackMagnitude > 1e-12 && (!inContact || contactStarted);
    this.lastSubsystemFeedbackPersistent = persistent;
    this.lastPersistentSubsystemFeedbackImpulse = persistent ? this.lastSubsystemFeedbackImpulse : 0;
    this.lastConstraintSubsystemFeedbackImpulse = inContact && !contactStarted
      ? this.lastSubsystemFeedbackImpulse
      : 0;

    this.velocity[0] += feedback[0];
    this.velocity[2] += feedback[2];
    if (persistent) {
      this.externalVelocity[0] += feedback[0];
      this.externalVelocity[2] += feedback[2];
    }
    this._subsystemContactActive = inContact;

    if (!finiteVector(this.organPosition) || !finiteVector(this.organVelocity)) {
      throw new Error('E16 organ state became non-finite');
    }
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e16-active-contact-organ',
      organMass: this.organMass,
      organPosition: [...this.organPosition],
      organVelocity: [...this.organVelocity],
      organTarget: [...this.organTarget],
      organTargetOffset: [...this.organTargetOffset],
      organTargetError: this.lastOrganTargetError,
      peakOrganTargetError: this.peakOrganTargetError,
      organMotorImpulse: this.lastOrganMotorImpulse,
      organContacts: this.lastOrganContacts,
      aggregateWorldImpulse: [...this.lastAggregateWorldImpulse],
      aggregateWorldImpulseMagnitude: this.lastAggregateWorldImpulseMagnitude,
      subsystemFeedbackImpulse: this.lastSubsystemFeedbackImpulse,
      subsystemFeedbackPersistent: this.lastSubsystemFeedbackPersistent,
      persistentSubsystemFeedbackImpulse: this.lastPersistentSubsystemFeedbackImpulse,
      constraintSubsystemFeedbackImpulse: this.lastConstraintSubsystemFeedbackImpulse,
      subsystemContactEpisodes: this.subsystemContactEpisodes,
      subsystemFeedbackClipped: this.lastSubsystemFeedbackClipped,
    };
  }

  _recordAggregatePreSolveMomentum() {
    this._aggregatePreSolveMomentum[0] =
      this.bodyMass * this.bodyVelocity[0] + this.organMass * this.organVelocity[0];
    this._aggregatePreSolveMomentum[1] =
      this.bodyMass * this.bodyVelocity[1] + this.organMass * this.organVelocity[1];
    this._aggregatePreSolveMomentum[2] =
      this.bodyMass * this.bodyVelocity[2] + this.organMass * this.organVelocity[2];
  }

  _syncOrgan() {
    this.b3.b3Body_GetPosition(this.organPosition, this.organBody);
    this.b3.b3Body_GetLinearVelocity(this.organVelocity, this.organBody);
  }
}

export function createE16ActiveContactOrganCharacter(b3, world, options = {}) {
  return new E16ActiveContactOrganCharacter(b3, world, options);
}
