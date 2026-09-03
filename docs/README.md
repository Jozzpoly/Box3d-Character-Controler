# Documentation map

This directory contains both **current authority** and **historical research evidence**. Do not read every file on every takeover.

## Start here

For a fresh takeover, long-gap return or uncertain state:

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — **canonical current-state/orientation layer**;
2. repository [`README.md`](../README.md) — public/current overview;
3. newest relevant stage ledger — currently [`E8_UNILATERAL_AXIAL_COMPLIANCE.md`](E8_UNILATERAL_AXIAL_COMPLIANCE.md).

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
- [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md) — rejection of latent translation in the primary ankle path before actuation;
- [`E7_PARALLEL_SUPPORT_SET.md`](E7_PARALLEL_SUPPORT_SET.md) — parallel support representation, real finite ground acquisition, and failure of the tested single-hinge strut to establish stable body-load sharing;
- [`E8_UNILATERAL_AXIAL_COMPLIANCE.md`](E8_UNILATERAL_AXIAL_COMPLIANCE.md) — compression-only axial substrate, guided-telescopic composition, cache-safe latch release, and failure of the first mass/inertia-matched embodied serial telescope at inactive representation matching.

These are research ledgers. They do not automatically promote mechanics into the player runtime.

## Current E7 → E8 result in one paragraph

E7 proved that a representation-neutral parallel body can be internally placed into real second ground contact, but not that the tested rigid probe can establish stable/regulatable body-load sharing. E8 then qualified a finite compression-only distance spring, a limit-guide/compliance composition, and a cache-safe internal prismatic latch release. The first embodied E8 telescope deliberately split the qualified `1 kg × 0.9 m` E7 probe into two `0.5 kg × 0.45 m` segments while analytically preserving total mass, COM and sagittal pivot inertia. After removing a proven split-induced distal↔torso self-contact, the candidate remained macroscopically very close to the E5 current31/lead8 reference, but its exact locked placement hinge drifted about `0.295°`, above the predeclared `0.25°` inactive gate. Removing the distance spring did not change the defect, and native revolute-joint angle telemetry reproduced the same `0.296716°` maximum. Therefore:

> **The axial-compliance substrate is real, but the tested latent serial telescopic representation is not qualified to advance into placement, load-sharing or locomotion tests.**

Do not relax the gate or tune the failed topology into a pass.

## Historical E1/E2 evidence

[`RESEARCH.md`](RESEARCH.md) is the preserved early ledger through E2. Its authority banner is binding: stage-local words such as “current” and “next” are historical, not live plan.

Focused E2 ledgers remain useful only when a live question touches their exact causal boundary:

- [`E2_1_LOCALIZATION.md`](E2_1_LOCALIZATION.md);
- [`E2_2_RECIPROCITY.md`](E2_2_RECIPROCITY.md);
- [`E2_2B_MOMENTUM_PERSISTENCE.md`](E2_2B_MOMENTUM_PERSISTENCE.md);
- [`E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md`](E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md);
- [`E2_2C1_OWNER_FREEPLAY_CAPTURE.md`](E2_2C1_OWNER_FREEPLAY_CAPTURE.md);
- [`E2_2C2_MOMENTUM_SEMANTICS.md`](E2_2C2_MOMENTUM_SEMANTICS.md);
- [`E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md`](E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md);
- [`E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md`](E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md);
- [`E2_3C_CONSTRAINT_VELOCITY_POLICY.md`](E2_3C_CONSTRAINT_VELOCITY_POLICY.md);
- [`E2_3D_PRODUCTION_SPECIMEN.md`](E2_3D_PRODUCTION_SPECIMEN.md).

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

Durable positive E8 smoke:

- `e8-0a-distance-joint-axial-binding-calibration.mjs` — finite mirrored compression-only axial compliance;
- `e8-0b-telescopic-guide-compliance-binding.mjs` — limit-guide suspension + interior unilateral-compliance role separation;
- `e8-0c-latch-release-cache-boundary.mjs` — cache-safe internal exact-lock release procedure.

Negative E8 embodied-representation provenance remains outside mandatory green smoke:

- `e8-1a-inactive-telescopic-support-representation.mjs`;
- `e8-1b-constraint-topology-decomposition.mjs` plus its retained source;
- `e8-1c-hinge-coordinate-observation.mjs`.

E8.0b's first run at `9547c06b4ded38570618fae3403d0dd3d7112dd0` remains a confounded reader failure. E8.1a's first split-induced self-contact is also retained as a confounded failure rather than rewritten as architecture evidence.

Removing a probe from mandatory smoke must be an evidence decision, not cleanup by age. A negative experiment must not be rewritten into an artificial PASS merely to make CI green.

The GitHub Actions workflow remains deliberately simple: every push runs full smoke + production build; Pages configure/upload/deploy occurs only on `main`.

## Current physical-research boundary

The failed E8.1 serial topology must not be activated merely because its macro E5 response looked close.

The next high-information question should remove the failed property from the inactive representation rather than tune it:

> **Can a mass/COM/inertia-matched split auxiliary branch be mechanically rigid while inactive and still reproduce the already-qualified one-piece E7 probe inside the same strict representation envelope?**

A native weld joint makes a rigid-stow specimen substrate-plausible, but this is only a candidate family. First qualify inactive rigid split. Only on PASS should a separate rigid-stow → prismatic/compliance clutch transition be designed and tested for state continuity and absence of material impulse/energy injection.

A minimal articulated support and explicit bounded gameplay authority remain live alternatives.

## Branch / provenance hygiene

- `main` is canonical;
- active unmerged branch is provisional evidence only;
- merged historical branches are not live state;
- `experiment/*`, `research/*`, `foundation/*`, `stabilize/*` names are provenance labels, not architecture commitments;
- temporary/stale branches are never authority merely because they exist;
- do not mass-delete historical branches solely for aesthetics if they carry unique provenance.

## Repository hygiene boundary

Prefer cleanup that reduces ambiguity or maintenance cost without rewriting history:

- keep one canonical orientation layer;
- keep detailed evidence in stage ledgers rather than inflating `PROJECT_STATE.md` indefinitely;
- preserve corrected failures/confounds;
- keep runtime, donor, research harness and presentation claims distinct;
- avoid refactors inside experiments unless correctness requires them;
- do not introduce process/CI ceremony without an observed problem.

Current dependency note: direct package versions are pinned in `package.json`, but there is **no npm lockfile** and CI uses `npm install`. Treat dependency-resolution/install changes as a separate validated substrate-maintenance task.