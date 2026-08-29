# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current provisional baseline

`Foundation 02.1` is the **Owner-accepted provisional capsule baseline**. It closes two basic quality debts reported after Foundation 02 without adding a new embodiment architecture or a general traversal subsystem.

It is intentionally not a polished final character controller. Remaining capsule feel debt is deferred unless a future research question gives a reason to revisit it.

Current character representation:

- controller-owned capsule position/state;
- explicit `80 kg` virtual interaction mass;
- one general effective-mass impulse exchange for dynamic contacts, including equal-and-opposite character velocity response;
- gravity, support and support loss through Box3D mover queries;
- body-local support anchors, so translating and rotating supports can carry the character;
- camera-relative movement;
- separate ground/air movement authority;
- external horizontal recoil retained as a decaying motion component instead of being immediately overwritten by input;
- buffered/coyote jump with early-release shaping;
- smoothed orbit/follow camera with reduced vertical pumping during ordinary jumps;
- visual-only character presentation for facing, landing and impact readability; physics authority remains the capsule;
- explicit provisional visual-forward convention: local `-Z` is the character's face/forward direction.

There is still no active ragdoll, IK, mantle, authored animation locomotion, grab system, explicit stair-step policy, ground-stick/adhesion system or universal framework.

## Playground

The yard is intentionally open rather than a prescribed obstacle course. It contains ordinary rigid bodies with different mass/shape affordances, a loose stack, a slab, a beam, static elevation changes and one translating/rotating support.

Foundation 02.1 also makes one traversal boundary explicit:

- four ordinary static stair rises of `0.22 m`, which the existing rounded capsule traverses without jump and without a stair special-case;
- a nearby `0.52 m` ledge, which remains a jump boundary;
- low dynamic props remain physical/pushable objects rather than being silently converted into traversal geometry.

The goal remains to preserve both causal tests and unscripted free play.

## Controls

- `WASD` — move relative to camera
- `Space` — jump
- `Shift` — sprint
- mouse drag — orbit camera
- mouse wheel — zoom
- `R` — reset world + player
- `H` — toggle causal telemetry

Public build: https://jozzpoly.github.io/Box3d-Character-Controler/

## Evidence history

The current implementation is disposable; accepted observations are not.

- `cadb9405097ede149e64a64d8070c6127e8849a5` — E1-A1 planar physical-contact baseline.
- `5fd2aabdff35e79944bd82901175a9f64e73578f` — E1-A2 static gravity/support gate.
- `ee5bb1813ac691750359c1d8f6f3934c29d9426b` — E1-A2 dynamic-support specimen.
- `1416c2b7dc618fa99e5a3916326414178414997f` — Foundation 01 open embodied-player playground; machine-qualified and Owner-tested, but Owner judged overall quality/feel too raw for the next serious phase.
- `9d6e8ca77d024e784ed6aa5d71786ee3e223733d` — Foundation 02 quality/feel public baseline; Owner judged it better, then reported reversed visual facing and non-walkable stair fixtures.
- `12841bd5c095827092ee5aae0acc19981a848490` — exact public Foundation 02.1 runtime accepted by Owner after machine qualification and Pages deployment.

Owner closure verdict for Foundation 02.1:

- facing: PASS;
- ordinary stair ascent: PASS;
- stair descent: looks acceptable / PASS;
- remaining capsule feel debt: intentionally deferred.

See [`docs/RESEARCH.md`](docs/RESEARCH.md) for claims, non-claims, failed traversal experiments and Owner observations.

## Runtime provenance

Current browser substrate remains intentionally small:

- `box3d.js@0.1.1`
- `three@0.183.0`
- `vite@7.0.0`

Important: `box3d.js@0.1.1` currently vendors native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92`. Binding version and native engine snapshot are distinct provenance facts.

## Validation

```bash
npm install
npm run smoke
npm run build
```

The broad smoke checks coexistence of Foundation 02 physics plus Foundation 02.1 facing/traversal outcomes. A second isolated closure smoke independently verifies that the original natural-push strength is preserved (`169.4 N·s` in qualification) and that stair descent actually recovers static support. Peak descent velocity remains telemetry for Owner judgement rather than an arbitrary machine quality threshold.

## Stage boundary

Foundation 02.1 is accepted as a **known comparison/research specimen**, not an architecture winner. Do not continue polishing the capsule automatically. The next phase should start from a fresh question about physical player embodiment and may keep, replace or challenge this representation.
