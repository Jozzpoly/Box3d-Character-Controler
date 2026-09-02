import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const INITIAL_LENGTH = 1.0;
const MIN_LENGTH = 0.75;
const MAX_LENGTH = 1.25;
const MOTOR_SPEED = 2.0;
const MAX_MOTOR_FORCE = 200;
const BODY_MASS = 20;
const BODY_HALF = [0.1, 0.1, 0.1];
const FRAMES = 120;

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeRig(motorSign) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(wd);

  const anchorDef = b3.b3DefaultBodyDef();
  anchorDef.position = [0, 0, 0];
  const anchor = b3.b3CreateBody(world, anchorDef);

  const sliderDef = b3.b3DefaultBodyDef();
  sliderDef.type = b3.b3BodyType.b3_dynamicBody;
  sliderDef.position = [0, 0, INITIAL_LENGTH];
  sliderDef.enableSleep = false;
  sliderDef.linearDamping = 0;
  sliderDef.angularDamping = 0;
  sliderDef.motionLocks.linearX = true;
  sliderDef.motionLocks.linearY = true;
  sliderDef.motionLocks.angularX = true;
  sliderDef.motionLocks.angularY = true;
  sliderDef.motionLocks.angularZ = true;
  const slider = b3.b3CreateBody(world, sliderDef);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForMass(BODY_MASS, BODY_HALF);
  sd.filter.maskBits = 0n;
  b3.b3CreateBoxShape(slider, sd, ...BODY_HALF);

  const jd = b3.b3DefaultDistanceJointDef();
  jd.base.bodyIdA = anchor;
  jd.base.bodyIdB = slider;
  jd.base.localFrameA = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  jd.base.localFrameB = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  jd.length = INITIAL_LENGTH;
  jd.enableSpring = false;
  jd.enableLimit = true;
  jd.minLength = MIN_LENGTH;
  jd.maxLength = MAX_LENGTH;
  jd.enableMotor = true;
  jd.motorSpeed = motorSign * MOTOR_SPEED;
  jd.maxMotorForce = MAX_MOTOR_FORCE;
  const joint = b3.b3CreateDistanceJoint(world, jd);

  return { world, slider, joint };
}

function run(motorSign) {
  const rig = makeRig(motorSign);
  const com = [0, 0, 0];
  let minLength = Infinity;
  let maxLength = -Infinity;
  let peakAbsMotorForce = 0;
  let maxAbsX = 0;
  let maxAbsY = 0;

  for (let frame = 0; frame < FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    const length = b3.b3DistanceJoint_GetCurrentLength(rig.joint);
    const motorForce = b3.b3DistanceJoint_GetMotorForce(rig.joint);
    b3.b3Body_GetWorldCenterOfMass(com, rig.slider);

    minLength = Math.min(minLength, length);
    maxLength = Math.max(maxLength, length);
    peakAbsMotorForce = Math.max(peakAbsMotorForce, Math.abs(motorForce));
    maxAbsX = Math.max(maxAbsX, Math.abs(com[0]));
    maxAbsY = Math.max(maxAbsY, Math.abs(com[1]));
  }

  const finalLength = b3.b3DistanceJoint_GetCurrentLength(rig.joint);
  const configuredSpeed = b3.b3DistanceJoint_GetMotorSpeed(rig.joint);
  const configuredForce = b3.b3DistanceJoint_GetMaxMotorForce(rig.joint);
  b3.b3DestroyWorld(rig.world);

  return {
    motorSign,
    finalLength,
    minLength,
    maxLength,
    peakAbsMotorForce,
    maxAbsX,
    maxAbsY,
    configuredSpeed,
    configuredForce,
  };
}

const extend = run(1);
const compress = run(-1);

console.log('E8.0a distance-joint axial binding calibration');
for (const row of [extend, compress]) {
  console.log(
    `  motor=${row.motorSign > 0 ? '+' : '-'}${MOTOR_SPEED.toFixed(1)}m/s ` +
    `final=${row.finalLength.toFixed(6)}m range=${row.minLength.toFixed(6)}..${row.maxLength.toFixed(6)}m ` +
    `peak|Fmotor|=${row.peakAbsMotorForce.toFixed(3)}N config=${row.configuredSpeed.toFixed(3)}m/s/${row.configuredForce.toFixed(1)}N ` +
    `leakXY=${row.maxAbsX.toExponential(2)}/${row.maxAbsY.toExponential(2)}m`,
  );
}

const LENGTH_TOL = 0.003;
const FORCE_TOL = 1.0;
const LEAK_TOL = 1e-6;

if (Math.abs(extend.configuredSpeed - MOTOR_SPEED) > 1e-9) {
  throw new Error('E8.0a positive distance-joint motor speed did not bind');
}
if (Math.abs(compress.configuredSpeed + MOTOR_SPEED) > 1e-9) {
  throw new Error('E8.0a negative distance-joint motor speed did not bind');
}
if (
  Math.abs(extend.configuredForce - MAX_MOTOR_FORCE) > 1e-9 ||
  Math.abs(compress.configuredForce - MAX_MOTOR_FORCE) > 1e-9
) {
  throw new Error('E8.0a max motor force did not bind');
}
if (Math.abs(extend.finalLength - MAX_LENGTH) > LENGTH_TOL) {
  throw new Error(`E8.0a extension did not reach bounded max length: ${extend.finalLength}`);
}
if (Math.abs(compress.finalLength - MIN_LENGTH) > LENGTH_TOL) {
  throw new Error(`E8.0a compression did not reach bounded min length: ${compress.finalLength}`);
}
if (
  extend.maxLength > MAX_LENGTH + LENGTH_TOL ||
  compress.minLength < MIN_LENGTH - LENGTH_TOL
) {
  throw new Error('E8.0a distance limits were materially violated');
}
if (
  extend.peakAbsMotorForce > MAX_MOTOR_FORCE + FORCE_TOL ||
  compress.peakAbsMotorForce > MAX_MOTOR_FORCE + FORCE_TOL
) {
  throw new Error('E8.0a measured motor force exceeded configured finite cap');
}
if (
  extend.peakAbsMotorForce < 0.5 * MAX_MOTOR_FORCE ||
  compress.peakAbsMotorForce < 0.5 * MAX_MOTOR_FORCE
) {
  throw new Error('E8.0a force-bounded motor did not materially load against the specimen');
}
if (
  extend.maxAbsX > LEAK_TOL || extend.maxAbsY > LEAK_TOL ||
  compress.maxAbsX > LEAK_TOL || compress.maxAbsY > LEAK_TOL
) {
  throw new Error('E8.0a isolated axial specimen leaked into locked transverse axes');
}

console.log(
  'E8.0a PASS: box3d.js@0.1.1 exposes a bidirectional, length-limited, finite-force distance-joint motor that cleanly acts along the isolated axial degree of freedom. This qualifies only the binding primitive; it does not yet qualify a parallel support representation, ground loading, or locomotion.',
);
