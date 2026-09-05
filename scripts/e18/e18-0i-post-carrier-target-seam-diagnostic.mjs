import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { E17IntentManipulatorCharacter } from '../../src/e17-intent-manipulator-character.js';
import {
  createManipulationIntent,
  transportManipulationIntent,
} from '../../src/e18/manipulation-intent.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const SETTLE_FRAMES = 90;
const ACTIVE_FRAMES = 30;
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

class PostCarrierIntentCharacter extends E17IntentManipulatorCharacter {
  constructor(b3Api, world, options = {}) {
    super(b3Api, world, options);
    this.e18IntentState = null;
    this.postCarrierResolveCount = 0;
  }

  bindIntentState(state) {
    this.e18IntentState = state;
  }

  _resolveManipulatorRequestedTargetAfterCarrierStep() {
    if (!this.e18IntentState || !this.manipulatedBody) return;
    transportManipulationIntent(this.e18IntentState, [...this.position]);
    const accepted = this.setManipulationTarget(this.e18IntentState.targetWorld);
    if (!accepted) throw new Error('post-carrier E18 target rejected by E17 API');
    this.postCarrierResolveCount += 1;
  }
}

function tick(world, character, ownerIntent = ZERO_INTENT) {
  character.preStep(DT, ownerIntent);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function createFixture(policy) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createStaticBox(world, [0, -0.5, -1], [8, 0.5, 8]);

  const CharacterClass = policy === 'post-carrier-hook'
    ? PostCarrierIntentCharacter
    : E17IntentManipulatorCharacter;
  const character = new CharacterClass(b3, world, {
    startPosition: [0, 0.90, 0],
    gravity: 20,
    feedbackGain: 0,
    manipulatorRate: 10,
    manipulatorMaxForce: 900,
    manipulatorMaxReach: 1.60,
    manipulatorAcquireReach: 1.85,
    manipulatorBreakReach: 2.35,
  });
  const object = createDynamicBox(world, [0.65, 0.52, -0.65], [0.22, 0.50, 0.22], 130);

  for (let frame = 0; frame < SETTLE_FRAMES; frame++) tick(world, character);
  if (!character.currentSupport) throw new Error(`${policy}: fixture did not settle`);

  const anchor = bodyPosition(object);
  if (!character.beginManipulation(object, anchor)) {
    throw new Error(`${policy}: failed to acquire object; distance=${distance3(anchor, character.bodyPosition)}`);
  }

  const state = createManipulationIntent({
    targetWorld: anchor,
    transportOriginWorld: [...character.position],
  });
  if (policy === 'post-carrier-hook') character.bindIntentState(state);

  return { world, character, object, anchor, state };
}

function runScenario(policy, axis) {
  const { world, character, object, anchor, state } = createFixture(policy);
  const carrierStart = [...character.position];
  const objectStart = bodyPosition(object);
  const initialCarrierRelativeTargetOffset = sub3(anchor, carrierStart);
  let peakRequestedTargetCarrierDriftAtSolve = 0;
  let meanRequestedTargetCarrierDriftAtSolve = 0;
  let peakManipulatorError = 0;
  let peakManipulatorForce = 0;
  let saturationFrames = 0;
  let releaseFrame = null;
  const checkpoints = [];

  for (let frame = 0; frame < ACTIVE_FRAMES; frame++) {
    if (policy === 'external-pre-step') {
      transportManipulationIntent(state, [...character.position]);
      const accepted = character.setManipulationTarget(state.targetWorld);
      if (!accepted) throw new Error('external pre-step target rejected by E17 API');
    }

    character.preStep(DT, movementIntent(axis));

    // Measure after Donor motion and after the optional post-carrier hook, but before
    // World_Step can add unrelated solver motion. This is the exact E17 solve phase.
    const requestedOffsetAtSolve = sub3(character.manipulatorRequestedTarget, character.position);
    const driftAtSolve = distance3(requestedOffsetAtSolve, initialCarrierRelativeTargetOffset);
    peakRequestedTargetCarrierDriftAtSolve = Math.max(peakRequestedTargetCarrierDriftAtSolve, driftAtSolve);
    meanRequestedTargetCarrierDriftAtSolve += driftAtSolve;
    peakManipulatorError = Math.max(peakManipulatorError, character.lastManipulatorError);
    peakManipulatorForce = Math.max(peakManipulatorForce, character.lastManipulatorForce);
    if (character.lastManipulatorForce >= character.manipulatorMaxForce - 1e-4) saturationFrames += 1;

    if (frame % 5 === 0 || frame === ACTIVE_FRAMES - 1) {
      checkpoints.push({
        frame,
        carrier: [...character.position],
        requestedTarget: [...character.manipulatorRequestedTarget],
        requestedOffsetAtSolve,
        carrierRelativeTargetDriftAtSolve: driftAtSolve,
        feasibleTarget: [...character.manipulatorTarget],
        manipulatorError: character.lastManipulatorError,
        manipulatorForce: character.lastManipulatorForce,
      });
    }

    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
    if (!character.manipulatedBody) {
      releaseFrame = frame;
      break;
    }
  }

  const sampledFrames = releaseFrame === null ? ACTIVE_FRAMES : releaseFrame + 1;
  meanRequestedTargetCarrierDriftAtSolve /= sampledFrames;
  const carrierEnd = [...character.position];
  const objectEnd = bodyPosition(object);
  const report = {
    policy,
    axis,
    sampledFrames,
    carrierTravel: distance3(carrierStart, carrierEnd),
    objectTravel: distance3(objectStart, objectEnd),
    initialCarrierRelativeTargetOffset,
    peakRequestedTargetCarrierDriftAtSolve,
    meanRequestedTargetCarrierDriftAtSolve,
    peakManipulatorError,
    peakManipulatorForce,
    saturationFrames,
    forceCapOccupancy: saturationFrames / sampledFrames,
    releaseFrame,
    releaseReason: character.lastManipulatorReleaseReason,
    postCarrierResolveCount: character.postCarrierResolveCount ?? 0,
    checkpoints,
  };
  b3.b3DestroyWorld(world);
  return report;
}

function compareAxis(axis) {
  const external = runScenario('external-pre-step', axis);
  const postCarrier = runScenario('post-carrier-hook', axis);

  assert.equal(external.releaseFrame, null, `${axis}: external reference must remain acquired`);
  assert.equal(postCarrier.releaseFrame, null, `${axis}: post-carrier variant must remain acquired`);
  assert.ok(
    external.peakRequestedTargetCarrierDriftAtSolve > 0.01,
    `${axis}: external ordering must reproduce measurable carrier timing lag`,
  );
  assert.ok(
    postCarrier.peakRequestedTargetCarrierDriftAtSolve < 1e-12,
    `${axis}: post-carrier hook must remove carrier-relative target lag at solve phase`,
  );
  assert.equal(
    postCarrier.postCarrierResolveCount,
    ACTIVE_FRAMES,
    `${axis}: hook must resolve exactly once per active preStep`,
  );
  assert.ok(
    Math.abs(external.carrierTravel - postCarrier.carrierTravel) < 1e-9,
    `${axis}: feedbackGain=0 Donor trajectory must remain identical across target-resolution timing`,
  );

  return {
    axis,
    externalPreStep: external,
    postCarrierHook: postCarrier,
    contrast: {
      peakLagRemoved: external.peakRequestedTargetCarrierDriftAtSolve - postCarrier.peakRequestedTargetCarrierDriftAtSolve,
      meanLagRemoved: external.meanRequestedTargetCarrierDriftAtSolve - postCarrier.meanRequestedTargetCarrierDriftAtSolve,
      objectTravelDelta: postCarrier.objectTravel - external.objectTravel,
      forceCapOccupancyDelta: postCarrier.forceCapOccupancy - external.forceCapOccupancy,
      peakManipulatorErrorDelta: postCarrier.peakManipulatorError - external.peakManipulatorError,
    },
  };
}

const forward = compareAxis('forward');
const right = compareAxis('right');
const externalLagDirectionalDifference = Math.abs(
  forward.externalPreStep.peakRequestedTargetCarrierDriftAtSolve -
  right.externalPreStep.peakRequestedTargetCarrierDriftAtSolve,
);
const hookLagDirectionalDifference = Math.abs(
  forward.postCarrierHook.peakRequestedTargetCarrierDriftAtSolve -
  right.postCarrierHook.peakRequestedTargetCarrierDriftAtSolve,
);

assert.ok(
  externalLagDirectionalDifference < 1e-5,
  `external timing debt should be direction-independent: ${externalLagDirectionalDifference}`,
);
assert.ok(
  hookLagDirectionalDifference < 1e-12,
  `post-carrier resolution should stay direction-independent: ${hookLagDirectionalDifference}`,
);

const report = {
  schema: 'e18-0i-post-carrier-target-seam-diagnostic-v0',
  boundary: 'Branch-only causal A/B on real E17 + Box3D. Both variants use the same one-point actuator, masses, reach, force cap, movement input, object and ManipulationIntent transport semantics. The only requested difference is target-resolution phase: current-style external adapter before E17 preStep versus the new no-op-by-default E17 extension seam after Donor carrier motion and before reach/impulse solve. feedbackGain=0 prevents consequence feedback from changing Donor trajectory. This qualifies timing semantics only; it does not promote a browser UX, tune the executor or claim improved Owner feel.',
  fixedVariables: {
    dt: DT,
    substeps: SUBSTEPS,
    activeFrames: ACTIVE_FRAMES,
    feedbackGain: 0,
    manipulatorRate: 10,
    manipulatorMaxForce: 900,
    manipulatorMaxReach: 1.60,
    movementMagnitude: 0.5,
  },
  forward,
  right,
  directionalChecks: {
    externalLagDirectionalDifference,
    hookLagDirectionalDifference,
  },
  verdict: 'PASS_IF_POST_CARRIER_REMOVES_ONLY_TARGET_PHASE_LAG',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
