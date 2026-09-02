import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const DEG = Math.PI / 180;
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
  b3.b3CreateBoxShape(ground, sd, 4, 0.10, 4);
  return world;
}

function makeRig({ rangeDeg, hipTorque }) {
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
  jd.lowerAngle = -rangeDeg * DEG;
  jd.upperAngle = rangeDeg * DEG;
  const joint = b3.b3CreateRevoluteJoint(world, jd);
  return {
    world, organism, internal, joint, rangeDeg, hipTorque,
    internalW: [0, 0, 0], maxAngleDeg: 0, maxRelW: 0,
    hipImpulseAbs: 0, maxTorque: 0, stops: 0,
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

function hipStep(rig) {
  if (rig.hipTorque <= 0) return;
  const o = rig.organism;
  const request = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankle = clamp(request, -320, 320);
  let torque = clamp(request - ankle, -rig.hipTorque, rig.hipTorque);
  const { angle, relW } = readHip(rig);
  const driveSign = Math.sign(-torque);
  const atRange = (driveSign > 0 && angle >= rig.rangeDeg * DEG - 1e-4) || (driveSign < 0 && angle <= -rig.rangeDeg * DEG + 1e-4);
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= 6;
  if (atRange || atDriveSpeed) {
    rig.stops += 1;
    torque = 0;
  }
  rig.maxTorque = Math.max(rig.maxTorque, Math.abs(torque));
  if (Math.abs(torque) > 1e-9) {
    const j = torque * dt;
    rig.hipImpulseAbs += Math.abs(j);
    b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.internal, [-j, 0, 0], true);
  }
}

function step(rig) {
  rig.organism.preStep(dt);
  hipStep(rig);
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  readHip(rig);
}

function trial({ rangeDeg, hipTorque, impulseNs = 80 }) {
  const rig = makeRig({ rangeDeg, hipTorque });
  for (let i = 0; i < 60; i++) step(rig);
  const startFootZ = rig.organism.footCom[2];
  rig.organism.applyPush({ impulseNs, direction: 1, leverArm: 0.36 });
  let stable = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  for (let i = 0; i < 420; i++) {
    step(rig);
    const t = rig.organism.telemetry();
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }
  const t = rig.organism.telemetry();
  const out = {
    rangeDeg, hipTorque, impulseNs,
    outcome: t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel,
    maxAngleDeg: rig.maxAngleDeg,
    maxRelW: rig.maxRelW,
    hipImpulseAbs: rig.hipImpulseAbs,
    maxTorque: rig.maxTorque,
    stops: rig.stops,
  };
  b3.b3DestroyWorld(rig.world);
  return out;
}

console.log('E3.2c active-vs-passive matched-range 80Ns controls:');
const rows = [];
for (const rangeDeg of [45, 50, 55, 60, 90]) {
  const passive = trial({ rangeDeg, hipTorque: 0 });
  const active = trial({ rangeDeg, hipTorque: 160 });
  rows.push({ rangeDeg, passive, active });
  console.log(`  ${rangeDeg}deg passive=${passive.outcome}(peak=${passive.peakTiltDeg.toFixed(1)}°,foot=${passive.maxFootTravel.toFixed(3)}m,hip=${passive.maxAngleDeg.toFixed(1)}°) active=${active.outcome}(peak=${active.peakTiltDeg.toFixed(1)}°,foot=${active.maxFootTravel.toFixed(3)}m,hip=${active.maxAngleDeg.toFixed(1)}°,J=${active.hipImpulseAbs.toFixed(1)}Nms)`);
}

const active50 = rows.find((r) => r.rangeDeg === 50)?.active;
if (active50?.outcome !== 'RECOVER') throw new Error(`E3.2c failed to reproduce active 50deg survivor: ${active50?.outcome}`);
const changedByActuation = rows.filter((r) => r.passive.outcome !== r.active.outcome);
console.log(`E3.2c PASS: active50=${active50.outcome}; outcomeChanges=${changedByActuation.map((r) => `${r.rangeDeg}:${r.passive.outcome}->${r.active.outcome}`).join(',') || 'none'}. Whether active strategy owns the capacity crossover is evidence from this matched-representation control, not a preselected PASS condition.`);
