import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const BRAKE_ACCEL = DONOR_PROFILE_V1.groundDeceleration;
const CRUISE_SPEED = DONOR_PROFILE_V1.maxSpeed;
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
const REFERENCE_MU = 0.95;
const STATIC_FRAME_LOAD = TOTAL_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = REFERENCE_MU * STATIC_FRAME_LOAD;
const ACCEPTED_BRAKE_FRAME_IMPULSE = TOTAL_MASS * BRAKE_ACCEL * DT;
const NEAR_MATCH_SPEED_ERROR = 0.10;
const ACCOUNTING_EPS = 1e-4;
const INITIAL_SPEED_EPS = 1e-6;

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
    let totalNormalImpulse = 0;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
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
      reactive: touching > 0 || loaded > 0,
      touching,
      loaded,
      frameNormalImpulse: 0.5 * totalNormalImpulse,
    };
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

function setBodyZVelocity(body, z) {
  const v = bodyVelocity(body);
  b3.b3Body_SetLinearVelocity(body, [v[0], v[1], z]);
}

function setWholeBodyZVelocity(organism, z) {
  setBodyZVelocity(organism.foot, z);
  setBodyZVelocity(organism.torso, z);
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
    footFriction: friction,
  });
  const reader = createSupportReader(organism);
  let support = reader.read();
  let platformZ = 0;
  let platformSpeed = 0;
  let stableFrames = 0;
  let recovered = false;
  let supportLossFrames = 0;
  let brakeSupportLossFrames = 0;
  let totalPhysicalImpulse = 0;
  let totalAssistImpulse = 0;
  let assistFrames = 0;
  let blockedNoSupport = 0;
  let blockedNoPhysical = 0;
  let maxAssistImpulse = 0;
  let maxEntitlement = 0;
  let sumEntitlement = 0;
  let entitlementSamples = 0;
  let fellBeforeBrake = false;
  let tiltAtBrake = 0;
  let omegaAtBrake = 0;
  let footTiltAtBrake = 0;
  let peakBrakeTilt = 0;
  const cruise = direction * CRUISE_SPEED;
  const anticipatedBrakeTilt = -direction * Math.atan2(BRAKE_ACCEL, G);

  function step({ movePlatform = false, targetTilt = 0, brake = false } = {}) {
    const platformSpeedBefore = platformSpeed;
    if (movePlatform) {
      platformSpeed = moveToward(platformSpeed, 0, BRAKE_ACCEL * DT);
    }
    const actualPlatformAccel = (platformSpeed - platformSpeedBefore) / DT;
    platformZ += platformSpeed * DT;
    b3.b3Body_SetTargetTransform(
      platform,
      { position: [0, PLATFORM_Y, platformZ], quaternion: IDENTITY },
      DT,
      true,
    );

    const supportBefore = support.reactive;
    const beforePhysics = wholeBodyState(organism);
    const commandedTilt = brake
      ? Math.atan2(actualPlatformAccel, G)
      : targetTilt;
    targetedPreStep(
      organism,
      commandedTilt,
      supportBefore ? FINITE_TORQUE : 0,
    );

    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    const afterPhysics = wholeBodyState(organism);
    support = reader.read();

    if (!support.reactive) {
      supportLossFrames += 1;
      if (brake) brakeSupportLossFrames += 1;
    }
    if (brake) peakBrakeTilt = Math.max(peakBrakeTilt, Math.abs(organism.torsoTilt));

    const signedPhysicalImpulse = -direction * TOTAL_MASS * (
      afterPhysics.vel[2] - beforePhysics.vel[2]
    );
    if (brake) totalPhysicalImpulse += signedPhysicalImpulse;

    if (brake && assistMode) {
      const bodyDirectionalSpeed = direction * afterPhysics.vel[2];
      const platformDirectionalSpeed = direction * platformSpeed;
      const excessSpeed = bodyDirectionalSpeed - platformDirectionalSpeed;
      const wantsAssist = excessSpeed > NUMERIC_EPS;
      const supportQualified = supportBefore && support.reactive;
      const physicalQualified = signedPhysicalImpulse > NUMERIC_EPS;
      const instantaneousTractionCapacity = friction * support.frameNormalImpulse;
      const entitlement = clamp(
        instantaneousTractionCapacity / NOMINAL_TRACTION_CAPACITY,
        0,
        1,
      );
      sumEntitlement += entitlement;
      entitlementSamples += 1;
      maxEntitlement = Math.max(maxEntitlement, entitlement);

      if (wantsAssist && !supportQualified) blockedNoSupport += 1;
      if (wantsAssist && supportQualified && !physicalQualified) blockedNoPhysical += 1;

      if (wantsAssist && supportQualified && physicalQualified && entitlement > NUMERIC_EPS) {
        const capacityEntitledFrameCap = ACCEPTED_BRAKE_FRAME_IMPULSE * entitlement;
        const assistMagnitude = Math.min(
          TOTAL_MASS * excessSpeed,
          capacityEntitledFrameCap,
        );
        applyMassProportionalResidual(organism, -direction * assistMagnitude);
        totalAssistImpulse += assistMagnitude;
        assistFrames += 1;
        maxAssistImpulse = Math.max(maxAssistImpulse, assistMagnitude);
      }
    }

    const stopped = Math.abs(platformSpeed) < 1e-9;
    if (stopped && organism.isRecovered() && support.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!support.reactive) throw new Error(`E12.1a failed to establish support mu=${friction} dir=${direction}`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E12.1a organism mass ${settled.mass} != ${TOTAL_MASS}kg`);
  }

  // Matched controlled initial condition. We are testing braking authority, not
  // whether each friction case can first accelerate itself to cruise.
  platformSpeed = cruise;
  setWholeBodyZVelocity(organism, cruise);

  supportLossFrames = 0;
  brakeSupportLossFrames = 0;
  stableFrames = 0;
  recovered = false;
  totalPhysicalImpulse = 0;
  totalAssistImpulse = 0;
  assistFrames = 0;
  blockedNoSupport = 0;
  blockedNoPhysical = 0;
  maxAssistImpulse = 0;
  maxEntitlement = 0;
  sumEntitlement = 0;
  entitlementSamples = 0;
  fellBeforeBrake = false;
  peakBrakeTilt = 0;

  for (let i = 0; i < LEAD_FRAMES; i++) {
    step({ targetTilt: anticipatedBrakeTilt });
    if (organism.fallObserved) fellBeforeBrake = true;
  }

  // Remove setup-only horizontal drift so every brake starts with exactly the
  // same accepted cruise momentum. No physics step occurs between this matched
  // initial-condition normalization and brake accounting.
  setWholeBodyZVelocity(organism, cruise);
  organism._sync();
  tiltAtBrake = organism.torsoTilt;
  omegaAtBrake = organism.torsoAngularVelocity[0];
  footTiltAtBrake = organism.footTilt;
  const brakeStart = wholeBodyState(organism);
  if (Math.abs(direction * brakeStart.vel[2] - CRUISE_SPEED) > INITIAL_SPEED_EPS) {
    throw new Error(`E12.1a matched cruise initialization drift mu=${friction} dir=${direction}`);
  }

  const maxBrakeFrames = Math.ceil(CRUISE_SPEED / BRAKE_ACCEL / DT) + 3;
  for (let i = 0; i < maxBrakeFrames && Math.abs(platformSpeed) > 1e-9; i++) {
    step({ movePlatform: true, brake: true });
  }
  if (Math.abs(platformSpeed) > 1e-9) throw new Error(`E12.1a platform failed to stop mu=${friction} dir=${direction}`);
  const brakeEnd = wholeBodyState(organism);

  for (let i = 0; i < HOLD_FRAMES; i++) step();
  const telemetry = organism.telemetry();
  const requiredFromBrakeStart = TOTAL_MASS * CRUISE_SPEED;
  const totalProgressImpulse = -direction * TOTAL_MASS * (
    brakeEnd.vel[2] - brakeStart.vel[2]
  );
  const accountingError = Math.abs(totalProgressImpulse - totalPhysicalImpulse - totalAssistImpulse);
  const speedAtBrakeEnd = direction * brakeEnd.vel[2];

  const result = {
    direction,
    friction,
    assistMode,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    fall: telemetry.fallObserved,
    fellBeforeBrake,
    tiltAtBrakeDeg: tiltAtBrake * 180 / Math.PI,
    omegaAtBrake,
    footTiltAtBrakeDeg: footTiltAtBrake * 180 / Math.PI,
    peakBrakeTiltDeg: peakBrakeTilt * 180 / Math.PI,
    speedAtBrakeEnd,
    nearMatch: Math.abs(speedAtBrakeEnd) <= NEAR_MATCH_SPEED_ERROR,
    requiredFromBrakeStart,
    physicalImpulse: totalPhysicalImpulse,
    assistImpulse: totalAssistImpulse,
    physicalFraction: totalPhysicalImpulse / requiredFromBrakeStart,
    assistFraction: totalAssistImpulse / requiredFromBrakeStart,
    totalFraction: totalProgressImpulse / requiredFromBrakeStart,
    brakeSupportLossFrames,
    supportLossFrames,
    assistFrames,
    blockedNoSupport,
    blockedNoPhysical,
    maxAssistImpulse,
    meanEntitlement: entitlementSamples > 0 ? sumEntitlement / entitlementSamples : 0,
    maxEntitlement,
    accountingError,
  };

  reader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || BRAKE_ACCEL !== 36 ||
  CRUISE_SPEED !== 5.2 || TOTAL_MASS !== 80
) {
  throw new Error('E12.1a expected canonical Donor-v1/E4.6 current36 substrate');
}

console.log('E12.1a capacity-entitled physics-first braking falsifier');
console.log('  exact current36 magnitude and lead8 posture preparation from E4.6; all friction cases start from a matched ±5.2m/s cruise initial condition');
console.log(`  E5 nominal ordinary traction capacity = .95 * m*g*dt = ${NOMINAL_TRACTION_CAPACITY.toFixed(4)}Ns/frame`);
console.log(`  after each brake solve: q=clamp(mu*Jn~/${NOMINAL_TRACTION_CAPACITY.toFixed(4)},0,1); external brake-frame cap=q*${ACCEPTED_BRAKE_FRAME_IMPULSE.toFixed(4)}Ns`);
console.log('  residual still requires support before+after solve and positive same-frame whole-body physical braking impulse');
console.log('  no fitted gain, deficit oracle or ratio sweep; braking accounting starts only after matched cruise initialization.');
console.log(`  gate: normal support must stop inside ±${NEAR_MATCH_SPEED_ERROR.toFixed(2)}m/s and RECOVER; weak and zero support must remain outside accepted-looking braking.`);

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
      `PHYS ${physical.outcome.padEnd(7)} vEnd=${physical.speedAtBrakeEnd.toFixed(3)} J=${physical.physicalImpulse.toFixed(2)}(${physical.physicalFraction.toFixed(3)}) | ` +
      `ENT ${assisted.outcome.padEnd(7)} vEnd=${assisted.speedAtBrakeEnd.toFixed(3)} near=${assisted.nearMatch} ` +
      `Jphys=${assisted.physicalImpulse.toFixed(2)}(${assisted.physicalFraction.toFixed(3)}) ` +
      `Jassist=${assisted.assistImpulse.toFixed(2)}(${assisted.assistFraction.toFixed(3)}) ` +
      `qMean/max=${assisted.meanEntitlement.toFixed(3)}/${assisted.maxEntitlement.toFixed(3)} ` +
      `preFall=${assisted.fellBeforeBrake} peak=${assisted.peakBrakeTiltDeg.toFixed(2)}deg ` +
      `frames=${assisted.assistFrames} blocked=${assisted.blockedNoSupport}/${assisted.blockedNoPhysical} loss=${assisted.brakeSupportLossFrames}`,
    );

    if (physical.accountingError > ACCOUNTING_EPS || assisted.accountingError > ACCOUNTING_EPS) {
      throw new Error(`E12.1a momentum accounting drift mu=${frictionCase.mu} dir=${direction}`);
    }
    if (assisted.maxAssistImpulse > ACCEPTED_BRAKE_FRAME_IMPULSE + NUMERIC_EPS) {
      throw new Error(`E12.1a external brake-frame impulse exceeded accepted current36 cap mu=${frictionCase.mu} dir=${direction}`);
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

  if (normalPhysical.outcome !== 'RECOVER' || normalPhysical.brakeSupportLossFrames !== 0 || normalPhysical.fellBeforeBrake) {
    failures.push(`normal physical-only control no longer reproduces qualified current36/lead8 survivor dir=${direction}`);
  }
  if (!(weakPhysical.physicalImpulse < normalPhysical.physicalImpulse)) {
    failures.push(`weak physical counterfactual did not reduce braking authority dir=${direction}`);
  }
  if (!(zeroPhysical.physicalImpulse <= weakPhysical.physicalImpulse + ACCOUNTING_EPS)) {
    failures.push(`zero-friction physical counterfactual was not weaker than weak braking support dir=${direction}`);
  }

  if (normalAssist.outcome !== 'RECOVER' || normalAssist.brakeSupportLossFrames !== 0 || normalAssist.fellBeforeBrake || !normalAssist.nearMatch) {
    failures.push(`normal capacity-entitled residual failed accepted current36 braking dir=${direction}`);
  }
  if (weakAssist.nearMatch) {
    failures.push(`weak mu=.20 support still unlocked accepted-looking braking dir=${direction}`);
  }
  if (zeroAssist.nearMatch || zeroAssist.assistImpulse > ACCOUNTING_EPS) {
    failures.push(`zero-friction support received material capacity-entitled braking authority dir=${direction}`);
  }
}

if (failures.length > 0) {
  console.error(`E12.1a FAIL (${failures.length} braking-capacity violations):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  throw new Error('E12.1a capacity-entitled braking failed its predeclared normal-vs-weak support discrimination gate');
}

console.log('E12.1a PASS: the same E12.0a graded traction-capacity entitlement principle extends to the accepted current36 braking direction when starting from a matched neutral 5.2m/s cruise state: normal support preserves near-matched stopping and the qualified lead8 posture survivor, while weak and zero-friction worlds remain translationally distinguishable. This still qualifies only kinematic-support entitlement semantics. It does not select production assist magnitude, prove reciprocity/dynamic-support placement, disturbances, moving-support interaction, solver-resolution robustness, or Owner feel.');