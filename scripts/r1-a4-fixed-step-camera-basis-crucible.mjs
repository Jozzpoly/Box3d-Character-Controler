import fs from 'node:fs';
import path from 'node:path';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createCurrentDonorCharacter, CURRENT_DONOR_REVISION } from '../src/donor/index.js';
import { FollowCamera } from '../src/follow-camera.js';

const b3 = await Box3D();
const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const OBSERVATION_DURATION = 1.0;
const SCHEDULE_PAD = 1e-9;
const SCHEDULE_DURATION = OBSERVATION_DURATION + SCHEDULE_PAD;
const TARGET_YAW = Math.PI / 2;
const YAW_TOLERANCE = 1e-12;
const MECHANICS_TOLERANCE = 1e-10;

function fakeCanvas() {
  return {
    addEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() { return false; },
  };
}

function createFloor(world) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [0, -0.5, 0];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.8;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, 20, 0.5, 20);
}

function noMoveIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function forwardIntent(basis) {
  return {
    moveForward: 1,
    moveRight: 0,
    forward: [...basis.forward],
    right: [...basis.right],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function makeUniformSchedule(hz) {
  const frames = [];
  let elapsed = 0;
  for (let i = 0; i < hz; i++) {
    const dt = i === hz - 1 ? SCHEDULE_DURATION - elapsed : 1 / hz;
    frames.push(dt);
    elapsed += dt;
  }
  return frames;
}

function makeHitchSchedule() {
  const frames = [0.1];
  for (let i = 0; i < 54; i++) frames.push(1 / 60);
  const sum = frames.reduce((a, v) => a + v, 0);
  frames[frames.length - 1] += SCHEDULE_DURATION - sum;
  return frames;
}

function distance3(a, c) {
  return Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
}

function maxSequenceDelta(a, c) {
  if (a.length !== c.length) return Infinity;
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - c[i]));
  return max;
}

function makeFixture() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createFloor(world);
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, 0.92, 0],
    gravity: 20,
  });
  character.reset([0, character.halfHeight + 0.02, 0]);

  for (let i = 0; i < 60; i++) {
    character.preStep(FIXED_DT, noMoveIntent());
    b3.b3World_Step(world, FIXED_DT, SUBSTEPS);
    character.postStep(FIXED_DT);
  }
  if (!character.currentSupport) throw new Error('fixture: character did not settle on floor');

  const camera = new THREE.PerspectiveCamera(51, 1, 0.05, 130);
  const followCamera = new FollowCamera(camera, fakeCanvas());
  followCamera.snap(character.position);
  followCamera.desiredYaw = TARGET_YAW;
  return { world, character, followCamera };
}

function runSchedule(name, frameSchedule, mode) {
  const { world, character, followCamera } = makeFixture();
  const initialPosition = [...character.position];
  let accumulator = 0;
  let physicsTicks = 0;
  const sampledMechanicalYaw = [];
  const physicsPositions = [];

  for (const rawFrameDt of frameSchedule) {
    const frameDt = Math.min(rawFrameDt, 0.1);
    accumulator += frameDt;
    while (accumulator >= FIXED_DT) {
      const basis = mode === 'legacy' ? followCamera.basis() : followCamera.controlBasis();
      sampledMechanicalYaw.push(mode === 'legacy' ? followCamera.yaw : followCamera.controlYaw);
      character.preStep(FIXED_DT, forwardIntent(basis));
      b3.b3World_Step(world, FIXED_DT, SUBSTEPS);
      character.postStep(FIXED_DT);
      physicsPositions.push([...character.position]);
      physicsTicks += 1;
      if (mode === 'candidate') followCamera.advanceControl(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    followCamera.update(character.position, Boolean(character.currentSupport), frameDt);
  }

  const result = {
    name,
    mode,
    renderFrames: frameSchedule.length,
    physicsTicks,
    initialPosition,
    finalPosition: [...character.position],
    finalVelocity: [...character.velocity],
    sampledMechanicalYaw,
    firstMechanicalYaw: sampledMechanicalYaw[0],
    lastMechanicalYaw: sampledMechanicalYaw.at(-1),
    finalVisualYaw: followCamera.yaw,
    finalControlYaw: followCamera.controlYaw,
    finalPhysicsPosition: physicsPositions.at(-1),
  };
  b3.b3DestroyWorld(world);
  return result;
}

if (CURRENT_DONOR_REVISION !== 'v1') {
  throw new Error(`R1 expected current Donor v1, got ${CURRENT_DONOR_REVISION}`);
}

const schedules = {
  '30hz': makeUniformSchedule(30),
  '60hz': makeUniformSchedule(60),
  '144hz': makeUniformSchedule(144),
  '100ms-leading-hitch': makeHitchSchedule(),
};

const legacy60 = runSchedule('legacy-60hz', schedules['60hz'], 'legacy');
const candidate = Object.fromEntries(
  Object.entries(schedules).map(([name, frames]) => [name, runSchedule(name, frames, 'candidate')]),
);

for (const result of [legacy60, ...Object.values(candidate)]) {
  if (result.physicsTicks !== 60) {
    throw new Error(`${result.name}: expected exactly 60 physics ticks, got ${result.physicsTicks}`);
  }
}

if (Math.abs(legacy60.firstMechanicalYaw) > YAW_TOLERANCE) {
  throw new Error(`legacy 60Hz first yaw unexpectedly changed: ${legacy60.firstMechanicalYaw}`);
}
for (const result of Object.values(candidate)) {
  if (Math.abs(result.firstMechanicalYaw) > YAW_TOLERANCE) {
    throw new Error(`${result.name}: candidate first mechanical yaw must remain 0, got ${result.firstMechanicalYaw}`);
  }
}

const candidateNames = Object.keys(candidate);
let maxCandidateYawSequenceDelta = 0;
let maxCandidatePositionDelta = 0;
let maxCandidateVelocityDelta = 0;
for (let i = 0; i < candidateNames.length; i++) {
  for (let j = i + 1; j < candidateNames.length; j++) {
    const a = candidate[candidateNames[i]];
    const c = candidate[candidateNames[j]];
    maxCandidateYawSequenceDelta = Math.max(
      maxCandidateYawSequenceDelta,
      maxSequenceDelta(a.sampledMechanicalYaw, c.sampledMechanicalYaw),
    );
    maxCandidatePositionDelta = Math.max(maxCandidatePositionDelta, distance3(a.finalPosition, c.finalPosition));
    maxCandidateVelocityDelta = Math.max(maxCandidateVelocityDelta, distance3(a.finalVelocity, c.finalVelocity));
  }
}

const legacyMatch = {
  yawSequenceDelta: maxSequenceDelta(legacy60.sampledMechanicalYaw, candidate['60hz'].sampledMechanicalYaw),
  finalPositionDelta: distance3(legacy60.finalPosition, candidate['60hz'].finalPosition),
  finalVelocityDelta: distance3(legacy60.finalVelocity, candidate['60hz'].finalVelocity),
};

if (maxCandidateYawSequenceDelta > YAW_TOLERANCE) {
  throw new Error(`candidate mechanical yaw depends on render schedule: ${maxCandidateYawSequenceDelta}`);
}
if (maxCandidatePositionDelta > MECHANICS_TOLERANCE) {
  throw new Error(`candidate final position depends on render schedule: ${maxCandidatePositionDelta}`);
}
if (maxCandidateVelocityDelta > MECHANICS_TOLERANCE) {
  throw new Error(`candidate final velocity depends on render schedule: ${maxCandidateVelocityDelta}`);
}
if (legacyMatch.yawSequenceDelta > YAW_TOLERANCE) {
  throw new Error(`candidate 60Hz yaw does not preserve legacy 60Hz semantics: ${legacyMatch.yawSequenceDelta}`);
}
if (legacyMatch.finalPositionDelta > MECHANICS_TOLERANCE) {
  throw new Error(`candidate 60Hz position does not preserve legacy 60Hz mechanics: ${legacyMatch.finalPositionDelta}`);
}
if (legacyMatch.finalVelocityDelta > MECHANICS_TOLERANCE) {
  throw new Error(`candidate 60Hz velocity does not preserve legacy 60Hz mechanics: ${legacyMatch.finalVelocityDelta}`);
}

const payload = {
  experiment: 'R1 A4 fixed-step mechanical camera basis crucible',
  donorRevision: CURRENT_DONOR_REVISION,
  fixedDt: FIXED_DT,
  substeps: SUBSTEPS,
  targetYawRadians: TARGET_YAW,
  tolerances: { yaw: YAW_TOLERANCE, mechanics: MECHANICS_TOLERANCE },
  legacy60,
  candidate,
  maxCandidateYawSequenceDelta,
  maxCandidatePositionDelta,
  maxCandidateVelocityDelta,
  legacy60Match: legacyMatch,
  interpretationBoundary: 'Additive substrate only. Existing FollowCamera.basis() and browser runtime call sites remain unchanged. Candidate mechanics sample controlBasis() before each fixed tick and advanceControl(dt) after the tick; visual FollowCamera.update(frameDt) remains render-scheduled.',
  classification: 'FIXED_STEP_CAMERA_BASIS_REMOVES_RENDER_CADENCE_WITHOUT_RETUNING_LEGACY_60HZ_MECHANICS',
};

fs.mkdirSync(path.join('tmp', 'r1-a4'), { recursive: true });
fs.writeFileSync(path.join('tmp', 'r1-a4', 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('R1 A4 FIXED-STEP CAMERA BASIS PASS');
console.log(`maxYawSequenceDelta=${maxCandidateYawSequenceDelta}`);
console.log(`maxPositionDelta=${maxCandidatePositionDelta}`);
console.log(`maxVelocityDelta=${maxCandidateVelocityDelta}`);
console.log(`legacy60 yaw=${legacyMatch.yawSequenceDelta} position=${legacyMatch.finalPositionDelta} velocity=${legacyMatch.finalVelocityDelta}`);
console.log(JSON.stringify(payload));
