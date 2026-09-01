# E2.3e — current-best stabilization and donor v1 promotion

## Stage purpose

E2.3d had already made A‴ a machine-qualified production-path specimen and exposed it for Owner free play. The remaining uncertainty was qualitative:

> Does the constraint-velocity policy remove a real perceptual/controller problem without damaging the feel that made A″ preferable?

The Owner free-play result resolved that uncertainty positively. The behavior addressed a previously hard-to-name problem: velocity could remain stored while the character was geometrically blocked, then re-enter motion after direction was released or the constraint cleared. With A‴ that problem became identifiable by contrast, and the resulting overall feel was accepted.

This stage therefore does **not** search for another locomotion defect and does not retune physics. It stabilizes the accepted result.

## Decision

A‴ is promoted from **candidate** to **current-best donor behavior**.

This means:

- default public runtime -> A‴ / Donor v1;
- A″ -> frozen previous Donor v0 reference;
- historical A, B, A′ and research A″ remain in the repository and historical smoke matrix;
- historical browser modes remain reachable by explicit URL for research/regression;
- normal public controls no longer present the 1–6 experiment ladder;
- no mechanical constants are changed during promotion.

This is a current-best decision, not a claim that A‴ or the controller-owned representation is final architecture.

## Donor revision boundary

A silent rewrite of `createDonorCharacter()` was explicitly rejected because the v0 contract had already locked that symbol to A″ semantics.

The donor surface now distinguishes:

### v0 / previous

- `createDonorCharacter(...)`;
- `DONOR_PROFILE_V0`;
- `DONOR_CONTRACT_V0`;
- A″ semantics;
- historical binding-state constraint behavior.

### v1 / current

- `createDonorCharacterV1(...)`;
- `createCurrentDonorCharacter(...)`;
- `DONOR_PROFILE_V1`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`;
- A‴ intent-capped surface-relative constraint velocity.

`DONOR_API_VERSION` moves from `0.1.0` to `0.2.0` because the exported donor surface grows. `DONOR_CONTRACT_V0.apiVersion` remains `0.1.0`; historical contract metadata is not rewritten.

## No hidden retune

`DONOR_PROFILE_V1` is a frozen copy of the v0 mechanical constants.

The promotion changes semantic ownership of active static/kinematic constraint velocity only. It does **not** change:

- radius / capsule dimensions;
- virtual mass;
- walk/sprint speed;
- ground or air acceleration/deceleration;
- external drag;
- gravity/jump shaping;
- coyote/buffer timing;
- support normal threshold;
- causal-component dynamic reciprocity;
- velocity-only dynamic contact memory;
- moving-support inheritance.

Canonical contract smoke fails if v1 silently diverges numerically from v0.

## Qualification added by this stage

### v0 non-regression

The existing donor v0 equivalence smoke remains unchanged in purpose and continues to compare the frozen v0 factory with the historical A″ composition tick-for-tick.

The pre-E2.3d A″ trajectory fingerprint also remains in the research smoke matrix.

### v1 equivalence

`donor-v1-smoke.mjs` adds a donor-level qualification independent of merely rendering the current build.

It runs the exact E2.3d runtime factory and Donor v1 in separate equivalent worlds through a low-blocker episode and compares state tick-for-tick. The route must:

- establish sustained geometric blocking;
- actually execute the promoted constraint cap;
- keep reconstructed/native solve divergence below the established gate;
- preserve near-zero neutral blocked-velocity release in v1;
- retain v0 as a positive historical control whose old release behavior remains measurable.

This proves both compatibility directions at once: v0 did not silently become v1, and v1 did not drift from the Owner-qualified A‴ source behavior.

## Public surface cleanup

The public playground is no longer an experiment selector by default.

Normal URL:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

loads current Donor v1 / A‴.

Normal HUD exposes only gameplay controls, reset and telemetry. Experiment keys `1–6` are removed from the normal interface and key handler.

Historical modes remain intentionally available by explicit URL:

- `?mode=controller` — Foundation A;
- `?mode=solver` — B;
- `?mode=causal` — A′;
- `?mode=momentum` — historical A″ research composition;
- `?mode=donor` or `?mode=previous` — frozen Donor v0 / A″;
- `?mode=constraint` — compatibility alias that falls through to current A‴ behavior.

The code is preserved because it still carries research and regression value. It is removed only from the normal product-facing choice surface.

## Architecture boundary

A‴ still contains deliberate local duplication of the movement solve path. That duplication was introduced to isolate E2.3d from A/A′/A″ and Donor v0 while the policy was unproven.

Promotion does **not** automatically justify refactoring it into `ControllerOwnedCharacter`.

Refactoring becomes a separate future task only when there is a concrete maintenance/extension reason and an equivalence gate appropriate to that blast radius. Current behavior should not be put at risk merely to make the code look cleaner.

## Current stage boundary

After E2.3e the controller-feel line is considered **stable enough to stop active defect hunting**.

The next project step should not be an automatic E2.4 tuning pass. New controller work should be triggered by one of:

1. a newly reproduced real play friction;
2. a required new embodied-player capability;
3. a downstream integration that exposes a real contract/architecture deficiency;
4. a dependency/runtime change that invalidates the current qualified envelope.

Until one of those exists, the correct posture is to preserve current feel and move the broader project question one level up.
