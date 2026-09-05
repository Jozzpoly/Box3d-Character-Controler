import {
  assembleCoupledTwoPointOperator,
  solveCoupledTwoPointImpulse,
} from './p3-coupled-two-point-kernel.js';

function finiteVec3(vector) {
  return Array.isArray(vector) && vector.length === 3 && vector.every(Number.isFinite);
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, scalar) {
  return [scalar * v[0], scalar * v[1], scalar * v[2]];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function worldPoint(b3, body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function worldPointVelocity(b3, body, point) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, point);
  return out;
}

function worldCenter(b3, body) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(out, body);
  return out;
}

/**
 * One P3.0 actuator step.
 *
 * This deliberately inherits the E17-depth command semantics: requested delta-v is
 * formed from world target error and current object-point world velocity, while the
 * effective response operator includes the equal/opposite finite-core reaction. That
 * keeps P3.0 comparable to the strongest qualified one-point executor instead of
 * silently introducing a new damping/target-velocity model at the same time as the
 * second point.
 *
 * Reach/acquisition/release/browser grammar are intentionally outside this kernel.
 */
export function stepCoupledTwoPointActuator({
  b3,
  objectBody,
  coreBody,
  localAnchor1,
  localAnchor2,
  targetWorld1,
  targetWorld2,
  dt,
  rate = 10,
  maxForce = 900,
  regularizationRelative = 1e-6,
}) {
  if (!b3 || !objectBody || !coreBody) throw new Error('P3 actuator requires Box3D object/core bodies');
  for (const [name, value] of [
    ['localAnchor1', localAnchor1],
    ['localAnchor2', localAnchor2],
    ['targetWorld1', targetWorld1],
    ['targetWorld2', targetWorld2],
  ]) {
    if (!finiteVec3(value)) throw new Error(`${name} must be a finite vec3`);
  }
  if (!(dt > 0) || !Number.isFinite(dt)) throw new Error(`dt must be finite and > 0, got ${dt}`);
  if (!(rate >= 0) || !Number.isFinite(rate)) throw new Error(`rate must be finite and >= 0, got ${rate}`);
  if (!(maxForce >= 0) || !Number.isFinite(maxForce)) throw new Error(`maxForce must be finite and >= 0, got ${maxForce}`);

  const anchorWorld1 = worldPoint(b3, objectBody, localAnchor1);
  const anchorWorld2 = worldPoint(b3, objectBody, localAnchor2);
  const anchorVelocity1 = worldPointVelocity(b3, objectBody, anchorWorld1);
  const anchorVelocity2 = worldPointVelocity(b3, objectBody, anchorWorld2);
  const center = worldCenter(b3, objectBody);
  const offset1 = sub3(anchorWorld1, center);
  const offset2 = sub3(anchorWorld2, center);
  const error1 = sub3(targetWorld1, anchorWorld1);
  const error2 = sub3(targetWorld2, anchorWorld2);
  const desiredVelocity1 = scale3(error1, rate);
  const desiredVelocity2 = scale3(error2, rate);
  const desiredDeltaV1 = sub3(desiredVelocity1, anchorVelocity1);
  const desiredDeltaV2 = sub3(desiredVelocity2, anchorVelocity2);

  const objectMass = b3.b3Body_GetMass(objectBody);
  const coreMass = b3.b3Body_GetMass(coreBody);
  const inverseInertiaWorld = b3.b3Body_GetWorldInverseRotationalInertia(objectBody);
  const operator = assembleCoupledTwoPointOperator({
    objectMass,
    coreMass,
    inverseInertiaWorld,
    offset1,
    offset2,
  });
  const solution = solveCoupledTwoPointImpulse({
    operator,
    desiredDeltaV1,
    desiredDeltaV2,
    maxImpulseSum: maxForce * dt,
    regularizationRelative,
  });

  if (solution.appliedImpulseSum > 1e-12) {
    b3.b3Body_ApplyLinearImpulse(objectBody, solution.impulse1, anchorWorld1, true);
    b3.b3Body_ApplyLinearImpulse(objectBody, solution.impulse2, anchorWorld2, true);
    const reaction = [
      -(solution.impulse1[0] + solution.impulse2[0]),
      -(solution.impulse1[1] + solution.impulse2[1]),
      -(solution.impulse1[2] + solution.impulse2[2]),
    ];
    b3.b3Body_ApplyLinearImpulseToCenter(coreBody, reaction, true);
  }

  return {
    anchorWorld1,
    anchorWorld2,
    targetWorld1: [...targetWorld1],
    targetWorld2: [...targetWorld2],
    error1,
    error2,
    errorNorm1: norm3(error1),
    errorNorm2: norm3(error2),
    desiredDeltaV1,
    desiredDeltaV2,
    impulse1: solution.impulse1,
    impulse2: solution.impulse2,
    rawImpulseSum: solution.rawImpulseSum,
    appliedImpulseSum: solution.appliedImpulseSum,
    budgetScale: solution.budgetScale,
    saturated: solution.saturated,
    solveResidualNorm: solution.residualNorm,
    lambda: solution.lambda,
  };
}
