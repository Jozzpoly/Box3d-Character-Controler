import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17PointMassManipulatorCharacter } from '../../src/e17-point-mass-manipulator-character.js';
import { createE18P3StagedManipulatorCharacter } from '../../src/e18/p3-staged-manipulator-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const MAX_FORCE = 900;
const MAX_IMPULSE = MAX_FORCE * DT;
const ZERO_INTENT = {
  moveForward: 0,
  moveRight: 0,
  forward: [0, 0, -1],
  right: [1, 0, 0],
  jump: false,
  jumpHeld: false,
  sprint: false,
};
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(v, scalar) {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function length3(v) {
  return Math.hypot(...v);
}

function normalize3(v) {
  const length = length3(v);
  return length > 1e-12 ? scale3(v, 1 / length) : [1, 0, 0];
}

function distance3(a, b) {
  return length3(sub3(a, b));
}

function angleDegrees(a, b) {
  const na = normalize3(a);
  const nb = normalize3(b);
  const dot = Math.max(-1, Math.min(1, na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2]));
  return Math.acos(dot) * 180 / Math.PI;
}

function createWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createDynamicBox(world, position, half = [0.45, 0.24, 0.30], density = 55) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = density;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, half };
}

function tick(world, character, count = 1) {
  for (let i = 0; i < count; i++) {
    character.preStep(DT, ZERO_INTENT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
  }
}

function worldPoint(body, local) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, local);
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

function makeCharacter(factory, world) {
  const character = factory(b3, world, {
    startPosition: [0, 0, 0],
    gravity: 0,
    feedbackGain: 0,
    manipulatorRate: 10,
    manipulatorMaxForce: MAX_FORCE,
  });
  tick(world, character, 12);
  return character;
}

function runRoughEquivalence() {
  const stagedWorld = createWorld();
  const referenceWorld = createWorld();
  const staged = makeCharacter(createE18P3StagedManipulatorCharacter, stagedWorld);
  const reference = makeCharacter(createE17PointMassManipulatorCharacter, referenceWorld);
  const yA = staged.bodyPosition[1];
  const yB = reference.bodyPosition[1];
  const boxA = createDynamicBox(stagedWorld, [1.10, yA, 0]);
  const boxB = createDynamicBox(referenceWorld, [1.10, yB, 0]);
  const anchorA = [1.10, yA + boxA.half[1], boxA.half[2]];
  const anchorB = [1.10, yB + boxB.half[1], boxB.half[2]];
  assert.equal(staged.beginManipulation(boxA.body, anchorA), true);
  assert.equal(reference.beginManipulation(boxB.body, anchorB), true);
  const delta = [-0.18, 0.08, 0.16];
  staged.setManipulationTarget(add3(anchorA, delta));
  reference.setManipulationTarget(add3(anchorB, delta));

  let maxAnchorDelta = 0;
  let maxImpulseDelta = 0;
  for (let frame = 0; frame < 90; frame++) {
    tick(stagedWorld, staged);
    tick(referenceWorld, reference);
    maxAnchorDelta = Math.max(maxAnchorDelta, distance3(staged.manipulatedAnchorWorld, reference.manipulatedAnchorWorld));
    maxImpulseDelta = Math.max(maxImpulseDelta, Math.abs(staged.lastManipulatorImpulse - reference.lastManipulatorImpulse));
  }

  const report = {
    maxAnchorDelta,
    maxImpulseDelta,
    stagedError: staged.lastManipulatorError,
    referenceError: reference.lastManipulatorError,
    stagedMode: staged.telemetry().manipulationMode,
  };
  b3.b3DestroyWorld(stagedWorld);
  b3.b3DestroyWorld(referenceWorld);
  return report;
}

function runTransitionAndAxisControl() {
  const world = createWorld();
  const character = makeCharacter(createE18P3StagedManipulatorCharacter, world);
  const y = character.bodyPosition[1];
  const fixture = createDynamicBox(world, [1.08, y, 0], [0.52, 0.22, 0.32], 55);
  const anchor = [1.08, y + 0.12, fixture.half[2]];
  assert.equal(character.beginManipulation(fixture.body, anchor), true);
  character.setManipulationTarget(anchor);
  tick(world, character, 2);

  const primaryBefore = [...character.manipulatedAnchorWorld];
  const precisionMidpoint = character.beginPrecisionManipulation();
  assert.ok(precisionMidpoint, 'precision engagement must succeed');
  const secondBefore = [...character.precisionAnchorWorld2];
  const initialTarget1 = [...character.precisionRequestedTarget1];
  const initialTarget2 = [...character.precisionRequestedTarget2];
  const entryTargetSnap = Math.max(
    distance3(initialTarget1, primaryBefore),
    distance3(initialTarget2, secondBefore),
  );

  tick(world, character, 1);
  const firstPrecisionImpulse = character.lastManipulatorImpulse;
  const initialTargetAxis = sub3(character.precisionRequestedTarget2, character.precisionRequestedTarget1);

  // Ask for a material axis change while also translating the pair midpoint.
  character.rotatePrecisionTarget([0, 1, 0], Math.PI * 0.60);
  character.setManipulationTarget(add3(character.manipulationIntentTarget(), [0.22, 0.07, -0.12]));
  let peakImpulse = 0;
  let saturationFrames = 0;
  for (let frame = 0; frame < 150; frame++) {
    tick(world, character, 1);
    peakImpulse = Math.max(peakImpulse, character.lastManipulatorImpulse);
    if (character.lastPrecisionSaturated) saturationFrames += 1;
  }

  const actualAxis = sub3(character.precisionAnchorWorld2, character.manipulatedAnchorWorld);
  const requestedAxis = sub3(character.precisionTarget2, character.precisionTarget1);
  const axisError = angleDegrees(actualAxis, requestedAxis);
  const midpointActual = scale3(add3(character.manipulatedAnchorWorld, character.precisionAnchorWorld2), 0.5);
  const midpointError = distance3(midpointActual, character.precisionTargetMidpoint);
  const axisChangedDegrees = angleDegrees(initialTargetAxis, requestedAxis);

  const velocityBeforeExit = linearVelocity(fixture.body);
  const omegaBeforeExit = angularVelocity(fixture.body);
  const roughResumeTarget = character.endPrecisionManipulation();
  const velocityAfterExit = linearVelocity(fixture.body);
  const omegaAfterExit = angularVelocity(fixture.body);
  const exitVelocityMutation = Math.max(
    distance3(velocityBeforeExit, velocityAfterExit),
    distance3(omegaBeforeExit, omegaAfterExit),
  );
  const primaryAtExit = worldPoint(fixture.body, character.manipulatedLocalAnchor);
  const exitTargetSnap = distance3(roughResumeTarget, primaryAtExit);

  const velocityBeforeRelease = linearVelocity(fixture.body);
  const omegaBeforeRelease = angularVelocity(fixture.body);
  assert.equal(character.releaseManipulation('staged-smoke-release'), true);
  const velocityAfterRelease = linearVelocity(fixture.body);
  const omegaAfterRelease = angularVelocity(fixture.body);
  const releaseVelocityMutation = Math.max(
    distance3(velocityBeforeRelease, velocityAfterRelease),
    distance3(omegaBeforeRelease, omegaAfterRelease),
  );

  const report = {
    entryTargetSnap,
    firstPrecisionImpulse,
    peakImpulse,
    saturationFrames,
    axisChangedDegrees,
    axisError,
    midpointError,
    exitTargetSnap,
    exitVelocityMutation,
    releaseVelocityMutation,
    precisionEngagementCount: character.precisionEngagementCount,
    finalReleaseReason: character.lastManipulatorReleaseReason,
  };
  b3.b3DestroyWorld(world);
  return report;
}

const rough = runRoughEquivalence();
const staged = runTransitionAndAxisControl();

const report = {
  schema: 'e18-p3-1a-staged-lifecycle-smoke-v1',
  boundary: 'Headless lifecycle qualifier for the P3.1 rough↔precision staged character. It tests transition semantics and shared authority only; it does not qualify browser sensitivity, camera mapping, depth feel or Owner usability.',
  rough,
  staged,
};

assert.ok(rough.maxAnchorDelta < 1e-7, `rough staged path drifted from frozen E17-depth reference: ${rough.maxAnchorDelta}`);
assert.ok(rough.maxImpulseDelta < 1e-7, `rough staged impulse drifted from frozen E17-depth reference: ${rough.maxImpulseDelta}`);
assert.equal(rough.stagedMode, 'rough-one-point');
assert.ok(staged.entryTargetSnap < 1e-7, `precision engagement introduced target snap: ${staged.entryTargetSnap}`);
assert.ok(staged.firstPrecisionImpulse < 1e-4, `stationary precision engagement introduced material impulse: ${staged.firstPrecisionImpulse}`);
assert.ok(staged.peakImpulse <= MAX_IMPULSE + 1e-6, `precision exceeded shared impulse budget: ${staged.peakImpulse} > ${MAX_IMPULSE}`);
assert.ok(staged.axisChangedDegrees > 90, `precision request did not contain a material axis change: ${staged.axisChangedDegrees}`);
assert.ok(staged.axisError < 3, `precision failed to own requested axis: ${staged.axisError} deg`);
assert.ok(staged.midpointError < 0.06, `precision failed to own requested midpoint: ${staged.midpointError} m`);
assert.ok(staged.exitTargetSnap < 1e-7, `precision exit did not resume rough at physical primary anchor: ${staged.exitTargetSnap}`);
assert.ok(staged.exitVelocityMutation < 1e-12, `precision exit mutated physical velocity: ${staged.exitVelocityMutation}`);
assert.ok(staged.releaseVelocityMutation < 1e-12, `release mutated physical velocity: ${staged.releaseVelocityMutation}`);
assert.equal(staged.precisionEngagementCount, 1);
assert.equal(staged.finalReleaseReason, 'staged-smoke-release');

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
