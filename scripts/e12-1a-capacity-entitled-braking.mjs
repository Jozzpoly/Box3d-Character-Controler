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
const SAFE_SETUP_ACCEL = 4;
const FINITE_TORQUE = 320;
const DIRECTIONS = [-1, 1];
const LEAD_FRAMES = 8;
const SETTLE_FRAMES = 90;
const CRUISE_SETTLE_FRAMES = 120;
const HOLD_FRAMES = 180;
const RECOVER_STREAK = 30;
const LOAD_EPS = 1e-6;
const NUMERIC_EPS = 1e-6;
const PRESTATE_EPS = 1e-6;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const IDENTITY = [0, 0, 0, 1];
const REFERENCE_MU = 0.95;
const STATIC_FRAME_LOAD = TOTAL_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = REFERENCE_MU * STATIC_FRAME_LOAD;
const ACCEPTED_BRAKE_FRAME_IMPULSE = TOTAL_MASS * BRAKE_ACCEL * DT;
const NEAR_MATCH_SPEED_ERROR = 0.10;
const ACCOUNTING_EPS = 1e-4;

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

function makePlatform(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = REFERENCE_MU;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...HALF);
  return { body, shape };
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
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: REFERENCE_MU,
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
  let peakBrakeTilt = 0;
  const cruise = direction * CRUISE_SPEED;
  const anticipatedBrakeTilt = -direction * Math.atan2(BRAKE_ACCEL, G);

  function step({ targetSpeed = platformSpeed, accelLimit = 0, targetTilt = 0, brake = false } = {}) {
    const platformSpeedBefore = platformSpeed;
    platformSpeed = moveToward(platformSpeed, targetSpeed, accelLimit * DT);
    const actualPlatformAccel = (platformSpeed - platformSpeedBefore) / DT;
    platformZ += platformSpeed * DT;
    b3.b3Body_SetTargetTransform(
      platform.body,
      { position: [0, PLATFORM_Y, platformZ], quaternion: IDENTITY },
      DT,
      true,
    );

    const supportBefore = support.reactive;
    const beforePhysics = wholeBodyState(organism);
    const commandedTilt = targetTilt === 'effective-up'
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

  // Reproduce the qualified E4.6 brake-start history exactly. Every case is a
  // normal mu=.95 world through safe physical cruise, 120f neutral cruise, and
  // lead8. The friction counterfactual is introduced only after this state has
  // been established, immediately before the first braking physics solve.
  for (let i = 0; i < SETTLE_FRAMES; i++) step({ targetSpeed: 0, accelLimit: 0, targetTilt: 0 });
  if (!support.reactive) throw new Error(`E12.1a failed to establish initial support dir=${direction}`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E12.1a organism mass ${settled.mass} != ${TOTAL_MASS}kg`);
  }

  const setupFrames = Math.ceil(CRUISE_SPEED / SAFE_SETUP_ACCEL / DT) + 3;
  for (let i = 0; i < setupFrames && Math.abs(platformSpeed - cruise) > 1e-9; i++) {
    step({ targetSpeed: cruise, accelLimit: SAFE_SETUP_ACCEL, targetTilt: 0 });
  }
  if (Math.abs(platformSpeed - cruise) > 1e-9 || organism.fallObserved) {
    throw new Error(`E12.1a safe E4.6 cruise setup failed dir=${direction}`);
  }
  for (let i = 0; i < CRUISE_SETTLE_FRAMES; i++) {
    step({ targetSpeed: cruise, accelLimit: 0, targetTilt: 0 });
  }
  if (!organism.isRecovered() || !support.reactive || organism.fallObserved) {
    throw new Error(`E12.1a failed to establish qualified neutral cruise dir=${direction}`);
  }

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
    step({ targetSpeed: cruise, accelLimit: 0, targetTilt: anticipatedBrakeTilt });
    if (organism.fallObserved) fellBeforeBrake = true;
  }

  organism._sync();
  const brakeStart = wholeBodyState(organism);
  const preState = {
    speed: direction * brakeStart.vel[2],
    tiltDeg: organism.torsoTilt * 180 / Math.PI,
    omega: organism.torsoAngularVelocity[0],
    footTiltDeg: organism.footTilt * 180 / Math.PI,
  };
  if (preState.speed <= 0 || fellBeforeBrake || !support.reactive || organism.fallObserved) {
    throw new Error(`E12.1a qualified pre-brake state failed dir=${direction}`);
  }

  if (Math.abs(friction - REFERENCE_MU) > NUMERIC_EPS) {
    b3.b3Shape_SetFriction(platform.shape, friction);
    b3.b3Shape_SetFriction(organism.footShape, friction);
  }
  const platformFriction = b3.b3Shape_GetFriction(platform.shape);
  const footFriction = b3.b3Shape_GetFriction(organism.footShape);
  if (
    Math.abs(platformFriction - friction) > NUMERIC_EPS ||
    Math.abs(footFriction - friction) > NUMERIC_EPS
  ) {
    throw new Error(`E12.1a brake-time friction switch failed mu=${friction} dir=${direction}`);
  }

  const maxBrakeFrames = Math.ceil(CRUISE_SPEED / BRAKE_ACCEL / DT) + 3;
  for (let i = 0; i < maxBrakeFrames && Math.abs(platformSpeed) > 1e-9; i++) {
    step({ targetSpeed: 0, accelLimit: BRAKE_ACCEL, targetTilt: 'effective-up', brake: true });
  }
  if (Math.abs(platformSpeed) > 1e-9) {
    throw new Error(`E12.1a platform failed to stop mu=${friction} dir=${direction}`);
  }
  const brakeEnd = wholeBodyState(organism);

  for (let i = 0; i < HOLD_FRAMES; i++) {
    step({ targetSpeed: 0, accelLimit: 0, targetTilt: 0 });
  }
  const telemetry = organism.telemetry();
  const requiredFromBrakeStart = direction * TOTAL_MASS * brakeStart.vel[2];
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
    preState,
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
    platformFriction,
    footFriction,
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

console.log('E12.1a corrected capacity-entitled physics-first braking falsifier');
console.log('  confounded direct-velocity initialization is preserved in git history only; it is not evidence against entitlement.');
console.log('  every specimen now reproduces exact E4.6 history: settle -> physical 4m/s^2 cruise setup -> 120f neutral cruise -> lead8 at mu=.95.');
console.log('  only after qualified lead8 state, with no intervening physics step, foot+platform friction switches to .95/.20/0 for the brake counterfactual.');
console.log(`  E5 nominal ordinary traction capacity = .95 * m*g*dt = ${NOMINAL_TRACTION_CAPACITY.toFixed(4)}Ns/frame`);
console.log(`  after each brake solve: q=clamp(mu*Jn~/${NOMINAL_TRACTION_CAPACITY.toFixed(4)},0,1); external brake-frame cap=q*${ACCEPTED_BRAKE_FRAME_IMPULSE.toFixed(4)}Ns`);
console.log('  residual still requires support before+after solve and positive same-frame whole-body physical braking impulse; final partial brake frame uses actual platform deceleration for posture.');
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
      `start=${assisted.preState.speed.toFixed(3)} tilt=${assisted.preState.tiltDeg.toFixed(2)}deg/${assisted.preState.omega.toFixed(2)}radps ` +
      `foot=${assisted.preState.footTiltDeg.toFixed(2)}deg | ` +
      `PHYS ${physical.outcome.padEnd(7)} vEnd=${physical.speedAtBrakeEnd.toFixed(3)} J=${physical.physicalImpulse.toFixed(2)}(${physical.physicalFraction.toFixed(3)}) | ` +
      `ENT ${assisted.outcome.padEnd(7)} vEnd=${assisted.speedAtBrakeEnd.toFixed(3)} near=${assisted.nearMatch} ` +
      `Jphys=${assisted.physicalImpulse.toFixed(2)}(${assisted.physicalFraction.toFixed(3)}) ` +
      `Jassist=${assisted.assistImpulse.toFixed(2)}(${assisted.assistFraction.toFixed(3)}) ` +
      `qMean/max=${assisted.meanEntitlement.toFixed(3)}/${assisted.maxEntitlement.toFixed(3)} ` +
      `peak=${assisted.peakBrakeTiltDeg.toFixed(2)}deg frames=${assisted.assistFrames} ` +
      `blocked=${assisted.blockedNoSupport}/${assisted.blockedNoPhysical} loss=${assisted.brakeSupportLossFrames}`,
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
  const normalAssist = results.get(key('normal', direction, true));
  const weakPhysical = results.get(key('weak', direction, false));
  const weakAssist = results.get(key('weak', direction, true));
  const zeroPhysical = results.get(key('zero', direction, false));
  const zeroAssist = results.get(key('zero', direction, true));
  const all = [normalPhysical, normalAssist, weakPhysical, weakAssist, zeroPhysical, zeroAssist];

  for (const r of all) {
    if (
      Math.abs(r.preState.speed - normalPhysical.preState.speed) > PRESTATE_EPS ||
      Math.abs(r.preState.tiltDeg - normalPhysical.preState.tiltDeg) > PRESTATE_EPS ||
      Math.abs(r.preState.omega - normalPhysical.preState.omega) > PRESTATE_EPS ||
      Math.abs(r.preState.footTiltDeg - normalPhysical.preState.footTiltDeg) > PRESTATE_EPS
    ) {
      failures.push(`brake counterfactuals did not share identical qualified pre-state dir=${direction}`);
      break;
    }
  }

  if (normalPhysical.outcome !== 'RECOVER' || normalPhysical.brakeSupportLossFrames !== 0 || normalPhysical.fellBeforeBrake) {
    failures.push(`normal physical-only control failed exact E4.6 current36/lead8 reproduction dir=${direction}`);
  }
  if (!(weakPhysical.physicalImpulse < normalPhysical.physicalImpulse)) {
    failures.push(`weak brake-time friction counterfactual did not reduce physical braking authority dir=${direction}`);
  }
  if (!(zeroPhysical.physicalImpulse <= weakPhysical.physicalImpulse + ACCOUNTING_EPS)) {
    failures.push(`zero-friction brake-time counterfactual was not weaker than weak support dir=${direction}`);
  }

  if (normalAssist.outcome !== 'RECOVER' || normalAssist.brakeSupportLossFrames !== 0 || normalAssist.fellBeforeBrake || !normalAssist.nearMatch) {
    failures.push(`normal capacity-entitled residual failed accepted current36 braking dir=${direction}`);
  }
  if (weakAssist.nearMatch) {
    failures.push(`weak mu=.20 brake-time support still unlocked accepted-looking braking dir=${direction}`);
  }
  if (zeroAssist.nearMatch || zeroAssist.assistImpulse > ACCOUNTING_EPS) {
    failures.push(`zero-friction brake-time support received material capacity-entitled braking authority dir=${direction}`);
  }
}

if (failures.length > 0) {
  console.error(`E12.1a FAIL (${failures.length} braking-capacity violations):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  throw new Error('E12.1a corrected capacity-entitled braking failed its predeclared normal-vs-weak support discrimination gate');
}

console.log('E12.1a PASS: from the exact qualified E4.6 current36/lead8 brake-start state, changing only brake-time traction capacity leaves normal mu=.95 able to preserve near-matched stopping and RECOVER under the same E12 graded capacity entitlement, while weak mu=.20 and zero-friction counterfactuals remain translationally distinguishable. The earlier direct-velocity initialization failure is therefore a harness failure, not negative entitlement evidence. This still qualifies only kinematic-support capacity semantics. It does not select production assist magnitude, prove reciprocity/dynamic-support placement, disturbances, steady weak-surface entry, solver-resolution robustness, or Owner feel.');