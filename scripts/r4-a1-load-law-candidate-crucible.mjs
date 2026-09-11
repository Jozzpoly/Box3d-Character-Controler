import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 20;
const PLAYER_MASS = 80;
const FULL_WEIGHT_IMPULSE = PLAYER_MASS * GRAVITY * DT;
const SUPPORT_HALF = [1.5, 0.22, 1.5];
const SUPPORT_VOLUME = 8 * SUPPORT_HALF[0] * SUPPORT_HALF[1] * SUPPORT_HALF[2];
const POLICIES = [
  'legacy',
  'clip-reciprocal',
  'gravity-load-topup',
  'persistent-clip-reciprocal',
];
const SUPPORT_MASSES = [28.15488, 80, 82.368, 320];

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

function forwardIntent() {
  return {
    ...neutralIntent(),
    moveForward: 1,
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

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function applyCandidateCorrection({ policy, character, platform, wasDynamicSupport, platformVelocityBeforePost, characterVyBeforePost }) {
  const platformVelocityAfterLegacy = bodyVelocity(platform);
  const mass = b3.b3Body_GetMass(platform);
  const legacyImpulseY = mass * (platformVelocityAfterLegacy[1] - platformVelocityBeforePost[1]);
  // This fixture contains exactly one dynamic body: the support under test.
  // Binding body IDs are value handles, so JS object identity is not authoritative.
  const isDynamicSupportNow = character.currentSupport?.type === 'DYNAMIC';
  let extraImpulseY = 0;

  const wantsFullPostConstraintReciprocity =
    policy === 'clip-reciprocal'
    || (policy === 'persistent-clip-reciprocal' && wasDynamicSupport);

  if (wantsFullPostConstraintReciprocity && isDynamicSupportNow) {
    const totalCharacterMomentumChangeY = PLAYER_MASS * (character.velocity[1] - characterVyBeforePost);
    const desiredSupportImpulseY = -totalCharacterMomentumChangeY;
    extraImpulseY = desiredSupportImpulseY - legacyImpulseY;
  }

  if (policy === 'gravity-load-topup' && wasDynamicSupport && isDynamicSupportNow) {
    const desiredSupportImpulseY = -FULL_WEIGHT_IMPULSE;
    if (legacyImpulseY > desiredSupportImpulseY) {
      extraImpulseY = desiredSupportImpulseY - legacyImpulseY;
    }
  }

  if (Math.abs(extraImpulseY) > 1e-12) {
    const point = character.currentSupport?.point ?? bodyPosition(platform);
    b3.b3Body_ApplyLinearImpulse(platform, [0, extraImpulseY, 0], point, true);
  }

  const platformVelocityAfterCandidate = bodyVelocity(platform);
  const totalImpulseY = mass * (platformVelocityAfterCandidate[1] - platformVelocityBeforePost[1]);
  const characterMomentumChangeY = PLAYER_MASS * (character.velocity[1] - characterVyBeforePost);
  const reciprocalDeficitY = -characterMomentumChangeY - totalImpulseY;
  return {
    legacyImpulseY,
    extraImpulseY,
    totalImpulseY,
    characterMomentumChangeY,
    reciprocalDeficitY,
  };
}

function step({
  world,
  character,
  platform,
  policy,
  intent = neutralIntent(),
  beforePost = null,
}) {
  const wasDynamicSupport = character.currentSupport?.type === 'DYNAMIC';
  character.preStep(DT, intent);
  b3.b3World_Step(world, DT, SUBSTEPS);
  if (beforePost) beforePost();
  const platformVelocityBeforePost = bodyVelocity(platform);
  const characterVyBeforePost = character.velocity[1];
  character.postStep(DT);
  const correction = applyCandidateCorrection({
    policy,
    character,
    platform,
    wasDynamicSupport,
    platformVelocityBeforePost,
    characterVyBeforePost,
  });
  return {
    ...correction,
    wasDynamicSupport,
    support: character.currentSupport?.type ?? 'AIR',
    characterVyBeforePost,
    characterVyAfterPost: character.velocity[1],
    platformVelocityBeforePost,
    platformVelocityAfterPost: bodyVelocity(platform),
  };
}

function createSupportFixture(targetMass, startHeightOffset = 0.015) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  createBox(world, 'static', [0, -0.25, 0], [6, 0.25, 6], { friction: 1.0 });
  const platform = createBox(world, 'dynamic', [0, SUPPORT_HALF[1], 0], SUPPORT_HALF, {
    density: targetMass / SUPPORT_VOLUME,
    friction: 1.0,
  });
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, 2, 0],
    gravity: GRAVITY,
    virtualMass: PLAYER_MASS,
  });
  const platformTop = 2 * SUPPORT_HALF[1];
  character.reset([0, platformTop + character.halfHeight + startHeightOffset, 0]);
  return { world, platform, character };
}

function settle(fixture, policy, frames = 180) {
  for (let i = 0; i < frames; i++) step({ ...fixture, policy });
  assert.equal(fixture.character.currentSupport?.type, 'DYNAMIC', `${policy}: fixture did not settle on dynamic support`);
}

function standingLoad(policy, targetMass) {
  const fixture = createSupportFixture(targetMass);
  try {
    settle(fixture, policy);
    const samples = [];
    for (let i = 0; i < 120; i++) samples.push(step({ ...fixture, policy }));
    const loaded = samples.filter((sample) => sample.support === 'DYNAMIC');
    assert.ok(loaded.length >= 110);
    const downward = loaded.map((sample) => -sample.totalImpulseY);
    return {
      targetMass,
      actualMass: b3.b3Body_GetMass(fixture.platform),
      loadedSamples: loaded.length,
      meanDownwardImpulse: mean(downward),
      weightRatio: mean(downward) / FULL_WEIGHT_IMPULSE,
      meanExtraImpulse: mean(loaded.map((sample) => -sample.extraImpulseY)),
      meanReciprocalDeficit: mean(loaded.map((sample) => sample.reciprocalDeficitY)),
    };
  } finally {
    b3.b3DestroyWorld(fixture.world);
  }
}

function landingImpact(policy) {
  const fixture = createSupportFixture(80, 2.0);
  try {
    let impact = null;
    for (let i = 0; i < 240; i++) {
      const wasSupported = Boolean(fixture.character.currentSupport);
      const sample = step({ ...fixture, policy });
      if (!wasSupported && sample.support === 'DYNAMIC') {
        impact = {
          tick: i,
          characterVyBeforePost: sample.characterVyBeforePost,
          characterVyAfterPost: sample.characterVyAfterPost,
          legacyDownwardImpulse: -sample.legacyImpulseY,
          extraDownwardImpulse: -sample.extraImpulseY,
          totalDownwardImpulse: -sample.totalImpulseY,
          reciprocalDeficitY: sample.reciprocalDeficitY,
        };
        break;
      }
    }
    assert.ok(impact, `${policy}: landing fixture never acquired dynamic support`);
    return impact;
  } finally {
    b3.b3DestroyWorld(fixture.world);
  }
}

function persistentLiftKick(policy, kickVelocity = 0.5) {
  const fixture = createSupportFixture(80);
  try {
    settle(fixture, policy);
    const supportMass = b3.b3Body_GetMass(fixture.platform);
    const sample = step({
      ...fixture,
      policy,
      beforePost: () => {
        const point = bodyPosition(fixture.platform);
        b3.b3Body_ApplyLinearImpulse(
          fixture.platform,
          [0, supportMass * kickVelocity, 0],
          point,
          true,
        );
      },
    });
    assert.equal(sample.wasDynamicSupport, true, `${policy}: lift kick must begin from persistent support`);
    assert.equal(sample.support, 'DYNAMIC', `${policy}: lift kick must remain a support contact`);
    return {
      kickVelocity,
      characterVyBeforePost: sample.characterVyBeforePost,
      characterVyAfterPost: sample.characterVyAfterPost,
      platformVyBeforePost: sample.platformVelocityBeforePost[1],
      platformVyAfterPost: sample.platformVelocityAfterPost[1],
      legacyDownwardImpulse: -sample.legacyImpulseY,
      extraDownwardImpulse: -sample.extraImpulseY,
      totalDownwardImpulse: -sample.totalImpulseY,
      reciprocalDeficitY: sample.reciprocalDeficitY,
    };
  } finally {
    b3.b3DestroyWorld(fixture.world);
  }
}

function sidePush(policy) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  try {
    createBox(world, 'static', [0, -0.25, 0], [6, 0.25, 6], { friction: 0.9 });
    const box = createBox(world, 'dynamic', [0, 0.45, -1.5], [0.45, 0.45, 0.45], {
      density: 80 / (8 * 0.45 * 0.45 * 0.45),
      friction: 0.7,
    });
    const character = createCurrentDonorCharacter(b3, world, {
      startPosition: [0, 0.92, 0],
      gravity: GRAVITY,
      virtualMass: PLAYER_MASS,
    });
    character.reset([0, character.halfHeight + 0.015, 0]);

    for (let i = 0; i < 45; i++) {
      character.preStep(DT, neutralIntent());
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
    }
    for (let i = 0; i < 120; i++) {
      character.preStep(DT, forwardIntent());
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
    }
    return {
      characterPosition: [...character.position],
      boxPosition: bodyPosition(box),
      boxVelocity: bodyVelocity(box),
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

const results = {};
for (const policy of POLICIES) {
  results[policy] = {
    standing: SUPPORT_MASSES.map((mass) => standingLoad(policy, mass)),
    landing: landingImpact(policy),
    liftKick: persistentLiftKick(policy),
    sidePush: sidePush(policy),
  };
}

assert.ok(results.legacy.standing[0].weightRatio > 0.24 && results.legacy.standing[0].weightRatio < 0.28);
assert.ok(results.legacy.standing[1].weightRatio > 0.48 && results.legacy.standing[1].weightRatio < 0.52);
assert.ok(results.legacy.standing[3].weightRatio > 0.78 && results.legacy.standing[3].weightRatio < 0.82);

for (const policy of ['clip-reciprocal', 'gravity-load-topup', 'persistent-clip-reciprocal']) {
  for (const sample of results[policy].standing) {
    assert.ok(sample.weightRatio > 0.97 && sample.weightRatio < 1.03,
      `${policy}: standing load did not converge near full virtual weight: ${JSON.stringify(sample)}`);
  }
}

for (const policy of ['gravity-load-topup', 'persistent-clip-reciprocal']) {
  assert.ok(Math.abs(
    results[policy].landing.totalDownwardImpulse - results.legacy.landing.totalDownwardImpulse,
  ) < 1e-8, `${policy}: persistent-only law should not rewrite initial landing impact`);
}

assert.ok(
  Math.abs(results['clip-reciprocal'].landing.totalDownwardImpulse - results.legacy.landing.totalDownwardImpulse) > 1,
  'full clip-reciprocal candidate should expose its broader landing-impact semantic change',
);

assert.ok(
  Math.abs(results['persistent-clip-reciprocal'].liftKick.reciprocalDeficitY) < 1e-8,
  `persistent clip reciprocity failed to close lift-kick momentum accounting: ${JSON.stringify(results['persistent-clip-reciprocal'].liftKick)}`,
);
assert.ok(
  Math.abs(results['gravity-load-topup'].liftKick.reciprocalDeficitY) > 1,
  `gravity-only topup unexpectedly closed accelerating-support momentum accounting: ${JSON.stringify(results['gravity-load-topup'].liftKick)}`,
);

for (const policy of ['clip-reciprocal', 'gravity-load-topup', 'persistent-clip-reciprocal']) {
  const candidate = results[policy].sidePush;
  const legacy = results.legacy.sidePush;
  const delta = Math.max(
    ...candidate.characterPosition.map((value, index) => Math.abs(value - legacy.characterPosition[index])),
    ...candidate.boxPosition.map((value, index) => Math.abs(value - legacy.boxPosition[index])),
    ...candidate.boxVelocity.map((value, index) => Math.abs(value - legacy.boxVelocity[index])),
  );
  assert.ok(delta < 1e-9, `${policy}: non-support push changed unexpectedly (${delta})`);
}

console.log('R4 A1 LOAD-LAW CANDIDATE CRUCIBLE PASS');
console.log(JSON.stringify({
  fullWeightImpulse: FULL_WEIGHT_IMPULSE,
  results,
  interpretation: {
    legacy: 'current effective-mass contact law; standing load scales with support mass',
    clipReciprocal: 'reciprocates full vertical post-contact controller momentum change, including first landing impact',
    gravityLoadTopup: 'persistent support receives at least one tick of virtual gravity load, but acceleration-driven controller authority can remain non-reciprocal',
    persistentClipReciprocal: 'reciprocates full vertical post-contact controller momentum change only for already-established dynamic support; initial landing remains legacy',
  },
  evidenceBoundary: 'research adapters only; lift kick isolates velocity-space support acceleration just before controller post-step and does not yet prove final runtime law',
}, null, 2));