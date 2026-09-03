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
const POST_LATCH_SETTLE_FRAMES = 30; // exact E10.0b qualified transition window
const BASELINE_SAMPLE_FRAMES = 60; // exact E7.2b load baseline window
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
const TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - PROBE_MASS;

// Exact E7.1 finite internal probe actuator.
const PROBE_I_CM_X =
  (PROBE_MASS / 12) * (PROBE_LENGTH * PROBE_LENGTH + (2 * PROBE_HALF[2]) ** 2);
const PROBE_I_PIVOT_X = PROBE_I_CM_X + PROBE_MASS * (PROBE_LENGTH / 2) ** 2;
const PROBE_MAX_GRAVITY_MOMENT = PROBE_MASS * G * (PROBE_LENGTH / 2);
const PROBE_TORQUE_CAP = 2 * PROBE_MAX_GRAVITY_MOMENT;
const PROBE_NATURAL_FREQUENCY = 8;
const PROBE_KP = PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY ** 2;
const PROBE_KD = 2 * PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY;

// Exact E5.0a / E7.2 load accounting thresholds.
const EXPECTED_TOTAL_SUPPORT_IMPULSE = TOTAL_MASS * G * DT;
const E5_CALIBRATION_TOLERANCE = 0.03 * EXPECTED_TOTAL_SUPPORT_IMPULSE;
const PROBE_OWN_WEIGHT_IMPULSE = PROBE_MASS * G * DT;
const MIN_BODY_TRANSFER_PROBE_LOAD = PROBE_OWN_WEIGHT_IMPULSE + E5_CALIBRATION_TOLERANCE;
const MAX_LOCK_DRIFT = 0.25 * DEG;
const MIRROR_ACQUISITION_TOLERANCE = 6;
const PREMATCH_TOLERANCE = 1e-9;

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
    torsoMass: TORSO_MASS,
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
    throw new Error(`E10.1b organism mass ${mass} != ${TOTAL_MASS}kg`);
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
      let otherLoaded = 0;
      let normalImpulse = 0;
      let totalNormalImpulse = 0;

      for (let i = 0; i < rawContacts; i++) {
        b3.getContactAt(contact, buffer, i);
        const ownedIsA = sameShapeId(contact.shapeIdA, ownedShape);
        const ownedIsB = sameShapeId(contact.shapeIdB, ownedShape);
        if (ownedIsA === ownedIsB) {
          throw new Error(`E10.1b ${label} contact does not contain exactly one owned shape id`);
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
            const pointNormal = Math.abs(point.normalImpulse ?? 0);
            const pointTotal = Math.abs(point.totalNormalImpulse ?? 0);
            const loaded = pointNormal > LOAD_EPS || pointTotal > LOAD_EPS;
            if (isGround) {
              if (point.separation <= 0) groundTouching += 1;
              if (loaded) groundLoaded += 1;
              normalImpulse += pointNormal;
              totalNormalImpulse += pointTotal;
            } else if (loaded) {
              otherLoaded += 1;
            }
          }
        }
      }

      return {
        groundRaw,
        otherRaw,
        groundTouching,
        groundLoaded,
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
    foot: makeGroundLoadReader(rig.organism.foot, rig.organism.footShape, rig.groundShape, 'primary-foot'),
    probe: makeGroundLoadReader(rig.probe, rig.probeShape, rig.groundShape, 'probe'),
  };
}

function applyPrimaryTarget(organism, supported, targetTilt) {
  organism._sync();
  const error = organism.torsoTilt - targetTilt;
  const omega = organism.torsoAngularVelocity[0];
  const requested = -organism.kp * error - organism.kd * omega;
  const torque = supported ? clamp(requested, -PRIMARY_BALANCE_TORQUE, PRIMARY_BALANCE_TORQUE) : 0;
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

  const probeW = bodyAngularVelocity(rig.probe);
  rig.organism._sync();

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
    jointAngle: b3.b3RevoluteJoint_GetAngle(rig.joint),
    relativeW: probeW[0] - rig.organism.torsoAngularVelocity[0],
  };
}

function latchAtCurrentAngle(rig, angle) {
  b3.b3RevoluteJoint_EnableLimit(rig.joint, false);
  b3.b3RevoluteJoint_SetLimits(rig.joint, angle, angle);
  b3.b3RevoluteJoint_EnableLimit(rig.joint, true);
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

function destroyRig(rig, readers) {
  readers.foot.destroy();
  readers.probe.destroy();
  b3.b3DestroyWorld(rig.world);
}

function runArm(probeDirection, braced) {
  const rig = createRig();
  const readers = makeReaders(rig);
  let state = null;

  for (let frame = 0; frame < INITIAL_SETTLE_FRAMES; frame++) {
    state = stepRig(rig, readers, 0, 0);
    if (!state.foot.reactive || state.probe.groundRaw !== 0 || state.probe.otherRaw !== 0) {
      destroyRig(rig, readers);
      throw new Error(`E10.1b initial inactive control failed dir=${probeDirection}`);
    }
  }

  let streak = 0;
  let acquiredFrame = -1;
  for (let frame = 0; frame < ACQUISITION_WINDOW; frame++) {
    state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
    if (!state.foot.reactive || state.foot.otherRaw !== 0 || state.probe.otherRaw !== 0) {
      destroyRig(rig, readers);
      throw new Error(`E10.1b acquisition contamination/support loss dir=${probeDirection}`);
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
    destroyRig(rig, readers);
    throw new Error(`E10.1b failed to acquire support dir=${probeDirection}`);
  }

  for (let frame = 0; frame < DUAL_SETTLE_FRAMES; frame++) {
    state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
    if (!state.foot.reactive || !state.probe.reactive || state.foot.otherRaw !== 0 || state.probe.otherRaw !== 0) {
      destroyRig(rig, readers);
      throw new Error(`E10.1b dual-support settle failed dir=${probeDirection}`);
    }
  }

  // Deterministic pre-latch state is retained for matched-arm equivalence.
  state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
  const preLatch = {
    angle: state.jointAngle,
    relativeW: state.relativeW,
    wholeComZ: state.wholeComZ,
    footComZ: state.footComZ,
    probeComZ: state.probeComZ,
  };
  const latchAngle = preLatch.angle;
  if (braced) latchAtCurrentAngle(rig, latchAngle);

  let maxLockDrift = 0;
  for (let frame = 0; frame < POST_LATCH_SETTLE_FRAMES; frame++) {
    state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
    if (!state.foot.reactive || !state.probe.reactive || state.foot.otherRaw !== 0 || state.probe.otherRaw !== 0) {
      destroyRig(rig, readers);
      throw new Error(`E10.1b post-latch settle failed dir=${probeDirection} brace=${braced}`);
    }
    if (braced) maxLockDrift = Math.max(maxLockDrift, Math.abs(state.jointAngle - latchAngle));
  }

  const baselineAcc = makeAccumulator();
  for (let frame = 0; frame < BASELINE_SAMPLE_FRAMES; frame++) {
    state = stepRig(rig, readers, 0, probeDirection * PROBE_TARGET_ANGLE);
    addSample(baselineAcc, state);
    if (braced) maxLockDrift = Math.max(maxLockDrift, Math.abs(state.jointAngle - latchAngle));
  }
  const baseline = finishAccumulator(baselineAcc);

  const supportSide = Math.sign(baseline.meanProbeComZ - baseline.meanFootComZ);
  if (supportSide === 0) {
    destroyRig(rig, readers);
    throw new Error(`E10.1b could not resolve support side dir=${probeDirection}`);
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
  let targetPhaseOtherLoaded = 0;

  for (let frame = 0; frame < PREPARE_FRAMES; frame++) {
    state = stepRig(rig, readers, targetTilt, probeDirection * PROBE_TARGET_ANGLE);
    const error = Math.abs(rig.organism.torsoTilt - targetTilt);
    bestTargetError = Math.min(bestTargetError, error);
    peakTargetPhaseTilt = Math.max(peakTargetPhaseTilt, Math.abs(rig.organism.torsoTilt));
    if (!state.foot.reactive) targetPhaseFootLoss += 1;
    if (!state.probe.reactive) targetPhaseProbeLoss += 1;
    targetPhaseOtherRaw = Math.max(targetPhaseOtherRaw, state.foot.otherRaw, state.probe.otherRaw);
    targetPhaseOtherLoaded = Math.max(targetPhaseOtherLoaded, state.foot.otherLoaded, state.probe.otherLoaded);
    if (braced) maxLockDrift = Math.max(maxLockDrift, Math.abs(state.jointAngle - latchAngle));

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
    braced,
    supportSide,
    acquiredFrame,
    preLatch,
    latchAngle,
    maxLockDrift,
    targetTiltDeg: targetTilt / DEG,
    reachedFrame,
    outcome: hold ? 'HOLD' : rig.organism.fallObserved ? 'FALL' : 'UNRESOLVED',
    bestTargetErrorDeg: bestTargetError / DEG,
    peakTargetPhaseTiltDeg: peakTargetPhaseTilt / DEG,
    targetPhaseFootLoss,
    targetPhaseProbeLoss,
    targetPhaseOtherRaw,
    targetPhaseOtherLoaded,
    baseline,
    hold,
    fall: rig.organism.fallObserved,
  };

  destroyRig(rig, readers);
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

function bracePass(control, brace) {
  if (control.outcome !== 'FALL' || !control.fall) return false; // reproduce E7.2b negative control
  if (brace.outcome !== 'HOLD' || !brace.hold || brace.fall) return false;
  if (!cleanLoadSample(control.baseline) || !cleanLoadSample(brace.baseline) || !cleanLoadSample(brace.hold)) return false;
  if (
    brace.targetPhaseFootLoss !== 0 ||
    brace.targetPhaseProbeLoss !== 0 ||
    brace.targetPhaseOtherRaw !== 0 ||
    brace.targetPhaseOtherLoaded !== 0 ||
    brace.maxLockDrift > MAX_LOCK_DRIFT
  ) return false;

  const probeGainFinal = brace.hold.probeFinal - brace.baseline.probeFinal;
  const probeGainNative = brace.hold.probeNative - brace.baseline.probeNative;
  const footDropFinal = brace.baseline.footFinal - brace.hold.footFinal;
  const footDropNative = brace.baseline.footNative - brace.hold.footNative;

  return (
    brace.hold.probeFinal > MIN_BODY_TRANSFER_PROBE_LOAD &&
    brace.hold.probeNative > MIN_BODY_TRANSFER_PROBE_LOAD &&
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
  throw new Error('E10.1b expected current Donor-v1/E5 substrate/profile');
}
for (const fn of ['b3RevoluteJoint_GetAngle', 'b3RevoluteJoint_SetLimits', 'b3RevoluteJoint_EnableLimit']) {
  if (typeof b3[fn] !== 'function') throw new Error(`E10.1b requires ${fn}`);
}

console.log('E10.1b demand-aligned one-piece brace stability falsifier');
console.log('  exact E7.2b demand is reused unchanged: current31 effective-up target after real E7.1 support acquisition');
console.log('  matched control remains wide-limit; candidate adds only the E10.0b cache-cleared exact-current-angle brace after the same 90f dual-support settle');
console.log(
  `  demand=atan2(31,20)=${(DEMAND_TILT_MAGNITUDE / DEG).toFixed(2)}deg; ` +
  `HOLD reuses E4.3 target±2deg |omega|<=${ANGULAR_SPEED_TOLERANCE.toFixed(2)}rad/s ` +
  `footTilt<=${(FOOT_TILT_TOLERANCE / DEG).toFixed(0)}deg x${HOLD_REQUIRED}f`,
);
console.log(
  `  brace success requires: control FALL reproduces E7.2b; candidate HOLD with zero support loss; ` +
  `probe>${MIN_BODY_TRANSFER_PROBE_LOAD.toFixed(4)}Ns BOTH E5 channels; ` +
  `probe gain + primary unload>${E5_CALIBRATION_TOLERANCE.toFixed(4)}Ns; total=${EXPECTED_TOTAL_SUPPORT_IMPULSE.toFixed(4)}±${E5_CALIBRATION_TOLERANCE.toFixed(4)}Ns`,
);

const pairs = [];
let failures = 0;
for (const direction of [-1, 1]) {
  const control = runArm(direction, false);
  const brace = runArm(direction, true);
  pairs.push({ direction, control, brace });

  if (
    control.acquiredFrame !== brace.acquiredFrame ||
    Math.abs(control.preLatch.angle - brace.preLatch.angle) > PREMATCH_TOLERANCE ||
    Math.abs(control.preLatch.relativeW - brace.preLatch.relativeW) > PREMATCH_TOLERANCE ||
    Math.abs(control.preLatch.wholeComZ - brace.preLatch.wholeComZ) > PREMATCH_TOLERANCE
  ) {
    throw new Error(`E10.1b matched arms diverged before latch dir=${direction}`);
  }

  const pass = bracePass(control, brace);
  if (!pass) failures += 1;

  const b = brace.baseline;
  const h = brace.hold;
  const probeGainFinal = h ? h.probeFinal - b.probeFinal : NaN;
  const probeGainNative = h ? h.probeNative - b.probeNative : NaN;
  const footDropFinal = h ? b.footFinal - h.footFinal : NaN;
  const footDropNative = h ? b.footNative - h.footNative : NaN;

  console.log(
    `  dir=${direction > 0 ? '+' : '-'} acq=${brace.acquiredFrame} latch=${(brace.latchAngle / DEG).toFixed(3)}deg ` +
    `target=${brace.targetTiltDeg.toFixed(2)}deg control=${control.outcome}(bestErr=${control.bestTargetErrorDeg.toFixed(2)} peak=${control.peakTargetPhaseTiltDeg.toFixed(2)} loss=${control.targetPhaseFootLoss}/${control.targetPhaseProbeLoss}) ` +
    `brace=${brace.outcome}(bestErr=${brace.bestTargetErrorDeg.toFixed(2)} peak=${brace.peakTargetPhaseTiltDeg.toFixed(2)} loss=${brace.targetPhaseFootLoss}/${brace.targetPhaseProbeLoss}) ` +
    `lockDrift=${(brace.maxLockDrift / DEG).toFixed(5)}deg => ${pass ? 'PASS' : 'FAIL'}`,
  );
  console.log(
    `      brace upright foot=${b.footFinal.toFixed(4)}/${b.footNative.toFixed(4)} ` +
    `probe=${b.probeFinal.toFixed(4)}/${b.probeNative.toFixed(4)} total=${b.totalFinal.toFixed(4)}/${b.totalNative.toFixed(4)}Ns`,
  );
  if (h) {
    console.log(
      `      brace HOLD    foot=${h.footFinal.toFixed(4)}/${h.footNative.toFixed(4)} ` +
      `probe=${h.probeFinal.toFixed(4)}/${h.probeNative.toFixed(4)} ` +
      `probeGain=${probeGainFinal.toFixed(4)}/${probeGainNative.toFixed(4)} ` +
      `footDrop=${footDropFinal.toFixed(4)}/${footDropNative.toFixed(4)} ` +
      `total=${h.totalFinal.toFixed(4)}/${h.totalNative.toFixed(4)}Ns jointFy=${h.meanJointFy.toFixed(1)}N`,
    );
  }
}

const acquisitionGap = Math.abs(pairs[0].brace.acquiredFrame - pairs[1].brace.acquiredFrame);
if (acquisitionGap > MIRROR_ACQUISITION_TOLERANCE) {
  throw new Error(`E10.1b acquisition mirror gap ${acquisitionGap}f exceeds E7.1 boundary`);
}
if (pairs.every(pair => pair.brace.hold)) {
  const mirrorFinal = Math.abs(pairs[0].brace.hold.probeFinal - pairs[1].brace.hold.probeFinal);
  const mirrorNative = Math.abs(pairs[0].brace.hold.probeNative - pairs[1].brace.hold.probeNative);
  if (mirrorFinal > E5_CALIBRATION_TOLERANCE || mirrorNative > E5_CALIBRATION_TOLERANCE) {
    failures += 1;
    console.log(`  mirror braced probe-load gap=${mirrorFinal.toFixed(4)}/${mirrorNative.toFixed(4)}Ns > one E5 band`);
  }
}

if (failures > 0) {
  throw new Error(`E10.1b demand-aligned brace stability gate failed in ${failures} check(s)`);
}

console.log('E10.1b PASS: the exact current31 demand that previously made the unlatched E7.2b support takeover unstable remains a FALL/FALL negative control, while adding only the already-qualified current-angle brace converts both mirrors into clean E4.3-style dual-support HOLD. During those stable holds the real probe carries meaningful body load in both independent E5-calibrated channels, the primary foot unloads by more than one calibration band, total 80kg support remains conserved, and no support loss, non-ground contact, new body, new translational authority, or parameter sweep is introduced. This would qualify demand-recruited stable load sharing only; it would still not prove current31/current36 translational agency or gameplay feel.');