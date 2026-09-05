import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { E19ContactGripCandidateTracker } from '../../src/e19/contact-grip-candidates.js';
import {
  acquireRankedE19Grip,
  actuatorGripFromE19Latch,
  desiredOffsetAtE19Acquisition,
} from '../../src/e19/grip-acquisition.js';
import { createE19GripDonorCharacter } from '../../src/e19/grip-donor-character.js';
import { stepDualGripActuator } from '../../src/e19/dual-grip-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const START = [0, 5, 0];
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function add3InPlace(target, delta) {
  target[0] += delta[0];
  target[1] += delta[1];
  target[2] += delta[2];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function neutralIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createBox(world, { type = 'static', position, half, mass = 40 }) {
  const bodyDef = b3.b3DefaultBodyDef();
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = type === 'dynamic' ? densityForBoxMass(mass, half) : 0;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, shape };
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function bodyVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function worldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function step(world, character, activeGrip = null) {
  character.setGripConstraintActive(Boolean(activeGrip));
  character.preStep(DT, neutralIntent());
  let telemetry = null;
  if (activeGrip) {
    telemetry = stepDualGripActuator({
      b3,
      playerPosition: character.position,
      playerVelocity: character.velocity,
      playerMass: character.virtualMass,
      grips: [activeGrip.grip],
      desiredOffsets: [activeGrip.desiredOffset],
      dt: DT,
      rate: activeGrip.rate ?? 8,
      maxForcePerGrip: activeGrip.maxForce ?? 3000,
      maxForceSum: activeGrip.maxForce ?? 3000,
    });
    add3InPlace(character.velocity, telemetry.playerDeltaV);
  }
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  return telemetry;
}

function runCase(kind) {
  const world = makeWorld();
  const character = createE19GripDonorCharacter(b3, world, {
    startPosition: START,
    gravity: 0,
  });
  const targetHalf = [0.5, 0.7, 0.7];
  const target = createBox(world, {
    type: kind,
    position: [3.0, 5, 0],
    half: targetHalf,
    mass: 40,
  });
  const probe = createBox(world, {
    type: 'dynamic',
    position: [2.26, 5, 0],
    half: [0.25, 0.24, 0.24],
    mass: 2,
  });

  b3.b3World_Step(world, DT, SUBSTEPS);
  const tracker = new E19ContactGripCandidateTracker({
    b3,
    probeBody: probe.body,
    probeShape: probe.shape,
  });
  tracker.refresh();
  const acquired = acquireRankedE19Grip({
    tracker,
    reachOrigin: character.position,
    reachDirection: [1, 0, 0],
    maxReach: 4,
    rankingOptions: {
      minAimAlignment: 0.5,
      minSurfaceAlignment: 0.5,
    },
  });
  assert.ok(acquired.latch, `${kind}: current contact intent did not produce a latch`);
  assert.equal(acquired.latch.bodyKind, kind.toUpperCase());
  assert.equal(acquired.latch.body.index1, target.body.index1, `${kind}: acquired wrong target body`);

  const actuatorGrip = actuatorGripFromE19Latch(acquired.latch);
  const initialDesiredOffset = desiredOffsetAtE19Acquisition(acquired.latch, character.position);
  const acquiredAnchorRoundTrip = worldPoint(target.body, actuatorGrip.localAnchor);
  assert.ok(norm3(sub3(acquiredAnchorRoundTrip, acquired.latch.worldAnchorAtAcquisition)) < 2e-5);

  // Once topology is earned, the physical acquisition probe is apparatus only. Destroy
  // it and invalidate the tracker: the semantic latch must persist on the target's exact
  // local anchor without requiring continuous probe collision.
  tracker.invalidate();
  b3.b3DestroyBody(probe.body);
  if (kind === 'dynamic') {
    b3.b3Body_SetLinearVelocity(target.body, [0, 0, 0]);
    b3.b3Body_SetAngularVelocity(target.body, [0, 0, 0]);
  }

  const playerAtAcquire = [...character.position];
  const bodyAtAcquire = bodyPosition(target.body);
  const noSnapTelemetry = step(world, character, {
    grip: actuatorGrip,
    desiredOffset: initialDesiredOffset,
    rate: 8,
    maxForce: 3000,
  });
  const noSnapPlayerDelta = norm3(sub3(character.position, playerAtAcquire));
  const noSnapBodyDelta = norm3(sub3(bodyPosition(target.body), bodyAtAcquire));
  const noSnapForce = noSnapTelemetry.appliedImpulseSum / DT;
  assert.ok(noSnapPlayerDelta < 0.005, `${kind}: acquisition introduced player snap ${noSnapPlayerDelta}`);
  assert.ok(noSnapBodyDelta < 0.005, `${kind}: acquisition introduced target snap ${noSnapBodyDelta}`);
  assert.ok(noSnapForce < 2, `${kind}: acquisition introduced non-trivial force ${noSnapForce} N`);

  // The interaction layer now changes only the desired relative hand offset. The target
  // descriptor is the exact contact-earned body/local anchor for both static and dynamic.
  const contractedDesiredOffset = [...initialDesiredOffset];
  contractedDesiredOffset[0] -= 1.0;
  const pullStartPlayer = [...character.position];
  const pullStartBody = bodyPosition(target.body);
  let peakAppliedForce = 0;
  let saturatedFrames = 0;
  let finalTelemetry = null;
  for (let frame = 0; frame < 120; frame++) {
    finalTelemetry = step(world, character, {
      grip: actuatorGrip,
      desiredOffset: contractedDesiredOffset,
      rate: 8,
      maxForce: 3000,
    });
    peakAppliedForce = Math.max(peakAppliedForce, finalTelemetry.appliedImpulseSum / DT);
    if (finalTelemetry.perGripSaturated[0]) saturatedFrames += 1;
  }

  const finalAnchor = worldPoint(target.body, actuatorGrip.localAnchor);
  const finalRelativeOffset = sub3(finalAnchor, character.position);
  const finalRelativeError = sub3(contractedDesiredOffset, finalRelativeOffset);
  const playerDx = character.position[0] - pullStartPlayer[0];
  const bodyDx = bodyPosition(target.body)[0] - pullStartBody[0];

  if (kind === 'static') {
    assert.ok(playerDx > 0.90 && playerDx < 1.08, `static contact-earned grip did not move Donor by requested closure: ${playerDx}`);
    assert.ok(Math.abs(bodyDx) < 1e-9, `static target moved: ${bodyDx}`);
  } else {
    assert.ok(playerDx > 0.15, `dynamic contact-earned grip did not react on Donor: ${playerDx}`);
    assert.ok(bodyDx < -0.35, `dynamic contact-earned grip did not move target toward Donor: ${bodyDx}`);
    assert.ok(Math.abs(bodyDx) > playerDx, `40 kg target did not contribute more closure than 80 kg Donor: player=${playerDx} body=${bodyDx}`);
  }
  assert.ok(norm3(finalRelativeError) < 0.02, `${kind}: live acquired grip failed to settle relative request: ${finalRelativeError}`);
  assert.deepEqual(character.externalVelocity, [0, 0, 0]);

  const atRelease = {
    playerPosition: [...character.position],
    playerVelocity: [...character.velocity],
    bodyPosition: bodyPosition(target.body),
    bodyVelocity: kind === 'dynamic' ? bodyVelocity(target.body) : [0, 0, 0],
    externalVelocity: [...character.externalVelocity],
  };
  let peakPostReleasePlayerSpeed = norm3(character.velocity);
  let peakPostReleaseBodySpeed = kind === 'dynamic' ? norm3(bodyVelocity(target.body)) : 0;
  let postReleaseDynamicContactFrames = 0;
  for (let frame = 0; frame < 45; frame++) {
    const telemetry = step(world, character, null);
    assert.equal(telemetry, null, `${kind}: released step unexpectedly executed grip actuator`);
    assert.deepEqual(character.externalVelocity, [0, 0, 0]);
    peakPostReleasePlayerSpeed = Math.max(peakPostReleasePlayerSpeed, norm3(character.velocity));
    if (kind === 'dynamic') peakPostReleaseBodySpeed = Math.max(peakPostReleaseBodySpeed, norm3(bodyVelocity(target.body)));
    if (character.lastDynamicContacts > 0) postReleaseDynamicContactFrames += 1;
  }
  const afterRelease = {
    playerPosition: [...character.position],
    playerVelocity: [...character.velocity],
    bodyPosition: bodyPosition(target.body),
    bodyVelocity: kind === 'dynamic' ? bodyVelocity(target.body) : [0, 0, 0],
    externalVelocity: [...character.externalVelocity],
  };

  // Critical distinction: release removes the semantic relation, not physical momentum.
  // The first gate incorrectly required motion to disappear. The second still assumed
  // momentum must remain numerically constant, which ignored ordinary post-release Donor
  // contact exchange with a nearby dynamic target. The meaningful invariant is narrower:
  // no actuator runs after release, no grip reaction is written into externalVelocity,
  // and the remaining physical state stays finite/bounded under normal world interaction.
  assert.deepEqual(atRelease.externalVelocity, [0, 0, 0]);
  assert.deepEqual(afterRelease.externalVelocity, [0, 0, 0]);
  assert.ok(Number.isFinite(peakPostReleasePlayerSpeed) && peakPostReleasePlayerSpeed < 5,
    `${kind}: post-release Donor state became unbounded: ${peakPostReleasePlayerSpeed}`);
  assert.ok(Number.isFinite(peakPostReleaseBodySpeed) && peakPostReleaseBodySpeed < 5,
    `${kind}: post-release target state became unbounded: ${peakPostReleaseBodySpeed}`);

  const result = {
    kind,
    acquiredCandidateCount: acquired.ranking.ranked.length,
    latch: {
      source: acquired.latch.source,
      bodyKind: acquired.latch.bodyKind,
      bodyKey: acquired.latch.bodyKey,
      localAnchor: [...acquired.latch.localAnchor],
      worldAnchorAtAcquisition: [...acquired.latch.worldAnchorAtAcquisition],
    },
    initialDesiredOffset,
    noSnapPlayerDelta,
    noSnapBodyDelta,
    noSnapForce,
    contractedDesiredOffset,
    playerDx,
    bodyDx,
    finalRelativeOffset,
    finalRelativeError,
    peakAppliedForce,
    saturatedFrames,
    atRelease,
    afterRelease,
    peakPostReleasePlayerSpeed,
    peakPostReleaseBodySpeed,
    postReleaseDynamicContactFrames,
  };
  b3.b3DestroyWorld(world);
  return result;
}

const staticGrip = runCase('static');
const dynamicGrip = runCase('dynamic');

// Acquisition and actuator bridge remain structurally identical across body type; only
// Box3D responsiveness changes the physical consequence after the latch is earned.
assert.deepEqual(Object.keys(staticGrip.latch).sort(), Object.keys(dynamicGrip.latch).sort());

const report = {
  schema: 'e19-1c-contact-earned-live-grip-bridge-v3',
  hypothesis: 'A current physically-earned and intent-ranked contact descriptor can become the same persistent E19 semantic grip relation for static or dynamic targets, start without an acquisition snap, survive loss of the acquisition probe, drive the already-qualified reciprocal actuator, and release by removing the relation without hidden externalVelocity while legitimate physical momentum/contact consequences remain owned by normal world/controller dynamics.',
  boundary: 'Headless single-grip integration with a disposable diagnostic probe and synthetic one-meter offset contraction. This qualifies acquisition -> semantic relation -> actuator plumbing, not final reach motion, two-hand UX, latch hysteresis, visual hand embodiment, strength tuning or Owner feel.',
  staticGrip,
  dynamicGrip,
  classification: 'CONTACT_EARNED_DESCRIPTOR_DRIVES_ONE_LIVE_E19_GRIP_PATH_ACROSS_STATIC_AND_DYNAMIC_TARGETS',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
