import assert from 'node:assert/strict';
import { DONOR_PROFILE_V1 } from '../src/donor/profile.js';

const DT = 1 / 60;
const JUMP_BUFFER = DONOR_PROFILE_V1.jumpBufferTime;

function naiveReplayExpiry(occurrence, appliedAt) {
  return appliedAt + JUMP_BUFFER;
}

function agePreservedExpiry(occurrence) {
  return occurrence + JUMP_BUFFER;
}

function residualFreshness(occurrence, appliedAt) {
  return Math.max(0, agePreservedExpiry(occurrence) - appliedAt);
}

const samples = [
  { name: 'fresh-subtick', occurrence: 1.000, appliedAt: 1.010 },
  { name: 'one-tick-late', occurrence: 1.000, appliedAt: 1.000 + DT },
  { name: 'forty-ms-late', occurrence: 1.000, appliedAt: 1.040 },
  { name: 'nearly-expired', occurrence: 1.000, appliedAt: 1.115 },
  { name: 'expired', occurrence: 1.000, appliedAt: 1.130 },
];

for (const sample of samples) {
  const naive = naiveReplayExpiry(sample.occurrence, sample.appliedAt);
  const preserved = agePreservedExpiry(sample.occurrence);
  const extension = naive - preserved;
  const residual = residualFreshness(sample.occurrence, sample.appliedAt);
  assert.ok(Math.abs(extension - (sample.appliedAt - sample.occurrence)) < 1e-12);
  if (sample.name === 'expired') assert.equal(residual, 0);
  else assert.ok(residual > 0);
}

// Held state is different: its useful meaning is the reconciled present state, not replay age.
const heldStateSemantics = {
  staleHistoryReplay: false,
  currentStateReconciliation: true,
};
assert.equal(heldStateSemantics.currentStateReconciliation, true);

// A jump edge already has a qualified semantic lifetime in Donor.
// Replaying it late as a brand-new edge would extend that lifetime by exactly its delivery lateness.
const forty = samples.find((s) => s.name === 'forty-ms-late');
const fortyNaiveExtension = naiveReplayExpiry(forty.occurrence, forty.appliedAt) - agePreservedExpiry(forty.occurrence);
assert.ok(Math.abs(fortyNaiveExtension - 0.040) < 1e-12);
assert.ok(Math.abs(residualFreshness(forty.occurrence, forty.appliedAt) - 0.080) < 1e-12);

console.log('R2 INTENT AGE SEMANTICS CRUCIBLE PASS');
console.log(JSON.stringify({
  fixedDtMs: DT * 1000,
  donorJumpBufferMs: JUMP_BUFFER * 1000,
  examples: samples.map((sample) => ({
    name: sample.name,
    ageAtApplicationMs: (sample.appliedAt - sample.occurrence) * 1000,
    naiveLifetimeExtensionMs: (naiveReplayExpiry(sample.occurrence, sample.appliedAt) - agePreservedExpiry(sample.occurrence)) * 1000,
    residualJumpFreshnessMs: residualFreshness(sample.occurrence, sample.appliedAt) * 1000,
  })),
  heldState: 'reconcile present state; do not replay stale duration',
  edgeIntent: 'preserve occurrence age; do not mint a fresh full semantic lifetime at delivery',
  classification: 'FRESHNESS_BELONGS_TO_INTENT_SEMANTICS_NOT_A_GLOBAL_HANDLER_DELAY_THRESHOLD',
}, null, 2));
