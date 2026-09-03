# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest stage ledger, currently [`docs/E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md`](docs/E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md).

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

A‴ is a **controller-owned mover**, not rigid-body propulsion of an articulated player. Research E3+ asks which parts of its accepted agency can be physically earned or honestly supplemented without destroying control or feel.

Historical `createDonorCharacter(...)` remains frozen Donor v0 / A″.

## Research boundary in compact form

### E3–E5 — physical posture and authority accounting

Finite `320 Nm` support-mediated balance produced a real, Owner-positive embodied struggle. Preparation lets accepted-strength current31 launch/current36 braking coexist with finite posture on qualified solver resolutions.

With ordinary `μ=.95` support and recovered lead8 posture, real contact supplied roughly **64.6–71.0%** of full `80 kg × 5.2 m/s` ramp impulse. World-external residual authority can cover gaps but changes reciprocity and can mask physical insufficiency.

### E6–E10 — cheap physical support routes did not establish stable extra capacity

- E6: latent translation in the primary ankle failed inactive representation.
- E7: a representation-neutral one-piece parallel probe acquired real second ground contact, but did not establish stable/regulatable load sharing.
- E8/E9: local axial/weld primitives worked, but embodied serial split representations failed strict inactive mechanical equivalence.
- E10: the qualified one-piece probe could be latched cleanly after real acquisition and materially reduced a fall, but still failed meaningful load recruitment and stable dual-support HOLD.

> **Contact acquisition, a clean latch transition and a rigid brace are still not sufficient stable/regulatable support capacity.**

Do not recurse into more serial anatomy or retune evidence thresholds by inertia.

### E11 — binary physical eligibility rejected

E11 forced every residual frame to be physics-first. It established two durable corrections:

- lower later physical horizontal impulse is not automatically masking when earlier assist reduced relative slip and therefore reduced frictional demand;
- a boolean rule such as “support exists + some positive physical impulse” is still too weak: at `μ=.20`, severe traction loss could coexist with accepted-looking `~5.28 m/s` translation dominated by external authority while posture still fell.

Ledger: [`docs/E11_PHYSICS_FIRST_RESIDUAL.md`](docs/E11_PHYSICS_FIRST_RESIDUAL.md).

### E12 — graded capacity survives; placement becomes a world-reference question

E12 replaced binary eligibility with a capability-derived entitlement on the pinned E5 load scale:

`q = clamp( μ × J_n~ / (0.95 × 80 × 20 × 1/60), 0, 1 )`

where `J_n~ = 0.5 × totalNormalImpulse` is the existing E5.0a pinned-substrate load estimate.

On canonical current31/current36 specimens, normal `μ=.95` retained accepted agency while weak/zero traction remained materially weak. This qualifies graded capacity as a **research principle**, not a production formula.

On a real `800 kg` dynamic support, fair comparison requires the same support-relative granted `Δv`:

- world-external placement injects combined player+support momentum;
- reciprocal placement uses reduced-mass equal-and-opposite exchange.

But on an isolated free player+support pair those placements are almost exactly Galilean-equivalent in relative motion/contact/posture. With canonical damping, maximum relative-velocity divergence over one second was only about **0.006% of the granted pulse**.

Ledger: [`docs/E12_GRADED_CAPACITY_ENTITLEMENT.md`](docs/E12_GRADED_CAPACITY_ENTITLEMENT.md).

### E13 — genuine world coupling matters; manufactured late reaction is not neutral

E13 introduced a genuine external world reference with the smallest qualified representation found in this stage: a mirrored unilateral prismatic world stop.

After correcting a source-backed `fixedRotation` harness conflict:

- the isolated stop binding passed;
- the free-prismatic `800 kg` support preserved embodied passive representation;
- zero-gap stop engagement at the **quiet settled state** was passive-neutral.

Then E13.1a compared `{world-external, reciprocal} × {stop OFF, ON}` under the same E12 support-relative one-step grant.

Stop-isolated wider-world effect:

- world-external: approximately `0 N·s`;
- reciprocal: **`33.177096 / 33.177056 N·s`**.

So:

> **A real external reaction path ends the isolated Galilean ambiguity. Reaction placement becomes physically observable.**

But longer observation exposed a more important boundary. During a fixed lead8/current31 trajectory, stop ON already generated about `56.8 / 68.6 N·s` ON−OFF world effect during posture preparation **before translational authority began**.

E13.2b isolated that issue. Two identical free-prismatic systems performed exact lead8 with no translational authority. At the actual prepared translation both received identical limit geometry; only the candidate enabled the stop. The API transition itself was state-neutral, but one subsequent identical posture solve produced differential world impulses of:

- **`80.793918 N·s`**;
- **`72.348356 N·s`**.

Therefore:

> **Quiet-state neutrality does not imply active-state neutrality. Once the support has world-relative state, creating the external reaction path is itself a physical event.**

And the architectural correction is:

> **Do not manufacture a world reaction path when authority needs somewhere to react and then call it neutral controller plumbing. If the external world carries reaction, that coupling must already exist as part of the physical/gameplay situation, with its history and consequences visible.**

This does **not** reject reciprocal mechanics and does not select world-external authority for production.

Ledger: [`docs/E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md`](docs/E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md).

## Current research direction

The project no longer needs another isolated placement pulse, unilateral-stop tuning pass, `q` sweep, friction sweep, residual-ratio sweep or support-mass sweep.

Highest-value question:

> **Which naturally present environmental relationships should legitimately carry player-authority reaction, and when should accepted agency remain explicitly controller/world-external instead?**

The next useful specimen should make external coupling **ecological rather than manufactured**. Candidate families include:

- a support already anchored/braced by level geometry before player intent;
- an externally driven support;
- a third-body/environment contact with a genuine pre-existing causal history.

Do not place a stop at the current support position merely to harvest reaction, and do not choose wall gaps, spring stiffnesses, support masses or clutch timings to force a preferred architecture.

The purpose is **contextual reaction ownership / environmental causality**: discover when reaction is causally honest, mechanically legible and potentially valuable to gameplay.

A genuinely new physical support mechanism remains admissible if it introduces a capability E6–E10 did not already exercise, but more anatomy is not the default.

The goal remains a controllable physical player with causally meaningful embodiment — not maximal mechanical purity or maximal body-part count.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

E3.2–E13 are machine research only.

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