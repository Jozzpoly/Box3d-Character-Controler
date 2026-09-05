import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import {
  E19ContactGripCandidateTracker,
  e19IdKey,
} from '../../src/e19/contact-grip-candidates.js';
import { rankE19GripCandidates } from '../../src/e19/grip-candidate-ranking.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createBox(world, { type = 'static', position, half, density = 8 }) {
  const bodyDef = b3.b3DefaultBodyDef();
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = type === 'dynamic' ? density : 0;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, shape };
}

function selectedSummary(result) {
  if (!result.bestEntry) return null;
  const entry = result.bestEntry;
  return {
    bodyKey: entry.candidate.otherBodyKey,
    shapeKey: entry.candidate.otherShapeKey,
    anchor: [...entry.candidate.otherAnchorWorld],
    score: entry.score,
    distance: entry.distance,
    aimAlignment: entry.aimAlignment,
    surfaceAlignment: entry.surfaceAlignment,
    reachScore: entry.reachScore,
    contactScore: entry.contactScore,
    stableGeometryKey: entry.stableGeometryKey,
  };
}

const world = makeWorld();
const left = createBox(world, {
  position: [-0.60, 1, 0],
  half: [0.25, 0.62, 0.62],
});
const right = createBox(world, {
  position: [0.60, 1, 0],
  half: [0.25, 0.62, 0.62],
});
const probe = createBox(world, {
  type: 'dynamic',
  position: [0, 1, 0],
  half: [0.36, 0.26, 0.26],
  density: 8,
});

// Symmetric 1 cm overlap gives the diagnostic probe simultaneous physically-earned
// contact with left and right surfaces. The ranker must decide only among this truth set.
b3.b3World_Step(world, DT, SUBSTEPS);
const tracker = new E19ContactGripCandidateTracker({
  b3,
  probeBody: probe.body,
  probeShape: probe.shape,
});
const candidates = tracker.refresh();
const bodyKeys = [...new Set(candidates.map((candidate) => candidate.otherBodyKey))];
const leftKey = e19IdKey(left.body);
const rightKey = e19IdKey(right.body);
assert.ok(bodyKeys.includes(leftKey), `competing scene lacks left contact: ${JSON.stringify(bodyKeys)}`);
assert.ok(bodyKeys.includes(rightKey), `competing scene lacks right contact: ${JSON.stringify(bodyKeys)}`);

const common = {
  candidates,
  reachOrigin: [0, 1, 0],
  maxReach: 0.9,
  minAimAlignment: 0.15,
  minSurfaceAlignment: 0.25,
};

const aimRight = rankE19GripCandidates({
  ...common,
  reachDirection: [1, 0, 0],
});
const aimLeft = rankE19GripCandidates({
  ...common,
  reachDirection: [-1, 0, 0],
});
assert.equal(aimRight.best?.otherBodyKey, rightKey, 'rightward intent did not select right physical contact');
assert.equal(aimLeft.best?.otherBodyKey, leftKey, 'leftward intent did not select left physical contact');

// Reversing the physics candidate array must not change the selected physical anchor.
// Ranking may inspect candidate content, never manifold enumeration order.
const reversedRight = rankE19GripCandidates({
  ...common,
  candidates: [...candidates].reverse(),
  reachDirection: [1, 0, 0],
});
assert.equal(reversedRight.best?.otherBodyKey, aimRight.best?.otherBodyKey);
assert.equal(
  reversedRight.bestEntry?.stableGeometryKey,
  aimRight.bestEntry?.stableGeometryKey,
  'candidate permutation changed the selected physical anchor',
);

// The same algorithm can represent independent left/right hand intent simply by giving
// each semantic hand its own origin/direction; there is no left/right physics mode.
const semanticLeftHand = rankE19GripCandidates({
  candidates,
  reachOrigin: [-0.10, 1, 0],
  reachDirection: [-1, 0, 0],
  maxReach: 0.8,
  minAimAlignment: 0.15,
  minSurfaceAlignment: 0.25,
});
const semanticRightHand = rankE19GripCandidates({
  candidates,
  reachOrigin: [0.10, 1, 0],
  reachDirection: [1, 0, 0],
  maxReach: 0.8,
  minAimAlignment: 0.15,
  minSurfaceAlignment: 0.25,
});
assert.equal(semanticLeftHand.best?.otherBodyKey, leftKey);
assert.equal(semanticRightHand.best?.otherBodyKey, rightKey);

// Intent assistance is still bounded by reach. It may choose among current contacts but
// must not reinterpret a physically present contact as reachable from an arbitrary hand.
const tooShort = rankE19GripCandidates({
  candidates,
  reachOrigin: [0, 1, 0],
  reachDirection: [1, 0, 0],
  maxReach: 0.20,
  minAimAlignment: 0.15,
  minSurfaceAlignment: 0.25,
});
assert.equal(tooShort.best, null, 'out-of-reach contact was selected');
assert.ok(tooShort.rejected.some((entry) => entry.reason === 'OUT_OF_REACH'));

// Strongly incompatible directional intent should return no candidate rather than fall
// back to arbitrary solver order.
const aimUp = rankE19GripCandidates({
  candidates,
  reachOrigin: [0, 1, 0],
  reachDirection: [0, 1, 0],
  maxReach: 0.9,
  minAimAlignment: 0.80,
  minSurfaceAlignment: 0.25,
});
assert.equal(aimUp.best, null, 'ranker fell back to unrelated contact outside aim gate');

// Ranking cannot extend candidate lifetime. Once physics provenance refreshes, a prior
// ranked winner is stale and the tracker refuses to turn it into a latch descriptor.
const selectedBeforeRefresh = aimRight.best;
assert.ok(tracker.makeLatchDescriptor(selectedBeforeRefresh), 'fresh ranked winner did not resolve before refresh');
const refreshedCandidates = tracker.refresh();
const staleWinnerRejected = tracker.makeLatchDescriptor(selectedBeforeRefresh) === null;
assert.ok(staleWinnerRejected, 'ranking bypassed stale-contact protection');
const reranked = rankE19GripCandidates({
  ...common,
  candidates: refreshedCandidates,
  reachDirection: [1, 0, 0],
});
const freshLatch = tracker.makeLatchDescriptor(reranked.best);
assert.ok(freshLatch, 'refreshed ranked winner did not produce a fresh latch descriptor');
assert.equal(freshLatch.bodyKey, rightKey);

const report = {
  schema: 'e19-1b-intent-assisted-contact-ranking-v1',
  hypothesis: 'A small interaction-layer ranker can deterministically express directional left/right grip intent over only current physically-earned contact candidates, while reach/aim gates and tracker epochs keep assistance from becoming a remote picker or stale topology authority.',
  boundary: 'Headless selection-policy qualifier over a diagnostic contact probe. Default ranking weights are experimental, not final feel constants. No moving reach probe, hold/release UX, hysteresis, visual hand representation or Owner usability is qualified.',
  candidateCount: candidates.length,
  contactedBodies: bodyKeys,
  leftBodyKey: leftKey,
  rightBodyKey: rightKey,
  aimRight: selectedSummary(aimRight),
  aimLeft: selectedSummary(aimLeft),
  reversedRight: selectedSummary(reversedRight),
  semanticLeftHand: selectedSummary(semanticLeftHand),
  semanticRightHand: selectedSummary(semanticRightHand),
  tooShort: {
    best: selectedSummary(tooShort),
    rejectedReasons: tooShort.rejected.map((entry) => entry.reason),
  },
  aimUp: {
    best: selectedSummary(aimUp),
    rejectedReasons: aimUp.rejected.map((entry) => entry.reason),
  },
  staleWinnerRejected,
  freshLatch: {
    source: freshLatch.source,
    bodyKey: freshLatch.bodyKey,
    bodyKind: freshLatch.bodyKind,
    localAnchor: [...freshLatch.localAnchor],
    worldAnchorAtAcquisition: [...freshLatch.worldAnchorAtAcquisition],
  },
  classification: 'INTENT_RANKING_IS_DETERMINISTIC_BOUNDED_AND_SUBORDINATE_TO_CURRENT_CONTACT_TRUTH',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
b3.b3DestroyWorld(world);
