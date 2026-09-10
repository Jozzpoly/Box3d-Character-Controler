import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

const required = [
  "const TEMPORAL_SHADOW_MODE = urlParams.get('temporalShadow') === '1';",
  'const playerInput = new PlayerInput({ touchRoot, forceTouch });',
  'const intent = playerInput.sample(basis);',
  'character.preStep(dt, intent);',
  'temporalShadowObserver.beginFrame(now / 1000)',
  'temporalShadowObserver.endFrame(temporalAudit.frame, { actualTicks: physicsTicksThisFrame });',
  "console.warn('R2 temporal shadow disabled after observer failure', error);",
  'temporalShadowObserver = null;',
];
for (const text of required) assert.ok(source.includes(text), `missing runtime-shadow boundary witness: ${text}`);

// The observer must be opt-in and must not replace or wrap PlayerInput authority.
const observerCtor = source.indexOf('new TemporalRuntimeShadowObserver({');
const gate = source.lastIndexOf('TEMPORAL_SHADOW_MODE', observerCtor);
assert.ok(observerCtor > 0 && gate >= 0 && observerCtor - gate < 120, 'observer construction must remain directly query-gated');

const sample = source.indexOf('const intent = playerInput.sample(basis);');
const preStep = source.indexOf('character.preStep(dt, intent);', sample);
assert.ok(sample > 0 && preStep > sample, 'PlayerInput sample must remain direct gameplay intent authority');

const beginFrame = source.indexOf('temporalShadowObserver.beginFrame(now / 1000)');
const frameDt = source.indexOf('const frameDt = Math.min((now - previous) / 1000, 0.1);');
const whileLoop = source.indexOf('while (accumulator >= FIXED_DT)', frameDt);
const endFrame = source.indexOf('temporalShadowObserver.endFrame(temporalAudit.frame, { actualTicks: physicsTicksThisFrame });');
assert.ok(beginFrame > 0 && beginFrame < frameDt, 'shadow must observe before the real frame accumulator consumes physics');
assert.ok(frameDt < whileLoop && whileLoop < endFrame, 'actual physics tick count must be measured before shadow endFrame');

// Protect the key non-authority property from accidental future coupling.
const forbidden = [
  /playerInput\s*=\s*temporalShadow/i,
  /intent\s*=\s*temporalShadow/i,
  /character\.preStep\([^\n]*temporalShadow/i,
  /physicsTick\([^\n]*temporalShadow/i,
];
for (const pattern of forbidden) assert.equal(pattern.test(source), false, `shadow crossed gameplay authority boundary: ${pattern}`);

console.log('R2 RUNTIME SHADOW INTEGRATION BOUNDARY PASS');
console.log(JSON.stringify({
  optInQueryGate: true,
  gameplayAuthority: 'PlayerInput.sample -> character.preStep',
  observerPosition: 'before frame accounting / after real catch-up cross-check',
  failSafe: 'observer disables itself on failure',
  sourceBoundaryWitness: true,
}, null, 2));
