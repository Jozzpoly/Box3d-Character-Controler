import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const SUPPORT_MASS = 800;
const FINITE_TORQUE = 320;
const MU = 0.95;
const SETTLE_FRAMES = 90;
const OBSERVE_FRAMES = 60;
const SUPPORT_HALF = [2, 0.25, 30];
const PLATFORM_Y = -SUPPORT_HALF[1];
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];
const Y_POS_90 = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
const DIRECTIONS = [-1, 1];

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function axisQuaternion(direction) {
  return direction > 0 ? Y_NEG_90 : Y_POS_90;
}

function makeStaticFrame(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_staticBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
  return b3.b3CreateBody(world, bd);
}

function makeSupport(world, kind, direction) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;

  if (kind === 'body-lock') {
    bd.motionLocks.linearX = true;
    bd.motionLocks.linearY = true;
    bd.motionLocks.angularX = true;
    bd.motionLocks.angularY = true;
    bd.motionLocks.angularZ = true;
  }

  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(SUPPORT_MASS, SUPPORT_HALF);
  sd.baseMaterial.friction = MU;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...SUPPORT_HALF);

  let joint = null;
  if (kind === 'prismatic-free') {
    const frame = makeStaticFrame(world);
    const q = axisQuaternion(direction);
    const jd = b3.b3DefaultPrismaticJointDef();
    jd.base.bodyIdA = frame;
    jd.base.bodyIdB = body;
    jd.base.localFrameA = { position: [0, 0, 0], quaternion: q };
    jd.base.localFrameB = { position: [0, 0, 0], quaternion: q };
    jd.enableLimit = false;
    jd.lowerTranslation = 0;
    jd.upperTranslation = 60;
    jd.enableMotor = false;
    joint = b3.b3CreatePrismaticJoint(world, jd);
  }

  return { body, joint };
}

function readBody(body) {
  const p = [0, 0, 0];
  const v = [0, 0, 0];
  const q = [0, 0, 0, 1];
  b3.b3Body_GetPosition(p, body);
  b3.b3Body_GetLinearVelocity(v, body);
  b3.b3Body_GetRotation(q, body);
  const w = Math.max(-1, Math.min(1, Math.abs(q[3])));
  return {
    p,
    v,
    rotationError: 2 * Math.acos(w),
  };
}

function run(kind, direction) {
  const world = makeWorld();
  const support = makeSupport(world, kind, direction);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: MU,
  });

  let maxX = 0;
  let maxYBias = 0;
  let maxVx = 0;
  let maxVy = 0;
  let maxRotation = 0;
  let maxBindingError = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  function sample() {
    const s = readBody(support.body);
    maxX = Math.max(maxX, Math.abs(s.p[0]));
    maxYBias = Math.max(maxYBias, Math.abs(s.p[1] - PLATFORM_Y));
    maxVx = Math.max(maxVx, Math.abs(s.v[0]));
    maxVy = Math.max(maxVy, Math.abs(s.v[1]));
    maxRotation = Math.max(maxRotation, s.rotationError);
    minY = Math.min(minY, s.p[1]);
    maxY = Math.max(maxY, s.p[1]);
    if (support.joint) {
      const t = b3.b3PrismaticJoint_GetTranslation(support.joint);
      const axisPosition = direction * s.p[2];
      maxBindingError = Math.max(maxBindingError, Math.abs(t - axisPosition));
    }
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    sample();
  }
  const settled = readBody(support.body);
  for (let i = 0; i < OBSERVE_FRAMES; i++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    sample();
  }
  const final = readBody(support.body);

  const result = {
    kind,
    direction,
    maxX,
    maxYBias,
    maxVx,
    maxVy,
    maxRotation,
    maxBindingError,
    minY,
    maxY,
    settledY: settled.p[1],
    finalY: final.p[1],
    finalVy: final.v[1],
  };
  b3.b3DestroyWorld(world);
  return result;
}

console.log('E13.0c0 off-axis decomposition diagnostic');
console.log('  mechanics match E13.0c; this script changes no gate and selects no tolerance.');
console.log('  purpose: split the prior hypot(X, Y-bias) signal into constrained components before classifying the red E13.0c result.');

for (const direction of DIRECTIONS) {
  for (const kind of ['body-lock', 'prismatic-free']) {
    const r = run(kind, direction);
    console.log(
      `  dir=${direction > 0 ? '+' : '-'} ${kind.padEnd(14)} ` +
      `max|x|=${r.maxX.toExponential(6)}m ` +
      `max|y-y0|=${r.maxYBias.toExponential(6)}m ` +
      `max|vx|=${r.maxVx.toExponential(6)}m/s ` +
      `max|vy|=${r.maxVy.toExponential(6)}m/s ` +
      `rot=${r.maxRotation.toExponential(6)}rad ` +
      `binding=${r.maxBindingError.toExponential(6)}m ` +
      `yRange=[${r.minY.toFixed(9)},${r.maxY.toFixed(9)}] ` +
      `settledY=${r.settledY.toFixed(9)} finalY=${r.finalY.toFixed(9)} finalVy=${r.finalVy.toExponential(3)}`,
    );
  }
}

console.log('E13.0c0 diagnostic complete: classify X leak, constrained-Y positional bias, velocity drift, rotation and axial-binding consistency separately; do not relax E13.0c thresholds from this output.');
