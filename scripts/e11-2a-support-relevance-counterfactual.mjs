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
const DIRECTIONS = [-1, 1];
const LEAD_FRAMES = 8;
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 180;
const RECOVER_STREAK = 30;
const LOAD_EPS = 1e-6;
const NUMERIC_EPS = 1e-6;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const IDENTITY = [0, 0, 0, 1];
const ACCEPTED_FRAME_IMPULSE = TOTAL_MASS * ACCEL * DT;
const NEAR_MATCH_SPEED_ERROR = 0.10; // existing E5.2 near-match window

// Existing project friction points: normal E5 research support and the low-friction
// value already used by the earlier sensitivity work. Zero friction is the hard
// horizontal-contact counterfactual; actual whole-body ΔP is measured rather
// than assumed to be exactly zero.
const FRICTION_CASES = [
  { name: 'normal', mu: 0.95 },
  { name: 'weak', mu: 0.20 },
  { name: 'zero', mu: 0.00 },
];

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

function makePlatform(world, friction) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = friction;
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

function runCase({ direction, friction, assistMode }) {
  const world = makeWorld();
  const platform = makePlatform(world, friction);
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
  let eligibleFrames = 0;
  let blockedNoSupport = 0;
  let blockedNoPhysical = 0;
  let maxAssistImpulse = 0;
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

    // Same strict sequencing as E11.0a: contact physics earns its contribution
    // before any nonreciprocal residual is considered.
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

    let assistMagnitude = 0;
    if (ramp && assistMode) {
      const desiredDirectionalSpeed = Math.abs(platformSpeed);
      const directionalSpeedAfterPhysics = direction * afterPhysics.vel[2];
      const shortfall = desiredDirectionalSpeed - directionalSpeedAfterPhysics;
      const wantsAssist = shortfall > NUMERIC_EPS;
      const supportQualified = supportBefore && support.reactive;
      const physicalQualified = signedPhysicalImpulse > NUMERIC_EPS;

      if (wantsAssist && !supportQualified) blockedNoSupport += 1;
      if (wantsAssist && supportQualified && !physicalQualified) blockedNoPhysical += 1;

      if (wantsAssist && supportQualified && physicalQualified) {
        eligibleFrames += 1;
        // No tuned gain and no hidden total budget: this is the maximal simple
        // residual allowed by accepted current31 per-frame authority. It closes
        // only the post-physics speed shortfall of this frame.
        assistMagnitude = Math.min(
          TOTAL_MASS * shortfall,
          ACCEPTED_FRAME_IMPULSE,
        );
        applyMassProportionalResidual(organism, direction * assistMagnitude);
        totalAssistImpulse += assistMagnitude;
        assistFrames += 1;
        maxAssistImpulse = Math.max(maxAssistImpulse, assistMagnitude);
      }
    }

    if (targetReached && organism.isRecovered() && support.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!support.reactive) throw new Error(`E11.2a failed to establish support mu=${friction} dir=${direction}`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E11.2a organism mass ${settled.mass} != ${TOTAL_MASS}kg`);
  }

  supportLossFrames = 0;
  rampSupportLossFrames = 0;
  stableFrames = 0;
  recovered = false;
  totalPhysicalImpulse = 0;
  totalAssistImpulse = 0;
  assistFrames = 0;
  eligibleFrames = 0;
  blockedNoSupport = 0;
  blockedNoPhysical = 0;
  maxAssistImpulse = 0;

  for (let i = 0; i < LEAD_FRAMES; i++) step({ targetTilt: desiredTilt });
  const launch = wholeBodyState(organism);

  const maxRampFrames = Math.ceil(TARGET_SPEED / ACCEL / DT) + 3;
  for (let i = 0; i < maxRampFrames && !targetReached; i++) {
    step({ movePlatform: true, ramp: true });
  }
  if (!targetReached) throw new Error(`E11.2a platform failed to reach target mu=${friction} dir=${direction}`);
  const rampEnd = wholeBodyState(organism);

  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });
  const telemetry = organism.telemetry();
  const requiredFromLaunch = TOTAL_MASS * (TARGET_SPEED - direction * launch.vel[2]);
  const totalProgressImpulse = direction * TOTAL_MASS * (rampEnd.vel[2] - launch.vel[2]);
  const accountingError = Math.abs(totalProgressImpulse - totalPhysicalImpulse - totalAssistImpulse);
  const speedAtRampEnd = direction * rampEnd.vel[2];

  const result = {
    direction,
    friction,
    assistMode,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    fall: telemetry.fallObserved,
    launchSpeed: direction * launch.vel[2],
    speedAtRampEnd,
    speedError: TARGET_SPEED - speedAtRampEnd,
    nearMatch: Math.abs(TARGET_SPEED - speedAtRampEnd) <= NEAR_MATCH_SPEED_ERROR,
    requiredFromLaunch,
    physicalImpulse: totalPhysicalImpulse,
    assistImpulse: totalAssistImpulse,
    physicalFraction: requiredFromLaunch > 1e-9 ? totalPhysicalImpulse / requiredFromLaunch : 1,
    assistFraction: requiredFromLaunch > 1e-9 ? totalAssistImpulse / requiredFromLaunch : 0,
    totalFraction: requiredFromLaunch > 1e-9 ? totalProgressImpulse / requiredFromLaunch : 1,
    rampSupportLossFrames,
    supportLossFrames,
    assistFrames,
    eligibleFrames,
    blockedNoSupport,
    blockedNoPhysical,
    maxAssistImpulse,
    accountingError,
  };

  reader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80
) {
  throw new Error('E11.2a expected canonical Donor-v1/E5 current31 substrate');
}

console.log('E11.2a support-relevance counterfactual for adaptive physics-first residual');
console.log('  policy: posture -> Box3D/contact -> exact horizontal physical ΔP -> optional residual');
console.log('  residual requires support before+after solve and positive same-frame intent-aligned physical ΔP; per-frame cap is accepted current31 authority');
console.log('  no residual gain sweep and no total-budget tuning: eligible residual simply closes the current post-solve speed shortfall up to the accepted per-frame cap');
console.log(`  discrimination gate uses the existing E5.2 near-match window ±${NEAR_MATCH_SPEED_ERROR.toFixed(2)}m/s:`);
console.log('    normal mu=.95 assisted must reach the accepted ramp; materially weak mu=.20 and zero-friction counterfactuals must remain outside that same near-match window.');
console.log('  If weak contact still unlocks an accepted-looking ramp, the binary positive-physical-impulse gate is not a sufficient anti-masking rule.');

const results = new Map();
const key = (name, direction, assisted) => `${name}:${direction}:${assisted ? 'assist' : 'physical'}`;

for (const frictionCase of FRICTION_CASES) {
  for (const direction of DIRECTIONS) {
    const physical = runCase({ direction, friction: frictionCase.mu, assistMode: false });
    const assisted = runCase({ direction, friction: frictionCase.mu, assistMode: true });
    results.set(key(frictionCase.name, direction, false), physical);
    results.set(key(frictionCase.name, direction, true), assisted);

    console.log(
      `  ${frictionCase.name.padEnd(6)} mu=${frictionCase.mu.toFixed(2)} dir=${direction > 0 ? '+' : '-'} ` +
      `PHYS ${physical.outcome.padEnd(7)} v=${physical.speedAtRampEnd.toFixed(3)} ` +
      `J=${physical.physicalImpulse.toFixed(2)}(${physical.physicalFraction.toFixed(3)}) loss=${physical.rampSupportLossFrames} | ` +
      `ASSIST ${assisted.outcome.padEnd(7)} v=${assisted.speedAtRampEnd.toFixed(3)} err=${assisted.speedError.toFixed(3)} near=${assisted.nearMatch} ` +
      `Jphys=${assisted.physicalImpulse.toFixed(2)}(${assisted.physicalFraction.toFixed(3)}) ` +
      `Jassist=${assisted.assistImpulse.toFixed(2)}(${assisted.assistFraction.toFixed(3)}) frames=${assisted.assistFrames} ` +
      `blocked(noSupport/noPhysical)=${assisted.blockedNoSupport}/${assisted.blockedNoPhysical} loss=${assisted.rampSupportLossFrames}`,
    );

    if (physical.accountingError > 1e-4 || assisted.accountingError > 1e-4) {
      throw new Error(`E11.2a momentum accounting drift mu=${frictionCase.mu} dir=${direction}`);
    }
    if (assisted.maxAssistImpulse > ACCEPTED_FRAME_IMPULSE + 1e-6) {
      throw new Error(`E11.2a adaptive residual exceeded accepted current31 frame budget mu=${frictionCase.mu} dir=${direction}`);
    }
  }
}

const failures = [];
for (const direction of DIRECTIONS) {
  const normalPhysical = results.get(key('normal', direction, false));
  const weakPhysical = results.get(key('weak', direction, false));
  const zeroPhysical = results.get(key('zero', direction, false));
  const normalAssist = results.get(key('normal', direction, true));
  const weakAssist = results.get(key('weak', direction, true));
  const zeroAssist = results.get(key('zero', direction, true));

  if (normalPhysical.outcome !== 'RECOVER' || normalPhysical.rampSupportLossFrames !== 0) {
    failures.push(`normal physical-only control no longer reproduces qualified current31 survivor dir=${direction}`);
  }
  if (!(weakPhysical.physicalImpulse < normalPhysical.physicalImpulse)) {
    failures.push(`weak-friction physical counterfactual did not reduce horizontal physical impulse dir=${direction}`);
  }
  if (!(zeroPhysical.physicalImpulse <= weakPhysical.physicalImpulse + 1e-4)) {
    failures.push(`zero-friction physical counterfactual was not weaker than mu=.20 dir=${direction}`);
  }

  if (normalAssist.outcome !== 'RECOVER' || normalAssist.rampSupportLossFrames !== 0 || !normalAssist.nearMatch) {
    failures.push(`normal-support adaptive residual failed accepted current31 ramp dir=${direction}`);
  }
  if (weakAssist.nearMatch) {
    failures.push(`mu=.20 materially weak contact still unlocked accepted-looking ramp dir=${direction}`);
  }
  if (zeroAssist.nearMatch) {
    failures.push(`zero-friction contact still unlocked accepted-looking ramp dir=${direction}`);
  }
}

if (failures.length > 0) {
  console.error(`E11.2a FAIL (${failures.length} support-relevance violations):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  throw new Error('E11.2a adaptive physics-first residual failed the predeclared support-relevance discrimination gate');
}

console.log('E11.2a PASS: the adaptive physics-first residual reaches the accepted current31 ramp on normal mu=.95 support but does not make materially weak mu=.20 or zero-friction support look equivalent. Positive same-frame physical horizontal contribution therefore remains a meaningful graded prerequisite under this declared counterfactual. This would qualify only a support-relevance safeguard for the current31 canonical specimen; it would not select a production hybrid, residual gain, braking policy, solver-resolution behavior, dynamic-support reciprocity, or Owner feel.');