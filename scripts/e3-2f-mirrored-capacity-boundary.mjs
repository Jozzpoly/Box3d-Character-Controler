import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const DEG = Math.PI / 180;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
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

function makeRig({ active, rangeDeg }) {
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
    active, rangeDeg, world, organism, internal, joint,
    w: [0, 0, 0], maxAngleDeg: 0, maxRelW: 0,
    hipImpulseAbs: 0, maxTorque: 0, stops: 0,
  };
}

function readHip(rig) {
  b3.b3Body_GetAngularVelocity(rig.w, rig.internal);
  const angle = b3.b3RevoluteJoint_GetAngle(rig.joint);
  const relW = rig.w[0] - rig.organism.torsoAngularVelocity[0];
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
  // E3.2e qualified: positive torso / negative internal torque drives reported
  // joint angle negative, so sign(-torque) is the consuming joint-angle direction.
  const driveSign = Math.sign(-torque);
  const atRange = (
    (driveSign > 0 && angle >= rig.rangeDeg * DEG - 1e-4) ||
    (driveSign < 0 && angle <= -rig.rangeDeg * DEG + 1e-4)
  );
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= 6;
  if (atRange || atDriveSpeed) {
    torque = 0;
    rig.stops += 1;
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
  applyHip(rig);
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  readHip(rig);
}

function trial({ active, rangeDeg, direction }) {
  const rig = makeRig({ active, rangeDeg });
  for (let i = 0; i < 60; i++) step(rig);
  const startFootZ = rig.organism.footCom[2];
  rig.organism.applyPush({ impulseNs: 80, direction, leverArm: 0.36 });
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
    active, rangeDeg, direction,
    outcome: t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel,
    maxAngleDeg: rig.maxAngleDeg,
    maxRelW: rig.maxRelW,
    hipImpulseAbs: rig.hipImpulseAbs,
    stops: rig.stops,
  };
  b3.b3DestroyWorld(rig.world);
  return out;
}

const ranges = [45, 50, 55, 60, 65, 75, 90];
const rows = [];
console.log('E3.2f mirrored 80Ns capacity bracket @160Nm:');
for (const rangeDeg of ranges) {
  const passiveMinus = trial({ active: false, rangeDeg, direction: -1 });
  const passivePlus = trial({ active: false, rangeDeg, direction: 1 });
  const activeMinus = trial({ active: true, rangeDeg, direction: -1 });
  const activePlus = trial({ active: true, rangeDeg, direction: 1 });
  const row = { rangeDeg, passiveMinus, passivePlus, activeMinus, activePlus };
  rows.push(row);
  console.log(`  ${rangeDeg}deg passive -/+ = ${passiveMinus.outcome}/${passivePlus.outcome} peaks=${passiveMinus.peakTiltDeg.toFixed(1)}/${passivePlus.peakTiltDeg.toFixed(1)} active -/+ = ${activeMinus.outcome}/${activePlus.outcome} peaks=${activeMinus.peakTiltDeg.toFixed(1)}/${activePlus.peakTiltDeg.toFixed(1)} foot=${activeMinus.maxFootTravel.toFixed(3)}/${activePlus.maxFootTravel.toFixed(3)}m J=${activeMinus.hipImpulseAbs.toFixed(1)}/${activePlus.hipImpulseAbs.toFixed(1)}Nms`);
}

const symmetricSurvivors = rows.filter((r) => (
  r.passiveMinus.outcome === 'FALL' &&
  r.passivePlus.outcome === 'FALL' &&
  r.activeMinus.outcome === 'RECOVER' &&
  r.activePlus.outcome === 'RECOVER'
));
if (symmetricSurvivors.length === 0) {
  throw new Error('E3.2f found no matched-range symmetric active survivor over passive FALL/FALL controls.');
}
const first = symmetricSurvivors[0];
if (Math.max(first.activeMinus.maxFootTravel, first.activePlus.maxFootTravel) > 0.05) {
  throw new Error(`E3.2f first symmetric survivor recruited material foot travel: ${first.activeMinus.maxFootTravel}/${first.activePlus.maxFootTravel}`);
}
const crossoverAsymmetry = rows.filter((r) => r.activeMinus.outcome !== r.activePlus.outcome).map((r) => r.rangeDeg);
console.log(`E3.2f PASS: firstSymmetricSurvivor=${first.rangeDeg}deg; asymmetricActiveRanges=${crossoverAsymmetry.join(',') || 'none'}. A one-sided crossover near the boundary is retained as evidence, not silently tuned away.`);
