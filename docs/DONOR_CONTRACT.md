# Donor Contract — v0 compatibility + v1 current

Status: **v1 is the current Owner-qualified donor behavior; v0 remains an immutable compatibility/reference revision. Neither is claimed to be a final embodiment architecture.**

Public source surface:

`src/donor/index.js`

Current API version:

`0.2.0`

## Purpose

The repository serves two distinct jobs:

1. an embodied-player research laboratory where hypotheses and disposable experiments may change quickly;
2. a downstream donor surface from which real projects can inherit a known player embodiment without inheriting the research apparatus.

The donor contract prevents those jobs from silently contaminating each other. A lab experiment is not a donor change. A donor change requires an explicit revision and qualification.

## Revision model

### v0 — frozen previous reference

Donor v0 preserves A″ exactly as previously qualified:

- `createDonorCharacter(...)` remains the historical v0 factory;
- `DONOR_PROFILE_V0` remains immutable;
- `DONOR_CONTRACT_V0.apiVersion` remains `0.1.0`;
- causal-component dynamic reciprocity remains active;
- dynamic-contact `Δv` affects current velocity but is not retained as a persistent horizontal `externalVelocity` target;
- moving-support inheritance remains active;
- constraint velocity keeps the historical `box3d.js@0.1.1` binding behavior, including the missing solved `plane.push` state across separate JS solve/clip calls.

The legacy names `DONOR_BEHAVIOR` and `createDonorCharacter` deliberately continue to mean v0/A″. This prevents an existing downstream consumer from receiving different mechanics under the same symbol.

### v1 — current

Donor v1 is the promoted A‴ behavior from E2.3d:

- factory: `createDonorCharacterV1(...)`;
- current alias: `createCurrentDonorCharacter(...)`;
- behavior metadata: `DONOR_BEHAVIOR_V1`;
- profile: `DONOR_PROFILE_V1`;
- contract: `DONOR_CONTRACT_V1`;
- current pointers: `CURRENT_DONOR_REVISION`, `CURRENT_DONOR_BEHAVIOR`, `CURRENT_DONOR_CONTRACT`.

v1 keeps **exactly the same numerical feel constants as v0**. The promoted difference is semantic, not a retune:

> active horizontal static/kinematic constraint velocity is evaluated relative to the surface, and only inward relative normal authority no longer justified by current player intent is retired.

Dynamic-body consequence remains owned by the existing causal reciprocity path. Tangent velocity is preserved.

Exact Owner-qualified source specimen:

`bc06ca98e94314af0ba888b74e1c4029429422e5`

The Owner free-play gate resolved the remaining qualitative uncertainty: the stored blocked-velocity behavior fixed by A‴ corresponded to a real previously hard-to-name feel problem, and the resulting current feel was accepted. That promotes A‴ from candidate to current-best; it does not make it immutable forever.

## Profile invariants

`DONOR_PROFILE_V0` and `DONOR_PROFILE_V1` currently contain the same numeric values. This is deliberate and gated.

A v1 promotion must not smuggle in tuning changes. `donor-contract-smoke.mjs` fails if the two profiles diverge without an explicit contract change.

Existing donor profiles are immutable compatibility contracts. Future tuning or semantic changes require another explicit revision rather than silently changing v0 or v1 meaning.

## Intent contract

The donor does not depend on keyboard, touch, DOM, Three.js camera code, networking, AI or replay systems.

Its input boundary remains a small physics-tick intent:

- `moveForward` / `moveRight` — camera/reference-relative movement axes, normalized to unit magnitude;
- `forward` / `right` — world-space basis vectors supplied by the caller;
- `jump` — edge/queued jump request for this tick;
- `jumpHeld` — continuous hold used by jump shaping;
- `sprint` — continuous sprint modifier.

`createDonorIntent(...)` creates and normalizes this shape. Control devices and higher-level systems should translate into this contract instead of modifying character mechanics directly.

## Integration lifecycle

Both qualified revisions use:

1. `character.preStep(dt, intent)`;
2. `b3World_Step(world, dt, substeps)`;
3. `character.postStep(dt)`.

Qualified v1 envelope:

- fixed physics step: `1 / 60 s`;
- Box3D substeps: `4`;
- binding: `box3d.js@0.1.1`;
- mechanics source stage: E2.3d Owner-qualified A‴;
- exact mechanics baseline commit: `bc06ca98e94314af0ba888b74e1c4029429422e5`.

Other timesteps, substep counts or bindings may work but remain outside the qualified envelope until tested.

## Dependency boundary

The donor module remains runtime-independent at import time:

- no DOM requirement;
- no `window` / `document` requirement;
- no Three.js import;
- no renderer/camera/HUD dependency;
- no playground dependency.

The caller supplies initialized Box3D and the world.

## Verification boundary

Canonical verification is split into:

- `npm run smoke:research` — historical research/physics gates;
- `npm run smoke:donor` — donor contract, frozen v0 equivalence, promoted v1 equivalence/policy exercise and mobile/input gates;
- `npm run smoke` — both surfaces together.

The donor gates intentionally test two different truths:

1. **v0 must not move.** `donor-smoke.mjs` compares the v0 factory with the frozen A″ composition tick-for-tick.
2. **v1 must mean A‴.** `donor-v1-smoke.mjs` compares v1 with the exact E2.3d production behavior through an active low-blocker constraint episode, requires the promoted cap path to execute, requires stale neutral release to remain near zero, and keeps v0 as a positive historical control that still exhibits its old release behavior.

A donor change is not accepted merely because the demo renders.

## Known debts carried deliberately

v1 resolves the demonstrated stale blocked-velocity ownership problem, but it does not erase broader architectural debt:

- `box3d.js@0.1.1` still drops native solved `b3CollisionPlane.push` state across separate JS calls; v1 locally reconstructs the needed active-plane state and verifies reconstructed solve delta against native solve output;
- the current A‴ implementation deliberately duplicates a small `_solveMovement()` path for experimental isolation; promotion does not by itself justify refactoring that path into the shared historical class;
- grounded locomotion still consumes horizontal momentum aggressively (`groundDeceleration = 36 m/s²`);
- controller-owned state still relies on virtual mass, manual reciprocity and explicit support transport;
- A‴ is current-best evidence, not proof that controller-owned representation is the final representation class.

## Versioning policy

- **API surface change** — exported names, intent shape or lifecycle expectations change: bump `DONOR_API_VERSION`.
- **behavior change** — semantic policy or qualified mechanical defaults change: create a new donor revision/profile; do not rewrite old revision meaning.
- **lab experiment** — no donor revision change until explicitly promoted.
- **browser UI change** — no donor behavior revision change unless physics intent/behavior changes.
- **dependency/binding change** — requires explicit qualification because binding behavior is part of the evidence envelope.

No promise of mature semantic-versioning stability is made yet. The purpose is explicit, evidence-backed change.

## Downstream adoption rule

New integrations should normally use `createCurrentDonorCharacter(...)` plus the current contract pointers. Consumers that need the old A″ behavior may explicitly use `createDonorCharacter(...)` / `DONOR_CONTRACT_V0`.

A downstream integration should preserve:

- the chosen revision/profile;
- lifecycle order;
- qualified timestep/substep envelope;
- intent contract;
- an equivalent regression/conformance gate.

Only then should it add project-specific rendering, camera, networking, world rules or control devices around the donor.

## Intentionally deferred

Do not build these merely because v1 now exists:

- npm publication/release automation;
- engine-agnostic physics abstraction;
- plugin architecture;
- ECS conversion;
- generic networking ownership/prediction API;
- serialization for every internal field;
- dependency injection around every Box3D call;
- automatic removal of historical research specimens;
- refactoring A‴ into shared code before a concrete maintenance or extension need justifies the blast radius.

The second real donor revision justifies explicit revisioning. It does not justify turning the laboratory into a framework.
