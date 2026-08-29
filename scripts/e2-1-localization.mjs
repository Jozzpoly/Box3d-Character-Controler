import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { SolverOwnedCharacter } from '../src/solver-owned-character.js';

const b3 = await Box3D();
const dt = 1 / 60;
const forward = [0, 0, -1];
const right = [1, 0, 0];

function bodyType(type) {
  if (type === 'dynamic') return b3.b3BodyType.b3_dynamicBody;
  if (type === 'kinematic') return b3.b3BodyType.b3_kinematicBody;
  return b3.b3BodyType.b3_staticBody;
}

function makeWorld(gravity = 20) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(worldDef);

  function box(type, position, half, options = {}) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = bodyType(type);
    bodyDef.position = [...position];
    bodyDef.enableSleep = false;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = options.friction ?? 0.82;
    shapeDef.baseMaterial.restitution = 0;
    if (type === 'dynamic') shapeDef.density = options.density ?? 30;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  return { world, box };
}

function intent(overrides = {}) {
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

function tick(world, character, input = {}, preWorld = null) {
  preWorld?.();
  character.preStep(dt, intent(input));
  b3.b3World_Step(world, dt, 4);
  character.postStep(dt);
}

function yawQuaternion(angle) {
  const h = angle * 0.5;
  return [0, Math.sin(h), 0, Math.cos(h)];
}

function vectorXZ(v) {
  return Math.hypot(v[0], v[2]);
}

// -----------------------------------------------------------------------------
// Gate A — localize the controller-owned support/jump transfer channels.
// -----------------------------------------------------------------------------

function runASupportCase(kind) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);

  let platform = null;
  let start = [0, 0.9, 0];
  if (kind === 'static') {
    platform = setup.box('static', [0, 0.25, 0], [1.8, 0.25, 1.8]);
    start = [0, 1.4, 0];
  } else if (kind === 'dynamic-still') {
    platform = setup.box('dynamic', [0, 0.20, 0], [1.6, 0.20, 1.6], { density: 35, friction: 0.82 });
    start = [0, 1.30, 0];
  } else if (kind === 'kinematic-translate') {
    platform = setup.box('kinematic', [0, 0.25, 0], [1.8, 0.25, 1.8], { friction: 0.9 });
    start = [0, 1.4, 0];
  } else if (kind === 'kinematic-rotate') {
    platform = setup.box('kinematic', [0, 0.25, 0], [2.0, 0.25, 2.0], { friction: 0.9 });
    start = [1.0, 1.4, 0];
  } else {
    throw new Error(`Unknown A support case: ${kind}`);
  }

  const character = new ControllerOwnedCharacter(b3, setup.world, {
    startPosition: start,
    gravity: 20,
    virtualMass: 80,
  });

  let phase = 0;
  let angle = 0;
  let translateX = 0;
  const moving = kind === 'kinematic-translate' || kind === 'kinematic-rotate';

  for (let i = 0; i < 120; i++) {
    tick(setup.world, character, {}, moving ? () => {
      if (kind === 'kinematic-translate') {
        translateX += 1.5 * dt;
        b3.b3Body_SetTargetTransform(
          platform,
          { position: [translateX, 0.25, 0], quaternion: [0, 0, 0, 1] },
          dt,
          true,
        );
      } else {
        angle += 1.2 * dt;
        b3.b3Body_SetTargetTransform(
          platform,
          { position: [0, 0.25, 0], quaternion: yawQuaternion(angle) },
          dt,
          true,
        );
      }
    } : null);
    if (character.currentSupport) phase += 1;
  }

  if (!character.currentSupport) {
    throw new Error(`A ${kind} failed to acquire support`);
  }

  const supportBefore = character.currentSupport;
  const supportPointVelocity = character._supportPointVelocity(supportBefore);
  const before = {
    position: [...character.position],
    velocity: [...character.velocity],
    external: [...character.externalVelocity],
    supportType: supportBefore.type,
    supportPointVelocity: [...supportPointVelocity],
  };

  if (kind === 'kinematic-translate') {
    translateX += 1.5 * dt;
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [translateX, 0.25, 0], quaternion: [0, 0, 0, 1] },
      dt,
      true,
    );
  } else if (kind === 'kinematic-rotate') {
    angle += 1.2 * dt;
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [0, 0.25, 0], quaternion: yawQuaternion(angle) },
      dt,
      true,
    );
  }

  character.preStep(dt, intent({ jump: true, jumpHeld: true }));
  const afterPre = {
    velocity: [...character.velocity],
    external: [...character.externalVelocity],
    support: character.currentSupport?.type ?? 'NONE',
  };
  b3.b3World_Step(setup.world, dt, 4);
  character.postStep(dt);

  const frames = [];
  let previous = [...character.position];
  for (let i = 0; i < 8; i++) {
    tick(setup.world, character, { jumpHeld: true }, moving ? () => {
      if (kind === 'kinematic-translate') {
        translateX += 1.5 * dt;
        b3.b3Body_SetTargetTransform(
          platform,
          { position: [translateX, 0.25, 0], quaternion: [0, 0, 0, 1] },
          dt,
          true,
        );
      } else if (kind === 'kinematic-rotate') {
        angle += 1.2 * dt;
        b3.b3Body_SetTargetTransform(
          platform,
          { position: [0, 0.25, 0], quaternion: yawQuaternion(angle) },
          dt,
          true,
        );
      }
    } : null);
    const delta = [
      character.position[0] - previous[0],
      character.position[1] - previous[1],
      character.position[2] - previous[2],
    ];
    frames.push({
      i: i + 1,
      dxz: vectorXZ(delta),
      speed: vectorXZ(character.velocity),
      external: vectorXZ(character.externalVelocity),
      support: character.currentSupport?.type ?? 'AIR',
      impulse: character.lastContactImpulse,
    });
    previous = [...character.position];
  }

  return {
    kind,
    supportType: before.supportType,
    supportSpeed: vectorXZ(before.supportPointVelocity),
    supportVelocity: before.supportPointVelocity,
    beforeSpeed: vectorXZ(before.velocity),
    beforeExternal: vectorXZ(before.external),
    jumpPreSpeed: vectorXZ(afterPre.velocity),
    jumpPreExternal: vectorXZ(afterPre.external),
    inheritedDelta: vectorXZ([
      afterPre.velocity[0] - before.velocity[0],
      0,
      afterPre.velocity[2] - before.velocity[2],
    ]),
    first8Displacement: frames.reduce((sum, frame) => sum + frame.dxz, 0),
    maxPostExternal: Math.max(...frames.map((frame) => frame.external)),
    maxPostImpulse: Math.max(...frames.map((frame) => frame.impulse)),
    frames,
  };
}

const aCases = [
  runASupportCase('static'),
  runASupportCase('dynamic-still'),
  runASupportCase('kinematic-translate'),
  runASupportCase('kinematic-rotate'),
];

const aStatic = aCases.find((entry) => entry.kind === 'static');
const aTranslate = aCases.find((entry) => entry.kind === 'kinematic-translate');
const aRotate = aCases.find((entry) => entry.kind === 'kinematic-rotate');
if (aStatic.supportSpeed > 0.05 || aStatic.inheritedDelta > 0.05) {
  throw new Error(`A static control unexpectedly inherited horizontal support motion: ${JSON.stringify(aStatic)}`);
}
if (aTranslate.supportSpeed < 0.8 || aTranslate.jumpPreExternal < 0.8) {
  throw new Error(`A translating support did not expose velocity inheritance: ${JSON.stringify(aTranslate)}`);
}
if (aRotate.supportSpeed < 0.4 || aRotate.jumpPreExternal < 0.4) {
  throw new Error(`A rotating support did not expose angular point-velocity inheritance: ${JSON.stringify(aRotate)}`);
}

console.log('E2.1 A support/jump localization:');
for (const entry of aCases) {
  console.log(
    `  ${entry.kind}: support=${entry.supportType} supportV=${entry.supportSpeed.toFixed(2)}m/s beforeExt=${entry.beforeExternal.toFixed(2)} jumpExt=${entry.jumpPreExternal.toFixed(2)} inherited=${entry.inheritedDelta.toFixed(2)} first8=${entry.first8Displacement.toFixed(3)}m postExtMax=${entry.maxPostExternal.toFixed(2)} impulseMax=${entry.maxPostImpulse.toFixed(1)}Ns`,
  );
}

// -----------------------------------------------------------------------------
// Gate B — map natural rough-terrain boundary for A and B without jump.
// -----------------------------------------------------------------------------

function runStepTrial(mode, height, friction = 0.45, groundAcceleration = 26) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [6, 0.5, 8], { friction: 0.9 });
  if (height > 0) {
    setup.box('static', [0, height / 2, -2.0], [2.2, height / 2, 2.0], { friction: 0.9 });
  }

  const options = {
    startPosition: [0, 0.9, 2.2],
    gravity: 20,
  };
  let character;
  if (mode === 'A') {
    character = new ControllerOwnedCharacter(b3, setup.world, { ...options, virtualMass: 80 });
  } else {
    character = new SolverOwnedCharacter(b3, setup.world, {
      ...options,
      mass: 80,
      friction,
      groundAcceleration,
    });
  }

  for (let i = 0; i < 45; i++) tick(setup.world, character);
  const startZ = character.position[2];
  let minZ = startZ;
  let maxY = character.position[1];
  let maxSpeed = 0;
  let supportLossFrames = 0;
  for (let i = 0; i < 180; i++) {
    tick(setup.world, character, { moveForward: 1 });
    minZ = Math.min(minZ, character.position[2]);
    maxY = Math.max(maxY, character.position[1]);
    maxSpeed = Math.max(maxSpeed, Math.hypot(character.velocity[0], character.velocity[2]));
    if (!character.currentSupport) supportLossFrames += 1;
  }

  const passed = minZ < -0.70;
  return {
    mode,
    height,
    friction,
    groundAcceleration,
    passed,
    minZ,
    finalZ: character.position[2],
    maxY,
    rise: maxY - 0.9,
    maxSpeed,
    supportLossFrames,
  };
}

const heights = [0, 0.05, 0.10, 0.15, 0.20, 0.22, 0.25, 0.30];
const aTerrain = heights.map((height) => runStepTrial('A', height));
const bFrictions = [0.20, 0.45, 0.82];
const bTerrain = bFrictions.flatMap((friction) =>
  heights.map((height) => runStepTrial('B', height, friction, 26)),
);

for (const flat of [aTerrain[0], ...bTerrain.filter((entry) => entry.height === 0)]) {
  if (!flat.passed || flat.maxSpeed < 3.5) {
    throw new Error(`E2.1 flat-ground control invalid: ${JSON.stringify(flat)}`);
  }
}

function boundary(entries) {
  const passed = entries.filter((entry) => entry.passed).map((entry) => entry.height);
  return passed.length ? Math.max(...passed) : null;
}

console.log('E2.1 terrain boundary (vertical step, no jump):');
console.log(
  `  A controller-owned: maxPassed=${boundary(aTerrain)?.toFixed(2) ?? 'none'}m :: ${aTerrain.map((e) => `${e.height.toFixed(2)}=${e.passed ? 'PASS' : `BLOCK@${e.minZ.toFixed(2)}`}`).join(' ')}`,
);
for (const friction of bFrictions) {
  const entries = bTerrain.filter((entry) => entry.friction === friction);
  console.log(
    `  B solver-owned f=${friction.toFixed(2)}: maxPassed=${boundary(entries)?.toFixed(2) ?? 'none'}m :: ${entries.map((e) => `${e.height.toFixed(2)}=${e.passed ? 'PASS' : `BLOCK@${e.minZ.toFixed(2)}`}`).join(' ')}`,
  );
}

const bBoundaries = bFrictions.map((friction) => ({
  friction,
  maxPassed: boundary(bTerrain.filter((entry) => entry.friction === friction)),
}));
console.log(`E2.1 friction-boundary summary: ${bBoundaries.map((e) => `f=${e.friction.toFixed(2)}=>${e.maxPassed?.toFixed(2) ?? 'none'}m`).join(' | ')}`);
