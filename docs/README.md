# Documentation map

This directory contains both current authority and historical research evidence. Do not read every file on every takeover.

## Start here

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — compact canonical orientation;
2. repository [`README.md`](../README.md) — public/current overview;
3. newest relevant ledger — currently [`E12_GRADED_CAPACITY_ENTITLEMENT.md`](E12_GRADED_CAPACITY_ENTITLEMENT.md).

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
- [`E11_PHYSICS_FIRST_RESIDUAL.md`](E11_PHYSICS_FIRST_RESIDUAL.md) — physics-first world-external residual decomposition: fixed-deficit and binary-support safeguards rejected; absolute physical-share interpretation corrected;
- [`E12_GRADED_CAPACITY_ENTITLEMENT.md`](E12_GRADED_CAPACITY_ENTITLEMENT.md) — graded traction-capacity entitlement survives canonical launch/braking; fair dynamic-support placement accounting reveals a world-reference boundary.

These ledgers are research authority, not automatic runtime promotion.

## Current E11 → E12 result

E11 showed why a boolean physical gate is not enough: weak `μ=.20` traction could unlock accepted-looking current31 translation dominated by world-external authority even while the body physically fell.

E12 therefore replaced boolean eligibility with a physically derived graded capacity signal:

`q = clamp( μ × J_n~ / (0.95 × 80 × 20 × 1/60), 0, 1 )`

using the existing E5.0a pinned-substrate load estimate `J_n~ = 0.5 × totalNormalImpulse`.

The durable E12 boundary is four-part:

1. **Graded entitlement survives current31.** Normal `μ=.95` reaches `5.218/5.273 m/s` and recovers; weak `μ=.20` remains only `1.748/1.707 m/s` and falls; `μ=0` gets zero authority.
2. **The same principle survives current36 braking.** After reproducing exact E4.6 brake-start history, normal support stops essentially at zero and recovers; weak/zero support remain materially unable to stop. The earlier direct-velocity setup is preserved as a confounded harness failure, not rewritten as physical evidence.
3. **Dynamic placement can be compared fairly support-relative.** Reduced-mass scaling lets world-external and equal-and-opposite reciprocal placement grant the same `q`-scaled relative agency. World-external injects combined horizontal momentum; reciprocal placement preserves it through support recoil.
4. **An isolated free player+support pair cannot meaningfully choose placement.** With player damping removed, the two placements are Galilean-equivalent in relative motion/contact/posture near machine precision. Canonical player damping `0.015` breaks this by only about `0.006%` of the granted pulse over one second.

Therefore:

> **The next architecture discriminator must introduce a genuine external world reference. More isolated player+free-support tests are informationally exhausted.**

Do not open another `q`, friction, residual-ratio or support-mass sweep by inertia.

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
- E11.1a residual/contact interaction decomposition;
- E12.0a current31 capacity-entitlement falsifier;
- corrected E12.1a current36 braking falsifier;
- E12.2a dynamic-support placement calibration;
- E12.2b Galilean placement/world-damping decomposition.

Negative/confounded provenance outside mandatory smoke includes:

- E7.2 load-transfer falsifiers;
- E8.1 embodied serial-telescope falsifiers/decomposition;
- E9.0b rigid-split inactive representation falsifier;
- E10.1a quiet braced load-transfer falsifier;
- E10.1b demand-aligned brace-stability falsifier;
- E11.0a fixed-deficit physics-first residual falsifier;
- E11.2a weak-support masking/support-relevance falsifier;
- the first E12.1a direct-velocity braking initialization failure at `ff6c8bf5…` / workflow `33756365385`, superseded only as a harness protocol, not erased from history.

Do not rewrite negative experiments into artificial PASSes merely to keep CI green.

## Current research boundary

Highest-value question:

> **When a dynamically supported player is coupled to a genuine external world reference, what gameplay-relevant consequences distinguish nonreciprocal world-external authority from reciprocal support reaction, and which consequences do we want?**

A useful next specimen must make that third reference causal while introducing as little arbitrary freedom as possible. Candidate families include:

- world-anchored interaction;
- delayed contact with another environmental body;
- externally driven support.

Do not select a wall gap, spring stiffness, support mass or other free parameter merely to manufacture a difference. First derive the smallest scenario in which world-frame momentum placement has a consequence that matters to the project.

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