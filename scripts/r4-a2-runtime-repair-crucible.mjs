import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { applyIntentCappedRelativeConstraintVelocity, recoverSolvedPlanePushes } from '../src/constraint-velocity.js';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const EPS = 1e-8;

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

function makeMockEntry(name, normal, type, surfaceVelocity = [0, 0, 0]) {
  const body = { type, surfaceVelocity };
  return {
    name,
    plane: { plane: { normal, offset: 0 }, pushLimit: 3.4e38, push: 0, clipVelocity: true },
    extra: { shapeId: { body }, point: [0, 0, 0] },
    push: 1,
  };
}

const mockB3 = {
  b3BodyType: { b3_staticBody: 0, b3_kinematicBody: 1, b3_dynamicBody: 2 },
  b3Shape_GetBody: (shapeId) => shapeId.body,
  b3Body_GetType: (body) => body.type,
};

function solveMock(entries, velocity, desiredVelocity) {
  return applyIntentCappedRelativeConstraintVelocity({
    b3: mockB3,
    velocity,
    desiredVelocity,
    planes: entries.map((entry) => entry.plane),
    extras: entries.map((entry) => entry.extra),
    recoveredPushes: entries.map((entry) => entry.push),
    bodyPointVelocity: (body) => body.surfaceVelocity,
  });
}

// No active constraints.
{
  const result = solveMock([], [2, 3, -4], [1, 0, 1]);
  assert.deepEqual(result.velocity, [2, 3, -4]);
  assert.equal(result.clippedComponents, 0);
}

// Single static plane: preserve legacy one-plane result exactly.
{
  const entries = [makeMockEntry('wall', [1, 0, 0], 0)];
  const result = solveMock(entries, [-3, 2, 1], [0, 0, 0]);
  assert.ok(maxAbsDelta(result.velocity, [0, 2, 1]) < EPS);
  assert.equal(result.clippedComponents, 1);
}

// Single kinematic plane: preserve intent-capped surface-relative law.
{
  const entries = [makeMockEntry('moving-wall', [1, 0, 0], 1, [1.5, 0, 0])];
  const result = solveMock(entries, [-2, 0, 0.5], [0.5, 0, 0]);
  assert.ok(maxAbsDelta(result.velocity, [0.5, 0, 0.5]) < EPS);
  assert.equal(result.clippedComponents, 1);
}

// Orthogonal corner remains the intuitive zero-inward solution.
{
  const entries = [
    makeMockEntry('x', [1, 0, 0], 0),
    makeMockEntry('z', [0, 0, 1], 0),
  ];
  for (const order of permutations(entries)) {
    const result = solveMock(order, [-2, 0, -3], [0, 0, 0]);
    assert.ok(maxAbsDelta(result.velocity, [0, 0, 0]) < EPS);
  }
}

// Non-orthogonal mixed static/kinematic constraints must be permutation-invariant.
{
  const s = Math.sqrt(3) / 2;
  const entries = [
    makeMockEntry('x', [1, 0, 0], 0),
    makeMockEntry('diag', [0.5, 0, s], 1, [0.35, 0, -0.2]),
    makeMockEntry('z', [0, 0, 1], 0),
  ];
  const results = permutations(entries).map((order) => solveMock(order, [-1.4, 0.7, -1.2], [-0.2, 0, -0.15]));
  for (const result of results) {
    assert.ok(maxAbsDelta(result.velocity, results[0].velocity) < 1e-10,
      `A2 runtime policy changed under permutation: ${JSON.stringify(results)}`);
    assert.equal(result.clippedComponents, results[0].clippedComponents,
      'A2 clippedComponents telemetry changed under permutation');
    assert.equal(result.velocity[1], 0.7, 'horizontal A2 solve changed vertical velocity');
  }
}

function quatFromAxisAngle(axis, angle) {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const scale = Math.sin(angle / 2) / len;
  return [axis[0] * scale, axis[1] * scale, axis[2] * scale, Math.cos(angle / 2)];
}

function staticBox(world, position, half, rotation = null) {
  const def = b3.b3DefaultBodyDef();
  def.position = [...position];
  if (rotation) def.rotation = rotation;
  const body = b3.b3CreateBody(world, def);
  b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), half[0], half[1], half[2]);
}

// Real CollideMover plane sets: reversing representation order must not change policy output.
{
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);
  try {
    staticBox(world, [0, 1.5, 0], [3.5, 2.5, 0.12]);
    staticBox(world, [0, 1.5, 0], [3.5, 2.5, 0.12], quatFromAxisAngle([0, 1, 0], Math.PI / 3));
    const character = createCurrentDonorCharacter(b3, world, { startPosition: [0, 1.5, 0.5], gravity: 0 });
    const capsule = {
      center1: [0, -character.halfSegment, 0],
      center2: [0, character.halfSegment, 0],
      radius: character.radius,
    };
    const velocity = [-4.5, 0, -6.5];
    const desiredVelocity = [0, 0, 0];
    const targetDelta = velocity.map((value) => value * DT);
    let checked = 0;

    for (let x = -0.6; x <= 0.6001; x += 0.1) {
      for (let z = -0.6; z <= 0.6001; z += 0.1) {
        character.position = [x, 1.5, z];
        const { planes, extras } = character._collectPlanes(capsule);
        if (planes.length < 2) continue;
        const recovered = recoverSolvedPlanePushes(targetDelta, planes);
        if (recovered.pushes.filter((push) => push > 1e-9).length < 2) continue;

        const native = character._applyConstraintVelocityPolicy({
          velocity,
          desiredVelocity,
          planes,
          extras,
          recoveredPushes: recovered.pushes,
        });
        const reversed = character._applyConstraintVelocityPolicy({
          velocity,
          desiredVelocity,
          planes: [...planes].reverse(),
          extras: [...extras].reverse(),
          recoveredPushes: [...recovered.pushes].reverse(),
        });
        assert.ok(maxAbsDelta(native.velocity, reversed.velocity) < 1e-8,
          `real A2 plane set remained order-sensitive: ${JSON.stringify({ native, reversed, planes, pushes: recovered.pushes })}`);
        assert.equal(native.clippedComponents, reversed.clippedComponents);
        checked += 1;
      }
    }
    assert.ok(checked > 0, 'A2 runtime qualification found no multi-plane CollideMover witness positions');
  } finally {
    b3.b3DestroyWorld(world);
  }
}

console.log('R4 A2 RUNTIME REPAIR CRUCIBLE PASS');
