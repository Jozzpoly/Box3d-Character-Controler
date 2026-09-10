# R2 temporal discontinuity checkpoint — 2026-09-11

## Status

**R2 TEMPORAL SUBSTRATE QUALIFIED IN ISOLATION / FRAME-EPOCH MAPPER QUALIFIED IN ISOLATION / BROWSER INTEGRATION NOT STARTED**

This checkpoint extends the R2 temporal-input work beyond ordinary event-to-tick entitlement. It records the discovered interaction between browser wall-clock delivery, the existing 100 ms frame clamp, fixed simulation time and explicit temporal epochs.

## Truth anchors

Canonical product baseline remains unchanged:

- `main` @ `e7a98beaca4c010e056c31db97b33c05b4610e38`

Qualified R1 repair carrier remains:

- `research/donor-foundation-repair-a4-2026-09-10` @ `1d79d7c453894440a3125a82937b1968d7c9b4fd`

R2 isolated substrate branch:

- `research/temporal-input-substrate-r2-2026-09-10`

No `PlayerInput`, Donor runtime or `main` integration has been performed in this stage.

## Existing R2 evidence preserved

The branch retains the earlier R2 findings:

- `TemporalInputBuffer` rejects duplicate ordering authority, invalid clocks, same-epoch simulation rewind and late delivery behind the already-consumed simulation frontier;
- clear/reset starts a new temporal epoch;
- randomized reference-model stress covers 128 histories × 400 events × 240 fixed samples;
- timestamped history maps to the existing Donor intent contract invariantly across 30/60/144 Hz and a 100 ms hitch specimen;
- prior temporal-policy comparison supported earliest-causal assignment for continuous epochs.

## D1 — the runtime already contains a temporal discontinuity policy

Current `src/main.js` computes:

`frameDt = min(realFrameGap, 0.1 s)`

and adds only that bounded duration to the fixed-step accumulator.

Therefore, when a frame gap is longer than 100 ms, the runtime already discards wall-clock duration instead of attempting unbounded catch-up.

Executable specimen:

- a 500 ms gap accepts 100 ms;
- discards 400 ms;
- produces six 60 Hz fixed ticks;
- leaves wall time 400 ms ahead of simulation time under a naive single-epoch mapping.

A hidden-tab-style ~1.983 s pause specimen discarded ~1.883 s and likewise produced only six catch-up ticks.

**Bounded conclusion:** bounded catch-up is already part of runtime behavior, but its relationship to input-event time was previously implicit.

## D2 — preserving the old wall→simulation epoch creates stale latency

For a 500 ms gap ending at wall time 600 ms, with simulation only advancing from 100 ms to 200 ms:

- an event that occurred at wall time 350 ms still has 150 ms of simulation-time entitlement remaining after resume;
- a recent event at wall time 550 ms would remain 350 ms ahead of the post-catch-up simulation frontier under the original epoch mapping.

So preserving absolute wall-clock entitlement through discarded wall time can turn recent input into visibly stale delayed input after resume.

Applying such events immediately avoids the delay but retroactively assigns them to simulation time earlier than their original epoch entitlement.

**Conclusion:** once wall duration is discarded, exact old-epoch mapping and immediate responsiveness cannot both be preserved. A discontinuity policy is required.

## D3 — tail-window bounded catch-up

The strongest current candidate interpretation of the existing 100 ms clamp is:

> When a visible long frame gap exceeds the accepted catch-up budget, treat the retained simulation interval as corresponding to the most recent accepted wall-time tail, not the earliest part of the lost gap.

Example for a gap from 100 ms to 600 ms:

- raw gap: 500 ms;
- accepted catch-up: 100 ms;
- discarded past: 400 ms;
- retained wall-time tail: `[500 ms, 600 ms]`;
- retained simulation interval: `[100 ms, 200 ms]`.

Under that mapping:

- stale edge events before 500 ms do not replay after resume;
- held-state history before 500 ms is collapsed to a boundary state instead of replayed as historical movement;
- events inside `[500,600]` preserve chronological/causal ordering and map into the retained six physics ticks;
- a jump at 550 ms maps to simulation time 150 ms rather than remaining hundreds of milliseconds in the future.

This policy survived an adversarial phase stress:

- 512 randomized long-gap trials;
- arbitrary accumulator phase below one fixed tick;
- retained-window boundary events;
- stale and recent state/edge events;
- all retained events preserved chronological order;
- no retained event was assigned retroactively;
- quantization latency remained bounded by one 60 Hz fixed tick;
- the 100 ms accepted window consistently contributed six physics ticks without changing accumulator phase.

**Status:** qualified as an isolated policy specimen, not yet a promoted runtime architecture.

## D4 — visibility/session discontinuity should be stronger than an ordinary visible hitch

Browser platform behavior makes hidden/background operation qualitatively different from an ordinary frame stall: rendering callbacks can be paused/throttled and visibility transitions provide an explicit lifecycle boundary.

Current candidate policy:

- continuous visible frames: earliest-causal mapping inside the same epoch;
- visible long stall with discarded wall time: tail-window bounded catch-up;
- explicit visibility/session break: hard temporal epoch cut, clearing historical edge input and restarting the wall→simulation mapping from a fresh boundary.

This distinction is deliberate. A hidden-tab resume should not necessarily replay six ticks of stale interaction merely because the generic frame clamp is 100 ms.

## D5 — isolated frame/epoch mapper now makes those semantics executable

`src/temporal-frame-epoch.js` introduces an isolated `TemporalFrameEpochMapper` with no DOM or Donor dependency.

It makes three frame states explicit:

- `continuous`;
- `tail-window`;
- `hard-cut`.

It also classifies event timestamps explicitly as:

- `retained`;
- `discarded-past`;
- `future`;
- `late-after-consume`;
- `epoch-boundary`.

The mapper owns bounded wall-time accounting, fixed-step accumulator phase and epoch identity without changing the actual character controller.

Its crucible passed:

- deterministic continuous-frame contract;
- explicit 500 ms gap → 100 ms retained tail;
- stale/recent event classification;
- late-after-consume exposure;
- hard-cut accumulator reset without advancing simulation;
- 256 seeded randomized schedules × 180 frame transitions;
- repeated long stalls and hard cuts;
- monotonic simulation tick time;
- frame accounting identity `raw = accepted + discarded`;
- retained event entitlement remained inside the accepted clock window.

The complete R2 workflow, including all earlier buffer/intent/discontinuity tests, remained green at mapper qualification.

**Bounded conclusion:** the project now has an executable temporal boundary capable of representing the policy discovered by the research. This does not yet prove that browser event delivery and existing controls can be integrated without semantic loss.

## Important unresolved seam — delivery order around the first resume frame

The browser event loop can queue user-interaction tasks separately from rendering work. An event may carry a historical occurrence timestamp yet its handler can execute only after other work has advanced.

The R2 buffer and frame mapper now expose this condition rather than silently retiming it, but the real runtime still needs a policy for event handlers arriving around a discontinuity boundary.

Do not hide this by clamping timestamps silently.

The next integration specimen should explicitly observe/model:

1. wall-time occurrence (`Event.timeStamp`);
2. handler/delivery time;
3. retained wall-time window for the frame;
4. simulation frontier before and after catch-up;
5. temporal epoch id;
6. event classification;
7. whether a state event is reconciliation vs ordinary retained history;
8. whether an edge is stale, retained, or late-after-consume.

## Next gate

Do not wire the full existing `PlayerInput` directly into production runtime yet.

Create one narrow **browser delivery specimen** that uses real DOM-style event timestamps and the isolated mapper/buffer without changing Donor mechanics. Its purpose is to falsify the seam between browser delivery order and the already-qualified temporal substrate.

At minimum cover:

- normal continuous key transitions;
- visible long main-thread stall;
- event occurrence inside the retained tail;
- event occurrence inside discarded past;
- event handler arriving after a frame has consumed its entitlement;
- `blur`/visibility hard cut;
- held state reconciliation vs stale edge behavior.

Only if this survives should `PlayerInput` integration be designed.

## Scope boundary

This checkpoint does not:

- change canonical `main`;
- modify current Donor mechanics;
- modify `PlayerInput`;
- claim Owner feel acceptance;
- choose a final stale-edge freshness rule for every gameplay action;
- implement rollback;
- begin A3/A3b repair or E20 gameplay work.

**Current stage: TEMPORAL SUBSTRATE + FRAME-EPOCH MAPPER QUALIFIED IN ISOLATION / BROWSER DELIVERY SPECIMEN NEXT.**
