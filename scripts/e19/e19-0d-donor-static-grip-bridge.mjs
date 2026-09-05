import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createConstraintVelocityCharacter } from '../../src/constraint-velocity-character.js';
import { stepDualGripActuator } from '../../src/e19/dual-grip-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const START = [0, 8, 0];
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function add3InPlace(target, delta) {
  target[0] += delta[0];
  target[1] += delta[1];
  target[2] += delta[2];
}

function neutralIntent(overrides = {}) {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function makeWorld({ ceiling = false } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  if (ceiling) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [0, 2.7, 0];
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = 0.8;
    shapeDef.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(body, shapeDef, 5, 0.2, 5);
  }

  return world;
}

function createDonor(world, start = START) {
  return createConstraintVelocityCharacter(b3, world, {
    startPosition: start,
    gravity: 20,
  });
}

function makeStaticGripSpec(character, hands) {
  const localOffsets = hands === 1
    ? [[0, 1.25, 0]]
    : [[-0.28, 1.25, 0], [0.28, 1.25, 0]];
  return {
    grips: localOffsets.map((offset) => ({
      staticWorldAnchor: [
        character.position[0] + offset[0],
        character.position[1] + offset[1],
        character.position[2] + offset[2],
      ],
    })),
    desiredOffsets: localOffsets.map((offset) => [...offset]),
  };
}

function stepDonor(world, character, control, gripStep = null) {
  character.preStep(DT, control);
  let telemetry = null;
  if (gripStep) {
    telemetry = stepDualGripActuator({
      b3,
      playerPosition: character.position,
      playerVelocity: character.velocity,
      playerMass: character.virtualMass,
      grips: gripStep.grips,
      desiredOffsets: gripStep.desiredOffsets,
      dt: DT,
      rate: gripStep.rate ?? 12,
      maxForcePerGrip: gripStep.forcePerHand,
      maxForceSum: gripStep.maxForceSum ?? Number.POSITIVE_INFINITY,
    });

    // E19 hypothesis under test: the reciprocal grip impulse is a current physical
    // constraint response on the accepted 80 kg Donor mass. It enters velocity here,
    // before the normal capsule solve, and is NOT accumulated into externalVelocity.
    add3InPlace(character.velocity, telemetry.playerDeltaV);
  }
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  return telemetry;
}

function runAirborneHang({ name, hands, forcePerHand, holdFrames = 360, releaseFrames = 30 }) {
  const world = makeWorld();
  const character = createDonor(world);
  const grip = makeStaticGripSpec(character, hands);
  grip.forcePerHand = forcePerHand;

  let saturatedFrames = 0;
  let peakOffsetFromStart = 0;
  let peakAppliedForce = 0;
  let finalHoldTelemetry = null;

  for (let frame = 0; frame < holdFrames; frame++) {
    const telemetry = stepDonor(world, character, neutralIntent(), grip);
    if (telemetry.perGripSaturated.some(Boolean)) saturatedFrames += 1;
    peakAppliedForce = Math.max(peakAppliedForce, telemetry.appliedImpulseSum / DT);
    peakOffsetFromStart = Math.max(peakOffsetFromStart, Math.abs(character.position[1] - START[1]));
    finalHoldTelemetry = telemetry;
  }

  const beforeRelease = {
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
  };

  for (let frame = 0; frame < releaseFrames; frame++) {
    stepDonor(world, character, neutralIntent(), null);
  }

  const result = {
    name,
    hands,
    forcePerHand,
    theoreticalTotalCapacity: hands * forcePerHand,
    donorVirtualMass: character.virtualMass,
    donorGravity: character.gravity,
    donorFallGravityMultiplier: character.fallGravityMultiplier,
    groundAcceleration: character.groundAcceleration,
    groundBraking: character.groundDeceleration,
    holdFrames,
    finalHoldPosition: beforeRelease.position,
    finalHoldVelocity: beforeRelease.velocity,
    finalHoldExternalVelocity: beforeRelease.externalVelocity,
    peakOffsetFromStart,
    saturatedFrames,
    saturationFraction: saturatedFrames / holdFrames,
    peakAppliedForce,
    finalAppliedForce: finalHoldTelemetry.appliedImpulseSum / DT,
    finalPerGripForces: finalHoldTelemetry.impulses.map((impulse) => Math.hypot(...impulse) / DT),
    afterReleasePosition: [...character.position],
    afterReleaseVelocity: [...character.velocity],
    afterReleaseExternalVelocity: [...character.externalVelocity],
  };

  b3.b3DestroyWorld(world);
  return result;
}

function runNoGripControl(frames = 120) {
  const world = makeWorld();
  const character = createDonor(world);
  for (let frame = 0; frame < frames; frame++) stepDonor(world, character, neutralIntent(), null);
  const result = {
    frames,
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
    groundAcceleration: character.groundAcceleration,
    groundBraking: character.groundDeceleration,
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runCeilingArbitration() {
  const world = makeWorld({ ceiling: true });
  const start = [0, 0.9, 0];
  const character = createDonor(world, start);
  const grip = {
    grips: [{ staticWorldAnchor: [0, 4.0, 0] }],
    desiredOffsets: [[0, 1.5, 0]],
    forcePerHand: 5000,
    rate: 12,
  };

  let peakY = character.position[1];
  let saturatedFrames = 0;
  for (let frame = 0; frame < 120; frame++) {
    const telemetry = stepDonor(world, character, neutralIntent(), grip);
    peakY = Math.max(peakY, character.position[1]);
    if (telemetry.perGripSaturated.some(Boolean)) saturatedFrames += 1;
  }

  const result = {
    start,
    ceilingUndersideY: 2.5,
    capsuleHalfHeight: character.halfHeight,
    expectedMaxCenterY: 2.5 - character.halfHeight,
    peakY,
    finalPosition: [...character.position],
    finalVelocity: [...character.velocity],
    saturatedFrames,
    planeCount: character.lastPlaneCount,
    constraintSolveError: character.lastConstraintSolveError,
  };
  b3.b3DestroyWorld(world);
  return result;
}

const noGrip = runNoGripControl();
const weakOneHand = runAirborneHang({ name: 'donor-one-hand-900N', hands: 1, forcePerHand: 900 });
const thresholdOneHand = runAirborneHang({ name: 'donor-one-hand-1600N', hands: 1, forcePerHand: 1600 });
const twoHands = runAirborneHang({ name: 'donor-two-hands-900N-each', hands: 2, forcePerHand: 900 });
const ceiling = runCeilingArbitration();

// No grip remains ordinary accepted Donor airborne behavior; the E19 bridge is not a
// background force source and does not mutate the accepted locomotion constants.
assert.equal(noGrip.groundAcceleration, 31);
assert.equal(noGrip.groundBraking, 36);
assert.ok(noGrip.position[1] < START[1] - 20, `no-grip Donor did not free-fall normally: ${noGrip.position[1]}`);
assert.deepEqual(noGrip.externalVelocity, [0, 0, 0]);

// A single E17/P3-scale 900 N grip cannot support an 80 kg player at g=20. Once it
// loses the hold, Donor's existing fall-gravity multiplier makes failure stronger.
assert.ok(weakOneHand.finalHoldPosition[1] < START[1] - 20, `900 N hand unexpectedly held Donor weight: ${weakOneHand.finalHoldPosition[1]}`);
assert.ok(weakOneHand.saturationFraction > 0.95, 'under-capacity Donor grip should stay saturated');
assert.deepEqual(weakOneHand.finalHoldExternalVelocity, [0, 0, 0]);

// Exactly 1600 N can hold from rest because the grip cancels normal gravity in the same
// frame, preventing entry into the faster-fall state. This is a capacity boundary, not
// a proposed final hand strength.
assert.ok(Math.abs(thresholdOneHand.finalHoldPosition[1] - START[1]) < 0.03, `1600 N threshold did not hold Donor: ${thresholdOneHand.finalHoldPosition[1]}`);
assert.ok(Math.abs(thresholdOneHand.finalHoldVelocity[1]) < 0.05, `1600 N threshold retained vertical speed: ${thresholdOneHand.finalHoldVelocity[1]}`);
assert.deepEqual(thresholdOneHand.finalHoldExternalVelocity, [0, 0, 0]);

// Two independent 900 N grips should jointly support the same player and share the
// gravity load, without converting sustained grip reaction into persistent knockback.
assert.ok(Math.abs(twoHands.finalHoldPosition[1] - START[1]) < 0.03, `two 900 N hands did not hold Donor: ${twoHands.finalHoldPosition[1]}`);
assert.ok(twoHands.finalPerGripForces.every((force) => force > 770 && force < 830), `two-hand Donor load did not split near 800 N each: ${twoHands.finalPerGripForces}`);
assert.deepEqual(twoHands.finalHoldExternalVelocity, [0, 0, 0]);

// Release must immediately return authority to normal Donor gravity. No hidden latch
// force or persistent externalVelocity may survive the grip.
assert.ok(thresholdOneHand.afterReleaseVelocity[1] < -11.5, `released threshold grip did not resume Donor fall: ${thresholdOneHand.afterReleaseVelocity[1]}`);
assert.ok(twoHands.afterReleaseVelocity[1] < -11.5, `released two-hand grip did not resume Donor fall: ${twoHands.afterReleaseVelocity[1]}`);
assert.deepEqual(thresholdOneHand.afterReleaseExternalVelocity, [0, 0, 0]);
assert.deepEqual(twoHands.afterReleaseExternalVelocity, [0, 0, 0]);

// Grip reaction enters before the normal capsule mover. A deliberately strong upward
// request must therefore stop at the static ceiling rather than bypass world geometry.
assert.ok(ceiling.peakY <= ceiling.expectedMaxCenterY + 0.01, `grip reaction bypassed Donor ceiling geometry: peak=${ceiling.peakY} expectedMax=${ceiling.expectedMaxCenterY}`);
assert.ok(ceiling.peakY >= ceiling.expectedMaxCenterY - 0.08, `ceiling specimen never exercised the geometry boundary: peak=${ceiling.peakY} expectedMax=${ceiling.expectedMaxCenterY}`);
assert.ok(ceiling.planeCount > 0, 'ceiling specimen ended without a geometry plane');
assert.ok(ceiling.constraintSolveError <= 2e-5, `ceiling constraint solve exceeded trusted tolerance: ${ceiling.constraintSolveError}`);

const report = {
  schema: 'e19-0d-donor-static-grip-bridge-v1',
  hypothesis: 'A reciprocal finite static-grip impulse can enter the accepted Donor virtual mass directly before its normal capsule solve, enabling finite vertical support without E15 vertical transport, persistent knockback, weakened 31/36 agency, or geometry bypass.',
  boundary: 'Headless static-anchor Donor integration only. Static acquisition is synthetic; no hand body/arm is represented; dynamic/mixed multi-frame grips and Owner feel remain unqualified.',
  noGrip,
  weakOneHand,
  thresholdOneHand,
  twoHands,
  ceiling,
  classification: 'DONOR_DIRECT_STATIC_GRIP_BRIDGE_FINITE_AND_GEOMETRY_ARBITRATED',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
