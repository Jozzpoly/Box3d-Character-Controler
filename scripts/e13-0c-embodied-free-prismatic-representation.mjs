import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const MAX_SPEED = DONOR_PROFILE_V1.maxSpeed;
const SUPPORT_MASS = 800;
const FINITE_TORQUE = 320;
const MU = 0.95;
const SETTLE_FRAMES = 90;
const OBSERVE_FRAMES = 60;
const LOAD_EPS = 1e-6;
const SUPPORT_HALF = [2, 0.25, 30];
const PLATFORM_Y = -SUPPORT_HALF[1];
const UPPER_TRAVEL = 2 * SUPPORT_HALF[2];
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const Y_POS_90 = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const DIRECTIONS = [-1, 1];
const NOMINAL_FRAME_LOAD = PLAYER_MASS * G * DT;

// E13.0c is an inactive representation gate, not a locomotion tuning test.
// The bands are declared before the result and reuse already-paid-for scales:
// - E9 representation work used a 5% impulse-fraction tolerance;
// - posture/angular tolerances are 10% of the qualified E3 recovery envelope;
// - E13.0b already qualified 1e-4 m as the off-axis/binding consistency scale.
const MAX_MEAN_LOAD_DELTA = 0.05 * NOMINAL_FRAME_LOAD;
const MAX_INSTANT_LOAD_DELTA = 0.10 * NOMINAL_FRAME_LOAD;
const MAX_TILT_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverTiltRadians;
const MAX_ANGULAR_SPEED_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverAngularSpeed;
const MAX_RELATIVE_Z_DELTA = 1e-3;
const MAX_RELATIVE_V_DELTA = 0.002 * MAX_SPEED;
const MAX_TOTAL_MOMENTUM_DELTA = PLAYER_MASS * MAX_RELATIVE_V_DELTA;
const OFF_AXIS_EPS = 1e-4;

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function axisQuaternion(direction) {
  return direction > 0 ? Y_NEG_90 : Y_POS_90;
}

function makeStaticFrame(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_staticBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
  return b3.b3CreateBody(world, bd);
}

function makeSupport(world, kind, direction) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;

  if (kind === 'body-lock') {
    // Exact E12.2b one-axis dynamic-support representation.
    bd.motionLocks.linearX = true;
    bd.motionLocks.linearY = true;
    bd.motionLocks.angularX = true;
    bd.motionLocks.angularY = true;
    bd.motionLocks.angularZ = true;
  }

  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(SUPPORT_MASS, SUPPORT_HALF);
  sd.baseMaterial.friction = MU;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...SUPPORT_HALF);

  let joint = null;
  if (kind === 'prismatic-free') {
    const frame = makeStaticFrame(world);
    const q = axisQuaternion(direction);
    const jd = b3.b3DefaultPrismaticJointDef();
    jd.base.bodyIdA = frame;
    jd.base.bodyIdB = body;
    jd.base.localFrameA = { position: [0, 0, 0], quaternion: q };
    jd.base.localFrameB = { position: [0, 0, 0], quaternion: q };
    // Same declared geometry as corrected E13.0b, but the unilateral stop is
    // causally absent here. This gate asks only whether the free prismatic
    // topology faithfully replaces the qualified body-lock topology.
    jd.enableLimit = false;
    jd.lowerTranslation = 0;
    jd.upperTranslation = UPPER_TRAVEL;
    jd.enableMotor = false;
    joint = b3.b3CreatePrismaticJoint(world, jd);
  }

  const mass = b3.b3Body_GetMass(body);
  if (Math.abs(mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E13.0c ${kind} support mass ${mass} != ${SUPPORT_MASS}kg`);
  }
  return { body, shape, joint };
}

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function createSupportReader(organism, platformShape) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    let totalNormalImpulse = 0;
    let matchedPlatform = false;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      const footIsA = sameId(contact.shapeIdA, organism.footShape);
      const footIsB = sameId(contact.shapeIdB, organism.footShape);
      if (!footIsA && !footIsB) continue;
      const otherShape = footIsA ? contact.shapeIdB : contact.shapeIdA;
      if (!sameId(otherShape, platformShape)) continue;
      matchedPlatform = true;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          totalNormalImpulse += totalJn;
          if (finalJn > LOAD_EPS || totalJn > LOAD_EPS) loaded += 1;
        }
      }
    }

    return {
      reactive: matchedPlatform && (touching > 0 || loaded > 0),
      frameNormalImpulse: 0.5 * totalNormalImpulse,
    };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function bodyPosition(body) {
  const p = [0, 0, 0];
  b3.b3Body_GetPosition(p, body);
  return p;
}

function bodyVelocity(body) {
  const v = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(v, body);
  return v;
}

function bodyRotation(body) {
  const q = [0, 0, 0, 1];
  b3.b3Body_GetRotation(q, body);
  return q;
}

function rotationErrorFromIdentity(q) {
  const w = Math.max(-1, Math.min(1, Math.abs(q[3])));
  return 2 * Math.acos(w);
}

function playerState(organism) {
  organism._sync();
  const footV = bodyVelocity(organism.foot);
  const torsoV = bodyVelocity(organism.torso);
  const mass = organism.footMass + organism.torsoMass;
  return {
    z: (organism.footMass * organism.footCom[2] + organism.torsoMass * organism.torsoCom[2]) / mass,
    vz: (organism.footMass * footV[2] + organism.torsoMass * torsoV[2]) / mass,
    torsoTilt: organism.torsoTilt,
    footTilt: organism.footTilt,
    torsoW: organism.torsoAngularVelocity[0],
    footW: organism.footAngularVelocity[0],
    fall: organism.fallObserved,
    recovered: organism.isRecovered(),
  };
}

function snapshot(organism, platform, reader, direction, frame) {
  const player = playerState(organism);
  const supportP = bodyPosition(platform.body);
  const supportV = bodyVelocity(platform.body);
  const supportQ = bodyRotation(platform.body);
  const support = reader.read();
  const axisPosition = direction * supportP[2];
  const axisVelocity = direction * supportV[2];
  const jointTranslation = platform.joint
    ? b3.b3PrismaticJoint_GetTranslation(platform.joint)
    : axisPosition;

  return {
    frame,
    playerZ: direction * player.z,
    playerV: direction * player.vz,
    supportZ: axisPosition,
    supportV: axisVelocity,
    relativeZ: direction * (player.z - supportP[2]),
    relativeV: direction * (player.vz - supportV[2]),
    torsoTilt: player.torsoTilt,
    footTilt: player.footTilt,
    torsoW: player.torsoW,
    footW: player.footW,
    totalMomentum: direction * (PLAYER_MASS * player.vz + SUPPORT_MASS * supportV[2]),
    frameNormalImpulse: support.frameNormalImpulse,
    reactive: support.reactive,
    fall: player.fall,
    recovered: player.recovered,
    offAxisPosition: Math.hypot(supportP[0], supportP[1] - PLATFORM_Y),
    offAxisVelocity: Math.hypot(supportV[0], supportV[1]),
    rotationError: rotationErrorFromIdentity(supportQ),
    jointTranslation,
    bindingError: Math.abs(jointTranslation - axisPosition),
  };
}

function runCase(kind, direction) {
  const world = makeWorld();
  const platform = makeSupport(world, kind, direction);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: MU,
  });
  const reader = createSupportReader(organism, platform.shape);

  for (let i = 0; i < SETTLE_FRAMES; i++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
  }

  const trace = [snapshot(organism, platform, reader, direction, 0)];
  for (let frame = 1; frame <= OBSERVE_FRAMES; frame++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    trace.push(snapshot(organism, platform, reader, direction, frame));
  }

  const result = {
    kind,
    direction,
    trace,
    peakTilt: organism.peakAbsTilt,
    finalRecovered: organism.isRecovered(),
    fall: organism.fallObserved,
  };
  reader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

function maxOf(trace, key) {
  return Math.max(...trace.map((s) => Math.abs(s[key])));
}

function meanOf(trace, key) {
  return trace.reduce((sum, s) => sum + s[key], 0) / trace.length;
}

function comparePair(reference, candidate) {
  if (reference.trace.length !== candidate.trace.length) {
    throw new Error('E13.0c trace length mismatch');
  }

  let maxRelZDelta = 0;
  let maxRelVDelta = 0;
  let maxTorsoTiltDelta = 0;
  let maxFootTiltDelta = 0;
  let maxTorsoWDelta = 0;
  let maxFootWDelta = 0;
  let maxLoadDelta = 0;
  let maxMomentumDelta = 0;
  let supportLossReference = 0;
  let supportLossCandidate = 0;

  for (let i = 0; i < reference.trace.length; i++) {
    const a = reference.trace[i];
    const b = candidate.trace[i];
    maxRelZDelta = Math.max(maxRelZDelta, Math.abs(a.relativeZ - b.relativeZ));
    maxRelVDelta = Math.max(maxRelVDelta, Math.abs(a.relativeV - b.relativeV));
    maxTorsoTiltDelta = Math.max(maxTorsoTiltDelta, Math.abs(a.torsoTilt - b.torsoTilt));
    maxFootTiltDelta = Math.max(maxFootTiltDelta, Math.abs(a.footTilt - b.footTilt));
    maxTorsoWDelta = Math.max(maxTorsoWDelta, Math.abs(a.torsoW - b.torsoW));
    maxFootWDelta = Math.max(maxFootWDelta, Math.abs(a.footW - b.footW));
    maxLoadDelta = Math.max(maxLoadDelta, Math.abs(a.frameNormalImpulse - b.frameNormalImpulse));
    maxMomentumDelta = Math.max(maxMomentumDelta, Math.abs(a.totalMomentum - b.totalMomentum));
    if (!a.reactive) supportLossReference += 1;
    if (!b.reactive) supportLossCandidate += 1;
  }

  return {
    maxRelZDelta,
    maxRelVDelta,
    maxTorsoTiltDelta,
    maxFootTiltDelta,
    maxTorsoWDelta,
    maxFootWDelta,
    meanLoadReference: meanOf(reference.trace, 'frameNormalImpulse'),
    meanLoadCandidate: meanOf(candidate.trace, 'frameNormalImpulse'),
    maxLoadDelta,
    maxMomentumDelta,
    supportLossReference,
    supportLossCandidate,
    candidateMaxOffAxisPosition: maxOf(candidate.trace, 'offAxisPosition'),
    candidateMaxOffAxisVelocity: maxOf(candidate.trace, 'offAxisVelocity'),
    candidateMaxRotationError: maxOf(candidate.trace, 'rotationError'),
    candidateMaxBindingError: maxOf(candidate.trace, 'bindingError'),
    peakTiltDelta: Math.abs(reference.peakTilt - candidate.peakTilt),
  };
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 ||
  PLAYER_MASS !== 80 || SUPPORT_MASS !== 800 || MU !== 0.95
) {
  throw new Error('E13.0c expected canonical E12/Donor-v1 substrate');
}

console.log('E13.0c embodied free-prismatic inactive representation match');
console.log('  reference=E12.2b 800kg one-axis body-lock support');
console.log('  candidate=same support constrained by static-frame prismatic joint, enableLimit=false; no body motion locks');
console.log(`  finite posture=${FINITE_TORQUE}Nm; mu=${MU}; settle=${SETTLE_FRAMES}f; observe=${OBSERVE_FRAMES}f; zero locomotion/assist/world-stop authority`);
console.log(`  predeclared bands: meanLoad<=${MAX_MEAN_LOAD_DELTA.toFixed(4)}Ns; instantLoad<=${MAX_INSTANT_LOAD_DELTA.toFixed(4)}Ns; tilt<=${(MAX_TILT_DELTA * 180 / Math.PI).toFixed(3)}deg; w<=${MAX_ANGULAR_SPEED_DELTA.toFixed(4)}rad/s; relZ<=${MAX_RELATIVE_Z_DELTA}m; relV<=${MAX_RELATIVE_V_DELTA.toFixed(4)}m/s`);

const pairs = [];
for (const direction of DIRECTIONS) {
  const reference = runCase('body-lock', direction);
  const candidate = runCase('prismatic-free', direction);
  const comparison = comparePair(reference, candidate);
  pairs.push({ direction, reference, candidate, comparison });

  console.log(
    `  dir=${direction > 0 ? '+' : '-'} ` +
    `load mean ${comparison.meanLoadReference.toFixed(4)}->${comparison.meanLoadCandidate.toFixed(4)}Ns ` +
    `maxΔ=${comparison.maxLoadDelta.toFixed(4)}Ns | ` +
    `rel maxΔ z=${comparison.maxRelZDelta.toExponential(3)}m v=${comparison.maxRelVDelta.toExponential(3)}m/s | ` +
    `tilt maxΔ torso=${(comparison.maxTorsoTiltDelta * 180 / Math.PI).toFixed(4)}deg foot=${(comparison.maxFootTiltDelta * 180 / Math.PI).toFixed(4)}deg ` +
    `peakΔ=${(comparison.peakTiltDelta * 180 / Math.PI).toFixed(4)}deg | ` +
    `PmaxΔ=${comparison.maxMomentumDelta.toExponential(3)}Ns ` +
    `offAxis=${comparison.candidateMaxOffAxisPosition.toExponential(3)}m/${comparison.candidateMaxRotationError.toExponential(3)}rad ` +
    `binding=${comparison.candidateMaxBindingError.toExponential(3)}m ` +
    `supportLoss=${comparison.supportLossReference}/${comparison.supportLossCandidate}`,
  );
}

for (const { direction, reference, candidate, comparison: c } of pairs) {
  if (reference.fall || candidate.fall || !reference.finalRecovered || !candidate.finalRecovered) {
    throw new Error(`E13.0c passive embodied state did not remain recovered dir=${direction}`);
  }
  if (c.supportLossReference !== 0 || c.supportLossCandidate !== 0) {
    throw new Error(`E13.0c passive support continuity diverged/lost dir=${direction}`);
  }
  if (Math.abs(c.meanLoadCandidate - c.meanLoadReference) > MAX_MEAN_LOAD_DELTA) {
    throw new Error(`E13.0c mean support load changed materially dir=${direction}`);
  }
  if (c.maxLoadDelta > MAX_INSTANT_LOAD_DELTA) {
    throw new Error(`E13.0c instantaneous support load trace changed materially dir=${direction}`);
  }
  if (c.maxRelZDelta > MAX_RELATIVE_Z_DELTA || c.maxRelVDelta > MAX_RELATIVE_V_DELTA) {
    throw new Error(`E13.0c player/support relative state changed materially dir=${direction}`);
  }
  if (
    c.maxTorsoTiltDelta > MAX_TILT_DELTA ||
    c.maxFootTiltDelta > MAX_TILT_DELTA ||
    c.peakTiltDelta > MAX_TILT_DELTA
  ) {
    throw new Error(`E13.0c posture trace changed materially dir=${direction}`);
  }
  if (c.maxTorsoWDelta > MAX_ANGULAR_SPEED_DELTA || c.maxFootWDelta > MAX_ANGULAR_SPEED_DELTA) {
    throw new Error(`E13.0c angular-speed trace changed materially dir=${direction}`);
  }
  if (c.maxMomentumDelta > MAX_TOTAL_MOMENTUM_DELTA) {
    throw new Error(`E13.0c whole-system horizontal momentum changed materially dir=${direction}`);
  }
  if (
    c.candidateMaxOffAxisPosition > OFF_AXIS_EPS ||
    c.candidateMaxOffAxisVelocity > OFF_AXIS_EPS ||
    c.candidateMaxRotationError > OFF_AXIS_EPS ||
    c.candidateMaxBindingError > OFF_AXIS_EPS
  ) {
    throw new Error(`E13.0c prismatic representation leaked outside intended one-axis support dir=${direction}`);
  }
}

const minus = pairs.find((p) => p.direction === -1).comparison;
const plus = pairs.find((p) => p.direction === 1).comparison;
if (
  Math.abs(minus.meanLoadCandidate - plus.meanLoadCandidate) > MAX_MEAN_LOAD_DELTA ||
  Math.abs(minus.maxRelZDelta - plus.maxRelZDelta) > MAX_RELATIVE_Z_DELTA ||
  Math.abs(minus.maxRelVDelta - plus.maxRelVDelta) > MAX_RELATIVE_V_DELTA
) {
  throw new Error('E13.0c mirrored free-prismatic representation is asymmetric');
}

console.log('E13.0c PASS: free prismatic support preserves the qualified passive embodied representation within predeclared bands.');
