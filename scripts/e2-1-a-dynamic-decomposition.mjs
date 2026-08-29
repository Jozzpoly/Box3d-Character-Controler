import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';

const b3 = await Box3D();
const dt = 1 / 60;

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
    shapeDef.baseMaterial.friction = options.friction ?? 0.78;
    shapeDef.baseMaterial.restitution = 0;
    if (type === 'dynamic') shapeDef.density = options.density ?? 42;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  return { world, box };
}

function input() {
  return {
    forward: [0, 0, -1],
    right: [1, 0, 0],
    moveForward: 0,
    moveRight: 0,
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function run(offsetX, variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8], { friction: 0.9 });
  const half = 0.62;
  const cube = setup.box('dynamic', [0, half, 0], [half, half, half], {
    density: 42,
    friction: 0.78,
    angularDamping: 0.10,
  });
  const character = new ControllerOwnedCharacter(b3, setup.world, {
    startPosition: [offsetX, half * 2 + 0.90 + 1.45, 0],
    gravity: 20,
    virtualMass: 80,
  });

  if (variant.includes('no-exchange')) {
    character._exchangeDynamicContactImpulses = function noExchange() {
      this.lastContactImpulse = 0;
      this.lastDynamicContacts = 0;
    };
  }
  if (variant.includes('no-transport')) {
    character._applySupportTransport = function noTransport() {
      this.supportTransportDistance = 0;
      this._supportProbe = null;
    };
  }

  const startX = character.position[0];
  const angular = [0, 0, 0];
  const cubePos = [0, 0, 0];
  let minX = startX;
  let maxX = startX;
  let maxSpeed = 0;
  let maxImpulse = 0;
  let maxTransport = 0;
  let peakAngularSpeed = 0;
  let dynamicSupportFrames = 0;

  for (let i = 0; i < 180; i++) {
    character.preStep(dt, input());
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);
    minX = Math.min(minX, character.position[0]);
    maxX = Math.max(maxX, character.position[0]);
    maxSpeed = Math.max(maxSpeed, Math.hypot(character.velocity[0], character.velocity[2]));
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
    maxTransport = Math.max(maxTransport, character.supportTransportDistance);
    if (character.currentSupport?.type === 'DYNAMIC') dynamicSupportFrames += 1;
    b3.b3Body_GetAngularVelocity(angular, cube);
    peakAngularSpeed = Math.max(peakAngularSpeed, Math.hypot(angular[0], angular[1], angular[2]));
  }
  b3.b3Body_GetPosition(cubePos, cube);

  return {
    offsetX,
    variant,
    drift: Math.max(Math.abs(maxX - startX), Math.abs(minX - startX)),
    maxSpeed,
    maxImpulse,
    maxTransport,
    peakAngularSpeed,
    dynamicSupportFrames,
    finalCubeX: cubePos[0],
  };
}

const variants = ['full', 'no-exchange', 'no-transport', 'no-exchange-no-transport'];
const offsets = [0.74, 0.86];
const results = offsets.flatMap((offset) => variants.map((variant) => run(offset, variant)));

console.log('E2.1 A dynamic-edge decomposition (diagnostic monkey patches; production runtime unchanged):');
for (const offset of offsets) {
  const entries = results.filter((r) => r.offsetX === offset);
  console.log(
    `  x=${offset.toFixed(2)}: ${entries.map((r) => `${r.variant} drift=${r.drift.toFixed(2)}m v=${r.maxSpeed.toFixed(2)} impulse=${r.maxImpulse.toFixed(1)}Ns transport=${(r.maxTransport * 100).toFixed(1)}cm/tick ang=${r.peakAngularSpeed.toFixed(2)}rad/s supportF=${r.dynamicSupportFrames}`).join(' | ')}`,
  );
}

const full074 = results.find((r) => r.offsetX === 0.74 && r.variant === 'full');
const noExchange074 = results.find((r) => r.offsetX === 0.74 && r.variant === 'no-exchange');
if (full074.drift < 0.5) throw new Error(`Full A dynamic edge did not reproduce amplification: ${JSON.stringify(full074)}`);
if (noExchange074.maxImpulse > 0.01) throw new Error(`No-exchange diagnostic still reports impulse: ${JSON.stringify(noExchange074)}`);
