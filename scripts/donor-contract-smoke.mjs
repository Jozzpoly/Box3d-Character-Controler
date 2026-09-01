import {
  createDonorCharacter,
  createDonorIntent,
  DONOR_API_VERSION,
  DONOR_BEHAVIOR,
  DONOR_CONTRACT_V0,
  DONOR_PROFILE_V0,
  DONOR_QUALIFIED_ENVELOPE_V0,
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

assert(DONOR_API_VERSION === '0.1.0', 'unexpected donor API version');
assert(donorApiVersionCompat === DONOR_API_VERSION, 'compat donor API version diverged');
assert(createDonorCharacterCompat === createDonorCharacter, 'legacy donor factory is not a direct stable alias');
assert(
  installVelocityOnlyContactMemoryProbe === installVelocityOnlyDynamicContactMemory,
  'historical A-double-prime adapter is not a direct stable alias',
);
assert(Object.isFrozen(DONOR_PROFILE_V0), 'donor mechanical profile must be frozen');
assert(Object.isFrozen(DONOR_QUALIFIED_ENVELOPE_V0), 'qualified envelope must be frozen');
assert(Object.isFrozen(DONOR_BEHAVIOR), 'behavior metadata must be frozen');
assert(Object.isFrozen(DONOR_CONTRACT_V0), 'donor contract must be frozen');

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
for (const [key, value] of Object.entries(expectedProfile)) {
  near(DONOR_PROFILE_V0[key], value, `profile.${key}`);
}
assert(
  Object.keys(DONOR_PROFILE_V0).length === Object.keys(expectedProfile).length,
  'donor profile gained an unqualified field without updating the contract gate',
);
near(DONOR_QUALIFIED_ENVELOPE_V0.fixedDt, 1 / 60, 'qualified fixedDt');
assert(DONOR_QUALIFIED_ENVELOPE_V0.substeps === 4, 'qualified substeps changed');
assert(DONOR_QUALIFIED_ENVELOPE_V0.box3dBinding === 'box3d.js@0.1.1', 'qualified Box3D binding changed');
assert(DONOR_BEHAVIOR.specimen === 'A″', 'donor specimen changed');
assert(DONOR_BEHAVIOR.reciprocity === 'causal-components', 'donor reciprocity changed');
assert(
  DONOR_BEHAVIOR.dynamicContactMemory === 'velocity-only-contact-consequence',
  'donor dynamic-contact memory changed',
);

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
assert(
  DONOR_CONTRACT_V0.lifecycle.join(' > ') ===
    'character.preStep(dt, intent) > b3World_Step(world, dt, substeps) > character.postStep(dt)',
  'donor lifecycle contract changed',
);

console.log(
  `Donor contract smoke PASS: API ${DONOR_API_VERSION}, explicit profile, pure intent contract, compatibility aliases and Node-safe public import`,
);
