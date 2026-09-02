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
const DWELLS = [0, 1, 2, 3, 4, 6, 8, 12];
const RAM_SPEEDS = [3.75, 4.0, 4.25];
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

function makeRig(dwellFrames) {
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
    world, organism, internal, joint, dwellFrames,
    internalW: [0, 0, 0],
    saturatedFrames: 0,
    firstHipFrame: -1,
    hipImpulseAbs: 0,
    peakAngle: 0,
    peakRelW: 0,
    rangeCuts: 0,
    speedCuts: 0,
    frame: 0,
  };
}

function readHip(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const relW = rig.internalW[0] - rig.organism.torsoAngularVelocity[0];
  rig.peakAngle = Math.max(rig.peakAngle, Math.abs(angle));
  rig.peakRelW = Math.max(rig.peakRelW, Math.abs(relW));
  return { angle, relW };
}

function applyHip(rig) {
  const o = rig.organism;
  const requested = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankle = clamp(requested, -320, 320);
  const residual = requested - ankle;
  if (Math.abs(residual) > 1e-9) rig.saturatedFrames += 1;
  else rig.saturatedFrames = 0;

  if (rig.saturatedFrames < rig.dwellFrames + 1) return 0;

  let torque = clamp(residual, -HIP_TORQUE, HIP_TORQUE);
  const { angle, relW } = readHip(rig);
  const driveSign = Math.sign(-torque);
  const atRange = driveSign !== 0 && (
    (driveSign > 0 && angle >= RANGE - 1e-4) ||
    (driveSign < 0 && angle <= -RANGE + 1e-4)
  );
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= DRIVE_SPEED;
  if (atRange) rig.rangeCuts += 1;
  if (atDriveSpeed) rig.speedCuts += 1;
  if (atRange || atDriveSpeed) torque = 0;

  if (Math.abs(torque) > 1e-9) {
    if (rig.firstHipFrame < 0) rig.firstHipFrame = rig.frame;
    const j = torque * dt;
    rig.hipImpulseAbs += Math.abs(j);
    b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.internal, [-j, 0, 0], true);
  }
  return torque;
}

function tick(rig) {
  rig.organism.preStep(dt);
  applyHip(rig);
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  readHip(rig);
  rig.frame += 1;
}

function settle(rig) {
  for (let i = 0; i < 60; i++) tick(rig);
  // Quiet standing must not consume the saturation dwell phase clock.
  rig.saturatedFrames = 0;
  rig.firstHipFrame = -1;
  rig.hipImpulseAbs = 0;
  rig.rangeCuts = 0;
  rig.speedCuts = 0;
  rig.frame = 0;
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
    firstHipFrame: rig.firstHipFrame,
    hipImpulseAbs: rig.hipImpulseAbs,
    peakAngleDeg: rig.peakAngle / DEG,
    peakRelW: rig.peakRelW,
    rangeCuts: rig.rangeCuts,
    speedCuts: rig.speedCuts,
  };
}

function direct(dwellFrames, direction) {
  const rig = makeRig(dwellFrames);
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  rig.organism.applyPush({ impulseNs: 80, direction, leverArm: 0.36 });
  const out = finish(rig, startFootZ, 420);
  b3.b3DestroyWorld(rig.world);
  return { dwellFrames, direction, ...out };
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

function ram(dwellFrames, speed, direction) {
  const rig = makeRig(dwellFrames);
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  const ramBody = createRam(rig, speed, direction);
  const rv = [0, 0, 0];
  let firstCoupling = -1;
  let maxRamDv = 0;
  const out = finish(rig, startFootZ, 480, (i) => {
    b3.b3Body_GetLinearVelocity(rv, ramBody);
    const dv = Math.abs(rv[2] - direction * speed);
    maxRamDv = Math.max(maxRamDv, dv);
    if (firstCoupling < 0 && dv > 0.25) firstCoupling = i;
  });
  b3.b3DestroyWorld(rig.world);
  return {
    dwellFrames, speed, direction,
    firstCoupling, hipDelayFromCoupling: out.firstHipFrame < 0 || firstCoupling < 0 ? null : out.firstHipFrame - firstCoupling,
    maxRamDv,
    ...out,
  };
}

console.log('E3.2m ankle-saturation dwell / strategy sequencing — mirrored direct 80Ns:');
const directRows = [];
for (const dwell of DWELLS) {
  const pair = [-1, 1].map((direction) => direct(dwell, direction));
  directRows.push(...pair);
  console.log(`  dwell=${String(dwell).padStart(2)}f => -:${pair[0].outcome}(peak=${pair[0].peakTiltDeg.toFixed(1)}°,hipF=${pair[0].firstHipFrame},J=${pair[0].hipImpulseAbs.toFixed(0)}) +:${pair[1].outcome}(peak=${pair[1].peakTiltDeg.toFixed(1)}°,hipF=${pair[1].firstHipFrame},J=${pair[1].hipImpulseAbs.toFixed(0)})`);
}

console.log('E3.2m mirrored ram neighborhood:');
const ramRows = [];
for (const dwell of DWELLS) {
  for (const direction of [-1, 1]) {
    const subset = RAM_SPEEDS.map((speed) => ram(dwell, speed, direction));
    ramRows.push(...subset);
    console.log(`  dwell=${String(dwell).padStart(2)}f dir=${direction > 0 ? '+' : '-'}: ${subset.map((r) => `${r.speed.toFixed(2)}:${r.outcome[0]}(hipΔ=${r.hipDelayFromCoupling ?? 'n/a'},J=${r.hipImpulseAbs.toFixed(0)},foot=${r.maxFootTravel.toFixed(3)})`).join(' ')}`);
  }
}

const baselineDirect = directRows.filter((r) => r.dwellFrames === 0);
if (baselineDirect.map((r) => r.outcome).join('/') !== 'RECOVER/RECOVER') {
  throw new Error(`E3.2m dwell=0 direct reference changed: ${baselineDirect.map((r) => r.outcome).join('/')}`);
}
const baselineRam4 = ramRows.filter((r) => r.dwellFrames === 0 && r.speed === 4.0);
if (baselineRam4.map((r) => r.outcome).join('/') !== 'FALL/RECOVER') {
  throw new Error(`E3.2m dwell=0 ram reference changed: ${baselineRam4.map((r) => r.outcome).join('/')}`);
}
for (const r of ramRows) {
  if (r.firstCoupling < 0 || r.maxRamDv <= 0.25) throw new Error(`E3.2m uncoupled ram dwell=${r.dwellFrames} dir=${r.direction} speed=${r.speed}`);
  if (r.outcome === 'RECOVER' && r.maxFootTravel > 0.15) throw new Error(`E3.2m recovered via material support relocation dwell=${r.dwellFrames} dir=${r.direction} speed=${r.speed}: ${r.maxFootTravel}`);
}

const symmetricDirect = DWELLS.filter((dwell) => directRows.filter((r) => r.dwellFrames === dwell).every((r) => r.outcome === 'RECOVER'));
const symmetricRam4 = DWELLS.filter((dwell) => ramRows.filter((r) => r.dwellFrames === dwell && r.speed === 4.0).every((r) => r.outcome === 'RECOVER'));
const symmetricCapability = symmetricRam4.filter((dwell) => symmetricDirect.includes(dwell));
console.log(`E3.2m summary: direct symmetric RECOVER dwells=[${symmetricDirect.join(',')}]; ram4 symmetric RECOVER dwells=[${symmetricRam4.join(',')}]; both=[${symmetricCapability.join(',')}].`);
console.log('E3.2m PASS: fixed dwell bracket maps whether sequencing ankle authority before internal angular-momentum authority changes mirrored recoverability. Any survivor interval is evidence, not a selected gameplay delay or promoted policy.');
