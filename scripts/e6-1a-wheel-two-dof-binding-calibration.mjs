import Box3D from 'box3d.js/inline';
import { DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const LIMIT = 0.25;
const LOCK_EPS = 1e-5;
const DRIVE_SPEED = 2.0;
const SQRT_HALF = Math.SQRT1_2;

// 180 degrees about world axis (1,0,1)/sqrt(2):
// joint local X -> world Z (support-relative translation)
// joint local Z -> world X (sagittal ankle pitch)
const SAGITTAL_WHEEL_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  return b3.b3CreateWorld(wd);
}

function makeBody(world, type) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = type;
  bd.position = [0, 0, 0];
  bd.enableSleep = false;
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  if (type === b3.b3BodyType.b3_dynamicBody) {
    bd.motionLocks.linearX = true;
    bd.motionLocks.angularY = true;
    bd.motionLocks.angularZ = true;
  }
  const body = b3.b3CreateBody(world, bd);
  if (type === b3.b3BodyType.b3_dynamicBody) {
    const sd = b3.b3DefaultShapeDef();
    sd.density = 125; // 0.2^3 m^3 box -> 1 kg
    b3.b3CreateBoxShape(body, sd, 0.1, 0.1, 0.1);
  }
  return body;
}

function positionOf(body) {
  const p = [0, 0, 0];
  b3.b3Body_GetPosition(p, body);
  return p;
}

function angularVelocityOf(body) {
  const w = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(w, body);
  return w;
}

function makeWheel(world, frame, moving, limit) {
  if (typeof b3.b3DefaultWheelJointDef !== 'function' || typeof b3.b3CreateWheelJoint !== 'function') {
    throw new Error('E6.1a requires wheel-joint bindings in box3d.js@0.1.1');
  }

  const jd = b3.b3DefaultWheelJointDef();
  jd.base.bodyIdA = frame;
  jd.base.bodyIdB = moving;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_WHEEL_FRAME };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: SAGITTAL_WHEEL_FRAME };
  jd.enableSuspensionSpring = false;
  jd.enableSuspensionLimit = true;
  jd.lowerSuspensionLimit = -limit;
  jd.upperSuspensionLimit = limit;
  jd.enableSpinMotor = false;
  jd.enableSteering = false;
  return b3.b3CreateWheelJoint(world, jd);
}

function runTranslation(direction) {
  const world = makeWorld();
  const frame = makeBody(world, b3.b3BodyType.b3_staticBody);
  const moving = makeBody(world, b3.b3BodyType.b3_dynamicBody);
  makeWheel(world, frame, moving, LIMIT);

  b3.b3Body_SetLinearVelocity(moving, [0, 0, direction * DRIVE_SPEED]);
  for (let i = 0; i < 30; i++) b3.b3World_Step(world, DT, SUBSTEPS);
  const p = positionOf(moving);
  const w = angularVelocityOf(moving);
  b3.b3DestroyWorld(world);
  return { p, w };
}

function runSpin(direction) {
  const world = makeWorld();
  const frame = makeBody(world, b3.b3BodyType.b3_staticBody);
  const moving = makeBody(world, b3.b3BodyType.b3_dynamicBody);
  makeWheel(world, frame, moving, LOCK_EPS);

  b3.b3Body_SetAngularVelocity(moving, [direction * DRIVE_SPEED, 0, 0]);
  for (let i = 0; i < 15; i++) b3.b3World_Step(world, DT, SUBSTEPS);
  const p = positionOf(moving);
  const w = angularVelocityOf(moving);
  b3.b3DestroyWorld(world);
  return { p, w };
}

if (DT !== 1 / 60 || SUBSTEPS !== 4) {
  throw new Error('E6.1a expected current Donor-v1 fixed-step substrate; requalify calibration');
}

const translationPositive = runTranslation(1);
const translationNegative = runTranslation(-1);
const spinPositive = runSpin(1);
const spinNegative = runSpin(-1);

console.log('E6.1a two-body wheel-joint binding calibration');
console.log(`  translation + -> p=[${translationPositive.p.map((v) => v.toFixed(6)).join(', ')}] w=[${translationPositive.w.map((v) => v.toFixed(6)).join(', ')}]`);
console.log(`  translation - -> p=[${translationNegative.p.map((v) => v.toFixed(6)).join(', ')}] w=[${translationNegative.w.map((v) => v.toFixed(6)).join(', ')}]`);
console.log(`  spin + -> p=[${spinPositive.p.map((v) => v.toFixed(6)).join(', ')}] w=[${spinPositive.w.map((v) => v.toFixed(6)).join(', ')}]`);
console.log(`  spin - -> p=[${spinNegative.p.map((v) => v.toFixed(6)).join(', ')}] w=[${spinNegative.w.map((v) => v.toFixed(6)).join(', ')}]`);

for (const [label, result, sign] of [
  ['translation +', translationPositive, 1],
  ['translation -', translationNegative, -1],
]) {
  if (Math.abs(result.p[0]) > 1e-4 || Math.abs(result.p[1]) > 1e-4) {
    throw new Error(`E6.1a ${label} leaked off intended world-Z suspension axis`);
  }
  const signedZ = sign * result.p[2];
  if (signedZ < LIMIT - 0.02 || signedZ > LIMIT + 0.02) {
    throw new Error(`E6.1a ${label} did not reach the bounded suspension limit: z=${result.p[2]}`);
  }
}

if (Math.abs(translationPositive.p[2] + translationNegative.p[2]) > 0.01) {
  throw new Error('E6.1a suspension translation is not sufficiently mirrored');
}

for (const [label, result, sign] of [
  ['spin +', spinPositive, 1],
  ['spin -', spinNegative, -1],
]) {
  if (Math.abs(result.p[2]) > 0.002 || Math.abs(result.p[0]) > 1e-4 || Math.abs(result.p[1]) > 1e-4) {
    throw new Error(`E6.1a ${label} violated locked suspension translation`);
  }
  if (sign * result.w[0] < 0.5) {
    throw new Error(`E6.1a ${label} did not preserve free sagittal spin: wx=${result.w[0]}`);
  }
  if (Math.abs(result.w[1]) > 1e-4 || Math.abs(result.w[2]) > 1e-4) {
    throw new Error(`E6.1a ${label} leaked angular motion outside world X`);
  }
}

if (Math.abs(spinPositive.w[0] + spinNegative.w[0]) > 0.05) {
  throw new Error('E6.1a free spin is not sufficiently mirrored');
}

console.log('E6.1a PASS: box3d.js@0.1.1 exposes a two-body wheel-joint substrate that can provide bounded world-Z translation while retaining free world-X sagittal rotation. This qualifies only the joint/binding geometry; it does not yet qualify E5 representation equivalence or support relocation.');
