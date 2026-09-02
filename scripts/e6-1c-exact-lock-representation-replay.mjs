import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// E6.1b declared the candidate "locked" but represented that as ±1e-5 m.
// This one-shot causal replay changes exactly one thing: the suspension limits
// become 0/0. All E6.1b mechanics, thresholds and classifiers remain unchanged.
// The failed E6.1b script remains untouched as provenance.
const sourcePath = fileURLToPath(new URL('./e6-1b-two-body-wheel-representation-match.mjs', import.meta.url));
const replayPath = fileURLToPath(new URL('./.e6-1c-exact-lock-replay.tmp.mjs', import.meta.url));

const original = readFileSync(sourcePath, 'utf8');
const needle = 'const LOCK_EPS = 1e-5;';
if (!original.includes(needle)) {
  throw new Error('E6.1c expected the preserved E6.1b ±1e-5m lock declaration');
}

const replay = original
  .replace(needle, 'const LOCK_EPS = 0;')
  .replaceAll('E6.1b', 'E6.1c')
  .replace('locked two-body wheel representation match', 'exact-zero locked two-body wheel representation match');

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

console.log('E6.1c PASS: changing only the nominal locked suspension from ±1e-5m to exact 0/0 preserves every original E6.1b gate. This establishes exact-zero lock semantics before any support-relative translation is opened.');
