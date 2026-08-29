# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current foundation candidate

`Foundation 02` is a quality/feel rebuild of the controller-owned baseline. It does **not** add a new embodiment architecture or a new headline capability. Its purpose is to make the existing representation fair enough to judge seriously.

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
- visual-only character presentation for facing, landing and impact readability; physics authority remains the capsule.

There is still no active ragdoll, IK, mantle, authored animation locomotion, grab system, stair special-case stack or universal framework.

## Playground

The yard is intentionally open rather than a prescribed obstacle course. It contains ordinary rigid bodies with different mass/shape affordances, a loose stack, a slab, a beam, static elevation changes and one translating/rotating support. The goal is to preserve both causal tests and unscripted free play.

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

See [`docs/RESEARCH.md`](docs/RESEARCH.md) for claims, non-claims and Owner observations.

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

The Foundation 02 smoke gate preserves the existing physics claims while also checking jump shaping/buffering and that reverse physical perturbation survives the feel-layer changes.
