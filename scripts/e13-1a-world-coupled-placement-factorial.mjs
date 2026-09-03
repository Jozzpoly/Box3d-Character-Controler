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
const STOP_STATES = [false, true];
const REFERENCE_MU = 0.95;
const STATIC_FRAME_LOAD = PLAYER_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = REFERENCE_MU * STATIC_FRAME_LOAD;
const REDUCED_MASS = 1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS);

// Paid-for numerical / representation boundaries only. None are selected from E13.1a results.
const NUMERIC_VELOCITY_EPS = 1e-4; // E12.2b
const NUMERIC_POSITION_EPS = 1e-4; // E12.2b
const NUMERIC_ANGLE_EPS = 1e-5; // E12.2b
const MOMENTUM_EPS = 2e-3; // E12.2b
const PREMATCH_EPS = 1e-9; // E13.0d
const IMMEDIATE_EPS = 1e-12; // E13.0d
const CONSTRAINT_EPS = 1e-4; // E13.0b/c1/d

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
  // Same mirrored convention qualified in E13.0b-d: local +X is the intended/
  // allowed world direction; negative local translation is recoil/lower-stop side.
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

  const supportMass = b3.b3Body_GetMass(support);
  const playerMass = organism.footMass + organism.torsoMass;
  if (Math.abs(supportMass - SUPPORT_MASS) > 1e-3 || Math.abs(playerMass - PLAYER_MASS) > 1e-3) {
    throw new Error(`E13.1a mass contract changed player=${playerMass} support=${supportMass}`);
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

function stepRig(rig) {
  rig.organism.preStep(DT);
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
}

function physicalMutationDistance(before, after) {
  return Math.max(
    Math.abs(before.translation - after.translation),
    Math.abs(before.playerZ - after.playerZ),
    Math.abs(before.playerV - after.playerV),
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

function preStateDistance(a, b) {
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
  );
}

function applyPlayerImpulse(organism, signedImpulse) {
  const footImpulse = signedImpulse * organism.footMass / PLAYER_MASS;
  const torsoImpulse = signedImpulse * organism.torsoMass / PLAYER_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [0, 0, footImpulse], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [0, 0, torsoImpulse], true);
}

function applyAuthority(rig, direction, placement, relativeDeltaV) {
  let appliedImpulse;
  let expectedNetImpulse;
  if (placement === 'world-external') {
    appliedImpulse = PLAYER_MASS * relativeDeltaV;
    expectedNetImpulse = appliedImpulse;
    applyPlayerImpulse(rig.organism, direction * appliedImpulse);
  } else if (placement === 'reciprocal') {
    appliedImpulse = REDUCED_MASS * relativeDeltaV;
    expectedNetImpulse = 0;
    applyPlayerImpulse(rig.organism, direction * appliedImpulse);
    b3.b3Body_ApplyLinearImpulseToCenter(rig.support, [0, 0, -direction * appliedImpulse], true);
  } else {
    throw new Error(`Unknown E13.1a placement ${placement}`);
  }
  return { appliedImpulse, expectedNetImpulse };
}

function runCase({ direction, placement, stopEnabled }) {
  const rig = makeRig(direction);
  const reader = createSupportReader(rig.organism, rig.supportShape);

  // Same free-prismatic representation for every factor through settle and the
  // physics-first entitlement solve. Placement and world-stop state therefore
  // cannot contaminate q or pre-authority state.
  for (let frame = 0; frame < SETTLE_FRAMES; frame++) stepRig(rig);
  stepRig(rig);

  const support = reader.read();
  if (!support.reactive) throw new Error(`E13.1a failed to establish support dir=${direction} ${placement} stop=${stopEnabled}`);
  const q = clamp(MU * support.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY, 0, 1);
  const relativeDeltaV = q * ACCEL * DT;
  const t0 = b3.b3PrismaticJoint_GetTranslation(rig.joint);
  const pre = snapshot(rig, reader, direction, t0);
  if (!pre.reactive || pre.fall || !pre.recovered) {
    throw new Error(`E13.1a pre-authority embodied state not qualified dir=${direction} ${placement} stop=${stopEnabled}`);
  }

  // Identical zero-gap geometry metadata in all four factors. Only stopEnabled
  // changes enableLimit. This exact transition was qualified passive-neutral by E13.0d.
  b3.b3PrismaticJoint_SetLimits(rig.joint, t0, t0 + UPPER_TRAVEL);
  if (stopEnabled) b3.b3PrismaticJoint_EnableLimit(rig.joint, true);
  if (b3.b3PrismaticJoint_IsLimitEnabled(rig.joint) !== stopEnabled) {
    throw new Error(`E13.1a limit state mismatch dir=${direction} ${placement} stop=${stopEnabled}`);
  }
  const afterTransition = snapshot(rig, reader, direction, t0);
  if (physicalMutationDistance(pre, afterTransition) > IMMEDIATE_EPS) {
    throw new Error(`E13.1a limit API mutated body state before authority dir=${direction} ${placement} stop=${stopEnabled}`);
  }

  const { appliedImpulse, expectedNetImpulse } = applyAuthority(rig, direction, placement, relativeDeltaV);
  const immediate = snapshot(rig, reader, direction, t0);
  const immediateRelativeDeltaV = immediate.relativeV - pre.relativeV;
  const immediateMomentumDelta = immediate.totalMomentum - pre.totalMomentum;

  // Exactly one causal physics step. No further translational authority.
  stepRig(rig);
  const post = snapshot(rig, reader, direction, t0);

  reader.destroy();
  b3.b3DestroyWorld(rig.world);

  return {
    direction,
    placement,
    stopEnabled,
    q,
    relativeDeltaV,
    t0,
    appliedImpulse,
    expectedNetImpulse,
    pre,
    afterTransition,
    immediate,
    post,
    immediateRelativeDeltaV,
    immediateMomentumDelta,
    solveDeltaMomentum: post.totalMomentum - immediate.totalMomentum,
    solveDeltaRelativeV: post.relativeV - immediate.relativeV,
    solveDeltaPlayerV: post.playerV - immediate.playerV,
    solveDeltaSupportV: post.supportV - immediate.supportV,
  };
}

function key(placement, stopEnabled) {
  return `${placement}/${stopEnabled ? 'ON' : 'OFF'}`;
}

function analyzeDirection(direction) {
  const cases = new Map();
  for (const placement of PLACEMENTS) {
    for (const stopEnabled of STOP_STATES) {
      const result = runCase({ direction, placement, stopEnabled });
      cases.set(key(placement, stopEnabled), result);
    }
  }

  const extOff = cases.get(key('world-external', false));
  const extOn = cases.get(key('world-external', true));
  const recOff = cases.get(key('reciprocal', false));
  const recOn = cases.get(key('reciprocal', true));
  const all = [extOff, extOn, recOff, recOn];

  // All factors are causally identical until after the same physics-first q solve.
  const reference = extOff;
  for (const result of all.slice(1)) {
    if (Math.abs(result.q - reference.q) > 1e-6 || preStateDistance(result.pre, reference.pre) > PREMATCH_EPS) {
      throw new Error(`E13.1a pre-authority factorial mismatch dir=${direction} ${result.placement} stop=${result.stopEnabled}`);
    }
  }

  // Exact E12.2a/b agency contract: placement changes impulse distribution, not
  // granted support-relative delta-v. Stop state is still only metadata pre-solve.
  for (const result of all) {
    if (Math.abs(result.immediateRelativeDeltaV - result.relativeDeltaV) > NUMERIC_VELOCITY_EPS) {
      throw new Error(`E13.1a immediate relative-dV mismatch dir=${direction} ${result.placement} stop=${result.stopEnabled}`);
    }
    if (Math.abs(result.immediateMomentumDelta - result.expectedNetImpulse) > MOMENTUM_EPS) {
      throw new Error(`E13.1a immediate authority momentum mismatch dir=${direction} ${result.placement} stop=${result.stopEnabled}`);
    }
    if (!result.post.reactive || result.post.fall) {
      throw new Error(`E13.1a lost qualified support/posture in one-step probe dir=${direction} ${result.placement} stop=${result.stopEnabled}`);
    }
    if (
      Math.abs(result.post.supportX) > CONSTRAINT_EPS ||
      Math.abs(result.post.constrainedVx) > CONSTRAINT_EPS ||
      Math.abs(result.post.constrainedVy) > CONSTRAINT_EPS ||
      result.post.rotationError > CONSTRAINT_EPS ||
      result.post.bindingError > CONSTRAINT_EPS
    ) {
      throw new Error(`E13.1a support constraint leak dir=${direction} ${result.placement} stop=${result.stopEnabled}`);
    }
    if (result.stopEnabled && result.post.limitOffset < -CONSTRAINT_EPS) {
      throw new Error(`E13.1a enabled lower stop penetrated material band dir=${direction} ${result.placement}`);
    }
  }

  if (
    physicalMutationDistance(extOff.immediate, extOn.immediate) > PREMATCH_EPS ||
    physicalMutationDistance(recOff.immediate, recOn.immediate) > PREMATCH_EPS
  ) {
    throw new Error(`E13.1a stop ON/OFF differed before causal solve dir=${direction}`);
  }

  // OFF is the E12.2b causal control on the newly-qualified free-prismatic support.
  if (
    Math.abs(extOff.post.relativeV - recOff.post.relativeV) > NUMERIC_VELOCITY_EPS ||
    Math.abs(extOff.post.relativeZ - recOff.post.relativeZ) > NUMERIC_POSITION_EPS ||
    Math.abs(extOff.post.torsoTilt - recOff.post.torsoTilt) > NUMERIC_ANGLE_EPS ||
    Math.abs(extOff.post.footTilt - recOff.post.footTilt) > NUMERIC_ANGLE_EPS ||
    Math.abs(extOff.post.torsoW - recOff.post.torsoW) > NUMERIC_VELOCITY_EPS ||
    Math.abs(extOff.post.footW - recOff.post.footW) > NUMERIC_VELOCITY_EPS ||
    Math.abs(extOff.post.frameNormalImpulse - recOff.post.frameNormalImpulse) > MOMENTUM_EPS
  ) {
    throw new Error(`E13.1a stop-OFF one-step Galilean control diverged dir=${direction}`);
  }

  // The reciprocal OFF factor must actually traverse the recoil side; otherwise
  // the lower-stop ON factor would not be a discriminating world-reference probe.
  const reciprocalFreeRecoil = Math.max(0, -recOff.post.limitOffset);
  if (reciprocalFreeRecoil <= NUMERIC_POSITION_EPS) {
    throw new Error(`E13.1a reciprocal OFF recoil did not reach discriminating scale dir=${direction}`);
  }

  // Difference against the same-placement OFF control isolates the incremental
  // world impulse caused by the unilateral relation under real player/support contact.
  const externalWorldEffect = extOn.solveDeltaMomentum - extOff.solveDeltaMomentum;
  const reciprocalWorldEffect = recOn.solveDeltaMomentum - recOff.solveDeltaMomentum;
  const placementWorldCouplingDelta = reciprocalWorldEffect - externalWorldEffect;
  const externalRelativeEffect = extOn.solveDeltaRelativeV - extOff.solveDeltaRelativeV;
  const reciprocalRelativeEffect = recOn.solveDeltaRelativeV - recOff.solveDeltaRelativeV;

  // Falsifier: a genuine external reference must produce a numerically resolved
  // response to reciprocal recoil, and placement must change that response. We do
  // not require world-external coupling to be zero; contact-mediated coupling is real evidence.
  if (reciprocalWorldEffect <= MOMENTUM_EPS) {
    throw new Error(`E13.1a reciprocal world-stop effect unresolved dir=${direction}: ${reciprocalWorldEffect}`);
  }
  if (placementWorldCouplingDelta <= MOMENTUM_EPS) {
    throw new Error(`E13.1a world coupling did not discriminate placement dir=${direction}: ${placementWorldCouplingDelta}`);
  }

  return {
    direction,
    cases,
    q: reference.q,
    targetRelativeDeltaV: reference.relativeDeltaV,
    externalWorldEffect,
    reciprocalWorldEffect,
    placementWorldCouplingDelta,
    externalRelativeEffect,
    reciprocalRelativeEffect,
    reciprocalFreeRecoil,
    reciprocalLimitPenetration: Math.max(0, -recOn.post.limitOffset),
  };
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  PLAYER_MASS !== 80 || SUPPORT_MASS !== 800 || MU !== 0.95
) {
  throw new Error('E13.1a expected canonical E12/Donor-v1 current31 substrate');
}

console.log('E13.1a one-step world-coupled placement factorial');
console.log('  factors: placement={world-external, reciprocal} x unilateral prismatic world-stop={OFF, ON}; mirrors +/-; finite 320Nm embodied player on 800kg support.');
console.log('  all factors: 90f free-prismatic settle + one neutral physics-first q solve; then identical zero-gap SetLimits([t0,t0+60m]); only ON enables the already-qualified lower stop.');
console.log('  authority: exact E12.2a/b matched support-relative current31 grant. world-external J=80*dVrel; reciprocal J=reducedMass*dVrel with equal-and-opposite support recoil.');
console.log('  observation boundary: immediate post-authority state plus exactly one Box3D outer step; no lead, no authority stream, no post-result tuning.');
console.log(`  paid numeric gates: velocity=${NUMERIC_VELOCITY_EPS}m/s position=${NUMERIC_POSITION_EPS}m angle=${NUMERIC_ANGLE_EPS}rad momentum/load=${MOMENTUM_EPS}Ns constraint=${CONSTRAINT_EPS}m.`);

const summaries = DIRECTIONS.map(analyzeDirection);
for (const summary of summaries) {
  console.log(`  dir=${summary.direction > 0 ? '+' : '-'} q=${summary.q.toFixed(6)} target dVrel=${summary.targetRelativeDeltaV.toFixed(6)}m/s`);
  for (const placement of PLACEMENTS) {
    for (const stopEnabled of STOP_STATES) {
      const r = summary.cases.get(key(placement, stopEnabled));
      console.log(
        `    ${placement.padEnd(14)} stop=${stopEnabled ? 'ON ' : 'OFF'} J=${r.appliedImpulse.toFixed(6)}Ns ` +
        `dVrelNow=${r.immediateRelativeDeltaV.toFixed(6)}m/s dPauth=${r.immediateMomentumDelta.toFixed(6)}Ns ` +
        `solve dP=${r.solveDeltaMomentum.toFixed(6)}Ns relV=${r.immediate.relativeV.toFixed(6)}->${r.post.relativeV.toFixed(6)}m/s ` +
        `supportV=${r.immediate.supportV.toFixed(6)}->${r.post.supportV.toFixed(6)}m/s ` +
        `offset=${r.immediate.limitOffset.toExponential(3)}->${r.post.limitOffset.toExponential(3)}m ` +
        `load=${r.post.frameNormalImpulse.toFixed(4)}Ns fall=${r.post.fall}`,
      );
    }
  }
  console.log(
    `    stop-isolated world effect ext=${summary.externalWorldEffect.toFixed(6)}Ns recip=${summary.reciprocalWorldEffect.toFixed(6)}Ns ` +
    `placement delta=${summary.placementWorldCouplingDelta.toFixed(6)}Ns | ` +
    `relative effect ext=${summary.externalRelativeEffect.toExponential(3)} recip=${summary.reciprocalRelativeEffect.toExponential(3)}m/s | ` +
    `recip free recoil=${summary.reciprocalFreeRecoil.toExponential(3)}m limitPen=${summary.reciprocalLimitPenetration.toExponential(3)}m`,
  );
}

if (
  Math.abs(summaries[0].externalWorldEffect - summaries[1].externalWorldEffect) > MOMENTUM_EPS ||
  Math.abs(summaries[0].reciprocalWorldEffect - summaries[1].reciprocalWorldEffect) > MOMENTUM_EPS ||
  Math.abs(summaries[0].placementWorldCouplingDelta - summaries[1].placementWorldCouplingDelta) > MOMENTUM_EPS
) {
  throw new Error('E13.1a mirrored world-coupling accounting diverged beyond E12 numerical momentum band');
}

console.log(
  'E13.1a PASS: on the E13.0b-d-qualified world-stop representation, the exact E12 matched-relative one-step authority contract remains causal before solve, the stop-OFF pair preserves the E12 Galilean control, and enabling the same unilateral world relation produces a mirrored, numerically resolved placement-dependent external-world impulse under real embodied contact. ' +
  'This qualifies genuine world coupling as an architectural discriminator; it does not yet select a gameplay placement, a same-player-dV contract, or a multi-frame locomotion policy.',
);
