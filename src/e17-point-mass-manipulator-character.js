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

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function mulMatrix3Columns(matrix, vector) {
  return [
    matrix.cx[0] * vector[0] + matrix.cy[0] * vector[1] + matrix.cz[0] * vector[2],
    matrix.cx[1] * vector[0] + matrix.cy[1] * vector[1] + matrix.cz[1] * vector[2],
    matrix.cx[2] * vector[0] + matrix.cy[2] * vector[1] + matrix.cz[2] * vector[2],
  ];
}

/**
 * E17-depth: same one-point intent-first manipulation grammar as E17, but the actuator
 * uses the directional effective mass of the grabbed rigid-body point rather than a
 * scalar reduced mass based only on object/core linear mass.
 *
 * No orientation target, damping, extra grip, stronger force budget or new input is
 * introduced. Off-centre leverage remains physical because +J is still applied at the
 * exact clicked surface point. The only change is how much J is requested for a desired
 * relative point velocity change.
 */
export class E17PointMassManipulatorCharacter extends E15HybridCharacter {
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
    this.lastManipulatorPointEffectiveMass = 0;
    this.lastManipulatorScalarEffectiveMass = 0;
    this.lastManipulatorEffectiveMassRatio = 1;
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
    this.lastManipulatorPointEffectiveMass = 0;
    this.lastManipulatorScalarEffectiveMass = 0;
    this.lastManipulatorEffectiveMassRatio = 1;
    this.manipulatorSelectionCount = 0;
    this.manipulatorReleaseCount = 0;
    this.lastManipulatorReleaseReason = null;
  }

  beginManipulation(body, anchorWorld) {
    if (!body || sameId(body, this.embodimentBody)) return false;
    const type = enumValue(this.b3.b3Body_GetType(body));
    if (type !== enumValue(this.b3.b3BodyType.b3_dynamicBody)) return false;
    if (!Array.isArray(anchorWorld) || anchorWorld.length !== 3 || !anchorWorld.every(Number.isFinite)) return false;

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
    if (!Array.isArray(targetWorld) || targetWorld.length !== 3 || !targetWorld.every(Number.isFinite)) return false;
    this.manipulatorRequestedTarget = [...targetWorld];
    return true;
  }

  releaseManipulation(reason = 'owner-release') {
    if (!this.manipulatedBody) return false;
    this.manipulatedBody = null;
    this.lastManipulatorImpulse = 0;
    this.lastManipulatorForce = 0;
    this.lastManipulatorError = 0;
    this.lastManipulatorPointEffectiveMass = 0;
    this.lastManipulatorScalarEffectiveMass = 0;
    this.lastManipulatorEffectiveMassRatio = 1;
    this.manipulatorReleaseCount += 1;
    this.lastManipulatorReleaseReason = reason;
    return true;
  }

  _directionalPointEffectiveMass(deltaV) {
    const deltaSpeed = Math.hypot(...deltaV);
    const objectMass = this.b3.b3Body_GetMass(this.manipulatedBody);
    const scalarMass = 1 / (1 / objectMass + 1 / this.bodyMass);
    this.lastManipulatorScalarEffectiveMass = scalarMass;

    if (deltaSpeed < 1e-10) {
      this.lastManipulatorPointEffectiveMass = scalarMass;
      this.lastManipulatorEffectiveMassRatio = 1;
      return scalarMass;
    }

    const n = [deltaV[0] / deltaSpeed, deltaV[1] / deltaSpeed, deltaV[2] / deltaSpeed];
    const center = [0, 0, 0];
    this.b3.b3Body_GetWorldCenterOfMass(center, this.manipulatedBody);
    const r = [
      this.manipulatedAnchorWorld[0] - center[0],
      this.manipulatedAnchorWorld[1] - center[1],
      this.manipulatedAnchorWorld[2] - center[2],
    ];
    const rn = cross3(r, n);
    const inverseInertia = this.b3.b3Body_GetWorldInverseRotationalInertia(this.manipulatedBody);
    const inverseInertiaRn = mulMatrix3Columns(inverseInertia, rn);
    const rotational = Math.max(0, dot3(rn, inverseInertiaRn));
    const k = 1 / objectMass + 1 / this.bodyMass + rotational;
    const pointMass = k > 1e-12 ? 1 / k : scalarMass;

    this.lastManipulatorPointEffectiveMass = pointMass;
    this.lastManipulatorEffectiveMassRatio = pointMass > 1e-12 ? scalarMass / pointMass : 1;
    return pointMass;
  }

  preStep(dt, intent) {
    super.preStep(dt, intent);
    if (!this.manipulatedBody) {
      this.lastManipulatorImpulse = 0;
      this.lastManipulatorForce = 0;
      this.lastManipulatorError = 0;
      this.lastManipulatorReach = 0;
      this.lastManipulatorPointEffectiveMass = 0;
      this.lastManipulatorScalarEffectiveMass = 0;
      this.lastManipulatorEffectiveMassRatio = 1;
      return;
    }

    this._syncBody();
    this.b3.b3Body_GetWorldPoint(this.manipulatedAnchorWorld, this.manipulatedBody, this.manipulatedLocalAnchor);
    this.b3.b3Body_GetWorldPointVelocity(this.manipulatedAnchorVelocity, this.manipulatedBody, this.manipulatedAnchorWorld);

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

    if (distance3(this.manipulatedAnchorWorld, this.bodyPosition) > this.manipulatorBreakReach) {
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

    const pointEffectiveMass = this._directionalPointEffectiveMass(requestedAnchorDeltaV);
    const requestedImpulse = [
      pointEffectiveMass * requestedAnchorDeltaV[0],
      pointEffectiveMass * requestedAnchorDeltaV[1],
      pointEffectiveMass * requestedAnchorDeltaV[2],
    ];
    const impulse = clampMagnitude3(requestedImpulse, this.manipulatorMaxForce * dt);
    this.lastManipulatorImpulse = Math.hypot(...impulse);
    this.lastManipulatorForce = this.lastManipulatorImpulse / Math.max(dt, 1e-9);

    if (this.lastManipulatorImpulse > 1e-9) {
      this.b3.b3Body_ApplyLinearImpulse(this.manipulatedBody, impulse, this.manipulatedAnchorWorld, true);
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
    this.b3.b3Body_GetWorldPoint(this.manipulatedAnchorWorld, this.manipulatedBody, this.manipulatedLocalAnchor);
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e17-point-mass-manipulator',
      manipulating: Boolean(this.manipulatedBody),
      manipulatedAnchorWorld: [...this.manipulatedAnchorWorld],
      manipulatorRequestedTarget: [...this.manipulatorRequestedTarget],
      manipulatorTarget: [...this.manipulatorTarget],
      manipulatorImpulse: this.lastManipulatorImpulse,
      manipulatorForce: this.lastManipulatorForce,
      manipulatorError: this.lastManipulatorError,
      manipulatorReach: this.lastManipulatorReach,
      manipulatorPointEffectiveMass: this.lastManipulatorPointEffectiveMass,
      manipulatorScalarEffectiveMass: this.lastManipulatorScalarEffectiveMass,
      manipulatorEffectiveMassRatio: this.lastManipulatorEffectiveMassRatio,
      manipulatorSelectionCount: this.manipulatorSelectionCount,
      manipulatorReleaseCount: this.manipulatorReleaseCount,
      manipulatorReleaseReason: this.lastManipulatorReleaseReason,
    };
  }
}

export function createE17PointMassManipulatorCharacter(b3, world, options = {}) {
  return new E17PointMassManipulatorCharacter(b3, world, options);
}
