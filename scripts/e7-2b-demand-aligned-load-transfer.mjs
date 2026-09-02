import Box3D from 'box3d.js/inline';
import {
  SagittalBalanceOrganism,
  E3_SAGITTAL_DEFAULTS,
} from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const CURRENT_ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const TOTAL_MASS = DONOR_PROFILE_V1.virtualMass;
const PRIMARY_BALANCE_TORQUE = 320;
const MU = 0.95;
const INITIAL_SETTLE_FRAMES = 90;
const ACQUISITION_WINDOW = 180;
const ACQUIRE_STREAK = 5;
const DUAL_SETTLE_FRAMES = 90;
const BASELINE_SAMPLE_FRAMES = 60;
const PREPARE_FRAMES = 240;
const HOLD_REQUIRED = 30;
const TARGET_TOLERANCE = 2 * Math.PI / 180;
const ANGULAR_SPEED_TOLERANCE = 0.16;
const FOOT_TILT_TOLERANCE = 6 * Math.PI / 180;
const LOAD_EPS = 1e-6;
const DEG = Math.PI / 180;
const PROBE_TARGET_ANGLE = 140 * DEG;
const PROBE_LIMIT_ANGLE = 145 * DEG;
const DEMAND_TILT_MAGNITUDE = Math.atan2(CURRENT_ACCEL, G);
const SQRT_HALF = Math.SQRT1_2;
const SAGITTAL_HINGE_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];

const PROBE_MASS = 1;
const PROBE_LENGTH = 0.9;
const PROBE_HALF = [0.06, PROBE_LENGTH / 2, 0.06];
const CANDIDATE_TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - PROBE_MASS;

// Exact E7.1 finite internal probe actuator.
const PROBE_I_CM_X =
  (PROBE_MASS / 12) * (PROBE_LENGTH * PROBE_LENGTH + (2 * PROBE_HALF[2]) ** 2);
const PROBE_I_PIVOT_X = PROBE_I_CM_X + PROBE_MASS * (PROBE_LENGTH / 2) ** 2;
const PROBE_MAX_GRAVITY_MOMENT = PROBE_MASS * G * (PROBE_LENGTH / 2);
const PROBE_TORQUE_CAP = 2 * PROBE_MAX_GRAVITY_MOMENT;
const PROBE_NATURAL_FREQUENCY = 8;
const PROBE_KP = PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY ** 2;
const PROBE_KD = 2 * PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY;

// E5.0a settled-load calibration and its existing 3% tolerance.
const EXPECTED_TOTAL_SUPPORT_IMPULSE = TOTAL_MASS * G * DT;
const E5_CALIBRATION_TOLERANCE = 0.03 * EXPECTED_TOTAL_SUPPORT_IMPULSE;
const PROBE_OWN_WEIGHT_IMPULSE = PROBE_MASS * G * DT;
const MIN_BODY_TRANSFER_PROBE_LOAD = PROBE_OWN_WEIGHT_IMPULSE + E5_CALIBRATION_TOLERANCE;

// Geometric motivation only, not a pass gate: current-31 effective-up moves the
// dominant torso COM projection beyond the primary-foot half-width while remaining
// inside the already-qualified parallel-support reach.
const APPROX_WEIGHTED_TORSO_COM_SHIFT =
  (CANDIDATE_TORSO_MASS * E3_SAGITTAL_DEFAULTS.torsoHalf[1] * Math.sin(DEMAND_TILT_MAGNITUDE)) /
  TOTAL_MASS;

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function sameShapeId(a, b) {
  return Boolean(a && b) &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation;
}

function bodyAngularVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return out;
}

function bodyLinearVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function bodyCom(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(out, body);
  return out;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makePlatform(world) {
  const half = [2, 0.25, 30];
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, -half[1], 0];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = MU;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...half);
  return { body, shape };
}

function makeProbe(world, pivot) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [pivot[0], pivot[1] + PROBE_HALF[1], pivot[2]];
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
  sd.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...PROBE_HALF);
  return { body, shape };
}

function createRig() {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: PRIMARY_BALANCE_TORQUE,
    torsoMass: CANDIDATE_TORSO_MASS,
  });

  const probePart = makeProbe(world, organism.startTorsoPosition);
  const hinge = b3.b3DefaultRevoluteJointDef();
  hinge.base.bodyIdA = organism.torso;
  hinge.base.bodyIdB = probePart.body;
  hinge.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.base.localFrameB = { position: [0, -PROBE_HALF[1], 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.enableSpring = false;
  hinge.enableLimit = true;
  hinge.lowerAngle = -PROBE_LIMIT_ANGLE;
  hinge.upperAngle = PROBE_LIMIT_ANGLE;
  hinge.enableMotor = false;
  const joint = b3.b3CreateRevoluteJoint(world, hinge);

  const probeMass = b3.b3Body_GetMass(probePart.body);
  const mass = organism.footMass + organism.torsoMass + probeMass;
  if (Math.abs(mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E7.2b organism mass ${mass} != ${TOTAL_MASS} kg`);
  }

  return {
    world,
    organism,
    probe: probePart.body,
    probeShape: probePart.shape,
    groundShape: platform.shape,
    joint,
    probeMass,
  };
}

function makeGroundLoadReader(body, ownedShape, groundShape, label) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  return {
    read() {
      b3.getBodyContactData(buffer, body);
      const rawContacts = b3.getNumContacts(buffer);
      let groundRaw = 0;
      let otherRaw = 0;
      let groundTouching = 0;
      let groundLoaded = 0;
      let otherTouching = 0;
      let otherLoaded = 0;
      let normalImpulse = 0;
      let totalNormalImpulse = 0;

      for (let i = 0; i < rawContacts; i++) {
        b3.getContactAt(contact, buffer, i);
        const ownedIsA = sameShapeId(contact.shapeIdA, ownedShape);
        const ownedIsB = sameShapeId(contact.shapeIdB, ownedShape);
        if (ownedIsA === ownedIsB) {
          throw new Error(`E7.2b ${label} contact does not contain exactly one owned shape id`);
        }
        const otherShape = ownedIsA ? contact.shapeIdB : contact.shapeIdA;
        const isGround = sameShapeId(otherShape, groundShape);
        if (isGround) groundRaw += 1;
        else otherRaw += 1;

        for (let m = 0; m < contact.manifoldCount; m++) {
          b3.getManifoldAt(manifold, contact, m);
          if (Math.abs(manifold.normal[1]) < 0.5) continue;
          for (let p = 0; p < manifold.pointCount; p++) {
            const point = manifold.points[p];
            const touching = point.separation <= 0;
            const pointNormal = Math.abs(point.normalImpulse ?? 0);
            const pointTotal = Math.abs(point.totalNormalImpulse ?? 0);
            const loaded = pointNormal > LOAD_EPS || pointTotal > LOAD_EPS;
            if (isGround) {
              if (touching) groundTouching += 1;
              if (loaded) groundLoaded += 1;
              normalImpulse += pointNormal;
              totalNormalImpulse += pointTotal;
            } else {
              if (touching) otherTouching += 1;
              if (loaded) otherLoaded += 1;
            }
          }
        }
      }

      return {
        groundRaw,
        otherRaw,
        groundTouching,
        groundLoaded,
        otherTouching,
        otherLoaded,
        reactive: groundTouching > 0 || groundLoaded > 0,
        finalScaledImpulse: normalImpulse * SUBSTEPS,
        nativeEquivalentImpulse: 0.5 * totalNormalImpulse,
      };
    },
    destroy() {
      b3.destroyContactsBuffer(buffer);
    },
  };
}

function makeReaders(rig) {
  return {
    foot: makeGroundLoadReader(
      rig.organism.foot,
      rig.organism.footShape,
      rig.groundShape,
      'primary-foot',
    ),
    probe: makeGroundLoadReader(rig.probe, rig.probeShape, rig.groundShape, 'probe'),
  };
}

function applyPrimaryTarget(organism, supported, targetTilt) {
  organism._sync();
  const error = organism.torsoTilt - targetTilt;
  const omega = organism.torsoAngularVelocity[0];
  const requested = -organism.kp * error - organism.kd * omega;
  const torque = supported
    ? clamp(requested, -PRIMARY_BALANCE_TORQUE, PRIMARY_BALANCE_TORQUE)
    : 0;
  organism.lastBalanceTorque = torque;
  if (Math.abs(torque) > 1e-9) {
    const impulse = torque * DT;
    b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(organism.foot, [-impulse, 0, 0], true);
  }
  return torque;
}

function applyProbeActuator(rig, targetAngle) {
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const probeW = bodyAngularVelocity(rig.probe);
  rig.organism._sync();
  const relativeW = probeW[0] - rig.organism.torsoAngularVelocity[0];
  const request = PROBE_KP * (targetAngle - angle) - PROBE_KD * relativeW;
  const torque = clamp(request, -PROBE_TORQUE_CAP, PROBE_TORQUE_CAP);
  if (Math.abs(torque) > 1e-9) {
    const impulse = torque * DT;
    b3.b3Body_ApplyAngularImpulse(rig.probe, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.organism.torso, [-impulse, 0, 0], true);
  }
  return { angle, relativeW, torque };
}

function stepRig(rig, readers, primaryTarget, probeTarget) {
  const footBefore = readers.foot.read();
  const primaryTorque = applyPrimaryTarget(rig.organism, footBefore.reactive, primaryTarget);
  const probeActuator = applyProbeActuator(rig, probeTarget);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();

  const foot = readers.foot.read();
  const probe = readers.probe.read();
  const jointForce = [0, 0, 0];
  b3.b3Joint_GetConstraintForce(jointForce, rig.joint);

  const footV = bodyLinearVelocity(rig.organism.foot);
  const torsoV = bodyLinearVelocity(rig.organism.torso);
  const probeV = bodyLinearVelocity(rig.probe);
  const wholeVy = (
    rig.organism.footMass * footV[1] +
    rig.organism.torsoMass * torsoV[1] +
    rig.probeMass * probeV[1]
  ) / TOTAL_MASS;

  const footCom = bodyCom(rig.organism.foot);
  const torsoCom = bodyCom(rig.organism.torso);
  const probeCom = bodyCom(rig.probe);
  const wholeComZ = (
    rig.organism.footMass * footCom[2] +
    rig.organism.torsoMass * torsoCom[2] +
    rig.probeMass * probeCom[2]
  ) / TOTAL_MASS;

  return {
    foot,
    probe,
    primaryTorque,
    probeTorque: probeActuator.torque,
    jointForceY: jointForce[1],
    wholeVy,
    footComZ: footCom[2],
    torsoComZ: torsoCom[2],
    probeComZ: probeCom[2],
    wholeComZ,
  };
}

function makeAccumulator() {
  return {
    frames: 0,
    footFinal: 0,
    footNative: 0,
    probeFinal: 0,
    probeNative: 0,
    jointFy: 0,
    absJointFy: 0,
    wholeComZ: 0,
    footComZ: 0,
    probeComZ: 0,
    maxAbsWholeVy: 0,
    maxPrimaryTorque: 0,
    maxProbeTorque: 0,
    footLoss: 0,
    probeLoss: 0,
    otherRaw: 0,
    otherLoaded: 0,
  };
}

function addSample(acc, state) {
  acc.frames += 1;
  acc.footFinal += state.foot.finalScaledImpulse;
  acc.footNative += state.foot.nativeEquivalentImpulse;
  acc.probeFinal += state.probe.finalScaledImpulse;
  acc.probeNative += state.probe.nativeEquivalentImpulse;
  acc.jointFy += state.jointForceY;
  acc.absJointFy += Math.abs(state.jointForceY);
  acc.wholeComZ += state.wholeComZ;
  acc.footComZ += state.footComZ;
  acc.probeComZ += state.probeComZ;
  acc.maxAbsWholeVy = Math.max(acc.maxAbsWholeVy, Math.abs(state.wholeVy));
  acc.maxPrimaryTorque = Math.max(acc.maxPrimaryTorque, Math.abs(state.primaryTorque));
  acc.maxProbeTorque = Math.max(acc.maxProbeTorque, Math.abs(state.probeTorque));
  if (!state.foot.reactive) acc.footLoss += 1;
  if (!state.probe.reactive) acc.probeLoss += 1;
  acc.otherRaw = Math.max(acc.otherRaw, state.foot.otherRaw, state.probe.otherRaw);
  acc.otherLoaded = Math.max(acc.otherLoaded, state.foot.otherLoaded, state.probe.otherLoaded);
}

function finishAccumulator(acc) {
  if (acc.frames <= 0) return null;
  const n = acc.frames;
  return {
    frames: n,
    footFinal: acc.footFinal / n,
    footNative: acc.footNative / n,
    probeFinal: acc.probeFinal / n,
    probeNative: acc.probeNative / n,
    totalFinal: (acc.footFinal + acc.probeFinal) / n,
    totalNative: (acc.footNative + acc.probeNative) / n,
    meanJointFy: acc.jointFy / n,
    meanAbsJointFy: acc.absJointFy / n,
    meanWholeComZ: acc.wholeComZ / n,
    meanFootComZ: acc.footComZ / n,
    meanProbeComZ: acc.probeComZ / n,
    maxAbsWholeVy: acc.maxAbsWholeVy,
    maxPrimaryTorque: acc.maxPrimaryTorque,
    maxProbeTorque: acc.maxProbeTorque,
    footLoss: acc.footLoss,
    probeLoss: acc.probeLoss,
    otherRaw: acc.otherRaw,
    otherLoaded: acc.otherLoaded,
  };
}

function within(value, target, tolerance) {
  return Math.abs(value - target) <= tolerance;
}

function runCase(probeDirection) {
  const rig = createRig();
  const readers = makeReaders(rig);
  let state = null;

  for (let frame = 0; frame < INITIAL_SETTLE_FRAMES; frame++) {
    state = stepRig(rig, readers, 0, 0);
    if (!state.foot.reactive || state.probe.groundRaw !== 0 || state.probe.otherRaw !== 0) {
      readers.foot.destroy();
      readers.probe.destroy();
      b3.b3DestroyWorld(rig.world);
      throw new Error(`E7.2b initial inactive control failed dir=${probeDirection}`);
    }
  }

  let streak = 0;
  let acquiredFrame = -1;
  for (let frame = 0; frame < ACQUISITION_WINDOW; frame++) {
    state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
    if (!state.foot.reactive || state.foot.otherRaw !== 0 || state.probe.otherRaw !== 0) {
      readers.foot.destroy();
      readers.probe.destroy();
      b3.b3DestroyWorld(rig.world);
      throw new Error(`E7.2b acquisition contamination/support loss dir=${probeDirection}`);
    }
    if (state.probe.groundLoaded > 0) {
      streak += 1;
      if (streak >= ACQUIRE_STREAK) {
        acquiredFrame = frame - ACQUIRE_STREAK + 1;
        break;
      }
    } else {
      streak = 0;
    }
  }

  if (acquiredFrame < 0) {
    readers.foot.destroy();
    readers.probe.destroy();
    b3.b3DestroyWorld(rig.world);
    throw new Error(`E7.2b failed to acquire probe ground support dir=${probeDirection}`);
  }

  for (let frame = 0; frame < DUAL_SETTLE_FRAMES; frame++) {
    state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
    if (
      !state.foot.reactive ||
      !state.probe.reactive ||
      state.foot.otherRaw !== 0 ||
      state.probe.otherRaw !== 0
    ) {
      readers.foot.destroy();
      readers.probe.destroy();
      b3.b3DestroyWorld(rig.world);
      throw new Error(`E7.2b dual-support settle failed dir=${probeDirection}`);
    }
  }

  const baselineAcc = makeAccumulator();
  for (let frame = 0; frame < BASELINE_SAMPLE_FRAMES; frame++) {
    state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
    addSample(baselineAcc, state);
  }
  const baseline = finishAccumulator(baselineAcc);

  const supportSide = Math.sign(baseline.meanProbeComZ - baseline.meanFootComZ);
  if (supportSide === 0) {
    readers.foot.destroy();
    readers.probe.destroy();
    b3.b3DestroyWorld(rig.world);
    throw new Error(`E7.2b could not resolve acquired support side dir=${probeDirection}`);
  }
  const targetTilt = supportSide * DEMAND_TILT_MAGNITUDE;

  let stableFrames = 0;
  let reachedFrame = -1;
  let hold = null;
  let stableAcc = makeAccumulator();
  let bestTargetError = Infinity;
  let peakTargetPhaseTilt = 0;
  let targetPhaseFootLoss = 0;
  let targetPhaseProbeLoss = 0;
  let targetPhaseOtherRaw = 0;

  for (let frame = 0; frame < PREPARE_FRAMES; frame++) {
    state = stepRig(rig, readers, targetTilt, probeDirection * PROBE_TARGET_ANGLE);
    const error = Math.abs(rig.organism.torsoTilt - targetTilt);
    bestTargetError = Math.min(bestTargetError, error);
    peakTargetPhaseTilt = Math.max(peakTargetPhaseTilt, Math.abs(rig.organism.torsoTilt));
    if (!state.foot.reactive) targetPhaseFootLoss += 1;
    if (!state.probe.reactive) targetPhaseProbeLoss += 1;
    targetPhaseOtherRaw = Math.max(targetPhaseOtherRaw, state.foot.otherRaw, state.probe.otherRaw);

    const stable = (
      !rig.organism.fallObserved &&
      state.foot.reactive &&
      state.probe.reactive &&
      state.foot.otherRaw === 0 &&
      state.probe.otherRaw === 0 &&
      error <= TARGET_TOLERANCE &&
      Math.abs(rig.organism.torsoAngularVelocity[0]) <= ANGULAR_SPEED_TOLERANCE &&
      Math.abs(rig.organism.footTilt) <= FOOT_TILT_TOLERANCE
    );

    if (stable) {
      if (stableFrames === 0) stableAcc = makeAccumulator();
      stableFrames += 1;
      addSample(stableAcc, state);
      if (reachedFrame < 0) reachedFrame = frame;
      if (stableFrames >= HOLD_REQUIRED) {
        hold = finishAccumulator(stableAcc);
        break;
      }
    } else {
      stableFrames = 0;
      stableAcc = makeAccumulator();
    }
  }

  const result = {
    probeDirection,
    supportSide,
    acquiredFrame,
    targetTiltDeg: targetTilt / DEG,
    reachedFrame,
    outcome: hold ? 'HOLD' : rig.organism.fallObserved ? 'FALL' : 'UNRESOLVED',
    bestTargetErrorDeg: bestTargetError / DEG,
    peakTargetPhaseTiltDeg: peakTargetPhaseTilt / DEG,
    targetPhaseFootLoss,
    targetPhaseProbeLoss,
    targetPhaseOtherRaw,
    baseline,
    hold,
    fall: rig.organism.fallObserved,
  };

  readers.foot.destroy();
  readers.probe.destroy();
  b3.b3DestroyWorld(rig.world);
  return result;
}

function cleanLoadSample(sample) {
  return sample &&
    sample.footLoss === 0 &&
    sample.probeLoss === 0 &&
    sample.otherRaw === 0 &&
    sample.otherLoaded === 0 &&
    within(sample.totalFinal, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) &&
    within(sample.totalNative, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE);
}

function transferPass(row) {
  if (row.outcome !== 'HOLD' || !row.hold || row.fall) return false;
  if (!cleanLoadSample(row.baseline) || !cleanLoadSample(row.hold)) return false;
  if (
    row.targetPhaseFootLoss !== 0 ||
    row.targetPhaseProbeLoss !== 0 ||
    row.targetPhaseOtherRaw !== 0
  ) return false;

  const probeGainFinal = row.hold.probeFinal - row.baseline.probeFinal;
  const probeGainNative = row.hold.probeNative - row.baseline.probeNative;
  const footDropFinal = row.baseline.footFinal - row.hold.footFinal;
  const footDropNative = row.baseline.footNative - row.hold.footNative;

  return (
    row.hold.probeFinal > MIN_BODY_TRANSFER_PROBE_LOAD &&
    row.hold.probeNative > MIN_BODY_TRANSFER_PROBE_LOAD &&
    probeGainFinal > E5_CALIBRATION_TOLERANCE &&
    probeGainNative > E5_CALIBRATION_TOLERANCE &&
    footDropFinal > E5_CALIBRATION_TOLERANCE &&
    footDropNative > E5_CALIBRATION_TOLERANCE
  );
}

if (
  DT !== 1 / 60 ||
  SUBSTEPS !== 4 ||
  G !== 20 ||
  CURRENT_ACCEL !== 31 ||
  TOTAL_MASS !== 80
) {
  throw new Error('E7.2b expected current Donor-v1/E5 substrate/profile');
}

console.log('E7.2b demand-aligned dual-support load-transfer crucible');
console.log('  representation + probe acquisition mechanics are exact E7.1; no new translational/world authority');
console.log(
  `  demand posture: atan2(31,20)=${(DEMAND_TILT_MAGNITUDE / DEG).toFixed(2)}deg ` +
  `toward the measured acquired-probe side, using the existing 320Nm primary ankle authority`,
);
console.log(
  `  geometry motivation: torso-weighted COM projection≈${APPROX_WEIGHTED_TORSO_COM_SHIFT.toFixed(3)}m ` +
  `vs primaryFootHalfZ=${E3_SAGITTAL_DEFAULTS.footHalf[2].toFixed(3)}m; ` +
  'the target moves the dominant body mass outside the primary footprint without changing support geometry',
);
console.log(
  `  E5 load gate: expected=${EXPECTED_TOTAL_SUPPORT_IMPULSE.toFixed(4)}Ns/frame ` +
  `tol=${E5_CALIBRATION_TOLERANCE.toFixed(4)}Ns probeOwn=${PROBE_OWN_WEIGHT_IMPULSE.toFixed(4)}Ns ` +
  `bodyBearingProbe>${MIN_BODY_TRANSFER_PROBE_LOAD.toFixed(4)}Ns in BOTH calibrated channels`,
);
console.log(
  `  posture hold reuses E4.3: target±2deg, |omega|<=${ANGULAR_SPEED_TOLERANCE.toFixed(2)}rad/s, ` +
  `footTilt<=${(FOOT_TILT_TOLERANCE / DEG).toFixed(0)}deg for ${HOLD_REQUIRED} consecutive frames`,
);

const rows = [-1, 1].map(runCase);
let failures = 0;
for (const row of rows) {
  const b = row.baseline;
  const h = row.hold;
  const probeGainFinal = h ? h.probeFinal - b.probeFinal : NaN;
  const probeGainNative = h ? h.probeNative - b.probeNative : NaN;
  const footDropFinal = h ? b.footFinal - h.footFinal : NaN;
  const footDropNative = h ? b.footNative - h.footNative : NaN;
  const pass = transferPass(row);
  if (!pass) failures += 1;

  console.log(
    `  cmd=${row.probeDirection > 0 ? '+' : '-'} supportSide=${row.supportSide > 0 ? '+' : '-'} ` +
    `acq=${row.acquiredFrame} target=${row.targetTiltDeg.toFixed(2)}deg ${row.outcome} ` +
    `reached=${row.reachedFrame} bestErr=${row.bestTargetErrorDeg.toFixed(2)}deg ` +
    `peak=${row.peakTargetPhaseTiltDeg.toFixed(2)}deg phaseLoss=${row.targetPhaseFootLoss}/${row.targetPhaseProbeLoss} ` +
    `other=${row.targetPhaseOtherRaw} => ${pass ? 'PASS' : 'FAIL'}`,
  );
  console.log(
    `    upright: foot=${b.footFinal.toFixed(4)}/${b.footNative.toFixed(4)} ` +
    `probe=${b.probeFinal.toFixed(4)}/${b.probeNative.toFixed(4)} ` +
    `total=${b.totalFinal.toFixed(4)}/${b.totalNative.toFixed(4)}Ns ` +
    `COMz=${b.meanWholeComZ.toFixed(4)} footZ=${b.meanFootComZ.toFixed(4)} probeZ=${b.meanProbeComZ.toFixed(4)}`,
  );
  if (h) {
    console.log(
      `    demand:  foot=${h.footFinal.toFixed(4)}/${h.footNative.toFixed(4)} ` +
      `probe=${h.probeFinal.toFixed(4)}/${h.probeNative.toFixed(4)} ` +
      `probeGain=${probeGainFinal.toFixed(4)}/${probeGainNative.toFixed(4)} ` +
      `footDrop=${footDropFinal.toFixed(4)}/${footDropNative.toFixed(4)} ` +
      `total=${h.totalFinal.toFixed(4)}/${h.totalNative.toFixed(4)}Ns ` +
      `COMz=${h.meanWholeComZ.toFixed(4)} footZ=${h.meanFootComZ.toFixed(4)} probeZ=${h.meanProbeComZ.toFixed(4)} ` +
      `jointFy=${h.meanJointFy.toFixed(1)}N maxTau=${h.maxPrimaryTorque.toFixed(1)}/${h.maxProbeTorque.toFixed(1)}Nm`,
    );
  }
}

if (failures > 0) {
  throw new Error(`E7.2b demand-aligned load-transfer gate failed in ${failures}/2 mirrored cases`);
}

console.log(
  'E7.2b PASS: after the already-qualified finite internal ground acquisition, the current-31 demand-aligned posture target physically shifts body load from the primary foot onto the real parallel ground support in both sagittal directions. Both independent E5.0a contact-impulse channels show >one-calibration-band probe load gain and matching primary-foot unloading while the full 80kg support load remains conserved, both supports remain active, and no non-ground contact or world-external translational authority is introduced. This qualifies controllable load transfer, not yet translational agency, stepping, or gait.',
);
