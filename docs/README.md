# Documentation map

This directory contains both **current authority** and **historical research evidence**. Do not read every file on takeover.

## Start here

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — compact canonical orientation and current stop boundary;
2. [`WORKFLOW.md`](WORKFLOW.md) — branch / evidence / qualification / publication workflow;
3. [`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md) — current manipulation architecture research map;
4. repository [`README.md`](../README.md) — public/current overview.

`main` + exact SHA + source + CI/Pages are implementation/publication truth. Stage-local words such as “current” and “next” inside old ledgers are historical unless `PROJECT_STATE.md` explicitly promotes them again.

## Authority layers

### Current

- [`PROJECT_STATE.md`](PROJECT_STATE.md)
- [`WORKFLOW.md`](WORKFLOW.md)
- [`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md)
- [`DONOR_CONTRACT.md`](DONOR_CONTRACT.md)

### Recent experimental lineage

- [`E14_CONTEXTUAL_AUTHORITY_LAB.md`](E14_CONTEXTUAL_AUTHORITY_LAB.md) — contextual authority / one-leg laboratory; narrow tuning line later closed by Owner judgement;
- [`E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md`](E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md) — corrected E14 causal checkpoint;
- [`E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md`](E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md) — Donor agency + finite physical torso bridge;
- [`E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md`](E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md) — E15 publication / Owner boundary;
- [`E16_CAPABILITY_YARD_2026-09-04.md`](E16_CAPABILITY_YARD_2026-09-04.md) — capability-first embodiment yard;
- [`E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md`](E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md) — E16 public Owner boundary;
- [`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md) — E17 Owner evidence and E18 candidate architectures.

E17 and E17-depth implementation/publication provenance also lives in their merged PRs and exact-main Actions runs. Do not infer Owner acceptance from publication alone.

## Earlier research lineage

- [`RESEARCH.md`](RESEARCH.md) — early ledger through E2;
- [`E3_ROTATIONAL_EMBODIMENT.md`](E3_ROTATIONAL_EMBODIMENT.md) — finite posture / first Owner-positive physical balance;
- [`E3_1_VALIDATION_LOOP.md`](E3_1_VALIDATION_LOOP.md) and [`E3_1_SUPPORT_TRANSITIONS.md`](E3_1_SUPPORT_TRANSITIONS.md) — causal support semantics;
- [`E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](E3_2_BOUNDED_INTERNAL_MOMENTUM.md) — bounded internal momentum;
- [`E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](E4_LOCOMOTION_POSTURE_COMPATIBILITY.md) — accepted translation vs finite posture;
- [`E5_AUTHORITY_PLACEMENT.md`](E5_AUTHORITY_PLACEMENT.md) — contact contribution vs authority placement;
- [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md) through [`E10_ONE_PIECE_SUPPORT_BRACE.md`](E10_ONE_PIECE_SUPPORT_BRACE.md) — support-mechanism search and falsifiers;
- [`E11_PHYSICS_FIRST_RESIDUAL.md`](E11_PHYSICS_FIRST_RESIDUAL.md) — physics-first residual boundary;
- [`E12_GRADED_CAPACITY_ENTITLEMENT.md`](E12_GRADED_CAPACITY_ENTITLEMENT.md) — graded capacity entitlement;
- [`E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md`](E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md) — external world coupling and reaction-placement causality.

These are evidence/provenance, not a checklist that every future experiment must replay.

## Validation map

Canonical commands:

- `npm run smoke` — foundation + accepted historical green regressions;
- `npm run smoke:research` — the historical research portion of that spine;
- `npm run smoke:donor` — Donor contract/equivalence/input;
- `npm run smoke:current` — promoted E16/E17/E17-depth regressions;
- `npm run build` — browser build.

Suite membership lives in [`../scripts/smoke-suite.mjs`](../scripts/smoke-suite.mjs).

Important distinction:

> **Permanent green smoke is regression protection, not the full evidence archive.**

A failed, confounded or protocol-miss experiment may remain executable provenance without being forced into permanent green smoke. Do not rewrite negative experiments into artificial PASSes merely to satisfy CI.

## Current workflow policy

The canonical GitHub Actions workflow is intentionally boring:

`locked install → historical/foundation smoke → current smoke → build → main-only Pages`

Stage-specific diagnostics, sweeps and qualification artifacts belong to bounded experiment branches. If a dedicated temporary workflow is useful, it may live on that branch and be removed before the clean publication/maintenance merge. Historical Actions runs remain provenance.

This prevents the canonical deploy workflow from becoming an ever-growing archive of old branch names and one-off conditions.

See [`WORKFLOW.md`](WORKFLOW.md) for the full compact policy.

## Repository hygiene

- `main` is canonical;
- active experiment/publication/maintenance branches are provisional until merged;
- preserve corrected, rejected and confounded evidence rather than laundering it into success;
- keep runtime claims, causal claims, Owner judgement and publication state distinct;
- avoid refactors inside causal experiments unless correctness requires them;
- maintenance/refactor work gets its own qualification boundary;
- exact dependency graph is committed in `package-lock.json`;
- Node is pinned by `.nvmrc` and CI currently uses Node `22.23.2` + `npm ci`;
- do not introduce process ceremony without an observed failure mode it fixes.
