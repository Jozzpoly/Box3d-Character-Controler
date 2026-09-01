# Donor Contract v0

Status: **preliminary long-term donor foundation; behavior-preserving relative to qualified A″; not a final embodiment architecture**.

Public source surface:

`src/donor/index.js`

API version:

`0.1.0`

## Purpose

The repository serves two different jobs:

1. an embodied-player research laboratory where hypotheses and disposable experiments may change quickly;
2. a downstream donor from which real projects can inherit a known player embodiment without inheriting the entire research apparatus.

The donor contract exists to keep those jobs from silently contaminating each other.

A lab experiment is not a donor change. A donor change requires an explicit contract/profile revision and qualification.

## Stable v0 surface

Downstream code should import from `src/donor/index.js`.

The v0 surface exports:

- `createDonorCharacter(b3, world, options)`;
- `createDonorIntent(input)`;
- `normalizeMoveAxes(moveForward, moveRight)`;
- `DONOR_API_VERSION`;
- `DONOR_BEHAVIOR`;
- `DONOR_CONTRACT_V0`;
- `DONOR_PROFILE_V0`;
- `DONOR_QUALIFIED_ENVELOPE_V0`.

`src/donor-character.js` remains only a compatibility entry point. Research history may continue importing `src/momentum-semantics-probe.js`; that module is also a compatibility alias and no longer owns the A″ contact-memory implementation.

## Behavior identity

Donor v0 preserves the current Owner-preferred A″ semantics:

- controller-owned capsule position/state;
- virtual interaction mass;
- causal-component dynamic reciprocity;
- dynamic-contact reaction affects current character velocity and the contacted rigid body;
- that same dynamic-contact reaction is not retained as a persistent horizontal `externalVelocity` target;
- explicit moving-support inheritance remains active;
- current constraint-velocity behavior of the `box3d.js@0.1.1` binding remains unchanged.

This is a qualified current-best donor behavior, not a claim that controller-owned A″ is the final player representation.

## Explicit mechanical profile

`DONOR_PROFILE_V0` records the qualified mechanical defaults explicitly instead of inheriting them implicitly from `ControllerOwnedCharacter`.

That is a critical long-term rule:

> Existing donor profiles are immutable compatibility contracts. Do not silently retune `DONOR_PROFILE_V0` when laboratory defaults change.

A materially changed default donor should become a new named/revisioned profile and earn its own qualification evidence.

Callers may pass numeric/environment overrides to `createDonorCharacter(...)`, but an overridden configuration is no longer identical to the qualified v0 baseline unless separately tested.

The semantic identity of this factory remains locked to causal-component reciprocity plus velocity-only dynamic-contact memory.

## Intent contract

The donor does not depend on keyboard, touch, DOM, Three.js camera code, networking, AI or replay systems.

Its input boundary is a small physics-tick intent:

- `moveForward` / `moveRight` — camera/reference-relative movement axes, normalized to unit magnitude;
- `forward` / `right` — world-space basis vectors supplied by the caller;
- `jump` — edge/queued jump request for this tick;
- `jumpHeld` — continuous hold used by jump shaping;
- `sprint` — continuous sprint modifier.

`createDonorIntent(...)` creates and normalizes this shape. Browser keyboard/touch input is only one producer of the same contract.

This makes the same character surface usable later by:

- desktop controls;
- touch controls;
- gamepads;
- replay/ghost systems;
- bots or scripted tests;
- multiplayer input transport/prediction experiments.

Those systems should translate into the intent contract rather than modify character mechanics directly.

## Integration lifecycle

Qualified ordering is:

1. `character.preStep(dt, intent)`;
2. `b3World_Step(world, dt, substeps)`;
3. `character.postStep(dt)`.

The current qualified execution envelope is recorded in `DONOR_QUALIFIED_ENVELOPE_V0`:

- fixed physics step: `1 / 60 s`;
- Box3D substeps: `4`;
- binding: `box3d.js@0.1.1`;
- mechanics source stage: E2.3.

Other timesteps, substep counts or bindings may work, but they are outside the current evidence envelope until separately qualified.

## Dependency boundary

The stable donor module is intentionally runtime-independent at import time:

- no DOM requirement;
- no `window` / `document` requirement;
- no Three.js import;
- no renderer/camera/HUD dependency;
- no playground dependency.

The caller supplies the initialized Box3D binding and world.

This keeps rendering, UI, world composition and application lifecycle outside the donor core.

## Verification boundary

Canonical verification is split into:

- `npm run smoke:research` — historical research/physics gates;
- `npm run smoke:donor` — donor API contract, A″ behavioral equivalence and mobile/input gates;
- `npm run smoke` — both surfaces together.

`donor-contract-smoke.mjs` protects the public surface itself. `donor-smoke.mjs` remains the behavioral equivalence falsifier: the donor and the previously qualified A″ composition are advanced through separate identical worlds and compared tick-for-tick.

A donor contract change must not be accepted merely because the demo renders.

## Known debts carried deliberately

Foundation v0 does not hide or repair these boundaries:

- E2.3 `b3CollisionPlane.push` binding-state loss means the current JS mover clipping path does not reproduce the vendored native contract for freshly solved planes;
- activating native-intended clipping materially changes contact lifecycle and is therefore not a neutral dependency fix;
- grounded locomotion currently consumes horizontal momentum aggressively (`groundDeceleration = 36 m/s²`);
- controller-owned state still relies on virtual mass, manual reciprocity and explicit support transport;
- A″ remains current-best evidence, not a final representation winner.

A downstream project should inherit these facts with the donor instead of accidentally rediscovering them.

## Versioning policy

For v0 development:

- **API change** — exported names, intent shape or lifecycle expectations change: bump `DONOR_API_VERSION`;
- **baseline behavior change** — mechanical defaults or semantic policies change: create a new donor profile/revision; do not mutate old profile meaning silently;
- **lab experiment** — no donor version change until explicitly promoted;
- **browser UI change** — no donor behavior version change unless the intent delivered to physics changes;
- **dependency/binding change** — requires explicit qualification because Box3D binding behavior is part of the current evidence envelope.

No promise of semantic-versioning stability beyond v0 is made yet. The purpose now is to make change explicit and evidence-backed.

## Downstream adoption rule

For a new project, start by inheriting the stable donor surface rather than copying research modes or reconstructing A″ manually.

Initial adoption should preserve:

- the v0 profile;
- the v0 lifecycle order;
- the qualified timestep/substep envelope;
- the intent contract;
- the donor regression gate or an equivalent integration-level conformance check.

Only then should the consumer add project-specific rendering, camera, networking, world rules or control devices around it.

## What is intentionally deferred

Do not build these merely to make v0 look like a mature framework:

- npm publication/release automation;
- engine-agnostic physics abstraction;
- plugin architecture;
- ECS conversion;
- generic networking ownership/prediction API;
- serialization format for every internal field;
- dependency injection around every Box3D call;
- multiple behavior profiles before a real second profile exists.

Package extraction becomes justified when at least one additional real consumer needs a cleaner dependency boundary. Networking/replay contracts should be designed from actual consumer requirements, using the existing pure intent boundary as the starting seam.
