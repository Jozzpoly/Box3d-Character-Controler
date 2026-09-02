import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const FINITE_TORQUE = 320;
const ACCELS = [8, 16, DONOR_PROFILE_V1.groundAcceleration];
const DIRECTIONS = [-1, 1];
const SETTLE_FRAMES = 90;
const PREPARE_FRAMES = 240;
const HOLD_REQUIRED = 30;
const TARGET_TOLERANCE = 2 * Math.PI / 180;
const ANGULAR_SPEED_TOLERANCE = 0.16;
const FOOT_TILT_TOLERANCE = 6 * Math.PI / 180;
const LOAD_EPSILON = 1e-5;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makeGround(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.position = [0, PLATFORM_Y, 0];
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0.95;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...HALF);
  return body;
}

function createSupportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    let peakImpulse = 0;
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const impulse = Math.max(
            Math.abs(point.normalImpulse ?? 0),
            Math.abs(point.totalNormalImpulse ?? 0),
          );
          if (impulse > LOAD_EPSILON) loaded += 1;
          peakImpulse = Math.max(peakImpulse, impulse);
        }
      }
    }
    return { reactive: touching > 0 || loaded > 0, touching, loaded, peakImpulse };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function targetedPreStep(organism, targetTilt, maxTorque) {
  organism._sync();
  const error = organism.torsoTilt - targetTilt;
  const omega = organism.torsoAngularVelocity[0];
  const requested = -organism.kp * error - organism.kd * omega;
  const torque = clamp(requested, -maxTorque, maxTorque);
  organism.lastBalanceTorque = torque;
  if (Math.abs(torque) > 1e-9) {
    const impulse = torque * DT;
    b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(organism.foot, [-impulse, 0, 0], true);
  }
  return torque;
}

function runCase({ acceleration, direction }) {
  const world = makeWorld();
  makeGround(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
  });
  const support = createSupportReader(organism);
  let signal = support.read();
  const targetTilt = direction * Math.atan2(acceleration, G);
  const startFootZ = organism.footCom[2];
  let supportLossFrames = 0;
  let maxFootTravel = 0;
  let maxAbsFootTilt = 0;
  let maxAbsTorque = 0;
  let maxTargetError = 0;
  let bestTargetError = Infinity;
  let stableFrames = 0;
  let reachedFrame = -1;
  let held = false;
  let frame = 0;

  function step(target) {
    const torque = targetedPreStep(
      organism,
      target,
      signal.reactive ? FINITE_TORQUE : 0,
    );
    maxAbsTorque = Math.max(maxAbsTorque, Math.abs(torque));
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    signal = support.read();
    if (!signal.reactive) supportLossFrames += 1;

    const error = Math.abs(organism.torsoTilt - targetTilt);
    maxTargetError = Math.max(maxTargetError, error);
    bestTargetError = Math.min(bestTargetError, error);
    maxFootTravel = Math.max(maxFootTravel, Math.abs(organism.footCom[2] - startFootZ));
    maxAbsFootTilt = Math.max(maxAbsFootTilt, Math.abs(organism.footTilt));

    const targetStable = (
      !organism.fallObserved &&
      signal.reactive &&
      error <= TARGET_TOLERANCE &&
      Math.abs(organism.torsoAngularVelocity[0]) <= ANGULAR_SPEED_TOLERANCE &&
      Math.abs(organism.footTilt) <= FOOT_TILT_TOLERANCE
    );
    stableFrames = targetStable ? stableFrames + 1 : 0;
    if (reachedFrame < 0 && targetStable) reachedFrame = frame;
    if (stableFrames >= HOLD_REQUIRED) held = true;
    frame += 1;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step(0);
  if (!signal.reactive) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error('E4.3 failed to establish initial reactive support');
  }

  supportLossFrames = 0;
  maxFootTravel = 0;
  maxAbsFootTilt = 0;
  maxAbsTorque = 0;
  maxTargetError = 0;
  bestTargetError = Infinity;
  stableFrames = 0;
  reachedFrame = -1;
  held = false;
  frame = 0;

  for (let i = 0; i < PREPARE_FRAMES && !held; i++) step(targetTilt);

  const result = {
    acceleration,
    direction,
    targetTiltDeg: targetTilt * 180 / Math.PI,
    outcome: held ? 'HOLD' : organism.fallObserved ? 'FALL' : 'UNRESOLVED',
    reachedFrame,
    peakTiltDeg: organism.peakAbsTilt * 180 / Math.PI,
    finalTiltDeg: organism.torsoTilt * 180 / Math.PI,
    finalAngularSpeed: organism.torsoAngularVelocity[0],
    bestTargetErrorDeg: bestTargetError * 180 / Math.PI,
    maxTargetErrorDeg: maxTargetError * 180 / Math.PI,
    maxFootTravel,
    maxFootTiltDeg: maxAbsFootTilt * 180 / Math.PI,
    supportLossFrames,
    maxAbsTorque,
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || DONOR_PROFILE_V1.groundAcceleration !== 31) {
  throw new Error('E4.3 expected current Donor v1 substrate/profile changed; requalify experiment');
}

const results = [];
for (const acceleration of ACCELS) {
  for (const direction of DIRECTIONS) {
    const result = runCase({ acceleration, direction });
    results.push(result);
    console.log(
      `E4.3 a=${String(acceleration).padStart(2)} target=${Math.abs(result.targetTiltDeg).toFixed(2)}deg ` +
      `dir=${direction > 0 ? '+' : '-'} ${result.outcome.padEnd(10)} ` +
      `bestErr=${result.bestTargetErrorDeg.toFixed(2)}deg final=${result.finalTiltDeg.toFixed(2)}deg ` +
      `foot=${result.maxFootTravel.toFixed(3)}m/${result.maxFootTiltDeg.toFixed(2)}deg ` +
      `supportLoss=${result.supportLossFrames} tau=${result.maxAbsTorque.toFixed(1)}Nm`,
    );
  }
}

console.log('E4.3 static posture-preparation feasibility:');
for (const acceleration of ACCELS) {
  const pair = DIRECTIONS.map((direction) => results.find(
    (r) => r.acceleration === acceleration && r.direction === direction,
  ));
  console.log(
    `  effective-up for a=${acceleration} (${Math.atan2(acceleration, G) * 180 / Math.PI.toFixed?.(2) ?? ''}) :: ` +
    `${pair.map((r) => r.outcome).join('/')} bestErr=${pair.map((r) => r.bestTargetErrorDeg.toFixed(2)).join('/')}deg`,
  );
}

console.log('E4.3 PASS: static effective-up posture preparation was tested with the same finite ankle authority and support geometry; HOLD/FALL/UNRESOLVED outcomes are evidence, not selected lean limits.');
