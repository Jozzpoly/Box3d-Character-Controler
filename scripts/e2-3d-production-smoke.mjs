import Box3D from 'box3d.js/inline';
import { createConstraintVelocityCharacter } from '../src/constraint-velocity-character.js';
import { createDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const DIAGONAL_DESIRED_X = 5.2 / Math.sqrt(2);

function bodyType(type) {
  if (type === 'dynamic') return b3.b3BodyType.b3_dynamicBody;
  if (type === 'kinematic') return b3.b3BodyType.b3_kinematicBody;
  return b3.b3BodyType.b3_staticBody;
}

function makeWorld(gravity = 20) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(def);

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
    shapeDef.baseMaterial.friction = options.friction ?? 0.8;
    shapeDef.baseMaterial.restitution = options.restitution ?? 0;
    if (type === 'dynamic') shapeDef.density = options.density ?? 40;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  return { world, box };
}

function intent(overrides = {}) {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function tick(setup, character, control = intent(), preWorld = null) {
  preWorld?.();
  character.preStep(DT, control);
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  character.postStep(DT);
  return {
    position: [...character.position],
    velocity: [...character.velocity],
    support: character.currentSupport?.type ?? 'AIR',
    contacts: character.lastDynamicContacts,
    impulse: character.lastContactImpulse,
    planes: character.lastPlaneCount,
    clips: character.lastConstraintClips ?? 0,
    solveError: character.lastConstraintSolveError ?? 0,
  };
}

function settle(setup, character, frames = 20) {
  for (let i = 0; i < frames; i++) tick(setup, character);
  if (!character.currentSupport) throw new Error('E2.3d setup failed to settle');
}

function makeCandidate(setup, options = {}) {
  return createConstraintVelocityCharacter(b3, setup.world, {
    startPosition: options.startPosition ?? [0, 0.9, 0],
    gravity: options.gravity ?? 20,
    ...options,
  });
}

function lowBlockerJump(mode, blockerType = 'static') {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [12, 0.5, 6]);
  const centerX = 2.0;
  const halfX = 0.1;
  const top = 0.6;
  setup.box(blockerType, [centerX, top / 2, 0], [halfX, top / 2, 2.0]);
  const character = makeCandidate(setup);
  settle(setup, character);

  let blocked = 0;
  let maxSolveError = 0;
  for (let i = 0; i < 75; i++) {
    const frame = tick(setup, character, intent({ moveForward: 1 }));
    if (frame.planes > 1) blocked += 1;
    maxSolveError = Math.max(maxSolveError, frame.solveError);
  }
  if (blocked < 20) throw new Error(`E2.3d ${mode}/${blockerType} never established sustained blocking`);

  if (mode !== 'held-forward') {
    for (let i = 0; i < 3; i++) tick(setup, character);
  }

  const start = [...character.position];
  let peakX = start[0];
  let peakZ = start[2];
  let clearAt = -1;
  let crossAt = -1;
  let maxVxAfterClear = -Infinity;
  let clipCount = 0;

  for (let i = 0; i < 75; i++) {
    const base = mode === 'neutral'
      ? {}
      : mode === 'tangent'
        ? { moveRight: 1 }
        : mode === 'diagonal'
          ? { moveForward: 1, moveRight: 1 }
          : mode === 'held-forward'
            ? { moveForward: 1 }
            : (() => { throw new Error(`Unknown E2.3d jump mode ${mode}`); })();
    const control = i === 0
      ? intent({ ...base, jump: true, jumpHeld: true })
      : intent({ ...base, jumpHeld: i < 8 });
    const frame = tick(setup, character, control);
    const bottom = frame.position[1] - character.halfSegment - character.radius;
    if (clearAt < 0 && bottom > top + 0.01) clearAt = i;
    if (clearAt >= 0) maxVxAfterClear = Math.max(maxVxAfterClear, frame.velocity[0]);
    if (crossAt < 0 && frame.position[0] > centerX + halfX + character.radius) crossAt = i;
    peakX = Math.max(peakX, frame.position[0]);
    peakZ = Math.max(peakZ, frame.position[2]);
    clipCount += frame.clips;
    maxSolveError = Math.max(maxSolveError, frame.solveError);
  }

  const result = {
    dx: peakX - start[0],
    dz: peakZ - start[2],
    clearAt,
    crossAt,
    maxVxAfterClear,
    clipCount,
    maxSolveError,
  };
  b3.b3DestroyWorld(setup.world);
  return result;
}

function traversalTrial() {
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

  const character = makeCandidate(setup, { startPosition: [stairX, 0.92, 7.2] });
  const basis = { forward: [0, 0, -1], right: [1, 0, 0] };
  for (let i = 0; i < 30; i++) tick(setup, character, intent(basis));
  let maxY = character.position[1];
  let minZ = character.position[2];
  let maxSolveError = 0;
  for (let i = 0; i < 150; i++) {
    const frame = tick(setup, character, intent({ ...basis, moveForward: 1 }));
    maxY = Math.max(maxY, frame.position[1]);
    minZ = Math.min(minZ, frame.position[2]);
    maxSolveError = Math.max(maxSolveError, frame.solveError);
  }
  const stairsPass = maxY >= character.halfHeight + 0.75 && minZ < 0.5;

  character.reset([-2.0, 0.92, 6.5]);
  for (let i = 0; i < 20; i++) tick(setup, character, intent(basis));
  let ledgeMinZ = character.position[2];
  let ledgeMaxY = character.position[1];
  for (let i = 0; i < 80; i++) {
    const frame = tick(setup, character, intent({ ...basis, moveForward: 1 }));
    ledgeMinZ = Math.min(ledgeMinZ, frame.position[2]);
    ledgeMaxY = Math.max(ledgeMaxY, frame.position[1]);
    maxSolveError = Math.max(maxSolveError, frame.solveError);
  }
  const ledgeBlocked = ledgeMinZ >= 5.75 && ledgeMaxY <= character.halfHeight + 0.20;
  b3.b3DestroyWorld(setup.world);
  return { stairsPass, ledgeBlocked, maxY, minZ, ledgeMinZ, maxSolveError };
}

function ownerAnchorTrial(factory) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [10, 0.5, 10], { friction: 0.78 });
  const body = setup.box(
    'dynamic',
    [-0.003587838029488921, 0.6198593378067017, 0.8623996376991272],
    [0.62, 0.62, 0.62],
    {
      density: 42,
      friction: 0.78,
      linearDamping: 0.08,
      angularDamping: 0.10,
      rotation: [-7.062492812792698e-8, -0.007878727279603481, -2.6476740799807885e-8, 0.9999690055847168],
    },
  );
  b3.b3Body_SetLinearVelocity(body, [-0.00713647436350584, -0.009636489674448967, -0.0645877867937088]);
  b3.b3Body_SetAngularVelocity(body, [0.02313126064836979, -0.01097759511321783, -0.0017958738608285785]);

  const character = factory(b3, setup.world, {
    startPosition: [-0.3988331901690951, 1.4734998316617105, 1.8500304795045481],
    gravity: 20,
  });
  character.velocity = [-0.1852537840604782, -3.5533342361450195, -4.444461345672607];
  character.externalVelocity = [-0.004569879202282509, 0, 0.49020405070806333];

  const frames = [];
  let contactStart = -1;
  let contactEnd = -1;
  let previousContacts = 0;
  for (let i = 0; i < 60; i++) {
    const frame = tick(setup, character);
    frames.push(frame);
    if (frame.contacts > 0 && contactStart < 0) contactStart = i;
    if (previousContacts > 0 && frame.contacts === 0 && contactEnd < 0) contactEnd = i - 1;
    previousContacts = frame.contacts;
  }
  if (contactStart < 0 || contactEnd < contactStart) throw new Error('E2.3d Owner anchor lost contact episode');
  const separation = contactEnd + 1;
  const origin = frames[separation].position;
  const displacement = (offset) => {
    const p = frames[Math.min(separation + offset, frames.length - 1)].position;
    return Math.hypot(p[0] - origin[0], p[2] - origin[2]);
  };
  const result = {
    contactFrames: contactEnd - contactStart + 1,
    firstImpulse: frames[contactStart].impulse,
    tail25: displacement(15),
    tail50: displacement(30),
    support: frames[separation].support,
  };
  b3.b3DestroyWorld(setup.world);
  return result;
}

function supportCarryTrial(factory) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const platform = setup.box('kinematic', [0, 0.25, 0], [1.8, 0.25, 1.8], { friction: 0.9 });
  const character = factory(b3, setup.world, { startPosition: [0, 1.4, 0], gravity: 20 });
  let x = 0;
  const move = () => {
    x += 1.5 * DT;
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [x, 0.25, 0], quaternion: [0, 0, 0, 1] },
      DT,
      true,
    );
  };
  for (let i = 0; i < 120; i++) tick(setup, character, intent(), move);
  if (character.currentSupport?.type !== 'KINEMATIC') throw new Error('E2.3d moving support not acquired');
  move();
  character.preStep(DT, intent({ jump: true, jumpHeld: true }));
  const jumpExternal = Math.hypot(character.externalVelocity[0], character.externalVelocity[2]);
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  character.postStep(DT);
  const start = [...character.position];
  for (let i = 0; i < 30; i++) tick(setup, character, intent({ jumpHeld: i < 8 }), move);
  const dx = Math.hypot(character.position[0] - start[0], character.position[2] - start[2]);
  b3.b3DestroyWorld(setup.world);
  return { jumpExternal, dx };
}

function recedingKinematicWall(keepIntent) {
  const setup = makeWorld(0);
  let wallX = 1.0;
  const wallSpeed = 4.0;
  const wall = setup.box('kinematic', [wallX, 2.0, 0], [0.1, 2.0, 2.0], {
    linearDamping: 0,
    angularDamping: 0,
  });
  const character = makeCandidate(setup, {
    startPosition: [0, 2.0, 0],
    gravity: 0,
    airAcceleration: 0,
    airDeceleration: 0,
    externalAirDrag: 0,
  });
  character.velocity = [5.2, 0, 0];

  const moveWall = () => {
    wallX += wallSpeed * DT;
    b3.b3Body_SetTargetTransform(
      wall,
      { position: [wallX, 2.0, 0], quaternion: [0, 0, 0, 1] },
      DT,
      true,
    );
  };

  let firstConstraint = -1;
  let vxAfterFive = null;
  let clipCount = 0;
  let maxSolveError = 0;
  for (let i = 0; i < 90; i++) {
    const frame = tick(setup, character, keepIntent ? intent({ moveForward: 1 }) : intent(), moveWall);
    clipCount += frame.clips;
    maxSolveError = Math.max(maxSolveError, frame.solveError);
    if (firstConstraint < 0 && frame.planes > 0) firstConstraint = i;
    if (firstConstraint >= 0 && i === firstConstraint + 5) vxAfterFive = frame.velocity[0];
  }
  if (firstConstraint < 0) throw new Error('E2.3d receding wall never constrained');
  if (vxAfterFive === null) vxAfterFive = character.velocity[0];
  b3.b3DestroyWorld(setup.world);
  return { firstConstraint, vxAfterFive, relativeAfterFive: vxAfterFive - wallSpeed, clipCount, maxSolveError };
}

function cornerReleaseTrial() {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const top = 0.6;
  setup.box('static', [2.0, top / 2, 0.9], [0.1, top / 2, 1.2]);
  setup.box('static', [0.9, top / 2, 2.0], [1.2, top / 2, 0.1]);
  const character = makeCandidate(setup);
  settle(setup, character);
  for (let i = 0; i < 90; i++) tick(setup, character, intent({ moveForward: 1, moveRight: 1 }));
  for (let i = 0; i < 3; i++) tick(setup, character);
  const start = [...character.position];
  let maxDx = 0;
  let maxDz = 0;
  let clipCount = 0;
  for (let i = 0; i < 75; i++) {
    const control = i === 0 ? intent({ jump: true, jumpHeld: true }) : intent({ jumpHeld: i < 8 });
    const frame = tick(setup, character, control);
    maxDx = Math.max(maxDx, frame.position[0] - start[0]);
    maxDz = Math.max(maxDz, frame.position[2] - start[2]);
    clipCount += frame.clips;
  }
  b3.b3DestroyWorld(setup.world);
  return { maxDx, maxDz, clipCount };
}

function close(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

function f(value) {
  return Number.isFinite(value) ? value.toFixed(3) : 'n/a';
}

const neutral = lowBlockerJump('neutral');
const tangent = lowBlockerJump('tangent');
const diagonal = lowBlockerJump('diagonal');
const held = lowBlockerJump('held-forward');
const kinematicRelease = lowBlockerJump('neutral', 'kinematic');
const traversal = traversalTrial();
const ownerReference = ownerAnchorTrial(createDonorCharacter);
const ownerCandidate = ownerAnchorTrial(createConstraintVelocityCharacter);
const supportReference = supportCarryTrial(createDonorCharacter);
const supportCandidate = supportCarryTrial(createConstraintVelocityCharacter);
const recedingNeutral = recedingKinematicWall(false);
const recedingHeld = recedingKinematicWall(true);
const corner = cornerReleaseTrial();

if (neutral.dx > 0.12 || neutral.maxVxAfterClear > 0.2 || neutral.clipCount <= 0) {
  throw new Error(`E2.3d neutral release failed: ${JSON.stringify(neutral)}`);
}
if (tangent.dx > 0.12 || tangent.maxVxAfterClear > 0.2 || tangent.dz < 4.0 || tangent.clipCount <= 0) {
  throw new Error(`E2.3d tangent release failed: ${JSON.stringify(tangent)}`);
}
if (Math.abs(diagonal.maxVxAfterClear - DIAGONAL_DESIRED_X) > 0.08 || diagonal.clipCount <= 0) {
  throw new Error(`E2.3d diagonal cap failed: ${JSON.stringify(diagonal)}`);
}
if (held.maxVxAfterClear < 5.1 || held.crossAt < 0) {
  throw new Error(`E2.3d held-forward authority failed: ${JSON.stringify(held)}`);
}
if (kinematicRelease.dx > 0.12 || kinematicRelease.maxVxAfterClear > 0.2 || kinematicRelease.clipCount <= 0) {
  throw new Error(`E2.3d stationary kinematic release failed: ${JSON.stringify(kinematicRelease)}`);
}
if (!traversal.stairsPass || !traversal.ledgeBlocked) {
  throw new Error(`E2.3d traversal regression: ${JSON.stringify(traversal)}`);
}
if (
  ownerCandidate.contactFrames !== ownerReference.contactFrames
  || !close(ownerCandidate.firstImpulse, ownerReference.firstImpulse, 1e-3)
  || !close(ownerCandidate.tail25, ownerReference.tail25, 0.005)
  || !close(ownerCandidate.tail50, ownerReference.tail50, 0.005)
  || ownerCandidate.support !== ownerReference.support
) {
  throw new Error(`E2.3d Owner anchor changed: reference=${JSON.stringify(ownerReference)} candidate=${JSON.stringify(ownerCandidate)}`);
}
if (
  !close(supportCandidate.jumpExternal, supportReference.jumpExternal, 0.02)
  || !close(supportCandidate.dx, supportReference.dx, 0.02)
) {
  throw new Error(`E2.3d support carry changed: reference=${JSON.stringify(supportReference)} candidate=${JSON.stringify(supportCandidate)}`);
}
if (Math.abs(recedingNeutral.vxAfterFive - 4.0) > 0.2 || recedingNeutral.clipCount <= 0) {
  throw new Error(`E2.3d moving kinematic relative cap failed: ${JSON.stringify(recedingNeutral)}`);
}
if (recedingHeld.vxAfterFive < 4.9) {
  throw new Error(`E2.3d moving kinematic held authority failed: ${JSON.stringify(recedingHeld)}`);
}
if (corner.maxDx > 0.15 || corner.maxDz > 0.15 || corner.clipCount <= 0) {
  throw new Error(`E2.3d multi-plane corner release failed: ${JSON.stringify(corner)}`);
}

const maxSolveError = Math.max(
  neutral.maxSolveError,
  tangent.maxSolveError,
  diagonal.maxSolveError,
  held.maxSolveError,
  kinematicRelease.maxSolveError,
  traversal.maxSolveError,
  recedingNeutral.maxSolveError,
  recedingHeld.maxSolveError,
);
if (maxSolveError > 2e-5) throw new Error(`E2.3d solver reconstruction exceeded qualification tolerance: ${maxSolveError}`);

console.log('E2.3d production-path specimen qualification PASS:');
console.log(
  `  neutral=${f(neutral.dx)}m tangent=${f(tangent.dx)}m/${f(tangent.dz)}m diagonalV=${f(diagonal.maxVxAfterClear)} heldV=${f(held.maxVxAfterClear)} cross=${held.crossAt}f kinematicRelease=${f(kinematicRelease.dx)}m`,
);
console.log(
  `  stairs=${traversal.stairsPass ? 'PASS' : 'FAIL'} ledge=${traversal.ledgeBlocked ? 'PASS' : 'FAIL'} owner=${ownerCandidate.contactFrames}f I=${f(ownerCandidate.firstImpulse)} tail=${f(ownerCandidate.tail25)}/${f(ownerCandidate.tail50)} ${ownerCandidate.support}`,
);
console.log(
  `  support=${f(supportCandidate.jumpExternal)}/${f(supportCandidate.dx)} recedingNeutral=${f(recedingNeutral.vxAfterFive)}m/s recedingHeld=${f(recedingHeld.vxAfterFive)}m/s corner=${f(corner.maxDx)}/${f(corner.maxDz)} clips=${corner.clipCount} maxSolveErr=${maxSolveError.toExponential(2)}`,
);
