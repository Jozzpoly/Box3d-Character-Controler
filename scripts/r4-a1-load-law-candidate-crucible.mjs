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
const POLICIES = ['legacy', 'clip-reciprocal', 'gravity-load-topup'];
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
  const isDynamicSupportNow = character.currentSupport?.type === 'DYNAMIC' && character.currentSupport?.body === platform;
  let extraImpulseY = 0;

  if (policy === 'clip-reciprocal' && isDynamicSupportNow) {
    // The controller has already changed character velocity through dynamic-contact
    // reaction plus constraint clipping. Give the support the opposite of that total
    // vertical momentum change, minus what legacy reciprocity already transferred.
    const totalCharacterMomentumChangeY = PLAYER_MASS * (character.velocity[1] - characterVyBeforePost);
    const desiredSupportImpulseY = -totalCharacterMomentumChangeY;
    extraImpulseY = desiredSupportImpulseY - legacyImpulseY;
  }

  if (policy === 'gravity-load-topup' && wasDynamicSupport && isDynamicSupportNow) {
    // Narrow candidate: only persistent support is entitled to the missing part of
    // one tick of virtual player weight. Initial landing/impact is deliberately left
    // to the existing effective-mass contact law.
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
  return { legacyImpulseY, extraImpulseY, totalImpulseY };
}

function step({ world, character, platform, policy, intent = neutralIntent() }) {
  const wasDynamicSupport = character.currentSupport?.type === 'DYNAMIC' && character.currentSupport?.body === platform;
  character.preStep(DT, intent);
  b3.b3World_Step(world, DT, SUBSTEPS);
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

function standingLoad(policy, targetMass) {
  const fixture = createSupportFixture(targetMass);
  try {
    for (let i = 0; i < 180; i++) step({ ...fixture, policy });
    assert.equal(fixture.character.currentSupport?.type, 'DYNAMIC');
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
    sidePush: sidePush(policy),
  };
}

// Legacy control must reproduce the already-established reduced-mass property.
assert.ok(results.legacy.standing[0].weightRatio > 0.24 && results.legacy.standing[0].weightRatio < 0.28);
assert.ok(results.legacy.standing[1].weightRatio > 0.48 && results.legacy.standing[1].weightRatio < 0.52);
assert.ok(results.legacy.standing[3].weightRatio > 0.78 && results.legacy.standing[3].weightRatio < 0.82);

// Both candidate families should actually solve the narrow standing-load question.
for (const policy of ['clip-reciprocal', 'gravity-load-topup']) {
  for (const sample of results[policy].standing) {
    assert.ok(sample.weightRatio > 0.97 && sample.weightRatio < 1.03,
      `${policy}: standing load did not converge near full virtual weight: ${JSON.stringify(sample)}`);
  }
}

// Gravity-only top-up is intentionally narrower: first landing impact remains legacy.
assert.ok(Math.abs(
  results['gravity-load-topup'].landing.totalDownwardImpulse - results.legacy.landing.totalDownwardImpulse,
) < 1e-8, 'gravity-load-topup should not rewrite initial landing impact');

// Non-support side push must remain identical because neither candidate is entitled there.
for (const policy of ['clip-reciprocal', 'gravity-load-topup']) {
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
    clipReciprocal: 'reciprocates the full vertical momentum removed from the controller by post-contact authority; broader semantic change including landing impacts',
    gravityLoadTopup: 'tops up only persistent dynamic support toward one tick of virtual gravity load; preserves initial landing impact by construction',
  },
  evidenceBoundary: 'candidate comparison only; this does not establish that full virtual weight is the final gameplay law',
}, null, 2));