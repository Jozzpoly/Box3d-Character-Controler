# E2.2c-0 — Residual Slide Reproduction Gate

Status: **bounded laboratory reproduction gate complete; Owner-like specimen NOT qualified; production runtime unchanged**.

This stage followed E2.2b without assuming that its synthetic post-contact persistence isolate was the dominant cause of the residual slide reported in Owner free play.

## Question

> Can production A-prime deterministically reproduce, under ordinary gravity and without forced separation or recovery hacks, the same broad kind of excessive post-bounce slide observed by the Owner around dynamic props?

The stage intentionally did **not** modify controller behavior, tune recovery constants, split momentum state, or begin phase attribution before a useful specimen existed.

## Method

The probe uses the production `ControllerOwnedCharacter` with:

- `reciprocityMode: 'causal-components'`;
- normal gravity (`20 m/s^2` character/world setup);
- the existing `80 kg` virtual interaction mass;
- zero player input during the measured trial;
- ordinary dynamic boxes with existing-style friction/damping;
- no forced post-contact body separation;
- no test-local damping or momentum edits.

Every candidate was run three times. The three repeats were exactly deterministic for the recorded quantities.

The first implementation mistake was rejected rather than interpreted: it measured the **last** dynamic contact in the whole three-second trial. Later incidental recontacts therefore made otherwise useful first-bounce windows appear to have no post-contact interval. The harness was corrected to identify the **first contiguous dynamic-contact episode**, its first natural separation, and any subsequent recontact before the requested post-contact sample.

## Bounded candidates

### 1. Edge glance — slow

A small horizontal carry (`0.35 m/s`) accompanied a normal-gravity fall near the edge of a standing dynamic cube.

Stable result across all three repeats:

- first contact episode: frames `20–96` (`77` frames);
- first later recontact: frame `116`;
- peak manual impulse during the first episode: `266.0 N*s`;
- peak horizontal character speed during the episode: only about `0.03 m/s`;
- peak remembered external speed: about `0.03 m/s`;
- dynamic body angular response: about `8.04 rad/s`;
- uncontaminated displacement over the first `0.25 s` after separation: `0.000 m`;
- character was already on static support at that sample.

**Verdict:** strong dynamic interaction, but no residual-slide reproduction.

### 2. Edge glance — medium

A larger horizontal carry (`0.75 m/s`) was tested in the same family.

Stable result:

- first contact episode: frames `20–64` (`45` frames);
- recontact: frame `66`, only two frames later;
- peak impulse: `232.9 N*s`;
- peak horizontal speed: about `0.33 m/s`;
- external speed remained about `0.02 m/s`.

There is no clean `0.25 s` post-bounce interval to measure.

**Verdict:** not a usable bounce-tail specimen.

### 3. Player-driven arc — ordinary speed

To move closer to Owner-like play, the character itself entered the dynamic prop after a plausible locomotion-speed airborne carry (`3.2 m/s`), rather than launching the prop into the player.

Stable result:

- first dynamic contact begins at frame `20`;
- remains active through frame `179` (end of trial, `160` contact frames);
- peak impulse: `251.2 N*s`;
- peak horizontal speed during the episode: `2.78 m/s`;
- no horizontal `externalVelocity` response was produced in the measured episode.

**Verdict:** continuous/riding interaction, not a naturally separated bounce-tail specimen.

### 4. Player-driven arc — faster near-neighbour

A nearby plausible carry (`4.0 m/s`) was used as one bounded geometry/speed neighbour rather than opening a wide parameter sweep.

Stable result:

- first contact episode: frames `20–161` (`142` frames);
- recontact at frame `175`;
- peak impulse: `215.1 N*s`;
- peak horizontal speed: `3.58 m/s`;
- no horizontal `externalVelocity` response was produced during the first episode.

The first separated interval is shorter than `0.25 s` before recontact.

**Verdict:** again not a clean residual-bounce specimen.

## Normal-gravity persistence control

A separate `airborne-side-ram` was retained only as a **mechanism control**, not promoted as the Owner-like reproduction.

A dynamic body approaches a stationary airborne A-prime under normal gravity. Unlike E2.2b, the body is **not** forcibly kicked away after contact.

Stable result:

- first contact episode: frames `14–15` (`2` frames);
- natural separation occurs;
- first recontact: frame `36`;
- peak impulse: `157.9 N*s`;
- peak horizontal `velocity` and `externalVelocity`: about `2.12 m/s`;
- after `0.25 s` without dynamic recontact: `0.515 m` additional displacement;
- at that point both horizontal `velocity` and `externalVelocity` remain about `2.007 m/s`;
- character remains airborne at the `0.25 s` sample.

This is useful corroboration that the E2.2b persistence mechanism survives **normal gravity and natural first separation**. It does **not** establish that the Owner's residual slide during jumping/landing around props follows this exact collision path.

## Gate verdict

> **Owner-like laboratory reproduction: NOT QUALIFIED.**

The bounded edge/fall and player-driven arc candidates did not produce a clean, naturally separated residual-slide event that is close enough to the Owner complaint to justify detailed phase attribution.

At the same time:

> **Normal-gravity post-contact persistence remains independently corroborated.**

The side-ram control gives a short natural contact followed by a large no-input airborne tail, so E2.2b was not merely a zero-gravity/forced-separation artifact.

These two facts must not be conflated.

## Consequence

The project should **not** continue tuning laboratory offsets, speeds, masses, or box geometry until a desired pathology appears. Doing so would create a specimen by search rather than recover the phenomenon that motivated the research.

Therefore this stage intentionally does **not** begin E2.2c phase attribution and does **not** implement any recovery/state candidate.

The strongest next-method candidate is to instrument a real Owner free-play interaction lightly enough to capture the natural event, then convert that observed event into a deterministic specimen if possible. That is a distinct next stage/method and is not started here.

## Non-claims

E2.2c-0 does not establish that:

- the Owner residual slide cannot be reproduced deterministically;
- post-contact persistence is irrelevant to the Owner complaint;
- contact generation is the dominant Owner failure;
- the side-ram control is representative of ordinary gameplay;
- A-prime needs a specific recovery/state representation;
- source-separated momentum is required;
- A-prime has beaten the solver-owned B representation.

## Repository scope

This stage changes only diagnostic/research surfaces:

- `scripts/e2-2c0-residual-slide-reproduction.mjs`;
- `package.json` smoke coverage;
- this research record.

No `src/*` runtime behavior is changed.
