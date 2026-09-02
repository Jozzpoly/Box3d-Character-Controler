import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const DEG = Math.PI / 180;
const RANGE_DEG = 60;
const HIP_TORQUE = 160;
const RAM_SPEED = 4.0;
const RAM_MASS = 35;
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

function inspectSupport(rig) {
  b3.getBodyContactData(rig.contactsBuffer, rig.organism.foot);
  const count = b3.getNumContacts(rig.contactsBuffer);
  let supportPoints = 0;
  let loadedPoints = 0;
  let normalImpulse = 0;
  let totalNormalImpulse = 0;
  let minSeparation = Infinity;
  for (let i = 0; i < count; i++) {
    b3.getContactAt(rig.contact, rig.contactsBuffer, i);
    for (let m = 0; m < rig.contact.manifoldCount; m++) {
      b3.getManifoldAt(rig.manifold, rig.contact, m);
      if (Math.abs(rig.manifold.normal[1]) < 0.5) continue;
      for (let p = 0; p < rig.manifold.pointCount; p++) {
        const point = rig.manifold.points[p];
        supportPoints += 1;
        normalImpulse += point.normalImpulse;
        totalNormalImpulse += point.totalNormalImpulse;
        minSeparation = Math.min(minSeparation, point.separation);
        if (point.normalImpulse > 1e-5 || point.totalNormalImpulse > 1e-5) loadedPoints += 1;
      }
    }
  }
  return {
    supportPoints,
    loadedPoints,
    normalImpulse,
    totalNormalImpulse,
    minSeparation: Number.isFinite(minSeparation) ? minSeparation : null,
  };
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
    active,
    world,
    organism,
    internal,
    joint,
    internalW: [0, 0, 0],
    torsoV: [0, 0, 0],
    footV: [0, 0, 0],
    ramV: [0, 0, 0],
    ramP: [0, 0, 0],
    contactsBuffer: b3.createContactsBuffer(),
    contact: b3.createContact(),
    manifold: b3.createManifold(),
    lastHipTorque: 0,
    hipImpulseAbs: 0,
    stops: 0,
  };
}

function readHip(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  return {
    angle: b3.b3RevoluteJoint_GetAngle(rig.joint),
    relW: rig.internalW[0] - rig.organism.torsoAngularVelocity[0],
  };
}

function applyHip(rig) {
  rig.lastHipTorque = 0;
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
  rig.lastHipTorque = torque;
  if (Math.abs(torque) > 1e-9) {
    const j = torque * dt;
    rig.hipImpulseAbs += Math.abs(j);
    b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(rig.internal, [-j, 0, 0], true);
  }
}

function step(rig) {
  rig.organism.preStep(dt);
  const ankleTorque = rig.organism.lastBalanceTorque;
  applyHip(rig);
  const hipTorque = rig.lastHipTorque;
  b3.b3World_Step(rig.world, dt, substeps);
  rig.organism.postStep();
  return { ankleTorque, hipTorque };
}

function settle(rig) {
  for (let i = 0; i < 60; i++) step(rig);
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
  bd.linearDamping = 0;
  bd.angularDamping = 0.02;
  bd.enableSleep = false;
  const body = b3.b3CreateBody(rig.world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = density(RAM_MASS, half);
  sd.baseMaterial.friction = 0.45;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
  b3.b3Body_SetLinearVelocity(body, [0, 0, direction * RAM_SPEED]);
  return body;
}

function snapshot(rig, ram, direction, frame, torques, startFootZ) {
  b3.b3Body_GetLinearVelocity(rig.ramV, ram);
  b3.b3Body_GetPosition(rig.ramP, ram);
  b3.b3Body_GetLinearVelocity(rig.torsoV, rig.organism.torso);
  b3.b3Body_GetLinearVelocity(rig.footV, rig.organism.foot);
  const hip = readHip(rig);
  const support = inspectSupport(rig);
  return {
    frame,
    ramVz: direction * rig.ramV[2],
    ramRelZ: direction * (rig.ramP[2] - rig.organism.torsoCom[2]),
    torsoVz: direction * rig.torsoV[2],
    torsoWx: direction * rig.organism.torsoAngularVelocity[0],
    torsoTilt: direction * rig.organism.torsoTilt,
    footVz: direction * rig.footV[2],
    footWx: direction * rig.organism.footAngularVelocity[0],
    footTilt: direction * rig.organism.footTilt,
    footDz: direction * (rig.organism.footCom[2] - startFootZ),
    hipAngle: direction * hip.angle,
    hipRelW: direction * hip.relW,
    ankleTorque: direction * torques.ankleTorque,
    hipTorque: direction * torques.hipTorque,
    ...support,
  };
}

function run({ active, direction }) {
  const rig = makeRig({ active });
  settle(rig);
  const startFootZ = rig.organism.footCom[2];
  const ram = createRam(rig, direction);
  const initialRamP = [0, 0, 0];
  b3.b3Body_GetPosition(initialRamP, ram);
  const initialNormalizedGap = direction * (initialRamP[2] - rig.organism.torsoCom[2]);

  const samples = [];
  let firstCoupling = -1;
  let stable = 0;
  let recoveredFrame = -1;
  for (let frame = 0; frame < 480; frame++) {
    const torques = step(rig);
    const s = snapshot(rig, ram, direction, frame, torques, startFootZ);
    samples.push(s);
    if (firstCoupling < 0 && Math.abs(s.ramVz - RAM_SPEED) > 0.25) firstCoupling = frame;
    const t = rig.organism.telemetry();
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = frame - 28;
  }
  const t = rig.organism.telemetry();
  const outcome = t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';

  if (firstCoupling < 0) throw new Error(`E3.2h ${active ? 'active' : 'passive'} ${direction} ram never coupled.`);
  const pickOffsets = [-2, -1, 0, 1, 2, 4, 8, 12, 20];
  const picked = pickOffsets.map((offset) => {
    const idx = Math.max(0, Math.min(samples.length - 1, firstCoupling + offset));
    return { offset, ...samples[idx] };
  });
  const result = {
    active,
    direction,
    outcome,
    firstCoupling,
    initialNormalizedGap,
    picked,
    hipImpulseAbs: rig.hipImpulseAbs,
    stops: rig.stops,
  };

  b3.destroyContactsBuffer(rig.contactsBuffer);
  b3.b3DestroyWorld(rig.world);
  return result;
}

function fmt(s) {
  return `k=${String(s.offset).padStart(3)} ram=${s.ramVz.toFixed(3)} relZ=${s.ramRelZ.toFixed(3)} ` +
    `torso[v=${s.torsoVz.toFixed(3)} w=${s.torsoWx.toFixed(3)} th=${(s.torsoTilt / DEG).toFixed(2)}] ` +
    `foot[v=${s.footVz.toFixed(3)} w=${s.footWx.toFixed(3)} th=${(s.footTilt / DEG).toFixed(2)} dz=${s.footDz.toFixed(3)}] ` +
    `hip[a=${(s.hipAngle / DEG).toFixed(1)} w=${s.hipRelW.toFixed(2)} T=${s.hipTorque.toFixed(1)}] ` +
    `ankleT=${s.ankleTorque.toFixed(1)} support=${s.supportPoints}/${s.loadedPoints} ` +
    `Jn=${s.normalImpulse.toFixed(3)} Jtot=${s.totalNormalImpulse.toFixed(3)} sep=${s.minSeparation == null ? 'n/a' : (s.minSeparation * 1000).toFixed(2) + 'mm'}`;
}

function sampleAt(result, offset) {
  return result.picked.find((s) => s.offset === offset);
}

function printMirrorDelta(label, minus, plus, offset) {
  const a = sampleAt(minus, offset);
  const b = sampleAt(plus, offset);
  console.log(
    `  ${label} k=${offset}: dRam=${Math.abs(a.ramVz - b.ramVz).toFixed(4)} ` +
    `dTorsoV=${Math.abs(a.torsoVz - b.torsoVz).toFixed(4)} dTorsoW=${Math.abs(a.torsoWx - b.torsoWx).toFixed(4)} ` +
    `dTilt=${Math.abs((a.torsoTilt - b.torsoTilt) / DEG).toFixed(3)}deg ` +
    `dFootV=${Math.abs(a.footVz - b.footVz).toFixed(4)} dFootW=${Math.abs(a.footWx - b.footWx).toFixed(4)} ` +
    `dJn=${Math.abs(a.normalImpulse - b.normalImpulse).toFixed(4)} ` +
    `dAnkleT=${Math.abs(a.ankleTorque - b.ankleTorque).toFixed(2)} dHipT=${Math.abs(a.hipTorque - b.hipTorque).toFixed(2)}`,
  );
}

const results = [];
for (const active of [false, true]) {
  for (const direction of [-1, 1]) results.push(run({ active, direction }));
}

console.log(`E3.2h real-contact mirror decomposition: ${RAM_MASS}kg @ ${RAM_SPEED.toFixed(1)}m/s, range=${RANGE_DEG}deg hip=${HIP_TORQUE}Nm`);
for (const r of results) {
  console.log(`\n${r.active ? 'ACTIVE' : 'PASSIVE'} dir=${r.direction > 0 ? '+' : '-'} outcome=${r.outcome} firstCoupling=${r.firstCoupling} setupGap=${r.initialNormalizedGap.toFixed(5)}m Jhip=${r.hipImpulseAbs.toFixed(2)}Nms stops=${r.stops}`);
  for (const s of r.picked) console.log(`  ${fmt(s)}`);
}

const passiveMinus = results.find((r) => !r.active && r.direction === -1);
const passivePlus = results.find((r) => !r.active && r.direction === 1);
const activeMinus = results.find((r) => r.active && r.direction === -1);
const activePlus = results.find((r) => r.active && r.direction === 1);

console.log('\nE3.2h signed-normalized mirror deltas:');
for (const k of [0, 1, 2, 4, 8, 12, 20]) {
  printMirrorDelta('passive', passiveMinus, passivePlus, k);
  printMirrorDelta('active ', activeMinus, activePlus, k);
}

const setupGapError = Math.max(
  Math.abs(passiveMinus.initialNormalizedGap - passivePlus.initialNormalizedGap),
  Math.abs(activeMinus.initialNormalizedGap - activePlus.initialNormalizedGap),
);
if (setupGapError > 1e-6) throw new Error(`E3.2h mirrored ram setup is not geometrically matched: gap error=${setupGapError}`);

console.log(
  `E3.2h PASS: mirror decomposition captured without changing mechanics; passive=${passiveMinus.outcome}/${passivePlus.outcome} ` +
  `active=${activeMinus.outcome}/${activePlus.outcome} couplingFrames passive=${passiveMinus.firstCoupling}/${passivePlus.firstCoupling} ` +
  `active=${activeMinus.firstCoupling}/${activePlus.firstCoupling}. Outcome symmetry is deliberately not a PASS condition here; locate the first material signed-normalized divergence from the trace.`,
);
