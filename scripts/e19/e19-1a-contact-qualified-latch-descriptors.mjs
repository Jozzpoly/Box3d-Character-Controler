import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import {
  E19ContactGripCandidateTracker,
  e19IdKey,
} from '../../src/e19/contact-grip-candidates.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createBox(world, { type = 'static', position, half, density = 10 }) {
  const bodyDef = b3.b3DefaultBodyDef();
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
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

function worldPoint(body, local) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, local);
  return out;
}

function findBodyCandidate(tracker, body) {
  const key = e19IdKey(body);
  return tracker.candidates.find((candidate) => candidate.otherBodyKey === key) ?? null;
}

function assertCandidate(candidate, label) {
  if (!candidate) throw new Error(`${label}: missing contact candidate`);
  const values = [
    ...candidate.probeAnchorWorld,
    ...candidate.otherAnchorWorld,
    ...candidate.probeLocalAnchor,
    ...candidate.otherLocalAnchor,
    candidate.anchorPairGap,
    candidate.separation,
    candidate.normalImpulse,
  ];
  assert.ok(values.every(Number.isFinite), `${label}: candidate contains non-finite values`);
  assert.ok(candidate.anchorPairGap < 0.08, `${label}: anchor pair gap too large ${candidate.anchorPairGap}`);
  assert.ok(Object.isFrozen(candidate), `${label}: candidate object is mutable`);
  assert.ok(Object.isFrozen(candidate.otherLocalAnchor), `${label}: local anchor array is mutable`);
}

function runContactCase(kind) {
  const world = makeWorld();
  const target = createBox(world, {
    type: kind,
    position: [1.1, 1, 0],
    half: [0.5, 0.8, 0.8],
    density: 12,
  });
  const probe = createBox(world, {
    type: 'dynamic',
    position: [0.36, 1, 0],
    half: [0.25, 0.22, 0.22],
    density: 5,
  });

  b3.b3World_Step(world, DT, SUBSTEPS);

  const tracker = new E19ContactGripCandidateTracker({
    b3,
    probeBody: probe.body,
    probeShape: probe.shape,
  });
  const firstCandidates = tracker.refresh();
  const first = findBodyCandidate(tracker, target.body);
  assertCandidate(first, `${kind} first`);

  const targetRoundTrip = worldPoint(target.body, first.otherLocalAnchor);
  const probeRoundTrip = worldPoint(probe.body, first.probeLocalAnchor);
  const otherAnchorRoundTripError = distance3(targetRoundTrip, first.otherAnchorWorld);
  const probeAnchorRoundTripError = distance3(probeRoundTrip, first.probeAnchorWorld);
  assert.ok(otherAnchorRoundTripError < 2e-5, `${kind}: other local-anchor round trip error ${otherAnchorRoundTripError}`);
  assert.ok(probeAnchorRoundTripError < 2e-5, `${kind}: probe local-anchor round trip error ${probeAnchorRoundTripError}`);

  const firstLatch = tracker.makeLatchDescriptor(first);
  assert.ok(firstLatch, `${kind}: fresh candidate did not produce latch descriptor`);
  assert.equal(firstLatch.source, 'contact-manifold');
  assert.equal(firstLatch.bodyKey, e19IdKey(target.body));
  assert.equal(firstLatch.bodyKind, kind.toUpperCase());
  assert.ok(Object.isFrozen(firstLatch), `${kind}: latch descriptor is mutable`);
  assert.ok(distance3(firstLatch.worldAnchorAtAcquisition, first.otherAnchorWorld) < 1e-12);
  assert.ok(distance3(firstLatch.localAnchor, first.otherLocalAnchor) < 1e-12);

  // A second refresh invalidates the previous post-step snapshot even if physics itself
  // has not advanced. The interaction layer must always act on the current tracker epoch.
  tracker.refresh();
  const staleRejected = tracker.makeLatchDescriptor(first) === null;
  assert.ok(staleRejected, `${kind}: stale contact candidate was accepted`);
  const fresh = findBodyCandidate(tracker, target.body);
  assertCandidate(fresh, `${kind} fresh`);
  const freshLatch = tracker.makeLatchDescriptor(fresh);
  assert.ok(freshLatch, `${kind}: refreshed candidate did not produce latch descriptor`);

  // Even a tracker looking at the same physical probe must not accept another tracker’s
  // opaque candidate token. This makes foreign/cached interaction state fail closed.
  const foreignTracker = new E19ContactGripCandidateTracker({
    b3,
    probeBody: probe.body,
    probeShape: probe.shape,
  });
  foreignTracker.refresh();
  const foreignRejected = foreignTracker.makeLatchDescriptor(fresh) === null;
  assert.ok(foreignRejected, `${kind}: foreign tracker candidate was accepted`);

  tracker.invalidate();
  const invalidatedRejected = tracker.makeLatchDescriptor(fresh) === null;
  assert.ok(invalidatedRejected, `${kind}: explicitly invalidated candidate was accepted`);

  const result = {
    kind,
    firstCandidateCount: firstCandidates.length,
    candidateBodyMatches: first.otherBodyKey === e19IdKey(target.body),
    bodyKind: first.otherBodyKind,
    anchorPairGap: first.anchorPairGap,
    separation: first.separation,
    normalImpulse: first.normalImpulse,
    manifoldNormal: first.manifoldNormal,
    otherAnchorRoundTripError,
    probeAnchorRoundTripError,
    firstLatch: {
      source: firstLatch.source,
      bodyKey: firstLatch.bodyKey,
      shapeKey: firstLatch.shapeKey,
      bodyKind: firstLatch.bodyKind,
      localAnchor: [...firstLatch.localAnchor],
      worldAnchorAtAcquisition: [...firstLatch.worldAnchorAtAcquisition],
    },
    staleRejected,
    foreignRejected,
    invalidatedRejected,
  };

  b3.b3DestroyWorld(world);
  return result;
}

function runNoContactCase() {
  const world = makeWorld();
  createBox(world, {
    type: 'static',
    position: [2.2, 1, 0],
    half: [0.5, 0.8, 0.8],
  });
  const probe = createBox(world, {
    type: 'dynamic',
    position: [0, 1, 0],
    half: [0.25, 0.22, 0.22],
    density: 5,
  });
  b3.b3World_Step(world, DT, SUBSTEPS);
  const tracker = new E19ContactGripCandidateTracker({
    b3,
    probeBody: probe.body,
    probeShape: probe.shape,
  });
  const candidates = tracker.refresh();
  const result = {
    candidateCount: candidates.length,
    nullRejected: tracker.makeLatchDescriptor(null) === null,
  };
  assert.equal(candidates.length, 0, `separated probe fabricated ${candidates.length} remote candidate(s)`);
  assert.ok(result.nullRejected, 'null candidate was accepted');
  b3.b3DestroyWorld(world);
  return result;
}

const staticContact = runContactCase('static');
const dynamicContact = runContactCase('dynamic');
const noContact = runNoContactCase();

// Same candidate/latch schema is preserved across static and dynamic targets. Body type
// remains evidence used later by the actuator; it is not an acquisition-mode switch.
assert.deepEqual(
  Object.keys(staticContact.firstLatch).sort(),
  Object.keys(dynamicContact.firstLatch).sort(),
  'static/dynamic latch descriptors diverged structurally',
);

const report = {
  schema: 'e19-1a-contact-qualified-latch-descriptors-v1',
  hypothesis: 'E16 current-manifold provenance can be extracted from its old organ architecture into a neutral E19 contact-candidate kernel that produces exact body/local-anchor latch descriptors, rejects stale/foreign state, and fabricates no remote candidates.',
  boundary: 'Physics-provenance extraction only. The probe body is diagnostic apparatus, not a final hand representation. No left/right intent, reach assistance, candidate ranking, acquisition UX or live E19 actuator latch is qualified here.',
  staticContact,
  dynamicContact,
  noContact,
  classification: 'CURRENT_CONTACT_PROVENANCE_IS_REUSABLE_AS_E19_LATCH_DESCRIPTOR_KERNEL',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
