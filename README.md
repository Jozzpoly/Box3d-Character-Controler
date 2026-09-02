# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest relevant stage ledger.

## Current accepted player — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

A‴ is current-best because it passed machine qualification and Owner free play, removing a real stale blocked-velocity feel defect while preserving accepted traversal, dynamic-body consequence and moving-support behavior.

Current static/kinematic constraint interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Historical `createDonorCharacter(...)` deliberately remains frozen **Donor v0 / A″**.

Important ground values:

- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- gravity `20 m/s²`;
- fixed outer step `1/60 s`;
- canonical `4` Box3D substeps.

A‴ is a **controller-owned mover**. Its accepted translation is not rigid-body propulsion of an articulated player. That distinction drives the E3–E6 research line.

See:

- [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md)
- [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md)

## E3 — finite physical posture

E3 remains experimental and does not replace A‴.

At the standard finite `320 Nm` E3.1 specimen:

- direct `64 N·s` — RECOVER;
- direct `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- `4.0 m/s` — FALL.

Owner feedback:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

Post-Owner work separated support-mediated grounded balance from unsupported internal attitude control and support relocation. The Owner-positive grounded balance effect survives removal of the accidental unsupported reaction-wheel channel inside the tested envelope.

E3.2 demonstrated a real local bounded internal-angular-momentum mechanism at canonical resolution, but its recoverability changed materially and non-monotonically across solver substeps.

Verdict:

> **Real local mechanism, not substrate-robust recovery capability in the tested representation.**

Ledgers:

- [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md)
- [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md)
- [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md)
- [`docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md)

## E4 — locomotion ↔ finite-posture compatibility

E4 is a closed carriage-proxy stage, not A‴ + E3 integration.

Finite anticipatory physical preparation based on near-term intent preserved accepted-strength inertial demand without raising the `320 Nm` posture budget or weakening A‴ demand:

- current `31 m/s²` launch: lead0 F/F, lead8 R/R at substeps `2/4/8`;
- current `36 m/s²` braking: lead0 F/F, lead8 R/R at substeps `2/4/8`;
- both lead8 cases fail at substep `1`.

E4 established posture compatibility/survivability, not full physical reproduction of A‴ translation.

`lead8` is research evidence, not gameplay timing. Solver substeps are an evidence axis, not a tuning knob.

Ledger:

- [`docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md)

## E5 — translational authority placement/accounting

E5 asked where accepted translation physically comes from and how much the current single-support organism earns through contact.

Retained results:

- world-external authority works without support but injects net system momentum;
- support-mediated exchange requires support and can preserve equal-and-opposite momentum;
- ordinary Coulomb-limited exchange with `μ=.95` under static weight saturates near `19 m/s²`, below accepted `31/36 m/s²` demand in the simple specimen;
- anticipatory posture recruits real support load and horizontal momentum.

In recovered lead8 cases across substeps `2/4/8`, physical contact supplied about **64.6–71.0%** of full ramp impulse and body speed reached about **4.20–4.42 m/s** while support reached `5.2 m/s`.

Therefore:

> **Posture preparation materially increases physically earned translational authority, but the current single-support organism does not fully reproduce the accepted A‴ response through contact alone.**

A support-gated world-external residual can close some gap, but changes momentum/contact accounting and can mask physical substrate insufficiency.

Ledger:

- [`docs/E5_AUTHORITY_PLACEMENT.md`](docs/E5_AUTHORITY_PLACEMENT.md)

## E6 — latent support-relative translation representation

E6 tested whether a future physical support-relocation DOF could be introduced **without changing the already-qualified E5 organism before actuation**.

Hard rule:

> **Representation match before actuation.**

### E6.0 — serial prismatic carriage: binding PASS, representation FAIL

`box3d.js@0.1.1` exposes a clean bounded sagittal prismatic binding.

But inserting a locked:

`foot ↔ prismatic carriage ↔ spherical ankle ↔ torso`

changed posture mechanics even when the strongest final control kept RECOVER/RECOVER, continuous ramp support and near-reference horizontal impulse/speed.

Final peak tilt moved:

- `14.08 → 20.38°`;
- `14.98 → 19.26°`;

beyond the declared `4°` representation tolerance.

Conclusion:

> **Translational agreement alone is not representation equivalence. Topology itself is part of the mechanics.**

### E6.1 — direct two-body replacement: much closer, still FAIL

A wheel-like Box3D joint was used only as a solver primitive because it can expose world-Z translation plus world-X sagittal rotation **without an intermediate carriage**.

Binding calibration passed cleanly.

The candidate preserved the exact `10 kg` foot + `70 kg` torso and direct torso↔foot balance reaction. With translation locked it remained RECOVER/RECOVER, retained support and stayed close to E5 in each direction.

But the complete representation contract still failed due persistent candidate direction asymmetry:

- E6.1b speed mirror gap ≈ `0.189 m/s` > `0.15`;
- impulse-fraction mirror gap ≈ `0.060` > `0.035`.

A causal replay changed only the nominal lock from `±10 μm` to exact `0/0`; the asymmetry remained essentially unchanged:

- speed gap ≈ `0.185 m/s`;
- impulse-fraction gap ≈ `0.059`.

Therefore the tiny nominal stroke was not the explanation.

E6.1 was **not** unlocked or motorized.

### Cumulative E6 result

Two different ways of putting latent support-relative translation into the primary ankle path changed qualified mechanics before that translation was used:

1. serial extra-body prismatic chain;
2. direct two-body replacement constraint.

Therefore:

> **The next physical-support experiment should change mechanism family rather than keep searching for another ankle-joint translation variant.**

If the physical branch continues, the next candidate should preserve the primary E5 foot↔torso path and test a **parallel/alternate support-set element**, beginning with inactive non-interference.

This is not yet stepping, gait, humanoid legs or a selected architecture. Explicit bounded gameplay authority also remains a live alternative.

Ledger:

- [`docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md)

## Current research boundary

The next high-information physical question is:

> **Can a minimal parallel/alternate support-capable element exist in an inactive state without materially perturbing the qualified E5 primary foot↔torso organism?**

Only if that control passes should support acquisition, load transfer or relocation be tested.

Do not by inertia:

- tune either rejected E6 latent-translation representation until it passes;
- unlock/motorize them;
- call the next support-set experiment stepping;
- build humanoid legs/gait;
- weaken accepted A‴ `31/36 m/s²` agency;
- select external assist merely because E6 failed;
- tune solver substeps for a preferred outcome.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

Alias: `?mode=e3`.

E3.2, E4, E5 and E6 are machine research only.

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