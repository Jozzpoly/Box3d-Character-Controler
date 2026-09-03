# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest stage ledger, currently [`docs/E10_ONE_PIECE_SUPPORT_BRACE.md`](docs/E10_ONE_PIECE_SUPPORT_BRACE.md).

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

E5 therefore leaves an explicit fork: earn more agency physically, or preserve accepted agency with a separately accounted bounded residual.

### E6 — primary-path latent DOFs rejected

Hard rule:

> **Representation match before actuation.**

Adding latent translation into the qualified primary ankle path changed mechanics before actuation. That family was closed.

### E7 — real second contact, no stable load regulation

A representation-neutral `1 kg × 0.9 m` parallel probe passed inactive matching. Finite `18 Nm` equal-and-opposite internal actuation acquired real persistent probe↔ground contact in both sagittal directions.

But the hinged probe did not establish meaningful stable body-load transfer. Under demand-aligned COM shift, the probe stayed grounded while primary support unloaded and the organism fell.

> **Contact acquisition is not support capacity.**

### E8/E9 — serial split economics rejected

E8 qualified finite compression-only axial-compliance primitives, but the embodied mass/COM/inertia-matched split telescope failed the strict inactive mechanical representation gate.

E9 removed the prismatic joint and spring entirely. Even a rigidly welded split preserving branch mass, COM and sagittal inertia failed internal representation (`~0.292–0.294°` placement-hinge and `~0.323–0.328°` weld drift versus `0.25°`).

Therefore another serial constrained body is not a free way to obtain a better support mechanism on the current substrate.

### E10 — one-piece brace transitions cleanly but still fails support regulation

E10 returned to the already-qualified one-piece E7 probe and changed only its existing revolute **after real support acquisition**.

Positive boundary:

- isolated current-angle latch: **PASS**;
- real acquisition→brace transition: **PASS**;
- matched first-frame whole-body impulse difference only `0.0424 / 0.0445 N·s` versus the existing `0.8 N·s` E5 calibration band;
- low-demand brace drift only `0.0095° / 0.0180°` versus `0.25°`.

But the project-relevant load hypothesis failed:

- quiet upright bracing did not meaningfully recruit body load onto the probe;
- under the exact E7.2b/current31 demand, unlatched controls reproduced `FALL/FALL`;
- the brace reduced peak torso excursion from about `99.6°` to `33–34°`, so it had a real stabilizing effect;
- nevertheless neither direction reached HOLD;
- primary support was absent for `100 / 73` target-phase frames and probe support for `4 / 6`;
- the brace yielded by `5.79° / 5.63°`, far outside its own `0.25°` qualified envelope.

Therefore:

> **Contact acquisition + a rigid brace is still not sufficient stable/regulatable support capacity.**

Do not rescue E10 by sweeping brace angle, torque, length, latch timing, solver settings or evidence thresholds.

Ledger: [`docs/E10_ONE_PIECE_SUPPORT_BRACE.md`](docs/E10_ONE_PIECE_SUPPORT_BRACE.md).

## Current research direction

The project deliberately returns to the **E5 design fork** rather than automatically growing more anatomy.

The next stage is a bounded decision/decomposition stage, not another joint tweak:

> **Which remaining design class has better information and gameplay economics: a genuinely new minimal physical support capability, or an honest bounded residual authority layered on top of physically earned contact contribution?**

A new physical mechanism is justified only if it introduces a causal capability E6–E10 did not already test; another serial body, stiffness variant or fixed-support lock is not enough.

A bounded assist is not forbidden by the project. It must remain explicit, separately accounted, physically support-aware where justified, incapable of silently masking total support loss, and compatible with the body remaining reactive/readable rather than decorative.

The goal is a controllable physical player, not maximal mechanical purity or maximal body-part count.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

E3.2–E10 are machine research only.

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