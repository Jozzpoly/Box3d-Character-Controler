import fs from 'node:fs';
import { createE14ContinuousSim } from '../src/e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from '../src/e14-authority-kernel.js';

function phaseSummary(samples) {
  const finite = samples.filter(Boolean);
  const mean = (key) => finite.reduce((sum, s) => sum + s[key], 0) / Math.max(1, finite.length);
  const min = (key) => Math.min(...finite.map((s) => s[key]));
  const max = (key) => Math.max(...finite.map((s) => s[key]));
  const sum = (key) => finite.reduce((total, s) => total + s[key], 0);
  return {
    frames: finite.length,
    first: finite[0] ?? null,
    last: finite.at(-1) ?? null,
    q: { min: min('entitlement'), mean: mean('entitlement'), max: max('entitlement') },
    relativeVelocity: { min: min('relativeVelocity'), max: max('relativeVelocity') },
    targetError: {
      maxAbs: Math.max(...finite.map((s) => Math.abs(s.targetRelativeVelocity - s.relativeVelocity))),
      final: finite.length ? finite.at(-1).targetRelativeVelocity - finite.at(-1).relativeVelocity : 0,
    },
    leanDeg: {
      min: min('signedLeanX') * 180 / Math.PI,
      max: max('signedLeanX') * 180 / Math.PI,
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
    systemMomentum: { min: min('combinedMomentum'), max: max('combinedMomentum'), final: finite.at(-1)?.combinedMomentum ?? 0 },
  };
}

function runFrames(sim, count, input) {
  sim.setInput(input);
  const samples = [];
  for (let i = 0; i < count; i++) samples.push(sim.step(true));
  return samples;
}

async function runScenario(policy, friction = 0.95) {
  const sim = await createE14ContinuousSim({ policy, friction });
  try {
    const initial = sim.snapshot();
    const launch = runFrames(sim, 18, 1);
    const release = runFrames(sim, 12, 0);
    const reverse = runFrames(sim, 18, -1);
    return {
      policy,
      friction,
      initial,
      launch: phaseSummary(launch),
      release: phaseSummary(release),
      reverse: phaseSummary(reverse),
      firstLaunchFrames: launch.slice(0, 12),
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
      result[policy] = sim.step(true);
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
  note: 'Observation-only E14.1 diagnostic. No gameplay-quality threshold is implied.',
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
    natural: await runScenario(E14_AUTHORITY_POLICIES.NATURAL_ONLY),
    external: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL),
    reciprocal: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL),
    zeroFrictionExternal: await runScenario(E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL, 0),
  },
};

const outputPath = process.argv[2] ?? 'e14-1d-diagnostics.json';
fs.writeFileSync(outputPath, `${JSON.stringify(diagnostics, null, 2)}\n`);
console.log(`E14 diagnostics written to ${outputPath}`);
