import Box3D from 'box3d.js/inline';
import {
  SagittalBalanceOrganism,
  E3_SAGITTAL_DEFAULTS,
  sagittalAngleFromRotation,
} from '../src/e3-balance-organism.js';
import {
  DONOR_PROFILE_V1,
  DONOR_QUALIFIED_ENVELOPE_V1,
} from '../src/donor/profile.js';

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

// E8.1a is a representation gate, not a leg-performance experiment.
// Start from the already-qualified E7.0b 1 kg x 0.9 m uniform probe and split it
// into two contiguous 0.5 kg x 0.45 m segments at identical density/cross-section.
// When the axial latch is exact-locked, this split preserves the E7 branch mass,
// COM and sagittal inertia about the torso pivot analytically. The intended new
// variable is therefore the constraint topology itself:
//
// torso -- locked revolute --> proximal guide
// proximal guide -- exact-locked prismatic --> distal segment
// proximal guide -- compression-only distance spring --> distal segment
//
// No auxiliary actuation, latch release, ground acquisition or world-external
// authority is enabled here. Representation must match before actuation.
const AUX_MASS = 1.0;
const SEGMENT_MASS = AUX_MASS / 2;
const SEGMENT_LENGTH = 0.45;
const BRANCH_LENGTH = 2 * SEGMENT_LENGTH;
const SEGMENT_HALF = [0.06, SEGMENT_LENGTH / 2, 0.06];
const CANDIDATE_TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - AUX_MASS;
const AUX_FRICTION = E3_SAGITTAL_DEFAULTS.footFriction;

const AXIAL_LOCK = SEGMENT_LENGTH;
const AXIAL_MIN = 0.15;
const AXIAL_MAX = SEGMENT_LENGTH;
const SPRING_REST = SEGMENT_LENGTH;
const SPRING_HZ = 8;
const SPRING_DAMPING = 1;
const SPRING_TENSION = 0;
const SPRING_COMPRESSION = 200;

const MAX_HINGE_LOCK_ERROR = 0.25 * Math.PI / 180;
const MAX_PRISMATIC_LOCK_ERROR = 0.005; // Reuse E8.0c exact-lock envelope.
const MAX_SEGMENT_ALIGNMENT_ERROR = 0.25 * Math.PI / 180;
const MAX_SETTLED_SPRING_PRELOAD = 0.5; // Reuse E8.0c stow-lock preload envelope.

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(v, target, d) {
  return Math.abs(target - v) <= d ? target : v + Math.sign(target - v) * d;
}
function densityForMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function bodyCom(body) { const p = [0, 0, 0]; b3.b3Body_GetWorldCenterOfMass(p, body); return p; }
function bodyVel(body) { const v = [0, 0, 0]; b3.b3Body_GetLinearVelocity(v, body); return v; }
function bodyRot(body) { const q = [0, 0, 0, 1]; b3.b3Body_GetRotation(q, body); return q; }
function magnitude(v) { return Math.hypot(v[0], v[1], v[2]); }

function boxSagittalInertia(mass, fullY, fullZ) {
  return mass * (fullY * fullY + fullZ * fullZ) / 12;
}

const crossZ = 2 * SEGMENT_HALF[2];
const originalIcm = boxSagittalInertia(AUX_MASS, BRANCH_LENGTH, crossZ);
const originalIpivot = originalIcm + AUX_MASS * (BRANCH_LENGTH / 2) ** 2;
const segmentIcm = boxSagittalInertia(SEGMENT_MASS, SEGMENT_LENGTH, crossZ);
const splitIpivot =
  segmentIcm + SEGMENT_MASS * (SEGMENT_LENGTH / 2) ** 2 +
  segmentIcm + SEGMENT_MASS * (SEGMENT_LENGTH * 1.5) ** 2;
const splitComFromPivot = (
  SEGMENT_MASS * (SEGMENT_LENGTH / 2) +
  SEGMENT_MASS * (SEGMENT_LENGTH * 1.5)
) / AUX_MASS;

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
  b3.b3CreateBoxShape(body, sd, ...SEGMENT_HALF);
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
    get torsoAngularVelocity() { return base.torsoAngularVelocity; },
    get footCom() { return base.footCom; },
    get peakAbsTilt() { return base.peakAbsTilt; },
    get fallObserved() { return base.fallObserved; },
    sync() { base._sync(); },
    postStep() { base.postStep(); },
    isRecovered() { return base.isRecovered(); },
    auxiliaryContactCount() { return 0; },
    hingeLockError() { return 0; },
    prismaticLockError() { return 0; },
    segmentAlignmentError() { return 0; },
    springForce() { return 0; },
    settledSpringPreload() { return 0; },
    destroyAuxReaders() {},
  };
}

class InactiveTelescopicSupport {
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

    if (
      typeof b3.b3DefaultRevoluteJointDef !== 'function' ||
      typeof b3.b3CreateRevoluteJoint !== 'function' ||
      typeof b3.b3DefaultPrismaticJointDef !== 'function' ||
      typeof b3.b3CreatePrismaticJoint !== 'function' ||
      typeof b3.b3DefaultDistanceJointDef !== 'function' ||
      typeof b3.b3CreateDistanceJoint !== 'function'
    ) {
      throw new Error('E8.1a requires revolute, prismatic and distance-joint bindings');
    }

    // Same upward 0.9 m branch placement as the qualified E7.0b representation.
    const pivot = base.startTorsoPosition;
    const proximal = makeSegment(world, [pivot[0], pivot[1] + SEGMENT_LENGTH / 2, pivot[2]]);
    const distal = makeSegment(world, [pivot[0], pivot[1] + SEGMENT_LENGTH * 1.5, pivot[2]]);
    this.proximalBody = proximal.body;
    this.distalBody = distal.body;
    this.bodies = [
      { body: base.foot, mass: base.footMass },
      { body: base.torso, mass: base.torsoMass },
      proximal,
      distal,
    ];

    // Placement DOF: exactly locked for the representation gate. This preserves
    // the original E7 torso-COM hinge path without enabling any new motion.
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

    // Telescopic guide: exact-locked at the contiguous-segment spacing. Spring and
    // motor are intentionally disabled on the prismatic joint itself.
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

    // Future load-sharing channel is already present in the inactive specimen.
    // It must remain effectively unpreloaded while the latch is at rest.
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
    b3.b3DistanceJoint_SetSpringForceRange(
      this.springJoint,
      SPRING_TENSION,
      SPRING_COMPRESSION,
    );

    this.proximalContacts = b3.createContactsBuffer();
    this.distalContacts = b3.createContactsBuffer();
    this.maxAuxContacts = 0;
    this.maxHingeError = 0;
    this.maxPrismaticError = 0;
    this.maxAlignmentError = 0;
    this.maxSpringMagnitude = 0;
    this.staticSpringMagnitude = Infinity;
    this.sync();
  }

  sync() {
    this.base._sync();
    const torsoTilt = this.base.torsoTilt;
    const proximalTilt = sagittalAngleFromRotation(bodyRot(this.proximalBody));
    const distalTilt = sagittalAngleFromRotation(bodyRot(this.distalBody));
    const translation = b3.b3PrismaticJoint_GetTranslation(this.guideJoint);
    const springForce = [0, 0, 0];
    b3.b3Joint_GetConstraintForce(springForce, this.springJoint);

    this.maxHingeError = Math.max(this.maxHingeError, Math.abs(proximalTilt - torsoTilt));
    this.maxPrismaticError = Math.max(this.maxPrismaticError, Math.abs(translation - AXIAL_LOCK));
    this.maxAlignmentError = Math.max(this.maxAlignmentError, Math.abs(distalTilt - proximalTilt));
    this.maxSpringMagnitude = Math.max(this.maxSpringMagnitude, magnitude(springForce));

    b3.getBodyContactData(this.proximalContacts, this.proximalBody);
    b3.getBodyContactData(this.distalContacts, this.distalBody);
    const contacts = b3.getNumContacts(this.proximalContacts) + b3.getNumContacts(this.distalContacts);
    this.maxAuxContacts = Math.max(this.maxAuxContacts, contacts);
  }

  captureSettledSpringPreload() {
    const springForce = [0, 0, 0];
    b3.b3Joint_GetConstraintForce(springForce, this.springJoint);
    this.staticSpringMagnitude = magnitude(springForce);
  }

  get torsoTilt() { return this.base.torsoTilt; }
  get torsoAngularVelocity() { return this.base.torsoAngularVelocity; }
  get footCom() { return this.base.footCom; }
  get peakAbsTilt() { return this.base.peakAbsTilt; }
  get fallObserved() { return this.base.fallObserved; }

  postStep() {
    this.base.postStep();
    this.sync();
  }

  isRecovered() { return this.base.isRecovered(); }
  auxiliaryContactCount() { return this.maxAuxContacts; }
  hingeLockError() { return this.maxHingeError; }
  prismaticLockError() { return this.maxPrismaticError; }
  segmentAlignmentError() { return this.maxAlignmentError; }
  springForce() { return this.maxSpringMagnitude; }
  settledSpringPreload() { return this.staticSpringMagnitude; }
  destroyAuxReaders() {
    b3.destroyContactsBuffer(this.proximalContacts);
    b3.destroyContactsBuffer(this.distalContacts);
  }
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

function run(kind, direction) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const o = kind === 'reference'
    ? wrapBase(new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: TORQUE }))
    : new InactiveTelescopicSupport(world);
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
  if (!signal.reactive) throw new Error(`E8.1a ${kind} failed to establish primary support`);
  const settled = bodyState(o);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E8.1a ${kind} total mass ${settled.mass} != 80kg`);
  }
  o.sync();
  o.captureSettledSpringPreload?.();
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
    hingeLockErrorDeg: o.hingeLockError() * 180 / Math.PI,
    prismaticLockError: o.prismaticLockError(),
    alignmentErrorDeg: o.segmentAlignmentError() * 180 / Math.PI,
    settledSpringPreload: o.settledSpringPreload(),
    maxSpringForce: o.springForce(),
  };

  support.destroy();
  o.destroyAuxReaders();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80
) {
  throw new Error('E8.1a expected current E5/Donor-v1 substrate');
}

if (Math.abs(splitComFromPivot - BRANCH_LENGTH / 2) > 1e-12) {
  throw new Error('E8.1a split branch does not preserve E7 probe COM');
}
if (Math.abs(splitIpivot - originalIpivot) > 1e-12) {
  throw new Error('E8.1a split branch does not preserve E7 probe sagittal pivot inertia');
}

console.log('E8.1a inactive telescopic parallel-support representation gate');
console.log('  reference: exact E5 10kg foot <-> spherical ankle <-> 70kg torso');
console.log(
  '  candidate: exact primary ankle + 10kg foot + 69kg torso + ' +
  'two contiguous 0.5kg x 0.45m auxiliary segments',
);
console.log(
  `  analytic E7-match: branchMass=${AUX_MASS.toFixed(3)}kg ` +
  `COM=${splitComFromPivot.toFixed(6)}m from torso pivot ` +
  `I_pivot original/split=${originalIpivot.toFixed(6)}/${splitIpivot.toFixed(6)}kgm2`,
);
console.log(
  `  inactive topology: hinge=0deg locked; prismatic=${AXIAL_LOCK.toFixed(3)}m locked; ` +
  `distance spring rest=${SPRING_REST.toFixed(3)}m forceRange=[${SPRING_TENSION},${SPRING_COMPRESSION}]N; ` +
  'no motors, no latch release, no auxiliary actuation',
);

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
    `auxContacts=${candidate.auxContacts} hingeErr=${candidate.hingeLockErrorDeg.toFixed(4)}deg ` +
    `axialErr=${candidate.prismaticLockError.toExponential(2)}m ` +
    `alignErr=${candidate.alignmentErrorDeg.toFixed(4)}deg ` +
    `spring settled/max=${candidate.settledSpringPreload.toFixed(3)}/${candidate.maxSpringForce.toFixed(3)}N ` +
    `rampLoss ${ref.rampLoss}→${candidate.rampLoss}`,
  );
}

for (const { direction, ref, candidate } of rows) {
  if (ref.outcome !== 'RECOVER') {
    throw new Error(`E8.1a reference no longer reproduces E5 RECOVER dir=${direction}`);
  }
  if (candidate.outcome !== 'RECOVER') {
    throw new Error(`E8.1a inactive telescopic branch does not preserve RECOVER dir=${direction}`);
  }
  if (candidate.rampLoss !== 0) {
    throw new Error(`E8.1a inactive telescopic branch loses primary ramp support dir=${direction}`);
  }
  if (candidate.auxContacts !== 0) {
    throw new Error(`E8.1a auxiliary branch contacted another body dir=${direction}: ${candidate.auxContacts}`);
  }
  if (candidate.hingeLockErrorDeg > MAX_HINGE_LOCK_ERROR * 180 / Math.PI) {
    throw new Error(`E8.1a placement hinge lock drift dir=${direction}: ${candidate.hingeLockErrorDeg}deg`);
  }
  if (candidate.prismaticLockError > MAX_PRISMATIC_LOCK_ERROR) {
    throw new Error(`E8.1a axial latch drift dir=${direction}: ${candidate.prismaticLockError}m`);
  }
  if (candidate.alignmentErrorDeg > MAX_SEGMENT_ALIGNMENT_ERROR * 180 / Math.PI) {
    throw new Error(`E8.1a telescopic segment angular misalignment dir=${direction}: ${candidate.alignmentErrorDeg}deg`);
  }
  if (candidate.settledSpringPreload > MAX_SETTLED_SPRING_PRELOAD) {
    throw new Error(`E8.1a unilateral spring materially preloaded in settled inactive state dir=${direction}`);
  }
  if (Math.abs(candidate.delivered - ref.delivered) > 0.05) {
    throw new Error(`E8.1a support impulse mismatch dir=${direction}`);
  }
  if (Math.abs(candidate.vEnd - ref.vEnd) > 0.25) {
    throw new Error(`E8.1a ramp-end speed mismatch dir=${direction}`);
  }
  if (Math.abs(candidate.peak - ref.peak) > 4) {
    throw new Error(`E8.1a peak-tilt mismatch dir=${direction}`);
  }
}

if (
  Math.abs(rows[0].candidate.vEnd - rows[1].candidate.vEnd) > 0.15 ||
  Math.abs(rows[0].candidate.delivered - rows[1].candidate.delivered) > 0.035
) {
  throw new Error('E8.1a inactive telescopic parallel support is not sufficiently mirrored');
}

console.log(
  'E8.1a PASS: the E7-qualified 1kg x 0.9m parallel branch can be split into a mass/COM/inertia-matched two-segment telescopic topology containing the E8 compression-only distance spring while exact-locked and contact-inactive, without perturbing the current31/lead8 organism outside the declared E7 representation envelope. This qualifies inactive embodied representation only; it does not qualify latch release, support placement, ground acquisition, load sharing or locomotion.',
);
