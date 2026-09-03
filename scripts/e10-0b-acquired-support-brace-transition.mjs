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
const POST_LATCH_FRAMES = 30;
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

// Exact E7.1 placement actuator; E10.0b changes only the revolute limit state.
const PROBE_I_CM_X =
  (PROBE_MASS / 12) * (PROBE_LENGTH * PROBE_LENGTH + (2 * PROBE_HALF[2]) ** 2);
const PROBE_I_PIVOT_X = PROBE_I_CM_X + PROBE_MASS * (PROBE_LENGTH / 2) ** 2;
const PROBE_MAX_GRAVITY_MOMENT = PROBE_MASS * G * (PROBE_LENGTH / 2);
const PROBE_TORQUE_CAP = 2 * PROBE_MAX_GRAVITY_MOMENT;
const PROBE_NATURAL_FREQUENCY = 8;
const PROBE_KP = PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY ** 2;
const PROBE_KD = 2 * PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY;

// Reuse paid-for boundaries rather than tune a new transition envelope.
const E5_CALIBRATION_BAND = 0.03 * TOTAL_MASS * G * DT; // 0.8 Ns
const MAX_FIRST_FRAME_DIFFERENTIAL_IMPULSE = E5_CALIBRATION_BAND;
const MAX_LOCK_DRIFT = 0.25 * DEG; // E7/E8/E10.0a inactive lock envelope
const MAX_PRE_LATCH_RELATIVE_W = 0.16; // E4.3 angular HOLD quietness scale
const MIRROR_ACQUISITION_TOLERANCE = 6; // E7.1 acquisition qualification
const PREMATCH_ANGLE_TOLERANCE = 1e-9;
const PREMATCH_W_TOLERANCE = 1e-9;
const PREMATCH_MOMENTUM_TOLERANCE = 1e-7;

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

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function magnitude(v) {
  return Math.hypot(v[0], v[1], v[2]);
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
    throw new Error(`E10.0b organism mass ${mass} != ${TOTAL_MASS} kg`);
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

function makeGroundReader(body, ownedShape, groundShape, label) {
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

      for (let i = 0; i < rawContacts; i++) {
        b3.getContactAt(contact, buffer, i);
        const ownedIsA = sameShapeId(contact.shapeIdA, ownedShape);
        const ownedIsB = sameShapeId(contact.shapeIdB, ownedShape);
        if (ownedIsA === ownedIsB) {
          throw new Error(`E10.0b ${label} contact does not contain exactly one owned shape id`);
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
            const loaded =
              Math.abs(point.normalImpulse ?? 0) > LOAD_EPS ||
              Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPS;
            if (isGround) {
              if (touching) groundTouching += 1;
              if (loaded) groundLoaded += 1;
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
      };
    },
    destroy() {
      b3.destroyContactsBuffer(buffer);
    },
  };
}

function makeReaders(rig) {
  return {
    foot: makeGroundReader(
      rig.organism.foot,
      rig.organism.footShape,
      rig.groundShape,
      'primary-foot',
    ),
    probe: makeGroundReader(rig.probe, rig.probeShape, rig.groundShape, 'probe'),
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

function wholeBodyMomentum(rig) {
  const foot = scale(bodyLinearVelocity(rig.organism.foot), rig.organism.footMass);
  const torso = scale(bodyLinearVelocity(rig.organism.torso), rig.organism.torsoMass);
  const probe = scale(bodyLinearVelocity(rig.probe), rig.probeMass);
  return add(add(foot, torso), probe);
}

function sampleMechanicalState(rig, readers) {
  rig.organism._sync();
  const probeW = bodyAngularVelocity(rig.probe);
  return {
    foot: readers.foot.read(),
    probe: readers.probe.read(),
    angle: b3.b3RevoluteJoint_GetAngle(rig.joint),
    relativeW: probeW[0] - rig.organism.torsoAngularVelocity[0],
    torsoW: rig.organism.torsoAngularVelocity[0],
    torsoTilt: rig.organism.torsoTilt,
    momentum: wholeBodyMomentum(rig),
  };
}

function stepRig(rig, readers, targetAngle) {
  const footBefore = readers.foot.read();
  applyPrimaryBalance(rig.organism, footBefore.reactive);
  const actuator = applyProbeActuator(rig, targetAngle);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
  return { ...sampleMechanicalState(rig, readers), actuator };
}

function latchAtCurrentAngle(rig, angle) {
  // Pinned-source conservative path: clear any prior limit cache before exact lock.
  b3.b3RevoluteJoint_EnableLimit(rig.joint, false);
  b3.b3RevoluteJoint_SetLimits(rig.joint, angle, angle);
  b3.b3RevoluteJoint_EnableLimit(rig.joint, true);
}

function destroyRig(rig, readers) {
  readers.foot.destroy();
  readers.probe.destroy();
  b3.b3DestroyWorld(rig.world);
}

function run(direction, latched) {
  const rig = createRig();
  const readers = makeReaders(rig);
  let initialFootLoss = 0;
  let preGroundRaw = 0;
  let preOtherRaw = 0;

  for (let frame = 0; frame < INITIAL_SETTLE_FRAMES; frame++) {
    const state = stepRig(rig, readers, 0);
    if (!state.foot.reactive) initialFootLoss += 1;
    preGroundRaw = Math.max(preGroundRaw, state.probe.groundRaw);
    preOtherRaw = Math.max(preOtherRaw, state.foot.otherRaw, state.probe.otherRaw);
  }

  let loadedStreak = 0;
  let acquiredFrame = -1;
  let acquisitionFootLoss = 0;
  let acquisitionOtherRaw = 0;
  for (let frame = 0; frame < ACQUISITION_WINDOW; frame++) {
    const state = stepRig(rig, readers, direction * TARGET_ANGLE);
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

  let settleFootLoss = 0;
  let settleProbeLoss = 0;
  let settleOtherRaw = 0;
  let lastState = null;
  if (acquiredFrame >= 0) {
    for (let frame = 0; frame < DUAL_SETTLE_FRAMES; frame++) {
      lastState = stepRig(rig, readers, direction * TARGET_ANGLE);
      if (!lastState.foot.reactive) settleFootLoss += 1;
      if (!lastState.probe.reactive) settleProbeLoss += 1;
      settleOtherRaw = Math.max(
        settleOtherRaw,
        lastState.foot.otherRaw,
        lastState.probe.otherRaw,
      );
    }
  }

  const before = sampleMechanicalState(rig, readers);
  const latchAngle = before.angle;
  if (latched) latchAtCurrentAngle(rig, latchAngle);

  const first = stepRig(rig, readers, direction * TARGET_ANGLE);
  const firstNetImpulse = sub(first.momentum, before.momentum);
  let postFootLoss = first.foot.reactive ? 0 : 1;
  let postProbeLoss = first.probe.reactive ? 0 : 1;
  let postOtherRaw = Math.max(first.foot.otherRaw, first.probe.otherRaw);
  let postOtherLoaded = Math.max(first.foot.otherLoaded, first.probe.otherLoaded);
  let maxLockDrift = Math.abs(first.angle - latchAngle);
  let maxAbsRelativeW = Math.abs(first.relativeW);

  for (let frame = 1; frame < POST_LATCH_FRAMES; frame++) {
    const state = stepRig(rig, readers, direction * TARGET_ANGLE);
    if (!state.foot.reactive) postFootLoss += 1;
    if (!state.probe.reactive) postProbeLoss += 1;
    postOtherRaw = Math.max(postOtherRaw, state.foot.otherRaw, state.probe.otherRaw);
    postOtherLoaded = Math.max(
      postOtherLoaded,
      state.foot.otherLoaded,
      state.probe.otherLoaded,
    );
    maxLockDrift = Math.max(maxLockDrift, Math.abs(state.angle - latchAngle));
    maxAbsRelativeW = Math.max(maxAbsRelativeW, Math.abs(state.relativeW));
  }

  const result = {
    direction,
    latched,
    acquiredFrame,
    initialFootLoss,
    preGroundRaw,
    preOtherRaw,
    acquisitionFootLoss,
    acquisitionOtherRaw,
    settleFootLoss,
    settleProbeLoss,
    settleOtherRaw,
    before,
    latchAngle,
    first,
    firstNetImpulse,
    postFootLoss,
    postProbeLoss,
    postOtherRaw,
    postOtherLoaded,
    maxLockDrift,
    maxAbsRelativeW,
    fall: rig.organism.fallObserved,
    peakTorsoTiltDeg: rig.organism.peakAbsTilt / DEG,
  };

  destroyRig(rig, readers);
  return result;
}

function cleanPrecondition(row) {
  return row.acquiredFrame >= 0 &&
    row.initialFootLoss === 0 &&
    row.preGroundRaw === 0 &&
    row.preOtherRaw === 0 &&
    row.acquisitionFootLoss === 0 &&
    row.acquisitionOtherRaw === 0 &&
    row.settleFootLoss === 0 &&
    row.settleProbeLoss === 0 &&
    row.settleOtherRaw === 0 &&
    row.before.foot.reactive &&
    row.before.probe.reactive &&
    row.before.foot.groundLoaded > 0 &&
    row.before.probe.groundLoaded > 0 &&
    Math.abs(row.before.relativeW) <= MAX_PRE_LATCH_RELATIVE_W &&
    !row.fall;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || TOTAL_MASS !== 80) {
  throw new Error('E10.0b expected the current Donor-v1/E5 substrate');
}
for (const fn of [
  'b3RevoluteJoint_GetAngle',
  'b3RevoluteJoint_SetLimits',
  'b3RevoluteJoint_EnableLimit',
]) {
  if (typeof b3[fn] !== 'function') throw new Error(`E10.0b requires ${fn} in box3d.js@0.1.1`);
}

console.log('E10.0b acquired-support current-angle brace transition gate');
console.log('  mechanics before transition are exact E7.1/E7.2a: one-piece 1kg x 0.9m probe, ±140deg finite internal placement, 90f dual-support settle');
console.log('  only causal change at transition: cache-cleared exact-current-angle revolute latch; placement actuator remains identical in matched control/candidate');
console.log(
  `  gates: preLatch |relativeW|<=${MAX_PRE_LATCH_RELATIVE_W.toFixed(3)}rad/s ` +
  `first-frame differential whole-body impulse<=${MAX_FIRST_FRAME_DIFFERENTIAL_IMPULSE.toFixed(3)}Ns ` +
  `lockDrift<=${(MAX_LOCK_DRIFT / DEG).toFixed(3)}deg postWindow=${POST_LATCH_FRAMES}f`,
);

const pairs = [];
for (const direction of [-1, 1]) {
  const control = run(direction, false);
  const brace = run(direction, true);
  pairs.push({ direction, control, brace });

  const preMomentumDelta = magnitude(sub(control.before.momentum, brace.before.momentum));
  const impulseDelta = sub(brace.firstNetImpulse, control.firstNetImpulse);
  const impulseDeltaMag = magnitude(impulseDelta);

  console.log(
    `  dir=${direction > 0 ? '+' : '-'} acquired control/brace=${control.acquiredFrame}/${brace.acquiredFrame} ` +
    `preAngle=${(brace.before.angle / DEG).toFixed(3)}deg preRelW=${brace.before.relativeW.toFixed(5)}rad/s ` +
    `preLoaded foot/probe=${brace.before.foot.groundLoaded}/${brace.before.probe.groundLoaded}`,
  );
  console.log(
    `      first ΔP control=[${control.firstNetImpulse.map(v => v.toFixed(4)).join(',')}]Ns ` +
    `brace=[${brace.firstNetImpulse.map(v => v.toFixed(4)).join(',')}]Ns ` +
    `differential=[${impulseDelta.map(v => v.toFixed(4)).join(',')}] |Δ|=${impulseDeltaMag.toFixed(4)}Ns`,
  );
  console.log(
    `      post loss foot/probe control=${control.postFootLoss}/${control.postProbeLoss} ` +
    `brace=${brace.postFootLoss}/${brace.postProbeLoss} other brace=${brace.postOtherRaw}/${brace.postOtherLoaded} ` +
    `lockDrift=${(brace.maxLockDrift / DEG).toFixed(6)}deg maxRelW=${brace.maxAbsRelativeW.toFixed(5)}rad/s ` +
    `peakTorso control/brace=${control.peakTorsoTiltDeg.toFixed(3)}/${brace.peakTorsoTiltDeg.toFixed(3)}deg ` +
    `preMatchP=${preMomentumDelta.toExponential(2)}`,
  );

  if (!cleanPrecondition(control) || !cleanPrecondition(brace)) {
    throw new Error(`E10.0b acquisition/settle precondition failed dir=${direction}`);
  }
  if (control.acquiredFrame !== brace.acquiredFrame) {
    throw new Error(`E10.0b matched arms acquired on different frames dir=${direction}`);
  }
  if (Math.abs(control.before.angle - brace.before.angle) > PREMATCH_ANGLE_TOLERANCE) {
    throw new Error(`E10.0b matched pre-latch angle diverged dir=${direction}`);
  }
  if (Math.abs(control.before.relativeW - brace.before.relativeW) > PREMATCH_W_TOLERANCE) {
    throw new Error(`E10.0b matched pre-latch relativeW diverged dir=${direction}`);
  }
  if (preMomentumDelta > PREMATCH_MOMENTUM_TOLERANCE) {
    throw new Error(`E10.0b matched pre-latch momentum diverged dir=${direction}: ${preMomentumDelta}`);
  }
  if (impulseDeltaMag > MAX_FIRST_FRAME_DIFFERENTIAL_IMPULSE) {
    throw new Error(`E10.0b material first-frame brace impulse dir=${direction}: ${impulseDeltaMag}Ns`);
  }
  if (control.postFootLoss !== 0 || control.postProbeLoss !== 0 || control.postOtherRaw !== 0 || control.fall) {
    throw new Error(`E10.0b matched unlatched control lost qualified dual support dir=${direction}`);
  }
  if (
    brace.postFootLoss !== 0 ||
    brace.postProbeLoss !== 0 ||
    brace.postOtherRaw !== 0 ||
    brace.postOtherLoaded !== 0 ||
    brace.fall
  ) {
    throw new Error(`E10.0b brace transition lost/contaminated support dir=${direction}`);
  }
  if (brace.maxLockDrift > MAX_LOCK_DRIFT) {
    throw new Error(`E10.0b brace exceeded lock envelope dir=${direction}: ${brace.maxLockDrift / DEG}deg`);
  }
}

const acquisitionGap = Math.abs(pairs[0].brace.acquiredFrame - pairs[1].brace.acquiredFrame);
if (acquisitionGap > MIRROR_ACQUISITION_TOLERANCE) {
  throw new Error(`E10.0b mirrored acquisition timing gap ${acquisitionGap}f exceeds E7.1 boundary`);
}

console.log('E10.0b PASS: after exact E7.1 ground acquisition and the existing E7.2a 90-frame dual-support settle, the one-piece probe can be converted to a cache-cleared exact-current-angle revolute brace in both mirrors while the placement actuator and all other mechanics remain unchanged. The first braced outer frame stays within one existing E5 3% load-calibration band of the matched unlatched whole-body impulse, both real ground supports remain continuous and uncontaminated through the declared post window, and the brace stays inside the unchanged 0.25deg lock envelope. This qualifies acquisition->brace transition continuity only; it does not yet claim meaningful body-load transfer, stable load regulation, added translational agency, or gameplay feel.');
