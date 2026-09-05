import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assembleCoupledTwoPointOperator,
  coupledTwoPointResponse,
  estimateMatrixRank,
  matrixSymmetryError,
  multiplyMatrixVector,
  solveCoupledTwoPointImpulse,
} from '../../src/e18/p3-coupled-two-point-kernel.js';

const DT = 1 / 60;
const SHARED_MAX_FORCE = 900;
const SHARED_MAX_IMPULSE = SHARED_MAX_FORCE * DT;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normN(v) {
  return Math.hypot(...v);
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
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

function mulMat3Vec3(matrix, vector) {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ];
}

function torqueFromPair(offset1, impulse1, offset2, impulse2) {
  return add3(cross3(offset1, impulse1), cross3(offset2, impulse2));
}

function maxAbsDelta(a, b) {
  let result = 0;
  for (let i = 0; i < a.length; i++) result = Math.max(result, Math.abs(a[i] - b[i]));
  return result;
}

const objectMass = 20;
const coreMass = 35;
const offset1 = [-0.8, 0, 0];
const offset2 = [0.8, 0, 0];

// Synthetic but physically plausible long-box inverse inertia. Keeping P3.0a free of
// Box3D makes this an algebra/sign/rank qualifier; P3.0b will compare against the real
// Box3D inertia tensor and measured point-velocity response.
const inverseInertiaWorld = [
  [1.875, 0, 0],
  [0, 0.14423076923076922, 0],
  [0, 0, 0.14423076923076922],
];

const operator = assembleCoupledTwoPointOperator({
  objectMass,
  coreMass,
  inverseInertiaWorld,
  offset1,
  offset2,
});

const symmetryError = matrixSymmetryError(operator);
const rank = estimateMatrixRank(operator);
assert.ok(symmetryError < 1e-12, `coupled operator must be symmetric: ${symmetryError}`);
assert.equal(rank, 5, `two noncoincident points should expose rank-5 point-space authority, got ${rank}`);

// Consistency with the already-qualified E17-depth one-point directional formula.
const n = [0, 0, 1];
const rn = cross3(offset1, n);
const expectedDirectionalInverseMass =
  1 / objectMass +
  1 / coreMass +
  dot3(rn, mulMat3Vec3(inverseInertiaWorld, rn));
const operatorDirectionalInverseMass = operator[2][2];
assert.ok(
  Math.abs(expectedDirectionalInverseMass - operatorDirectionalInverseMass) < 1e-12,
  `K11 must reduce to E17-depth directional inverse mass: ${operatorDirectionalInverseMass} vs ${expectedDirectionalInverseMass}`,
);

// Cross-coupling: a point-1 impulse changes point 2 because both share object COM,
// object angular velocity and the reacting core COM.
const crossCouplingResponse = coupledTwoPointResponse(operator, [0, 0, 1], [0, 0, 0]);
assert.ok(norm3(crossCouplingResponse[1]) > 0.01, 'point-1 impulse must measurably change point-2 relative velocity');
assert.ok(
  norm3(sub3(crossCouplingResponse[0], crossCouplingResponse[1])) > 0.05,
  'off-centre angular response should distinguish point-1 and point-2 velocity changes',
);

// Translation mode: equal requested point velocities should use an equal impulse pair,
// preserve essentially zero torque couple and reproduce the reachable target.
const translation = solveCoupledTwoPointImpulse({
  operator,
  desiredDeltaV1: [0, 0, 0.2],
  desiredDeltaV2: [0, 0, 0.2],
});
const translationTorque = torqueFromPair(offset1, translation.impulse1, offset2, translation.impulse2);
assert.ok(norm3(sub3(translation.impulse1, translation.impulse2)) < 1e-8, 'symmetric translation should split impulse symmetrically');
assert.ok(norm3(translationTorque) < 1e-8, `pure translation must not create spurious torque: ${norm3(translationTorque)}`);
assert.ok(translation.residualNorm < 1e-8, `reachable translation residual too large: ${translation.residualNorm}`);

// Axis-rotation mode: rotate the line between anchors around world Y. The point
// velocities are opposite in Z, so the minimum-norm coupled solution should be a
// near-zero-net-force couple with non-zero Y torque.
const axisRotation = solveCoupledTwoPointImpulse({
  operator,
  desiredDeltaV1: [0, 0, 0.2],
  desiredDeltaV2: [0, 0, -0.2],
});
const rotationNetImpulse = add3(axisRotation.impulse1, axisRotation.impulse2);
const rotationTorque = torqueFromPair(offset1, axisRotation.impulse1, offset2, axisRotation.impulse2);
assert.ok(norm3(rotationNetImpulse) < 1e-8, `axis rotation should not require material net translation impulse: ${norm3(rotationNetImpulse)}`);
assert.ok(Math.abs(rotationTorque[1]) > 0.5, `axis rotation must create a material Y torque couple: ${rotationTorque[1]}`);
assert.ok(axisRotation.residualNorm < 1e-8, `reachable axis-rotation residual too large: ${axisRotation.residualNorm}`);

// Dual null mode: equal/opposite impulses along the line joining the anchors are pure
// internal tension. They produce no net wrench and no relative point-velocity change.
const internalTension = [1, 0, 0, -1, 0, 0];
const internalTensionResponse = multiplyMatrixVector(operator, internalTension);
assert.ok(normN(internalTensionResponse) < 1e-12, `connector-axis internal tension must remain null: ${normN(internalTensionResponse)}`);

// Free twist: angular motion around the anchor axis creates zero velocity at both
// points. P3 therefore neither observes nor directly commands this rotational DOF.
const twistOmega = [1, 0, 0];
const twistPointVelocity1 = cross3(twistOmega, offset1);
const twistPointVelocity2 = cross3(twistOmega, offset2);
assert.ok(norm3(twistPointVelocity1) < 1e-12 && norm3(twistPointVelocity2) < 1e-12, 'point pair must leave twist around its own axis unobserved');

// Shared authority: an intentionally huge translation request must saturate one
// combined 900 N budget, not 900 N per point.
const saturated = solveCoupledTwoPointImpulse({
  operator,
  desiredDeltaV1: [0, 0, 20],
  desiredDeltaV2: [0, 0, 20],
  maxImpulseSum: SHARED_MAX_IMPULSE,
});
assert.equal(saturated.saturated, true, 'large P3 task must exercise shared saturation');
assert.ok(
  Math.abs(saturated.appliedImpulseSum - SHARED_MAX_IMPULSE) < 1e-9,
  `shared impulse sum must equal one 900 N frame budget: ${saturated.appliedImpulseSum}`,
);
assert.ok(
  norm3(saturated.impulse1) < SHARED_MAX_IMPULSE && norm3(saturated.impulse2) < SHARED_MAX_IMPULSE,
  'shared budget must not degenerate into two independent full-size actuators',
);

// Coincident points collapse to one physical point (rank 3). An opposite requested
// velocity pair is unreachable. DLS must suppress the null component instead of
// producing an enormous internal impulse that consumes the budget.
const coincidentOperator = assembleCoupledTwoPointOperator({
  objectMass,
  coreMass,
  inverseInertiaWorld,
  offset1: [0.2, 0, 0],
  offset2: [0.2, 0, 0],
});
const coincidentRank = estimateMatrixRank(coincidentOperator);
const coincident = solveCoupledTwoPointImpulse({
  operator: coincidentOperator,
  desiredDeltaV1: [0, 0, 1],
  desiredDeltaV2: [0, 0, -1],
  maxImpulseSum: SHARED_MAX_IMPULSE,
});
assert.equal(coincidentRank, 3, `coincident anchors should collapse operator to rank 3, got ${coincidentRank}`);
assert.ok(coincident.rawImpulseSum < 1e-5, `unreachable coincident differential should be projected out, not amplified: ${coincident.rawImpulseSum}`);
assert.ok(coincident.residualNorm > 1.0, 'unreachable coincident task must remain visibly unresolved');

// Near-coincident geometry is ill-conditioned but must remain finite and obey budget.
const nearCoincidentOperator = assembleCoupledTwoPointOperator({
  objectMass,
  coreMass,
  inverseInertiaWorld,
  offset1: [0.2, 0, 0],
  offset2: [0.20001, 0, 0],
});
const nearCoincident = solveCoupledTwoPointImpulse({
  operator: nearCoincidentOperator,
  desiredDeltaV1: [0, 0, 1],
  desiredDeltaV2: [0, 0, -1],
  maxImpulseSum: SHARED_MAX_IMPULSE,
});
assert.ok([
  ...nearCoincident.impulse1,
  ...nearCoincident.impulse2,
  nearCoincident.residualNorm,
  nearCoincident.lambda,
].every(Number.isFinite), 'near-coincident solve must stay finite');
assert.ok(nearCoincident.appliedImpulseSum <= SHARED_MAX_IMPULSE + 1e-9, 'near-coincident solve must respect shared budget');

const report = {
  schema: 'e18-p3-0a-coupled-kernel-diagnostic-v1',
  boundary: 'Pure algebra qualification for the P3 two-point relative-velocity operator and regularized shared-budget solve. No Box3D stepping, browser input, E17 runtime modification or Owner-facing behavior is included.',
  specimen: {
    objectMass,
    coreMass,
    offset1,
    offset2,
    inverseInertiaWorld,
    sharedMaxForce: SHARED_MAX_FORCE,
    dt: DT,
    sharedMaxImpulse: SHARED_MAX_IMPULSE,
  },
  operator: {
    matrix: operator,
    symmetryError,
    rank,
    expectedDirectionalInverseMass,
    operatorDirectionalInverseMass,
  },
  crossCoupling: {
    impulse1: [0, 0, 1],
    impulse2: [0, 0, 0],
    response1: crossCouplingResponse[0],
    response2: crossCouplingResponse[1],
  },
  translation: {
    impulse1: translation.impulse1,
    impulse2: translation.impulse2,
    torque: translationTorque,
    residualNorm: translation.residualNorm,
    lambda: translation.lambda,
  },
  axisRotation: {
    impulse1: axisRotation.impulse1,
    impulse2: axisRotation.impulse2,
    netImpulse: rotationNetImpulse,
    torque: rotationTorque,
    residualNorm: axisRotation.residualNorm,
    lambda: axisRotation.lambda,
  },
  freeTwist: {
    internalTensionMode: internalTension,
    internalTensionResponseNorm: normN(internalTensionResponse),
    twistOmega,
    twistPointVelocity1,
    twistPointVelocity2,
  },
  saturation: {
    rawImpulseSum: saturated.rawImpulseSum,
    appliedImpulseSum: saturated.appliedImpulseSum,
    budgetScale: saturated.budgetScale,
    impulse1: saturated.impulse1,
    impulse2: saturated.impulse2,
    residualNorm: saturated.residualNorm,
  },
  degenerate: {
    coincidentRank,
    coincidentRawImpulseSum: coincident.rawImpulseSum,
    coincidentResidualNorm: coincident.residualNorm,
    nearCoincidentAppliedImpulseSum: nearCoincident.appliedImpulseSum,
    nearCoincidentResidualNorm: nearCoincident.residualNorm,
    nearCoincidentLambda: nearCoincident.lambda,
  },
  verdict: 'P3_COUPLED_KERNEL_ALGEBRA_QUALIFIED',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
