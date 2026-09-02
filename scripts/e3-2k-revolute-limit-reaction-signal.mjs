import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const DEG = Math.PI / 180;
const RANGE_DEG = 60;
const RANGE = RANGE_DEG * DEG;
const HIP_TORQUE = 160;
const DRIVE_SPEED = 6;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function density(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }

function makeZeroGRig() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(wd);
  const half = E3_SAGITTAL_DEFAULTS.torsoHalf;

  function body(mass) {
    const bd = b3.b3DefaultBodyDef();
    bd.type = b3.b3BodyType.b3_dynamicBody;
    bd.position = [0, 0, 0];
    bd.linearDamping = 0;
    bd.angularDamping = 0;
    bd.enableSleep = false;
    bd.motionLocks.linearX = true;
    bd.motionLocks.linearY = true;
    bd.motionLocks.linearZ = true;
    bd.motionLocks.angularY = true;
    bd.motionLocks.angularZ = true;
    const id = b3.b3CreateBody(world, bd);
    const sd = b3.b3DefaultShapeDef();
    sd.density = density(mass, half);
    sd.filter.maskBits = 0n;
    b3.b3CreateBoxShape(id, sd, half[0], half[1], half[2]);
    return id;
  }

  const torso = body(60);
  const internal = body(10);
  const jd = b3.b3DefaultRevoluteJointDef();
  jd.base.bodyIdA = torso;
  jd.base.bodyIdB = internal;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.enableLimit = true;
  jd.lowerAngle = -RANGE;
  jd.upperAngle = RANGE;
  const joint = b3.b3CreateRevoluteJoint(world, jd);
  return { world, torso, internal, joint, wA: [0, 0, 0], wB: [0, 0, 0], reaction: [0, 0, 0] };
}

function zeroGDrive(side) {
  const rig = makeZeroGRig();
  const rows = [];
  const torsoTorque = -side * HIP_TORQUE;
  for (let frame = 0; frame < 120; frame++) {
    const j = torsoTorque * dt;
    b3.b3Body_ApplyAngularImpulse(rig.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.internal, [-j, 0, 0], true);
    b3.b3World_Step(rig.world, dt, substeps);
    b3.b3Body_GetAngularVelocity(rig.wA, rig.torso);
    b3.b3Body_GetAngularVelocity(rig.wB, rig.internal);
    b3.b3Joint_GetConstraintTorque(rig.reaction, rig.joint);
    rows.push({
      frame,
      angle: b3.b3RevoluteJoint_GetAngle(rig.joint),
      relW: rig.wB[0] - rig.wA[0],
      reactionX: rig.reaction[0],
    });
  }
  b3.b3DestroyWorld(rig.world);
  const normalized = rows.map((r) => ({
    ...r,
    angleN: side * r.angle,
    relWN: side * r.relW,
    reactionXN: side * r.reactionX,
  }));
  const pre = normalized.filter((r) => r.angleN < 45 * DEG);
  const near = normalized.filter((r) => r.angleN > 55 * DEG);
  const peakPre = pre.length ? Math.max(...pre.map((r) => Math.abs(r.reactionXN))) : 0;
  const peakNear = near.length ? Math.max(...near.map((r) => Math.abs(r.reactionXN))) : 0;
  const firstNear = normalized.find((r) => r.angleN > 55 * DEG)?.frame ?? -1;
  const firstReaction = normalized.find((r) => Math.abs(r.reactionXN) > 1)?.frame ?? -1;
  const firstStall = normalized.find((r) => r.angleN > 55 * DEG && Math.abs(r.relWN) < 0.25)?.frame ?? -1;
  return { side, normalized, peakPre, peakNear, firstNear, firstReaction, firstStall };
}

function makeRamRig() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(wd);
  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.10, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
  b3.b3CreateBoxShape(ground, groundShape, 5, 0.10, 5);

  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite', maxTorque: 320, torsoMass: 60, footMass: 10,
  });
  const half = E3_SAGITTAL_DEFAULTS.torsoHalf;
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [...organism.startTorsoPosition];
  bd.linearDamping = 0.015;
  bd.angularDamping = 0.015;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  bd.motionLocks.linearX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const internal = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = density(10, half);
  sd.filter.maskBits = 0n;
  b3.b3CreateBoxShape(internal, sd, half[0], half[1], half[2]);

  const jd = b3.b3DefaultRevoluteJointDef();
  jd.base.bodyIdA = organism.torso;
  jd.base.bodyIdB = internal;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.enableLimit = true;
  jd.lowerAngle = -RANGE;
  jd.upperAngle = RANGE;
  const joint = b3.b3CreateRevoluteJoint(world, jd);
  return { world, organism, internal, joint, internalW: [0, 0, 0], reaction: [0, 0, 0], ramV: [0, 0, 0] };
}

function hipDecision(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const relW = rig.internalW[0] - rig.organism.torsoAngularVelocity[0];
  const o = rig.organism;
  const request = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankle = clamp(request, -320, 320);
  let torque = clamp(request - ankle, -HIP_TORQUE, HIP_TORQUE);
  const driveSign = Math.sign(-torque);
  const atRange = driveSign !== 0 && (
    (driveSign > 0 && angle >= RANGE - 1e-4) ||
    (driveSign < 0 && angle <= -RANGE + 1e-4)
  );
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= DRIVE_SPEED;
  if (atRange || atDriveSpeed) torque = 0;
  return { angle, relW, torque, atRange, atDriveSpeed };
}

function stepRamRig(rig) {
  rig.organism.preStep(dt);
  const decision = hipDecision(rig);
  if (Math.abs(decision.torque) > 1e-9) {
    const j = decision.torque * dt;
    b3.b3Body_ApplyAngularImpulse(rig.organism.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.internal, [-j, 0, 0], true);
  }
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  b3.b3Joint_GetConstraintTorque(rig.reaction, rig.joint);
  return decision;
}

function createRam(rig, direction) {
  const half = [0.22, 0.22, 0.22];
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [
    rig.organism.torsoCom[0],
    rig.organism.torsoCom[1] + 0.25,
    rig.organism.torsoCom[2] - direction * 0.78,
  ];
  bd.enableSleep = false;
  const ram = b3.b3CreateBody(rig.world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = density(35, half);
  sd.baseMaterial.friction = 0.45;
  b3.b3CreateBoxShape(ram, sd, half[0], half[1], half[2]);
  b3.b3Body_SetLinearVelocity(ram, [0, 0, direction * 4]);
  return ram;
}

function ramTrace(direction) {
  const rig = makeRamRig();
  for (let i = 0; i < 60; i++) stepRamRig(rig);
  const ram = createRam(rig, direction);
  const rows = [];
  let firstCoupling = -1;
  let stable = 0;
  let recoveredFrame = -1;
  for (let frame = 0; frame < 180; frame++) {
    const decision = stepRamRig(rig);
    b3.b3Body_GetLinearVelocity(rig.ramV, ram);
    if (firstCoupling < 0 && Math.abs(rig.ramV[2] - direction * 4) > 0.25) firstCoupling = frame;
    const t = rig.organism.telemetry();
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = frame - 28;
    rows.push({
      frame,
      angleN: direction * b3.b3RevoluteJoint_GetAngle(rig.joint),
      relWN: direction * decision.relW,
      appliedN: direction * decision.torque,
      reactionXN: direction * rig.reaction[0],
      tiltN: direction * t.torsoTilt,
      atRange: decision.atRange,
      atDriveSpeed: decision.atDriveSpeed,
    });
  }
  const outcome = rig.organism.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  b3.b3DestroyWorld(rig.world);
  return { direction, rows, firstCoupling, recoveredFrame, outcome };
}

function summarizeRam(run) {
  const after = run.rows.filter((r) => r.frame >= run.firstCoupling);
  const materialReaction = after.filter((r) => Math.abs(r.reactionXN) > 1);
  const whileApplying = after.filter((r) => Math.abs(r.appliedN) > 1);
  const nearLimitApplying = whileApplying.filter((r) => Math.abs(r.angleN) > 55 * DEG);
  const peakReaction = materialReaction.length ? Math.max(...materialReaction.map((r) => Math.abs(r.reactionXN))) : 0;
  const firstReaction = materialReaction[0]?.frame ?? -1;
  const firstNearApplying = nearLimitApplying[0]?.frame ?? -1;
  const reactionWhileNear = nearLimitApplying.length ? Math.max(...nearLimitApplying.map((r) => Math.abs(r.reactionXN))) : 0;
  return { ...run, peakReaction, firstReaction, firstNearApplying, reactionWhileNear, nearLimitApplyingFrames: nearLimitApplying.length };
}

const zMinus = zeroGDrive(-1);
const zPlus = zeroGDrive(1);
console.log('E3.2k zero-g revolute limit-reaction qualification:');
for (const z of [zMinus, zPlus]) {
  console.log(`  side=${z.side > 0 ? '+' : '-'} first>55deg=${z.firstNear} firstReaction>1Nm=${z.firstReaction} firstStall=${z.firstStall} peakReaction pre45=${z.peakPre.toFixed(3)}Nm near55=${z.peakNear.toFixed(3)}Nm`);
  for (const frame of [z.firstNear, z.firstReaction, z.firstStall].filter((v, i, a) => v >= 0 && a.indexOf(v) === i)) {
    const r = z.normalized[frame];
    console.log(`    f=${frame} angle=${(r.angleN / DEG).toFixed(3)}deg relW=${r.relWN.toFixed(3)} reactionX=${r.reactionXN.toFixed(3)}Nm`);
  }
}

const rMinus = summarizeRam(ramTrace(-1));
const rPlus = summarizeRam(ramTrace(1));
console.log('E3.2k active ±4m/s ram limit-reaction trace:');
for (const r of [rMinus, rPlus]) {
  console.log(`  dir=${r.direction > 0 ? '+' : '-'} outcome=${r.outcome} coupling=${r.firstCoupling} recover=${r.recoveredFrame} firstReaction=${r.firstReaction} firstNearApplying=${r.firstNearApplying} nearApplyingFrames=${r.nearLimitApplyingFrames} peakReaction=${r.peakReaction.toFixed(2)}Nm reactionWhileNear=${r.reactionWhileNear.toFixed(2)}Nm`);
  const keys = [r.firstCoupling + 4, r.firstCoupling + 8, r.firstNearApplying, r.firstReaction, r.recoveredFrame].filter((v, i, a) => v >= 0 && a.indexOf(v) === i);
  for (const frame of keys) {
    const row = r.rows[frame];
    console.log(`    f=${frame} angle=${(row.angleN / DEG).toFixed(2)}deg relW=${row.relWN.toFixed(2)} apply=${row.appliedN.toFixed(1)} reactionX=${row.reactionXN.toFixed(1)} tilt=${(row.tiltN / DEG).toFixed(1)} cut=${row.atRange ? 'R' : '-'}${row.atDriveSpeed ? 'S' : '-'}`);
  }
}

if (![zMinus.peakPre, zMinus.peakNear, zPlus.peakPre, zPlus.peakNear, rMinus.peakReaction, rPlus.peakReaction].every(Number.isFinite)) {
  throw new Error('E3.2k constraint-torque signal produced non-finite data.');
}
console.log('E3.2k PASS: exact binding constraint-torque signal captured in isolated revolute-limit and mirrored ram cases. Signal usefulness is evidence from the printed separation; no capacity policy is selected by this script.');
