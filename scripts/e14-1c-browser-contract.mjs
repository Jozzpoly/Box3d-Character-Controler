import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrap = fs.readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');
const lab = fs.readFileSync(new URL('../src/e14-lab-browser.js', import.meta.url), 'utf8');

assert.match(bootstrap, /mode=e14lab|e14lab|contextual/i, 'bootstrap must expose an E14 lab route');
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
assert.match(lab, /world Z=0|experiment axis is world Z/i, 'fixed visual references must disclose the experiment axis');

console.log(JSON.stringify({
  status: 'PASS',
  surface: 'E14.1B thin Owner Lab contract',
  axis: 'z',
  temporalContract: 'immediate-input / no hidden anticipation',
}, null, 2));
