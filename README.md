# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest stage ledger, currently [`docs/E9_RIGID_STOW_SPLIT.md`](docs/E9_RIGID_STOW_SPLIT.md).

## Current accepted player — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

Important current values:

- virtual interaction mass `80 kg`;
- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- gravity `20 m/s²`;
- fixed outer step `1/60 s`;
- canonical `4` Box3D substeps.

A‴ is a **controller-owned mover**, not rigid-body propulsion of an articulated player. Research E3+ asks which parts of its accepted agency can be physically earned without destroying control or feel.

Historical `createDonorCharacter(...)` remains frozen Donor v0 / A″.

## Research boundary in compact form

### E3 — finite posture

Finite `320 Nm` support-mediated balance produced a real, Owner-positive embodied struggle. Bounded internal angular momentum later failed solver-resolution robustness. Do not rescue it by parameter/substep sweeps.

### E4 — preparation matters

Accepted-strength `31 m/s²` launch and `36 m/s²` braking can coexist with finite posture when the body physically prepares. `lead8` is research evidence, not gameplay timing.

### E5 — authority accounting

With ordinary `μ=.95` support and recovered lead8 posture, real contact supplied roughly **64.6–71.0%** of full `80 kg × 5.2 m/s` ramp impulse. World-external residual authority can close the gap but changes reciprocity and can mask physical insufficiency.

### E6 — primary-path latent DOFs rejected

Hard rule:

> **Representation match before actuation.**

Adding latent translation into the qualified primary ankle path changed mechanics before actuation. That family was closed.

### E7 — real second contact, no stable load path

A representation-neutral `1 kg × 0.9 m` parallel probe passed inactive matching. Finite `18 Nm` equal-and-opposite internal actuation acquired real persistent probe↔ground contact in both sagittal directions.

But the hinged probe did not establish meaningful stable body-load transfer. Under demand-aligned COM shift, the probe stayed grounded while primary support unloaded and the organism fell.

> **Contact acquisition is not support capacity.**

### E8 — axial-compliance substrate viable; serial telescope rejected

E8 qualified:

- finite compression-only distance-joint response;
- guide + unilateral-compliance role separation;
- cache-safe internal prismatic latch release.

A mass/COM/inertia-matched split telescope nevertheless failed inactive mechanical representation: placement-hinge drift about `0.295°` exceeded the predeclared `0.25°` gate. Removing the spring did not fix it; native revolute telemetry confirmed the drift.

### E9 — rigid split also rejected

E9 tested whether E8 failed specifically because of the latent prismatic/compliance DOF.

First, the pinned zero-Hz weld primitive passed finite disturbance controls with large margin.

Then the same qualified E7 branch was split into two rigidly welded `0.5 kg × 0.45 m` bodies while preserving total branch mass, COM and sagittal pivot inertia exactly. There was **no prismatic joint and no distance spring**.

Macro current31/lead8 response matched the one-piece E7 probe almost exactly, but internal mechanical equivalence still failed:

- placement hinge about `0.292–0.294°` > `0.25°`;
- weld relative alignment about `0.323–0.328°` > `0.25°`.

Therefore:

> **The problem is broader than the latent prismatic DOF. On this substrate and representation contract, adding another serial constrained body to the qualified support branch is itself mechanically consequential under the current organism dynamics.**

Do not proceed to the proposed rigid-stow → prismatic/compliance clutch. Do not relax the `0.25°` gate or tune weld stiffness, mass, geometry or substeps to manufacture a pass.

Ledger: [`docs/E9_RIGID_STOW_SPLIT.md`](docs/E9_RIGID_STOW_SPLIT.md).

## Current research direction

The next physical candidate should **reuse the already-qualified one-piece E7 probe rather than split it again**.

The smallest high-information question is:

> **After real E7 ground acquisition, can the existing probe↔torso revolute become a mechanical brace/latch at its acquired angle and establish a stable load-bearing path without adding a latent body/DOF while inactive?**

Bounded sequence:

1. qualify latch-at-current-angle transition semantics / cache behavior;
2. reproduce E7.1 ground acquisition unchanged;
3. engage the brace only after real loaded ground contact and prove no material transition kick;
4. test mirrored stable/regulatable body-load sharing using E5/E7 calibrated load accounting;
5. only on load-path PASS, ask whether it physically earns additional current31/current36 translational impulse;
6. only after machine qualification expose a useful candidate to Owner play/feel judgement.

If this simple one-piece route also fails before meaningful load sharing, step back to the E5 design fork rather than recursively growing anatomy: compare another minimal mechanism against an **honest bounded gameplay assist** with contact-earned and externally granted authority accounted separately.

The goal is a controllable physical player, not maximal mechanical purity or maximal body-part count.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

E3.2–E9 are machine research only.

## Normal controls

- `WASD` / touch left stick — camera-relative movement;
- `Space` / `JUMP` — jump;
- `Shift` / `SPRINT` — sprint;
- mouse/touch drag — orbit camera;
- mouse wheel — zoom;
- `R` / `RESET` — reset;
- `H` — telemetry.

## Runtime provenance

Current browser substrate:

- `box3d.js@0.1.1`;
- `three@0.183.0`;
- `vite@7.0.0`.

For detailed evidence navigation see [`docs/README.md`](docs/README.md).