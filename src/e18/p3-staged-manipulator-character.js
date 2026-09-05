import { E15HybridCharacter } from '../e15-hybrid-character.js';
import { E17PointMassManipulatorCharacter } from '../e17-point-mass-manipulator-character.js';
import { stepCoupledTwoPointActuator } from './p3-coupled-two-point-actuator.js';

function finiteVec3(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, scalar) {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function midpoint3(a, b) {
  return scale3(add3(a, b), 0.5);
}

function length3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function distance3(a, b) {
  return length3(sub3(a, b));
}

function normalize3(v, fallback = [1, 0, 0]) {
  const length = length3(v);
  if (length < 1e-10) return [...fallback];
  return scale3(v, 1 / length);
}

function clampMagnitude3(vector, maxLength) {
  const length = length3(vector);
  if (length <= maxLength || length < 1e-12) return [...vector];
  return scale3(vector, maxLength / length);
}

function rotateAroundAxis(vector, axis, angle) {
  const n = normalize3(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = vector[0] * n[0] + vector[1] * n[1] + vector[2] * n[2];
  const cross = [
    n[1] * vector[2] - n[2] * vector[1],
    n[2] * vector[0] - n[0] * vector[2],
    n[0] * vector[1] - n[1] * vector[0],
  ];
  return [
    vector[0] * c + cross[0] * s + n[0] * dot * (1 - c),
    vector[1] * c + cross[1] * s + n[1] * dot * (1 - c),
    vector[2] * c + cross[2] * s + n[2] * dot * (1 - c),
  ];
}

/**
 * P3.1 staged Owner-facing manipulation character.
 *
 * Rough/default mode deliberately inherits the qualified E17-depth one-point lifecycle.
 * Precision mode replaces only the execution grammar while held: a second virtual local
 * anchor is added and the already-qualified P3 coupled actuator drives the two targets
 * under the SAME total 900 N authority scale.
 *
 * Precision entry captures the current physical pose, so enabling it does not create a
 * target snap. Precision exit returns rough target ownership to the current primary
 * physical anchor, preserving object momentum and avoiding a hidden correction impulse.
 */
export class E18P3StagedManipulatorCharacter extends E17PointMassManipulatorCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);
    this.precisionMinAnchorSeparation = options.precisionMinAnchorSeparation ?? 0.30;
    this._resetPrecisionState();
  }

  _resetPrecisionState() {
    this.precisionActive = false;
    this.precisionLocalAnchor2 = [0, 0, 0];
    this.precisionAnchorWorld2 = [0, 0, 0];
    this.precisionRequestedTarget1 = [0, 0, 0];
    this.precisionRequestedTarget2 = [0, 0, 0];
    this.precisionTarget1 = [0, 0, 0];
    this.precisionTarget2 = [0, 0, 0];
    this.precisionRequestedMidpoint = [0, 0, 0];
    this.precisionTargetMidpoint = [0, 0, 0];
    this.lastPrecisionError1 = 0;
    this.lastPrecisionError2 = 0;
    this.lastPrecisionSaturated = false;
    this.lastPrecisionBudgetScale = 1;
    this.lastPrecisionResidual = 0;
    this.precisionEngagementCount = 0;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this._resetPrecisionState();
  }

  beginManipulation(body, anchorWorld) {
    const acquired = super.beginManipulation(body, anchorWorld);
    if (!acquired) return false;
    this._resetPrecisionState();
    return true;
  }

  releaseManipulation(reason = 'owner-release') {
    if (!this.manipulatedBody) return false;
    this.precisionActive = false;
    return super.releaseManipulation(reason);
  }

  _derivePrecisionSecondAnchor() {
    const worldCom = [0, 0, 0];
    const localCom = [0, 0, 0];
    this.b3.b3Body_GetWorldCenterOfMass(worldCom, this.manipulatedBody);
    this.b3.b3Body_GetLocalPoint(localCom, this.manipulatedBody, worldCom);

    const primaryFromCom = sub3(this.manipulatedLocalAnchor, localCom);
    const primaryRadius = length3(primaryFromCom);
    if (primaryRadius * 2 >= this.precisionMinAnchorSeparation) {
      return sub3(localCom, primaryFromCom);
    }

    const inward = primaryRadius > 1e-8
      ? normalize3(primaryFromCom)
      : [1, 0, 0];
    return sub3(this.manipulatedLocalAnchor, scale3(inward, this.precisionMinAnchorSeparation));
  }

  beginPrecisionManipulation() {
    if (!this.manipulatedBody || this.precisionActive) {
      return this.precisionActive ? [...this.precisionRequestedMidpoint] : null;
    }

    this._syncBody();
    this.b3.b3Body_GetWorldPoint(
      this.manipulatedAnchorWorld,
      this.manipulatedBody,
      this.manipulatedLocalAnchor,
    );
    this.precisionLocalAnchor2 = this._derivePrecisionSecondAnchor();
    this.b3.b3Body_GetWorldPoint(
      this.precisionAnchorWorld2,
      this.manipulatedBody,
      this.precisionLocalAnchor2,
    );

    this.precisionRequestedTarget1 = [...this.manipulatedAnchorWorld];
    this.precisionRequestedTarget2 = [...this.precisionAnchorWorld2];
    this.precisionTarget1 = [...this.manipulatedAnchorWorld];
    this.precisionTarget2 = [...this.precisionAnchorWorld2];
    this.precisionRequestedMidpoint = midpoint3(
      this.precisionRequestedTarget1,
      this.precisionRequestedTarget2,
    );
    this.precisionTargetMidpoint = [...this.precisionRequestedMidpoint];
    this.precisionActive = true;
    this.precisionEngagementCount += 1;
    this.lastPrecisionError1 = 0;
    this.lastPrecisionError2 = 0;
    this.lastPrecisionSaturated = false;
    this.lastPrecisionBudgetScale = 1;
    this.lastPrecisionResidual = 0;
    return [...this.precisionRequestedMidpoint];
  }

  endPrecisionManipulation() {
    if (!this.precisionActive) return null;
    this.precisionActive = false;
    if (!this.manipulatedBody) return null;

    this.b3.b3Body_GetWorldPoint(
      this.manipulatedAnchorWorld,
      this.manipulatedBody,
      this.manipulatedLocalAnchor,
    );
    this.manipulatorRequestedTarget = [...this.manipulatedAnchorWorld];
    this.manipulatorTarget = [...this.manipulatedAnchorWorld];
    this.lastPrecisionSaturated = false;
    return [...this.manipulatedAnchorWorld];
  }

  setManipulationTarget(targetWorld) {
    if (!finiteVec3(targetWorld)) return false;
    if (!this.precisionActive) return super.setManipulationTarget(targetWorld);

    const delta = sub3(targetWorld, this.precisionRequestedMidpoint);
    this.precisionRequestedTarget1 = add3(this.precisionRequestedTarget1, delta);
    this.precisionRequestedTarget2 = add3(this.precisionRequestedTarget2, delta);
    this.precisionRequestedMidpoint = [...targetWorld];
    return true;
  }

  rotatePrecisionTarget(axisWorld, angleRadians) {
    if (!this.precisionActive || !finiteVec3(axisWorld) || !Number.isFinite(angleRadians)) return false;
    if (Math.abs(angleRadians) < 1e-12) return true;

    const midpoint = [...this.precisionRequestedMidpoint];
    const fromMid1 = sub3(this.precisionRequestedTarget1, midpoint);
    const fromMid2 = sub3(this.precisionRequestedTarget2, midpoint);
    this.precisionRequestedTarget1 = add3(midpoint, rotateAroundAxis(fromMid1, axisWorld, angleRadians));
    this.precisionRequestedTarget2 = add3(midpoint, rotateAroundAxis(fromMid2, axisWorld, angleRadians));
    return true;
  }

  manipulationIntentTarget() {
    return this.precisionActive
      ? [...this.precisionRequestedMidpoint]
      : [...this.manipulatorRequestedTarget];
  }

  preStep(dt, intent) {
    if (!this.precisionActive) {
      super.preStep(dt, intent);
      return;
    }

    // Bypass E17 one-point actuation while retaining the exact accepted E15/Donor
    // temporal path. Precision mode applies one and only one P3 coupled actuator below.
    E15HybridCharacter.prototype.preStep.call(this, dt, intent);
    if (!this.manipulatedBody) {
      this.precisionActive = false;
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
    this.b3.b3Body_GetWorldPoint(
      this.precisionAnchorWorld2,
      this.manipulatedBody,
      this.precisionLocalAnchor2,
    );

    const anchorDistance = distance3(this.manipulatedAnchorWorld, this.bodyPosition);
    if (anchorDistance > this.manipulatorBreakReach) {
      this.releaseManipulation('reach-break');
      return;
    }

    const requestedMidpointOffset = sub3(this.precisionRequestedMidpoint, this.bodyPosition);
    const clampedMidpointOffset = clampMagnitude3(requestedMidpointOffset, this.manipulatorMaxReach);
    this.precisionTargetMidpoint = add3(this.bodyPosition, clampedMidpointOffset);
    this.lastManipulatorReach = length3(clampedMidpointOffset);

    const midpointCorrection = sub3(this.precisionTargetMidpoint, this.precisionRequestedMidpoint);
    this.precisionTarget1 = add3(this.precisionRequestedTarget1, midpointCorrection);
    this.precisionTarget2 = add3(this.precisionRequestedTarget2, midpointCorrection);
    this.manipulatorTarget = [...this.precisionTarget1];

    const telemetry = stepCoupledTwoPointActuator({
      b3: this.b3,
      objectBody: this.manipulatedBody,
      coreBody: this.embodimentBody,
      localAnchor1: this.manipulatedLocalAnchor,
      localAnchor2: this.precisionLocalAnchor2,
      targetWorld1: this.precisionTarget1,
      targetWorld2: this.precisionTarget2,
      dt,
      rate: this.manipulatorRate,
      maxForce: this.manipulatorMaxForce,
    });

    this.lastPrecisionError1 = telemetry.error1;
    this.lastPrecisionError2 = telemetry.error2;
    this.lastPrecisionSaturated = telemetry.saturated;
    this.lastPrecisionBudgetScale = telemetry.budgetScale;
    this.lastPrecisionResidual = telemetry.residualNorm;
    this.lastManipulatorError = Math.max(telemetry.error1, telemetry.error2);
    this.lastManipulatorImpulse = telemetry.appliedImpulseSum;
    this.lastManipulatorForce = telemetry.appliedImpulseSum / Math.max(dt, 1e-9);
  }

  postStep(dt) {
    E15HybridCharacter.prototype.postStep.call(this, dt);
    if (!this.manipulatedBody) return;
    this.b3.b3Body_GetWorldPoint(
      this.manipulatedAnchorWorld,
      this.manipulatedBody,
      this.manipulatedLocalAnchor,
    );
    if (this.precisionActive) {
      this.b3.b3Body_GetWorldPoint(
        this.precisionAnchorWorld2,
        this.manipulatedBody,
        this.precisionLocalAnchor2,
      );
    }
  }

  telemetry() {
    const data = super.telemetry();
    return {
      ...data,
      mode: 'e18-p3-staged-manipulator',
      manipulationMode: this.precisionActive ? 'precision-axis' : 'rough-one-point',
      precisionActive: this.precisionActive,
      precisionAnchorWorld2: [...this.precisionAnchorWorld2],
      precisionRequestedTarget1: [...this.precisionRequestedTarget1],
      precisionRequestedTarget2: [...this.precisionRequestedTarget2],
      precisionTarget1: [...this.precisionTarget1],
      precisionTarget2: [...this.precisionTarget2],
      precisionRequestedMidpoint: [...this.precisionRequestedMidpoint],
      precisionTargetMidpoint: [...this.precisionTargetMidpoint],
      precisionError1: this.lastPrecisionError1,
      precisionError2: this.lastPrecisionError2,
      precisionSaturated: this.lastPrecisionSaturated,
      precisionBudgetScale: this.lastPrecisionBudgetScale,
      precisionResidual: this.lastPrecisionResidual,
      precisionEngagementCount: this.precisionEngagementCount,
    };
  }
}

export function createE18P3StagedManipulatorCharacter(b3, world, options = {}) {
  return new E18P3StagedManipulatorCharacter(b3, world, options);
}
