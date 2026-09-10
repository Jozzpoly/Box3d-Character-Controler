# R2 late-intent semantics checkpoint — 2026-09-11

## Status

**TEMPORAL INPUT AGE SEMANTICS CHARACTERIZED / CONTEXT-DEPENDENT LATE EDGE BOUNDARY EXPOSED / RUNTIME INTEGRATION STILL NOT STARTED**

This checkpoint records the research step after the isolated temporal buffer, frame/epoch mapper, browser-delivery specimen and discontinuity policy work.

Canonical product/runtime remains unchanged. Work is isolated on:

- `research/temporal-input-substrate-r2-2026-09-10`

No `PlayerInput`, Donor mechanics or `main` integration is claimed here.

## Correction from the first forward-placement probe

The first `r2-late-intent-forward-placement-crucible.mjs` failed for a useful reason: it assumed that handler delay automatically meant the event had already missed its mechanical entitlement.

That is false.

An event can be handled later in browser time while its entitlement is still ahead of the consumed simulation frontier. In that case the mapper correctly classifies it as ordinary `retained`, not `late-after-consume`.

Therefore freshness must not be inferred from handler delay alone.

## Finding L1 — current epoch / discarded history / lifecycle boundary come before milliseconds

The policy falsification rejected three simple global rules:

- always replay late input;
- always drop late input;
- use one millisecond threshold without epoch semantics.

Current strongest ordering is:

1. determine whether the event still belongs to the current retained temporal history;
2. reject discarded past / previous lifecycle history categorically;
3. only then reason about lateness or remaining semantic lifetime.

## Finding L2 — held state and edge intent are not the same temporal object

Held controls such as movement direction or held sprint primarily describe current state.

After a discontinuity, replaying their old duration is usually less truthful than reconciling the present held state at the new boundary.

A jump press is different. It is a momentary edge with a finite semantic lifetime.

The existing qualified Donor already defines:

- `jumpBufferTime = 0.12 s`;
- `coyoteTime = 0.11 s`.

This means the project already contains action-specific temporal semantics. R2 should not replace them with an arbitrary global grace period.

## Finding L3 — late delivery must not mint a fresh lifetime

For a jump edge occurring at time `T`, its Donor jump-buffer lifetime expires at approximately:

`T + 0.12 s`

If delivery is delayed by 40 ms and the runtime simply converts the old event into a brand-new `jump=true` at delivery time, the effective expiry becomes:

`T + 0.04 + 0.12 s`

The event has been artificially made 40 ms younger.

The semantic-age crucible verifies the stronger interpretation:

- 10 ms old jump → ~110 ms of original freshness remains;
- one-tick-old jump → ~103.33 ms remains;
- 40 ms old jump → 80 ms remains;
- 115 ms old jump → 5 ms remains;
- 130 ms old jump → expired; do not resurrect it.

**Bounded conclusion:** action freshness belongs to the action's semantic contract and should age from occurrence, not delivery.

## Finding L4 — preserving input age is necessary but not sufficient for state-dependent actions

A deeper boundary appears when world state changes between occurrence and delivery.

Example:

- jump occurs with 20 ms of coyote eligibility remaining;
- delivery happens 30 ms later;
- the jump edge still has 90 ms of jump-buffer lifetime remaining;
- but coyote eligibility has already expired in current world state.

At occurrence, the jump could have been mechanically legal. At delivery, it is not.

A second example is an airborne press delivered only after the character has landed.

Three responses have different truth costs:

### Historical eligibility replay

Can preserve what was true when the player acted, but reproducing the exact mechanical consequence requires historical world state or rollback.

### Current-context application

Preserves the current world as truth but can change the meaning/consequence of the original action.

### Drop after missed opportunity

Invents no alternate history but can lose a genuine player intent.

There is no exact zero-cost solution after the world has advanced past a state-dependent opportunity.

**Bounded conclusion:** once this boundary is crossed, a non-rollback runtime must choose an explicit approximation rather than pretending exact causal recovery.

## Evidence status

The R2 workflow now contains 15 successful gates, including:

- temporal buffer contract and randomized reference stress;
- Donor intent schedule invariance;
- discontinuity / tail-window characterization;
- randomized frame/epoch mapper falsification;
- browser delivery seam specimen;
- late delivery policy falsification;
- semantic intent age preservation;
- context-dependent late-edge boundary characterization.

The earlier naive forward-placement experiment remains historical failed evidence and is no longer a qualification gate.

## Current best model

The emerging temporal contract is now layered:

1. **epoch ownership** — is this history still part of the current simulation continuity?
2. **event class** — present state vs momentary edge;
3. **occurrence age** — how much of the action's own semantic lifetime remains?
4. **world-context dependence** — has the simulation already crossed a state-dependent opportunity that cannot be exactly reconstructed without history/rollback?

This is intentionally not reduced to one latency threshold.

## Next gate

Before integrating `PlayerInput`, design one narrow **late-intent approximation policy specimen** for the non-rollback runtime.

It should prioritize the common case rather than solve arbitrary historical recovery:

- ordinary retained input that has not missed a simulation opportunity stays exact;
- held state reconciles to current state across an explicit discontinuity;
- stale/expired edges are dropped;
- fresh edges retain their original age;
- if a state-dependent opportunity has already been crossed, expose that fact and test bounded candidate approximations rather than silently replaying historical eligibility.

The next research question is not "what global grace period should we use?".

It is:

> **What is the smallest bounded approximation policy that preserves responsiveness in ordinary browser scheduling without fabricating old world state?**

## Scope boundary

This checkpoint does not:

- add rollback;
- modify Donor mechanics;
- modify `PlayerInput`;
- change `main`;
- claim a final jump-latency policy;
- claim Owner feel acceptance;
- begin A3/A3b or E20 gameplay work.

**Current stage: TEMPORAL TRUTH MODEL STRONGER / NON-ROLLBACK LATE-INTENT APPROXIMATION POLICY NEXT.**
