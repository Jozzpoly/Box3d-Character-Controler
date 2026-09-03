# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap return, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then [`docs/README.md`](docs/README.md) and the newest stage ledger, currently [`docs/E11_PHYSICS_FIRST_RESIDUAL.md`](docs/E11_PHYSICS_FIRST_RESIDUAL.md).

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

### E11 — physics-first residual narrows the hybrid problem

E11 revisited the bounded-assist side of E5 while forcing every frame to execute:

`posture → Box3D/contact solve → measure physical whole-body ΔP → optional world-external residual`

#### Fixed physical-only deficit budget — FAIL

A residual budget frozen from a separate physical-only control did not reproduce full accepted current31 once earlier residual impulses changed later frictional demand. Same-frame solver priority therefore does not make the channels independently additive.

#### Interaction decomposition — important correction

The assisted normal-support candidate produced less later physical horizontal impulse mainly because earlier assist reduced **relative slip by about 43–45%**. Calibrated normal-load sum did not collapse; it increased slightly.

Therefore:

> **Lower absolute physical impulse is not automatically evidence of masking when another authority channel reduces the same motion error.**

The old idea of preserving a fixed physical impulse percentage is not promoted as a universal hybrid criterion.

#### Weak-support counterfactual — FAIL of binary eligibility

A simple adaptive physics-first residual required support before+after solve plus positive same-frame physical horizontal impulse.

On normal `μ=.95` support it reproduced accepted current31 translation (`~5.22–5.27 m/s`) and the body recovered.

On weak `μ=.20` support:

- physical-only body **fell** and reached only `~1.98 m/s`;
- physical traction supplied only `~28–29%` of required ramp authority;
- the binary-gated residual still produced `~5.28 m/s` ramp-end translation using `~73%` external authority;
- the body still fell, so posture remained an honest failure signal even while translational traction loss was masked.

At zero friction the gate did not sustain assist after an initial transient.

Therefore:

> **"Support exists + some positive physical impulse" is too weak an anti-masking contract. Materially weak traction can become only a key that unlocks dominant nonreciprocal translation.**

Ledger: [`docs/E11_PHYSICS_FIRST_RESIDUAL.md`](docs/E11_PHYSICS_FIRST_RESIDUAL.md).

## Current research direction

The project is now at an **authority-architecture boundary**, not a parameter-tuning stage.

Highest-value question:

> **What causal contract, if any, can supplement physically earned locomotion authority without making the physical world's traction capacity optional?**

Two distinct candidates deserve a small architecture-selection experiment:

1. **graded support-earned world-external entitlement** — residual authority scales with a meaningful physical capability/quality signal rather than a boolean contact flag;
2. **reciprocal support-mediated auxiliary authority** — equal-and-opposite authority whose dependence on dynamic support and system momentum can be observed directly.

Do not immediately sweep `Jassist/Jphys` ratios. E11.1a shows measured physical impulse itself changes when assist reduces slip. First define a causal measure that distinguishes "less impulse because less was needed" from "the world is physically weak".

A genuinely new physical support mechanism remains admissible if it introduces a capability not already exercised by E6–E10, but more anatomy is not the default.

The goal is a controllable physical player with causally meaningful embodiment — not maximal mechanical purity or maximal body-part count.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

E3.2–E11 are machine research only.

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