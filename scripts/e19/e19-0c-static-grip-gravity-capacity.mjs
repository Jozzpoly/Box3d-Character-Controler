import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { stepDualGripActuator } from '../../src/e19/dual-grip-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const PLAYER_MASS = 80;
const GRAVITY = 20;
const WEIGHT = PLAYER_MASS * GRAVITY;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale3(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }

function runStaticHang({ name, hands, forcePerHand, frames = 360, releaseFrames = 0 }) {
  let position = [0, 0, 0];
  let velocity = [0, 0, 0];
  const anchors = hands === 1
    ? [[0, 1.25, 0]]
    : [[-0.28, 1.25, 0], [0.28, 1.25, 0]];
  const desiredOffsets = anchors.map((anchor) => [...anchor]);
  const grips = anchors.map((anchor) => ({ staticWorldAnchor: anchor }));
  let saturatedFrames = 0;
  let peakError = 0;
  let peakAppliedForce = 0;
  let finalHoldTelemetry = null;

  for (let frame = 0; frame < frames; frame++) {
    velocity[1] -= GRAVITY * DT;
    const telemetry = stepDualGripActuator({
      b3,
      playerPosition: position,
      playerVelocity: velocity,
      playerMass: PLAYER_MASS,
      grips,
      desiredOffsets,
      dt: DT,
      rate: 12,
      maxForcePerGrip: forcePerHand,
    });
    velocity = add3(velocity, telemetry.playerDeltaV);
    position = add3(position, scale3(velocity, DT));
    if (telemetry.perGripSaturated.some(Boolean)) saturatedFrames += 1;
    peakAppliedForce = Math.max(peakAppliedForce, telemetry.appliedImpulseSum / DT);
    for (let i = 0; i < anchors.length; i++) {
      const currentOffsetY = anchors[i][1] - position[1];
      peakError = Math.max(peakError, Math.abs(desiredOffsets[i][1] - currentOffsetY));
    }
    finalHoldTelemetry = telemetry;
  }

  const beforeRelease = { position: [...position], velocity: [...velocity] };
  for (let frame = 0; frame < releaseFrames; frame++) {
    velocity[1] -= GRAVITY * DT;
    position = add3(position, scale3(velocity, DT));
  }

  return {
    name,
    hands,
    forcePerHand,
    theoreticalTotalCapacity: hands * forcePerHand,
    weight: WEIGHT,
    holdFrames: frames,
    finalHoldPosition: beforeRelease.position,
    finalHoldVelocity: beforeRelease.velocity,
    peakError,
    saturatedFrames,
    saturationFraction: saturatedFrames / frames,
    peakAppliedForce,
    finalAppliedForce: finalHoldTelemetry.appliedImpulseSum / DT,
    finalPerGripForces: finalHoldTelemetry.impulses.map((impulse) => Math.hypot(...impulse) / DT),
    afterReleasePosition: [...position],
    afterReleaseVelocity: [...velocity],
  };
}

const weakOneHand = runStaticHang({ name: 'one-hand-900N', hands: 1, forcePerHand: 900 });
const thresholdOneHand = runStaticHang({ name: 'one-hand-1600N', hands: 1, forcePerHand: 1600 });
const strongOneHand = runStaticHang({ name: 'one-hand-2000N', hands: 1, forcePerHand: 2000, releaseFrames: 30 });
const twoHands = runStaticHang({ name: 'two-hands-900N-each', hands: 2, forcePerHand: 900, releaseFrames: 30 });

// The point of this crucible is not to choose final hand strength. It must demonstrate
// that capacity follows explicit force accounting rather than hidden static anchoring.
assert.ok(weakOneHand.finalHoldPosition[1] < -40, `900 N one-hand grip unexpectedly held 1600 N player weight: ${weakOneHand.finalHoldPosition[1]}`);
assert.ok(weakOneHand.saturationFraction > 0.95, 'under-capacity hand should remain saturated under gravity');
assert.ok(Math.abs(thresholdOneHand.finalHoldPosition[1]) < 0.03, `1600 N threshold should approximately support weight: ${thresholdOneHand.finalHoldPosition[1]}`);
assert.ok(Math.abs(thresholdOneHand.finalHoldVelocity[1]) < 0.05, `threshold hang retained material vertical velocity: ${thresholdOneHand.finalHoldVelocity[1]}`);
assert.ok(Math.abs(strongOneHand.finalHoldPosition[1]) < 0.02, `2000 N hand should hold without magic drift: ${strongOneHand.finalHoldPosition[1]}`);
assert.ok(strongOneHand.finalAppliedForce > 1550 && strongOneHand.finalAppliedForce < 1650, `strong hand should spend about player weight, not its full cap: ${strongOneHand.finalAppliedForce}`);
assert.ok(Math.abs(twoHands.finalHoldPosition[1]) < 0.02, `two 900 N hands should jointly hold 1600 N weight: ${twoHands.finalHoldPosition[1]}`);
assert.ok(twoHands.finalPerGripForces.every((force) => force > 770 && force < 830), `two-hand load should split near 800 N each: ${twoHands.finalPerGripForces}`);

// Release must not retain a hidden latch force. After 0.5 s of free fall from a stable
// hang the expected speed is ~10 m/s downward in this stripped gravity-only specimen.
assert.ok(strongOneHand.afterReleaseVelocity[1] < -9.9 && strongOneHand.afterReleaseVelocity[1] > -10.1);
assert.ok(twoHands.afterReleaseVelocity[1] < -9.9 && twoHands.afterReleaseVelocity[1] > -10.1);

const report = {
  schema: 'e19-0c-static-grip-gravity-capacity-v1',
  boundary: 'Stripped virtual-player gravity crucible. It qualifies finite static-anchor load capacity and release only; it does not choose final hand strength or qualify Donor collision/traversal integration.',
  playerMass: PLAYER_MASS,
  gravity: GRAVITY,
  playerWeight: WEIGHT,
  cases: [weakOneHand, thresholdOneHand, strongOneHand, twoHands],
  classification: 'STATIC_GRIP_CAPACITY_TRACKS_EXPLICIT_FORCE_AND_TWO_HAND_LOAD_SHARING',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
