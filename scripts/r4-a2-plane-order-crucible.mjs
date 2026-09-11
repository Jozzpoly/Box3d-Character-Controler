import assert from 'node:assert/strict';
import { applyIntentCappedRelativeConstraintVelocity } from '../src/constraint-velocity.js';

const SQRT3_OVER_2 = Math.sqrt(3) / 2;
const EPS = 1e-9;

const b3 = {
  b3BodyType: {
    b3_staticBody: 0,
    b3_kinematicBody: 1,
    b3_dynamicBody: 2,
  },
  b3Shape_GetBody(shapeId) {
    return shapeId.body;
  },
  b3Body_GetType(body) {
    return body.type;
  },
};

function maxAbsDelta(a, b) {
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
}

function permutations(items) {
  if (items.length <= 1) return [items];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i], ...tail]);
  }
  return out;
}

function makeEntry(name, normal, surfaceVelocity = [0, 0, 0]) {
  const body = { type: surfaceVelocity.some((value) => Math.abs(value) > EPS) ? 1 : 0, surfaceVelocity };
  return {
    name,
    plane: { plane: { normal, offset: 0 }, pushLimit: 3.4e38, push: 0, clipVelocity: true },
    extra: { shapeId: { body }, point: [0, 0, 0] },
    push: 1,
  };
}

function runLegacy(entries, velocity, desiredVelocity) {
  return applyIntentCappedRelativeConstraintVelocity({
    b3,
    velocity,
    desiredVelocity,
    planes: entries.map((entry) => entry.plane),
    extras: entries.map((entry) => entry.extra),
    recoveredPushes: entries.map((entry) => entry.push),
    bodyPointVelocity: (body) => body.surfaceVelocity,
  }).velocity;
}

function horizontalConstraint(entry, desiredVelocity) {
  const normal = entry.plane.plane.normal;
  const horizontalLength = Math.hypot(normal[0], normal[2]);
  const nx = normal[0] / horizontalLength;
  const nz = normal[2] / horizontalLength;
  const surface = entry.extra.shapeId.body.surfaceVelocity;
  const allowed = Math.min(
    0,
    (desiredVelocity[0] - surface[0]) * nx + (desiredVelocity[2] - surface[2]) * nz,
  );
  const minimumDot = allowed + surface[0] * nx + surface[2] * nz;
  return { nx, nz, minimumDot };
}

function feasible(vx, vz, constraints) {
  return constraints.every(({ nx, nz, minimumDot }) => vx * nx + vz * nz >= minimumDot - 1e-8);
}

function distanceSq(vx, vz, source) {
  const dx = vx - source[0];
  const dz = vz - source[2];
  return dx * dx + dz * dz;
}

// Exact nearest-point solve for a 2D velocity against affine half-space constraints.
// This is a design candidate only; runtime remains untouched in this branch.
function solveNearestFeasible(entries, velocity, desiredVelocity) {
  const constraints = entries.map((entry) => horizontalConstraint(entry, desiredVelocity));
  const candidates = [];

  if (feasible(velocity[0], velocity[2], constraints)) {
    candidates.push([velocity[0], velocity[2]]);
  }

  for (const c of constraints) {
    const deficit = c.minimumDot - (velocity[0] * c.nx + velocity[2] * c.nz);
    const vx = velocity[0] + deficit * c.nx;
    const vz = velocity[2] + deficit * c.nz;
    if (feasible(vx, vz, constraints)) candidates.push([vx, vz]);
  }

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const a = constraints[i];
      const b = constraints[j];
      const det = a.nx * b.nz - a.nz * b.nx;
      if (Math.abs(det) < 1e-10) continue;
      const vx = (a.minimumDot * b.nz - a.nz * b.minimumDot) / det;
      const vz = (a.nx * b.minimumDot - a.minimumDot * b.nx) / det;
      if (feasible(vx, vz, constraints)) candidates.push([vx, vz]);
    }
  }

  assert.ok(candidates.length > 0, 'candidate solver found no feasible horizontal velocity');
  candidates.sort((a, b) => distanceSq(a[0], a[1], velocity) - distanceSq(b[0], b[1], velocity));
  const best = candidates[0];
  return [best[0], velocity[1], best[1]];
}

const staticCorner = [
  makeEntry('wall-x', [1, 0, 0]),
  makeEntry('wall-diagonal', [0.5, 0, SQRT3_OVER_2]),
];
const staticVelocity = [-2, 0, -1];
const zeroDesired = [0, 0, 0];
const staticPermutations = permutations(staticCorner);
const staticLegacy = staticPermutations.map((entries) => ({
  order: entries.map((entry) => entry.name),
  velocity: runLegacy(entries, staticVelocity, zeroDesired),
}));
const staticLegacySpread = maxAbsDelta(staticLegacy[0].velocity, staticLegacy[1].velocity);
assert.ok(staticLegacySpread > 0.2,
  `legacy sequential policy unexpectedly order-invariant: ${JSON.stringify(staticLegacy)}`);

const staticCandidate = staticPermutations.map((entries) => solveNearestFeasible(entries, staticVelocity, zeroDesired));
assert.ok(maxAbsDelta(staticCandidate[0], staticCandidate[1]) < 1e-10,
  `nearest-feasible candidate changed under plane permutation: ${JSON.stringify(staticCandidate)}`);

const mixedCorner = [
  makeEntry('static-x', [1, 0, 0]),
  makeEntry('moving-diagonal', [0.5, 0, SQRT3_OVER_2], [0.35, 0, -0.2]),
  makeEntry('static-z', [0, 0, 1]),
];
const mixedVelocity = [-1.4, 0, -1.2];
const mixedDesired = [-0.2, 0, -0.15];
const mixedPermutations = permutations(mixedCorner);
const mixedLegacy = mixedPermutations.map((entries) => runLegacy(entries, mixedVelocity, mixedDesired));
let mixedLegacySpread = 0;
for (let i = 1; i < mixedLegacy.length; i++) {
  mixedLegacySpread = Math.max(mixedLegacySpread, maxAbsDelta(mixedLegacy[0], mixedLegacy[i]));
}
assert.ok(mixedLegacySpread > 1e-3,
  `legacy mixed-surface policy unexpectedly order-invariant: ${JSON.stringify(mixedLegacy)}`);

const mixedCandidate = mixedPermutations.map((entries) => solveNearestFeasible(entries, mixedVelocity, mixedDesired));
let mixedCandidateSpread = 0;
for (let i = 1; i < mixedCandidate.length; i++) {
  mixedCandidateSpread = Math.max(mixedCandidateSpread, maxAbsDelta(mixedCandidate[0], mixedCandidate[i]));
}
assert.ok(mixedCandidateSpread < 1e-10,
  `nearest-feasible mixed candidate changed under permutation: ${JSON.stringify(mixedCandidate)}`);

console.log('R4 A2 PLANE-ORDER DESIGN CRUCIBLE PASS');
console.log(JSON.stringify({
  staticCorner: {
    legacy: staticLegacy,
    legacySpread: staticLegacySpread,
    candidate: staticCandidate[0],
  },
  mixedCorner: {
    permutations: mixedPermutations.length,
    legacySpread: mixedLegacySpread,
    candidateSpread: mixedCandidateSpread,
    candidate: mixedCandidate[0],
  },
  interpretation: {
    legacy: 'sequential per-plane horizontal clipping; final velocity depends on traversal order for non-orthogonal active constraints',
    candidate: 'unique nearest feasible horizontal velocity over the same active affine half-spaces; invariant to plane permutation in this crucible',
  },
  evidenceBoundary: 'pure velocity-policy design test only; does not yet establish that runtime collision collection produces material plane-order divergence',
}, null, 2));