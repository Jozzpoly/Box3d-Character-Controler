import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { stepCoupledTwoPointActuator } from '../../src/e18/p3-coupled-two-point-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const RATE = 10;
const MAX_FORCE = 900;
const OBJECT_MASS = 24;
const CORE_MASS = 35;
const HALF = [0.9, 0.22, 0.22];
const ANCHOR1 = [-0.70, 0, 0];
const ANCHOR2 = [0.70, 0, 0];
const STATIC_COMMAND_FRAMES = 60;
const STATIC_HOLD_FRAMES = 120;
const STATIC_TOTAL_FRAMES = STATIC_COMMAND_FRAMES + STATIC_HOLD_FRAMES;
const STATIC_TRANSLATION = [2.0, 0, 0];
const WALL_CENTER_X = 1.50;
const WALL_HALF_X = 0.15;
const WALL_LEFT_X = WALL_CENTER_X - WALL_HALF_X;
const EXPECTED_MAX_OBJECT_CENTER_X = WALL_LEFT_X - HALF[0];
const RELEASE_DRIVE_FRAMES = 36;
const RELEASE_FREE_FRAMES = 60;
const RELEASE_TARGET_STEP = 0.04;
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

function createDynamicBox(world, { position, half, mass, linearDamping = 0.04, angularDamping = 0.08 }) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = linearDamping;
  bodyDef.angularDamping = angularDamping;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForBoxMass(mass, half);
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createStaticBox(world, position, half) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.6;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createFixture({ wall = false, damping = true } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);
  const object = createDynamicBox(world, {
    position: [0, 0, 0],
    half: HALF,
    mass: OBJECT_MASS,
    linearDamping: damping ? 0.04 : 0,
    angularDamping: damping ? 0.08 : 0,
  });
  const core = createDynamicBox(world, {
    position: [0, -3, 0],
    half: [0.30, 0.42, 0.22],
    mass: CORE_MASS,
    linearDamping: damping ? 0.04 : 0,
    angularDamping: damping ? 0.08 : 0,
  });
  if (wall) createStaticBox(world, [WALL_CENTER_X, 0, 0], [WALL_HALF_X, 4, 4]);
  return { world, object, core };
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

function angularVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return out;
}

function staticTarget(frame) {
  const u = smoothstep01(frame / STATIC_COMMAND_FRAMES);
  const translation = scale3(STATIC_TRANSLATION, u);
  return {
    target1: add3(ANCHOR1, translation),
    target2: add3(ANCHOR2, translation),
    midpoint: translation,
  };
}

function sampleStatic(fixture, target) {
  const p1 = worldPoint(fixture.object, ANCHOR1);
  const p2 = worldPoint(fixture.object, ANCHOR2);
  return {
    midpointError: distance3(midpoint(p1, p2), target.midpoint),
    point1Error: distance3(p1, target.target1),
    point2Error: distance3(p2, target.target2),
    objectCenter: worldCenter(fixture.object),
    objectLinearSpeed: norm3(linearVelocity(fixture.object)),
    objectAngularSpeed: norm3(angularVelocity(fixture.object)),
    coreLinearSpeed: norm3(linearVelocity(fixture.core)),
  };
}

function runStaticTargetCase({ name, wall }) {
  const fixture = createFixture({ wall, damping: true });
  let saturationFrames = 0;
  let commandSaturationFrames = 0;
  let totalAppliedImpulse = 0;
  let peakObjectSpeed = 0;
  let peakAngularSpeed = 0;
  let maxObjectCenterX = -Infinity;
  const samples = [];

  for (let frame = 0; frame < STATIC_TOTAL_FRAMES; frame++) {
    const target = staticTarget(frame);
    const telemetry = stepCoupledTwoPointActuator({
      b3,
      objectBody: fixture.object,
      coreBody: fixture.core,
      localAnchor1: ANCHOR1,
      localAnchor2: ANCHOR2,
      targetWorld1: target.target1,
      targetWorld2: target.target2,
      dt: DT,
      rate: RATE,
      maxForce: MAX_FORCE,
    });
    totalAppliedImpulse += telemetry.appliedImpulseSum;
    if (telemetry.saturated) {
      saturationFrames += 1;
      if (frame <= STATIC_COMMAND_FRAMES) commandSaturationFrames += 1;
    }

    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    const sample = sampleStatic(fixture, target);
    peakObjectSpeed = Math.max(peakObjectSpeed, sample.objectLinearSpeed);
    peakAngularSpeed = Math.max(peakAngularSpeed, sample.objectAngularSpeed);
    maxObjectCenterX = Math.max(maxObjectCenterX, sample.objectCenter[0]);
    samples.push(sample);
  }

  const tail = samples.slice(-30);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const report = {
    name,
    wall,
    settledMidpointError: mean(tail.map((sample) => sample.midpointError)),
    settledPoint1Error: mean(tail.map((sample) => sample.point1Error)),
    settledPoint2Error: mean(tail.map((sample) => sample.point2Error)),
    settledObjectSpeed: mean(tail.map((sample) => sample.objectLinearSpeed)),
    settledAngularSpeed: mean(tail.map((sample) => sample.objectAngularSpeed)),
    saturationFrames,
    saturationFraction: saturationFrames / STATIC_TOTAL_FRAMES,
    commandSaturationFrames,
    commandSaturationFraction: commandSaturationFrames / (STATIC_COMMAND_FRAMES + 1),
    totalAppliedImpulse,
    peakObjectSpeed,
    peakAngularSpeed,
    maxObjectCenterX,
    final: samples.at(-1),
    checkpoints: samples
      .map((sample, frame) => ({ frame, ...sample }))
      .filter(({ frame }) => frame % 30 === 0 || frame === STATIC_COMMAND_FRAMES || frame === STATIC_TOTAL_FRAMES - 1),
  };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

function runReleaseMomentumCase() {
  const fixture = createFixture({ wall: false, damping: false });
  let totalDriveImpulse = 0;
  let releaseVelocity = null;
  let releaseAngularVelocity = null;
  let releaseCenter = null;

  for (let frame = 0; frame < RELEASE_DRIVE_FRAMES; frame++) {
    const translation = [RELEASE_TARGET_STEP * (frame + 1), 0, 0];
    const telemetry = stepCoupledTwoPointActuator({
      b3,
      objectBody: fixture.object,
      coreBody: fixture.core,
      localAnchor1: ANCHOR1,
      localAnchor2: ANCHOR2,
      targetWorld1: add3(ANCHOR1, translation),
      targetWorld2: add3(ANCHOR2, translation),
      dt: DT,
      rate: RATE,
      maxForce: MAX_FORCE,
    });
    totalDriveImpulse += telemetry.appliedImpulseSum;
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
  }

  releaseVelocity = linearVelocity(fixture.object);
  releaseAngularVelocity = angularVelocity(fixture.object);
  releaseCenter = worldCenter(fixture.object);
  const releaseSpeed = norm3(releaseVelocity);

  const freeSamples = [];
  for (let frame = 0; frame < RELEASE_FREE_FRAMES; frame++) {
    // Deliberately no actuator call after release.
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    freeSamples.push({
      frame,
      center: worldCenter(fixture.object),
      velocity: linearVelocity(fixture.object),
      angularVelocity: angularVelocity(fixture.object),
    });
  }

  const final = freeSamples.at(-1);
  const finalSpeed = norm3(final.velocity);
  const expectedDisplacement = scale3(releaseVelocity, RELEASE_FREE_FRAMES * DT);
  const realizedDisplacement = sub3(final.center, releaseCenter);
  const ballisticDisplacementError = distance3(realizedDisplacement, expectedDisplacement);
  const velocityRetention = finalSpeed / Math.max(releaseSpeed, 1e-12);
  const angularVelocityChange = distance3(final.angularVelocity, releaseAngularVelocity);

  const report = {
    totalDriveImpulse,
    releaseVelocity,
    releaseAngularVelocity,
    releaseCenter,
    releaseSpeed,
    finalVelocity: final.velocity,
    finalAngularVelocity: final.angularVelocity,
    finalCenter: final.center,
    finalSpeed,
    velocityRetention,
    expectedDisplacement,
    realizedDisplacement,
    ballisticDisplacementError,
    angularVelocityChange,
    checkpoints: freeSamples.filter(({ frame }) => frame % 15 === 0 || frame === RELEASE_FREE_FRAMES - 1),
  };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

const open = runStaticTargetCase({ name: 'reachable-open-space', wall: false });
const blocked = runStaticTargetCase({ name: 'same-target-static-wall', wall: true });
const release = runReleaseMomentumCase();

// Harness integrity / safety. These fail only if the probe itself is broken or Box3D
// state becomes non-finite/unbounded, not because P3 receives a negative classification.
for (const [name, scenario] of [['open', open], ['blocked', blocked]]) {
  assert.ok(Number.isFinite(scenario.settledMidpointError), `${name} midpoint error must remain finite`);
  assert.ok(Number.isFinite(scenario.peakObjectSpeed) && scenario.peakObjectSpeed < 30, `${name} object speed must remain bounded: ${scenario.peakObjectSpeed}`);
  assert.ok(Number.isFinite(scenario.peakAngularSpeed) && scenario.peakAngularSpeed < 30, `${name} angular speed must remain bounded: ${scenario.peakAngularSpeed}`);
}
assert.ok(release.releaseSpeed > 0.5, `release specimen must accumulate material momentum before release: ${release.releaseSpeed}`);
assert.ok(Number.isFinite(release.ballisticDisplacementError), 'release displacement error must be finite');

// Predeclared mechanical classification. Negative outcomes remain valid evidence.
const openReached = open.settledMidpointError < 0.03;
const wallBlockedMaterially = blocked.settledMidpointError > 0.75;
const wallGeometryRespected = blocked.maxObjectCenterX <= EXPECTED_MAX_OBJECT_CENTER_X + 0.035;
const wallCreatesAuthorityFailure = blocked.saturationFraction > 0.35;
const contactSeparatesFromOpen = blocked.settledMidpointError > Math.max(0.50, open.settledMidpointError * 10);
const releaseMomentumPreserved =
  release.velocityRetention > 0.995 &&
  release.velocityRetention < 1.005 &&
  release.ballisticDisplacementError < 0.01 &&
  release.angularVelocityChange < 1e-4;

const contactFailureQualified =
  openReached &&
  wallBlockedMaterially &&
  wallGeometryRespected &&
  wallCreatesAuthorityFailure &&
  contactSeparatesFromOpen;

const classification = contactFailureQualified && releaseMomentumPreserved
  ? 'P3_CONTACT_CAN_DEFEAT_TASK_AND_RELEASE_PRESERVES_MOMENTUM'
  : contactFailureQualified
    ? 'P3_CONTACT_FAILURE_QUALIFIED_BUT_RELEASE_MOMENTUM_UNCLEAR'
    : 'P3_CONTACT_OR_FAILURE_SEMANTICS_NOT_YET_QUALIFIED';

const report = {
  schema: 'e18-p3-0f-contact-failure-release-stress-v1',
  boundary: 'Headless P3.0 contact/failure and release qualification. Same two-point actuator and one 900 N shared budget; no browser grammar, Donor transport, twist authority, pose writes, or parameter tuning is introduced.',
  protocol: {
    dt: DT,
    substeps: SUBSTEPS,
    rate: RATE,
    maxForce: MAX_FORCE,
    objectMass: OBJECT_MASS,
    coreMass: CORE_MASS,
    anchors: [ANCHOR1, ANCHOR2],
    staticTranslation: STATIC_TRANSLATION,
    staticCommandFrames: STATIC_COMMAND_FRAMES,
    staticHoldFrames: STATIC_HOLD_FRAMES,
    wallCenterX: WALL_CENTER_X,
    wallHalfX: WALL_HALF_X,
    wallLeftX: WALL_LEFT_X,
    expectedMaxObjectCenterX: EXPECTED_MAX_OBJECT_CENTER_X,
    releaseDriveFrames: RELEASE_DRIVE_FRAMES,
    releaseFreeFrames: RELEASE_FREE_FRAMES,
    releaseTargetStepPerFrame: RELEASE_TARGET_STEP,
  },
  open,
  blocked,
  release,
  declaredClassification: {
    openReached: 'settled midpoint error < 0.03 m',
    wallBlockedMaterially: 'blocked settled midpoint error > 0.75 m',
    wallGeometryRespected: 'max object COM x <= wallLeft - objectHalfX + 0.035 m',
    wallCreatesAuthorityFailure: 'blocked saturation fraction > 0.35',
    contactSeparatesFromOpen: 'blocked error > max(0.50 m, 10x open error)',
    releaseMomentumPreserved: 'zero-damping free-space release retains speed within 0.5%, ballistic displacement error < 0.01 m, angular-velocity change < 1e-4 rad/s',
  },
  classificationSignals: {
    openReached,
    wallBlockedMaterially,
    wallGeometryRespected,
    wallCreatesAuthorityFailure,
    contactSeparatesFromOpen,
    releaseMomentumPreserved,
  },
  classification,
  interpretation: {
    positive: 'P3 remains finite and strong when the task is reachable, but a real static contact can defeat the same task under the same shared authority budget; after actuator release, accumulated momentum is left to Box3D rather than being silently corrected toward the former target.',
    nonClaim: 'This does not establish good contact feel, useful free twist, browser usability, or full player/body causal closure. It is only the mechanical contact/failure/release gate before considering P3.1.',
  },
  verdict: 'CONTACT_FAILURE_RELEASE_STRESS_RECORDED_WITH_PREDECLARED_CLASSIFICATION',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
