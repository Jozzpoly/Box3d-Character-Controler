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
- [`E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`](E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md) — rejection of two latent-translation representations in the primary ankle path before actuation;
- [`E7_PARALLEL_SUPPORT_SET.md`](E7_PARALLEL_SUPPORT_SET.md) — parallel support representation, real finite ground acquisition, and failure of the tested single-hinge strut to establish stable body-load sharing;
- [`E8_UNILATERAL_AXIAL_COMPLIANCE.md`](E8_UNILATERAL_AXIAL_COMPLIANCE.md) — qualification of a solver-native finite compression-only axial primitive and the topology boundary it exposes.

These are research ledgers. They do not automatically promote mechanics into the player runtime.

## Current E7 → E8 result in one paragraph

E7 preserved the qualified primary E5 foot↔torso path and added a separate physical support branch. A `1 kg`, `0.9 m` parallel probe passed inactive representation matching, then finite equal-and-opposite internal actuation acquired a real mirrored probe↔platform contact while primary support remained active. Upright settling left almost all load on the primary foot; when current31 demand shifted the body far enough toward the second support, the primary foot unloaded/lost contact while the probe remained grounded and the organism fell instead of establishing a stable dual-support HOLD. This means the rigid E7 branch was capable of transmitting enough reaction to participate in support takeover, but did not provide stable/regulatable load sharing. E8.0a then qualified, at binding level only, a mirrored spring-only distance-joint primitive that saturates at finite compression force while exerting effectively zero tension. Therefore:

> **The next problem is not merely acquiring a second contact or discovering any load path; it is embedding finite unilateral compliance into a physically honest parallel topology that remains non-interfering while inactive and can later be tested for stable load sharing.**

Do not rescue the E7 strut through torque/angle/length/mass sweeps, and do not treat the E8.0a primitive as an already qualified leg.

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

Current positive E8 binding smoke:

- `e8-0a-distance-joint-axial-binding-calibration.mjs` — finite mirrored compression-only axial compliance; no embodied-support claim.

Removing a probe from mandatory smoke must be an evidence decision, not cleanup by age. A negative experiment must not be rewritten into an artificial PASS merely to make CI green.

The GitHub Actions workflow remains deliberately simple: every push runs full smoke + production build; Pages configure/upload/deploy occurs only on `main`.

## Current physical-research boundary

Do not run current31 translational-agency A/B on the failed E7 single-hinge strut. It did not pass the more fundamental stable-load-sharing prerequisite.

E8.0a has now answered the primitive-level question: the pinned Box3D binding can provide finite compression with effectively zero tension in an isolated axial specimen. That does **not** solve the embodied topology problem. In particular, a lone compression-only distance constraint cannot by itself suspend an elevated real distal body below the torso under gravity without entering tension or introducing some other placement/suspension mechanism.

The next physical question, if pursued, is:

> **What is the smallest physically honest parallel topology that can keep a real distal support element internally attached/placed under gravity, expose finite unilateral axial compliance for future load sharing, and still pass inactive current31/lead8 representation matching?**

A minimal telescopic or articulated parallel limb is a candidate, not a selected architecture. Before implementation, compare candidate DOFs/load paths and reject world locks, kinematic holds or duplicate hard constraints that would make the representation unfair.

Any selected family then starts with inactive representation matching before contact acquisition or load-transfer claims.

External bounded gameplay authority remains a live alternative branch of the E5 fork; E7/E8.0a neither select nor reject it.

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