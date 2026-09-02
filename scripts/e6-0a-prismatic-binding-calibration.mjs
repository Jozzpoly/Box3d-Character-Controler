import Box3D from 'box3d.js/inline';
import { DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const LIMIT = 0.25;
const MOTOR_SPEED = 2.0;
const MAX_MOTOR_FORCE = 200;
const Y_NEG_90 = [0, -Math.SQRT1_2, 0, Math.SQRT1_2];

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  return b3.b3CreateWorld(wd);
}

function makeBody(world, type, position) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = type;
  bd.position = [...position];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  if (type === b3.b3BodyType.b3_dynamicBody) {
    const sd = b3.b3DefaultShapeDef();
    sd.density = 125;
    b3.b3CreateBoxShape(body, sd, 0.1, 0.1, 0.1);
  }
  return body;
}

function positionOf(body) {
  const p = [0, 0, 0];
  b3.b3Body_GetPosition(p, body);
  return p;
}

function run(direction) {
  const world = makeWorld();
  const frame = makeBody(world, b3.b3BodyType.b3_staticBody, [0, 0, 0]);
  const slider = makeBody(world, b3.b3BodyType.b3_dynamicBody, [0, 0, 0]);

  if (typeof b3.b3DefaultPrismaticJointDef !== 'function' || typeof b3.b3CreatePrismaticJoint !== 'function') {
    throw new Error('E6.0a requires prismatic-joint bindings in box3d.js@0.1.1');
  }

  const jd = b3.b3DefaultPrismaticJointDef();
  jd.base.bodyIdA = frame;
  jd.base.bodyIdB = slider;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: Y_NEG_90 };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: Y_NEG_90 };
  jd.enableLimit = true;
  jd.lowerTranslation = -LIMIT;
  jd.upperTranslation = LIMIT;
  jd.enableMotor = true;
  jd.maxMotorForce = MAX_MOTOR_FORCE;
  jd.motorSpeed = direction * MOTOR_SPEED;
  b3.b3CreatePrismaticJoint(world, jd);

  for (let i = 0; i < 30; i++) b3.b3World_Step(world, DT, SUBSTEPS);
  const p = positionOf(slider);
  b3.b3DestroyWorld(world);
  return p;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4) {
  throw new Error('E6.0a expected current Donor-v1 fixed-step substrate; requalify calibration');
}

const positive = run(1);
const negative = run(-1);

console.log('E6.0a prismatic binding calibration');
console.log(`  +motor -> [${positive.map((v) => v.toFixed(6)).join(', ')}]`);
console.log(`  -motor -> [${negative.map((v) => v.toFixed(6)).join(', ')}]`);

for (const [label, p, sign] of [['+', positive, 1], ['-', negative, -1]]) {
  if (Math.abs(p[0]) > 1e-4 || Math.abs(p[1]) > 1e-4) {
    throw new Error(`E6.0a ${label} prismatic leaked off the intended world-Z axis`);
  }
  const signedZ = sign * p[2];
  if (signedZ < LIMIT - 0.02 || signedZ > LIMIT + 0.02) {
    throw new Error(`E6.0a ${label} motor/limit did not reach mirrored bounded translation: z=${p[2]}`);
  }
}

if (Math.abs(positive[2] + negative[2]) > 0.01) {
  throw new Error('E6.0a mirrored motor directions are not symmetric enough for the bounded relocation probe');
}

console.log('E6.0a PASS: box3d.js@0.1.1 exposes a mirrored, motorized, force-bounded prismatic DOF aligned with the project sagittal Z axis. This qualifies only the binding/substrate; it is not yet support relocation evidence.');
