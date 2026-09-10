import fs from 'node:fs';
import path from 'node:path';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter, CURRENT_DONOR_REVISION } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 20;
const PLATFORM_HALF = [1.2, 0.25, 1.2];
const START_PLATFORM_Y = 2.0;
const PLATFORM_TOP_OFFSET = PLATFORM_HALF[1];
const STEP_DISTANCE = 1.0;

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

function createKinematicPlatform(world) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_kinematicBody;
  bodyDef.position = [0, START_PLATFORM_Y, 0];
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.95;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, ...PLATFORM_HALF);
  return body;
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function setPlatformY(platform, y) {
  b3.b3Body_SetTargetTransform(
    platform,
    { position: [0, y, 0], quaternion: [0, 0, 0, 1] },
    DT,
    true,
  );
}

function makeSetup() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  const platform = createKinematicPlatform(world);
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, START_PLATFORM_Y + PLATFORM_TOP_OFFSET + 0.9 + 0.02, 0],
    gravity: GRAVITY,
  });
  character.reset([0, START_PLATFORM_Y + PLATFORM_TOP_OFFSET + character.halfHeight + 0.02, 0]);
  return { world, platform, character };
}

function tick(setup, targetPlatformY = START_PLATFORM_Y) {
  setPlatformY(setup.platform, targetPlatformY);
  setup.character.preStep(DT, neutralIntent());
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  setup.character.postStep(DT);
  return {
    characterY: setup.character.position[1],
    characterVy: setup.character.velocity[1],
    platformY: bodyPosition(setup.platform)[1],
    support: setup.character.currentSupport?.type ?? 'AIR',
    transport: setup.character.supportTransportDistance,
    planes: setup.character.lastPlaneCount,
  };
}

function settle(setup) {
  let state = null;
  for (let i = 0; i < 60; i++) state = tick(setup);
  if (setup.character.currentSupport?.type !== 'KINEMATIC') {
    throw new Error(`A3b failed to settle on kinematic support: ${setup.character.currentSupport?.type ?? 'AIR'}`);
  }
  if (Math.abs(setup.character.velocity[1]) > 1e-6) {
    throw new Error(`A3b settled character retained vertical speed ${setup.character.velocity[1]}`);
  }
  return state;
}

function runDirectionalCase(direction) {
  const setup = makeSetup();
  try {
    settle(setup);
    const before = {
      characterY: setup.character.position[1],
      characterVy: setup.character.velocity[1],
      platformY: bodyPosition(setup.platform)[1],
      support: setup.character.currentSupport?.type ?? 'AIR',
    };
    const targetY = START_PLATFORM_Y + direction * STEP_DISTANCE;
    const after = tick(setup, targetY);
    return {
      direction: direction > 0 ? 'up' : 'down',
      targetPlatformY: targetY,
      before,
      after,
      platformDy: after.platformY - before.platformY,
      characterDy: after.characterY - before.characterY,
      relativeDyError: (after.characterY - before.characterY) - (after.platformY - before.platformY),
      remainedSupported: after.support === 'KINEMATIC',
    };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

function runStationaryReference() {
  const setup = makeSetup();
  try {
    settle(setup);
    const beforeY = setup.character.position[1];
    const after = tick(setup, START_PLATFORM_Y);
    return {
      characterDy: after.characterY - beforeY,
      characterVy: after.characterVy,
      support: after.support,
      transport: after.transport,
    };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

if (CURRENT_DONOR_REVISION !== 'v1') {
  throw new Error(`A3b expected current Donor v1, got ${CURRENT_DONOR_REVISION}`);
}

const stationary = runStationaryReference();
const up = runDirectionalCase(1);
const down = runDirectionalCase(-1);

if (Math.abs(stationary.characterDy) > 0.01 || stationary.support !== 'KINEMATIC') {
  throw new Error(`A3b stationary reference failed: ${JSON.stringify(stationary)}`);
}
if (up.characterDy < 0.8 || !up.remainedSupported) {
  throw new Error(`A3b upward support transport control failed: ${JSON.stringify(up)}`);
}
if (down.characterDy > -0.8 || !down.remainedSupported) {
  throw new Error(`A3b did not reproduce downward attachment transport: ${JSON.stringify(down)}`);
}
if (Math.abs(down.relativeDyError) > 0.03) {
  throw new Error(`A3b downward character did not follow support endpoint closely: ${JSON.stringify(down)}`);
}

const freeFallFromRestOneTick = -0.5 * GRAVITY * DT * DT;
const payload = {
  experiment: 'A3b support release semantics crucible',
  donorRevision: CURRENT_DONOR_REVISION,
  dt: DT,
  substeps: SUBSTEPS,
  gravity: GRAVITY,
  platformStepDistance: STEP_DISTANCE,
  freeFallFromRestOneTick,
  interpretationBoundary: 'Characterization only. The downward case asks whether previous-frame support transport is treated as a bilateral attachment before support is re-evaluated. It does not prescribe the final detach policy.',
  stationary,
  up,
  down,
  downwardDisplacementVsOneTickFreeFallRatio: Math.abs(down.characterDy / freeFallFromRestOneTick),
  classification: down.characterDy < -0.8 && down.remainedSupported
    ? 'FAST_RECEDING_SUPPORT_PULLS_CHARACTER_DOWN_AND_REMAINS_ATTACHED_FOR_THE_TICK'
    : 'DOWNWARD_SUPPORT_RELEASED_OR_DID_NOT_CARRY',
};

fs.mkdirSync(path.join('tmp', 'a3b'), { recursive: true });
fs.writeFileSync(path.join('tmp', 'a3b', 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('A3b support-release CHARACTERIZATION COMPLETE');
console.log(`stationary: dy=${stationary.characterDy.toFixed(6)} support=${stationary.support}`);
console.log(`up: platformDy=${up.platformDy.toFixed(4)} charDy=${up.characterDy.toFixed(4)} support=${up.after.support} transport=${up.after.transport.toFixed(4)}`);
console.log(`down: platformDy=${down.platformDy.toFixed(4)} charDy=${down.characterDy.toFixed(4)} support=${down.after.support} transport=${down.after.transport.toFixed(4)} freeFallRatio=${payload.downwardDisplacementVsOneTickFreeFallRatio.toFixed(1)}x`);
console.log(JSON.stringify(payload));
