import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';

const b3 = await Box3D();
const dt = 1 / 60;
const forward = [0, 0, -1];
const right = [1, 0, 0];

function makeWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  function box(type, position, half, options = {}) {
    const bodyDef = b3.b3DefaultBodyDef();
    if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [...position];
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = options.linearDamping ?? 0.08;
    bodyDef.angularDamping = options.angularDamping ?? 0.10;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = options.friction ?? 0.8;
    shapeDef.baseMaterial.restitution = 0;
    if (type === 'dynamic') shapeDef.density = options.density ?? 35;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }
  return { world, box };
}

function input(overrides = {}) {
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

function makeCharacter(setup, startPosition, reciprocityMode) {
  return new ControllerOwnedCharacter(b3, setup.world, {
    startPosition,
    gravity: 20,
    virtualMass: 80,
    reciprocityMode,
  });
}

function tick(setup, character, overrides = {}) {
  character.preStep(dt, input(overrides));
  b3.b3World_Step(setup.world, dt, 4);
  character.postStep(dt);
}

function edgeTrial(mode) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const half = 0.62;
  setup.box('dynamic', [0, half, 0], [half, half, half], { density: 42 });
  const character = makeCharacter(setup, [0.74, half * 2 + 0.90 + 1.45, 0], mode);
  const startX = character.position[0];
  let minX = startX;
  let maxX = startX;
  let maxSpeed = 0;
  let maxImpulse = 0;
  for (let i = 0; i < 180; i++) {
    tick(setup, character);
    minX = Math.min(minX, character.position[0]);
    maxX = Math.max(maxX, character.position[0]);
    maxSpeed = Math.max(maxSpeed, Math.hypot(character.velocity[0], character.velocity[2]));
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  return {
    drift: Math.max(Math.abs(maxX - startX), Math.abs(minX - startX)),
    maxSpeed,
    maxImpulse,
  };
}

function pushTrial(mode) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const cube = setup.box('dynamic', [0, 0.6, -0.3], [0.6, 0.6, 0.6], { density: 35 });
  const character = makeCharacter(setup, [0, 2.2, 2.8], mode);
  for (let i = 0; i < 120; i++) tick(setup, character);
  character.reset([0, character.halfHeight + 0.02, 2.8]);
  for (let i = 0; i < 20; i++) tick(setup, character);
  let maxImpulse = 0;
  for (let i = 0; i < 120; i++) {
    tick(setup, character, { moveForward: 1 });
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  const position = [0, 0, 0];
  b3.b3Body_GetPosition(position, cube);
  return { boxZ: position[2], maxImpulse };
}

function ramTrial(mode) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const cube = setup.box('dynamic', [2.0, 0.6, 0], [0.6, 0.6, 0.6], { density: 35 });
  const mass = b3.b3Body_GetMass(cube);
  const character = makeCharacter(setup, [0, 0.92, 0], mode);
  for (let i = 0; i < 20; i++) tick(setup, character);
  const startX = character.position[0];
  b3.b3Body_ApplyLinearImpulse(cube, [-mass * 6.0, 0, 0], [2.0, 0.6, 0], true);
  let maxExternal = 0;
  let maxImpulse = 0;
  for (let i = 0; i < 90; i++) {
    tick(setup, character);
    maxExternal = Math.max(maxExternal, Math.hypot(character.externalVelocity[0], character.externalVelocity[2]));
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  return { dx: character.position[0] - startX, maxExternal, maxImpulse };
}

function landingTrial(mode) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  setup.box('dynamic', [0, 0.28, 0], [1.5, 0.28, 1.5], { density: 32, friction: 0.9, angularDamping: 0.2 });
  const character = makeCharacter(setup, [0, 3.1, 0], mode);
  let supportFrames = 0;
  let maxImpulse = 0;
  for (let i = 0; i < 180; i++) {
    tick(setup, character);
    if (character.currentSupport?.type === 'DYNAMIC') supportFrames += 1;
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  return { supportFrames, maxImpulse };
}

function traversalTrial(mode) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [10, 0.5, 10]);
  const stairX = -5;
  const startZ = 5.25;
  const depth = 0.72;
  for (let i = 0; i < 4; i++) {
    const top = 0.22 * (i + 1);
    setup.box('static', [stairX, top * 0.5, startZ - i * depth * 2], [1.35, top * 0.5, depth]);
  }
  setup.box('static', [-2.0, 0.26, 4.9], [1.0, 0.26, 0.72]);

  const character = makeCharacter(setup, [stairX, 0.92, 7.2], mode);
  for (let i = 0; i < 30; i++) tick(setup, character);
  let maxY = character.position[1];
  let minZ = character.position[2];
  for (let i = 0; i < 150; i++) {
    tick(setup, character, { moveForward: 1 });
    maxY = Math.max(maxY, character.position[1]);
    minZ = Math.min(minZ, character.position[2]);
  }
  const stairsPass = maxY >= character.halfHeight + 0.75 && minZ < 0.5;

  character.reset([-2.0, 0.92, 6.5]);
  for (let i = 0; i < 20; i++) tick(setup, character);
  let ledgeMinZ = character.position[2];
  let ledgeMaxY = character.position[1];
  for (let i = 0; i < 80; i++) {
    tick(setup, character, { moveForward: 1 });
    ledgeMinZ = Math.min(ledgeMinZ, character.position[2]);
    ledgeMaxY = Math.max(ledgeMaxY, character.position[1]);
  }
  const ledgeBlocked = ledgeMinZ >= 5.75 && ledgeMaxY <= character.halfHeight + 0.20;
  return { stairsPass, maxY, minZ, ledgeBlocked, ledgeMinZ };
}

const normal = {
  edge: edgeTrial('normal'),
  push: pushTrial('normal'),
  ram: ramTrial('normal'),
  landing: landingTrial('normal'),
  traversal: traversalTrial('normal'),
};
const aprime = {
  edge: edgeTrial('causal-components'),
  push: pushTrial('causal-components'),
  ram: ramTrial('causal-components'),
  landing: landingTrial('causal-components'),
  traversal: traversalTrial('causal-components'),
};

console.log(
  `E2.2 A-prime production-path qualification: edge normal=${normal.edge.drift.toFixed(2)}m/${normal.edge.maxSpeed.toFixed(2)}mps causal=${aprime.edge.drift.toFixed(2)}m/${aprime.edge.maxSpeed.toFixed(2)}mps; push normal=${normal.push.boxZ.toFixed(2)}m/${normal.push.maxImpulse.toFixed(1)}Ns causal=${aprime.push.boxZ.toFixed(2)}m/${aprime.push.maxImpulse.toFixed(1)}Ns; ram normal=${normal.ram.dx.toFixed(2)}m/${normal.ram.maxExternal.toFixed(2)} causal=${aprime.ram.dx.toFixed(2)}m/${aprime.ram.maxExternal.toFixed(2)}; landing normal=${normal.landing.supportFrames}f/${normal.landing.maxImpulse.toFixed(1)}Ns causal=${aprime.landing.supportFrames}f/${aprime.landing.maxImpulse.toFixed(1)}Ns; stairs=${aprime.traversal.stairsPass ? 'PASS' : 'FAIL'} ledge=${aprime.traversal.ledgeBlocked ? 'PASS' : 'FAIL'}`,
);

if (normal.edge.drift < 0.8) throw new Error(`E2.2 normal production path no longer reproduces baseline edge pathology: ${JSON.stringify(normal.edge)}`);
if (aprime.edge.drift > 0.35 || aprime.edge.drift > normal.edge.drift * 0.45 || aprime.edge.maxSpeed > 0.20) {
  throw new Error(`E2.2 A-prime production path failed edge decontamination: ${JSON.stringify(aprime.edge)}`);
}
if (Math.abs(aprime.push.boxZ - normal.push.boxZ) > 0.08 || aprime.push.maxImpulse < normal.push.maxImpulse * 0.95) {
  throw new Error(`E2.2 A-prime production path regressed ordinary push: normal=${JSON.stringify(normal.push)} causal=${JSON.stringify(aprime.push)}`);
}
if (Math.abs(aprime.ram.dx - normal.ram.dx) > 0.04 || aprime.ram.maxExternal < normal.ram.maxExternal * 0.90) {
  throw new Error(`E2.2 A-prime production path regressed reverse consequence: normal=${JSON.stringify(normal.ram)} causal=${JSON.stringify(aprime.ram)}`);
}
if (aprime.landing.supportFrames < normal.landing.supportFrames - 2 || aprime.landing.maxImpulse < normal.landing.maxImpulse * 0.90) {
  throw new Error(`E2.2 A-prime production path regressed dynamic landing: normal=${JSON.stringify(normal.landing)} causal=${JSON.stringify(aprime.landing)}`);
}
if (!aprime.traversal.stairsPass || !aprime.traversal.ledgeBlocked) {
  throw new Error(`E2.2 A-prime production path regressed static traversal boundary: ${JSON.stringify(aprime.traversal)}`);
}
