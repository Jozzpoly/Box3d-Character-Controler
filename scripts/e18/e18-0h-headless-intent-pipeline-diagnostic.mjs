import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17IntentManipulatorCharacter } from '../../src/e17-intent-manipulator-character.js';
import {
  applyManipulationCameraDelta,
  applyManipulationWorldDelta,
  cameraRelativeManipulationDelta,
  createManipulationIntent,
  snapshotManipulationIntent,
  transportManipulationIntent,
} from '../../src/e18/manipulation-intent.js';
import {
  cameraForwardDepth,
  screenPixelDeltaToManipulationCommand,
} from '../../src/e18/manipulation-screen-mapping.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

const ZERO_INTENT = {
  moveForward: 0,
  moveRight: 0,
  forward: [0, 0, -1],
  right: [1, 0, 0],
  jump: false,
  jumpHeld: false,
  sprint: false,
};

function movementIntent(axis) {
  return {
    ...ZERO_INTENT,
    moveForward: axis === 'forward' ? 0.5 : 0,
    moveRight: axis === 'right' ? 0.5 : 0,
  };
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function length3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function distance3(a, b) {
  return length3(sub3(a, b));
}

function normalized3(v) {
  const length = length3(v);
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function createStaticBox(world, position, half) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.95;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createDynamicBox(world, position, half, density) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0.04;
  bodyDef.angularDamping = 0.08;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = density;
  shapeDef.baseMaterial.friction = 0.72;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function tick(world, character, ownerIntent = ZERO_INTENT) {
  character.preStep(DT, ownerIntent);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function createFixture() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createStaticBox(world, [0, -0.5, -1], [8, 0.5, 8]);

  const character = createE17IntentManipulatorCharacter(b3, world, {
    startPosition: [0, 0.90, 0],
    gravity: 20,
    // Keep this integration probe causally narrow. E18.0g separately qualified the
    // live/default feedback bridge; here we want input/intent/API ordering only.
    feedbackGain: 0,
    manipulatorRate: 10,
    manipulatorMaxForce: 900,
    manipulatorMaxReach: 1.60,
    manipulatorAcquireReach: 1.85,
    manipulatorBreakReach: 2.35,
  });
  const object = createDynamicBox(world, [0.65, 0.52, -0.65], [0.22, 0.50, 0.22], 130);
  for (let frame = 0; frame < 90; frame++) tick(world, character);
  if (!character.currentSupport) throw new Error('headless pipeline fixture did not settle');

  const anchor = bodyPosition(object);
  if (!character.beginManipulation(object, anchor)) {
    throw new Error(`headless pipeline failed to acquire object at ${distance3(anchor, character.bodyPosition)} m`);
  }
  const state = createManipulationIntent({
    targetWorld: anchor,
    transportOriginWorld: [...character.position],
  });
  return { world, character, object, anchor, state };
}

function pushIntentToExecutor(character, state) {
  transportManipulationIntent(state, [...character.position]);
  const accepted = character.setManipulationTarget(state.targetWorld);
  assert.equal(accepted, true, 'existing E17 executor must accept qualified E18 world target');
}

function cameraBasis(yawRadians) {
  const forward = normalized3([Math.sin(yawRadians), -0.28, -Math.cos(yawRadians)]);
  const worldUp = [0, 1, 0];
  const right = normalized3(cross3(forward, worldUp));
  const up = normalized3(cross3(right, forward));
  return { right, up, forward };
}

function runCameraInertness() {
  const { world, character, state } = createFixture();
  const initialOffset = sub3(state.targetWorld, state.transportOriginWorld);
  const targetBeforeOrbit = [...state.targetWorld];
  const carrierStart = [...state.transportOriginWorld];
  const basisBefore = cameraBasis(0);
  const basisAfter = cameraBasis(Math.PI / 4);

  // Observation changes, but there is deliberately no pointer/depth event and thus no
  // call to applyManipulationCameraDelta(...).
  for (let frame = 0; frame < 20; frame++) {
    pushIntentToExecutor(character, state);
    tick(world, character);
  }
  pushIntentToExecutor(character, state);
  const finalOffset = sub3(state.targetWorld, state.transportOriginWorld);
  const offsetDrift = distance3(initialOffset, finalOffset);
  const targetWorldTravel = distance3(targetBeforeOrbit, state.targetWorld);
  const carrierTravel = distance3(carrierStart, state.transportOriginWorld);

  assert.ok(offsetDrift < 1e-12, `camera-only change must not alter carrier-relative intent offset: ${offsetDrift}`);
  assert.ok(
    Math.abs(targetWorldTravel - carrierTravel) < 1e-9,
    'any world-target movement in camera-only scenario must come from Donor transport, not camera observation',
  );

  const report = {
    requestedCameraYawChange: Math.PI / 4,
    basisBefore,
    basisAfter,
    targetBeforeOrbit,
    targetAfterOrbit: [...state.targetWorld],
    carrierRelativeOffsetDrift: offsetDrift,
    targetWorldTravel,
    carrierTravel,
    manipulatorForce: character.lastManipulatorForce,
  };
  b3.b3DestroyWorld(world);
  return report;
}

function runExplicitScreenCommand() {
  const { world, character, state } = createFixture();
  const cameraPosition = [0, 2.2, 6];
  const basis = cameraBasis(0.31);
  const before = snapshotManipulationIntent(state);
  const forwardDepth = cameraForwardDepth(before.targetWorld, cameraPosition, basis.forward);
  const screenCommand = screenPixelDeltaToManipulationCommand({
    deltaXPx: 42,
    deltaYPx: -27,
    forwardDepth,
    verticalFovRadians: 51 * Math.PI / 180,
    viewportHeightPx: 1080,
    depthDeltaMetres: -0.12,
  });
  const expectedWorldDelta = cameraRelativeManipulationDelta({ ...basis, ...screenCommand });
  applyManipulationCameraDelta(state, { ...basis, ...screenCommand });
  const actualWorldDelta = sub3(state.targetWorld, before.targetWorld);
  assert.ok(distance3(expectedWorldDelta, actualWorldDelta) < 1e-12, 'screen mapping must feed intent exactly once');

  pushIntentToExecutor(character, state);
  tick(world, character);
  const requestedTargetError = distance3(character.manipulatorRequestedTarget, state.targetWorld);
  assert.ok(requestedTargetError < 1e-12, 'E17 requested target must equal E18 intent target at API boundary');

  const report = {
    cameraPosition,
    basis,
    pointerDeltaPx: [42, -27],
    depthDeltaMetres: -0.12,
    forwardDepth,
    metresPerPixel: screenCommand.metresPerPixel,
    expectedWorldDelta,
    actualWorldDelta,
    requestedTargetError,
    downstreamManipulatorTarget: [...character.manipulatorTarget],
    downstreamForce: character.lastManipulatorForce,
  };
  b3.b3DestroyWorld(world);
  return report;
}

function runWalkTransport(axis) {
  const { world, character, state } = createFixture();
  const carrierStart = [...character.position];
  const targetStart = [...state.targetWorld];
  const initialOffset = sub3(state.targetWorld, state.transportOriginWorld);
  let peakPreStepCarrierLag = 0;
  let peakOffsetDriftAfterStep = 0;
  const checkpoints = [];

  for (let frame = 0; frame < 60; frame++) {
    pushIntentToExecutor(character, state);
    const originUsedThisStep = [...state.transportOriginWorld];
    tick(world, character, movementIntent(axis));

    const carrierLag = distance3(originUsedThisStep, character.position);
    const offsetAfterStep = sub3(state.targetWorld, character.position);
    const offsetDriftAfterStep = distance3(initialOffset, offsetAfterStep);
    peakPreStepCarrierLag = Math.max(peakPreStepCarrierLag, carrierLag);
    peakOffsetDriftAfterStep = Math.max(peakOffsetDriftAfterStep, offsetDriftAfterStep);
    if (frame % 15 === 0 || frame === 59) {
      checkpoints.push({
        frame,
        carrier: [...character.position],
        intentTransportOrigin: [...state.transportOriginWorld],
        targetWorld: [...state.targetWorld],
        carrierLag,
        offsetDriftAfterStep,
        manipulatorError: character.lastManipulatorError,
        manipulatorForce: character.lastManipulatorForce,
      });
    }
  }

  // Catch the final carrier translation as an adapter would at the start of the next
  // frame. This proves the intent representation itself is exact while exposing that
  // the current E17 API updates Donor carrier inside preStep, one phase after an
  // external adapter can push its target.
  pushIntentToExecutor(character, state);
  const finalOffset = sub3(state.targetWorld, state.transportOriginWorld);
  const finalOffsetDrift = distance3(initialOffset, finalOffset);
  const carrierTravel = distance3(carrierStart, character.position);
  const targetTravel = distance3(targetStart, state.targetWorld);

  assert.ok(finalOffsetDrift < 1e-12, `${axis}: intent transport itself must remain exact`);
  assert.ok(peakPreStepCarrierLag > 0.01, `${axis}: current external API ordering should expose measurable one-step carrier lag`);
  assert.ok(peakPreStepCarrierLag < 0.06, `${axis}: observed lag should remain bounded to approximately one Donor frame`);
  assert.ok(Math.abs(carrierTravel - targetTravel) < 1e-6, `${axis}: after next-frame catch-up target travel must equal carrier travel`);

  const report = {
    axis,
    carrierTravel,
    targetTravelAfterCatchUp: targetTravel,
    finalCarrierRelativeOffsetDriftAfterCatchUp: finalOffsetDrift,
    peakPreStepCarrierLag,
    peakOffsetDriftAfterStep,
    checkpoints,
  };
  b3.b3DestroyWorld(world);
  return report;
}

function runReachSeparation() {
  const { world, character, state } = createFixture();
  pushIntentToExecutor(character, state);
  const rawDelta = [4.5, 0.25, -0.4];
  applyManipulationWorldDelta(state, rawDelta);
  character.setManipulationTarget(state.targetWorld);

  // Reach feasibility is resolved inside E17 preStep. Measure the clamp at that exact
  // phase, before World_Step moves the finite physical core under the reaction impulse.
  character.preStep(DT, ZERO_INTENT);
  const solveBodyPosition = [...character.bodyPosition];
  const requestedReachAtSolve = distance3(state.targetWorld, solveBodyPosition);
  const executorRequestedError = distance3(character.manipulatorRequestedTarget, state.targetWorld);
  const executedReachAtSolve = distance3(character.manipulatorTarget, solveBodyPosition);

  assert.ok(requestedReachAtSolve > 2.5, 'raw E18 intent should be allowed to exceed physical reach');
  assert.ok(executorRequestedError < 1e-12, 'executor must retain raw request separately from feasible target');
  assert.ok(executedReachAtSolve <= character.manipulatorMaxReach + 1e-6, 'finite E17 executor must clamp only downstream at solve phase');
  assert.ok(Math.abs(executedReachAtSolve - character.manipulatorMaxReach) < 1e-5, 'large request should exercise downstream reach cap');

  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  const bodyPositionAfterPhysics = [...character.bodyPosition];
  const executedReachAfterPhysics = distance3(character.manipulatorTarget, bodyPositionAfterPhysics);

  const report = {
    rawDelta,
    rawIntentTarget: [...state.targetWorld],
    solveBodyPosition,
    requestedReachAtSolve,
    executorRequestedTarget: [...character.manipulatorRequestedTarget],
    executorRequestedError,
    feasibleManipulatorTarget: [...character.manipulatorTarget],
    executedReachAtSolve,
    bodyPositionAfterPhysics,
    executedReachAfterPhysics,
    maxReach: character.manipulatorMaxReach,
    force: character.lastManipulatorForce,
    maxForce: character.manipulatorMaxForce,
    measurementBoundary: 'executedReachAtSolve is authoritative for reach-clamp qualification; executedReachAfterPhysics may exceed the cap because the finite core can move after the target was solved',
  };
  b3.b3DestroyWorld(world);
  return report;
}

const cameraInertness = runCameraInertness();
const explicitScreenCommand = runExplicitScreenCommand();
const walkForward = runWalkTransport('forward');
const walkRight = runWalkTransport('right');
const reachSeparation = runReachSeparation();

const lagSymmetry = Math.abs(walkForward.peakPreStepCarrierLag - walkRight.peakPreStepCarrierLag);
assert.ok(lagSymmetry < 1e-5, `preStep adapter timing debt should be direction-independent: ${lagSymmetry}`);

const report = {
  schema: 'e18-0h-headless-intent-pipeline-diagnostic-v1',
  boundary: 'Headless integration qualification on real E17 + Box3D. It composes the qualified incremental screen mapping, E18 ManipulationIntent, Donor carrier transport and the existing finite E17 executor without changing browser/runtime code. feedbackGain=0 isolates pipeline ordering; E18.0g separately qualifies accepted feedback. The diagnostic proves layer composition and deliberately exposes the current external setManipulationTarget-before-preStep one-frame transport lag. It does not select final device sensitivity, browser event policy, P3 orientation grammar or a new executor.',
  cameraInertness,
  explicitScreenCommand,
  walkForward,
  walkRight,
  timingDebt: {
    description: 'character.position advances inside character.preStep after an external adapter can call setManipulationTarget, so exact Donor-relative carry reaches the current E17 executor one frame late unless a later integration boundary/hook resolves target after Donor motion and before manipulator execution',
    forwardPeakLag: walkForward.peakPreStepCarrierLag,
    rightPeakLag: walkRight.peakPreStepCarrierLag,
    directionalDifference: lagSymmetry,
  },
  reachSeparation,
  verdict: 'QUALIFIED_WITH_TIMING_DEBT',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
