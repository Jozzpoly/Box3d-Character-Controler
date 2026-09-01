import Box3D from 'box3d.js/inline';
import { createDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const LINEAR_SLOP = 0.005;
const FLT_MAX = 3.4e38;
const POLICIES = ['current', 'intent-release-world', 'intent-cap-world'];
const DIAGONAL_DESIRED_X = 5.2 / Math.sqrt(2);

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

const STATIC = bodyTypeValue(b3.b3BodyType.b3_staticBody);
const KINEMATIC = bodyTypeValue(b3.b3BodyType.b3_kinematicBody);

function dot3(a, c) {
  return a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
}

function maxAbsDelta(a, c) {
  return Math.max(Math.abs(a[0] - c[0]), Math.abs(a[1] - c[1]), Math.abs(a[2] - c[2]));
}

function clonePlane(entry) {
  return {
    plane: { normal: [...entry.plane.normal], offset: entry.plane.offset },
    pushLimit: entry.pushLimit ?? FLT_MAX,
    push: 0,
    clipVelocity: entry.clipVelocity !== false,
  };
}

function solvePlanesWithPush(targetDelta, inputPlanes) {
  const planes = inputPlanes.map(clonePlane);
  const delta = [...targetDelta];
  for (let iteration = 0; iteration < 20; iteration++) {
    let totalPush = 0;
    for (const plane of planes) {
      const separation = dot3(plane.plane.normal, delta) - plane.plane.offset + LINEAR_SLOP;
      let push = -separation;
      const accumulated = plane.push;
      plane.push = Math.min(Math.max(plane.push + push, 0), plane.pushLimit);
      push = plane.push - accumulated;
      delta[0] += push * plane.plane.normal[0];
      delta[1] += push * plane.plane.normal[1];
      delta[2] += push * plane.plane.normal[2];
      totalPush += Math.abs(push);
    }
    if (totalPush < LINEAR_SLOP) break;
  }
  return { delta, planes };
}

function makePolicyModule(policy) {
  if (policy === 'current') return b3;
  const shim = Object.create(b3);
  const nativeSolve = b3.b3SolvePlanes.bind(b3);
  let desired = [0, 0];
  let activatedPlanes = 0;
  let maxSolveDeltaError = 0;
  let clippedComponents = 0;

  shim._setDesired = (x, z) => { desired = [x, z]; };
  shim.b3SolvePlanes = (targetDelta, planes) => {
    const nativeResult = nativeSolve(targetDelta, planes);
    const reconstructed = solvePlanesWithPush(targetDelta, planes);
    const error = maxAbsDelta(nativeResult.delta, reconstructed.delta);
    maxSolveDeltaError = Math.max(maxSolveDeltaError, error);
    if (error > 2e-5) throw new Error(`E2.3c intent-cap plane reconstruction diverged by ${error}`);
    for (let i = 0; i < planes.length; i++) {
      planes[i].push = reconstructed.planes[i].push;
      if (planes[i].push > 0) activatedPlanes += 1;
    }
    return nativeResult;
  };

  shim.b3ClipVector = (vector, planes) => {
    const out = [...vector];
    for (const plane of planes) {
      if (!(plane.push > 0) || plane.clipVelocity === false) continue;
      if (plane._bodyType !== STATIC && plane._bodyType !== KINEMATIC) continue;
      const normal = plane.plane.normal;
      const horizontalLength = Math.hypot(normal[0], normal[2]);
      if (horizontalLength < 0.35) continue;
      const nx = normal[0] / horizontalLength;
      const nz = normal[2] / horizontalLength;
      const desiredInward = desired[0] * nx + desired[1] * nz;
      const velocityInward = out[0] * nx + out[2] * nz;
      if (velocityInward >= 0) continue;

      if (policy === 'intent-release-world') {
        if (desiredInward < -0.05) continue;
        out[0] -= velocityInward * nx;
        out[2] -= velocityInward * nz;
        clippedComponents += 1;
        continue;
      }

      if (policy === 'intent-cap-world') {
        const allowedInward = Math.min(0, desiredInward);
        if (velocityInward >= allowedInward - 1e-7) continue;
        const excessInward = velocityInward - allowedInward;
        out[0] -= excessInward * nx;
        out[2] -= excessInward * nz;
        clippedComponents += 1;
        continue;
      }

      throw new Error(`Unknown E2.3c intent policy ${policy}`);
    }
    return out;
  };

  shim._stats = () => ({ activatedPlanes, maxSolveDeltaError, clippedComponents });
  return shim;
}

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

function instrumentCharacter(character, module) {
  if (!module._setDesired) return;

  const collect = character._collectPlanes.bind(character);
  character._collectPlanes = (capsule) => {
    const result = collect(capsule);
    for (let i = 0; i < result.planes.length; i++) {
      const shapeId = result.extras[i]?.shapeId;
      if (!shapeId) continue;
      const body = b3.b3Shape_GetBody(shapeId);
      result.planes[i]._bodyType = bodyTypeValue(b3.b3Body_GetType(body));
    }
    return result;
  };

  const preStep = character.preStep.bind(character);
  character.preStep = (dt, control) => {
    preStep(dt, control);
    module._setDesired(
      character.desiredDirection[0] * character.desiredSpeed,
      character.desiredDirection[2] * character.desiredSpeed,
    );
  };
}

function makeCharacter(setup, policy, startPosition = [0, 0.9, 0]) {
  const module = makePolicyModule(policy);
  const character = createDonorCharacter(module, setup.world, { startPosition, gravity: 20 });
  instrumentCharacter(character, module);
  return { character, module };
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
  };
}

function settle(setup, character, frames = 20) {
  for (let i = 0; i < frames; i++) tick(setup, character);
  if (!character.currentSupport) throw new Error('E2.3c intent-cap setup failed to settle');
}

function makeLowBlockerTrial(policy) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [12, 0.5, 8]);
  const centerX = 2.0;
  const halfX = 0.10;
  const top = 0.60;
  setup.box('static', [centerX, top / 2, 0], [halfX, top / 2, 3.0]);
  const pair = makeCharacter(setup, policy);
  settle(setup, pair.character);
  let blockedFrames = 0;
  for (let i = 0; i < 75; i++) {
    const frame = tick(setup, pair.character, intent({ moveForward: 1 }));
    if (frame.planes > 1 && frame.position[0] < centerX) blockedFrames += 1;
  }
  if (blockedFrames < 20) throw new Error(`E2.3c ${policy} low blocker failed sustained contact (${blockedFrames}f)`);
  return { setup, ...pair, centerX, halfX, top, blockedFrames };
}

function jumpAfterBlock(policy, mode) {
  const trial = makeLowBlockerTrial(policy);
  const { setup, character, module, centerX, halfX, top } = trial;

  if (mode === 'neutral') {
    for (let i = 0; i < 3; i++) tick(setup, character);
  }

  const start = [...character.position];
  let clearAt = -1;
  let crossAt = -1;
  let peakX = start[0];
  let peakZ = start[2];
  let maxVxAfterClear = -Infinity;
  let minVxAfterClear = Infinity;

  for (let i = 0; i < 75; i++) {
    const base = mode === 'neutral'
      ? {}
      : mode === 'tangent'
        ? { moveRight: 1 }
        : mode === 'diagonal'
          ? { moveForward: 1, moveRight: 1 }
          : mode === 'held-forward'
            ? { moveForward: 1 }
            : (() => { throw new Error(`Unknown jump mode ${mode}`); })();
    const control = i === 0
      ? intent({ ...base, jump: true, jumpHeld: true })
      : intent({ ...base, jumpHeld: i < 8 });
    const frame = tick(setup, character, control);
    const bottom = frame.position[1] - character.halfSegment - character.radius;
    if (clearAt < 0 && bottom > top + 0.01) clearAt = i;
    if (clearAt >= 0) {
      maxVxAfterClear = Math.max(maxVxAfterClear, frame.velocity[0]);
      minVxAfterClear = Math.min(minVxAfterClear, frame.velocity[0]);
    }
    if (crossAt < 0 && frame.position[0] > centerX + halfX + character.radius) crossAt = i;
    peakX = Math.max(peakX, frame.position[0]);
    peakZ = Math.max(peakZ, frame.position[2]);
  }

  const stats = module._stats?.() ?? null;
  b3.b3DestroyWorld(setup.world);
  return {
    clearAt,
    crossAt,
    maxVxAfterClear,
    minVxAfterClear,
    dx: peakX - start[0],
    dz: peakZ - start[2],
    excessOverDiagonalDesired: mode === 'diagonal'
      ? Math.max(0, maxVxAfterClear - DIAGONAL_DESIRED_X)
      : null,
    stats,
  };
}

function traversalTrial(policy) {
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

  const { character } = makeCharacter(setup, policy, [stairX, 0.92, 7.2]);
  const forward = [0, 0, -1];
  const right = [1, 0, 0];
  for (let i = 0; i < 30; i++) tick(setup, character, intent({ forward, right }));
  let maxY = character.position[1];
  let minZ = character.position[2];
  for (let i = 0; i < 150; i++) {
    tick(setup, character, intent({ forward, right, moveForward: 1 }));
    maxY = Math.max(maxY, character.position[1]);
    minZ = Math.min(minZ, character.position[2]);
  }
  const stairsPass = maxY >= character.halfHeight + 0.75 && minZ < 0.5;

  character.reset([-2.0, 0.92, 6.5]);
  for (let i = 0; i < 20; i++) tick(setup, character, intent({ forward, right }));
  let ledgeMinZ = character.position[2];
  let ledgeMaxY = character.position[1];
  for (let i = 0; i < 80; i++) {
    tick(setup, character, intent({ forward, right, moveForward: 1 }));
    ledgeMinZ = Math.min(ledgeMinZ, character.position[2]);
    ledgeMaxY = Math.max(ledgeMaxY, character.position[1]);
  }
  const ledgeBlocked = ledgeMinZ >= 5.75 && ledgeMaxY <= character.halfHeight + 0.20;
  b3.b3DestroyWorld(setup.world);
  return { stairsPass, maxY, minZ, ledgeBlocked, ledgeMinZ };
}

function ownerAnchorTrial(policy) {
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

  const { character } = makeCharacter(setup, policy, [-0.3988331901690951, 1.4734998316617105, 1.8500304795045481]);
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
  if (contactStart < 0 || contactEnd < contactStart) throw new Error(`E2.3c ${policy} owner anchor lost contact episode`);
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
    supportAtSeparation: frames[separation].support,
  };
  b3.b3DestroyWorld(setup.world);
  return result;
}

function supportCarryTrial(policy) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const platform = setup.box('kinematic', [0, 0.25, 0], [1.8, 0.25, 1.8], { friction: 0.9 });
  const { character } = makeCharacter(setup, policy, [0, 1.4, 0]);
  let x = 0;
  const movePlatform = () => {
    x += 1.5 * DT;
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [x, 0.25, 0], quaternion: [0, 0, 0, 1] },
      DT,
      true,
    );
  };

  for (let i = 0; i < 120; i++) tick(setup, character, intent(), movePlatform);
  if (character.currentSupport?.type !== 'KINEMATIC') throw new Error(`E2.3c ${policy} failed kinematic support acquisition`);

  movePlatform();
  character.preStep(DT, intent({ jump: true, jumpHeld: true }));
  const jumpExternal = Math.hypot(character.externalVelocity[0], character.externalVelocity[2]);
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  character.postStep(DT);
  const start = [...character.position];
  for (let i = 0; i < 30; i++) tick(setup, character, intent({ jumpHeld: i < 8 }), movePlatform);
  const dx = Math.hypot(character.position[0] - start[0], character.position[2] - start[2]);
  b3.b3DestroyWorld(setup.world);
  return { jumpExternal, dx };
}

function close(a, c, tolerance) {
  return Math.abs(a - c) <= tolerance;
}

const results = {};
for (const policy of POLICIES) {
  results[policy] = {
    neutral: jumpAfterBlock(policy, 'neutral'),
    tangent: jumpAfterBlock(policy, 'tangent'),
    diagonal: jumpAfterBlock(policy, 'diagonal'),
    held: jumpAfterBlock(policy, 'held-forward'),
    traversal: traversalTrial(policy),
    owner: ownerAnchorTrial(policy),
    support: supportCarryTrial(policy),
  };
}

const current = results.current;

function verdict(policy) {
  if (policy === 'current') return 'REFERENCE';
  const r = results[policy];
  const neutralClean = r.neutral.dx < 0.20 && r.neutral.maxVxAfterClear < 0.35;
  const tangentClean = r.tangent.dx < 0.20 && r.tangent.maxVxAfterClear < 0.35 && r.tangent.dz > 1.0;
  const diagonalBounded = r.diagonal.excessOverDiagonalDesired < 0.20
    && r.diagonal.maxVxAfterClear > DIAGONAL_DESIRED_X - 0.55
    && r.diagonal.dz > 1.0;
  const heldPreserved = r.held.crossAt >= 0 && r.held.maxVxAfterClear > 4.5 && r.held.dx > 1.0;
  const traversalPreserved = r.traversal.stairsPass && r.traversal.ledgeBlocked;
  const ownerPreserved = r.owner.contactFrames === current.owner.contactFrames
    && close(r.owner.firstImpulse, current.owner.firstImpulse, 1.0)
    && close(r.owner.tail25, current.owner.tail25, 0.03)
    && close(r.owner.tail50, current.owner.tail50, 0.04)
    && r.owner.supportAtSeparation === current.owner.supportAtSeparation;
  const supportPreserved = close(r.support.jumpExternal, current.support.jumpExternal, 0.05)
    && close(r.support.dx, current.support.dx, 0.05);
  return neutralClean && tangentClean && diagonalBounded && heldPreserved
    && traversalPreserved && ownerPreserved && supportPreserved
    ? 'SURVIVOR'
    : 'REJECT';
}

function f(value) {
  return Number.isFinite(value) ? value.toFixed(3) : 'n/a';
}

console.log('E2.3c intent-cap survivor falsifier (diagnostic only):');
console.log(`  diagonal desired forward component=${DIAGONAL_DESIRED_X.toFixed(3)}m/s`);
for (const policy of POLICIES) {
  const r = results[policy];
  console.log(
    `  ${policy}: neutralDx=${f(r.neutral.dx)} Vx=${f(r.neutral.maxVxAfterClear)} | tangentDx=${f(r.tangent.dx)} dz=${f(r.tangent.dz)} Vx=${f(r.tangent.maxVxAfterClear)} | diagonalVx=${f(r.diagonal.maxVxAfterClear)} excess=${f(r.diagonal.excessOverDiagonalDesired)} dz=${f(r.diagonal.dz)} | heldDx=${f(r.held.dx)} Vx=${f(r.held.maxVxAfterClear)} cross=${r.held.crossAt}f | stairs=${r.traversal.stairsPass ? 'PASS' : 'FAIL'} ledge=${r.traversal.ledgeBlocked ? 'PASS' : 'FAIL'} | owner=${r.owner.contactFrames}f I=${f(r.owner.firstImpulse)} tail=${f(r.owner.tail25)}/${f(r.owner.tail50)} ${r.owner.supportAtSeparation} | carry=${f(r.support.jumpExternal)}/${f(r.support.dx)} => ${verdict(policy)}`,
  );
}

for (const policy of POLICIES.filter((entry) => entry !== 'current')) {
  for (const trialName of ['neutral', 'tangent']) {
    const stats = results[policy][trialName].stats;
    if (!stats || stats.activatedPlanes <= 0 || stats.clippedComponents <= 0) {
      throw new Error(`E2.3c ${policy} ${trialName} did not exercise clipping path`);
    }
    if (stats.maxSolveDeltaError > 2e-5) throw new Error(`E2.3c ${policy} solve divergence ${stats.maxSolveDeltaError}`);
  }
}
const capDiagonalStats = results['intent-cap-world'].diagonal.stats;
if (!capDiagonalStats || capDiagonalStats.clippedComponents <= 0) {
  throw new Error('E2.3c intent-cap-world diagonal case did not exercise excess-velocity cap');
}
if (current.neutral.dx < 0.8 || current.tangent.dx < 0.8) {
  throw new Error('E2.3c current reference no longer reproduces neutral/tangent stale release');
}
if (current.diagonal.excessOverDiagonalDesired < 0.35) {
  throw new Error(`E2.3c diagonal reference lacks meaningful stale excess: ${JSON.stringify(current.diagonal)}`);
}
if (!current.traversal.stairsPass || !current.traversal.ledgeBlocked) {
  throw new Error('E2.3c current traversal reference regressed');
}
console.log('E2.3c intent-cap matrix qualification PASS; survivor status is diagnostic, not production promotion.');
