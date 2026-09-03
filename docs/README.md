# Documentation map

This directory contains both current authority and historical research evidence. Do not read every file on every takeover.

## Start here

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — compact canonical orientation;
2. repository [`README.md`](../README.md) — public/current overview;
3. newest relevant ledger — currently [`E11_PHYSICS_FIRST_RESIDUAL.md`](E11_PHYSICS_FIRST_RESIDUAL.md).

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
- [`E5_AUTHORITY_PLACEMENT.md`](E5_AUTHORITY_PLACEMENT.md) — physical contact contribution vs world-external/support-mediated authority;
- [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md) — latent translation in primary ankle rejected before actuation;
- [`E7_PARALLEL_SUPPORT_SET.md`](E7_PARALLEL_SUPPORT_SET.md) — representation-neutral parallel support and real ground acquisition, but no stable load-bearing path;
- [`E8_UNILATERAL_AXIAL_COMPLIANCE.md`](E8_UNILATERAL_AXIAL_COMPLIANCE.md) — viable axial-compliance primitives, failed mass/inertia-matched latent serial telescope;
- [`E9_RIGID_STOW_SPLIT.md`](E9_RIGID_STOW_SPLIT.md) — weld primitive PASS, but even a no-prismatic rigid split fails strict inactive mechanical representation;
- [`E10_ONE_PIECE_SUPPORT_BRACE.md`](E10_ONE_PIECE_SUPPORT_BRACE.md) — clean one-piece latch/acquisition transition, but load recruitment and demand-aligned support regulation fail;
- [`E11_PHYSICS_FIRST_RESIDUAL.md`](E11_PHYSICS_FIRST_RESIDUAL.md) — physics-first world-external residual decomposition: fixed-deficit and binary-support safeguards rejected; absolute physical-share interpretation corrected.

These ledgers are research authority, not automatic runtime promotion.

## Current E10 → E11 result

E10 closed the cheapest remaining physical support variant: the qualified one-piece E7 probe could be latched cleanly after real acquisition and moderated a fall, but did not establish stable/regulatable body-load sharing.

E11 therefore tested the assist side of the E5 fork without repeating E5.2's same-frame ordering ambiguity.

The durable E11 boundary is three-part:

1. **Fixed physical-only deficit is not additive.** Physics-first ordering still leaves cross-frame interaction: earlier residual impulses alter later frictional demand.
2. **Absolute physical impulse/share is not a universal honesty metric.** On normal support the assisted candidate produced less later `Jphys` mainly because relative slip fell about `43–45%`; calibrated normal load did not collapse.
3. **Binary physical eligibility is insufficient.** At weak `μ=.20`, physical-only translation reached only `~1.98 m/s` and the body fell, yet a support+positive-impulse-gated residual produced accepted-looking `~5.28 m/s` ramp-end translation with about `73%` external authority. Posture still fell, so embodied failure remained visible even while traction loss was masked in translation.

Therefore:

> **If world-external residual authority remains a candidate, its entitlement must be graded by meaningful physical capability/quality or otherwise preserve material support-dependent consequences. Merely having contact and a nonzero physical impulse is not enough.**

Do not open a residual-ratio sweep by inertia.

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
- E10.0b real acquisition→brace transition continuity;
- E11.1a residual/contact interaction decomposition.

Negative provenance outside mandatory smoke includes:

- E7.2 load-transfer falsifiers;
- E8.1 embodied serial-telescope falsifiers/decomposition;
- E9.0b rigid-split inactive representation falsifier;
- E10.1a quiet braced load-transfer falsifier;
- E10.1b demand-aligned brace-stability falsifier;
- E11.0a fixed-deficit physics-first residual falsifier;
- E11.2a weak-support masking/support-relevance falsifier.

Do not rewrite negative experiments into artificial PASSes merely to keep CI green.

## Current research boundary

Highest-value question:

> **What causal authority contract can supplement physically earned locomotion without making the world's traction capacity optional?**

Before implementing another controller, compare two architecture classes:

1. **graded support-earned world-external entitlement** — based on an explicit physical capability/quality measure, not merely `Jassist <= k × Jphys` chosen by sweep;
2. **reciprocal support-mediated auxiliary authority** — equal-and-opposite authority tested where support momentum is observable, preferably with dynamic support.

The smallest next experiment should distinguish these architectures, not tune them. It should include normal and materially weak support; reciprocal candidates need dynamic-support momentum accounting.

A genuinely new physical support mechanism remains admissible if it introduces a capability E6–E10 did not already exercise. More anatomy is not the default.

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