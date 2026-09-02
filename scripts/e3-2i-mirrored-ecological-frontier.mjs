import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const DEG = Math.PI / 180;
const RANGE_DEG = 60;
const HIP_TORQUE = 160;
const RAM_MASS = 35;
const SPEEDS = [3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0];
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];

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

function makeRig({ active }) {
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
  jd.lowerAngle = -RANGE_DEG * DEG;
  jd.upperAngle = RANGE_DEG * DEG;
  const joint = b3.b3CreateRevoluteJoint(world, jd);

  return {
    active, world, organism, internal, joint,
    internalW: [0, 0, 0], ramV: [0, 0, 0],
    hipImpulseAbs: 0, stops: 0, maxHipAngleDeg: 0,
  };
}

function readHip(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const relW = rig.internalW[0] - rig.organism.torsoAngularVelocity[0];
  rig.maxHipAngleDeg = Math.max(rig.maxHipAngleDeg, Math.abs(angle) / DEG);
  return { angle, relW };
}

function applyHip(rig) {
  if (!rig.active) return;
  const o = rig.organism;
  const request = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankle = clamp(request, -320, 320);
  let torque = clamp(request - ankle, -HIP_TORQUE, HIP_TORQUE);
  const { angle, relW } = readHip(rig);
  const driveSign = Math.sign(-torque);
  const atRange = (
    (driveSign > 0 && angle >= RANGE_DEG * DEG - 1e-4) ||
    (driveSign < 0 && angle <= -RANGE_DEG * DEG + 1e-4)
  );
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= 6;
  if (atRange || atDriveSpeed) {
    rig.stops += 1;
    torque = 0;
  }
  if (Math.abs(torque) > 1e-9) {
    const j = torque * dt;
    rig.hipImpulseAbs += Math.abs(j);
    b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.internal, [-j, 0, 0], true);
  }
}

function step(rig) {
  rig.organism.preStep(dt);
  applyHip(rig);
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  readHip(rig);
}

function settle(rig) {
  for (let i = 0; i < 60; i++) step(rig);
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

function trial({ active, speed, direction }) {
  const rig = makeRig({ active });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  const ram = createRam(rig, speed, direction);
  let stable = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let maxRamDv = 0;
  let firstCoupling = -1;
  for (let frame = 0; frame < 480; frame++) {
    step(rig);
    const t = rig.organism.telemetry();
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    b3.b3Body_GetLinearVelocity(rig.ramV, ram);
    const ramDv = Math.abs(rig.ramV[2] - direction * speed);
    maxRamDv = Math.max(maxRamDv, ramDv);
    if (firstCoupling < 0 && ramDv > 0.25) firstCoupling = frame;
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = frame - 28;
  }
  const t = rig.organism.telemetry();
  const outcome = t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  const out = {
    active, speed, direction, outcome,
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel, maxRamDv, firstCoupling,
    maxHipAngleDeg: rig.maxHipAngleDeg,
    hipImpulseAbs: rig.hipImpulseAbs,
    stops: rig.stops,
  };
  b3.b3DestroyWorld(rig.world);
  return out;
}

function frontier(rows) {
  const recovered = rows.filter((r) => r.outcome === 'RECOVER');
  const fallen = rows.filter((r) => r.outcome === 'FALL');
  return {
    maxRecover: recovered.length ? Math.max(...recovered.map((r) => r.speed)) : null,
    minFall: fallen.length ? Math.min(...fallen.map((r) => r.speed)) : null,
    maxRecoveredFoot: recovered.length ? Math.max(...recovered.map((r) => r.maxFootTravel)) : 0,
  };
}

function compact(rows) {
  return rows.map((r) => `${r.speed.toFixed(2)}:${r.outcome[0]}(${r.peakTiltDeg.toFixed(0)}°,foot=${r.maxFootTravel.toFixed(3)},J=${r.hipImpulseAbs.toFixed(0)})`).join(' ');
}

const rows = [];
for (const active of [false, true]) {
  for (const direction of [-1, 1]) {
    for (const speed of SPEEDS) rows.push(trial({ active, speed, direction }));
  }
}

console.log(`E3.2i mirrored ecological frontier: ${RAM_MASS}kg ram, range=${RANGE_DEG}deg hip=${HIP_TORQUE}Nm`);
const frontiers = new Map();
for (const active of [false, true]) {
  for (const direction of [-1, 1]) {
    const subset = rows.filter((r) => r.active === active && r.direction === direction);
    const f = frontier(subset);
    const key = `${active ? 'active' : 'passive'}:${direction}`;
    frontiers.set(key, f);
    console.log(`  ${active ? 'active ' : 'passive'} dir=${direction > 0 ? '+' : '-'}: ${compact(subset)} => maxR=${f.maxRecover ?? 'none'} minF=${f.minFall ?? 'open'} maxRecoveredFoot=${f.maxRecoveredFoot.toFixed(3)}m`);
    for (const r of subset) {
      if (r.firstCoupling < 0 || r.maxRamDv <= 0.25) {
        throw new Error(`E3.2i ram failed to couple: ${key} ${r.speed}m/s first=${r.firstCoupling} dv=${r.maxRamDv}`);
      }
    }
    if (f.maxRecover != null && f.minFall != null && f.maxRecover >= f.minFall) {
      throw new Error(`E3.2i non-monotonic frontier ${key}: ${f.maxRecover}/${f.minFall}`);
    }
    if (f.maxRecoveredFoot > 0.15) {
      throw new Error(`E3.2i recovered frontier ${key} recruited material support relocation: ${f.maxRecoveredFoot}m`);
    }
  }
}

const pMinus = frontiers.get('passive:-1');
const pPlus = frontiers.get('passive:1');
const aMinus = frontiers.get('active:-1');
const aPlus = frontiers.get('active:1');
const improvementMinus = pMinus.maxRecover != null && aMinus.maxRecover != null ? aMinus.maxRecover - pMinus.maxRecover : null;
const improvementPlus = pPlus.maxRecover != null && aPlus.maxRecover != null ? aPlus.maxRecover - pPlus.maxRecover : null;
const activeDirectionalGap = aMinus.maxRecover != null && aPlus.maxRecover != null ? Math.abs(aMinus.maxRecover - aPlus.maxRecover) : null;
const passiveDirectionalGap = pMinus.maxRecover != null && pPlus.maxRecover != null ? Math.abs(pMinus.maxRecover - pPlus.maxRecover) : null;

console.log(
  `E3.2i summary: passive maxR -/+=${pMinus.maxRecover ?? 'none'}/${pPlus.maxRecover ?? 'none'} ` +
  `active maxR -/+=${aMinus.maxRecover ?? 'none'}/${aPlus.maxRecover ?? 'none'} ` +
  `improvement -/+=${improvementMinus ?? 'n/a'}/${improvementPlus ?? 'n/a'}m/s ` +
  `directionalGap passive=${passiveDirectionalGap ?? 'n/a'} active=${activeDirectionalGap ?? 'n/a'}m/s.`,
);
console.log(
  'E3.2i PASS: both directional ecological frontiers were mapped under identical mechanics. Active improvement in either/both directions and directional gap are observations, not preselected success conditions.',
);
