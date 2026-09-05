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
const COMMAND_FRAMES = 45;
const TOTAL_FRAMES = 180;
const ROTATION_GOAL = 110 * Math.PI / 180;
const TRANSLATION_GOAL = [1.2, 0.35, -0.8];
const ANCHOR1 = [-0.75, 0.10, -0.05];
const ANCHOR2 = [0.55, -0.12, 0.08];
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

function createFixture(objectMass) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);
  const object = createDynamicBox(world, {
    position: [0, 0, 0],
    half: [0.9, 0.22, 0.22],
    mass: objectMass,
    linearDamping: 0.04,
    angularDamping: 0.08,
  });
  const core = createDynamicBox(world, {
    position: [0, -3, 0],
    half: [0.30, 0.42, 0.22],
    mass: 35,
    angularDamping: 0.08,
  });
  return { world, object, core };
}

const initialAnchorMidpoint = midpoint(ANCHOR1, ANCHOR2);
const anchorRel1 = sub3(ANCHOR1, initialAnchorMidpoint);
const anchorRel2 = sub3(ANCHOR2, initialAnchorMidpoint);

function targetState(frame) {
  const u = smoothstep01(frame / COMMAND_FRAMES);
  const theta = ROTATION_GOAL * u;
  const translatedMidpoint = add3(initialAnchorMidpoint, scale3(TRANSLATION_GOAL, u));
  const target1 = add3(translatedMidpoint, rotateY(anchorRel1, theta));
  const target2 = add3(translatedMidpoint, rotateY(anchorRel2, theta));
  return {
    u,
    theta,
    target1,
    target2,
    midpoint: midpoint(target1, target2),
    axis: sub3(target2, target1),
  };
}

function stepOnePointDepth({ object, core, targetWorld }) {
  const anchor = worldPoint(object, ANCHOR1);
  const velocity = pointVelocity(object, anchor);
  const errorVector = sub3(targetWorld, anchor);
  const desiredVelocity = scale3(errorVector, RATE);
  const deltaV = sub3(desiredVelocity, velocity);
  const deltaSpeed = norm3(deltaV);
  if (deltaSpeed < 1e-12) return { impulseMagnitude: 0, saturated: false };

  const objectMass = b3.b3Body_GetMass(object);
  const coreMass = b3.b3Body_GetMass(core);
  const center = worldCenter(object);
  const r = sub3(anchor, center);
  const n = scale3(deltaV, 1 / deltaSpeed);
  const rn = cross3(r, n);
  const inverseInertia = b3.b3Body_GetWorldInverseRotationalInertia(object);
  const rotational = Math.max(0, dot3(rn, mulMatrix3Columns(inverseInertia, rn)));
  const inverseEffectiveMass = 1 / objectMass + 1 / coreMass + rotational;
  let impulse = scale3(deltaV, 1 / inverseEffectiveMass);
  const rawMagnitude = norm3(impulse);
  const saturated = rawMagnitude > MAX_IMPULSE;
  if (saturated) impulse = scale3(impulse, MAX_IMPULSE / rawMagnitude);
  const magnitude = norm3(impulse);
  if (magnitude > 1e-12) {
    b3.b3Body_ApplyLinearImpulse(object, impulse, anchor, true);
    b3.b3Body_ApplyLinearImpulseToCenter(core, scale3(impulse, -1), true);
  }
  return { impulseMagnitude: magnitude, saturated };
}

function sample(fixture, target) {
  const p1 = worldPoint(fixture.object, ANCHOR1);
  const p2 = worldPoint(fixture.object, ANCHOR2);
  const currentAxis = sub3(p2, p1);
  const currentMidpoint = midpoint(p1, p2);
  return {
    axisError: angleBetween(currentAxis, target.axis),
    midpointError: distance3(currentMidpoint, target.midpoint),
    point1Error: distance3(p1, target.target1),
    point2Error: distance3(p2, target.target2),
    objectLinearSpeed: norm3(linearVelocity(fixture.object)),
    objectAngularSpeed: norm3(angularVelocity(fixture.object)),
    coreLinearSpeed: norm3(linearVelocity(fixture.core)),
  };
}

function summarize({ name, objectMass, samples, saturationCount, commandSaturationCount, totalImpulse }) {
  const commandSamples = samples.slice(0, COMMAND_FRAMES + 1);
  const tail = samples.slice(-30);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const rms = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
  const commandEnd = samples[Math.min(COMMAND_FRAMES, samples.length - 1)];
  const final = samples.at(-1);
  return {
    name,
    objectMass,
    commandEndAxisErrorDeg: commandEnd.axisError * 180 / Math.PI,
    commandEndMidpointError: commandEnd.midpointError,
    commandRmsAxisErrorDeg: rms(commandSamples.map((entry) => entry.axisError)) * 180 / Math.PI,
    commandRmsMidpointError: rms(commandSamples.map((entry) => entry.midpointError)),
    settledAxisErrorDeg: mean(tail.map((entry) => entry.axisError)) * 180 / Math.PI,
    settledMidpointError: mean(tail.map((entry) => entry.midpointError)),
    settledPoint1Error: mean(tail.map((entry) => entry.point1Error)),
    settledPoint2Error: mean(tail.map((entry) => entry.point2Error)),
    saturationFrames: saturationCount,
    saturationFraction: saturationCount / TOTAL_FRAMES,
    commandSaturationFrames: commandSaturationCount,
    commandSaturationFraction: commandSaturationCount / (COMMAND_FRAMES + 1),
    totalAppliedImpulse: totalImpulse,
    finalAxisErrorDeg: final.axisError * 180 / Math.PI,
    finalMidpointError: final.midpointError,
    finalObjectLinearSpeed: final.objectLinearSpeed,
    finalObjectAngularSpeed: final.objectAngularSpeed,
    finalCoreLinearSpeed: final.coreLinearSpeed,
    checkpoints: samples
      .map((entry, frame) => ({ frame, ...entry }))
      .filter(({ frame }) => frame % 30 === 0 || frame === COMMAND_FRAMES || frame === TOTAL_FRAMES - 1)
      .map(({ frame, axisError, midpointError, objectLinearSpeed, objectAngularSpeed, coreLinearSpeed }) => ({
        frame,
        axisErrorDeg: axisError * 180 / Math.PI,
        midpointError,
        objectLinearSpeed,
        objectAngularSpeed,
        coreLinearSpeed,
      })),
  };
}

function runP3(objectMass) {
  const fixture = createFixture(objectMass);
  const samples = [];
  let saturationCount = 0;
  let commandSaturationCount = 0;
  let totalImpulse = 0;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const target = targetState(frame);
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
    assert.ok(telemetry.appliedImpulseSum <= MAX_IMPULSE + 1e-9, `P3 ${objectMass} kg exceeded shared budget at frame ${frame}`);
    if (telemetry.saturated) {
      saturationCount += 1;
      if (frame <= COMMAND_FRAMES) commandSaturationCount += 1;
    }
    totalImpulse += telemetry.appliedImpulseSum;
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    samples.push(sample(fixture, target));
  }

  const result = summarize({
    name: `P3 ${objectMass} kg`,
    objectMass,
    samples,
    saturationCount,
    commandSaturationCount,
    totalImpulse,
  });
  b3.b3DestroyWorld(fixture.world);
  return result;
}

function runP1Depth(objectMass) {
  const fixture = createFixture(objectMass);
  const samples = [];
  let saturationCount = 0;
  let commandSaturationCount = 0;
  let totalImpulse = 0;

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const target = targetState(frame);
    const telemetry = stepOnePointDepth({ object: fixture.object, core: fixture.core, targetWorld: target.target1 });
    assert.ok(telemetry.impulseMagnitude <= MAX_IMPULSE + 1e-9, `P1-depth exceeded budget at frame ${frame}`);
    if (telemetry.saturated) {
      saturationCount += 1;
      if (frame <= COMMAND_FRAMES) commandSaturationCount += 1;
    }
    totalImpulse += telemetry.impulseMagnitude;
    b3.b3World_Step(fixture.world, DT, SUBSTEPS);
    samples.push(sample(fixture, target));
  }

  const result = summarize({
    name: `P1-depth ${objectMass} kg reference`,
    objectMass,
    samples,
    saturationCount,
    commandSaturationCount,
    totalImpulse,
  });
  b3.b3DestroyWorld(fixture.world);
  return result;
}

const light = runP3(12);
const medium = runP3(24);
const heavy = runP3(96);
const p1Medium = runP1Depth(24);

for (const result of [light, medium, heavy, p1Medium]) {
  for (const value of [
    result.commandEndAxisErrorDeg,
    result.commandEndMidpointError,
    result.commandRmsAxisErrorDeg,
    result.commandRmsMidpointError,
    result.settledAxisErrorDeg,
    result.settledMidpointError,
    result.totalAppliedImpulse,
  ]) assert.ok(Number.isFinite(value), `${result.name} produced non-finite stress metric`);
}

// Predeclared interpretation. Negative classification is valid evidence and does not
// fail the harness; only broken physics/budget/non-finite behavior fails above.
const asymmetricTaskUseful =
  medium.settledAxisErrorDeg < 8 &&
  medium.settledMidpointError < 0.12;
const beatsOnePoint =
  medium.settledAxisErrorDeg < 0.6 * p1Medium.settledAxisErrorDeg &&
  medium.settledMidpointError < 0.6 * p1Medium.settledMidpointError;
const heavyShowsCost =
  heavy.commandSaturationFraction > light.commandSaturationFraction + 0.10 ||
  heavy.commandEndAxisErrorDeg > light.commandEndAxisErrorDeg + 5 ||
  heavy.commandEndMidpointError > light.commandEndMidpointError + 0.10;
const massEventuallyRecoverable = heavy.settledAxisErrorDeg < 15 && heavy.settledMidpointError < 0.30;

const mechanicalClassification = asymmetricTaskUseful && beatsOnePoint && heavyShowsCost && massEventuallyRecoverable
  ? 'P3_ASYMMETRIC_SHARED_AUTHORITY_PROMISING_WITH_MASS_COST'
  : 'P3_STRESS_EVIDENCE_MIXED_OR_NEGATIVE';

const report = {
  schema: 'e18-p3-0d-authority-mass-stress-v1',
  boundary: 'Free-space stress test after P3.0c. Two asymmetric anchors undergo one rigid target transform combining 110° axis rotation with 3D translation. P3 light/medium/heavy bodies all share the same 900 N total per-frame budget. A 24 kg E17-depth-style one-point reference receives only target1 under the same budget. This tests authority fairness, asymmetric coupling and whether mass remains a real execution cost; it is not contact, Donor, browser or Owner evidence.',
  protocol: {
    dt: DT,
    substeps: SUBSTEPS,
    rate: RATE,
    maxForce: MAX_FORCE,
    maxImpulsePerFrame: MAX_IMPULSE,
    commandFrames: COMMAND_FRAMES,
    totalFrames: TOTAL_FRAMES,
    rotationGoalDeg: ROTATION_GOAL * 180 / Math.PI,
    translationGoal: TRANSLATION_GOAL,
    anchors: [ANCHOR1, ANCHOR2],
    coreMass: 35,
    objectMasses: [12, 24, 96],
  },
  declaredClassification: {
    asymmetricTaskUseful: 'medium settled axis < 8° and midpoint < 0.12 m',
    beatsOnePoint: 'medium P3 settled axis and midpoint each < 60% of medium P1-depth',
    heavyShowsCost: 'heavy has >0.10 extra command saturation fraction OR >5° extra command-end axis error OR >0.10 m extra command-end midpoint error vs light',
    massEventuallyRecoverable: 'heavy settled axis < 15° and midpoint < 0.30 m',
  },
  light,
  medium,
  heavy,
  p1Medium,
  comparisons: {
    mediumAxisRatioVsP1: medium.settledAxisErrorDeg / Math.max(p1Medium.settledAxisErrorDeg, 1e-12),
    mediumMidpointRatioVsP1: medium.settledMidpointError / Math.max(p1Medium.settledMidpointError, 1e-12),
    heavyVsLightCommandAxisDeltaDeg: heavy.commandEndAxisErrorDeg - light.commandEndAxisErrorDeg,
    heavyVsLightCommandMidpointDelta: heavy.commandEndMidpointError - light.commandEndMidpointError,
    heavyVsLightCommandSaturationDelta: heavy.commandSaturationFraction - light.commandSaturationFraction,
    asymmetricTaskUseful,
    beatsOnePoint,
    heavyShowsCost,
    massEventuallyRecoverable,
  },
  mechanicalClassification,
  verdict: 'STRESS_RESULT_RECORDED_WITH_PREDECLARED_CLASSIFICATION',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
