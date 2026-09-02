import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const CANONICAL_SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const TOTAL_MASS = DONOR_PROFILE_V1.virtualMass;
const FINITE_TORQUE = 320;
const MU = 0.95;
const SUBSTEPS_SWEEP = [1, 2, 4, 8];
const ASSIST_ACCEL_SWEEP = [0, 4, 8, 12, 16];
const DIRECTIONS = [-1, 1];
const LEAD_FRAMES = 8;
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 180;
const RECOVER_STREAK = 30;
const LOAD_EPS = 1e-6;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const IDENTITY = [0, 0, 0, 1];
const NEAR_MATCH_SPEED_ERROR = 0.10;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makePlatform(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = MU;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...HALF);
  return body;
}

function createSupportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
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
    return { reactive: touching > 0 || loaded > 0, touching, loaded };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function targetedPreStep(organism, targetTilt, maxTorque) {
  organism._sync();
  const error = organism.torsoTilt - targetTilt;
  const omega = organism.torsoAngularVelocity[0];
  const requested = -organism.kp * error - organism.kd * omega;
  const torque = clamp(requested, -maxTorque, maxTorque);
  organism.lastBalanceTorque = torque;
  if (Math.abs(torque) > 1e-9) {
    const impulse = torque * DT;
    b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(organism.foot, [-impulse, 0, 0], true);
  }
  return torque;
}

function bodyVelocity(body) {
  const v = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(v, body);
  return v;
}

function wholeBodyState(organism) {
  organism._sync();
  const footV = bodyVelocity(organism.foot);
  const torsoV = bodyVelocity(organism.torso);
  const mass = organism.footMass + organism.torsoMass;
  return {
    mass,
    vel: [
      (organism.footMass * footV[0] + organism.torsoMass * torsoV[0]) / mass,
      (organism.footMass * footV[1] + organism.torsoMass * torsoV[1]) / mass,
      (organism.footMass * footV[2] + organism.torsoMass * torsoV[2]) / mass,
    ],
  };
}

function applyResidualAssist(organism, signedImpulse) {
  if (Math.abs(signedImpulse) <= 1e-12) return;
  const footImpulse = signedImpulse * organism.footMass / TOTAL_MASS;
  const torsoImpulse = signedImpulse * organism.torsoMass / TOTAL_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [0, 0, footImpulse], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [0, 0, torsoImpulse], true);
}

function runCase({ substeps, direction, assistAcceleration }) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
  });
  const reader = createSupportReader(organism);
  let support = reader.read();
  let platformZ = 0;
  let platformSpeed = 0;
  let targetReached = false;
  let stableFrames = 0;
  let recovered = false;
  let supportLossFrames = 0;
  let rampSupportLossFrames = 0;
  let assistFrames = 0;
  let assistWhileUnsupported = 0;
  let totalAssistImpulse = 0;
  let maxAssistImpulse = 0;
  let initialFootRelativeZ = 0;
  let maxFootRelativeDrift = 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);

  function step({ movePlatform = false, targetTilt = 0, allowAssist = false } = {}) {
    let actualAccel = 0;
    if (movePlatform) {
      const target = direction * TARGET_SPEED;
      const beforeSpeed = platformSpeed;
      platformSpeed = moveToward(platformSpeed, target, ACCEL * DT);
      actualAccel = (platformSpeed - beforeSpeed) / DT;
      platformZ += platformSpeed * DT;
      b3.b3Body_SetTargetTransform(
        platform,
        { position: [0, PLATFORM_Y, platformZ], quaternion: IDENTITY },
        DT,
        true,
      );
      if (Math.abs(platformSpeed - target) < 1e-9) targetReached = true;
    }

    const beforeAssist = wholeBodyState(organism);
    let assistImpulse = 0;
    if (allowAssist && assistAcceleration > 0 && support.reactive) {
      const desiredVz = direction * Math.abs(platformSpeed);
      const signedShortfall = direction * (desiredVz - beforeAssist.vel[2]);
      const assistDv = Math.min(
        Math.max(0, signedShortfall),
        assistAcceleration * DT,
      );
      assistImpulse = direction * TOTAL_MASS * assistDv;
      applyResidualAssist(organism, assistImpulse);
      if (Math.abs(assistImpulse) > 1e-12) {
        assistFrames += 1;
        totalAssistImpulse += assistImpulse;
        maxAssistImpulse = Math.max(maxAssistImpulse, Math.abs(assistImpulse));
      }
    } else if (allowAssist && assistAcceleration > 0 && !support.reactive) {
      assistWhileUnsupported += 1;
    }

    const commandedTilt = movePlatform
      ? direction * Math.atan2(Math.abs(actualAccel), G)
      : targetTilt;
    targetedPreStep(
      organism,
      commandedTilt,
      support.reactive ? FINITE_TORQUE : 0,
    );

    b3.b3World_Step(world, DT, substeps);
    organism.postStep();
    support = reader.read();
    if (!support.reactive) {
      supportLossFrames += 1;
      if (movePlatform && !targetReached) rampSupportLossFrames += 1;
    }

    const relativeFootZ = organism.footCom[2] - platformZ - initialFootRelativeZ;
    maxFootRelativeDrift = Math.max(maxFootRelativeDrift, Math.abs(relativeFootZ));

    if (targetReached && organism.isRecovered() && support.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;

    return assistImpulse;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!support.reactive) throw new Error(`E5.2 failed to establish support at substeps=${substeps}`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E5.2 organism mass ${settled.mass} no longer matches Donor-v1 comparison mass ${TOTAL_MASS}`);
  }

  initialFootRelativeZ = organism.footCom[2] - platformZ;
  supportLossFrames = 0;
  rampSupportLossFrames = 0;
  stableFrames = 0;
  recovered = false;
  assistFrames = 0;
  assistWhileUnsupported = 0;
  totalAssistImpulse = 0;
  maxAssistImpulse = 0;
  maxFootRelativeDrift = 0;

  for (let i = 0; i < LEAD_FRAMES; i++) step({ targetTilt: desiredTilt });
  const launch = wholeBodyState(organism);
  const launchTiltDeg = organism.torsoTilt * 180 / Math.PI;

  const maxRampFrames = Math.ceil(TARGET_SPEED / ACCEL / DT) + 3;
  for (let i = 0; i < maxRampFrames && !targetReached; i++) {
    step({ movePlatform: true, allowAssist: true });
  }
  if (!targetReached) throw new Error(`E5.2 failed to reach platform target at substeps=${substeps}`);
  const rampEnd = wholeBodyState(organism);
  const rampAssistImpulse = totalAssistImpulse;
  const rampAssistFrames = assistFrames;
  const rampAssistUnsupported = assistWhileUnsupported;
  const rampSupportLoss = rampSupportLossFrames;

  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });
  const telemetry = organism.telemetry();

  const signedProgressImpulse = direction * TOTAL_MASS * (rampEnd.vel[2] - launch.vel[2]);
  const signedAssistProgress = direction * rampAssistImpulse;
  const signedSupportProgress = signedProgressImpulse - signedAssistProgress;
  const requiredFromLaunch = TOTAL_MASS * (TARGET_SPEED - direction * launch.vel[2]);
  const speedAtRampEnd = direction * rampEnd.vel[2];
  const speedError = TARGET_SPEED - speedAtRampEnd;

  const result = {
    substeps,
    direction,
    assistAcceleration,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: telemetry.peakAbsTilt * 180 / Math.PI,
    launchTiltDeg,
    launchSpeed: direction * launch.vel[2],
    speedAtRampEnd,
    speedError,
    nearMatch: Math.abs(speedError) <= NEAR_MATCH_SPEED_ERROR,
    requiredFromLaunch,
    progressImpulse: signedProgressImpulse,
    supportProgressImpulse: signedSupportProgress,
    assistProgressImpulse: signedAssistProgress,
    progressFraction: requiredFromLaunch > 1e-9 ? signedProgressImpulse / requiredFromLaunch : 1,
    supportFraction: requiredFromLaunch > 1e-9 ? signedSupportProgress / requiredFromLaunch : 0,
    assistFraction: requiredFromLaunch > 1e-9 ? signedAssistProgress / requiredFromLaunch : 0,
    rampAssistFrames,
    rampAssistUnsupported,
    maxAssistImpulse,
    rampSupportLoss,
    supportLossFrames,
    maxFootRelativeDrift,
  };

  reader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 ||
  CANONICAL_SUBSTEPS !== 4 ||
  G !== 20 ||
  ACCEL !== 31 ||
  TARGET_SPEED !== 5.2 ||
  TOTAL_MASS !== 80
) {
  throw new Error('E5.2 expected accepted Donor-v1/E4 envelope changed; requalify residual authority accounting');
}

console.log('E5.2 support-gated residual-authority accounting');
console.log(`  lead=${LEAD_FRAMES}f, current launch=${ACCEL}m/s² -> ${TARGET_SPEED}m/s, residual caps=${ASSIST_ACCEL_SWEEP.join(',')}m/s²`);
console.log('  residual assist is world-external and mass-proportional across foot+torso, but may act only while reactive support exists. It is a diagnostic accounting channel, not a proposed runtime controller.');

const results = [];
for (const substeps of SUBSTEPS_SWEEP) {
  for (const assistAcceleration of ASSIST_ACCEL_SWEEP) {
    for (const direction of DIRECTIONS) {
      const r = runCase({ substeps, direction, assistAcceleration });
      results.push(r);
      console.log(
        `sub=${substeps} assist=${String(assistAcceleration).padStart(2)} dir=${direction > 0 ? '+' : '-'} ${r.outcome.padEnd(7)} ` +
        `launch=${r.launchTiltDeg.toFixed(2)}deg vEnd=${r.speedAtRampEnd.toFixed(3)} err=${r.speedError.toFixed(3)} ` +
        `P=${r.progressFraction.toFixed(3)} support=${r.supportFraction.toFixed(3)} assist=${r.assistFraction.toFixed(3)} ` +
        `Jassist=${r.assistProgressImpulse.toFixed(1)}Ns/${r.rampAssistFrames}f maxJ=${r.maxAssistImpulse.toFixed(1)} ` +
        `footRel=${r.maxFootRelativeDrift.toFixed(3)}m rampLoss=${r.rampSupportLoss} assistNoSupport=${r.rampAssistUnsupported}`,
      );
    }
  }
}

function pair(substeps, assistAcceleration) {
  return DIRECTIONS.map((direction) => results.find(
    (r) => r.substeps === substeps &&
      r.assistAcceleration === assistAcceleration &&
      r.direction === direction,
  ));
}

// Preserve E5.1/E4.5 reference before reading residual-assist effects.
for (const substeps of SUBSTEPS_SWEEP) {
  const reference = pair(substeps, 0);
  const expected = substeps === 1 ? 'FALL' : 'RECOVER';
  if (!reference.every((r) => r.outcome === expected)) {
    throw new Error(`E5.2 physical-only lead8 failed to reproduce ${expected}/${expected} at substeps=${substeps}`);
  }
}

if (!results.every((r) => r.rampAssistUnsupported === 0)) {
  throw new Error('E5.2 applied residual authority during an unsupported ramp frame');
}

console.log('E5.2 first symmetric near-match (|vEnd-5.2| <= 0.10m/s):');
for (const substeps of SUBSTEPS_SWEEP) {
  const first = ASSIST_ACCEL_SWEEP.find((assistAcceleration) => {
    const p = pair(substeps, assistAcceleration);
    return p.every((r) => r.nearMatch);
  });
  if (first === undefined) {
    console.log(`  sub=${substeps}: OPEN within declared ${Math.max(...ASSIST_ACCEL_SWEEP)}m/s² residual cap`);
  } else {
    const p = pair(substeps, first);
    console.log(
      `  sub=${substeps}: assistCap=${first}m/s² outcomes=${p.map((r) => r.outcome[0]).join('/')} ` +
      `assistFraction=${p.map((r) => r.assistFraction.toFixed(3)).join('/')} ` +
      `supportFraction=${p.map((r) => r.supportFraction.toFixed(3)).join('/')} ` +
      `vEnd=${p.map((r) => r.speedAtRampEnd.toFixed(3)).join('/')}`,
    );
  }
}

console.log('E5.2 PASS: the residual world-external authority needed to close the accepted launch response is now explicitly measurable as a separate momentum contribution after physical support/contact has acted. Support gating prevents this diagnostic residual from becoming an airborne right. The sweep is evidence about the cost of preserving agency; it does not promote hybrid assistance, a cap, or a locomotion architecture.');
