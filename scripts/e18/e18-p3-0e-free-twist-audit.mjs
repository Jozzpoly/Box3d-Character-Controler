import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { stepCoupledTwoPointActuator } from '../../src/e18/p3-coupled-two-point-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const RATE = 10;
const MAX_FORCE = 900;
const TOTAL_FRAMES = 180;
const COMMAND_FRAMES = 45;
const ROTATION_GOAL = 110 * Math.PI / 180;
const TRANSLATION_GOAL = [1.2, 0.35, -0.8];
const ASYM_ANCHOR1 = [-0.75, 0.10, -0.05];
const ASYM_ANCHOR2 = [0.55, -0.12, 0.08];
const SYM_ANCHOR1 = [-0.75, 0, 0];
const SYM_ANCHOR2 = [0.75, 0, 0];
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
  return [scalar * v[0], scalar * v[1], scalar * v[2]];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize3(v) {
  const length = norm3(v);
  return length > 1e-12 ? scale3(v, 1 / length) : [0, 0, 0];
}

function distance3(a, b) {
  return norm3(sub3(a, b));
}

function midpoint(a, b) {
  return scale3(add3(a, b), 0.5);
}

function rotateY(v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function angleBetween(a, b) {
  const na = normalize3(a);
  const nb = normalize3(b);
  return Math.acos(clamp(dot3(na, nb), -1, 1));
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

function createFixture() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);
  const object = createDynamicBox(world, {
    position: [0, 0, 0],
    half: [0.9, 0.22, 0.22],
    mass: 24,
  });
  const core = createDynamicBox(world, {
    position: [0, -3, 0],
    half: [0.30, 0.42, 0.22],
    mass: 35,
  });
  return { world, object, core };
}

function worldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function pointVelocity(body, worldPointValue) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, worldPointValue);
  return out;
}

function angularVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return out;
}

function decomposeTwist(body, localAnchor1, localAnchor2) {
  const p1 = worldPoint(body, localAnchor1);
  const p2 = worldPoint(body, localAnchor2);
  const axis = normalize3(sub3(p2, p1));
  const omega = angularVelocity(body);
  const signedTwist = dot3(omega, axis);
  const twistVector = scale3(axis, signedTwist);
  const perpendicular = sub3(omega, twistVector);
  const angularSpeed = norm3(omega);
  return {
    p1,
    p2,
    axis,
    omega,
    signedTwist,
    twistSpeed: Math.abs(signedTwist),
    perpendicularSpeed: norm3(perpendicular),
    angularSpeed,
    twistFraction: Math.abs(signedTwist) / Math.max(angularSpeed, 1e-12),
    pointSpeed1: norm3(pointVelocity(body, p1)),
    pointSpeed2: norm3(pointVelocity(body, p2)),
  };
}

function runStationaryAsymmetricControl() {
  const fixture = createFixture();
  const target1 = worldPoint(fixture.object, ASYM_ANCHOR1);
  const target2 = worldPoint(fixture.object, ASYM_ANCHOR2);
  let peakAngularSpeed = 0;
  let totalAppliedImpulse = 0;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const telemetry = stepCoupledTwoPointActuator({
      b3,
      objectBody: fixture.object,
      coreBody: fixture.core,
      localAnchor1: ASYM_ANCHOR1,
      localAnchor2: ASYM_ANCHOR2,
      targetWorld1: target1,
      targetWorld2: target2,
      dt: DT,
      rate: RATE,
      maxForce: MAX_FORCE,
    });
    totalAppliedImpulse += telemetry.appliedImpulseSum;
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    peakAngularSpeed = Math.max(peakAngularSpeed, norm3(angularVelocity(fixture.object)));
  }

  const final = decomposeTwist(fixture.object, ASYM_ANCHOR1, ASYM_ANCHOR2);
  assert.ok(peakAngularSpeed < 1e-4, `stationary asymmetric P3 must not self-excite rotation: ${peakAngularSpeed}`);
  assert.ok(totalAppliedImpulse < 1e-4, `stationary asymmetric P3 must not pump material impulse: ${totalAppliedImpulse}`);

  const report = { peakAngularSpeed, totalAppliedImpulse, final };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

function runInjectedTwist({ actuatorEnabled }) {
  const fixture = createFixture();
  const target1 = worldPoint(fixture.object, SYM_ANCHOR1);
  const target2 = worldPoint(fixture.object, SYM_ANCHOR2);
  b3.b3Body_SetAngularVelocity(fixture.object, [4, 0, 0]);
  let totalAppliedImpulse = 0;
  const samples = [];

  for (let frame = 0; frame < 120; frame++) {
    if (actuatorEnabled) {
      const telemetry = stepCoupledTwoPointActuator({
        b3,
        objectBody: fixture.object,
        coreBody: fixture.core,
        localAnchor1: SYM_ANCHOR1,
        localAnchor2: SYM_ANCHOR2,
        targetWorld1: target1,
        targetWorld2: target2,
        dt: DT,
        rate: RATE,
        maxForce: MAX_FORCE,
      });
      totalAppliedImpulse += telemetry.appliedImpulseSum;
    }
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    if (frame % 30 === 0 || frame === 119) {
      samples.push({ frame, ...decomposeTwist(fixture.object, SYM_ANCHOR1, SYM_ANCHOR2) });
    }
  }

  const final = decomposeTwist(fixture.object, SYM_ANCHOR1, SYM_ANCHOR2);
  const report = { actuatorEnabled, totalAppliedImpulse, samples, final };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

const asymInitialMidpoint = midpoint(ASYM_ANCHOR1, ASYM_ANCHOR2);
const asymRel1 = sub3(ASYM_ANCHOR1, asymInitialMidpoint);
const asymRel2 = sub3(ASYM_ANCHOR2, asymInitialMidpoint);

function asymmetricTargetState(frame) {
  const u = smoothstep01(frame / COMMAND_FRAMES);
  const theta = ROTATION_GOAL * u;
  const targetMidpoint = add3(asymInitialMidpoint, scale3(TRANSLATION_GOAL, u));
  const target1 = add3(targetMidpoint, rotateY(asymRel1, theta));
  const target2 = add3(targetMidpoint, rotateY(asymRel2, theta));
  return { target1, target2, midpoint: targetMidpoint, axis: sub3(target2, target1) };
}

function runAsymmetricCommandedCase() {
  const fixture = createFixture();
  const samples = [];
  let totalAppliedImpulse = 0;
  let saturationFrames = 0;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const target = asymmetricTargetState(frame);
    const telemetry = stepCoupledTwoPointActuator({
      b3,
      objectBody: fixture.object,
      coreBody: fixture.core,
      localAnchor1: ASYM_ANCHOR1,
      localAnchor2: ASYM_ANCHOR2,
      targetWorld1: target.target1,
      targetWorld2: target.target2,
      dt: DT,
      rate: RATE,
      maxForce: MAX_FORCE,
    });
    totalAppliedImpulse += telemetry.appliedImpulseSum;
    if (telemetry.saturated) saturationFrames += 1;
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);

    const decomposition = decomposeTwist(fixture.object, ASYM_ANCHOR1, ASYM_ANCHOR2);
    const currentMidpoint = midpoint(decomposition.p1, decomposition.p2);
    const axisErrorDeg = angleBetween(sub3(decomposition.p2, decomposition.p1), target.axis) * 180 / Math.PI;
    const midpointError = distance3(currentMidpoint, target.midpoint);
    samples.push({ frame, axisErrorDeg, midpointError, ...decomposition });
  }

  const tail = samples.slice(-30);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const tailMeanTwistSpeed = mean(tail.map((sample) => sample.twistSpeed));
  const tailMeanPerpendicularSpeed = mean(tail.map((sample) => sample.perpendicularSpeed));
  const tailMeanAngularSpeed = mean(tail.map((sample) => sample.angularSpeed));
  const tailMeanTwistFraction = mean(tail.map((sample) => sample.twistFraction));
  const tailMeanAxisErrorDeg = mean(tail.map((sample) => sample.axisErrorDeg));
  const tailMeanMidpointError = mean(tail.map((sample) => sample.midpointError));
  const tailMeanMaxPointSpeed = mean(tail.map((sample) => Math.max(sample.pointSpeed1, sample.pointSpeed2)));

  const report = {
    totalAppliedImpulse,
    saturationFrames,
    tailMeanTwistSpeed,
    tailMeanPerpendicularSpeed,
    tailMeanAngularSpeed,
    tailMeanTwistFraction,
    tailMeanAxisErrorDeg,
    tailMeanMidpointError,
    tailMeanMaxPointSpeed,
    final: samples.at(-1),
    checkpoints: samples.filter((sample) => sample.frame % 30 === 0 || sample.frame === COMMAND_FRAMES || sample.frame === TOTAL_FRAMES - 1),
  };
  b3.b3DestroyWorld(fixture.world);
  return report;
}

const stationaryControl = runStationaryAsymmetricControl();
const passiveInjectedTwist = runInjectedTwist({ actuatorEnabled: false });
const activeInjectedTwist = runInjectedTwist({ actuatorEnabled: true });
const commandedAsymmetric = runAsymmetricCommandedCase();

const injectedFinalTwistDifference = Math.abs(
  activeInjectedTwist.final.twistSpeed - passiveInjectedTwist.final.twistSpeed,
);
assert.ok(
  injectedFinalTwistDifference < 1e-4,
  `P3 should not materially damp/drive pure symmetric free twist vs passive Box3D: ${injectedFinalTwistDifference}`,
);
assert.ok(
  activeInjectedTwist.totalAppliedImpulse < 1e-4,
  `pure symmetric twist should be invisible to two-point actuator: ${activeInjectedTwist.totalAppliedImpulse}`,
);

// Predeclared classification of the unexpected P3.0d behavior. A negative result is
// valid evidence and does not fail the harness.
const commandedTwistMaterial = commandedAsymmetric.tailMeanTwistSpeed > 1.0;
const commandedMotionMostlyTwist = commandedAsymmetric.tailMeanTwistFraction > 0.80;
const commandedPointsStillOwned =
  commandedAsymmetric.tailMeanAxisErrorDeg < 1.0 &&
  commandedAsymmetric.tailMeanMidpointError < 0.01 &&
  commandedAsymmetric.tailMeanMaxPointSpeed < 0.10;

const classification = commandedTwistMaterial && commandedMotionMostlyTwist && commandedPointsStillOwned
  ? 'P3_FREE_TWIST_CONFIRMED_AS_MATERIAL_UNOWNED_NULL_DOF'
  : 'P3_FREE_TWIST_NOT_MATERIAL_OR_MODEL_UNCLEAR';

const report = {
  schema: 'e18-p3-0e-free-twist-audit-v1',
  boundary: 'Bounded follow-up to the high residual angular speed discovered in P3.0d. It distinguishes self-excitation, passive/unowned twist, and commanded asymmetric free-twist accumulation. No browser input, Donor transport, contacts, twist damper or extra orientation authority is introduced.',
  protocol: {
    dt: DT,
    substeps: SUBSTEPS,
    rate: RATE,
    maxForce: MAX_FORCE,
    objectMass: 24,
    coreMass: 35,
    asymmetricAnchors: [ASYM_ANCHOR1, ASYM_ANCHOR2],
    symmetricAnchors: [SYM_ANCHOR1, SYM_ANCHOR2],
    injectedTwistRadPerSec: 4,
    commandedRotationDeg: ROTATION_GOAL * 180 / Math.PI,
    commandedTranslation: TRANSLATION_GOAL,
  },
  stationaryControl,
  passiveInjectedTwist,
  activeInjectedTwist,
  injectedFinalTwistDifference,
  commandedAsymmetric,
  declaredClassification: {
    commandedTwistMaterial: 'tail mean |omega dot gripAxis| > 1 rad/s',
    commandedMotionMostlyTwist: 'tail mean twist/angular-speed fraction > 0.80',
    commandedPointsStillOwned: 'tail axis error < 1°, midpoint error < 0.01 m, max anchor point speed < 0.10 m/s',
  },
  classificationSignals: {
    commandedTwistMaterial,
    commandedMotionMostlyTwist,
    commandedPointsStillOwned,
  },
  classification,
  interpretation: {
    ifConfirmed: 'The two point task owns both anchor positions/axis while leaving substantial rigid-body rotation about their connecting line physically unowned. The symmetric injected-twist control shows this is a true task null DOF rather than hidden twist damping or a stationary numerical instability.',
    nonClaim: 'This does not decide whether free twist is fun, harmful, or should later receive a separate clutch/orientation channel. It only classifies the mechanical behavior before contact and Owner-facing work.',
  },
  verdict: 'FREE_TWIST_AUDIT_RECORDED_WITH_PREDECLARED_CLASSIFICATION',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
