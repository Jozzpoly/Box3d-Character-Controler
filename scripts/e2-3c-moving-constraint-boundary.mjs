import Box3D from 'box3d.js/inline';
import { createDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const LINEAR_SLOP = 0.005;
const FLT_MAX = 3.4e38;
const POLICIES = ['current', 'intent-cap-world', 'intent-cap-relative'];

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
  let clipped = 0;
  let activated = 0;
  let maxSolveDeltaError = 0;

  shim._setDesired = (x, z) => { desired = [x, z]; };
  shim.b3SolvePlanes = (targetDelta, planes) => {
    const nativeResult = nativeSolve(targetDelta, planes);
    const reconstructed = solvePlanesWithPush(targetDelta, planes);
    const error = maxAbsDelta(nativeResult.delta, reconstructed.delta);
    maxSolveDeltaError = Math.max(maxSolveDeltaError, error);
    if (error > 2e-5) throw new Error(`E2.3c moving-constraint solve divergence ${error}`);
    for (let i = 0; i < planes.length; i++) {
      planes[i].push = reconstructed.planes[i].push;
      if (planes[i].push > 0) activated += 1;
    }
    return nativeResult;
  };

  shim.b3ClipVector = (vector, planes) => {
    const out = [...vector];
    for (const plane of planes) {
      if (!(plane.push > 0) || plane.clipVelocity === false) continue;
      if (plane._bodyType !== STATIC && plane._bodyType !== KINEMATIC) continue;
      const normal = plane.plane.normal;
      const h = Math.hypot(normal[0], normal[2]);
      if (h < 0.35) continue;
      const nx = normal[0] / h;
      const nz = normal[2] / h;
      const surface = policy === 'intent-cap-relative'
        ? (plane._surfaceVelocity ?? [0, 0, 0])
        : [0, 0, 0];
      const relativeInward = (out[0] - surface[0]) * nx + (out[2] - surface[2]) * nz;
      const desiredRelativeInward = (desired[0] - surface[0]) * nx + (desired[1] - surface[2]) * nz;
      const allowedRelativeInward = Math.min(0, desiredRelativeInward);
      if (relativeInward >= allowedRelativeInward - 1e-7) continue;
      const excess = relativeInward - allowedRelativeInward;
      out[0] -= excess * nx;
      out[2] -= excess * nz;
      clipped += 1;
    }
    return out;
  };

  shim._stats = () => ({ clipped, activated, maxSolveDeltaError });
  return shim;
}

function bodyType(type) {
  if (type === 'kinematic') return b3.b3BodyType.b3_kinematicBody;
  if (type === 'dynamic') return b3.b3BodyType.b3_dynamicBody;
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
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = options.linearDamping ?? 0;
    bodyDef.angularDamping = options.angularDamping ?? 0;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = options.friction ?? 0.8;
    shapeDef.baseMaterial.restitution = 0;
    if (type === 'dynamic') shapeDef.density = 40;
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

function instrument(character, module) {
  if (!module._setDesired) return;
  const collect = character._collectPlanes.bind(character);
  character._collectPlanes = (capsule) => {
    const result = collect(capsule);
    for (let i = 0; i < result.planes.length; i++) {
      const extra = result.extras[i];
      if (!extra?.shapeId) continue;
      const body = b3.b3Shape_GetBody(extra.shapeId);
      const type = bodyTypeValue(b3.b3Body_GetType(body));
      result.planes[i]._bodyType = type;
      result.planes[i]._surfaceVelocity = type === STATIC
        ? [0, 0, 0]
        : character._bodyPointVelocity(body, extra.point);
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
function makeCharacter(setup, policy, options = {}) {
  const module = makePolicyModule(policy);
  const character = createDonorCharacter(module, setup.world, options);
  instrument(character, module);
  return { character, module };
}
function tick(setup, character, control = intent(), beforeWorld = null) {
  beforeWorld?.();
  character.preStep(DT, control);
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  character.postStep(DT);
  return {
    position: [...character.position],
    velocity: [...character.velocity],
    planes: character.lastPlaneCount,
    support: character.currentSupport?.type ?? 'AIR',
  };
}

function lowBlockerRelease(policy, blockerType) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [12, 0.5, 6]);
  const centerX = 2.0;
  const halfX = 0.1;
  const top = 0.6;
  setup.box(blockerType, [centerX, top / 2, 0], [halfX, top / 2, 2]);
  const { character, module } = makeCharacter(setup, policy, { startPosition: [0, 0.9, 0] });
  for (let i = 0; i < 20; i++) tick(setup, character);
  let blocked = 0;
  for (let i = 0; i < 75; i++) {
    const frame = tick(setup, character, intent({ moveForward: 1 }));
    if (frame.planes > 1) blocked += 1;
  }
  if (blocked < 20) throw new Error(`E2.3c ${policy}/${blockerType} failed sustained blocker contact`);
  for (let i = 0; i < 3; i++) tick(setup, character);
  const startX = character.position[0];
  let peakX = startX;
  let maxVxAfterClear = -Infinity;
  let clearAt = -1;
  for (let i = 0; i < 75; i++) {
    const control = i === 0 ? intent({ jump: true, jumpHeld: true }) : intent({ jumpHeld: i < 8 });
    const frame = tick(setup, character, control);
    const bottom = frame.position[1] - character.halfSegment - character.radius;
    if (clearAt < 0 && bottom > top + 0.01) clearAt = i;
    if (clearAt >= 0) maxVxAfterClear = Math.max(maxVxAfterClear, frame.velocity[0]);
    peakX = Math.max(peakX, frame.position[0]);
  }
  const stats = module._stats?.() ?? null;
  b3.b3DestroyWorld(setup.world);
  return { releaseDx: peakX - startX, maxVxAfterClear, stats };
}

function recedingKinematicWall(policy, keepIntent) {
  const setup = makeWorld(0);
  let wallX = 1.0;
  const wallSpeed = 4.0;
  const wall = setup.box('kinematic', [wallX, 2.0, 0], [0.1, 2.0, 2.0]);
  const { character, module } = makeCharacter(setup, policy, {
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
  let vxAtFirstConstraint = null;
  let vxAfterFive = null;
  let wallVelocityAtConstraint = null;
  for (let i = 0; i < 90; i++) {
    const frame = tick(setup, character, keepIntent ? intent({ moveForward: 1 }) : intent(), moveWall);
    if (firstConstraint < 0 && frame.planes > 0) {
      firstConstraint = i;
      vxAtFirstConstraint = frame.velocity[0];
      const surface = character._bodyPointVelocity(wall, [wallX - 0.1, 2.0, 0]);
      wallVelocityAtConstraint = surface[0];
    }
    if (firstConstraint >= 0 && i === firstConstraint + 5) vxAfterFive = frame.velocity[0];
  }
  if (firstConstraint < 0) throw new Error(`E2.3c ${policy} receding-wall scenario never constrained`);
  if (vxAfterFive === null) vxAfterFive = character.velocity[0];
  const stats = module._stats?.() ?? null;
  const result = {
    firstConstraint,
    vxAtFirstConstraint,
    vxAfterFive,
    wallVelocityAtConstraint,
    relativeAfterFive: vxAfterFive - wallSpeed,
    stats,
  };
  b3.b3DestroyWorld(setup.world);
  return result;
}

function supportCarry(policy) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const platform = setup.box('kinematic', [0, 0.25, 0], [1.8, 0.25, 1.8]);
  const { character } = makeCharacter(setup, policy, { startPosition: [0, 1.4, 0] });
  let x = 0;
  const move = () => {
    x += 1.5 * DT;
    b3.b3Body_SetTargetTransform(platform, { position: [x, 0.25, 0], quaternion: [0, 0, 0, 1] }, DT, true);
  };
  for (let i = 0; i < 120; i++) tick(setup, character, intent(), move);
  if (character.currentSupport?.type !== 'KINEMATIC') throw new Error(`E2.3c ${policy} moving support not acquired`);
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

function f(v) {
  return Number.isFinite(v) ? v.toFixed(3) : 'n/a';
}
function close(a, c, tolerance) {
  return Math.abs(a - c) <= tolerance;
}

const results = {};
for (const policy of POLICIES) {
  results[policy] = {
    staticRelease: lowBlockerRelease(policy, 'static'),
    kinematicRelease: lowBlockerRelease(policy, 'kinematic'),
    recedingNeutral: recedingKinematicWall(policy, false),
    recedingHeld: recedingKinematicWall(policy, true),
    support: supportCarry(policy),
  };
}

const current = results.current;
function verdict(policy) {
  if (policy === 'current') return 'REFERENCE';
  const r = results[policy];
  const staticClean = r.staticRelease.releaseDx < 0.2 && r.staticRelease.maxVxAfterClear < 0.35;
  const kinematicClean = r.kinematicRelease.releaseDx < 0.2 && r.kinematicRelease.maxVxAfterClear < 0.35;
  const recedingNeutral = Math.abs(r.recedingNeutral.vxAfterFive - 4.0) < 0.25;
  const recedingHeld = r.recedingHeld.vxAfterFive > 4.9;
  const support = close(r.support.jumpExternal, current.support.jumpExternal, 0.05)
    && close(r.support.dx, current.support.dx, 0.05);
  return staticClean && kinematicClean && recedingNeutral && recedingHeld && support ? 'SURVIVOR' : 'REJECT';
}

console.log('E2.3c moving-constraint / relative-frame falsifier (diagnostic only):');
for (const policy of POLICIES) {
  const r = results[policy];
  console.log(
    `  ${policy}: staticRelease=${f(r.staticRelease.releaseDx)}m | kinematicRelease=${f(r.kinematicRelease.releaseDx)}m | recedingNeutral first=${r.recedingNeutral.firstConstraint}f V=${f(r.recedingNeutral.vxAtFirstConstraint)} after5=${f(r.recedingNeutral.vxAfterFive)} wall=${f(r.recedingNeutral.wallVelocityAtConstraint)} rel=${f(r.recedingNeutral.relativeAfterFive)} | recedingHeld after5=${f(r.recedingHeld.vxAfterFive)} | carry=${f(r.support.jumpExternal)}/${f(r.support.dx)} => ${verdict(policy)}`,
  );
}

if (current.staticRelease.releaseDx < 0.8 || current.kinematicRelease.releaseDx < 0.8) {
  throw new Error('E2.3c current reference failed to reproduce static/kinematic release retention');
}
for (const policy of ['intent-cap-world', 'intent-cap-relative']) {
  const stats = results[policy].staticRelease.stats;
  if (!stats || stats.activated <= 0 || stats.clipped <= 0 || stats.maxSolveDeltaError > 2e-5) {
    throw new Error(`E2.3c ${policy} static clipping path not qualified`);
  }
}
const relativeStats = results['intent-cap-relative'].recedingNeutral.stats;
if (!relativeStats || relativeStats.clipped <= 0) throw new Error('E2.3c relative policy never clipped receding-wall relative excess');
if (verdict('intent-cap-relative') !== 'SURVIVOR') {
  throw new Error(`E2.3c relative-frame candidate did not survive: ${JSON.stringify(results['intent-cap-relative'])}`);
}
console.log('E2.3c relative-frame matrix qualification PASS; candidate remains diagnostic, not production behavior.');
