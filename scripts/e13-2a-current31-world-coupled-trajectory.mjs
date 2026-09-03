import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const SUPPORT_MASS = 800;
const FINITE_TORQUE = 320;
const MU = 0.95;
const SETTLE_FRAMES = 90;
const LEAD_FRAMES = 8;
const RELEASE_FRAMES = 60;
const LOAD_EPS = 1e-6;
const SUPPORT_HALF = [2, 0.25, 30];
const PLATFORM_Y = -SUPPORT_HALF[1];
const UPPER_TRAVEL = 2 * SUPPORT_HALF[2];
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const Y_POS_90 = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const DIRECTIONS = [-1, 1];
const PLACEMENTS = ['world-external', 'reciprocal'];
const STOP_STATES = [false, true];
const STATIC_FRAME_LOAD = PLAYER_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = MU * STATIC_FRAME_LOAD;
const REDUCED_MASS = 1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS);
const RAMP_FRAMES = Math.ceil(TARGET_SPEED / (ACCEL * DT));

// Reuse only already-paid numerical/representation bands. None are selected
// from E13.1a/b outcomes or from this trajectory.
const NUMERIC_VELOCITY_EPS = 1e-4; // E12.2b
const MOMENTUM_EPS = 2e-3; // E12.2b
const PREMATCH_EPS = 1e-9; // E13.0d / E13.1a
const IMMEDIATE_EPS = 1e-12; // E13.0d / E13.1a
const CONSTRAINT_EPS = 1e-4; // E13.0b-d / E13.1a

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
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
    throw new Error(`E13.2a mass contract changed player=${playerMass} support=${supportMass}`);
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

function physicalMutationDistance(a, b) {
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

function validateConstraint(state, stopEnabled, label) {
  if (
    Math.abs(state.supportX) > CONSTRAINT_EPS ||
    Math.abs(state.constrainedVx) > CONSTRAINT_EPS ||
    Math.abs(state.constrainedVy) > CONSTRAINT_EPS ||
    state.rotationError > CONSTRAINT_EPS ||
    state.bindingError > CONSTRAINT_EPS
  ) {
    throw new Error(`E13.2a support constraint leak ${label}`);
  }
  if (stopEnabled && state.limitOffset < -CONSTRAINT_EPS) {
    throw new Error(`E13.2a lower-stop penetration beyond paid band ${label}: ${state.limitOffset}`);
  }
}

function targetedPreStep(organism, targetTilt, supportReactive) {
  organism._sync();
  const error = organism.torsoTilt - targetTilt;
  const omega = organism.torsoAngularVelocity[0];
  const requested = -organism.kp * error - organism.kd * omega;
  const torque = clamp(requested, -FINITE_TORQUE, FINITE_TORQUE);
  const applied = supportReactive ? torque : 0;
  organism.lastBalanceTorque = applied;
  if (Math.abs(applied) > 1e-9) {
    const impulse = applied * DT;
    b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(organism.foot, [-impulse, 0, 0], true);
  }
  return applied;
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
  throw new Error(`Unknown E13.2a placement ${placement}`);
}

function solve(rig) {
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
}

function qFromState(state) {
  if (!state.reactive) return 0;
  return clamp(MU * state.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY, 0, 1);
}

function runCase({ direction, placement, stopEnabled }) {
  const rig = makeRig(direction);
  const reader = createSupportReader(rig.organism, rig.supportShape);
  let signal = reader.read();

  function postureStep(targetTilt) {
    targetedPreStep(rig.organism, targetTilt, signal.reactive);
    solve(rig);
    signal = reader.read();
  }

  for (let frame = 0; frame < SETTLE_FRAMES; frame++) postureStep(0);
  postureStep(0); // exact neutral physics-first qualification before factor transition

  const t0 = b3.b3PrismaticJoint_GetTranslation(rig.joint);
  const preTransition = snapshot(rig, reader, direction, t0);
  if (!preTransition.reactive || preTransition.fall || !preTransition.recovered) {
    throw new Error(`E13.2a failed pre-transition qualification dir=${direction} ${placement} stop=${stopEnabled}`);
  }

  b3.b3PrismaticJoint_SetLimits(rig.joint, t0, t0 + UPPER_TRAVEL);
  if (stopEnabled) b3.b3PrismaticJoint_EnableLimit(rig.joint, true);
  if (b3.b3PrismaticJoint_IsLimitEnabled(rig.joint) !== stopEnabled) {
    throw new Error(`E13.2a limit state mismatch dir=${direction} ${placement} stop=${stopEnabled}`);
  }
  const afterTransition = snapshot(rig, reader, direction, t0);
  if (physicalMutationDistance(preTransition, afterTransition) > IMMEDIATE_EPS) {
    throw new Error(`E13.2a limit transition mutated state dir=${direction} ${placement} stop=${stopEnabled}`);
  }

  const desiredLeadTilt = direction * Math.atan2(ACCEL, G);
  let leadSolveMomentum = 0;
  let leadSupportLoss = 0;
  let leadPeakTilt = Math.abs(afterTransition.torsoTilt);
  let previous = afterTransition;
  for (let frame = 0; frame < LEAD_FRAMES; frame++) {
    targetedPreStep(rig.organism, desiredLeadTilt, previous.reactive);
    const immediate = snapshot(rig, reader, direction, t0);
    solve(rig);
    const post = snapshot(rig, reader, direction, t0);
    validateConstraint(post, stopEnabled, `lead f=${frame} dir=${direction} ${placement} stop=${stopEnabled}`);
    leadSolveMomentum += post.totalMomentum - immediate.totalMomentum;
    if (!post.reactive) leadSupportLoss += 1;
    leadPeakTilt = Math.max(leadPeakTilt, Math.abs(post.torsoTilt));
    previous = post;
  }

  const launchStart = previous;
  const fellBeforeLaunch = launchStart.fall;
  let commandSpeed = 0;
  let authorityImpulse = 0;
  let authorityNetImpulse = 0;
  let rampSolveMomentum = 0;
  let reactionFrames = 0;
  let supportLossFrames = 0;
  let qSum = 0;
  let qMin = 1;
  let qMax = 0;
  let peakTilt = Math.abs(launchStart.torsoTilt);
  let minOffset = launchStart.limitOffset;
  let maxOffset = launchStart.limitOffset;
  let maxPenetration = Math.max(0, -launchStart.limitOffset);
  const trace = [];

  for (let frame = 0; frame < RAMP_FRAMES; frame++) {
    const pre = previous;
    const q = qFromState(pre);
    qSum += q;
    qMin = Math.min(qMin, q);
    qMax = Math.max(qMax, q);

    const nextCommandSpeed = moveToward(commandSpeed, TARGET_SPEED, ACCEL * DT);
    const requestedDeltaV = nextCommandSpeed - commandSpeed;
    const grantedDeltaV = q * requestedDeltaV;
    const requestedAccel = requestedDeltaV / DT;
    const targetTilt = direction * Math.atan2(requestedAccel, G);

    targetedPreStep(rig.organism, targetTilt, pre.reactive);
    const beforeAuthority = snapshot(rig, reader, direction, t0);
    const auth = applyAuthority(rig, direction, placement, grantedDeltaV);
    const immediate = snapshot(rig, reader, direction, t0);

    if (Math.abs((immediate.relativeV - beforeAuthority.relativeV) - grantedDeltaV) > NUMERIC_VELOCITY_EPS) {
      throw new Error(`E13.2a immediate relative-dV mismatch f=${frame} dir=${direction} ${placement} stop=${stopEnabled}`);
    }
    if (Math.abs((immediate.totalMomentum - beforeAuthority.totalMomentum) - auth.expectedNetImpulse) > MOMENTUM_EPS) {
      throw new Error(`E13.2a immediate authority momentum mismatch f=${frame} dir=${direction} ${placement} stop=${stopEnabled}`);
    }

    solve(rig);
    const post = snapshot(rig, reader, direction, t0);
    validateConstraint(post, stopEnabled, `ramp f=${frame} dir=${direction} ${placement} stop=${stopEnabled}`);

    const solveMomentum = post.totalMomentum - immediate.totalMomentum;
    authorityImpulse += auth.impulse;
    authorityNetImpulse += auth.expectedNetImpulse;
    rampSolveMomentum += solveMomentum;
    if (Math.abs(solveMomentum) > MOMENTUM_EPS) reactionFrames += 1;
    if (!post.reactive) supportLossFrames += 1;
    peakTilt = Math.max(peakTilt, Math.abs(post.torsoTilt));
    minOffset = Math.min(minOffset, post.limitOffset);
    maxOffset = Math.max(maxOffset, post.limitOffset);
    maxPenetration = Math.max(maxPenetration, Math.max(0, -post.limitOffset));

    trace.push({
      frame,
      q,
      commandSpeed: nextCommandSpeed,
      requestedDeltaV,
      grantedDeltaV,
      authorityImpulse: auth.impulse,
      solveMomentum,
      relativeV: post.relativeV,
      playerV: post.playerV,
      supportV: post.supportV,
      offset: post.limitOffset,
      load: post.frameNormalImpulse,
      tilt: post.torsoTilt,
      reactive: post.reactive,
      fall: post.fall,
    });

    commandSpeed = nextCommandSpeed;
    previous = post;
  }

  const rampEnd = previous;
  let releaseSolveMomentum = 0;
  let releaseSupportLoss = 0;
  for (let frame = 0; frame < RELEASE_FRAMES; frame++) {
    targetedPreStep(rig.organism, 0, previous.reactive);
    const immediate = snapshot(rig, reader, direction, t0);
    solve(rig);
    const post = snapshot(rig, reader, direction, t0);
    validateConstraint(post, stopEnabled, `release f=${frame} dir=${direction} ${placement} stop=${stopEnabled}`);
    releaseSolveMomentum += post.totalMomentum - immediate.totalMomentum;
    if (!post.reactive) releaseSupportLoss += 1;
    peakTilt = Math.max(peakTilt, Math.abs(post.torsoTilt));
    minOffset = Math.min(minOffset, post.limitOffset);
    maxOffset = Math.max(maxOffset, post.limitOffset);
    maxPenetration = Math.max(maxPenetration, Math.max(0, -post.limitOffset));
    previous = post;
  }

  const final = previous;
  const result = {
    direction,
    placement,
    stopEnabled,
    t0,
    preTransition,
    launchStart,
    rampEnd,
    final,
    fellBeforeLaunch,
    leadSolveMomentum,
    leadSupportLoss,
    leadPeakTilt,
    authorityImpulse,
    authorityNetImpulse,
    rampSolveMomentum,
    releaseSolveMomentum,
    reactionFrames,
    supportLossFrames,
    releaseSupportLoss,
    qMean: qSum / RAMP_FRAMES,
    qMin,
    qMax,
    peakTilt,
    minOffset,
    maxOffset,
    maxPenetration,
    trace,
  };

  reader.destroy();
  b3.b3DestroyWorld(rig.world);
  return result;
}

function key(placement, stopEnabled) {
  return `${placement}/${stopEnabled ? 'ON' : 'OFF'}`;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 || TARGET_SPEED !== 5.2 ||
  PLAYER_MASS !== 80 || SUPPORT_MASS !== 800 || MU !== 0.95 || LEAD_FRAMES !== 8 || RAMP_FRAMES !== 11
) {
  throw new Error('E13.2a expected canonical E12/Donor-v1 current31/lead8 substrate');
}

console.log('E13.2a bounded current31 world-coupled placement trajectory');
console.log('  factorial: placement={world-external, reciprocal} x unilateral world-stop={OFF, ON} x mirrors +/- on the E13.0c1/d 800kg support representation.');
console.log('  history: 90f settle + neutral q solve -> zero-gap stop transition -> 8f accepted lead8 posture preparation -> fixed 11-frame nominal current31 command trajectory 0->5.2m/s -> 60f authority-free release.');
console.log('  authority: each fixed command frame grants q(previous solve) * requested support-relative dV; world-external uses player mass, reciprocal uses reduced mass + equal/opposite support recoil.');
console.log('  no outcome gate selects placement, target-speed success, RECOVER, world-reaction magnitude, or mirror symmetry. Only previously-qualified accounting/constraint bands can fail the harness.');

const byDirection = [];
for (const direction of DIRECTIONS) {
  const cases = new Map();
  for (const placement of PLACEMENTS) {
    for (const stopEnabled of STOP_STATES) {
      const result = runCase({ direction, placement, stopEnabled });
      cases.set(key(placement, stopEnabled), result);
    }
  }

  const reference = cases.get(key('world-external', false));
  for (const result of cases.values()) {
    if (physicalMutationDistance(reference.preTransition, result.preTransition) > PREMATCH_EPS) {
      throw new Error(`E13.2a factorial mismatch before stop transition dir=${direction} ${result.placement} stop=${result.stopEnabled}`);
    }
  }

  const extOff = cases.get(key('world-external', false));
  const extOn = cases.get(key('world-external', true));
  const recOff = cases.get(key('reciprocal', false));
  const recOn = cases.get(key('reciprocal', true));
  const summary = {
    direction,
    cases,
    extWorldEffect: extOn.rampSolveMomentum - extOff.rampSolveMomentum,
    recWorldEffect: recOn.rampSolveMomentum - recOff.rampSolveMomentum,
    placementWorldDelta: (recOn.rampSolveMomentum - recOff.rampSolveMomentum) - (extOn.rampSolveMomentum - extOff.rampSolveMomentum),
    extAgencyEffect: extOn.rampEnd.relativeV - extOff.rampEnd.relativeV,
    recAgencyEffect: recOn.rampEnd.relativeV - recOff.rampEnd.relativeV,
    extLeadWorldEffect: extOn.leadSolveMomentum - extOff.leadSolveMomentum,
    recLeadWorldEffect: recOn.leadSolveMomentum - recOff.leadSolveMomentum,
  };
  byDirection.push(summary);

  console.log(`  dir=${direction > 0 ? '+' : '-'}`);
  for (const placement of PLACEMENTS) {
    for (const stopEnabled of STOP_STATES) {
      const r = cases.get(key(placement, stopEnabled));
      console.log(
        `    ${placement.padEnd(14)} stop=${stopEnabled ? 'ON ' : 'OFF'} ` +
        `lead dP=${r.leadSolveMomentum.toFixed(3)}Ns tilt=${(Math.abs(r.launchStart.torsoTilt) * 180 / Math.PI).toFixed(2)}deg loss=${r.leadSupportLoss} ` +
        `q=${r.qMean.toFixed(3)}[${r.qMin.toFixed(3)},${r.qMax.toFixed(3)}] Jauth=${r.authorityImpulse.toFixed(2)}Ns net=${r.authorityNetImpulse.toFixed(2)}Ns ` +
        `ramp dP=${r.rampSolveMomentum.toFixed(2)}Ns reactF=${r.reactionFrames}/${RAMP_FRAMES} ` +
        `vRel=${r.rampEnd.relativeV.toFixed(3)}m/s player=${r.rampEnd.playerV.toFixed(3)} support=${r.rampEnd.supportV.toFixed(3)} ` +
        `offset=[${r.minOffset.toExponential(2)},${r.maxOffset.toExponential(2)}]m pen=${r.maxPenetration.toExponential(2)} ` +
        `load=${r.rampEnd.frameNormalImpulse.toFixed(2)}Ns peak=${(r.peakTilt * 180 / Math.PI).toFixed(1)}deg fall=${r.rampEnd.fall} ` +
        `release vRel=${r.final.relativeV.toFixed(3)} recovered=${r.final.recovered} supportLoss=${r.supportLossFrames}+${r.releaseSupportLoss}`,
      );
    }
  }
  console.log(
    `    stop-isolated ramp world effect ext=${summary.extWorldEffect.toFixed(3)}Ns recip=${summary.recWorldEffect.toFixed(3)}Ns placementDelta=${summary.placementWorldDelta.toFixed(3)}Ns | ` +
    `agency effect ext=${summary.extAgencyEffect.toFixed(4)} recip=${summary.recAgencyEffect.toFixed(4)}m/s | ` +
    `lead world effect ext=${summary.extLeadWorldEffect.toFixed(3)} recip=${summary.recLeadWorldEffect.toFixed(3)}Ns`,
  );
}

console.log('  per-frame reciprocal/ON trace:');
for (const summary of byDirection) {
  const r = summary.cases.get(key('reciprocal', true));
  console.log(`    dir=${summary.direction > 0 ? '+' : '-'}`);
  for (const f of r.trace) {
    console.log(
      `      f=${String(f.frame).padStart(2)} cmd=${f.commandSpeed.toFixed(3)} q=${f.q.toFixed(3)} grant=${f.grantedDeltaV.toFixed(4)} ` +
      `solveDP=${f.solveMomentum.toFixed(3)}Ns relV=${f.relativeV.toFixed(3)} supportV=${f.supportV.toFixed(3)} ` +
      `offset=${f.offset.toExponential(2)} load=${f.load.toFixed(2)} tilt=${(f.tilt * 180 / Math.PI).toFixed(1)}deg reactive=${f.reactive} fall=${f.fall}`,
    );
  }
}

console.log(
  'E13.2a PASS: the frozen current31/lead8 world-coupled trajectory completed under the qualified E12/E13 placement, entitlement and representation contracts. The printed ON-vs-OFF cumulative world reaction, support-boundary occupancy, q history, achieved support-relative agency, posture and release behavior are observations for architecture selection; this script deliberately does not promote reciprocal or world-external placement, tune a stop/contact rule, or change runtime/Donor behavior.',
);