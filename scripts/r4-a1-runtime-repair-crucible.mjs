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
const SUPPORT_MASSES = [28.15488, 80, 82.368, 320];
const KICK_VELOCITIES = [-0.25, 0, 0.15, 0.30, 0.50];
const FLOAT_TOLERANCE = 1e-5;

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
  return { ...neutralIntent(), moveForward: 1 };
}

function createBox(world, type, position, half, options = {}) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  bodyDef.linearDamping = options.linearDamping ?? 0;
  bodyDef.angularDamping = options.angularDamping ?? 0;
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
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

function step(fixture, { intent = neutralIntent(), beforePost = null } = {}) {
  fixture.character.preStep(DT, intent);
  b3.b3World_Step(fixture.world, DT, SUBSTEPS);
  if (beforePost) beforePost();
  const platformVelocityBeforePost = bodyVelocity(fixture.platform);
  const characterVyBeforePost = fixture.character.velocity[1];
  fixture.character.postStep(DT);
  const platformVelocityAfterPost = bodyVelocity(fixture.platform);
  const supportMass = b3.b3Body_GetMass(fixture.platform);
  const totalImpulseY = supportMass * (platformVelocityAfterPost[1] - platformVelocityBeforePost[1]);
  const characterMomentumChangeY = PLAYER_MASS * (fixture.character.velocity[1] - characterVyBeforePost);
  return {
    support: fixture.character.currentSupport?.type ?? 'AIR',
    totalImpulseY,
    characterMomentumChangeY,
    reciprocalDeficitY: -characterMomentumChangeY - totalImpulseY,
    characterVyBeforePost,
    characterVyAfterPost: fixture.character.velocity[1],
    platformVelocityBeforePost,
    platformVelocityAfterPost,
    reactionY: fixture.character.lastPersistentSupportReactionY,
  };
}

function settle(fixture, frames = 180) {
  for (let i = 0; i < frames; i++) step(fixture);
  assert.equal(fixture.character.currentSupport?.type, 'DYNAMIC', 'fixture must settle on dynamic support');
}

function standingLoad(targetMass) {
  const fixture = createSupportFixture(targetMass);
  try {
    settle(fixture);
    const samples = [];
    for (let i = 0; i < 120; i++) samples.push(step(fixture));
    const retained = samples.filter((sample) => sample.support === 'DYNAMIC');
    assert.ok(retained.length >= 110, `support continuity regressed for mass ${targetMass}`);
    const meanDownwardImpulse = mean(retained.map((sample) => -sample.totalImpulseY));
    const meanDeficit = mean(retained.map((sample) => sample.reciprocalDeficitY));
    const meanReaction = mean(retained.map((sample) => -sample.reactionY));
    return {
      targetMass,
      actualMass: b3.b3Body_GetMass(fixture.platform),
      retained: retained.length,
      meanDownwardImpulse,
      weightRatio: meanDownwardImpulse / FULL_WEIGHT_IMPULSE,
      meanReciprocalDeficit: meanDeficit,
      meanPersistentReaction: meanReaction,
    };
  } finally {
    b3.b3DestroyWorld(fixture.world);
  }
}

function landingWitness() {
  const fixture = createSupportFixture(80, 2.0);
  try {
    for (let i = 0; i < 240; i++) {
      const wasSupported = Boolean(fixture.character.currentSupport);
      const sample = step(fixture);
      if (!wasSupported && sample.support === 'DYNAMIC') {
        return {
          tick: i,
          reactionY: sample.reactionY,
          totalDownwardImpulse: -sample.totalImpulseY,
          characterVyBeforePost: sample.characterVyBeforePost,
          characterVyAfterPost: sample.characterVyAfterPost,
        };
      }
    }
    throw new Error('landing witness never acquired dynamic support');
  } finally {
    b3.b3DestroyWorld(fixture.world);
  }
}

function supportMotionCase(targetMass, kickVelocity) {
  const fixture = createSupportFixture(targetMass);
  try {
    settle(fixture);
    const supportMass = b3.b3Body_GetMass(fixture.platform);
    const sample = step(fixture, {
      beforePost: () => {
        b3.b3Body_ApplyLinearImpulse(
          fixture.platform,
          [0, supportMass * kickVelocity, 0],
          bodyPosition(fixture.platform),
          true,
        );
      },
    });
    return {
      targetMass,
      kickVelocity,
      support: sample.support,
      reciprocalDeficitY: sample.reciprocalDeficitY,
      reactionY: sample.reactionY,
      totalDownwardImpulse: -sample.totalImpulseY,
      characterVyBeforePost: sample.characterVyBeforePost,
      characterVyAfterPost: sample.characterVyAfterPost,
    };
  } finally {
    b3.b3DestroyWorld(fixture.world);
  }
}

function sidePushWitness() {
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
    let maxA1Reaction = 0;
    for (let i = 0; i < 45; i++) {
      character.preStep(DT, neutralIntent());
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
      maxA1Reaction = Math.max(maxA1Reaction, Math.abs(character.lastPersistentSupportReactionY));
    }
    for (let i = 0; i < 120; i++) {
      character.preStep(DT, forwardIntent());
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
      maxA1Reaction = Math.max(maxA1Reaction, Math.abs(character.lastPersistentSupportReactionY));
    }
    return {
      maxA1Reaction,
      characterPosition: [...character.position],
      boxPosition: bodyPosition(box),
      boxVelocity: bodyVelocity(box),
      support: character.currentSupport?.type ?? 'AIR',
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

const standing = SUPPORT_MASSES.map(standingLoad);
for (const sample of standing) {
  assert.ok(sample.weightRatio > 0.97 && sample.weightRatio < 1.03,
    `runtime A1 repair did not converge near full virtual standing load: ${JSON.stringify(sample)}`);
  assert.ok(Math.abs(sample.meanReciprocalDeficit) < FLOAT_TOLERANCE,
    `runtime A1 repair left standing reciprocal deficit: ${JSON.stringify(sample)}`);
  assert.ok(sample.meanPersistentReaction > 0.1,
    `runtime A1 repair did not exercise persistent reaction: ${JSON.stringify(sample)}`);
}

const landing = landingWitness();
assert.ok(Math.abs(landing.reactionY) < FLOAT_TOLERANCE,
  `first landing must not receive persistent A1 reaction: ${JSON.stringify(landing)}`);

const motionSweep = [];
let retainedMotionCases = 0;
for (const mass of SUPPORT_MASSES) {
  for (const kickVelocity of KICK_VELOCITIES) {
    const sample = supportMotionCase(mass, kickVelocity);
    motionSweep.push(sample);
    if (sample.support === 'DYNAMIC') {
      retainedMotionCases += 1;
      assert.ok(Math.abs(sample.reciprocalDeficitY) < FLOAT_TOLERANCE,
        `retained moving support left reciprocal deficit: ${JSON.stringify(sample)}`);
    }
  }
}
assert.ok(retainedMotionCases >= 12, `too few retained motion cases qualified: ${retainedMotionCases}`);

const sidePush = sidePushWitness();
assert.ok(sidePush.maxA1Reaction < FLOAT_TOLERANCE,
  `non-support dynamic side push incorrectly activated A1 reaction: ${JSON.stringify(sidePush)}`);

console.log('R4 A1 RUNTIME REPAIR CRUCIBLE PASS');
console.log(JSON.stringify({
  fullWeightImpulse: FULL_WEIGHT_IMPULSE,
  standing,
  landing,
  motionSweep,
  retainedMotionCases,
  sidePush,
  classification: 'PERSISTENT_SAME_DYNAMIC_SUPPORT_VERTICAL_CLIP_RECIPROCITY_V1',
  evidenceBoundary: 'machine qualification for horizontal dynamic-support load accounting; non-horizontal and multi-contact/crush semantics remain separate questions',
}, null, 2));