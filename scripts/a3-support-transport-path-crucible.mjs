import fs from 'node:fs';
import path from 'node:path';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter, CURRENT_DONOR_REVISION } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 20;
const PLATFORM_Y = 0.25;
const PLATFORM_HALF = [0.75, 0.25, 0.75];
const PLATFORM_TOP = PLATFORM_Y + PLATFORM_HALF[1];
const START_X = -1.5;
const END_X = 1.5;
const WALL_X = 0;
const WALL_HALF_X = 0.05;
const WALL_BOTTOM = 0.70;
const WALL_TOP = 2.50;

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

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

function createBox(world, type, position, half, options = {}) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = options.friction ?? 0.9;
  shapeDef.baseMaterial.restitution = 0;
  if (type === 'dynamic') shapeDef.density = options.density ?? 1;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function makeSetup({ wall }) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);

  // Ground is deliberately below the moving platform. The wall starts above the
  // platform top so it can obstruct the rider without physically obstructing the
  // kinematic support itself.
  createBox(world, 'static', [0, -0.50, 0], [6, 0.50, 4], { friction: 0.9 });
  if (wall) {
    const halfY = (WALL_TOP - WALL_BOTTOM) * 0.5;
    const centerY = (WALL_TOP + WALL_BOTTOM) * 0.5;
    createBox(world, 'static', [WALL_X, centerY, 0], [WALL_HALF_X, halfY, 2.0], { friction: 0 });
  }
  const platform = createBox(
    world,
    'kinematic',
    [START_X, PLATFORM_Y, 0],
    PLATFORM_HALF,
    { friction: 0.95 },
  );
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [START_X, PLATFORM_TOP + 0.9 + 0.02, 0],
    gravity: GRAVITY,
  });
  character.reset([START_X, PLATFORM_TOP + character.halfHeight + 0.02, 0]);

  return { world, platform, character };
}

function setPlatformTarget(platform, x) {
  b3.b3Body_SetTargetTransform(
    platform,
    { position: [x, PLATFORM_Y, 0], quaternion: [0, 0, 0, 1] },
    DT,
    true,
  );
}

function tick(setup, targetX = null) {
  if (targetX !== null) setPlatformTarget(setup.platform, targetX);
  setup.character.preStep(DT, neutralIntent());
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  setup.character.postStep(DT);
  return {
    characterX: setup.character.position[0],
    characterY: setup.character.position[1],
    velocity: [...setup.character.velocity],
    platformX: bodyPosition(setup.platform)[0],
    support: setup.character.currentSupport?.type ?? 'AIR',
    planes: setup.character.lastPlaneCount,
    transport: setup.character.supportTransportDistance,
  };
}

function settle(setup, frames = 60) {
  let last = null;
  for (let i = 0; i < frames; i++) last = tick(setup, START_X);
  if (setup.character.currentSupport?.type !== 'KINEMATIC') {
    throw new Error(`A3 setup failed to acquire kinematic support: ${setup.character.currentSupport?.type ?? 'AIR'}`);
  }
  return last;
}

function runOrdinaryCarryControl() {
  const setup = makeSetup({ wall: false });
  try {
    settle(setup);
    const initialX = setup.character.position[0];
    const frames = 180;
    let supportFrames = 0;
    let peakTransport = 0;
    for (let i = 0; i < frames; i++) {
      const alpha = (i + 1) / frames;
      const frame = tick(setup, START_X + (END_X - START_X) * alpha);
      if (frame.support === 'KINEMATIC') supportFrames += 1;
      peakTransport = Math.max(peakTransport, frame.transport);
    }
    return {
      initialX,
      finalCharacterX: setup.character.position[0],
      finalPlatformX: bodyPosition(setup.platform)[0],
      characterDx: setup.character.position[0] - initialX,
      supportFrames,
      frames,
      peakTransport,
    };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

function runSlowWallControl() {
  const setup = makeSetup({ wall: true });
  try {
    settle(setup);
    const frames = 180;
    let maxCharacterX = setup.character.position[0];
    let wallContactFrames = 0;
    let last = null;
    for (let i = 0; i < frames; i++) {
      const alpha = (i + 1) / frames;
      last = tick(setup, START_X + (END_X - START_X) * alpha);
      maxCharacterX = Math.max(maxCharacterX, last.characterX);
      if (last.planes > 1 || (last.planes > 0 && last.characterX < WALL_X)) wallContactFrames += 1;
    }
    return {
      maxCharacterX,
      finalCharacterX: setup.character.position[0],
      finalCharacterY: setup.character.position[1],
      finalPlatformX: bodyPosition(setup.platform)[0],
      wallContactFrames,
      finalSupport: setup.character.currentSupport?.type ?? 'AIR',
      finalPlanes: setup.character.lastPlaneCount,
      wallNearSideCenterLimit: WALL_X - WALL_HALF_X - setup.character.radius,
      wallFarSideCenterLimit: WALL_X + WALL_HALF_X + setup.character.radius,
      last,
    };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

function runFastWallCarry() {
  const setup = makeSetup({ wall: true });
  try {
    settle(setup);
    const before = {
      characterX: setup.character.position[0],
      characterY: setup.character.position[1],
      platformX: bodyPosition(setup.platform)[0],
      support: setup.character.currentSupport?.type ?? 'AIR',
    };
    const after = tick(setup, END_X);
    return {
      before,
      after,
      characterDx: after.characterX - before.characterX,
      platformDx: after.platformX - before.platformX,
      wallNearSideCenterLimit: WALL_X - WALL_HALF_X - setup.character.radius,
      wallFarSideCenterLimit: WALL_X + WALL_HALF_X + setup.character.radius,
      crossedToFarSide: after.characterX > WALL_X + WALL_HALF_X + setup.character.radius,
      remainedSupported: after.support === 'KINEMATIC',
    };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

if (CURRENT_DONOR_REVISION !== 'v1') {
  throw new Error(`A3 expected current Donor v1, got ${CURRENT_DONOR_REVISION}`);
}

const ordinary = runOrdinaryCarryControl();
const slowWall = runSlowWallControl();
const fastWall = runFastWallCarry();

if (ordinary.characterDx < 2.7 || ordinary.supportFrames < ordinary.frames * 0.95) {
  throw new Error(`A3 ordinary carry control failed: ${JSON.stringify(ordinary)}`);
}
if (slowWall.maxCharacterX > slowWall.wallFarSideCenterLimit) {
  throw new Error(`A3 slow wall control crossed to far side unexpectedly: ${JSON.stringify(slowWall)}`);
}
if (slowWall.wallContactFrames < 5) {
  throw new Error(`A3 slow wall control did not establish sustained wall interaction: ${JSON.stringify(slowWall)}`);
}
if (!fastWall.crossedToFarSide) {
  throw new Error(`A3 fast support carry did not reproduce path tunneling: ${JSON.stringify(fastWall)}`);
}
if (fastWall.characterDx < 2.5 || fastWall.platformDx < 2.5) {
  throw new Error(`A3 fast carry displacement was too small to separate path behavior: ${JSON.stringify(fastWall)}`);
}

const payload = {
  experiment: 'A3 support-transport path crucible',
  donorRevision: CURRENT_DONOR_REVISION,
  dt: DT,
  substeps: SUBSTEPS,
  geometry: {
    platformTop: PLATFORM_TOP,
    wallX: WALL_X,
    wallHalfX: WALL_HALF_X,
    wallBottom: WALL_BOTTOM,
    wallTop: WALL_TOP,
    startX: START_X,
    endX: END_X,
  },
  interpretationBoundary: 'Characterization only. Ordinary carry and normal wall blocking are controls; the fast case asks whether support endpoint transport is swept against third-party geometry. No repair is applied.',
  ordinary,
  slowWall,
  fastWall,
  classification: fastWall.crossedToFarSide && slowWall.maxCharacterX <= slowWall.wallFarSideCenterLimit
    ? 'FAST_SUPPORT_ENDPOINT_TRANSPORT_CROSSES_A_WALL_THAT_NORMAL_SLOW_MOVEMENT_RESPECTS'
    : 'NO_CLEAN_SUPPORT_PATH_SEPARATION',
};

fs.mkdirSync(path.join('tmp', 'a3'), { recursive: true });
fs.writeFileSync(path.join('tmp', 'a3', 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('A3 support-transport CHARACTERIZATION COMPLETE');
console.log(`ordinary: charDx=${ordinary.characterDx.toFixed(4)}m support=${ordinary.supportFrames}/${ordinary.frames}`);
console.log(`slow-wall: maxX=${slowWall.maxCharacterX.toFixed(4)} wallContactFrames=${slowWall.wallContactFrames}`);
console.log(`fast-wall: charDx=${fastWall.characterDx.toFixed(4)}m platformDx=${fastWall.platformDx.toFixed(4)}m afterX=${fastWall.after.characterX.toFixed(4)} crossed=${fastWall.crossedToFarSide} support=${fastWall.after.support} planes=${fastWall.after.planes}`);
console.log(JSON.stringify(payload));
