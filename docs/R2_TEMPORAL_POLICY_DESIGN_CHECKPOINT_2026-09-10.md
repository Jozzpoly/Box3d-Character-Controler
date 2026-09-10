# R2 temporal policy design checkpoint — 2026-09-10

## Status

**R2 POLICY RESEARCH QUALIFIED / EARLIEST-CAUSAL IS CURRENT BEST CANDIDATE / RUNTIME IMPLEMENTATION NOT STARTED**

This checkpoint continues the foundation timing work after R1 A4 generalization. It records a policy competition and adversarial falsification campaign. No runtime source was changed by R2 research.

## Truth anchors

Canonical product baseline remains:

- `main` @ `e7a98beaca4c010e056c31db97b33c05b4610e38`

Qualified R1 repair carrier remains:

- `research/donor-foundation-repair-a4-2026-09-10` @ `1d79d7c453894440a3125a82937b1968d7c9b4fd`

Temporal-foundation research branch:

- `research/foundation-invariant-a4-generalization-2026-09-10`
- R1/generalization checkpoint: `7bc8e349723a50fdcc898a298d548feb62390272`
- R2 adversarial pre-documentation head: `48a9e0f2f6b43db2b9cbca3c121905302d37a20e`

No `src/**` runtime implementation file was changed between the R1 generalization checkpoint and the R2 evidence head. R2 changes are research scripts and workflow coverage.

## Research question

The confirmed A4B/A4C boundary is broader than camera smoothing: asynchronous browser input events are currently sampled from mutable live state while zero or more fixed ticks execute inside RAF. Under delayed frames, event chronology can therefore be mapped to different nominal simulation ticks depending on render scheduling.

R2 asks:

> Which event-to-tick policy best preserves responsiveness while making simulation entitlement explicit, causal and independent of incidental frame batching?

The goal is not deterministic behavior at any cost. A candidate must preserve good control feel and avoid gratuitous input delay.

## Candidate policies

### 1. Latest-frame / current-family behavior

At each RAF callback, all currently delivered events mutate live input state; the catch-up physics batch samples that state.

Advantages:

- minimal conceptual buffering;
- can feel immediately responsive when a frame is on time.

Known cost:

- event-to-tick mapping depends on RAF batching;
- catch-up ticks can receive input whose event time is later than the nominal start of those ticks.

### 2. Earliest-causal

Each input event carries event time/order. It becomes mechanically eligible at the first fixed tick whose nominal start is not earlier than the event.

Properties under test:

- no event may affect simulated time before it happened;
- identical event chronology maps to identical fixed ticks independent of render schedule;
- quantization delay is bounded by one fixed tick (`1/60 s`) in the model.

### 3. Hybrid fast-edge

Held state uses causal eligibility, while one-shot edges such as jump are allowed to affect the next executable tick regardless of nominal simulation time.

Motivation:

- protect perceived edge responsiveness during catch-up.

Risk:

- deliberately reintroduces retroactive and schedule-sensitive semantics for edge actions.

## R2 policy comparison

Script:

- `scripts/r2-temporal-policy-design-crucible.mjs`

Workflow run:

- `34535680552` — completed / success

The first matrix confirmed:

### Latest-frame

- schedule-dependent tick streams remained;
- up to `6` differing ticks in the bounded chronology;
- value delta up to `2`;
- jump mismatch up to `2` ticks.

The first version also emitted an inferred latency number for latest-frame. That metric is **not authoritative** because repeated held-state values can cause post-hoc event attribution ambiguity. R2B below replaces this with explicit per-event identity tracking.

### Earliest-causal

- differing ticks across schedules: `0`;
- max value delta: `0`;
- jump mismatch ticks: `0`;
- maximum modeled event-to-eligible-tick quantization: `16.33333333333331 ms` in this bounded chronology.

### Causal coalesced held-state representation

Coalescing redundant held-state events before an eligible tick produced the same tick semantics in the bounded chronology:

- differing ticks: `0`;
- max value delta: `0`;
- jump mismatch ticks: `0`.

This suggests held-state queue representation can potentially be optimized without changing the entitlement law, provided ordering/edge semantics are preserved.

## R2B adversarial event-entitlement matrix

Script:

- `scripts/r2b-temporal-policy-adversarial.mjs`

Workflow run:

- `34535787039` — completed / success

Test matrix:

- 128 deterministic randomized event histories;
- 40 randomized input events per history plus deliberate boundary probes;
- held move state;
- yaw target state;
- one-shot jump edges;
- events immediately before and after a fixed-tick boundary;
- same-timestamp ordered held-state transitions;
- 30 Hz, 60 Hz, 144 Hz and 100 ms leading-hitch frame schedules;
- explicit event IDs tracked to exact applied tick IDs.

### Latest-frame result

Across the adversarial campaign:

- maximum schedule mismatch: `29` ticks;
- accumulated event-entitlement mismatches: `10476`;
- retroactive/causal violations: `22528`;
- earliest observed application relative to event time: approximately `-99.878 ms`.

Interpretation: during catch-up, the current-family policy can apply newly available input to several nominal ticks representing time before the event occurred.

### Hybrid fast-edge result

- maximum schedule mismatch: `24` ticks;
- accumulated event-entitlement mismatches: `3657`;
- retroactive/causal violations: `7704`;
- earliest observed application relative to event time: approximately `-97.926 ms`.

Interpretation: the hybrid improves edge immediacy by intentionally sacrificing the same invariant R2 is trying to establish. It remains a possible gameplay policy, but it cannot be described as schedule-independent causal entitlement.

### Earliest-causal result

- maximum schedule mismatch: `0`;
- event-entitlement mismatches: `0`;
- causal violations: `0`;
- maximum modeled event-to-tick quantization: `16.665666666666667 ms`;
- minimum modeled quantization: `0 ms`.

Within this adversarial matrix, earliest-causal is the only tested policy that simultaneously provides:

1. schedule-invariant event entitlement;
2. no retroactive application;
3. stable edge ordering;
4. bounded sub-one-fixed-tick quantization.

## Important latency interpretation

The `0..16.666 ms` bound is nominal simulation quantization, not automatically an additional full-frame perceptual delay.

At 60 Hz physics, an event occurring between fixed-tick boundaries cannot causally influence the preceding tick. Mapping it to the next eligible tick is therefore consistent with the physics sampling rate itself.

During a render hitch, the user cannot observe intermediate catch-up ticks because presentation is stalled. Earliest-causal changes which historical nominal tick receives the event; it does not necessarily add another rendered frame of waiting.

This needs browser-level owner/evidence testing before promotion. The current evidence is temporal-model evidence, not a claim of imperceptible gameplay difference.

## Current-best invariant

R1 and R2 together support a stronger candidate foundation rule:

> Mechanical evolution is driven by fixed simulation ticks and an explicit per-tick input history. Presentation updates may not mutate mechanical control state, and asynchronous input may not be applied to nominal simulation time preceding the event merely because presentation delivery was delayed.

This remains scoped current-best, not immutable architecture.

## R2 candidate design direction

If implementation proceeds, the smallest useful specimen should be an **input-time boundary**, not a Donor rewrite.

Candidate responsibilities:

- timestamp/order browser input transitions;
- maintain held-state transitions separately from one-shot edges where useful;
- expose the input snapshot/edges eligible for a specified fixed simulation tick time;
- preserve same-timestamp ordering;
- represent reset/blur/pointer-cancel explicitly;
- allow capture/replay to store tick-entitled input rather than opportunistic mutable browser state.

The runtime must not read `performance.now()` independently throughout mechanics. One clock-domain mapping should be owned centrally.

## Implementation questions still open

Before promotion, a runtime specimen must answer:

- precise clock origin and normalization for DOM `event.timeStamp` vs simulation epoch;
- initialization semantics before the first RAF/fixed tick;
- whether a timestamp exactly on a tick boundary belongs to that tick or the next (current candidate: that tick, within a narrow numeric tolerance);
- how blur/reset flushes held state and queued edges;
- whether pointer move/camera target events should be coalesced while preserving their final eligible state;
- maximum queue growth and compaction strategy;
- how long-frame clamp/drop behavior interacts with event history;
- capture/replay serialization contract;
- whether 60 Hz Owner feel remains effectively unchanged in browser runtime.

## Verification state

On R2 adversarial head `48a9e0f2f6b43db2b9cbca3c121905302d37a20e`:

- R1 browser integration contract: success;
- R1 fixed-step camera-basis crucible: success;
- R1 presentation isolation stress: success;
- A4B wall-clock batching characterization: success;
- A4C cross-input timing characterization: success;
- R2 policy comparison: success;
- R2B adversarial event entitlement: success;
- foundation/historical smoke: success;
- current promoted prototype smoke: success;
- playground build: success;
- Pages publication: skipped as expected for research branch.

## Scope boundary

R2 has **not**:

- changed `main`;
- changed the qualified R1 repair branch;
- changed runtime source;
- revised Donor v1 internals;
- chosen permanent networking/replay architecture;
- started A3/A3b support repair;
- started E20 or new gameplay work.

## Next natural stage

The evidence is now strong enough to justify a **bounded R2 runtime specimen** on a new repair branch, provided it remains reversible and preserves the current Donor contract.

That specimen should first integrate the temporal input boundary into the simplest browser locomotion path, prove same event chronology → same per-tick intent across render schedules, then extend to E19 reach/acquisition and finally require Owner gameplay comparison before canonical promotion.

**Current stage: R2 POLICY EVIDENCE QUALIFIED / BOUNDED TEMPORAL INPUT SUBSTRATE NEXT.**
