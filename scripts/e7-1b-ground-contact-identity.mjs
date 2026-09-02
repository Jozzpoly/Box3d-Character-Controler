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
const SETTLE_FRAMES = 90;
const CONTROL_FRAMES = 180;
const ACQUISITION_WINDOW = 180;
const ACQUIRE_STREAK = 5;
const MIRROR_FRAME_TOLERANCE = 6;
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

// Exact E7.1a actuator specimen: no parameter or mechanics change.
const PROBE_I_CM_X =
  (PROBE_MASS / 12) * (PROBE_LENGTH * PROBE_LENGTH + (2 * PROBE_HALF[2]) ** 2);
const PROBE_I_PIVOT_X = PROBE_I_CM_X + PROBE_MASS * (PROBE_LENGTH / 2) ** 2;
const PROBE_MAX_GRAVITY_MOMENT = PROBE_MASS * G * (PROBE_LENGTH / 2);
const PROBE_TORQUE_CAP = 2 * PROBE_MAX_GRAVITY_MOMENT;
const PROBE_NATURAL_FREQUENCY = 8;
const PROBE_KP = PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY ** 2;
const PROBE_KD = 2 * PROBE_I_PIVOT_X * PROBE_NATURAL_FREQUENCY;

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function bodyAngularVelocity(body) {
  const w = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(w, body);
  return w;
}

function sameShapeId(a, b) {
  return Boolean(a && b) &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation;
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

  const mass = organism.footMass + organism.torsoMass + b3.b3Body_GetMass(probePart.body);
  if (Math.abs(mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E7.1b organism mass ${mass} != ${TOTAL_MASS} kg`);
  }

  return {
    world,
    organism,
    probe: probePart.body,
    probeShape: probePart.shape,
    groundShape: platform.shape,
    joint,
  };
}

function makeSupportReader(body) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  return {
    read() {
      b3.getBodyContactData(buffer, body);
      const rawContacts = b3.getNumContacts(buffer);
      let touching = 0;
      let loaded = 0;
      for (let i = 0; i < rawContacts; i++) {
        b3.getContactAt(contact, buffer, i);
        for (let m = 0; m < contact.manifoldCount; m++) {
          b3.getManifoldAt(manifold, contact, m);
          if (Math.abs(manifold.normal[1]) < 0.5) continue;
          for (let p = 0; p < manifold.pointCount; p++) {
            const point = manifold.points[p];
            if (point.separation <= 0) touching += 1;
            if (
              Math.abs(point.normalImpulse ?? 0) > LOAD_EPS ||
              Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPS
            ) loaded += 1;
          }
        }
      }
      return { rawContacts, touching, loaded, reactive: touching > 0 || loaded > 0 };
    },
    destroy() {
      b3.destroyContactsBuffer(buffer);
    },
  };
}

function makeProbeIdentityReader(rig) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  return {
    read() {
      b3.getBodyContactData(buffer, rig.probe);
      const rawContacts = b3.getNumContacts(buffer);
      let groundRaw = 0;
      let otherRaw = 0;
      let groundTouching = 0;
      let groundLoaded = 0;
      let otherTouching = 0;
      let otherLoaded = 0;

      for (let i = 0; i < rawContacts; i++) {
        b3.getContactAt(contact, buffer, i);
        const aProbe = sameShapeId(contact.shapeIdA, rig.probeShape);
        const bProbe = sameShapeId(contact.shapeIdB, rig.probeShape);
        if (aProbe === bProbe) {
          throw new Error('E7.1b probe contact does not contain exactly one probe shape id');
        }
        const otherShape = aProbe ? contact.shapeIdB : contact.shapeIdA;
        const isGround = sameShapeId(otherShape, rig.groundShape);
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
        groundReactive: groundTouching > 0 || groundLoaded > 0,
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
  const angularImpulse = torque * DT;
  b3.b3Body_ApplyAngularImpulse(organism.torso, [angularImpulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(organism.foot, [-angularImpulse, 0, 0], true);
}

function applyProbeActuator(rig, targetAngle) {
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const probeW = bodyAngularVelocity(rig.probe);
  rig.organism._sync();
  const relativeW = probeW[0] - rig.organism.torsoAngularVelocity[0];
  const request = PROBE_KP * (targetAngle - angle) - PROBE_KD * relativeW;
  const torque = clamp(request, -PROBE_TORQUE_CAP, PROBE_TORQUE_CAP);
  if (Math.abs(torque) < 1e-9) return { angle, relativeW, torque };
  const angularImpulse = torque * DT;
  b3.b3Body_ApplyAngularImpulse(rig.probe, [angularImpulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(rig.organism.torso, [-angularImpulse, 0, 0], true);
  return { angle, relativeW, torque };
}

function stepRig(rig, primaryReader, probeReader, targetAngle) {
  const primaryBefore = primaryReader.read();
  applyPrimaryBalance(rig.organism, primaryBefore.reactive);
  const actuator = applyProbeActuator(rig, targetAngle);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
  return {
    primary: primaryReader.read(),
    probe: probeReader.read(),
    actuator,
  };
}

function runControl() {
  const rig = createRig();
  const primaryReader = makeSupportReader(rig.organism.foot);
  const probeReader = makeProbeIdentityReader(rig);
  let primaryLoss = 0;
  let maxGroundRaw = 0;
  let maxOtherRaw = 0;
  let maxAbsProbeAngle = 0;

  for (let frame = 0; frame < SETTLE_FRAMES + CONTROL_FRAMES; frame++) {
    const state = stepRig(rig, primaryReader, probeReader, 0);
    if (frame >= SETTLE_FRAMES && !state.primary.reactive) primaryLoss += 1;
    maxGroundRaw = Math.max(maxGroundRaw, state.probe.groundRaw);
    maxOtherRaw = Math.max(maxOtherRaw, state.probe.otherRaw);
    maxAbsProbeAngle = Math.max(
      maxAbsProbeAngle,
      Math.abs(b3.b3RevoluteJoint_GetAngle(rig.joint)),
    );
  }

  const result = {
    fall: rig.organism.fallObserved,
    primaryLoss,
    maxGroundRaw,
    maxOtherRaw,
    maxAbsProbeAngleDeg: maxAbsProbeAngle / DEG,
    peakTorsoTiltDeg: rig.organism.peakAbsTilt / DEG,
  };
  primaryReader.destroy();
  probeReader.destroy();
  b3.b3DestroyWorld(rig.world);
  return result;
}

function runAcquisition(direction) {
  const rig = createRig();
  const primaryReader = makeSupportReader(rig.organism.foot);
  const probeReader = makeProbeIdentityReader(rig);

  let preGroundRaw = 0;
  let preOtherRaw = 0;
  let prePrimaryLoss = 0;
  let postPrimaryLoss = 0;
  let loadedGroundStreak = 0;
  let firstGroundReactiveFrame = -1;
  let firstGroundLoadedFrame = -1;
  let acquiredFrame = -1;
  let maxGroundLoaded = 0;
  let maxOtherRaw = 0;
  let maxOtherLoaded = 0;
  let maxAbsTorque = 0;
  let terminalAngle = 0;

  for (let frame = 0; frame < SETTLE_FRAMES; frame++) {
    const state = stepRig(rig, primaryReader, probeReader, 0);
    preGroundRaw = Math.max(preGroundRaw, state.probe.groundRaw);
    preOtherRaw = Math.max(preOtherRaw, state.probe.otherRaw);
    if (!state.primary.reactive) prePrimaryLoss += 1;
  }

  for (let frame = 0; frame < ACQUISITION_WINDOW; frame++) {
    const state = stepRig(rig, primaryReader, probeReader, direction * TARGET_ANGLE);
    terminalAngle = b3.b3RevoluteJoint_GetAngle(rig.joint);
    maxAbsTorque = Math.max(maxAbsTorque, Math.abs(state.actuator.torque));
    maxGroundLoaded = Math.max(maxGroundLoaded, state.probe.groundLoaded);
    maxOtherRaw = Math.max(maxOtherRaw, state.probe.otherRaw);
    maxOtherLoaded = Math.max(maxOtherLoaded, state.probe.otherLoaded);
    if (!state.primary.reactive) postPrimaryLoss += 1;

    if (state.probe.groundReactive && firstGroundReactiveFrame < 0) {
      firstGroundReactiveFrame = frame;
    }
    if (state.probe.groundLoaded > 0 && firstGroundLoadedFrame < 0) {
      firstGroundLoadedFrame = frame;
    }

    if (state.probe.groundLoaded > 0) {
      loadedGroundStreak += 1;
      if (loadedGroundStreak >= ACQUIRE_STREAK) {
        acquiredFrame = frame - ACQUIRE_STREAK + 1;
        break;
      }
    } else {
      loadedGroundStreak = 0;
    }
  }

  const result = {
    direction,
    acquired: acquiredFrame >= 0,
    acquiredFrame,
    firstGroundReactiveFrame,
    firstGroundLoadedFrame,
    preGroundRaw,
    preOtherRaw,
    prePrimaryLoss,
    postPrimaryLoss,
    maxGroundLoaded,
    maxOtherRaw,
    maxOtherLoaded,
    fall: rig.organism.fallObserved,
    peakTorsoTiltDeg: rig.organism.peakAbsTilt / DEG,
    terminalAngleDeg: terminalAngle / DEG,
    maxAbsTorque,
  };

  primaryReader.destroy();
  probeReader.destroy();
  b3.b3DestroyWorld(rig.world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || TOTAL_MASS !== 80) {
  throw new Error('E7.1b expected the current Donor-v1/E5 substrate');
}

console.log('E7.1b probe↔ground contact-identity qualification');
console.log('  mechanics are intentionally identical to E7.1a; only contact observation is stricter');
console.log(`  target=±${(TARGET_ANGLE / DEG).toFixed(1)}deg cap=${PROBE_TORQUE_CAP.toFixed(2)}Nm loadedGroundStreak=${ACQUIRE_STREAK}f`);

const control = runControl();
console.log(
  `  control target0: fall=${control.fall} primaryLoss=${control.primaryLoss} ` +
  `groundRaw=${control.maxGroundRaw} otherRaw=${control.maxOtherRaw} ` +
  `maxProbeAngle=${control.maxAbsProbeAngleDeg.toFixed(3)}deg peakTorso=${control.peakTorsoTiltDeg.toFixed(3)}deg`,
);
if (
  control.fall ||
  control.primaryLoss !== 0 ||
  control.maxGroundRaw !== 0 ||
  control.maxOtherRaw !== 0 ||
  control.maxAbsProbeAngleDeg > 1
) {
  throw new Error('E7.1b target0 identity control is not inactive/non-interfering');
}

const rows = [-1, 1].map(runAcquisition);
for (const row of rows) {
  console.log(
    `  dir=${row.direction > 0 ? '+' : '-'} acquiredGround=${row.acquired} ` +
    `firstReactive=${row.firstGroundReactiveFrame} firstLoaded=${row.firstGroundLoadedFrame} ` +
    `acquiredFrame=${row.acquiredFrame} groundLoadedPts=${row.maxGroundLoaded} ` +
    `otherRaw=${row.maxOtherRaw} otherLoaded=${row.maxOtherLoaded} ` +
    `preGround/other=${row.preGroundRaw}/${row.preOtherRaw} ` +
    `primaryLoss pre/post=${row.prePrimaryLoss}/${row.postPrimaryLoss} fall=${row.fall} ` +
    `peakTorso=${row.peakTorsoTiltDeg.toFixed(2)}deg terminalAngle=${row.terminalAngleDeg.toFixed(2)}deg ` +
    `maxTorque=${row.maxAbsTorque.toFixed(2)}Nm`,
  );

  if (row.preGroundRaw !== 0 || row.preOtherRaw !== 0) {
    throw new Error(`E7.1b probe contacted before command dir=${row.direction}`);
  }
  if (row.maxOtherRaw !== 0 || row.maxOtherLoaded !== 0) {
    throw new Error(`E7.1b probe made a non-ground contact dir=${row.direction}`);
  }
  if (row.prePrimaryLoss !== 0 || row.postPrimaryLoss !== 0) {
    throw new Error(`E7.1b primary support was lost dir=${row.direction}`);
  }
  if (row.fall) {
    throw new Error(`E7.1b organism fell during ground acquisition dir=${row.direction}`);
  }
  if (!row.acquired || row.maxGroundLoaded <= 0) {
    throw new Error(`E7.1b persistent solver-loaded probe↔ground support not acquired dir=${row.direction}`);
  }
}

const mirrorGap = Math.abs(rows[0].acquiredFrame - rows[1].acquiredFrame);
if (mirrorGap > MIRROR_FRAME_TOLERANCE) {
  throw new Error(`E7.1b ground acquisition timing is not sufficiently mirrored: ${mirrorGap} frames`);
}

console.log(
  `E7.1b PASS: the E7.1a loaded-contact result is specifically probe↔platform support in both sagittal directions, with zero probe contact against any other shape and ≤${MIRROR_FRAME_TOLERANCE}-frame acquisition asymmetry. This hardens contact provenance only; it does not yet prove body-load transfer or added translational agency.`,
);
