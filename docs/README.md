# Documentation map

This directory contains both **current authority** and **historical research evidence**. Do not read every file on every takeover.

## Start here

For a fresh takeover, long-gap return or uncertain state:

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — **canonical current-state/orientation layer**;
2. repository [`README.md`](../README.md) — public/current overview;
3. newest relevant stage ledger — currently [`E7_PARALLEL_SUPPORT_SET.md`](E7_PARALLEL_SUPPORT_SET.md).

Then inspect code, CI and older ledgers only as required by the live question.

`main` + exact SHA + CI are implementation truth. A branch name is never current authority by itself.

## Current accepted runtime / donor

- [`DONOR_CONTRACT.md`](DONOR_CONTRACT.md) — stable downstream API, profile and lifecycle contract;
- [`E2_3E_STABILIZATION.md`](E2_3E_STABILIZATION.md) — promotion of A‴ / Donor v1 to current-best behavior;
- [`DONOR_STABILIZATION.md`](DONOR_STABILIZATION.md) — earlier donor stabilization provenance;
- [`MOBILE_PAGES.md`](MOBILE_PAGES.md) — mobile/Pages evidence and current mobile boundary.

The normal public/default player remains **A‴ / Donor v1** unless `PROJECT_STATE.md` says otherwise.

## Current research lineage

- [`E3_ROTATIONAL_EMBODIMENT.md`](E3_ROTATIONAL_EMBODIMENT.md) — E3.1 rotational embodiment / first Owner-positive balance surface;
- [`E3_1_VALIDATION_LOOP.md`](E3_1_VALIDATION_LOOP.md) — E3.1 post-Owner causal decomposition;
- [`E3_1_SUPPORT_TRANSITIONS.md`](E3_1_SUPPORT_TRANSITIONS.md) — support-transition/contact-signal semantics;
- [`E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](E3_2_BOUNDED_INTERNAL_MOMENTUM.md) — bounded internal angular momentum and solver-resolution robustness failure;
- [`E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](E4_LOCOMOTION_POSTURE_COMPATIBILITY.md) — accepted translational demand vs finite posture;
- [`E5_AUTHORITY_PLACEMENT.md`](E5_AUTHORITY_PLACEMENT.md) — authority placement, physical contact contribution and residual-authority accounting;
- [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md) — rejection of two latent-translation representations in the primary ankle path before actuation;
- [`E7_PARALLEL_SUPPORT_SET.md`](E7_PARALLEL_SUPPORT_SET.md) — parallel support representation, real finite ground acquisition, and failure of the tested single-hinge strut to become a stable body-load path.

These are research ledgers. They do not automatically promote mechanics into the player runtime.

## Current E7 result in one paragraph

E7 preserved the qualified primary E5 foot↔torso path and added a separate physical support branch. A `1 kg`, `0.9 m` parallel probe passed inactive representation matching, then finite equal-and-opposite internal actuation acquired a real mirrored probe↔platform contact while primary support remained active. However, acquiring a second contact did **not** make it a meaningful body-load path: upright settling left almost all load on the primary foot, and a current31 demand-derived `57.17°` weight shift lost the primary support and fell while the probe remained grounded. Therefore:

> **Contact acquisition is not support capacity. The next support family must prove a stable, regulatable compressive load path before translational-agency claims.**

Do not rescue the E7 strut through torque/angle/length/mass sweeps.

## Historical E1/E2 evidence

[`RESEARCH.md`](RESEARCH.md) is the preserved early ledger through E2. Its authority banner is binding: stage-local words such as “current” and “next” are historical, not live plan.

Focused E2 ledgers remain useful only when a live question touches their exact causal boundary:

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

> **A research script can remain in the repository as historical evidence without belonging to canonical smoke forever.**

Durable positive E6 smoke:

- `e6-0a-prismatic-binding-calibration.mjs`;
- `e6-1a-wheel-two-dof-binding-calibration.mjs`.

Negative E6 representation probes remain executable provenance outside mandatory green smoke.

Durable positive E7 smoke:

- `e7-0a-inactive-parallel-support-probe.mjs`;
- `e7-0b-contact-reachable-inactive-probe.mjs`;
- `e7-1a-finite-internal-support-acquisition.mjs`;
- `e7-1b-ground-contact-identity.mjs`.

Negative E7 load-bearing falsifiers remain executable provenance outside mandatory green smoke:

- `e7-2a-settled-support-load-transfer.mjs`;
- `e7-2b-demand-aligned-load-transfer.mjs`.

Removing a probe from mandatory smoke must be an evidence decision, not cleanup by age. A negative experiment must not be rewritten into an artificial PASS merely to make CI green.

The GitHub Actions workflow remains deliberately simple: every push runs full smoke + production build; Pages configure/upload/deploy occurs only on `main`.

## Current physical-research boundary

Do not run current31 translational-agency A/B on the failed E7 single-hinge strut. It did not pass the more fundamental body-load-path prerequisite.

The next physical question, if pursued, is:

> **Can a parallel support mechanism provide a finite, stable and regulatable compressive load path while remaining mechanically non-interfering when inactive?**

Candidate families may include an axial/telescopic support or a minimal articulated limb. Neither is selected yet.

Any new family starts with inactive representation matching before contact acquisition or load-transfer claims.

External bounded gameplay authority remains a live alternative branch of the E5 fork; E7 neither selects nor rejects it.

## Branch / provenance hygiene

The repository intentionally contains historical foundation/research branches. Many correspond to merged PRs and preserve useful provenance.

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
