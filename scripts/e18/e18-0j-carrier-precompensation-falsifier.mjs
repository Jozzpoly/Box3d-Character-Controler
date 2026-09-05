import assert from 'node:assert/strict';
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

const MOVE_RIGHT = {
  ...ZERO_INTENT,
  moveRight: 1,
};

function horizontalLength(v) {
  return Math.hypot(v[0], v[2]);
}

function horizontalDelta(a, b) {
  return [a[0] - b[0], 0, a[2] - b[2]];
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

function tick(world, character, intent = ZERO_INTENT) {
  character.preStep(DT, intent);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function createFixture({ wall }) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createStaticBox(world, [0, -0.5, 0], [12, 0.5, 8]);

  // Choose the wall so the accepted Donor reaches near steady-state speed before
  // impact. Its left face is x=1.875 m; with the default 0.36 m capsule radius the
  // carrier center should stop around x=1.515 m.
  const wallCenterX = 2.025;
  const wallHalfX = 0.15;
  const wallLeftX = wallCenterX - wallHalfX;
  if (wall) createStaticBox(world, [wallCenterX, 1.5, 0], [wallHalfX, 2.0, 4.0]);

  const character = createE17IntentManipulatorCharacter(b3, world, {
    startPosition: [0, 0.90, 0],
    gravity: 20,
    // Keep the carrier prediction question isolated from E15 body feedback and from
    // manipulation recoil. E18.0g already qualifies the accepted feedback bridge.
    feedbackGain: 0,
  });

  for (let frame = 0; frame < 90; frame++) tick(world, character);
  if (!character.currentSupport) throw new Error('E18.0j fixture did not settle on ground');

  return { world, character, wallLeftX };
}

function runScenario(name, wall) {
  const { world, character, wallLeftX } = createFixture({ wall });
  let peakPredictionError = 0;
  let peakPredictedStep = 0;
  let peakRealizedStep = 0;
  let peakSample = null;
  let firstLargeMismatch = null;
  const checkpoints = [];

  for (let frame = 0; frame < 70; frame++) {
    const before = [...character.position];

    // This is the strongest simple pre-compensation signal available before the
    // Donor's mover solve: after preStep, velocity expresses the movement target that
    // _solveMovement will attempt as dt * velocity. It does NOT yet know the realized
    // CastMover/plane-constrained displacement.
    character.preStep(DT, MOVE_RIGHT);
    const predictedDelta = [character.velocity[0] * DT, 0, character.velocity[2] * DT];
    const predictedStep = horizontalLength(predictedDelta);

    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);

    const realizedDelta = horizontalDelta(character.position, before);
    const predictionErrorVector = horizontalDelta(predictedDelta, realizedDelta);
    const realizedStep = horizontalLength(realizedDelta);
    const predictionError = horizontalLength(predictionErrorVector);

    peakPredictedStep = Math.max(peakPredictedStep, predictedStep);
    peakRealizedStep = Math.max(peakRealizedStep, realizedStep);
    if (predictionError > peakPredictionError) {
      peakPredictionError = predictionError;
      peakSample = {
        frame,
        before,
        after: [...character.position],
        velocityAfterPreStep: [...character.velocity],
        predictedDelta,
        realizedDelta,
        predictionErrorVector,
        predictionError,
        planeCountAfterSolve: character.lastPlaneCount,
      };
    }
    if (!firstLargeMismatch && predictionError > 0.02) {
      firstLargeMismatch = {
        frame,
        predictedDelta,
        realizedDelta,
        predictionError,
        carrierPositionAfterSolve: [...character.position],
      };
    }

    if (frame % 10 === 0 || frame === 69) {
      checkpoints.push({
        frame,
        carrier: [...character.position],
        predictedStep,
        realizedStep,
        predictionError,
        planeCount: character.lastPlaneCount,
      });
    }
  }

  const finalPosition = [...character.position];
  const report = {
    name,
    wall,
    wallLeftX: wall ? wallLeftX : null,
    capsuleRadius: character.radius,
    expectedBlockedCenterX: wall ? wallLeftX - character.radius : null,
    finalPosition,
    peakPredictedStep,
    peakRealizedStep,
    peakPredictionError,
    firstLargeMismatch,
    peakSample,
    checkpoints,
  };

  b3.b3DestroyWorld(world);
  return report;
}

const open = runScenario('open-space-control', false);
const blocked = runScenario('static-wall-blocked', true);

assert.ok(open.peakPredictedStep > 0.08, 'open control must reach accepted Donor steady-state movement scale');
assert.ok(
  open.peakPredictionError < 1e-5,
  `without blocking geometry dt*preStep velocity should predict horizontal Donor displacement: ${open.peakPredictionError}`,
);
assert.ok(
  blocked.peakPredictionError > 0.02,
  `wall solve must falsify naive pre-compensation by a material amount: ${blocked.peakPredictionError}`,
);
assert.ok(blocked.firstLargeMismatch, 'blocked scenario must expose at least one >2 cm commanded-vs-realized mismatch');
assert.ok(
  blocked.finalPosition[0] <= blocked.expectedBlockedCenterX + 0.02,
  `Donor carrier must remain blocked by wall rather than pass through it: ${blocked.finalPosition[0]}`,
);
assert.ok(
  blocked.peakPredictionError > open.peakPredictionError * 1000,
  'collision-dependent prediction error must be decisively larger than open-space numerical error',
);

const report = {
  schema: 'e18-0j-carrier-precompensation-falsifier-v1',
  boundary: 'Counterfactual carrier-transport diagnostic on the accepted Donor movement layer inherited by E17. It does not modify manipulation/runtime behavior. It asks whether a manipulation adapter may safely eliminate E18.0h outer-step phase separation by pre-transporting target intent from dt*preStep velocity before ControllerOwnedCharacter._solveMovement resolves mover planes and CastMover clipping.',
  open,
  blocked,
  interpretation: {
    safeClaim: 'Pre-solve velocity predicts open-space carrier translation but does not determine realized Donor translation when collision geometry constrains the mover. Therefore a generic pre-compensation policy based only on commanded/preStep velocity can inject target motion that the carrier never realizes.',
    nonClaim: 'This does not prove the existing one-outer-step phase separation is perceptually harmful or harmless. It only rejects naive pre-solve carrier prediction as a causally faithful universal fix.',
  },
  verdict: 'NAIVE_PRECOMPENSATION_REJECTED_IF_BLOCKED_DIVERGENCE_PASSES',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
