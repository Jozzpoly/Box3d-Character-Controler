import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { SolverOwnedCharacter } from '../src/solver-owned-character.js';

const b3 = await Box3D();
const dt = 1 / 60;
const forward = [0, 0, -1];
const right = [1, 0, 0];

function typeOf(type) {
  if (type === 'dynamic') return b3.b3BodyType.b3_dynamicBody;
  if (type === 'kinematic') return b3.b3BodyType.b3_kinematicBody;
  return b3.b3BodyType.b3_staticBody;
}

function worldWithHelpers() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  function box(type, position, half, options = {}) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = typeOf(type);
    bodyDef.position = [...position];
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = options.linearDamping ?? 0.08;
    bodyDef.angularDamping = options.angularDamping ?? 0.14;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = options.friction ?? 0.78;
    shapeDef.baseMaterial.restitution = options.restitution ?? 0;
    if (type === 'dynamic') shapeDef.density = options.density ?? 42;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  return { world, box };
}

function makeIntent(overrides = {}) {
  return {
    forward,
    right,
    moveForward: 0,
    moveRight: 0,
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function tick(world, character, input = {}) {
  character.preStep(dt, makeIntent(input));
  b3.b3World_Step(world, dt, 4);
  character.postStep(dt);
}

function makeCharacter(mode, world, start, options = {}) {
  if (mode === 'A') {
    return new ControllerOwnedCharacter(b3, world, {
      startPosition: start,
      gravity: 20,
      virtualMass: 80,
    });
  }
  return new SolverOwnedCharacter(b3, world, {
    startPosition: start,
    gravity: 20,
    mass: 80,
    friction: options.friction ?? 0.45,
    groundAcceleration: options.groundAcceleration ?? 26,
  });
}

// -----------------------------------------------------------------------------
// Edge landing: pure vertical drop with zero horizontal input.
// If horizontal motion appears, it must come from contact geometry / solver response,
// dynamic-body reaction, or A's mover clipping rather than player intent.
// -----------------------------------------------------------------------------

function edgeLanding(mode, platformType, offsetX) {
  const setup = worldWithHelpers();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8], { friction: 0.9 });
  const cubeHalf = 0.62;
  const cube = setup.box(platformType, [0, cubeHalf, 0], [cubeHalf, cubeHalf, cubeHalf], {
    density: 42,
    friction: 0.78,
    angularDamping: 0.10,
  });
  const standY = cubeHalf * 2 + 0.90;
  const start = [offsetX, standY + 1.45, 0];
  const character = makeCharacter(mode, setup.world, start);

  let strongestPlane = null;
  if (mode === 'A') {
    const originalCollect = character._collectPlanes.bind(character);
    character._collectPlanes = (...args) => {
      const result = originalCollect(...args);
      for (const entry of result.planes) {
        const n = entry.plane.normal;
        const horizontal = Math.hypot(n[0], n[2]);
        if (n[1] > 0.05 && (!strongestPlane || horizontal > strongestPlane.horizontal)) {
          strongestPlane = { horizontal, normal: [...n] };
        }
      }
      return result;
    };
  }

  const bodyPos = [0, 0, 0];
  const startX = character.position[0];
  let minX = startX;
  let maxX = startX;
  let maxAbsVx = 0;
  let maxHorizontalSpeed = 0;
  let maxContactImpulse = 0;
  let firstSupport = null;
  let landedFrame = -1;
  let dynamicSupportFrames = 0;

  for (let i = 0; i < 180; i++) {
    tick(setup.world, character);
    minX = Math.min(minX, character.position[0]);
    maxX = Math.max(maxX, character.position[0]);
    maxAbsVx = Math.max(maxAbsVx, Math.abs(character.velocity[0]));
    maxHorizontalSpeed = Math.max(maxHorizontalSpeed, Math.hypot(character.velocity[0], character.velocity[2]));
    maxContactImpulse = Math.max(maxContactImpulse, character.lastContactImpulse ?? 0);
    if (character.currentSupport && firstSupport === null) {
      firstSupport = {
        type: character.currentSupport.type,
        normal: character.currentSupport.normal ? [...character.currentSupport.normal] : null,
      };
      landedFrame = i;
    }
    if (character.currentSupport?.type === 'DYNAMIC') dynamicSupportFrames += 1;
  }

  b3.b3Body_GetPosition(bodyPos, cube);
  const outwardDrift = Math.max(Math.abs(maxX - startX), Math.abs(minX - startX));
  return {
    mode,
    platformType,
    offsetX,
    outwardDrift,
    maxAbsVx,
    maxHorizontalSpeed,
    maxContactImpulse,
    firstSupport,
    landedFrame,
    dynamicSupportFrames,
    finalCharacterX: character.position[0],
    finalCubeX: bodyPos[0],
    strongestPlane,
  };
}

const offsets = [0.00, 0.35, 0.52, 0.62, 0.74, 0.86];
const edgeResults = [];
for (const mode of ['A', 'B']) {
  for (const platformType of ['static', 'dynamic']) {
    for (const offset of offsets) edgeResults.push(edgeLanding(mode, platformType, offset));
  }
}

for (const result of edgeResults.filter((entry) => entry.offsetX === 0)) {
  if (result.outwardDrift > 0.06 || result.maxHorizontalSpeed > 0.25) {
    throw new Error(`E2.1 centered landing control developed lateral motion: ${JSON.stringify(result)}`);
  }
}

console.log('E2.1 edge-landing localization (vertical drop, zero horizontal input):');
for (const mode of ['A', 'B']) {
  for (const platformType of ['static', 'dynamic']) {
    const entries = edgeResults.filter((e) => e.mode === mode && e.platformType === platformType);
    console.log(
      `  ${mode}/${platformType}: ${entries.map((e) => {
        const plane = e.strongestPlane ? ` planeH=${e.strongestPlane.horizontal.toFixed(2)}` : '';
        const cube = platformType === 'dynamic' ? ` cubeX=${e.finalCubeX.toFixed(2)}` : '';
        return `x=${e.offsetX.toFixed(2)} drift=${e.outwardDrift.toFixed(2)} v=${e.maxHorizontalSpeed.toFixed(2)} support=${e.firstSupport?.type ?? 'NONE'} impulse=${e.maxContactImpulse.toFixed(1)}${plane}${cube}`;
      }).join(' | ')}`,
    );
  }
}

// -----------------------------------------------------------------------------
// Authority sensitivity at the first robustly blocking B step height.
// This distinguishes a geometric/contact boundary from a merely underpowered motor.
// -----------------------------------------------------------------------------

function authorityStepTrial(height, groundAcceleration, friction = 0.45) {
  const setup = worldWithHelpers();
  setup.box('static', [0, -0.5, 0], [6, 0.5, 8], { friction: 0.9 });
  setup.box('static', [0, height / 2, -2.0], [2.2, height / 2, 2.0], { friction: 0.9 });
  const character = makeCharacter('B', setup.world, [0, 0.9, 2.2], { friction, groundAcceleration });
  for (let i = 0; i < 45; i++) tick(setup.world, character);

  let minZ = character.position[2];
  let maxY = character.position[1];
  let peakControlImpulse = 0;
  let totalControlImpulse = 0;
  for (let i = 0; i < 180; i++) {
    tick(setup.world, character, { moveForward: 1 });
    minZ = Math.min(minZ, character.position[2]);
    maxY = Math.max(maxY, character.position[1]);
    peakControlImpulse = Math.max(peakControlImpulse, character.lastControlImpulse);
    totalControlImpulse += character.lastControlImpulse;
  }
  return {
    height,
    groundAcceleration,
    friction,
    passed: minZ < -0.70,
    minZ,
    rise: maxY - 0.9,
    peakControlImpulse,
    totalControlImpulse,
  };
}

const authorityValues = [13, 26, 52, 104];
const authorityHeights = [0.15, 0.20, 0.22];
const authorityResults = authorityValues.flatMap((acceleration) =>
  authorityHeights.map((height) => authorityStepTrial(height, acceleration, 0.45)),
);

console.log('E2.1 B authority sensitivity (f=0.45, no jump):');
for (const acceleration of authorityValues) {
  const entries = authorityResults.filter((e) => e.groundAcceleration === acceleration);
  console.log(
    `  accel=${acceleration.toFixed(0)}m/s²: ${entries.map((e) => `${e.height.toFixed(2)}=${e.passed ? 'PASS' : `BLOCK@${e.minZ.toFixed(2)}`} rise=${e.rise.toFixed(2)} peakI=${e.peakControlImpulse.toFixed(1)}Ns`).join(' | ')}`,
  );
}
