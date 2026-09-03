import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const TOTAL_MASS = DONOR_PROFILE_V1.virtualMass;
const FINITE_TORQUE = 320;
const MU = 0.95;
const DIRECTIONS = [-1, 1];
const LEAD_FRAMES = 8;
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 180;
const RECOVER_STREAK = 30;
const LOAD_EPS = 1e-6;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const IDENTITY = [0, 0, 0, 1];

// Existing paid-for boundaries. E11.0a does not tune these from its result.
const NEAR_MATCH_SPEED_ERROR = 0.10; // E5.2 diagnostic near-match window
const MAX_SUPPORT_FRACTION_DROP = 0.05; // E6 representation whole-body impulse-fraction envelope
const MAX_MIRROR_SPEED_GAP = 0.15; // E6 mirrored candidate speed envelope
const MAX_MIRROR_SUPPORT_FRACTION_GAP = 0.035; // E6 mirrored impulse-fraction envelope
const ACCEPTED_FRAME_IMPULSE = TOTAL_MASS * ACCEL * DT;
const NUMERIC_EPS = 1e-6;
const MATCH_EPS = 1e-8;

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

function applyMassProportionalResidual(organism, signedImpulse) {
  if (Math.abs(signedImpulse) <= 1e-12) return;
  const footImpulse = signedImpulse * organism.footMass / TOTAL_MASS;
  const torsoImpulse = signedImpulse * organism.torsoMass / TOTAL_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [0, 0, footImpulse], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [0, 0, torsoImpulse], true);
}

function runCase({ direction, lockedDeficitBudget = null }) {
  const assistMode = lockedDeficitBudget !== null;
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
  let totalPhysicalImpulse = 0;
  let totalAssistImpulse = 0;
  let assistFrames = 0;
  let assistUnsupportedFrames = 0;
  let assistAfterNonpositivePhysicalFrames = 0;
  let blockedUnsupportedFrames = 0;
  let blockedNonpositivePhysicalFrames = 0;
  let maxAssistImpulse = 0;
  let remainingBudget = lockedDeficitBudget ?? 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);

  function step({ movePlatform = false, targetTilt = 0, ramp = false } = {}) {
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

    const supportBefore = support.reactive;
    const beforePhysics = wholeBodyState(organism);
    const commandedTilt = movePlatform
      ? direction * Math.atan2(Math.abs(actualAccel), G)
      : targetTilt;
    targetedPreStep(
      organism,
      commandedTilt,
      supportBefore ? FINITE_TORQUE : 0,
    );

    // Physics/contact always acts first. Residual is forbidden from changing the
    // same-frame solve that earns the physical support impulse.
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    const afterPhysics = wholeBodyState(organism);
    support = reader.read();

    if (!support.reactive) {
      supportLossFrames += 1;
      if (ramp) rampSupportLossFrames += 1;
    }

    const signedPhysicalImpulse = direction * TOTAL_MASS * (
      afterPhysics.vel[2] - beforePhysics.vel[2]
    );
    if (ramp) totalPhysicalImpulse += signedPhysicalImpulse;

    let assistImpulse = 0;
    if (ramp && assistMode && remainingBudget > NUMERIC_EPS) {
      const desiredDirectionalSpeed = Math.abs(platformSpeed);
      const directionalSpeedAfterPhysics = direction * afterPhysics.vel[2];
      const speedShortfall = desiredDirectionalSpeed - directionalSpeedAfterPhysics;
      const wantsAssist = speedShortfall > NUMERIC_EPS;
      const supportQualified = supportBefore && support.reactive;
      const physicsQualified = signedPhysicalImpulse > NUMERIC_EPS;

      if (wantsAssist && !supportQualified) blockedUnsupportedFrames += 1;
      if (wantsAssist && supportQualified && !physicsQualified) blockedNonpositivePhysicalFrames += 1;

      if (wantsAssist && supportQualified && physicsQualified) {
        const requestedImpulse = TOTAL_MASS * speedShortfall;
        const magnitude = Math.min(
          requestedImpulse,
          remainingBudget,
          ACCEPTED_FRAME_IMPULSE,
        );
        assistImpulse = direction * magnitude;
        applyMassProportionalResidual(organism, assistImpulse);
        totalAssistImpulse += magnitude;
        remainingBudget -= magnitude;
        assistFrames += 1;
        maxAssistImpulse = Math.max(maxAssistImpulse, magnitude);
        if (!supportQualified) assistUnsupportedFrames += 1;
        if (!physicsQualified) assistAfterNonpositivePhysicalFrames += 1;
      }
    }

    const afterAll = assistImpulse !== 0 ? wholeBodyState(organism) : afterPhysics;

    if (targetReached && organism.isRecovered() && support.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;

    return { signedPhysicalImpulse, assistImpulse, afterPhysics, afterAll };
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!support.reactive) throw new Error(`E11.0a failed to establish support dir=${direction}`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E11.0a organism mass ${settled.mass} != ${TOTAL_MASS}kg`);
  }

  supportLossFrames = 0;
  rampSupportLossFrames = 0;
  stableFrames = 0;
  recovered = false;
  totalPhysicalImpulse = 0;
  totalAssistImpulse = 0;
  assistFrames = 0;
  assistUnsupportedFrames = 0;
  assistAfterNonpositivePhysicalFrames = 0;
  blockedUnsupportedFrames = 0;
  blockedNonpositivePhysicalFrames = 0;
  maxAssistImpulse = 0;
  remainingBudget = lockedDeficitBudget ?? 0;

  for (let i = 0; i < LEAD_FRAMES; i++) step({ targetTilt: desiredTilt });
  const launch = wholeBodyState(organism);
  const launchTiltDeg = organism.torsoTilt * 180 / Math.PI;
  const launchOmega = organism.torsoAngularVelocity[0];

  const maxRampFrames = Math.ceil(TARGET_SPEED / ACCEL / DT) + 3;
  let rampFrames = 0;
  for (let i = 0; i < maxRampFrames && !targetReached; i++) {
    step({ movePlatform: true, ramp: true });
    rampFrames += 1;
  }
  if (!targetReached) throw new Error(`E11.0a platform failed to reach target dir=${direction}`);
  const rampEnd = wholeBodyState(organism);

  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });
  const telemetry = organism.telemetry();

  const requiredFromLaunch = TOTAL_MASS * (TARGET_SPEED - direction * launch.vel[2]);
  const totalProgressImpulse = direction * TOTAL_MASS * (rampEnd.vel[2] - launch.vel[2]);
  const accountingError = Math.abs(
    totalProgressImpulse - (totalPhysicalImpulse + totalAssistImpulse)
  );

  const result = {
    direction,
    assistMode,
    lockedDeficitBudget: lockedDeficitBudget ?? 0,
    remainingBudget,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    fall: telemetry.fallObserved,
    peakTiltDeg: telemetry.peakAbsTilt * 180 / Math.PI,
    launchTiltDeg,
    launchOmega,
    launchSpeed: direction * launch.vel[2],
    rampFrames,
    requiredFromLaunch,
    physicalImpulse: totalPhysicalImpulse,
    assistImpulse: totalAssistImpulse,
    totalProgressImpulse,
    physicalFraction: requiredFromLaunch > 1e-9 ? totalPhysicalImpulse / requiredFromLaunch : 1,
    assistFraction: requiredFromLaunch > 1e-9 ? totalAssistImpulse / requiredFromLaunch : 0,
    totalFraction: requiredFromLaunch > 1e-9 ? totalProgressImpulse / requiredFromLaunch : 1,
    speedAtRampEnd: direction * rampEnd.vel[2],
    speedError: TARGET_SPEED - direction * rampEnd.vel[2],
    nearMatch: Math.abs(TARGET_SPEED - direction * rampEnd.vel[2]) <= NEAR_MATCH_SPEED_ERROR,
    rampSupportLossFrames,
    supportLossFrames,
    assistFrames,
    assistUnsupportedFrames,
    assistAfterNonpositivePhysicalFrames,
    blockedUnsupportedFrames,
    blockedNonpositivePhysicalFrames,
    maxAssistImpulse,
    accountingError,
  };

  reader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 ||
  SUBSTEPS !== 4 ||
  G !== 20 ||
  ACCEL !== 31 ||
  TARGET_SPEED !== 5.2 ||
  TOTAL_MASS !== 80
) {
  throw new Error('E11.0a expected canonical Donor-v1/E5 current31 substrate');
}

console.log('E11.0a physics-first locked-deficit residual authority falsifier');
console.log('  exact E5.1 current31/lead8/canonical-substeps organism; no runtime/Donor changes');
console.log('  sequencing: posture -> Box3D/contact solve -> measure exact whole-body support ΔP -> optional mass-proportional residual');
console.log('  residual eligibility requires support before+after solve AND positive intent-aligned physical support impulse in that same frame');
console.log(`  per-frame residual <= accepted current31 impulse ${ACCEPTED_FRAME_IMPULSE.toFixed(4)}Ns; total residual budget is locked from matched physical-only deficit, never expanded in candidate`);
console.log(`  gates: |vEnd-${TARGET_SPEED}|<=${NEAR_MATCH_SPEED_ERROR.toFixed(2)}m/s, physical-share drop<=${MAX_SUPPORT_FRACTION_DROP.toFixed(3)}, mirror speed<=${MAX_MIRROR_SPEED_GAP.toFixed(2)}m/s, mirror physical-share<=${MAX_MIRROR_SUPPORT_FRACTION_GAP.toFixed(3)}`);

const references = new Map();
for (const direction of DIRECTIONS) {
  const reference = runCase({ direction });
  references.set(direction, reference);
  if (reference.outcome !== 'RECOVER' || reference.rampSupportLossFrames !== 0) {
    throw new Error(`E11.0a physical-only reference failed E5.1 survivor dir=${direction}`);
  }
  if (reference.accountingError > NUMERIC_EPS) {
    throw new Error(`E11.0a reference momentum accounting error dir=${direction}: ${reference.accountingError}`);
  }
  console.log(
    `  REF dir=${direction > 0 ? '+' : '-'} ${reference.outcome} ` +
    `launch=${reference.launchSpeed.toFixed(4)}m/s vEnd=${reference.speedAtRampEnd.toFixed(4)} ` +
    `need=${reference.requiredFromLaunch.toFixed(2)}Ns Jphys=${reference.physicalImpulse.toFixed(2)} ` +
    `phys=${reference.physicalFraction.toFixed(4)} deficit=${Math.max(0, reference.requiredFromLaunch - reference.physicalImpulse).toFixed(2)}Ns ` +
    `loss=${reference.rampSupportLossFrames}`,
  );
}

const referenceMirrorGap = Math.abs(
  references.get(-1).physicalFraction - references.get(1).physicalFraction
);
if (referenceMirrorGap > MAX_MIRROR_SUPPORT_FRACTION_GAP) {
  throw new Error(`E11.0a physical-only reference mirror fraction gap ${referenceMirrorGap} exceeds paid-for E6 envelope`);
}

const candidates = new Map();
const failures = [];
for (const direction of DIRECTIONS) {
  const reference = references.get(direction);
  const deficitBudget = Math.max(0, reference.requiredFromLaunch - reference.physicalImpulse);
  const candidate = runCase({ direction, lockedDeficitBudget: deficitBudget });
  candidates.set(direction, candidate);

  const launchMismatch = Math.abs(candidate.launchSpeed - reference.launchSpeed);
  const supportFractionDrop = reference.physicalFraction - candidate.physicalFraction;
  const budgetOverrun = candidate.assistImpulse - deficitBudget;

  console.log(
    `  CAND dir=${direction > 0 ? '+' : '-'} ${candidate.outcome} ` +
    `launch=${candidate.launchSpeed.toFixed(4)} vEnd=${candidate.speedAtRampEnd.toFixed(4)} err=${candidate.speedError.toFixed(4)} ` +
    `Jphys=${candidate.physicalImpulse.toFixed(2)}(${candidate.physicalFraction.toFixed(4)}) ` +
    `Jassist=${candidate.assistImpulse.toFixed(2)}(${candidate.assistFraction.toFixed(4)})/${deficitBudget.toFixed(2)}Ns ` +
    `total=${candidate.totalFraction.toFixed(4)} physDrop=${supportFractionDrop.toFixed(4)} ` +
    `assistFrames=${candidate.assistFrames} maxJ=${candidate.maxAssistImpulse.toFixed(2)} ` +
    `loss=${candidate.rampSupportLossFrames}/${candidate.supportLossFrames} blocked(noSupport/nonPositive)=${candidate.blockedUnsupportedFrames}/${candidate.blockedNonpositivePhysicalFrames}`,
  );

  if (launchMismatch > MATCH_EPS) {
    failures.push(`matched candidate launch diverged dir=${direction}: ${launchMismatch}`);
  }
  if (candidate.outcome !== 'RECOVER' || candidate.fall) {
    failures.push(`candidate did not remain recovered dir=${direction}`);
  }
  if (!candidate.nearMatch) {
    failures.push(`candidate missed accepted ramp response dir=${direction}: ${candidate.speedAtRampEnd}m/s`);
  }
  if (candidate.rampSupportLossFrames !== 0 || candidate.supportLossFrames !== 0) {
    failures.push(`candidate lost physical support dir=${direction}`);
  }
  if (candidate.assistUnsupportedFrames !== 0 || candidate.assistAfterNonpositivePhysicalFrames !== 0) {
    failures.push(`residual violated contact-priority eligibility dir=${direction}`);
  }
  if (budgetOverrun > NUMERIC_EPS || candidate.remainingBudget < -NUMERIC_EPS) {
    failures.push(`candidate exceeded locked physical-deficit budget dir=${direction}`);
  }
  if (candidate.maxAssistImpulse > ACCEPTED_FRAME_IMPULSE + NUMERIC_EPS) {
    failures.push(`candidate exceeded accepted per-frame current31 impulse dir=${direction}`);
  }
  if (supportFractionDrop > MAX_SUPPORT_FRACTION_DROP) {
    failures.push(`residual materially displaced physical support dir=${direction}: drop=${supportFractionDrop}`);
  }
  if (candidate.accountingError > NUMERIC_EPS) {
    failures.push(`candidate momentum accounting error dir=${direction}: ${candidate.accountingError}`);
  }
}

const mirrorSpeedGap = Math.abs(
  candidates.get(-1).speedAtRampEnd - candidates.get(1).speedAtRampEnd
);
const mirrorPhysicalGap = Math.abs(
  candidates.get(-1).physicalFraction - candidates.get(1).physicalFraction
);
if (mirrorSpeedGap > MAX_MIRROR_SPEED_GAP) {
  failures.push(`candidate mirror speed gap ${mirrorSpeedGap}m/s exceeds E6 envelope`);
}
if (mirrorPhysicalGap > MAX_MIRROR_SUPPORT_FRACTION_GAP) {
  failures.push(`candidate mirror physical-share gap ${mirrorPhysicalGap} exceeds E6 envelope`);
}

if (failures.length > 0) {
  console.error(`E11.0a FAIL (${failures.length} gate violations):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  throw new Error('E11.0a physics-first locked-deficit residual failed its predeclared gate; both mirrors were collected before failure reporting');
}

console.log('E11.0a PASS: at canonical current31/lead8, giving the Box3D contact solve strict first priority and locking the nonreciprocal residual to the deficit measured in a separate physical-only control can reproduce the accepted ramp in both mirrors without expanding the external budget when candidate contact dynamics change. Residual impulses occur only after frames that retain support before+after solve and deliver positive intent-aligned physical momentum; the physical support share remains inside the existing E6 0.05 representation envelope of the matched physical-only reference, support never drops, and total momentum accounting closes. This would qualify only a contact-prioritized residual-authority sequencing/accounting mechanism for current31 launch at canonical substeps. It would not select gameplay tuning, prove current36 braking, solver-resolution robustness, disturbance semantics, moving-support behavior, or Owner feel.');