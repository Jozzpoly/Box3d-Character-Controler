# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest relevant ledger, currently [`docs/E7_PARALLEL_SUPPORT_SET.md`](docs/E7_PARALLEL_SUPPORT_SET.md).

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

A‴ is a **controller-owned mover**. Its accepted translation is not rigid-body propulsion of an articulated player. That distinction drives the E3–E7 research line.

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

Owner feedback was positive: the specimen felt like a primitive mannequin physically fighting for balance.

Post-Owner work separated support-mediated grounded balance from unsupported internal attitude control and support relocation. E3.2 demonstrated a real local bounded internal-angular-momentum mechanism at canonical resolution, but its recoverability changed materially/non-monotonically across solver substeps.

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

Ledger: [`docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md).

## E5 — translational authority placement/accounting

E5 asked where accepted translation physically comes from and how much the current single-support organism earns through contact.

Retained results:

- world-external authority works without support but injects net system momentum;
- support-mediated exchange requires support and can preserve equal-and-opposite momentum;
- ordinary Coulomb-limited exchange with `μ=.95` under static weight saturates near `19 m/s²`, below accepted `31/36 m/s²` demand;
- anticipatory posture recruits real support load and horizontal momentum.

In recovered lead8 cases across substeps `2/4/8`, physical contact supplied about **64.6–71.0%** of full ramp impulse and body speed reached about **4.20–4.42 m/s** while support reached `5.2 m/s`.

Therefore:

> **Posture preparation materially increases physically earned translational authority, but the current single-support organism does not fully reproduce the accepted A‴ response through contact alone.**

A support-gated world-external residual can close some gap, but changes momentum/contact accounting and can mask physical substrate insufficiency.

Ledger: [`docs/E5_AUTHORITY_PLACEMENT.md`](docs/E5_AUTHORITY_PLACEMENT.md).

## E6 — latent translation in the primary ankle path

E6 introduced a hard causal rule:

> **Representation match before actuation.**

A serial prismatic carriage and then a much cleaner direct two-body two-DOF ankle replacement both changed qualified E5 mechanics while their translational DOF was locked. The latter remained close, but a persistent directional mismatch survived an exact-zero lock replay.

Therefore:

> **Do not keep replacing/interposing the qualified primary ankle with latent translation variants merely to search for a passing one. Change mechanism family.**

Ledger: [`docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md).

## E7 — parallel support-set boundary

E7 preserved the primary E5 ankle path and added a separate physical support branch.

A `1 kg`, `0.9 m` parallel probe passed inactive non-interference while total mass remained `80 kg`. A finite `18 Nm` equal-and-opposite internal actuator then acquired a real persistent second **probe↔platform** contact in both sagittal directions at the same frame, with primary support preserved, no fall and no world-external horizontal authority.

That is a real positive result: a representation-neutral parallel branch can physically place another support on the ground.

But E7 also established the stronger negative boundary.

### Contact is not yet support capacity

With both contacts settled upright, the probe carried only about `.12–.18 Ns/frame` in E5-calibrated support-load channels — less than its own nominal `1 kg` weight impulse `.333 Ns` and far below the predeclared meaningful body-load threshold.

A second test then used the **existing current31 demand-derived posture target** rather than tuning the probe:

`atan2(31,20) = 57.17°`

This target moves the dominant torso-weighted COM projection beyond the primary foot footprint and toward the already-acquired probe. In both directions the torso came close to the target, the probe stayed grounded and no self-contact occurred — but the primary foot unloaded/lost support and the organism fell instead of reaching a stable dual-support HOLD.

Therefore:

> **Contact acquisition is not support capacity. A useful support-set mechanism must prove a stable, regulatable compressive load path, not merely place another body on the ground.**

More specifically:

> **The tested single rigid torso-COM hinged probe is a qualified contact-placement mechanism, not a qualified load-bearing support architecture.**

Do not rescue it through torque/angle/length/mass sweeps. Current31 translational-agency A/B is premature on this failed load-bearing representation.

Ledger: [`docs/E7_PARALLEL_SUPPORT_SET.md`](docs/E7_PARALLEL_SUPPORT_SET.md).

## Current research boundary

The next high-information physical question is:

> **Can a parallel support mechanism provide a finite, stable and regulatable compressive load path while remaining mechanically non-interfering when inactive?**

Candidate families may include an axial/telescopic support or a minimal articulated limb, but neither is selected yet. Any new family starts with inactive representation matching before contact acquisition, load transfer or locomotion claims.

Explicit bounded gameplay authority remains a live alternative branch of the E5 fork.

Do not by inertia:

- tune rejected E6/E7 representations until they pass;
- call E7 support acquisition stepping/gait;
- build a full humanoid by default;
- weaken accepted A‴ `31/36 m/s²` agency;
- select external assist merely because E7.2 failed;
- tune solver substeps for a preferred outcome.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

Alias: `?mode=e3`.

E3.2–E7 are machine research only.

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
