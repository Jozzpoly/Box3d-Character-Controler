import Box3D from 'box3d.js/inline';
import { DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const IDENTITY = [0, 0, 0, 1];
const SQRT_HALF = Math.SQRT1_2;
const SAGITTAL_HINGE_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];

// Reuse the already-qualified one-piece E7 branch geometry/mass.
const PROBE_MASS = 1;
const PROBE_LENGTH = 0.9;
const PROBE_HALF = [0.06, PROBE_LENGTH / 2, 0.06];
const WIDE_LIMIT = 145 * Math.PI / 180;
// Representative acquired orientation from E7.1 was ~132deg in both mirrors.
// 132deg is used as a non-tuned interior specimen, not a gameplay target.
const REPRESENTATIVE_ANGLE = 132 * Math.PI / 180;
const CHALLENGE_IMPULSE = 0.02; // same finite sagittal angular impulse used in E9.0a

// Reuse paid-for boundaries instead of inventing a looser latch gate.
const MAX_LOCK_DRIFT = 0.25 * Math.PI / 180;
const NEUTRAL_LINEAR_SPEED_MAX = 1e-4; // E8.0c neutral latch boundary scale
const NEUTRAL_ANGULAR_SPEED_MAX = 1e-4;
const DIRECT_RESET_ANGLE_MATCH_MAX = 1e-5;
const DIRECT_RESET_ANGULAR_SPEED_MATCH_MAX = 1e-5;

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function xQuat(angle) {
  return [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];
}

function rotateX(v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}

function magnitude(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function makeRig(direction) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(wd);

  const parentDef = b3.b3DefaultBodyDef();
  parentDef.type = b3.b3BodyType.b3_staticBody;
  parentDef.position = [0, 0, 0];
  const parent = b3.b3CreateBody(world, parentDef);

  const angle = direction * REPRESENTATIVE_ANGLE;
  const probeDef = b3.b3DefaultBodyDef();
  probeDef.type = b3.b3BodyType.b3_dynamicBody;
  // local pivot on the probe is [0,-L/2,0]; position COM so that pivot is world origin.
  probeDef.position = rotateX([0, PROBE_HALF[1], 0], angle);
  probeDef.rotation = xQuat(angle);
  probeDef.linearVelocity = [0, 0, 0];
  probeDef.angularVelocity = [0, 0, 0];
  probeDef.linearDamping = 0;
  probeDef.angularDamping = 0;
  probeDef.enableSleep = false;
  probeDef.enableContactRecycling = false;
  probeDef.motionLocks.linearX = true;
  probeDef.motionLocks.angularY = true;
  probeDef.motionLocks.angularZ = true;
  const probe = b3.b3CreateBody(world, probeDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForMass(PROBE_MASS, PROBE_HALF);
  shapeDef.filter.maskBits = 0n;
  b3.b3CreateBoxShape(probe, shapeDef, ...PROBE_HALF);

  const hinge = b3.b3DefaultRevoluteJointDef();
  hinge.base.bodyIdA = parent;
  hinge.base.bodyIdB = probe;
  hinge.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.base.localFrameB = { position: [0, -PROBE_HALF[1], 0], quaternion: SAGITTAL_HINGE_FRAME };
  hinge.enableSpring = false;
  hinge.enableLimit = true;
  hinge.lowerAngle = -WIDE_LIMIT;
  hinge.upperAngle = WIDE_LIMIT;
  hinge.enableMotor = false;
  const joint = b3.b3CreateRevoluteJoint(world, hinge);

  return { world, parent, probe, joint, requestedAngle: angle };
}

function sample(rig) {
  const linear = [0, 0, 0];
  const angular = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(linear, rig.probe);
  b3.b3Body_GetAngularVelocity(angular, rig.probe);
  return {
    angle: b3.b3RevoluteJoint_GetAngle(rig.joint),
    linearSpeed: magnitude(linear),
    angularX: angular[0],
    angularSpeed: magnitude(angular),
  };
}

function settle(rig, frames = 4) {
  for (let i = 0; i < frames; i++) b3.b3World_Step(rig.world, DT, SUBSTEPS);
}

function latchDirect(rig, target) {
  b3.b3RevoluteJoint_SetLimits(rig.joint, target, target);
}

function latchWithCacheReset(rig, target) {
  b3.b3RevoluteJoint_EnableLimit(rig.joint, false);
  b3.b3RevoluteJoint_SetLimits(rig.joint, target, target);
  b3.b3RevoluteJoint_EnableLimit(rig.joint, true);
}

function run(direction, mode) {
  const rig = makeRig(direction);
  settle(rig);
  const before = sample(rig);
  const target = before.angle;

  if (Math.abs(target - rig.requestedAngle) > 1e-4) {
    throw new Error(`E10.0a initial native angle mismatch: requested=${rig.requestedAngle} native=${target}`);
  }

  if (mode === 'direct') latchDirect(rig, target);
  if (mode === 'reset') latchWithCacheReset(rig, target);

  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  const neutral = sample(rig);

  b3.b3Body_ApplyAngularImpulse(rig.probe, [CHALLENGE_IMPULSE, 0, 0], true);
  let maxAngleDrift = 0;
  let maxAngularSpeed = 0;
  for (let i = 0; i < 120; i++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    const row = sample(rig);
    maxAngleDrift = Math.max(maxAngleDrift, Math.abs(row.angle - target));
    maxAngularSpeed = Math.max(maxAngularSpeed, row.angularSpeed);
  }
  const after = sample(rig);

  const result = { mode, direction, target, before, neutral, maxAngleDrift, maxAngularSpeed, after };
  b3.b3DestroyWorld(rig.world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4) {
  throw new Error('E10.0a expected canonical Donor-v1 solver cadence');
}
for (const fn of [
  'b3RevoluteJoint_GetAngle',
  'b3RevoluteJoint_SetLimits',
  'b3RevoluteJoint_EnableLimit',
  'b3Body_GetAngularVelocity',
  'b3Body_ApplyAngularImpulse',
]) {
  if (typeof b3[fn] !== 'function') throw new Error(`E10.0a requires ${fn} in box3d.js@0.1.1`);
}

console.log('E10.0a current-angle revolute brace/latch transition calibration');
console.log('  isolated one-piece E7 probe geometry, zero gravity/contact, wide ±145deg revolute at rest near ±132deg');
console.log('  direct = SetLimits(current,current); reset = DisableLimit -> SetLimits(current,current) -> EnableLimit');
console.log(`  reused lock envelope=${(MAX_LOCK_DRIFT * 180 / Math.PI).toFixed(3)}deg neutral speed<=${NEUTRAL_LINEAR_SPEED_MAX}/${NEUTRAL_ANGULAR_SPEED_MAX}`);

const rows = [];
for (const direction of [-1, 1]) {
  const free = run(direction, 'free');
  const direct = run(direction, 'direct');
  const reset = run(direction, 'reset');
  rows.push({ direction, free, direct, reset });

  const fmt = r => `neutral(v/w)=${r.neutral.linearSpeed.toExponential(2)}/${r.neutral.angularSpeed.toExponential(2)} ` +
    `challengeDrift=${(r.maxAngleDrift * 180 / Math.PI).toFixed(6)}deg maxW=${r.maxAngularSpeed.toFixed(6)}rad/s`;
  console.log(`  dir=${direction > 0 ? '+' : '-'} free   ${fmt(free)}`);
  console.log(`          direct ${fmt(direct)}`);
  console.log(`          reset  ${fmt(reset)}`);
  console.log(
    `          direct-reset neutral Δangle=${Math.abs(direct.neutral.angle - reset.neutral.angle).toExponential(2)}rad ` +
    `Δw=${Math.abs(direct.neutral.angularX - reset.neutral.angularX).toExponential(2)}rad/s`,
  );
}

for (const { direction, free, direct, reset } of rows) {
  if (free.maxAngleDrift <= MAX_LOCK_DRIFT) {
    throw new Error(`E10.0a free challenge is not material dir=${direction}: drift=${free.maxAngleDrift}`);
  }
  for (const latched of [direct, reset]) {
    if (latched.neutral.linearSpeed > NEUTRAL_LINEAR_SPEED_MAX) {
      throw new Error(`E10.0a ${latched.mode} neutral linear kick dir=${direction}: ${latched.neutral.linearSpeed}`);
    }
    if (latched.neutral.angularSpeed > NEUTRAL_ANGULAR_SPEED_MAX) {
      throw new Error(`E10.0a ${latched.mode} neutral angular kick dir=${direction}: ${latched.neutral.angularSpeed}`);
    }
    if (latched.maxAngleDrift > MAX_LOCK_DRIFT) {
      throw new Error(`E10.0a ${latched.mode} failed lock envelope dir=${direction}: ${latched.maxAngleDrift}`);
    }
  }
  if (Math.abs(direct.neutral.angle - reset.neutral.angle) > DIRECT_RESET_ANGLE_MATCH_MAX) {
    throw new Error(`E10.0a direct/reset neutral angle mismatch dir=${direction}`);
  }
  if (Math.abs(direct.neutral.angularX - reset.neutral.angularX) > DIRECT_RESET_ANGULAR_SPEED_MATCH_MAX) {
    throw new Error(`E10.0a direct/reset neutral angular-speed mismatch dir=${direction}`);
  }
}

console.log('E10.0a PASS: at a nonzero acquired-like angle and zero relative motion, changing the existing E7-style revolute from wide limits to an exact current-angle brace produces no material neutral kick and resists a finite angular challenge that drives an otherwise identical wide-limit control outside the unchanged 0.25deg envelope in both mirrors. Direct and cache-reset paths are numerically equivalent in this neutral interior-limit specimen; pinned source still makes the cache-reset sequence the conservative policy when prior limit impulses are possible. This qualifies transition semantics only. It does not prove brace engagement after ground acquisition, load transfer, locomotion authority, or feel.');
