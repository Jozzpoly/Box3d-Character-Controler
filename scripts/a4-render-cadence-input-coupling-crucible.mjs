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
// Equal nanosecond pad for every schedule. The production loop keeps its exact
// `while (accumulator >= FIXED_DT)` condition; this only prevents binary rounding of
// an exact 1.0 s synthetic schedule from turning one case into a 59-tick experiment.
const SCHEDULE_PAD = 1e-9;
const SCHEDULE_DURATION = OBSERVATION_DURATION + SCHEDULE_PAD;
const TARGET_YAW = Math.PI / 2;

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
  const count = hz;
  const frames = [];
  let elapsed = 0;
  for (let i = 0; i < count; i++) {
    const dt = i === count - 1 ? SCHEDULE_DURATION - elapsed : 1 / hz;
    frames.push(dt);
    elapsed += dt;
  }
  return frames;
}

function makeHitchSchedule() {
  // One 100 ms frame is legal in main.js because frameDt is clamped to 0.1; the
  // remaining 54 frames are ordinary 60 Hz frames. The same nanosecond pad used by
  // every uniform schedule is placed only on the final frame.
  const frames = [0.1];
  for (let i = 0; i < 54; i++) frames.push(1 / 60);
  const sum = frames.reduce((a, v) => a + v, 0);
  frames[frames.length - 1] += SCHEDULE_DURATION - sum;
  return frames;
}

function horizontalDistance(a, c) {
  return Math.hypot(a[0] - c[0], a[2] - c[2]);
}

function runSchedule(name, frameSchedule) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createFloor(world);
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, 0.92, 0],
    gravity: 20,
  });
  character.reset([0, character.halfHeight + 0.02, 0]);

  // Settle the same mechanical initial state without involving render cadence.
  for (let i = 0; i < 60; i++) {
    character.preStep(FIXED_DT, noMoveIntent());
    b3.b3World_Step(world, FIXED_DT, SUBSTEPS);
    character.postStep(FIXED_DT);
  }
  if (!character.currentSupport) throw new Error(`${name}: character did not settle on floor`);

  const camera = new THREE.PerspectiveCamera(51, 1, 0.05, 130);
  const followCamera = new FollowCamera(camera, fakeCanvas());
  followCamera.snap(character.position);
  followCamera.desiredYaw = TARGET_YAW;

  const initialPosition = [...character.position];
  let accumulator = 0;
  let physicsTicks = 0;
  const sampledCameraYaw = [];
  const sampledBasisForward = [];
  const physicsPositions = [];

  for (const rawFrameDt of frameSchedule) {
    const frameDt = Math.min(rawFrameDt, 0.1);
    accumulator += frameDt;
    while (accumulator >= FIXED_DT) {
      const basis = followCamera.basis();
      sampledCameraYaw.push(followCamera.yaw);
      sampledBasisForward.push([...basis.forward]);
      character.preStep(FIXED_DT, forwardIntent(basis));
      b3.b3World_Step(world, FIXED_DT, SUBSTEPS);
      character.postStep(FIXED_DT);
      physicsPositions.push([...character.position]);
      physicsTicks += 1;
      accumulator -= FIXED_DT;
    }
    // This is the ordering used by the browser runtimes: camera presentation state is
    // updated once after all catch-up physics ticks for the render frame.
    followCamera.update(character.position, Boolean(character.currentSupport), frameDt);
  }

  const result = {
    name,
    renderFrames: frameSchedule.length,
    acceptedRenderTime: frameSchedule.reduce((sum, value) => sum + Math.min(value, 0.1), 0),
    physicsTicks,
    accumulatorRemainder: accumulator,
    initialPosition,
    finalPosition: [...character.position],
    displacement: [
      character.position[0] - initialPosition[0],
      character.position[1] - initialPosition[1],
      character.position[2] - initialPosition[2],
    ],
    finalVelocity: [...character.velocity],
    finalCameraYaw: followCamera.yaw,
    firstTenSampledYaw: sampledCameraYaw.slice(0, 10),
    lastSampledYaw: sampledCameraYaw.at(-1),
    firstTenBasisForward: sampledBasisForward.slice(0, 10),
    finalPhysicsPosition: physicsPositions.at(-1),
  };
  b3.b3DestroyWorld(world);
  return result;
}

if (CURRENT_DONOR_REVISION !== 'v1') {
  throw new Error(`A4 expected current Donor v1, got ${CURRENT_DONOR_REVISION}`);
}

const schedules = [
  ['30hz', makeUniformSchedule(30)],
  ['60hz', makeUniformSchedule(60)],
  ['144hz', makeUniformSchedule(144)],
  ['100ms-leading-hitch', makeHitchSchedule()],
];
const results = Object.fromEntries(schedules.map(([name, frames]) => [name, runSchedule(name, frames)]));

for (const result of Object.values(results)) {
  if (result.physicsTicks !== 60) {
    throw new Error(`${result.name}: expected exactly 60 physics ticks, got ${result.physicsTicks}`);
  }
  if (Math.abs(result.acceptedRenderTime - SCHEDULE_DURATION) > 1e-10) {
    throw new Error(`${result.name}: accepted render duration drifted: ${result.acceptedRenderTime}`);
  }
}

const pairs = [];
const names = Object.keys(results);
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = results[names[i]];
    const c = results[names[j]];
    pairs.push({
      a: a.name,
      b: c.name,
      finalHorizontalPositionDelta: horizontalDistance(a.finalPosition, c.finalPosition),
      finalVelocityDelta: Math.hypot(
        a.finalVelocity[0] - c.finalVelocity[0],
        a.finalVelocity[1] - c.finalVelocity[1],
        a.finalVelocity[2] - c.finalVelocity[2],
      ),
      firstPhysicsYawDelta: Math.abs(a.firstTenSampledYaw[0] - c.firstTenSampledYaw[0]),
    });
  }
}
const maxEndpointDelta = Math.max(...pairs.map((pair) => pair.finalHorizontalPositionDelta));
const uniformEndpointDelta = Math.max(
  horizontalDistance(results['30hz'].finalPosition, results['60hz'].finalPosition),
  horizontalDistance(results['30hz'].finalPosition, results['144hz'].finalPosition),
  horizontalDistance(results['60hz'].finalPosition, results['144hz'].finalPosition),
);

const payload = {
  experiment: 'A4 render-cadence camera-relative input coupling crucible',
  donorRevision: CURRENT_DONOR_REVISION,
  fixedDt: FIXED_DT,
  substeps: SUBSTEPS,
  observationDuration: OBSERVATION_DURATION,
  equalSchedulePadSeconds: SCHEDULE_PAD,
  scheduleDuration: SCHEDULE_DURATION,
  targetCameraYawRadians: TARGET_YAW,
  interpretationBoundary: 'Characterization only. Every case executes exactly 60 identical-duration physics ticks with W held; only render-frame cadence controls when the real FollowCamera yaw is updated relative to those ticks. The production accumulator comparison and browser-loop ordering remain unchanged.',
  results,
  pairs,
  uniformEndpointDelta,
  maxEndpointDelta,
  classification: maxEndpointDelta > 1e-5
    ? 'CAMERA_RELATIVE_DONOR_TRAJECTORY_DEPENDS_ON_RENDER_FRAME_SCHEDULE'
    : 'TRAJECTORY_INVARIANT_WITHIN_TEST_RESOLUTION',
};

fs.mkdirSync(path.join('tmp', 'a4'), { recursive: true });
fs.writeFileSync(path.join('tmp', 'a4', 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('A4 render-cadence CHARACTERIZATION COMPLETE');
for (const result of Object.values(results)) {
  console.log(`${result.name}: frames=${result.renderFrames} ticks=${result.physicsTicks} final=[${result.finalPosition.map((v) => v.toFixed(4)).join(', ')}] firstYaw=${result.firstTenSampledYaw[0].toFixed(4)} lastYaw=${result.lastSampledYaw.toFixed(4)}`);
}
console.log(`uniformEndpointDelta=${uniformEndpointDelta.toFixed(6)}m maxEndpointDelta=${maxEndpointDelta.toFixed(6)}m classification=${payload.classification}`);
console.log(JSON.stringify(payload));
