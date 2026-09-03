import Box3D from 'box3d.js/inline';
import {
  DONOR_PROFILE_V1,
  DONOR_QUALIFIED_ENVELOPE_V1,
} from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const GRAVITY = DONOR_PROFILE_V1.gravity;

// E8.0b qualifies only the composition of two already-available constraint roles:
// 1) a prismatic guide removes five relative DOFs and exposes one axial DOF;
// 2) the E8.0a distance spring acts on that remaining axial DOF with finite
//    compression and zero tension.
//
// The prismatic spring and motor are deliberately disabled. Its upper travel stop
// may carry the pad's own weight while hanging at full extension. When the
// telescope is compressed inside the travel range, that stop must disengage and
// the distance spring must be the only material axial force source.
//
// Pinned-substrate telemetry qualification:
// erincatto/box3d@8441b4a... computes prismatic translation/solver axis from
// local-frame X, but b3GetPrismaticJointForce packs the axial impulse into the
// local Z component before rotating it to world space. Therefore the generic
// b3Joint_GetConstraintForce vector cannot be projected onto the physical
// prismatic axis as if its direction were authoritative. For the guide only, this
// gate uses reported force MAGNITUDE to detect whether the limit is carrying load.
// Geometry/translation remain authority for the actual guide axis.

const PAD_MASS = 1.0;
const PAD_HALF = [0.1, 0.1, 0.1];
const REST_LENGTH = 1.0;
const MIN_EXTENSION = 0.70;
const MAX_EXTENSION = REST_LENGTH;
const COMPRESSION_LENGTH = 0.80;

const SPRING_HZ = 8;
const DAMPING_RATIO = 1;
const LOWER_SPRING_FORCE = 0;
const UPPER_SPRING_FORCE = 200;

const SUSPEND_SETTLE_FRAMES = 120;
const SUSPEND_SAMPLE_FRAMES = 60;
const COMPRESSION_SAMPLE_FRAMES = 1;

const AXIS = [0, -1, 0];
const Z_NEG_90 = [0, 0, -Math.SQRT1_2, Math.SQRT1_2];

// Classical k*x is retained only as a scale diagnostic. Box3D's spring is an
// implicit soft constraint (biasRate/massScale/impulseScale), so this is not an
// expected b3Joint_GetConstraintForce value after a complete outer step.
const OMEGA = 2 * Math.PI * SPRING_HZ;
const CLASSICAL_KX_SCALE =
  PAD_MASS * OMEGA * OMEGA * (REST_LENGTH - COMPRESSION_LENGTH);
const PAD_WEIGHT = PAD_MASS * GRAVITY;

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function magnitude(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function transverseMagnitude(v, axis) {
  const axial = dot(v, axis);
  const tx = v[0] - axial * axis[0];
  const ty = v[1] - axial * axis[1];
  const tz = v[2] - axial * axis[2];
  return Math.hypot(tx, ty, tz);
}

function formatVec(v) {
  return `[${v.map((n) => n.toFixed(3)).join(',')}]`;
}

function makeCompositeRig({ gravity, initialLength }) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, gravity, 0];
  const world = b3.b3CreateWorld(wd);

  const parentDef = b3.b3DefaultBodyDef();
  parentDef.position = [0, 0, 0];
  const parent = b3.b3CreateBody(world, parentDef);

  const padDef = b3.b3DefaultBodyDef();
  padDef.type = b3.b3BodyType.b3_dynamicBody;
  padDef.position = [0, -initialLength, 0];
  padDef.enableSleep = false;
  padDef.linearDamping = 0;
  padDef.angularDamping = 0;
  const pad = b3.b3CreateBody(world, padDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForMass(PAD_MASS, PAD_HALF);
  shapeDef.filter.maskBits = 0n;
  b3.b3CreateBoxShape(pad, shapeDef, ...PAD_HALF);

  const prismaticDef = b3.b3DefaultPrismaticJointDef();
  prismaticDef.base.bodyIdA = parent;
  prismaticDef.base.bodyIdB = pad;
  prismaticDef.base.localFrameA = {
    position: [0, 0, 0],
    quaternion: Z_NEG_90,
  };
  prismaticDef.base.localFrameB = {
    position: [0, 0, 0],
    quaternion: Z_NEG_90,
  };
  prismaticDef.enableSpring = false;
  prismaticDef.enableLimit = true;
  prismaticDef.lowerTranslation = MIN_EXTENSION;
  prismaticDef.upperTranslation = MAX_EXTENSION;
  prismaticDef.enableMotor = false;
  const guideJoint = b3.b3CreatePrismaticJoint(world, prismaticDef);

  const distanceDef = b3.b3DefaultDistanceJointDef();
  distanceDef.base.bodyIdA = parent;
  distanceDef.base.bodyIdB = pad;
  distanceDef.base.localFrameA = {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
  };
  distanceDef.base.localFrameB = {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
  };
  distanceDef.length = REST_LENGTH;
  distanceDef.enableSpring = true;
  distanceDef.lowerSpringForce = LOWER_SPRING_FORCE;
  distanceDef.upperSpringForce = UPPER_SPRING_FORCE;
  distanceDef.hertz = SPRING_HZ;
  distanceDef.dampingRatio = DAMPING_RATIO;
  distanceDef.enableLimit = false;
  distanceDef.enableMotor = false;
  const complianceJoint = b3.b3CreateDistanceJoint(world, distanceDef);
  b3.b3DistanceJoint_SetSpringForceRange(
    complianceJoint,
    LOWER_SPRING_FORCE,
    UPPER_SPRING_FORCE,
  );

  return { world, pad, guideJoint, complianceJoint };
}

function sample(rig) {
  const guideForce = [0, 0, 0];
  const complianceForce = [0, 0, 0];
  const com = [0, 0, 0];

  b3.b3Joint_GetConstraintForce(guideForce, rig.guideJoint);
  b3.b3Joint_GetConstraintForce(complianceForce, rig.complianceJoint);
  b3.b3Body_GetWorldCenterOfMass(com, rig.pad);

  return {
    translation: b3.b3PrismaticJoint_GetTranslation(rig.guideJoint),
    length: b3.b3DistanceJoint_GetCurrentLength(rig.complianceJoint),
    guideForce: [...guideForce],
    guideReportedMagnitude: magnitude(guideForce),
    guidePhysicalAxisProjection: dot(guideForce, AXIS),
    complianceForce: [...complianceForce],
    complianceAxial: dot(complianceForce, AXIS),
    complianceTransverse: transverseMagnitude(complianceForce, AXIS),
    com,
  };
}

function commonState(rig) {
  return {
    guideSpringEnabled: b3.b3PrismaticJoint_IsSpringEnabled(rig.guideJoint),
    guideLimitEnabled: b3.b3PrismaticJoint_IsLimitEnabled(rig.guideJoint),
    guideMotorEnabled: b3.b3PrismaticJoint_IsMotorEnabled(rig.guideJoint),
    complianceSpringEnabled: b3.b3DistanceJoint_IsSpringEnabled(rig.complianceJoint),
    complianceLimitEnabled: b3.b3DistanceJoint_IsLimitEnabled(rig.complianceJoint),
    complianceMotorEnabled: b3.b3DistanceJoint_IsMotorEnabled(rig.complianceJoint),
  };
}

function runSuspension() {
  const rig = makeCompositeRig({ gravity: -GRAVITY, initialLength: MAX_EXTENSION });

  for (let frame = 0; frame < SUSPEND_SETTLE_FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
  }

  let sumGuideMagnitude = 0;
  let sumAbsComplianceAxial = 0;
  let peakAbsComplianceAxial = 0;
  let peakComplianceTransverse = 0;
  let minTranslation = Infinity;
  let maxTranslation = -Infinity;
  let maxAbsX = 0;
  let maxAbsZ = 0;

  for (let frame = 0; frame < SUSPEND_SAMPLE_FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    const row = sample(rig);
    sumGuideMagnitude += row.guideReportedMagnitude;
    sumAbsComplianceAxial += Math.abs(row.complianceAxial);
    peakAbsComplianceAxial = Math.max(peakAbsComplianceAxial, Math.abs(row.complianceAxial));
    peakComplianceTransverse = Math.max(peakComplianceTransverse, row.complianceTransverse);
    minTranslation = Math.min(minTranslation, row.translation);
    maxTranslation = Math.max(maxTranslation, row.translation);
    maxAbsX = Math.max(maxAbsX, Math.abs(row.com[0]));
    maxAbsZ = Math.max(maxAbsZ, Math.abs(row.com[2]));
  }

  const final = sample(rig);
  const result = {
    finalTranslation: final.translation,
    finalLength: final.length,
    finalGuideForce: final.guideForce,
    finalGuidePhysicalAxisProjection: final.guidePhysicalAxisProjection,
    finalComplianceForce: final.complianceForce,
    meanGuideMagnitude: sumGuideMagnitude / SUSPEND_SAMPLE_FRAMES,
    meanAbsComplianceAxial: sumAbsComplianceAxial / SUSPEND_SAMPLE_FRAMES,
    peakAbsComplianceAxial,
    peakComplianceTransverse,
    minTranslation,
    maxTranslation,
    maxAbsX,
    maxAbsZ,
    ...commonState(rig),
  };

  b3.b3DestroyWorld(rig.world);
  return result;
}

function runCompressionInterior() {
  const rig = makeCompositeRig({ gravity: 0, initialLength: COMPRESSION_LENGTH });

  let peakGuideMagnitude = 0;
  let peakAbsComplianceAxial = 0;
  let peakComplianceTransverse = 0;
  let maxAbsX = 0;
  let maxAbsZ = 0;

  for (let frame = 0; frame < COMPRESSION_SAMPLE_FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    const row = sample(rig);
    peakGuideMagnitude = Math.max(peakGuideMagnitude, row.guideReportedMagnitude);
    peakAbsComplianceAxial = Math.max(peakAbsComplianceAxial, Math.abs(row.complianceAxial));
    peakComplianceTransverse = Math.max(peakComplianceTransverse, row.complianceTransverse);
    maxAbsX = Math.max(maxAbsX, Math.abs(row.com[0]));
    maxAbsZ = Math.max(maxAbsZ, Math.abs(row.com[2]));
  }

  const final = sample(rig);
  const result = {
    initialLength: COMPRESSION_LENGTH,
    finalTranslation: final.translation,
    finalLength: final.length,
    finalGuideForce: final.guideForce,
    finalGuidePhysicalAxisProjection: final.guidePhysicalAxisProjection,
    finalComplianceForce: final.complianceForce,
    peakGuideMagnitude,
    peakAbsComplianceAxial,
    peakComplianceTransverse,
    maxAbsX,
    maxAbsZ,
    ...commonState(rig),
  };

  b3.b3DestroyWorld(rig.world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || GRAVITY !== 20) {
  throw new Error(
    'E8.0b expected current Donor-v1 fixed-step/gravity substrate; requalify composite binding',
  );
}

for (const fn of [
  'b3DefaultPrismaticJointDef',
  'b3CreatePrismaticJoint',
  'b3PrismaticJoint_GetTranslation',
  'b3DefaultDistanceJointDef',
  'b3CreateDistanceJoint',
  'b3DistanceJoint_SetSpringForceRange',
  'b3Joint_GetConstraintForce',
]) {
  if (typeof b3[fn] !== 'function') {
    throw new Error(`E8.0b requires ${fn} in box3d.js@0.1.1`);
  }
}

const suspension = runSuspension();
const compression = runCompressionInterior();

console.log('E8.0b telescopic guide + unilateral compliance binding gate');
console.log(
  `  pad=${PAD_MASS.toFixed(1)}kg gravity=${GRAVITY.toFixed(1)}m/s² ` +
    `weight=${PAD_WEIGHT.toFixed(1)}N extension=${MIN_EXTENSION.toFixed(2)}..${MAX_EXTENSION.toFixed(2)}m`,
);
console.log(
  `  classical k*x scale at 0.20m compression=${CLASSICAL_KX_SCALE.toFixed(1)}N; ` +
    `implicit soft-constraint output is not expected to equal this after one outer step`,
);
console.log(
  `  suspension: translation=${suspension.finalTranslation.toFixed(6)}m ` +
    `range=${suspension.minTranslation.toFixed(6)}..${suspension.maxTranslation.toFixed(6)}m ` +
    `distance=${suspension.finalLength.toFixed(6)}m ` +
    `mean|Fguide reported|=${suspension.meanGuideMagnitude.toFixed(3)}N ` +
    `guideRaw=${formatVec(suspension.finalGuideForce)} ` +
    `guideDotPhysicalAxis=${suspension.finalGuidePhysicalAxisProjection.toFixed(3)}N ` +
    `mean|Fspring axial|=${suspension.meanAbsComplianceAxial.toFixed(3)}N ` +
    `springRaw=${formatVec(suspension.finalComplianceForce)}`,
);
console.log(
  `  compression interior: length=${compression.initialLength.toFixed(6)}→${compression.finalLength.toFixed(6)}m ` +
    `translation=${compression.finalTranslation.toFixed(6)}m ` +
    `peak|Fguide reported|=${compression.peakGuideMagnitude.toFixed(3)}N ` +
    `guideRaw=${formatVec(compression.finalGuideForce)} ` +
    `peak|Fspring axial|=${compression.peakAbsComplianceAxial.toFixed(3)}N ` +
    `springRaw=${formatVec(compression.finalComplianceForce)}`,
);

const EXTENSION_TOL = 0.005;
const GUIDE_WEIGHT_FORCE_TOL = 2.0;
const FORBIDDEN_TENSION_FORCE_MAX = 0.1;
const MATERIAL_COMPRESSION_FORCE_MIN = PAD_WEIGHT;
const COMPRESSION_FORCE_MAX = UPPER_SPRING_FORCE + 1.0;
const GUIDE_INTERIOR_FORCE_MAX = 1.0;
const INTERIOR_STOP_MARGIN = 0.05;
const COMPLIANCE_TRANSVERSE_FORCE_MAX = 1e-3;
const TRANSVERSE_LEAK_MAX = 1e-6;

for (const [label, row] of [['suspension', suspension], ['compression', compression]]) {
  if (row.guideSpringEnabled || !row.guideLimitEnabled || row.guideMotorEnabled) {
    throw new Error(`E8.0b ${label} prismatic guide did not remain limit-only`);
  }
  if (!row.complianceSpringEnabled || row.complianceLimitEnabled || row.complianceMotorEnabled) {
    throw new Error(`E8.0b ${label} distance compliance did not remain spring-only`);
  }
  if (row.peakComplianceTransverse > COMPLIANCE_TRANSVERSE_FORCE_MAX) {
    throw new Error(`E8.0b ${label} distance spring produced material transverse force`);
  }
  if (row.maxAbsX > TRANSVERSE_LEAK_MAX || row.maxAbsZ > TRANSVERSE_LEAK_MAX) {
    throw new Error(`E8.0b ${label} leaked off the telescopic guide axis`);
  }
}

if (
  Math.abs(suspension.finalTranslation - MAX_EXTENSION) > EXTENSION_TOL ||
  suspension.minTranslation < MAX_EXTENSION - EXTENSION_TOL ||
  suspension.maxTranslation > MAX_EXTENSION + EXTENSION_TOL
) {
  throw new Error(`E8.0b extension stop did not suspend the pad near full extension: ${suspension.finalTranslation}`);
}
if (Math.abs(suspension.finalLength - MAX_EXTENSION) > EXTENSION_TOL) {
  throw new Error(`E8.0b suspended distance did not remain near the zero-tension rest length: ${suspension.finalLength}`);
}
if (Math.abs(suspension.meanGuideMagnitude - PAD_WEIGHT) > GUIDE_WEIGHT_FORCE_TOL) {
  throw new Error(
    `E8.0b reported prismatic reaction magnitude did not match the pad's derived weight: guide=${suspension.meanGuideMagnitude} expected=${PAD_WEIGHT}`,
  );
}
if (
  suspension.meanAbsComplianceAxial > FORBIDDEN_TENSION_FORCE_MAX ||
  suspension.peakAbsComplianceAxial > FORBIDDEN_TENSION_FORCE_MAX
) {
  throw new Error(`E8.0b compression-only spring developed forbidden suspension tension: peak=${suspension.peakAbsComplianceAxial}`);
}

if (compression.finalTranslation >= MAX_EXTENSION - INTERIOR_STOP_MARGIN) {
  throw new Error(
    `E8.0b compression specimen reached the prismatic extension stop; axial-role separation is confounded: ${compression.finalTranslation}`,
  );
}
if (compression.peakGuideMagnitude > GUIDE_INTERIOR_FORCE_MAX) {
  throw new Error(
    `E8.0b prismatic guide carried material constraint load while interior to travel: ${compression.peakGuideMagnitude}`,
  );
}
if (
  compression.peakAbsComplianceAxial <= MATERIAL_COMPRESSION_FORCE_MIN ||
  compression.peakAbsComplianceAxial > COMPRESSION_FORCE_MAX
) {
  throw new Error(
    `E8.0b distance spring did not provide material bounded compression above the 1kg pad-weight scale while interior to guide travel: ${compression.peakAbsComplianceAxial}`,
  );
}
if (compression.finalLength <= compression.initialLength) {
  throw new Error('E8.0b finite compression spring did not push the pad outward along the free guide DOF');
}

console.log(
  'E8.0b PASS: a limit-only prismatic guide can suspend a real distal mass at an internal extension stop while the E8.0a distance spring remains effectively tension-free; inside guide travel the stop disengages and the finite compression-only distance spring supplies material axial reaction while the guide reports no material constraint load. This qualifies composite telescopic constraint semantics only; it does not yet qualify an embodied parallel limb, ground support, load sharing, or locomotion.',
);
