import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bootstrap = fs.readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');
const lab = fs.readFileSync(new URL('../src/e14-lab-browser.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/e14-lab.css', import.meta.url), 'utf8');

assert.match(bootstrap, /mode=e14lab|e14lab|contextual/i, 'bootstrap must expose an E14 lab route');
assert.match(lab, /E14\.1C · PINNED BOUNDARY SKILL PROBE/);
assert.match(lab, /DISCOVERY → PIN → LOCK → PLAY/);
assert.match(lab, /ENTITLED_EXTERNAL/);
assert.match(lab, /ENTITLED_RECIPROCAL/);
assert.match(lab, /NATURAL_ONLY/);
assert.match(lab, /Support mass/);
assert.match(lab, /Friction/);
assert.match(lab, /Acceleration/);
assert.match(lab, /Braking/);
assert.match(lab, /Balance torque/);
assert.match(lab, /Single step/);
assert.match(lab, /immediate A\/D/i, 'Owner Lab must disclose immediate-input temporal contract');
assert.match(lab, /system pZ/, 'HUD must report momentum on the sagittal experiment axis');
assert.match(lab, /sample\.signedLean/, 'HUD must read current sagittal lean telemetry');
assert.doesNotMatch(lab, /signedLeanX/, 'stale browser-X lean telemetry must not return');
assert.match(lab, /floor grid\/ticks are non-physical world-Z guides|experiment-axis guide/i, 'visual references must be explicitly non-physical');
assert.doesNotMatch(lab, /gold posts/i, 'former false-affordance gold posts must not return');

for (const id of ['lab-pin', 'lab-restore', 'lab-lock', 'lab-unlock', 'lab-copy']) {
  assert.match(lab, new RegExp(`id=["']${id}["']`), `missing ${id} Owner control`);
}
assert.match(lab, /readE14SpecimenFromSearch/);
assert.match(lab, /writeE14SpecimenToSearch/);
assert.match(lab, /e14SpecimenId/);
assert.match(lab, /serializeE14Specimen/);
assert.match(lab, /e14SpecimenToSimConfig/);
assert.match(lab, /clearHeldInput\(\)/, 'clean restore must clear held input');
assert.match(lab, /paused = false/, 'clean restore must establish declared run state');
assert.match(lab, /accumulator = 0/, 'clean restore must clear browser stepping remainder');
assert.match(lab, /LOCK → clean PIN restore/, 'LOCK must begin from a clean pinned restore');
assert.match(lab, /clean pinned reset/, 'locked reset must restore the pinned configuration');
assert.match(lab, /if \(locked\) return;/, 'locked instrument must reject discovery mutations');
assert.match(css, /#e14lab-panel\.locked \.lab-discovery-only/);
assert.match(css, /#e14lab-panel\.locked \.lab-detail-only/);

for (const relative of [
  './e14-1c-specimen-contract.mjs',
  './e14-1c-telemetry-contract.mjs',
  './e14-1c-pinned-specimen-qualification.mjs',
]) {
  const script = fileURLToPath(new URL(relative, import.meta.url));
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${relative} instrumentation sub-contract failed`);
}

console.log(JSON.stringify({
  status: 'PASS',
  surface: 'E14.1C pinned boundary skill Owner instrument contract',
  axis: 'z',
  temporalContract: 'immediate-input / no hidden anticipation',
  stateModel: 'PLAY rebuild may preserve state; PIN RESTORE / LOCK reset is clean and neutral',
}, null, 2));
