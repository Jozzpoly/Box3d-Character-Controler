import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createE14ContinuousSim } from '../src/e14-continuous-sim.js';
import { assertE14TelemetrySample } from '../src/e14-telemetry-contract.js';
import {
  e14SpecimenId,
  e14SpecimenToSimConfig,
  normalizeE14Specimen,
  parseE14Specimen,
  serializeE14Specimen,
} from '../src/e14-specimen-config.js';

const OWNER_PIN_CANONICAL = 'e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only';
const OWNER_PIN = parseE14Specimen(OWNER_PIN_CANONICAL);
const SYMMETRIC_BRAKE = normalizeE14Specimen({
  ...OWNER_PIN,
  braking: OWNER_PIN.acceleration,
});
const NUMERICAL_TOLERANCE = 1e-9;
const DIFFERENTIATION_EPS = 1e-6;
const TRACE_LIBRARY = Object.freeze({
  tapRelease: Object.freeze([[12, 1], [48, 0]]),
  holdRelease: Object.freeze([[60, 1], [120, 0]]),
  tapReversal: Object.freeze([[12, 1], [24, -1], [36, 0]]),
  holdReversal: Object.freeze([[60, 1], [60, -1], [120, 0]]),
});
const SAMPLE_KEYS = Object.freeze([
  'targetRelativeVelocity',
  'desiredAcceleration',
  'targetLean',
  'signedLean',
  'balanceTorque',
  'relativeVelocity',
  'playerVelocity',
  'supportVelocity',
  'physicalRelativeDeltaV',
  'frameNormalImpulse',
  'combinedMomentum',
]);

function assertOnlyBrakingChanged(a, b) {
  for (const key of ['supportMass', 'friction', 'acceleration', 'maxBalanceTorque', 'policy']) {
    assert.equal(a[key], b[key], `ablation drifted ${key}`);
  }
  assert.notEqual(a.braking, b.braking, 'ablation must change braking');
}

function maxAbs(samples, key) {
  return Math.max(0, ...samples.map((sample) => Math.abs(sample[key])));
}

function finalSignature(samples) {
  const sample = samples.at(-1);
  return Object.fromEntries(SAMPLE_KEYS.map((key) => [key, sample[key]]));
}

function maxSampleDelta(a, b) {
  assert.equal(a.length, b.length, 'trace length mismatch');
  let worst = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (const key of SAMPLE_KEYS) worst = Math.max(worst, Math.abs(a[i][key] - b[i][key]));
  }
  return worst;
}

function transitionWindows(samples, segmentCount, windowFrames = 8) {
  const result = {};
  for (let segment = 1; segment < segmentCount; segment += 1) {
    result[`segment${segment}`] = samples
      .filter((sample) => sample._segment === segment && sample._localFrame < windowFrames)
      .map((sample) => Object.fromEntries([
        ['frame', sample.frame],
        ['localFrame', sample._localFrame],
        ...SAMPLE_KEYS.map((key) => [key, sample[key]]),
      ]));
  }
  return result;
}

async function runTrace(specimen, trace) {
  const sim = await createE14ContinuousSim(e14SpecimenToSimConfig(specimen));
  try {
    const samples = [];
    for (let segment = 0; segment < trace.length; segment += 1) {
      const [frames, input] = trace[segment];
      sim.setInput(input);
      for (let localFrame = 0; localFrame < frames; localFrame += 1) {
        const sample = assertE14TelemetrySample(sim.step(true), `segment=${segment} frame=${localFrame}`);
        assert.ok(Math.abs(sample.grantedRelativeDeltaV) <= 1e-12, 'natural-only produced authority grant');
        samples.push({ ...sample, _segment: segment, _localFrame: localFrame });
      }
    }
    return {
      samples,
      summary: {
        frames: samples.length,
        supportLossFrames: samples.filter((sample) => !sample.reactiveSupport).length,
        fallenFrames: samples.filter((sample) => sample.fallen).length,
        maxAbsDesiredAcceleration: maxAbs(samples, 'desiredAcceleration'),
        maxAbsTargetLeanDeg: maxAbs(samples, 'targetLean') * 180 / Math.PI,
        maxAbsSignedLeanDeg: maxAbs(samples, 'signedLean') * 180 / Math.PI,
        maxAbsBalanceTorque: maxAbs(samples, 'balanceTorque'),
        maxAbsRelativeVelocity: maxAbs(samples, 'relativeVelocity'),
        maxAbsPhysicalRelativeDeltaV: maxAbs(samples, 'physicalRelativeDeltaV'),
        totalAbsPhysicalRelativeDeltaV: samples.reduce((sum, sample) => sum + Math.abs(sample.physicalRelativeDeltaV), 0),
        final: finalSignature(samples),
        transitionWindows: transitionWindows(samples, trace.length),
      },
    };
  } finally {
    sim.destroy();
  }
}

async function runCondition(specimen) {
  const traces = {};
  let worstRepeatDelta = 0;
  for (const [name, trace] of Object.entries(TRACE_LIBRARY)) {
    const first = await runTrace(specimen, trace);
    const second = await runTrace(specimen, trace);
    const repeatDelta = maxSampleDelta(first.samples, second.samples);
    assert.ok(repeatDelta <= NUMERICAL_TOLERANCE, `${name} repeat delta ${repeatDelta}`);
    worstRepeatDelta = Math.max(worstRepeatDelta, repeatDelta);
    traces[name] = { ...first.summary, repeatDeterminismDelta: repeatDelta };
  }
  return {
    canonical: serializeE14Specimen(specimen),
    specimenId: e14SpecimenId(specimen),
    braking: specimen.braking,
    traces,
    repeatedTraceDeterminism: {
      status: 'PASS',
      worstMaxSampleDelta: worstRepeatDelta,
      tolerance: NUMERICAL_TOLERANCE,
    },
  };
}

assertOnlyBrakingChanged(OWNER_PIN, SYMMETRIC_BRAKE);
const pinned = await runCondition(OWNER_PIN);
const symmetricBrake = await runCondition(SYMMETRIC_BRAKE);
const comparisons = {};
for (const [name, trace] of Object.entries(TRACE_LIBRARY)) {
  const a = await runTrace(OWNER_PIN, trace);
  const b = await runTrace(SYMMETRIC_BRAKE, trace);
  const maxTrajectoryDelta = maxSampleDelta(a.samples, b.samples);
  const firstTransitionA = a.samples.find((sample) => sample._segment === 1 && sample._localFrame === 0);
  const firstTransitionB = b.samples.find((sample) => sample._segment === 1 && sample._localFrame === 0);
  comparisons[name] = {
    maxTrajectoryDelta,
    trajectoryDifferentiated: maxTrajectoryDelta > DIFFERENTIATION_EPS,
    firstTransition: {
      pinned: Object.fromEntries(SAMPLE_KEYS.map((key) => [key, firstTransitionA[key]])),
      symmetricBrake: Object.fromEntries(SAMPLE_KEYS.map((key) => [key, firstTransitionB[key]])),
      deltas: Object.fromEntries(SAMPLE_KEYS.map((key) => [key, firstTransitionA[key] - firstTransitionB[key]])),
    },
  };
}

const report = {
  apparatus: 'E14 Owner-pin braking ablation v1',
  question: 'Does the Owner-pinned b=36 versus a=3 asymmetry materially alter deterministic natural-only posture/physics trajectories?',
  controlledChange: {
    field: 'braking',
    pinned: OWNER_PIN.braking,
    ablation: SYMMETRIC_BRAKE.braking,
    rationale: 'Set braking equal to the pinned acceleration (3) while preserving every other specimen field.',
  },
  pinned,
  symmetricBrake,
  comparisons,
  machineBoundary: 'This is a deterministic one-variable causal-sensitivity probe. It may show that braking asymmetry changes the physical action repertoire; it cannot decide whether the Owner experienced skill, fun, embodiment, or a better player controller.',
};

const outputPath = process.argv[2] ?? null;
if (outputPath) fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
