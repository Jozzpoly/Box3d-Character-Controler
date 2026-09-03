import Box3D from 'box3d.js/inline';
import {
  DONOR_PROFILE_V1,
  DONOR_QUALIFIED_ENVELOPE_V1,
} from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const GRAVITY = DONOR_PROFILE_V1.gravity;

// E8.0c asks whether an exact prismatic lock can serve as an internal stow latch
// and then open onto the E8.0b telescopic travel without injecting cached solver
// impulse. Pinned Box3D source is explicit about the relevant state boundary:
// b3PrismaticJoint_SetLimits changes bounds but does not clear lower/upperImpulse;
// b3PrismaticJoint_EnableLimit clears both impulses when the enabled state changes.
//
// Therefore three matched post-release cases are compared:
//   fresh-open: no pre-existing limit impulse;
//   direct:     exact lock -> SetLimits(open) only;
//   reset:      exact lock -> EnableLimit(false) -> SetLimits(open) -> EnableLimit(true).
//
// Important measurement boundary: b3World_Step(DT, 4) does four internal substeps.
// A retained limit impulse can affect warm-start on the first substep and then be
// counteracted by the remaining solves before the outer-frame sample. The source-
// side cached support impulse therefore defines an instantaneous scale, not an
// expected terminal outer-frame delta-v. E8.0c requires the direct path to differ
// materially from fresh-open while the cache-reset path matches fresh-open.

const PAD_MASS = 1.0;
const PAD_HALF = [0.1, 0.1, 0.1];
const REST_LENGTH = 1.0;
const MIN_EXTENSION = 0.70;
const MAX_EXTENSION = REST_LENGTH;
const LOCKED_EXTENSION = REST_LENGTH;

const SPRING_HZ = 8;
const DAMPING_RATIO = 1;
const LOWER_SPRING_FORCE = 0;
const UPPER_SPRING_FORCE = 200;

const LOCK_SETTLE_FRAMES = 120;
const POST_RELEASE_SETTLE_FRAMES = 180;
const POST_RELEASE_SAMPLE_FRAMES = 60;

// Local prismatic X rotated +90deg around world Z -> physical +Y axis.
// The pad therefore starts above the parent. Gravity acts toward compression,
// which makes this the relevant mirror-symmetric "stowed upward" latch case.
const AXIS = [0, 1, 0];
const Z_POS_90 = [0, 0, Math.SQRT1_2, Math.SQRT1_2];

const PAD_WEIGHT = PAD_MASS * GRAVITY;
const SOURCE_WARMSTART_DV_SCALE = (PAD_WEIGHT * (DT / SUBSTEPS)) / PAD_MASS;

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function magnitude(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function makeRig({ gravity = -GRAVITY, initialLength = REST_LENGTH, locked = true }) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, gravity, 0];
  const world = b3.b3CreateWorld(wd);

  const parentDef = b3.b3DefaultBodyDef();
  parentDef.position = [0, 0, 0];
  const parent = b3.b3CreateBody(world, parentDef);

  const padDef = b3.b3DefaultBodyDef();
  padDef.type = b3.b3BodyType.b3_dynamicBody;
  padDef.position = [0, initialLength, 0];
  padDef.enableSleep = false;
  padDef.linearDamping = 0;
  padDef.angularDamping = 0;
  const pad = b3.b3CreateBody(world, padDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForMass(PAD_MASS, PAD_HALF);
  shapeDef.filter.maskBits = 0n;
  b3.b3CreateBoxShape(pad, shapeDef, ...PAD_HALF);

  const guideDef = b3.b3DefaultPrismaticJointDef();
  guideDef.base.bodyIdA = parent;
  guideDef.base.bodyIdB = pad;
  guideDef.base.localFrameA = {
    position: [0, 0, 0],
    quaternion: Z_POS_90,
  };
  guideDef.base.localFrameB = {
    position: [0, 0, 0],
    quaternion: Z_POS_90,
  };
  guideDef.enableSpring = false;
  guideDef.enableLimit = true;
  guideDef.lowerTranslation = locked ? LOCKED_EXTENSION : MIN_EXTENSION;
  guideDef.upperTranslation = MAX_EXTENSION;
  guideDef.enableMotor = false;
  const guideJoint = b3.b3CreatePrismaticJoint(world, guideDef);

  const springDef = b3.b3DefaultDistanceJointDef();
  springDef.base.bodyIdA = parent;
  springDef.base.bodyIdB = pad;
  springDef.base.localFrameA = {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
  };
  springDef.base.localFrameB = {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
  };
  springDef.length = REST_LENGTH;
  springDef.enableSpring = true;
  springDef.lowerSpringForce = LOWER_SPRING_FORCE;
  springDef.upperSpringForce = UPPER_SPRING_FORCE;
  springDef.hertz = SPRING_HZ;
  springDef.dampingRatio = DAMPING_RATIO;
  springDef.enableLimit = false;
  springDef.enableMotor = false;
  const springJoint = b3.b3CreateDistanceJoint(world, springDef);
  b3.b3DistanceJoint_SetSpringForceRange(
    springJoint,
    LOWER_SPRING_FORCE,
    UPPER_SPRING_FORCE,
  );

  return { world, pad, guideJoint, springJoint };
}

function sample(rig) {
  const guideForce = [0, 0, 0];
  const springForce = [0, 0, 0];
  const velocity = [0, 0, 0];
  const com = [0, 0, 0];

  b3.b3Joint_GetConstraintForce(guideForce, rig.guideJoint);
  b3.b3Joint_GetConstraintForce(springForce, rig.springJoint);
  b3.b3Body_GetLinearVelocity(velocity, rig.pad);
  b3.b3Body_GetWorldCenterOfMass(com, rig.pad);

  return {
    translation: b3.b3PrismaticJoint_GetTranslation(rig.guideJoint),
    length: b3.b3DistanceJoint_GetCurrentLength(rig.springJoint),
    axialSpeed: dot(velocity, AXIS),
    speedMagnitude: magnitude(velocity),
    guideMagnitude: magnitude(guideForce),
    springAxial: dot(springForce, AXIS),
    springMagnitude: magnitude(springForce),
    com: [...com],
  };
}

function settleLocked(rig) {
  for (let frame = 0; frame < LOCK_SETTLE_FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
  }
  return sample(rig);
}

function openDirect(rig) {
  b3.b3PrismaticJoint_SetLimits(rig.guideJoint, MIN_EXTENSION, MAX_EXTENSION);
}

function openWithCacheReset(rig) {
  b3.b3PrismaticJoint_EnableLimit(rig.guideJoint, false);
  b3.b3PrismaticJoint_SetLimits(rig.guideJoint, MIN_EXTENSION, MAX_EXTENSION);
  b3.b3PrismaticJoint_EnableLimit(rig.guideJoint, true);
}

function oneStep(rig) {
  b3.b3World_Step(rig.world, DT, SUBSTEPS);
  return sample(rig);
}

function runLoadedRelease() {
  const directRig = makeRig({ locked: true });
  const resetRig = makeRig({ locked: true });
  const preDirect = settleLocked(directRig);
  const preReset = settleLocked(resetRig);

  const referenceLength = 0.5 * (preDirect.translation + preReset.translation);
  const freshRig = makeRig({ initialLength: referenceLength, locked: false });

  openDirect(directRig);
  openWithCacheReset(resetRig);

  const fresh = oneStep(freshRig);
  const direct = oneStep(directRig);
  const reset = oneStep(resetRig);

  b3.b3DestroyWorld(freshRig.world);
  b3.b3DestroyWorld(directRig.world);
  b3.b3DestroyWorld(resetRig.world);

  return { preDirect, preReset, referenceLength, fresh, direct, reset };
}

function runNeutralReset() {
  const rig = makeRig({ gravity: 0, locked: true });
  settleLocked(rig);
  const before = sample(rig);
  openWithCacheReset(rig);

  let maxSpeed = 0;
  let maxGuide = 0;
  let maxSpring = 0;
  for (let frame = 0; frame < 12; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    const row = sample(rig);
    maxSpeed = Math.max(maxSpeed, row.speedMagnitude);
    maxGuide = Math.max(maxGuide, row.guideMagnitude);
    maxSpring = Math.max(maxSpring, row.springMagnitude);
  }
  const after = sample(rig);
  b3.b3DestroyWorld(rig.world);
  return { before, after, maxSpeed, maxGuide, maxSpring };
}

function runLoadedPostReleaseSettle() {
  const rig = makeRig({ locked: true });
  const before = settleLocked(rig);
  openWithCacheReset(rig);

  for (let frame = 0; frame < POST_RELEASE_SETTLE_FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
  }

  let sumGuide = 0;
  let sumSpring = 0;
  let maxSpeed = 0;
  let minTranslation = Infinity;
  let maxTranslation = -Infinity;
  for (let frame = 0; frame < POST_RELEASE_SAMPLE_FRAMES; frame++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    const row = sample(rig);
    sumGuide += row.guideMagnitude;
    sumSpring += row.springMagnitude;
    maxSpeed = Math.max(maxSpeed, row.speedMagnitude);
    minTranslation = Math.min(minTranslation, row.translation);
    maxTranslation = Math.max(maxTranslation, row.translation);
  }
  const after = sample(rig);
  b3.b3DestroyWorld(rig.world);

  return {
    before,
    after,
    meanGuide: sumGuide / POST_RELEASE_SAMPLE_FRAMES,
    meanSpring: sumSpring / POST_RELEASE_SAMPLE_FRAMES,
    maxSpeed,
    minTranslation,
    maxTranslation,
  };
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || GRAVITY !== 20) {
  throw new Error('E8.0c expected current Donor-v1 fixed-step/gravity substrate');
}

for (const fn of [
  'b3PrismaticJoint_SetLimits',
  'b3PrismaticJoint_EnableLimit',
  'b3PrismaticJoint_GetTranslation',
  'b3Body_GetLinearVelocity',
  'b3DistanceJoint_SetSpringForceRange',
  'b3Joint_GetConstraintForce',
]) {
  if (typeof b3[fn] !== 'function') {
    throw new Error(`E8.0c requires ${fn} in box3d.js@0.1.1`);
  }
}

const loaded = runLoadedRelease();
const neutral = runNeutralReset();
const settled = runLoadedPostReleaseSettle();

const directSpeedError = Math.abs(loaded.direct.axialSpeed - loaded.fresh.axialSpeed);
const directTranslationError = Math.abs(loaded.direct.translation - loaded.fresh.translation);
const directSpringError = Math.abs(loaded.direct.springMagnitude - loaded.fresh.springMagnitude);
const resetSpeedError = Math.abs(loaded.reset.axialSpeed - loaded.fresh.axialSpeed);
const resetTranslationError = Math.abs(loaded.reset.translation - loaded.fresh.translation);
const resetSpringError = Math.abs(loaded.reset.springMagnitude - loaded.fresh.springMagnitude);

console.log('E8.0c internal latch-release / solver-cache boundary');
console.log(
  `  source warm-start support scale=${SOURCE_WARMSTART_DV_SCALE.toFixed(6)}m/s ` +
    `(weight=${PAD_WEIGHT.toFixed(1)}N, substep=${(DT / SUBSTEPS).toFixed(6)}s; ` +
    `diagnostic scale only, not an outer-frame terminal prediction)`,
);
console.log(
  `  locked pre-release: direct t=${loaded.preDirect.translation.toFixed(6)}m ` +
    `v=${loaded.preDirect.axialSpeed.toFixed(6)}m/s guide=${loaded.preDirect.guideMagnitude.toFixed(3)}N ` +
    `spring=${loaded.preDirect.springMagnitude.toFixed(3)}N | ` +
    `reset t=${loaded.preReset.translation.toFixed(6)}m v=${loaded.preReset.axialSpeed.toFixed(6)}m/s ` +
    `guide=${loaded.preReset.guideMagnitude.toFixed(3)}N spring=${loaded.preReset.springMagnitude.toFixed(3)}N`,
);
console.log(
  `  first open frame: fresh v=${loaded.fresh.axialSpeed.toFixed(6)} t=${loaded.fresh.translation.toFixed(6)} ` +
    `spring=${loaded.fresh.springMagnitude.toFixed(3)}N | ` +
    `direct v=${loaded.direct.axialSpeed.toFixed(6)} t=${loaded.direct.translation.toFixed(6)} ` +
    `spring=${loaded.direct.springMagnitude.toFixed(3)}N errors(v/t/F)=` +
    `${directSpeedError.toExponential(2)}/${directTranslationError.toExponential(2)}/${directSpringError.toExponential(2)} | ` +
    `reset v=${loaded.reset.axialSpeed.toFixed(6)} t=${loaded.reset.translation.toFixed(6)} ` +
    `spring=${loaded.reset.springMagnitude.toFixed(3)}N errors(v/t/F)=` +
    `${resetSpeedError.toExponential(2)}/${resetTranslationError.toExponential(2)}/${resetSpringError.toExponential(2)}`,
);
console.log(
  `  neutral reset: drift=${Math.abs(neutral.after.translation - neutral.before.translation).toExponential(2)}m ` +
    `maxSpeed=${neutral.maxSpeed.toExponential(2)}m/s maxGuide=${neutral.maxGuide.toExponential(2)}N ` +
    `maxSpring=${neutral.maxSpring.toExponential(2)}N`,
);
console.log(
  `  loaded post-release settle: translation=${settled.after.translation.toFixed(6)}m ` +
    `range=${settled.minTranslation.toFixed(6)}..${settled.maxTranslation.toFixed(6)}m ` +
    `meanGuide=${settled.meanGuide.toFixed(3)}N meanSpring=${settled.meanSpring.toFixed(3)}N ` +
    `maxSpeed=${settled.maxSpeed.toExponential(2)}m/s`,
);

const LOCK_TRANSLATION_TOL = 0.005;
const LOCK_SPEED_MAX = 1e-4;
const LOCK_GUIDE_FORCE_TOL = 2.0;
const LOCK_SPRING_FORCE_MAX = 0.5;
const PRE_MATCH_TRANSLATION_MAX = 1e-6;
const PRE_MATCH_SPEED_MAX = 1e-6;

const RESET_SPEED_ERROR_MAX = 1e-5;
const RESET_TRANSLATION_ERROR_MAX = 1e-6;
const RESET_SPRING_ERROR_MAX = 1e-3;
// A direct-release artifact must be materially above the accepted fresh-match
// numerical envelope in independent state channels. These thresholds are derived
// from the reset acceptance envelope rather than from the first failed magnitude.
const DIRECT_SPEED_ERROR_MIN = 100 * RESET_SPEED_ERROR_MAX;
const DIRECT_TRANSLATION_ERROR_MIN = 100 * RESET_TRANSLATION_ERROR_MAX;
const DIRECT_SPRING_ERROR_MIN = 100 * RESET_SPRING_ERROR_MAX;

const NEUTRAL_DRIFT_MAX = 1e-6;
// Reuse the fresh-match speed envelope as numerical zero. The first diagnostic run
// showed zero drift/force with a few micrometres-per-second of solver noise.
const NEUTRAL_SPEED_MAX = RESET_SPEED_ERROR_MAX;
const NEUTRAL_FORCE_MAX = 1e-3;

const SETTLED_INTERIOR_MARGIN = 0.05;
const SETTLED_SPEED_MAX = 0.01;
const SETTLED_GUIDE_FORCE_MAX = 1.0;
const SETTLED_SPRING_FORCE_TOL = 2.0;

for (const [label, row] of [['direct', loaded.preDirect], ['reset', loaded.preReset]]) {
  if (Math.abs(row.translation - LOCKED_EXTENSION) > LOCK_TRANSLATION_TOL) {
    throw new Error(`E8.0c ${label} exact-lock translation did not remain near stow length`);
  }
  if (Math.abs(row.axialSpeed) > LOCK_SPEED_MAX) {
    throw new Error(`E8.0c ${label} exact-lock state did not settle`);
  }
  if (Math.abs(row.guideMagnitude - PAD_WEIGHT) > LOCK_GUIDE_FORCE_TOL) {
    throw new Error(`E8.0c ${label} exact-lock guide did not carry pad weight`);
  }
  if (row.springMagnitude > LOCK_SPRING_FORCE_MAX) {
    throw new Error(`E8.0c ${label} stow lock materially preloaded unilateral spring`);
  }
}

if (Math.abs(loaded.preDirect.translation - loaded.preReset.translation) > PRE_MATCH_TRANSLATION_MAX) {
  throw new Error('E8.0c loaded latch replicas did not settle to matched translation');
}
if (Math.abs(loaded.preDirect.axialSpeed - loaded.preReset.axialSpeed) > PRE_MATCH_SPEED_MAX) {
  throw new Error('E8.0c loaded latch replicas did not settle to matched speed');
}

if (directSpeedError < DIRECT_SPEED_ERROR_MIN) {
  throw new Error('E8.0c direct SetLimits release did not remain materially distinct from fresh-open speed');
}
if (directTranslationError < DIRECT_TRANSLATION_ERROR_MIN) {
  throw new Error('E8.0c direct SetLimits release did not remain materially distinct from fresh-open translation');
}
if (directSpringError < DIRECT_SPRING_ERROR_MIN) {
  throw new Error('E8.0c direct SetLimits release did not remain materially distinct from fresh-open spring response');
}
if (resetSpeedError > RESET_SPEED_ERROR_MAX) {
  throw new Error('E8.0c cache-reset release did not match fresh-open axial speed');
}
if (resetTranslationError > RESET_TRANSLATION_ERROR_MAX) {
  throw new Error('E8.0c cache-reset release did not match fresh-open translation');
}
if (resetSpringError > RESET_SPRING_ERROR_MAX) {
  throw new Error('E8.0c cache-reset release did not match fresh-open spring response');
}

if (Math.abs(neutral.after.translation - neutral.before.translation) > NEUTRAL_DRIFT_MAX) {
  throw new Error('E8.0c neutral cache-reset release changed telescope length');
}
if (neutral.maxSpeed > NEUTRAL_SPEED_MAX) {
  throw new Error('E8.0c neutral cache-reset release injected material velocity');
}
if (neutral.maxGuide > NEUTRAL_FORCE_MAX || neutral.maxSpring > NEUTRAL_FORCE_MAX) {
  throw new Error('E8.0c neutral cache-reset release created material constraint force');
}

if (
  settled.after.translation <= MIN_EXTENSION + SETTLED_INTERIOR_MARGIN ||
  settled.after.translation >= MAX_EXTENSION - 1e-3
) {
  throw new Error('E8.0c loaded released telescope did not settle inside free guide travel');
}
if (settled.maxSpeed > SETTLED_SPEED_MAX) {
  throw new Error('E8.0c loaded released telescope did not reach a quiet compliant hold');
}
if (settled.meanGuide > SETTLED_GUIDE_FORCE_MAX) {
  throw new Error('E8.0c guide limit still materially carried axial load after compliant settle');
}
if (Math.abs(settled.meanSpring - PAD_WEIGHT) > SETTLED_SPRING_FORCE_TOL) {
  throw new Error('E8.0c unilateral spring did not take over the released pad weight');
}

console.log(
  'E8.0c PASS: direct exact-lock -> SetLimits(open) remains measurably different from a fresh-open rig because retained limit state participates in the first internal warm-start, while toggling the prismatic limit off/on around the limit change clears that cache and reproduces the fresh-open outer-frame response inside the declared numerical envelope. Neutral cache-reset release adds no material motion or force, and under gravity the released pad settles inside guide travel with its weight carried by the finite compression-only distance spring rather than the guide stop. This qualifies an internal latch-release substrate procedure only; it does not yet qualify an embodied E8 limb, deployment policy, ground support, load sharing, or locomotion.',
);