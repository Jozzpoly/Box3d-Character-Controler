import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const CANONICAL_SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const FINITE_TORQUE = 320;
const SUBSTEPS_SWEEP = [1, 2, 4, 8];
const DIRECTIONS = [-1, 1];
const SCENARIOS = [
  { acceleration: 8, leadFrames: 0, label: 'a8-base' },
  { acceleration: 16, leadFrames: 0, label: 'a16-base' },
  { acceleration: 16, leadFrames: 4, label: 'a16-lead4' },
  { acceleration: DONOR_PROFILE_V1.groundAcceleration, leadFrames: 0, label: 'a31-base' },
  { acceleration: DONOR_PROFILE_V1.groundAcceleration, leadFrames: 8, label: 'a31-lead8' },
];
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

function runCase({ acceleration, leadFrames, direction, substeps }) {
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
  let maxFootRelativeDrift = 0;
  let initialFootRelativeZ = 0;
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

    const commandedTilt = movePlatform
      ? direction * Math.atan2(Math.abs(actualAccel), G)
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
    const relativeFootZ = organism.footCom[2] - platformZ - initialFootRelativeZ;
    maxFootRelativeDrift = Math.max(maxFootRelativeDrift, Math.abs(relativeFootZ));

    if (targetReached && organism.isRecovered() && signal.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!signal.reactive) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.5 failed to establish support at substeps=${substeps}`);
  }

  initialFootRelativeZ = organism.footCom[2] - platformZ;
  supportLossFrames = 0;
  maxTorque = 0;
  maxFootRelativeDrift = 0;
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
  if (!targetReached) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.5 failed to reach target at a=${acceleration}, substeps=${substeps}`);
  }
  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });

  const telemetry = organism.telemetry();
  const result = {
    acceleration,
    leadFrames,
    direction,
    substeps,
    desiredTiltDeg: Math.abs(desiredTilt) * 180 / Math.PI,
    tiltAtLaunchDeg: tiltAtLaunch * 180 / Math.PI,
    omegaAtLaunch,
    footTiltAtLaunchDeg: footTiltAtLaunch * 180 / Math.PI,
    fellBeforeLaunch,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: telemetry.peakAbsTilt * 180 / Math.PI,
    supportLossFrames,
    maxFootRelativeDrift,
    maxTorque,
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 ||
  CANONICAL_SUBSTEPS !== 4 ||
  G !== 20 ||
  TARGET_SPEED !== 5.2 ||
  DONOR_PROFILE_V1.groundAcceleration !== 31
) {
  throw new Error('E4.5 expected current Donor v1 substrate/profile changed; requalify experiment');
}

const results = [];
for (const substeps of SUBSTEPS_SWEEP) {
  for (const scenario of SCENARIOS) {
    for (const direction of DIRECTIONS) {
      const result = runCase({ ...scenario, direction, substeps });
      results.push({ ...result, label: scenario.label });
      console.log(
        `E4.5 sub=${substeps} ${scenario.label.padEnd(9)} dir=${direction > 0 ? '+' : '-'} ` +
        `${result.outcome.padEnd(10)} launch=${result.tiltAtLaunchDeg.toFixed(2)}deg/` +
        `${result.omegaAtLaunch.toFixed(2)}radps peak=${result.peakTiltDeg.toFixed(2)}deg ` +
        `footRel=${result.maxFootRelativeDrift.toFixed(3)}m loss=${result.supportLossFrames} tau=${result.maxTorque.toFixed(1)}Nm`,
      );
    }
  }
}

function pairFor(substeps, label) {
  return DIRECTIONS.map((direction) => results.find(
    (r) => r.substeps === substeps && r.label === label && r.direction === direction,
  ));
}

const canonicalExpectations = new Map([
  ['a8-base', ['RECOVER', 'RECOVER']],
  ['a16-base', ['FALL', 'FALL']],
  ['a16-lead4', ['RECOVER', 'RECOVER']],
  ['a31-base', ['FALL', 'FALL']],
  ['a31-lead8', ['RECOVER', 'RECOVER']],
]);
for (const [label, expected] of canonicalExpectations) {
  const pair = pairFor(CANONICAL_SUBSTEPS, label);
  if (!pair.every((r, i) => r?.outcome === expected[i])) {
    throw new Error(
      `E4.5 canonical substeps=4 failed to reproduce E4.4 reference for ${label}: ` +
      `${pair.map((r) => r?.outcome ?? 'MISSING').join('/')}`,
    );
  }
}

function transition(base, prepared) {
  return `${base.outcome[0]}->${prepared.outcome[0]}`;
}

console.log('E4.5 substrate-robust anticipation summary:');
for (const substeps of SUBSTEPS_SWEEP) {
  const a8 = pairFor(substeps, 'a8-base');
  const b16 = pairFor(substeps, 'a16-base');
  const p16 = pairFor(substeps, 'a16-lead4');
  const b31 = pairFor(substeps, 'a31-base');
  const p31 = pairFor(substeps, 'a31-lead8');
  const benefit16 = b16.map((base, i) => transition(base, p16[i])).join('/');
  const benefit31 = b31.map((base, i) => transition(base, p31[i])).join('/');
  console.log(
    `  sub=${substeps}: a8=${a8.map((r) => r.outcome[0]).join('/')} ` +
    `a16 base=${b16.map((r) => r.outcome[0]).join('/')} lead4=${p16.map((r) => r.outcome[0]).join('/')} benefit=${benefit16} ` +
    `a31 base=${b31.map((r) => r.outcome[0]).join('/')} lead8=${p31.map((r) => r.outcome[0]).join('/')} benefit=${benefit31}`,
  );
}

const robustBenefit16 = SUBSTEPS_SWEEP.filter((substeps) => {
  const base = pairFor(substeps, 'a16-base');
  const prepared = pairFor(substeps, 'a16-lead4');
  return DIRECTIONS.every((_, i) => base[i].outcome === 'FALL' && prepared[i].outcome === 'RECOVER');
});
const robustBenefit31 = SUBSTEPS_SWEEP.filter((substeps) => {
  const base = pairFor(substeps, 'a31-base');
  const prepared = pairFor(substeps, 'a31-lead8');
  return DIRECTIONS.every((_, i) => base[i].outcome === 'FALL' && prepared[i].outcome === 'RECOVER');
});

console.log(`E4.5 symmetric F->R benefit substeps: a16/lead4=[${robustBenefit16.join(',')}] a31/lead8=[${robustBenefit31.join(',')}]`);
console.log('E4.5 PASS: anticipation survivors were tested across solver resolutions with outer dt, controller cadence, support, acceleration, target speed and 320Nm authority held fixed. Foot telemetry is support-relative. Cross-resolution benefit is evidence, not a selected solver setting or timing constant.');
