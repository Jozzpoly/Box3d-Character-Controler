# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest relevant ledger, currently [`docs/E8_UNILATERAL_AXIAL_COMPLIANCE.md`](docs/E8_UNILATERAL_AXIAL_COMPLIANCE.md).

## Current accepted player — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

A‴ is current-best because it passed machine qualification and Owner free play, removing a real stale blocked-velocity feel defect while preserving accepted traversal, dynamic-body consequence and moving-support behavior.

Current static/kinematic constraint interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Historical `createDonorCharacter(...)` deliberately remains frozen **Donor v0 / A″**.

Important ground values:

- virtual interaction mass `80 kg`;
- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- gravity `20 m/s²`;
- fixed outer step `1/60 s`;
- canonical `4` Box3D substeps.

A‴ is a **controller-owned mover**. Its accepted translation is not rigid-body propulsion of an articulated player. That distinction drives the E3–E8 bridge-research line.

See:

- [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md)
- [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md)

## Research lineage

### E3 — finite physical posture

At the standard finite `320 Nm` E3.1 specimen:

- direct `64 N·s` — RECOVER;
- direct `80 N·s` — FALL;
- real `35 kg` ram `3.0 m/s` — RECOVER;
- `4.0 m/s` — FALL.

Owner feedback was positive: the specimen felt like a primitive mannequin physically fighting for balance.

E3.2 showed a real local bounded internal-angular-momentum mechanism, but recoverability changed materially/non-monotonically across solver substeps. It is not a substrate-robust recovery capability in the tested representation.

### E4 — accepted translation vs finite posture

Anticipatory physical preparation based on near-term intent can preserve accepted-strength inertial demand without raising the `320 Nm` posture budget:

- current `31 m/s²` launch: lead0 F/F, lead8 R/R at substeps `2/4/8`;
- current `36 m/s²` braking: lead0 F/F, lead8 R/R at substeps `2/4/8`;
- both lead8 cases fail at substep `1`.

`lead8` is research evidence, not gameplay timing. Solver substeps are an evidence axis, not a tuning knob.

### E5 — translational authority accounting

World-external authority can reproduce accepted acceleration without support but injects net system momentum. Support-mediated exchange requires support and can preserve equal-and-opposite momentum.

With ordinary `μ=.95` support and the recovered lead8 posture, real contact supplied about **64.6–71.0%** of full `80 kg × 5.2 m/s` ramp impulse; body speed reached about **4.20–4.42 m/s** while support reached `5.2 m/s`.

Therefore:

> **Posture preparation materially increases physically earned translational authority, but the current single-support organism does not fully reproduce accepted A‴ translation through contact alone.**

### E6 — primary-path latent translation rejected

Hard rule:

> **Representation match before actuation.**

Both a serial prismatic carriage and a cleaner two-body two-DOF primary-ankle replacement changed qualified mechanics while translation was locked. Do not keep searching primary-ankle latent-DOF variants merely to find a pass.

### E7 — parallel support-set boundary

A `1 kg`, `0.9 m` parallel probe passed inactive representation matching. Finite `18 Nm` equal-and-opposite internal actuation then acquired real persistent **probe↔platform** contact in both sagittal directions while primary support remained intact.

But quiet settling did not produce meaningful body-load transfer, and a current31 demand-aligned COM shift caused primary support to unload/loss while the probe stayed grounded and the organism fell rather than establishing stable dual-support HOLD.

Therefore:

> **Contact acquisition is not support capacity. A useful support-set mechanism must prove a stable, regulatable compressive load path.**

### E8 — unilateral axial compliance / serial telescope boundary

E8 qualified three useful substrate facts:

1. a distance-joint spring can provide finite mirrored **compression-only** axial response with effectively zero tension;
2. a limit-only prismatic guide can suspend a real distal mass at an extension stop while the compression spring remains tension-free, then relinquish axial load to the spring inside travel;
3. an exact internal prismatic latch can be released cache-safely by clearing limit state around the limit change; direct SetLimits-only release leaves a measurable warm-start difference.

E8 then embedded a deliberately mass/COM/inertia-matched split of the already-qualified E7 probe:

`torso → locked revolute → proximal → locked prismatic → distal`

with the unilateral distance spring in parallel.

After identifying and causally removing one split-induced distal↔torso self-contact, the candidate preserved the macro current31/lead8 representation envelope very closely — but its exact locked placement hinge drifted about `0.295°`, exceeding the predeclared `0.25°` inactive mechanical gate in both directions.

Removing the distance spring did not remove the drift. Native `b3RevoluteJoint_GetAngle(...)` reproduced the same maximum `0.296716°`, ruling out the historical world-angle proxy as the cause.

Therefore:

> **The axial-compliance primitive is viable, but this particular latent serial telescopic representation is not qualified to advance into actuation or load-sharing tests.**

The `0.25°` gate was not relaxed after observing `~0.295°`.

Ledger: [`docs/E8_UNILATERAL_AXIAL_COMPLIANCE.md`](docs/E8_UNILATERAL_AXIAL_COMPLIANCE.md).

## Current research boundary

The next high-information family should avoid carrying the failed latent serial prismatic topology while inactive.

A current candidate for testing — **not architecture selection** — is a rigid-stow / mechanical-clutch family:

- preserve the split branch mass/COM/inertia;
- make the split branch mechanically rigid while inactive;
- first ask whether that rigid split reproduces the qualified one-piece E7 probe inside the same representation envelope;
- only on PASS, separately qualify a state-continuous rigid-stow → axial-guide/compliance transition with no material pose/velocity/momentum/energy kick.

A minimal articulated support and explicit bounded gameplay authority from the E5 fork remain live alternatives.

Do not by inertia:

- tune rejected E6/E7/E8 representations until they pass;
- relax E8.1's `0.25°` gate to fit the observed result;
- activate the failed E8.1 topology anyway;
- call E7 ground acquisition stepping/gait;
- build a full humanoid by default;
- weaken accepted A‴ `31/36 m/s²` agency;
- tune solver substeps for a preferred outcome.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

Alias: `?mode=e3`.

E3.2–E8 are machine research only.

## Normal controls

- `WASD` / touch left stick — camera-relative movement;
- `Space` / `JUMP` — jump;
- `Shift` / `SPRINT` — sprint;
- mouse/touch drag — orbit camera;
- mouse wheel — zoom;
- `R` / `RESET` — reset;
- `H` — telemetry.

## Research / historical URL modes

- `?mode=balance` or `?mode=e3` — E3.1 experimental surface;
- `?mode=controller` — Foundation A;
- `?mode=solver` — B;
- `?mode=causal` — A′;
- `?mode=momentum` — historical A″ research composition;
- `?mode=donor` or `?mode=previous` — frozen Donor v0 / A″;
- `?mode=constraint` — compatibility alias resolving to current A‴;
- `?mode=causal&capture=1` — historical A′ Owner-capture path.

Historical modes are evidence/regression tools, not normal user-facing choices.

## Runtime provenance

Current browser substrate:

- `box3d.js@0.1.1`;
- `three@0.183.0`;
- `vite@7.0.0`.

For documentation authority and evidence navigation see [`docs/README.md`](docs/README.md).