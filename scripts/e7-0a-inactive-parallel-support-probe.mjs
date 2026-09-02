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
const SAGITTAL_HINGE_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];

// E7.0a is an instrument, not anatomy selection.
// Preserve the exact 10 kg primary foot, move only 1 kg from torso into a
// parallel support-capable probe, and do not sweep this mass if the gate fails.
const PROBE_MASS = 1;
const CANDIDATE_TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - PROBE_MASS;
const PROBE_HALF = [0.06, 0.35, 0.06];
const PROBE_FRICTION = E3_SAGITTAL_DEFAULTS.footFriction;
const MAX_LOCK_ERROR = 0.25 * Math.PI / 180;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(v, target, d) {
  return Math.abs(target - v) <= d ? target : v + Math.sign(target - v) * d;
}
function densityForMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function bodyCom(body) { const p = [0, 0, 0]; b3.b3Body_GetWorldCenterOfMass(p, body); return p; }
function bodyVel(body) { const v = [0, 0, 0]; b3.b3Body_GetLinearVelocity(v, body); return v; }
function bodyRot(body) { const q = [0, 0, 0, 1]; b3.b3Body_GetRotation(q, body); return q; }

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

function makeProbe(world, position) {
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
  sd.density = densityForMass(PROBE_MASS, PROBE_HALF);
  sd.baseMaterial.friction = PROBE_FRICTION;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...PROBE_HALF);
  return { body, mass: b3.b3Body_GetMass(body) };
}

function wrapBase(base) {
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
    probeBody: null,
    probeContactCount() { return 0; },
    lockError() { return 0; },
    destroyProbeReader() {},
  };
}

class InactiveParallelSupportProbe {
  constructor(world) {
    const base = new SagittalBalanceOrganism(b3, world, {
      mode: 'finite',
      maxTorque: TORQUE,
      torsoMass: CANDIDATE_TORSO_MASS,
    });
    this.base = base;
    this.foot = base.foot;
    this.torso = base.torso;
    this.reactionBody = base.foot;
    this.kp = base.kp;
    this.kd = base.kd;
    this.maxTorque = base.maxTorque;

    // The primary foot↔torso spherical ankle above remains untouched.
    // The probe is attached in parallel at torso COM and points upward.
    const pivot = base.startTorsoPosition;
    const probe = makeProbe(world, [pivot[0], pivot[1] + PROBE_HALF[1], pivot[2]]);
    this.probeBody = probe.body;
    this.bodies = [
      { body: base.foot, mass: base.footMass },
      { body: base.torso, mass: base.torsoMass },
      probe,
    ];

    if (typeof b3.b3DefaultRevoluteJointDef !== 'function' || typeof b3.b3CreateRevoluteJoint !== 'function') {
      throw new Error('E7.0a requires revolute-joint bindings in box3d.js@0.1.1');
    }

    const hinge = b3.b3DefaultRevoluteJointDef();
    hinge.base.bodyIdA = this.torso;
    hinge.base.bodyIdB = this.probeBody;
    hinge.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_HINGE_FRAME };
    hinge.base.localFrameB = { position: [0, -PROBE_HALF[1], 0], quaternion: SAGITTAL_HINGE_FRAME };
    hinge.enableSpring = false;
    hinge.enableLimit = true;
    hinge.lowerAngle = 0;
    hinge.upperAngle = 0;
    hinge.enableMotor = false;
    this.probeJoint = b3.b3CreateRevoluteJoint(world, hinge);

    this.probeContactsBuffer = b3.createContactsBuffer();
    this.maxLockError = 0;
    this.maxProbeContacts = 0;
    this.sync();
  }

  sync() {
    this.base._sync();
    const probeRotation = bodyRot(this.probeBody);
    const probeTilt = sagittalAngleFromRotation(probeRotation);
    const torsoTilt = this.base.torsoTilt;
    this.maxLockError = Math.max(this.maxLockError, Math.abs(probeTilt - torsoTilt));
    b3.getBodyContactData(this.probeContactsBuffer, this.probeBody);
    this.maxProbeContacts = Math.max(this.maxProbeContacts, b3.getNumContacts(this.probeContactsBuffer));
  }

  get torsoTilt() { return this.base.torsoTilt; }
  get footTilt() { return this.base.footTilt; }
  get torsoAngularVelocity() { return this.base.torsoAngularVelocity; }
  get footCom() { return this.base.footCom; }
  get peakAbsTilt() { return this.base.peakAbsTilt; }
  get fallObserved() { return this.base.fallObserved; }

  postStep() {
    this.base.postStep();
    this.sync();
  }

  isRecovered() { return this.base.isRecovered(); }
  probeContactCount() { return this.maxProbeContacts; }
  lockError() { return this.maxLockError; }
  destroyProbeReader() { b3.destroyContactsBuffer(this.probeContactsBuffer); }
}

function supportReader(foot) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  return {
    read() {
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
  const pos = [0, 0, 0];
  const vel = [0, 0, 0];
  for (const item of o.bodies) {
    const p = bodyCom(item.body);
    const v = bodyVel(item.body);
    mass += item.mass;
    for (let a = 0; a < 3; a++) {
      pos[a] += item.mass * p[a];
      vel[a] += item.mass * v[a];
    }
  }
  for (let a = 0; a < 3; a++) {
    pos[a] /= mass;
    vel[a] /= mass;
  }
  return { mass, pos, vel };
}

function applyBalance(o, targetTilt, supported) {
  o.sync();
  const requested = -o.kp * (o.torsoTilt - targetTilt) - o.kd * o.torsoAngularVelocity[0];
  const torque = supported ? clamp(requested, -o.maxTorque, o.maxTorque) : 0;
  if (Math.abs(torque) < 1e-9) return;
  const impulse = torque * DT;
  b3.b3Body_ApplyAngularImpulse(o.torso, [impulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(o.reactionBody, [-impulse, 0, 0], true);
}

function run(kind, direction) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const o = kind === 'reference'
    ? wrapBase(new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: TORQUE }))
    : new InactiveParallelSupportProbe(world);
  const support = supportReader(o.foot);
  let signal = support.read();
  let platformZ = 0;
  let platformSpeed = 0;
  let targetReached = false;
  let stable = 0;
  let recovered = false;
  let rampLoss = 0;
  let rampJ = 0;
  let initialFootRel = 0;
  let maxFootRel = 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);

  function step({ moving = false, targetTilt = 0, ramp = false } = {}) {
    let actualAccel = 0;
    if (moving) {
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

    const before = bodyState(o);
    applyBalance(
      o,
      moving ? direction * Math.atan2(Math.abs(actualAccel), G) : targetTilt,
      signal.reactive,
    );
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
    if (targetReached && o.isRecovered() && signal.reactive) stable++; else stable = 0;
    if (stable >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE; i++) step();
  if (!signal.reactive) throw new Error(`E7.0a ${kind} failed to establish primary support`);
  const settled = bodyState(o);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E7.0a ${kind} total mass ${settled.mass} != 80kg`);
  }
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
    rampLoss,
    probeContacts: o.probeContactCount(),
    probeLockErrorDeg: o.lockError() * 180 / Math.PI,
  };

  support.destroy();
  o.destroyProbeReader();
  b3.b3DestroyWorld(world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 || TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80) {
  throw new Error('E7.0a expected current E5/Donor-v1 substrate');
}

console.log('E7.0a inactive parallel support-probe non-interference gate');
console.log('  reference: exact E5 10kg foot <-> spherical ankle <-> 70kg torso');
console.log('  candidate: exact primary ankle + 10kg foot + 69kg torso + 1kg upward parallel probe');
console.log('  probe hinge: exact-zero locked, no motor, probe must make zero contacts');

const rows = [];
for (const direction of [-1, 1]) {
  const ref = run('reference', direction);
  const candidate = run('candidate', direction);
  rows.push({ direction, ref, candidate });
  console.log(
    `  dir=${direction > 0 ? '+' : '-'} ref=${ref.outcome} candidate=${candidate.outcome} ` +
    `Jx/need ${ref.delivered.toFixed(3)}→${candidate.delivered.toFixed(3)} ` +
    `vEnd ${ref.vEnd.toFixed(3)}→${candidate.vEnd.toFixed(3)}m/s ` +
    `peak ${ref.peak.toFixed(2)}→${candidate.peak.toFixed(2)}deg ` +
    `footRel ${ref.footRel.toFixed(3)}→${candidate.footRel.toFixed(3)}m ` +
    `probeContacts=${candidate.probeContacts} lockError=${candidate.probeLockErrorDeg.toFixed(4)}deg ` +
    `rampLoss ${ref.rampLoss}→${candidate.rampLoss}`
  );
}

for (const { direction, ref, candidate } of rows) {
  if (ref.outcome !== 'RECOVER') throw new Error(`E7.0a reference no longer reproduces E5 RECOVER dir=${direction}`);
  if (candidate.outcome !== 'RECOVER') throw new Error(`E7.0a inactive probe does not preserve RECOVER dir=${direction}`);
  if (candidate.rampLoss !== 0) throw new Error(`E7.0a inactive probe loses primary ramp support dir=${direction}`);
  if (candidate.probeContacts !== 0) throw new Error(`E7.0a inactive probe contacted another body dir=${direction}: ${candidate.probeContacts}`);
  if (candidate.probeLockErrorDeg > MAX_LOCK_ERROR * 180 / Math.PI) {
    throw new Error(`E7.0a probe lock drift dir=${direction}: ${candidate.probeLockErrorDeg}deg`);
  }
  if (Math.abs(candidate.delivered - ref.delivered) > 0.05) throw new Error(`E7.0a support impulse mismatch dir=${direction}`);
  if (Math.abs(candidate.vEnd - ref.vEnd) > 0.25) throw new Error(`E7.0a ramp-end speed mismatch dir=${direction}`);
  if (Math.abs(candidate.peak - ref.peak) > 4) throw new Error(`E7.0a peak-tilt mismatch dir=${direction}`);
}

if (
  Math.abs(rows[0].candidate.vEnd - rows[1].candidate.vEnd) > 0.15 ||
  Math.abs(rows[0].candidate.delivered - rows[1].candidate.delivered) > 0.035
) {
  throw new Error('E7.0a inactive parallel support probe is not sufficiently mirrored');
}

console.log('E7.0a PASS: a real 1kg parallel support-capable probe can exist locked, elevated and contact-inactive while preserving the primary E5 current31/lead8 organism inside the declared representation envelope. This qualifies only inactive non-interference; it does not authorize support acquisition, load transfer, stepping or gait.');
