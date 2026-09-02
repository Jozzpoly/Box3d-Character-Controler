import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const DEG = Math.PI / 180;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const RANGE_DEG = 60;
const HIP_TORQUE = 160;

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
    internalW: [0, 0, 0], maxAngleDeg: 0, maxRelW: 0,
    hipImpulseAbs: 0, maxHipTorque: 0, stops: 0,
  };
}

function readHip(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const relW = rig.internalW[0] - rig.organism.torsoAngularVelocity[0];
  rig.maxAngleDeg = Math.max(rig.maxAngleDeg, Math.abs(angle) / DEG);
  rig.maxRelW = Math.max(rig.maxRelW, Math.abs(relW));
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
  rig.maxHipTorque = Math.max(rig.maxHipTorque, Math.abs(torque));
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

function finishTrial(rig, startFootZ, frames = 420, onStep = null) {
  let stable = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  for (let i = 0; i < frames; i++) {
    step(rig);
    const t = rig.organism.telemetry();
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    onStep?.(i, t);
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }
  const t = rig.organism.telemetry();
  return {
    outcome: t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    recoveredFrame,
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel,
    maxHipAngleDeg: rig.maxAngleDeg,
    maxRelW: rig.maxRelW,
    hipImpulseAbs: rig.hipImpulseAbs,
    maxHipTorque: rig.maxHipTorque,
    stops: rig.stops,
  };
}

function direct({ active, direction }) {
  const rig = makeRig({ active });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  rig.organism.applyPush({ impulseNs: 80, direction, leverArm: 0.36 });
  const out = finishTrial(rig, startFootZ);
  b3.b3DestroyWorld(rig.world);
  return { active, direction, ...out };
}

function createRam(rig, speed, direction, mass = 35) {
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
  sd.density = density(mass, half);
  sd.baseMaterial.friction = 0.45;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
  b3.b3Body_SetLinearVelocity(body, [0, 0, direction * speed]);
  return { body, mass: b3.b3Body_GetMass(body), velocity: [0, 0, 0] };
}

function ramTrial({ active, speed, direction = 1 }) {
  const rig = makeRig({ active });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  const ram = createRam(rig, speed, direction);
  let maxRamDv = 0;
  let firstMaterialTilt = -1;
  const out = finishTrial(rig, startFootZ, 480, (i, t) => {
    b3.b3Body_GetLinearVelocity(ram.velocity, ram.body);
    maxRamDv = Math.max(maxRamDv, Math.abs(ram.velocity[2] - direction * speed));
    if (firstMaterialTilt < 0 && Math.abs(t.torsoTilt) > 0.015) firstMaterialTilt = i;
  });
  b3.b3DestroyWorld(rig.world);
  return {
    active, speed, direction,
    incomingMomentum: ram.mass * speed,
    maxRamDv, firstMaterialTilt,
    ...out,
  };
}

console.log(`E3.2d mirrored direct 80Ns @${RANGE_DEG}deg/${HIP_TORQUE}Nm:`);
const mirrorRows = [];
for (const active of [false, true]) {
  for (const direction of [-1, 1]) {
    const row = direct({ active, direction });
    mirrorRows.push(row);
    console.log(`  ${active ? 'active' : 'passive'} dir=${direction > 0 ? '+' : '-'} => ${row.outcome} peak=${row.peakTiltDeg.toFixed(2)}deg foot=${row.maxFootTravel.toFixed(3)}m hip=${row.maxHipAngleDeg.toFixed(1)}deg J=${row.hipImpulseAbs.toFixed(1)}Nms`);
  }
}
const passiveMirror = mirrorRows.filter((r) => !r.active);
const activeMirror = mirrorRows.filter((r) => r.active);
if (!passiveMirror.every((r) => r.outcome === 'FALL')) {
  throw new Error(`E3.2d passive mirror control no longer fails symmetrically: ${passiveMirror.map((r) => r.outcome).join('/')}`);
}
if (!activeMirror.every((r) => r.outcome === 'RECOVER')) {
  throw new Error(`E3.2d active mirror survivor is asymmetric: ${activeMirror.map((r) => r.outcome).join('/')}`);
}
const mirrorPeakDiff = Math.abs(activeMirror[0].peakTiltDeg - activeMirror[1].peakTiltDeg);
if (mirrorPeakDiff > 1.0) {
  throw new Error(`E3.2d active mirror peak asymmetry is material: ${mirrorPeakDiff}deg`);
}

console.log(`E3.2d matched dynamic ram @${RANGE_DEG}deg/${HIP_TORQUE}Nm:`);
const speeds = [3.0, 3.5, 4.0, 4.5, 5.0];
const ramRows = [];
for (const active of [false, true]) {
  for (const speed of speeds) {
    const row = ramTrial({ active, speed, direction: 1 });
    ramRows.push(row);
    console.log(`  ${active ? 'active' : 'passive'} ${speed.toFixed(1)}m/s => ${row.outcome} peak=${row.peakTiltDeg.toFixed(1)}deg foot=${row.maxFootTravel.toFixed(3)}m hip=${row.maxHipAngleDeg.toFixed(1)}deg J=${row.hipImpulseAbs.toFixed(1)}Nms ramDv=${row.maxRamDv.toFixed(2)}m/s`);
  }
}
for (const row of ramRows) {
  if (row.firstMaterialTilt < 0 || row.maxRamDv <= 0.25) {
    throw new Error(`E3.2d ram failed to couple materially: ${row.active ? 'active' : 'passive'} ${row.speed}m/s tiltF=${row.firstMaterialTilt} dv=${row.maxRamDv}`);
  }
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
const passiveFrontier = frontier(ramRows.filter((r) => !r.active));
const activeFrontier = frontier(ramRows.filter((r) => r.active));
if (passiveFrontier.maxRecoveredFoot > 0.15 || activeFrontier.maxRecoveredFoot > 0.15) {
  throw new Error(`E3.2d recovered ram trials recruited material support relocation: passive=${passiveFrontier.maxRecoveredFoot} active=${activeFrontier.maxRecoveredFoot}`);
}
if (passiveFrontier.maxRecover != null && passiveFrontier.minFall != null && passiveFrontier.maxRecover >= passiveFrontier.minFall) {
  throw new Error(`E3.2d passive ram frontier non-monotonic: ${passiveFrontier.maxRecover}/${passiveFrontier.minFall}`);
}
if (activeFrontier.maxRecover != null && activeFrontier.minFall != null && activeFrontier.maxRecover >= activeFrontier.minFall) {
  throw new Error(`E3.2d active ram frontier non-monotonic: ${activeFrontier.maxRecover}/${activeFrontier.minFall}`);
}

// One mirrored real-contact anchor at 4m/s checks that the contact-driven result
// is not a one-sided geometric accident. Whether 4m/s recovers is not assumed.
const ramMirrorMinus = ramTrial({ active: true, speed: 4.0, direction: -1 });
const ramMirrorPlus = ramRows.find((r) => r.active && r.speed === 4.0);
console.log(`E3.2d active 4m/s ram mirror: -=${ramMirrorMinus.outcome}(peak=${ramMirrorMinus.peakTiltDeg.toFixed(1)}deg,foot=${ramMirrorMinus.maxFootTravel.toFixed(3)}m) +=${ramMirrorPlus.outcome}(peak=${ramMirrorPlus.peakTiltDeg.toFixed(1)}deg,foot=${ramMirrorPlus.maxFootTravel.toFixed(3)}m)`);
if (ramMirrorMinus.outcome !== ramMirrorPlus.outcome) {
  throw new Error(`E3.2d 4m/s active ram outcome asymmetry: -=${ramMirrorMinus.outcome} +=${ramMirrorPlus.outcome}`);
}

console.log(`E3.2d PASS: direct mirror passive=F/F active=R/R peakDiff=${mirrorPeakDiff.toFixed(2)}deg; dynamicRam passive=${passiveFrontier.maxRecover ?? 'none'}/${passiveFrontier.minFall ?? 'open'}mps active=${activeFrontier.maxRecover ?? 'none'}/${activeFrontier.minFall ?? 'open'}mps. Any ecological frontier shift is observation, not a preselected pass condition.`);
