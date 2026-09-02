import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

// E7.0a qualified a 0.7 m parallel probe as inactive/non-interfering.
// Before active contact acquisition, make one geometry-level correction only:
// length 0.7 -> 0.9 m at the same 1 kg mass. This lets the distal end reach
// ground outside the primary foot envelope instead of risking self-contact.
// Every E7.0a mechanical gate and threshold is replayed unchanged.
const sourcePath = fileURLToPath(new URL('./e7-0a-inactive-parallel-support-probe.mjs', import.meta.url));
const replayPath = fileURLToPath(new URL('./.e7-0b-contact-reachable.tmp.mjs', import.meta.url));

const TARGET_ANGLE = 140 * Math.PI / 180;
const PROBE_LENGTH = 0.9;
const PROBE_HALF_THICKNESS = 0.06;
const FOOT_HALF_Z = E3_SAGITTAL_DEFAULTS.footHalf[2];
const PIVOT_Y =
  E3_SAGITTAL_DEFAULTS.footHalf[1] + 0.002 +
  E3_SAGITTAL_DEFAULTS.footHalf[1] +
  E3_SAGITTAL_DEFAULTS.torsoHalf[1];

const distalCenterY = PIVOT_Y + PROBE_LENGTH * Math.cos(TARGET_ANGLE);
const distalCenterAbsZ = Math.abs(PROBE_LENGTH * Math.sin(TARGET_ANGLE));
const inwardThicknessZ = PROBE_HALF_THICKNESS * Math.abs(Math.cos(TARGET_ANGLE));
const nearestDistalZ = distalCenterAbsZ - inwardThicknessZ;

console.log('E7.0b contact-reachable geometry precheck');
console.log(`  pivotY=${PIVOT_Y.toFixed(3)}m target=140deg length=${PROBE_LENGTH.toFixed(3)}m`);
console.log(`  distal center y=${distalCenterY.toFixed(3)}m |z|=${distalCenterAbsZ.toFixed(3)}m`);
console.log(`  nearest distal |z| after thickness=${nearestDistalZ.toFixed(3)}m primaryFootHalfZ=${FOOT_HALF_Z.toFixed(3)}m`);

if (distalCenterY > 0.04) {
  throw new Error(`E7.0b corrected probe cannot geometrically reach the support plane at 140deg: y=${distalCenterY}`);
}
if (nearestDistalZ < FOOT_HALF_Z + 0.12) {
  throw new Error(`E7.0b corrected probe does not provide clear sagittal separation from the primary foot: ${nearestDistalZ}`);
}

const original = readFileSync(sourcePath, 'utf8');
const needle = 'const PROBE_HALF = [0.06, 0.35, 0.06];';
if (!original.includes(needle)) {
  throw new Error('E7.0b expected the preserved E7.0a 0.7m probe geometry');
}

const replay = original
  .replace(needle, 'const PROBE_HALF = [0.06, 0.45, 0.06];')
  .replaceAll('E7.0a', 'E7.0b')
  .replace('inactive parallel support-probe non-interference gate', 'contact-reachable inactive parallel support-probe gate')
  .replace('1kg upward parallel probe', '1kg upward 0.9m contact-reachable parallel probe');

writeFileSync(replayPath, replay, 'utf8');
try {
  const result = spawnSync(process.execPath, [replayPath], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
} finally {
  try { unlinkSync(replayPath); } catch {}
}

console.log('E7.0b PASS: the same 1kg parallel support element remains inactive/non-interfering after the single geometry correction required for clean future ground reach outside the primary foot envelope. No active support acquisition is enabled yet.');
