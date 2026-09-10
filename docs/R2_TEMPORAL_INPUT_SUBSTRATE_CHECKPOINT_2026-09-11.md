# R2 temporal input substrate checkpoint — 2026-09-11

## Status

**BUFFER CONTRACT PASS / DONOR INTENT BOUNDARY PASS / LATE-DELIVERY POLICY UNRESOLVED / RUNTIME INTEGRATION NOT STARTED**

This branch remains a research/recovery-safe carrier. It does not change canonical `main` and does not yet alter `PlayerInput` or the browser runtime loop.

## Why R2 exists

A4/R1 removed render-smoothed camera state from mechanical control evolution. Follow-up falsification then showed a broader timing problem: asynchronous input events could be mapped to different fixed simulation ticks depending on RAF batching.

Policy competition strongly favored earliest-causal event entitlement: an event belongs to the earliest fixed tick whose simulation time is not earlier than the event timestamp. This branch tests whether that rule can become an explicit reusable substrate rather than remaining a research observation.

## Implemented substrate

`src/temporal-input-buffer.js` now owns:

- timestamped held-state transitions;
- timestamped edge events;
- deterministic `(time, order)` sequencing;
- explicit event-order authority suitable for replay/import;
- monotonic simulation-time consumption within an epoch;
- explicit epoch reset via `clear()`;
- rejection of non-finite clocks and invalid orders;
- rejection of duplicate order authority;
- rejection of events that arrive after their eligible simulation time has already been consumed.

`src/temporal-player-intent.js` provides the narrow boundary from temporal state/edges into the existing Donor intent contract. It intentionally reuses `createDonorIntent()` rather than duplicating normalization semantics.

## Falsification performed

### Buffer contract

Hand-written boundary cases cover:

- future-event isolation;
- same-time deterministic ordering;
- edge burst preservation;
- partial queue consumption;
- explicit-order to automatic-order continuity;
- duplicate-order rejection;
- simulation rewind rejection;
- late-event rejection;
- invalid clock/order rejection;
- epoch reset;
- a 2000-event incremental eligibility queue.

### Reference-model stress

A deterministic randomized campaign compares the buffer against an independent simple reference model across:

- 128 trials;
- 400 events per trial;
- 240 fixed ticks per trial;
- held-state and edge events;
- many events deliberately clustered immediately before, exactly on, and immediately after fixed-tick boundaries;
- same-timestamp collisions;
- epoch reset and order restart.

The stress gate passes.

### Donor intent boundary

A browser-style delivery crucible delivers the same timestamped event history through different frame schedules:

- 30 Hz;
- 60 Hz;
- 144 Hz;
- a 100 ms hitch schedule.

The per-fixed-tick Donor intent sequence remains invariant for the exercised history. Existing Donor movement normalization is preserved.

## Browser reality check

The platform provides a useful primitive for this design: `Event.timeStamp` is a DOMHighResTimeStamp representing when an event was created, rather than merely the time at which the JavaScript handler begins processing it. Browser performance APIs also explicitly recognize UI events whose event timestamp predates the frame in which they are processed.

Therefore a delayed handler can still carry historical occurrence time into the temporal boundary.

However, that does **not** by itself solve late delivery. If simulation has already consumed through time `T` and an event with timestamp `<= T` is only then delivered to application code, the application has missed that event's canonical earliest-causal tick. Without rollback, it cannot both preserve original entitlement and apply the event retroactively.

The substrate therefore rejects this condition instead of silently applying the event late.

## New fundamental distinction

The timing model now has four materially different concepts:

1. presentation time;
2. fixed simulation time;
3. input event occurrence time;
4. input event processing/delivery time.

Earlier work separated (1) from (2). R2 policy work separated (3) from (2). The remaining browser-integration question is the relationship between (3) and (4).

## Candidate invariant

> A fixed tick may consume only input events explicitly entitled to that simulation time. If an event is delivered after its entitlement window has already been consumed, the runtime must surface and handle that condition according to an explicit late-delivery policy; it must not silently rewrite event time or apply the event to an arbitrary later tick.

This is still a candidate foundation invariant, not canonical project law.

## Next gate

Do not integrate `TemporalInputBuffer` into `PlayerInput` yet.

First characterize actual browser execution ordering sufficiently to choose a bounded late-delivery policy. The next research stage should distinguish at least:

- normal event delivery before the next RAF simulation batch;
- events timestamped during a long frame / main-thread stall and processed before the next RAF callback;
- any reachable case where RAF catch-up runs before an older queued input event handler;
- visibility/background transitions and long pauses;
- blur / pointer-cancel / reset semantics;
- whether a bounded catch-up cap or epoch discontinuity is preferable to rollback for very long stalls.

The policy should optimize for truthful causality and Owner feel, not theoretical determinism at arbitrary cost.

## Scope boundary

This checkpoint does not:

- modify `main`;
- modify canonical Donor mechanics;
- integrate temporal input into `PlayerInput`;
- claim browser-wide proof of event-loop ordering;
- implement rollback;
- choose a final late-delivery policy;
- start A3/A3b repair;
- start E20 or gameplay features.

**Current stage: R2 TEMPORAL SUBSTRATE QUALIFIED IN ISOLATION / BROWSER LATE-DELIVERY CHARACTERIZATION NEXT.**
