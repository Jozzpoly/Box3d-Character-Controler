# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest stage ledger, currently [`docs/E12_GRADED_CAPACITY_ENTITLEMENT.md`](docs/E12_GRADED_CAPACITY_ENTITLEMENT.md).

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

### E12 — graded capacity survives; placement moves to a world-reference question

E12 replaced binary eligibility with a capability-derived entitlement on the pinned E5 load scale:

`q = clamp( μ × J_n~ / (0.95 × 80 × 20 × 1/60), 0, 1 )`

where `J_n~ = 0.5 × totalNormalImpulse` is the existing E5.0a pinned-substrate load estimate.

#### Canonical current31 launch — PASS

Normal `μ=.95` support retained accepted-looking translation and recovery:

- `5.218 / 5.273 m/s`;
- mean `q ≈ .965/.970`.

Weak `μ=.20` stayed materially weak and fell:

- only `1.748 / 1.707 m/s` with entitlement;
- mean `q ≈ .126/.115`.

At `μ=0`, `q=0` and assist is exactly zero.

#### Canonical current36 braking — PASS after harness correction

The first direct-velocity initialization was correctly classified as a confounded harness failure because it did not reproduce the qualified E4.6 brake-start state.

After restoring exact E4.6 history — physical cruise setup → 120f neutral cruise → lead8 — normal support stopped essentially at zero and recovered, while weak `μ=.20` still ended around `3.22–3.39 m/s` and fell; zero friction received no assist.

#### Dynamic-support placement — accounting PASS, no winner

On a real `800 kg` dynamic support, E12 compared world-external and equal-and-opposite reciprocal placement using **support-relative reduced-mass scaling**, so the same `q` grants the same relative agency rather than the same arbitrary impulse.

- world-external placement injects player+support horizontal momentum;
- reciprocal placement produces equal-and-opposite support recoil and keeps combined horizontal momentum near zero.

But after an identical granted relative pulse, an isolated free player+support pair is almost exactly **Galilean-equivalent** in relative motion, contact load and posture. With diagnostic zero player damping the match is near machine precision. With canonical player linear damping `0.015`, the maximum placement-induced relative-velocity divergence over one second is only about **0.006% of the granted pulse**.

Therefore:

> **More isolated player+free-support tests cannot meaningfully choose world-external versus reciprocal placement. Their substantive difference is whole-system motion/momentum relative to the external world.**

Ledger: [`docs/E12_GRADED_CAPACITY_ENTITLEMENT.md`](docs/E12_GRADED_CAPACITY_ENTITLEMENT.md).

## Current research direction

The project is no longer at “find an anti-masking gain” and no longer needs another `q`, friction, residual-ratio or support-mass sweep.

Highest-value question:

> **When a dynamically supported player is coupled to a genuine external world reference, what gameplay-relevant consequences distinguish nonreciprocal world-external authority from reciprocal support reaction, and which consequences do we actually want?**

The next experiment should introduce that external reference with the smallest causal blast radius — for example a world-anchored interaction, third-body/environment contact, or externally driven support — but should **not** choose a wall gap, spring stiffness, support mass or other free parameter merely to force a difference.

A genuinely new physical support mechanism remains admissible if it introduces a capability E6–E10 did not already exercise, but more anatomy is not the default.

The goal remains a controllable physical player with causally meaningful embodiment — not maximal mechanical purity or maximal body-part count.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

E3.2–E12 are machine research only.

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