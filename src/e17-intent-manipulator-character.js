import { E15HybridCharacter } from './e15-hybrid-character.js';

function enumValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function clampMagnitude3(vector, maxLength) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= maxLength || length < 1e-12) return [...vector];
  const scale = maxLength / length;
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * E17 intent-first physical manipulator.
 *
 * E16 made the Owner pilot a small solver-owned end effector and required that point
 * mass to physically collide before a grab could exist. Owner evidence says that the
 * indirection is now the dominant problem. E17 flips the contract:
 *
 *   player selects a visible nearby dynamic body + surface point directly;
 *   player supplies a 3D task-space target for that selected anchor;
 *   a finite physical actuator applies +J at the selected object anchor and -J to the
 *   finite-mass embodiment core.
 *
 * Selection is therefore intentional rather than contact-earned, but execution is NOT
 * kinematic. Object motion, leverage, mass, collision and player reaction remain Box3D
 * consequences. The actuator pair conserves total linear momentum of {core + object}
 * before external world contacts, and E15's existing core-consequence bridge maps the
 * physical reaction back to the accepted Donor carrier.
 *
 * This is deliberately an interaction-architecture probe, not a final arm/anatomy.
 */
export class E17IntentManipulatorCharacter extends E15HybridCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);

    this.manipulatorRate = options.manipulatorRate ?? 10;
    this.manipulatorMaxForce = options.manipulatorMaxForce ?? 900;
    this.manipulatorMaxReach = options.manipulatorMaxReach ?? 1.60;
    this.manipulatorAcquireReach = options.manipulatorAcquireReach ?? 1.85;
    this.manipulatorBreakReach = options.manipulatorBreakReach ?? 2.35;

    this.manipulatedBody = null;
    this.manipulatedLocalAnchor = [0, 0, 0];
    this.manipulatedAnchorWorld = [0, 0, 0];
    this.manipulatedAnchorVelocity = [0, 0, 0];
    this.manipulatorRequestedTarget = [...this.bodyPosition];
    this.manipulatorTarget = [...this.bodyPosition];

    this.lastManipulatorImpulse = 0;
    this.lastManipulatorForce = 0;
    this.lastManipulatorError = 0;
    this.lastManipulatorReach = 0;
    this.manipulatorSelectionCount = 0;
    this.manipulatorReleaseCount = 0;
    this.lastManipulatorReleaseReason = null;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this.manipulatedBody = null;
    this.manipulatedLocalAnchor = [0, 0, 0];
    this.manipulatedAnchorWorld = [0, 0, 0];
    this.manipulatedAnchorVelocity = [0, 0, 0];
    this.manipulatorRequestedTarget = [...this.bodyPosition];
    this.manipulatorTarget = [...this.bodyPosition];
    this.lastManipulatorImpulse = 0;
    this.lastManipulatorForce = 0;
    this.lastManipulatorError = 0;
    this.lastManipulatorReach = 0;
    this.manipulatorSelectionCount = 0;
    this.manipulatorReleaseCount = 0;
    this.lastManipulatorReleaseReason = null;
  }

  beginManipulation(body, anchorWorld) {
    if (!body || sameId(body, this.embodimentBody)) return false;
    const type = enumValue(this.b3.b3Body_GetType(body));
    if (type !== enumValue(this.b3.b3BodyType.b3_dynamicBody)) return false;
    if (!Array.isArray(anchorWorld) || anchorWorld.length !== 3 || !anchorWorld.every(Number.isFinite)) {
      return false;
    }

    this._syncBody();
    if (distance3(anchorWorld, this.bodyPosition) > this.manipulatorAcquireReach) return false;

    const mass = this.b3.b3Body_GetMass(body);
    if (!(mass > 0) || !Number.isFinite(mass)) return false;

    this.manipulatedBody = body;
    this.b3.b3Body_GetLocalPoint(this.manipulatedLocalAnchor, body, anchorWorld);
    this.manipulatedAnchorWorld = [...anchorWorld];
    this.manipulatorRequestedTarget = [...anchorWorld];
    this.manipulatorTarget = [...anchorWorld];
    this.lastManipulatorReleaseReason = null;
    this.manipulatorSelectionCount += 1;
    return true;
  }

  setManipulationTarget(targetWorld) {
    if (!Array.isArray(targetWorld) || targetWorld.length !== 3 || !targetWorld.every(Number.isFinite)) {
      return false;
    }
    this.manipulatorRequestedTarget = [...targetWorld];
    return true;
  }

  releaseManipulation(reason = 'owner-release') {
    if (!this.manipulatedBody) return false;
    this.manipulatedBody = null;
    this.lastManipulatorImpulse = 0;
    this.lastManipulatorForce = 0;
    this.lastManipulatorError = 0;
    this.manipulatorReleaseCount += 1;
    this.lastManipulatorReleaseReason = reason;
    return true;
  }

  preStep(dt, intent) {
    super.preStep(dt, intent);
    if (!this.manipulatedBody) {
      this.lastManipulatorImpulse = 0;
      this.lastManipulatorForce = 0;
      this.lastManipulatorError = 0;
      this.lastManipulatorReach = 0;
      return;
    }

    this._syncBody();
    this.b3.b3Body_GetWorldPoint(
      this.manipulatedAnchorWorld,
      this.manipulatedBody,
      this.manipulatedLocalAnchor,
    );
    this.b3.b3Body_GetWorldPointVelocity(
      this.manipulatedAnchorVelocity,
      this.manipulatedBody,
      this.manipulatedAnchorWorld,
    );

    const requestedOffset = [
      this.manipulatorRequestedTarget[0] - this.bodyPosition[0],
      this.manipulatorRequestedTarget[1] - this.bodyPosition[1],
      this.manipulatorRequestedTarget[2] - this.bodyPosition[2],
    ];
    const clampedOffset = clampMagnitude3(requestedOffset, this.manipulatorMaxReach);
    this.manipulatorTarget[0] = this.bodyPosition[0] + clampedOffset[0];
    this.manipulatorTarget[1] = this.bodyPosition[1] + clampedOffset[1];
    this.manipulatorTarget[2] = this.bodyPosition[2] + clampedOffset[2];
    this.lastManipulatorReach = Math.hypot(...clampedOffset);

    const anchorDistance = distance3(this.manipulatedAnchorWorld, this.bodyPosition);
    if (anchorDistance > this.manipulatorBreakReach) {
      this.releaseManipulation('reach-break');
      return;
    }

    const error = [
      this.manipulatorTarget[0] - this.manipulatedAnchorWorld[0],
      this.manipulatorTarget[1] - this.manipulatedAnchorWorld[1],
      this.manipulatorTarget[2] - this.manipulatedAnchorWorld[2],
    ];
    this.lastManipulatorError = Math.hypot(...error);

    const desiredAnchorVelocity = [
      this.manipulatorRate * error[0],
      this.manipulatorRate * error[1],
      this.manipulatorRate * error[2],
    ];
    const requestedAnchorDeltaV = [
      desiredAnchorVelocity[0] - this.manipulatedAnchorVelocity[0],
      desiredAnchorVelocity[1] - this.manipulatedAnchorVelocity[1],
      desiredAnchorVelocity[2] - this.manipulatedAnchorVelocity[2],
    ];

    const objectMass = this.b3.b3Body_GetMass(this.manipulatedBody);
    const effectiveMass = 1 / (1 / objectMass + 1 / this.bodyMass);
    const requestedImpulse = [
      effectiveMass * requestedAnchorDeltaV[0],
      effectiveMass * requestedAnchorDeltaV[1],
      effectiveMass * requestedAnchorDeltaV[2],
    ];
    const impulse = clampMagnitude3(requestedImpulse, this.manipulatorMaxForce * dt);
    this.lastManipulatorImpulse = Math.hypot(...impulse);
    this.lastManipulatorForce = this.lastManipulatorImpulse / Math.max(dt, 1e-9);

    if (this.lastManipulatorImpulse > 1e-9) {
      this.b3.b3Body_ApplyLinearImpulse(
        this.manipulatedBody,
        impulse,
        this.manipulatedAnchorWorld,
        true,
      );
      this.b3.b3Body_ApplyLinearImpulseToCenter(
        this.embodimentBody,
        [-impulse[0], -impulse[1], -impulse[2]],
        true,
      );
    }
  }

  postStep(dt) {
    super.postStep(dt);
    if (!this.manipulatedBody) return;
    this.b3.b3Body_GetWorldPoint(
      this.manipulatedAnchorWorld,
      this.manipulatedBody,
      this.manipulatedLocalAnchor,
    );
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e17-intent-first-manipulator',
      manipulating: Boolean(this.manipulatedBody),
      manipulatedAnchorWorld: [...this.manipulatedAnchorWorld],
      manipulatorRequestedTarget: [...this.manipulatorRequestedTarget],
      manipulatorTarget: [...this.manipulatorTarget],
      manipulatorImpulse: this.lastManipulatorImpulse,
      manipulatorForce: this.lastManipulatorForce,
      manipulatorError: this.lastManipulatorError,
      manipulatorReach: this.lastManipulatorReach,
      manipulatorSelectionCount: this.manipulatorSelectionCount,
      manipulatorReleaseCount: this.manipulatorReleaseCount,
      manipulatorReleaseReason: this.lastManipulatorReleaseReason,
    };
  }
}

export function createE17IntentManipulatorCharacter(b3, world, options = {}) {
  return new E17IntentManipulatorCharacter(b3, world, options);
}
