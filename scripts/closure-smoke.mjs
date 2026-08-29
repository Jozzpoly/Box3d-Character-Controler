import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';

const b3 = await Box3D();
const dt = 1 / 60;
const forward = [0, 0, -1];
const right = [1, 0, 0];

function makeWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  return b3.b3CreateWorld(worldDef);
}

function box(world, type, position, half, density = 30) {
  const bodyDef = b3.b3DefaultBodyDef();
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.8;
  if (type === 'dynamic') shapeDef.density = density;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function harness(world, startPosition) {
  const character = new ControllerOwnedCharacter(b3, world, {
    startPosition,
    gravity: 20,
    virtualMass: 80,
  });

  function tick(intent = {}) {
    character.preStep(dt, {
      forward,
      right,
      moveForward: 0,
      moveRight: 0,
      jump: false,
      jumpHeld: false,
      sprint: false,
      ...intent,
    });
    b3.b3World_Step(world, dt, 4);
    character.postStep(dt);
  }

  function settle(frames = 180) {
    for (let i = 0; i < frames; i++) tick();
  }

  return { character, tick, settle };
}

function isolatedPushGate() {
  const world = makeWorld();
  try {
    box(world, 'static', [0, -0.5, 0], [8, 0.5, 8]);
    const dynamicBox = box(world, 'dynamic', [0, 0.6, -0.3], [0.6, 0.6, 0.6], 35);
    const { character, tick, settle } = harness(world, [0, 2.2, 2.8]);

    settle();
    character.reset([0, character.halfHeight + 0.02, 2.8]);
    settle(20);

    let peakImpulse = 0;
    for (let i = 0; i < 120; i++) {
      tick({ moveForward: 1 });
      peakImpulse = Math.max(peakImpulse, character.lastContactImpulse);
    }

    const position = [0, 0, 0];
    b3.b3Body_GetPosition(position, dynamicBox);
    if (position[2] > -0.55 || peakImpulse < 140) {
      throw new Error(
        `Isolated natural-push regression: boxZ=${position[2].toFixed(3)} impulse=${peakImpulse.toFixed(1)}Ns`,
      );
    }
    return { peakImpulse, boxZ: position[2] };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

function stairDescentSupportGate() {
  const world = makeWorld();
  try {
    box(world, 'static', [0, -0.5, 0], [8, 0.5, 8]);
    for (let i = 0; i < 4; i++) {
      const top = 0.22 * (i + 1);
      box(world, 'static', [-5, top * 0.5, 5.0 - i * 0.9], [0.7, top * 0.5, 0.45]);
    }

    const { character, tick, settle } = harness(
      world,
      [-5, 0.9 + 0.88 + 0.02, 2.40],
    );
    settle(20);
    if (character.currentSupport?.type !== 'STATIC') {
      throw new Error(`Highest tread support setup failed: ${character.currentSupport?.type ?? 'NONE'}`);
    }

    let peakVertical = 0;
    for (let i = 0; i < 140; i++) {
      tick({ moveForward: -1 });
      peakVertical = Math.max(peakVertical, Math.abs(character.velocity[1]));
      if (
        character.position[2] > 5.85 &&
        character.position[1] < character.halfHeight + 0.12 &&
        character.currentSupport?.type === 'STATIC'
      ) {
        break;
      }
    }

    if (
      character.position[2] <= 5.70 ||
      character.position[1] > character.halfHeight + 0.12 ||
      character.currentSupport?.type !== 'STATIC'
    ) {
      throw new Error(
        `Stair descent did not recover static support: y=${character.position[1].toFixed(3)} z=${character.position[2].toFixed(3)} support=${character.currentSupport?.type ?? 'NONE'} peakV=${peakVertical.toFixed(3)}`,
      );
    }
    return { peakVertical, z: character.position[2] };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

const push = isolatedPushGate();
const descent = stairDescentSupportGate();
console.log(
  `Foundation 02.1 closure PASS: isolatedPush=${push.peakImpulse.toFixed(1)}Ns boxZ=${push.boxZ.toFixed(2)} stairsDownV=${descent.peakVertical.toFixed(2)}m/s support=STATIC`,
);
