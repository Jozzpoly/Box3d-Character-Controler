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
const SQRT_HALF = Math.SQRT1_2;
const SAGITTAL_WHEEL_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];
const LOCK_EPS = 1e-5;
const ANCHOR_MATCH_EPS = 0.002;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(v, target, d) {
  return Math.abs(target - v) <= d ? target : v + Math.sign(target - v) * d;
}
function densityForMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function bodyCom(body) { const p = [0, 0, 0]; b3.b3Body_GetWorldCenterOfMass(p, body); return p; }
function bodyPos(body) { const p = [0, 0, 0]; b3.b3Body_GetPosition(p, body); return p; }
function bodyVel(body) { const v = [0, 0, 0]; b3.b3Body_GetLinearVelocity(v, body); return v; }
function bodyRot(body) { const q = [0, 0, 0, 1]; b3.b3Body_GetRotation(q, body); return q; }
function bodyW(body) { const w = [0, 0, 0]; b3.b3Body_GetAngularVelocity(w, body); return w; }

function rotateVector(q, v) {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

function worldPoint(body, localPoint) {
  const p = bodyPos(body);
  const q = bodyRot(body);
  const r = rotateVector(q, localPoint);
  return [p[0] + r[0], p[1] + r[1], p[2] + r[2]];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
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
  b3.b3CreateBoxShape(body, sd, ...half);
  return { body, mass: b3.b3Body_GetMass(body) };
}

class LockedTwoBodyWheelProxy {
  constructor(world) {
    const footHalf = E3_SAGITTAL_DEFAULTS.footHalf;
    const torsoHalf = E3_SAGITTAL_DEFAULTS.torsoHalf;
    const footY = footHalf[1] + 0.002;
    const ankleY = footY + footHalf[1];

    const foot = makeBox(world, [0, footY, 0], footHalf, E3_SAGITTAL_DEFAULTS.footMass, E3_SAGITTAL_DEFAULTS.footFriction);
    const torso = makeBox(world, [0, ankleY + torsoHalf[1], 0], torsoHalf, E3_SAGITTAL_DEFAULTS.torsoMass, E3_SAGITTAL_DEFAULTS.torsoFriction);

    this.foot = foot.body;
    this.torso = torso.body;
    this.reactionBody = foot.body;
    this.bodies = [foot, torso];
    this.kp = E3_SAGITTAL_DEFAULTS.balanceKp;
    this.kd = E3_SAGITTAL_DEFAULTS.balanceKd;
    this.maxTorque = TORQUE;
    this.peakAbsTilt = 0;
    this.fallObserved = false;
    this.footAnchor = [0, footHalf[1], 0];
    this.torsoAnchor = [0, -torsoHalf[1], 0];

    const wheel = b3.b3DefaultWheelJointDef();
    wheel.base.bodyIdA = this.foot;
    wheel.base.bodyIdB = this.torso;
    wheel.base.localFrameA = { position: this.footAnchor, quaternion: SAGITTAL_WHEEL_FRAME };
    wheel.base.localFrameB = { position: this.torsoAnchor, quaternion: SAGITTAL_WHEEL_FRAME };
    wheel.enableSuspensionSpring = false;
    wheel.enableSuspensionLimit = true;
    wheel.lowerSuspensionLimit = -LOCK_EPS;
    wheel.upperSuspensionLimit = LOCK_EPS;
    wheel.enableSpinMotor = false;
    wheel.enableSteering = false;
    this.joint = b3.b3CreateWheelJoint(world, wheel);
    this.sync();
  }

  sync() {
    this.torsoRotation = bodyRot(this.torso);
    this.footRotation = bodyRot(this.foot);
    this.torsoAngularVelocity = bodyW(this.torso);
    this.footCom = bodyCom(this.foot);
  }

  get torsoTilt() { return sagittalAngleFromRotation(this.torsoRotation); }
  get footTilt() { return sagittalAngleFromRotation(this.footRotation); }

  anchorError() {
    return distance(worldPoint(this.foot, this.footAnchor), worldPoint(this.torso, this.torsoAnchor));
  }

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
    anchorError() { return 0; },
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
  const o = kind === 'reference' ? reference(world) : new LockedTwoBodyWheelProxy(world);
  const support = supportReader(o.foot);
  let signal = support.read();
  let platformZ = 0, platformSpeed = 0, targetReached = false;
  let stable = 0, recovered = false, rampLoss = 0, rampJ = 0;
  let initialFootRel = 0, maxFootRel = 0, maxAnchorError = 0;
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
    maxAnchorError = Math.max(maxAnchorError, o.anchorError());
    if (targetReached && o.isRecovered() && signal.reactive) stable++; else stable = 0;
    if (stable >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE; i++) step();
  if (!signal.reactive) throw new Error(`E6.1b ${kind} failed to establish support`);
  const settled = bodyState(o);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) throw new Error(`E6.1b ${kind} total mass ${settled.mass} != 80kg`);
  o.sync();
  initialFootRel = o.footCom[2] - platformZ;

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
    anchorError: maxAnchorError,
    rampLoss,
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 || TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80) {
  throw new Error('E6.1b expected current E5/Donor-v1 substrate');
}

console.log('E6.1b locked two-body wheel representation match');
console.log('  reference: E5 direct 10kg support foot <-> spherical ankle <-> 70kg torso');
console.log('  candidate: exact same 10kg foot + 70kg torso connected directly by wheel-like two-DOF joint');
console.log('  suspension translation is locked; only sagittal ankle spin remains available');

const rows = [];
for (const direction of [-1, 1]) {
  const ref = run('reference', direction);
  const candidate = run('candidate', direction);
  rows.push({ direction, ref, candidate });
  console.log(`  dir=${direction > 0 ? '+' : '-'} ref=${ref.outcome} candidate=${candidate.outcome} ` +
    `Jx/need ${ref.delivered.toFixed(3)}→${candidate.delivered.toFixed(3)} ` +
    `vEnd ${ref.vEnd.toFixed(3)}→${candidate.vEnd.toFixed(3)}m/s ` +
    `peak ${ref.peak.toFixed(2)}→${candidate.peak.toFixed(2)}deg ` +
    `footRel ${ref.footRel.toFixed(3)}→${candidate.footRel.toFixed(3)}m ` +
    `anchorError=${candidate.anchorError.toExponential(2)}m rampLoss ${ref.rampLoss}→${candidate.rampLoss}`);
}

for (const { direction, ref, candidate } of rows) {
  if (ref.outcome !== 'RECOVER') throw new Error(`E6.1b reference no longer reproduces E5 RECOVER dir=${direction}`);
  if (candidate.outcome !== 'RECOVER') throw new Error(`E6.1b two-body candidate does not preserve RECOVER dir=${direction}`);
  if (candidate.rampLoss !== 0) throw new Error(`E6.1b candidate loses ramp support dir=${direction}`);
  if (candidate.anchorError > ANCHOR_MATCH_EPS) throw new Error(`E6.1b locked two-body anchors separated materially dir=${direction}: ${candidate.anchorError}`);
  if (Math.abs(candidate.delivered - ref.delivered) > 0.05) throw new Error(`E6.1b support impulse mismatch dir=${direction}`);
  if (Math.abs(candidate.vEnd - ref.vEnd) > 0.25) throw new Error(`E6.1b ramp-end speed mismatch dir=${direction}`);
  if (Math.abs(candidate.peak - ref.peak) > 4) throw new Error(`E6.1b peak-tilt mismatch dir=${direction}`);
}

if (Math.abs(rows[0].candidate.vEnd - rows[1].candidate.vEnd) > 0.15 || Math.abs(rows[0].candidate.delivered - rows[1].candidate.delivered) > 0.035) {
  throw new Error('E6.1b candidate is not sufficiently mirrored');
}

console.log('E6.1b PASS: with suspension translation locked, the direct two-body wheel-like joint preserves the current E5 current31/lead8 organism closely enough to qualify as a causal support-relative-translation representation. No relocation actuation is enabled yet.');
