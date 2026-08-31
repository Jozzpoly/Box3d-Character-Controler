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

function makeWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
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
    if (type === 'dynamic') shapeDef.density = options.density ?? 42;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  box('static', [0, -0.5, 0], [10, 0.5, 10], { friction: 0.9 });
  return { world, box };
}

function input() {
  return {
    forward,
    right,
    moveForward: 0,
    moveRight: 0,
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function horizontal(v) {
  return Math.hypot(v[0], v[2]);
}

function makeCharacter(setup, startPosition) {
  return new ControllerOwnedCharacter(b3, setup.world, {
    startPosition,
    gravity: 20,
    virtualMass: 80,
    reciprocityMode: 'causal-components',
  });
}

function runTrial(spec) {
  const setup = makeWorld();
  const body = setup.box('dynamic', spec.bodyPosition, spec.bodyHalf, {
    density: spec.density ?? 42,
    friction: spec.friction ?? 0.78,
    linearDamping: spec.linearDamping ?? 0.08,
    angularDamping: spec.angularDamping ?? 0.10,
  });
  const character = makeCharacter(setup, spec.characterStart);
  character.velocity[0] = spec.initialVelocity?.[0] ?? 0;
  character.velocity[1] = spec.initialVelocity?.[1] ?? 0;
  character.velocity[2] = spec.initialVelocity?.[2] ?? 0;

  if (spec.bodyVelocity) {
    const mass = b3.b3Body_GetMass(body);
    const center = [0, 0, 0];
    b3.b3Body_GetWorldCenterOfMass(center, body);
    b3.b3Body_ApplyLinearImpulse(
      body,
      [mass * spec.bodyVelocity[0], mass * spec.bodyVelocity[1], mass * spec.bodyVelocity[2]],
      center,
      true,
    );
  }

  const frames = [];
  const angular = [0, 0, 0];
  let firstContact = -1;
  let firstEpisodeEnd = -1;
  let firstEpisodeFrames = 0;
  let episodeActive = false;
  let firstRecontact = -1;

  for (let i = 0; i < 180; i++) {
    character.preStep(dt, input());
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);

    const contacts = character.lastDynamicContacts;
    if (contacts > 0) {
      if (firstContact < 0) {
        firstContact = i;
        episodeActive = true;
      }
      if (episodeActive) firstEpisodeFrames += 1;
      else if (firstEpisodeEnd >= 0 && firstRecontact < 0) firstRecontact = i;
    } else if (episodeActive) {
      firstEpisodeEnd = i - 1;
      episodeActive = false;
    }

    b3.b3Body_GetAngularVelocity(angular, body);
    frames.push({
      i,
      x: character.position[0],
      y: character.position[1],
      z: character.position[2],
      speed: horizontal(character.velocity),
      external: horizontal(character.externalVelocity),
      contacts,
      support: character.currentSupport?.type ?? 'AIR',
      impulse: character.lastContactImpulse,
      angular: Math.hypot(angular[0], angular[1], angular[2]),
    });
  }

  if (episodeActive) firstEpisodeEnd = frames.length - 1;

  const episodeFrames = firstContact >= 0 && firstEpisodeEnd >= firstContact
    ? frames.slice(firstContact, firstEpisodeEnd + 1)
    : [];
  const maxOf = (key) => episodeFrames.reduce((max, frame) => Math.max(max, frame[key]), 0);
  const peakImpulse = maxOf('impulse');
  const peakSpeed = maxOf('speed');
  const peakExternal = maxOf('external');
  const peakAngular = episodeFrames.reduce((max, frame) => Math.max(max, frame.angular), 0);

  const uncontaminatedSample = (offset) => {
    if (firstEpisodeEnd < 0) return null;
    const index = firstEpisodeEnd + offset;
    if (index >= frames.length) return null;
    if (firstRecontact >= 0 && firstRecontact <= index) return null;
    return frames[index];
  };

  const end = firstEpisodeEnd >= 0 ? frames[firstEpisodeEnd] : null;
  const f15 = uncontaminatedSample(15);
  const f30 = uncontaminatedSample(30);
  const displacement = (frame) => end && frame ? Math.hypot(frame.x - end.x, frame.z - end.z) : null;

  return {
    name: spec.name,
    firstContact,
    firstEpisodeEnd,
    firstEpisodeFrames,
    firstRecontact,
    peakImpulse,
    peakSpeed,
    peakExternal,
    peakAngular,
    tail15: displacement(f15),
    tail30: displacement(f30),
    speed15: f15?.speed ?? null,
    speed30: f30?.speed ?? null,
    ext15: f15?.external ?? null,
    ext30: f30?.external ?? null,
    support15: f15?.support ?? null,
    support30: f30?.support ?? null,
  };
}

// Bounded normal-gravity candidates. These are not fixes and do not force
// separation after contact. The goal is only to find one deterministic specimen
// in the same broad family as Owner-observed post-bounce slide.
const specs = [
  {
    name: 'edge-glance-slow',
    bodyPosition: [0, 0.62, 0],
    bodyHalf: [0.62, 0.62, 0.62],
    characterStart: [0.70, 3.55, 0],
    initialVelocity: [0.35, 0, 0],
  },
  {
    name: 'edge-glance-medium',
    bodyPosition: [0, 0.62, 0],
    bodyHalf: [0.62, 0.62, 0.62],
    characterStart: [0.66, 3.55, 0],
    initialVelocity: [0.75, 0, 0],
  },
  {
    name: 'player-arc-edge',
    bodyPosition: [0, 0.62, 0],
    bodyHalf: [0.62, 0.62, 0.62],
    characterStart: [-0.62, 3.55, 0],
    initialVelocity: [3.2, 0, 0],
  },
  {
    name: 'player-arc-edge-fast',
    bodyPosition: [0, 0.62, 0],
    bodyHalf: [0.62, 0.62, 0.62],
    characterStart: [-0.78, 3.55, 0],
    initialVelocity: [4.0, 0, 0],
  },
  {
    name: 'airborne-side-ram',
    bodyPosition: [2.2, 5.0, 0],
    bodyHalf: [0.55, 0.55, 0.55],
    characterStart: [0, 5.0, 0],
    initialVelocity: [0, 0, 0],
    bodyVelocity: [-5.5, 0, 0],
    density: 35,
    linearDamping: 0.02,
    angularDamping: 0.02,
  },
];

const repeats = 3;
const groups = specs.map((spec) => Array.from({ length: repeats }, () => runTrial(spec)));

console.log('E2.2c-0 residual-slide reproduction probe (production A-prime, normal gravity, no forced separation):');
for (const runs of groups) {
  for (let r = 0; r < runs.length; r++) {
    const x = runs[r];
    const fmt = (value) => value == null ? 'n/a' : value.toFixed(3);
    console.log(
      `  ${x.name} #${r + 1}: episode=${x.firstContact}-${x.firstEpisodeEnd} frames=${x.firstEpisodeFrames} recontact=${x.firstRecontact} I=${x.peakImpulse.toFixed(1)}Ns peakV=${x.peakSpeed.toFixed(2)} peakExt=${x.peakExternal.toFixed(2)} ang=${x.peakAngular.toFixed(2)} tail=.25 ${fmt(x.tail15)}m/.50 ${fmt(x.tail30)}m v=.25 ${fmt(x.speed15)}/.50 ${fmt(x.speed30)} ext=.25 ${fmt(x.ext15)}/.50 ${fmt(x.ext30)} support=.25 ${x.support15 ?? 'n/a'}/.50 ${x.support30 ?? 'n/a'}`,
    );
  }
}

function stable(a, b) {
  const numericKeys = [
    'firstContact', 'firstEpisodeEnd', 'firstEpisodeFrames', 'firstRecontact',
    'peakImpulse', 'peakSpeed', 'peakExternal', 'peakAngular',
    'tail15', 'tail30', 'speed15', 'speed30', 'ext15', 'ext30',
  ];
  for (const key of numericKeys) {
    if (a[key] == null || b[key] == null) {
      if (a[key] !== b[key]) return false;
      continue;
    }
    if (Math.abs(a[key] - b[key]) > 1e-6) return false;
  }
  return a.support15 === b.support15 && a.support30 === b.support30;
}

for (const runs of groups) {
  if (!stable(runs[0], runs[1]) || !stable(runs[0], runs[2])) {
    throw new Error(`E2.2c-0 fixture is not deterministic: ${JSON.stringify(runs)}`);
  }
}

const naturallySeparated = groups
  .map((runs) => runs[0])
  .filter((x) => x.firstContact >= 0 && x.firstEpisodeEnd >= x.firstContact && x.firstEpisodeEnd < 179);
if (naturallySeparated.length === 0) {
  throw new Error('E2.2c-0 bounded candidates produced no naturally separated first contact episode');
}
