# Documentation map

This directory contains both **current authority** and **historical research evidence**. Do not read every file on takeover.

## Start here

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — compact canonical orientation and current stop boundary;
2. [`WORKFLOW.md`](WORKFLOW.md) — branch / evidence / qualification / publication / maintenance policy;
3. [`E19_STAGE_CLOSURE_2026-09-09.md`](E19_STAGE_CLOSURE_2026-09-09.md) — latest completed embodiment/manipulation stage and exact evidence boundary;
4. repository [`README.md`](../README.md) — public/current overview.

`main` + exact SHA + source + CI/Pages are implementation/publication truth. Stage-local words such as “current” and “next” inside old ledgers are historical unless `PROJECT_STATE.md` explicitly promotes them again.

## Authority layers

### Current

- [`PROJECT_STATE.md`](PROJECT_STATE.md)
- [`WORKFLOW.md`](WORKFLOW.md)
- [`E19_STAGE_CLOSURE_2026-09-09.md`](E19_STAGE_CLOSURE_2026-09-09.md)
- [`DONOR_CONTRACT.md`](DONOR_CONTRACT.md)

There is currently **no endorsed active manipulation frontier**. E19 is a closed technical checkpoint; a future stage should begin from a newly framed problem rather than treating an old stage's `next` section as a live queue.

### Recent experimental lineage — E14 through E19

- [`E14_CONTEXTUAL_AUTHORITY_LAB.md`](E14_CONTEXTUAL_AUTHORITY_LAB.md) — contextual authority / one-leg laboratory; narrow tuning line later closed by Owner judgement;
- [`E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md`](E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md) — corrected E14 causal checkpoint;
- [`E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md`](E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md) — Donor agency + finite physical torso bridge;
- [`E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md`](E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md) — E15 publication / Owner boundary;
- [`E16_CAPABILITY_YARD_2026-09-04.md`](E16_CAPABILITY_YARD_2026-09-04.md) — capability-first embodiment yard;
- [`E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md`](E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md) — E16 public Owner boundary;
- [`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md) — E17 Owner evidence and the E18 candidate-architecture landscape;
- [`E18_P3_MECHANICAL_QUALIFICATION_2026-09-05.md`](E18_P3_MECHANICAL_QUALIFICATION_2026-09-05.md) — coupled two-point mechanical evidence retained as a donor;
- [`E18_P3_1_OWNER_INTERACTION_CONTRACT_2026-09-05.md`](E18_P3_1_OWNER_INTERACTION_CONTRACT_2026-09-05.md) — P3.1 Owner probe contract; historically important but no longer current;
- [`E19_DUAL_GRIP_EMBODIED_INTERACTION_REFRAME_2026-09-05.md`](E19_DUAL_GRIP_EMBODIED_INTERACTION_REFRAME_2026-09-05.md) — post-P3 reframe from remote object target to left/right semantic grips;
- [`E19_REVIEW_CHECKPOINT_2026-09-05.md`](E19_REVIEW_CHECKPOINT_2026-09-05.md) — critical correction after the first E19 probes;
- [`E19_HEADLESS_MECHANICS_CLOSURE_2026-09-05.md`](E19_HEADLESS_MECHANICS_CLOSURE_2026-09-05.md) — reciprocal mechanics closure through E19.0f2;
- [`E19_STAGE_CLOSURE_2026-09-09.md`](E19_STAGE_CLOSURE_2026-09-09.md) — final project-level closure incorporating acquisition/publication provenance and the missing Owner-verdict boundary.

E17, E17-depth and E19 implementation/publication provenance also lives in merged PRs and exact Actions runs. Do not infer Owner acceptance from publication alone.

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
- `npm run smoke:research` — historical research portion of that spine;
- `npm run smoke:donor` — Donor contract/equivalence/input;
- `npm run smoke:current` — representative promoted/current regressions;
- `npm run build` — browser build.

Suite membership lives in [`../scripts/smoke-suite.mjs`](../scripts/smoke-suite.mjs).

Important distinction:

> **Permanent green smoke is regression protection, not the full evidence archive.**

A failed, confounded or protocol-miss experiment may remain executable provenance without being forced into permanent green smoke. Do not rewrite negative experiments into artificial PASSes merely to satisfy CI.

## Current workflow policy

The canonical GitHub Actions workflow is intentionally boring:

`locked install → historical/foundation smoke → current smoke → build → main-only Pages`

Stage-specific diagnostics, sweeps and qualification artifacts belong to bounded experiment branches/history. Historical Actions runs remain provenance after a temporary stage workflow is removed.

See [`WORKFLOW.md`](WORKFLOW.md) for the compact canonical policy.

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

The repository currently has a large historical branch forest. **No branch deletion is authorized by this closure.** Branch cleanup is a separate maintenance campaign: first review/adapt the dedicated `jv_web` cleanup workflow package, classify provenance and retention needs, then perform deletion under that explicit process.

## Conversation/repository boundary

The browser thread containing the final Character Controller E19 work later moved into `Jozzpoly/Jozzue_Vehicles_Sandbox` Family C / Spatial Compass research. That later JV material belongs to that repository and is not part of this project's evidence lineage merely because the chat thread continued.
