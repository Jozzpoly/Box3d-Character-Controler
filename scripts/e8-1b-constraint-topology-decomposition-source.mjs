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
const AXIAL_FRAME = [0, 0, SQRT_HALF, SQRT_HALF];

// E8.1b changes exactly one constraint relative to the post-self-collision E8.1a
// specimen: the compression-only distance spring is absent in the control arm.
// Mass, geometry, damping, collision filtering, hinge/prismatic frames, exact lock,
// current31/lead8 stimulus, solver cadence and representation thresholds are held.
const AUX_MASS = 1;
const SEGMENT_MASS = 0.5;
const SEGMENT_LENGTH = 0.45;
const BRANCH_LENGTH = 0.9;
const SEGMENT_HALF = [0.06, SEGMENT_LENGTH / 2, 0.06];
const CANDIDATE_TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - AUX_MASS;
const AUX_FRICTION = E3_SAGITTAL_DEFAULTS.footFriction;
const INTERNAL_SELF_COLLISION_GROUP = -1;
const AXIAL_LOCK = SEGMENT_LENGTH;
const SPRING_REST = SEGMENT_LENGTH;
const SPRING_HZ = 8;
const SPRING_DAMPING = 1;
const SPRING_TENSION = 0;
const SPRING_COMPRESSION = 200;
const MAX_HINGE_LOCK_ERROR = 0.25 * Math.PI / 180;
const MAX_PRISMATIC_LOCK_ERROR = 0.005;
const MAX_SEGMENT_ALIGNMENT_ERROR = 0.25 * Math.PI / 180;
const MAX_SETTLED_SPRING_PRELOAD = 0.5;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(v, target, d) { return Math.abs(target - v) <= d ? target : v + Math.sign(target - v) * d; }
function densityForMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function bodyCom(body) { const p = [0, 0, 0]; b3.b3Body_GetWorldCenterOfMass(p, body); return p; }
function bodyVel(body) { const v = [0, 0, 0]; b3.b3Body_GetLinearVelocity(v, body); return v; }
function bodyRot(body) { const q = [0, 0, 0, 1]; b3.b3Body_GetRotation(q, body); return q; }
function magnitude(v) { return Math.hypot(v[0], v[1], v[2]); }
function boxSagittalInertia(mass, fullY, fullZ) { return mass * (fullY * fullY + fullZ * fullZ) / 12; }

const crossZ = 2 * SEGMENT_HALF[2];
const originalIcm = boxSagittalInertia(AUX_MASS, BRANCH_LENGTH, crossZ);
const originalIpivot = originalIcm + AUX_MASS * (BRANCH_LENGTH / 2) ** 2;
const segmentIcm = boxSagittalInertia(SEGMENT_MASS, SEGMENT_LENGTH, crossZ);
const splitIpivot = segmentIcm + SEGMENT_MASS * (SEGMENT_LENGTH / 2) ** 2 + segmentIcm + SEGMENT_MASS * (SEGMENT_LENGTH * 1.5) ** 2;

function setInternalCollisionGroup(shape) {
  const filter = b3.b3Shape_GetFilter(shape);
  filter.groupIndex = INTERNAL_SELF_COLLISION_GROUP;
  b3.b3Shape_SetFilter(shape, filter, false);
  if (b3.b3Shape_GetFilter(shape).groupIndex !== INTERNAL_SELF_COLLISION_GROUP) {
    throw new Error('E8.1b failed to bind internal negative collision group');
  }
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

function makeSegment(world, position) {
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
  sd.density = densityForMass(SEGMENT_MASS, SEGMENT_HALF);
  sd.baseMaterial.friction = AUX_FRICTION;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...SEGMENT_HALF);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

function wrapBase(base) {
  return {
    foot: base.foot, torso: base.torso, reactionBody: base.foot,
    bodies: [{ body: base.foot, mass: base.footMass }, { body: base.torso, mass: base.torsoMass }],
    kp: base.kp, kd: base.kd, maxTorque: base.maxTorque,
    get torsoTilt() { return base.torsoTilt; },
    get torsoAngularVelocity() { return base.torsoAngularVelocity; },
    get footCom() { return base.footCom; },
    get peakAbsTilt() { return base.peakAbsTilt; },
    get fallObserved() { return base.fallObserved; },
    sync() { base._sync(); }, postStep() { base.postStep(); }, isRecovered() { return base.isRecovered(); },
    auxiliaryContactCount() { return 0; }, hingeLockError() { return 0; }, prismaticLockError() { return 0; },
    segmentAlignmentError() { return 0; }, springForce() { return 0; }, settledSpringPreload() { return 0; }, destroyAuxReaders() {},
  };
}

class SplitBranch {
  constructor(world, includeDistanceSpring) {
    const base = new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: TORQUE, torsoMass: CANDIDATE_TORSO_MASS });
    this.base = base;
    this.foot = base.foot;
    this.torso = base.torso;
    this.reactionBody = base.foot;
    this.kp = base.kp;
    this.kd = base.kd;
    this.maxTorque = base.maxTorque;
    this.includeDistanceSpring = includeDistanceSpring;

    const pivot = base.startTorsoPosition;
    const proximal = makeSegment(world, [pivot[0], pivot[1] + SEGMENT_LENGTH / 2, pivot[2]]);
    const distal = makeSegment(world, [pivot[0], pivot[1] + SEGMENT_LENGTH * 1.5, pivot[2]]);
    setInternalCollisionGroup(base.torsoShape);
    setInternalCollisionGroup(proximal.shape);
    setInternalCollisionGroup(distal.shape);
    this.proximalBody = proximal.body;
    this.distalBody = distal.body;
    this.bodies = [{ body: base.foot, mass: base.footMass }, { body: base.torso, mass: base.torsoMass }, proximal, distal];

    const hinge = b3.b3DefaultRevoluteJointDef();
    hinge.base.bodyIdA = this.torso;
    hinge.base.bodyIdB = this.proximalBody;
    hinge.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_HINGE_FRAME };
    hinge.base.localFrameB = { position: [0, -SEGMENT_LENGTH / 2, 0], quaternion: SAGITTAL_HINGE_FRAME };
    hinge.enableSpring = false;
    hinge.enableLimit = true;
    hinge.lowerAngle = 0;
    hinge.upperAngle = 0;
    hinge.enableMotor = false;
    this.hingeJoint = b3.b3CreateRevoluteJoint(world, hinge);

    const guide = b3.b3DefaultPrismaticJointDef();
    guide.base.bodyIdA = this.proximalBody;
    guide.base.bodyIdB = this.distalBody;
    guide.base.localFrameA = { position: [0, 0, 0], quaternion: AXIAL_FRAME };
    guide.base.localFrameB = { position: [0, 0, 0], quaternion: AXIAL_FRAME };
    guide.enableSpring = false;
    guide.enableLimit = true;
    guide.lowerTranslation = AXIAL_LOCK;
    guide.upperTranslation = AXIAL_LOCK;
    guide.enableMotor = false;
    this.guideJoint = b3.b3CreatePrismaticJoint(world, guide);

    this.springJoint = null;
    if (includeDistanceSpring) {
      const spring = b3.b3DefaultDistanceJointDef();
      spring.base.bodyIdA = this.proximalBody;
      spring.base.bodyIdB = this.distalBody;
      spring.base.localFrameA = { position: [0, 0, 0], quaternion: IDENTITY };
      spring.base.localFrameB = { position: [0, 0, 0], quaternion: IDENTITY };
      spring.length = SPRING_REST;
      spring.enableSpring = true;
      spring.lowerSpringForce = SPRING_TENSION;
      spring.upperSpringForce = SPRING_COMPRESSION;
      spring.hertz = SPRING_HZ;
      spring.dampingRatio = SPRING_DAMPING;
      spring.enableLimit = false;
      spring.enableMotor = false;
      this.springJoint = b3.b3CreateDistanceJoint(world, spring);
      b3.b3DistanceJoint_SetSpringForceRange(this.springJoint, SPRING_TENSION, SPRING_COMPRESSION);
    }

    this.proximalContacts = b3.createContactsBuffer();
    this.distalContacts = b3.createContactsBuffer();
    this.maxAuxContacts = 0;
    this.maxHingeError = 0;
    this.maxPrismaticError = 0;
    this.maxAlignmentError = 0;
    this.maxSpringMagnitude = 0;
    this.staticSpringMagnitude = 0;
    this.sync();
  }

  sync() {
    this.base._sync();
    const proximalTilt = sagittalAngleFromRotation(bodyRot(this.proximalBody));
    const distalTilt = sagittalAngleFromRotation(bodyRot(this.distalBody));
    this.maxHingeError = Math.max(this.maxHingeError, Math.abs(proximalTilt - this.base.torsoTilt));
    this.maxPrismaticError = Math.max(this.maxPrismaticError, Math.abs(b3.b3PrismaticJoint_GetTranslation(this.guideJoint) - AXIAL_LOCK));
    this.maxAlignmentError = Math.max(this.maxAlignmentError, Math.abs(distalTilt - proximalTilt));
    if (this.springJoint) {
      const f = [0, 0, 0];
      b3.b3Joint_GetConstraintForce(f, this.springJoint);
      this.maxSpringMagnitude = Math.max(this.maxSpringMagnitude, magnitude(f));
    }
    b3.getBodyContactData(this.proximalContacts, this.proximalBody);
    b3.getBodyContactData(this.distalContacts, this.distalBody);
    this.maxAuxContacts = Math.max(this.maxAuxContacts, b3.getNumContacts(this.proximalContacts) + b3.getNumContacts(this.distalContacts));
  }

  captureSettledSpringPreload() {
    if (!this.springJoint) { this.staticSpringMagnitude = 0; return; }
    const f = [0, 0, 0];
    b3.b3Joint_GetConstraintForce(f, this.springJoint);
    this.staticSpringMagnitude = magnitude(f);
  }
  get torsoTilt() { return this.base.torsoTilt; }
  get torsoAngularVelocity() { return this.base.torsoAngularVelocity; }
  get footCom() { return this.base.footCom; }
  get peakAbsTilt() { return this.base.peakAbsTilt; }
  get fallObserved() { return this.base.fallObserved; }
  postStep() { this.base.postStep(); this.sync(); }
  isRecovered() { return this.base.isRecovered(); }
  auxiliaryContactCount() { return this.maxAuxContacts; }
  hingeLockError() { return this.maxHingeError; }
  prismaticLockError() { return this.maxPrismaticError; }
  segmentAlignmentError() { return this.maxAlignmentError; }
  springForce() { return this.maxSpringMagnitude; }
  settledSpringPreload() { return this.staticSpringMagnitude; }
  destroyAuxReaders() { b3.destroyContactsBuffer(this.proximalContacts); b3.destroyContactsBuffer(this.distalContacts); }
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
  const impulse = torque * DT;
  b3.b3Body_ApplyAngularImpulse(o.torso, [impulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(o.reactionBody, [-impulse, 0, 0], true);
}

function run(kind, direction, includeDistanceSpring = false) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const o = kind === 'reference'
    ? wrapBase(new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: TORQUE }))
    : new SplitBranch(world, includeDistanceSpring);
  const support = supportReader(o.foot);
  let signal = support.read();
  let platformZ = 0, platformSpeed = 0, targetReached = false, stable = 0, recovered = false;
  let rampLoss = 0, rampJ = 0, initialFootRel = 0, maxFootRel = 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);

  function step({ moving = false, targetTilt = 0, ramp = false } = {}) {
    let actualAccel = 0;
    if (moving) {
      const target = direction * TARGET_SPEED;
      const beforeSpeed = platformSpeed;
      platformSpeed = moveToward(platformSpeed, target, ACCEL * DT);
      actualAccel = (platformSpeed - beforeSpeed) / DT;
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
    if (targetReached && o.isRecovered() && signal.reactive) stable++; else stable = 0;
    if (stable >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE; i++) step();
  if (!signal.reactive) throw new Error(`E8.1b ${kind} failed to establish primary support`);
  const settled = bodyState(o);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) throw new Error(`E8.1b ${kind} total mass mismatch: ${settled.mass}`);
  o.captureSettledSpringPreload();
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
    auxContacts: o.auxiliaryContactCount(),
    hingeDeg: o.hingeLockError() * 180 / Math.PI,
    axial: o.prismaticLockError(),
    alignDeg: o.segmentAlignmentError() * 180 / Math.PI,
    settledSpring: o.settledSpringPreload(),
    maxSpring: o.springForce(),
  };
  support.destroy(); o.destroyAuxReaders(); b3.b3DestroyWorld(world);
  return result;
}

function macroPass(ref, c) {
  return c.outcome === 'RECOVER' && c.rampLoss === 0 && c.auxContacts === 0 &&
    Math.abs(c.delivered - ref.delivered) <= 0.05 && Math.abs(c.vEnd - ref.vEnd) <= 0.25 && Math.abs(c.peak - ref.peak) <= 4;
}
function mechPass(c) {
  return c.hingeDeg <= MAX_HINGE_LOCK_ERROR * 180 / Math.PI && c.axial <= MAX_PRISMATIC_LOCK_ERROR && c.alignDeg <= MAX_SEGMENT_ALIGNMENT_ERROR * 180 / Math.PI;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 || TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80) {
  throw new Error('E8.1b expected current E5/Donor-v1 substrate');
}
if (Math.abs(splitIpivot - originalIpivot) > 1e-12) throw new Error('E8.1b split inertia mismatch');

console.log('E8.1b constraint-topology decomposition: distance spring present vs absent');
console.log(`  fixed branch mass=${AUX_MASS.toFixed(3)}kg I_pivot=${splitIpivot.toFixed(6)}kgm2 hingeLimit=${(MAX_HINGE_LOCK_ERROR * 180 / Math.PI).toFixed(3)}deg`);
const rows = [];
for (const direction of [-1, 1]) {
  const ref = run('reference', direction);
  const full = run('candidate', direction, true);
  const noSpring = run('candidate', direction, false);
  rows.push({ direction, ref, full, noSpring });
  const fmt = c => `${c.outcome} J=${c.delivered.toFixed(3)} v=${c.vEnd.toFixed(3)} peak=${c.peak.toFixed(2)} hinge=${c.hingeDeg.toFixed(4)}deg axial=${c.axial.toExponential(2)}m align=${c.alignDeg.toFixed(4)}deg spring=${c.settledSpring.toFixed(3)}/${c.maxSpring.toFixed(3)}N contacts=${c.auxContacts}`;
  console.log(`  dir=${direction > 0 ? '+' : '-'} ref=${fmt(ref)}`);
  console.log(`    full     ${fmt(full)} macro=${macroPass(ref, full)} mech=${mechPass(full)}`);
  console.log(`    noSpring ${fmt(noSpring)} macro=${macroPass(ref, noSpring)} mech=${mechPass(noSpring)}`);
}

for (const { direction, ref, full, noSpring } of rows) {
  if (ref.outcome !== 'RECOVER') throw new Error(`E8.1b reference regression dir=${direction}`);
  if (!macroPass(ref, full) || !macroPass(ref, noSpring)) throw new Error(`E8.1b decomposition lost macro representation envelope dir=${direction}`);
  if (full.settledSpring > MAX_SETTLED_SPRING_PRELOAD) throw new Error(`E8.1b full spring preload regression dir=${direction}`);
  if (noSpring.settledSpring !== 0 || noSpring.maxSpring !== 0) throw new Error(`E8.1b no-spring control reports spring force dir=${direction}`);
}

const fullFailsMechanical = rows.some(r => !mechPass(r.full));
if (!fullFailsMechanical) throw new Error('E8.1b failed to reproduce the post-filter E8.1a mechanical-integrity defect');
const noSpringPassesMechanical = rows.every(r => mechPass(r.noSpring));
if (!noSpringPassesMechanical) {
  throw new Error('E8.1b RESULT: removing the distance spring does not restore the declared mechanical envelope; serial hinge+prismatic topology remains implicated');
}

console.log('E8.1b PASS: with mass, COM/inertia, geometry, self-collision semantics, exact hinge/prismatic locks, current31/lead8 stimulus and all declared thresholds held fixed, removing only the parallel compression-only distance spring restores mechanical lock integrity while the full composite reproduces the E8.1a hinge-drift failure. The inactive defect is therefore attributable to same-DOF constraint coupling, not the serial hinge+prismatic split itself. This does not qualify a spring clutch, latch release, support placement, load sharing or locomotion.');
