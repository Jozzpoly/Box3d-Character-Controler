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

// E9.0b asks one question only:
// does splitting the already-qualified E7.0b 1 kg x 0.9 m probe into two
// mass/COM/inertia-matched rigidly welded bodies preserve the inactive E5/E7
// representation? There is no latent prismatic DOF, distance spring, motor,
// latch release, placement actuation, auxiliary ground contact or added world
// authority. If this fails, do not tune weld hertz, masses, geometry or substeps.
const AUX_MASS = 1;
const CANDIDATE_TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - AUX_MASS;
const BRANCH_LENGTH = 0.9;
const ONE_HALF = [0.06, BRANCH_LENGTH / 2, 0.06];
const SEGMENT_MASS = AUX_MASS / 2;
const SEGMENT_LENGTH = BRANCH_LENGTH / 2;
const SEGMENT_HALF = [0.06, SEGMENT_LENGTH / 2, 0.06];
const AUX_FRICTION = E3_SAGITTAL_DEFAULTS.footFriction;
const INTERNAL_SELF_COLLISION_GROUP = -1;

// Reuse the representation tolerances already paid for by E7/E8.
const MAX_HINGE_LOCK_ERROR = 0.25 * Math.PI / 180;
const MAX_WELD_ANCHOR_GAP = 0.005;
const MAX_WELD_ALIGNMENT_ERROR = 0.25 * Math.PI / 180;
const MAX_IMPULSE_FRACTION_DELTA = 0.05;
const MAX_SPEED_DELTA = 0.25;
const MAX_PEAK_TILT_DELTA = 4;
const MAX_MIRROR_SPEED_GAP = 0.15;
const MAX_MIRROR_IMPULSE_GAP = 0.035;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(v, target, d) {
  return Math.abs(target - v) <= d ? target : v + Math.sign(target - v) * d;
}
function densityForMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function bodyCom(body) { const p = [0, 0, 0]; b3.b3Body_GetWorldCenterOfMass(p, body); return p; }
function bodyVel(body) { const v = [0, 0, 0]; b3.b3Body_GetLinearVelocity(v, body); return v; }
function bodyRot(body) { const q = [0, 0, 0, 1]; b3.b3Body_GetRotation(q, body); return q; }
function worldPoint(body, localPoint) { const p = [0, 0, 0]; b3.b3Body_GetWorldPoint(p, body, localPoint); return p; }
function distance(a, c) { return Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]); }

function boxSagittalInertia(mass, fullY, fullZ) {
  return mass * (fullY * fullY + fullZ * fullZ) / 12;
}

const fullZ = 2 * ONE_HALF[2];
const oneIcm = boxSagittalInertia(AUX_MASS, BRANCH_LENGTH, fullZ);
const oneIpivot = oneIcm + AUX_MASS * (BRANCH_LENGTH / 2) ** 2;
const segmentIcm = boxSagittalInertia(SEGMENT_MASS, SEGMENT_LENGTH, fullZ);
const splitComFromPivot = (
  SEGMENT_MASS * (SEGMENT_LENGTH / 2) +
  SEGMENT_MASS * (SEGMENT_LENGTH * 1.5)
) / AUX_MASS;
const splitIpivot =
  segmentIcm + SEGMENT_MASS * (SEGMENT_LENGTH / 2) ** 2 +
  segmentIcm + SEGMENT_MASS * (SEGMENT_LENGTH * 1.5) ** 2;

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

function makeAuxBody(world, position, mass, half) {
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
  sd.baseMaterial.friction = AUX_FRICTION;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...half);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

function setInternalCollisionGroup(shape) {
  const filter = b3.b3Shape_GetFilter(shape);
  filter.groupIndex = INTERNAL_SELF_COLLISION_GROUP;
  b3.b3Shape_SetFilter(shape, filter, false);
  if (b3.b3Shape_GetFilter(shape).groupIndex !== INTERNAL_SELF_COLLISION_GROUP) {
    throw new Error('E9.0b failed to bind internal negative collision group');
  }
}

function createLockedPlacementHinge(world, torso, branchBody, branchHalfLength) {
  const hinge = b3.b3DefaultRevoluteJointDef();
  hinge.base.bodyIdA = torso;
  hinge.base.bodyIdB = branchBody;
  hinge.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.base.localFrameB = { position: [0, -branchHalfLength, 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.enableSpring = false;
  hinge.enableLimit = true;
  hinge.lowerAngle = 0;
  hinge.upperAngle = 0;
  hinge.enableMotor = false;
  return b3.b3CreateRevoluteJoint(world, hinge);
}

function createRigidWeld(world, proximal, distal) {
  const weld = b3.b3DefaultWeldJointDef();
  weld.base.bodyIdA = proximal;
  weld.base.bodyIdB = distal;
  weld.base.localFrameA = { position: [0, SEGMENT_HALF[1], 0], quaternion: IDENTITY };
  weld.base.localFrameB = { position: [0, -SEGMENT_HALF[1], 0], quaternion: IDENTITY };
  weld.base.collideConnected = false;
  weld.linearHertz = 0;
  weld.angularHertz = 0;
  weld.linearDampingRatio = 1;
  weld.angularDampingRatio = 1;
  return b3.b3CreateWeldJoint(world, weld);
}

function makeAuxContactReader(bodies) {
  const buffers = bodies.map(() => b3.createContactsBuffer());
  let maxContacts = 0;
  return {
    sample() {
      let contacts = 0;
      for (let i = 0; i < bodies.length; i++) {
        b3.getBodyContactData(buffers[i], bodies[i]);
        contacts += b3.getNumContacts(buffers[i]);
      }
      maxContacts = Math.max(maxContacts, contacts);
    },
    max() { return maxContacts; },
    destroy() { for (const buffer of buffers) b3.destroyContactsBuffer(buffer); },
  };
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
    get torsoAngularVelocity() { return base.torsoAngularVelocity; },
    get footCom() { return base.footCom; },
    get peakAbsTilt() { return base.peakAbsTilt; },
    get fallObserved() { return base.fallObserved; },
    sync() { base._sync(); },
    postStep() { base.postStep(); },
    isRecovered() { return base.isRecovered(); },
    auxiliaryContactCount() { return 0; },
    nativeHingeError() { return 0; },
    worldHingeError() { return 0; },
    weldAnchorGap() { return 0; },
    weldAlignmentError() { return 0; },
    destroyAuxReaders() {},
  };
}

class OnePieceE7Probe {
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

    const pivot = base.startTorsoPosition;
    const probe = makeAuxBody(
      world,
      [pivot[0], pivot[1] + ONE_HALF[1], pivot[2]],
      AUX_MASS,
      ONE_HALF,
    );
    this.probeBody = probe.body;
    this.bodies = [
      { body: base.foot, mass: base.footMass },
      { body: base.torso, mass: base.torsoMass },
      probe,
    ];
    this.hingeJoint = createLockedPlacementHinge(world, this.torso, this.probeBody, ONE_HALF[1]);
    this.contactReader = makeAuxContactReader([this.probeBody]);
    this.maxNativeHinge = 0;
    this.maxWorldHinge = 0;
    this.sync();
  }

  sync() {
    this.base._sync();
    const probeTilt = sagittalAngleFromRotation(bodyRot(this.probeBody));
    this.maxWorldHinge = Math.max(this.maxWorldHinge, Math.abs(probeTilt - this.base.torsoTilt));
    this.maxNativeHinge = Math.max(this.maxNativeHinge, Math.abs(b3.b3RevoluteJoint_GetAngle(this.hingeJoint)));
    this.contactReader.sample();
  }

  get torsoTilt() { return this.base.torsoTilt; }
  get torsoAngularVelocity() { return this.base.torsoAngularVelocity; }
  get footCom() { return this.base.footCom; }
  get peakAbsTilt() { return this.base.peakAbsTilt; }
  get fallObserved() { return this.base.fallObserved; }
  postStep() { this.base.postStep(); this.sync(); }
  isRecovered() { return this.base.isRecovered(); }
  auxiliaryContactCount() { return this.contactReader.max(); }
  nativeHingeError() { return this.maxNativeHinge; }
  worldHingeError() { return this.maxWorldHinge; }
  weldAnchorGap() { return 0; }
  weldAlignmentError() { return 0; }
  destroyAuxReaders() { this.contactReader.destroy(); }
}

class RigidSplitProbe {
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

    const pivot = base.startTorsoPosition;
    const proximal = makeAuxBody(
      world,
      [pivot[0], pivot[1] + SEGMENT_LENGTH / 2, pivot[2]],
      SEGMENT_MASS,
      SEGMENT_HALF,
    );
    const distal = makeAuxBody(
      world,
      [pivot[0], pivot[1] + SEGMENT_LENGTH * 1.5, pivot[2]],
      SEGMENT_MASS,
      SEGMENT_HALF,
    );

    // Splitting creates a distal<->torso collision relationship absent from the
    // one-piece E7 assembly. Restore the same assembly-level self-collision
    // semantics without changing contacts against ordinary world shapes.
    setInternalCollisionGroup(base.torsoShape);
    setInternalCollisionGroup(proximal.shape);
    setInternalCollisionGroup(distal.shape);

    this.proximalBody = proximal.body;
    this.distalBody = distal.body;
    this.bodies = [
      { body: base.foot, mass: base.footMass },
      { body: base.torso, mass: base.torsoMass },
      proximal,
      distal,
    ];
    this.hingeJoint = createLockedPlacementHinge(
      world,
      this.torso,
      this.proximalBody,
      SEGMENT_HALF[1],
    );
    this.weldJoint = createRigidWeld(world, this.proximalBody, this.distalBody);
    this.contactReader = makeAuxContactReader([this.proximalBody, this.distalBody]);
    this.maxNativeHinge = 0;
    this.maxWorldHinge = 0;
    this.maxWeldGap = 0;
    this.maxWeldAlignment = 0;
    this.sync();
  }

  sync() {
    this.base._sync();
    const proximalTilt = sagittalAngleFromRotation(bodyRot(this.proximalBody));
    const distalTilt = sagittalAngleFromRotation(bodyRot(this.distalBody));
    this.maxWorldHinge = Math.max(this.maxWorldHinge, Math.abs(proximalTilt - this.base.torsoTilt));
    this.maxNativeHinge = Math.max(this.maxNativeHinge, Math.abs(b3.b3RevoluteJoint_GetAngle(this.hingeJoint)));
    const anchorA = worldPoint(this.proximalBody, [0, SEGMENT_HALF[1], 0]);
    const anchorB = worldPoint(this.distalBody, [0, -SEGMENT_HALF[1], 0]);
    this.maxWeldGap = Math.max(this.maxWeldGap, distance(anchorA, anchorB));
    this.maxWeldAlignment = Math.max(this.maxWeldAlignment, Math.abs(distalTilt - proximalTilt));
    this.contactReader.sample();
  }

  get torsoTilt() { return this.base.torsoTilt; }
  get torsoAngularVelocity() { return this.base.torsoAngularVelocity; }
  get footCom() { return this.base.footCom; }
  get peakAbsTilt() { return this.base.peakAbsTilt; }
  get fallObserved() { return this.base.fallObserved; }
  postStep() { this.base.postStep(); this.sync(); }
  isRecovered() { return this.base.isRecovered(); }
  auxiliaryContactCount() { return this.contactReader.max(); }
  nativeHingeError() { return this.maxNativeHinge; }
  worldHingeError() { return this.maxWorldHinge; }
  weldAnchorGap() { return this.maxWeldGap; }
  weldAlignmentError() { return this.maxWeldAlignment; }
  destroyAuxReaders() { this.contactReader.destroy(); }
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
            if (
              Math.abs(point.normalImpulse ?? 0) > LOAD_EPS ||
              Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPS
            ) loaded++;
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

function createSpecimen(kind, world) {
  if (kind === 'base') {
    return wrapBase(new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: TORQUE }));
  }
  if (kind === 'one-piece') return new OnePieceE7Probe(world);
  if (kind === 'split-weld') return new RigidSplitProbe(world);
  throw new Error(`unknown E9.0b specimen ${kind}`);
}

function run(kind, direction) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const o = createSpecimen(kind, world);
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
      const beforeSpeed = platformSpeed;
      platformSpeed = moveToward(platformSpeed, target, ACCEL * DT);
      actualAccel = (platformSpeed - beforeSpeed) / DT;
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
  if (!signal.reactive) throw new Error(`E9.0b ${kind} failed to establish primary support`);
  const settled = bodyState(o);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E9.0b ${kind} total mass ${settled.mass} != ${TOTAL_MASS}kg`);
  }
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
    nativeHingeDeg: o.nativeHingeError() * 180 / Math.PI,
    worldHingeDeg: o.worldHingeError() * 180 / Math.PI,
    weldGap: o.weldAnchorGap(),
    weldAlignDeg: o.weldAlignmentError() * 180 / Math.PI,
  };

  support.destroy();
  o.destroyAuxReaders();
  b3.b3DestroyWorld(world);
  return result;
}

function requireRepresentation(specimenName, ref, candidate, direction) {
  if (candidate.outcome !== 'RECOVER') {
    throw new Error(`E9.0b ${specimenName} does not preserve RECOVER dir=${direction}`);
  }
  if (candidate.rampLoss !== 0) {
    throw new Error(`E9.0b ${specimenName} loses primary ramp support dir=${direction}`);
  }
  if (candidate.auxContacts !== 0) {
    throw new Error(`E9.0b ${specimenName} auxiliary contacts=${candidate.auxContacts} dir=${direction}`);
  }
  if (candidate.nativeHingeDeg > MAX_HINGE_LOCK_ERROR * 180 / Math.PI) {
    throw new Error(`E9.0b ${specimenName} native hinge drift=${candidate.nativeHingeDeg}deg dir=${direction}`);
  }
  if (candidate.worldHingeDeg > MAX_HINGE_LOCK_ERROR * 180 / Math.PI) {
    throw new Error(`E9.0b ${specimenName} historical world hinge drift=${candidate.worldHingeDeg}deg dir=${direction}`);
  }
  if (Math.abs(candidate.delivered - ref.delivered) > MAX_IMPULSE_FRACTION_DELTA) {
    throw new Error(`E9.0b ${specimenName} support-impulse mismatch dir=${direction}`);
  }
  if (Math.abs(candidate.vEnd - ref.vEnd) > MAX_SPEED_DELTA) {
    throw new Error(`E9.0b ${specimenName} ramp-end speed mismatch dir=${direction}`);
  }
  if (Math.abs(candidate.peak - ref.peak) > MAX_PEAK_TILT_DELTA) {
    throw new Error(`E9.0b ${specimenName} peak torso-tilt mismatch dir=${direction}`);
  }
}

function requirePairMatch(name, a, c, direction) {
  if (Math.abs(c.delivered - a.delivered) > MAX_IMPULSE_FRACTION_DELTA) {
    throw new Error(`E9.0b ${name} impulse delta exceeds reused representation envelope dir=${direction}`);
  }
  if (Math.abs(c.vEnd - a.vEnd) > MAX_SPEED_DELTA) {
    throw new Error(`E9.0b ${name} speed delta exceeds reused representation envelope dir=${direction}`);
  }
  if (Math.abs(c.peak - a.peak) > MAX_PEAK_TILT_DELTA) {
    throw new Error(`E9.0b ${name} peak-tilt delta exceeds reused representation envelope dir=${direction}`);
  }
}

function requireMirror(name, neg, pos) {
  if (Math.abs(neg.vEnd - pos.vEnd) > MAX_MIRROR_SPEED_GAP) {
    throw new Error(`E9.0b ${name} mirror speed gap=${Math.abs(neg.vEnd - pos.vEnd)}m/s`);
  }
  if (Math.abs(neg.delivered - pos.delivered) > MAX_MIRROR_IMPULSE_GAP) {
    throw new Error(`E9.0b ${name} mirror impulse gap=${Math.abs(neg.delivered - pos.delivered)}`);
  }
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80
) {
  throw new Error('E9.0b expected current E5/Donor-v1 substrate');
}
if (
  typeof b3.b3DefaultWeldJointDef !== 'function' ||
  typeof b3.b3CreateWeldJoint !== 'function' ||
  typeof b3.b3RevoluteJoint_GetAngle !== 'function'
) {
  throw new Error('E9.0b requires qualified weld and native revolute-coordinate bindings');
}
if (Math.abs(splitComFromPivot - BRANCH_LENGTH / 2) > 1e-12) {
  throw new Error('E9.0b rigid split does not preserve E7 branch COM');
}
if (Math.abs(splitIpivot - oneIpivot) > 1e-12) {
  throw new Error('E9.0b rigid split does not preserve E7 branch sagittal pivot inertia');
}

console.log('E9.0b rigid-split inactive representation gate');
console.log('  A base: exact E5 10kg foot <-> spherical ankle <-> 70kg torso');
console.log('  B one-piece: exact E7.0b 10kg foot + 69kg torso + 1kg x 0.9m upward probe');
console.log('  C rigid split: same primary + two contiguous 0.5kg x 0.45m segments, zero-Hz weld, no latent prismatic/spring');
console.log(
  `  analytic B/C match: branchMass=${AUX_MASS.toFixed(3)}kg COM=${splitComFromPivot.toFixed(6)}m ` +
  `I_pivot=${oneIpivot.toFixed(6)}/${splitIpivot.toFixed(6)}kgm2`,
);
console.log(
  `  reused gates: hinge<=${(MAX_HINGE_LOCK_ERROR * 180 / Math.PI).toFixed(3)}deg ` +
  `weldGap<=${MAX_WELD_ANCHOR_GAP}m weldAlign<=${(MAX_WELD_ALIGNMENT_ERROR * 180 / Math.PI).toFixed(3)}deg ` +
  `ΔJ<=${MAX_IMPULSE_FRACTION_DELTA} Δv<=${MAX_SPEED_DELTA}m/s Δpeak<=${MAX_PEAK_TILT_DELTA}deg`,
);

const rows = [];
for (const direction of [-1, 1]) {
  const base = run('base', direction);
  const onePiece = run('one-piece', direction);
  const split = run('split-weld', direction);
  rows.push({ direction, base, onePiece, split });
  const fmt = r => `${r.outcome} J=${r.delivered.toFixed(3)} v=${r.vEnd.toFixed(3)} peak=${r.peak.toFixed(2)} ` +
    `footRel=${r.footRel.toFixed(3)} contacts=${r.auxContacts} hinge(native/world)=${r.nativeHingeDeg.toFixed(4)}/${r.worldHingeDeg.toFixed(4)}deg ` +
    `weld=${r.weldGap.toExponential(2)}m/${r.weldAlignDeg.toFixed(4)}deg loss=${r.rampLoss}`;
  console.log(`  dir=${direction > 0 ? '+' : '-'} base      ${fmt(base)}`);
  console.log(`          one-piece ${fmt(onePiece)}`);
  console.log(`          split     ${fmt(split)}`);
  console.log(
    `          B->C ΔJ=${(split.delivered - onePiece.delivered).toFixed(4)} ` +
    `Δv=${(split.vEnd - onePiece.vEnd).toFixed(4)}m/s Δpeak=${(split.peak - onePiece.peak).toFixed(3)}deg`,
  );
}

for (const { direction, base, onePiece, split } of rows) {
  if (base.outcome !== 'RECOVER') {
    throw new Error(`E9.0b base no longer reproduces E5 RECOVER dir=${direction}`);
  }
  requireRepresentation('one-piece E7 control', base, onePiece, direction);
  requireRepresentation('rigid split', base, split, direction);
  requirePairMatch('rigid split vs one-piece E7', onePiece, split, direction);
  if (split.weldGap > MAX_WELD_ANCHOR_GAP) {
    throw new Error(`E9.0b split weld anchor gap=${split.weldGap}m dir=${direction}`);
  }
  if (split.weldAlignDeg > MAX_WELD_ALIGNMENT_ERROR * 180 / Math.PI) {
    throw new Error(`E9.0b split weld alignment=${split.weldAlignDeg}deg dir=${direction}`);
  }
}

const negative = rows.find(r => r.direction < 0);
const positive = rows.find(r => r.direction > 0);
requireMirror('one-piece E7 control', negative.onePiece, positive.onePiece);
requireMirror('rigid split', negative.split, positive.split);

console.log('E9.0b PASS: the E9.0a-qualified zero-Hz weld allows a two-body split that analytically preserves the E7 probe mass, COM and sagittal pivot inertia to reproduce both the exact E5 base envelope and the qualified one-piece E7.0b control under current31/lead8, with zero auxiliary contacts and both historical/world and native placement-hinge lock metrics inside the unchanged 0.25deg gate. The split weld also remains inside the reused E8 linear and E7/E8 angular integrity envelopes. This qualifies inactive rigid-split representation only. It does not qualify creating/destroying a weld at runtime, a rigid-to-prismatic clutch transition, placement, load transfer or added locomotion agency.');
