import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createE14ContinuousSim } from '../src/e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from '../src/e14-authority-kernel.js';
import { assertE14TelemetrySample } from '../src/e14-telemetry-contract.js';
import {
  e14SpecimenId,
  e14SpecimenToSimConfig,
  normalizeE14Specimen,
  parseE14Specimen,
  serializeE14Specimen,
} from '../src/e14-specimen-config.js';

const NUMERICAL_TOLERANCE = 1e-9;
const DIFFERENTIATION_EPS = 1e-6;
const DEFAULT_SPECIMEN = Object.freeze({
  supportMass: 800,
  friction: 0.95,
  acceleration: 31,
  braking: 36,
  maxBalanceTorque: 320,
  policy: E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL,
});
const TRACE_LIBRARY = Object.freeze({
  shortPulse: Object.freeze([[6, 1], [12, 0]]),
  longerHold: Object.freeze([[18, 1]]),
  pulseRelease: Object.freeze([[10, 1], [14, 0]]),
  pulseReversal: Object.freeze([[10, 1], [10, -1]]),
});
const SIGNATURE_KEYS = Object.freeze([
  'relativeVelocity',
  'playerVelocity',
  'supportVelocity',
  'playerAxisPosition',
  'supportAxisPosition',
  'signedLean',
  'torsoAngularVelocity',
  'combinedMomentum',
]);

function parseArgs() {
  let specimen = DEFAULT_SPECIMEN;
  let outputPath = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--spec=')) specimen = parseE14Specimen(arg.slice('--spec='.length));
    else if (arg.startsWith('--out=')) outputPath = arg.slice('--out='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { specimen: normalizeE14Specimen(specimen), outputPath };
}

function signature(sample) {
  assertE14TelemetrySample(sample, 'qualification signature');
  return Object.fromEntries(SIGNATURE_KEYS.map((key) => [key, sample[key]]));
}

function maxSignatureDelta(a, b) {
  return Math.max(...SIGNATURE_KEYS.map((key) => Math.abs(a[key] - b[key])));
}

function assertSignatureClose(a, b, label) {
  const delta = maxSignatureDelta(a, b);
  assert.ok(delta <= NUMERICAL_TOLERANCE, `${label}: deterministic signature delta ${delta} > ${NUMERICAL_TOLERANCE}`);
  return delta;
}

async function fresh(specimen) {
  return createE14ContinuousSim(e14SpecimenToSimConfig(specimen));
}

async function initialSignature(specimen) {
  const sim = await fresh(specimen);
  try {
    return signature(sim.snapshot());
  } finally {
    sim.destroy();
  }
}

async function runTrace(specimen, trace) {
  const sim = await fresh(specimen);
  try {
    const initial = assertE14TelemetrySample(sim.snapshot(), 'trace initial');
    const samples = [];
    for (const [frames, input] of trace) {
      sim.setInput(input);
      for (let i = 0; i < frames; i += 1) samples.push(assertE14TelemetrySample(sim.step(true), `trace input=${input} frame=${i}`));
    }
    return {
      initial: signature(initial),
      final: signature(samples.at(-1) ?? initial),
      supportLossFrames: samples.filter((sample) => !sample.reactiveSupport).length,
      fallenFrames: samples.filter((sample) => sample.fallen).length,
      maxAbsLeanDeg: Math.max(0, ...samples.map((sample) => Math.abs(sample.signedLean) * 180 / Math.PI)),
      samples: samples.length,
    };
  } finally {
    sim.destroy();
  }
}

async function noInputSanity(specimen) {
  const sim = await fresh(specimen);
  try {
    const initial = assertE14TelemetrySample(sim.snapshot(), 'no-input initial');
    sim.setInput(0);
    const samples = [];
    for (let i = 0; i < 30; i += 1) samples.push(assertE14TelemetrySample(sim.step(true), `no-input frame=${i}`));
    const immediateFailure = samples.slice(0, 3).some((sample) => sample.fallen || !sample.reactiveSupport);
    return {
      status: immediateFailure ? 'IMMEDIATE_COLLAPSE_OR_SUPPORT_LOSS' : 'SANE',
      initial: signature(initial),
      final: signature(samples.at(-1)),
      supportLossFrames: samples.filter((sample) => !sample.reactiveSupport).length,
      fallenFrames: samples.filter((sample) => sample.fallen).length,
    };
  } finally {
    sim.destroy();
  }
}

async function qualify(specimen) {
  const firstInitial = await initialSignature(specimen);
  const secondInitial = await initialSignature(specimen);
  const resetDelta = assertSignatureClose(firstInitial, secondInitial, 'fresh restore determinism');

  const traces = {};
  let worstRepeatDelta = 0;
  for (const [name, trace] of Object.entries(TRACE_LIBRARY)) {
    const first = await runTrace(specimen, trace);
    const second = await runTrace(specimen, trace);
    const repeatDelta = assertSignatureClose(first.final, second.final, `${name} repeat determinism`);
    worstRepeatDelta = Math.max(worstRepeatDelta, repeatDelta);
    traces[name] = { ...first, repeatDeterminismDelta: repeatDelta };
  }

  const names = Object.keys(traces);
  const pairwise = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = names[i];
      const b = names[j];
      pairwise.push({ a, b, maxSignatureDelta: maxSignatureDelta(traces[a].final, traces[b].final) });
    }
  }
  const differentiatedPairs = pairwise.filter((pair) => pair.maxSignatureDelta > DIFFERENTIATION_EPS);
  const actionSpace = differentiatedPairs.length > 0 ? 'INPUT_DIFFERENTIATED' : 'APPEARS_NARROW_AT_DECLARED_TRACES';

  return {
    apparatus: 'E14.1C generic pinned-specimen qualification v1',
    specimen: normalizeE14Specimen(specimen),
    canonical: serializeE14Specimen(specimen),
    specimenId: e14SpecimenId(specimen),
    noInputSanity: await noInputSanity(specimen),
    resetDeterminism: { status: 'PASS', maxSignatureDelta: resetDelta, tolerance: NUMERICAL_TOLERANCE },
    repeatedTraceDeterminism: { status: 'PASS', worstMaxSignatureDelta: worstRepeatDelta, tolerance: NUMERICAL_TOLERANCE },
    inputDifferentiation: {
      status: actionSpace,
      numericalEpsilon: DIFFERENTIATION_EPS,
      differentiatedPairs: differentiatedPairs.length,
      totalPairs: pairwise.length,
      pairwise,
    },
    traces,
    machineBoundary: 'This apparatus checks numerical/telemetry/reset/input differentiation only; it does not judge fun or skill.',
  };
}

const { specimen, outputPath } = parseArgs();
const report = await qualify(specimen);
if (outputPath) fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
