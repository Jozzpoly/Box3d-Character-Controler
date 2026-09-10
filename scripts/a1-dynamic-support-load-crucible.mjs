import fs from 'node:fs';
import path from 'node:path';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter, CURRENT_DONOR_REVISION } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 20;
const PLAYER_MASS = 80;
const EXPECTED_PLAYER_WEIGHT_IMPULSE = PLAYER_MASS * GRAVITY * DT;
const WARMUP_TICKS = 180;
const SAMPLE_TICKS = 120;
const PLATFORM_HALF = [1.5, 0.22, 1.5];
const PLATFORM_VOLUME = 8 * PLATFORM_HALF[0] * PLATFORM_HALF[1] * PLATFORM_HALF[2];

const CASES = [
  { name: 'yard-light-slab', targetMass: 28.15488 },
  { name: 'equal-player-mass', targetMass: 80 },
  { name: 'yard-medium-slab', targetMass: 82.368 },
  { name: 'heavy-320kg', targetMass: 320 },
];

function enumValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? 0.5 * (sorted[middle - 1] + sorted[middle])
    : sorted[middle];
}

function min(values) {
  return values.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
}

function max(values) {
  return values.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
}

function neutralIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function createBox(world, type, position, half, options = {}) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  bodyDef.linearDamping = options.linearDamping ?? 0;
  bodyDef.angularDamping = options.angularDamping ?? 0;
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
  const body = b3.b3CreateBody(world, bodyDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = options.friction ?? 0.9;
  shapeDef.baseMaterial.restitution = 0;
  if (type === 'dynamic') shapeDef.density = options.density ?? 1;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function bodyVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function step(world, character, platform, collect = false) {
  character.preStep(DT, neutralIntent());
  b3.b3World_Step(world, DT, SUBSTEPS);
  const velocityBeforePost = bodyVelocity(platform);
  const characterVyBeforePost = character.velocity[1];
  character.postStep(DT);
  const velocityAfterPost = bodyVelocity(platform);
  const characterVyAfterPost = character.velocity[1];

  if (!collect) return null;
  const mass = b3.b3Body_GetMass(platform);
  const signedManualImpulseY = mass * (velocityAfterPost[1] - velocityBeforePost[1]);
  return {
    signedManualImpulseY,
    downwardManualImpulse: -signedManualImpulseY,
    platformVyBeforePost: velocityBeforePost[1],
    platformVyAfterPost: velocityAfterPost[1],
    characterVyBeforePost,
    characterVyAfterPost,
    dynamicContacts: character.lastDynamicContacts,
    supportType: character.currentSupport?.type ?? 'AIR',
    contactImpulse: character.lastContactImpulse,
    platformY: bodyPosition(platform)[1],
  };
}

function runCase(testCase) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);

  try {
    createBox(world, 'static', [0, -0.25, 0], [6, 0.25, 6], { friction: 1.0 });
    const platformTop = 2 * PLATFORM_HALF[1];
    const platform = createBox(
      world,
      'dynamic',
      [0, PLATFORM_HALF[1], 0],
      PLATFORM_HALF,
      {
        density: testCase.targetMass / PLATFORM_VOLUME,
        friction: 1.0,
      },
    );
    const actualMass = b3.b3Body_GetMass(platform);
    const massErrorRatio = Math.abs(actualMass - testCase.targetMass) / testCase.targetMass;
    if (massErrorRatio > 1e-4) {
      throw new Error(`${testCase.name}: mass mismatch target=${testCase.targetMass} actual=${actualMass}`);
    }

    const character = createCurrentDonorCharacter(b3, world, {
      startPosition: [0, 2, 0],
      gravity: GRAVITY,
      virtualMass: PLAYER_MASS,
    });
    character.reset([0, platformTop + character.halfHeight + 0.015, 0]);

    for (let i = 0; i < WARMUP_TICKS; i++) step(world, character, platform, false);
    if (character.currentSupport?.type !== 'DYNAMIC') {
      throw new Error(`${testCase.name}: failed to acquire dynamic support after warmup`);
    }

    const samples = [];
    for (let i = 0; i < SAMPLE_TICKS; i++) {
      const sample = step(world, character, platform, true);
      if (!Number.isFinite(sample.downwardManualImpulse)) {
        throw new Error(`${testCase.name}: non-finite manual load sample at tick ${i}`);
      }
      samples.push(sample);
    }

    const loaded = samples.filter((sample) => sample.dynamicContacts > 0 && sample.supportType === 'DYNAMIC');
    if (loaded.length < SAMPLE_TICKS * 0.9) {
      throw new Error(`${testCase.name}: dynamic support/contact not sustained (${loaded.length}/${SAMPLE_TICKS})`);
    }

    const impulses = loaded.map((sample) => sample.downwardManualImpulse);
    const beforePostVy = loaded.map((sample) => sample.platformVyBeforePost);
    const characterBeforePostVy = loaded.map((sample) => sample.characterVyBeforePost);
    const characterAfterPostVy = loaded.map((sample) => sample.characterVyAfterPost);
    const platformYs = loaded.map((sample) => sample.platformY);
    const meanImpulse = mean(impulses);
    const medianImpulse = median(impulses);
    const ratio = meanImpulse / EXPECTED_PLAYER_WEIGHT_IMPULSE;
    const apparentPlayerMass = meanImpulse / (GRAVITY * DT);
    const reducedMassPredictionRatio = actualMass / (PLAYER_MASS + actualMass);

    return {
      name: testCase.name,
      targetMassKg: testCase.targetMass,
      actualMassKg: actualMass,
      loadedSamples: loaded.length,
      expectedPlayerWeightImpulseNsPerTick: EXPECTED_PLAYER_WEIGHT_IMPULSE,
      manualDownwardImpulseNs: {
        mean: meanImpulse,
        median: medianImpulse,
        min: min(impulses),
        max: max(impulses),
      },
      observedWeightRatio: ratio,
      missingWeightRatio: 1 - ratio,
      apparentSupportedPlayerMassKg: apparentPlayerMass,
      simpleReducedMassPredictionRatio: reducedMassPredictionRatio,
      ratioMinusSimplePrediction: ratio - reducedMassPredictionRatio,
      platformVyBeforePostMs: {
        mean: mean(beforePostVy),
        min: min(beforePostVy),
        max: max(beforePostVy),
      },
      characterVyBeforePostMs: {
        mean: mean(characterBeforePostVy),
        min: min(characterBeforePostVy),
        max: max(characterBeforePostVy),
      },
      characterVyAfterPostMs: {
        mean: mean(characterAfterPostVy),
        min: min(characterAfterPostVy),
        max: max(characterAfterPostVy),
      },
      platformY: {
        mean: mean(platformYs),
        min: min(platformYs),
        max: max(platformYs),
      },
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

if (CURRENT_DONOR_REVISION !== 'v1') {
  throw new Error(`A1 expected current Donor v1, got ${CURRENT_DONOR_REVISION}`);
}

const results = CASES.map(runCase);
const payload = {
  experiment: 'A1 dynamic-support standing-load characterization',
  donorRevision: CURRENT_DONOR_REVISION,
  dt: DT,
  substeps: SUBSTEPS,
  gravity: GRAVITY,
  playerVirtualMassKg: PLAYER_MASS,
  expectedPlayerWeightImpulseNsPerTick: EXPECTED_PLAYER_WEIGHT_IMPULSE,
  interpretationBoundary: 'Characterization only. No result is treated as a repair requirement by this harness.',
  cases: results,
};

fs.mkdirSync(path.join('tmp', 'a1'), { recursive: true });
fs.writeFileSync(path.join('tmp', 'a1', 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);

console.log('A1 dynamic-support standing-load CHARACTERIZATION COMPLETE');
for (const result of results) {
  console.log(
    `${result.name}: body=${result.actualMassKg.toFixed(3)}kg ` +
    `load=${result.manualDownwardImpulseNs.mean.toFixed(4)}Ns/tick ` +
    `weightRatio=${result.observedWeightRatio.toFixed(4)} ` +
    `apparentPlayerMass=${result.apparentSupportedPlayerMassKg.toFixed(2)}kg ` +
    `reducedMassPrediction=${result.simpleReducedMassPredictionRatio.toFixed(4)} ` +
    `delta=${result.ratioMinusSimplePrediction.toExponential(3)}`,
  );
}
console.log(JSON.stringify(payload));
