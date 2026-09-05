import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17IntentManipulatorCharacter } from '../../src/e17-intent-manipulator-character.js';

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

function tick(world, character) {
  character.preStep(DT, ZERO_INTENT);
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
    // Use the live/default E15 consequence bridge. This is the path through which
    // physical body response is intentionally allowed to influence Donor motion.
    feedbackGain: 1,
    manipulatorRate: 10,
    manipulatorMaxForce: 900,
    manipulatorMaxReach: 1.60,
    manipulatorAcquireReach: 1.85,
    manipulatorBreakReach: 2.35,
  });
  let object = null;
  if (withObject) object = createDynamicBox(world, [0.65, 0.52, -0.65], [0.22, 0.50, 0.22], 130);
  for (let i = 0; i < 90; i++) tick(world, character);
  if (!character.currentSupport) throw new Error('accepted-feedback fixture did not settle');
  return { world, character, object };
}

function makeTracker(character) {
  const carrierStart = [...character.position];
  const coreStart = [...character.bodyPosition];
  let previousCarrier = [...carrierStart];
  let previousCore = [...coreStart];
  let carrierPath = 0;
  let corePath = 0;
  let residualPath = 0;
  let peakResidual = 0;
  const checkpoints = [];

  function sample(frame, extra = null) {
    const carrier = [...character.position];
    const core = [...character.bodyPosition];
    const carrierDelta = sub3(carrier, carrierStart);
    const coreDelta = sub3(core, coreStart);
    const residual = sub3(coreDelta, carrierDelta);
    const carrierStep = sub3(carrier, previousCarrier);
    const coreStep = sub3(core, previousCore);
    const residualStep = sub3(coreStep, carrierStep);
    carrierPath += length3(carrierStep);
    corePath += length3(coreStep);
    residualPath += length3(residualStep);
    peakResidual = Math.max(peakResidual, length3(residual));
    previousCarrier = [...carrier];
    previousCore = [...core];

    if (frame % 10 === 0 || extra?.forceCheckpoint) {
      checkpoints.push({
        frame,
        carrier,
        core,
        carrierDelta,
        coreDelta,
        residualCoreBeyondCarrier: residual,
        residualMagnitude: length3(residual),
        bodyFeedbackImpulse: character.lastBodyFeedbackImpulse,
        bodyFeedbackClipped: character.lastFeedbackClipped,
        ...(extra ?? {}),
      });
    }
  }

  function report() {
    const carrierDelta = sub3(character.position, carrierStart);
    const coreDelta = sub3(character.bodyPosition, coreStart);
    const residual = sub3(coreDelta, carrierDelta);
    return {
      carrierStart,
      carrierEnd: [...character.position],
      coreStart,
      coreEnd: [...character.bodyPosition],
      carrierNetTravel: length3(carrierDelta),
      coreNetTravel: length3(coreDelta),
      carrierPath,
      corePath,
      finalResidualCoreBeyondCarrier: residual,
      finalResidualMagnitude: length3(residual),
      peakResidualCoreBeyondCarrier: peakResidual,
      residualDifferentialPath: residualPath,
      checkpoints,
    };
  }

  return { sample, report };
}

function runExternalImpulse() {
  const { world, character } = createFixture();
  const tracker = makeTracker(character);
  const impulse = [105, 0, 0];
  let peakFeedbackImpulse = 0;
  let clippedFrames = 0;

  for (let frame = 0; frame < 60; frame++) {
    if (frame === 0) {
      character.preStep(DT, ZERO_INTENT);
      character.applyBodyImpulse(impulse);
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
    } else {
      tick(world, character);
    }
    peakFeedbackImpulse = Math.max(peakFeedbackImpulse, character.lastBodyFeedbackImpulse);
    if (character.lastFeedbackClipped) clippedFrames += 1;
    tracker.sample(frame, frame === 0 ? { injectedImpulse: impulse, forceCheckpoint: true } : null);
  }

  const report = {
    ...tracker.report(),
    injectedImpulse: impulse,
    injectedDeltaV: length3(impulse) / character.bodyMass,
    peakFeedbackImpulse,
    clippedFrames,
  };
  b3.b3DestroyWorld(world);
  return report;
}

function runManipulatorRecoil() {
  const { world, character, object } = createFixture({ withObject: true });
  const anchor = bodyPosition(object);
  if (!character.beginManipulation(object, anchor)) {
    throw new Error(`accepted-feedback recoil failed to acquire object; distance=${distance3(anchor, character.bodyPosition)}`);
  }

  const tracker = makeTracker(character);
  const explicitDelta = [-0.45, 0, 0];
  let peakFeedbackImpulse = 0;
  let clippedFrames = 0;
  let peakManipulatorForce = 0;

  for (let frame = 0; frame < 60; frame++) {
    const u = Math.min(1, (frame + 1) / 12);
    const explicitTarget = add3(anchor, scale3(explicitDelta, u));
    character.setManipulationTarget(explicitTarget);
    tick(world, character);
    peakFeedbackImpulse = Math.max(peakFeedbackImpulse, character.lastBodyFeedbackImpulse);
    peakManipulatorForce = Math.max(peakManipulatorForce, character.lastManipulatorForce);
    if (character.lastFeedbackClipped) clippedFrames += 1;
    tracker.sample(frame, {
      explicitTarget,
      manipulatorForce: character.lastManipulatorForce,
      forceCheckpoint: frame === 11 || frame === 59,
    });
    if (!character.manipulatedBody) break;
  }

  const report = {
    ...tracker.report(),
    explicitTargetDelta: explicitDelta,
    explicitTargetTravel: length3(explicitDelta),
    objectNetTravel: distance3(anchor, bodyPosition(object)),
    peakManipulatorForce,
    peakFeedbackImpulse,
    clippedFrames,
    releaseReason: character.lastManipulatorReleaseReason,
  };
  b3.b3DestroyWorld(world);
  return report;
}

const externalImpulse = runExternalImpulse();
const manipulatorRecoil = runManipulatorRecoil();

const report = {
  schema: 'e18-0g-accepted-feedback-transport-diagnostic-v0',
  boundary: 'Real E17/E15 hybrid + Box3D with the live/default feedbackGain=1. The diagnostic asks whether the accepted body-response -> Donor bridge already carries physical consequence into the high-level carrier, and how much additional transient motion a direct physical-core transport origin would add beyond that carrier path. Core-relative target motion remains counterfactual and is never fed back into the manipulator. This does not alter runtime mechanics or claim the E15 bridge itself is final embodiment architecture.',
  interpretationKey: {
    carrierPath: 'physical consequence that has already reached the accepted Donor carrier through E15 feedback',
    residualCoreBeyondCarrier: 'additional solver-core translation that a core-relative transport frame would add on top of the already-propagated carrier consequence',
    residualDifferentialPath: 'transient extra target motion that would bypass the accepted consequence bridge if core were read directly',
  },
  externalImpulse,
  manipulatorRecoil,
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
