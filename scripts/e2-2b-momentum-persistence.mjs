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
    airDeceleration: options.airDeceleration ?? 1.2,
  });
}

function tick(setup, character, overrides = {}, preWorld = null) {
  preWorld?.();
  character.preStep(dt, intent(overrides));
  b3.b3World_Step(setup.world, dt, 4);
  character.postStep(dt);
}

// -----------------------------------------------------------------------------
// Crucible 1 — isolate post-contact horizontal persistence in air.
//
// Zero gravity is deliberate: this is a causal isolate, not a play fixture. The
// dynamic cube is kicked away immediately after the first detected contact so a
// real post-contact interval exists. Test-local extra damping can then target
// externalVelocity, velocity, or both without changing production behavior.
// -----------------------------------------------------------------------------

function airborneRamTrial({
  externalAirDrag = 0.22,
  airDeceleration = 1.2,
  postContactExternalDrag = 0,
  postContactVelocityDrag = 0,
}) {
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
    airDeceleration,
  });

  b3.b3Body_ApplyLinearImpulse(cube, [-mass * 6.0, 0, 0], [2.0, 0, 0], true);

  const frames = [];
  const cubeCenter = [0, 0, 0];
  let sawContact = false;
  let separatedCube = false;
  let lastContactFrame = -1;
  let peakExternal = 0;
  let peakSpeed = 0;
  let peakImpulse = 0;

  for (let i = 0; i < 180; i++) {
    tick(setup, character);

    if (character.lastDynamicContacts > 0) {
      sawContact = true;
      lastContactFrame = i;
      if (!separatedCube) {
        // Force the donor body out of the fixture after the first measured
        // collision. This impulse is applied to the cube only, after A-prime has
        // already recorded the contact reaction for this tick.
        b3.b3Body_GetWorldCenterOfMass(cubeCenter, cube);
        b3.b3Body_ApplyLinearImpulse(cube, [mass * 16.0, 0, 0], cubeCenter, true);
        separatedCube = true;
      }
    } else if (sawContact) {
      if (postContactExternalDrag > 0) {
        const factor = Math.exp(-postContactExternalDrag * dt);
        character.externalVelocity[0] *= factor;
        character.externalVelocity[2] *= factor;
      }
      if (postContactVelocityDrag > 0) {
        const factor = Math.exp(-postContactVelocityDrag * dt);
        character.velocity[0] *= factor;
        character.velocity[2] *= factor;
      }
    }

    peakExternal = Math.max(peakExternal, xz(character.externalVelocity));
    peakSpeed = Math.max(peakSpeed, xz(character.velocity));
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
    throw new Error(`E2.2b airborne ram failed to create dynamic contact: air=${externalAirDrag} decel=${airDeceleration}`);
  }
  if (lastContactFrame > 90) {
    throw new Error(`E2.2b airborne ram failed to establish a bounded post-contact interval: lastContact=${lastContactFrame}`);
  }

  const endIndex = Math.min(lastContactFrame + 1, frames.length - 1);
  const end = frames[endIndex];
  const sample = (offset) => frames[Math.min(endIndex + offset, frames.length - 1)];
  const f15 = sample(15);
  const f30 = sample(30);
  const f60 = sample(60);
  const tailDisp = (frame) => Math.hypot(frame.x - end.x, frame.z - end.z);

  return {
    externalAirDrag,
    airDeceleration,
    postContactExternalDrag,
    postContactVelocityDrag,
    lastContactFrame,
    peakExternal,
    peakSpeed,
    peakImpulse,
    externalAtEnd: end.external,
    speedAtEnd: end.speed,
    external15: f15.external,
    external30: f30.external,
    external60: f60.external,
    speed15: f15.speed,
    speed30: f30.speed,
    speed60: f60.speed,
    tail15: tailDisp(f15),
    tail30: tailDisp(f30),
    tail60: tailDisp(f60),
  };
}

// -----------------------------------------------------------------------------
// Crucible 2 — known-good support momentum uses the same externalVelocity.
// -----------------------------------------------------------------------------

function supportJumpTrial({ externalAirDrag = 0.22, airDeceleration = 1.2 }) {
  const setup = makeWorld(20);
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8], { friction: 0.9 });
  const platform = setup.box('kinematic', [0, 0.25, 0], [1.8, 0.25, 1.8], { friction: 0.9 });
  const character = makeCharacter(setup, [0, 1.4, 0], { externalAirDrag, airDeceleration });

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
  if (!character.currentSupport) {
    throw new Error(`E2.2b support trial failed to acquire support: air=${externalAirDrag} decel=${airDeceleration}`);
  }

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
    airDeceleration,
    supportV,
    jumpExternal,
    jumpSpeed,
    dx15: Math.abs(f15.x - beforeX),
    dx30: Math.abs(f30.x - beforeX),
    external15: f15.external,
    external30: f30.external,
    speed15: f15.speed,
    speed30: f30.speed,
    support30: f30.support,
  };
}

const globalPolicies = [
  { name: 'baseline', externalAirDrag: 0.22, airDeceleration: 1.2 },
  { name: 'air-drag-2', externalAirDrag: 2.0, airDeceleration: 1.2 },
  { name: 'air-decel-4', externalAirDrag: 0.22, airDeceleration: 4.0 },
  { name: 'both', externalAirDrag: 2.0, airDeceleration: 4.0 },
];

const globalRam = globalPolicies.map((policy) => ({
  name: policy.name,
  ...airborneRamTrial(policy),
}));
const supportCarry = globalPolicies.map((policy) => ({
  name: policy.name,
  ...supportJumpTrial(policy),
}));
const localPolicies = [
  { name: 'none', postContactExternalDrag: 0, postContactVelocityDrag: 0 },
  { name: 'external-only', postContactExternalDrag: 4.0, postContactVelocityDrag: 0 },
  { name: 'velocity-only', postContactExternalDrag: 0, postContactVelocityDrag: 4.0 },
  { name: 'both', postContactExternalDrag: 4.0, postContactVelocityDrag: 4.0 },
];
const localRam = localPolicies.map((policy) => ({
  name: policy.name,
  ...airborneRamTrial({
    externalAirDrag: 0.22,
    airDeceleration: 1.2,
    ...policy,
  }),
}));

console.log('E2.2b external-momentum persistence localization:');
console.log('  global policy sweep — airborne contact tail:');
for (const result of globalRam) {
  console.log(
    `    ${result.name}: peakExt=${result.peakExternal.toFixed(2)} peakV=${result.peakSpeed.toFixed(2)} I=${result.peakImpulse.toFixed(1)}Ns tail=.25 ${result.tail15.toFixed(3)}m/.50 ${result.tail30.toFixed(3)}m/1.0 ${result.tail60.toFixed(3)}m ext=.50 ${result.external30.toFixed(2)} v=.50 ${result.speed30.toFixed(2)}`,
  );
}
console.log('  same global policies — translating-support jump carry:');
for (const result of supportCarry) {
  console.log(
    `    ${result.name}: supportV=${result.supportV.toFixed(2)} jumpExt=${result.jumpExternal.toFixed(2)} dx=.25 ${result.dx15.toFixed(3)}m/.50 ${result.dx30.toFixed(3)}m ext=.50 ${result.external30.toFixed(2)} v=.50 ${result.speed30.toFixed(2)} support=.50 ${result.support30}`,
  );
}
console.log('  test-local post-contact channel probes:');
for (const result of localRam) {
  console.log(
    `    ${result.name}: peakExt=${result.peakExternal.toFixed(2)} peakV=${result.peakSpeed.toFixed(2)} tail=.25 ${result.tail15.toFixed(3)}m/.50 ${result.tail30.toFixed(3)}m/1.0 ${result.tail60.toFixed(3)}m ext=.50 ${result.external30.toFixed(2)} v=.50 ${result.speed30.toFixed(2)}`,
  );
}

const baseRam = globalRam.find((entry) => entry.name === 'baseline');
const dragRam = globalRam.find((entry) => entry.name === 'air-drag-2');
const decelRam = globalRam.find((entry) => entry.name === 'air-decel-4');
const bothRam = globalRam.find((entry) => entry.name === 'both');
const baseSupport = supportCarry.find((entry) => entry.name === 'baseline');
const dragSupport = supportCarry.find((entry) => entry.name === 'air-drag-2');
const bothSupport = supportCarry.find((entry) => entry.name === 'both');
const localExternal = localRam.find((entry) => entry.name === 'external-only');
const localVelocity = localRam.find((entry) => entry.name === 'velocity-only');
const localBoth = localRam.find((entry) => entry.name === 'both');

if (baseRam.peakExternal < 0.10 || baseRam.peakSpeed < 0.10 || baseRam.peakImpulse < 5 || baseRam.tail30 < 0.05) {
  throw new Error(`E2.2b airborne ram is not a useful persistence fixture: ${JSON.stringify(baseRam)}`);
}
if (baseSupport.supportV < 1.0 || baseSupport.jumpExternal < 1.0 || baseSupport.support30 !== 'AIR') {
  throw new Error(`E2.2b support carry control is not valid: ${JSON.stringify(baseSupport)}`);
}
for (const candidate of [dragRam, decelRam, bothRam, localExternal, localVelocity, localBoth]) {
  if (Math.abs(candidate.peakExternal - baseRam.peakExternal) > 0.04 || Math.abs(candidate.peakSpeed - baseRam.peakSpeed) > 0.04) {
    throw new Error(`E2.2b persistence probe changed the immediate collision instead of only its tail: base=${JSON.stringify(baseRam)} candidate=${JSON.stringify(candidate)}`);
  }
}

const ratio = (value, base) => (base > 1e-9 ? value / base : 1);
const globalContactRatio = ratio(bothRam.tail30, baseRam.tail30);
const globalSupportRatio = ratio(bothSupport.dx30, baseSupport.dx30);
const dragContactRatio = ratio(dragRam.tail30, baseRam.tail30);
const dragSupportRatio = ratio(dragSupport.dx30, baseSupport.dx30);
const localExternalRatio = ratio(localExternal.tail30, baseRam.tail30);
const localVelocityRatio = ratio(localVelocity.tail30, baseRam.tail30);
const localBothRatio = ratio(localBoth.tail30, baseRam.tail30);

console.log(
  `E2.2b ratios @0.50s: global-drag contact=${dragContactRatio.toFixed(2)} support=${dragSupportRatio.toFixed(2)} | global-both contact=${globalContactRatio.toFixed(2)} support=${globalSupportRatio.toFixed(2)} | local external=${localExternalRatio.toFixed(2)} velocity=${localVelocityRatio.toFixed(2)} both=${localBothRatio.toFixed(2)}`,
);

if (localBothRatio < Math.min(localExternalRatio, localVelocityRatio) * 0.90) {
  console.log('E2.2b channel verdict: post-contact persistence is materially co-owned by velocity + externalVelocity; damping only one leaves the other as a tail source.');
} else if (localExternalRatio < localVelocityRatio * 0.85) {
  console.log('E2.2b channel verdict: externalVelocity is the dominant post-contact persistence source in this isolate.');
} else if (localVelocityRatio < localExternalRatio * 0.85) {
  console.log('E2.2b channel verdict: velocity is the dominant post-contact persistence source in this isolate.');
} else {
  console.log('E2.2b channel verdict: the two persistence channels are not cleanly separable by this isolate; no production policy is justified yet.');
}

if (globalSupportRatio < 0.90 && globalContactRatio < 0.90) {
  console.log('E2.2b source verdict: stronger global airborne recovery reduces contact persistence but also materially changes valid moving-support jump carry; a single global decay policy is therefore causally entangled.');
} else {
  console.log('E2.2b source verdict: this fixture does not yet prove that global recovery and support carry require distinct source policies.');
}

console.log('E2.2b remains diagnostic only: no feel constant, source model, or production fix is selected by this script.');
