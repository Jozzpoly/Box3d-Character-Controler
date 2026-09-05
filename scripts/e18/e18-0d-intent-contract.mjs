import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyManipulationCameraDelta,
  applyManipulationWorldDelta,
  cameraRelativeManipulationDelta,
  createManipulationIntent,
  snapshotManipulationIntent,
  transportManipulationIntent,
} from '../../src/e18/manipulation-intent.js';

const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
const EPS = 1e-12;

function near(a, b, epsilon = EPS) {
  return Math.abs(a - b) <= epsilon;
}

function vectorNear(actual, expected, label, epsilon = EPS) {
  assert.equal(actual.length, expected.length, `${label}: vector length`);
  for (let i = 0; i < actual.length; i++) {
    assert.ok(
      near(actual[i], expected[i], epsilon),
      `${label}[${i}]: expected ${expected[i]}, got ${actual[i]}`,
    );
  }
}

function offset(target, origin) {
  return [target[0] - origin[0], target[1] - origin[1], target[2] - origin[2]];
}

const checks = [];
function pass(name, evidence) {
  checks.push({ name, pass: true, evidence });
}

// 1. Acquisition stores exact world intent and independent copies.
const acquired = createManipulationIntent({
  targetWorld: [0.65, 0.50, -0.65],
  transportOriginWorld: [0, 0.895, 0],
});
vectorNear(acquired.targetWorld, [0.65, 0.50, -0.65], 'acquisition target');
vectorNear(acquired.transportOriginWorld, [0, 0.895, 0], 'acquisition origin');
pass('acquisition-preserves-explicit-world-target', snapshotManipulationIntent(acquired));

// 2. Transport must be isotropic: moving the chosen frame by a delta moves the
// requested target by exactly the same delta, preserving target-relative offset.
const initialOffset = offset(acquired.targetWorld, acquired.transportOriginWorld);
transportManipulationIntent(acquired, [0, 0.895, -2]);
vectorNear(acquired.targetWorld, [0.65, 0.50, -2.65], 'forward transport target');
vectorNear(offset(acquired.targetWorld, acquired.transportOriginWorld), initialOffset, 'forward preserved offset');
const afterForward = snapshotManipulationIntent(acquired);

transportManipulationIntent(acquired, [2, 0.895, -2]);
vectorNear(acquired.targetWorld, [2.65, 0.50, -2.65], 'right transport target');
vectorNear(offset(acquired.targetWorld, acquired.transportOriginWorld), initialOffset, 'right preserved offset');
pass('transport-is-exact-and-direction-independent', {
  initialOffset,
  afterForward,
  afterRight: snapshotManipulationIntent(acquired),
});

// 3. Camera observation alone has no state path. Computing a new basis-derived delta
// without explicitly applying it must leave intent unchanged.
const beforePassiveCameraChange = snapshotManipulationIntent(acquired);
const unusedDelta = cameraRelativeManipulationDelta({
  right: [Math.SQRT1_2, 0, -Math.SQRT1_2],
  up: [0, 1, 0],
  forward: [-Math.SQRT1_2, 0, -Math.SQRT1_2],
  lateral: 0,
  vertical: 0,
  depth: 0,
});
vectorNear(unusedDelta, [0, 0, 0], 'zero explicit camera command');
assert.deepEqual(snapshotManipulationIntent(acquired), beforePassiveCameraChange);
pass('camera-change-without-explicit-command-is-inert', {
  before: beforePassiveCameraChange,
  after: snapshotManipulationIntent(acquired),
});

// 4. Explicit camera-relative command maps into world metres only when requested.
const mapped = cameraRelativeManipulationDelta({
  right: [0, 0, -1],
  up: [0, 1, 0],
  forward: [-1, 0, 0],
  lateral: 0.30,
  vertical: 0.20,
  depth: -0.40,
});
vectorNear(mapped, [0.40, 0.20, -0.30], 'camera-relative world mapping');
const beforeExplicitCameraCommand = snapshotManipulationIntent(acquired).targetWorld;
applyManipulationCameraDelta(acquired, {
  right: [0, 0, -1],
  up: [0, 1, 0],
  forward: [-1, 0, 0],
  lateral: 0.30,
  vertical: 0.20,
  depth: -0.40,
});
vectorNear(
  acquired.targetWorld,
  [
    beforeExplicitCameraCommand[0] + 0.40,
    beforeExplicitCameraCommand[1] + 0.20,
    beforeExplicitCameraCommand[2] - 0.30,
  ],
  'explicit camera command application',
);
pass('camera-relative-input-is-explicit-world-delta', {
  mappedDelta: mapped,
  targetAfter: [...acquired.targetWorld],
});

// 5. Transport and deliberate input compose additively rather than rewriting frames.
const compositional = createManipulationIntent({
  targetWorld: [1, 2, 3],
  transportOriginWorld: [0, 0, 0],
});
transportManipulationIntent(compositional, [2, -1, 4]);
applyManipulationWorldDelta(compositional, [0.25, 0.50, -0.75]);
vectorNear(compositional.targetWorld, [3.25, 1.50, 6.25], 'transport plus input');
vectorNear(compositional.transportOriginWorld, [2, -1, 4], 'origin after composition');
pass('transport-and-deliberate-input-compose-additively', snapshotManipulationIntent(compositional));

// 6. Intent is deliberately unconstrained by physical reach. A huge requested delta
// must survive untouched so task/executor feasibility remains a separate layer.
const unconstrained = createManipulationIntent({
  targetWorld: [0, 0, 0],
  transportOriginWorld: [0, 0, 0],
});
applyManipulationWorldDelta(unconstrained, [100, -50, 25]);
vectorNear(unconstrained.targetWorld, [100, -50, 25], 'unclamped raw intent');
pass('raw-intent-does-not-own-physical-reach-or-force-limits', snapshotManipulationIntent(unconstrained));

// 7. Snapshots are value copies, preventing diagnostics/UI from mutating live intent.
const snapshot = snapshotManipulationIntent(unconstrained);
snapshot.targetWorld[0] = -999;
snapshot.transportOriginWorld[1] = -999;
vectorNear(unconstrained.targetWorld, [100, -50, 25], 'snapshot target alias protection');
vectorNear(unconstrained.transportOriginWorld, [0, 0, 0], 'snapshot origin alias protection');
pass('snapshot-is-non-aliasing', snapshotManipulationIntent(unconstrained));

// 8. Reject malformed/non-finite state before it can contaminate later diagnostics.
assert.throws(
  () => createManipulationIntent({ targetWorld: [0, Number.NaN, 0], transportOriginWorld: [0, 0, 0] }),
  /finite/,
);
assert.throws(
  () => applyManipulationWorldDelta(unconstrained, [Infinity, 0, 0]),
  /finite/,
);
pass('invalid-intent-input-is-rejected', { malformedVectorsRejected: true });

const report = {
  schema: 'e18-0d-manipulation-intent-contract-v0',
  boundary: 'Pure intent-state qualification only. No Box3D, DOM, Three.js, reach policy, force policy, input sensitivity or final carry-frame choice is established here. The caller still owns which physical/player origin is used as transportOriginWorld.',
  checkCount: checks.length,
  checks,
  verdict: 'PASS',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
