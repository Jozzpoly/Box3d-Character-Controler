import {
  createCurrentDonorCharacter,
  createDonorCharacter,
  createDonorCharacterV1,
  createDonorIntent,
  CURRENT_DONOR_BEHAVIOR,
  CURRENT_DONOR_CONTRACT,
  CURRENT_DONOR_REVISION,
  DONOR_API_VERSION,
  DONOR_API_VERSION_V0,
  DONOR_BEHAVIOR,
  DONOR_BEHAVIOR_V0,
  DONOR_BEHAVIOR_V1,
  DONOR_CONTRACT_V0,
  DONOR_CONTRACT_V1,
  DONOR_PROFILE_V0,
  DONOR_PROFILE_V1,
  DONOR_QUALIFIED_ENVELOPE_V0,
  DONOR_QUALIFIED_ENVELOPE_V1,
  installVelocityOnlyDynamicContactMemory,
  normalizeMoveAxes,
} from '../src/donor/index.js';
import {
  createDonorCharacter as createDonorCharacterCompat,
  DONOR_API_VERSION as donorApiVersionCompat,
} from '../src/donor-character.js';
import { installVelocityOnlyContactMemoryProbe } from '../src/momentum-semantics-probe.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function near(actual, expected, label, tolerance = 1e-12) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: ${actual} != ${expected}`);
  }
}

assert(DONOR_API_VERSION === '0.2.0', 'unexpected current donor API version');
assert(DONOR_API_VERSION_V0 === '0.1.0', 'historical v0 API identity changed');
assert(donorApiVersionCompat === DONOR_API_VERSION, 'compat donor API version diverged');
assert(createDonorCharacterCompat === createDonorCharacter, 'legacy donor factory is not the frozen v0 alias');
assert(createCurrentDonorCharacter === createDonorCharacterV1, 'current donor factory does not point at v1');
assert(CURRENT_DONOR_REVISION === 'v1', 'current donor revision is not v1');
assert(CURRENT_DONOR_BEHAVIOR === DONOR_BEHAVIOR_V1, 'current behavior pointer diverged from v1');
assert(CURRENT_DONOR_CONTRACT === DONOR_CONTRACT_V1, 'current contract pointer diverged from v1');
assert(DONOR_BEHAVIOR === DONOR_BEHAVIOR_V0, 'historical DONOR_BEHAVIOR alias stopped meaning v0');
assert(
  installVelocityOnlyContactMemoryProbe === installVelocityOnlyDynamicContactMemory,
  'historical A-double-prime adapter is not a direct stable alias',
);

for (const [label, value] of [
  ['DONOR_PROFILE_V0', DONOR_PROFILE_V0],
  ['DONOR_PROFILE_V1', DONOR_PROFILE_V1],
  ['DONOR_QUALIFIED_ENVELOPE_V0', DONOR_QUALIFIED_ENVELOPE_V0],
  ['DONOR_QUALIFIED_ENVELOPE_V1', DONOR_QUALIFIED_ENVELOPE_V1],
  ['DONOR_BEHAVIOR_V0', DONOR_BEHAVIOR_V0],
  ['DONOR_BEHAVIOR_V1', DONOR_BEHAVIOR_V1],
  ['DONOR_CONTRACT_V0', DONOR_CONTRACT_V0],
  ['DONOR_CONTRACT_V1', DONOR_CONTRACT_V1],
]) {
  assert(Object.isFrozen(value), `${label} must be frozen`);
}

const expectedProfile = {
  radius: 0.36,
  halfSegment: 0.54,
  virtualMass: 80,
  maxSpeed: 5.2,
  sprintMultiplier: 1.32,
  groundAcceleration: 31,
  groundDeceleration: 36,
  airAcceleration: 7.5,
  airDeceleration: 1.2,
  externalGroundDrag: 2.0,
  externalAirDrag: 0.22,
  gravity: 20.0,
  fallGravityMultiplier: 1.22,
  jumpReleaseGravityMultiplier: 1.75,
  jumpSpeed: 7.2,
  coyoteTime: 0.11,
  jumpBufferTime: 0.12,
  supportNormalMinY: 0.58,
};

for (const profile of [DONOR_PROFILE_V0, DONOR_PROFILE_V1]) {
  for (const [key, value] of Object.entries(expectedProfile)) {
    near(profile[key], value, `profile.${key}`);
  }
  assert(
    Object.keys(profile).length === Object.keys(expectedProfile).length,
    'donor profile gained an unqualified field without updating the contract gate',
  );
}
assert(
  JSON.stringify(DONOR_PROFILE_V1) === JSON.stringify(DONOR_PROFILE_V0),
  'v1 promotion silently retuned feel constants instead of changing only semantics',
);

near(DONOR_QUALIFIED_ENVELOPE_V0.fixedDt, 1 / 60, 'v0 qualified fixedDt');
near(DONOR_QUALIFIED_ENVELOPE_V1.fixedDt, 1 / 60, 'v1 qualified fixedDt');
assert(DONOR_QUALIFIED_ENVELOPE_V0.substeps === 4, 'v0 qualified substeps changed');
assert(DONOR_QUALIFIED_ENVELOPE_V1.substeps === 4, 'v1 qualified substeps changed');
assert(DONOR_QUALIFIED_ENVELOPE_V0.box3dBinding === 'box3d.js@0.1.1', 'v0 Box3D binding changed');
assert(DONOR_QUALIFIED_ENVELOPE_V1.box3dBinding === 'box3d.js@0.1.1', 'v1 Box3D binding changed');
assert(
  DONOR_QUALIFIED_ENVELOPE_V1.mechanicsBaselineCommit === 'bc06ca98e94314af0ba888b74e1c4029429422e5',
  'v1 provenance no longer points at the exact Owner-qualified A-triple-prime specimen',
);

assert(DONOR_BEHAVIOR_V0.specimen === 'A″', 'v0 donor specimen changed');
assert(DONOR_BEHAVIOR_V1.specimen === 'A‴', 'v1 donor specimen changed');
assert(DONOR_BEHAVIOR_V0.reciprocity === 'causal-components', 'v0 reciprocity changed');
assert(DONOR_BEHAVIOR_V1.reciprocity === 'causal-components', 'v1 reciprocity changed');
assert(
  DONOR_BEHAVIOR_V0.dynamicContactMemory === 'velocity-only-contact-consequence' &&
    DONOR_BEHAVIOR_V1.dynamicContactMemory === 'velocity-only-contact-consequence',
  'dynamic-contact memory changed during v1 promotion',
);
assert(
  DONOR_BEHAVIOR_V1.constraintVelocityPolicy.includes('intent-capped surface-relative'),
  'v1 does not declare the E2.3d constraint-velocity policy',
);
assert(
  DONOR_BEHAVIOR_V0.constraintVelocityPolicy === 'current box3d.js@0.1.1 binding behavior',
  'v0 constraint behavior was silently rewritten',
);
assert(DONOR_CONTRACT_V0.apiVersion === '0.1.0', 'historical v0 contract API version changed');
assert(DONOR_CONTRACT_V1.apiVersion === DONOR_API_VERSION, 'v1 contract API version mismatch');

const normalized = normalizeMoveAxes(1, 1);
near(normalized.moveForward, Math.SQRT1_2, 'normalized forward');
near(normalized.moveRight, Math.SQRT1_2, 'normalized right');
const invalid = normalizeMoveAxes(Number.NaN, Number.POSITIVE_INFINITY);
near(invalid.moveForward, 0, 'invalid forward sanitization');
near(invalid.moveRight, 0, 'invalid right sanitization');

const forwardBasis = [0.25, 0, -0.75];
const rightBasis = [0.75, 0, 0.25];
const intent = createDonorIntent({
  moveForward: 1,
  moveRight: 1,
  forward: forwardBasis,
  right: rightBasis,
  jump: 1,
  jumpHeld: true,
  sprint: 'yes',
});
near(Math.hypot(intent.moveForward, intent.moveRight), 1, 'intent movement magnitude');
assert(intent.jump === true && intent.jumpHeld === true && intent.sprint === true, 'intent booleans not normalized');
assert(intent.forward !== forwardBasis && intent.right !== rightBasis, 'intent basis arrays must be copied');

const expectedLifecycle =
  'character.preStep(dt, intent) > b3World_Step(world, dt, substeps) > character.postStep(dt)';
assert(DONOR_CONTRACT_V0.lifecycle.join(' > ') === expectedLifecycle, 'v0 donor lifecycle changed');
assert(DONOR_CONTRACT_V1.lifecycle.join(' > ') === expectedLifecycle, 'v1 donor lifecycle changed');

console.log(
  `Donor contract smoke PASS: API ${DONOR_API_VERSION}, immutable v0/A″ compatibility, explicit current v1/A‴, identical feel profile, pure intent contract and Node-safe public import`,
);
