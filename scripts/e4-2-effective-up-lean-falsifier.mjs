import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const ACCELS = [8, 16, DONOR_PROFILE_V1.groundAcceleration];
const DIRECTIONS = [-1, 1];
const POLICIES = ['upright', 'effective-up'];
const FINITE_TORQUE = 320;
const LOAD_EPSILON = 1e-5;
const SETTLE_FRAMES = 90;
const HOLD_FRAMES = 180;
const RECOVER_STREAK = 30;
const HALF = [2, 0.25, 30];
const Y = -HALF[1];
const Q = [0, 0, 0, 1];

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
function world() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}
function platform(worldId) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, Y, 0];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(worldId, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0.95;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...HALF);
  return body;
}
function supportReader(o) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  function read() {
    b3.getBodyContactData(buffer, o.foot);
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
    return { reactive: touching > 0 || loaded > 0 };
  }
  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}
function targetedPreStep(o, targetTilt, maxTorque) {
  o._sync();
  const error = o.torsoTilt - targetTilt;
  const omega = o.torsoAngularVelocity[0];
  const requested = -o.kp * error - o.kd * omega;
  const torque = clamp(requested, -maxTorque, maxTorque);
  o.lastBalanceTorque = torque;
  if (Math.abs(torque) > 1e-9) {
    const j = torque * DT;
    b3.b3Body_ApplyAngularImpulse(o.torso, [j, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(o.foot, [-j, 0, 0], true);
  }
  return torque;
}

function runCase({ policy, acceleration, direction }) {
  const w = world();
  const p = platform(w);
  const o = new SagittalBalanceOrganism(b3, w, { mode: 'finite', maxTorque: FINITE_TORQUE });
  const reader = supportReader(o);
  let signal = reader.read();
  let speed = 0;
  let z = 0;
  let supportLoss = 0;
  let maxTorque = 0;
  let maxTargetTilt = 0;
  let stable = 0;
  let recovered = false;
  let targetReached = false;

  function step(move) {
    let actualAccel = 0;
    if (move) {
      const targetSpeed = direction * TARGET_SPEED;
      const before = speed;
      speed = moveToward(speed, targetSpeed, acceleration * DT);
      actualAccel = (speed - before) / DT;
      z += speed * DT;
      b3.b3Body_SetTargetTransform(p, { position: [0, Y, z], quaternion: Q }, DT, true);
      if (Math.abs(speed - targetSpeed) < 1e-9) targetReached = true;
    }
    const targetTilt = policy === 'effective-up' ? Math.atan2(actualAccel, G) : 0;
    maxTargetTilt = Math.max(maxTargetTilt, Math.abs(targetTilt));
    const torque = targetedPreStep(o, targetTilt, signal.reactive ? FINITE_TORQUE : 0);
    maxTorque = Math.max(maxTorque, Math.abs(torque));
    b3.b3World_Step(w, DT, SUBSTEPS);
    o.postStep();
    signal = reader.read();
    if (!signal.reactive) supportLoss += 1;
    if (targetReached && o.isRecovered() && signal.reactive) stable += 1;
    else stable = 0;
    if (stable >= RECOVER_STREAK) recovered = true;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step(false);
  if (!signal.reactive) throw new Error('E4.2 failed to establish support');
  supportLoss = 0;
  maxTorque = 0;
  maxTargetTilt = 0;
  stable = 0;
  recovered = false;

  const rampFrames = Math.ceil(TARGET_SPEED / acceleration / DT) + 3;
  for (let i = 0; i < rampFrames && !targetReached; i++) step(true);
  if (!targetReached) throw new Error(`E4.2 failed to reach target at a=${acceleration}`);
  for (let i = 0; i < HOLD_FRAMES; i++) step(true);

  const t = o.telemetry();
  const result = {
    policy,
    acceleration,
    direction,
    outcome: t.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakAbsTilt * 180 / Math.PI,
    maxTargetTiltDeg: maxTargetTilt * 180 / Math.PI,
    supportLoss,
    maxTorque,
  };
  reader.destroy();
  b3.b3DestroyWorld(w);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || TARGET_SPEED !== 5.2 || DONOR_PROFILE_V1.groundAcceleration !== 31) {
  throw new Error('E4.2 expected current Donor v1 envelope changed');
}

const results = [];
for (const policy of POLICIES) {
  for (const acceleration of ACCELS) {
    for (const direction of DIRECTIONS) {
      const r = runCase({ policy, acceleration, direction });
      results.push(r);
      console.log(
        `E4.2 ${policy.padEnd(12)} a=${String(acceleration).padStart(2)} dir=${direction > 0 ? '+' : '-'} ` +
        `${r.outcome.padEnd(10)} peak=${r.peakTiltDeg.toFixed(2)}deg target=${r.maxTargetTiltDeg.toFixed(2)}deg ` +
        `loss=${r.supportLoss} tau=${r.maxTorque.toFixed(1)}Nm`,
      );
    }
  }
}

console.log('E4.2 target-posture A/B:');
for (const acceleration of ACCELS) {
  const target = Math.atan2(acceleration, G) * 180 / Math.PI;
  const summary = POLICIES.map((policy) => {
    const pair = DIRECTIONS.map((direction) => results.find(
      (r) => r.policy === policy && r.acceleration === acceleration && r.direction === direction,
    ));
    return `${policy}=${pair.map((r) => r.outcome[0]).join('/')}`;
  });
  console.log(`  a=${acceleration} effectiveLean=${target.toFixed(2)}deg :: ${summary.join(' ')}`);
}
console.log('E4.2 PASS: physically motivated acceleration-aligned posture target compared against world-upright control with identical support and torque authority; no gameplay policy promoted.');
