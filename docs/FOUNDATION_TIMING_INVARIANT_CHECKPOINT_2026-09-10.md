# Foundation timing invariant checkpoint — 2026-09-10

## Status

**R1 A4 GENERALIZATION SURVIVED / NEW INPUT-TIME BOUNDARY CONFIRMED / RUNTIME REPAIR NOT STARTED**

This checkpoint extends the technically qualified R1 A4 specimen without changing runtime source. The purpose is to distinguish what R1 actually solved from a broader timing contract that it did not claim to solve.

## Truth anchors

Canonical product baseline remains:

- `main` @ `e7a98beaca4c010e056c31db97b33c05b4610e38`

Qualified R1 repair carrier remains unchanged:

- `research/donor-foundation-repair-a4-2026-09-10` @ `1d79d7c453894440a3125a82937b1968d7c9b4fd`

This generalization branch was created from that exact qualified head:

- `research/foundation-invariant-a4-generalization-2026-09-10`

No runtime source change was made in this campaign. Changes are research scripts, workflow coverage and this checkpoint only.

## G1 — presentation isolation generalization

The original R1 qualification proved schedule invariance for 30 Hz, 60 Hz, 144 Hz and a legal 100 ms leading hitch with a single 90-degree camera target change.

A broader deterministic stress campaign was added:

- 256 seeded trials;
- 240 fixed physics ticks per trial;
- many target-yaw changes;
- randomized presentation `FollowCamera.update()` calls both before and after mechanical samples;
- randomized visual target positions/support state;
- occasional 100 ms presentation updates;
- reset/snap alignment checks.

Result:

- `maxControlYawDelta = 0`
- `maxControlBasisDelta = 0`

The original R1 crucible and browser integration contract also remained green.

**Bounded conclusion:** R1's separate fixed-step control state is strongly supported as an actual presentation/mechanics isolation mechanism, not merely a repair tuned to the original four render schedules.

This still does not prove that every future presentation subsystem is isolated from mechanics. It proves the `FollowCamera` control-state boundary under the exercised operations.

## G2 — adjacent temporal falsifier: wall-clock input batching

R1 removes render-smoothed camera state from mechanical basis evolution. It does not define how asynchronous browser input events map to fixed simulation ticks.

The current browser architecture runs zero or more fixed physics ticks inside a RAF callback. DOM/pointer/keyboard events can mutate live input state between RAF callbacks. Therefore, after a delayed frame, multiple catch-up ticks can observe the latest event state even when some of those ticks represent simulated time before the event occurred.

A bounded browser-style delivery model was tested with identical wall-clock desired-yaw events under 30/60/144 Hz and a 100 ms leading hitch.

Result:

- `maxDesiredYawSequenceDelta = 4.1 rad`
- `maxControlYawSequenceDelta = 1.011575880396258 rad`
- classification: `INPUT_EVENT_TO_FIXED_TICK_MAPPING_REMAINS_FRAME_BATCH_DEPENDENT`

**Bounded conclusion:** under a plausible RAF/event batching model, the current architecture permits identical wall-clock input events to be consumed by different fixed ticks depending on frame schedule.

This is not evidence that R1 failed. R1 solved a narrower presentation-state contamination path and survives its generalization tests.

## G3 — cross-input temporal matrix

The same timing question was then extended beyond desired camera yaw to movement and edge-triggered input classes:

- keyboard held-state transitions;
- touch movement-state transitions;
- queued jump edges.

Across 30/60/144 Hz and 100 ms leading-hitch schedules:

- maximum input-state delta: `1`
- maximum number of differing fixed ticks for a pair: `6`
- maximum jump-edge mismatch ticks for a pair: `2`
- 60 Hz and 144 Hz happened to match for this event schedule;
- 30 Hz and hitch schedules exposed different mappings.

Classification: `KEY_TOUCH_AND_EDGE_INPUT_MAPPING_DEPENDS_ON_FRAME_BATCHING`.

**Confirmed architectural class:** camera target, held movement state and queued edge input all share a broader unresolved question: what simulation-time entitlement should a wall-clock input event receive?

## Interpretation

The project should now distinguish at least three timing concepts instead of treating them as one:

1. **presentation time** — visual camera smoothing/render updates;
2. **fixed simulation time** — deterministic physics/control evolution;
3. **input event time** — asynchronous wall-clock events that need an explicit mapping into simulation time.

R1 establishes a useful rule for (1) vs (2): presentation updates must not mutate mechanical control state.

The new evidence shows that (3) vs (2) remains implicit.

## Why this matters to the foundation

Without an explicit input-time contract, two runs can have the same human event chronology but apply transitions to different physics ticks when render delivery differs. That can contaminate:

- locomotion trajectory;
- jump timing;
- camera-relative acquisition/reach;
- replay/comparison evidence;
- future networking or prediction work;
- Owner A/B comparisons under frame stalls.

The correct response is not automatically 'make everything deterministic at any cost'. Input latency and feel remain first-class constraints. A repair that queues events perfectly but adds perceptible latency or changes familiar response semantics could be worse than the current behavior.

## Candidate invariant for the next design stage

A stronger foundation should make this rule explicit:

> Mechanical state may depend on a sequence of fixed simulation ticks and an explicitly assigned per-tick input history, but must not depend on incidental presentation batching.

That implies a future input boundary should own the mapping from event time/order to simulation ticks instead of letting each physics batch sample mutable browser state opportunistically.

This is a candidate design invariant, not yet a promoted implementation requirement.

## Next gate

Do not implement a timestamped event queue yet.

First design and falsify candidate temporal policies against both determinism and responsiveness. At minimum compare:

- current latest-state-per-RAF sampling;
- deterministic event queue assigned to the earliest eligible fixed tick;
- snapshot/edge hybrid where held state and edge actions may have different temporal semantics;
- bounded catch-up policy for long frames.

The design must explicitly answer:

- whether an event may affect a simulated tick whose nominal time precedes the event;
- how multiple events inside one delayed frame are ordered;
- how jump/one-shot edges differ from held axes;
- what maximum additional input latency is acceptable;
- how reset/blur/pointer-cancel events are represented;
- what replay evidence needs to store.

Only after that should a narrow R2 runtime specimen be considered.

## Scope boundary

This checkpoint does not:

- change canonical `main`;
- change the qualified R1 repair branch;
- change runtime source;
- revise Donor v1 internals;
- choose a final input queue architecture;
- start A3/A3b repair;
- start E20 or any new gameplay feature.

**Current stage: FOUNDATION TIMING CONTRACT CHARACTERIZED / TEMPORAL POLICY DESIGN NEXT.**
