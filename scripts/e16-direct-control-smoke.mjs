import fs from 'node:fs';
import {
  E16_CAPABILITY_LIMITS,
  horizontalPointTargetOffset,
  radialControlRadiusPx,
  radialPointTargetOffset,
  screenRadialReach,
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

const radius1080 = radialControlRadiusPx(1920, 1080);
const radius768 = radialControlRadiusPx(1366, 768);
const radiusTiny = radialControlRadiusPx(320, 240);
if (!near(radius1080, 259.2)) throw new Error(`1080p radial radius mismatch: ${radius1080}`);
if (!near(radius768, 184.32)) throw new Error(`768p radial radius mismatch: ${radius768}`);
if (!near(radiusTiny, 150)) throw new Error(`small viewport radial radius should clamp to 150px: ${radiusTiny}`);

const minRadialReach = screenRadialReach(0, 200);
const halfRadialReach = screenRadialReach(100, 200);
const maxRadialReach = screenRadialReach(200, 200);
const overRadialReach = screenRadialReach(500, 200);
if (!near(minRadialReach, E16_CAPABILITY_LIMITS.minReach)) throw new Error(`radial min reach mismatch: ${minRadialReach}`);
if (!near(halfRadialReach, 0.54)) throw new Error(`radial half reach mismatch: ${halfRadialReach}`);
if (!near(maxRadialReach, E16_CAPABILITY_LIMITS.maxReach)) throw new Error(`radial max reach mismatch: ${maxRadialReach}`);
if (!near(overRadialReach, E16_CAPABILITY_LIMITS.maxReach)) throw new Error(`radial over-range clamp mismatch: ${overRadialReach}`);

const radialHalf = radialPointTargetOffset([3, 1.6, 4], origin, 100, 200);
const radialFull = radialPointTargetOffset([3, 5.0, 4], origin, 200, 200);
const radialFallback = radialPointTargetOffset(origin, origin, 100, 200, [0, 0, -1]);
assertVector(radialHalf, [0.324, 0, 0.432], 'radial half target');
assertVector(radialFull, [0.54, 0, 0.72], 'radial full target');
assertVector(radialFallback, [0, 0, -0.54], 'radial fallback target');

for (const [label, vector] of Object.entries({ radialHalf, radialFull, radialFallback })) {
  if (!near(vector[1], 0)) throw new Error(`${label} introduced vertical authority`);
}

const report = {
  schema: 'e16-direct-horizontal-task-space-smoke-v1-radial',
  legacy: { withinRange, farClamp, nearClamp, zeroFallback },
  radial: {
    radius1080,
    radius768,
    radiusTiny,
    minRadialReach,
    halfRadialReach,
    maxRadialReach,
    overRadialReach,
    radialHalf,
    radialFull,
    radialFallback,
  },
  limits: E16_CAPABILITY_LIMITS,
  boundary: 'Pure intent-to-target mapping only. Screen normalization changes reach ergonomics, not Box3D authority, grab force, transport, mass or vertical capability.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
