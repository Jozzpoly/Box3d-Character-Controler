import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE15HybridCharacter } from '../../src/e15-hybrid-character.js';
import { stepCoupledTwoPointActuator } from '../../src/e18/p3-coupled-two-point-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const RATE = 10;
const MAX_FORCE = 900;
const COMMAND_FRAMES = 60;
const HOLD_FRAMES = 120;
const TOTAL_FRAMES = COMMAND_FRAMES + HOLD_FRAMES;
const SETTLE_FRAMES = 60;
const OBJECT_HALF = [0.35, 0.35, 0.70];
const OBJECT_MASS = 24;
const ANCHOR1 = [0, 0, -0.50];
const ANCHOR2 = [0, 0, 0.50];
const TARGET_TRANSLATION = [1.20, 0, 0];
const OBJECT_START = [1.05, OBJECT_HALF[1], 0];
const WALL_CENTER_X = 1.95;
const WALL_HALF_X = 0.15;
const WALL_LEFT_X = WALL_CENTER_X - WALL_HALF_X;
const EXPECTED_BLOCKED_OBJECT_CENTER_X = WALL_LEFT_X - OBJECT_HALF[0];
const ZERO_INTENT = {
  moveForward: 0,
  moveRight: 0,
  forward: [1, 0, 0],
  right: [0, 0, 1],
  jump: false,
  jumpHeld: false,
  sprint: false,
};
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, scalar) {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function distance3(a, b) {
  return norm3(sub3(a, b));
}

function midpoint(a, b) {
  return scale3(add3(a, b), 0.5);
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function createStaticBox(world, position, half, friction = 0.8) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = friction;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createDynamicBox(world, { position, half, mass }) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0.04;
  bodyDef.angularDamping = 0.08;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForBoxMass(mass, half);
  shapeDef.baseMaterial.friction = 0.55;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function worldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function worldCenter(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(out, body);
  return out;
}

function linearVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function createFixture({ wall, feedbackGain }) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createStaticBox(world, [0, -0.5, 0], [12, 0.5, 8], 0.8);
  if (wall) createStaticBox(world, [WALL_CENTER_X, 2.0, 0], [WALL_HALF_X, 2.0, 4.0], 0.8);

  const character = createE15HybridCharacter(b3, world, {
    startPosition: [0, 0.90, 0],
    gravity: 20,
    feedbackGain,
  });
  const object = createDynamicBox(world, {
    position: OBJECT_START,
    half: OBJECT_HALF,
    mass: OBJECT_MASS,
  });

  for (let frame = 0; frame < SETTLE_FRAMES; frame++) {
    character.preStep(DT, ZERO_INTENT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
  }
  if (!character.currentSupport) throw new Error('P3.0g Donor fixture did not settle on ground');

  const startAnchor1 = worldPoint(object, ANCHOR1);
  const startAnchor2 = worldPoint(object, ANCHOR2);
  return { world, character, object, startAnchor1, startAnchor2 };
}

function targetAt(frame, fixture) {
  const u = smoothstep01(frame / COMMAND_FRAMES);
  const translation = scale3(TARGET_TRANSLATION, u);
  return {
    target1: add3(fixture.startAnchor1, translation),
    target2: add3(fixture.startAnchor2, translation),
    midpoint: add3(midpoint(fixture.startAnchor1, fixture.startAnchor2), translation),
  };
}

function sample(fixture, target, actuatorTelemetry) {
  const { character, object } = fixture;
  const p1 = worldPoint(object, ANCHOR1);
  const p2 = worldPoint(object, ANCHOR2);
  const objectCenter = worldCenter(object);
  const bodySpeed = norm3(character.bodyVelocity);
  return {
    objectMidpointError: distance3(midpoint(p1, p2), target.midpoint),
    objectCenter,
    objectSpeed: norm3(linearVelocity(object)),
    rootPosition: [...character.position],
    rootVelocity: [...character.velocity],
    rootExternalVelocity: [...character.externalVelocity],
    rootHorizontalSpeed: Math.hypot(character.velocity[0], character.velocity[2]),
    rootExternalHorizontalSpeed: Math.hypot(character.externalVelocity[0], character.externalVelocity[2]),
    bodyPosition: [...character.bodyPosition],
    bodyVelocity: [...character.bodyVelocity],
    bodySpeed,
    bodyHorizontalOffset: character.bodyHorizontalOffset,
    bodyOffsetDistance: character.bodyOffsetDistance,
    bodyFeedbackImpulse: character.lastBodyFeedbackImpulse,
    bodyFeedbackClipped: character.lastFeedbackClipped,
    bodyFollowImpulse: character.lastFollowImpulse,
    bodyHorizontalFollowImpulse: character.lastHorizontalFollowImpulse,
    bodyPhysicsImpulse: character.lastBodyPhysicsImpulse,
    actuatorImpulse: actuatorTelemetry.appliedImpulseSum,
    actuatorSaturated: actuatorTelemetry.saturated,
  };
}

function runScenario({ name, wall, feedbackGain }) {
  const fixture = createFixture({ wall, feedbackGain });
  const samples = [];
  let actuatorSaturationFrames = 0;
  let feedbackClippedFrames = 0;
  let totalActuatorImpulse = 0;
  let totalFeedbackImpulse = 0;
  let totalHorizontalFollowImpulse = 0;
  let peakBodySpeed = 0;
  let peakBodyOffset = 0;
  let peakRootSpeed = 0;
  let peakRootExternalSpeed = 0;
  let peakFeedbackImpulse = 0;
  let peakHorizontalFollowImpulse = 0;
  let maxObjectCenterX = -Infinity;

  const rootStart = [...fixture.character.position];
  const bodyStart = [...fixture.character.bodyPosition];

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const target = targetAt(frame, fixture);
    fixture.character.preStep(DT, ZERO_INTENT);
    const actuatorTelemetry = stepCoupledTwoPointActuator({
      b3,
      objectBody: fixture.object,
      coreBody: fixture.character.embodimentBody,
      localAnchor1: ANCHOR1,
      localAnchor2: ANCHOR2,
      targetWorld1: target.target1,
      targetWorld2: target.target2,
      dt: DT,
      rate: RATE,
      maxForce: MAX_FORCE,
    });
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    fixture.character.postStep(DT);

    const entry = sample(fixture, target, actuatorTelemetry);
    samples.push(entry);
    if (entry.actuatorSaturated) actuatorSaturationFrames += 1;
    if (entry.bodyFeedbackClipped) feedbackClippedFrames += 1;
    totalActuatorImpulse += entry.actuatorImpulse;
    totalFeedbackImpulse += entry.bodyFeedbackImpulse;
    totalHorizontalFollowImpulse += entry.bodyHorizontalFollowImpulse;
    peakBodySpeed = Math.max(peakBodySpeed, entry.bodySpeed);
    peakBodyOffset = Math.max(peakBodyOffset, entry.bodyOffsetDistance);
    peakRootSpeed = Math.max(peakRootSpeed, entry.rootHorizontalSpeed);
    peakRootExternalSpeed = Math.max(peakRootExternalSpeed, entry.rootExternalHorizontalSpeed);
    peakFeedbackImpulse = Math.max(peakFeedbackImpulse, entry.bodyFeedbackImpulse);
    peakHorizontalFollowImpulse = Math.max(peakHorizontalFollowImpulse, entry.bodyHorizontalFollowImpulse);
    maxObjectCenterX = Math.max(maxObjectCenterX, entry.objectCenter[0]);
  }

  const tail = samples.slice(-30);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const rootEnd = [...fixture.character.position];
  const bodyEnd = [...fixture.character.bodyPosition];
  const report = {
    name,
    wall,
    feedbackGain,
    settledObjectMidpointError: mean(tail.map((entry) => entry.objectMidpointError)),
    actuatorSaturationFrames,
    actuatorSaturationFraction: actuatorSaturationFrames / TOTAL_FRAMES,
    feedbackClippedFrames,
    feedbackClippedFraction: feedbackClippedFrames / TOTAL_FRAMES,
    totalActuatorImpulse,
    totalFeedbackImpulse,
    totalHorizontalFollowImpulse,
    peakBodySpeed,
    peakBodyOffset,
    peakRootSpeed,
    peakRootExternalSpeed,
    peakFeedbackImpulse,
    peakHorizontalFollowImpulse,
    maxObjectCenterX,
    rootStart,
    rootEnd,
    rootDisplacement: sub3(rootEnd, rootStart),
    bodyStart,
    bodyEnd,
    bodyDisplacement: sub3(bodyEnd, bodyStart),
    final: samples.at(-1),
    checkpoints: samples
      .map((entry, frame) => ({ frame, ...entry }))
      .filter(({ frame }) => frame % 30 === 0 || frame === COMMAND_FRAMES || frame === TOTAL_FRAMES - 1)
      .map(({ frame, objectMidpointError, objectCenter, rootPosition, rootHorizontalSpeed, rootExternalHorizontalSpeed, bodySpeed, bodyHorizontalOffset, bodyFeedbackImpulse, bodyFeedbackClipped, bodyHorizontalFollowImpulse, actuatorImpulse, actuatorSaturated }) => ({
        frame,
        objectMidpointError,
        objectCenter,
        rootPosition,
        rootHorizontalSpeed,
        rootExternalHorizontalSpeed,
        bodySpeed,
        bodyHorizontalOffset,
        bodyFeedbackImpulse,
        bodyFeedbackClipped,
        bodyHorizontalFollowImpulse,
        actuatorImpulse,
        actuatorSaturated,
      })),
  };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

const openFeedback = runScenario({ name: 'open-feedback-on', wall: false, feedbackGain: 1 });
const blockedFeedback = runScenario({ name: 'blocked-feedback-on', wall: true, feedbackGain: 1 });
const blockedNoFeedback = runScenario({ name: 'blocked-feedback-off-counterfactual', wall: true, feedbackGain: 0 });

for (const scenario of [openFeedback, blockedFeedback, blockedNoFeedback]) {
  const finite = [
    scenario.settledObjectMidpointError,
    scenario.peakBodySpeed,
    scenario.peakBodyOffset,
    scenario.peakRootSpeed,
    scenario.peakRootExternalSpeed,
    scenario.totalActuatorImpulse,
    scenario.totalHorizontalFollowImpulse,
    ...scenario.rootEnd,
    ...scenario.bodyEnd,
  ].every(Number.isFinite);
  assert.ok(finite, `${scenario.name} must remain finite`);
  assert.ok(scenario.peakBodySpeed < 40, `${scenario.name} body speed must remain bounded enough for diagnostic validity: ${scenario.peakBodySpeed}`);
  assert.ok(scenario.peakRootSpeed < 40, `${scenario.name} root speed must remain bounded enough for diagnostic validity: ${scenario.peakRootSpeed}`);
}

// Predeclared interpretation signals. They classify the existing E15 bridge; they do
// not tune or modify it. Negative classifications are valid evidence.
const objectStillBlocked =
  blockedFeedback.settledObjectMidpointError > 0.45 &&
  blockedFeedback.maxObjectCenterX <= EXPECTED_BLOCKED_OBJECT_CENTER_X + 0.04;
const openStillReachable = openFeedback.settledObjectMidpointError < 0.08;
const hybridBodyBounded = blockedFeedback.peakBodySpeed < 10 && blockedFeedback.peakBodyOffset < 1.0;
const feedbackNotChronicallyClipped = blockedFeedback.feedbackClippedFraction < 0.25;
const playerConsequenceMaterial = Math.abs(blockedFeedback.rootDisplacement[0]) > 0.25;
const feedbackCausallySeparatesRoot =
  Math.abs(blockedFeedback.rootDisplacement[0] - blockedNoFeedback.rootDisplacement[0]) > 0.20;
const followCounterAuthorityMaterial = blockedFeedback.peakHorizontalFollowImpulse > 20;

let classification;
if (!objectStillBlocked || !openStillReachable) {
  classification = 'P3_FULL_HYBRID_OBJECT_SIDE_GATE_NO_LONGER_HOLDS';
} else if (hybridBodyBounded && feedbackNotChronicallyClipped && playerConsequenceMaterial && feedbackCausallySeparatesRoot) {
  classification = followCounterAuthorityMaterial
    ? 'P3_FULL_HYBRID_REACTION_BOUNDED_AND_TRANSLATED_WITH_MATERIAL_FOLLOW_COUNTERAUTHORITY'
    : 'P3_FULL_HYBRID_REACTION_BOUNDED_AND_TRANSLATED';
} else if (hybridBodyBounded) {
  classification = 'P3_FULL_HYBRID_REACTION_BOUNDED_BUT_BRIDGE_SEMANTICS_DOMINATE_OR_OBSCURE';
} else {
  classification = 'P3_FULL_HYBRID_REACTION_PATH_NOT_BOUNDED_ENOUGH_FOR_P3_1';
}

const report = {
  schema: 'e18-p3-0g-full-hybrid-blocked-reaction-audit-v1',
  boundary: 'Measures the already-accepted E15 physical-core follow/feedback bridge under sustained P3 reaction. It uses real Donor/E15 temporal ordering and accepted default bridge constants. It does not add reach grammar, target recentering, reaction damping, feedback tuning, or browser input.',
  protocol: {
    dt: DT,
    substeps: SUBSTEPS,
    rate: RATE,
    maxForce: MAX_FORCE,
    commandFrames: COMMAND_FRAMES,
    holdFrames: HOLD_FRAMES,
    settleFrames: SETTLE_FRAMES,
    objectMass: OBJECT_MASS,
    anchors: [ANCHOR1, ANCHOR2],
    targetTranslation: TARGET_TRANSLATION,
    wallCenterX: WALL_CENTER_X,
    wallLeftX: WALL_LEFT_X,
    expectedBlockedObjectCenterX: EXPECTED_BLOCKED_OBJECT_CENTER_X,
    acceptedE15Defaults: {
      bodyMass: 35,
      followRate: 11,
      maxFollowAcceleration: 90,
      feedbackGainActive: 1,
      maxFeedbackDeltaV: 0.65,
    },
  },
  openFeedback,
  blockedFeedback,
  blockedNoFeedback,
  declaredSignals: {
    objectStillBlocked: 'blocked feedback-on residual > 0.45 m and object COM respects wall within 0.04 m',
    openStillReachable: 'open feedback-on settled residual < 0.08 m',
    hybridBodyBounded: 'blocked feedback-on peak body speed < 10 m/s and peak body offset < 1.0 m',
    feedbackNotChronicallyClipped: 'blocked feedback-on clipping fraction < 0.25',
    playerConsequenceMaterial: '|blocked root x displacement| > 0.25 m',
    feedbackCausallySeparatesRoot: '|feedback-on root displacement - feedback-off displacement| > 0.20 m',
    followCounterAuthorityMaterial: 'peak horizontal follow impulse > 20 N·s',
  },
  signals: {
    objectStillBlocked,
    openStillReachable,
    hybridBodyBounded,
    feedbackNotChronicallyClipped,
    playerConsequenceMaterial,
    feedbackCausallySeparatesRoot,
    followCounterAuthorityMaterial,
  },
  classification,
  interpretation: {
    purpose: 'The isolated 0f core reached 64.6 m/s because it had no E15 follow or Donor consequence path. This audit asks what the real hybrid does with the same class of sustained blocked reaction.',
    nonClaim: 'A bounded result does not prove good feel or final causal closure. P3.0 still uses reaction at core COM, excludes reach/browser grammar, and inherits E15 controller-owned follow/vertical transport.',
  },
  verdict: 'FULL_HYBRID_BLOCKED_REACTION_AUDIT_RECORDED_WITH_PREDECLARED_CLASSIFICATION',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
