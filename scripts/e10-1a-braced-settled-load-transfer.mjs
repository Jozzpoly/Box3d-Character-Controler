import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';
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
const POST_LATCH_SETTLE_FRAMES = 30; // exact E10.0b qualified transition window
const SAMPLE_FRAMES = 60; // exact E7.2a settled-load window
const LOAD_EPS = 1e-6;
const DEG = Math.PI / 180;
const TARGET_ANGLE = 140 * DEG;
const LIMIT_ANGLE = 145 * DEG;
const SQRT_HALF = Math.SQRT1_2;
const SAGITTAL_HINGE_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];

const PROBE_MASS = 1;
const PROBE_LENGTH = 0.9;
const PROBE_HALF = [0.06, PROBE_LENGTH / 2, 0.06];
const TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - PROBE_MASS;

// Exact E7.1 finite internal placement actuator.
const PROBE_I_CM_X = (PROBE_MASS / 12) * (PROBE_LENGTH ** 2 + (2 * PROBE_HALF[2]) ** 2);
const PROBE_I_PIVOT_X = PROBE_I_CM_X + PROBE_MASS * (PROBE_LENGTH / 2) ** 2;
const PROBE_MAX_GRAVITY_MOMENT = PROBE_MASS * G * (PROBE_LENGTH / 2);
const PROBE_TORQUE_CAP = 2 * PROBE_MAX_GRAVITY_MOMENT;
const PROBE_NATURAL_FREQUENCY = 8;
const PROBE_KP = PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY ** 2;
const PROBE_KD = 2 * PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY;

// Reuse E5.0a / E7.2a quantitative boundaries unchanged.
const EXPECTED_TOTAL_SUPPORT_IMPULSE = TOTAL_MASS * G * DT;
const PROBE_OWN_WEIGHT_IMPULSE = PROBE_MASS * G * DT;
const E5_CALIBRATION_TOLERANCE = 0.03 * EXPECTED_TOTAL_SUPPORT_IMPULSE; // 0.8 Ns
const MIN_BODY_TRANSFER_PROBE_LOAD = PROBE_OWN_WEIGHT_IMPULSE + E5_CALIBRATION_TOLERANCE;
const MAX_LOCK_DRIFT = 0.25 * DEG;
const MIRROR_ACQUISITION_TOLERANCE = 6;
const PREMATCH_TOLERANCE = 1e-9;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function densityForMass(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function within(v, target, tol) { return Math.abs(v - target) <= tol; }
function sameShapeId(a, b) {
  return Boolean(a && b) && a.index1 === b.index1 && a.world0 === b.world0 && a.generation === b.generation;
}
function bodyAngularVelocity(body) {
  const out = [0, 0, 0]; b3.b3Body_GetAngularVelocity(out, body); return out;
}
function bodyLinearVelocity(body) {
  const out = [0, 0, 0]; b3.b3Body_GetLinearVelocity(out, body); return out;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef(); wd.gravity = [0, -G, 0]; return b3.b3CreateWorld(wd);
}
function makePlatform(world) {
  const half = [2, 0.25, 30];
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody; bd.position = [0, -half[1], 0]; bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef(); sd.baseMaterial.friction = MU; sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...half);
  return { body, shape };
}
function makeProbe(world, pivot) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [pivot[0], pivot[1] + PROBE_HALF[1], pivot[2]];
  bd.linearDamping = 0.015; bd.angularDamping = 0.015; bd.enableSleep = false; bd.enableContactRecycling = false;
  bd.motionLocks.linearX = true; bd.motionLocks.angularY = true; bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForMass(PROBE_MASS, PROBE_HALF);
  sd.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction; sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...PROBE_HALF);
  return { body, shape };
}
function createRig() {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: PRIMARY_BALANCE_TORQUE, torsoMass: TORSO_MASS });
  const probePart = makeProbe(world, organism.startTorsoPosition);
  const hinge = b3.b3DefaultRevoluteJointDef();
  hinge.base.bodyIdA = organism.torso; hinge.base.bodyIdB = probePart.body;
  hinge.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.base.localFrameB = { position: [0, -PROBE_HALF[1], 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.enableSpring = false; hinge.enableLimit = true; hinge.lowerAngle = -LIMIT_ANGLE; hinge.upperAngle = LIMIT_ANGLE; hinge.enableMotor = false;
  const joint = b3.b3CreateRevoluteJoint(world, hinge);
  const probeMass = b3.b3Body_GetMass(probePart.body);
  const mass = organism.footMass + organism.torsoMass + probeMass;
  if (Math.abs(mass - TOTAL_MASS) > 1e-3) throw new Error(`E10.1a organism mass ${mass} != ${TOTAL_MASS}kg`);
  return { world, organism, probe: probePart.body, probeShape: probePart.shape, groundShape: platform.shape, joint, probeMass };
}

function makeGroundLoadReader(body, ownedShape, groundShape, label) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  return {
    read() {
      b3.getBodyContactData(buffer, body);
      let groundRaw = 0, otherRaw = 0, groundTouching = 0, groundLoaded = 0, otherLoaded = 0;
      let normalImpulse = 0, totalNormalImpulse = 0;
      for (let i = 0; i < b3.getNumContacts(buffer); i++) {
        b3.getContactAt(contact, buffer, i);
        const ownedIsA = sameShapeId(contact.shapeIdA, ownedShape);
        const ownedIsB = sameShapeId(contact.shapeIdB, ownedShape);
        if (ownedIsA === ownedIsB) throw new Error(`E10.1a ${label} contact ownership invalid`);
        const isGround = sameShapeId(ownedIsA ? contact.shapeIdB : contact.shapeIdA, groundShape);
        if (isGround) groundRaw += 1; else otherRaw += 1;
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
            } else if (loaded) otherLoaded += 1;
          }
        }
      }
      return {
        groundRaw, otherRaw, groundTouching, groundLoaded, otherLoaded,
        reactive: groundTouching > 0 || groundLoaded > 0,
        finalScaledImpulse: normalImpulse * SUBSTEPS,
        nativeEquivalentImpulse: 0.5 * totalNormalImpulse,
      };
    },
    destroy() { b3.destroyContactsBuffer(buffer); },
  };
}
function makeReaders(rig) {
  return {
    foot: makeGroundLoadReader(rig.organism.foot, rig.organism.footShape, rig.groundShape, 'primary-foot'),
    probe: makeGroundLoadReader(rig.probe, rig.probeShape, rig.groundShape, 'probe'),
  };
}

function applyPrimaryBalance(organism, supported) {
  organism._sync();
  const requested = -organism.kp * organism.torsoTilt - organism.kd * organism.torsoAngularVelocity[0];
  const torque = supported ? clamp(requested, -organism.maxTorque, organism.maxTorque) : 0;
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
  const torque = clamp(PROBE_KP * (targetAngle - angle) - PROBE_KD * relativeW, -PROBE_TORQUE_CAP, PROBE_TORQUE_CAP);
  if (Math.abs(torque) > 1e-9) {
    const impulse = torque * DT;
    b3.b3Body_ApplyAngularImpulse(rig.probe, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.organism.torso, [-impulse, 0, 0], true);
  }
  return { angle, relativeW, torque };
}
function stepRig(rig, readers, targetAngle) {
  const footBefore = readers.foot.read();
  applyPrimaryBalance(rig.organism, footBefore.reactive);
  const actuator = applyProbeActuator(rig, targetAngle);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
  const jointForce = [0, 0, 0]; b3.b3Joint_GetConstraintForce(jointForce, rig.joint);
  const footV = bodyLinearVelocity(rig.organism.foot), torsoV = bodyLinearVelocity(rig.organism.torso), probeV = bodyLinearVelocity(rig.probe);
  const wholeVy = (rig.organism.footMass * footV[1] + rig.organism.torsoMass * torsoV[1] + rig.probeMass * probeV[1]) / TOTAL_MASS;
  const probeW = bodyAngularVelocity(rig.probe); rig.organism._sync();
  return {
    foot: readers.foot.read(), probe: readers.probe.read(), actuator,
    jointForceY: jointForce[1], wholeVy,
    angle: b3.b3RevoluteJoint_GetAngle(rig.joint),
    relativeW: probeW[0] - rig.organism.torsoAngularVelocity[0],
  };
}
function latchAtCurrentAngle(rig, angle) {
  b3.b3RevoluteJoint_EnableLimit(rig.joint, false);
  b3.b3RevoluteJoint_SetLimits(rig.joint, angle, angle);
  b3.b3RevoluteJoint_EnableLimit(rig.joint, true);
}

function makeAccumulator() {
  return { frames: 0, footFinal: 0, footNative: 0, probeFinal: 0, probeNative: 0, jointFy: 0, absJointFy: 0, maxAbsWholeVy: 0, footLoss: 0, probeLoss: 0, footOtherRaw: 0, probeOtherRaw: 0, probeOtherLoaded: 0 };
}
function addSample(acc, s) {
  acc.frames++;
  acc.footFinal += s.foot.finalScaledImpulse; acc.footNative += s.foot.nativeEquivalentImpulse;
  acc.probeFinal += s.probe.finalScaledImpulse; acc.probeNative += s.probe.nativeEquivalentImpulse;
  acc.jointFy += s.jointForceY; acc.absJointFy += Math.abs(s.jointForceY);
  acc.maxAbsWholeVy = Math.max(acc.maxAbsWholeVy, Math.abs(s.wholeVy));
  if (!s.foot.reactive) acc.footLoss++; if (!s.probe.reactive) acc.probeLoss++;
  acc.footOtherRaw = Math.max(acc.footOtherRaw, s.foot.otherRaw); acc.probeOtherRaw = Math.max(acc.probeOtherRaw, s.probe.otherRaw); acc.probeOtherLoaded = Math.max(acc.probeOtherLoaded, s.probe.otherLoaded);
}
function finishAccumulator(a) {
  const n = a.frames;
  return {
    frames: n, footFinal: a.footFinal / n, footNative: a.footNative / n, probeFinal: a.probeFinal / n, probeNative: a.probeNative / n,
    totalFinal: (a.footFinal + a.probeFinal) / n, totalNative: (a.footNative + a.probeNative) / n,
    meanJointFy: a.jointFy / n, meanAbsJointFy: a.absJointFy / n, maxAbsWholeVy: a.maxAbsWholeVy,
    footLoss: a.footLoss, probeLoss: a.probeLoss, footOtherRaw: a.footOtherRaw, probeOtherRaw: a.probeOtherRaw, probeOtherLoaded: a.probeOtherLoaded,
  };
}
function destroyRig(rig, readers) { readers.foot.destroy(); readers.probe.destroy(); b3.b3DestroyWorld(rig.world); }

function runArm(direction, braced) {
  const rig = createRig(); const readers = makeReaders(rig);
  let initialFootLoss = 0, preGroundRaw = 0, preOtherRaw = 0;
  for (let f = 0; f < INITIAL_SETTLE_FRAMES; f++) {
    const s = stepRig(rig, readers, 0);
    if (!s.foot.reactive) initialFootLoss++;
    preGroundRaw = Math.max(preGroundRaw, s.probe.groundRaw);
    preOtherRaw = Math.max(preOtherRaw, s.foot.otherRaw, s.probe.otherRaw);
  }

  let loadedStreak = 0, acquiredFrame = -1, acquisitionFootLoss = 0, acquisitionOtherRaw = 0;
  for (let f = 0; f < ACQUISITION_WINDOW; f++) {
    const s = stepRig(rig, readers, direction * TARGET_ANGLE);
    if (!s.foot.reactive) acquisitionFootLoss++;
    acquisitionOtherRaw = Math.max(acquisitionOtherRaw, s.foot.otherRaw, s.probe.otherRaw);
    if (s.probe.groundLoaded > 0) {
      loadedStreak++;
      if (loadedStreak >= ACQUIRE_STREAK) { acquiredFrame = f - ACQUIRE_STREAK + 1; break; }
    } else loadedStreak = 0;
  }
  if (acquiredFrame < 0) { destroyRig(rig, readers); throw new Error(`E10.1a acquisition failed dir=${direction}`); }

  let dualFootLoss = 0, dualProbeLoss = 0, dualOtherRaw = 0;
  for (let f = 0; f < DUAL_SETTLE_FRAMES; f++) {
    const s = stepRig(rig, readers, direction * TARGET_ANGLE);
    if (!s.foot.reactive) dualFootLoss++; if (!s.probe.reactive) dualProbeLoss++;
    dualOtherRaw = Math.max(dualOtherRaw, s.foot.otherRaw, s.probe.otherRaw);
  }

  const before = stepRig(rig, readers, direction * TARGET_ANGLE);
  const latchAngle = before.angle;
  if (braced) latchAtCurrentAngle(rig, latchAngle);

  let postFootLoss = 0, postProbeLoss = 0, postOtherRaw = 0, maxLockDrift = 0;
  for (let f = 0; f < POST_LATCH_SETTLE_FRAMES; f++) {
    const s = stepRig(rig, readers, direction * TARGET_ANGLE);
    if (!s.foot.reactive) postFootLoss++; if (!s.probe.reactive) postProbeLoss++;
    postOtherRaw = Math.max(postOtherRaw, s.foot.otherRaw, s.probe.otherRaw);
    if (braced) maxLockDrift = Math.max(maxLockDrift, Math.abs(s.angle - latchAngle));
  }

  const acc = makeAccumulator();
  for (let f = 0; f < SAMPLE_FRAMES; f++) {
    const s = stepRig(rig, readers, direction * TARGET_ANGLE);
    addSample(acc, s);
    if (braced) maxLockDrift = Math.max(maxLockDrift, Math.abs(s.angle - latchAngle));
  }

  const result = {
    direction, braced, acquiredFrame, initialFootLoss, preGroundRaw, preOtherRaw,
    acquisitionFootLoss, acquisitionOtherRaw, dualFootLoss, dualProbeLoss, dualOtherRaw,
    postFootLoss, postProbeLoss, postOtherRaw,
    preAngle: before.angle, preRelativeW: before.relativeW,
    preFootFinal: before.foot.finalScaledImpulse, preFootNative: before.foot.nativeEquivalentImpulse,
    preProbeFinal: before.probe.finalScaledImpulse, preProbeNative: before.probe.nativeEquivalentImpulse,
    latchAngle, maxLockDrift, ...finishAccumulator(acc),
    fall: rig.organism.fallObserved, peakTorsoTiltDeg: rig.organism.peakAbsTilt / DEG,
    terminalProbeAngleDeg: b3.b3RevoluteJoint_GetAngle(rig.joint) / DEG,
  };
  destroyRig(rig, readers); return result;
}

function clean(row) {
  return row.initialFootLoss === 0 && row.preGroundRaw === 0 && row.preOtherRaw === 0 &&
    row.acquisitionFootLoss === 0 && row.acquisitionOtherRaw === 0 && row.dualFootLoss === 0 && row.dualProbeLoss === 0 && row.dualOtherRaw === 0 &&
    row.postFootLoss === 0 && row.postProbeLoss === 0 && row.postOtherRaw === 0 && row.footLoss === 0 && row.probeLoss === 0 &&
    row.footOtherRaw === 0 && row.probeOtherRaw === 0 && row.probeOtherLoaded === 0 && !row.fall;
}
function meaningfulBraceTransfer(control, brace) {
  return clean(control) && clean(brace) &&
    control.probeFinal < MIN_BODY_TRANSFER_PROBE_LOAD && control.probeNative < MIN_BODY_TRANSFER_PROBE_LOAD &&
    within(control.totalFinal, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) && within(control.totalNative, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) &&
    within(brace.totalFinal, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) && within(brace.totalNative, EXPECTED_TOTAL_SUPPORT_IMPULSE, E5_CALIBRATION_TOLERANCE) &&
    brace.probeFinal > MIN_BODY_TRANSFER_PROBE_LOAD && brace.probeNative > MIN_BODY_TRANSFER_PROBE_LOAD &&
    control.footFinal - brace.footFinal > E5_CALIBRATION_TOLERANCE && control.footNative - brace.footNative > E5_CALIBRATION_TOLERANCE &&
    brace.maxLockDrift <= MAX_LOCK_DRIFT;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || TOTAL_MASS !== 80) throw new Error('E10.1a expected current Donor-v1/E5 substrate');
for (const fn of ['b3RevoluteJoint_GetAngle', 'b3RevoluteJoint_SetLimits', 'b3RevoluteJoint_EnableLimit']) {
  if (typeof b3[fn] !== 'function') throw new Error(`E10.1a requires ${fn}`);
}

console.log('E10.1a braced settled body-load-transfer falsifier');
console.log('  matched arms: exact E7.1 one-piece probe acquisition + E7.2a 90f settle; only brace arm latches existing revolute at measured current angle');
console.log(`  after latch: ${POST_LATCH_SETTLE_FRAMES}f qualified transition continuation, then ${SAMPLE_FRAMES}f settled load sample; finite 18Nm placement actuator remains identical in both arms`);
console.log(`  unchanged E5/E7 gates: expected=${EXPECTED_TOTAL_SUPPORT_IMPULSE.toFixed(6)}Ns tol=${E5_CALIBRATION_TOLERANCE.toFixed(6)} probeOwn=${PROBE_OWN_WEIGHT_IMPULSE.toFixed(6)} meaningful>${MIN_BODY_TRANSFER_PROBE_LOAD.toFixed(6)}Ns BOTH channels; primary unload>${E5_CALIBRATION_TOLERANCE.toFixed(6)}Ns`);

const pairs = [];
for (const direction of [-1, 1]) {
  const control = runArm(direction, false);
  const brace = runArm(direction, true);
  pairs.push({ direction, control, brace });

  if (control.acquiredFrame !== brace.acquiredFrame || Math.abs(control.preAngle - brace.preAngle) > PREMATCH_TOLERANCE || Math.abs(control.preRelativeW - brace.preRelativeW) > PREMATCH_TOLERANCE) {
    throw new Error(`E10.1a matched arms diverged before latch dir=${direction}`);
  }

  const footDropFinal = control.footFinal - brace.footFinal;
  const footDropNative = control.footNative - brace.footNative;
  console.log(`  dir=${direction > 0 ? '+' : '-'} acquired=${brace.acquiredFrame} latch=${(brace.latchAngle / DEG).toFixed(3)}deg preRelW=${brace.preRelativeW.toFixed(5)}rad/s`);
  console.log(`      control foot=${control.footFinal.toFixed(4)}/${control.footNative.toFixed(4)} probe=${control.probeFinal.toFixed(4)}/${control.probeNative.toFixed(4)} total=${control.totalFinal.toFixed(4)}/${control.totalNative.toFixed(4)}Ns`);
  console.log(`      brace   foot=${brace.footFinal.toFixed(4)}/${brace.footNative.toFixed(4)} probe=${brace.probeFinal.toFixed(4)}/${brace.probeNative.toFixed(4)} total=${brace.totalFinal.toFixed(4)}/${brace.totalNative.toFixed(4)}Ns footDrop=${footDropFinal.toFixed(4)}/${footDropNative.toFixed(4)} lockDrift=${(brace.maxLockDrift / DEG).toFixed(6)}deg jointFyAbs=${brace.meanAbsJointFy.toFixed(2)}N loss=${brace.footLoss}/${brace.probeLoss} other=${brace.footOtherRaw}/${brace.probeOtherRaw}`);

  if (!meaningfulBraceTransfer(control, brace)) throw new Error(`E10.1a meaningful braced body-load-transfer gate failed dir=${direction}`);
}

const acquisitionGap = Math.abs(pairs[0].brace.acquiredFrame - pairs[1].brace.acquiredFrame);
if (acquisitionGap > MIRROR_ACQUISITION_TOLERANCE) throw new Error(`E10.1a acquisition mirror gap ${acquisitionGap}f`);
const mirrorFinal = Math.abs(pairs[0].brace.probeFinal - pairs[1].brace.probeFinal);
const mirrorNative = Math.abs(pairs[0].brace.probeNative - pairs[1].brace.probeNative);
if (mirrorFinal > E5_CALIBRATION_TOLERANCE || mirrorNative > E5_CALIBRATION_TOLERANCE) throw new Error(`E10.1a braced probe load not mirrored inside one E5 band: ${mirrorFinal}/${mirrorNative}Ns`);

console.log('E10.1a PASS: after real mirrored E7.1 ground acquisition, the existing one-piece probe revolute can be braced at its measured current angle and, after the already-qualified 30-frame transition window, carry meaningful settled body load in both independent E5-calibrated contact-impulse channels. Relative to the matched unlatched E7 control, primary-foot load falls by more than one full E5 calibration band while total 80kg support remains conserved, both real supports remain continuous and uncontaminated, and the brace stays inside the unchanged 0.25deg lock envelope. This would qualify stable settled load transmission only; it would still not prove regulatable load sharing, current31/36 translational agency, or gameplay feel.');