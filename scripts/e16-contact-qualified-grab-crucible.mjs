import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE16ContactQualifiedGrabCharacter } from '../src/e16-contact-qualified-grab-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function idKey(id) {
  if (!id) return 'null';
  return `${id.index1}:${id.world0}:${id.generation}`;
}

function makeWorld(kind = 'static') {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShapeDef = b3.b3DefaultShapeDef();
  groundShapeDef.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShapeDef, 20, 0.5, 20);

  const targetDef = b3.b3DefaultBodyDef();
  if (kind === 'dynamic') {
    targetDef.type = b3.b3BodyType.b3_dynamicBody;
    targetDef.position = [1.0, 0.8, 0];
    targetDef.linearDamping = 0.02;
    targetDef.angularDamping = 0.08;
    targetDef.enableSleep = false;
  } else {
    targetDef.position = [0.90, 1.0, 0];
  }
  const targetBody = b3.b3CreateBody(world, targetDef);
  const targetShapeDef = b3.b3DefaultShapeDef();
  targetShapeDef.baseMaterial.friction = 0.65;
  if (kind === 'dynamic') targetShapeDef.density = 18;
  const targetShape = kind === 'dynamic'
    ? b3.b3CreateBoxShape(targetBody, targetShapeDef, 0.25, 0.8, 0.48)
    : b3.b3CreateBoxShape(targetBody, targetShapeDef, 0.08, 1.0, 0.65);

  return { world, targetBody, targetShape };
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

function tick(scene, character, targetOffset) {
  character.setOrganTargetOffset(targetOffset);
  character.preStep(DT, neutralIntent());
  b3.b3World_Step(scene.world, DT, SUBSTEPS);
  character.postStep(DT);
}

function makeCharacter(scene) {
  return createE16ContactQualifiedGrabCharacter(b3, scene.world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    subsystemFeedbackGain: 1,
    constraintTransportGain: 1,
  });
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function findCandidate(character, body) {
  const key = idKey(body);
  return character.grabCandidates.find((candidate) => candidate.otherBodyKey === key) ?? null;
}

function assertFiniteCandidate(candidate, label) {
  if (!candidate) throw new Error(`${label}: no candidate`);
  const values = [
    ...candidate.organAnchorWorld,
    ...candidate.otherAnchorWorld,
    candidate.anchorPairGap,
    candidate.separation,
    candidate.normalImpulse,
  ];
  if (!values.every(Number.isFinite)) {
    throw new Error(`${label}: non-finite candidate ${JSON.stringify(candidate)}`);
  }
  if (candidate.anchorPairGap > 0.08) {
    throw new Error(`${label}: manifold anchor pair gap too large ${candidate.anchorPairGap}`);
  }
}

function reachUntilCandidate(scene, character, body, maxFrames = 120) {
  for (let i = 0; i < maxFrames; i++) {
    tick(scene, character, [0.88, 0, 0]);
    const candidate = findCandidate(character, body);
    if (candidate) return { frame: i, candidate };
  }
  return null;
}

function runStatic() {
  const scene = makeWorld('static');
  const character = makeCharacter(scene);

  for (let i = 0; i < 40; i++) tick(scene, character, [0.42, 0, 0]);
  const neutralCandidates = character.grabCandidates.length;
  const foreignRejected = character.grabContactCandidate(null) === false;

  const first = reachUntilCandidate(scene, character, scene.targetBody);
  if (!first) throw new Error('static: organ never produced a target contact candidate');
  assertFiniteCandidate(first.candidate, 'static first');
  const firstCandidateSnapshot = {
    key: first.candidate.key,
    epoch: first.candidate.epoch,
    body: first.candidate.otherBodyKey,
    anchorPairGap: first.candidate.anchorPairGap,
    separation: first.candidate.separation,
    normalImpulse: first.candidate.normalImpulse,
    organAnchorWorld: [...first.candidate.organAnchorWorld],
    otherAnchorWorld: [...first.candidate.otherAnchorWorld],
  };

  // Candidate must be a statement about THIS post-solve contact state, not a token that
  // can be cached and used after physics has advanced.
  tick(scene, character, [0.88, 0, 0]);
  const staleRejected = character.grabContactCandidate(first.candidate) === false;
  const fresh = findCandidate(character, scene.targetBody);
  assertFiniteCandidate(fresh, 'static fresh');

  const rootAtGrab = [...character.position];
  const freshAnchorGap = fresh.anchorPairGap;
  const grabbed = character.grabContactCandidate(fresh);
  const grabTelemetry = character.telemetry();

  let persistentFrames = 0;
  let appliedTransportX = 0;
  for (let i = 0; i < 90; i++) {
    tick(scene, character, [0.20, 0, 0]);
    if (character.lastSubsystemFeedbackPersistent) persistentFrames += 1;
    appliedTransportX += character.lastAppliedGrabTransport[0];
  }
  const rootAfterPull = [...character.position];
  const pullDelta = rootAfterPull[0] - rootAtGrab[0];

  const released = character.releaseGrab();
  for (let i = 0; i < 24; i++) tick(scene, character, [0.30, 0, 0]);
  const clearedAfterRelease = !character.grabJoint;

  const second = reachUntilCandidate(scene, character, scene.targetBody);
  if (!second) throw new Error('static: no recontact candidate after release');
  assertFiniteCandidate(second.candidate, 'static second');
  const regrabbed = character.grabContactCandidate(second.candidate);
  const grabCountAfterRegrab = character.grabCount;
  const releaseCountAfterRegrab = character.releaseCount;
  character.releaseGrab();

  const result = {
    neutralCandidates,
    foreignRejected,
    firstContactFrame: first.frame,
    firstCandidate: firstCandidateSnapshot,
    staleRejected,
    freshAnchorGap,
    grabbed,
    grabSource: grabTelemetry.grabSource,
    grabbedBodyMatches: idKey(character.grabbedBody) === idKey(scene.targetBody) || regrabbed,
    rootAtGrab,
    rootAfterPull,
    pullDelta,
    appliedTransportX,
    persistentFrames,
    released,
    clearedAfterRelease,
    secondContactFrame: second.frame,
    regrabbed,
    grabCountAfterRegrab,
    releaseCountAfterRegrab,
  };

  if (!foreignRejected) throw new Error('static: null/foreign candidate was not rejected');
  if (!staleRejected) throw new Error('static: stale contact candidate was accepted');
  if (!grabbed || grabTelemetry.grabSource !== 'contact-manifold') {
    throw new Error(`static: contact-qualified grab failed ${JSON.stringify(result)}`);
  }
  if (pullDelta < 0.08) throw new Error(`static: contact-qualified retract did not pull carrier enough ${pullDelta}`);
  if (persistentFrames !== 0) throw new Error(`static: grab leaked persistent feedback on ${persistentFrames} frames`);
  if (!released || !clearedAfterRelease || !regrabbed) {
    throw new Error(`static: release/recontact/regrab failed ${JSON.stringify(result)}`);
  }
  if (grabCountAfterRegrab < 2 || releaseCountAfterRegrab < 1) {
    throw new Error(`static: topology counters do not show two earned grabs ${JSON.stringify(result)}`);
  }

  b3.b3DestroyWorld(scene.world);
  return result;
}

function runDynamic() {
  const scene = makeWorld('dynamic');
  const character = makeCharacter(scene);
  for (let i = 0; i < 40; i++) tick(scene, character, [0.42, 0, 0]);

  const before = bodyPosition(scene.targetBody);
  const found = reachUntilCandidate(scene, character, scene.targetBody, 150);
  if (!found) throw new Error('dynamic: organ never produced target contact candidate');
  assertFiniteCandidate(found.candidate, 'dynamic');

  const candidateBodyMatches = found.candidate.otherBodyKey === idKey(scene.targetBody);
  const grabbed = character.grabContactCandidate(found.candidate);
  const rootAtGrab = [...character.position];
  const propAtGrab = bodyPosition(scene.targetBody);

  for (let i = 0; i < 100; i++) tick(scene, character, [0.20, 0, 0]);
  const rootFinal = [...character.position];
  const propFinal = bodyPosition(scene.targetBody);
  const distanceAtGrab = Math.abs(propAtGrab[0] - rootAtGrab[0]);
  const distanceFinal = Math.abs(propFinal[0] - rootFinal[0]);
  const closure = distanceAtGrab - distanceFinal;

  const result = {
    before,
    contactFrame: found.frame,
    candidateBodyMatches,
    anchorPairGap: found.candidate.anchorPairGap,
    separation: found.candidate.separation,
    grabbed,
    rootAtGrab,
    propAtGrab,
    rootFinal,
    propFinal,
    distanceAtGrab,
    distanceFinal,
    closure,
  };

  if (!candidateBodyMatches || !grabbed) {
    throw new Error(`dynamic: exact-body contact-qualified grab failed ${JSON.stringify(result)}`);
  }
  if (closure < 0.15) {
    throw new Error(`dynamic: grabbed dynamic body did not meaningfully close distance ${closure}`);
  }

  if (character.grabJoint) character.releaseGrab();
  b3.b3DestroyWorld(scene.world);
  return result;
}

const report = {
  schema: 'e16-contact-qualified-grab-crucible-v0',
  hypothesis: 'Owner-facing topology can be earned strictly from current solver contact identity/manifold anchors, reject stale contact state, preserve E16 constraint-transport semantics, and release/regrab cleanly.',
  static: runStatic(),
  dynamic: runDynamic(),
  boundary: 'Machine qualification of contact-earned topology only. It does not establish aim-selection quality, Owner usability, or fun.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
