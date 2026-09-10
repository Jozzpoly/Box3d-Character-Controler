import * as THREE from 'three';
import { FollowCamera } from '../src/follow-camera.js';

const FIXED_DT = 1 / 60;
const DURATION = 1.0;
const EPS = 1e-9;

function fakeCanvas() {
  return {
    addEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() { return false; },
  };
}

function makeCamera() {
  const camera = new THREE.PerspectiveCamera(51, 1, 0.05, 130);
  const follow = new FollowCamera(camera, fakeCanvas());
  follow.snap([0, 0.92, 0]);
  return follow;
}

function uniformFrames(hz) {
  const out = [];
  let t = 0;
  while (t < DURATION - EPS) {
    const next = Math.min(DURATION, t + 1 / hz);
    out.push(next - t);
    t = next;
  }
  return out;
}

function hitchFrames() {
  const out = [0.1];
  let t = 0.1;
  while (t < DURATION - EPS) {
    const next = Math.min(DURATION, t + 1 / 60);
    out.push(next - t);
    t = next;
  }
  return out;
}

const inputEvents = [
  { time: 0.041, yaw: 0.55 },
  { time: 0.119, yaw: -0.85 },
  { time: 0.203, yaw: 1.4 },
  { time: 0.377, yaw: 0.1 },
  { time: 0.511, yaw: -1.9 },
  { time: 0.693, yaw: 2.2 },
  { time: 0.827, yaw: 0.7 },
];

function run(name, frames) {
  const follow = makeCamera();
  let wallTime = 0;
  let simulatedTime = 0;
  let accumulator = 0;
  let eventIndex = 0;
  const samples = [];

  for (const frameDt of frames) {
    const frameEnd = wallTime + frameDt;

    // Browser-style state delivery approximation: events become observable before
    // the next RAF callback, then every catch-up physics tick in that RAF sees
    // the latest state. This intentionally characterizes the batching boundary.
    while (eventIndex < inputEvents.length && inputEvents[eventIndex].time <= frameEnd + EPS) {
      follow.desiredYaw = inputEvents[eventIndex].yaw;
      eventIndex += 1;
    }

    accumulator += Math.min(frameDt, 0.1);
    while (accumulator + EPS >= FIXED_DT && simulatedTime < DURATION - EPS) {
      samples.push({
        simulatedTime,
        desiredYaw: follow.desiredYaw,
        controlYaw: follow.controlYaw,
      });
      follow.advanceControl(FIXED_DT);
      simulatedTime += FIXED_DT;
      accumulator -= FIXED_DT;
    }

    wallTime = frameEnd;
  }

  return { name, samples, finalControlYaw: follow.controlYaw };
}

function maxSequenceDelta(a, b, key) {
  const count = Math.min(a.samples.length, b.samples.length);
  let max = 0;
  for (let i = 0; i < count; i += 1) {
    max = Math.max(max, Math.abs(a.samples[i][key] - b.samples[i][key]));
  }
  return max;
}

const runs = {
  '30hz': run('30hz', uniformFrames(30)),
  '60hz': run('60hz', uniformFrames(60)),
  '144hz': run('144hz', uniformFrames(144)),
  '100ms-leading-hitch': run('100ms-leading-hitch', hitchFrames()),
};

const names = Object.keys(runs);
let maxDesiredYawDelta = 0;
let maxControlYawDelta = 0;
for (let i = 0; i < names.length; i += 1) {
  for (let j = i + 1; j < names.length; j += 1) {
    maxDesiredYawDelta = Math.max(maxDesiredYawDelta, maxSequenceDelta(runs[names[i]], runs[names[j]], 'desiredYaw'));
    maxControlYawDelta = Math.max(maxControlYawDelta, maxSequenceDelta(runs[names[i]], runs[names[j]], 'controlYaw'));
  }
}

if (maxDesiredYawDelta <= 1e-9 || maxControlYawDelta <= 1e-9) {
  throw new Error(`falsifier did not expose expected batching boundary: desired=${maxDesiredYawDelta} control=${maxControlYawDelta}`);
}

console.log('A4B WALL-CLOCK INPUT BATCHING BOUNDARY CONFIRMED');
console.log(`maxDesiredYawSequenceDelta=${maxDesiredYawDelta}`);
console.log(`maxControlYawSequenceDelta=${maxControlYawDelta}`);
console.log('classification=INPUT_EVENT_TO_FIXED_TICK_MAPPING_REMAINS_FRAME_BATCH_DEPENDENT');
