import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const DEG = Math.PI / 180;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const loadEpsilon = 1e-5;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function boxIxx(mass, half) {
  return mass * (half[1] ** 2 + half[2] ** 2) / 3;
}

function makeWorld({ gravity = 20, ground = true } = {}) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(wd);
  if (ground) {
    const bd = b3.b3DefaultBodyDef();
    bd.position = [0, -0.10, 0];
    const groundBody = b3.b3CreateBody(world, bd);
    const sd = b3.b3DefaultShapeDef();
    sd.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
    sd.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(groundBody, sd, 4, 0.10, 4);
  }
  return world;
}

function createInternalMass(world, organism, { maxAngle }) {
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
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(10, half);
  sd.filter.maskBits = 0n;
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);

  const jd = b3.b3DefaultRevoluteJointDef();
  jd.base.bodyIdA = organism.torso;
  jd.base.bodyIdB = body;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.enableLimit = true;
  jd.lowerAngle = -maxAngle;
  jd.upperAngle = maxAngle;
  const joint = b3.b3CreateRevoluteJoint(world, jd);
  return { body, joint, mass: b3.b3Body_GetMass(body), w: [0, 0, 0] };
}

function createSpecimen({
  gravity = 20,
  ground = true,
  ankleTorque = 320,
  hipTorque = 160,
  maxAngleDeg = 60,
  driveSpeedCutoff = 6,
} = {}) {
  const world = makeWorld({ gravity, ground });
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: ankleTorque,
    torsoMass: 60,
    footMass: 10,
    gravity,
  });
  const internal = createInternalMass(world, organism, { maxAngle: maxAngleDeg * DEG });
  const state = {
    world, organism, internal,
    hipTorque,
    maxAngle: maxAngleDeg * DEG,
    driveSpeedCutoff,
    maxAngleObserved: 0,
    maxRelativeSpeed: 0,
    maxTorqueUsed: 0,
    capacityStops: 0,
    hipAngularImpulseAbs: 0,
  };
  return state;
}

function readHip(state) {
  b3.b3Body_GetAngularVelocity(state.internal.w, state.internal.body);
  const angle = b3.b3RevoluteJoint_GetAngle(state.internal.joint);
  const relativeSpeed = state.internal.w[0] - state.organism.torsoAngularVelocity[0];
  state.maxAngleObserved = Math.max(state.maxAngleObserved, Math.abs(angle));
  state.maxRelativeSpeed = Math.max(state.maxRelativeSpeed, Math.abs(relativeSpeed));
  return { angle, relativeSpeed };
}

function applyHip(state) {
  if (state.hipTorque <= 0) return 0;
  const o = state.organism;
  const requested = -o.kp * o.torsoTilt - o.kd * o.torsoAngularVelocity[0];
  const ankleDelivered = clamp(requested, -o.maxTorque, o.maxTorque);
  let torque = clamp(requested - ankleDelivered, -state.hipTorque, state.hipTorque);
  const { angle, relativeSpeed } = readHip(state);
  const driveSign = Math.sign(-torque);
  const atRange = (
    (driveSign > 0 && angle >= state.maxAngle - 1e-4) ||
    (driveSign < 0 && angle <= -state.maxAngle + 1e-4)
  );
  const atDriveSpeed = (
    driveSign !== 0 && Math.sign(relativeSpeed) === driveSign && Math.abs(relativeSpeed) >= state.driveSpeedCutoff
  );
  if (atRange || atDriveSpeed) {
    state.capacityStops += 1;
    torque = 0;
  }
  state.maxTorqueUsed = Math.max(state.maxTorqueUsed, Math.abs(torque));
  if (Math.abs(torque) > 1e-9) {
    const j = torque * dt;
    state.hipAngularImpulseAbs += Math.abs(j);
    b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(state.internal.body, [-j, 0, 0], true);
  }
  return torque;
}

function createSupportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let points = 0;
    let touching = 0;
    let loaded = 0;
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          points += 1;
          if (point.separation <= 0) touching += 1;
          if (point.normalImpulse > loadEpsilon || point.totalNormalImpulse > loadEpsilon) loaded += 1;
        }
      }
    }
    return { manifold: points > 0, reactive: touching > 0 || loaded > 0, touching, loaded, points };
  }
  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function tick(state) {
  state.organism.preStep(dt);
  applyHip(state);
  b3.b3World_Step(state.world, dt, substeps);
  state.organism.postStep();
  readHip(state);
}

function settle(state, frames = 60) {
  for (let i = 0; i < frames; i++) tick(state);
}

function grounded80(maxAngleDeg) {
  const state = createSpecimen({ maxAngleDeg, hipTorque: 160, ankleTorque: 320 });
  const support = createSupportReader(state.organism);
  settle(state, 60);
  const startZ = state.organism.footCom[2];
  state.organism.applyPush({ impulseNs: 80, direction: 1, leverArm: 0.36 });
  let stable = 0;
  let recoveredFrame = -1;
  let supportFalseFrames = 0;
  let maxFootTravel = 0;
  let maxFootTilt = 0;
  for (let i = 0; i < 420; i++) {
    const before = support.read();
    if (!before.reactive) supportFalseFrames += 1;
    tick(state);
    const t = state.organism.telemetry();
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startZ));
    maxFootTilt = Math.max(maxFootTilt, Math.abs(t.footTilt));
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }
  const t = state.organism.telemetry();
  const outcome = t.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  const out = {
    maxAngleDeg, outcome, recoveredFrame,
    peakTiltDeg: t.peakAbsTilt / DEG,
    maxFootTravel,
    maxFootTiltDeg: maxFootTilt / DEG,
    supportFalseFrames,
    peakHipAngleDeg: state.maxAngleObserved / DEG,
    peakRelativeSpeed: state.maxRelativeSpeed,
    hipImpulseAbs: state.hipAngularImpulseAbs,
    capacityStops: state.capacityStops,
  };
  support.destroy();
  b3.b3DestroyWorld(state.world);
  return out;
}

function bodyState(body, mass, half) {
  const p = [0, 0, 0];
  const v = [0, 0, 0];
  const w = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(p, body);
  b3.b3Body_GetLinearVelocity(v, body);
  b3.b3Body_GetAngularVelocity(w, body);
  return { body, mass, half, p, v, w, ixx: boxIxx(mass, half) };
}

function totalLx(state) {
  const bodies = [
    bodyState(state.organism.foot, state.organism.footMass, E3_SAGITTAL_DEFAULTS.footHalf),
    bodyState(state.organism.torso, state.organism.torsoMass, E3_SAGITTAL_DEFAULTS.torsoHalf),
    bodyState(state.internal.body, state.internal.mass, E3_SAGITTAL_DEFAULTS.torsoHalf),
  ];
  const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
  const com = [0, 0, 0];
  for (const body of bodies) {
    com[0] += body.p[0] * body.mass / totalMass;
    com[1] += body.p[1] * body.mass / totalMass;
    com[2] += body.p[2] * body.mass / totalMass;
  }
  let lx = 0;
  for (const body of bodies) {
    const ry = body.p[1] - com[1];
    const rz = body.p[2] - com[2];
    lx += body.mass * (ry * body.v[2] - rz * body.v[1]);
    lx += body.ixx * body.w[0];
  }
  return lx;
}

function zeroG({ maxAngleDeg, hipTorque = 160, impulseNs = 48 }) {
  const state = createSpecimen({
    gravity: 0,
    ground: false,
    ankleTorque: 0,
    hipTorque,
    maxAngleDeg,
    driveSpeedCutoff: 6,
  });
  for (const body of [state.organism.foot, state.organism.torso, state.internal.body]) {
    b3.b3Body_SetLinearDamping(body, 0);
    b3.b3Body_SetAngularDamping(body, 0);
  }
  // One quiet solve to establish joint constraints, then a known external impulse.
  b3.b3World_Step(state.world, dt, substeps);
  state.organism.postStep();
  state.organism.applyPush({ impulseNs, direction: 1, leverArm: 0.36 });
  b3.b3World_Step(state.world, dt, substeps);
  state.organism.postStep();
  readHip(state);
  const initialLx = totalLx(state);
  let maxLxDrift = 0;
  let minAbsTilt = Math.abs(state.organism.torsoTilt);
  let nearUprightFrames = 0;
  for (let i = 0; i < 360; i++) {
    tick(state);
    const lx = totalLx(state);
    maxLxDrift = Math.max(maxLxDrift, Math.abs(lx - initialLx));
    const tilt = Math.abs(state.organism.torsoTilt);
    minAbsTilt = Math.min(minAbsTilt, tilt);
    if (tilt < 4 * DEG) nearUprightFrames += 1;
  }
  const finalLx = totalLx(state);
  const hip = readHip(state);
  const out = {
    maxAngleDeg, hipTorque, impulseNs,
    initialLx, finalLx, maxLxDrift,
    relativeLxDrift: maxLxDrift / Math.max(1e-8, Math.abs(initialLx)),
    minTiltDeg: minAbsTilt / DEG,
    finalTiltDeg: state.organism.torsoTilt / DEG,
    nearUprightFrames,
    peakHipAngleDeg: state.maxAngleObserved / DEG,
    finalHipAngleDeg: hip.angle / DEG,
    peakRelativeSpeed: state.maxRelativeSpeed,
    hipImpulseAbs: state.hipAngularImpulseAbs,
    capacityStops: state.capacityStops,
  };
  b3.b3DestroyWorld(state.world);
  return out;
}

console.log('E3.2b grounded 80Ns capacity bracket @160Nm:');
const ranges = [45, 50, 55, 60, 65];
const grounded = ranges.map(grounded80);
for (const r of grounded) {
  console.log(`  ${r.maxAngleDeg}deg => ${r.outcome} peak=${r.peakTiltDeg.toFixed(2)}deg foot=${r.maxFootTravel.toFixed(3)}m/${r.maxFootTiltDeg.toFixed(2)}deg supportFalse=${r.supportFalseFrames} hip=${r.peakHipAngleDeg.toFixed(2)}deg relW=${r.peakRelativeSpeed.toFixed(2)} JhipAbs=${r.hipImpulseAbs.toFixed(2)} stop=${r.capacityStops}`);
}
const firstRecover = grounded.find((r) => r.outcome === 'RECOVER');
if (!firstRecover) throw new Error('E3.2b failed to reproduce any 80Ns recovery from the E3.2a capacity survivor.');
if (grounded[0].outcome !== 'FALL') throw new Error(`E3.2b 45deg control unexpectedly changed: ${grounded[0].outcome}`);
if (firstRecover.supportFalseFrames !== 0) throw new Error(`E3.2b first recovered capacity case lost reactive support for ${firstRecover.supportFalseFrames} frames.`);
if (firstRecover.maxFootTravel > 0.05) throw new Error(`E3.2b first recovered capacity case recruited material support relocation: ${firstRecover.maxFootTravel}m`);

console.log('E3.2b zero-g angular-momentum controls:');
const zero45 = zeroG({ maxAngleDeg: 45 });
const zero60 = zeroG({ maxAngleDeg: 60 });
for (const r of [zero45, zero60]) {
  console.log(`  ${r.maxAngleDeg}deg => Lx=${r.initialLx.toFixed(5)}->${r.finalLx.toFixed(5)} maxDrift=${r.maxLxDrift.toExponential(2)} (${(100 * r.relativeLxDrift).toFixed(3)}%) minTilt=${r.minTiltDeg.toFixed(2)}deg finalTilt=${r.finalTiltDeg.toFixed(2)}deg near=${r.nearUprightFrames}f hip=${r.peakHipAngleDeg.toFixed(2)}deg JhipAbs=${r.hipImpulseAbs.toFixed(2)} stop=${r.capacityStops}`);
  if (r.relativeLxDrift > 0.01) throw new Error(`E3.2b zero-g total Lx drift too large for ${r.maxAngleDeg}deg: ${r.relativeLxDrift}`);
  if (r.peakHipAngleDeg > r.maxAngleDeg + 5) throw new Error(`E3.2b zero-g joint escaped finite range materially: ${r.peakHipAngleDeg}deg`);
}

console.log(`E3.2b PASS: first80Recover=${firstRecover.maxAngleDeg}deg with reactiveSupportContinuous=${firstRecover.supportFalseFrames === 0} footTravel=${firstRecover.maxFootTravel.toFixed(3)}m; zero-g total-Lx drift <=${(100 * Math.max(zero45.relativeLxDrift, zero60.relativeLxDrift)).toFixed(3)}%. Capacity threshold and angular-momentum redistribution are evidence; no humanoid/hip architecture or gameplay policy is promoted.`);
