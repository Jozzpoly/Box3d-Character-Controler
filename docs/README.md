# Documentation map

This directory contains both current authority and historical research evidence. Do not read every file on every takeover.

## Start here

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — compact canonical orientation;
2. repository [`README.md`](../README.md) — public/current overview;
3. newest relevant ledger — currently [`E10_ONE_PIECE_SUPPORT_BRACE.md`](E10_ONE_PIECE_SUPPORT_BRACE.md).

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
- [`E9_RIGID_STOW_SPLIT.md`](E9_RIGID_STOW_SPLIT.md) — weld primitive PASS, but even a no-prismatic rigid two-body split fails the strict inactive mechanical representation gate;
- [`E10_ONE_PIECE_SUPPORT_BRACE.md`](E10_ONE_PIECE_SUPPORT_BRACE.md) — clean one-piece latch/acquisition transition, but quiet load recruitment and demand-aligned stable dual-support regulation both fail.

These ledgers are research authority, not automatic runtime promotion.

## Current E7 → E10 result

E7 established two valuable facts: a one-piece parallel probe can preserve the qualified organism while inactive, and finite internal actuation can place it into real second ground contact. What it did **not** establish was stable/regulatable body-load sharing.

E8 explored axial compliance by splitting that probe into a serial telescope. The substrate primitives worked, but the embodied split failed inactive mechanical matching.

E9 removed the latent prismatic DOF and spring entirely. Even a rigid mass/COM/inertia-matched two-body split exceeded the strict internal representation gate, showing that the added serial constrained body itself has a measurable cost on the current substrate.

E10 then removed that representation problem by returning to the qualified one-piece probe. Its existing revolute could be latched cleanly after real ground acquisition, with only `~0.04 N·s` matched first-frame momentum difference and very small low-demand lock drift.

That still did not solve support regulation:

- quiet bracing did not move meaningful body load onto the probe;
- under the exact current31 E7.2b demand, the brace reduced peak fall excursion to about `33–34°` but never achieved HOLD;
- both-support continuity failed and the brace drifted about `5.6–5.8°` versus its `0.25°` qualified envelope.

Therefore:

> **Real second contact, a clean latch transition and a rigid brace are still insufficient to establish stable/regulatable support capacity.**

Do not tune E10 into a survivor. Return to the E5 fork.

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
- E9.0a weld binding calibration;
- E10.0a isolated current-angle latch;
- E10.0b real acquisition→brace transition continuity.

Negative provenance outside mandatory smoke includes:

- E7.2 load-transfer falsifiers;
- E8.1 embodied serial-telescope falsifiers/decomposition;
- E9.0b rigid-split inactive representation falsifier;
- E10.1a quiet braced load-transfer falsifier;
- E10.1b demand-aligned brace-stability falsifier.

Do not rewrite negative experiments into artificial PASSes merely to keep CI green.

## Current research boundary

The project now deliberately returns to the **E5 design fork**.

Highest-information next question:

> **Should the next causal experiment introduce a genuinely new minimal physical support capability, or should it investigate an honest contact-prioritized bounded residual authority that preserves accepted A‴ agency while keeping physical and nonreciprocal momentum contributions explicitly separate?**

This is a decision/decomposition stage before E11 implementation.

A new physical mechanism is worth implementing only if it adds a causal capability not already exercised by E6–E10. Another serial body, stiffness variant, fixed support brace or softened evidence gate does not qualify.

A bounded residual is admissible because physical purity is not the project goal, but it must not become an unaccounted substitute for the body. It must preserve measurable physical contribution, support-loss semantics and disturbance reactivity.

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