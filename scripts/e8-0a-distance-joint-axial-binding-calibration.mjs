import Box3D from 'box3d.js/inline';
import { DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;

const REST_LENGTH = 1.0;
const COMPRESSION_LENGTH = 0.8;
const TENSION_LENGTH = 1.2;
const BODY_MASS = 20;
const BODY_HALF = [0.1, 0.1, 0.1];
const SPRING_HZ = 8;
const DAMPING_RATIO = 1;
const LOWER_SPRING_FORCE = 0;
const UPPER_SPRING_FORCE = 200;
const SAMPLE_FRAMES = 6;

// For a static anchor + 20 kg body with COM anchors, the axial effective mass is
// 20 kg. At 8 Hz and 0.2 m compression the corresponding undamped linear spring
// demand is ~10 kN, >50x the declared 200 N compression cap. This makes force-cap
// engagement a derived expectation rather than a parameter sweep.
const OMEGA = 2 * Math.PI * SPRING_HZ;
const INITIAL_UNCAPPED_COMPRESSION_FORCE =
  BODY_MASS * OMEGA * OMEGA * (REST_LENGTH - COMPRESSION_LENGTH);

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeRig(mode, side) {
  const initialLength = mode === 'compression' ? COMPRESSION_LENGTH : TENSION_LENGTH;

  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(wd);

  const anchorDef = b3.b3DefaultBodyDef();
  anchorDef.position = [0, 0, 0];
  const anchor = b3.b3CreateBody(world, anchorDef);

  const sliderDef = b3.b3DefaultBodyDef();
  sliderDef.type = b3.b3BodyType.b3_dynamicBody;
  sliderDef.position = [0, 0, side * initialLength];
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
  jd.length = REST_LENGTH;
  jd.enableSpring = true;
  jd.lowerSpringForce = LOWER_SPRING_FORCE;
  jd.upperSpringForce = UPPER_SPRING_FORCE;
  jd.hertz = SPRING_HZ;
  jd.dampingRatio = DAMPING_RATIO;
  jd.enableLimit = false;
  jd.enableMotor = false;
  const joint = b3.b3CreateDistanceJoint(world, jd);

  // Exercise the runtime binding as well as the definition fields. The causal
  // behavior below is the real validation: if this range does not bind, tension
  // will restore and/or compression will exceed the finite cap.
  b3.b3DistanceJoint_SetSpringForceRange(
    joint,
    LOWER_SPRING_FORCE,
    UPPER_SPRING_FORCE,
  );

  return { world, slider, joint, initialLength, mode, side };
}

function run(mode, side) {
  const rig = makeRig(mode, side);
  const force = [0, 0, 0];
  const com = [0, 0, 0];

  let peakAbsAxialForce = 0;
  let peakTransverseForce = 0;
  let maxAbsX = 0;
  let maxAbsY = 0;
  let minLength = Infinity;
  let maxLength = -Infinity;

  for (let frame = 0; frame < SAMPLE_FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    b3.b3Joint_GetConstraintForce(force, rig.joint);
    b3.b3Body_GetWorldCenterOfMass(com, rig.slider);
    const length = b3.b3DistanceJoint_GetCurrentLength(rig.joint);

    peakAbsAxialForce = Math.max(peakAbsAxialForce, Math.abs(force[2]));
    peakTransverseForce = Math.max(
      peakTransverseForce,
      Math.hypot(force[0], force[1]),
    );
    maxAbsX = Math.max(maxAbsX, Math.abs(com[0]));
    maxAbsY = Math.max(maxAbsY, Math.abs(com[1]));
    minLength = Math.min(minLength, length);
    maxLength = Math.max(maxLength, length);
  }

  const finalLength = b3.b3DistanceJoint_GetCurrentLength(rig.joint);
  const finalCom = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(finalCom, rig.slider);
  const signedFinalRadialPosition = side * finalCom[2];

  const springEnabled = b3.b3DistanceJoint_IsSpringEnabled(rig.joint);
  const limitEnabled = b3.b3DistanceJoint_IsLimitEnabled(rig.joint);
  const motorEnabled = b3.b3DistanceJoint_IsMotorEnabled(rig.joint);
  const configuredHertz = b3.b3DistanceJoint_GetSpringHertz(rig.joint);
  const configuredDamping = b3.b3DistanceJoint_GetSpringDampingRatio(rig.joint);

  b3.b3DestroyWorld(rig.world);

  return {
    mode,
    side,
    initialLength: rig.initialLength,
    finalLength,
    signedFinalRadialPosition,
    minLength,
    maxLength,
    peakAbsAxialForce,
    peakTransverseForce,
    maxAbsX,
    maxAbsY,
    springEnabled,
    limitEnabled,
    motorEnabled,
    configuredHertz,
    configuredDamping,
  };
}

if (DT !== 1 / 60 || SUBSTEPS !== 4) {
  throw new Error('E8.0a expected current Donor-v1 fixed-step substrate; requalify calibration');
}

for (const fn of [
  'b3DefaultDistanceJointDef',
  'b3CreateDistanceJoint',
  'b3DistanceJoint_SetSpringForceRange',
  'b3Joint_GetConstraintForce',
]) {
  if (typeof b3[fn] !== 'function') {
    throw new Error(`E8.0a requires ${fn} in box3d.js@0.1.1`);
  }
}

if (INITIAL_UNCAPPED_COMPRESSION_FORCE < 50 * UPPER_SPRING_FORCE) {
  throw new Error('E8.0a derived compression demand no longer cleanly exceeds the finite force cap');
}

const rows = [
  run('compression', 1),
  run('compression', -1),
  run('tension', 1),
  run('tension', -1),
];

console.log('E8.0a unilateral axial-compliance binding calibration');
console.log(
  `  derived initial uncapped compression demand=${INITIAL_UNCAPPED_COMPRESSION_FORCE.toFixed(1)}N ` +
  `vs finite cap=${UPPER_SPRING_FORCE.toFixed(1)}N`,
);
for (const row of rows) {
  console.log(
    `  ${row.mode.padEnd(11)} side=${row.side > 0 ? '+' : '-'}Z ` +
    `length=${row.initialLength.toFixed(6)}→${row.finalLength.toFixed(6)}m ` +
    `range=${row.minLength.toFixed(6)}..${row.maxLength.toFixed(6)}m ` +
    `peak|Faxial|=${row.peakAbsAxialForce.toFixed(3)}N ` +
    `peakFxy=${row.peakTransverseForce.toExponential(2)}N ` +
    `leakXY=${row.maxAbsX.toExponential(2)}/${row.maxAbsY.toExponential(2)}m`,
  );
}

const FORCE_CAP_TOL = 1.0;
const FORCE_SATURATION_MIN = 0.95 * UPPER_SPRING_FORCE;
const TENSION_FORCE_MAX = 0.1;
const COMPRESSION_OUTWARD_MIN = 0.02;
const TENSION_MOTION_MAX = 1e-6;
const LEAK_TOL = 1e-6;
const TRANSVERSE_FORCE_TOL = 1e-3;

for (const row of rows) {
  if (!row.springEnabled || row.limitEnabled || row.motorEnabled) {
    throw new Error(
      `E8.0a ${row.mode}/${row.side} did not preserve spring-only distance-joint semantics`,
    );
  }
  if (Math.abs(row.configuredHertz - SPRING_HZ) > 1e-9) {
    throw new Error(`E8.0a ${row.mode}/${row.side} spring hertz did not bind`);
  }
  if (Math.abs(row.configuredDamping - DAMPING_RATIO) > 1e-9) {
    throw new Error(`E8.0a ${row.mode}/${row.side} damping ratio did not bind`);
  }
  if (row.maxAbsX > LEAK_TOL || row.maxAbsY > LEAK_TOL) {
    throw new Error(`E8.0a ${row.mode}/${row.side} leaked off the isolated axial DOF`);
  }
  if (row.peakTransverseForce > TRANSVERSE_FORCE_TOL) {
    throw new Error(`E8.0a ${row.mode}/${row.side} produced material transverse constraint force`);
  }
}

for (const row of rows.filter((candidate) => candidate.mode === 'compression')) {
  if (row.peakAbsAxialForce > UPPER_SPRING_FORCE + FORCE_CAP_TOL) {
    throw new Error(
      `E8.0a compression/${row.side} exceeded finite compression cap: ${row.peakAbsAxialForce}`,
    );
  }
  if (row.peakAbsAxialForce < FORCE_SATURATION_MIN) {
    throw new Error(
      `E8.0a compression/${row.side} did not materially engage the derived finite compression cap: ${row.peakAbsAxialForce}`,
    );
  }
  if (row.finalLength - row.initialLength < COMPRESSION_OUTWARD_MIN) {
    throw new Error(
      `E8.0a compression/${row.side} did not push the body outward under compression-only load`,
    );
  }
  if (row.signedFinalRadialPosition <= row.initialLength) {
    throw new Error(
      `E8.0a compression/${row.side} axial response was not outward from the anchor`,
    );
  }
}

for (const row of rows.filter((candidate) => candidate.mode === 'tension')) {
  if (row.peakAbsAxialForce > TENSION_FORCE_MAX) {
    throw new Error(
      `E8.0a tension/${row.side} developed forbidden tensile restoring force: ${row.peakAbsAxialForce}`,
    );
  }
  if (Math.abs(row.finalLength - row.initialLength) > TENSION_MOTION_MAX) {
    throw new Error(
      `E8.0a tension/${row.side} moved despite zero permitted tensile spring force`,
    );
  }
}

const compressionRows = rows.filter((row) => row.mode === 'compression');
const tensionRows = rows.filter((row) => row.mode === 'tension');
if (Math.abs(compressionRows[0].finalLength - compressionRows[1].finalLength) > 1e-6) {
  throw new Error('E8.0a mirrored compression response is not symmetric');
}
if (Math.abs(compressionRows[0].peakAbsAxialForce - compressionRows[1].peakAbsAxialForce) > 1e-3) {
  throw new Error('E8.0a mirrored compression force is not symmetric');
}
if (Math.abs(tensionRows[0].finalLength - tensionRows[1].finalLength) > 1e-6) {
  throw new Error('E8.0a mirrored tension response is not symmetric');
}

console.log(
  'E8.0a PASS: box3d.js@0.1.1 exposes a mirrored spring-only distance-joint primitive with finite compression force and effectively zero tensile authority in the isolated axial specimen. This qualifies only unilateral axial compliance; it does not qualify an embodied support representation, ground load sharing, or locomotion.',
);
