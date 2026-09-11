import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { recoverSolvedPlanePushes } from '../src/constraint-velocity.js';

const b3 = await Box3D();
const DT = 1 / 60;

function quatFromAxisAngle(axis, angle) {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const s = Math.sin(angle / 2) / len;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}

function staticBox(world, position, half, rotation = null) {
  const def = b3.b3DefaultBodyDef();
  def.position = [...position];
  if (rotation) def.rotation = rotation;
  const body = b3.b3CreateBody(world, def);
  b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), half[0], half[1], half[2]);
  return body;
}

function maxAbsDelta(a, b) {
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);

try {
  // Two tall static slabs intersect at a non-orthogonal angle. Probe a grid around
  // the intersection so CollideMover itself supplies the plane sets under test.
  staticBox(world, [0, 1.5, 0], [3.5, 2.5, 0.12]);
  staticBox(world, [0, 1.5, 0], [3.5, 2.5, 0.12], quatFromAxisAngle([0, 1, 0], Math.PI / 3));

  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, 1.5, 0.5],
    gravity: 0,
  });
  const capsule = {
    center1: [0, -character.halfSegment, 0],
    center2: [0, character.halfSegment, 0],
    radius: character.radius,
  };
  const velocity = [-4.5, 0, -6.5];
  const desiredVelocity = [0, 0, 0];
  const targetDelta = velocity.map((value) => value * DT);

  const witnesses = [];
  for (let x = -0.6; x <= 0.6001; x += 0.1) {
    for (let z = -0.6; z <= 0.6001; z += 0.1) {
      character.position = [x, 1.5, z];
      const { planes, extras } = character._collectPlanes(capsule);
      if (planes.length < 2) continue;
      const recovered = recoverSolvedPlanePushes(targetDelta, planes);
      const active = recovered.pushes.filter((push) => push > 1e-9).length;
      if (active < 2) continue;

      const native = character._applyConstraintVelocityPolicy({
        velocity,
        desiredVelocity,
        planes,
        extras,
        recoveredPushes: recovered.pushes,
      }).velocity;
      const reversed = character._applyConstraintVelocityPolicy({
        velocity,
        desiredVelocity,
        planes: [...planes].reverse(),
        extras: [...extras].reverse(),
        recoveredPushes: [...recovered.pushes].reverse(),
      }).velocity;
      const divergence = maxAbsDelta(native, reversed);
      if (divergence > 1e-6) {
        witnesses.push({
          position: [x, 1.5, z],
          planeCount: planes.length,
          activePlaneCount: active,
          native,
          reversed,
          divergence,
          normals: planes.map((plane) => plane.plane.normal),
          pushes: recovered.pushes,
        });
      }
    }
  }

  witnesses.sort((a, b) => b.divergence - a.divergence);
  assert.ok(witnesses.length > 0,
    'real CollideMover plane sets produced no traversal-order-sensitive velocity witness');
  assert.ok(witnesses[0].divergence > 0.05,
    `runtime plane-order divergence was only numerical noise: ${JSON.stringify(witnesses[0])}`);

  console.log('R4 A2 RUNTIME PLANE-ORDER WITNESS PASS');
  console.log(JSON.stringify({
    witnessCount: witnesses.length,
    strongest: witnesses.slice(0, 5),
    evidenceBoundary: 'real CollideMover planes + recovered active pushes; policy evaluated under native and reversed traversal without changing runtime source',
  }, null, 2));
} finally {
  b3.b3DestroyWorld(world);
}
