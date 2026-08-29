# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current research state — E2.2 A′ awaiting Owner free play

E2 started with two deliberately contrasting specimens:

- **A** — Foundation 02.1 controller-owned mover, accepted earlier as a fair provisional capsule baseline;
- **B** — solver-owned finite-mass translational root.

Owner free play rejected both as satisfactory current locomotion options: A could traverse ordinary stairs but sometimes showed strange slippery / launch-like behavior around jumping onto physical objects; B participated more directly in solver physics but ordinary small terrain discontinuities too often required explicit jumping.

E2.1 localized those failures. E2.2 then asked whether A's dynamic-edge pathology was an unavoidable representation cost or a narrower coupling-layer problem.

The result is one new **machine-qualified survivor A′**, exposed for Owner comparison without replacing either frozen control.

Exact machine-qualified public A/A′/B runtime before E2.2 documentation: `cedf8a0315787d315445929d289651b6780d6b65`.

Detailed evidence:

- [`docs/E2_1_LOCALIZATION.md`](docs/E2_1_LOCALIZATION.md) — terrain/support boundary localization;
- [`docs/E2_2_RECIPROCITY.md`](docs/E2_2_RECIPROCITY.md) — reciprocity falsifier, rejected candidates and A′ qualification.

## A — frozen Foundation 02.1 baseline

- controller-owned capsule position/state;
- `80 kg` virtual interaction mass;
- rounded mover plane solve;
- original normal-directed effective-mass exchange with dynamic contacts;
- body-local support transport;
- persistent external recoil component;
- camera-relative bounded locomotion and shaped jump;
- exact Owner-tested Foundation 02.1 specimen: `12841bd5c095827092ee5aae0acc19981a848490`.

E2.1 reproduced A's dynamic-edge problem deterministically. A vertical drop near a dynamic cube edge produced about `1.10 m` lateral drift and `1.34 m/s` horizontal speed with about `259 N·s` of manual contact impulse. Removing only dynamic reciprocity reduced that case to the mover's underlying positional correction of about `0.23 m`.

A remains frozen because E2.2 needs it as the comparison control.

## A′ — causal-component reciprocity survivor

A′ uses **the same controller-owned mover and all the same locomotion/support mechanisms as A**. The only changed experimental variable is how manual dynamic reciprocity distributes momentum across axes.

The baseline A exchange takes an effective-mass impulse along the mover contact normal. At a rounded edge that normal may be oblique, so purely vertical approach can be converted into horizontal character velocity.

A′ instead asks which components of relative motion actually contributed to closing the contact:

- horizontal closing transfers horizontal momentum along the horizontal contact-normal direction;
- vertical closing transfers vertical momentum;
- mixed contacts use a continuous weighted combination;
- the combined transfer is not renormalized above the original normal-impulse scalar.

Working interpretation:

> **The mover owns geometric deflection. Reciprocity transfers causal momentum rather than using the mover's edge normal to manufacture a new momentum axis.**

### Machine evidence

Production-path A versus A′:

- dynamic edge at `x≈0.74`: A `1.10 m / 1.34 m/s` → A′ `0.23 m / 0.02 m/s`;
- isolated ordinary push: both `-1.48 m / 169.4 N·s`;
- reverse ram: both about `-0.16 m / 0.32 m/s` external response;
- central dynamic landing: both `159` dynamic-support frames / `474.5 N·s`;
- ordinary stairs: PASS;
- `0.52 m` ledge remains a jump boundary: PASS.

A broader edge/mixed-motion matrix found **21/21 problematic baseline cases improved, 0 cases meaningfully worse**, while the dynamic body continued receiving measurable impulse/rotation across the matrix.

Two tempting alternatives were not promoted:

- a hard cross-axis gate initially looked ideal but was falsified by a discontinuous jump from about `0.23 m` to `0.89 m` drift when a tiny horizontal approach crossed its threshold;
- an approach-aligned variant reduced the pathology but unnecessarily weakened ordinary push/reverse behavior compared with A′.

A′ is therefore a **survivor**, not an accepted replacement for A and not an architecture verdict.

## B — frozen E2 solver-owned root

- real `80 kg` Box3D dynamic capsule;
- translation/collision response owned by the solver;
- angular motion intentionally locked;
- locomotion and jump through bounded centre-of-mass impulses;
- no mover position solve;
- no manual dynamic reciprocity;
- no manual support-position transport.

E2.1 showed that its rough-terrain problem is not fixed by ordinary friction or stronger horizontal authority. In the diagnostic fixture B naturally passed only roughly `0.05–0.10 m` vertical steps, and remained blocked on `0.15–0.22 m` steps even at `104 m/s²` ground authority.

B remains useful evidence, but E2.2 intentionally did not add a terrain-negotiation subsystem to it.

## Public comparison controls

The public build now exposes three modes. Mode changes reload the world so one specimen does not inherit another specimen's disturbed playground.

- `1` — **A: frozen normal-reciprocity controller-owned baseline**
- `2` — **B: frozen solver-owned translational root**
- `3` — **A′: causal-component reciprocity survivor**
- `WASD` — move relative to camera
- `Space` — jump
- `Shift` — sprint
- mouse drag — orbit camera
- mouse wheel — zoom
- `R` — reset world + player
- `H` — causal telemetry

Public build: https://jozzpoly.github.io/Box3d-Character-Controler/

Direct A′ query: https://jozzpoly.github.io/Box3d-Character-Controler/?mode=causal

The most useful immediate Owner comparison is **A versus A′**, especially during ordinary unscripted jumping, landing, crossing edges and disturbing dynamic props. B stays available as the ownership contrast.

## Playground

The yard remains intentionally open rather than a prescribed obstacle course. It contains rigid bodies with different mass/shape affordances, a loose stack, slab, beam, static elevation changes and one translating/rotating support.

Known traversal fixtures remain:

- four `0.22 m` static stair rises;
- a nearby `0.52 m` jump boundary;
- low dynamic props that remain physical/pushable matter.

## Evidence history

The implementation is disposable; accepted observations are not.

- `cadb9405097ede149e64a64d8070c6127e8849a5` — E1-A1 physical-contact baseline.
- `5fd2aabdff35e79944bd82901175a9f64e73578f` — E1-A2 static gravity/support gate.
- `ee5bb1813ac691750359c1d8f6f3934c29d9426b` — E1-A2 dynamic-support specimen.
- `1416c2b7dc618fa99e5a3916326414178414997f` — Foundation 01 open embodied-player playground.
- `9d6e8ca77d024e784ed6aa5d71786ee3e223733d` — Foundation 02 quality/feel baseline.
- `12841bd5c095827092ee5aae0acc19981a848490` — exact Owner-tested Foundation 02.1 runtime.
- `ca7316da9d80ae1bf0fd009629316352991c9733` — machine-qualified E2 A/B runtime before documentation.
- `3725586c6369a978afbdb0f63a8c02fb1f03a451` — machine-qualified E2.1 diagnostic specimen before documentation.
- `cedf8a0315787d315445929d289651b6780d6b65` — machine-qualified E2.2 public A/A′/B runtime before documentation.

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

Canonical smoke still runs frozen Foundation 02.1 and E2 gates first, followed by E2.1 localization and E2.2 falsifiers. E2.2 includes a dedicated production-path qualification that instantiates real `ControllerOwnedCharacter` objects in both `normal` and `causal-components` modes; A′ is therefore not qualified only through test monkey patches.

## Current stage boundary

E2.2 stops at **one machine-qualified public A′ survivor awaiting Owner free play**.

Do not automatically:

- promote A′ to the accepted baseline;
- tune A′ further;
- remove the remaining mover positional edge correction;
- add B terrain negotiation;
- add free rotation, balance, ragdoll, grab or traversal systems;
- generalize the current experiment into a final controller architecture.

The next evidence is whether A′ actually removes the Owner-observed slippery / launch-like behavior in open play **without weakening the useful physical interaction or terrain continuity that made A attractive**.
