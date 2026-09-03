# Documentation map

This directory contains both current authority and historical research evidence. Do not read every file on every takeover.

## Start here

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — compact canonical orientation;
2. repository [`README.md`](../README.md) — public/current overview;
3. newest relevant ledger — currently [`E9_RIGID_STOW_SPLIT.md`](E9_RIGID_STOW_SPLIT.md).

`main` + exact SHA + CI are implementation truth. Branch names and historical handoffs are provenance/context only.

## Accepted runtime / donor

- [`DONOR_CONTRACT.md`](DONOR_CONTRACT.md) — stable downstream contract;
- [`E2_3E_STABILIZATION.md`](E2_3E_STABILIZATION.md) — A‴ / Donor v1 promotion;
- [`DONOR_STABILIZATION.md`](DONOR_STABILIZATION.md) — prior donor stabilization;
- [`MOBILE_PAGES.md`](MOBILE_PAGES.md) — mobile/Pages evidence.

The normal public/default player remains **A‴ / Donor v1** unless `PROJECT_STATE.md` says otherwise.

## Current research lineage

- [`E3_ROTATIONAL_EMBODIMENT.md`](E3_ROTATIONAL_EMBODIMENT.md) — finite posture / first Owner-positive physical balance;
- [`E3_1_VALIDATION_LOOP.md`](E3_1_VALIDATION_LOOP.md) and [`E3_1_SUPPORT_TRANSITIONS.md`](E3_1_SUPPORT_TRANSITIONS.md) — causal support semantics;
- [`E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](E3_2_BOUNDED_INTERNAL_MOMENTUM.md) — local mechanism, solver-resolution robustness failure;
- [`E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](E4_LOCOMOTION_POSTURE_COMPATIBILITY.md) — accepted translational demand vs finite posture;
- [`E5_AUTHORITY_PLACEMENT.md`](E5_AUTHORITY_PLACEMENT.md) — physical contact contribution vs world-external residual;
- [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md) — latent translation in primary ankle rejected before actuation;
- [`E7_PARALLEL_SUPPORT_SET.md`](E7_PARALLEL_SUPPORT_SET.md) — representation-neutral parallel support and real ground acquisition, but no stable load-bearing path;
- [`E8_UNILATERAL_AXIAL_COMPLIANCE.md`](E8_UNILATERAL_AXIAL_COMPLIANCE.md) — viable axial-compliance primitives, failed mass/inertia-matched latent serial telescope;
- [`E9_RIGID_STOW_SPLIT.md`](E9_RIGID_STOW_SPLIT.md) — weld primitive PASS, but even a no-prismatic rigid two-body split fails the strict inactive mechanical representation gate.

These ledgers are research authority, not automatic runtime promotion.

## Current E7 → E9 result

E7 established two valuable facts: a one-piece parallel probe can preserve the qualified organism while inactive, and finite internal actuation can place it into real second ground contact. What it did **not** establish was a stable/regulatable load-bearing path.

E8 explored axial compliance by splitting that probe into a serial telescope. The substrate primitives worked, but the embodied split failed inactive mechanical matching at roughly `0.295°` placement-hinge drift versus the predeclared `0.25°` gate.

E9 removed the latent prismatic DOF and spring entirely. A zero-Hz weld was first qualified in isolation, then used to make a mass/COM/inertia-matched rigid split. Macro E5/E7 behavior was virtually identical to the one-piece probe, yet the embedded serial assembly again exceeded the internal gate (`~0.292–0.294°` placement hinge and `~0.323–0.328°` weld relative alignment).

Therefore:

> **Do not continue the split-body clutch family. The current evidence points to the extra serial constrained body itself as mechanically consequential under the strict representation contract, not merely to the latent prismatic DOF.**

## Validation map

Canonical command:

`npm run smoke`

Split into:

- `npm run smoke:research`;
- `npm run smoke:donor`.

Suite membership lives in [`../scripts/smoke-suite.mjs`](../scripts/smoke-suite.mjs).

Important rule:

> **A failed research experiment may remain executable provenance without belonging to permanent green smoke.**

Durable positive smoke currently includes:

- E6 binding calibrations;
- E7.0a/b inactive representation;
- E7.1a/b finite ground acquisition/contact identity;
- E8.0a/b/c axial-compliance/latch substrate results;
- E9.0a weld binding calibration.

Negative provenance outside mandatory smoke includes:

- E7.2 load-transfer falsifiers;
- E8.1 embodied serial-telescope falsifiers/decomposition;
- E9.0b rigid-split inactive representation falsifier.

Do not rewrite negative experiments into artificial PASSes merely to keep CI green.

## Current physical-research boundary

The next physical candidate should reuse the already-qualified **one-piece E7 probe**, not add another latent serial body.

Highest-information next question:

> **After real E7 ground acquisition, can the existing probe↔torso revolute be latched/braced at its acquired angle and establish a stable load-bearing path without adding a new body or inactive DOF?**

Expected decision chain:

1. qualify revolute latch-at-current-angle transition/cache semantics;
2. reproduce unchanged E7.1 acquisition;
3. engage brace only after real loaded contact and prove no material transition kick;
4. test mirrored stable/regulatable load sharing;
5. only after load-path PASS test additional current31/current36 physically earned agency;
6. only after machine qualification seek Owner feel judgement.

If this simple one-piece route also fails without a clear causal correction, step back to the E5 fork. Compare another minimal physical mechanism against explicit bounded gameplay assistance instead of recursively growing anatomy.

## Historical evidence

[`RESEARCH.md`](RESEARCH.md) preserves the early ledger through E2. Focused E2 files are useful only when the live question touches their causal boundary. Stage-local words such as “current” or “next” inside historical ledgers are historical, not live plan.

## Repository hygiene

- `main` is canonical;
- active branches are provisional evidence;
- preserve corrected/confounded failures;
- keep runtime, Donor, research harness and presentation claims distinct;
- avoid refactors inside experiments unless correctness requires them;
- do not introduce process ceremony without an observed problem;
- direct package versions are pinned, but there is no npm lockfile and CI uses `npm install`; dependency-resolution changes require separate validation.