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
const LEADS = [0, 8];
const DIRECTIONS = [-1, 1];
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 180;
const RECOVER_STREAK = 30;
const LOAD_EPS = 1e-6;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const IDENTITY = [0, 0, 0, 1];
const STATIC_FRAME_LOAD = TOTAL_MASS * G * DT;
const REQUIRED_RAMP_IMPULSE = TOTAL_MASS * TARGET_SPEED;

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
    let finalNormalImpulse = 0;
    let totalNormalImpulse = 0;
    let minSeparation = Infinity;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          minSeparation = Math.min(minSeparation, point.separation);
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          finalNormalImpulse += finalJn;
          totalNormalImpulse += totalJn;
          if (finalJn > LOAD_EPS || totalJn > LOAD_EPS) loaded += 1;
        }
      }
    }

    const reactive = touching > 0 || loaded > 0;
    return {
      reactive,
      touching,
      loaded,
      finalNormalImpulse,
      totalNormalImpulse,
      // E5.0a qualified this exact outer-step estimate across [1,2,4,8].
      frameNormalImpulse: 0.5 * totalNormalImpulse,
      minSeparation: Number.isFinite(minSeparation) ? minSeparation : null,
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
    pos: [
      (organism.footMass * organism.footCom[0] + organism.torsoMass * organism.torsoCom[0]) / mass,
      (organism.footMass * organism.footCom[1] + organism.torsoMass * organism.torsoCom[1]) / mass,
      (organism.footMass * organism.footCom[2] + organism.torsoMass * organism.torsoCom[2]) / mass,
    ],
    vel: [
      (organism.footMass * footV[0] + organism.torsoMass * torsoV[0]) / mass,
      (organism.footMass * footV[1] + organism.torsoMass * torsoV[1]) / mass,
      (organism.footMass * footV[2] + organism.torsoMass * torsoV[2]) / mass,
    ],
  };
}

function runCase({ leadFrames, direction, substeps }) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
  });
  const support = createSupportReader(organism);
  let signal = support.read();
  let platformZ = 0;
  let platformSpeed = 0;
  let targetReached = false;
  let stableFrames = 0;
  let recovered = false;
  let supportLossFrames = 0;
  let maxFootRelativeDrift = 0;
  let initialFootRelativeZ = 0;
  const desiredTilt = direction * Math.atan2(ACCEL, G);

  function step({ movePlatform = false, targetTilt = 0, collect = null } = {}) {
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

    const before = wholeBodyState(organism);
    const commandedTilt = movePlatform
      ? direction * Math.atan2(Math.abs(actualAccel), G)
      : targetTilt;
    const torque = targetedPreStep(
      organism,
      commandedTilt,
      signal.reactive ? FINITE_TORQUE : 0,
    );

    b3.b3World_Step(world, DT, substeps);
    organism.postStep();
    const after = wholeBodyState(organism);
    signal = support.read();
    if (!signal.reactive) supportLossFrames += 1;

    const relativeFootZ = organism.footCom[2] - platformZ - initialFootRelativeZ;
    maxFootRelativeDrift = Math.max(maxFootRelativeDrift, Math.abs(relativeFootZ));

    const deltaPz = after.mass * (after.vel[2] - before.vel[2]);
    const deltaPy = after.mass * (after.vel[1] - before.vel[1]);
    // Internal ankle impulses cancel in whole-body linear momentum. Gravity is vertical.
    // Therefore horizontal whole-body ΔP during this solve is the net support tangential impulse.
    const signedTangentialImpulse = direction * deltaPz;
    const normalImpulse = signal.frameNormalImpulse;
    const coulombCapacity = MU * normalImpulse;
    const saturation = coulombCapacity > 1e-9
      ? Math.abs(deltaPz) / coulombCapacity
      : (Math.abs(deltaPz) > 1e-9 ? Infinity : 0);

    if (collect) collect.push({
      actualAccel,
      platformSpeed,
      torque,
      normalImpulse,
      coulombCapacity,
      deltaPz,
      signedTangentialImpulse,
      deltaPy,
      saturation,
      comY: after.pos[1],
      comVy: after.vel[1],
      comVz: after.vel[2],
      footRelativeZ: relativeFootZ,
      reactive: signal.reactive,
      torsoTilt: organism.torsoTilt,
      footTilt: organism.footTilt,
    });

    if (targetReached && organism.isRecovered() && signal.reactive) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!signal.reactive) throw new Error(`E5.1 failed to establish support at substeps=${substeps}`);
  const settled = wholeBodyState(organism);
  if (Math.abs(settled.mass - TOTAL_MASS) > 1e-3) {
    throw new Error(`E5.1 organism mass ${settled.mass} no longer matches Donor-v1 comparison mass ${TOTAL_MASS}`);
  }

  initialFootRelativeZ = organism.footCom[2] - platformZ;
  supportLossFrames = 0;
  maxFootRelativeDrift = 0;
  stableFrames = 0;
  recovered = false;
  const leadTrace = [];
  const rampTrace = [];

  for (let i = 0; i < leadFrames; i++) step({ targetTilt: desiredTilt, collect: leadTrace });
  const launch = wholeBodyState(organism);
  const launchTilt = organism.torsoTilt;
  const launchOmega = organism.torsoAngularVelocity[0];

  const maxRampFrames = Math.ceil(TARGET_SPEED / ACCEL / DT) + 3;
  for (let i = 0; i < maxRampFrames && !targetReached; i++) {
    step({ movePlatform: true, collect: rampTrace });
  }
  if (!targetReached) throw new Error(`E5.1 failed to reach platform target at substeps=${substeps}`);
  const rampEnd = wholeBodyState(organism);

  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });
  const telemetry = organism.telemetry();

  const sum = (trace, key) => trace.reduce((acc, f) => acc + f[key], 0);
  const max = (trace, key) => trace.reduce((acc, f) => Math.max(acc, f[key]), -Infinity);
  const mean = (trace, key) => trace.length ? sum(trace, key) / trace.length : 0;
  const rampNormal = sum(rampTrace, 'normalImpulse');
  const rampCapacity = sum(rampTrace, 'coulombCapacity');
  const rampTangential = sum(rampTrace, 'signedTangentialImpulse');
  const expectedVerticalMomentumChange = rampNormal - TOTAL_MASS * G * DT * rampTrace.length;
  const measuredVerticalMomentumChange = TOTAL_MASS * (rampEnd.vel[1] - launch.vel[1]);
  const verticalMomentumClosureError = measuredVerticalMomentumChange - expectedVerticalMomentumChange;

  const result = {
    leadFrames,
    direction,
    substeps,
    outcome: telemetry.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: telemetry.peakAbsTilt * 180 / Math.PI,
    launchTiltDeg: launchTilt * 180 / Math.PI,
    launchOmega,
    launchVy: launch.vel[1],
    launchVz: launch.vel[2],
    rampFrames: rampTrace.length,
    rampNormal,
    rampNormalWeightRatio: rampNormal / (STATIC_FRAME_LOAD * rampTrace.length),
    rampCapacity,
    capacityVsRequired: rampCapacity / REQUIRED_RAMP_IMPULSE,
    rampTangential,
    deliveredVsRequired: rampTangential / REQUIRED_RAMP_IMPULSE,
    bodySpeedAtRampEnd: direction * rampEnd.vel[2],
    platformSpeedAtRampEnd: Math.abs(platformSpeed),
    rampEndVy: rampEnd.vel[1],
    rampComRise: rampEnd.pos[1] - launch.pos[1],
    maxRampNormalMultiple: max(rampTrace, 'normalImpulse') / STATIC_FRAME_LOAD,
    maxSaturation: max(rampTrace, 'saturation'),
    meanSaturation: mean(rampTrace, 'saturation'),
    saturatedFrames: rampTrace.filter((f) => f.saturation >= 0.95).length,
    supportLossFrames,
    maxFootRelativeDrift,
    verticalMomentumClosureError,
    leadNormalWeightRatio: leadTrace.length
      ? sum(leadTrace, 'normalImpulse') / (STATIC_FRAME_LOAD * leadTrace.length)
      : 1,
    leadEndVy: launch.vel[1],
    leadComDeltaY: launch.pos[1] - settled.pos[1],
  };

  support.destroy();
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
  throw new Error('E5.1 expected accepted Donor-v1/E4 substrate changed; requalify load recruitment probe');
}

console.log('E5.1 posture ↔ normal-load recruitment in the qualified E4 current-31 launch');
console.log(`  static load=${STATIC_FRAME_LOAD.toFixed(6)}Ns/frame, μ=${MU}, required ramp impulse M*Δv=${REQUIRED_RAMP_IMPULSE.toFixed(3)}Ns`);

const results = [];
for (const substeps of SUBSTEPS_SWEEP) {
  for (const leadFrames of LEADS) {
    for (const direction of DIRECTIONS) {
      const r = runCase({ leadFrames, direction, substeps });
      results.push(r);
      console.log(
        `sub=${substeps} lead=${leadFrames} dir=${direction > 0 ? '+' : '-'} ${r.outcome.padEnd(7)} ` +
        `launch=${r.launchTiltDeg.toFixed(2)}deg vy=${r.launchVy.toFixed(3)} ` +
        `rampJn=${r.rampNormal.toFixed(1)}Ns (${r.rampNormalWeightRatio.toFixed(2)}x weight) ` +
        `μΣJn/need=${r.capacityVsRequired.toFixed(3)} Jt/need=${r.deliveredVsRequired.toFixed(3)} ` +
        `vBody=${r.bodySpeedAtRampEnd.toFixed(3)}/${r.platformSpeedAtRampEnd.toFixed(3)} ` +
        `sat=${r.meanSaturation.toFixed(2)} mean/${r.maxSaturation.toFixed(2)} max ` +
        `satF=${r.saturatedFrames}/${r.rampFrames} maxN=${r.maxRampNormalMultiple.toFixed(2)}x ` +
        `vyEnd=${r.rampEndVy.toFixed(3)} dy=${r.rampComRise.toFixed(3)}m footRel=${r.maxFootRelativeDrift.toFixed(3)}m ` +
        `PyclErr=${r.verticalMomentumClosureError.toExponential(2)}`,
      );
    }
  }
}

function pair(substeps, leadFrames) {
  return DIRECTIONS.map((direction) => results.find(
    (r) => r.substeps === substeps && r.leadFrames === leadFrames && r.direction === direction,
  ));
}

// Preserve the already-qualified E4.5 outcome pattern before interpreting new telemetry.
for (const substeps of SUBSTEPS_SWEEP) {
  const base = pair(substeps, 0);
  const prep = pair(substeps, 8);
  if (!base.every((r) => r.outcome === 'FALL')) {
    throw new Error(`E5.1 failed to reproduce current31 lead0 F/F at substeps=${substeps}`);
  }
  const expectedPrep = substeps === 1 ? 'FALL' : 'RECOVER';
  if (!prep.every((r) => r.outcome === expectedPrep)) {
    throw new Error(`E5.1 failed to reproduce current31 lead8 ${expectedPrep}/${expectedPrep} at substeps=${substeps}`);
  }
}

if (!results.every((r) => Math.abs(r.verticalMomentumClosureError) < 0.8)) {
  throw new Error('E5.1 normal-load telemetry does not close against whole-body vertical momentum; do not interpret traction capacity');
}

console.log('E5.1 load-recruitment summary:');
for (const substeps of SUBSTEPS_SWEEP) {
  const base = pair(substeps, 0);
  const prep = pair(substeps, 8);
  console.log(
    `  sub=${substeps}: lead0 ${base.map((r) => `${r.outcome[0]} cap=${r.capacityVsRequired.toFixed(2)} Jt=${r.deliveredVsRequired.toFixed(2)} N=${r.rampNormalWeightRatio.toFixed(2)}x`).join(' | ')} ` +
    `:: lead8 ${prep.map((r) => `${r.outcome[0]} cap=${r.capacityVsRequired.toFixed(2)} Jt=${r.deliveredVsRequired.toFixed(2)} N=${r.rampNormalWeightRatio.toFixed(2)}x`).join(' | ')}`,
  );
}

console.log('E5.1 PASS: the exact E4.5 current-31 launch outcome pattern was reproduced while whole-body horizontal momentum and calibrated normal-load budgets were instrumented. The printed capacity/delivery/load values determine whether anticipatory posture physically recruits traction authority; no force/traction/hybrid/stepping architecture is selected by this probe.');
