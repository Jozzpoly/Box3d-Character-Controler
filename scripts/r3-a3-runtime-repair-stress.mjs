import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

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

function makeWorld({ platformPosition = [0, 2, 0], platformHalf = [1.2, 0.25, 1.2], wall = null, ceiling = null } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  if (wall) createBox(world, 'static', wall.position, wall.half, 0);
  if (ceiling) createBox(world, 'static', ceiling.position, ceiling.half, 0);
  const platform = createBox(world, 'kinematic', platformPosition, platformHalf, 0.95);
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [
      platformPosition[0],
      platformPosition[1] + platformHalf[1] + 0.92,
      platformPosition[2],
    ],
    gravity: GRAVITY,
  });
  character.reset([
    platformPosition[0],
    platformPosition[1] + platformHalf[1] + character.halfHeight + 0.02,
    platformPosition[2],
  ]);
  return { world, platform, character, platformPosition: [...platformPosition] };
}

function tick(setup, position) {
  b3.b3Body_SetTargetTransform(setup.platform, {
    position: [...position], quaternion: [0, 0, 0, 1],
  }, DT, true);
  setup.character.preStep(DT, neutralIntent());
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  setup.character.postStep(DT);
  return {
    position: [...setup.character.position],
    velocity: [...setup.character.velocity],
    support: setup.character.currentSupport?.type ?? 'AIR',
    transport: setup.character.supportTransportDistance,
  };
}

function settle(setup, frames = 60) {
  for (let i = 0; i < frames; i++) tick(setup, setup.platformPosition);
  assert.equal(setup.character.currentSupport?.type, 'KINEMATIC', 'setup must acquire kinematic support');
}

const downMagnitudes = [0.05, 0.1, 0.2, 0.4, 0.75, 1.0, 1.5];
const downResults = [];
for (const magnitude of downMagnitudes) {
  const setup = makeWorld();
  try {
    settle(setup);
    const before = setup.character.position[1];
    const state = tick(setup, [0, 2 - magnitude, 0]);
    const dy = state.position[1] - before;
    downResults.push({ magnitude, dy, support: state.support, transport: state.transport });
    assert.ok(dy > -0.20, `receding support drag escaped bound at ${magnitude} m: ${JSON.stringify(downResults.at(-1))}`);
    if (magnitude >= 0.4) {
      assert.ok(Math.abs(dy) < magnitude * 0.4,
        `character still scales too strongly with receding support at ${magnitude} m: ${JSON.stringify(downResults.at(-1))}`);
    }
  } finally { b3.b3DestroyWorld(setup.world); }
}

const upMagnitudes = [0.05, 0.1, 0.2, 0.4, 0.75, 1.0];
const upResults = [];
for (const magnitude of upMagnitudes) {
  const setup = makeWorld();
  try {
    settle(setup);
    const before = setup.character.position[1];
    const state = tick(setup, [0, 2 + magnitude, 0]);
    const dy = state.position[1] - before;
    upResults.push({ magnitude, dy, support: state.support, transport: state.transport });
    assert.ok(dy > Math.max(0.01, magnitude - 0.20),
      `upward support carry regressed at ${magnitude} m: ${JSON.stringify(upResults.at(-1))}`);
  } finally { b3.b3DestroyWorld(setup.world); }
}

const lateralSpeeds = [0.25, 0.5, 1.0, 2.0, 3.0];
const lateralResults = [];
for (const totalDistance of lateralSpeeds) {
  const setup = makeWorld({ platformPosition: [-totalDistance / 2, 2, 0] });
  try {
    settle(setup);
    const before = setup.character.position[0];
    const frames = 120;
    let supported = 0;
    for (let i = 0; i < frames; i++) {
      const alpha = (i + 1) / frames;
      const x = -totalDistance / 2 + totalDistance * alpha;
      const state = tick(setup, [x, 2, 0]);
      if (state.support === 'KINEMATIC') supported += 1;
    }
    const dx = setup.character.position[0] - before;
    lateralResults.push({ totalDistance, dx, supported });
    assert.ok(dx > totalDistance - 0.18,
      `ordinary lateral carry lost too much displacement: ${JSON.stringify(lateralResults.at(-1))}`);
    assert.ok(supported >= 112,
      `ordinary lateral support continuity regressed: ${JSON.stringify(lateralResults.at(-1))}`);
  } finally { b3.b3DestroyWorld(setup.world); }
}

const wallCrossDistances = [0.8, 1.2, 2.0, 3.0, 4.5];
const wallResults = [];
for (const distance of wallCrossDistances) {
  const startX = -1.0;
  const wallHalfX = 0.05;
  const setup = makeWorld({
    platformPosition: [startX, 0.25, 0],
    platformHalf: [0.75, 0.25, 0.75],
    wall: { position: [0, 1.6, 0], half: [wallHalfX, 0.9, 2] },
  });
  try {
    settle(setup);
    const state = tick(setup, [startX + distance, 0.25, 0]);
    const nearLimit = -wallHalfX - setup.character.radius;
    const farLimit = wallHalfX + setup.character.radius;
    wallResults.push({ distance, x: state.position[0], nearLimit, farLimit, transport: state.transport });
    assert.ok(state.position[0] <= nearLimit + 0.035,
      `support carry crossed or escaped wall near-side bound: ${JSON.stringify(wallResults.at(-1))}`);
  } finally { b3.b3DestroyWorld(setup.world); }
}

const ceilingMoves = [0.2, 0.4, 0.75, 1.0, 1.5];
const ceilingResults = [];
for (const magnitude of ceilingMoves) {
  const platformY = 0.25;
  const platformHalf = [1.0, 0.25, 1.0];
  const assumedHalfHeight = 0.90;
  const startCharacterY = platformY + platformHalf[1] + assumedHalfHeight + 0.02;
  const ceilingBottom = startCharacterY + assumedHalfHeight + 0.18;
  const setup = makeWorld({
    platformPosition: [0, platformY, 0],
    platformHalf,
    ceiling: { position: [0, ceilingBottom + 0.20, 0], half: [2, 0.20, 2] },
  });
  try {
    settle(setup);
    const state = tick(setup, [0, platformY + magnitude, 0]);
    const top = state.position[1] + setup.character.halfHeight;
    ceilingResults.push({ magnitude, top, ceilingBottom, penetration: top - ceilingBottom, transport: state.transport });
    assert.ok(top <= ceilingBottom + 0.015,
      `upward carry penetrated ceiling: ${JSON.stringify(ceilingResults.at(-1))}`);
  } finally { b3.b3DestroyWorld(setup.world); }
}

console.log('R3 A3 RUNTIME REPAIR STRESS PASS');
console.log(JSON.stringify({
  downResults,
  upResults,
  lateralResults,
  wallResults,
  ceilingResults,
  totals: {
    recedingCases: downResults.length,
    upwardCases: upResults.length,
    lateralSeries: lateralResults.length,
    wallCases: wallResults.length,
    ceilingCases: ceilingResults.length,
  },
  classification: 'UNILATERAL_SWEPT_CURRENT_V1_SURVIVES_BROADER_SUPPORT_MOTION_ENVELOPE',
}, null, 2));
