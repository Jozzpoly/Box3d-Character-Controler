import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { castE19GripReach } from '../../src/e19/swept-grip-reach.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createBox(world, { type = 'static', position, half, mass = 40 }) {
  const bodyDef = b3.b3DefaultBodyDef();
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = type === 'dynamic' ? densityForBoxMass(mass, half) : 0;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, shape };
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function bodyVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function bodyAngularVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return out;
}

function worldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function runSingleTarget(kind) {
  const world = makeWorld();
  const target = createBox(world, {
    type: kind,
    position: [1.2, 1, 0],
    half: [0.30, 0.55, 0.55],
    mass: 40,
  });
  if (kind === 'dynamic') {
    b3.b3Body_SetLinearVelocity(target.body, [0, 0, 0]);
    b3.b3Body_SetAngularVelocity(target.body, [0, 0, 0]);
  }

  const origin = [0, 1, 0];
  const translation = [2, 0, 0];
  const radius = 0.14;
  const beforePosition = bodyPosition(target.body);
  const beforeVelocity = kind === 'dynamic' ? bodyVelocity(target.body) : [0, 0, 0];
  const beforeAngularVelocity = kind === 'dynamic' ? bodyAngularVelocity(target.body) : [0, 0, 0];

  let hit = null;
  for (let i = 0; i < 240; i++) {
    const current = castE19GripReach({ b3, world, origin, translation, radius });
    assert.ok(current, `${kind}: swept reach missed target`);
    if (!hit) hit = current;
    assert.equal(current.bodyKind, kind.toUpperCase());
    assert.equal(current.body.index1, target.body.index1, `${kind}: swept reach hit wrong body`);
  }

  const afterQueriesPosition = bodyPosition(target.body);
  const afterQueriesVelocity = kind === 'dynamic' ? bodyVelocity(target.body) : [0, 0, 0];
  const afterQueriesAngularVelocity = kind === 'dynamic' ? bodyAngularVelocity(target.body) : [0, 0, 0];
  assert.ok(distance3(afterQueriesPosition, beforePosition) < 1e-12, `${kind}: queries moved target position`);
  assert.ok(distance3(afterQueriesVelocity, beforeVelocity) < 1e-12, `${kind}: queries changed target velocity`);
  assert.ok(distance3(afterQueriesAngularVelocity, beforeAngularVelocity) < 1e-12, `${kind}: queries changed target angular velocity`);

  // Step after the repeated casts to ensure the query itself did not enqueue a hidden
  // constraint/impulse that appears only on the next simulation step.
  b3.b3World_Step(world, DT, SUBSTEPS);
  const afterStepPosition = bodyPosition(target.body);
  const afterStepVelocity = kind === 'dynamic' ? bodyVelocity(target.body) : [0, 0, 0];
  const afterStepAngularVelocity = kind === 'dynamic' ? bodyAngularVelocity(target.body) : [0, 0, 0];
  assert.ok(distance3(afterStepPosition, beforePosition) < 1e-9, `${kind}: hidden query consequence moved target after step`);
  assert.ok(distance3(afterStepVelocity, beforeVelocity) < 1e-9, `${kind}: hidden query consequence changed velocity after step`);
  assert.ok(distance3(afterStepAngularVelocity, beforeAngularVelocity) < 1e-9, `${kind}: hidden query consequence changed angular velocity after step`);

  const anchorRoundTrip = worldPoint(target.body, hit.localAnchor);
  const anchorRoundTripError = distance3(anchorRoundTrip, hit.worldAnchorAtAcquisition);
  assert.ok(anchorRoundTripError < 2e-5, `${kind}: hit local-anchor round trip error ${anchorRoundTripError}`);
  assert.ok(hit.fraction > 0 && hit.fraction < 1, `${kind}: invalid hit fraction ${hit.fraction}`);
  assert.ok(hit.worldAnchorAtAcquisition[0] > 0.85 && hit.worldAnchorAtAcquisition[0] < 0.95,
    `${kind}: hit point not on expected near face: ${hit.worldAnchorAtAcquisition}`);
  assert.ok(hit.targetSurfaceNormalAtAcquisition[0] < -0.9,
    `${kind}: target surface normal not facing reach origin: ${hit.targetSurfaceNormalAtAcquisition}`);

  const result = {
    kind,
    queryCount: 240,
    fraction: hit.fraction,
    hitPoint: [...hit.worldAnchorAtAcquisition],
    hitNormal: [...hit.targetSurfaceNormalAtAcquisition],
    localAnchor: [...hit.localAnchor],
    anchorRoundTripError,
    positionDeltaAfterQueries: distance3(afterQueriesPosition, beforePosition),
    velocityDeltaAfterQueries: distance3(afterQueriesVelocity, beforeVelocity),
    angularVelocityDeltaAfterQueries: distance3(afterQueriesAngularVelocity, beforeAngularVelocity),
    positionDeltaAfterNextStep: distance3(afterStepPosition, beforePosition),
    velocityDeltaAfterNextStep: distance3(afterStepVelocity, beforeVelocity),
    angularVelocityDeltaAfterNextStep: distance3(afterStepAngularVelocity, beforeAngularVelocity),
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runOcclusionCase() {
  const world = makeWorld();
  const near = createBox(world, {
    type: 'static',
    position: [0.85, 1, 0],
    half: [0.10, 0.5, 0.5],
  });
  const far = createBox(world, {
    type: 'dynamic',
    position: [1.45, 1, 0],
    half: [0.20, 0.5, 0.5],
    mass: 25,
  });
  b3.b3Body_SetLinearVelocity(far.body, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(far.body, [0, 0, 0]);

  const farBefore = bodyPosition(far.body);
  const hit = castE19GripReach({
    b3,
    world,
    origin: [0, 1, 0],
    translation: [2, 0, 0],
    radius: 0.14,
  });
  assert.ok(hit, 'occlusion: reach missed all geometry');
  assert.equal(hit.body.index1, near.body.index1, 'far target was selected through nearer obstruction');
  assert.equal(hit.bodyKind, 'STATIC');
  assert.ok(hit.fraction < 0.5, `occlusion: near hit fraction too late ${hit.fraction}`);
  assert.ok(distance3(bodyPosition(far.body), farBefore) < 1e-12, 'occlusion query disturbed far dynamic body');

  const result = {
    selectedKind: hit.bodyKind,
    fraction: hit.fraction,
    hitPoint: [...hit.worldAnchorAtAcquisition],
    hitNormal: [...hit.targetSurfaceNormalAtAcquisition],
    farBodyPositionDelta: distance3(bodyPosition(far.body), farBefore),
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runMissCase() {
  const world = makeWorld();
  createBox(world, {
    type: 'static',
    position: [1.5, 1, 0],
    half: [0.2, 0.5, 0.5],
  });
  const hit = castE19GripReach({
    b3,
    world,
    origin: [0, 1, 0],
    translation: [0.7, 0, 0],
    radius: 0.14,
  });
  assert.equal(hit, null, 'finite reach fabricated hit beyond sweep distance');
  b3.b3DestroyWorld(world);
  return { hit: null, reachLength: 0.7 };
}

const staticTarget = runSingleTarget('static');
const dynamicTarget = runSingleTarget('dynamic');
const occlusion = runOcclusionCase();
const miss = runMissCase();

const report = {
  schema: 'e19-1d-nonimpulsive-swept-reach-v1',
  hypothesis: 'A finite-radius Box3D shape cast can represent a bounded hand reach that earns the first reachable surface and exact local latch anchor without a physical pre-grip probe body, pre-grip impulses, remote selection through an obstruction, or body-type-specific acquisition logic.',
  boundary: 'Headless straight-line spherical sweep only. The sweep itself is query geometry, not a physical hand body. No curved/assisted reach trajectory, moving player origin, two-hand coordination, initial-overlap policy, live latch actuation, visual embodiment or Owner feel is qualified.',
  staticTarget,
  dynamicTarget,
  occlusion,
  miss,
  classification: 'BOUNDED_SWEPT_REACH_EARNS_FIRST_SURFACE_WITHOUT_PREGRIP_PHYSICAL_CONTAMINATION',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
