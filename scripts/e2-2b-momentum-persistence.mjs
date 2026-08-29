import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';

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

function xz(v) {
  return Math.hypot(v[0], v[2]);
}

function makeCharacter(setup, startPosition, options = {}) {
  return new ControllerOwnedCharacter(b3, setup.world, {
    startPosition,
    gravity: options.gravity ?? 20,
    virtualMass: 80,
    reciprocityMode: 'causal-components',
    externalGroundDrag: options.externalGroundDrag ?? 2.0,
    externalAirDrag: options.externalAirDrag ?? 0.22,
  });
}

function tick(setup, character, overrides = {}, preWorld = null) {
  preWorld?.();
  character.preStep(dt, intent(overrides));
  b3.b3World_Step(setup.world, dt, 4);
  character.postStep(dt);
}

// -----------------------------------------------------------------------------
// Crucible 1 — isolate contact-generated external momentum in air.
//
// Zero gravity is deliberate: this is not a play fixture. It removes support and
// gravity transitions so the only persistent horizontal state after the ram is
// A-prime's contact-generated externalVelocity. `postContactExtraDrag` is a
// test-local policy applied only after dynamic contact has ended. Production is
// unchanged.
// -----------------------------------------------------------------------------

function airborneRamTrial({ externalAirDrag = 0.22, postContactExtraDrag = 0 }) {
  const setup = makeWorld(0);
  const cube = setup.box('dynamic', [2.0, 0, 0], [0.60, 0.60, 0.60], {
    density: 35,
    friction: 0.8,
    linearDamping: 0.02,
    angularDamping: 0.02,
  });
  const mass = b3.b3Body_GetMass(cube);
  const character = makeCharacter(setup, [0, 0, 0], {
    gravity: 0,
    externalAirDrag,
    externalGroundDrag: 2.0,
  });

  // Give the dynamic body a clean horizontal approach. Character has zero input
  // and zero pre-existing external momentum.
  b3.b3Body_ApplyLinearImpulse(cube, [-mass * 6.0, 0, 0], [2.0, 0, 0], true);

  const frames = [];
  let sawContact = false;
  let lastContactFrame = -1;
  let peakExternal = 0;
  let peakImpulse = 0;

  for (let i = 0; i < 180; i++) {
    tick(setup, character);
    if (character.lastDynamicContacts > 0) {
      sawContact = true;
      lastContactFrame = i;
    } else if (sawContact && postContactExtraDrag > 0) {
      const factor = Math.exp(-postContactExtraDrag * dt);
      character.externalVelocity[0] *= factor;
      character.externalVelocity[2] *= factor;
    }

    peakExternal = Math.max(peakExternal, xz(character.externalVelocity));
    peakImpulse = Math.max(peakImpulse, character.lastContactImpulse);
    frames.push({
      i,
      x: character.position[0],
      z: character.position[2],
      external: xz(character.externalVelocity),
      speed: xz(character.velocity),
      contacts: character.lastDynamicContacts,
    });
  }

  if (!sawContact || lastContactFrame < 0) {
    throw new Error(`E2.2b airborne ram failed to create dynamic contact: airDrag=${externalAirDrag} local=${postContactExtraDrag}`);
  }

  const endIndex = Math.min(lastContactFrame + 1, frames.length - 1);
  const end = frames[endIndex];
  const f15 = frames[Math.min(endIndex + 15, frames.length - 1)];
  const f30 = frames[Math.min(endIndex + 30, frames.length - 1)];
  const f60 = frames[Math.min(endIndex + 60, frames.length - 1)];
  const tailDisp = (frame) => Math.hypot(frame.x - end.x, frame.z - end.z);

  return {
    externalAirDrag,
    postContactExtraDrag,
    lastContactFrame,
    peakExternal,
    peakImpulse,
    externalAtEnd: end.external,
    external15: f15.external,
    external30: f30.external,
    external60: f60.external,
    tail15: tailDisp(f15),
    tail30: tailDisp(f30),
    tail60: tailDisp(f60),
  };
}

// -----------------------------------------------------------------------------
// Crucible 2 — preserve a known-good source of externalVelocity.
//
// A translating kinematic support contributes its point velocity to
// externalVelocity at jump. This is intentionally useful momentum. A global
// air-drag change acts on it too; a source-specific contact policy would not.
// -----------------------------------------------------------------------------

function supportJumpTrial(externalAirDrag) {
  const setup = makeWorld(20);
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8], { friction: 0.9 });
  const platform = setup.box('kinematic', [0, 0.25, 0], [1.8, 0.25, 1.8], { friction: 0.9 });
  const character = makeCharacter(setup, [0, 1.4, 0], { externalAirDrag });

  let platformX = 0;
  const movePlatform = () => {
    platformX += 1.5 * dt;
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [platformX, 0.25, 0], quaternion: [0, 0, 0, 1] },
      dt,
      true,
    );
  };

  for (let i = 0; i < 120; i++) tick(setup, character, {}, movePlatform);
  if (!character.currentSupport) throw new Error(`E2.2b support trial failed to acquire support at drag=${externalAirDrag}`);

  const beforeX = character.position[0];
  const supportV = xz(character._supportPointVelocity(character.currentSupport));
  character.preStep(dt, intent({ jump: true, jumpHeld: true }));
  const jumpExternal = xz(character.externalVelocity);
  const jumpSpeed = xz(character.velocity);
  b3.b3World_Step(setup.world, dt, 4);
  character.postStep(dt);

  const samples = [];
  for (let i = 0; i < 30; i++) {
    tick(setup, character, { jumpHeld: true }, movePlatform);
    samples.push({
      i: i + 1,
      x: character.position[0],
      external: xz(character.externalVelocity),
      speed: xz(character.velocity),
      support: character.currentSupport?.type ?? 'AIR',
    });
  }

  const f15 = samples[14];
  const f30 = samples[29];
  return {
    externalAirDrag,
    supportV,
    jumpExternal,
    jumpSpeed,
    dx15: Math.abs(f15.x - beforeX),
    dx30: Math.abs(f30.x - beforeX),
    external15: f15.external,
    external30: f30.external,
    support15: f15.support,
    support30: f30.support,
  };
}

const globalDrags = [0.22, 1.0, 2.0, 4.0];
const globalRam = globalDrags.map((externalAirDrag) => airborneRamTrial({ externalAirDrag }));
const supportCarry = globalDrags.map((externalAirDrag) => supportJumpTrial(externalAirDrag));
const localContact = [0, 1.0, 2.0, 4.0, 8.0].map((postContactExtraDrag) =>
  airborneRamTrial({ externalAirDrag: 0.22, postContactExtraDrag }),
);

console.log('E2.2b external-momentum persistence localization:');
console.log('  global air-drag sweep — contact tail:');
for (const result of globalRam) {
  console.log(
    `    air=${result.externalAirDrag.toFixed(2)} peakExt=${result.peakExternal.toFixed(2)} peakI=${result.peakImpulse.toFixed(1)}Ns tail=.25s ${result.tail15.toFixed(3)}m/.50s ${result.tail30.toFixed(3)}m/1.0s ${result.tail60.toFixed(3)}m ext=.50s ${result.external30.toFixed(2)}`,
  );
}
console.log('  global air-drag sweep — translating-support jump carry:');
for (const result of supportCarry) {
  console.log(
    `    air=${result.externalAirDrag.toFixed(2)} supportV=${result.supportV.toFixed(2)} jumpExt=${result.jumpExternal.toFixed(2)} dx=.25s ${result.dx15.toFixed(3)}m/.50s ${result.dx30.toFixed(3)}m ext=.50s ${result.external30.toFixed(2)} support=.50s ${result.support30}`,
  );
}
console.log('  test-local post-contact-only damping — contact tail:');
for (const result of localContact) {
  console.log(
    `    extra=${result.postContactExtraDrag.toFixed(2)} peakExt=${result.peakExternal.toFixed(2)} tail=.25s ${result.tail15.toFixed(3)}m/.50s ${result.tail30.toFixed(3)}m/1.0s ${result.tail60.toFixed(3)}m ext=.50s ${result.external30.toFixed(2)}`,
  );
}

const baseRam = globalRam[0];
const baseSupport = supportCarry[0];
const global2 = globalRam.find((entry) => entry.externalAirDrag === 2.0);
const support2 = supportCarry.find((entry) => entry.externalAirDrag === 2.0);
const local2 = localContact.find((entry) => entry.postContactExtraDrag === 2.0);
const local4 = localContact.find((entry) => entry.postContactExtraDrag === 4.0);

if (baseRam.peakExternal < 0.10 || baseRam.peakImpulse < 5) {
  throw new Error(`E2.2b airborne ram did not produce meaningful A-prime consequence: ${JSON.stringify(baseRam)}`);
}
if (baseSupport.supportV < 1.0 || baseSupport.jumpExternal < 1.0 || baseSupport.support30 !== 'AIR') {
  throw new Error(`E2.2b support carry control is not valid: ${JSON.stringify(baseSupport)}`);
}
if (Math.abs(global2.peakExternal - baseRam.peakExternal) > 0.03 || Math.abs(local2.peakExternal - baseRam.peakExternal) > 0.03) {
  throw new Error(`E2.2b damping changed immediate contact consequence instead of only persistence: base=${JSON.stringify(baseRam)} global2=${JSON.stringify(global2)} local2=${JSON.stringify(local2)}`);
}
if (!(global2.tail30 < baseRam.tail30 * 0.82 && support2.dx30 < baseSupport.dx30 * 0.88)) {
  throw new Error(`E2.2b did not reproduce global-damping entanglement: contact base/global2=${baseRam.tail30}/${global2.tail30} support base/global2=${baseSupport.dx30}/${support2.dx30}`);
}
if (!(local2.tail30 < baseRam.tail30 * 0.82 || local4.tail30 < baseRam.tail30 * 0.70)) {
  throw new Error(`E2.2b contact-local policy failed to reduce persistence: base=${baseRam.tail30} local2=${local2.tail30} local4=${local4.tail30}`);
}

console.log(
  `E2.2b verdict: global air damping couples two distinct external-momentum sources; contact-only post-contact damping can reduce the ram tail without requiring support-jump carry to share that decay policy. This localizes a representation/policy boundary; it does not select a feel constant or production fix.`,
);
