import assert from 'node:assert/strict';
import { DONOR_PROFILE_V1 } from '../src/donor/profile.js';

const { coyoteTime, jumpBufferTime } = DONOR_PROFILE_V1;

function remaining(window, age) {
  return Math.max(0, window - age);
}

// Case 1: the press happened while coyote eligibility was still true,
// but delivery occurs after that world-state opportunity has expired.
const coyoteAtOccurrence = 0.020;
const deliveryAge = 0.030;
const coyoteAtDelivery = Math.max(0, coyoteAtOccurrence - deliveryAge);
const jumpFreshnessAtDelivery = remaining(jumpBufferTime, deliveryAge);
assert.ok(coyoteAtOccurrence > 0);
assert.equal(coyoteAtDelivery, 0);
assert.ok(jumpFreshnessAtDelivery > 0);

// Case 2: the press happened while airborne before landing; by delivery the character is grounded.
// Applying against current context may be responsive, but it is not the same mechanical history.
const occurredAirborne = true;
const deliveredGrounded = true;
assert.notEqual(occurredAirborne, !deliveredGrounded);

// Three candidate interpretations all have different truth costs.
const candidates = {
  replayAgainstHistoricalEligibility: {
    preservesOccurrenceEligibility: true,
    requiresHistoricalWorldStateOrRollbackForExactConsequence: true,
  },
  applyAgainstCurrentContext: {
    preservesOccurrenceEligibility: false,
    preservesCurrentWorldTruth: true,
  },
  dropWhenMechanicalOpportunityWasMissed: {
    inventsNoHistory: true,
    mayLoseARealPlayerIntent: true,
  },
};

assert.equal(candidates.replayAgainstHistoricalEligibility.requiresHistoricalWorldStateOrRollbackForExactConsequence, true);
assert.equal(candidates.applyAgainstCurrentContext.preservesOccurrenceEligibility, false);
assert.equal(candidates.dropWhenMechanicalOpportunityWasMissed.mayLoseARealPlayerIntent, true);

console.log('R2 CONTEXT DEPENDENT LATE EDGE CRUCIBLE PASS');
console.log(JSON.stringify({
  donor: { coyoteTimeMs: coyoteTime * 1000, jumpBufferTimeMs: jumpBufferTime * 1000 },
  crossing: {
    coyoteAtOccurrenceMs: coyoteAtOccurrence * 1000,
    deliveryAgeMs: deliveryAge * 1000,
    coyoteAtDeliveryMs: coyoteAtDelivery * 1000,
    jumpFreshnessStillRemainingMs: jumpFreshnessAtDelivery * 1000,
  },
  conclusion: 'PRESERVING_INPUT_AGE_IS_NECESSARY_BUT_NOT_SUFFICIENT_FOR_CONTEXT_DEPENDENT_EDGES',
  architecturalBoundary: 'ONCE_WORLD_STATE_HAS_ADVANCED_PAST_A_STATE_DEPENDENT_OPPORTUNITY_EXACT_RECOVERY_REQUIRES_HISTORY_OR_ROLLBACK; OTHERWISE_POLICY_MUST_CHOOSE_A_BOUNDED_APPROXIMATION',
}, null, 2));
