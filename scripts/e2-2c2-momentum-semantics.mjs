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
    bodyDef.rotation = [...(options.rotation ?? [0, 0, 0, 1])];
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = options.linearDamping ?? 0.08;
    bodyDef.angularDamping = options.angularDamping ?? 0.10;
    const body = b3.b3CreateBody(world, bodyDef);

    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = options.friction ?? 0.78;
    shapeDef.baseMaterial.restitution = options.restitution ?? 0.03;
    if (type === 'dynamic') shapeDef.density = options.density ?? 42;
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

function horizontal(v) {
  return Math.hypot(v[0], v[2]);
}

function dotXZ(a, b) {
  return a[0] * b[0] + a[2] * b[2];
}

function makeCharacter(setup, startPosition, gravity = 20) {
  return new ControllerOwnedCharacter(b3, setup.world, {
    startPosition,
    gravity,
    virtualMass: 80,
    reciprocityMode: 'causal-components',
  });
}

// Diagnostic-only candidate semantics. Production A-prime writes a dynamic-contact
// reaction into both current velocity and externalVelocity. The candidate leaves the
// physical reaction in current velocity and the rigid body exactly as production does,
// but restores the pre-contact externalVelocity after postStep. This is intentionally
// test-local: it falsifies the state semantics before any runtime implementation change.
function tick(setup, character, semantics = 'aprime', overrides = {}, preWorld = null) {
  preWorld?.();
  character.preStep(dt, intent(overrides));
  const externalBeforePost = [...character.externalVelocity];
  b3.b3World_Step(setup.world, dt, 4);
  character.postStep(dt);

  if (semantics === 'velocity-only-contact' && character.lastDynamicContacts > 0) {
    character.externalVelocity[0] = externalBeforePost[0];
    character.externalVelocity[2] = externalBeforePost[2];
  }
}

function owner1AnchorTrial(semantics) {
  const setup = makeWorld(20);
  setup.box('static', [0, -0.5, 0], [10, 0.5, 10], { friction: 0.78, restitution: 0.03 });

  // Recovered from the Owner-marked owner-1 capture immediately before its first
  // dynamic contact. Only the relevant static floor and body-1 are reconstructed here;
  // this is an empirical anchor, not a claim of full replay equivalence.
  const body = setup.box(
    'dynamic',
    [-0.003587838029488921, 0.6198593378067017, 0.8623996376991272],
    [0.62, 0.62, 0.62],
    {
      density: 42,
      friction: 0.78,
      restitution: 0.03,
      linearDamping: 0.08,
      angularDamping: 0.10,
      rotation: [-7.062492812792698e-8, -0.007878727279603481, -2.6476740799807885e-8, 0.9999690055847168],
    },
  );

  const startPosition = [-0.3988331901690951, 1.4734998316617105, 1.8500304795045481];
  const initialVelocity = [-0.1852537840604782, -3.5533342361450195, -4.444461345672607];
  const initialExternal = [-0.004569879202282509, 0, 0.49020405070806333];
  const character = makeCharacter(setup, startPosition);
  character.velocity = [...initialVelocity];
  character.externalVelocity = [...initialExternal];

  const incomingLength = horizontal(initialVelocity);
  const incomingUnit = [initialVelocity[0] / incomingLength, 0, initialVelocity[2] / incomingLength];
  const bodyLinear = [0, 0, 0];
  const bodyAngular = [0, 0, 0];
  const frames = [];
  let firstContact = -1;
  let firstEpisodeEnd = -1;
  let episodeActive = false;
  let firstImpulse = null;
  let firstBodyLinear = null;
  let firstBodyAngular = null;
  let landingFrame = -1;

  for (let i = 0; i < 120; i++) {
    tick(setup, character, semantics);

    if (character.lastDynamicContacts > 0) {
      if (firstContact < 0) {
        firstContact = i;
        firstImpulse = character.lastContactImpulse;
        b3.b3Body_GetLinearVelocity(bodyLinear, body);
        b3.b3Body_GetAngularVelocity(bodyAngular, body);
        firstBodyLinear = [...bodyLinear];
        firstBodyAngular = [...bodyAngular];
      }
      episodeActive = true;
    } else if (episodeActive && firstEpisodeEnd < 0) {
      firstEpisodeEnd = i - 1;
      episodeActive = false;
    }

    if (landingFrame < 0 && character.justLanded) landingFrame = i;

    const alongIncoming = dotXZ(character.velocity, incomingUnit);
    frames.push({
      i,
      position: [...character.position],
      velocity: [...character.velocity],
      externalVelocity: [...character.externalVelocity],
      speed: horizontal(character.velocity),
      external: horizontal(character.externalVelocity),
      alongIncoming,
      reverseSpeed: Math.max(0, -alongIncoming),
      contacts: character.lastDynamicContacts,
      impulse: character.lastContactImpulse,
      support: character.currentSupport?.type ?? 'AIR',
    });
  }

  if (firstContact < 0) throw new Error(`E2.2c-2 owner anchor failed to contact body-1: ${semantics}`);
  if (firstEpisodeEnd < firstContact) firstEpisodeEnd = frames.length - 1;

  const episodeEnd = frames[firstEpisodeEnd];
  const sample = (offset) => frames[Math.min(firstEpisodeEnd + offset, frames.length - 1)];
  const f6 = sample(6);
  const f15 = sample(15);
  const f30 = sample(30);
  const displacement = (frame) => Math.hypot(
    frame.position[0] - episodeEnd.position[0],
    frame.position[2] - episodeEnd.position[2],
  );
  const postFrames = frames.slice(firstEpisodeEnd + 1);
  const peakReverse = postFrames.reduce((max, frame) => Math.max(max, frame.reverseSpeed), 0);
  const peakExternal = frames.slice(firstContact).reduce((max, frame) => Math.max(max, frame.external), 0);

  return {
    semantics,
    firstContact,
    firstEpisodeEnd,
    contactFrames: firstEpisodeEnd - firstContact + 1,
    landingFrame,
    firstImpulse,
    firstBodyLinear,
    firstBodyAngular,
    endVelocity: episodeEnd.velocity,
    endExternal: episodeEnd.externalVelocity,
    velocity6: f6.velocity,
    external6: f6.externalVelocity,
    tail15: displacement(f15),
    tail30: displacement(f30),
    peakReverse,
    peakExternal,
    finalVelocity: frames.at(-1).velocity,
    finalExternal: frames.at(-1).externalVelocity,
  };
}

function supportCarryTrial(semantics) {
  const setup = makeWorld(20);
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8], { friction: 0.9, restitution: 0 });
  const platform = setup.box('kinematic', [0, 0.25, 0], [1.8, 0.25, 1.8], { friction: 0.9, restitution: 0 });
  const character = makeCharacter(setup, [0, 1.4, 0]);

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

  for (let i = 0; i < 120; i++) tick(setup, character, semantics, {}, movePlatform);
  if (!character.currentSupport) throw new Error(`E2.2c-2 support control failed: ${semantics}`);

  const beforeX = character.position[0];
  tick(setup, character, semantics, { jump: true, jumpHeld: true }, movePlatform);
  const jumpExternal = horizontal(character.externalVelocity);

  for (let i = 0; i < 30; i++) tick(setup, character, semantics, { jumpHeld: true }, movePlatform);

  return {
    semantics,
    jumpExternal,
    dx30: Math.abs(character.position[0] - beforeX),
    external30: horizontal(character.externalVelocity),
    speed30: horizontal(character.velocity),
    support30: character.currentSupport?.type ?? 'AIR',
  };
}

const baseline = owner1AnchorTrial('aprime');
const velocityOnly = owner1AnchorTrial('velocity-only-contact');
const baselineSupport = supportCarryTrial('aprime');
const velocityOnlySupport = supportCarryTrial('velocity-only-contact');

function fmt3(v) {
  return `(${v[0].toFixed(3)}, ${v[2].toFixed(3)})`;
}

console.log('E2.2c-2 contact-momentum semantics falsifier:');
for (const result of [baseline, velocityOnly]) {
  console.log(
    `  owner-1 anchor ${result.semantics}: contact=${result.firstContact}-${result.firstEpisodeEnd} (${result.contactFrames}f) landing=${result.landingFrame} firstI=${result.firstImpulse.toFixed(2)}Ns endV=${fmt3(result.endVelocity)} endExt=${fmt3(result.endExternal)} +.10sV=${fmt3(result.velocity6)} +.10sExt=${fmt3(result.external6)} tail=.25 ${result.tail15.toFixed(3)}m/.50 ${result.tail30.toFixed(3)}m peakReverse=${result.peakReverse.toFixed(3)}m/s peakExt=${result.peakExternal.toFixed(3)}m/s`,
  );
}
console.log('  translating-support control:');
for (const result of [baselineSupport, velocityOnlySupport]) {
  console.log(
    `    ${result.semantics}: jumpExt=${result.jumpExternal.toFixed(3)} dx=.50 ${result.dx30.toFixed(3)}m ext=.50 ${result.external30.toFixed(3)} v=.50 ${result.speed30.toFixed(3)} support=${result.support30}`,
  );
}

// Gate 1: the candidate must not alter the first physical collision. Before the
// first contact both variants are byte-for-byte the same; restoring contact memory
// happens only after production postStep has already applied the reaction to both
// bodies.
if (baseline.firstContact !== velocityOnly.firstContact) {
  throw new Error(`E2.2c-2 candidate changed first-contact timing: baseline=${baseline.firstContact} candidate=${velocityOnly.firstContact}`);
}
if (Math.abs(baseline.firstImpulse - velocityOnly.firstImpulse) > 1e-8) {
  throw new Error(`E2.2c-2 candidate changed first-contact impulse: baseline=${baseline.firstImpulse} candidate=${velocityOnly.firstImpulse}`);
}
for (let i = 0; i < 3; i++) {
  if (Math.abs(baseline.firstBodyLinear[i] - velocityOnly.firstBodyLinear[i]) > 1e-8) {
    throw new Error(`E2.2c-2 candidate changed body linear response on first contact`);
  }
  if (Math.abs(baseline.firstBodyAngular[i] - velocityOnly.firstBodyAngular[i]) > 1e-8) {
    throw new Error(`E2.2c-2 candidate changed body angular response on first contact`);
  }
}

// Gate 2: moving-support inheritance must remain exactly unchanged. This candidate
// targets dynamic-contact memory only; kinematic support launch semantics are outside
// the falsifier and must not be accidentally conflated.
for (const key of ['jumpExternal', 'dx30', 'external30', 'speed30']) {
  if (Math.abs(baselineSupport[key] - velocityOnlySupport[key]) > 1e-8) {
    throw new Error(`E2.2c-2 candidate changed support carry ${key}: baseline=${baselineSupport[key]} candidate=${velocityOnlySupport[key]}`);
  }
}
if (baselineSupport.support30 !== velocityOnlySupport.support30) {
  throw new Error('E2.2c-2 candidate changed support state in support-carry control');
}

console.log('  invariant gates: first collision IDENTICAL; support inheritance IDENTICAL');
console.log('  diagnostic verdict intentionally depends on measured direction/tail output above; no production behavior changed.');
