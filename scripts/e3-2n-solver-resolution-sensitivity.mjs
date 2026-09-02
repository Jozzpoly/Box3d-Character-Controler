import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const SUBSTEP_COUNTS = [1, 2, 4, 8];
const CANONICAL_SUBSTEPS = 4;
const RAM_SPEEDS = [3.75, 4.0, 4.25];
const DEG = Math.PI / 180;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const RANGE_DEG = 60;
const RANGE = RANGE_DEG * DEG;
const HIP_TORQUE = 160;
const DRIVE_SPEED = 6;
const RAM_MASS = 35;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function density(mass, half) { return mass / (8 * half[0] * half[1] * half[2]); }

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(wd);
  const bd = b3.b3DefaultBodyDef();
  bd.position = [0, -0.10, 0];
  const ground = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, sd, 5, 0.10, 5);
  return world;
}

function makeRig({ active, substeps }) {
  const world = makeWorld();
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
  const joint = b3.b3CreateRevoluteJoint(world, jd);

  return {
    active, substeps, world, organism, internal, joint,
    internalW: [0, 0, 0],
    peakAngleDeg: 0,
    peakRelW: 0,
    hipImpulseAbs: 0,
    peakHipTorque: 0,
    stops: 0,
  };
}

function readHip(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const relW = rig.internalW[0] - rig.organism.torsoAngularVelocity[0];
  rig.peakAngleDeg = Math.max(rig.peakAngleDeg, Math.abs(angle) / DEG);
  rig.peakRelW = Math.max(rig.peakRelW, Math.abs(relW));
  return { angle, relW };
}

function applyHip(rig) {
  if (!rig.active) return;
  const o = rig.organism;
  const requested = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankle = clamp(requested, -320, 320);
  let torque = clamp(requested - ankle, -HIP_TORQUE, HIP_TORQUE);
  const { angle, relW } = readHip(rig);
  const driveSign = Math.sign(-torque);
  const atRange = driveSign !== 0 && (
    (driveSign > 0 && angle >= RANGE - 1e-4) ||
    (driveSign < 0 && angle <= -RANGE + 1e-4)
  );
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= DRIVE_SPEED;
  if (atRange || atDriveSpeed) {
    rig.stops += 1;
    torque = 0;
  }
  rig.peakHipTorque = Math.max(rig.peakHipTorque, Math.abs(torque));
  if (Math.abs(torque) > 1e-9) {
    const j = torque * dt;
    rig.hipImpulseAbs += Math.abs(j);
    b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.internal, [-j, 0, 0], true);
  }
}

function tick(rig) {
  rig.organism.preStep(dt);
  applyHip(rig);
  b3.b3World_Step(rig.world, dt, rig.substeps);
  rig.organism.postStep();
  readHip(rig);
}

function settle(rig) {
  for (let i = 0; i < 60; i++) tick(rig);
  rig.hipImpulseAbs = 0;
  rig.peakHipTorque = 0;
  rig.stops = 0;
}

function finish(rig, startFootZ, frames, onFrame = null) {
  let stable = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  for (let i = 0; i < frames; i++) {
    tick(rig);
    const t = rig.organism.telemetry();
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    onFrame?.(i, t);
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }
  const t = rig.organism.telemetry();
  return {
    outcome: t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    recoveredFrame,
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel,
    peakHipAngleDeg: rig.peakAngleDeg,
    peakRelW: rig.peakRelW,
    hipImpulseAbs: rig.hipImpulseAbs,
    peakHipTorque: rig.peakHipTorque,
    stops: rig.stops,
  };
}

function direct({ active, direction, substeps }) {
  const rig = makeRig({ active, substeps });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  rig.organism.applyPush({ impulseNs: 80, direction, leverArm: 0.36 });
  const out = finish(rig, startFootZ, 420);
  b3.b3DestroyWorld(rig.world);
  return { kind: 'direct', active, direction, substeps, ...out };
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
  return { body, velocity: [0, 0, 0] };
}

function ram({ active, direction, speed, substeps }) {
  const rig = makeRig({ active, substeps });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  const ramBody = createRam(rig, speed, direction);
  let firstCoupling = -1;
  let maxRamDv = 0;
  const out = finish(rig, startFootZ, 480, (i) => {
    b3.b3Body_GetLinearVelocity(ramBody.velocity, ramBody.body);
    const dv = Math.abs(ramBody.velocity[2] - direction * speed);
    maxRamDv = Math.max(maxRamDv, dv);
    if (firstCoupling < 0 && dv > 0.25) firstCoupling = i;
  });
  b3.b3DestroyWorld(rig.world);
  return {
    kind: 'ram', active, direction, speed, substeps,
    firstCoupling, maxRamDv,
    ...out,
  };
}

function outcomePair(rows, predicate) {
  return [-1, 1].map((direction) => rows.find((r) => r.direction === direction && predicate(r))?.outcome ?? 'MISSING');
}

function frontier(rows) {
  const recover = rows.filter((r) => r.outcome === 'RECOVER');
  const fall = rows.filter((r) => r.outcome === 'FALL');
  return {
    maxRecover: recover.length ? Math.max(...recover.map((r) => r.speed)) : null,
    minFall: fall.length ? Math.min(...fall.map((r) => r.speed)) : null,
  };
}

const allRows = [];
for (const substeps of SUBSTEP_COUNTS) {
  console.log(`E3.2n substeps=${substeps} — direct ±80Ns:`);
  for (const active of [false, true]) {
    const pair = [-1, 1].map((direction) => direct({ active, direction, substeps }));
    allRows.push(...pair);
    console.log(`  ${active ? 'active ' : 'passive'} -/+=${pair.map((r) => r.outcome).join('/')} peak=${pair.map((r) => r.peakTiltDeg.toFixed(1)).join('/')}deg foot=${pair.map((r) => r.maxFootTravel.toFixed(3)).join('/')}m hip=${pair.map((r) => r.peakHipAngleDeg.toFixed(1)).join('/')}deg J=${pair.map((r) => r.hipImpulseAbs.toFixed(0)).join('/')}Nms`);
  }

  console.log(`E3.2n substeps=${substeps} — mirrored 35kg ram neighborhood:`);
  for (const active of [false, true]) {
    for (const direction of [-1, 1]) {
      const rows = RAM_SPEEDS.map((speed) => ram({ active, direction, speed, substeps }));
      allRows.push(...rows);
      console.log(`  ${active ? 'active ' : 'passive'} dir=${direction > 0 ? '+' : '-'} ${rows.map((r) => `${r.speed.toFixed(2)}:${r.outcome[0]}(peak=${r.peakTiltDeg.toFixed(1)},foot=${r.maxFootTravel.toFixed(3)},J=${r.hipImpulseAbs.toFixed(0)},c=${r.firstCoupling})`).join(' ')}`);
    }
  }
}

const canonical = allRows.filter((r) => r.substeps === CANONICAL_SUBSTEPS);
const canonicalDirectPassive = outcomePair(canonical.filter((r) => r.kind === 'direct'), (r) => !r.active);
const canonicalDirectActive = outcomePair(canonical.filter((r) => r.kind === 'direct'), (r) => r.active);
if (canonicalDirectPassive.join('/') !== 'FALL/FALL') {
  throw new Error(`E3.2n canonical direct passive changed: ${canonicalDirectPassive.join('/')}`);
}
if (canonicalDirectActive.join('/') !== 'RECOVER/RECOVER') {
  throw new Error(`E3.2n canonical direct active changed: ${canonicalDirectActive.join('/')}`);
}

const canonicalExpected = new Map([
  ['passive|-|3.75', 'RECOVER'], ['passive|+|3.75', 'RECOVER'],
  ['passive|-|4', 'FALL'], ['passive|+|4', 'FALL'],
  ['passive|-|4.25', 'FALL'], ['passive|+|4.25', 'FALL'],
  ['active|-|3.75', 'RECOVER'], ['active|+|3.75', 'RECOVER'],
  ['active|-|4', 'FALL'], ['active|+|4', 'RECOVER'],
  ['active|-|4.25', 'FALL'], ['active|+|4.25', 'FALL'],
]);
for (const row of canonical.filter((r) => r.kind === 'ram')) {
  const key = `${row.active ? 'active' : 'passive'}|${row.direction > 0 ? '+' : '-'}|${row.speed}`;
  const expected = canonicalExpected.get(key);
  if (!expected) throw new Error(`E3.2n unexpected canonical ram row ${key}`);
  if (row.outcome !== expected) throw new Error(`E3.2n canonical reference changed ${key}: ${row.outcome} != ${expected}`);
}

for (const row of allRows.filter((r) => r.kind === 'ram')) {
  if (row.firstCoupling < 0 || row.maxRamDv <= 0.25) {
    throw new Error(`E3.2n uncoupled ram substeps=${row.substeps} active=${row.active} dir=${row.direction} speed=${row.speed}`);
  }
  if (row.outcome === 'RECOVER' && row.maxFootTravel > 0.15) {
    throw new Error(`E3.2n recovered via material support relocation substeps=${row.substeps} active=${row.active} dir=${row.direction} speed=${row.speed}: ${row.maxFootTravel}`);
  }
}

console.log('E3.2n solver-resolution frontier summary:');
for (const substeps of SUBSTEP_COUNTS) {
  const rows = allRows.filter((r) => r.kind === 'ram' && r.substeps === substeps);
  const summaries = [];
  for (const direction of [-1, 1]) {
    const passive = frontier(rows.filter((r) => !r.active && r.direction === direction));
    const active = frontier(rows.filter((r) => r.active && r.direction === direction));
    const benefit = passive.maxRecover == null || active.maxRecover == null ? null : active.maxRecover - passive.maxRecover;
    summaries.push({ direction, passive, active, benefit });
  }
  console.log(`  substeps=${substeps}: ${summaries.map((s) => `dir=${s.direction > 0 ? '+' : '-'} passive=${s.passive.maxRecover ?? 'none'}/${s.passive.minFall ?? 'open'} active=${s.active.maxRecover ?? 'none'}/${s.active.minFall ?? 'open'} benefit=${s.benefit == null ? 'n/a' : s.benefit.toFixed(2)}m/s`).join(' | ')}`);
}

const canonicalRam4 = canonical.filter((r) => r.kind === 'ram' && r.active && r.speed === 4.0);
console.log(`E3.2n canonical reference PASS: substeps=4 direct passive=${canonicalDirectPassive.join('/')} active=${canonicalDirectActive.join('/')} activeRam4=${canonicalRam4.sort((a, b) => a.direction - b.direction).map((r) => r.outcome).join('/')}.`);
console.log('E3.2n PASS: solver-resolution sensitivity mapped with outer dt/controller cadence, mass, geometry, friction, ankle/hip authority, stroke, drive cutoff and classifiers held fixed. Cross-resolution outcome and active-minus-passive frontier stability are evidence, not selected tuning.');
