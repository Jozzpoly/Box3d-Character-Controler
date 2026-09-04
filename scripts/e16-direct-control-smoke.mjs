import fs from 'node:fs';
import {
  E16_CAPABILITY_LIMITS,
  horizontalPointTargetOffset,
} from '../src/e16-capability-interaction.js';

const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function near(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

function assertVector(actual, expected, label) {
  if (actual.length !== expected.length || actual.some((value, i) => !near(value, expected[i]))) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const origin = [0, 1.6, 0];
const withinRange = horizontalPointTargetOffset([0.3, 1.6, 0.4], origin);
const farClamp = horizontalPointTargetOffset([3, 1.6, 4], origin);
const nearClamp = horizontalPointTargetOffset([0.01, 1.6, 0], origin);
const zeroFallback = horizontalPointTargetOffset(origin, origin, [1, 0, 0]);

assertVector(withinRange, [0.3, 0, 0.4], 'direct target within range');
assertVector(farClamp, [0.54, 0, 0.72], 'direct target max clamp');
assertVector(nearClamp, [E16_CAPABILITY_LIMITS.minReach, 0, 0], 'direct target min clamp');
assertVector(zeroFallback, [E16_CAPABILITY_LIMITS.minReach, 0, 0], 'direct target zero-distance fallback');

for (const [label, vector] of Object.entries({ withinRange, farClamp, nearClamp, zeroFallback })) {
  if (!near(vector[1], 0)) throw new Error(`${label} introduced vertical authority`);
  const reach = Math.hypot(vector[0], vector[2]);
  if (reach < E16_CAPABILITY_LIMITS.minReach - 1e-9 || reach > E16_CAPABILITY_LIMITS.maxReach + 1e-9) {
    throw new Error(`${label} escaped horizontal reach bounds: ${reach}`);
  }
}

const report = {
  schema: 'e16-direct-horizontal-task-space-smoke-v0',
  withinRange,
  farClamp,
  nearClamp,
  zeroFallback,
  limits: E16_CAPABILITY_LIMITS,
  boundary: 'Pure intent-to-target mapping only. No Box3D authority, grab force, transport, mass or Owner-feel claim is changed by this qualifier.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
