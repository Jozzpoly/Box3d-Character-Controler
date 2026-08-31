# E2.2c-1 — Owner-marked Free-play Capture Gate

Status: **capture substrate machine-qualified; awaiting real Owner-marked event; A-prime mechanics unchanged**.

E2.2c-0 failed to qualify a laboratory fixture as sufficiently representative of the Owner-observed residual post-bounce slide. It did, however, independently corroborate that A-prime can retain substantial post-contact momentum under normal gravity and natural separation.

This stage therefore changes the evidence-acquisition method instead of tuning the controller or searching laboratory parameters until a desired pathology appears.

## Research question

> Can a naturally occurring residual-slide event, explicitly identified by the Owner during ordinary A-prime free play, be captured with enough pre-event state and world state to support later deterministic recovery?

This stage does **not** yet ask which mechanism dominates the event. Phase attribution is deferred until a real event has been captured and, if possible, replayed.

## Owner workflow

Capture is opt-in and only activates for the A-prime causal mode:

`?mode=causal&capture=1`

Controls added only in capture mode:

- `C` — mark the current experience as the residual-slide event of interest;
- `X` — export all marked events to a JSON file.

The Owner should play normally rather than follow a prescribed obstacle course. When a slide/bounce feels like the problematic behavior, pressing `C` preserves the preceding physics history from an always-running ring buffer and continues collecting a short post-roll.

One clear event is enough to attempt the next recovery gate. Two or three may help determine whether the complaint is one causal family or several, but this is not a quota.

## Capture contract

At fixed `60 Hz`, each marked event contains:

- up to `180` frames (`3.0 s`) before the Owner marker;
- `90` frames (`1.5 s`) after the marker;
- an explicit marker frame/index;
- an epoch boundary so reset discontinuities are never silently spliced into one event.

Manual world reset and automatic player reset start a new capture epoch. A marked event that is still collecting when a reset occurs is retained as explicitly truncated rather than crossing the discontinuity.

### Per-frame Owner intent

- camera-relative forward/right scalar input;
- full world-space camera `forward` and `right` basis vectors;
- jump edge;
- jump-held state;
- sprint state.

The camera basis is required because `WASD` alone does not uniquely define world-space intent in this controller.

### Per-frame character state

- position;
- velocity;
- external velocity;
- desired speed/direction;
- support type;
- dynamic-contact count;
- recorded contact impulse;
- mover plane count;
- support-transport distance;
- landing edge/speed.

This is deliberately the public/result state already exposed by the current controller. E2.2c-1 does not add per-plane causal internals or alter reciprocity/clip/support code.

### Per-frame playground state

The yard contains only a small bounded set of resettable bodies, so capture records all of them rather than guessing which nearby body mattered:

- stable diagnostic body ID;
- type;
- position/rotation;
- linear velocity;
- angular velocity;
- current playground/kinematic time.

Initial reset transforms and body types are also included once in the export metadata. Geometry and physical parameters remain defined by the canonical playground code for the capture specimen; E2.2c-1 does not attempt to invent a generic world serialization format.

## Write surface

Production physics behavior in `src/character.js` is intentionally untouched.

Capture changes are limited to:

- `src/free-play-capture.js` — opt-in ring buffer, Owner marker, epoch handling and JSON export;
- `src/main.js` — capture-mode routing, `C`/`X`, exact input handoff and post-step recording;
- `src/playground.js` — stable diagnostic IDs plus read-only resettable-body snapshots;
- `scripts/e2-2c1-capture-noninterference.mjs` — machine falsifier;
- smoke/docs routing.

Without `?mode=causal&capture=1`, `capture` is not instantiated and the normal public A/A-prime/B runtime does not execute the per-tick body snapshot path.

## Non-interference falsifier

The machine gate runs the same deterministic A-prime scenario twice in separate worlds:

1. ordinary simulation with no capture reads;
2. the same simulation while the complete capture path snapshots character intent/state and all resettable bodies every tick.

The fixture deliberately exercises a real dynamic contact. Final character and playground state are recursively compared at `1e-12` numeric tolerance.

Qualified result at implementation commit `c92183869ad9978f866863f91fda6fc4cdb9f148`:

`E2.2c-1 capture non-interference PASS: dynamicContacts=1 finalPos=0.0000,0.8950,3.7237 eventFrames=270 pre=180 post=90 bodiesPerFrame=11`

The full historical smoke suite and Vite production build also passed on that commit.

This does not prove that browser UI/export operations are incapable of affecting wall-clock frame pacing. It demonstrates the narrower required fact: the read-only snapshot path does not change the fixed-step physics result in the deterministic machine fixture.

## What this stage establishes

- a low-burden Owner marker can preserve the causal history before the subjective complaint is recognized;
- capture includes player intent, character state and enough bounded playground state to attempt event recovery;
- reset boundaries are explicit;
- machine evidence found no physics-state interference from the capture read path;
- no recovery policy or controller representation has been selected.

## Non-claims

E2.2c-1 does not establish that:

- the next Owner capture will reproduce the same mechanism as the E2.2b side-ram;
- exported state is already sufficient for bit-exact deterministic replay;
- post-contact persistence dominates the real Owner complaint;
- contact-generation/repeated-contact effects are healthy;
- source-separated momentum is required;
- A-prime is the final representation winner.

## Natural boundary

The implementation stage ends once capture is machine-qualified and publicly available.

The next distinct research stage begins only after a real Owner-marked JSON is available:

> **E2.2c-2 — Owner Event Recovery:** restore an earlier frame/world state and replay the recorded intent sequence closely enough to determine whether the marked behavior itself can be reproduced.

Only after a representative event is recoverable should deeper per-phase instrumentation be added to distinguish mover correction, active contact generation/accumulation, clipping/support transitions and post-contact persistence.
