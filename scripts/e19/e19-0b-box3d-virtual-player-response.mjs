import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { quatFromAxisAngle } from '../../src/math.js';
import {
  assembleDualGripRelativeOperator,
  multiplyMatrixVector,
} from '../../src/e19/dual-grip-relative-kernel.js';

const b3 = await Box3D();
const PLAYER_MASS = 80;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale3(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
function flatten(values) { return values.flatMap((v) => v); }
function split(values) { return Array.from({ length: values.length / 3 }, (_, i) => values.slice(3 * i, 3 * i + 3)); }
function maxAbsPairDelta(a, b) {
  let error = 0;
  for (let i = 0; i < a.length; i++) for (let axis = 0; axis < 3; axis++) error = Math.max(error, Math.abs(a[i][axis] - b[i][axis]));
  return error;
}

function densityForBoxMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }

function createWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createDynamicBox(world, { position, rotation = [0, 0, 0, 1], half, mass }) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForBoxMass(mass, half);
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  b3.b3Body_SetTransform(body, position, rotation);
  b3.b3Body_SetLinearVelocity(body, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(body, [0, 0, 0]);
  return body;
}

function worldPoint(body, local) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, local);
  return out;
}
function worldCenter(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(out, body);
  return out;
}
function pointVelocity(body, point) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, point);
  return out;
}
function inverseMass(body) { return b3.b3Body_GetInverseMass(body); }
function inverseInertia(body) { return b3.b3Body_GetWorldInverseRotationalInertia(body); }

function applyPlayerReaction(playerVelocity, impulses) {
  const total = impulses.reduce((sum, impulse) => add3(sum, impulse), [0, 0, 0]);
  return sub3(playerVelocity, scale3(total, 1 / PLAYER_MASS));
}

function relativeVelocity(targetVelocity, playerVelocity) {
  return sub3(targetVelocity, playerVelocity);
}

function runStaticCase() {
  const operator = assembleDualGripRelativeOperator({
    playerMass: PLAYER_MASS,
    grips: [{ bodyKey: 'wall', responsive: false, targetOffset: [0, 0, 0] }],
  });
  const impulse = [2.1, -3.7, 1.4];
  const playerBefore = [0.8, -2.4, 0.35];
  const before = [relativeVelocity([0, 0, 0], playerBefore)];
  const playerAfter = applyPlayerReaction(playerBefore, [impulse]);
  const after = [relativeVelocity([0, 0, 0], playerAfter)];
  const actualDelta = [sub3(after[0], before[0])];
  const predictedDelta = split(multiplyMatrixVector(operator, impulse));
  return { predictedDelta, actualDelta, maxAbsError: maxAbsPairDelta(actualDelta, predictedDelta) };
}

function runOneDynamicCase() {
  const world = createWorld();
  const body = createDynamicBox(world, {
    position: [-0.7, 1.6, 0.4],
    rotation: quatFromAxisAngle([0.3, 0.8, -0.2], 0.61),
    half: [0.75, 0.24, 0.33],
    mass: 27,
  });
  const local = [0.58, -0.11, 0.19];
  const point = worldPoint(body, local);
  const center = worldCenter(body);
  const offset = sub3(point, center);
  const operator = assembleDualGripRelativeOperator({
    playerMass: PLAYER_MASS,
    grips: [{ bodyKey: 'crate', responsive: true, inverseMass: inverseMass(body), inverseInertiaWorld: inverseInertia(body), targetOffset: offset }],
  });
  const impulse = [1.7, -0.9, 2.4];
  const playerBefore = [0.45, -1.1, 0.72];
  const before = [relativeVelocity(pointVelocity(body, point), playerBefore)];
  b3.b3Body_ApplyLinearImpulse(body, impulse, point, true);
  const playerAfter = applyPlayerReaction(playerBefore, [impulse]);
  const after = [relativeVelocity(pointVelocity(body, point), playerAfter)];
  const actualDelta = [sub3(after[0], before[0])];
  const predictedDelta = split(multiplyMatrixVector(operator, impulse));
  const report = { predictedDelta, actualDelta, maxAbsError: maxAbsPairDelta(actualDelta, predictedDelta) };
  b3.b3DestroyWorld(world);
  return report;
}

function runSameBodyDualCase() {
  const world = createWorld();
  const body = createDynamicBox(world, {
    position: [0.5, 2.0, -1.1],
    rotation: quatFromAxisAngle([-0.4, 0.55, 0.72], 0.83),
    half: [0.92, 0.19, 0.28],
    mass: 31,
  });
  const local1 = [-0.72, 0.12, -0.09];
  const local2 = [0.68, -0.08, 0.16];
  const point1 = worldPoint(body, local1);
  const point2 = worldPoint(body, local2);
  const center = worldCenter(body);
  const common = {
    bodyKey: 'beam',
    responsive: true,
    inverseMass: inverseMass(body),
    inverseInertiaWorld: inverseInertia(body),
  };
  const operator = assembleDualGripRelativeOperator({
    playerMass: PLAYER_MASS,
    grips: [
      { ...common, targetOffset: sub3(point1, center) },
      { ...common, targetOffset: sub3(point2, center) },
    ],
  });
  const impulses = [[2.2, -1.3, 0.55], [-0.75, 1.45, -1.9]];
  const playerBefore = [-0.25, -0.65, 0.5];
  const before = [
    relativeVelocity(pointVelocity(body, point1), playerBefore),
    relativeVelocity(pointVelocity(body, point2), playerBefore),
  ];
  b3.b3Body_ApplyLinearImpulse(body, impulses[0], point1, true);
  b3.b3Body_ApplyLinearImpulse(body, impulses[1], point2, true);
  const playerAfter = applyPlayerReaction(playerBefore, impulses);
  const after = [
    relativeVelocity(pointVelocity(body, point1), playerAfter),
    relativeVelocity(pointVelocity(body, point2), playerAfter),
  ];
  const actualDelta = [sub3(after[0], before[0]), sub3(after[1], before[1])];
  const predictedDelta = split(multiplyMatrixVector(operator, flatten(impulses)));
  const report = { predictedDelta, actualDelta, maxAbsError: maxAbsPairDelta(actualDelta, predictedDelta) };
  b3.b3DestroyWorld(world);
  return report;
}

function runDifferentBodiesCase({ mixedStatic = false } = {}) {
  const world = createWorld();
  const body1 = mixedStatic ? null : createDynamicBox(world, {
    position: [-1.2, 1.4, 0.5],
    rotation: quatFromAxisAngle([0.2, 0.7, 0.4], 0.52),
    half: [0.44, 0.31, 0.26],
    mass: 18,
  });
  const body2 = createDynamicBox(world, {
    position: [1.4, 1.8, -0.6],
    rotation: quatFromAxisAngle([-0.5, 0.25, 0.8], 0.73),
    half: [0.52, 0.23, 0.37],
    mass: 43,
  });
  const local1 = [-0.31, 0.14, 0.09];
  const local2 = [0.39, -0.1, -0.21];
  const point1 = body1 ? worldPoint(body1, local1) : [-1.0, 2.2, 0.3];
  const point2 = worldPoint(body2, local2);
  const center1 = body1 ? worldCenter(body1) : null;
  const center2 = worldCenter(body2);
  const grips = [
    body1
      ? { bodyKey: 'a', responsive: true, inverseMass: inverseMass(body1), inverseInertiaWorld: inverseInertia(body1), targetOffset: sub3(point1, center1) }
      : { bodyKey: 'wall', responsive: false, targetOffset: [0, 0, 0] },
    { bodyKey: 'b', responsive: true, inverseMass: inverseMass(body2), inverseInertiaWorld: inverseInertia(body2), targetOffset: sub3(point2, center2) },
  ];
  const operator = assembleDualGripRelativeOperator({ playerMass: PLAYER_MASS, grips });
  const impulses = [[-1.6, 2.3, 0.75], [1.1, -0.65, 2.0]];
  const playerBefore = [0.7, -1.25, -0.35];
  const before = [
    relativeVelocity(body1 ? pointVelocity(body1, point1) : [0, 0, 0], playerBefore),
    relativeVelocity(pointVelocity(body2, point2), playerBefore),
  ];
  if (body1) b3.b3Body_ApplyLinearImpulse(body1, impulses[0], point1, true);
  b3.b3Body_ApplyLinearImpulse(body2, impulses[1], point2, true);
  const playerAfter = applyPlayerReaction(playerBefore, impulses);
  const after = [
    relativeVelocity(body1 ? pointVelocity(body1, point1) : [0, 0, 0], playerAfter),
    relativeVelocity(pointVelocity(body2, point2), playerAfter),
  ];
  const actualDelta = [sub3(after[0], before[0]), sub3(after[1], before[1])];
  const predictedDelta = split(multiplyMatrixVector(operator, flatten(impulses)));
  const report = { predictedDelta, actualDelta, maxAbsError: maxAbsPairDelta(actualDelta, predictedDelta) };
  b3.b3DestroyWorld(world);
  return report;
}

const report = {
  schema: 'e19-0b-box3d-virtual-player-response-v1',
  boundary: 'Instantaneous response qualifier. Box3D is the independent target-body arbiter while the player side is the accepted 80 kg virtual mass. It does not qualify multi-frame grip control, Donor integration, strength, climbing or acquisition.',
  staticAnchor: runStaticCase(),
  oneDynamic: runOneDynamicCase(),
  sameDynamicBodyDual: runSameBodyDualCase(),
  differentDynamicBodies: runDifferentBodiesCase(),
  mixedStaticDynamic: runDifferentBodiesCase({ mixedStatic: true }),
};

for (const [name, result] of Object.entries(report)) {
  if (!result || typeof result !== 'object' || !('maxAbsError' in result)) continue;
  assert.ok(result.maxAbsError < 5e-5, `${name} operator response diverged from actual impulse response: ${result.maxAbsError}`);
}
report.classification = 'BOX3D_AND_VIRTUAL_PLAYER_CONFIRM_UNIFIED_GRIP_RESPONSE';

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
