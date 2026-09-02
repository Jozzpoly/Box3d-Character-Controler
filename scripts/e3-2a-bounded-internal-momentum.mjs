import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const DEG = Math.PI / 180;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeWorld({ gravity = E3_SAGITTAL_DEFAULTS.gravity, ground = true } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(worldDef);
  if (ground) {
    const groundDef = b3.b3DefaultBodyDef();
    groundDef.position = [0, -0.10, 0];
    const groundBody = b3.b3CreateBody(world, groundDef);
    const groundShape = b3.b3DefaultShapeDef();
    groundShape.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
    groundShape.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(groundBody, groundShape, 4, 0.10, 4);
  }
  return world;
}

function createInternalReactionMass(world, organism, {
  mass = 10,
  locked = false,
  maxAngle = 45 * DEG,
} = {}) {
  const half = E3_SAGITTAL_DEFAULTS.torsoHalf;
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...organism.startTorsoPosition];
  bodyDef.linearDamping = 0.015;
  bodyDef.angularDamping = 0.015;
  bodyDef.enableSleep = false;
  bodyDef.enableContactRecycling = false;
  bodyDef.motionLocks.linearX = true;
  bodyDef.motionLocks.angularY = true;
  bodyDef.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bodyDef);

  // Same dimensions as the outer torso: when aligned, 60 kg outer + 10 kg
  // internal has the same sagittal mass/CoM/inertia sum as the original 70 kg
  // torso box. maskBits=0n keeps the internal body from creating world contacts.
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForBoxMass(mass, half);
  shapeDef.filter.maskBits = 0n;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);

  const jointDef = b3.b3DefaultRevoluteJointDef();
  jointDef.base.bodyIdA = organism.torso;
  jointDef.base.bodyIdB = body;
  jointDef.base.localFrameA = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jointDef.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jointDef.enableLimit = true;
  jointDef.lowerAngle = locked ? 0 : -maxAngle;
  jointDef.upperAngle = locked ? 0 : maxAngle;
  const joint = b3.b3CreateRevoluteJoint(world, jointDef);

  return { body, joint, mass: b3.b3Body_GetMass(body), angularVelocity: [0, 0, 0] };
}

function makeSpecimen({
  kind,
  ankleTorque = 320,
  hipMaxTorque = 0,
  hipMaxAngle = 45 * DEG,
  hipDriveSpeedCutoff = 6,
  gravity = E3_SAGITTAL_DEFAULTS.gravity,
  ground = true,
}) {
  const world = makeWorld({ gravity, ground });
  if (kind === 'baseline') {
    const organism = new SagittalBalanceOrganism(b3, world, {
      mode: 'finite',
      maxTorque: ankleTorque,
      torsoMass: 70,
      footMass: 10,
      gravity,
    });
    return {
      kind, world, organism, internal: null,
      hipMaxTorque: 0, hipMaxAngle: 0, hipDriveSpeedCutoff: 0,
      lastHipTorque: 0, maxHipTorqueUsed: 0, maxHipAngle: 0,
      maxHipRelativeSpeed: 0, capacityStops: 0,
    };
  }

  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: ankleTorque,
    torsoMass: 60,
    footMass: 10,
    gravity,
  });
  const internal = createInternalReactionMass(world, organism, {
    mass: 10,
    locked: kind === 'locked',
    maxAngle: hipMaxAngle,
  });
  return {
    kind, world, organism, internal,
    hipMaxTorque: kind === 'active' ? hipMaxTorque : 0,
    hipMaxAngle, hipDriveSpeedCutoff,
    lastHipTorque: 0, maxHipTorqueUsed: 0, maxHipAngle: 0,
    maxHipRelativeSpeed: 0, capacityStops: 0,
  };
}

function syncInternal(specimen) {
  if (!specimen.internal) return { angle: 0, relativeSpeed: 0 };
  b3.b3Body_GetAngularVelocity(specimen.internal.angularVelocity, specimen.internal.body);
  const angle = b3.b3RevoluteJoint_GetAngle(specimen.internal.joint);
  const relativeSpeed = specimen.internal.angularVelocity[0] - specimen.organism.torsoAngularVelocity[0];
  specimen.maxHipAngle = Math.max(specimen.maxHipAngle, Math.abs(angle));
  specimen.maxHipRelativeSpeed = Math.max(specimen.maxHipRelativeSpeed, Math.abs(relativeSpeed));
  return { angle, relativeSpeed };
}

function applyBoundedHip(specimen) {
  if (specimen.kind !== 'active' || specimen.hipMaxTorque <= 0) {
    specimen.lastHipTorque = 0;
    return;
  }

  const organism = specimen.organism;
  const requestedTotal = -organism.kp * organism.torsoTilt - organism.kd * organism.torsoAngularVelocity[0];
  const ankleDelivered = clamp(requestedTotal, -organism.maxTorque, organism.maxTorque);
  let hipTorque = clamp(requestedTotal - ankleDelivered, -specimen.hipMaxTorque, specimen.hipMaxTorque);

  const { angle, relativeSpeed } = syncInternal(specimen);
  // hipTorque acts on outer torso; the internal body receives exactly -hipTorque.
  // The speed value is deliberately a DRIVE CUTOFF, not claimed as a hard
  // physical speed constraint: external dynamics and joint-limit impulses can
  // exceed it. Finite angular range is the primary finite-capacity boundary.
  const internalDriveSign = Math.sign(-hipTorque);
  const angleAtCapacity = (
    (internalDriveSign > 0 && angle >= specimen.hipMaxAngle - 1e-4) ||
    (internalDriveSign < 0 && angle <= -specimen.hipMaxAngle + 1e-4)
  );
  const driveSpeedAtCapacity = (
    internalDriveSign !== 0 &&
    Math.sign(relativeSpeed) === internalDriveSign &&
    Math.abs(relativeSpeed) >= specimen.hipDriveSpeedCutoff
  );
  if (angleAtCapacity || driveSpeedAtCapacity) {
    hipTorque = 0;
    specimen.capacityStops += 1;
  }

  specimen.lastHipTorque = hipTorque;
  specimen.maxHipTorqueUsed = Math.max(specimen.maxHipTorqueUsed, Math.abs(hipTorque));
  if (Math.abs(hipTorque) <= 1e-9) return;

  const impulse = hipTorque * dt;
  b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(specimen.internal.body, [-impulse, 0, 0], true);
}

function tick(specimen) {
  specimen.organism.preStep(dt);
  applyBoundedHip(specimen);
  b3.b3World_Step(specimen.world, dt, substeps);
  specimen.organism.postStep();
  syncInternal(specimen);
}

function settle(specimen, frames = 45) {
  for (let i = 0; i < frames; i++) tick(specimen);
  const t = specimen.organism.telemetry();
  const h = syncInternal(specimen);
  if (Math.abs(t.torsoTilt) > 0.02 || Math.abs(t.footTilt) > 0.02) {
    throw new Error(`E3.2a quiet instability: ${specimen.kind} torso=${t.torsoTilt} foot=${t.footTilt}`);
  }
  return { ...t, ...h };
}

function measurePassiveImpulseResponse(kind) {
  const specimen = makeSpecimen({ kind, ankleTorque: 0 });
  settle(specimen);
  specimen.organism.applyPush({ impulseNs: 48, direction: 1, leverArm: 0.36 });
  b3.b3World_Step(specimen.world, dt, substeps);
  specimen.organism.postStep();
  syncInternal(specimen);
  return {
    kind,
    torsoOmega: specimen.organism.torsoAngularVelocity[0],
    torsoTilt: specimen.organism.torsoTilt,
    hipAngle: specimen.internal ? b3.b3RevoluteJoint_GetAngle(specimen.internal.joint) : 0,
    totalMass: specimen.organism.footMass + specimen.organism.torsoMass + (specimen.internal?.mass ?? 0),
  };
}

function runTrial({
  kind,
  impulseNs,
  hipMaxTorque = 0,
  hipMaxAngle = 45 * DEG,
  hipDriveSpeedCutoff = 6,
}) {
  const specimen = makeSpecimen({ kind, ankleTorque: 320, hipMaxTorque, hipMaxAngle, hipDriveSpeedCutoff });
  const quiet = settle(specimen);
  const startFootZ = quiet.footCom[2];
  specimen.organism.applyPush({ impulseNs, direction: 1, leverArm: 0.36 });

  let stableFrames = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let peakAnkleUtilization = 0;
  for (let i = 0; i < 420; i++) {
    tick(specimen);
    const t = specimen.organism.telemetry();
    peakAnkleUtilization = Math.max(peakAnkleUtilization, t.torqueUtilization);
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    if (t.recovered) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }

  const final = specimen.organism.telemetry();
  const hip = syncInternal(specimen);
  const outcome = final.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  return {
    kind, impulseNs, outcome, recoveredFrame,
    peakTiltDeg: final.peakAbsTilt / DEG,
    finalTiltDeg: final.torsoTilt / DEG,
    maxFootTravel, peakAnkleUtilization,
    hipMaxTorque, hipLimitDeg: hipMaxAngle / DEG, hipDriveSpeedCutoff,
    peakHipTorque: specimen.maxHipTorqueUsed,
    peakHipAngleDeg: specimen.maxHipAngle / DEG,
    peakHipRelativeSpeed: specimen.maxHipRelativeSpeed,
    finalHipAngleDeg: hip.angle / DEG,
    finalHipRelativeSpeed: hip.relativeSpeed,
    capacityStops: specimen.capacityStops,
  };
}

function compact(rows) {
  return rows.map((r) => (
    `${r.impulseNs}:${r.outcome[0]}(peak=${r.peakTiltDeg.toFixed(0)}°,foot=${r.maxFootTravel.toFixed(3)}m,hip=${r.peakHipAngleDeg.toFixed(0)}°/${r.peakHipRelativeSpeed.toFixed(1)}rad/s,T=${r.peakHipTorque.toFixed(0)},stop=${r.capacityStops})`
  )).join(' ');
}

function summary(rows) {
  const recover = rows.filter((r) => r.outcome === 'RECOVER');
  const fall = rows.filter((r) => r.outcome === 'FALL');
  return {
    maxRecover: recover.length ? Math.max(...recover.map((r) => r.impulseNs)) : 0,
    minFall: fall.length ? Math.min(...fall.map((r) => r.impulseNs)) : null,
    maxRecoveredFootTravel: recover.length ? Math.max(...recover.map((r) => r.maxFootTravel)) : 0,
  };
}

// Representation-neutrality: adding a locked co-located internal body must not
// buy a materially different disturbance response by itself.
const baselineImpulse = measurePassiveImpulseResponse('baseline');
const lockedImpulse = measurePassiveImpulseResponse('locked');
console.log(
  `E3.2a passive representation response: baseline mass=${baselineImpulse.totalMass.toFixed(2)}kg w=${baselineImpulse.torsoOmega.toFixed(5)} tilt=${(baselineImpulse.torsoTilt / DEG).toFixed(3)}deg | locked mass=${lockedImpulse.totalMass.toFixed(2)}kg w=${lockedImpulse.torsoOmega.toFixed(5)} tilt=${(lockedImpulse.torsoTilt / DEG).toFixed(3)}deg hip=${(lockedImpulse.hipAngle / DEG).toFixed(4)}deg`,
);
if (Math.abs(baselineImpulse.totalMass - 80) > 1e-3 || Math.abs(lockedImpulse.totalMass - 80) > 1e-3) {
  throw new Error(`E3.2a mass invariance failed: baseline=${baselineImpulse.totalMass} locked=${lockedImpulse.totalMass}`);
}
const omegaRelError = Math.abs(lockedImpulse.torsoOmega - baselineImpulse.torsoOmega) / Math.max(1e-6, Math.abs(baselineImpulse.torsoOmega));
if (omegaRelError > 0.03) {
  throw new Error(`E3.2a split-torso representation changed passive impulse response too much: relError=${omegaRelError}`);
}
if (Math.abs(lockedImpulse.hipAngle) > 0.1 * DEG) {
  throw new Error(`E3.2a locked internal DOF drifted: ${lockedImpulse.hipAngle / DEG}deg`);
}

const impulses = [48, 64, 72, 80, 88, 96, 112];
const locked = impulses.map((impulseNs) => runTrial({ kind: 'locked', impulseNs }));
const free = impulses.map((impulseNs) => runTrial({ kind: 'free', impulseNs, hipMaxAngle: 45 * DEG, hipDriveSpeedCutoff: 6 }));
const lockedSummary = summary(locked);
const freeSummary = summary(free);
console.log(`E3.2a locked control: ${compact(locked)} => ${lockedSummary.maxRecover}/${lockedSummary.minFall ?? 'OPEN'}Ns`);
console.log(`E3.2a free passive:  ${compact(free)} => ${freeSummary.maxRecover}/${freeSummary.minFall ?? 'OPEN'}Ns`);
if (locked.find((r) => r.impulseNs === 64)?.outcome !== 'RECOVER' || locked.find((r) => r.impulseNs === 80)?.outcome !== 'FALL') {
  throw new Error(`E3.2a locked representation failed canonical boundary control: 64=${locked.find((r) => r.impulseNs === 64)?.outcome} 80=${locked.find((r) => r.impulseNs === 80)?.outcome}`);
}

// Torque sweep at fixed finite range. Improvement is observation, never a pass gate.
const hipTorqueBudgets = [80, 160, 240, 320];
const activeMatrices = hipTorqueBudgets.map((hipMaxTorque) => {
  const rows = impulses.map((impulseNs) => runTrial({
    kind: 'active', impulseNs, hipMaxTorque,
    hipMaxAngle: 45 * DEG, hipDriveSpeedCutoff: 6,
  }));
  const s = summary(rows);
  console.log(`E3.2a active hip ${hipMaxTorque}Nm @45deg/drive6: ${compact(rows)} => ${s.maxRecover}/${s.minFall ?? 'OPEN'}Ns`);
  return { hipMaxTorque, rows, ...s };
});

// Every first-pass active trial consumed essentially the whole 45deg range.
// This motivates a separated RANGE/CAPACITY sweep instead of blindly increasing torque.
const rangeDegrees = [15, 30, 45, 60, 90, 120];
const rangeMatrices = rangeDegrees.map((rangeDeg) => {
  const rows = impulses.map((impulseNs) => runTrial({
    kind: 'active', impulseNs, hipMaxTorque: 160,
    hipMaxAngle: rangeDeg * DEG, hipDriveSpeedCutoff: 6,
  }));
  const s = summary(rows);
  console.log(`E3.2a range ${rangeDeg}deg @160Nm/drive6: ${compact(rows)} => ${s.maxRecover}/${s.minFall ?? 'OPEN'}Ns`);
  return { rangeDeg, rows, ...s };
});

for (const matrix of [...activeMatrices, ...rangeMatrices]) {
  for (const row of matrix.rows) {
    const torqueBudget = row.hipMaxTorque;
    if (row.peakHipTorque > torqueBudget + 1e-6) {
      throw new Error(`E3.2a torque bound violated: budget=${torqueBudget} peak=${row.peakHipTorque}`);
    }
    // Box3D's hard revolute limit has solver slop during violent falls. Guard
    // against an effectively unlimited wheel while allowing a few degrees of
    // transient constraint error; do not mislabel this as an exact angle clamp.
    if (row.peakHipAngleDeg > row.hipLimitDeg + 5.0) {
      throw new Error(`E3.2a revolute range escaped materially: limit=${row.hipLimitDeg} peak=${row.peakHipAngleDeg}deg`);
    }
  }
}

const bestTorque = activeMatrices.reduce((a, b) => (b.maxRecover > a.maxRecover ? b : a));
const bestRange = rangeMatrices.reduce((a, b) => (b.maxRecover > a.maxRecover ? b : a));
console.log(
  `E3.2a bounded internal-momentum diagnostic PASS: representationOmegaError=${(omegaRelError * 100).toFixed(2)}% locked=${lockedSummary.maxRecover}/${lockedSummary.minFall ?? 'OPEN'}Ns free=${freeSummary.maxRecover}/${freeSummary.minFall ?? 'OPEN'}Ns bestTorque=${bestTorque.hipMaxTorque}Nm:${bestTorque.maxRecover}/${bestTorque.minFall ?? 'OPEN'}Ns bestRange=${bestRange.rangeDeg}deg:${bestRange.maxRecover}/${bestRange.minFall ?? 'OPEN'}Ns. Actual relative speed is observed, not claimed as hard-capped. Active improvement is observation, not a preselected PASS condition.`,
);
