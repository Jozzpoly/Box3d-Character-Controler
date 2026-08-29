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
  'b3Body_GetWorldPointVelocity',
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

// Gate 2: bounded impulse control must be usable without velocity overwrites.
const walkStartZ = character.position[2];
let walkPeakSpeed = 0;
for (let i = 0; i < 75; i++) {
  tick(landing.world, character, { moveForward: 1 });
  walkPeakSpeed = Math.max(walkPeakSpeed, character.telemetry().speed);
}
const walkDz = character.position[2] - walkStartZ;
if (walkDz > -3.0 || walkPeakSpeed < 4.0) {
  throw new Error(`Solver-owned locomotion floor failed: dz=${walkDz.toFixed(2)} speed=${walkPeakSpeed.toFixed(2)}`);
}

// Gate 3: a dynamic body can perturb the player through the solver contact network.
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
for (let i = 0; i < 90; i++) {
  tick(ram.world, ramCharacter);
  ramDynamicContacts = Math.max(ramDynamicContacts, ramCharacter.lastDynamicContacts);
  ramPeakSolverImpulse = Math.max(ramPeakSolverImpulse, ramCharacter.lastContactImpulse);
}
const ramDx = ramCharacter.position[0] - ramStartX;
if (ramDx > -0.12 || ramDynamicContacts < 1 || ramPeakSolverImpulse <= 0) {
  throw new Error(
    `Solver-owned reverse perturbation failed: dx=${ramDx.toFixed(3)} contacts=${ramDynamicContacts} solverImpulse=${ramPeakSolverImpulse.toFixed(2)}`,
  );
}

// Gate 4: moving support transport is produced by rigid-body contact/friction.
// The controller only targets velocity relative to the support; it never edits player position.
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
}
const rideDx = rider.position[0] - rideStartX;
if (rideDx < 0.55) {
  throw new Error(`Solver-owned moving support failed: dx=${rideDx.toFixed(3)}`);
}

console.log(
  `E2 authority-ownership smoke PASS: mass=${character.mass.toFixed(2)}kg walkDz=${walkDz.toFixed(2)}m walkPeak=${walkPeakSpeed.toFixed(2)}m/s ramDx=${ramDx.toFixed(2)}m ramContact=${ramPeakSolverImpulse.toFixed(1)}Ns rideDx=${rideDx.toFixed(2)}m`,
);
