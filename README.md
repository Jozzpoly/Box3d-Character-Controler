# Box3D Character Controler — Embodied Player Laboratory

This repository is not trying to prove one final character-controller architecture. It is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current foundation candidate

`Foundation 01` replaces the sterile E1-A2 fixture with a small open physical playground. It is deliberately more playable while staying mechanically legible.

Current character representation:

- controller-owned capsule position/state;
- gravity, jump, collision and support through Box3D mover queries;
- camera-relative WASD input;
- orbit/follow third-person camera;
- explicit `80 kg` virtual interaction mass;
- one general normal-impulse exchange for dynamic contacts, including equal-and-opposite character velocity response;
- support transport through a body-local contact anchor, so translation and rotation of a moving support can carry the character;
- no active ragdoll, IK, animation locomotion, mantle, stair special cases or universal framework.

The playground contains loose bodies with different masses, spheres, a stack, a long plank, a dynamic slab, simple static terrain, a raised edge with a lower catch floor, and one moving/rotating kinematic support. None is a prescribed test fixture.

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

See [`docs/RESEARCH.md`](docs/RESEARCH.md) for claims, non-claims and Owner observations.

## Runtime provenance

Current browser substrate is intentionally small:

- `box3d.js@0.1.1`
- `three@0.183.0`
- `vite@7.0.0`

Important: `box3d.js@0.1.1` currently vendors native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92` (the Box3D 0.1.0-era snapshot). The JS package version must not be confused with the latest native Box3D `main`.

## Local validation

```bash
npm install
npm run smoke
npm run build
```

The smoke gate exercises real Box3D APIs and currently targets four foundation properties: static fall/jump, natural dynamic push, reverse physical perturbation of the controller-owned player, and moving-support transport.
