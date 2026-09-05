import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assembleDualGripRelativeOperator,
  estimateMatrixRank,
  matrixSymmetryError,
  solveDualGripRelativeImpulses,
} from '../../src/e19/dual-grip-relative-kernel.js';
import { assembleCoupledTwoPointOperator } from '../../src/e18/p3-coupled-two-point-kernel.js';

const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
const PLAYER_MASS = 80;
const IDENTITY_INVERSE_INERTIA = [
  [0.08, 0, 0],
  [0, 0.05, 0],
  [0, 0, 0.035],
];

function maxMatrixDelta(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) max = Math.max(max, Math.abs(a[i][j] - b[i][j]));
  }
  return max;
}

function norm(v) {
  return Math.hypot(...v);
}

function staticGrip(key, offset = [0, 0, 0]) {
  return { bodyKey: key, responsive: false, targetOffset: offset };
}

function dynamicGrip(key, offset, inverseMass = 1 / 24, inverseInertiaWorld = IDENTITY_INVERSE_INERTIA) {
  return { bodyKey: key, responsive: true, targetOffset: offset, inverseMass, inverseInertiaWorld };
}

// 1) One static grip must expose only the 80 kg player response, in all three axes.
const oneStatic = assembleDualGripRelativeOperator({
  playerMass: PLAYER_MASS,
  grips: [staticGrip('wall')],
});
const expectedPlayerInvMass = 1 / PLAYER_MASS;
assert.equal(oneStatic.length, 3);
assert.ok(Math.abs(oneStatic[0][0] - expectedPlayerInvMass) < 1e-15);
assert.ok(Math.abs(oneStatic[1][1] - expectedPlayerInvMass) < 1e-15);
assert.ok(Math.abs(oneStatic[2][2] - expectedPlayerInvMass) < 1e-15);
assert.equal(estimateMatrixRank(oneStatic), 3);

// A falling player relative to a fixed grip needs a downward target-side impulse, whose
// opposite reaction is upward on the player. The kernel itself reports target impulse.
const cancelFiveMetresPerSecondFall = solveDualGripRelativeImpulses({
  operator: oneStatic,
  desiredDeltaVs: [[0, -5, 0]],
});
assert.ok(Math.abs(cancelFiveMetresPerSecondFall.impulses[0][1] + 400) < 1e-6);

// 2) One dynamic grip must add body point response to the same player response.
const oneDynamic = assembleDualGripRelativeOperator({
  playerMass: PLAYER_MASS,
  grips: [dynamicGrip('crate', [0.7, 0.2, -0.1])],
});
assert.equal(estimateMatrixRank(oneDynamic), 3);
assert.ok(oneDynamic[0][0] > oneStatic[0][0]);

// 3) Two grips on the SAME dynamic body must collapse exactly to the already-qualified
// P3 operator when its finite core mass is the accepted player virtual mass.
const sameBodyGrips = [
  dynamicGrip('beam', [-0.8, 0.15, 0.12]),
  dynamicGrip('beam', [0.65, -0.08, -0.16]),
];
const sameBody = assembleDualGripRelativeOperator({ playerMass: PLAYER_MASS, grips: sameBodyGrips });
const p3Reference = assembleCoupledTwoPointOperator({
  objectMass: 24,
  coreMass: PLAYER_MASS,
  inverseInertiaWorld: IDENTITY_INVERSE_INERTIA,
  offset1: sameBodyGrips[0].targetOffset,
  offset2: sameBodyGrips[1].targetOffset,
});
const p3EquivalenceError = maxMatrixDelta(sameBody, p3Reference);
assert.ok(p3EquivalenceError < 1e-15, `same-body dual grip diverged from P3 operator: ${p3EquivalenceError}`);
assert.equal(estimateMatrixRank(sameBody), 5);
assert.ok(matrixSymmetryError(sameBody) < 1e-15);

// 4) Two grips on DIFFERENT dynamic bodies should couple only through the player's
// shared inverse mass. Off-diagonal blocks must therefore be exactly 1/m_player * I.
const differentBodies = assembleDualGripRelativeOperator({
  playerMass: PLAYER_MASS,
  grips: [
    dynamicGrip('box-a', [-0.4, 0.1, 0]),
    dynamicGrip('box-b', [0.5, -0.12, 0.2], 1 / 40),
  ],
});
for (let axis = 0; axis < 3; axis++) {
  for (let other = 0; other < 3; other++) {
    const expected = axis === other ? expectedPlayerInvMass : 0;
    assert.ok(Math.abs(differentBodies[axis][3 + other] - expected) < 1e-15);
    assert.ok(Math.abs(differentBodies[3 + axis][other] - expected) < 1e-15);
  }
}
assert.equal(estimateMatrixRank(differentBodies), 6);

// 5) Static + dynamic is the architectural crux: both tasks remain coupled through the
// player, but only the dynamic side adds target-body mobility.
const mixed = assembleDualGripRelativeOperator({
  playerMass: PLAYER_MASS,
  grips: [
    staticGrip('ledge'),
    dynamicGrip('crate', [0.45, 0.1, 0.2]),
  ],
});
assert.equal(estimateMatrixRank(mixed), 6);
assert.ok(mixed[3][3] > mixed[0][0]);
assert.ok(Math.abs(mixed[0][3] - expectedPlayerInvMass) < 1e-15);

// 6) Two static grips share only one translatable player mass. The operator must expose
// rank 3 rather than invent six independent world-anchored DOFs.
const twoStatic = assembleDualGripRelativeOperator({
  playerMass: PLAYER_MASS,
  grips: [staticGrip('left-wall'), staticGrip('right-wall')],
});
assert.equal(estimateMatrixRank(twoStatic), 3);
const commonMotion = solveDualGripRelativeImpulses({
  operator: twoStatic,
  desiredDeltaVs: [[0, -1.5, 0], [0, -1.5, 0]],
});
assert.ok(commonMotion.residualNorm < 1e-8, `common static-grip translation should be solvable: ${commonMotion.residualNorm}`);
const contradictoryMotion = solveDualGripRelativeImpulses({
  operator: twoStatic,
  desiredDeltaVs: [[1, 0, 0], [-1, 0, 0]],
});
assert.ok(contradictoryMotion.residualNorm > 1.3, 'contradictory static grips must remain visibly unsatisfied');
assert.ok(contradictoryMotion.appliedImpulseSum < 1e-6, 'null task should not manufacture huge internal tension');

// 7) Independent semantic hands may have independent finite capacity. Verify that each
// cap is enforced before an optional body-level shared cap.
const hugeRequest = solveDualGripRelativeImpulses({
  operator: differentBodies,
  desiredDeltaVs: [[100, 30, -40], [-80, 50, 70]],
  maxImpulsePerGrip: [15, 15],
  maxImpulseSum: 24,
});
assert.ok(hugeRequest.appliedMagnitudes[0] <= 15 + 1e-9);
assert.ok(hugeRequest.appliedMagnitudes[1] <= 15 + 1e-9);
assert.ok(hugeRequest.appliedImpulseSum <= 24 + 1e-9);
assert.equal(hugeRequest.sharedSaturated, true);

const report = {
  schema: 'e19-0a-unified-relative-grip-kernel-v1',
  boundary: 'Pure algebraic qualifier for a shared player-mass grip relation across static/dynamic and one/two-grip cases. It does not qualify Box3D impulse application, acquisition, climbing feel, hand targets or final strength.',
  playerMass: PLAYER_MASS,
  oneStatic: {
    rank: estimateMatrixRank(oneStatic),
    diagonal: [oneStatic[0][0], oneStatic[1][1], oneStatic[2][2]],
    impulseToCancel5mpsFall: cancelFiveMetresPerSecondFall.impulses[0],
  },
  oneDynamic: {
    rank: estimateMatrixRank(oneDynamic),
    xResponse: oneDynamic[0][0],
  },
  sameDynamicBody: {
    rank: estimateMatrixRank(sameBody),
    p3EquivalenceError,
    symmetryError: matrixSymmetryError(sameBody),
  },
  differentDynamicBodies: {
    rank: estimateMatrixRank(differentBodies),
    crossPlayerCoupling: differentBodies[0][3],
  },
  mixedStaticDynamic: {
    rank: estimateMatrixRank(mixed),
    staticDiagonal: mixed[0][0],
    dynamicDiagonal: mixed[3][3],
    crossPlayerCoupling: mixed[0][3],
  },
  twoStatic: {
    rank: estimateMatrixRank(twoStatic),
    commonResidual: commonMotion.residualNorm,
    contradictoryResidual: contradictoryMotion.residualNorm,
    contradictoryImpulseSum: contradictoryMotion.appliedImpulseSum,
  },
  cappedTwoHandRequest: {
    rawMagnitudes: hugeRequest.rawMagnitudes,
    appliedMagnitudes: hugeRequest.appliedMagnitudes,
    appliedImpulseSum: hugeRequest.appliedImpulseSum,
    perGripSaturated: hugeRequest.perGripSaturated,
    sharedSaturated: hugeRequest.sharedSaturated,
  },
  classification: 'UNIFIED_RELATIVE_GRIP_OPERATOR_ALGEBRAICALLY_COHERENT',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
