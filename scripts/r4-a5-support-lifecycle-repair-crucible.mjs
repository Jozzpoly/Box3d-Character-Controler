import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function neutralIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

async function runCase(kind) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  const bodyDef = b3.b3DefaultBodyDef();
  if (kind === 'KINEMATIC') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
  if (kind === 'DYNAMIC') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [0, 2, 0];
  bodyDef.enableSleep = false;
  const platform = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.9;
  if (kind === 'DYNAMIC') shapeDef.density = 60;
  b3.b3CreateBoxShape(platform, shapeDef, 1.2, 0.25, 1.2);

  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, 3.17, 0],
    gravity: 20,
  });
  character.reset([0, 2.25 + character.halfHeight + 0.02, 0]);

  for (let i = 0; i < 90; i++) {
    character.preStep(DT, neutralIntent());
    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
  }

  assert.ok(character.currentSupport, `${kind}: failed to acquire support`);
  const acquiredType = character.currentSupport.type;
  assert.equal(acquiredType, kind, `${kind}: acquired unexpected support type ${acquiredType}`);
  assert.equal(b3.b3Body_IsValid(platform), true, `${kind}: platform invalid before destroy`);

  b3.b3DestroyBody(platform);
  assert.equal(b3.b3Body_IsValid(platform), false, `${kind}: platform remained valid after destroy`);

  assert.doesNotThrow(() => character.preStep(DT, neutralIntent()), `${kind}: preStep touched stale body`);
  assert.equal(character.currentSupport, null, `${kind}: stale support relation survived preStep`);

  assert.doesNotThrow(() => b3.b3World_Step(world, DT, SUBSTEPS), `${kind}: world step failed after support destroy`);
  assert.doesNotThrow(() => character.postStep(DT), `${kind}: postStep failed after support destroy`);
  assert.equal(character.telemetry().grounded, false, `${kind}: ghost grounding survived destroy`);

  b3.b3DestroyWorld(world);
  return { kind, acquiredType, survived: true };
}

const results = [];
for (const kind of ['STATIC', 'KINEMATIC', 'DYNAMIC']) {
  results.push(await runCase(kind));
}

// Binding sanity: the three body enum values used above must actually differ.
assert.notEqual(bodyTypeValue(b3.b3BodyType.b3_staticBody), bodyTypeValue(b3.b3BodyType.b3_kinematicBody));
assert.notEqual(bodyTypeValue(b3.b3BodyType.b3_kinematicBody), bodyTypeValue(b3.b3BodyType.b3_dynamicBody));

console.log('R4 A5 SUPPORT LIFECYCLE REPAIR CRUCIBLE PASS');
console.log(JSON.stringify({
  results,
  contract: 'persisted support body is revalidated before any native access; invalid relation is discarded atomically',
  evidenceBoundary: 'currentSupport lifecycle only; does not yet define global sensor query semantics or all possible persisted native handles',
}, null, 2));
