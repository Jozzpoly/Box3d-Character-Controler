import assert from 'node:assert/strict';
import { DONOR_PROFILE_V1 } from '../src/donor/profile.js';
import { resolveTemporalIntent } from '../src/temporal-intent-policy.js';

const jumpLife = DONOR_PROFILE_V1.jumpBufferTime;

const retainedJump = resolveTemporalIntent({
  classification: 'retained', kind: 'edge', age: 0.020, lifetime: jumpLife, contextDependence: 'world-state',
});
assert.equal(retainedJump.action, 'apply-at-entitlement');
assert.equal(retainedJump.exact, true);

const staleJump = resolveTemporalIntent({
  classification: 'discarded-past', kind: 'edge', age: 0.040, lifetime: jumpLife, contextDependence: 'world-state',
});
assert.equal(staleJump.action, 'drop');
assert.equal(staleJump.exact, true);

const expiredLateJump = resolveTemporalIntent({
  classification: 'late-after-consume', kind: 'edge', age: 0.130, lifetime: jumpLife, contextDependence: 'world-state',
});
assert.equal(expiredLateJump.action, 'drop');
assert.equal(expiredLateJump.reason, 'edge-expired');

const freshLateJump = resolveTemporalIntent({
  classification: 'late-after-consume', kind: 'edge', age: 0.040, lifetime: jumpLife, contextDependence: 'world-state',
});
assert.equal(freshLateJump.action, 'requires-bounded-approximation');
assert.ok(Math.abs(freshLateJump.residualLifetime - 0.080) < 1e-12);
assert.equal(freshLateJump.exact, false);

const freshContextFreeEdge = resolveTemporalIntent({
  classification: 'late-after-consume', kind: 'edge', age: 0.010, lifetime: 0.200, contextDependence: 'none',
});
assert.equal(freshContextFreeEdge.action, 'forward-with-residual-age');
assert.equal(freshContextFreeEdge.exact, false);

const heldAcrossDiscard = resolveTemporalIntent({
  classification: 'discarded-past', kind: 'state', age: 0.500,
});
assert.equal(heldAcrossDiscard.action, 'reconcile-current-state');
assert.equal(heldAcrossDiscard.exact, false);

const future = resolveTemporalIntent({ classification: 'future', kind: 'edge', age: 0.005, lifetime: jumpLife });
assert.equal(future.action, 'keep-queued');
assert.equal(future.exact, true);

assert.throws(() => resolveTemporalIntent({ classification: 'wat', kind: 'edge' }));
assert.throws(() => resolveTemporalIntent({ classification: 'retained', kind: 'mystery' }));
assert.throws(() => resolveTemporalIntent({ classification: 'retained', kind: 'edge', age: -1 }));

console.log('R2 TEMPORAL INTENT POLICY CRUCIBLE PASS');
console.log(JSON.stringify({
  retainedJump,
  staleJump,
  expiredLateJump,
  freshLateJump,
  heldAcrossDiscard,
  distinction: 'THE_POLICY_EXPOSES_WHERE_EXACT_TEMPORAL_TRUTH_ENDS_INSTEAD_OF_SILENTLY_RETIMERING_INPUT',
}, null, 2));
