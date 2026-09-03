import Box3D from 'box3d.js/inline';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const SUPPORT_MASS = 800;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const SUPPORT_HALF = [2, 0.25, 30];
const UPPER_TRAVEL = 2 * SUPPORT_HALF[2];
const REDUCED_MASS = 1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS);
const E12_Q1_RELATIVE_DV = ACCEL * DT;
const E12_Q1_RECIPROCAL_IMPULSE = REDUCED_MASS * E12_Q1_RELATIVE_DV;
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const Y_POS_90 = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const DIRECTIONS = [-1, 1];

// Binding-calibration discrimination bands are intentionally broad. They do
// not tune locomotion: the allowed side must preserve essentially all of the
// matched free impulse, while the blocked side must remove essentially all of
// the exact E12 q=1 support recoil. Mirror agreement is checked separately.
const FREE_FRACTION_MIN = 0.95;
const BLOCKED_FRACTION_MAX = 0.05;
const MIRROR_FRACTION_MAX = 0.01;
const PRELOAD_FRACTION_MAX = 1e-4;
const OFF_AXIS_EPS = 1e-4;

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  return b3.b3CreateWorld(wd);
}

function makeSupport(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, 0, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.motionLocks.linearX = true;
  bd.motionLocks.linearY = true;
  bd.motionLocks.angularX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(SUPPORT_MASS, SUPPORT_HALF);
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...SUPPORT_HALF);
  return body;
}

function makeFrame(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_staticBody;
  bd.position = [0, 0, 0];
  bd.enableSleep = false;
  return b3.b3CreateBody(world, bd);
}

function axisQuaternion(direction) {
  // E6.0a qualified Y_NEG_90 as local +X -> world +Z. Mirroring the Y rotation
  // makes local +X -> world -Z, so in both directions the intended support
  // recoil (-direction * worldZ) maps to negative joint translation and the
  // lower limit at exactly zero is the blocked side.
  return direction > 0 ? Y_NEG_90 : Y_POS_90;
}

function addWorldStop(world, support, direction) {
  if (typeof b3.b3DefaultPrismaticJointDef !== 'function' || typeof b3.b3CreatePrismaticJoint !== 'function') {
    throw new Error('E13.0b requires prismatic-joint bindings in box3d.js@0.1.1');
  }

  const frame = makeFrame(world);
  const q = axisQuaternion(direction);
  const jd = b3.b3DefaultPrismaticJointDef();
  jd.base.bodyIdA = frame;
  jd.base.bodyIdB = support;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: q };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: q };
  jd.enableLimit = true;
  jd.lowerTranslation = 0;
  // The upper bound is geometry-derived, not fitted to the pulse: one full
  // support length. The one-frame q=1 pulse moves <1 mm, so this side is
  // intentionally causally inactive in the calibration.
  jd.upperTranslation = UPPER_TRAVEL;
  jd.enableMotor = false;
  b3.b3CreatePrismaticJoint(world, jd);
}

function readState(body, direction) {
  const p = [0, 0, 0];
  const v = [0, 0, 0];
  b3.b3Body_GetPosition(p, body);
  b3.b3Body_GetLinearVelocity(v, body);
  const mass = b3.b3Body_GetMass(body);
  return {
    p,
    v,
    mass,
    axisPosition: direction * p[2],
    axisVelocity: direction * v[2],
    axisMomentum: direction * mass * v[2],
  };
}

function applyAxisImpulse(body, direction, axisSign) {
  const worldSign = direction * axisSign;
  b3.b3Body_ApplyLinearImpulseToCenter(
    body,
    [0, 0, worldSign * E12_Q1_RECIPROCAL_IMPULSE],
    true,
  );
}

function run({ direction, limited, axisSign }) {
  const world = makeWorld();
  const support = makeSupport(world);
  const mass = b3.b3Body_GetMass(support);
  if (Math.abs(mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E13.0b support mass ${mass} != ${SUPPORT_MASS}kg`);
  }

  if (limited) addWorldStop(world, support, direction);

  // One neutral solve is the inactive qualification. At the exact lower limit
  // the world-stop candidate must not preload or drift before any recoil exists.
  b3.b3World_Step(world, DT, SUBSTEPS);
  const qualified = readState(support, direction);

  applyAxisImpulse(support, direction, axisSign);
  const immediate = readState(support, direction);
  b3.b3World_Step(world, DT, SUBSTEPS);
  const after = readState(support, direction);

  const solverReaction = after.axisMomentum - immediate.axisMomentum;
  const result = {
    direction,
    limited,
    axisSign,
    qualified,
    immediate,
    after,
    solverReaction,
  };

  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 ||
  PLAYER_MASS !== 80 || ACCEL !== 31
) {
  throw new Error('E13.0b expected canonical Donor-v1/E12 substrate');
}

console.log('E13.0b prismatic unilateral world-stop binding calibration');
console.log(`  support=${SUPPORT_MASS}kg; mirrored joint axis; lower=0m; upper=${UPPER_TRAVEL.toFixed(1)}m (= one support length)`);
console.log(`  exact E12 q=1 reciprocal recoil impulse=${E12_Q1_RECIPROCAL_IMPULSE.toFixed(6)}Ns from reduced mass ${REDUCED_MASS.toFixed(6)}kg * current31 dVrel ${E12_Q1_RELATIVE_DV.toFixed(6)}m/s`);
console.log('  each specimen: one neutral inactive-qualification solve -> one matched impulse -> one solver step; zero gravity/damping/contact/motor.');
console.log('  local +axis is mirrored with intent; +axis is allowed, -axis is the support-recoil/lower-limit side.');

const results = [];
for (const direction of DIRECTIONS) {
  for (const axisSign of [-1, 1]) {
    for (const limited of [false, true]) {
      const r = run({ direction, limited, axisSign });
      results.push(r);
      console.log(
        `  dir=${direction > 0 ? '+' : '-'} ${limited ? 'LIMIT' : 'FREE '} ${axisSign > 0 ? 'allowed' : 'recoil '} ` +
        `pre P=${r.qualified.axisMomentum.toExponential(2)}Ns z=${r.qualified.axisPosition.toExponential(2)}m | ` +
        `P immediate->post=${r.immediate.axisMomentum.toFixed(6)}->${r.after.axisMomentum.toFixed(6)}Ns ` +
        `reaction=${r.solverReaction.toFixed(6)}Ns ` +
        `vPost=${r.after.axisVelocity.toFixed(7)}m/s zPost=${r.after.axisPosition.toExponential(3)}m`,
      );
    }
  }
}

function find(direction, limited, axisSign) {
  return results.find((r) => r.direction === direction && r.limited === limited && r.axisSign === axisSign);
}

for (const r of results) {
  if (
    Math.abs(r.qualified.axisMomentum) > PRELOAD_FRACTION_MAX * E12_Q1_RECIPROCAL_IMPULSE ||
    Math.abs(r.qualified.axisPosition) > OFF_AXIS_EPS
  ) {
    throw new Error(`E13.0b inactive qualification preloaded/drifted dir=${r.direction} limited=${r.limited} sign=${r.axisSign}`);
  }
  if (
    Math.abs(r.after.p[0]) > OFF_AXIS_EPS ||
    Math.abs(r.after.p[1]) > OFF_AXIS_EPS ||
    Math.abs(r.after.v[0]) > OFF_AXIS_EPS ||
    Math.abs(r.after.v[1]) > OFF_AXIS_EPS
  ) {
    throw new Error(`E13.0b leaked off intended world-Z axis dir=${r.direction} limited=${r.limited} sign=${r.axisSign}`);
  }
}

for (const direction of DIRECTIONS) {
  const freeAllowed = find(direction, false, 1);
  const limitAllowed = find(direction, true, 1);
  const freeRecoil = find(direction, false, -1);
  const limitRecoil = find(direction, true, -1);

  const expected = E12_Q1_RECIPROCAL_IMPULSE;
  if (freeAllowed.after.axisMomentum < FREE_FRACTION_MIN * expected) {
    throw new Error(`E13.0b free allowed reference lost impulse dir=${direction}`);
  }
  if (limitAllowed.after.axisMomentum < FREE_FRACTION_MIN * expected) {
    throw new Error(`E13.0b limited allowed side is not effectively free dir=${direction}`);
  }
  if (Math.abs(limitAllowed.after.axisMomentum - freeAllowed.after.axisMomentum) > (1 - FREE_FRACTION_MIN) * expected) {
    throw new Error(`E13.0b allowed side diverged from matched free reference dir=${direction}`);
  }

  if (Math.abs(freeRecoil.after.axisMomentum) < FREE_FRACTION_MIN * expected) {
    throw new Error(`E13.0b free recoil reference did not retain impulse dir=${direction}`);
  }
  if (Math.abs(limitRecoil.after.axisMomentum) > BLOCKED_FRACTION_MAX * expected) {
    throw new Error(`E13.0b lower limit failed to block E12 recoil dir=${direction}`);
  }
  if (limitRecoil.solverReaction < FREE_FRACTION_MIN * expected) {
    throw new Error(`E13.0b lower limit failed to transmit recoil into world dir=${direction}`);
  }
  if (Math.abs(limitAllowed.solverReaction) > BLOCKED_FRACTION_MAX * expected) {
    throw new Error(`E13.0b allowed side generated material world reaction dir=${direction}`);
  }
}

const negAllowed = find(-1, true, 1);
const posAllowed = find(1, true, 1);
const negRecoil = find(-1, true, -1);
const posRecoil = find(1, true, -1);
if (Math.abs(negAllowed.after.axisMomentum - posAllowed.after.axisMomentum) > MIRROR_FRACTION_MAX * E12_Q1_RECIPROCAL_IMPULSE) {
  throw new Error('E13.0b allowed-side response is not mirrored closely enough');
}
if (Math.abs(negRecoil.solverReaction - posRecoil.solverReaction) > MIRROR_FRACTION_MAX * E12_Q1_RECIPROCAL_IMPULSE) {
  throw new Error('E13.0b recoil world reaction is not mirrored closely enough');
}

console.log('E13.0b PASS');
console.log('  box3d.js prismatic lower limit can represent a mirrored, initially neutral unilateral world stop for the exact E12 reciprocal-support recoil scale: allowed motion remains effectively free while recoil is transferred to the static world.');
console.log('  this qualifies only the isolated binding. It does not yet prove representation neutrality with the player standing on the support or select reciprocal authority for gameplay.');
