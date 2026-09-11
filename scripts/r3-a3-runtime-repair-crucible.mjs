import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter, createDonorCharacter, CURRENT_DONOR_REVISION } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 20;

function neutralIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function createBox(world, type, position, half, friction = 0.9) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = friction;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, ...half);
  return body;
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function makeHorizontal({ current, wall = false }) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  createBox(world, 'static', [0, -0.5, 0], [6, 0.5, 4]);
  if (wall) createBox(world, 'static', [0, 1.6, 0], [0.05, 0.9, 2], 0);
  const platform = createBox(world, 'kinematic', [-1.5, 0.25, 0], [0.75, 0.25, 0.75], 0.95);
  const factory = current ? createCurrentDonorCharacter : createDonorCharacter;
  const character = factory(b3, world, { startPosition: [-1.5, 1.42, 0], gravity: GRAVITY });
  character.reset([-1.5, 0.5 + character.halfHeight + 0.02, 0]);
  return { world, platform, character };
}

function horizontalTick(setup, x) {
  b3.b3Body_SetTargetTransform(setup.platform, {
    position: [x, 0.25, 0], quaternion: [0, 0, 0, 1],
  }, DT, true);
  setup.character.preStep(DT, neutralIntent());
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  setup.character.postStep(DT);
  return {
    x: setup.character.position[0],
    y: setup.character.position[1],
    support: setup.character.currentSupport?.type ?? 'AIR',
    transport: setup.character.supportTransportDistance,
    planes: setup.character.lastPlaneCount,
  };
}

function settleHorizontal(setup) {
  for (let i = 0; i < 60; i++) horizontalTick(setup, -1.5);
  assert.equal(setup.character.currentSupport?.type, 'KINEMATIC');
}

function ordinaryCarry(current) {
  const setup = makeHorizontal({ current });
  try {
    settleHorizontal(setup);
    const start = setup.character.position[0];
    let supported = 0;
    for (let i = 0; i < 180; i++) {
      const x = -1.5 + 3 * ((i + 1) / 180);
      const state = horizontalTick(setup, x);
      if (state.support === 'KINEMATIC') supported += 1;
    }
    return { dx: setup.character.position[0] - start, supported };
  } finally { b3.b3DestroyWorld(setup.world); }
}

function fastWall(current) {
  const setup = makeHorizontal({ current, wall: true });
  try {
    settleHorizontal(setup);
    const before = setup.character.position[0];
    const after = horizontalTick(setup, 1.5);
    const nearLimit = -0.05 - setup.character.radius;
    const farLimit = 0.05 + setup.character.radius;
    return {
      before,
      afterX: after.x,
      dx: after.x - before,
      crossed: after.x > farLimit,
      nearLimit,
      farLimit,
      support: after.support,
      transport: after.transport,
    };
  } finally { b3.b3DestroyWorld(setup.world); }
}

function makeVertical({ current }) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  const platform = createBox(world, 'kinematic', [0, 2, 0], [1.2, 0.25, 1.2], 0.95);
  const factory = current ? createCurrentDonorCharacter : createDonorCharacter;
  const character = factory(b3, world, { startPosition: [0, 3.17, 0], gravity: GRAVITY });
  character.reset([0, 2.25 + character.halfHeight + 0.02, 0]);
  return { world, platform, character };
}

function verticalTick(setup, y) {
  b3.b3Body_SetTargetTransform(setup.platform, {
    position: [0, y, 0], quaternion: [0, 0, 0, 1],
  }, DT, true);
  setup.character.preStep(DT, neutralIntent());
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  setup.character.postStep(DT);
  return {
    y: setup.character.position[1],
    vy: setup.character.velocity[1],
    support: setup.character.currentSupport?.type ?? 'AIR',
    transport: setup.character.supportTransportDistance,
    platformY: bodyPosition(setup.platform)[1],
  };
}

function verticalCase(current, direction) {
  const setup = makeVertical({ current });
  try {
    for (let i = 0; i < 60; i++) verticalTick(setup, 2);
    assert.equal(setup.character.currentSupport?.type, 'KINEMATIC');
    const beforeY = setup.character.position[1];
    const after = verticalTick(setup, 2 + direction);
    return {
      direction: direction > 0 ? 'up' : 'down',
      dy: after.y - beforeY,
      support: after.support,
      transport: after.transport,
      vy: after.vy,
    };
  } finally { b3.b3DestroyWorld(setup.world); }
}

assert.equal(CURRENT_DONOR_REVISION, 'v1');

const current = {
  ordinary: ordinaryCarry(true),
  wall: fastWall(true),
  up: verticalCase(true, 1),
  down: verticalCase(true, -1),
};
const historicalV0 = {
  wall: fastWall(false),
  down: verticalCase(false, -1),
};

// Preservation gates for useful support behavior.
assert.ok(current.ordinary.dx > 2.7, `current ordinary carry regressed: ${JSON.stringify(current.ordinary)}`);
assert.ok(current.ordinary.supported >= 171, `current ordinary support continuity regressed: ${JSON.stringify(current.ordinary)}`);
assert.ok(current.up.dy > 0.8, `current upward carry regressed: ${JSON.stringify(current.up)}`);

// Repair gates for both qualified defect classes.
assert.equal(current.wall.crossed, false, `current Donor still crossed wall: ${JSON.stringify(current.wall)}`);
assert.ok(current.wall.afterX <= current.wall.nearLimit + 0.03,
  `current Donor did not stop on wall near side: ${JSON.stringify(current.wall)}`);
assert.ok(current.down.dy > -0.20, `current Donor still followed receding support: ${JSON.stringify(current.down)}`);

// Provenance controls: historical v0 should still reproduce the old behavior.
assert.equal(historicalV0.wall.crossed, true,
  `historical v0 unexpectedly lost A3 witness: ${JSON.stringify(historicalV0.wall)}`);
assert.ok(historicalV0.down.dy < -0.8,
  `historical v0 unexpectedly lost A3b witness: ${JSON.stringify(historicalV0.down)}`);

console.log('R3 A3 RUNTIME REPAIR CRUCIBLE PASS');
console.log(JSON.stringify({
  current,
  historicalV0,
  classification: 'CURRENT_V1_FIXES_A3_AND_A3B_WHILE_PRESERVING_ORDINARY_AND_UPWARD_CARRY;_V0_REMAINS_HISTORICAL_WITNESS',
}, null, 2));
