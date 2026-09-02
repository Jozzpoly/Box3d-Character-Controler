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
const RAM_MASS = 35;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const MODES = ['passive', 'manual', 'motor'];

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function density(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }
function boxIxx(mass, half) { return mass * (half[1] ** 2 + half[2] ** 2) / 3; }

function makeWorld({ gravity = 20, ground = true } = {}) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(wd);
  if (ground) {
    const bd = b3.b3DefaultBodyDef();
    bd.position = [0, -0.10, 0];
    const body = b3.b3CreateBody(world, bd);
    const sd = b3.b3DefaultShapeDef();
    sd.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
    sd.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(body, sd, 5, 0.10, 5);
  }
  return world;
}

function makeRig({ mode, gravity = 20, ground = true, ankleTorque = 320 } = {}) {
  const world = makeWorld({ gravity, ground });
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: ankleTorque,
    torsoMass: 60,
    footMass: 10,
    gravity,
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
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(internal, sd, half[0], half[1], half[2]);

  const jd = b3.b3DefaultRevoluteJointDef();
  jd.base.bodyIdA = organism.torso;
  jd.base.bodyIdB = internal;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.enableLimit = true;
  jd.lowerAngle = -RANGE;
  jd.upperAngle = RANGE;
  jd.enableMotor = mode === 'motor';
  jd.maxMotorTorque = 0;
  jd.motorSpeed = 0;
  const joint = b3.b3CreateRevoluteJoint(world, jd);

  return {
    mode, world, organism, internal, joint,
    internalMass: b3.b3Body_GetMass(internal),
    internalW: [0, 0, 0],
    manualAppliedTorque: 0,
    motorTorque: 0,
    mechanicalWork: 0,
    absMechanicalWork: 0,
    actuatorImpulseAbs: 0,
    peakAngle: 0,
    peakRelW: 0,
    peakActualTorque: 0,
    driveCutFrames: 0,
    rangeCutFrames: 0,
  };
}

function readJoint(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const relW = rig.internalW[0] - rig.organism.torsoAngularVelocity[0];
  rig.peakAngle = Math.max(rig.peakAngle, Math.abs(angle));
  rig.peakRelW = Math.max(rig.peakRelW, Math.abs(relW));
  return { angle, relW };
}

function residualRequest(rig) {
  const o = rig.organism;
  const requested = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankle = clamp(requested, -o.maxTorque, o.maxTorque);
  return { requested, ankle, residual: requested - ankle };
}

function prepareActuator(rig) {
  rig.manualAppliedTorque = 0;
  if (rig.mode === 'passive') {
    if (b3.b3RevoluteJoint_IsMotorEnabled(rig.joint)) b3.b3RevoluteJoint_EnableMotor(rig.joint, false);
    return;
  }

  const { residual } = residualRequest(rig);
  const proposed = clamp(residual, -HIP_TORQUE, HIP_TORQUE);
  const { angle, relW } = readJoint(rig);
  const driveSign = Math.sign(-proposed);
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= DRIVE_SPEED;

  if (rig.mode === 'manual') {
    const atRange = driveSign !== 0 && (
      (driveSign > 0 && angle >= RANGE - 1e-4) ||
      (driveSign < 0 && angle <= -RANGE + 1e-4)
    );
    if (atRange) rig.rangeCutFrames += 1;
    if (atDriveSpeed) rig.driveCutFrames += 1;
    const torque = (atRange || atDriveSpeed) ? 0 : proposed;
    rig.manualAppliedTorque = torque;
    if (Math.abs(torque) > 1e-9) {
      const impulse = torque * dt;
      rig.actuatorImpulseAbs += Math.abs(impulse);
      b3.b3Body_ApplyAngularImpulse(rig.organism.torso, [impulse, 0, 0], true);
      b3.b3Body_ApplyAngularImpulse(rig.internal, [-impulse, 0, 0], true);
    }
    return;
  }

  // Native revolute motor: same residual authority envelope and non-braking 6 rad/s drive policy.
  // The physical joint limit, rather than an angle epsilon, owns the stroke boundary.
  if (!b3.b3RevoluteJoint_IsMotorEnabled(rig.joint)) b3.b3RevoluteJoint_EnableMotor(rig.joint, true);
  const maxTorque = atDriveSpeed ? 0 : Math.abs(proposed);
  if (atDriveSpeed && Math.abs(proposed) > 1e-9) rig.driveCutFrames += 1;
  b3.b3RevoluteJoint_SetMaxMotorTorque(rig.joint, maxTorque);
  b3.b3RevoluteJoint_SetMotorSpeed(rig.joint, driveSign * DRIVE_SPEED);
}

function finishActuatorStep(rig, preRelW) {
  const { relW } = readJoint(rig);
  let torque;
  if (rig.mode === 'motor') {
    torque = b3.b3RevoluteJoint_GetMotorTorque(rig.joint);
    rig.motorTorque = torque;
  } else if (rig.mode === 'manual') {
    // Manual torso torque T corresponds to +(-T) torque in the B-A relative coordinate.
    torque = -rig.manualAppliedTorque;
  } else {
    torque = 0;
  }
  rig.peakActualTorque = Math.max(rig.peakActualTorque, Math.abs(torque));
  rig.actuatorImpulseAbs += rig.mode === 'motor' ? Math.abs(torque) * dt : 0;
  const avgRelW = 0.5 * (preRelW + relW);
  const dWork = torque * avgRelW * dt;
  rig.mechanicalWork += dWork;
  rig.absMechanicalWork += Math.abs(dWork);
}

function tick(rig) {
  rig.organism.preStep(dt);
  const pre = readJoint(rig);
  prepareActuator(rig);
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  finishActuatorStep(rig, pre.relW);
}

function settle(rig, frames = 60) {
  for (let i = 0; i < frames; i++) tick(rig);
}

function bodyState(body, mass, half) {
  const p = [0, 0, 0];
  const v = [0, 0, 0];
  const w = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(p, body);
  b3.b3Body_GetLinearVelocity(v, body);
  b3.b3Body_GetAngularVelocity(w, body);
  return { mass, p, v, w, ixx: boxIxx(mass, half) };
}

function totalLx(rig) {
  const bodies = [
    bodyState(rig.organism.foot, rig.organism.footMass, E3_SAGITTAL_DEFAULTS.footHalf),
    bodyState(rig.organism.torso, rig.organism.torsoMass, E3_SAGITTAL_DEFAULTS.torsoHalf),
    bodyState(rig.internal, rig.internalMass, E3_SAGITTAL_DEFAULTS.torsoHalf),
  ];
  const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
  const com = [0, 0, 0];
  for (const x of bodies) {
    com[0] += x.p[0] * x.mass / totalMass;
    com[1] += x.p[1] * x.mass / totalMass;
    com[2] += x.p[2] * x.mass / totalMass;
  }
  let lx = 0;
  for (const x of bodies) {
    const ry = x.p[1] - com[1];
    const rz = x.p[2] - com[2];
    lx += x.mass * (ry * x.v[2] - rz * x.v[1]);
    lx += x.ixx * x.w[0];
  }
  return lx;
}

function zeroG(mode) {
  const rig = makeRig({ mode, gravity: 0, ground: false, ankleTorque: 0 });
  for (const body of [rig.organism.foot, rig.organism.torso, rig.internal]) {
    b3.b3Body_SetLinearDamping(body, 0);
    b3.b3Body_SetAngularDamping(body, 0);
  }
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  rig.organism.applyPush({ impulseNs: 48, direction: 1, leverArm: 0.36 });
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  const initialLx = totalLx(rig);
  let maxLxDrift = 0;
  let minTilt = Math.abs(rig.organism.torsoTilt);
  for (let i = 0; i < 360; i++) {
    tick(rig);
    maxLxDrift = Math.max(maxLxDrift, Math.abs(totalLx(rig) - initialLx));
    minTilt = Math.min(minTilt, Math.abs(rig.organism.torsoTilt));
  }
  const finalLx = totalLx(rig);
  const joint = readJoint(rig);
  const out = {
    mode,
    initialLx, finalLx, maxLxDrift,
    relativeLxDrift: maxLxDrift / Math.max(1e-8, Math.abs(initialLx)),
    minTiltDeg: minTilt / DEG,
    finalTiltDeg: rig.organism.torsoTilt / DEG,
    finalAngleDeg: joint.angle / DEG,
    peakAngleDeg: rig.peakAngle / DEG,
    peakRelW: rig.peakRelW,
    peakTorque: rig.peakActualTorque,
    work: rig.mechanicalWork,
    absWork: rig.absMechanicalWork,
    impulseAbs: rig.actuatorImpulseAbs,
  };
  b3.b3DestroyWorld(rig.world);
  return out;
}

function direct(mode, direction) {
  const rig = makeRig({ mode });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  rig.organism.applyPush({ impulseNs: 80, direction, leverArm: 0.36 });
  let stable = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  for (let i = 0; i < 420; i++) {
    tick(rig);
    const t = rig.organism.telemetry();
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }
  const t = rig.organism.telemetry();
  const out = {
    mode, direction,
    outcome: t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel,
    peakAngleDeg: rig.peakAngle / DEG,
    peakTorque: rig.peakActualTorque,
    work: rig.mechanicalWork,
    absWork: rig.absMechanicalWork,
    impulseAbs: rig.actuatorImpulseAbs,
  };
  b3.b3DestroyWorld(rig.world);
  return out;
}

function createRam(rig, speed, direction) {
  const half = [0.22, 0.22, 0.22];
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [
    rig.organism.torsoCom[0],
    rig.organism.torsoCom[1] + 0.25,
    rig.organism.torsoCom[2] - direction * 0.78,
  ];
  bd.linearDamping = 0;
  bd.angularDamping = 0.02;
  bd.enableSleep = false;
  const body = b3.b3CreateBody(rig.world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = density(RAM_MASS, half);
  sd.baseMaterial.friction = 0.45;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
  b3.b3Body_SetLinearVelocity(body, [0, 0, direction * speed]);
  return body;
}

function ram(mode, speed, direction) {
  const rig = makeRig({ mode });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  const ramBody = createRam(rig, speed, direction);
  const rv = [0, 0, 0];
  let maxRamDv = 0;
  let firstCoupling = -1;
  let maxFootTravel = 0;
  let stable = 0;
  let recoveredFrame = -1;
  for (let i = 0; i < 480; i++) {
    tick(rig);
    const t = rig.organism.telemetry();
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    b3.b3Body_GetLinearVelocity(rv, ramBody);
    const dv = Math.abs(rv[2] - direction * speed);
    maxRamDv = Math.max(maxRamDv, dv);
    if (firstCoupling < 0 && dv > 0.25) firstCoupling = i;
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }
  const t = rig.organism.telemetry();
  const out = {
    mode, speed, direction,
    outcome: t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel, maxRamDv, firstCoupling,
    peakAngleDeg: rig.peakAngle / DEG,
    peakTorque: rig.peakActualTorque,
    work: rig.mechanicalWork,
    absWork: rig.absMechanicalWork,
    impulseAbs: rig.actuatorImpulseAbs,
  };
  b3.b3DestroyWorld(rig.world);
  return out;
}

function frontier(rows) {
  const recover = rows.filter((r) => r.outcome === 'RECOVER');
  const fall = rows.filter((r) => r.outcome === 'FALL');
  return {
    maxRecover: recover.length ? Math.max(...recover.map((r) => r.speed)) : null,
    minFall: fall.length ? Math.min(...fall.map((r) => r.speed)) : null,
    maxRecoveredFoot: recover.length ? Math.max(...recover.map((r) => r.maxFootTravel)) : 0,
  };
}

console.log('E3.2l zero-g actuator representation:');
const zeroRows = MODES.map(zeroG);
for (const r of zeroRows) {
  console.log(`  ${r.mode}: Lx=${r.initialLx.toFixed(5)}->${r.finalLx.toFixed(5)} drift=${(r.relativeLxDrift * 100).toFixed(4)}% minTilt=${r.minTiltDeg.toFixed(2)}deg finalTilt=${r.finalTiltDeg.toFixed(1)}deg angle=${r.finalAngleDeg.toFixed(1)}deg peakAngle=${r.peakAngleDeg.toFixed(1)}deg peakT=${r.peakTorque.toFixed(1)}Nm W=${r.work.toFixed(2)}J |W|=${r.absWork.toFixed(2)}J Jabs=${r.impulseAbs.toFixed(1)}Nms`);
}
for (const r of zeroRows.filter((x) => x.mode !== 'passive')) {
  if (r.relativeLxDrift > 5e-4) throw new Error(`E3.2l ${r.mode} zero-g total-Lx drift too high: ${r.relativeLxDrift}`);
}

console.log('E3.2l mirrored direct 80Ns:');
const directRows = [];
for (const mode of MODES) {
  for (const direction of [-1, 1]) directRows.push(direct(mode, direction));
}
for (const r of directRows) {
  console.log(`  ${r.mode.padEnd(7)} dir=${r.direction > 0 ? '+' : '-'} ${r.outcome} peak=${r.peakTiltDeg.toFixed(1)}deg foot=${r.maxFootTravel.toFixed(3)}m hip=${r.peakAngleDeg.toFixed(1)}deg peakT=${r.peakTorque.toFixed(1)}Nm W=${r.work.toFixed(1)}J |W|=${r.absWork.toFixed(1)}J Jabs=${r.impulseAbs.toFixed(1)}Nms`);
}
const passiveDirect = directRows.filter((r) => r.mode === 'passive');
if (!passiveDirect.every((r) => r.outcome === 'FALL')) throw new Error(`E3.2l passive direct control changed: ${passiveDirect.map((r) => r.outcome).join('/')}`);

console.log('E3.2l mirrored ecological frontier:');
const speeds = [3.5, 3.75, 4.0, 4.25, 4.5];
const ramRows = [];
for (const mode of MODES) {
  for (const direction of [-1, 1]) {
    for (const speed of speeds) ramRows.push(ram(mode, speed, direction));
  }
}
for (const mode of MODES) {
  for (const direction of [-1, 1]) {
    const subset = ramRows.filter((r) => r.mode === mode && r.direction === direction);
    const f = frontier(subset);
    console.log(`  ${mode.padEnd(7)} dir=${direction > 0 ? '+' : '-'}: ${subset.map((r) => `${r.speed.toFixed(2)}:${r.outcome[0]}(W=${r.work.toFixed(0)},J=${r.impulseAbs.toFixed(0)})`).join(' ')} => maxR=${f.maxRecover ?? 'none'} minF=${f.minFall ?? 'open'} foot=${f.maxRecoveredFoot.toFixed(3)}m`);
    if (f.maxRecoveredFoot > 0.15) throw new Error(`E3.2l ${mode} dir=${direction} recovered via material support relocation: ${f.maxRecoveredFoot}`);
    if (f.maxRecover != null && f.minFall != null && f.maxRecover >= f.minFall) throw new Error(`E3.2l non-monotonic frontier ${mode}/${direction}: ${f.maxRecover}/${f.minFall}`);
    for (const r of subset) if (r.firstCoupling < 0 || r.maxRamDv <= 0.25) throw new Error(`E3.2l uncoupled ram ${mode}/${direction}/${r.speed}`);
  }
}

const summary = {};
for (const mode of MODES) {
  summary[mode] = {};
  for (const direction of [-1, 1]) summary[mode][direction] = frontier(ramRows.filter((r) => r.mode === mode && r.direction === direction));
}
console.log(`E3.2l summary maxR passive -/+=${summary.passive[-1].maxRecover}/${summary.passive[1].maxRecover} manual=${summary.manual[-1].maxRecover}/${summary.manual[1].maxRecover} motor=${summary.motor[-1].maxRecover}/${summary.motor[1].maxRecover}.`);
console.log('E3.2l PASS: manual-body-impulse and solver-native revolute-motor actuator representations were compared under matched mass, stroke, ankle authority, residual command, torque budget and nominal drive speed. No actuator representation is promoted by this script; interpret conservation, work and mirrored recoverability together.');
