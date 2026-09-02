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
const TOTAL_MASS = DONOR_PROFILE_V1.virtualMass;
const PRIMARY_BALANCE_TORQUE = 320;
const MU = 0.95;
const INITIAL_SETTLE_FRAMES = 90;
const ACQUISITION_WINDOW = 180;
const ACQUIRE_STREAK = 5;
const DUAL_SETTLE_FRAMES = 90;
const SAMPLE_FRAMES = 60;
const LOAD_EPS = 1e-6;
const DEG = Math.PI / 180;
const TARGET_ANGLE = 140 * DEG;
const LIMIT_ANGLE = 145 * DEG;
const SQRT_HALF = Math.SQRT1_2;
const SAGITTAL_HINGE_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];

const PROBE_MASS = 1;
const PROBE_LENGTH = 0.9;
const PROBE_HALF = [0.06, PROBE_LENGTH / 2, 0.06];
const CANDIDATE_TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - PROBE_MASS;

// Exact E7.1 actuator specimen. E7.2 changes observation, not mechanics.
const PROBE_I_CM_X =
  (PROBE_MASS / 12) * (PROBE_LENGTH * PROBE_LENGTH + (2 * PROBE_HALF[2]) ** 2);
const PROBE_I_PIVOT_X = PROBE_I_CM_X + PROBE_MASS * (PROBE_LENGTH / 2) ** 2;
const PROBE_MAX_GRAVITY_MOMENT = PROBE_MASS * G * (PROBE_LENGTH / 2);
const PROBE_TORQUE_CAP = 2 * PROBE_MAX_GRAVITY_MOMENT;
const PROBE_NATURAL_FREQUENCY = 8;
const PROBE_KP = PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY ** 2;
const PROBE_KD = 2 * PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY;

// E5.0a calibration on the pinned flat substrate:
//   normalImpulse * substeps ~= M*g*dt
//   0.5 * totalNormalImpulse ~= M*g*dt
// with a declared 3% calibration tolerance.
const EXPECTED_TOTAL_SUPPORT_IMPULSE = TOTAL_MASS * G * DT;
const PROBE_OWN_WEIGHT_IMPULSE = PROBE_MASS * G * DT;
const E5_CALIBRATION_TOLERANCE = 0.03 * EXPECTED_TOTAL_SUPPORT_IMPULSE;
const MIN_BODY_TRANSFER_PROBE_LOAD = PROBE_OWN_WEIGHT_IMPULSE + E5_CALIBRATION_TOLERANCE;

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
  hinge.lowerAngle = -LIMIT_ANGLE;
  hinge.upperAngle = LIMIT_ANGLE;
  hinge.enableMotor = false;
  const joint = b3.b3CreateRevoluteJoint(world, hinge);

  const probeMass = b3.b3Body_GetMass(probePart.body);
  const mass = organism.footMass + organism.torsoMass + probeMass;
  if (Math.abs(mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E7.2a organism mass ${mass} != ${TOTAL_MASS} kg`);
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
          throw new Error(`E7.2a ${label} contact does not contain exactly one owned shape id`);
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
        rawContacts,
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

function applyPrimaryBalance(organism, supported) {
  organism._sync();
  const requested =
    -organism.kp * organism.torsoTilt -
    organism.kd * organism.torsoAngularVelocity[0];
  const torque = supported
    ? clamp(requested, -organism.maxTorque, organism.maxTorque)
    : 0;
  if (Math.abs(torque) < 1e-9) return;
  const impulse = torque * DT;
  b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(organism.foot, [-impulse, 0, 0], true);
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

function stepRig(rig, footReader, probeReader, targetAngle) {
  const footBefore = footReader.read();
  applyPrimaryBalance(rig.organism, footBefore.reactive);
  const actuator = applyProbeActuator(rig, targetAngle);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();

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

  return {
    foot: footReader.read(),
    probe: probeReader.read(),
    actuator,
    jointForceY: jointForce[1],
    wholeVy,
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
    maxAbsWholeVy: 0,
    footLoss: 0,
    probeLoss: 0,
    footOtherRaw: 0,
    probeOtherRaw: 0,
    probeOtherLoaded: 0,
  };
}

function addSample(acc, state, expectProbeSupport) {
  acc.frames += 1;
  acc.footFinal += state.foot.finalScaledImpulse;
  acc.footNative += state.foot.nativeEquivalentImpulse;
  acc.probeFinal += state.probe.finalScaledImpulse;
  acc.probeNative += state.probe.nativeEquivalentImpulse;
  acc.jointFy += state.jointForceY;
  acc.absJointFy += Math.abs(state.jointForceY);
  acc.maxAbsWholeVy = Math.max(acc.maxAbsWholeVy, Math.abs(state.wholeVy));
  if (!state.foot.reactive) acc.footLoss += 1;
  if (expectProbeSupport && !state.probe.reactive) acc.probeLoss += 1;
  acc.footOtherRaw = Math.max(acc.footOtherRaw, state.foot.otherRaw);
  acc.probeOtherRaw = Math.max(acc.probeOtherRaw, state.probe.otherRaw);
  acc.probeOtherLoaded = Math.max(acc.probeOtherLoaded, state.probe.otherLoaded);
}

function finishAccumulator(acc) {
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
    maxAbsWholeVy: acc.maxAbsWholeVy,
    footLoss: acc.footLoss,
    probeLoss: acc.probeLoss,
    footOtherRaw: acc.footOtherRaw,
    probeOtherRaw: acc.probeOtherRaw,
    probeOtherLoaded: acc.probeOtherLoaded,
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

function destroyRig(rig, readers) {
  readers.foot.destroy();
  readers.probe.destroy();
  b3.b3DestroyWorld(rig.world);
}

function runControl() {
  const rig = createRig();
  const readers = makeReaders(rig);

  for (let frame = 0; frame < INITIAL_SETTLE_FRAMES; frame++) {
    const state = stepRig(rig, readers.foot, readers.probe, 0);
    if (state.probe.groundRaw !== 0 || state.probe.otherRaw !== 0) {
      throw new Error('E7.2a target0 probe contacted during initial settle');
    }
  }

  const acc = makeAccumulator();
  for (let frame = 0; frame < SAMPLE_FRAMES; frame++) {
    const state = stepRig(rig, readers.foot, readers.probe, 0);
    addSample(acc, state, false);
    if (state.probe.groundRaw !== 0 || state.probe.otherRaw !== 0) {
      throw new Error('E7.2a target0 probe contacted during control sample');
    }
  }

  const result = {
    ...finishAccumulator(acc),
    fall: rig.organism.fallObserved,
    peakTorsoTiltDeg: rig.organism.peakAbsTilt / DEG,
  };
  destroyRig(rig, readers);
  return result;
}

function runDualSupport(direction) {
  const rig = createRig();
  const readers = makeReaders(rig);
  let initialFootLoss = 0;
  let preGroundRaw = 0;
  let preOtherRaw = 0;

  for (let frame = 0; frame < INITIAL_SETTLE_FRAMES; frame++) {
    const state = stepRig(rig, readers.foot, readers.probe, 0);
    if (!state.foot.reactive) initialFootLoss += 1;
    preGroundRaw = Math.max(preGroundRaw, state.probe.groundRaw);
    preOtherRaw = Math.max(preOtherRaw, state.probe.otherRaw);
  }

  let loadedStreak = 0;
  let acquiredFrame = -1;
  let acquisitionFootLoss = 0;
  let acquisitionOtherRaw = 0;
  for (let frame = 0; frame < ACQUISITION_WINDOW; frame++) {
    const state = stepRig(rig, readers.foot, readers.probe, direction * TARGET_ANGLE);
    if (!state.foot.reactive) acquisitionFootLoss += 1;
    acquisitionOtherRaw = Math.max(
      acquisitionOtherRaw,
      state.foot.otherRaw,
      state.probe.otherRaw,
    );
    if (state.probe.groundLoaded > 0) {
      loadedStreak += 1;
      if (loadedStreak >= ACQUIRE_STREAK) {
        acquiredFrame = frame - ACQUIRE_STREAK + 1;
        break;
      }
    } else {
      loadedStreak = 0;
    }
  }

  if (acquiredFrame < 0) {
    destroyRig(rig, readers);
    throw new Error(`E7.2a did not acquire persistent probe ground support dir=${direction}`);
  }

  let dualSettleFootLoss = 0;
  let dualSettleProbeLoss = 0;
  let dualSettleOtherRaw = 0;
  for (let frame = 0; frame < DUAL_SETTLE_FRAMES; frame++) {
    const state = stepRig(rig, readers.foot, readers.probe, direction * TARGET_ANGLE);
    if (!state.foot.reactive) dualSettleFootLoss += 1;
    if (!state.probe.reactive) dualSettleProbeLoss += 1;
    dualSettleOtherRaw = Math.max(
      dualSettleOtherRaw,
      state.foot.otherRaw,
      state.probe.otherRaw,
    );
  }

  const acc = makeAccumulator();
  for (let frame = 0; frame < SAMPLE_FRAMES; frame++) {
    const state = stepRig(rig, readers.foot, readers.probe, direction * TARGET_ANGLE);
    addSample(acc, state, true);
  }

  const result = {
    direction,
    acquiredFrame,
    initialFootLoss,
    preGroundRaw,
    preOtherRaw,
    acquisitionFootLoss,
    acquisitionOtherRaw,
    dualSettleFootLoss,
    dualSettleProbeLoss,
    dualSettleOtherRaw,
    ...finishAccumulator(acc),
    fall: rig.organism.fallObserved,
    peakTorsoTiltDeg: rig.organism.peakAbsTilt / DEG,
    terminalProbeAngleDeg: b3.b3RevoluteJoint_GetAngle(rig.joint) / DEG,
  };
  destroyRig(rig, readers);
  return result;
}

function within(value, target, tolerance) {
  return Math.abs(value - target) <= tolerance;
}

function loadTransferPass(row, control) {
  const commonClean =
    row.initialFootLoss === 0 &&
    row.preGroundRaw === 0 &&
    row.preOtherRaw === 0 &&
    row.acquisitionFootLoss === 0 &&
    row.acquisitionOtherRaw === 0 &&
    row.dualSettleFootLoss === 0 &&
    row.dualSettleProbeLoss === 0 &&
    row.dualSettleOtherRaw === 0 &&
    row.footLoss === 0 &&
    row.probeLoss === 0 &&
    row.footOtherRaw === 0 &&
    row.probeOtherRaw === 0 &&
    row.probeOtherLoaded === 0 &&
    !row.fall;

  const finalChannel =
    within(row.totalFinal, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) &&
    row.probeFinal > MIN_BODY_TRANSFER_PROBE_LOAD &&
    control.footFinal - row.footFinal > E5_CALIBRATION_TOLERANCE;

  const nativeChannel =
    within(row.totalNative, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) &&
    row.probeNative > MIN_BODY_TRANSFER_PROBE_LOAD &&
    control.footNative - row.footNative > E5_CALIBRATION_TOLERANCE;

  return commonClean && finalChannel && nativeChannel;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || TOTAL_MASS !== 80) {
  throw new Error('E7.2a expected the current Donor-v1/E5 substrate');
}

console.log('E7.2a settled parallel-support load-transfer crucible');
console.log('  mechanics: exact E7.1 probe/acquisition specimen; only post-acquisition settling + load accounting are new');
console.log(
  `  E5 load calibration: expected80kg=${EXPECTED_TOTAL_SUPPORT_IMPULSE.toFixed(6)}Ns/frame ` +
  `tol3%=${E5_CALIBRATION_TOLERANCE.toFixed(6)}Ns probeOwn1kg=${PROBE_OWN_WEIGHT_IMPULSE.toFixed(6)}Ns`,
);
console.log(
  `  body-transfer gate: probeLoad > ownWeight + one E5 tolerance = ` +
  `${MIN_BODY_TRANSFER_PROBE_LOAD.toFixed(6)}Ns in BOTH calibrated impulse channels`,
);

const control = runControl();
console.log(
  `  control target0: foot final/native=${control.footFinal.toFixed(4)}/${control.footNative.toFixed(4)}Ns ` +
  `probe=${control.probeFinal.toFixed(4)}/${control.probeNative.toFixed(4)} ` +
  `total=${control.totalFinal.toFixed(4)}/${control.totalNative.toFixed(4)} ` +
  `footLoss=${control.footLoss} other=${control.footOtherRaw}/${control.probeOtherRaw} ` +
  `wholeVyMax=${control.maxAbsWholeVy.toFixed(5)}m/s peakTorso=${control.peakTorsoTiltDeg.toFixed(3)}deg`,
);

if (
  control.fall ||
  control.footLoss !== 0 ||
  control.footOtherRaw !== 0 ||
  control.probeOtherRaw !== 0 ||
  Math.abs(control.probeFinal) > LOAD_EPS ||
  Math.abs(control.probeNative) > LOAD_EPS ||
  !within(control.footFinal, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) ||
  !within(control.footNative, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE)
) {
  throw new Error('E7.2a target0 same-rig load-accounting control failed');
}

const rows = [-1, 1].map(runDualSupport);
for (const row of rows) {
  const probeExcessFinal = row.probeFinal - PROBE_OWN_WEIGHT_IMPULSE;
  const probeExcessNative = row.probeNative - PROBE_OWN_WEIGHT_IMPULSE;
  const footDropFinal = control.footFinal - row.footFinal;
  const footDropNative = control.footNative - row.footNative;
  console.log(
    `  dir=${row.direction > 0 ? '+' : '-'} acquired=${row.acquiredFrame} ` +
    `foot final/native=${row.footFinal.toFixed(4)}/${row.footNative.toFixed(4)} ` +
    `probe=${row.probeFinal.toFixed(4)}/${row.probeNative.toFixed(4)} ` +
    `probeExcessOwn=${probeExcessFinal.toFixed(4)}/${probeExcessNative.toFixed(4)} ` +
    `footDrop=${footDropFinal.toFixed(4)}/${footDropNative.toFixed(4)} ` +
    `total=${row.totalFinal.toFixed(4)}/${row.totalNative.toFixed(4)}Ns ` +
    `jointFy mean/abs=${row.meanJointFy.toFixed(2)}/${row.meanAbsJointFy.toFixed(2)}N ` +
    `loss foot/probe=${row.footLoss}/${row.probeLoss} other=${row.footOtherRaw}/${row.probeOtherRaw} ` +
    `wholeVyMax=${row.maxAbsWholeVy.toFixed(5)}m/s peakTorso=${row.peakTorsoTiltDeg.toFixed(2)}deg ` +
    `probeAngle=${row.terminalProbeAngleDeg.toFixed(2)}deg`,
  );

  if (!loadTransferPass(row, control)) {
    throw new Error(`E7.2a settled body-load-transfer gate failed dir=${row.direction}`);
  }
}

const mirrorProbeFinal = Math.abs(rows[0].probeFinal - rows[1].probeFinal);
const mirrorProbeNative = Math.abs(rows[0].probeNative - rows[1].probeNative);
if (
  mirrorProbeFinal > E5_CALIBRATION_TOLERANCE ||
  mirrorProbeNative > E5_CALIBRATION_TOLERANCE
) {
  throw new Error(
    `E7.2a probe load transfer is not mirrored inside one E5 calibration band: ` +
    `${mirrorProbeFinal.toFixed(4)}/${mirrorProbeNative.toFixed(4)}Ns`,
  );
}

console.log(
  'E7.2a PASS: after finite internal acquisition, the real parallel ground support carries more than its own 1kg weight by at least one full E5.0a calibration band in both independently calibrated contact-impulse channels, while primary-foot load falls and total 80kg support load remains conserved. Joint constraint force is reported as a diagnostic cross-check, not used as a signed pass criterion. This qualifies physically transmitted settled body load; it still does not claim stepping, gait, or added translational agency.',
);
