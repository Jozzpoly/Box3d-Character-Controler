import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const FINITE_TORQUE = 320;
const ACCELS = [8, 16, DONOR_PROFILE_V1.groundAcceleration];
const LEAD_FRAMES = [0, 1, 2, 3, 4, 6, 8, 12];
const DIRECTIONS = [-1, 1];
const LOAD_EPSILON = 1e-5;
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 180;
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

function runCase({ acceleration, leadFrames, direction }) {
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
  let targetReached = false;
  let stableFrames = 0;
  let recovered = false;
  let supportLossFrames = 0;
  let maxTorque = 0;
  let maxFootTravel = 0;
  const initialFootZ = organism.footCom[2];
  const desiredTilt = direction * Math.atan2(acceleration, G);
  let tiltAtLaunch = 0;
  let omegaAtLaunch = 0;
  let footTiltAtLaunch = 0;
  let fellBeforeLaunch = false;

  function step({ movePlatform = false, targetTilt = 0 } = {}) {
    let actualAccel = 0;
    if (movePlatform) {
      const target = direction * TARGET_SPEED;
      const before = platformSpeed;
      platformSpeed = moveToward(platformSpeed, target, acceleration * DT);
      actualAccel = (platformSpeed - before) / DT;
      platformZ += platformSpeed * DT;
      b3.b3Body_SetTargetTransform(
        platform,
        { position: [0, PLATFORM_Y, platformZ], quaternion: IDENTITY },
        DT,
        true,
      );
      if (Math.abs(platformSpeed - target) < 1e-9) targetReached = true;
    }

    const commandedTilt = movePlatform ? direction * Math.atan2(Math.abs(actualAccel), G) : targetTilt;
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
    maxFootTravel = Math.max(maxFootTravel, Math.abs(organism.footCom[2] - initialFootZ));

    if (targetReached && organism.isRecovered() && signal.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!signal.reactive) throw new Error('E4.4 failed to establish initial support');

  supportLossFrames = 0;
  maxTorque = 0;
  maxFootTravel = 0;
  stableFrames = 0;
  recovered = false;

  for (let i = 0; i < leadFrames; i++) {
    step({ targetTilt: desiredTilt });
    if (organism.fallObserved) fellBeforeLaunch = true;
  }

  organism._sync();
  tiltAtLaunch = organism.torsoTilt;
  omegaAtLaunch = organism.torsoAngularVelocity[0];
  footTiltAtLaunch = organism.footTilt;

  const maxRampFrames = Math.ceil(TARGET_SPEED / acceleration / DT) + 3;
  for (let i = 0; i < maxRampFrames && !targetReached; i++) step({ movePlatform: true });
  if (!targetReached) throw new Error(`E4.4 failed to reach target speed at a=${acceleration}`);
  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });

  const telemetry = organism.telemetry();
  const result = {
    acceleration,
    leadFrames,
    direction,
    desiredTiltDeg: Math.abs(desiredTilt) * 180 / Math.PI,
    tiltAtLaunchDeg: tiltAtLaunch * 180 / Math.PI,
    omegaAtLaunch,
    footTiltAtLaunchDeg: footTiltAtLaunch * 180 / Math.PI,
    fellBeforeLaunch,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: telemetry.peakAbsTilt * 180 / Math.PI,
    supportLossFrames,
    maxFootTravel,
    maxTorque,
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || TARGET_SPEED !== 5.2 || DONOR_PROFILE_V1.groundAcceleration !== 31) {
  throw new Error('E4.4 expected current Donor v1 substrate/profile changed; requalify experiment');
}

const results = [];
for (const acceleration of ACCELS) {
  for (const leadFrames of LEAD_FRAMES) {
    for (const direction of DIRECTIONS) {
      const result = runCase({ acceleration, leadFrames, direction });
      results.push(result);
      console.log(
        `E4.4 a=${String(acceleration).padStart(2)} lead=${String(leadFrames).padStart(2)}f dir=${direction > 0 ? '+' : '-'} ` +
        `${result.outcome.padEnd(10)} launchTilt=${result.tiltAtLaunchDeg.toFixed(2)}deg ` +
        `launchW=${result.omegaAtLaunch.toFixed(2)} foot=${result.footTiltAtLaunchDeg.toFixed(2)}deg ` +
        `peak=${result.peakTiltDeg.toFixed(2)}deg loss=${result.supportLossFrames} preFall=${result.fellBeforeLaunch}`,
      );
    }
  }
}

for (const acceleration of ACCELS) {
  const lead0 = DIRECTIONS.map((direction) => results.find(
    (r) => r.acceleration === acceleration && r.leadFrames === 0 && r.direction === direction,
  ));
  const expected = acceleration === 8 ? 'RECOVER' : 'FALL';
  if (!lead0.every((r) => r?.outcome === expected)) {
    throw new Error(`E4.4 lead=0 failed to reproduce E4.2 effective-up reference at a=${acceleration}`);
  }
}

console.log('E4.4 mirrored anticipatory-lead matrix:');
for (const acceleration of ACCELS) {
  const row = LEAD_FRAMES.map((leadFrames) => {
    const pair = DIRECTIONS.map((direction) => results.find(
      (r) => r.acceleration === acceleration && r.leadFrames === leadFrames && r.direction === direction,
    ));
    return `${leadFrames}:${pair.map((r) => r.outcome[0]).join('/')}`;
  });
  const symmetricRecover = LEAD_FRAMES.filter((leadFrames) => DIRECTIONS.every((direction) => {
    const r = results.find((x) => x.acceleration === acceleration && x.leadFrames === leadFrames && x.direction === direction);
    return r?.outcome === 'RECOVER';
  }));
  console.log(`  a=${acceleration}: ${row.join(' ')} symmetricRecover=[${symmetricRecover.join(',')}]`);
}

console.log('E4.4 PASS: fixed anticipatory-lead bracket tested under identical acceleration, support and 320Nm posture authority. Any survivor interval is evidence, not a selected gameplay delay.');
