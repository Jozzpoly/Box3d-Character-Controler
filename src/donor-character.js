// Compatibility entry point kept for existing runtime and tests.
// New downstream integrations should import from ./donor/index.js.
export {
  createDonorCharacter,
  DONOR_API_VERSION,
  DONOR_BEHAVIOR,
  DONOR_CONTRACT_V0,
  DONOR_PROFILE_V0,
  DONOR_QUALIFIED_ENVELOPE_V0,
} from './donor/index.js';
