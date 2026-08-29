# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current research surface — E2 Authority Ownership Crucible

`Foundation 02.1` remains the **Owner-accepted provisional controller-owned capsule baseline**. It is preserved as comparison variant **A**, not treated as an architecture winner.

E2 adds a deliberately narrow comparison variant **B**: a solver-owned finite-mass translational root. The experiment asks whether changing who owns the player's physical state produces a meaningful difference in physical consequence and embodiment without immediately introducing ragdoll, articulation, balance or a new feature layer.

### A — Foundation 02.1 controller-owned baseline

- controller-owned capsule position/state;
- explicit `80 kg` virtual interaction mass;
- general effective-mass impulse exchange for dynamic contacts;
- gravity/support through Box3D mover queries;
- body-local support transport;
- persistent external recoil component;
- camera-relative bounded locomotion and shaped jump;
- exact Owner-tested Foundation 02.1 runtime: `12841bd5c095827092ee5aae0acc19981a848490`.

### B — E2 solver-owned translational root

- real Box3D dynamic capsule with actual `80 kg` solver mass;
- translation and collision response owned by the solver;
- angular motion intentionally locked so E2 does **not** also test balance/falling/orientation recovery;
- player locomotion and jump expressed through bounded centre-of-mass impulses;
- real contact manifolds provide support classification;
- no mover-based position solve;
- no manual effective-mass exchange with dynamic bodies;
- no manual support-position transport;
- no horizontal velocity overwrite;
- no-input horizontal control impulse is zero, so stopping, external-consequence decay and moving-support transport are produced by ordinary contact/friction;
- provisional player friction `0.45`, selected from a small sensitivity bracket as a fair research floor, not an optimized feel setting.

Machine-qualified A/B runtime before documentation: `ca7316da9d80ae1bf0fd009629316352991c9733`.

## Important E2 result so far

E2 already falsified one tempting implementation shortcut: simply putting the player on a dynamic body is not enough if the control law immediately cancels the solver's answer.

An early idle servo erased a measured reverse perturbation in one tick, so it was removed. An early moving-support law explicitly inherited support velocity, so it was also removed because it reconstructed above the solver the same kind of bridge E2 was meant to examine.

With the current minimal law, machine evidence shows that the solver-owned root can:

- reach about `5.00 m/s` through bounded impulses;
- jump about `1.28 m` and return to support;
- naturally push ordinary dynamic matter;
- acquire a real `450 kg` dynamic slab as support;
- ride a translating kinematic support about `0.96 m` with zero horizontal controller impulse and no manual position transport;
- receive a real reverse perturbation while idle without the controller cancelling it.

At the same time, the traction probe exposed a real trade-off: ordinary friction that supplies traction, passive stopping and moving-support transport also damps horizontal external consequence. This is evidence to observe in play, not a reason to add another correction system yet.

## Public A/B controls

The public build contains both variants on the same playground and presentation surface:

- `1` — **A: Foundation 02.1 controller-owned**
- `2` — **B: E2 solver-owned translational root**
- `WASD` — move relative to camera
- `Space` — jump
- `Shift` — sprint
- mouse drag — orbit camera
- mouse wheel — zoom
- `R` — reset world + player
- `H` — toggle causal telemetry

Changing A/B mode reloads the world deliberately, preventing the second variant from inheriting a disturbed playground from the first. A remains the default.

Public build: https://jozzpoly.github.io/Box3d-Character-Controler/

## Playground

The yard remains intentionally open rather than a prescribed obstacle course. It contains ordinary rigid bodies with different mass/shape affordances, a loose stack, slab, beam, static elevation changes and one translating/rotating support.

Foundation 02.1's known traversal fixtures remain present:

- four `0.22 m` static stair rises;
- a nearby `0.52 m` jump boundary;
- low dynamic props that remain physical/pushable matter.

Those traversal outcomes are evidence for A, not requirements imposed on every future embodiment representation. The goal remains to preserve both causal tests and unscripted free play.

## Evidence history

The current implementation is disposable; accepted observations are not.

- `cadb9405097ede149e64a64d8070c6127e8849a5` — E1-A1 planar physical-contact baseline.
- `5fd2aabdff35e79944bd82901175a9f64e73578f` — E1-A2 static gravity/support gate.
- `ee5bb1813ac691750359c1d8f6f3934c29d9426b` — E1-A2 dynamic-support specimen.
- `1416c2b7dc618fa99e5a3916326414178414997f` — Foundation 01 open embodied-player playground; machine-qualified and Owner-tested, but too raw for fair architecture comparison.
- `9d6e8ca77d024e784ed6aa5d71786ee3e223733d` — Foundation 02 quality/feel baseline.
- `12841bd5c095827092ee5aae0acc19981a848490` — exact Owner-tested Foundation 02.1 runtime; facing/stairs accepted and further capsule-only polish deferred.
- `ca7316da9d80ae1bf0fd009629316352991c9733` — machine-qualified E2 A/B runtime before research-ledger documentation.

See [`docs/RESEARCH.md`](docs/RESEARCH.md) for causal corrections, machine evidence, negative results, non-claims and Owner observations.

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

Validation runs the frozen Foundation 02.1 broad and isolated closure gates **before** E2 gates. E2 then checks actual finite mass, bounded impulse locomotion, no-input physical stopping, reverse perturbation without controller cancellation, natural moving-support transport, jump, natural push and dynamic support. A small friction sensitivity probe remains diagnostic rather than a pass/fail optimization target.

## Current stage boundary

E2 is **not** an architecture verdict and is not permission to automatically build a full dynamic controller.

The next required evidence is Owner A/B free play: whether the solver-owned state creates a meaningful difference in embodiment, agency and emergent physical interaction, and what causes that difference.

Until that evidence exists, do not automatically add:

- free rotation / balance;
- multi-body articulation or active ragdoll;
- grab/mantle/IK;
- another traversal framework;
- more capsule polish;
- a general character-controller architecture.

The natural boundary is a machine-qualified public A/B research instrument awaiting Owner observation.
