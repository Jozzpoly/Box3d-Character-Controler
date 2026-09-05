import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { stepCoupledTwoPointActuator } from '../../src/e18/p3-coupled-two-point-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const RATE = 10;
const MAX_FORCE = 900;
const MAX_IMPULSE = MAX_FORCE * DT;
const COMMAND_FRAMES = 60;
const TOTAL_FRAMES = 180;
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

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
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

function signedYawOfAxis(axis) {
  const n = normalize3(axis);
  return Math.atan2(-n[2], n[0]);
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function createDynamicBox(world, { position, half, mass, linearDamping = 0, angularDamping = 0 }) {
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

function pointVelocity(body, point) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, point);
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

function mulMatrix3Columns(matrix, vector) {
  return [
    matrix.cx[0] * vector[0] + matrix.cy[0] * vector[1] + matrix.cz[0] * vector[2],
    matrix.cx[1] * vector[0] + matrix.cy[1] * vector[1] + matrix.cz[1] * vector[2],
    matrix.cx[2] * vector[0] + matrix.cy[2] * vector[1] + matrix.cz[2] * vector[2],
  ];
}

function createFixture() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);
  const object = createDynamicBox(world, {
    position: [0, 0, 0],
    half: [0.9, 0.18, 0.18],
    mass: 24,
    linearDamping: 0.04,
    angularDamping: 0.08,
  });
  const core = createDynamicBox(world, {
    position: [0, -3, 0],
    half: [0.30, 0.42, 0.22],
    mass: 35,
    angularDamping: 0.08,
  });
  return {
    world,
    object,
    core,
    localAnchor1: [-0.75, 0, 0],
    localAnchor2: [0.75, 0, 0],
    targetMidpoint: [0, 0, 0],
  };
}

function targetState(frame) {
  const u = smoothstep01(frame / COMMAND_FRAMES);
  const theta = 0.5 * Math.PI * u;
  const halfAxis = rotateY([0.75, 0, 0], theta);
  return {
    theta,
    target1: scale3(halfAxis, -1),
    target2: [...halfAxis],
    axis: scale3(halfAxis, 2),
    midpoint: [0, 0, 0],
  };
}

function stepOnePointDepth({ object, core, localAnchor, targetWorld }) {
  const anchor = worldPoint(object, localAnchor);
  const velocity = pointVelocity(object, anchor);
  const error = sub3(targetWorld, anchor);
  const desiredVelocity = scale3(error, RATE);
  const deltaV = sub3(desiredVelocity, velocity);
  const deltaSpeed = norm3(deltaV);
  if (deltaSpeed < 1e-12) {
    return { impulse: [0, 0, 0], impulseMagnitude: 0, saturated: false, error: norm3(error) };
  }

  const objectMass = b3.b3Body_GetMass(object);
  const coreMass = b3.b3Body_GetMass(core);
  const center = worldCenter(object);
  const r = sub3(anchor, center);
  const n = scale3(deltaV, 1 / deltaSpeed);
  const rn = cross3(r, n);
  const inverseInertia = b3.b3Body_GetWorldInverseRotationalInertia(object);
  const inverseInertiaRn = mulMatrix3Columns(inverseInertia, rn);
  const rotational = Math.max(0, dot3(rn, inverseInertiaRn));
  const inverseEffectiveMass = 1 / objectMass + 1 / coreMass + rotational;
  const effectiveMass = inverseEffectiveMass > 1e-12 ? 1 / inverseEffectiveMass : 0;
  let impulse = scale3(deltaV, effectiveMass);
  const rawMagnitude = norm3(impulse);
  const saturated = rawMagnitude > MAX_IMPULSE;
  if (saturated && rawMagnitude > 1e-12) impulse = scale3(impulse, MAX_IMPULSE / rawMagnitude);
  const magnitude = norm3(impulse);

  if (magnitude > 1e-12) {
    b3.b3Body_ApplyLinearImpulse(object, impulse, anchor, true);
    b3.b3Body_ApplyLinearImpulseToCenter(core, scale3(impulse, -1), true);
  }

  return { impulse, impulseMagnitude: magnitude, rawMagnitude, saturated, error: norm3(error) };
}

function sampleState(fixture, target, actuatorTelemetry = null) {
  const p1 = worldPoint(fixture.object, fixture.localAnchor1);
  const p2 = worldPoint(fixture.object, fixture.localAnchor2);
  const axis = sub3(p2, p1);
  const currentMidpoint = midpoint(p1, p2);
  const axisError = angleBetween(axis, target.axis);
  const signedAxisYaw = signedYawOfAxis(axis);
  return {
    p1,
    p2,
    axis,
    axisError,
    axisErrorDeg: axisError * 180 / Math.PI,
    signedAxisYaw,
    signedYawError: signedAxisYaw - target.theta,
    midpointError: distance3(currentMidpoint, target.midpoint),
    objectLinearSpeed: norm3(linearVelocity(fixture.object)),
    objectAngularSpeed: norm3(angularVelocity(fixture.object)),
    coreLinearSpeed: norm3(linearVelocity(fixture.core)),
    actuatorTelemetry,
  };
}

function summarize(name, samples, saturationCount, totalImpulse) {
  const tail = samples.slice(-30);
  const hold = samples.slice(COMMAND_FRAMES);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const settledAxisError = mean(tail.map((sample) => sample.axisError));
  const settledMidpointError = mean(tail.map((sample) => sample.midpointError));
  const peakHoldAxisError = Math.max(...hold.map((sample) => sample.axisError));
  const peakHoldMidpointError = Math.max(...hold.map((sample) => sample.midpointError));
  const peakPositiveOvershoot = Math.max(0, ...hold.map((sample) => sample.signedYawError));
  const peakNegativeOvershoot = Math.min(0, ...hold.map((sample) => sample.signedYawError));
  const final = samples.at(-1);
  return {
    name,
    settledAxisError,
    settledAxisErrorDeg: settledAxisError * 180 / Math.PI,
    settledMidpointError,
    peakHoldAxisError,
    peakHoldAxisErrorDeg: peakHoldAxisError * 180 / Math.PI,
    peakHoldMidpointError,
    peakPositiveOvershootDeg: peakPositiveOvershoot * 180 / Math.PI,
    peakNegativeOvershootDeg: peakNegativeOvershoot * 180 / Math.PI,
    saturationFrames: saturationCount,
    saturationFraction: saturationCount / TOTAL_FRAMES,
    totalAppliedImpulse: totalImpulse,
    finalAxisYawDeg: final.signedAxisYaw * 180 / Math.PI,
    finalAxisErrorDeg: final.axisErrorDeg,
    finalMidpointError: final.midpointError,
    finalObjectLinearSpeed: final.objectLinearSpeed,
    finalObjectAngularSpeed: final.objectAngularSpeed,
    finalCoreLinearSpeed: final.coreLinearSpeed,
    checkpoints: samples.filter((_, index) => index % 30 === 0 || index === TOTAL_FRAMES - 1).map((sample, index) => ({
      sampleFrame: index === Math.floor((TOTAL_FRAMES - 1) / 30) + 1 ? TOTAL_FRAMES - 1 : index * 30,
      axisErrorDeg: sample.axisErrorDeg,
      midpointError: sample.midpointError,
      signedAxisYawDeg: sample.signedAxisYaw * 180 / Math.PI,
      objectAngularSpeed: sample.objectAngularSpeed,
      coreLinearSpeed: sample.coreLinearSpeed,
    })),
  };
}

function runP3() {
  const fixture = createFixture();
  const samples = [];
  let saturationCount = 0;
  let totalImpulse = 0;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const target = targetState(frame);
    const telemetry = stepCoupledTwoPointActuator({
      b3,
      objectBody: fixture.object,
      coreBody: fixture.core,
      localAnchor1: fixture.localAnchor1,
      localAnchor2: fixture.localAnchor2,
      targetWorld1: target.target1,
      targetWorld2: target.target2,
      dt: DT,
      rate: RATE,
      maxForce: MAX_FORCE,
    });
    if (telemetry.saturated) saturationCount += 1;
    totalImpulse += telemetry.appliedImpulseSum;
    assert.ok(telemetry.appliedImpulseSum <= MAX_IMPULSE + 1e-9, `P3 frame ${frame} exceeded shared budget`);
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    samples.push(sampleState(fixture, target, telemetry));
  }

  const summary = summarize('P3 coupled two-point', samples, saturationCount, totalImpulse);
  b3.b3DestroyWorld(fixture.world);
  return summary;
}

function runP1DepthReference() {
  const fixture = createFixture();
  const samples = [];
  let saturationCount = 0;
  let totalImpulse = 0;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const target = targetState(frame);
    const telemetry = stepOnePointDepth({
      object: fixture.object,
      core: fixture.core,
      localAnchor: fixture.localAnchor1,
      targetWorld: target.target1,
    });
    if (telemetry.saturated) saturationCount += 1;
    totalImpulse += telemetry.impulseMagnitude;
    assert.ok(telemetry.impulseMagnitude <= MAX_IMPULSE + 1e-9, `P1-depth frame ${frame} exceeded budget`);
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    samples.push(sampleState(fixture, target, telemetry));
  }

  const summary = summarize('P1-depth one-point reference', samples, saturationCount, totalImpulse);
  b3.b3DestroyWorld(fixture.world);
  return summary;
}

const p3 = runP3();
const p1Depth = runP1DepthReference();

for (const value of [
  p3.settledAxisError,
  p3.settledMidpointError,
  p3.totalAppliedImpulse,
  p1Depth.settledAxisError,
  p1Depth.settledMidpointError,
  p1Depth.totalAppliedImpulse,
]) {
  assert.ok(Number.isFinite(value), 'axis-control crucible produced non-finite summary value');
}

// These thresholds are declared before inspecting the result and classify whether the
// next experiment is worth doing. They do not turn machine output into Owner judgement.
const p3AxisUseful = p3.settledAxisErrorDeg < 12;
const materiallyBetterAxis = p3.settledAxisError < 0.6 * p1Depth.settledAxisError;
const boundedMidpoint = p3.settledMidpointError < 0.25;
const mechanicalClassification = p3AxisUseful && materiallyBetterAxis && boundedMidpoint
  ? 'P3_AXIS_CONTROL_MECHANICALLY_PROMISING'
  : 'P3_AXIS_CONTROL_NOT_YET_SEPARATED';

const report = {
  schema: 'e18-p3-0c-axis-control-crucible-v1',
  boundary: 'First multi-frame free-space comparison of coupled P3 axis control against an E17-depth-style one-point reference under the same 900 N per-frame authority ceiling. P3 receives two target points but a single shared impulse budget; P1-depth receives one target point and the same total budget. This is not browser input, contact ecology, Donor transport or Owner gameplay evidence.',
  protocol: {
    dt: DT,
    substeps: SUBSTEPS,
    rate: RATE,
    maxForce: MAX_FORCE,
    maxImpulsePerFrame: MAX_IMPULSE,
    commandFrames: COMMAND_FRAMES,
    totalFrames: TOTAL_FRAMES,
    targetAxisRotationDeg: 90,
    objectMass: 24,
    coreMass: 35,
    objectHalf: [0.9, 0.18, 0.18],
    anchors: [[-0.75, 0, 0], [0.75, 0, 0]],
  },
  declaredClassificationThresholds: {
    p3SettledAxisErrorDegLessThan: 12,
    p3AxisErrorRatioVsP1DepthLessThan: 0.6,
    p3SettledMidpointErrorLessThan: 0.25,
  },
  p3,
  p1Depth,
  comparison: {
    settledAxisErrorRatioP3OverP1Depth: p3.settledAxisError / Math.max(p1Depth.settledAxisError, 1e-12),
    settledMidpointErrorRatioP3OverP1Depth: p3.settledMidpointError / Math.max(p1Depth.settledMidpointError, 1e-12),
    totalImpulseRatioP3OverP1Depth: p3.totalAppliedImpulse / Math.max(p1Depth.totalAppliedImpulse, 1e-12),
    p3AxisUseful,
    materiallyBetterAxis,
    boundedMidpoint,
  },
  mechanicalClassification,
  verdict: 'MULTIFRAME_RESULT_RECORDED_WITH_PREDECLARED_CLASSIFICATION',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
