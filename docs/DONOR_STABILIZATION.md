# Donor stabilization — historical A″ qualification

Status: **historical foundation stage; superseded as the live downstream contract by `docs/DONOR_CONTRACT.md`**.

This document records the first step that separated a downstream donor from the research comparison runtime. It should be read as provenance, not as the current import/API description.

## Boundary recovered before stabilization

Continuity recovery established the latest confirmed mechanics boundary as merged E2.3:

`02d3528cae47f4b04f594dda4ed0a66727033edd`

No later unmerged E2.4 implementation line was recovered at that point. E2.3 was diagnostic-complete and deliberately left production behavior unchanged.

## Behavior selected

The donor candidate was the existing Owner-preferred **A″** behavior:

- controller-owned capsule state;
- causal-component dynamic reciprocity;
- dynamic-contact reaction changes current velocity and the contacted body;
- that reaction is not retained as a persistent horizontal `externalVelocity` target;
- moving-support inheritance remains unchanged;
- current locomotion/jump/support parameters remain unchanged;
- current `box3d.js@0.1.1` constraint-velocity behavior remains unchanged.

This was a pragmatic current-best choice, not a claim that A″ was the final embodiment architecture.

## Original stabilization implementation

The first stabilized entry point composed the already-qualified runtime behavior from:

1. `ControllerOwnedCharacter` with causal-component reciprocity;
2. the E2.2c-2 velocity-only contact-memory adapter.

At this historical stage the adapter was still owned by `momentum-semantics-probe.js`. The later Donor Contract v0 foundation moved ownership of that behavior into `src/donor/contact-memory.js` while keeping the old probe import as a compatibility/provenance alias.

## Qualification evidence

Original candidate head:

`8271642aa794f2c0e50218d71b3044b77b07b14e`

GitHub Actions run `33541996531`:

- complete historical smoke: **PASS**;
- donor equivalence gate: **PASS**;
- production build: **PASS**.

The equivalence gate advanced the existing public A″ composition and the donor factory through separate identical worlds for 360 fixed ticks, compared character/world state every tick, required dynamic contact, and failed on divergence above `1e-9`.

Merged stabilization main:

`d4e98787c179ab14816b87ca6073f353a50386b6`

Its full smoke/build and Pages deployment also passed.

## Known boundaries deliberately inherited

The stabilization did not hide or repair:

- E2.3 `b3CollisionPlane.push` binding-state loss;
- the fact that activating native-intended clipping materially changes contact lifecycle;
- strong grounded horizontal momentum consumption (`groundDeceleration = 36 m/s²`);
- virtual interaction mass/manual dynamic reciprocity/explicit support transport;
- the fact that A″ is current-best evidence, not a final representation winner.

## Current continuation

For new downstream work, use the live contract documented in:

`docs/DONOR_CONTRACT.md`

The historical lesson preserved here is important: donor promotion began by **reusing qualified behavior and proving equivalence**, not by rewriting the controller for architectural neatness.
