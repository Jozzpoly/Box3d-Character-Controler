import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const SUPPORT_MASS = 800;
const FINITE_TORQUE = 320;
const MU = 0.95;
const SETTLE_FRAMES = 90;
const LOAD_EPS = 1e-6;
const SUPPORT_HALF = [2, 0.25, 30];
const PLATFORM_Y = -SUPPORT_HALF[1];
const UPPER_TRAVEL = 2 * SUPPORT_HALF[2];
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const Y_POS_90 = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const DIRECTIONS = [-1, 1];
const PLACEMENTS = ['world-external', 'reciprocal'];
const REFERENCE_MU = 0.95;
const STATIC_FRAME_LOAD = PLAYER_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = REFERENCE_MU * STATIC_FRAME_LOAD;
const REDUCED_MASS = 1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS);

// Reuse only paid-for numerical/representation boundaries. No threshold below
// is chosen from the E13.1a outcome.
const NUMERIC_VELOCITY_EPS = 1e-4; // E12.2b
const NUMERIC_POSITION_EPS = 1e-4; // E12.2b
const MOMENTUM_EPS = 2e-3; // E12.2b
const PREMATCH_EPS = 1e-9; // E13.0d / E13.1a
const IMMEDIATE_EPS = 1e-12; // E13.0d / E13.1a
const CONSTRAINT_EPS = 1e-4; // E13.0b-d / E13.1a

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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

  const frameDef = b3.b3DefaultBodyDef();
  frameDef.type = b3.b3BodyType.b3_staticBody;
  frameDef.position = [0, PLATFORM_Y, 0];
  frameDef.enableSleep = false;
  const frame = b3.b3CreateBody(world, frameDef);

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

  const supportMass = b3.b3Body_GetMass(support);
  const playerMass = organism.footMass + organism.torsoMass;
  if (Math.abs(supportMass - SUPPORT_MASS) > 1e-3 || Math.abs(playerMass - PLAYER_MASS) > 1e-3) {
    throw new Error(`E13.1b mass contract changed player=${playerMass} support=${supportMass}`);
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

function snapshot(rig, reader, direction, t0) {
  const player = playerState(rig.organism);
  const p = bodyPosition(rig.support);
  const v = bodyVelocity(rig.support);
  const support = reader.read();
  const translation = b3.b3PrismaticJoint_GetTranslation(rig.joint);
  const supportZ = direction * p[2];
  const supportV = direction * v[2];
  const playerZ = direction * player.z;
  const playerV = direction * player.vz;
  return {
    translation,
    limitOffset: translation - t0,
    playerZ,
    playerV,
    supportZ,
    supportV,
    relativeZ: playerZ - supportZ,
    relativeV: playerV - supportV,
    torsoTilt: direction * player.torsoTilt,
    footTilt: direction * player.footTilt,
    torsoW: direction * player.torsoW,
    footW: direction * player.footW,
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
    bindingError: Math.abs(translation - supportZ),
  };
}

function bodyStateDistance(a, b) {
  return Math.max(
    Math.abs(a.translation - b.translation),
    Math.abs(a.playerZ - b.playerZ),
    Math.abs(a.playerV - b.playerV),
    Math.abs(a.supportZ - b.supportZ),
    Math.abs(a.supportV - b.supportV),
    Math.abs(a.relativeZ - b.relativeZ),
    Math.abs(a.relativeV - b.relativeV),
    Math.abs(a.torsoTilt - b.torsoTilt),
    Math.abs(a.footTilt - b.footTilt),
    Math.abs(a.torsoW - b.torsoW),
    Math.abs(a.footW - b.footW),
    Math.abs(a.totalMomentum - b.totalMomentum),
    Math.abs(a.frameNormalImpulse - b.frameNormalImpulse),
    Math.abs(a.supportX - b.supportX),
    Math.abs(a.constrainedYBias - b.constrainedYBias),
    Math.abs(a.constrainedVx - b.constrainedVx),
    Math.abs(a.constrainedVy - b.constrainedVy),
    Math.abs(a.rotationError - b.rotationError),
    Math.abs(a.bindingError - b.bindingError),
  );
}

function stepRig(rig) {
  rig.organism.preStep(DT);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
}

function applyPlayerImpulse(organism, signedImpulse) {
  const footImpulse = signedImpulse * organism.footMass / PLAYER_MASS;
  const torsoImpulse = signedImpulse * organism.torsoMass / PLAYER_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [0, 0, footImpulse], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [0, 0, torsoImpulse], true);
}

function applyAuthority(rig, direction, placement, relativeDeltaV) {
  if (placement === 'world-external') {
    const impulse = PLAYER_MASS * relativeDeltaV;
    applyPlayerImpulse(rig.organism, direction * impulse);
    return { impulse, expectedNetImpulse: impulse };
  }
  if (placement === 'reciprocal') {
    const impulse = REDUCED_MASS * relativeDeltaV;
    applyPlayerImpulse(rig.organism, direction * impulse);
    b3.b3Body_ApplyLinearImpulseToCenter(rig.support, [0, 0, -direction * impulse], true);
    return { impulse, expectedNetImpulse: 0 };
  }
  throw new Error(`Unknown E13.1b placement ${placement}`);
}

function validateConstraint(state, label) {
  if (
    Math.abs(state.supportX) > CONSTRAINT_EPS ||
    Math.abs(state.constrainedVx) > CONSTRAINT_EPS ||
    Math.abs(state.constrainedVy) > CONSTRAINT_EPS ||
    state.rotationError > CONSTRAINT_EPS ||
    state.bindingError > CONSTRAINT_EPS
  ) {
    throw new Error(`E13.1b support constraint leak ${label}`);
  }
  if (!state.reactive || state.fall) {
    throw new Error(`E13.1b lost support/posture ${label}`);
  }
}

function qFromState(state) {
  return clamp(MU * state.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY, 0, 1);
}

function prepareThroughFirstPulse(direction, placement) {
  const rig = makeRig(direction);
  const reader = createSupportReader(rig.organism, rig.supportShape);

  for (let frame = 0; frame < SETTLE_FRAMES; frame++) stepRig(rig);
  stepRig(rig); // same physics-first entitlement qualification as E13.1a

  const freeSupport = reader.read();
  if (!freeSupport.reactive) throw new Error(`E13.1b failed support qualification dir=${direction} ${placement}`);
  const t0 = b3.b3PrismaticJoint_GetTranslation(rig.joint);
  const pre1 = snapshot(rig, reader, direction, t0);
  if (!pre1.recovered || pre1.fall) throw new Error(`E13.1b bad pre-pulse state dir=${direction} ${placement}`);

  b3.b3PrismaticJoint_SetLimits(rig.joint, t0, t0 + UPPER_TRAVEL);
  b3.b3PrismaticJoint_EnableLimit(rig.joint, true);
  if (!b3.b3PrismaticJoint_IsLimitEnabled(rig.joint)) {
    throw new Error(`E13.1b failed to enable first-pulse world stop dir=${direction} ${placement}`);
  }
  const transitioned = snapshot(rig, reader, direction, t0);
  if (bodyStateDistance(pre1, transitioned) > IMMEDIATE_EPS) {
    throw new Error(`E13.1b first-pulse limit transition mutated body state dir=${direction} ${placement}`);
  }

  const q1 = qFromState(pre1);
  const dV1 = q1 * ACCEL * DT;
  const auth1 = applyAuthority(rig, direction, placement, dV1);
  const immediate1 = snapshot(rig, reader, direction, t0);
  if (Math.abs((immediate1.relativeV - pre1.relativeV) - dV1) > NUMERIC_VELOCITY_EPS) {
    throw new Error(`E13.1b first-pulse dVrel contract changed dir=${direction} ${placement}`);
  }
  if (Math.abs((immediate1.totalMomentum - pre1.totalMomentum) - auth1.expectedNetImpulse) > MOMENTUM_EPS) {
    throw new Error(`E13.1b first-pulse authority momentum mismatch dir=${direction} ${placement}`);
  }

  stepRig(rig);
  const post1 = snapshot(rig, reader, direction, t0);
  validateConstraint(post1, `after pulse1 dir=${direction} ${placement}`);
  if (post1.limitOffset < -CONSTRAINT_EPS) {
    throw new Error(`E13.1b first-pulse stop penetrated material band dir=${direction} ${placement}`);
  }

  return {
    rig,
    reader,
    direction,
    placement,
    t0,
    q1,
    dV1,
    auth1,
    pre1,
    immediate1,
    post1,
    pulse1SolveMomentum: post1.totalMomentum - immediate1.totalMomentum,
  };
}

function destroyPrepared(prepared) {
  prepared.reader.destroy();
  b3.b3DestroyWorld(prepared.rig.world);
}

function runSecondPulsePair(direction, placement) {
  // Both copies experience the same enabled lower stop through pulse1. Only at
  // the second-pulse boundary do we remove the stop from the causal control.
  const release = prepareThroughFirstPulse(direction, placement);
  const continuous = prepareThroughFirstPulse(direction, placement);

  if (bodyStateDistance(release.post1, continuous.post1) > PREMATCH_EPS) {
    throw new Error(`E13.1b copies diverged before second-pulse intervention dir=${direction} ${placement}`);
  }

  const releaseBeforeToggle = snapshot(release.rig, release.reader, direction, release.t0);
  b3.b3PrismaticJoint_EnableLimit(release.rig.joint, false);
  if (b3.b3PrismaticJoint_IsLimitEnabled(release.rig.joint)) {
    throw new Error(`E13.1b failed to disable second-pulse control stop dir=${direction} ${placement}`);
  }
  if (!b3.b3PrismaticJoint_IsLimitEnabled(continuous.rig.joint)) {
    throw new Error(`E13.1b continuous second-pulse stop unexpectedly disabled dir=${direction} ${placement}`);
  }
  const releaseAfterToggle = snapshot(release.rig, release.reader, direction, release.t0);
  if (bodyStateDistance(releaseBeforeToggle, releaseAfterToggle) > IMMEDIATE_EPS) {
    throw new Error(`E13.1b disabling stop mutated physical state before pulse2 dir=${direction} ${placement}`);
  }

  const pre2Release = releaseAfterToggle;
  const pre2Continuous = snapshot(continuous.rig, continuous.reader, direction, continuous.t0);
  if (bodyStateDistance(pre2Release, pre2Continuous) > PREMATCH_EPS) {
    throw new Error(`E13.1b pulse2 pre-states no longer matched dir=${direction} ${placement}`);
  }

  const q2Release = qFromState(pre2Release);
  const q2Continuous = qFromState(pre2Continuous);
  if (Math.abs(q2Release - q2Continuous) > 1e-9) {
    throw new Error(`E13.1b pulse2 entitlement mismatch dir=${direction} ${placement}`);
  }
  const dV2 = q2Release * ACCEL * DT;

  const auth2Release = applyAuthority(release.rig, direction, placement, dV2);
  const auth2Continuous = applyAuthority(continuous.rig, direction, placement, dV2);
  const immediate2Release = snapshot(release.rig, release.reader, direction, release.t0);
  const immediate2Continuous = snapshot(continuous.rig, continuous.reader, direction, continuous.t0);

  for (const [name, pre, immediate, auth] of [
    ['release', pre2Release, immediate2Release, auth2Release],
    ['continuous', pre2Continuous, immediate2Continuous, auth2Continuous],
  ]) {
    if (Math.abs((immediate.relativeV - pre.relativeV) - dV2) > NUMERIC_VELOCITY_EPS) {
      throw new Error(`E13.1b pulse2 dVrel mismatch ${name} dir=${direction} ${placement}`);
    }
    if (Math.abs((immediate.totalMomentum - pre.totalMomentum) - auth.expectedNetImpulse) > MOMENTUM_EPS) {
      throw new Error(`E13.1b pulse2 authority momentum mismatch ${name} dir=${direction} ${placement}`);
    }
  }
  if (bodyStateDistance(immediate2Release, immediate2Continuous) > PREMATCH_EPS) {
    throw new Error(`E13.1b second-pulse bodies differ before causal solve dir=${direction} ${placement}`);
  }

  stepRig(release.rig);
  stepRig(continuous.rig);
  const post2Release = snapshot(release.rig, release.reader, direction, release.t0);
  const post2Continuous = snapshot(continuous.rig, continuous.reader, direction, continuous.t0);
  validateConstraint(post2Release, `pulse2 release dir=${direction} ${placement}`);
  validateConstraint(post2Continuous, `pulse2 continuous dir=${direction} ${placement}`);
  if (post2Continuous.limitOffset < -CONSTRAINT_EPS) {
    throw new Error(`E13.1b continuous stop penetrated material band on pulse2 dir=${direction} ${placement}`);
  }

  const releaseSolveMomentum = post2Release.totalMomentum - immediate2Release.totalMomentum;
  const continuousSolveMomentum = post2Continuous.totalMomentum - immediate2Continuous.totalMomentum;
  const secondPulseWorldEffect = continuousSolveMomentum - releaseSolveMomentum;
  const secondPulseRelativeEffect =
    (post2Continuous.relativeV - immediate2Continuous.relativeV) -
    (post2Release.relativeV - immediate2Release.relativeV);
  const releasedRecoil = Math.max(0, -post2Release.limitOffset);
  const continuousPenetration = Math.max(0, -post2Continuous.limitOffset);

  destroyPrepared(release);
  destroyPrepared(continuous);

  return {
    direction,
    placement,
    q1: release.q1,
    q2: q2Release,
    dV1: release.dV1,
    dV2,
    impulse1: release.auth1.impulse,
    impulse2: auth2Release.impulse,
    pulse1SolveMomentum: release.pulse1SolveMomentum,
    pre2: pre2Release,
    immediate2: immediate2Release,
    releaseSolveMomentum,
    continuousSolveMomentum,
    secondPulseWorldEffect,
    secondPulseRelativeEffect,
    releasedRecoil,
    continuousPenetration,
    post2Release,
    post2Continuous,
  };
}

function analyzeDirection(direction) {
  const external = runSecondPulsePair(direction, 'world-external');
  const reciprocal = runSecondPulsePair(direction, 'reciprocal');

  // The first enabled-stop pulse must still reach the previously qualified
  // reciprocal reaction path; this is only a continuity sanity gate.
  if (reciprocal.pulse1SolveMomentum <= MOMENTUM_EPS) {
    throw new Error(`E13.1b first reciprocal pulse lost world reaction dir=${direction}`);
  }

  // The released reciprocal copy must cross the lower side on pulse2, otherwise
  // keeping the stop enabled would not be a meaningful second-pulse falsifier.
  if (reciprocal.releasedRecoil <= NUMERIC_POSITION_EPS) {
    throw new Error(`E13.1b reciprocal pulse2 release did not cross discriminating lower side dir=${direction}`);
  }

  // Persistence claim: from a physically matched post-pulse1 state, keeping the
  // same world relation through pulse2 must create a resolved external impulse,
  // and that incremental response must remain placement-dependent. We do not
  // require world-external effect to be zero.
  const placementDelta = reciprocal.secondPulseWorldEffect - external.secondPulseWorldEffect;
  if (reciprocal.secondPulseWorldEffect <= MOMENTUM_EPS) {
    throw new Error(`E13.1b reciprocal second-pulse world effect unresolved dir=${direction}: ${reciprocal.secondPulseWorldEffect}`);
  }
  if (placementDelta <= MOMENTUM_EPS) {
    throw new Error(`E13.1b second-pulse world coupling no longer discriminates placement dir=${direction}: ${placementDelta}`);
  }

  return { direction, external, reciprocal, placementDelta };
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  PLAYER_MASS !== 80 || SUPPORT_MASS !== 800 || MU !== 0.95
) {
  throw new Error('E13.1b expected canonical E12/Donor-v1 current31 substrate');
}

console.log('E13.1b second-pulse world-coupling persistence probe');
console.log('  history: both causal copies receive the same E13.1a reciprocal/world-external pulse with the unilateral lower stop ON and solve once.');
console.log('  pulse2 intervention: from matched post-pulse1 body states, RELEASE disables the limit while CONTINUOUS keeps the same limit ON; no geometry/gap/mass/authority change.');
console.log('  each pulse uses the exact E12 matched support-relative current31 grant with physics-earned q from the immediately preceding solve.');
console.log('  observation boundary: exactly one additional authority pulse + one Box3D outer step. No launch stream, no lead, no tuning from E13.1a outcome.');

const summaries = DIRECTIONS.map(analyzeDirection);
for (const summary of summaries) {
  console.log(`  dir=${summary.direction > 0 ? '+' : '-'}`);
  for (const result of [summary.external, summary.reciprocal]) {
    console.log(
      `    ${result.placement.padEnd(14)} q1/q2=${result.q1.toFixed(6)}/${result.q2.toFixed(6)} ` +
      `J1/J2=${result.impulse1.toFixed(6)}/${result.impulse2.toFixed(6)}Ns ` +
      `p1 solve dP=${result.pulse1SolveMomentum.toFixed(6)}Ns | ` +
      `p2 RELEASE/CONT solve dP=${result.releaseSolveMomentum.toFixed(6)}/${result.continuousSolveMomentum.toFixed(6)}Ns ` +
      `worldEffect=${result.secondPulseWorldEffect.toFixed(6)}Ns relEffect=${result.secondPulseRelativeEffect.toExponential(3)}m/s ` +
      `releaseRecoil=${result.releasedRecoil.toExponential(3)}m pen=${result.continuousPenetration.toExponential(3)}m`,
    );
  }
  console.log(`    pulse2 placement world-coupling delta=${summary.placementDelta.toFixed(6)}Ns`);
}

if (
  Math.abs(summaries[0].external.secondPulseWorldEffect - summaries[1].external.secondPulseWorldEffect) > MOMENTUM_EPS ||
  Math.abs(summaries[0].reciprocal.secondPulseWorldEffect - summaries[1].reciprocal.secondPulseWorldEffect) > MOMENTUM_EPS ||
  Math.abs(summaries[0].placementDelta - summaries[1].placementDelta) > MOMENTUM_EPS
) {
  throw new Error('E13.1b mirrored second-pulse world-coupling accounting diverged beyond E12 momentum band');
}

console.log(
  'E13.1b PASS: the E13.1a placement-dependent world reaction is not only a first-contact activation transient. After an identical first stop-coupled pulse, retaining versus removing the same unilateral world relation from a matched physical state produces a mirrored, resolved second-pulse external impulse, with a materially different response between reciprocal and world-external placement. This qualifies short temporal persistence only; it does not justify a full current31 ramp or select gameplay placement.',
);
