import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { quatFromAxisAngle } from '../../src/math.js';
import {
  assembleCoupledTwoPointOperator,
  coupledTwoPointResponse,
  matrixSymmetryError,
  solveCoupledTwoPointImpulse,
} from '../../src/e18/p3-coupled-two-point-kernel.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SHARED_MAX_IMPULSE = 900 * DT;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, scalar) {
  return [scalar * v[0], scalar * v[1], scalar * v[2]];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function maxAbsPairDelta(actualPair, predictedPair) {
  let error = 0;
  for (let point = 0; point < 2; point++) {
    for (let axis = 0; axis < 3; axis++) {
      error = Math.max(error, Math.abs(actualPair[point][axis] - predictedPair[point][axis]));
    }
  }
  return error;
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
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

function getWorldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function getWorldCenter(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(out, body);
  return out;
}

function getPointVelocity(body, worldPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, worldPoint);
  return out;
}

function getLinearVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function relativePairVelocity(object, core, worldPoint1, worldPoint2) {
  const coreVelocity = getLinearVelocity(core);
  return [
    sub3(getPointVelocity(object, worldPoint1), coreVelocity),
    sub3(getPointVelocity(object, worldPoint2), coreVelocity),
  ];
}

function applyImpulsePair(object, core, worldPoint1, worldPoint2, impulse1, impulse2) {
  b3.b3Body_ApplyLinearImpulse(object, impulse1, worldPoint1, true);
  b3.b3Body_ApplyLinearImpulse(object, impulse2, worldPoint2, true);
  const reaction = scale3(add3(impulse1, impulse2), -1);
  b3.b3Body_ApplyLinearImpulseToCenter(core, reaction, true);
  return reaction;
}

function createFixture() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);

  const objectRotation = quatFromAxisAngle([0.31, 0.81, -0.37], 0.67);
  const object = createDynamicBox(world, {
    position: [-1.2, 2.1, 0.7],
    rotation: objectRotation,
    half: [0.9, 0.25, 0.35],
    mass: 22,
  });
  const core = createDynamicBox(world, {
    position: [3.4, 1.3, -2.2],
    half: [0.30, 0.42, 0.22],
    mass: 35,
  });

  const localAnchor1 = [-0.67, 0.14, -0.09];
  const localAnchor2 = [0.73, -0.11, 0.16];
  const worldPoint1 = getWorldPoint(object, localAnchor1);
  const worldPoint2 = getWorldPoint(object, localAnchor2);
  const center = getWorldCenter(object);
  const offset1 = sub3(worldPoint1, center);
  const offset2 = sub3(worldPoint2, center);
  const objectMass = b3.b3Body_GetMass(object);
  const coreMass = b3.b3Body_GetMass(core);
  const inverseInertiaWorld = b3.b3Body_GetWorldInverseRotationalInertia(object);
  const operator = assembleCoupledTwoPointOperator({
    objectMass,
    coreMass,
    inverseInertiaWorld,
    offset1,
    offset2,
  });

  return {
    world,
    object,
    core,
    objectRotation,
    localAnchor1,
    localAnchor2,
    worldPoint1,
    worldPoint2,
    center,
    offset1,
    offset2,
    objectMass,
    coreMass,
    inverseInertiaWorld,
    operator,
  };
}

function runDirectImpulseCase() {
  const fixture = createFixture();
  const before = relativePairVelocity(
    fixture.object,
    fixture.core,
    fixture.worldPoint1,
    fixture.worldPoint2,
  );
  const impulse1 = [2.3, -1.1, 0.7];
  const impulse2 = [-0.4, 1.6, -2.0];
  const predictedDelta = coupledTwoPointResponse(fixture.operator, impulse1, impulse2);
  const reaction = applyImpulsePair(
    fixture.object,
    fixture.core,
    fixture.worldPoint1,
    fixture.worldPoint2,
    impulse1,
    impulse2,
  );
  const after = relativePairVelocity(
    fixture.object,
    fixture.core,
    fixture.worldPoint1,
    fixture.worldPoint2,
  );
  const actualDelta = [sub3(after[0], before[0]), sub3(after[1], before[1])];
  const maxAbsError = maxAbsPairDelta(actualDelta, predictedDelta);

  assert.ok(matrixSymmetryError(fixture.operator) < 2e-7, 'Box3D-derived P3 operator must remain symmetric');
  assert.ok(
    maxAbsError < 5e-5,
    `P3 operator must predict real Box3D two-point/core impulse response: ${maxAbsError}`,
  );

  const report = {
    objectRotation: fixture.objectRotation,
    localAnchor1: fixture.localAnchor1,
    localAnchor2: fixture.localAnchor2,
    worldPoint1: fixture.worldPoint1,
    worldPoint2: fixture.worldPoint2,
    center: fixture.center,
    offset1: fixture.offset1,
    offset2: fixture.offset2,
    objectMass: fixture.objectMass,
    coreMass: fixture.coreMass,
    inverseInertiaWorld: fixture.inverseInertiaWorld,
    impulse1,
    impulse2,
    reaction,
    predictedDelta,
    actualDelta,
    maxAbsError,
  };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

function runSolvedTaskCase({ name, desiredDeltaV1, desiredDeltaV2 }) {
  const fixture = createFixture();
  const solution = solveCoupledTwoPointImpulse({
    operator: fixture.operator,
    desiredDeltaV1,
    desiredDeltaV2,
    maxImpulseSum: SHARED_MAX_IMPULSE,
  });
  const before = relativePairVelocity(
    fixture.object,
    fixture.core,
    fixture.worldPoint1,
    fixture.worldPoint2,
  );
  const reaction = applyImpulsePair(
    fixture.object,
    fixture.core,
    fixture.worldPoint1,
    fixture.worldPoint2,
    solution.impulse1,
    solution.impulse2,
  );
  const after = relativePairVelocity(
    fixture.object,
    fixture.core,
    fixture.worldPoint1,
    fixture.worldPoint2,
  );
  const actualDelta = [sub3(after[0], before[0]), sub3(after[1], before[1])];
  const predictedDelta = [solution.achievedDeltaV.slice(0, 3), solution.achievedDeltaV.slice(3, 6)];
  const maxAbsError = maxAbsPairDelta(actualDelta, predictedDelta);

  assert.ok(solution.appliedImpulseSum <= SHARED_MAX_IMPULSE + 1e-9, `${name}: shared budget exceeded`);
  assert.ok(maxAbsError < 5e-5, `${name}: solved kernel response must match Box3D: ${maxAbsError}`);

  const report = {
    name,
    desiredDeltaV1,
    desiredDeltaV2,
    impulse1: solution.impulse1,
    impulse2: solution.impulse2,
    reaction,
    rawImpulseSum: solution.rawImpulseSum,
    appliedImpulseSum: solution.appliedImpulseSum,
    saturated: solution.saturated,
    budgetScale: solution.budgetScale,
    solverResidualNorm: solution.residualNorm,
    predictedDelta,
    actualDelta,
    maxAbsError,
    finalObjectLinearSpeed: norm3(getLinearVelocity(fixture.object)),
    finalCoreLinearSpeed: norm3(getLinearVelocity(fixture.core)),
  };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

const direct = runDirectImpulseCase();
const moderateTask = runSolvedTaskCase({
  name: 'moderate-coupled-task',
  desiredDeltaV1: [0.32, -0.11, 0.28],
  desiredDeltaV2: [-0.06, 0.19, -0.24],
});
const saturatedTask = runSolvedTaskCase({
  name: 'shared-budget-saturation',
  desiredDeltaV1: [8, -4, 10],
  desiredDeltaV2: [-7, 5, -9],
});

assert.equal(saturatedTask.saturated, true, 'large Box3D task must exercise shared P3 budget');
assert.ok(
  Math.abs(saturatedTask.appliedImpulseSum - SHARED_MAX_IMPULSE) < 1e-9,
  `saturated Box3D task must consume exactly one shared 900 N frame budget: ${saturatedTask.appliedImpulseSum}`,
);

const report = {
  schema: 'e18-p3-0b-box3d-response-diagnostic-v1',
  boundary: 'Instantaneous free-space validation of the P3 coupled relative-point operator against Box3D itself. The body is deliberately rotated and anchors are asymmetric. No World_Step, target servo, collision ecology, browser input or Owner-facing behavior is included. Passing means the algebra predicts the immediate Box3D velocity response of +J1/+J2 on the object with -(J1+J2) reaction at finite core COM.',
  sharedMaxImpulse: SHARED_MAX_IMPULSE,
  direct,
  moderateTask,
  saturatedTask,
  verdict: 'P3_BOX3D_INSTANTANEOUS_RESPONSE_QUALIFIED',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
