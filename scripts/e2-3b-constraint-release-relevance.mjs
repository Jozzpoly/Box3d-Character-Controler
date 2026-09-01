import Box3D from 'box3d.js/inline';
import { createDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const LINEAR_SLOP = 0.005;
const FLT_MAX = 3.4e38;

function dot3(a, c) {
  return a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
}

function maxAbsDelta(a, c) {
  return Math.max(Math.abs(a[0] - c[0]), Math.abs(a[1] - c[1]), Math.abs(a[2] - c[2]));
}

function clonePlane(entry) {
  return {
    plane: {
      normal: [...entry.plane.normal],
      offset: entry.plane.offset,
    },
    pushLimit: entry.pushLimit ?? FLT_MAX,
    push: 0,
    clipVelocity: entry.clipVelocity !== false,
  };
}

// Same faithful native-8441b4a plane-solver transcription used by E2.3.
// This shim exists only to expose the intended velocity-clip comparison;
// current A″ remains the actual box3d.js@0.1.1 binding behavior.
function solvePlanesWithPush(targetDelta, inputPlanes) {
  const planes = inputPlanes.map(clonePlane);
  const delta = [...targetDelta];

  for (let iteration = 0; iteration < 20; iteration++) {
    let totalPush = 0;
    for (const plane of planes) {
      const separation = dot3(plane.plane.normal, delta) - plane.plane.offset + LINEAR_SLOP;
      let push = -separation;
      const accumulatedPush = plane.push;
      plane.push = Math.min(Math.max(plane.push + push, 0), plane.pushLimit);
      push = plane.push - accumulatedPush;
      delta[0] += push * plane.plane.normal[0];
      delta[1] += push * plane.plane.normal[1];
      delta[2] += push * plane.plane.normal[2];
      totalPush += Math.abs(push);
    }
    if (totalPush < LINEAR_SLOP) break;
  }

  return { delta, planes };
}

function makePushPropagatingModule() {
  const shim = Object.create(b3);
  const nativeSolve = b3.b3SolvePlanes.bind(b3);
  let maxSolveDeltaError = 0;
  let activatedPlanes = 0;

  shim.b3SolvePlanes = (targetDelta, planes) => {
    const nativeResult = nativeSolve(targetDelta, planes);
    const reconstructed = solvePlanesWithPush(targetDelta, planes);
    const error = maxAbsDelta(nativeResult.delta, reconstructed.delta);
    maxSolveDeltaError = Math.max(maxSolveDeltaError, error);
    if (error > 2e-5) {
      throw new Error(`E2.3b plane reconstruction diverged from native solve by ${error}`);
    }

    for (let i = 0; i < planes.length; i++) {
      planes[i].push = reconstructed.planes[i].push;
      if (planes[i].push > 0) activatedPlanes += 1;
    }
    return nativeResult;
  };

  shim._stats = () => ({ maxSolveDeltaError, activatedPlanes });
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
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = options.linearDamping ?? 0;
    bodyDef.angularDamping = options.angularDamping ?? 0;
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

function intent({ forward = 0, right = 0, jump = false, jumpHeld = false } = {}) {
  return {
    moveForward: forward,
    moveRight: right,
    // For these diagnostics, +X is "forward" and +Z is "right".
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump,
    jumpHeld,
    sprint: false,
  };
}

function tick(setup, character, control) {
  character.preStep(DT, control);
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  character.postStep(DT);
  return {
    position: [...character.position],
    velocity: [...character.velocity],
    speedXZ: Math.hypot(character.velocity[0], character.velocity[2]),
    support: character.currentSupport?.type ?? 'AIR',
    planeCount: character.lastPlaneCount,
  };
}

function settle(setup, character, frames = 20) {
  for (let i = 0; i < frames; i++) tick(setup, character, intent());
  if (!character.currentSupport) throw new Error('E2.3b setup failed to settle character on floor');
}

function makeTrialCharacter(setup, intendedClip) {
  const module = intendedClip ? makePushPropagatingModule() : b3;
  const character = createDonorCharacter(module, setup.world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
  });
  return { character, module };
}

function wallNeutralJumpTrial(intendedClip) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [12, 0.5, 6]);
  // 0.60 m tall: high enough to block ordinary traversal, low enough for a normal jump to clear.
  const blockerCenterX = 2.0;
  const blockerHalfX = 0.10;
  const blockerTop = 0.60;
  setup.box('static', [blockerCenterX, blockerTop / 2, 0], [blockerHalfX, blockerTop / 2, 2.0]);

  const { character, module } = makeTrialCharacter(setup, intendedClip);
  settle(setup, character);

  let blockedFrames = 0;
  let firstBlockedFrame = -1;
  const driveFrames = [];
  for (let i = 0; i < 75; i++) {
    const frame = tick(setup, character, intent({ forward: 1 }));
    driveFrames.push(frame);
    if (frame.planeCount > 1 && frame.position[0] < blockerCenterX) {
      blockedFrames += 1;
      if (firstBlockedFrame < 0) firstBlockedFrame = i;
    }
  }
  if (blockedFrames < 20) {
    throw new Error(`E2.3b wall-jump trial did not establish sustained blocker contact (${blockedFrames} frames)`);
  }

  const heldPosition = [...character.position];
  const heldVelocity = [...character.velocity];

  // Explicitly remove forward intent before jumping. Three grounded neutral ticks
  // make this a release test rather than a same-tick "held-forward vault" test.
  const neutralBeforeJump = [];
  for (let i = 0; i < 3; i++) neutralBeforeJump.push(tick(setup, character, intent()));

  const jumpStartPosition = [...character.position];
  const jumpStartVelocity = [...character.velocity];
  const flight = [];
  let clearedBlockerAt = -1;
  let crossedFarFaceAt = -1;
  for (let i = 0; i < 75; i++) {
    const control = i === 0
      ? intent({ jump: true, jumpHeld: true })
      : intent({ jumpHeld: i < 8 });
    const frame = tick(setup, character, control);
    flight.push(frame);

    const lowerSphereBottom = frame.position[1] - character.halfSegment - character.radius;
    if (clearedBlockerAt < 0 && lowerSphereBottom > blockerTop + 0.01) clearedBlockerAt = i;
    if (crossedFarFaceAt < 0 && frame.position[0] > blockerCenterX + blockerHalfX + character.radius) {
      crossedFarFaceAt = i;
    }
  }

  const peakX = Math.max(...flight.map((frame) => frame.position[0]));
  const maxForwardAfterClear = clearedBlockerAt >= 0
    ? Math.max(...flight.slice(clearedBlockerAt).map((frame) => frame.velocity[0]))
    : Number.NaN;
  const landed = flight.findIndex((frame, index) => index > 10 && frame.support !== 'AIR');

  b3.b3DestroyWorld(setup.world);
  return {
    blockedFrames,
    firstBlockedFrame,
    heldPositionX: heldPosition[0],
    heldVelocityX: heldVelocity[0],
    neutral3VelocityX: jumpStartVelocity[0],
    neutral3DisplacementX: jumpStartPosition[0] - heldPosition[0],
    clearedBlockerAt,
    crossedFarFaceAt,
    maxForwardAfterClear,
    peakX,
    releaseDisplacementX: peakX - jumpStartPosition[0],
    landedAt: landed,
    shimStats: intendedClip ? module._stats() : null,
  };
}

function openNeutralJumpControl() {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [20, 0.5, 8]);
  const { character } = makeTrialCharacter(setup, false);
  settle(setup, character);

  for (let i = 0; i < 45; i++) tick(setup, character, intent({ forward: 1 }));
  const beforeNeutral = [...character.position];
  for (let i = 0; i < 3; i++) tick(setup, character, intent());
  const jumpStartPosition = [...character.position];
  const jumpStartVelocity = [...character.velocity];
  const flight = [];
  for (let i = 0; i < 75; i++) {
    const control = i === 0
      ? intent({ jump: true, jumpHeld: true })
      : intent({ jumpHeld: i < 8 });
    flight.push(tick(setup, character, control));
  }
  const peakX = Math.max(...flight.map((frame) => frame.position[0]));
  b3.b3DestroyWorld(setup.world);

  return {
    neutral3VelocityX: jumpStartVelocity[0],
    neutral3DisplacementX: jumpStartPosition[0] - beforeNeutral[0],
    releaseDisplacementX: peakX - jumpStartPosition[0],
  };
}

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(3) : 'n/a';
}

const current = wallNeutralJumpTrial(false);
const intended = wallNeutralJumpTrial(true);
const open = openNeutralJumpControl();

console.log('E2.3b constraint-release gameplay relevance / neutral-jump falsifier:');
console.log(
  `  current A″: blocked=${current.blockedFrames}f heldVx=${fmt(current.heldVelocityX)} neutral3Vx=${fmt(current.neutral3VelocityX)} clear=${current.clearedBlockerAt}f cross=${current.crossedFarFaceAt}f maxVxAfterClear=${fmt(current.maxForwardAfterClear)} releaseDx=${fmt(current.releaseDisplacementX)} peakX=${fmt(current.peakX)}`,
);
console.log(
  `  intended clip diagnostic: blocked=${intended.blockedFrames}f heldVx=${fmt(intended.heldVelocityX)} neutral3Vx=${fmt(intended.neutral3VelocityX)} clear=${intended.clearedBlockerAt}f cross=${intended.crossedFarFaceAt}f maxVxAfterClear=${fmt(intended.maxForwardAfterClear)} releaseDx=${fmt(intended.releaseDisplacementX)} peakX=${fmt(intended.peakX)}`,
);
console.log(
  `  open-space inertia control: neutral3Vx=${fmt(open.neutral3VelocityX)} neutral3Dx=${fmt(open.neutral3DisplacementX)} releaseDx=${fmt(open.releaseDisplacementX)}`,
);

if (current.clearedBlockerAt < 0 || intended.clearedBlockerAt < 0) {
  throw new Error('E2.3b neutral jump did not clear the low blocker in both comparison paths');
}
if (!intended.shimStats || intended.shimStats.activatedPlanes <= 0) {
  throw new Error('E2.3b intended-clip diagnostic never activated a solved plane');
}
if (intended.shimStats.maxSolveDeltaError > 2e-5) {
  throw new Error(`E2.3b intended-clip reconstruction error ${intended.shimStats.maxSolveDeltaError}`);
}

console.log('E2.3b scenario qualification PASS');
