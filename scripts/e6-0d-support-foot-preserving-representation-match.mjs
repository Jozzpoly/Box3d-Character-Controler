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
const TORQUE = 320;
const MU = 0.95;
const LEAD = 8;
const SETTLE = 90;
const HOLD = 180;
const RECOVER_STREAK = 30;
const LOAD_EPS = 1e-6;
const REQUIRED_J = TOTAL_MASS * TARGET_SPEED;
const PLATFORM_HALF = [2, 0.25, 30];
const PLATFORM_Y = -PLATFORM_HALF[1];
const IDENTITY = [0, 0, 0, 1];
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const SELF_GROUP = -63;
const FOOT_MASS = E3_SAGITTAL_DEFAULTS.footMass;
const CARRIAGE_MASS = 0.5;
const TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - CARRIAGE_MASS;
const CARRIAGE_HALF = [0.025, 0.025, 0.025];
const LOCK_EPS = 1e-5;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(v, target, d) {
  return Math.abs(target - v) <= d ? target : v + Math.sign(target - v) * d;
}
function densityForMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function bodyCom(body) { const p = [0, 0, 0]; b3.b3Body_GetWorldCenterOfMass(p, body); return p; }
function bodyVel(body) { const v = [0, 0, 0]; b3.b3Body_GetLinearVelocity(v, body); return v; }
function bodyRot(body) { const q = [0, 0, 0, 1]; b3.b3Body_GetRotation(q, body); return q; }
function bodyW(body) { const w = [0, 0, 0]; b3.b3Body_GetAngularVelocity(w, body); return w; }

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

function makeBox(world, position, half, mass, friction) {
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
  sd.density = densityForMass(mass, half);
  sd.baseMaterial.friction = friction;
  sd.baseMaterial.restitution = 0;
  sd.filter.groupIndex = SELF_GROUP;
  b3.b3CreateBoxShape(body, sd, ...half);
  return { body, mass: b3.b3Body_GetMass(body) };
}

class LockedProxy {
  constructor(world) {
    const footHalf = E3_SAGITTAL_DEFAULTS.footHalf;
    const torsoHalf = E3_SAGITTAL_DEFAULTS.torsoHalf;
    const footY = footHalf[1] + 0.002;
    const ankleY = footY + footHalf[1];

    const foot = makeBox(world, [0, footY, 0], footHalf, FOOT_MASS, E3_SAGITTAL_DEFAULTS.footFriction);
    const carriage = makeBox(world, [0, ankleY, 0], CARRIAGE_HALF, CARRIAGE_MASS, 0);
    const torso = makeBox(world, [0, ankleY + torsoHalf[1], 0], torsoHalf, TORSO_MASS, E3_SAGITTAL_DEFAULTS.torsoFriction);

    this.foot = foot.body;
    this.carriage = carriage.body;
    this.torso = torso.body;
    this.reactionBody = foot.body;
    this.bodies = [foot, carriage, torso];
    this.kp = E3_SAGITTAL_DEFAULTS.balanceKp;
    this.kd = E3_SAGITTAL_DEFAULTS.balanceKd;
    this.maxTorque = TORQUE;
    this.peakAbsTilt = 0;
    this.fallObserved = false;

    const slider = b3.b3DefaultPrismaticJointDef();
    slider.base.bodyIdA = this.foot;
    slider.base.bodyIdB = this.carriage;
    slider.base.localFrameA = { position: [0, footHalf[1], 0], quaternion: Y_NEG_90 };
    slider.base.localFrameB = { position: [0, 0, 0], quaternion: Y_NEG_90 };
    slider.enableLimit = true;
    slider.lowerTranslation = -LOCK_EPS;
    slider.upperTranslation = LOCK_EPS;
    slider.enableMotor = false;
    b3.b3CreatePrismaticJoint(world, slider);

    const ankle = b3.b3DefaultSphericalJointDef();
    ankle.base.bodyIdA = this.carriage;
    ankle.base.bodyIdB = this.torso;
    ankle.base.localFrameA = { position: [0, 0, 0], quaternion: IDENTITY };
    ankle.base.localFrameB = { position: [0, -torsoHalf[1], 0], quaternion: IDENTITY };
    b3.b3CreateSphericalJoint(world, ankle);
    this.sync();
  }

  sync() {
    this.torsoRotation = bodyRot(this.torso);
    this.footRotation = bodyRot(this.foot);
    this.torsoAngularVelocity = bodyW(this.torso);
    this.footCom = bodyCom(this.foot);
    this.carriageCom = bodyCom(this.carriage);
  }
  get torsoTilt() { return sagittalAngleFromRotation(this.torsoRotation); }
  get footTilt() { return sagittalAngleFromRotation(this.footRotation); }
  postStep() {
    this.sync();
    this.peakAbsTilt = Math.max(this.peakAbsTilt, Math.abs(this.torsoTilt));
    if (Math.abs(this.torsoTilt) >= E3_SAGITTAL_DEFAULTS.fallTiltRadians) this.fallObserved = true;
  }
  isRecovered() {
    return !this.fallObserved &&
      Math.abs(this.torsoTilt) <= E3_SAGITTAL_DEFAULTS.recoverTiltRadians &&
      Math.abs(this.torsoAngularVelocity[0]) <= E3_SAGITTAL_DEFAULTS.recoverAngularSpeed &&
      Math.abs(this.footTilt) <= E3_SAGITTAL_DEFAULTS.recoverTiltRadians * 1.5;
  }
}

function reference(world) {
  const base = new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: TORQUE });
  return {
    foot: base.foot,
    torso: base.torso,
    reactionBody: base.foot,
    bodies: [
      { body: base.foot, mass: base.footMass },
      { body: base.torso, mass: base.torsoMass },
    ],
    kp: base.kp, kd: base.kd, maxTorque: base.maxTorque,
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

function supportReader(foot) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  return {
    read() {
      b3.getBodyContactData(buffer, foot);
      let touching = 0, loaded = 0;
      for (let i = 0; i < b3.getNumContacts(buffer); i++) {
        b3.getContactAt(contact, buffer, i);
        for (let m = 0; m < contact.manifoldCount; m++) {
          b3.getManifoldAt(manifold, contact, m);
          if (Math.abs(manifold.normal[1]) < 0.5) continue;
          for (let p = 0; p < manifold.pointCount; p++) {
            const point = manifold.points[p];
            if (point.separation <= 0) touching++;
            if (Math.abs(point.normalImpulse ?? 0) > LOAD_EPS || Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPS) loaded++;
          }
        }
      }
      return { reactive: touching > 0 || loaded > 0 };
    },
    destroy() { b3.destroyContactsBuffer(buffer); },
  };
}

function bodyState(o) {
  let mass = 0;
  const pos = [0, 0, 0], vel = [0, 0, 0];
  for (const item of o.bodies) {
    const p = bodyCom(item.body), v = bodyVel(item.body);
    mass += item.mass;
    for (let a = 0; a < 3; a++) { pos[a] += item.mass * p[a]; vel[a] += item.mass * v[a]; }
  }
  for (let a = 0; a < 3; a++) { pos[a] /= mass; vel[a] /= mass; }
  return { mass, pos, vel };
}

function applyBalance(o, targetTilt, supported) {
  o.sync();
  const requested = -o.kp * (o.torsoTilt - targetTilt) - o.kd * o.torsoAngularVelocity[0];
  const torque = supported ? clamp(requested, -o.maxTorque, o.maxTorque) : 0;
  if (Math.abs(torque) < 1e-9) return;
  const j = torque * DT;
  b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(o.reactionBody, [-j, 0, 0], true);
}

function run(kind, direction) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const o = kind === 'reference' ? reference(world) : new LockedProxy(world);
  const support = supportReader(o.foot);
  let signal = support.read();
  let platformZ = 0, platformSpeed = 0, targetReached = false;
  let stable = 0, recovered = false, rampLoss = 0, rampJ = 0;
  let initialFootRel = 0, maxFootRel = 0, initialSliderRel = 0, maxSliderRel = 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);

  function step({ moving = false, targetTilt = 0, ramp = false } = {}) {
    let actualAccel = 0;
    if (moving) {
      const target = direction * TARGET_SPEED;
      const before = platformSpeed;
      platformSpeed = moveToward(platformSpeed, target, ACCEL * DT);
      actualAccel = (platformSpeed - before) / DT;
      platformZ += platformSpeed * DT;
      b3.b3Body_SetTargetTransform(platform, { position: [0, PLATFORM_Y, platformZ], quaternion: IDENTITY }, DT, true);
      if (Math.abs(platformSpeed - target) < 1e-9) targetReached = true;
    }
    const before = bodyState(o);
    applyBalance(o, moving ? direction * Math.atan2(Math.abs(actualAccel), G) : targetTilt, signal.reactive);
    b3.b3World_Step(world, DT, SUBSTEPS);
    o.postStep();
    const after = bodyState(o);
    signal = support.read();
    if (ramp) {
      if (!signal.reactive) rampLoss++;
      rampJ += direction * after.mass * (after.vel[2] - before.vel[2]);
    }
    o.sync();
    maxFootRel = Math.max(maxFootRel, Math.abs(o.footCom[2] - platformZ - initialFootRel));
    if (kind === 'locked') {
      const sliderRel = o.carriageCom[2] - o.footCom[2] - initialSliderRel;
      maxSliderRel = Math.max(maxSliderRel, Math.abs(sliderRel));
    }
    if (targetReached && o.isRecovered() && signal.reactive) stable++; else stable = 0;
    if (stable >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE; i++) step();
  if (!signal.reactive) throw new Error(`E6.0d ${kind} failed to establish support`);
  const settled = bodyState(o);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) throw new Error(`E6.0d ${kind} total mass ${settled.mass} != 80kg`);
  o.sync();
  initialFootRel = o.footCom[2] - platformZ;
  if (kind === 'locked') initialSliderRel = o.carriageCom[2] - o.footCom[2];
  for (let i = 0; i < LEAD; i++) step({ targetTilt: desiredTilt });
  const rampFrames = Math.ceil(TARGET_SPEED / ACCEL / DT) + 3;
  for (let i = 0; i < rampFrames && !targetReached; i++) step({ moving: true, ramp: true });
  const rampEnd = bodyState(o);
  for (let i = 0; i < HOLD; i++) step({ moving: true });
  const result = {
    outcome: o.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    delivered: rampJ / REQUIRED_J,
    vEnd: direction * rampEnd.vel[2],
    peak: o.peakAbsTilt * 180 / Math.PI,
    footRel: maxFootRel,
    sliderRel: maxSliderRel,
    rampLoss,
  };
  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 || TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80) {
  throw new Error('E6.0d expected current E5/Donor-v1 substrate');
}

console.log('E6.0d support-foot-preserving representation match');
console.log('  reference: E5 10kg support foot + 70kg torso');
console.log('  proxy: exact 10kg support foot + 0.5kg locked carriage + 69.5kg torso; balance torque closes torso↔foot');
console.log('  this is the final representation correction before rejecting the serial prismatic chain for E5-relative claims');

const rows = [];
for (const direction of [-1, 1]) {
  const ref = run('reference', direction);
  const locked = run('locked', direction);
  rows.push({ direction, ref, locked });
  console.log(`  dir=${direction > 0 ? '+' : '-'} ref=${ref.outcome} locked=${locked.outcome} ` +
    `Jx/need ${ref.delivered.toFixed(3)}→${locked.delivered.toFixed(3)} ` +
    `vEnd ${ref.vEnd.toFixed(3)}→${locked.vEnd.toFixed(3)}m/s ` +
    `peak ${ref.peak.toFixed(2)}→${locked.peak.toFixed(2)}deg ` +
    `footRel ${ref.footRel.toFixed(3)}→${locked.footRel.toFixed(3)}m ` +
    `sliderRel=${locked.sliderRel.toExponential(2)}m rampLoss ${ref.rampLoss}→${locked.rampLoss}`);
}

for (const { direction, ref, locked } of rows) {
  if (ref.outcome !== 'RECOVER') throw new Error(`E6.0d reference no longer reproduces E5 RECOVER dir=${direction}`);
  if (locked.outcome !== 'RECOVER') throw new Error(`E6.0d support-foot-preserving proxy does not preserve RECOVER dir=${direction}`);
  if (locked.rampLoss !== 0) throw new Error(`E6.0d proxy loses ramp support dir=${direction}`);
  if (locked.sliderRel > 0.002) throw new Error(`E6.0d locked slider translated materially dir=${direction}: ${locked.sliderRel}`);
  if (Math.abs(locked.delivered - ref.delivered) > 0.05) throw new Error(`E6.0d support impulse mismatch dir=${direction}`);
  if (Math.abs(locked.vEnd - ref.vEnd) > 0.25) throw new Error(`E6.0d ramp-end speed mismatch dir=${direction}`);
  if (Math.abs(locked.peak - ref.peak) > 4) throw new Error(`E6.0d peak-tilt mismatch dir=${direction}`);
}

if (Math.abs(rows[0].locked.vEnd - rows[1].locked.vEnd) > 0.15 || Math.abs(rows[0].locked.delivered - rows[1].locked.delivered) > 0.035) {
  throw new Error('E6.0d proxy is not sufficiently mirrored');
}

console.log('E6.0d PASS: preserving the exact E5 support foot while moving only 0.5kg from torso into the locked slider chain retains the E5 current31/lead8 control closely enough for a causal translation test. No support-relative translation is enabled yet.');