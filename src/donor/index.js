import { createConstraintVelocityCharacter } from '../constraint-velocity-character.js';
import { ControllerOwnedCharacter } from '../character.js';
import { installVelocityOnlyDynamicContactMemory } from './contact-memory.js';
import { createDonorIntent, DONOR_INTENT_CONTRACT_V0, normalizeMoveAxes } from './intent.js';
import {
  DONOR_PROFILE_V0,
  DONOR_PROFILE_V1,
  DONOR_QUALIFIED_ENVELOPE_V0,
  DONOR_QUALIFIED_ENVELOPE_V1,
} from './profile.js';

export const DONOR_API_VERSION_V0 = '0.1.0';
export const DONOR_API_VERSION = '0.2.0';

export const DONOR_BEHAVIOR_V0 = Object.freeze({
  specimen: 'A″',
  sourceStage: 'E2.3 current-runtime boundary',
  representation: 'controller-owned capsule state',
  reciprocity: 'causal-components',
  dynamicContactMemory: 'velocity-only-contact-consequence',
  supportTransport: 'explicit moving-support inheritance',
  constraintVelocityPolicy: 'current box3d.js@0.1.1 binding behavior',
  status: 'frozen previous donor reference',
});

// Historical compatibility name. It deliberately continues to mean v0 / A″.
export const DONOR_BEHAVIOR = DONOR_BEHAVIOR_V0;

export const DONOR_BEHAVIOR_V1 = Object.freeze({
  specimen: 'A‴',
  sourceStage: 'E2.3d Owner-qualified current-best',
  representation: 'controller-owned capsule state',
  reciprocity: 'causal-components',
  dynamicContactMemory: 'velocity-only-contact-consequence',
  supportTransport: 'explicit moving-support inheritance',
  constraintVelocityPolicy: 'intent-capped surface-relative active horizontal static/kinematic normal velocity',
  status: 'current-best after machine qualification and Owner free play',
});

const LIFECYCLE = Object.freeze([
  'character.preStep(dt, intent)',
  'b3World_Step(world, dt, substeps)',
  'character.postStep(dt)',
]);

export const DONOR_CONTRACT_V0 = Object.freeze({
  apiVersion: DONOR_API_VERSION_V0,
  behavior: DONOR_BEHAVIOR_V0,
  profile: DONOR_PROFILE_V0,
  qualifiedEnvelope: DONOR_QUALIFIED_ENVELOPE_V0,
  intent: DONOR_INTENT_CONTRACT_V0,
  lifecycle: LIFECYCLE,
});

export const DONOR_CONTRACT_V1 = Object.freeze({
  apiVersion: DONOR_API_VERSION,
  behavior: DONOR_BEHAVIOR_V1,
  profile: DONOR_PROFILE_V1,
  qualifiedEnvelope: DONOR_QUALIFIED_ENVELOPE_V1,
  intent: DONOR_INTENT_CONTRACT_V0,
  lifecycle: LIFECYCLE,
});

export const CURRENT_DONOR_REVISION = 'v1';
export const CURRENT_DONOR_BEHAVIOR = DONOR_BEHAVIOR_V1;
export const CURRENT_DONOR_CONTRACT = DONOR_CONTRACT_V1;

// Historical v0 factory. Its A″ semantics are immutable compatibility behavior.
export function createDonorCharacter(b3, world, options = {}) {
  const character = new ControllerOwnedCharacter(b3, world, {
    ...DONOR_PROFILE_V0,
    ...options,
    reciprocityMode: 'causal-components',
  });

  return installVelocityOnlyDynamicContactMemory(character);
}

export function createDonorCharacterV1(b3, world, options = {}) {
  return createConstraintVelocityCharacter(b3, world, {
    ...DONOR_PROFILE_V1,
    ...options,
  });
}

export const createCurrentDonorCharacter = createDonorCharacterV1;

export {
  createDonorIntent,
  DONOR_INTENT_CONTRACT_V0,
  DONOR_PROFILE_V0,
  DONOR_PROFILE_V1,
  DONOR_QUALIFIED_ENVELOPE_V0,
  DONOR_QUALIFIED_ENVELOPE_V1,
  installVelocityOnlyDynamicContactMemory,
  normalizeMoveAxes,
};
