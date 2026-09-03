import fs from 'node:fs';
import { createE14ContinuousSim } from '../src/e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from '../src/e14-authority-kernel.js';
import { assertE14TelemetrySample, assertE14TelemetrySeries } from '../src/e14-telemetry-contract.js';

function phaseSummary(samples, label) {
  const finite = assertE14TelemetrySeries(samples.filter(Boolean), label);
  const mean = (key) => finite.reduce((sum, s) => sum + s[key], 0) / finite.length;
  const min = (key) => Math.min(...finite.map((s) => s[key]));
  const max = (key) => Math.max(...finite.map((s) => s[key]));
  const sum = (key) => finite.reduce((total, s) => total + s[key], 0);
  return {
    frames: finite.length,
    preparationFrames: finite.filter((s) => s.preparing).length,
    first: finite[0],
    last: finite.at(-1),
    q: { min: min('entitlement'), mean: mean('entitlement'), max: max('entitlement') },
    relativeVelocity: { min: min('relativeVelocity'), max: max('relativeVelocity') },
    targetError: {
      maxAbs: Math.max(...finite.map((s) => Math.abs(s.targetRelativeVelocity - s.relativeVelocity))),
      final: finite.at(-1).targetRelativeVelocity - finite.at(-1).relativeVelocity,
    },
    leanDeg: {
      min: min('signedLean') * 180 / Math.PI,
      max: max('signedLean') * 180 / Math.PI,
      targetMin: min('targetLean') * 180 / Math.PI,
      targetMax: max('targetLean') * 180 / Math.PI,
    },
    torque: {
      maxAbs: Math.max(...finite.map((s) => Math.abs(s.balanceTorque))),
      saturationFrames: finite.filter((s) => Math.abs(s.balanceTorque) >= 319.999).length,
    },
    supportLossFrames: finite.filter((s) => !s.reactiveSupport).length,
    fallenFrames: finite.filter((s) => s.fallen).length,
    naturalRelativeDeltaVSum: sum('physicalRelativeDeltaV'),
    supplementalRelativeDeltaVSum: sum('grantedRelativeDeltaV'),
    playerAuthorityImpulseSum: sum('playerImpulse'),
    supportAuthorityImpulseSum: sum('supportImpulse'),
    systemMomentum: { min: min('combinedMomentum'), max: max('combinedMomentum'), final: finite.at(-1).combinedMomentum },
  };
}

function runFrames(sim, count, input) {
  sim.setInput(input);
  const samples = [];
  for (let i = 0; i < count; i++) samples.push(assertE14TelemetrySample(sim.step(true), `runFrames input=${input} frame=${i}`));
  return samples;
}

async function runScenario(policy, { friction = 0.95, preparationFrames = 0 } = {}) {
  const sim = await createE14ContinuousSim({ policy, friction, preparationFrames });
  try {
    const initial = assertE14TelemetrySample(sim.snapshot(), `${policy} initial`);
    const launch = runFrames(sim, 18 + preparationFrames, 1);
    const release = runFrames(sim, 12 + preparationFrames, 0);
    const reverse = runFrames(sim, 18 + preparationFrames, -1);
    return {
      policy,
      friction,
      preparationFrames,
      initial,
      launch: phaseSummary(launch, `${policy} launch`),
      release: phaseSummary(release, `${policy} release`),
      reverse: phaseSummary(reverse, `${policy} reverse`),
      firstLaunchFrames: launch.slice(0, 12 + preparationFrames),
    };
  } finally {
    sim.destroy();
  }
}

async function matchedFirstCommand() {
  const policies = [
    E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL,
    E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL,
  ];
  const result = {};
  for (const policy of policies) {
    const sim = await createE14ContinuousSim({ policy });
    try {
      sim.setInput(1);
      result[policy] = assertE14TelemetrySample(sim.step(true), `${policy} matched first command`);
    } finally {
      sim.destroy();
    }
  }
  const a = result[E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL];
  const b = result[E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL];
  return {
    samples: result,
    deltas: {
      physicalRelativeDeltaV: a.physicalRelativeDeltaV - b.physicalRelativeDeltaV,
      frameNormalImpulse: a.frameNormalImpulse - b.frameNormalImpulse,
      entitlement: a.entitlement - b.entitlement,
      requestedShortfall: a.requestedShortfall - b.requestedShortfall,
      grantedRelativeDeltaV: a.grantedRelativeDeltaV - b.grantedRelativeDeltaV,
      immediateRelativeVelocity: a.relativeVelocity - b.relativeVelocity,
      combinedMomentum: a.combinedMomentum - b.combinedMomentum,
    },
  };
}

const diagnostics = {
  generatedBy: 'scripts/e14-1d-continuous-diagnostics.mjs',
  schema: 'e14-1d-corrected-sagittal-telemetry-v2',
  note: 'Observation-only E14.1 diagnostic. Historical pre-E14.1C artifacts used stale signedLeanX in phase summaries; corrected evidence is new evidence, not a retroactive repair. Lead8 remains an E4-derived temporal oracle, not a gameplay delay or production policy.',
  reference: {
    playerMass: 80,
    supportMass: 800,
    friction: 0.95,
    acceleration: 31,
    braking: 36,
    maxSpeed: 5.2,
    maxBalanceTorque: 320,
    dt: 1 / 60,
    substeps: 4,
  },
  matchedFirstCommand: await matchedFirstCommand(),
  scenarios: {
    naturalNoLead: await runScenario(E14_AUTHORITY_POLICIES.NATURAL_ONLY),
    externalNoLead: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL),
    reciprocalNoLead: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL),
    externalLead8Oracle: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL, { preparationFrames: 8 }),
    reciprocalLead8Oracle: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL, { preparationFrames: 8 }),
    zeroFrictionExternalNoLead: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL, { friction: 0 }),
  },
};

const outputPath = process.argv[2] ?? 'e14-1d-diagnostics.json';
fs.writeFileSync(outputPath, `${JSON.stringify(diagnostics, null, 2)}\n`);
console.log(`E14 corrected diagnostics written to ${outputPath}`);
