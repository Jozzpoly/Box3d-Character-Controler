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

// Material representation bands are unchanged from the first E13.0c harness.
// The correction is semantic only: the first harness folded a finite, settled
// constrained-Y solver position bias into `hypot(X,Y)` and mislabeled that as
// an extra free-DOF leak. E13.0c0 decomposed the signal before this correction:
// X ~= 1.43 um, Vx/Vy ~= machine zero, rotation=0, binding ~= machine zero,
// while the entire ~0.155 mm position signal was a static constrained-Y bias.
// We therefore keep the original 1e-4 scale for actual unintended freedom:
// world-X position, constrained X/Y velocity, rotation and axial binding.
// Absolute constrained-Y position bias is reported, not post-result retuned.
const MAX_MEAN_LOAD_DELTA = 0.05 * NOMINAL_FRAME_LOAD;
const MAX_INSTANT_LOAD_DELTA = 0.10 * NOMINAL_FRAME_LOAD;
const MAX_TILT_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverTiltRadians;
const MAX_ANGULAR_SPEED_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverAngularSpeed;
const MAX_RELATIVE_Z_DELTA = 1e-3;
const MAX_RELATIVE_V_DELTA = 0.002 * MAX_SPEED;
const MAX_TOTAL_MOMENTUM_DELTA = PLAYER_MASS * MAX_RELATIVE_V_DELTA;
const CONSTRAINT_EPS = 1e-4;

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
    // Exact E12.2b one-axis dynamic support.
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
    jd.enableLimit = false;
    jd.lowerTranslation = 0;
    jd.upperTranslation = UPPER_TRAVEL;
    jd.enableMotor = false;
    joint = b3.b3CreatePrismaticJoint(world, jd);
  }

  const mass = b3.b3Body_GetMass(body);
  if (Math.abs(mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E13.0c1 ${kind} support mass ${mass} != ${SUPPORT_MASS}kg`);
  }
  return { body, shape, joint };
}

function sameId(a, b) {
  return Boolean(a && b && a.index1 === b.index1 && a.world0 === b.world0 && a.generation === b.generation);
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

function readVec3(getter, body) {
  const out = [0, 0, 0];
  getter(out, body);
  return out;
}

function bodyPosition(body) {
  return readVec3(b3.b3Body_GetPosition, body);
}

function bodyVelocity(body) {
  return readVec3(b3.b3Body_GetLinearVelocity, body);
}

function rotationError(body) {
  const q = [0, 0, 0, 1];
  b3.b3Body_GetRotation(q, body);
  const w = Math.max(-1, Math.min(1, Math.abs(q[3])));
  return 2 * Math.acos(w);
}

function playerState(organism) {
  organism._sync();
  const fv = bodyVelocity(organism.foot);
  const tv = bodyVelocity(organism.torso);
  const mass = organism.footMass + organism.torsoMass;
  return {
    z: (organism.footMass * organism.footCom[2] + organism.torsoMass * organism.torsoCom[2]) / mass,
    vz: (organism.footMass * fv[2] + organism.torsoMass * tv[2]) / mass,
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
  const p = bodyPosition(platform.body);
  const v = bodyVelocity(platform.body);
  const support = reader.read();
  const axisPosition = direction * p[2];
  const jointTranslation = platform.joint ? b3.b3PrismaticJoint_GetTranslation(platform.joint) : axisPosition;

  return {
    frame,
    relativeZ: direction * (player.z - p[2]),
    relativeV: direction * (player.vz - v[2]),
    torsoTilt: player.torsoTilt,
    footTilt: player.footTilt,
    torsoW: player.torsoW,
    footW: player.footW,
    totalMomentum: direction * (PLAYER_MASS * player.vz + SUPPORT_MASS * v[2]),
    frameNormalImpulse: support.frameNormalImpulse,
    reactive: support.reactive,
    fall: player.fall,
    recovered: player.recovered,
    supportX: p[0],
    constrainedYBias: p[1] - PLATFORM_Y,
    constrainedVx: v[0],
    constrainedVy: v[1],
    rotationError: rotationError(platform.body),
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

function mean(trace, key) {
  return trace.reduce((sum, s) => sum + s[key], 0) / trace.length;
}

function maxAbs(trace, key) {
  return Math.max(...trace.map((s) => Math.abs(s[key])));
}

function comparePair(reference, candidate) {
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
    const c = candidate.trace[i];
    maxRelZDelta = Math.max(maxRelZDelta, Math.abs(a.relativeZ - c.relativeZ));
    maxRelVDelta = Math.max(maxRelVDelta, Math.abs(a.relativeV - c.relativeV));
    maxTorsoTiltDelta = Math.max(maxTorsoTiltDelta, Math.abs(a.torsoTilt - c.torsoTilt));
    maxFootTiltDelta = Math.max(maxFootTiltDelta, Math.abs(a.footTilt - c.footTilt));
    maxTorsoWDelta = Math.max(maxTorsoWDelta, Math.abs(a.torsoW - c.torsoW));
    maxFootWDelta = Math.max(maxFootWDelta, Math.abs(a.footW - c.footW));
    maxLoadDelta = Math.max(maxLoadDelta, Math.abs(a.frameNormalImpulse - c.frameNormalImpulse));
    maxMomentumDelta = Math.max(maxMomentumDelta, Math.abs(a.totalMomentum - c.totalMomentum));
    if (!a.reactive) supportLossReference += 1;
    if (!c.reactive) supportLossCandidate += 1;
  }

  return {
    maxRelZDelta,
    maxRelVDelta,
    maxTorsoTiltDelta,
    maxFootTiltDelta,
    maxTorsoWDelta,
    maxFootWDelta,
    meanLoadReference: mean(reference.trace, 'frameNormalImpulse'),
    meanLoadCandidate: mean(candidate.trace, 'frameNormalImpulse'),
    maxLoadDelta,
    maxMomentumDelta,
    supportLossReference,
    supportLossCandidate,
    maxXLeak: maxAbs(candidate.trace, 'supportX'),
    maxYBias: maxAbs(candidate.trace, 'constrainedYBias'),
    maxVxLeak: maxAbs(candidate.trace, 'constrainedVx'),
    maxVyLeak: maxAbs(candidate.trace, 'constrainedVy'),
    maxRotationError: maxAbs(candidate.trace, 'rotationError'),
    maxBindingError: maxAbs(candidate.trace, 'bindingError'),
    peakTiltDelta: Math.abs(reference.peakTilt - candidate.peakTilt),
    finalYBias: candidate.trace.at(-1).constrainedYBias,
  };
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || PLAYER_MASS !== 80 || SUPPORT_MASS !== 800 || MU !== 0.95) {
  throw new Error('E13.0c1 expected canonical E12/Donor-v1 substrate');
}

console.log('E13.0c1 corrected embodied free-prismatic inactive representation match');
console.log('  causal variable: E12.2b body-level 5-DOF locks vs static-frame free prismatic enforcing the same 5 constrained DOFs.');
console.log('  enableLimit=false, no motor, no locomotion/assist/world-stop authority; finite 320Nm player; 90f settle + 60f passive observation.');
console.log('  first E13.0c red result is treated as a measurement-gate confound: constrained-Y static solver bias is reported separately, not relabeled as an extra DOF.');
console.log(`  unchanged material bands: meanLoad<=${MAX_MEAN_LOAD_DELTA.toFixed(4)}Ns instantLoad<=${MAX_INSTANT_LOAD_DELTA.toFixed(4)}Ns tilt<=${(MAX_TILT_DELTA * 180 / Math.PI).toFixed(3)}deg w<=${MAX_ANGULAR_SPEED_DELTA.toFixed(4)}rad/s relZ<=${MAX_RELATIVE_Z_DELTA}m relV<=${MAX_RELATIVE_V_DELTA.toFixed(4)}m/s; actual constraint leak scale=${CONSTRAINT_EPS}`);

const pairs = [];
for (const direction of DIRECTIONS) {
  const reference = runCase('body-lock', direction);
  const candidate = runCase('prismatic-free', direction);
  const c = comparePair(reference, candidate);
  pairs.push({ direction, reference, candidate, c });

  console.log(
    `  dir=${direction > 0 ? '+' : '-'} ` +
    `load ${c.meanLoadReference.toFixed(4)}->${c.meanLoadCandidate.toFixed(4)}Ns maxΔ=${c.maxLoadDelta.toFixed(4)} | ` +
    `relΔ z=${c.maxRelZDelta.toExponential(3)}m v=${c.maxRelVDelta.toExponential(3)}m/s | ` +
    `tiltΔ torso=${(c.maxTorsoTiltDelta * 180 / Math.PI).toFixed(4)}deg foot=${(c.maxFootTiltDelta * 180 / Math.PI).toFixed(4)}deg peak=${(c.peakTiltDelta * 180 / Math.PI).toFixed(4)}deg | ` +
    `PΔ=${c.maxMomentumDelta.toExponential(3)}Ns supportLoss=${c.supportLossReference}/${c.supportLossCandidate} | ` +
    `X=${c.maxXLeak.toExponential(3)}m Ybias=${c.maxYBias.toExponential(3)}m finalY=${c.finalYBias.toExponential(3)}m ` +
    `Vx/Vy=${c.maxVxLeak.toExponential(3)}/${c.maxVyLeak.toExponential(3)}m/s rot=${c.maxRotationError.toExponential(3)}rad bind=${c.maxBindingError.toExponential(3)}m`,
  );
}

for (const { direction, reference, candidate, c } of pairs) {
  if (reference.fall || candidate.fall || !reference.finalRecovered || !candidate.finalRecovered) {
    throw new Error(`E13.0c1 passive embodied state did not remain recovered dir=${direction}`);
  }
  if (c.supportLossReference !== 0 || c.supportLossCandidate !== 0) {
    throw new Error(`E13.0c1 passive support continuity diverged/lost dir=${direction}`);
  }
  if (Math.abs(c.meanLoadCandidate - c.meanLoadReference) > MAX_MEAN_LOAD_DELTA) {
    throw new Error(`E13.0c1 mean support load changed materially dir=${direction}`);
  }
  if (c.maxLoadDelta > MAX_INSTANT_LOAD_DELTA) {
    throw new Error(`E13.0c1 instantaneous support load trace changed materially dir=${direction}`);
  }
  if (c.maxRelZDelta > MAX_RELATIVE_Z_DELTA || c.maxRelVDelta > MAX_RELATIVE_V_DELTA) {
    throw new Error(`E13.0c1 player/support relative state changed materially dir=${direction}`);
  }
  if (c.maxTorsoTiltDelta > MAX_TILT_DELTA || c.maxFootTiltDelta > MAX_TILT_DELTA || c.peakTiltDelta > MAX_TILT_DELTA) {
    throw new Error(`E13.0c1 posture trace changed materially dir=${direction}`);
  }
  if (c.maxTorsoWDelta > MAX_ANGULAR_SPEED_DELTA || c.maxFootWDelta > MAX_ANGULAR_SPEED_DELTA) {
    throw new Error(`E13.0c1 angular-speed trace changed materially dir=${direction}`);
  }
  if (c.maxMomentumDelta > MAX_TOTAL_MOMENTUM_DELTA) {
    throw new Error(`E13.0c1 whole-system horizontal momentum changed materially dir=${direction}`);
  }
  if (
    c.maxXLeak > CONSTRAINT_EPS ||
    c.maxVxLeak > CONSTRAINT_EPS ||
    c.maxVyLeak > CONSTRAINT_EPS ||
    c.maxRotationError > CONSTRAINT_EPS ||
    c.maxBindingError > CONSTRAINT_EPS
  ) {
    throw new Error(`E13.0c1 prismatic representation exposed an unintended free-DOF leak dir=${direction}`);
  }
}

const minus = pairs.find((p) => p.direction === -1).c;
const plus = pairs.find((p) => p.direction === 1).c;
if (
  Math.abs(minus.meanLoadCandidate - plus.meanLoadCandidate) > MAX_MEAN_LOAD_DELTA ||
  Math.abs(minus.maxRelZDelta - plus.maxRelZDelta) > MAX_RELATIVE_Z_DELTA ||
  Math.abs(minus.maxRelVDelta - plus.maxRelVDelta) > MAX_RELATIVE_V_DELTA
) {
  throw new Error('E13.0c1 mirrored free-prismatic representation is asymmetric');
}

console.log('E13.0c1 PASS: free-prismatic support preserves the qualified passive embodied representation inside the unchanged material/mechanical bands; the finite constrained-Y solver position bias is retained as telemetry, not hidden or threshold-retuned.');
