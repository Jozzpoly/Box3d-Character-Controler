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
const ACCEPTED_FRAME_IMPULSE = TOTAL_MASS * ACCEL * DT;
const STATIC_FRAME_LOAD = TOTAL_MASS * G * DT;
const ACCOUNTING_EPS = 1e-4;

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
    let totalNormalImpulse = 0;
    let totalVerticalNormalImpulse = 0;
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        const absNormalY = Math.abs(manifold.normal[1]);
        if (absNormalY < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          totalNormalImpulse += totalJn;
          totalVerticalNormalImpulse += totalJn * absNormalY;
          if (finalJn > LOAD_EPS || totalJn > LOAD_EPS) loaded += 1;
        }
      }
    }
    return {
      reactive: touching > 0 || loaded > 0,
      touching,
      loaded,
      // E5.0a calibrated the pinned solver's outer-step load estimate.
      frameNormalImpulse: 0.5 * totalNormalImpulse,
      frameVerticalNormalImpulse: 0.5 * totalVerticalNormalImpulse,
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
  let remainingBudget = lockedDeficitBudget ?? 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);
  const trace = [];

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
    const directionalBefore = direction * beforePhysics.vel[2];
    const slipBefore = Math.abs(platformSpeed) - directionalBefore;
    const commandedTilt = movePlatform
      ? direction * Math.atan2(Math.abs(actualAccel), G)
      : targetTilt;
    const torque = targetedPreStep(
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
      if (ramp) rampSupportLossFrames += 1;
    }

    const directionalAfterPhysics = direction * afterPhysics.vel[2];
    const signedPhysicalImpulse = direction * TOTAL_MASS * (
      afterPhysics.vel[2] - beforePhysics.vel[2]
    );
    if (ramp) totalPhysicalImpulse += signedPhysicalImpulse;

    let assistMagnitude = 0;
    if (ramp && assistMode && remainingBudget > 1e-6) {
      const speedShortfall = Math.abs(platformSpeed) - directionalAfterPhysics;
      const supportQualified = supportBefore && support.reactive;
      const physicsQualified = signedPhysicalImpulse > 1e-6;
      if (speedShortfall > 1e-6 && supportQualified && physicsQualified) {
        assistMagnitude = Math.min(
          TOTAL_MASS * speedShortfall,
          remainingBudget,
          ACCEPTED_FRAME_IMPULSE,
        );
        applyMassProportionalResidual(organism, direction * assistMagnitude);
        totalAssistImpulse += assistMagnitude;
        remainingBudget -= assistMagnitude;
      }
    }

    const afterAll = assistMagnitude > 0 ? wholeBodyState(organism) : afterPhysics;
    const directionalAfterAll = direction * afterAll.vel[2];

    if (ramp) {
      const coulombBudget = MU * support.frameNormalImpulse;
      trace.push({
        frame: trace.length,
        platformSpeed: Math.abs(platformSpeed),
        bodyBefore: directionalBefore,
        bodyAfterPhysics: directionalAfterPhysics,
        bodyAfterAll: directionalAfterAll,
        slipBefore,
        slipAfterPhysics: Math.abs(platformSpeed) - directionalAfterPhysics,
        physicalImpulse: signedPhysicalImpulse,
        assistImpulse: assistMagnitude,
        normalImpulse: support.frameNormalImpulse,
        verticalNormalImpulse: support.frameVerticalNormalImpulse,
        coulombBudget,
        budgetUse: coulombBudget > 1e-9 ? signedPhysicalImpulse / coulombBudget : 0,
        torsoTiltDeg: organism.torsoTilt * 180 / Math.PI,
        torsoOmega: organism.torsoAngularVelocity[0],
        footTiltDeg: organism.footTilt * 180 / Math.PI,
        torque,
        reactive: support.reactive,
      });
    }

    if (targetReached && organism.isRecovered() && support.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!support.reactive) throw new Error(`E11.1a failed to establish support dir=${direction}`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E11.1a organism mass ${settled.mass} != ${TOTAL_MASS}kg`);
  }

  supportLossFrames = 0;
  rampSupportLossFrames = 0;
  stableFrames = 0;
  recovered = false;
  totalPhysicalImpulse = 0;
  totalAssistImpulse = 0;
  remainingBudget = lockedDeficitBudget ?? 0;

  for (let i = 0; i < LEAD_FRAMES; i++) step({ targetTilt: desiredTilt });
  const launch = wholeBodyState(organism);

  const maxRampFrames = Math.ceil(TARGET_SPEED / ACCEL / DT) + 3;
  for (let i = 0; i < maxRampFrames && !targetReached; i++) {
    step({ movePlatform: true, ramp: true });
  }
  if (!targetReached) throw new Error(`E11.1a platform failed to reach target dir=${direction}`);
  const rampEnd = wholeBodyState(organism);

  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });
  const telemetry = organism.telemetry();
  const requiredFromLaunch = TOTAL_MASS * (TARGET_SPEED - direction * launch.vel[2]);
  const totalProgressImpulse = direction * TOTAL_MASS * (rampEnd.vel[2] - launch.vel[2]);
  const accountingError = Math.abs(totalProgressImpulse - totalPhysicalImpulse - totalAssistImpulse);

  reader.destroy();
  b3.b3DestroyWorld(world);

  return {
    direction,
    assistMode,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    launchSpeed: direction * launch.vel[2],
    speedAtRampEnd: direction * rampEnd.vel[2],
    requiredFromLaunch,
    physicalImpulse: totalPhysicalImpulse,
    assistImpulse: totalAssistImpulse,
    physicalFraction: totalPhysicalImpulse / requiredFromLaunch,
    remainingBudget,
    rampSupportLossFrames,
    supportLossFrames,
    accountingError,
    trace,
  };
}

function sum(trace, key) {
  return trace.reduce((acc, frame) => acc + frame[key], 0);
}

function mean(trace, key) {
  return trace.length ? sum(trace, key) / trace.length : 0;
}

function maxAbs(trace, key) {
  return trace.reduce((acc, frame) => Math.max(acc, Math.abs(frame[key])), 0);
}

function summarize(result) {
  const positiveSlipArea = result.trace.reduce(
    (acc, frame) => acc + Math.max(0, frame.slipBefore),
    0,
  );
  const normal = sum(result.trace, 'normalImpulse');
  const coulomb = sum(result.trace, 'coulombBudget');
  return {
    positiveSlipArea,
    meanSlip: mean(result.trace, 'slipBefore'),
    normal,
    normalWeightRatio: normal / (STATIC_FRAME_LOAD * result.trace.length),
    coulomb,
    physicalVsCoulomb: coulomb > 1e-9 ? result.physicalImpulse / coulomb : 0,
    peakTiltDeg: maxAbs(result.trace, 'torsoTiltDeg'),
    meanAbsTiltDeg: result.trace.reduce((a, f) => a + Math.abs(f.torsoTiltDeg), 0) / result.trace.length,
    peakFootTiltDeg: maxAbs(result.trace, 'footTiltDeg'),
  };
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  TARGET_SPEED !== 5.2 || TOTAL_MASS !== 80
) {
  throw new Error('E11.1a expected canonical Donor-v1/E5 current31 substrate');
}

console.log('E11.1a residual-contact interaction decomposition');
console.log('  diagnostic only: exact E11.0a physical-only vs fixed-deficit physics-first candidate; no new authority/tuning');
console.log('  question: does lost later physical impulse track reduced relative slip, reduced normal-load/posture capacity, or both?');
console.log('  E5.0a 0.5*totalNormalImpulse is used only as the existing pinned-substrate load diagnostic; whole-body horizontal ΔP remains exact.');

for (const direction of DIRECTIONS) {
  const reference = runCase({ direction });
  if (reference.outcome !== 'RECOVER' || reference.rampSupportLossFrames !== 0) {
    throw new Error(`E11.1a reference failed qualified current31 survivor dir=${direction}`);
  }
  if (reference.accountingError > ACCOUNTING_EPS) {
    throw new Error(`E11.1a reference accounting error dir=${direction}: ${reference.accountingError}`);
  }

  const lockedDeficit = Math.max(0, reference.requiredFromLaunch - reference.physicalImpulse);
  const candidate = runCase({ direction, lockedDeficitBudget: lockedDeficit });
  if (candidate.outcome !== 'RECOVER' || candidate.rampSupportLossFrames !== 0) {
    throw new Error(`E11.1a candidate no longer reproduces E11.0a supported RECOVER dir=${direction}`);
  }
  if (Math.abs(candidate.assistImpulse - lockedDeficit) > ACCOUNTING_EPS) {
    throw new Error(`E11.1a candidate did not consume exact locked deficit dir=${direction}`);
  }
  if (candidate.accountingError > ACCOUNTING_EPS) {
    throw new Error(`E11.1a candidate accounting error dir=${direction}: ${candidate.accountingError}`);
  }

  const ref = summarize(reference);
  const cand = summarize(candidate);
  const lostPhysical = reference.physicalImpulse - candidate.physicalImpulse;
  const slipAreaDrop = ref.positiveSlipArea - cand.positiveSlipArea;
  const normalRatio = cand.normal / ref.normal;
  const tiltDelta = cand.peakTiltDeg - ref.peakTiltDeg;

  console.log(`\nDIR ${direction > 0 ? '+' : '-'}`);
  console.log(
    `  aggregate: Jphys ${reference.physicalImpulse.toFixed(2)} -> ${candidate.physicalImpulse.toFixed(2)}Ns ` +
    `(lost=${lostPhysical.toFixed(2)}); lockedAssist=${candidate.assistImpulse.toFixed(2)}Ns; ` +
    `vEnd ${reference.speedAtRampEnd.toFixed(3)} -> ${candidate.speedAtRampEnd.toFixed(3)}m/s`,
  );
  console.log(
    `  slip: positiveArea ${ref.positiveSlipArea.toFixed(4)} -> ${cand.positiveSlipArea.toFixed(4)}m/s·frame ` +
    `(drop=${slipAreaDrop.toFixed(4)}); mean ${ref.meanSlip.toFixed(4)} -> ${cand.meanSlip.toFixed(4)}m/s`,
  );
  console.log(
    `  load: ΣJn~ ${ref.normal.toFixed(2)} -> ${cand.normal.toFixed(2)}Ns ` +
    `(ratio=${normalRatio.toFixed(4)}); weightRatio ${ref.normalWeightRatio.toFixed(3)} -> ${cand.normalWeightRatio.toFixed(3)}; ` +
    `Jphys/(μΣJn~) ${ref.physicalVsCoulomb.toFixed(3)} -> ${cand.physicalVsCoulomb.toFixed(3)}`,
  );
  console.log(
    `  posture: peak torso ${ref.peakTiltDeg.toFixed(3)} -> ${cand.peakTiltDeg.toFixed(3)}deg ` +
    `(Δ=${tiltDelta.toFixed(3)}); meanAbs ${ref.meanAbsTiltDeg.toFixed(3)} -> ${cand.meanAbsTiltDeg.toFixed(3)}; ` +
    `peakFoot ${ref.peakFootTiltDeg.toFixed(3)} -> ${cand.peakFootTiltDeg.toFixed(3)}deg`,
  );
  console.log('  frame | platform | slip ref/cand | Jphys ref/cand | Jassist | Jn~ ref/cand | torso ref/cand');
  for (let i = 0; i < reference.trace.length; i++) {
    const r = reference.trace[i];
    const c = candidate.trace[i];
    console.log(
      `  ${String(i).padStart(2)} | ${r.platformSpeed.toFixed(3)} | ` +
      `${r.slipBefore.toFixed(3)}/${c.slipBefore.toFixed(3)} | ` +
      `${r.physicalImpulse.toFixed(2)}/${c.physicalImpulse.toFixed(2)} | ` +
      `${c.assistImpulse.toFixed(2)} | ` +
      `${r.normalImpulse.toFixed(2)}/${c.normalImpulse.toFixed(2)} | ` +
      `${r.torsoTiltDeg.toFixed(2)}/${c.torsoTiltDeg.toFixed(2)}`,
    );
  }
}

console.log('\nE11.1a PASS: decomposition completed without changing E11.0a mechanics. Interpret the printed matched traces before selecting another authority model. A lower physical impulse in the candidate is not by itself classified here as lost support capacity: reduced relative slip can legitimately reduce frictional work/impulse demand, while reduced normal load or materially degraded posture would support a different diagnosis. This diagnostic does not rescue E11.0a, promote hybrid locomotion, select an assist budget, or alter runtime/Donor behavior.');