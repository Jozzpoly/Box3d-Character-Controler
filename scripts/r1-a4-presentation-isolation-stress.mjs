import * as THREE from 'three';
import { FollowCamera } from '../src/follow-camera.js';

const FIXED_DT = 1 / 60;
const TRIALS = 256;
const TICKS = 240;
const TOLERANCE = 1e-12;

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

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function angleDelta(a, b) {
  return Math.abs(a - b);
}

function basisDelta(a, b) {
  return Math.max(
    ...a.forward.map((v, i) => Math.abs(v - b.forward[i])),
    ...a.right.map((v, i) => Math.abs(v - b.right[i])),
  );
}

function buildTargetSequence(seed) {
  const random = rng(seed ^ 0xa4f00d);
  const targets = [];
  let target = 0;
  for (let tick = 0; tick < TICKS; tick += 1) {
    if (tick === 0 || random() < 0.18) {
      target += (random() * 2 - 1) * Math.PI * 1.35;
    }
    targets.push(target);
  }
  return targets;
}

function runBaseline(targets) {
  const follow = makeCamera();
  const samples = [];
  for (let tick = 0; tick < targets.length; tick += 1) {
    follow.desiredYaw = targets[tick];
    samples.push({ yaw: follow.controlYaw, basis: follow.controlBasis() });
    follow.advanceControl(FIXED_DT);
  }
  return { samples, finalYaw: follow.controlYaw, finalBasis: follow.controlBasis() };
}

function runPresentationStress(seed, targets) {
  const random = rng(seed ^ 0x51a7e);
  const follow = makeCamera();
  const samples = [];

  for (let tick = 0; tick < targets.length; tick += 1) {
    follow.desiredYaw = targets[tick];

    // Adversarial presentation work before the mechanical sample.
    const beforeUpdates = Math.floor(random() * 8);
    for (let i = 0; i < beforeUpdates; i += 1) {
      const frameDt = 1 / (24 + random() * 216);
      const target = [
        (random() * 2 - 1) * 12,
        0.8 + random() * 5,
        (random() * 2 - 1) * 12,
      ];
      follow.update(target, random() > 0.4, frameDt);
    }

    samples.push({ yaw: follow.controlYaw, basis: follow.controlBasis() });
    follow.advanceControl(FIXED_DT);

    // More presentation work after the fixed-step control advance.
    const afterUpdates = Math.floor(random() * 8);
    for (let i = 0; i < afterUpdates; i += 1) {
      let frameDt = 1 / (20 + random() * 220);
      if (random() < 0.04) frameDt = 0.1;
      follow.update([
        (random() * 2 - 1) * 20,
        0.5 + random() * 8,
        (random() * 2 - 1) * 20,
      ], random() > 0.5, frameDt);
    }
  }

  return { samples, finalYaw: follow.controlYaw, finalBasis: follow.controlBasis() };
}

function assertEquivalent(seed, baseline, stressed) {
  if (baseline.samples.length !== stressed.samples.length) {
    throw new Error(`seed ${seed}: sample length mismatch`);
  }
  let maxYawDelta = 0;
  let maxBasisDelta = 0;
  for (let i = 0; i < baseline.samples.length; i += 1) {
    maxYawDelta = Math.max(maxYawDelta, angleDelta(baseline.samples[i].yaw, stressed.samples[i].yaw));
    maxBasisDelta = Math.max(maxBasisDelta, basisDelta(baseline.samples[i].basis, stressed.samples[i].basis));
  }
  maxYawDelta = Math.max(maxYawDelta, angleDelta(baseline.finalYaw, stressed.finalYaw));
  maxBasisDelta = Math.max(maxBasisDelta, basisDelta(baseline.finalBasis, stressed.finalBasis));
  if (maxYawDelta > TOLERANCE || maxBasisDelta > TOLERANCE) {
    throw new Error(`seed ${seed}: presentation contaminated control state: yaw=${maxYawDelta} basis=${maxBasisDelta}`);
  }
  return { maxYawDelta, maxBasisDelta };
}

function assertResetAndSnapIsolation() {
  const follow = makeCamera();
  follow.desiredYaw = 2.4;
  for (let i = 0; i < 20; i += 1) {
    follow.update([i * 0.1, 1 + i * 0.03, -i * 0.05], i % 2 === 0, 1 / 37);
    follow.advanceControl(FIXED_DT);
  }
  follow.reset();
  if (Math.abs(follow.controlYaw) > TOLERANCE || Math.abs(follow.yaw) > TOLERANCE) {
    throw new Error('reset did not realign visual and control yaw');
  }
  follow.desiredYaw = -1.75;
  follow.update([4, 3, -2], false, 0.1);
  follow.snap([2, 1, 3]);
  if (Math.abs(follow.controlYaw - follow.desiredYaw) > TOLERANCE || Math.abs(follow.yaw - follow.desiredYaw) > TOLERANCE) {
    throw new Error('snap did not realign visual and control yaw to desired yaw');
  }
}

assertResetAndSnapIsolation();

let globalMaxYawDelta = 0;
let globalMaxBasisDelta = 0;
for (let seed = 1; seed <= TRIALS; seed += 1) {
  const targets = buildTargetSequence(seed);
  const baseline = runBaseline(targets);
  const stressed = runPresentationStress(seed, targets);
  const result = assertEquivalent(seed, baseline, stressed);
  globalMaxYawDelta = Math.max(globalMaxYawDelta, result.maxYawDelta);
  globalMaxBasisDelta = Math.max(globalMaxBasisDelta, result.maxBasisDelta);
}

console.log('R1 A4 PRESENTATION ISOLATION STRESS PASS');
console.log(`trials=${TRIALS} ticksPerTrial=${TICKS}`);
console.log(`maxControlYawDelta=${globalMaxYawDelta}`);
console.log(`maxControlBasisDelta=${globalMaxBasisDelta}`);
