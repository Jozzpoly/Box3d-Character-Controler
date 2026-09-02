# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

The implementation is disposable; accepted observations are not. Detailed stage documents are the research record. This README is a compact map of the current state rather than a second copy of every experiment.

For a fresh takeover or long-gap regrounding, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md). It defines the live authority hierarchy, broader-project boundaries, current architecture map, known debts and the execution loop for future work. Stage documents remain historical evidence and should not be mistaken for live planning authority merely because they contain words such as “current” or “next”.

## Current state — E2.3e stabilization

The current public/default player is now **Donor v1 / A‴**.

A‴ earned promotion through two independent kinds of evidence:

1. **machine qualification** — E2.3d reproduced the E2.3c constraint-velocity survivor in the real runtime while preserving traversal, dynamic-contact and moving-support invariants;
2. **Owner free play** — the promoted behavior removed a real previously hard-to-name feel problem: velocity could remain stored while the player was geometrically blocked and then re-enter movement after direction was released or the constraint cleared. With A‴ that problem became identifiable by contrast, and the resulting overall feel was accepted.

This makes A‴ the **current-best behavior**, not a claim that it is the final controller architecture.

### Current / v1

Donor v1 keeps the accepted A″ mechanics and feel constants, then adds **intent-capped surface-relative constraint velocity** for active horizontal static/kinematic constraints:

```text
v_rel_in = (velocity - surfaceVelocity) · horizontalNormal
d_rel_in = (desiredVelocity - surfaceVelocity) · horizontalNormal
allowed_rel_in = min(0, d_rel_in)

if v_rel_in < allowed_rel_in:
    retire only the excess normal component
```

Working interpretation:

> **Constraint velocity is relative, and the player may retain only the constrained normal authority still justified by current intent.**

This prevents stale blocked locomotion authority from being stored and released later while preserving:

- tangent motion;
- held intent into short-lived geometry such as stairs;
- causal-component dynamic-body reciprocity;
- velocity-only dynamic-contact consequence;
- moving-support inheritance;
- the existing accepted feel constants.

Exact Owner-qualified A‴ source specimen:

`bc06ca98e94314af0ba888b74e1c4029429422e5`

### Previous / v0

Donor v0 / A″ remains an immutable previous reference.

It preserves the earlier accepted contact-memory fix but retains the historical `box3d.js@0.1.1` constraint-velocity behavior in which solved `b3CollisionPlane.push` state is lost across separate JS solve/clip calls.

The old factory `createDonorCharacter(...)` deliberately remains v0/A″. It is **not** silently retargeted to current behavior.

### Historical research specimens

A, B, A′ and the intermediate A″ research composition remain in the repository, tests and explicit URL modes because they still carry evidence value. They are no longer presented as normal public choices.

## Why the constraint change exists

E2.3 found that the browser binding silently makes the apparent native mover velocity clip inert: `b3SolvePlanes(...)` updates native plane push state, but `box3d.js@0.1.1` does not copy that solved state back to the JS plane objects consumed later by `b3ClipVector(...)`.

Simply restoring full native-intended clipping was rejected because it materially changed contact lifecycle and broke ordinary `0.22 m` stair traversal.

E2.3b then established the gameplay consequence of doing nothing: A″ could spend `53f` blocked while retaining `5.200 m/s` into the obstacle, still hold `3.400 m/s` after three neutral grounded ticks, then release about `1.282 m` of forward movement during a neutral jump.

E2.3c rejected immediate clipping, binary intent release and world-space capping for moving kinematic surfaces. The surviving rule was the intent-capped **surface-relative** normal policy now used by A‴.

E2.3d production qualification included:

- neutral stale release: `0.000 m`;
- tangent normal leak: `0.000 m`, tangent travel preserved;
- 45° partial intent: allowed normal component exactly `3.677 m/s`;
- held-forward obstacle negotiation: `5.200 m/s`, crossing preserved;
- ordinary stairs: PASS;
- ledge blocker: PASS;
- Owner dynamic anchor: preserved `7f`, same impulse/tail/support behavior;
- moving-support jump carry: preserved;
- receding `4.000 m/s` kinematic wall: neutral converges to `4.000 m/s`, not `0`;
- two-plane corner release: PASS;
- oblique normal-space falsifier: PASS;
- recovered/native solve divergence remained on the order of `1e-9` in measured gates.

## Donor surface

Stable module:

`src/donor/index.js`

Current API version:

`0.2.0`

### Current donor

Use:

- `createCurrentDonorCharacter(...)`;
- or explicit `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1` / `DONOR_PROFILE_V1`;
- `CURRENT_DONOR_REVISION`, `CURRENT_DONOR_BEHAVIOR`, `CURRENT_DONOR_CONTRACT`.

### Frozen previous donor

Use only when A″ compatibility is specifically required:

- `createDonorCharacter(...)`;
- `DONOR_CONTRACT_V0` / `DONOR_PROFILE_V0`.

v0 and v1 currently use **identical numeric mechanical profiles**. v1 is a semantic promotion, not a hidden retune.

See [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md) for the exact compatibility/versioning rules.

## Public build and controls

Current build:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

The normal URL loads **CURRENT · Donor v1 · A‴**.

Normal controls:

- `WASD` / touch left stick — camera-relative movement;
- `Space` / `JUMP` — jump;
- `Shift` / `SPRINT` — sprint;
- mouse/touch drag — orbit camera;
- mouse wheel — zoom;
- `R` / `RESET` — reset world + player;
- `H` — telemetry.

The old public 1–6 experiment selector and numeric hotkeys are removed from the normal interface.

Historical direct modes remain available for research/regression:

- `?mode=controller` — Foundation A;
- `?mode=solver` — B;
- `?mode=causal` — A′;
- `?mode=momentum` — historical A″ research composition;
- `?mode=donor` or `?mode=previous` — frozen Donor v0 / A″;
- `?mode=constraint` — compatibility alias that resolves to current A‴ behavior;
- `?mode=causal&capture=1` — historical A′ Owner-capture path.

## Detailed evidence

- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — canonical current-state/orientation layer and operating model;
- [`docs/E2_1_LOCALIZATION.md`](docs/E2_1_LOCALIZATION.md) — terrain/support and A-vs-B localization;
- [`docs/E2_2_RECIPROCITY.md`](docs/E2_2_RECIPROCITY.md) — causal-component reciprocity and A′ qualification;
- [`docs/E2_2B_MOMENTUM_PERSISTENCE.md`](docs/E2_2B_MOMENTUM_PERSISTENCE.md) — post-contact persistence diagnostic;
- [`docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md`](docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md) — bounded reproduction gate;
- [`docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md`](docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md) — Owner-marked capture contract;
- [`docs/E2_2C2_MOMENTUM_SEMANTICS.md`](docs/E2_2C2_MOMENTUM_SEMANTICS.md) — A′ contact-memory diagnosis and A″ falsifier;
- [`docs/E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md`](docs/E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md) — grounded momentum sink and binding-state boundary;
- [`docs/E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md`](docs/E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md) — gameplay proof of stale blocked velocity release;
- [`docs/E2_3C_CONSTRAINT_VELOCITY_POLICY.md`](docs/E2_3C_CONSTRAINT_VELOCITY_POLICY.md) — rejected policy classes and relative intent-cap survivor;
- [`docs/E2_3D_PRODUCTION_SPECIMEN.md`](docs/E2_3D_PRODUCTION_SPECIMEN.md) — isolated A‴ implementation and machine qualification;
- [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md) — Owner acceptance, current-best promotion, public cleanup and stage boundary;
- [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md) — v0 compatibility + v1 current donor contract;
- [`docs/MOBILE_PAGES.md`](docs/MOBILE_PAGES.md) — current mobile/touch boundary plus historical real-device evidence;
- [`docs/RESEARCH.md`](docs/RESEARCH.md) — early historical research ledger; useful provenance, **not** the live current-state authority.

## Playground

The yard remains intentionally open rather than a prescribed obstacle course. It includes dynamic rigid bodies with different mass/shape affordances, a loose stack, slab, beam, static elevation changes, four `0.22 m` stair rises, a nearby `0.52 m` jump boundary, and one translating/rotating support.

## Runtime provenance

Current browser substrate:

- `box3d.js@0.1.1`;
- `three@0.183.0`;
- `vite@7.0.0`.

`box3d.js@0.1.1` release commit:

`5d5a3af049cccd9948b2b55bac4342414af0ef64`

Vendored native Box3D commit:

`8441b4a06d6d09dcfb0b0f704df4d847d1437b92`

Binding version and native engine snapshot are distinct provenance facts.

## Validation

```bash
npm install
npm run smoke
npm run build
```

Canonical smoke preserves the historical Foundation/E2 research gates, frozen pre-E2.3d A″ fingerprint, E2.3d production/corner/oblique qualification, Donor v0 equivalence, Donor v1 equivalence/policy exercise, donor contract and mobile/input gates.

## Current stage boundary

Confirmed current-best interpretation:

1. A′ contact reaction was incorrectly retained as a later absolute external-velocity target; A″ fixed that real perceptual pathology.
2. A″ still allowed locomotion velocity to remain stored through geometric blocking and re-enter movement later.
3. Full native-intended clipping is not the answer because it materially changes valid traversal/contact behavior.
4. Intent-capped surface-relative constraint velocity removes only stale constrained authority while preserving currently justified intent and moving-surface motion.
5. A‴ passed the machine matrix and then the missing Owner free-play gate; the previously unnamed blocked-velocity feel problem became identifiable and the resulting feel was accepted.
6. A‴ / Donor v1 is therefore current-best. Donor v0/A″ remains frozen previous compatibility behavior.
7. Controller feel is now stable enough that the project should **stop active defect hunting** until new play evidence or a real new capability/integration need appears.

Do not automatically:

- retune current feel constants merely because v1 now exists;
- rewrite or delete Donor v0/A″ compatibility semantics;
- patch `box3d.js` and substitute full native clipping for the qualified v1 policy;
- refactor A‴ into `ControllerOwnedCharacter` merely to eliminate deliberate experimental duplication;
- remove historical research specimens from tests/evidence just because they disappeared from the normal HUD;
- add slide/recoil memory, cap impulses or reopen causal reciprocity without a reproduced problem;
- declare A‴ or controller-owned representation the final architecture winner.

The next distinct stage should start from a **new real friction, capability or integration question**, not from the assumption that locomotion must keep changing.
