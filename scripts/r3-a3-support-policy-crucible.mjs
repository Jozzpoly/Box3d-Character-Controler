import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { add3, dot3, length3, scale3, sub3, transformPoint } from '../src/math.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 20;
const PLATFORM_HALF = [0.75, 0.25, 0.75];
const PLATFORM_Y = 0.25;
const PLATFORM_TOP = PLATFORM_Y + PLATFORM_HALF[1];
const START_X = -1.5;
const END_X = 1.5;
const WALL_X = 0;
const WALL_HALF_X = 0.05;
const WALL_BOTTOM = 0.70;
const WALL_TOP = 2.50;

const POLICIES = ['legacy', 'swept', 'unilateral-swept'];

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

function filterUnilateral(delta, normal) {
  const nLen = length3(normal);
  if (!(nLen > 1e-9)) return [...delta];
  const n = scale3(normal, 1 / nLen);
  const along = dot3(delta, n);
  return along < 0 ? sub3(delta, scale3(n, along)) : [...delta];
}

function installPolicy(character, policy) {
  if (policy === 'legacy') return;
  character._applySupportTransport = function applyCandidateSupportTransport() {
    this.supportTransportDistance = 0;
    const probe = this._supportProbe;
    this._supportProbe = null;
    if (!probe) return;

    this.b3.b3Body_GetPosition(this._bodyPosition, probe.body);
    this.b3.b3Body_GetRotation(this._bodyRotation, probe.body);
    const after = transformPoint(this._bodyPosition, this._bodyRotation, probe.localPoint);
    const rawDelta = sub3(after, probe.before);
    const supportNormal = this.currentSupport?.normal ?? [0, 1, 0];
    const requested = policy === 'unilateral-swept'
      ? filterUnilateral(rawDelta, supportNormal)
      : rawDelta;

    const capsule = {
      center1: [0, -this.halfSegment, 0],
      center2: [0, this.halfSegment, 0],
      radius: this.radius,
    };
    const fraction = this.b3.b3World_CastMover(
      this.world,
      this.position,
      capsule,
      requested,
      this.queryFilter,
      (shapeId) => this.b3.b3Shape_GetBody(shapeId) !== probe.body,
    );
    const applied = scale3(requested, fraction);
    this.position = add3(this.position, applied);
    this.supportTransportDistance = length3(applied);
  };
}

function makeHorizontalSetup({ wall, policy }) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  createBox(world, 'static', [0, -0.50, 0], [6, 0.50, 4]);
  if (wall) {
    const halfY = (WALL_TOP - WALL_BOTTOM) * 0.5;
    const centerY = (WALL_TOP + WALL_BOTTOM) * 0.5;
    createBox(world, 'static', [WALL_X, centerY, 0], [WALL_HALF_X, halfY, 2.0], 0);
  }
  const platform = createBox(world, 'kinematic', [START_X, PLATFORM_Y, 0], PLATFORM_HALF, 0.95);
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [START_X, PLATFORM_TOP + 0.9 + 0.02, 0],
    gravity: GRAVITY,
  });
  character.reset([START_X, PLATFORM_TOP + character.halfHeight + 0.02, 0]);
  installPolicy(character, policy);
  return { world, platform, character };
}

function setPlatform(setup, position) {
  b3.b3Body_SetTargetTransform(
    setup.platform,
    { position, quaternion: [0, 0, 0, 1] },
    DT,
    true,
  );
}

function tick(setup, position) {
  setPlatform(setup, position);
  setup.character.preStep(DT, neutralIntent());
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  setup.character.postStep(DT);
  return {
    position: [...setup.character.position],
    velocity: [...setup.character.velocity],
    support: setup.character.currentSupport?.type ?? 'AIR',
    transport: setup.character.supportTransportDistance,
    planes: setup.character.lastPlaneCount,
  };
}

function settleHorizontal(setup) {
  for (let i = 0; i < 60; i++) tick(setup, [START_X, PLATFORM_Y, 0]);
  assert.equal(setup.character.currentSupport?.type, 'KINEMATIC', 'horizontal setup must acquire support');
}

function ordinaryCarry(policy) {
  const setup = makeHorizontalSetup({ wall: false, policy });
  try {
    settleHorizontal(setup);
    const initialX = setup.character.position[0];
    let supportFrames = 0;
    for (let i = 0; i < 180; i++) {
      const alpha = (i + 1) / 180;
      const state = tick(setup, [START_X + (END_X - START_X) * alpha, PLATFORM_Y, 0]);
      if (state.support === 'KINEMATIC') supportFrames += 1;
    }
    return { dx: setup.character.position[0] - initialX, supportFrames };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

function fastWall(policy) {
  const setup = makeHorizontalSetup({ wall: true, policy });
  try {
    settleHorizontal(setup);
    const beforeX = setup.character.position[0];
    const after = tick(setup, [END_X, PLATFORM_Y, 0]);
    const nearLimit = WALL_X - WALL_HALF_X - setup.character.radius;
    const farLimit = WALL_X + WALL_HALF_X + setup.character.radius;
    return {
      beforeX,
      afterX: after.position[0],
      dx: after.position[0] - beforeX,
      nearLimit,
      farLimit,
      crossed: after.position[0] > farLimit,
      support: after.support,
      transport: after.transport,
    };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

function verticalStep(policy, direction) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  const startY = 2.0;
  const platform = createBox(world, 'kinematic', [0, startY, 0], [1.2, 0.25, 1.2], 0.95);
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, startY + 0.25 + 0.9 + 0.02, 0],
    gravity: GRAVITY,
  });
  character.reset([0, startY + 0.25 + character.halfHeight + 0.02, 0]);
  installPolicy(character, policy);
  const setup = { world, platform, character };
  try {
    for (let i = 0; i < 60; i++) tick(setup, [0, startY, 0]);
    assert.equal(character.currentSupport?.type, 'KINEMATIC', 'vertical setup must acquire support');
    const beforeY = character.position[1];
    const after = tick(setup, [0, startY + direction, 0]);
    return {
      direction: direction > 0 ? 'up' : 'down',
      characterDy: after.position[1] - beforeY,
      support: after.support,
      transport: after.transport,
      vy: after.velocity[1],
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

const results = {};
for (const policy of POLICIES) {
  results[policy] = {
    ordinary: ordinaryCarry(policy),
    wall: fastWall(policy),
    up: verticalStep(policy, 1),
    down: verticalStep(policy, -1),
  };
}

// Controls: legacy must reproduce the known defects.
assert.ok(results.legacy.ordinary.dx > 2.7 && results.legacy.ordinary.supportFrames > 170);
assert.equal(results.legacy.wall.crossed, true);
assert.ok(results.legacy.up.characterDy > 0.8);
assert.ok(results.legacy.down.characterDy < -0.8);

// Sweeping the full old attachment should fix path tunneling but should still preserve the bilateral down-pull defect.
assert.equal(results.swept.wall.crossed, false);
assert.ok(results.swept.ordinary.dx > 2.5);
assert.ok(results.swept.up.characterDy > 0.7);
assert.ok(results.swept.down.characterDy < -0.7);

// The combined candidate must preserve useful carry/upward support while fixing both failure classes.
assert.equal(results['unilateral-swept'].wall.crossed, false);
assert.ok(results['unilateral-swept'].ordinary.dx > 2.5);
assert.ok(results['unilateral-swept'].up.characterDy > 0.7);
assert.ok(results['unilateral-swept'].down.characterDy > -0.20);

console.log('R3 A3 SUPPORT POLICY CRUCIBLE PASS');
console.log(JSON.stringify({
  results,
  interpretation: {
    legacy: 'preserves ordinary carry but reproduces wall tunneling and bilateral receding-support pull',
    swept: 'tests whether path safety alone is sufficient',
    unilateralSwept: 'tests third-party swept path safety plus removal of support-normal separation inheritance',
  },
}, null, 2));
