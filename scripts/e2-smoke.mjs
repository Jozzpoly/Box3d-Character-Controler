import Box3D from 'box3d.js/inline';
import { SolverOwnedCharacter } from '../src/solver-owned-character.js';

const b3 = await Box3D();
const required = [
  'b3CreateWorld',
  'b3World_Step',
  'b3CreateCapsuleShape',
  'b3ComputeCapsuleMass',
  'b3Body_GetMass',
  'b3Body_ApplyLinearImpulseToCenter',
  'createContactsBuffer',
  'getBodyContactData',
  'getNumContacts',
  'createContact',
  'getContactAt',
  'createManifold',
  'getManifoldAt',
];
for (const name of required) {
  if (typeof b3[name] !== 'function') throw new Error(`Missing E2 Box3D API: ${name}`);
}

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
    if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
    bodyDef.position = [...position];
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

function tick(world, character, intent = {}, preWorld = null) {
  preWorld?.();
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

function settle(world, character, frames = 180) {
  for (let i = 0; i < frames; i++) tick(world, character);
}

// Gate 1: the E2 body is genuinely finite-mass and solver-supported.
const landing = makeWorld();
const character = new SolverOwnedCharacter(b3, landing.world, {
  startPosition: [0, 2.4, 4.5],
  gravity: 20,
  mass: 80,
});
settle(landing.world, character);
if (Math.abs(character.mass - 80) > 0.25) {
  throw new Error(`Solver-owned mass mismatch: ${character.mass.toFixed(3)} kg`);
}
if (character.currentSupport?.type !== 'STATIC') {
  throw new Error(`Solver-owned static support failed: ${character.currentSupport?.type ?? 'NONE'}`);
}
if (Math.abs(character.position[1] - character.halfHeight) > 0.10) {
  throw new Error(`Solver-owned landing height unexpected: y=${character.position[1].toFixed(3)}`);
}

// Gate 2: bounded impulse locomotion must be useful, while release-to-stop is earned by
// ordinary contact/friction rather than an idle velocity servo.
const walkStartZ = character.position[2];
let walkPeakSpeed = 0;
for (let i = 0; i < 75; i++) {
  tick(landing.world, character, { moveForward: 1 });
  walkPeakSpeed = Math.max(walkPeakSpeed, character.telemetry().speed);
}
const walkDz = character.position[2] - walkStartZ;
const releaseStartZ = character.position[2];
let releaseControlImpulse = 0;
for (let i = 0; i < 60; i++) {
  tick(landing.world, character);
  releaseControlImpulse += character.lastControlImpulse;
}
const releaseDz = character.position[2] - releaseStartZ;
const releaseSpeed = character.telemetry().speed;
if (walkDz > -3.0 || walkPeakSpeed < 4.0) {
  throw new Error(`Solver-owned locomotion floor failed: dz=${walkDz.toFixed(2)} speed=${walkPeakSpeed.toFixed(2)}`);
}
if (releaseSpeed > 0.35 || releaseControlImpulse > 0.01) {
  throw new Error(
    `Physical release-to-stop failed: speed=${releaseSpeed.toFixed(3)} releaseDz=${releaseDz.toFixed(3)} control=${releaseControlImpulse.toFixed(3)}Ns`,
  );
}

// Gate 3: a dynamic body must create an immediate physical consequence without the
// no-input controller cancelling it. Decay/recovery may still come from ordinary contact friction.
const ram = makeWorld();
const ramCharacter = new SolverOwnedCharacter(b3, ram.world, {
  startPosition: [0, 0.92, 0],
  gravity: 20,
  mass: 80,
});
const ramBox = ram.box('dynamic', [2.0, 0.60, 0], [0.60, 0.60, 0.60], 35);
settle(ram.world, ramCharacter, 40);
const ramMass = b3.b3Body_GetMass(ramBox);
const ramStartX = ramCharacter.position[0];
b3.b3Body_ApplyLinearImpulse(ramBox, [-ramMass * 6.0, 0, 0], [2.0, 0.60, 0], true);
let ramDynamicContacts = 0;
let ramPeakSolverImpulse = 0;
let ramMinVx = 0;
let ramMinDx = 0;
let ramContactFrame = -1;
let ramSettledFrame = -1;
let ramControlAfterContact = 0;
let consequenceObserved = false;
for (let i = 0; i < 90; i++) {
  tick(ram.world, ramCharacter);
  const dx = ramCharacter.position[0] - ramStartX;
  ramDynamicContacts = Math.max(ramDynamicContacts, ramCharacter.lastDynamicContacts);
  ramPeakSolverImpulse = Math.max(ramPeakSolverImpulse, ramCharacter.lastContactImpulse);
  ramMinVx = Math.min(ramMinVx, ramCharacter.velocity[0]);
  ramMinDx = Math.min(ramMinDx, dx);

  if (ramContactFrame < 0 && ramCharacter.lastDynamicContacts > 0) ramContactFrame = i;
  if (ramContactFrame >= 0) ramControlAfterContact += ramCharacter.lastControlImpulse;
  if (ramCharacter.velocity[0] < -0.10) consequenceObserved = true;
  if (
    consequenceObserved &&
    ramSettledFrame < 0 &&
    i > ramContactFrame &&
    Math.abs(ramCharacter.velocity[0]) < 0.05
  ) {
    ramSettledFrame = i - ramContactFrame;
  }
}
const ramFinalDx = ramCharacter.position[0] - ramStartX;
if (ramDynamicContacts < 1 || ramPeakSolverImpulse <= 0 || ramMinVx > -0.10) {
  throw new Error(
    `Solver-owned immediate perturbation failed: minVx=${ramMinVx.toFixed(3)} minDx=${ramMinDx.toFixed(3)} contacts=${ramDynamicContacts} solverImpulse=${ramPeakSolverImpulse.toFixed(2)}`,
  );
}
if (ramControlAfterContact > 0.01) {
  throw new Error(`No-input controller cancelled external consequence: ${ramControlAfterContact.toFixed(3)}Ns`);
}

// Gate 4: moving support transport must be produced by rigid-body contact/friction.
// No support velocity is injected into the control target and no player position is edited.
const ride = makeWorld();
const platform = ride.box('kinematic', [0, 0.25, 0], [1.5, 0.25, 1.5], 0, 0.92);
const rider = new SolverOwnedCharacter(b3, ride.world, {
  startPosition: [0, 1.42, 0],
  gravity: 20,
  mass: 80,
});
settle(ride.world, rider, 40);
if (rider.currentSupport?.type !== 'KINEMATIC') {
  throw new Error(`Solver-owned kinematic support acquisition failed: ${rider.currentSupport?.type ?? 'NONE'}`);
}
const rideStartX = rider.position[0];
let rideControlImpulse = 0;
for (let i = 0; i < 60; i++) {
  const alpha = (i + 1) / 60;
  tick(ride.world, rider, {}, () =>
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [alpha, 0.25, 0], quaternion: [0, 0, 0, 1] },
      dt,
      true,
    ),
  );
  rideControlImpulse += rider.lastControlImpulse;
}
const rideDx = rider.position[0] - rideStartX;
if (rideDx < 0.55 || rideControlImpulse > 0.01) {
  throw new Error(
    `Natural moving support failed: dx=${rideDx.toFixed(3)} control=${rideControlImpulse.toFixed(3)}Ns`,
  );
}

console.log(
  `E2 authority-ownership smoke PASS: mass=${character.mass.toFixed(2)}kg walkDz=${walkDz.toFixed(2)}m walkPeak=${walkPeakSpeed.toFixed(2)}m/s releaseDz=${releaseDz.toFixed(2)}m releaseSpeed=${releaseSpeed.toFixed(2)}m/s ramMinVx=${ramMinVx.toFixed(2)}m/s ramMinDx=${ramMinDx.toFixed(3)}m ramFinalDx=${ramFinalDx.toFixed(3)}m ramSettle=${ramSettledFrame}f ramControl=${ramControlAfterContact.toFixed(1)}Ns ramContact=${ramPeakSolverImpulse.toFixed(1)}Ns rideDx=${rideDx.toFixed(2)}m rideControl=${rideControlImpulse.toFixed(1)}Ns`,
);