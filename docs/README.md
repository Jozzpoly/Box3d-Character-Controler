# Documentation map

This directory contains both **current authority** and **historical research evidence**. Do not read every file on every takeover.

## Start here

For a fresh takeover, long-gap return or uncertain state:

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — **canonical current-state/orientation layer**;
2. repository [`README.md`](../README.md) — public/current overview;
3. the newest stage ledger relevant to the active question — currently [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md).

Then inspect code, CI and historical ledgers only as required by the question.

`main` + exact SHA + CI are implementation truth. A branch name is never current authority by itself.

## Current accepted runtime / donor

- [`DONOR_CONTRACT.md`](DONOR_CONTRACT.md) — stable downstream API, profile and lifecycle contract;
- [`E2_3E_STABILIZATION.md`](E2_3E_STABILIZATION.md) — promotion of A‴ / Donor v1 to current-best behavior;
- [`DONOR_STABILIZATION.md`](DONOR_STABILIZATION.md) — earlier donor stabilization provenance;
- [`MOBILE_PAGES.md`](MOBILE_PAGES.md) — mobile/Pages evidence and current mobile boundary.

The normal public/default player remains A‴ / Donor v1 unless `PROJECT_STATE.md` says otherwise.

## Current research frontier

- [`E3_ROTATIONAL_EMBODIMENT.md`](E3_ROTATIONAL_EMBODIMENT.md) — E3.1 rotational embodiment / first Owner-positive balance surface;
- [`E3_1_VALIDATION_LOOP.md`](E3_1_VALIDATION_LOOP.md) — E3.1 post-Owner causal decomposition;
- [`E3_1_SUPPORT_TRANSITIONS.md`](E3_1_SUPPORT_TRANSITIONS.md) — support-transition/contact-signal semantics;
- [`E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](E3_2_BOUNDED_INTERNAL_MOMENTUM.md) — bounded internal angular-momentum mechanism and robustness failure;
- [`E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](E4_LOCOMOTION_POSTURE_COMPATIBILITY.md) — accepted translational demand vs finite posture in the carriage proxy;
- [`E5_AUTHORITY_PLACEMENT.md`](E5_AUTHORITY_PLACEMENT.md) — authority placement, physical contact contribution and residual-authority accounting;
- [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md) — positive prismatic/two-DOF binding facts plus rejection of two latent-translation representations before actuation.

These are research ledgers. They do not automatically promote mechanics into the player runtime.

## Historical E1/E2 evidence

[`RESEARCH.md`](RESEARCH.md) is the preserved early historical ledger through E2. Its authority banner is binding: stage-local words such as “current” and “next” are historical, not live plan.

More focused E2 ledgers remain useful only when a current question touches their exact causal boundary:

- [`E2_1_LOCALIZATION.md`](E2_1_LOCALIZATION.md) — terrain/support localization;
- [`E2_2_RECIPROCITY.md`](E2_2_RECIPROCITY.md) — causal-component reciprocity;
- [`E2_2B_MOMENTUM_PERSISTENCE.md`](E2_2B_MOMENTUM_PERSISTENCE.md) — persistence after dynamic consequence;
- [`E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md`](E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md) — bounded reproduction gate;
- [`E2_2C1_OWNER_FREEPLAY_CAPTURE.md`](E2_2C1_OWNER_FREEPLAY_CAPTURE.md) — Owner-marked capture instrumentation;
- [`E2_2C2_MOMENTUM_SEMANTICS.md`](E2_2C2_MOMENTUM_SEMANTICS.md) — A″ velocity-only contact consequence;
- [`E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md`](E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md) — Box3D plane-push binding boundary;
- [`E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md`](E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md) — gameplay relevance of blocked velocity debt;
- [`E2_3C_CONSTRAINT_VELOCITY_POLICY.md`](E2_3C_CONSTRAINT_VELOCITY_POLICY.md) — intent-capped relative constraint-velocity research;
- [`E2_3D_PRODUCTION_SPECIMEN.md`](E2_3D_PRODUCTION_SPECIMEN.md) — real A‴ production-path qualification.

Do not reopen these by default merely because they exist.

## Validation map

Canonical top-level command:

`npm run smoke`

Split into:

- `npm run smoke:research` — deterministic research/regression suite;
- `npm run smoke:donor` — donor contract/equivalence + mobile input suite.

Suite membership/order live in [`../scripts/smoke-suite.mjs`](../scripts/smoke-suite.mjs).

Important distinction:

> A research script can remain in the repository as historical evidence without belonging to canonical smoke forever.

E6 is a concrete example.

Durable positive binding facts belong in smoke:

- `e6-0a-prismatic-binding-calibration.mjs`;
- `e6-1a-wheel-two-dof-binding-calibration.mjs`.

Negative representation evidence remains executable but intentionally outside mandatory green smoke:

- E6.0b/c/d serial-carriage representation falsifiers;
- E6.1b direct two-body locked representation falsifier;
- E6.1c exact-zero causal replay.

E6.1c is especially important provenance: changing only the nominal `±10 μm` lock to exact `0/0` did not remove the directional mismatch, so the failed E6.1 representation must not be rescued by silently redefining “locked”.

Removing a probe from mandatory smoke must be an evidence decision, not cleanup by file age. Likewise, a negative experiment must not be rewritten into an artificial PASS merely to make CI green.

The GitHub Actions workflow remains deliberately simple: every push runs full smoke + production build; Pages configuration/upload/deploy occurs only on `main`.

## Current physical-research boundary

After E6, do not continue searching for another latent translational replacement of the primary ankle merely because the previous two were close.

The next physical representation family, if opened, should preserve the qualified primary E5 foot↔torso path and ask first:

> **Can a minimal parallel/alternate support-capable element exist inactive without materially perturbing the baseline?**

That is a support-set **non-interference** question, not yet support transfer, stepping, gait or humanoid anatomy.

External bounded gameplay authority remains a live alternative; E6 does not select it or reject the physical branch.

## Branch / provenance hygiene

The repository intentionally contains historical foundation/research branches. Many correspond to merged PRs and preserve useful experiment provenance.

Rules:

- `main` is canonical;
- active unmerged branch is provisional evidence only;
- merged historical branches are not live state;
- `experiment/*`, `research/*`, `foundation/*`, `stabilize/*` names are provenance labels, not architecture commitments;
- temporary/stale branches are never authority merely because they exist;
- do not mass-delete historical branches solely for aesthetics if they carry unique provenance.

If branch count becomes operationally expensive, prune only after checking what merged PR/exact-commit provenance remains.

## Repository hygiene boundary

Prefer cleanup that reduces ambiguity or maintenance cost without rewriting history:

- keep one canonical orientation layer;
- keep detailed evidence in stage ledgers rather than inflating `PROJECT_STATE.md` indefinitely;
- preserve corrected failures/confounds;
- keep runtime, donor, research harness and presentation claims distinct;
- avoid refactors inside experiments unless correctness requires them;
- do not introduce process/CI ceremony without an observed problem.

Current dependency note: direct package versions are pinned in `package.json`, but there is **no npm lockfile** and CI uses `npm install`. Treat dependency-resolution/install changes as a separate validated substrate-maintenance task.