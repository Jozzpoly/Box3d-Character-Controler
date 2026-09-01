# Donor stabilization — A″ current-behavior contract

Status: **machine-qualified donor candidate; public/runtime behavior unchanged; not an architecture verdict**.

## Why this exists

The repository is now also a donor for downstream projects. Before adding mobile controls or copying character logic into another project, the current useful behavior needs one explicit import boundary that is distinct from the research comparison UI and from future architecture claims.

Continuity recovery established the latest confirmed project boundary as the E2.3 merge on `main`:

`02d3528cae47f4b04f594dda4ed0a66727033edd`

No later Box3d-Character-Controler implementation stage or unmerged E2.4 line was recovered from repository branches, open PRs, or available conversation context. E2.3 is diagnostic-complete and deliberately leaves production behavior unchanged.

## Donor behavior selected

The donor candidate is the existing Owner-preferred **A″** behavior, not a new controller:

- controller-owned capsule state;
- causal-component dynamic reciprocity;
- dynamic-contact reaction changes current velocity and the contacted body;
- that dynamic-contact `Δv` is not retained as a persistent `externalVelocity` target;
- moving-support inheritance remains unchanged;
- all current locomotion/jump/support parameters remain unchanged;
- current box3d.js@0.1.1 constraint-velocity behavior remains unchanged.

This choice is pragmatic provenance, not proof that A″ is the final embodiment architecture. It is the latest current-behavior specimen with positive Owner free-play evidence and no demonstrated reason to regress to A′ or silently activate E2.3's recovered native clipping contract.

## Stabilization change

`src/donor-character.js` is a small explicit factory for the already-existing A″ composition. It deliberately reuses:

1. `ControllerOwnedCharacter` with `reciprocityMode: 'causal-components'`;
2. `installVelocityOnlyContactMemoryProbe(...)`.

The adapter remains internally visible as provenance/technical debt. This stage does not rewrite the core contact state model merely to make the code look cleaner.

## Qualification

Candidate head after adding the donor entry point and gate:

`8271642aa794f2c0e50218d71b3044b77b07b14e`

GitHub Actions run `33541996531`:

- complete historical `npm run smoke`: **PASS**;
- donor equivalence gate: **PASS** as part of canonical smoke;
- production `npm run build`: **PASS**;
- Pages deployment: intentionally skipped because qualification ran on a non-main branch.

The donor equivalence gate drives the current public A″ construction and the donor factory through separate but identical playground worlds for 360 fixed ticks. It compares character state and resettable world-body state every tick, requires dynamic contact to occur, and fails on divergence above `1e-9`.

Therefore this stage establishes a narrow claim:

> The donor entry point reproduces the current public A″ composition under the qualification route without changing the existing character mechanics.

It does **not** establish mobile/device suitability or solve open embodiment research questions.

## Known boundaries carried into the donor

These remain explicit and must not be silently "fixed" during mobile work:

- E2.3: box3d.js@0.1.1 loses native `b3CollisionPlane.push` state between JS solve/clip calls, so current mover-plane `b3ClipVector` behavior is effectively inert for freshly collected planes;
- activating native-intended clipping materially changes contact lifecycle and is not a neutral dependency repair;
- grounded zero-input locomotion remains a strong horizontal momentum sink (`groundDeceleration = 36 m/s²`);
- controller-owned representation still uses virtual interaction mass, manual dynamic reciprocity and explicit moving-support transport;
- A″ is Owner-preferred current contact semantics, not a final representation winner.

## Boundary before mobile

Mobile work should consume `createDonorCharacter(...)` rather than independently reconstruct A″ or copy a different research mode.

The first mobile stage should change interaction/presentation only: touch input, camera interaction, HUD/layout/viewport and device-performance constraints. Character mechanics remain frozen unless mobile evidence demonstrates a specific mechanical problem.

A downstream multiplayer project should inherit this qualified donor behavior rather than independently rebuilding mobile character semantics.
