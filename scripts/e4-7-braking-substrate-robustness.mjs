import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const CANONICAL_SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const CRUISE_SPEED = DONOR_PROFILE_V1.maxSpeed;
const BRAKE_ACCEL = DONOR_PROFILE_V1.groundDeceleration;
const SAFE_SETUP_ACCEL = 4;
const FINITE_TORQUE = 320;
const PREP_LEAD_FRAMES = 8;
const SUBSTEPS_SWEEP = [1, 2, 4, 8];
const DIRECTIONS = [-1, 1];
const LOAD_EPSILON = 1e-5;
const SETTLE_FRAMES = 90;
const CRUISE_SETTLE_FRAMES = 120;
const POST_BRAKE_FRAMES = 180;
const RECOVER_STREAK = 30;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const IDENTITY = [0, 0, 0, 1];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makePlatform(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
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
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          if (
            Math.abs(point.normalImpulse ?? 0) > LOAD_EPSILON ||
            Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPSILON
          ) loaded += 1;
        }
      }
    }
    return { reactive: touching > 0 || loaded > 0 };
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

function runCase({ direction, leadFrames, substeps }) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
  });
  const support = createSupportReader(organism);
  let signal = support.read();
  let platformZ = 0;
  let platformSpeed = 0;
  let supportLossFrames = 0;
  let maxTorque = 0;
  let peakBrakeTilt = 0;
  let stableFrames = 0;
  let recovered = false;
  let tiltAtBrake = 0;
  let omegaAtBrake = 0;
  let footTiltAtBrake = 0;
  let fellBeforeBrake = false;
  let brakeFrames = 0;
  let relativeFootBaseline = 0;
  let maxRelativeFootDrift = 0;
  let trackRelativeFoot = false;

  function step({ targetSpeed = platformSpeed, accelLimit = 0, targetTilt = 0, trackBrake = false } = {}) {
    const before = platformSpeed;
    platformSpeed = moveToward(platformSpeed, targetSpeed, accelLimit * DT);
    const actualAccel = (platformSpeed - before) / DT;
    platformZ += platformSpeed * DT;
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [0, PLATFORM_Y, platformZ], quaternion: IDENTITY },
      DT,
      true,
    );

    const commandedTilt = targetTilt === 'effective-up'
      ? Math.atan2(actualAccel, G)
      : targetTilt;
    const torque = targetedPreStep(
      organism,
      commandedTilt,
      signal.reactive ? FINITE_TORQUE : 0,
    );
    maxTorque = Math.max(maxTorque, Math.abs(torque));
    b3.b3World_Step(world, DT, substeps);
    organism.postStep();
    signal = support.read();
    if (!signal.reactive) supportLossFrames += 1;
    if (trackBrake) peakBrakeTilt = Math.max(peakBrakeTilt, Math.abs(organism.torsoTilt));
    if (trackRelativeFoot) {
      const relativeFootZ = organism.footCom[2] - platformZ;
      maxRelativeFootDrift = Math.max(
        maxRelativeFootDrift,
        Math.abs(relativeFootZ - relativeFootBaseline),
      );
    }

    const stopped = Math.abs(platformSpeed) < 1e-9;
    if (stopped && organism.isRecovered() && signal.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;

    return actualAccel;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step({ targetSpeed: 0, accelLimit: 0, targetTilt: 0 });
  if (!signal.reactive) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.7 failed to establish initial support at substeps=${substeps}`);
  }

  const cruise = direction * CRUISE_SPEED;
  const setupFrames = Math.ceil(CRUISE_SPEED / SAFE_SETUP_ACCEL / DT) + 3;
  for (let i = 0; i < setupFrames && Math.abs(platformSpeed - cruise) > 1e-9; i++) {
    step({ targetSpeed: cruise, accelLimit: SAFE_SETUP_ACCEL, targetTilt: 0 });
  }
  if (Math.abs(platformSpeed - cruise) > 1e-9 || organism.fallObserved) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.7 safe setup failed for direction=${direction}, substeps=${substeps}`);
  }
  for (let i = 0; i < CRUISE_SETTLE_FRAMES; i++) {
    step({ targetSpeed: cruise, accelLimit: 0, targetTilt: 0 });
  }
  if (!organism.isRecovered() || !signal.reactive || organism.fallObserved) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.7 failed neutral cruise for direction=${direction}, substeps=${substeps}`);
  }

  organism._sync();
  relativeFootBaseline = organism.footCom[2] - platformZ;
  trackRelativeFoot = true;
  supportLossFrames = 0;
  maxTorque = 0;
  peakBrakeTilt = 0;
  stableFrames = 0;
  recovered = false;

  const anticipatedBrakeTilt = -direction * Math.atan2(BRAKE_ACCEL, G);
  for (let i = 0; i < leadFrames; i++) {
    step({ targetSpeed: cruise, accelLimit: 0, targetTilt: anticipatedBrakeTilt });
    if (organism.fallObserved) fellBeforeBrake = true;
  }

  organism._sync();
  tiltAtBrake = organism.torsoTilt;
  omegaAtBrake = organism.torsoAngularVelocity[0];
  footTiltAtBrake = organism.footTilt;

  const maxBrakeFrames = Math.ceil(CRUISE_SPEED / BRAKE_ACCEL / DT) + 3;
  for (let i = 0; i < maxBrakeFrames && Math.abs(platformSpeed) > 1e-9; i++) {
    step({
      targetSpeed: 0,
      accelLimit: BRAKE_ACCEL,
      targetTilt: 'effective-up',
      trackBrake: true,
    });
    brakeFrames += 1;
  }
  if (Math.abs(platformSpeed) > 1e-9) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.7 failed to stop platform at substeps=${substeps}`);
  }
  for (let i = 0; i < POST_BRAKE_FRAMES; i++) {
    step({ targetSpeed: 0, accelLimit: 0, targetTilt: 0, trackBrake: true });
  }

  const result = {
    direction,
    leadFrames,
    substeps,
    outcome: organism.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    anticipatedBrakeTiltDeg: Math.abs(anticipatedBrakeTilt) * 180 / Math.PI,
    tiltAtBrakeDeg: tiltAtBrake * 180 / Math.PI,
    omegaAtBrake,
    footTiltAtBrakeDeg: footTiltAtBrake * 180 / Math.PI,
    peakBrakeTiltDeg: peakBrakeTilt * 180 / Math.PI,
    supportLossFrames,
    maxTorque,
    brakeFrames,
    fellBeforeBrake,
    maxRelativeFootDrift,
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 ||
  CANONICAL_SUBSTEPS !== 4 ||
  G !== 20 ||
  CRUISE_SPEED !== 5.2 ||
  BRAKE_ACCEL !== 36
) {
  throw new Error('E4.7 expected current Donor v1 braking envelope changed; requalify experiment');
}

const results = [];
for (const substeps of SUBSTEPS_SWEEP) {
  for (const leadFrames of [0, PREP_LEAD_FRAMES]) {
    for (const direction of DIRECTIONS) {
      const result = runCase({ direction, leadFrames, substeps });
      results.push(result);
      console.log(
        `E4.7 sub=${substeps} lead=${leadFrames}f dir=${direction > 0 ? '+' : '-'} ` +
        `${result.outcome.padEnd(10)} start=${result.tiltAtBrakeDeg.toFixed(2)}deg/` +
        `${result.omegaAtBrake.toFixed(2)}radps peak=${result.peakBrakeTiltDeg.toFixed(2)}deg ` +
        `footRel=${result.maxRelativeFootDrift.toFixed(3)}m loss=${result.supportLossFrames} ` +
        `preFall=${result.fellBeforeBrake}`,
      );
    }
  }
}

function pairFor(substeps, leadFrames) {
  return DIRECTIONS.map((direction) => results.find(
    (r) => r.substeps === substeps && r.leadFrames === leadFrames && r.direction === direction,
  ));
}

const canonicalBase = pairFor(CANONICAL_SUBSTEPS, 0);
const canonicalPrepared = pairFor(CANONICAL_SUBSTEPS, PREP_LEAD_FRAMES);
if (
  !canonicalBase.every((r) => r?.outcome === 'FALL') ||
  !canonicalPrepared.every((r) => r?.outcome === 'RECOVER')
) {
  throw new Error(
    'E4.7 canonical substeps=4 failed to reproduce E4.6 reference: ' +
    `lead0=${canonicalBase.map((r) => r?.outcome ?? 'MISSING').join('/')} ` +
    `lead8=${canonicalPrepared.map((r) => r?.outcome ?? 'MISSING').join('/')}`,
  );
}

console.log('E4.7 braking substrate-robustness summary:');
const symmetricBenefits = [];
for (const substeps of SUBSTEPS_SWEEP) {
  const base = pairFor(substeps, 0);
  const prepared = pairFor(substeps, PREP_LEAD_FRAMES);
  const benefit = DIRECTIONS.every((_, i) =>
    base[i].outcome === 'FALL' && prepared[i].outcome === 'RECOVER'
  );
  if (benefit) symmetricBenefits.push(substeps);
  console.log(
    `  sub=${substeps}: lead0=${base.map((r) => r.outcome[0]).join('/')} ` +
    `lead8=${prepared.map((r) => r.outcome[0]).join('/')} ` +
    `benefit=${base.map((r, i) => `${r.outcome[0]}->${prepared[i].outcome[0]}`).join('/')} ` +
    `footRel base=${base.map((r) => r.maxRelativeFootDrift.toFixed(3)).join('/')}m ` +
    `prep=${prepared.map((r) => r.maxRelativeFootDrift.toFixed(3)).join('/')}m`,
  );
}
console.log(`E4.7 symmetric F->R braking benefit substeps=[${symmetricBenefits.join(',')}]`);
console.log('E4.7 PASS: current 36m/s² braking preparation was compared against matched lead0 across solver resolutions with outer dt, controller cadence, 5.2m/s cruise, support geometry and 320Nm posture authority held fixed. Cross-resolution benefit is evidence, not a selected solver setting or timing constant.');
