import Box3D from 'box3d.js/inline';
import { SolverOwnedCharacter } from '../src/solver-owned-character.js';

const b3 = await Box3D();
const dt = 1 / 60;
const forward = [0, 0, -1];
const right = [1, 0, 0];

function makeWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  function box(type, position, half, density = 30, friction = 0.82) {
    const bodyDef = b3.b3DefaultBodyDef();
    if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [...position];
    bodyDef.enableSleep = false;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = friction;
    shapeDef.baseMaterial.restitution = 0;
    if (type === 'dynamic') shapeDef.density = density;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  box('static', [0, -0.5, 0], [10, 0.5, 10]);
  return { world, box };
}

function tick(world, character, intent = {}) {
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

function settle(world, character, frames = 80) {
  for (let i = 0; i < frames; i++) tick(world, character);
}

// Free-play floor A: ordinary jump must launch, form a useful arc and return to support.
const jumpWorld = makeWorld();
const jumper = new SolverOwnedCharacter(b3, jumpWorld.world, {
  startPosition: [0, 0.92, 2],
  mass: 80,
});
settle(jumpWorld.world, jumper, 40);
const standingY = jumper.position[1];
let apexY = standingY;
for (let i = 0; i < 120; i++) {
  tick(jumpWorld.world, jumper, {
    jump: i === 0,
    jumpHeld: i < 28,
  });
  apexY = Math.max(apexY, jumper.position[1]);
}
const jumpRise = apexY - standingY;
if (jumpRise < 0.85 || jumper.currentSupport?.type !== 'STATIC') {
  throw new Error(
    `E2 jump floor failed: rise=${jumpRise.toFixed(2)}m support=${jumper.currentSupport?.type ?? 'NONE'}`,
  );
}

// Free-play floor B: walking into ordinary dynamic matter must push it through native solver contact.
const pushWorld = makeWorld();
const pusher = new SolverOwnedCharacter(b3, pushWorld.world, {
  startPosition: [0, 0.92, 3],
  mass: 80,
});
const pushedBox = pushWorld.box('dynamic', [0, 0.50, 0], [0.50, 0.50, 0.50], 22, 0.72);
settle(pushWorld.world, pusher, 40);
const boxPosition = [0, 0, 0];
b3.b3Body_GetPosition(boxPosition, pushedBox);
const boxStartZ = boxPosition[2];
let contactSeen = 0;
for (let i = 0; i < 110; i++) {
  tick(pushWorld.world, pusher, { moveForward: 1 });
  contactSeen = Math.max(contactSeen, pusher.lastDynamicContacts);
}
b3.b3Body_GetPosition(boxPosition, pushedBox);
const boxPushDz = boxPosition[2] - boxStartZ;
if (boxPushDz > -0.45 || contactSeen < 1) {
  throw new Error(`E2 natural push failed: boxDz=${boxPushDz.toFixed(2)}m contacts=${contactSeen}`);
}

// Free-play floor C: a finite-mass body can genuinely be the player's support.
const supportWorld = makeWorld();
const dynamicSlab = supportWorld.box('dynamic', [0, 0.25, 0], [1.5, 0.25, 1.5], 100, 0.82);
const supported = new SolverOwnedCharacter(b3, supportWorld.world, {
  startPosition: [0, 1.42, 0],
  mass: 80,
});
settle(supportWorld.world, supported, 100);
const slabMass = b3.b3Body_GetMass(dynamicSlab);
if (supported.currentSupport?.type !== 'DYNAMIC') {
  throw new Error(`E2 dynamic support failed: ${supported.currentSupport?.type ?? 'NONE'}`);
}

console.log(
  `E2 playability smoke PASS: jump=${jumpRise.toFixed(2)}m pushDz=${boxPushDz.toFixed(2)}m dynamicSupport=${slabMass.toFixed(1)}kg`,
);