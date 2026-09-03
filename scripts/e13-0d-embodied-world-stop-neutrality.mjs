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

// Paid-for boundaries only; none are selected from this experiment's result.
const MAX_FIRST_FRAME_DIFFERENTIAL_IMPULSE = 0.03 * PLAYER_MASS * G * DT; // E10.0b: 0.8 Ns
const MAX_MEAN_LOAD_DELTA = 0.05 * NOMINAL_FRAME_LOAD; // E13.0c1
const MAX_INSTANT_LOAD_DELTA = 0.10 * NOMINAL_FRAME_LOAD; // E13.0c1
const MAX_TILT_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverTiltRadians; // E13.0c1
const MAX_ANGULAR_SPEED_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverAngularSpeed; // E13.0c1
const MAX_RELATIVE_Z_DELTA = 1e-3; // E13.0c1
const MAX_RELATIVE_V_DELTA = 0.002 * MAX_SPEED; // E13.0c1
const MAX_SUPPORT_Z_DELTA = MAX_RELATIVE_Z_DELTA;
const MAX_SUPPORT_V_DELTA = MAX_RELATIVE_V_DELTA;
const MAX_DIFFERENTIAL_WORLD_IMPULSE = MAX_FIRST_FRAME_DIFFERENTIAL_IMPULSE;
const CONSTRAINT_EPS = 1e-4; // E13.0b/c1
const PREMATCH_EPS = 1e-9;
const IMMEDIATE_EPS = 1e-12;

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function axisQuaternion(direction) {
  // Mirrored E13.0b convention: local +X is allowed world direction;
  // negative local translation is the future recoil / lower-limit side.
  return direction > 0 ? Y_NEG_90 : Y_POS_90;
}

function makeStaticFrame(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_staticBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
  return b3.b3CreateBody(world, bd);
}

function makeRig(direction) {
  const world = makeWorld();

  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  const support = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(SUPPORT_MASS, SUPPORT_HALF);
  sd.baseMaterial.friction = MU;
  sd.baseMaterial.restitution = 0;
  const supportShape = b3.b3CreateBoxShape(support, sd, ...SUPPORT_HALF);

  const frame = makeStaticFrame(world);
  const q = axisQuaternion(direction);
  const jd = b3.b3DefaultPrismaticJointDef();
  jd.base.bodyIdA = frame;
  jd.base.bodyIdB = support;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: q };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: q };
  jd.enableLimit = false;
  jd.lowerTranslation = 0;
  jd.upperTranslation = UPPER_TRAVEL;
  jd.enableMotor = false;
  const joint = b3.b3CreatePrismaticJoint(world, jd);

  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: MU,
  });

  const mass = b3.b3Body_GetMass(support);
  if (Math.abs(mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E13.0d support mass ${mass} != ${SUPPORT_MASS}kg`);
  }

  return { world, support, supportShape, joint, organism };
}

function sameId(a, b) {
  return Boolean(a && b && a.index1 === b.index1 && a.world0 === b.world0 && a.generation === b.generation);
}

function createSupportReader(organism, supportShape) {
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
      if (!sameId(otherShape, supportShape)) continue;
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

function vec3(getter, body) {
  const out = [0, 0, 0];
  getter(out, body);
  return out;
}

function bodyPosition(body) {
  return vec3(b3.b3Body_GetPosition, body);
}

function bodyVelocity(body) {
  return vec3(b3.b3Body_GetLinearVelocity, body);
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

function snapshot(rig, reader, direction, frame, t0) {
  const player = playerState(rig.organism);
  const p = bodyPosition(rig.support);
  const v = bodyVelocity(rig.support);
  const support = reader.read();
  const axisPosition = direction * p[2];
  const axisVelocity = direction * v[2];
  const translation = b3.b3PrismaticJoint_GetTranslation(rig.joint);
  return {
    frame,
    translation,
    limitOffset: translation - t0,
    supportZ: axisPosition,
    supportV: axisVelocity,
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
    rotationError: rotationError(rig.support),
    bindingError: Math.abs(translation - axisPosition),
  };
}

function stepRig(rig) {
  rig.organism.preStep(DT);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
}

function scalarStateDistance(a, c) {
  return Math.max(
    Math.abs(a.translation - c.translation),
    Math.abs(a.supportZ - c.supportZ),
    Math.abs(a.supportV - c.supportV),
    Math.abs(a.relativeZ - c.relativeZ),
    Math.abs(a.relativeV - c.relativeV),
    Math.abs(a.torsoTilt - c.torsoTilt),
    Math.abs(a.footTilt - c.footTilt),
    Math.abs(a.torsoW - c.torsoW),
    Math.abs(a.footW - c.footW),
    Math.abs(a.totalMomentum - c.totalMomentum),
    Math.abs(a.frameNormalImpulse - c.frameNormalImpulse),
    Math.abs(a.supportX - c.supportX),
    Math.abs(a.constrainedYBias - c.constrainedYBias),
    Math.abs(a.constrainedVx - c.constrainedVx),
    Math.abs(a.constrainedVy - c.constrainedVy),
    Math.abs(a.rotationError - c.rotationError),
    Math.abs(a.bindingError - c.bindingError),
  );
}

function physicalMutationDistance(before, after) {
  return Math.max(
    Math.abs(before.translation - after.translation),
    Math.abs(before.supportZ - after.supportZ),
    Math.abs(before.supportV - after.supportV),
    Math.abs(before.relativeZ - after.relativeZ),
    Math.abs(before.relativeV - after.relativeV),
    Math.abs(before.torsoTilt - after.torsoTilt),
    Math.abs(before.footTilt - after.footTilt),
    Math.abs(before.torsoW - after.torsoW),
    Math.abs(before.footW - after.footW),
    Math.abs(before.totalMomentum - after.totalMomentum),
    Math.abs(before.frameNormalImpulse - after.frameNormalImpulse),
    Math.abs(before.supportX - after.supportX),
    Math.abs(before.constrainedYBias - after.constrainedYBias),
    Math.abs(before.constrainedVx - after.constrainedVx),
    Math.abs(before.constrainedVy - after.constrainedVy),
    Math.abs(before.rotationError - after.rotationError),
    Math.abs(before.bindingError - after.bindingError),
  );
}

function mean(trace, key) {
  return trace.reduce((sum, row) => sum + row[key], 0) / trace.length;
}

function maxAbs(trace, key) {
  return Math.max(...trace.map((row) => Math.abs(row[key])));
}

function runPair(direction) {
  const control = makeRig(direction);
  const candidate = makeRig(direction);
  const controlReader = createSupportReader(control.organism, control.supportShape);
  const candidateReader = createSupportReader(candidate.organism, candidate.supportShape);

  for (let frame = 0; frame < SETTLE_FRAMES; frame++) {
    stepRig(control);
    stepRig(candidate);
  }

  const controlT = b3.b3PrismaticJoint_GetTranslation(control.joint);
  const candidateT = b3.b3PrismaticJoint_GetTranslation(candidate.joint);
  if (Math.abs(controlT - candidateT) > PREMATCH_EPS) {
    throw new Error(`E13.0d matched settle translation diverged dir=${direction}`);
  }
  const t0 = 0.5 * (controlT + candidateT);
  const preControl = snapshot(control, controlReader, direction, 0, t0);
  const preCandidate = snapshot(candidate, candidateReader, direction, 0, t0);
  if (scalarStateDistance(preControl, preCandidate) > PREMATCH_EPS) {
    throw new Error(`E13.0d matched free-prismatic rigs diverged before transition dir=${direction}`);
  }
  if (!preControl.reactive || !preCandidate.reactive || preControl.fall || preCandidate.fall || !preControl.recovered || !preCandidate.recovered) {
    throw new Error(`E13.0d pre-transition embodied state was not qualified dir=${direction}`);
  }

  // Geometry metadata is identical in both rigs. The only causal difference is
  // enableLimit. lower=t0 gives no post-result gap; upper=t0+60m is one support
  // length and intentionally unreachable here. E8.0c qualified EnableLimit's
  // cache reset semantics when the enabled state changes.
  b3.b3PrismaticJoint_SetLimits(control.joint, t0, t0 + UPPER_TRAVEL);
  b3.b3PrismaticJoint_SetLimits(candidate.joint, t0, t0 + UPPER_TRAVEL);
  b3.b3PrismaticJoint_EnableLimit(candidate.joint, true);

  if (b3.b3PrismaticJoint_IsLimitEnabled(control.joint)) {
    throw new Error(`E13.0d control limit unexpectedly enabled dir=${direction}`);
  }
  if (!b3.b3PrismaticJoint_IsLimitEnabled(candidate.joint)) {
    throw new Error(`E13.0d candidate limit failed to enable dir=${direction}`);
  }

  const immediateControl = snapshot(control, controlReader, direction, 0, t0);
  const immediateCandidate = snapshot(candidate, candidateReader, direction, 0, t0);
  if (
    physicalMutationDistance(preControl, immediateControl) > IMMEDIATE_EPS ||
    physicalMutationDistance(preCandidate, immediateCandidate) > IMMEDIATE_EPS
  ) {
    throw new Error(`E13.0d limit API transition mutated body state before solve dir=${direction}`);
  }

  const controlTrace = [immediateControl];
  const candidateTrace = [immediateCandidate];
  for (let frame = 1; frame <= OBSERVE_FRAMES; frame++) {
    stepRig(control);
    stepRig(candidate);
    controlTrace.push(snapshot(control, controlReader, direction, frame, t0));
    candidateTrace.push(snapshot(candidate, candidateReader, direction, frame, t0));
  }

  controlReader.destroy();
  candidateReader.destroy();
  b3.b3DestroyWorld(control.world);
  b3.b3DestroyWorld(candidate.world);

  return { direction, t0, preControl, preCandidate, controlTrace, candidateTrace };
}

function comparePair(result) {
  const { controlTrace, candidateTrace } = result;
  let maxRelZDelta = 0;
  let maxRelVDelta = 0;
  let maxSupportZDelta = 0;
  let maxSupportVDelta = 0;
  let maxTorsoTiltDelta = 0;
  let maxFootTiltDelta = 0;
  let maxTorsoWDelta = 0;
  let maxFootWDelta = 0;
  let maxLoadDelta = 0;
  let supportLossControl = 0;
  let supportLossCandidate = 0;
  let maxDifferentialWorldImpulse = 0;
  let maxControlNegativeExcursion = 0;
  let maxCandidateLowerPenetration = 0;

  const p0Control = controlTrace[0].totalMomentum;
  const p0Candidate = candidateTrace[0].totalMomentum;

  for (let i = 0; i < controlTrace.length; i++) {
    const a = controlTrace[i];
    const c = candidateTrace[i];
    maxRelZDelta = Math.max(maxRelZDelta, Math.abs(a.relativeZ - c.relativeZ));
    maxRelVDelta = Math.max(maxRelVDelta, Math.abs(a.relativeV - c.relativeV));
    maxSupportZDelta = Math.max(maxSupportZDelta, Math.abs(a.supportZ - c.supportZ));
    maxSupportVDelta = Math.max(maxSupportVDelta, Math.abs(a.supportV - c.supportV));
    maxTorsoTiltDelta = Math.max(maxTorsoTiltDelta, Math.abs(a.torsoTilt - c.torsoTilt));
    maxFootTiltDelta = Math.max(maxFootTiltDelta, Math.abs(a.footTilt - c.footTilt));
    maxTorsoWDelta = Math.max(maxTorsoWDelta, Math.abs(a.torsoW - c.torsoW));
    maxFootWDelta = Math.max(maxFootWDelta, Math.abs(a.footW - c.footW));
    maxLoadDelta = Math.max(maxLoadDelta, Math.abs(a.frameNormalImpulse - c.frameNormalImpulse));
    if (!a.reactive) supportLossControl += 1;
    if (!c.reactive) supportLossCandidate += 1;

    // No horizontal authority is applied. Subtracting the matched control's
    // momentum drift isolates the extra external-world impulse caused by the
    // candidate's unilateral axial relation without trusting generic joint-force telemetry.
    const controlDeltaP = a.totalMomentum - p0Control;
    const candidateDeltaP = c.totalMomentum - p0Candidate;
    maxDifferentialWorldImpulse = Math.max(maxDifferentialWorldImpulse, Math.abs(candidateDeltaP - controlDeltaP));
    maxControlNegativeExcursion = Math.max(maxControlNegativeExcursion, Math.max(0, -a.limitOffset));
    maxCandidateLowerPenetration = Math.max(maxCandidateLowerPenetration, Math.max(0, -c.limitOffset));
  }

  const firstControlDeltaP = controlTrace[1].totalMomentum - p0Control;
  const firstCandidateDeltaP = candidateTrace[1].totalMomentum - p0Candidate;

  return {
    maxRelZDelta,
    maxRelVDelta,
    maxSupportZDelta,
    maxSupportVDelta,
    maxTorsoTiltDelta,
    maxFootTiltDelta,
    maxTorsoWDelta,
    maxFootWDelta,
    meanLoadControl: mean(controlTrace, 'frameNormalImpulse'),
    meanLoadCandidate: mean(candidateTrace, 'frameNormalImpulse'),
    maxLoadDelta,
    supportLossControl,
    supportLossCandidate,
    firstFrameDifferentialWorldImpulse: Math.abs(firstCandidateDeltaP - firstControlDeltaP),
    maxDifferentialWorldImpulse,
    maxControlNegativeExcursion,
    maxCandidateLowerPenetration,
    candidateMaxXLeak: maxAbs(candidateTrace, 'supportX'),
    candidateMaxVxLeak: maxAbs(candidateTrace, 'constrainedVx'),
    candidateMaxVyLeak: maxAbs(candidateTrace, 'constrainedVy'),
    candidateMaxRotationError: maxAbs(candidateTrace, 'rotationError'),
    candidateMaxBindingError: maxAbs(candidateTrace, 'bindingError'),
    candidateMaxYBias: maxAbs(candidateTrace, 'constrainedYBias'),
    finalControlOffset: controlTrace.at(-1).limitOffset,
    finalCandidateOffset: candidateTrace.at(-1).limitOffset,
  };
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || PLAYER_MASS !== 80 || SUPPORT_MASS !== 800 || MU !== 0.95) {
  throw new Error('E13.0d expected canonical E12/Donor-v1 substrate');
}

console.log('E13.0d embodied unilateral world-stop neutrality gate');
console.log('  both rigs: E13.0c1-qualified free-prismatic 800kg support + finite 320Nm player, 90f settle, no locomotion/assist authority.');
console.log('  transition: identical SetLimits([settled t0, t0+60m]); control remains disabled; candidate EnableLimit(true); then 60f passive observation.');
console.log(`  paid-for bands: first/max differential world impulse<=${MAX_FIRST_FRAME_DIFFERENTIAL_IMPULSE.toFixed(3)}Ns; meanLoad<=${MAX_MEAN_LOAD_DELTA.toFixed(4)}Ns; instantLoad<=${MAX_INSTANT_LOAD_DELTA.toFixed(4)}Ns; tilt<=${(MAX_TILT_DELTA * 180 / Math.PI).toFixed(3)}deg; relZ/supportZ<=${MAX_RELATIVE_Z_DELTA}m; relV/supportV<=${MAX_RELATIVE_V_DELTA.toFixed(4)}m/s; constraint/penetration<=${CONSTRAINT_EPS}m.`);

const results = DIRECTIONS.map(runPair).map((result) => ({ ...result, comparison: comparePair(result) }));

for (const { direction, t0, comparison: c } of results) {
  console.log(
    `  dir=${direction > 0 ? '+' : '-'} t0=${t0.toExponential(6)}m | ` +
    `worldΔP first/max=${c.firstFrameDifferentialWorldImpulse.toExponential(3)}/${c.maxDifferentialWorldImpulse.toExponential(3)}Ns | ` +
    `load ${c.meanLoadControl.toFixed(4)}->${c.meanLoadCandidate.toFixed(4)} maxΔ=${c.maxLoadDelta.toFixed(4)}Ns | ` +
    `relΔ z/v=${c.maxRelZDelta.toExponential(3)}m/${c.maxRelVDelta.toExponential(3)}m/s ` +
    `supportΔ z/v=${c.maxSupportZDelta.toExponential(3)}m/${c.maxSupportVDelta.toExponential(3)}m/s | ` +
    `tiltΔ torso/foot=${(c.maxTorsoTiltDelta * 180 / Math.PI).toFixed(4)}/${(c.maxFootTiltDelta * 180 / Math.PI).toFixed(4)}deg | ` +
    `freeNeg=${c.maxControlNegativeExcursion.toExponential(3)}m limitPen=${c.maxCandidateLowerPenetration.toExponential(3)}m ` +
    `finalOffset=${c.finalControlOffset.toExponential(3)}->${c.finalCandidateOffset.toExponential(3)}m | ` +
    `X=${c.candidateMaxXLeak.toExponential(3)}m Ybias=${c.candidateMaxYBias.toExponential(3)}m Vx/Vy=${c.candidateMaxVxLeak.toExponential(3)}/${c.candidateMaxVyLeak.toExponential(3)}m/s rot=${c.candidateMaxRotationError.toExponential(3)}rad bind=${c.candidateMaxBindingError.toExponential(3)}m supportLoss=${c.supportLossControl}/${c.supportLossCandidate}`,
  );
}

for (const { direction, controlTrace, candidateTrace, comparison: c } of results) {
  if (
    controlTrace.some((r) => r.fall || !r.recovered) ||
    candidateTrace.some((r) => r.fall || !r.recovered)
  ) {
    throw new Error(`E13.0d passive embodied state did not remain recovered dir=${direction}`);
  }
  if (c.supportLossControl !== 0 || c.supportLossCandidate !== 0) {
    throw new Error(`E13.0d passive support continuity changed/lost dir=${direction}`);
  }
  if (Math.abs(c.meanLoadCandidate - c.meanLoadControl) > MAX_MEAN_LOAD_DELTA) {
    throw new Error(`E13.0d mean support load changed materially dir=${direction}`);
  }
  if (c.maxLoadDelta > MAX_INSTANT_LOAD_DELTA) {
    throw new Error(`E13.0d instantaneous support load changed materially dir=${direction}`);
  }
  if (c.maxRelZDelta > MAX_RELATIVE_Z_DELTA || c.maxRelVDelta > MAX_RELATIVE_V_DELTA) {
    throw new Error(`E13.0d player/support relative state changed materially dir=${direction}`);
  }
  if (c.maxSupportZDelta > MAX_SUPPORT_Z_DELTA || c.maxSupportVDelta > MAX_SUPPORT_V_DELTA) {
    throw new Error(`E13.0d support world-axis state changed materially dir=${direction}`);
  }
  if (c.maxTorsoTiltDelta > MAX_TILT_DELTA || c.maxFootTiltDelta > MAX_TILT_DELTA) {
    throw new Error(`E13.0d posture trace changed materially dir=${direction}`);
  }
  if (c.maxTorsoWDelta > MAX_ANGULAR_SPEED_DELTA || c.maxFootWDelta > MAX_ANGULAR_SPEED_DELTA) {
    throw new Error(`E13.0d angular-speed trace changed materially dir=${direction}`);
  }
  if (c.firstFrameDifferentialWorldImpulse > MAX_FIRST_FRAME_DIFFERENTIAL_IMPULSE) {
    throw new Error(`E13.0d unilateral stop injected material first-frame world impulse dir=${direction}`);
  }
  if (c.maxDifferentialWorldImpulse > MAX_DIFFERENTIAL_WORLD_IMPULSE) {
    throw new Error(`E13.0d unilateral stop accumulated material passive world impulse dir=${direction}`);
  }
  if (c.maxCandidateLowerPenetration > CONSTRAINT_EPS) {
    throw new Error(`E13.0d unilateral lower limit admitted material passive penetration dir=${direction}`);
  }
  if (
    c.candidateMaxXLeak > CONSTRAINT_EPS ||
    c.candidateMaxVxLeak > CONSTRAINT_EPS ||
    c.candidateMaxVyLeak > CONSTRAINT_EPS ||
    c.candidateMaxRotationError > CONSTRAINT_EPS ||
    c.candidateMaxBindingError > CONSTRAINT_EPS
  ) {
    throw new Error(`E13.0d world-stop candidate exposed unintended constrained-DOF leak dir=${direction}`);
  }
}

const minus = results.find((r) => r.direction === -1).comparison;
const plus = results.find((r) => r.direction === 1).comparison;
if (
  Math.abs(minus.maxDifferentialWorldImpulse - plus.maxDifferentialWorldImpulse) > MAX_DIFFERENTIAL_WORLD_IMPULSE ||
  Math.abs(minus.meanLoadCandidate - plus.meanLoadCandidate) > MAX_MEAN_LOAD_DELTA ||
  Math.abs(minus.maxSupportZDelta - plus.maxSupportZDelta) > MAX_SUPPORT_Z_DELTA
) {
  throw new Error('E13.0d passive unilateral world-stop result is mirror-asymmetric');
}

console.log('E13.0d PASS: enabling the zero-gap unilateral world relation at the qualified settled translation remains passive-neutral within predeclared embodied/transition bands; no arbitrary gap or authority was introduced.');
