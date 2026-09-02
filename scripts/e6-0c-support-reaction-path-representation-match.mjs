import Box3D from 'box3d.js/inline';
import {
  SagittalBalanceOrganism,
  E3_SAGITTAL_DEFAULTS,
  sagittalAngleFromRotation,
} from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const TOTAL_MASS = DONOR_PROFILE_V1.virtualMass;
const FINITE_TORQUE = 320;
const MU = 0.95;
const LEAD_FRAMES = 8;
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 180;
const RECOVER_STREAK = 30;
const LOAD_EPS = 1e-6;
const PLATFORM_HALF = [2, 0.25, 30];
const PLATFORM_Y = -PLATFORM_HALF[1];
const IDENTITY = [0, 0, 0, 1];
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const REQUIRED_RAMP_IMPULSE = TOTAL_MASS * TARGET_SPEED;
const SELF_GROUP = -62;
const CARRIAGE_MASS = 0.05;
const FOOT_MASS = E3_SAGITTAL_DEFAULTS.footMass - CARRIAGE_MASS;
const TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass;
const CARRIAGE_HALF = [0.025, 0.025, 0.025];
const LOCK_EPS = 1e-5;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
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
  sd.baseMaterial.friction = MU;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...PLATFORM_HALF);
  return body;
}

function createDynamicBox(world, { position, half, mass, friction }) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [...position];
  bd.linearDamping = 0.015;
  bd.angularDamping = 0.015;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  bd.motionLocks.linearX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(mass, half);
  sd.baseMaterial.friction = friction;
  sd.baseMaterial.restitution = 0;
  sd.filter.groupIndex = SELF_GROUP;
  b3.b3CreateBoxShape(body, sd, ...half);
  return { body, mass: b3.b3Body_GetMass(body) };
}

function bodyVelocity(body) {
  const v = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(v, body);
  return v;
}

function bodyCom(body) {
  const p = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(p, body);
  return p;
}

function bodyRotation(body) {
  const q = [0, 0, 0, 1];
  b3.b3Body_GetRotation(q, body);
  return q;
}

function bodyAngularVelocity(body) {
  const w = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(w, body);
  return w;
}

class LockedSliderProxy {
  constructor(world) {
    const footHalf = E3_SAGITTAL_DEFAULTS.footHalf;
    const torsoHalf = E3_SAGITTAL_DEFAULTS.torsoHalf;
    const footPosition = [0, footHalf[1] + 0.002, 0];
    const ankleY = footPosition[1] + footHalf[1];

    const foot = createDynamicBox(world, {
      position: footPosition,
      half: footHalf,
      mass: FOOT_MASS,
      friction: E3_SAGITTAL_DEFAULTS.footFriction,
    });
    const carriage = createDynamicBox(world, {
      position: [0, ankleY, 0],
      half: CARRIAGE_HALF,
      mass: CARRIAGE_MASS,
      friction: 0,
    });
    const torso = createDynamicBox(world, {
      position: [0, ankleY + torsoHalf[1], 0],
      half: torsoHalf,
      mass: TORSO_MASS,
      friction: E3_SAGITTAL_DEFAULTS.torsoFriction,
    });

    this.foot = foot.body;
    this.carriage = carriage.body;
    this.torso = torso.body;
    this.reactionBody = foot.body;
    this.bodies = [
      { body: foot.body, mass: foot.mass },
      { body: carriage.body, mass: carriage.mass },
      { body: torso.body, mass: torso.mass },
    ];
    this.kp = E3_SAGITTAL_DEFAULTS.balanceKp;
    this.kd = E3_SAGITTAL_DEFAULTS.balanceKd;
    this.maxTorque = FINITE_TORQUE;
    this.peakAbsTilt = 0;
    this.fallObserved = false;

    const slider = b3.b3DefaultPrismaticJointDef();
    slider.base.bodyIdA = this.foot;
    slider.base.bodyIdB = this.carriage;
    slider.base.localFrameA = {
      position: [0, footHalf[1], 0],
      quaternion: Y_NEG_90,
    };
    slider.base.localFrameB = {
      position: [0, 0, 0],
      quaternion: Y_NEG_90,
    };
    slider.enableLimit = true;
    slider.lowerTranslation = -LOCK_EPS;
    slider.upperTranslation = LOCK_EPS;
    slider.enableMotor = false;
    b3.b3CreatePrismaticJoint(world, slider);

    const ankle = b3.b3DefaultSphericalJointDef();
    ankle.base.bodyIdA = this.carriage;
    ankle.base.bodyIdB = this.torso;
    ankle.base.localFrameA = {
      position: [0, 0, 0],
      quaternion: IDENTITY,
    };
    ankle.base.localFrameB = {
      position: [0, -torsoHalf[1], 0],
      quaternion: IDENTITY,
    };
    b3.b3CreateSphericalJoint(world, ankle);

    this.sync();
  }

  sync() {
    this.torsoRotation = bodyRotation(this.torso);
    this.footRotation = bodyRotation(this.foot);
    this.torsoAngularVelocity = bodyAngularVelocity(this.torso);
    this.footAngularVelocity = bodyAngularVelocity(this.foot);
    this.footCom = bodyCom(this.foot);
  }

  get torsoTilt() {
    return sagittalAngleFromRotation(this.torsoRotation);
  }

  get footTilt() {
    return sagittalAngleFromRotation(this.footRotation);
  }

  postStep() {
    this.sync();
    this.peakAbsTilt = Math.max(this.peakAbsTilt, Math.abs(this.torsoTilt));
    if (Math.abs(this.torsoTilt) >= E3_SAGITTAL_DEFAULTS.fallTiltRadians) {
      this.fallObserved = true;
    }
  }

  isRecovered() {
    return (
      !this.fallObserved &&
      Math.abs(this.torsoTilt) <= E3_SAGITTAL_DEFAULTS.recoverTiltRadians &&
      Math.abs(this.torsoAngularVelocity[0]) <= E3_SAGITTAL_DEFAULTS.recoverAngularSpeed &&
      Math.abs(this.footTilt) <= E3_SAGITTAL_DEFAULTS.recoverTiltRadians * 1.5
    );
  }
}

function referenceProxy(world) {
  const base = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
  });
  return {
    foot: base.foot,
    torso: base.torso,
    reactionBody: base.foot,
    bodies: [
      { body: base.foot, mass: base.footMass },
      { body: base.torso, mass: base.torsoMass },
    ],
    kp: base.kp,
    kd: base.kd,
    maxTorque: base.maxTorque,
    get torsoTilt() { return base.torsoTilt; },
    get footTilt() { return base.footTilt; },
    get torsoAngularVelocity() { return base.torsoAngularVelocity; },
    get footCom() { return base.footCom; },
    get peakAbsTilt() { return base.peakAbsTilt; },
    get fallObserved() { return base.fallObserved; },
    sync() { base._sync(); },
    postStep() { base.postStep(); },
    isRecovered() { return base.isRecovered(); },
  };
}

function createSupportReader(foot) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, foot);
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
            Math.abs(point.normalImpulse ?? 0) > LOAD_EPS ||
            Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPS
          ) loaded += 1;
        }
      }
    }
    return { reactive: touching > 0 || loaded > 0 };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function wholeBodyState(organism) {
  let mass = 0;
  const pos = [0, 0, 0];
  const vel = [0, 0, 0];
  for (const item of organism.bodies) {
    const p = bodyCom(item.body);
    const v = bodyVelocity(item.body);
    mass += item.mass;
    for (let axis = 0; axis < 3; axis++) {
      pos[axis] += item.mass * p[axis];
      vel[axis] += item.mass * v[axis];
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    pos[axis] /= mass;
    vel[axis] /= mass;
  }
  return { mass, pos, vel };
}

function targetedBalance(organism, targetTilt, supportReactive) {
  organism.sync();
  const requested = -organism.kp * (organism.torsoTilt - targetTilt)
    - organism.kd * organism.torsoAngularVelocity[0];
  const torque = supportReactive
    ? clamp(requested, -organism.maxTorque, organism.maxTorque)
    : 0;
  if (Math.abs(torque) <= 1e-9) return;
  const impulse = torque * DT;
  b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(organism.reactionBody, [-impulse, 0, 0], true);
}

function runCase(kind, direction) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = kind === 'reference'
    ? referenceProxy(world)
    : new LockedSliderProxy(world);
  const support = createSupportReader(organism.foot);
  let supportSignal = support.read();
  let platformZ = 0;
  let platformSpeed = 0;
  let targetReached = false;
  let stableFrames = 0;
  let recovered = false;
  let rampSupportLossFrames = 0;
  let rampHorizontalSupport = 0;
  let initialFootRelativeZ = 0;
  let maxFootRelativeDrift = 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);

  function step({ movePlatform = false, targetTilt = 0, collectRamp = false } = {}) {
    let actualAccel = 0;
    if (movePlatform) {
      const target = direction * TARGET_SPEED;
      const before = platformSpeed;
      platformSpeed = moveToward(platformSpeed, target, ACCEL * DT);
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

    const beforeBody = wholeBodyState(organism);
    const commandedTilt = movePlatform
      ? direction * Math.atan2(Math.abs(actualAccel), G)
      : targetTilt;
    targetedBalance(organism, commandedTilt, supportSignal.reactive);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    const afterBody = wholeBodyState(organism);
    supportSignal = support.read();

    if (collectRamp) {
      if (!supportSignal.reactive) rampSupportLossFrames += 1;
      rampHorizontalSupport += direction * afterBody.mass * (afterBody.vel[2] - beforeBody.vel[2]);
    }

    organism.sync();
    const footRelativeZ = organism.footCom[2] - platformZ - initialFootRelativeZ;
    maxFootRelativeDrift = Math.max(maxFootRelativeDrift, Math.abs(footRelativeZ));

    if (targetReached && organism.isRecovered() && supportSignal.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!supportSignal.reactive) throw new Error(`E6.0c ${kind} failed to establish support`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E6.0c ${kind} total mass=${settled.mass}, expected 80kg`);
  }

  organism.sync();
  initialFootRelativeZ = organism.footCom[2] - platformZ;
  for (let i = 0; i < LEAD_FRAMES; i++) step({ targetTilt: desiredTilt });

  const maxRampFrames = Math.ceil(TARGET_SPEED / ACCEL / DT) + 3;
  for (let i = 0; i < maxRampFrames && !targetReached; i++) {
    step({ movePlatform: true, collectRamp: true });
  }
  if (!targetReached) throw new Error(`E6.0c ${kind} failed to reach platform target`);
  const rampEnd = wholeBodyState(organism);

  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });
  const outcome = organism.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED';
  const result = {
    outcome,
    deliveredVsRequired: rampHorizontalSupport / REQUIRED_RAMP_IMPULSE,
    bodySpeedAtRampEnd: direction * rampEnd.vel[2],
    peakTiltDeg: organism.peakAbsTilt * 180 / Math.PI,
    maxFootRelativeDrift,
    rampSupportLossFrames,
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80
) {
  throw new Error('E6.0c expected current Donor-v1/E5 substrate; requalify after substrate change');
}

console.log('E6.0c support-reaction-path representation match');
console.log('  original E5 reference vs 9.95kg foot + 0.05kg locked slider carriage + 70kg torso');
console.log('  crucial correction: finite balance torque closes directly torso↔support-foot; carriage owns translation topology only');
console.log('  no threshold from E6.0b is relaxed');

const rows = [];
for (const direction of [-1, 1]) {
  const reference = runCase('reference', direction);
  const locked = runCase('locked', direction);
  rows.push({ direction, reference, locked });
  console.log(
    `  dir=${direction > 0 ? '+' : '-'} ref=${reference.outcome} locked=${locked.outcome} ` +
    `Jx/need ${reference.deliveredVsRequired.toFixed(3)}→${locked.deliveredVsRequired.toFixed(3)} ` +
    `vEnd ${reference.bodySpeedAtRampEnd.toFixed(3)}→${locked.bodySpeedAtRampEnd.toFixed(3)}m/s ` +
    `peak ${reference.peakTiltDeg.toFixed(2)}→${locked.peakTiltDeg.toFixed(2)}deg ` +
    `footRel ${reference.maxFootRelativeDrift.toFixed(3)}→${locked.maxFootRelativeDrift.toFixed(3)}m ` +
    `rampLoss ${reference.rampSupportLossFrames}→${locked.rampSupportLossFrames}`,
  );
}

for (const { direction, reference, locked } of rows) {
  if (reference.outcome !== 'RECOVER') {
    throw new Error(`E6.0c reference no longer reproduces E5 RECOVER for dir=${direction}`);
  }
  if (locked.outcome !== 'RECOVER') {
    throw new Error(`E6.0c corrected locked proxy does not preserve recoverability for dir=${direction}`);
  }
  if (locked.rampSupportLossFrames !== 0) {
    throw new Error(`E6.0c corrected locked proxy loses ramp support for dir=${direction}`);
  }
  if (Math.abs(locked.deliveredVsRequired - reference.deliveredVsRequired) > 0.05) {
    throw new Error(`E6.0c corrected locked proxy support impulse differs too much for dir=${direction}`);
  }
  if (Math.abs(locked.bodySpeedAtRampEnd - reference.bodySpeedAtRampEnd) > 0.25) {
    throw new Error(`E6.0c corrected locked proxy ramp-end speed differs too much for dir=${direction}`);
  }
  if (Math.abs(locked.peakTiltDeg - reference.peakTiltDeg) > 4) {
    throw new Error(`E6.0c corrected locked proxy peak tilt differs too much for dir=${direction}`);
  }
}

const lockedSpeedMirror = Math.abs(rows[0].locked.bodySpeedAtRampEnd - rows[1].locked.bodySpeedAtRampEnd);
const lockedImpulseMirror = Math.abs(rows[0].locked.deliveredVsRequired - rows[1].locked.deliveredVsRequired);
if (lockedSpeedMirror > 0.15 || lockedImpulseMirror > 0.035) {
  throw new Error('E6.0c corrected locked proxy is not sufficiently mirrored for actuator causality');
}

console.log('E6.0c PASS: with ankle balance reaction restored to the support foot, the locked three-body topology preserves the E5 current31/lead8 control closely enough to isolate support-relative translation. This is still a representation gate, not relocation evidence.');