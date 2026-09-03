import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const MAX_SPEED = DONOR_PROFILE_V1.maxSpeed;
const SUPPORT_MASS = 800;
const FINITE_TORQUE = 320;
const MU = 0.95;
const SETTLE_FRAMES = 90;
const LEAD_FRAMES = 8;
const LOAD_EPS = 1e-6;
const SUPPORT_HALF = [2, 0.25, 30];
const PLATFORM_Y = -SUPPORT_HALF[1];
const UPPER_TRAVEL = 2 * SUPPORT_HALF[2];
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const Y_POS_90 = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const DIRECTIONS = [-1, 1];
const NOMINAL_FRAME_LOAD = PLAYER_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = MU * NOMINAL_FRAME_LOAD;

// Reused paid-for transition / representation bands. None are selected from
// E13.2a or from this experiment's outcome.
const MAX_DIFFERENTIAL_WORLD_IMPULSE = 0.03 * PLAYER_MASS * G * DT; // E10.0b / E13.0d = 0.8 Ns
const MAX_INSTANT_LOAD_DELTA = 0.10 * NOMINAL_FRAME_LOAD; // E13.0c1/d
const MAX_TILT_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverTiltRadians; // E13.0c1/d
const MAX_ANGULAR_SPEED_DELTA = 0.10 * E3_SAGITTAL_DEFAULTS.recoverAngularSpeed; // E13.0c1/d
const MAX_RELATIVE_Z_DELTA = 1e-3; // E13.0c1/d
const MAX_RELATIVE_V_DELTA = 0.002 * MAX_SPEED; // E13.0c1/d
const MAX_SUPPORT_Z_DELTA = MAX_RELATIVE_Z_DELTA;
const MAX_SUPPORT_V_DELTA = MAX_RELATIVE_V_DELTA;
const CONSTRAINT_EPS = 1e-4; // E13.0b-d
const PREMATCH_EPS = 1e-9;
const IMMEDIATE_EPS = 1e-12;

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

  if (Math.abs(b3.b3Body_GetMass(support) - SUPPORT_MASS) > 1e-3) {
    throw new Error('E13.2b support mass contract changed');
  }
  if (Math.abs(organism.footMass + organism.torsoMass - PLAYER_MASS) > 1e-3) {
    throw new Error('E13.2b player mass contract changed');
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
  return {
    translation,
    limitOffset: translation - t0,
    supportZ,
    supportV,
    relativeZ: direction * player.z - supportZ,
    relativeV: direction * player.vz - supportV,
    torsoTilt: direction * player.torsoTilt,
    footTilt: direction * player.footTilt,
    torsoW: direction * player.torsoW,
    footW: direction * player.footW,
    totalMomentum: direction * (PLAYER_MASS * player.vz + SUPPORT_MASS * v[2]),
    frameNormalImpulse: support.frameNormalImpulse,
    reactive: support.reactive,
    fall: player.fall,
    supportX: p[0],
    constrainedYBias: p[1] - PLATFORM_Y,
    constrainedVx: v[0],
    constrainedVy: v[1],
    rotationError: rotationError(rig.support),
    bindingError: Math.abs(translation - supportZ),
  };
}

function stateDistance(a, b) {
  return Math.max(
    Math.abs(a.translation - b.translation),
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
    throw new Error(`E13.2b support constraint leak ${label}`);
  }
  if (stopEnabled && state.limitOffset < -CONSTRAINT_EPS) {
    throw new Error(`E13.2b lower-stop penetration beyond paid band ${label}: ${state.limitOffset}`);
  }
}

function targetedPreStep(organism, targetTilt, supportReactive) {
  organism._sync();
  const requested = -organism.kp * (organism.torsoTilt - targetTilt) - organism.kd * organism.torsoAngularVelocity[0];
  const torque = clamp(requested, -FINITE_TORQUE, FINITE_TORQUE);
  const applied = supportReactive ? torque : 0;
  organism.lastBalanceTorque = applied;
  if (Math.abs(applied) > 1e-9) {
    const impulse = applied * DT;
    b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(organism.foot, [-impulse, 0, 0], true);
  }
}

function solve(rig) {
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  rig.organism.postStep();
}

function qFromState(state) {
  if (!state.reactive) return 0;
  return clamp(MU * state.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY, 0, 1);
}

function runPair(direction) {
  const control = makeRig(direction);
  const candidate = makeRig(direction);
  const controlReader = createSupportReader(control.organism, control.supportShape);
  const candidateReader = createSupportReader(candidate.organism, candidate.supportShape);
  let controlSignal = controlReader.read();
  let candidateSignal = candidateReader.read();

  function matchedPostureStep(targetTilt) {
    targetedPreStep(control.organism, targetTilt, controlSignal.reactive);
    targetedPreStep(candidate.organism, targetTilt, candidateSignal.reactive);
    solve(control);
    solve(candidate);
    controlSignal = controlReader.read();
    candidateSignal = candidateReader.read();
  }

  for (let frame = 0; frame < SETTLE_FRAMES; frame++) matchedPostureStep(0);

  const leadTarget = direction * Math.atan2(ACCEL, G);
  for (let frame = 0; frame < LEAD_FRAMES; frame++) matchedPostureStep(leadTarget);

  const controlT = b3.b3PrismaticJoint_GetTranslation(control.joint);
  const candidateT = b3.b3PrismaticJoint_GetTranslation(candidate.joint);
  if (Math.abs(controlT - candidateT) > PREMATCH_EPS) {
    throw new Error(`E13.2b matched prepared translation diverged dir=${direction}`);
  }
  const tLead = 0.5 * (controlT + candidateT);
  const preControl = snapshot(control, controlReader, direction, tLead);
  const preCandidate = snapshot(candidate, candidateReader, direction, tLead);
  if (stateDistance(preControl, preCandidate) > PREMATCH_EPS) {
    throw new Error(`E13.2b matched free-prismatic prepared states diverged dir=${direction}`);
  }
  if (!preControl.reactive || !preCandidate.reactive || preControl.fall || preCandidate.fall) {
    throw new Error(`E13.2b lead8 prepared state was not qualified dir=${direction}`);
  }
  validateConstraint(preControl, false, `prepared control dir=${direction}`);
  validateConstraint(preCandidate, false, `prepared candidate dir=${direction}`);

  // Both rigs receive identical current-state limit geometry. The only causal
  // difference is enabling the lower stop in the candidate. No gap, reset,
  // translational authority or post-result parameter is introduced.
  b3.b3PrismaticJoint_SetLimits(control.joint, tLead, tLead + UPPER_TRAVEL);
  b3.b3PrismaticJoint_SetLimits(candidate.joint, tLead, tLead + UPPER_TRAVEL);
  b3.b3PrismaticJoint_EnableLimit(candidate.joint, true);

  if (b3.b3PrismaticJoint_IsLimitEnabled(control.joint)) {
    throw new Error(`E13.2b control limit unexpectedly enabled dir=${direction}`);
  }
  if (!b3.b3PrismaticJoint_IsLimitEnabled(candidate.joint)) {
    throw new Error(`E13.2b candidate limit failed to enable dir=${direction}`);
  }

  const immediateControl = snapshot(control, controlReader, direction, tLead);
  const immediateCandidate = snapshot(candidate, candidateReader, direction, tLead);
  if (
    stateDistance(preControl, immediateControl) > IMMEDIATE_EPS ||
    stateDistance(preCandidate, immediateCandidate) > IMMEDIATE_EPS
  ) {
    throw new Error(`E13.2b limit API transition mutated body state before solve dir=${direction}`);
  }

  // Exactly one matched prepared-posture outer step. No translational authority.
  targetedPreStep(control.organism, leadTarget, immediateControl.reactive);
  targetedPreStep(candidate.organism, leadTarget, immediateCandidate.reactive);
  const beforeSolveControl = snapshot(control, controlReader, direction, tLead);
  const beforeSolveCandidate = snapshot(candidate, candidateReader, direction, tLead);
  if (stateDistance(beforeSolveControl, beforeSolveCandidate) > PREMATCH_EPS) {
    throw new Error(`E13.2b matched internal posture actuation diverged before solve dir=${direction}`);
  }

  solve(control);
  solve(candidate);
  const postControl = snapshot(control, controlReader, direction, tLead);
  const postCandidate = snapshot(candidate, candidateReader, direction, tLead);
  validateConstraint(postControl, false, `post control dir=${direction}`);
  validateConstraint(postCandidate, true, `post candidate dir=${direction}`);

  const controlWorldImpulse = postControl.totalMomentum - beforeSolveControl.totalMomentum;
  const candidateWorldImpulse = postCandidate.totalMomentum - beforeSolveCandidate.totalMomentum;
  const differentialWorldImpulse = candidateWorldImpulse - controlWorldImpulse;
  const deltas = {
    worldImpulse: differentialWorldImpulse,
    load: postCandidate.frameNormalImpulse - postControl.frameNormalImpulse,
    relativeZ: postCandidate.relativeZ - postControl.relativeZ,
    relativeV: postCandidate.relativeV - postControl.relativeV,
    supportZ: postCandidate.supportZ - postControl.supportZ,
    supportV: postCandidate.supportV - postControl.supportV,
    torsoTilt: postCandidate.torsoTilt - postControl.torsoTilt,
    footTilt: postCandidate.footTilt - postControl.footTilt,
    torsoW: postCandidate.torsoW - postControl.torsoW,
    footW: postCandidate.footW - postControl.footW,
  };

  const gates = {
    worldImpulse: Math.abs(deltas.worldImpulse) <= MAX_DIFFERENTIAL_WORLD_IMPULSE,
    load: Math.abs(deltas.load) <= MAX_INSTANT_LOAD_DELTA,
    relativeZ: Math.abs(deltas.relativeZ) <= MAX_RELATIVE_Z_DELTA,
    relativeV: Math.abs(deltas.relativeV) <= MAX_RELATIVE_V_DELTA,
    supportZ: Math.abs(deltas.supportZ) <= MAX_SUPPORT_Z_DELTA,
    supportV: Math.abs(deltas.supportV) <= MAX_SUPPORT_V_DELTA,
    torsoTilt: Math.abs(deltas.torsoTilt) <= MAX_TILT_DELTA,
    footTilt: Math.abs(deltas.footTilt) <= MAX_TILT_DELTA,
    torsoW: Math.abs(deltas.torsoW) <= MAX_ANGULAR_SPEED_DELTA,
    footW: Math.abs(deltas.footW) <= MAX_ANGULAR_SPEED_DELTA,
  };
  const neutral = Object.values(gates).every(Boolean);

  const result = {
    direction,
    tLead,
    leadTarget,
    pre: preControl,
    qPrepared: qFromState(preControl),
    controlWorldImpulse,
    candidateWorldImpulse,
    differentialWorldImpulse,
    postControl,
    postCandidate,
    deltas,
    gates,
    neutral,
  };

  controlReader.destroy();
  candidateReader.destroy();
  b3.b3DestroyWorld(control.world);
  b3.b3DestroyWorld(candidate.world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 || PLAYER_MASS !== 80 ||
  SUPPORT_MASS !== 800 || MU !== 0.95 || LEAD_FRAMES !== 8
) {
  throw new Error('E13.2b expected canonical E12/E13 current31/lead8 substrate');
}

console.log('E13.2b prepared-state unilateral world-stop engagement gate');
console.log('  both copies: E13.0c1-qualified FREE prismatic support + finite 320Nm player, 90f settle, then exact 8f current31 lead posture with no translational authority.');
console.log('  transition at the already-prepared state: both SetLimits([current t, current t+60m]); control remains OFF, candidate enables the same lower stop. No gap, body reset, support reset or authority pulse.');
console.log('  observation: API transition must be mutation-free, then exactly one identical prepared-posture solve. Existing E10/E13 transition and representation bands classify the physical result as NEUTRAL or MATERIAL; neither verdict is tuned or treated as a harness failure.');

const results = DIRECTIONS.map(runPair);
for (const r of results) {
  const d = r.deltas;
  const failed = Object.entries(r.gates).filter(([, pass]) => !pass).map(([name]) => name);
  console.log(`  dir=${r.direction > 0 ? '+' : '-'}`);
  console.log(
    `    prepared t=${r.tLead.toExponential(6)}m q=${r.qPrepared.toFixed(3)} load=${r.pre.frameNormalImpulse.toFixed(3)}Ns ` +
    `supportV=${r.pre.supportV.toFixed(6)}m/s relV=${r.pre.relativeV.toFixed(6)}m/s torso=${(r.pre.torsoTilt * 180 / Math.PI).toFixed(3)}deg w=${r.pre.torsoW.toFixed(4)}rad/s`,
  );
  console.log(
    `    one-solve world dP control/candidate=${r.controlWorldImpulse.toFixed(6)}/${r.candidateWorldImpulse.toFixed(6)}Ns diff=${r.differentialWorldImpulse.toFixed(6)}Ns ` +
    `candidateOffset=${r.postCandidate.limitOffset.toExponential(3)}m`,
  );
  console.log(
    `    candidate-control Δ load=${d.load.toFixed(6)}Ns relZ=${d.relativeZ.toExponential(3)}m relV=${d.relativeV.toExponential(3)}m/s ` +
    `supportZ=${d.supportZ.toExponential(3)}m supportV=${d.supportV.toExponential(3)}m/s ` +
    `torso=${(d.torsoTilt * 180 / Math.PI).toFixed(4)}deg foot=${(d.footTilt * 180 / Math.PI).toFixed(4)}deg ` +
    `torsoW=${d.torsoW.toExponential(3)} footW=${d.footW.toExponential(3)}rad/s`,
  );
  console.log(`    prepared-state engagement verdict=${r.neutral ? 'NEUTRAL' : 'MATERIAL'}${failed.length ? ` failedPaidBands=[${failed.join(',')}]` : ''}`);
}

const verdicts = results.map((r) => (r.neutral ? 'NEUTRAL' : 'MATERIAL')).join('/');
console.log(
  `E13.2b PASS: the prepared-state engagement boundary was causally measured in both mirrors; verdict -/+=${verdicts}. ` +
  'PASS here means the frozen experiment and its previously-paid classification bands were satisfied as a measurement harness, not that world-stop engagement was physically neutral. If MATERIAL, engagement must be treated as a real physical event rather than hidden controller plumbing; if NEUTRAL, a later matched prepared-state launch may isolate placement from lead-history coupling. No runtime/Donor policy is promoted.',
);