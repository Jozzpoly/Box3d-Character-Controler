import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const CRUISE_SPEED = DONOR_PROFILE_V1.maxSpeed;
const BRAKE_ACCEL = DONOR_PROFILE_V1.groundDeceleration;
const SAFE_SETUP_ACCEL = 4;
const FINITE_TORQUE = 320;
const DIRECTIONS = [-1, 1];
const LEAD_FRAMES = [0, 2, 4, 6, 8, 12];
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

function runCase({ direction, policy, leadFrames = 0 }) {
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
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    signal = support.read();
    if (!signal.reactive) supportLossFrames += 1;
    if (trackBrake) peakBrakeTilt = Math.max(peakBrakeTilt, Math.abs(organism.torsoTilt));

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
    throw new Error('E4.6 failed to establish initial support');
  }

  const cruise = direction * CRUISE_SPEED;
  const setupFrames = Math.ceil(CRUISE_SPEED / SAFE_SETUP_ACCEL / DT) + 3;
  for (let i = 0; i < setupFrames && Math.abs(platformSpeed - cruise) > 1e-9; i++) {
    step({ targetSpeed: cruise, accelLimit: SAFE_SETUP_ACCEL, targetTilt: 0 });
  }
  if (Math.abs(platformSpeed - cruise) > 1e-9 || organism.fallObserved) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.6 safe setup failed for direction=${direction}`);
  }
  for (let i = 0; i < CRUISE_SETTLE_FRAMES; i++) {
    step({ targetSpeed: cruise, accelLimit: 0, targetTilt: 0 });
  }
  if (!organism.isRecovered() || !signal.reactive || organism.fallObserved) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.6 failed to establish neutral cruise state for direction=${direction}`);
  }

  supportLossFrames = 0;
  maxTorque = 0;
  peakBrakeTilt = 0;
  stableFrames = 0;
  recovered = false;

  const anticipatedBrakeTilt = -direction * Math.atan2(BRAKE_ACCEL, G);
  if (policy === 'effective-up') {
    for (let i = 0; i < leadFrames; i++) {
      step({ targetSpeed: cruise, accelLimit: 0, targetTilt: anticipatedBrakeTilt });
      if (organism.fallObserved) fellBeforeBrake = true;
    }
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
      targetTilt: policy === 'effective-up' ? 'effective-up' : 0,
      trackBrake: true,
    });
    brakeFrames += 1;
  }
  if (Math.abs(platformSpeed) > 1e-9) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error('E4.6 failed to stop platform');
  }
  for (let i = 0; i < POST_BRAKE_FRAMES; i++) {
    step({ targetSpeed: 0, accelLimit: 0, targetTilt: 0, trackBrake: true });
  }

  const result = {
    direction,
    policy,
    leadFrames,
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
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 ||
  SUBSTEPS !== 4 ||
  G !== 20 ||
  CRUISE_SPEED !== 5.2 ||
  BRAKE_ACCEL !== 36
) {
  throw new Error('E4.6 expected current Donor v1 braking envelope changed; requalify experiment');
}

const results = [];
for (const direction of DIRECTIONS) {
  const upright = runCase({ direction, policy: 'upright', leadFrames: 0 });
  results.push(upright);
  console.log(
    `E4.6 upright dir=${direction > 0 ? '+' : '-'} ${upright.outcome} ` +
    `peak=${upright.peakBrakeTiltDeg.toFixed(2)}deg loss=${upright.supportLossFrames} tau=${upright.maxTorque.toFixed(1)}Nm`,
  );
}
for (const leadFrames of LEAD_FRAMES) {
  for (const direction of DIRECTIONS) {
    const r = runCase({ direction, policy: 'effective-up', leadFrames });
    results.push(r);
    console.log(
      `E4.6 effective-up lead=${String(leadFrames).padStart(2)}f dir=${direction > 0 ? '+' : '-'} ` +
      `${r.outcome.padEnd(10)} brakeStart=${r.tiltAtBrakeDeg.toFixed(2)}deg/${r.omegaAtBrake.toFixed(2)}radps ` +
      `foot=${r.footTiltAtBrakeDeg.toFixed(2)}deg peak=${r.peakBrakeTiltDeg.toFixed(2)}deg ` +
      `loss=${r.supportLossFrames} preFall=${r.fellBeforeBrake}`,
    );
  }
}

const uprightPair = DIRECTIONS.map((direction) => results.find(
  (r) => r.policy === 'upright' && r.direction === direction,
));
console.log(`E4.6 upright braking reference: ${uprightPair.map((r) => r.outcome[0]).join('/')}`);

const symmetricRecover = LEAD_FRAMES.filter((leadFrames) => DIRECTIONS.every((direction) => {
  const r = results.find(
    (x) => x.policy === 'effective-up' && x.leadFrames === leadFrames && x.direction === direction,
  );
  return r?.outcome === 'RECOVER';
}));
const matrix = LEAD_FRAMES.map((leadFrames) => {
  const pair = DIRECTIONS.map((direction) => results.find(
    (r) => r.policy === 'effective-up' && r.leadFrames === leadFrames && r.direction === direction,
  ));
  return `${leadFrames}:${pair.map((r) => r.outcome[0]).join('/')}`;
});
console.log(`E4.6 current 36m/s² braking preparation matrix: ${matrix.join(' ')} symmetricRecover=[${symmetricRecover.join(',')}]`);
console.log('E4.6 PASS: current Donor-v1 braking magnitude was tested from a physically established neutral 5.2m/s cruise state. Upright and fixed anticipatory-posture cases share support geometry and 320Nm posture authority; no braking or timing policy is promoted.');
