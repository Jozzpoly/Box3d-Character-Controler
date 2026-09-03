import assert from 'node:assert/strict';
import { createE14ContinuousSim } from '../src/e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from '../src/e14-authority-kernel.js';

function runFrames(sim, frames, input) {
  sim.setInput(input);
  const trace = [];
  for (let i = 0; i < frames; i++) trace.push(sim.step(true));
  return trace;
}

async function runPolicy(policy, friction = 0.95) {
  const sim = await createE14ContinuousSim({ policy, friction });
  try {
    const launch = runFrames(sim, 18, 1);
    const release = runFrames(sim, 12, 0);
    const reverse = runFrames(sim, 18, -1);
    return { launch, release, reverse, last: sim.snapshot() };
  } finally {
    sim.destroy();
  }
}

const natural = await runPolicy(E14_AUTHORITY_POLICIES.NATURAL_ONLY);
assert.ok(natural.launch.every((s) => Math.abs(s.playerImpulse) < 1e-12 && Math.abs(s.supportImpulse) < 1e-12));

const external = await runPolicy(E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL);
assert.ok(external.launch.some((s) => Math.abs(s.playerImpulse) > 1e-6), 'external should grant supplemental authority');
assert.ok(external.launch.every((s) => Math.abs(s.supportImpulse) < 1e-12), 'external support impulse must stay zero');

const reciprocal = await runPolicy(E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL);
assert.ok(reciprocal.launch.some((s) => Math.abs(s.playerImpulse) > 1e-6), 'reciprocal should grant supplemental authority');
for (const sample of reciprocal.launch) {
  assert.ok(Math.abs(sample.playerImpulse + sample.supportImpulse) < 1e-8, 'reciprocal authority momentum must cancel');
}

const zeroFriction = await runPolicy(E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL, 0);
assert.ok(zeroFriction.launch.every((s) => Math.abs(s.playerImpulse) < 1e-9), 'zero friction must not unlock supplemental authority');

for (const result of [natural, external, reciprocal, zeroFriction]) {
  const all = [...result.launch, ...result.release, ...result.reverse];
  assert.ok(all.every((s) => Number.isFinite(s.relativeVelocity)), 'relative velocity must remain finite');
  assert.ok(all.every((s) => Number.isFinite(s.torsoTilt)), 'posture must remain finite');
}

console.log(JSON.stringify({
  status: 'PASS',
  natural: natural.last,
  external: external.last,
  reciprocal: reciprocal.last,
  zeroFriction: zeroFriction.last,
}, null, 2));
