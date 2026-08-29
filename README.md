# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current research state — E2.1 localization complete

`Foundation 02.1` remains the exact Owner-tested controller-owned comparison specimen **A**. E2 added solver-owned translational-root specimen **B**. Owner free play then rejected both as satisfactory current locomotion options:

- **A** traverses ordinary stairs, but Owner observed a strange slippery / unstable effect that can appear around jumping onto physical objects;
- **B** has cleaner solver-owned physical coupling, but ordinary small terrain discontinuities too often become walls that require repeated jumping.

E2.1 did **not** build a third controller. It localized those two failure families while leaving the public A/B runtime unchanged.

Exact machine-qualified E2.1 diagnostic specimen before documentation: `3725586c6369a978afbdb0f63a8c02fb1f03a451`.

Full mechanism map: [`docs/E2_1_LOCALIZATION.md`](docs/E2_1_LOCALIZATION.md).

## A — Foundation 02.1 controller-owned baseline

- controller-owned capsule position/state;
- explicit `80 kg` virtual interaction mass;
- mover collision/plane solve;
- general effective-mass impulse exchange for dynamic contacts;
- gravity/support through mover queries;
- body-local support transport;
- persistent external recoil component;
- camera-relative bounded locomotion and shaped jump;
- exact Owner-tested Foundation 02.1 runtime: `12841bd5c095827092ee5aae0acc19981a848490`.

### E2.1 finding for A

Flat support-velocity inheritance is deterministic and proportional to support point velocity; it did not by itself reproduce the Owner anomaly.

A zero-input vertical edge-landing probe did reproduce the failure family:

- on a static cube near the edge, A produced about `0.24 m` lateral **position drift while horizontal velocity remained `0.00 m/s`**;
- on the corresponding dynamic cube, the same case grew to about `1.10 m` drift and `1.34 m/s` peak horizontal speed with about `259 N·s` of manual dynamic-contact impulse.

Diagnostic decomposition showed:

- disabling manual dynamic impulse exchange reduced the dynamic-edge case from about `1.10 m` to `0.23 m` drift;
- disabling body-local support transport left about `1.00 m` drift.

Current interpretation:

> Rounded mover edge geometry creates a base lateral positional correction; A's manual dynamic reciprocity is the dominant amplifier in the reproduced dynamic-object anomaly. Support-anchor transport is not the dominant amplifier.

This is a localized causal result, not a claim that every A slippery event has exactly the same path.

## B — E2 solver-owned translational root

- real Box3D dynamic capsule with actual `80 kg` solver mass;
- translation and collision response owned by the solver;
- angular motion intentionally locked so E2 does not also test balance/falling/orientation recovery;
- locomotion and jump through bounded centre-of-mass impulses;
- real contact manifolds provide support classification;
- no mover-based position solve;
- no manual dynamic effective-mass exchange;
- no manual support-position transport;
- no horizontal velocity overwrite;
- provisional player friction `0.45` remains a research setting, not optimized feel.

### E2.1 finding for B

A no-jump vertical-step sweep found the natural traversal boundary in the diagnostic fixture:

- A: passes up to `0.25 m`, blocks at `0.30 m`;
- B at friction `0.20`: passes up to `0.10 m`;
- B at friction `0.45`: passes up to `0.10 m`;
- B at friction `0.82`: passes only `0.05 m`.

More friction did not solve the problem and could make it worse.

A second sweep increased B ground authority from `13` through `26`, `52` and `104 m/s²`. Steps `0.15`, `0.20` and `0.22 m` remained blocked even at the highest authority, despite very large bounded control impulses. The body gained only about `0.01–0.02 m` of vertical rise at the obstacle.

Current interpretation:

> B's rough-terrain failure is not primarily insufficient traction or an underpowered horizontal motor. A simple upright solver-owned capsule has a genuine contact/geometric boundary at small vertical discontinuities and needs some additional terrain-negotiation capability if it is to support ordinary rough-ground locomotion.

## What E2.1 changed conceptually

The immediate problem is no longer well described as **A versus B**.

Two responsibilities need to be studied separately:

1. **terrain negotiation / locomotion affordance** — ordinary small discontinuities should not require constant jump input;
2. **physical coupling / consequence** — dynamic contact must remain causally coherent without edge geometry plus reciprocity producing disproportionate lateral behavior.

A currently gets terrain continuity from rounded mover contact geometry, then layers manual reciprocity on top. B gets cleaner solver-owned consequence, but has no mechanism that interprets a vertical discontinuity as terrain to negotiate.

The next useful experiment should test the smallest terrain-negotiation capability that can coexist with solver-owned physical consequence **without simply recreating A's edge/dynamic failure mode**.

That is a new stage and has not been started.

## Public A/B controls

The public build still contains the E2 comparison surface:

- `1` — **A: Foundation 02.1 controller-owned**
- `2` — **B: E2 solver-owned translational root**
- `WASD` — move relative to camera
- `Space` — jump
- `Shift` — sprint
- mouse drag — orbit camera
- mouse wheel — zoom
- `R` — reset world + player
- `H` — toggle causal telemetry

Changing A/B mode reloads the world so the second representation does not inherit a disturbed playground from the first. A remains the default.

Public build: https://jozzpoly.github.io/Box3d-Character-Controler/

The current public A/B surface is retained as evidence. Neither A nor B is accepted as the next controller direction.

## Playground

The yard remains intentionally open rather than a prescribed obstacle course. It contains ordinary rigid bodies with different mass/shape affordances, a loose stack, slab, beam, static elevation changes and one translating/rotating support.

Foundation 02.1's known traversal fixtures remain present:

- four `0.22 m` static stair rises;
- a nearby `0.52 m` jump boundary;
- low dynamic props that remain physical/pushable matter.

Those traversal outcomes remain evidence for A, not universal requirements imposed on every future representation.

## Evidence history

The current implementation is disposable; accepted observations are not.

- `cadb9405097ede149e64a64d8070c6127e8849a5` — E1-A1 planar physical-contact baseline.
- `5fd2aabdff35e79944bd82901175a9f64e73578f` — E1-A2 static gravity/support gate.
- `ee5bb1813ac691750359c1d8f6f3934c29d9426b` — E1-A2 dynamic-support specimen.
- `1416c2b7dc618fa99e5a3916326414178414997f` — Foundation 01 open embodied-player playground.
- `9d6e8ca77d024e784ed6aa5d71786ee3e223733d` — Foundation 02 quality/feel baseline.
- `12841bd5c095827092ee5aae0acc19981a848490` — exact Owner-tested Foundation 02.1 runtime.
- `ca7316da9d80ae1bf0fd009629316352991c9733` — machine-qualified E2 A/B runtime before documentation.
- `3725586c6369a978afbdb0f63a8c02fb1f03a451` — machine-qualified E2.1 diagnostic mechanism-map specimen before documentation.

See [`docs/RESEARCH.md`](docs/RESEARCH.md) for the earlier evidence ledger and [`docs/E2_1_LOCALIZATION.md`](docs/E2_1_LOCALIZATION.md) for the current terrain/support localization.

## Runtime provenance

Current browser substrate remains intentionally small:

- `box3d.js@0.1.1`
- `three@0.183.0`
- `vite@7.0.0`

`box3d.js@0.1.1` vendors native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92`. Binding version and native engine snapshot are distinct provenance facts.

## Validation

```bash
npm install
npm run smoke
npm run build
```

Validation still runs the frozen Foundation 02.1 gates and E2 gates first. E2.1 adds deterministic diagnostics for support/jump velocity transfer, A/B vertical-step boundaries, zero-input edge landing, B authority sensitivity and diagnostic decomposition of A's dynamic-edge amplification.

The decomposition uses test-local monkey patches only; production character runtime source is unchanged by E2.1.

## Current stage boundary

E2.1 is complete at a **mechanism map**, not a new controller.

Do not automatically:

- polish A further;
- increase B friction/force further;
- add teleporting step-up;
- start active ragdoll or multi-body articulation;
- combine A and B into a general framework.

The next stage must first choose the smallest falsifiable experiment for **terrain negotiation with preserved physical consequence**. That selection and implementation belong to a separate stage.
