import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17IntentManipulatorCharacter } from '../../src/e17-intent-manipulator-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const SETTLE_FRAMES = 90;
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

const WALK_FORWARD = {
  ...ZERO_INTENT,
  moveForward: 0.5,
};

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
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

function tick(world, character, intent = ZERO_INTENT) {
  character.preStep(DT, intent);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function createFixture({ withObject = false } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createStaticBox(world, [0, -0.5, -1], [8, 0.5, 8]);

  const character = createE17IntentManipulatorCharacter(b3, world, {
    startPosition: [0, 0.90, 0],
    gravity: 20,
    // Deliberately isolate transport-origin semantics from E15's accepted
    // body-response -> Donor feedback bridge. The physical core may move, but that
    // motion is not allowed to move the carrier in this diagnostic.
    feedbackGain: 0,
    manipulatorRate: 10,
    manipulatorMaxForce: 900,
    manipulatorMaxReach: 1.60,
    manipulatorAcquireReach: 1.85,
    manipulatorBreakReach: 2.35,
  });

  let object = null;
  if (withObject) {
    object = createDynamicBox(world, [0.65, 0.52, -0.65], [0.22, 0.50, 0.22], 130);
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) tick(world, character);
  if (!character.currentSupport) throw new Error('transport-origin fixture did not settle onto support');

  return { world, character, object };
}

function makeOriginTracker(character) {
  const carrierStart = [...character.position];
  const coreStart = [...character.bodyPosition];
  let previousCarrier = [...carrierStart];
  let previousCore = [...coreStart];
  let peakOriginDivergence = 0;
  let differentialMotionPath = 0;
  let peakCarrierStep = 0;
  let peakCoreStep = 0;
  const checkpoints = [];

  function sample(frame, extra = null) {
    const carrier = [...character.position];
    const core = [...character.bodyPosition];
    const carrierDelta = sub3(carrier, carrierStart);
    const coreDelta = sub3(core, coreStart);
    const originDivergence = sub3(coreDelta, carrierDelta);
    const carrierStep = sub3(carrier, previousCarrier);
    const coreStep = sub3(core, previousCore);
    const differentialStep = sub3(coreStep, carrierStep);

    const divergenceMagnitude = length3(originDivergence);
    peakOriginDivergence = Math.max(peakOriginDivergence, divergenceMagnitude);
    differentialMotionPath += length3(differentialStep);
    peakCarrierStep = Math.max(peakCarrierStep, length3(carrierStep));
    peakCoreStep = Math.max(peakCoreStep, length3(coreStep));
    previousCarrier = [...carrier];
    previousCore = [...core];

    if (frame % 10 === 0 || extra?.forceCheckpoint) {
      checkpoints.push({
        frame,
        carrier,
        core,
        carrierDelta,
        coreDelta,
        originDivergence,
        divergenceMagnitude,
        ...(extra ?? {}),
      });
    }

    return { carrier, core, carrierDelta, coreDelta, originDivergence, divergenceMagnitude };
  }

  function report() {
    const carrierEnd = [...character.position];
    const coreEnd = [...character.bodyPosition];
    const carrierDelta = sub3(carrierEnd, carrierStart);
    const coreDelta = sub3(coreEnd, coreStart);
    const finalOriginDivergence = sub3(coreDelta, carrierDelta);
    return {
      carrierStart,
      carrierEnd,
      coreStart,
      coreEnd,
      carrierTravel: length3(carrierDelta),
      coreTravel: length3(coreDelta),
      finalOriginDivergence,
      finalOriginDivergenceMagnitude: length3(finalOriginDivergence),
      peakOriginDivergence,
      differentialMotionPath,
      peakCarrierStep,
      peakCoreStep,
      checkpoints,
    };
  }

  return { sample, report };
}

function runQuietControl() {
  const { world, character } = createFixture();
  const tracker = makeOriginTracker(character);
  for (let frame = 0; frame < 60; frame++) {
    tick(world, character);
    tracker.sample(frame);
  }
  const report = tracker.report();
  b3.b3DestroyWorld(world);
  return report;
}

function runDonorWalk() {
  const { world, character } = createFixture();
  const tracker = makeOriginTracker(character);
  for (let frame = 0; frame < 60; frame++) {
    tick(world, character, WALK_FORWARD);
    tracker.sample(frame);
  }
  const report = tracker.report();
  b3.b3DestroyWorld(world);
  return report;
}

function runManipulatorRecoil() {
  const { world, character, object } = createFixture({ withObject: true });
  const anchor = bodyPosition(object);
  if (!character.beginManipulation(object, anchor)) {
    throw new Error(`recoil fixture failed to acquire object; distance=${distance3(anchor, character.bodyPosition)}`);
  }

  const tracker = makeOriginTracker(character);
  const explicitDelta = [-0.45, 0, 0];
  const objectStart = bodyPosition(object);
  let saturationFrames = 0;
  let peakManipulatorForce = 0;
  let peakManipulatorError = 0;
  let peakCounterfactualTargetError = 0;

  for (let frame = 0; frame < 60; frame++) {
    const u = Math.min(1, (frame + 1) / 12);
    const explicitTarget = add3(anchor, scale3(explicitDelta, u));
    character.setManipulationTarget(explicitTarget);
    tick(world, character);

    const sample = tracker.sample(frame, {
      explicitTarget,
      manipulatorForce: character.lastManipulatorForce,
      manipulatorError: character.lastManipulatorError,
      forceCheckpoint: frame === 11 || frame === 59,
    });

    // Counterfactual only: if transport used physical-core translation, this vector
    // would be added on top of the explicit Owner command even though it was created
    // by the manipulator's own equal-and-opposite physical reaction.
    peakCounterfactualTargetError = Math.max(
      peakCounterfactualTargetError,
      sample.divergenceMagnitude,
    );
    peakManipulatorForce = Math.max(peakManipulatorForce, character.lastManipulatorForce);
    peakManipulatorError = Math.max(peakManipulatorError, character.lastManipulatorError);
    if (character.lastManipulatorForce >= character.manipulatorMaxForce - 1e-4) saturationFrames += 1;
    if (!character.manipulatedBody) break;
  }

  const origin = tracker.report();
  const objectEnd = bodyPosition(object);
  const report = {
    ...origin,
    selected: true,
    explicitTargetDelta: explicitDelta,
    explicitTargetTravel: length3(explicitDelta),
    peakCounterfactualCoreTransportError: peakCounterfactualTargetError,
    objectStart,
    objectEnd,
    objectNetTravel: distance3(objectStart, objectEnd),
    peakManipulatorForce,
    peakManipulatorError,
    saturationFrames,
    releaseReason: character.lastManipulatorReleaseReason,
  };
  b3.b3DestroyWorld(world);
  return report;
}

function runExternalCoreImpulse() {
  const { world, character } = createFixture();
  const tracker = makeOriginTracker(character);
  const injectedImpulse = [105, 0, 0];

  for (let frame = 0; frame < 60; frame++) {
    if (frame === 0) {
      // Apply after preStep so this acts like an external physical consequence that
      // the follow controller could not pre-cancel in the same frame.
      character.preStep(DT, ZERO_INTENT);
      character.applyBodyImpulse(injectedImpulse);
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
    } else {
      tick(world, character);
    }
    tracker.sample(frame, frame === 0 ? { injectedImpulse, forceCheckpoint: true } : null);
  }

  const report = {
    ...tracker.report(),
    injectedImpulse,
    injectedDeltaV: length3(injectedImpulse) / character.bodyMass,
    bodyMass: character.bodyMass,
  };
  b3.b3DestroyWorld(world);
  return report;
}

const quiet = runQuietControl();
const donorWalk = runDonorWalk();
const manipulatorRecoil = runManipulatorRecoil();
const externalCoreImpulse = runExternalCoreImpulse();

const report = {
  schema: 'e18-0f-transport-origin-physical-diagnostic-v0',
  boundary: 'Real E17/E15 hybrid + Box3D diagnostic only. feedbackGain=0 deliberately isolates transport-origin semantics from E15 body-response -> Donor feedback. core-relative target motion is counterfactual and is never fed into the manipulator. The probe distinguishes ordinary finite follow lag, manipulator self-reaction and an external physical perturbation. It does not yet promote carrier-relative transport as final Owner UX or alter runtime mechanics.',
  interpretationKey: {
    originDivergence: 'translation(core) - translation(Donor carrier) since scenario start; this is exactly the extra world-target translation a core-relative transport policy would add versus carrier-relative transport',
    differentialMotionPath: 'sum of per-frame |delta(core)-delta(carrier)|; exposes transient extra target motion even when final offsets later recenter',
  },
  quiet,
  donorWalk,
  manipulatorRecoil,
  externalCoreImpulse,
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
