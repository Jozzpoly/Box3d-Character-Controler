import assert from 'node:assert/strict';
import { createE14ContinuousSim } from '../src/e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from '../src/e14-authority-kernel.js';
import { E14_REQUIRED_FINITE_TELEMETRY, assertE14TelemetrySample } from '../src/e14-telemetry-contract.js';

for (const policy of Object.values(E14_AUTHORITY_POLICIES)) {
  const sim = await createE14ContinuousSim({ policy });
  try {
    assertE14TelemetrySample(sim.snapshot(), `${policy} initial`);
    for (const [frames, input] of [[4, 1], [3, 0], [4, -1]]) {
      sim.setInput(input);
      for (let i = 0; i < frames; i += 1) assertE14TelemetrySample(sim.step(true), `${policy} input=${input} frame=${i}`);
    }
  } finally {
    sim.destroy();
  }
}

const fake = Object.fromEntries(E14_REQUIRED_FINITE_TELEMETRY.map((key) => [key, 0]));
Object.assign(fake, {
  axis: 'z',
  policy: E14_AUTHORITY_POLICIES.NATURAL_ONLY,
  preparing: false,
  reactiveSupport: true,
  fallen: false,
  recovered: true,
});
assertE14TelemetrySample(fake, 'synthetic valid contract');
for (const broken of [
  { ...fake, signedLean: Number.NaN },
  { ...fake, targetLean: Number.POSITIVE_INFINITY },
  { ...fake, axis: 'x' },
  { ...fake, signedLeanX: 0 },
]) {
  assert.throws(() => assertE14TelemetrySample(broken, 'synthetic invalid contract'));
}
const missing = { ...fake };
delete missing.signedLean;
assert.throws(() => assertE14TelemetrySample(missing, 'synthetic missing field'));

console.log(JSON.stringify({
  status: 'PASS',
  contract: 'E14.1C finite sagittal telemetry',
  requiredFiniteFields: E14_REQUIRED_FINITE_TELEMETRY,
  staleFieldForbidden: 'signedLeanX',
}, null, 2));
