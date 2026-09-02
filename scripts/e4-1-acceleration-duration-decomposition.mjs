import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const FINITE_TORQUE = 320;
const ACCELS = [8, 16, DONOR_PROFILE_V1.groundAcceleration];
const DELTA_V_TARGETS = [0.5, 1.0, 2.0, 3.0, DONOR_PROFILE_V1.maxSpeed];
const DIRECTIONS = [-1, 1];
const LOAD_EPSILON = 1e-5;
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 150;
const RECOVER_STREAK = 30;
const HALF = [2.0, 0.25, 30.0];
const Y = -HALF[1];
const Q = [0, 0, 0, 1];

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -DONOR_PROFILE_V1.gravity, 0];
  return b3.b3CreateWorld(wd);
}

function makePlatform(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, Y, 0];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0.95;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...HALF);
  return body;
}

function supportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          if (
            Math.abs(point.normalImpulse ?? 0) > LOAD_EPSILON ||
            Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPSILON
          ) loaded += 1;
        }
      }
    }
    return { reactive: touching > 0 || loaded > 0, touching, loaded };
  }
  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function runCase({ acceleration, targetSpeed, direction }) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, { mode: 'finite', maxTorque: FINITE_TORQUE });
  const reader = supportReader(organism);
  let signal = reader.read();
  let z = 0;
  let speed = 0;
  let pulseFrames = 0;
  let supportLossFrames = 0;
  let firstLoss = -1;
  let maxTorque = 0;
  let recovered = false;
  let stable = 0;
  let frame = 0;

  function step(move) {
    if (move) {
      const target = direction * targetSpeed;
      if (Math.abs(speed - target) > 1e-9) pulseFrames += 1;
      speed = moveToward(speed, target, acceleration * DT);
      z += speed * DT;
      b3.b3Body_SetTargetTransform(platform, { position: [0, Y, z], quaternion: Q }, DT, true);
    }
    organism.maxTorque = signal.reactive ? FINITE_TORQUE : 0;
    organism.preStep(DT);
    maxTorque = Math.max(maxTorque, Math.abs(organism.lastBalanceTorque));
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    signal = reader.read();
    if (!signal.reactive) {
      supportLossFrames += 1;
      if (firstLoss < 0) firstLoss = frame;
    }
    if (organism.isRecovered() && signal.reactive) stable += 1;
    else stable = 0;
    if (stable >= RECOVER_STREAK) recovered = true;
    frame += 1;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step(false);
  if (!signal.reactive) throw new Error('E4.1 failed to establish support');
  supportLossFrames = 0;
  firstLoss = -1;
  recovered = false;
  stable = 0;
  maxTorque = 0;

  const maxRamp = Math.ceil(targetSpeed / acceleration / DT) + 3;
  for (let i = 0; i < maxRamp && Math.abs(Math.abs(speed) - targetSpeed) > 1e-9; i++) step(true);
  if (Math.abs(Math.abs(speed) - targetSpeed) > 1e-9) {
    throw new Error(`E4.1 failed to reach target ${targetSpeed} at a=${acceleration}`);
  }
  for (let i = 0; i < HOLD_FRAMES; i++) step(true);

  const t = organism.telemetry();
  const out = {
    acceleration,
    targetSpeed,
    direction,
    pulseFrames,
    pulseSeconds: pulseFrames * DT,
    outcome: t.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakAbsTilt * 180 / Math.PI,
    supportLossFrames,
    firstLoss,
    maxTorque,
  };
  reader.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || DONOR_PROFILE_V1.groundAcceleration !== 31 || DONOR_PROFILE_V1.maxSpeed !== 5.2) {
  throw new Error('E4.1 Donor v1 envelope changed; requalify experiment');
}

const results = [];
for (const acceleration of ACCELS) {
  for (const targetSpeed of DELTA_V_TARGETS) {
    for (const direction of DIRECTIONS) {
      const r = runCase({ acceleration, targetSpeed, direction });
      results.push(r);
      console.log(
        `E4.1 a=${String(acceleration).padStart(2)} dv=${targetSpeed.toFixed(1)} dir=${direction > 0 ? '+' : '-'} ` +
        `${r.outcome.padEnd(10)} pulse=${r.pulseFrames}f/${r.pulseSeconds.toFixed(3)}s ` +
        `peak=${r.peakTiltDeg.toFixed(2)}deg loss=${r.supportLossFrames} tau=${r.maxTorque.toFixed(1)}Nm`,
      );
    }
  }
}

console.log('E4.1 mirrored acceleration-duration matrix:');
for (const acceleration of ACCELS) {
  const row = DELTA_V_TARGETS.map((targetSpeed) => {
    const pair = DIRECTIONS.map((direction) => results.find(
      (r) => r.acceleration === acceleration && r.targetSpeed === targetSpeed && r.direction === direction,
    ));
    return `${targetSpeed.toFixed(1)}:${pair.map((r) => r.outcome[0]).join('/')}`;
  });
  console.log(`  a=${acceleration}: ${row.join(' ')}`);
}

console.log('E4.1 PASS: acceleration magnitude and pulse duration/Δv were decomposed; no locomotion or balance tuning selected.');
