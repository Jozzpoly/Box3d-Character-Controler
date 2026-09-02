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
const RAM_SPEED = 4;
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
  let points = 0;
  let loaded = 0;
  let normalImpulse = 0;
  let totalNormalImpulse = 0;
  for (let i = 0; i < count; i++) {
    b3.getContactAt(rig.contact, rig.contactsBuffer, i);
    for (let m = 0; m < rig.contact.manifoldCount; m++) {
      b3.getManifoldAt(rig.manifold, rig.contact, m);
      if (Math.abs(rig.manifold.normal[1]) < 0.5) continue;
      for (let p = 0; p < rig.manifold.pointCount; p++) {
        const point = rig.manifold.points[p];
        points += 1;
        normalImpulse += point.normalImpulse;
        totalNormalImpulse += point.totalNormalImpulse;
        if (point.normalImpulse > 1e-5 || point.totalNormalImpulse > 1e-5) loaded += 1;
      }
    }
  }
  return { points, loaded, normalImpulse, totalNormalImpulse };
}

function makeRig() {
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
    world, organism, internal, joint,
    internalW: [0, 0, 0], ramV: [0, 0, 0], footV: [0, 0, 0],
    contactsBuffer: b3.createContactsBuffer(),
    contact: b3.createContact(), manifold: b3.createManifold(),
  };
}

function readHip(rig) {
  b3.b3Body_GetAngularVelocity(rig.internalW, rig.internal);
  return {
    angle: b3.b3RevoluteJoint_GetAngle(rig.joint),
    relW: rig.internalW[0] - rig.organism.torsoAngularVelocity[0],
  };
}

function hipDecision(rig) {
  const o = rig.organism;
  const request = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankle = clamp(request, -320, 320);
  const residual = request - ankle;
  const proposed = clamp(residual, -HIP_TORQUE, HIP_TORQUE);
  const { angle, relW } = readHip(rig);
  const driveSign = Math.sign(-proposed);
  const atRange = driveSign !== 0 && (
    (driveSign > 0 && angle >= RANGE - 1e-4) ||
    (driveSign < 0 && angle <= -RANGE + 1e-4)
  );
  const atDriveSpeed = driveSign !== 0 && Math.sign(relW) === driveSign && Math.abs(relW) >= DRIVE_SPEED;
  const torque = (atRange || atDriveSpeed) ? 0 : proposed;
  return { request, ankle, residual, proposed, torque, angle, relW, atRange, atDriveSpeed };
}

function applyHip(rig, decision) {
  if (Math.abs(decision.torque) <= 1e-9) return 0;
  const impulse = decision.torque * dt;
  b3.b3Body_ApplyAngularImpulse(rig.organism.torso, [impulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(rig.internal, [-impulse, 0, 0], true);
  return impulse;
}

function settle(rig) {
  for (let i = 0; i < 60; i++) {
    rig.organism.preStep(dt);
    const decision = hipDecision(rig);
    applyHip(rig, decision);
    b3.b3World_Step(rig.world, dt, substeps);
    rig.organism.postStep();
  }
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

function run(direction) {
  const rig = makeRig();
  settle(rig);
  const ram = createRam(rig, direction);
  const frames = [];
  let firstCoupling = -1;
  let firstRangeCutoff = -1;
  let firstSpeedCutoff = -1;
  let firstTorqueReversal = -1;
  let previousAppliedSign = 0;
  let signChanges = 0;
  let signedImpulse = 0;
  let absImpulse = 0;
  let positiveImpulse = 0;
  let negativeImpulse = 0;
  let rangeCutoffFrames = 0;
  let speedCutoffFrames = 0;
  let appliedFrames = 0;
  let stable = 0;
  let recoveredFrame = -1;

  for (let frame = 0; frame < 480; frame++) {
    rig.organism.preStep(dt);
    const ankleTorque = rig.organism.lastBalanceTorque;
    const decision = hipDecision(rig);
    const impulse = applyHip(rig, decision);

    if (decision.atRange) {
      rangeCutoffFrames += 1;
      if (firstRangeCutoff < 0) firstRangeCutoff = frame;
    }
    if (decision.atDriveSpeed) {
      speedCutoffFrames += 1;
      if (firstSpeedCutoff < 0) firstSpeedCutoff = frame;
    }
    if (Math.abs(decision.torque) > 1e-9) {
      appliedFrames += 1;
      const sign = Math.sign(decision.torque);
      if (previousAppliedSign !== 0 && sign !== previousAppliedSign) {
        signChanges += 1;
        if (firstTorqueReversal < 0) firstTorqueReversal = frame;
      }
      previousAppliedSign = sign;
      signedImpulse += impulse;
      absImpulse += Math.abs(impulse);
      if (impulse > 0) positiveImpulse += impulse;
      else negativeImpulse += -impulse;
    }

    b3.b3World_Step(rig.world, dt, substeps);
    rig.organism.postStep();

    b3.b3Body_GetLinearVelocity(rig.ramV, ram);
    b3.b3Body_GetLinearVelocity(rig.footV, rig.organism.foot);
    const ramDv = Math.abs(rig.ramV[2] - direction * RAM_SPEED);
    if (firstCoupling < 0 && ramDv > 0.25) firstCoupling = frame;
    const support = inspectSupport(rig);
    const postHip = readHip(rig);
    const t = rig.organism.telemetry();
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = frame - 28;

    frames.push({
      frame,
      ramVz: direction * rig.ramV[2],
      tiltDeg: direction * t.torsoTilt / DEG,
      torsoW: direction * t.torsoAngularSpeed,
      footVz: direction * rig.footV[2],
      footW: direction * t.footAngularSpeed,
      footTiltDeg: direction * t.footTilt / DEG,
      request: direction * decision.request,
      ankle: direction * ankleTorque,
      residual: direction * decision.residual,
      proposed: direction * decision.proposed,
      applied: direction * decision.torque,
      hipAngleDeg: direction * postHip.angle / DEG,
      hipRelW: direction * postHip.relW,
      atRange: decision.atRange,
      atDriveSpeed: decision.atDriveSpeed,
      signedImpulse: direction * signedImpulse,
      absImpulse,
      loaded: support.loaded,
      supportPoints: support.points,
      supportJn: support.normalImpulse,
    });
  }

  const t = rig.organism.telemetry();
  const outcome = t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  const summary = {
    direction, outcome, firstCoupling, firstRangeCutoff, firstSpeedCutoff, firstTorqueReversal,
    signChanges, signedImpulse: direction * signedImpulse, absImpulse,
    positiveImpulse, negativeImpulse, rangeCutoffFrames, speedCutoffFrames, appliedFrames,
    recoveredFrame,
  };

  b3.destroyContactsBuffer(rig.contactsBuffer);
  b3.b3DestroyWorld(rig.world);
  return { summary, frames };
}

function importantFrames(run) {
  const s = run.summary;
  const indices = new Set([0, s.firstCoupling, s.firstCoupling + 1, s.firstCoupling + 2, s.firstCoupling + 4, s.firstCoupling + 8, s.firstCoupling + 12, s.firstCoupling + 20, s.firstSpeedCutoff, s.firstRangeCutoff, s.firstTorqueReversal, s.recoveredFrame]);
  const reversals = [];
  let previous = 0;
  for (const f of run.frames) {
    const sign = Math.sign(f.applied);
    if (sign !== 0 && previous !== 0 && sign !== previous) reversals.push(f.frame);
    if (sign !== 0) previous = sign;
  }
  for (const f of reversals.slice(0, 6)) indices.add(f);
  return [...indices]
    .filter((i) => Number.isInteger(i) && i >= 0 && i < run.frames.length)
    .sort((a, b) => a - b)
    .map((i) => run.frames[i]);
}

function fmt(f) {
  const cutoff = `${f.atRange ? 'R' : '-'}${f.atDriveSpeed ? 'S' : '-'}`;
  return `f=${String(f.frame).padStart(3)} ram=${f.ramVz.toFixed(2)} tilt=${f.tiltDeg.toFixed(1)} w=${f.torsoW.toFixed(2)} ` +
    `foot[v=${f.footVz.toFixed(2)} w=${f.footW.toFixed(2)} th=${f.footTiltDeg.toFixed(1)}] ` +
    `T req=${f.request.toFixed(0)} ankle=${f.ankle.toFixed(0)} residual=${f.residual.toFixed(0)} prop=${f.proposed.toFixed(0)} apply=${f.applied.toFixed(0)} cut=${cutoff} ` +
    `hip=${f.hipAngleDeg.toFixed(1)}deg/${f.hipRelW.toFixed(2)}radps Jsigned=${f.signedImpulse.toFixed(1)} Jabs=${f.absImpulse.toFixed(1)} ` +
    `support=${f.supportPoints}/${f.loaded} Jn=${f.supportJn.toFixed(2)}`;
}

const minus = run(-1);
const plus = run(1);

console.log(`E3.2j internal-resource phase trace: ${RAM_MASS}kg @ ±${RAM_SPEED}m/s, range=${RANGE_DEG}deg hip=${HIP_TORQUE}Nm driveCutoff=${DRIVE_SPEED}rad/s`);
for (const r of [minus, plus]) {
  const s = r.summary;
  console.log(`\nDIR ${s.direction > 0 ? '+' : '-'} outcome=${s.outcome} coupling=${s.firstCoupling} speedCut=${s.firstSpeedCutoff} rangeCut=${s.firstRangeCutoff} firstReverse=${s.firstTorqueReversal} reversals=${s.signChanges}`);
  console.log(`  actuator: appliedFrames=${s.appliedFrames} speedCutFrames=${s.speedCutoffFrames} rangeCutFrames=${s.rangeCutoffFrames} Jsigned=${s.signedImpulse.toFixed(2)} Jabs=${s.absImpulse.toFixed(2)} J+/J-=${s.positiveImpulse.toFixed(2)}/${s.negativeImpulse.toFixed(2)} recovered=${s.recoveredFrame}`);
  for (const f of importantFrames(r)) console.log(`  ${fmt(f)}`);
}

const ratio = plus.summary.absImpulse > 1e-9 ? minus.summary.absImpulse / plus.summary.absImpulse : Infinity;
const signedCancellationMinus = minus.summary.absImpulse > 1e-9 ? Math.abs(minus.summary.signedImpulse) / minus.summary.absImpulse : 0;
const signedCancellationPlus = plus.summary.absImpulse > 1e-9 ? Math.abs(plus.summary.signedImpulse) / plus.summary.absImpulse : 0;
console.log(`\nE3.2j comparison: Jabs ratio(-/+)= ${ratio.toFixed(2)}; |Jsigned|/Jabs -/+=${signedCancellationMinus.toFixed(3)}/${signedCancellationPlus.toFixed(3)}; torque reversals -/+=${minus.summary.signChanges}/${plus.summary.signChanges}; rangeCutFrames -/+=${minus.summary.rangeCutoffFrames}/${plus.summary.rangeCutoffFrames}; speedCutFrames -/+=${minus.summary.speedCutoffFrames}/${plus.summary.speedCutoffFrames}.`);

if (minus.summary.firstCoupling !== plus.summary.firstCoupling) {
  throw new Error(`E3.2j mirrored coupling frame changed: ${minus.summary.firstCoupling}/${plus.summary.firstCoupling}`);
}
if (minus.summary.outcome !== 'FALL' || plus.summary.outcome !== 'RECOVER') {
  throw new Error(`E3.2j expected to reproduce current ecological asymmetry, got ${minus.summary.outcome}/${plus.summary.outcome}`);
}
console.log('E3.2j PASS: current -FALL/+RECOVER ecological asymmetry reproduced and internal resource consumption phases captured. The trace is diagnostic; it does not select a new control law.');
