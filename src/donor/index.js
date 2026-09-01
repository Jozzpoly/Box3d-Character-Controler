import { ControllerOwnedCharacter } from '../character.js';
import { installVelocityOnlyDynamicContactMemory } from './contact-memory.js';
import { createDonorIntent, DONOR_INTENT_CONTRACT_V0, normalizeMoveAxes } from './intent.js';
import { DONOR_PROFILE_V0, DONOR_QUALIFIED_ENVELOPE_V0 } from './profile.js';

export const DONOR_API_VERSION = '0.1.0';

export const DONOR_BEHAVIOR = Object.freeze({
  specimen: 'A″',
  sourceStage: 'E2.3 current-runtime boundary',
  representation: 'controller-owned capsule state',
  reciprocity: 'causal-components',
  dynamicContactMemory: 'velocity-only-contact-consequence',
  supportTransport: 'explicit moving-support inheritance',
  constraintVelocityPolicy: 'current box3d.js@0.1.1 binding behavior',
});

export const DONOR_CONTRACT_V0 = Object.freeze({
  apiVersion: DONOR_API_VERSION,
  behavior: DONOR_BEHAVIOR,
  profile: DONOR_PROFILE_V0,
  qualifiedEnvelope: DONOR_QUALIFIED_ENVELOPE_V0,
  intent: DONOR_INTENT_CONTRACT_V0,
  lifecycle: Object.freeze([
    'character.preStep(dt, intent)',
    'b3World_Step(world, dt, substeps)',
    'character.postStep(dt)',
  ]),
});

export function createDonorCharacter(b3, world, options = {}) {
  const character = new ControllerOwnedCharacter(b3, world, {
    ...DONOR_PROFILE_V0,
    ...options,
    reciprocityMode: 'causal-components',
  });

  return installVelocityOnlyDynamicContactMemory(character);
}

export {
  createDonorIntent,
  DONOR_INTENT_CONTRACT_V0,
  DONOR_PROFILE_V0,
  DONOR_QUALIFIED_ENVELOPE_V0,
  installVelocityOnlyDynamicContactMemory,
  normalizeMoveAxes,
};
