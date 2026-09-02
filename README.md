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

Historical `createDonorCharacter(...)` deliberately remains frozen **Donor v0 / A″**. Do not silently retarget it.

Important current ground values:

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

- direct `64 N·s` perturbation — RECOVER;
- `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- `4.0 m/s` — FALL.

Owner feedback on the balance playground:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

Post-Owner work separated support-mediated grounded balance from unsupported internal attitude control and from support relocation. The Owner-positive grounded balance effect survives removal of the accidental unsupported reaction-wheel channel inside the tested envelope.

E3.2 then demonstrated a real local bounded internal-angular-momentum mechanism at canonical resolution, but its recoverability changed materially and non-monotonically across solver substeps.

Final E3.2 verdict:

> **Real local mechanism, not substrate-robust recovery capability in the tested representation.**

Do not rescue E3.2 with another gain/torque/stroke/substep sweep.

Ledgers:

- [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md)
- [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md)
- [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md)
- [`docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md)

## E4 — locomotion ↔ finite-posture compatibility

E4 is a closed **carriage-proxy** stage, not A‴ + E3 integration.

Naive world-upright finite posture could not survive the full accepted translational demand. But finite anticipatory physical preparation based on near-term intent produced a stronger result without increasing the `320 Nm` posture budget or weakening A‴ demand:

- current `31 m/s²` launch: lead0 F/F, lead8 **R/R** at substeps `2/4/8`;
- current `36 m/s²` braking: lead0 F/F, lead8 **R/R** at substeps `2/4/8`;
- both lead8 cases fail at substep `1`.

Thus E4 established **posture compatibility/survivability**, not full physical reproduction of A‴ translation.

`lead8` is a research survivor, not gameplay timing. Solver substeps are an evidence axis, not a tuning knob.

Ledger:

- [`docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md)

## E5 — translational authority placement/accounting

E5 asked where accepted translation physically comes from and how much the current single-support organism earns through contact.

Retained results:

- world-external authority works without support but injects net system momentum;
- support-mediated exchange requires support and can preserve equal-and-opposite momentum;
- ordinary Coulomb-limited exchange with `μ=.95` under static weight saturates near `19 m/s²`, below accepted `31/36 m/s²` demand in the simple specimen;
- anticipatory posture recruits real support load and real horizontal momentum.

In recovered lead8 cases across substeps `2/4/8`, physical contact supplied about **64.6–71.0%** of the full ramp impulse requirement and body speed reached about **4.20–4.42 m/s** while support reached `5.2 m/s`.

Therefore:

> **Posture preparation materially increases physically earned translational authority, but the current single-support organism does not fully reproduce the accepted A‴ response through contact alone.**

A support-gated world-external residual can close some of that gap, but it changes momentum accounting/contact contribution and can mask physical substrate insufficiency.

E5 selects neither pure traction nor hybrid assist, no residual cap, no A‴ retune and no stepping mechanism.

Ledger:

- [`docs/E5_AUTHORITY_PLACEMENT.md`](docs/E5_AUTHORITY_PLACEMENT.md)

## E6.0 — support-relative translation substrate

E6.0 tested the smallest naive bridge toward physically earning more agency before selecting gameplay assist:

> **Can a real bounded support-relative translational DOF be added without changing the already-qualified E5 organism while that DOF is locked?**

### Binding capability: PASS

`box3d.js@0.1.1` exposes a mirrored, force-bounded prismatic joint aligned with the sagittal axis. The `±0.25 m` calibration reached approximately `±0.251407 m` without material off-axis leak.

### Serial representation: FAIL

The proposed locked topology was:

`support foot ↔ prismatic carriage ↔ spherical ankle ↔ torso`

Before interpreting any active relocation, the locked proxy had to reproduce the E5 current-31 / lead8 finite-posture control.

Several causal corrections were tried without relaxing the declared match thresholds. The final support-foot-preserving proxy was the strongest:

- exact original `10 kg` support foot;
- `0.5 kg` locked carriage;
- `69.5 kg` torso;
- total `80 kg`;
- finite balance reaction still closed torso ↔ support foot.

It reproduced translation surprisingly closely:

- both directions remained RECOVER;
- zero ramp support-loss frames;
- `Jx / required`: `0.671 → 0.664` and `0.646 → 0.673`;
- ramp-end speed: `4.204 → 4.279 m/s` and `4.216 → 4.319 m/s`.

But posture dynamics still shifted beyond the predeclared representation tolerance:

- peak tilt `14.08 → 20.38°`;
- peak tilt `14.98 → 19.26°`;
- allowed difference was `4°`.

Final verdict:

> **The prismatic binding is usable, but serially inserting the locked carriage changes the organism's posture mechanics enough that this topology is not a qualified E5-relative support-relocation substrate.**

This does **not** reject support relocation generally. It rejects this naive serial representation as a clean causal bridge.

No motorized E6.1 was opened.

Important methodological result:

> **Translational agreement alone is not representation equivalence. Topology itself is part of the mechanics.**

Ledger:

- [`docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md)

## Current research boundary

E5 left a fork between physically earning more agency and explicitly granting some bounded gameplay authority.

E6.0 tested one minimal physical bridge and rejected its **representation**, not the whole physical direction.

The next high-information physical question is now:

> **What organism/contact representation can add a real support-relocation degree of freedom without materially changing the already-qualified finite-posture/support mechanics while that DOF is locked?**

This is a representation-design problem before it is motor tuning.

Do not, by inertia:

- motor-tune the rejected serial prismatic chain;
- open another mass/limit/tolerance sweep to make it pass;
- call support relocation stepping;
- build legs/humanoid gait;
- weaken accepted A‴ `31/36 m/s²` agency;
- select external assist merely because this representation failed;
- tune solver substeps for a preferred outcome.

The next stage should be selected separately by information gain.

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