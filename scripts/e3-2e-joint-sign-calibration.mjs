import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const Z_TO_X_QUAT = [0, Math.SQRT1_2, 0, Math.SQRT1_2];

function density(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeBody(world, mass) {
  const half = [0.26, 0.55, 0.20];
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, 0, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = density(mass, half);
  sd.filter.maskBits = 0n;
  b3.b3CreateBoxShape(body, sd, ...half);
  return body;
}

function run(sign) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(wd);
  const torso = makeBody(world, 60);
  const internal = makeBody(world, 10);

  const jd = b3.b3DefaultRevoluteJointDef();
  jd.base.bodyIdA = torso;
  jd.base.bodyIdB = internal;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_X_QUAT };
  jd.enableLimit = true;
  jd.lowerAngle = -1.2;
  jd.upperAngle = 1.2;
  const joint = b3.b3CreateRevoluteJoint(world, jd);

  b3.b3World_Step(world, dt, substeps);
  const beforeAngle = b3.b3RevoluteJoint_GetAngle(joint);
  const impulse = sign * 1.0;
  b3.b3Body_ApplyAngularImpulse(torso, [impulse, 0, 0], true);
  b3.b3Body_ApplyAngularImpulse(internal, [-impulse, 0, 0], true);
  b3.b3World_Step(world, dt, substeps);

  const torsoW = [0, 0, 0];
  const internalW = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(torsoW, torso);
  b3.b3Body_GetAngularVelocity(internalW, internal);
  const angle = b3.b3RevoluteJoint_GetAngle(joint);
  const relWx = internalW[0] - torsoW[0];
  const result = {
    sign,
    angleDelta: angle - beforeAngle,
    torsoWx: torsoW[0],
    internalWx: internalW[0],
    relWx,
  };
  b3.b3DestroyWorld(world);
  return result;
}

const plus = run(1);
const minus = run(-1);
for (const r of [plus, minus]) {
  console.log(`E3.2e hipTorqueSign=${r.sign > 0 ? '+' : '-'} => dJointAngle=${r.angleDelta.toFixed(6)}rad torsoWx=${r.torsoWx.toFixed(6)} internalWx=${r.internalWx.toFixed(6)} relWx(B-A)=${r.relWx.toFixed(6)}`);
}

if (Math.sign(plus.angleDelta) !== -Math.sign(minus.angleDelta) || Math.sign(plus.relWx) !== -Math.sign(minus.relWx)) {
  throw new Error('E3.2e revolute sign response is not mirrored.');
}
if (Math.sign(plus.angleDelta) !== Math.sign(plus.relWx) || Math.sign(minus.angleDelta) !== Math.sign(minus.relWx)) {
  throw new Error(`E3.2e GetAngle sign does not match B-A relative angular velocity: +(${plus.angleDelta}/${plus.relWx}) -(${minus.angleDelta}/${minus.relWx})`);
}
if (Math.sign(plus.angleDelta) === Math.sign(plus.sign)) {
  console.log('E3.2e convention: positive torso / negative internal impulse drives positive reported joint angle.');
} else {
  console.log('E3.2e convention: positive torso / negative internal impulse drives negative reported joint angle.');
}
console.log('E3.2e PASS: exact revolute GetAngle and B-A relative-omega sign convention qualified for the E3.2 joint frame.');
