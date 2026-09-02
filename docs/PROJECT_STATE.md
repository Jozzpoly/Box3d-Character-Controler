# Project state — Embodied Player Laboratory

Grounded: **2026-09-02**, updated after machine qualification of E3.0–E3.1b and preparation of the E3.1c Owner playground.

Current accepted locomotion behavior baseline:

`f4877a46618a347c3be32edf7ddb39ab66a091bd`

The later grounding commit `5891fbf0b2a2a0f2cf5c41578d95b1aa72ac68ad` changed documentation only. E3 is an experimental research line layered beside the accepted locomotion behavior; it is **not** a new donor revision or current controller.

This document is the **canonical current-state/orientation layer** for the repository. It does not replace stage evidence. Detailed stage documents remain authoritative for what a particular experiment actually tested and observed.

Before any future write, re-fetch `main`; branch names, old conversations and recorded SHAs are not substitutes for the live repository head.

## 1. Project identity

This repository is an **Embodied Player Laboratory**.

Central question:

> How can a player possess a physically meaningful body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working mental model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Methodological requirement:

> **Controlled enough to explain, open enough to play.**

The implementation may be disposable. Accepted observations, reproduced failures, causal distinctions, rejected hypotheses and qualified behavior are not.

This is not a project to perfect one capsule forever. It is a long-lived laboratory for physical player presence, ownership of motion/state, contact consequence, support, balance, traversal and later embodied capabilities when evidence earns them.

## 2. Place in the broader work

The laboratory is intentionally **independent** from Jozz Vehicle, JES and other projects.

Useful outputs may later transfer to next-generation Jozz Vehicle, JES, Anvil or another real consumer, but transfer rules remain strict:

- observations and causal results may transfer as knowledge;
- qualified behavior may transfer through an explicit donor contract;
- code transfers only through deliberate consumer integration with provenance and validation;
- this repository does not automatically dictate another project’s architecture;
- another project does not become this repository’s source of truth merely because it consumes a donor.

Do not turn this repository into a generic engine, mini-JES, universal gameplay framework or shared-code dumping ground.

## 3. Authority hierarchy

Different evidence answers different questions.

### Owner judgement — experiential truth

Owner hands-on judgement is authoritative for claims such as:

- whether behavior feels artificial, sticky, satisfying or physically meaningful;
- whether an interaction invites useful or emergent play;
- whether a machine-qualified capability deserves further investment;
- whether a supposedly small defect materially harms the experience;
- whether a candidate should become current-best.

A green smoke suite cannot prove feel.

### Repository + exact SHA + CI — implementation truth

For implementation claims prefer:

1. current `main` exact SHA;
2. exact code/files at that SHA;
3. canonical smoke/build result for that SHA;
4. deployed Pages result when browser/device evidence matters.

Never infer active work merely from an old branch name.

### Stage docs — research/provenance truth

Stage documents record what a particular phase actually tested. Their words such as “current”, “candidate” or “next” are stage-local unless the canonical current-state layer later promotes them.

Do not rewrite old experiment conclusions just to make historical prose sound current.

### Historical branches — archaeology, not live authority

`foundation/*`, `experiment/*`, `research/*`, `mobile/*` and stabilization branches preserve useful provenance. They are not live authority merely because they still exist.

## 4. Current accepted behavior

### CURRENT — Donor v1 / A‴

The normal public runtime remains **A‴**, exposed through:

- `createCurrentDonorCharacter(...)`;
- explicit `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`.

A‴ is current-best because it passed both machine qualification and Owner free play.

The key repaired pathology was **stale blocked locomotion authority**: velocity could remain stored while geometry prevented movement, then re-enter motion after input changed or the constraint disappeared.

Current constraint rule:

```text
v_rel_in = (velocity - surfaceVelocity) · horizontalNormal
d_rel_in = (desiredVelocity - surfaceVelocity) · horizontalNormal
allowed_rel_in = min(0, d_rel_in)

if v_rel_in < allowed_rel_in:
    retire only the excess normal component
```

Interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

The rule applies only to active horizontal static/kinematic constraints. Dynamic-body consequence remains on the separately qualified causal-reciprocity path.

### PREVIOUS — Donor v0 / A″

A″ remains frozen compatibility/reference behavior.

The historical factory `createDonorCharacter(...)` deliberately continues to mean v0/A″. Existing symbols are never silently retargeted to current behavior.

### HISTORY

A, B, A′ and the research A″ composition remain useful falsification/evidence specimens. Their code and tests are retained deliberately.

## 5. Active experimental research — E3 rotational embodiment & balance

E3 is the current **research line**, not the current player behavior.

Question:

> **Can maintaining posture become a finite, physically negotiated capability of the player's body rather than a guaranteed property of the controller?**

This is intentionally broader than cosmetic lean or a binary ragdoll switch.

The working hypothesis is that player control should provide a **finite physical authority budget**. The body may recover while that capability is sufficient; sufficiently strong world consequence can exhaust it and produce a natural fall.

### E3 invariants

- A‴ / Donor v1 stays untouched as the accepted translational control arm.
- Fall classification may observe failure but must never cause it.
- No `if tilt > threshold => ragdoll` mechanism is allowed.
- The first actuator is internal: equal-and-opposite angular impulse is applied to torso and dynamic support; no hidden world reaction is borrowed.
- E3 specimens remain experimental until Owner judgement and later evidence earn promotion.
- `320 Nm` is a clean research specimen, not a final gameplay constant or biomechanical claim.
- Locomotion, stepping, yaw, grabbing and articulated limbs are separate later questions.

### E3.0 — angular substrate

The exact `box3d.js@0.1.1` JS binding was qualified for the first rotational experiments:

- central point impulse produced no material angular response;
- off-center response changed sign with mirrored lever arm;
- doubling lever arm approximately doubled angular response;
- direct angular impulse reached the body;
- a spherical joint held its shared point while allowing rotation.

This qualifies only the APIs exercised by the current E3 crucibles, not every future articulated-body API.

### E3.1a — sagittal finite-authority organism

First organism:

- dynamic support plate / finite base of support;
- dynamic main body;
- spherical ankle connection;
- bounded internal pitch actuator;
- total mass 80 kg;
- project gravity 20 m/s².

A first implementation failure revealed a `0.055 m` mismatch between the two intended ankle anchors. The resulting joint pre-stress looked like spontaneous balance instability. The geometry was corrected and the failure retained as a durable warning.

With clean geometry, the `320 Nm` specimen demonstrated:

- passive control falls across the tested perturbation sweep;
- finite authority recovers through `64 N·s`;
- first demonstrated natural fall at `80 N·s`;
- near-boundary recovery saturates the torque budget;
- recovered support translation remains about `0.017 m` or less.

Changing only maximum torque moves the frontier:

- `80 Nm` → recover 12 / fall 24 N·s;
- `160 Nm` → recover 24 / fall 36 N·s;
- `240 Nm` → recover 48 / fall 64 N·s;
- `320 Nm` → recover 64 / fall 80 N·s.

At stronger authority (`480 Nm`), extreme perturbations can be recovered partly by moving the support more than a metre. That is no longer the same ankle-dominant mechanism; it begins recruiting **support relocation** as a distinct capability.

This is a central durable finding:

> **Recoverability changes with finite physical authority, and increasing authority far enough can recruit a qualitatively different recovery channel rather than merely strengthening the same one.**

### E3.1b — 3D pitch/roll + real contact

The same hypothesis was extended into 3D pitch/roll while yaw stayed outside scope.

At `320 Nm` direct perturbations produced bounded frontiers in every tested direction:

- forward: recover through `64 N·s`, fall from `80 N·s`;
- side: recover through `80 N·s`, fall from `96 N·s`;
- diagonal: recover through `80 N·s`, fall from `96 N·s`;
- mirrored perturbations passed symmetry controls;
- recovered support travel remained below about `0.083 m`.

The side result is intentionally **not** explained away. A narrower static support dimension did not simply imply a weaker impulse frontier. Static `mass × gravity × support radius` is only a useful normalization; geometry, inertia, controller authority and dynamic contact jointly determine recoverability.

A real 35 kg dynamic-body ram then established the same qualitative boundary through ordinary Box3D contact:

- `1.0–3.0 m/s` impacts recover;
- `4.0–10.0 m/s` impacts naturally fall;
- recovered ram trials move the support by at most about `0.038 m`.

### E3.1c — Owner gate

A faithful browser balance playground now exists behind:

- `?mode=balance`
- `?mode=e3`

It is explicitly labeled experimental / not donor.

It exposes:

- direct solver rendering of foot, torso and 35 kg ram;
- world-up orbit camera;
- `0 / 160 / 320 / 480 Nm` authority choices;
- several ram speeds and directions;
- reset;
- live tilt, angular speed, torque utilization and support travel.

It intentionally contains **no locomotion**. The next evidence class is Owner hands-on judgement: does the struggle to retain/recover posture actually feel like a valuable form of embodiment?

Until that judgement exists, E3 must not be treated as a promoted player architecture.

## 6. Current Donor v1 mechanical contract

Current Donor v1 intentionally keeps the same accepted numeric feel profile as v0:

- radius `0.36`;
- half segment `0.54`;
- virtual interaction mass `80 kg`;
- max speed `5.2 m/s`;
- sprint multiplier `1.32`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- air acceleration `7.5 m/s²`;
- air deceleration `1.2 m/s²`;
- external ground drag `2.0`;
- external air drag `0.22`;
- gravity `20 m/s²`;
- fall gravity multiplier `1.22`;
- jump-release gravity multiplier `1.75`;
- jump speed `7.2 m/s`;
- coyote time `0.11 s`;
- jump buffer `0.12 s`;
- support normal minimum Y `0.58`.

Qualified current-donor execution envelope:

- fixed physics step `1/60 s`;
- 4 Box3D substeps;
- `box3d.js@0.1.1`;
- Three.js `0.183.0`;
- Vite `7.0.0`.

Donor lifecycle:

1. `character.preStep(dt, intent)`;
2. `b3World_Step(world, dt, substeps)`;
3. `character.postStep(dt)`.

The intent contract remains device-independent.

## 7. Architecture map

### Accepted/current mechanics

- `src/character.js` — historical/shared controller-owned mover foundation;
- `src/constraint-velocity-character.js` — current A‴ production behavior;
- `src/constraint-velocity.js` — recovered plane state + intent-capped relative constraint policy;
- `src/donor/contact-memory.js` — velocity-only dynamic-contact consequence adapter;
- `src/donor/*` — stable donor API, profiles, intent and revision metadata.

### Historical representation research

- `src/solver-owned-character.js` — E2 B finite-mass translational-root experiment.

### Active E3 research

- `src/e3-balance-organism.js` — sagittal finite-authority balance specimen;
- `src/e3-balance-organism-3d.js` — 3D pitch/roll specimen;
- `scripts/e3-angular-substrate.mjs` — exact JS angular substrate gate;
- `scripts/e3-1a-sagittal-balance.mjs` — recoverability + authority dependence;
- `scripts/e3-1b-balance-3d.mjs` — 3D directional frontier;
- `scripts/e3-1b-dynamic-ram.mjs` — real rigid-body contact falsifier;
- `src/e3-balance-browser.js` — isolated Owner balance instrument.

### Browser/runtime

- `src/bootstrap.js` — routes only explicit E3 query modes away from the normal runtime;
- `src/main.js` — accepted/historical locomotion runtime composition;
- `src/playground.js` — normal embodied-player yard;
- `src/player-input.js` — keyboard/touch intent;
- `src/follow-camera.js` — normal player camera;
- `src/character-visual.js` — presentation only, no physics authority;
- `src/world-renderer.js` — direct Box3D→Three rigid-body rendering.

E3 browser rendering deliberately bypasses `character-visual.js`; the visible experimental body orientation comes directly from Box3D transforms.

### Verification

`npm run smoke` remains split into:

- `smoke:research` — historical research gates, A‴ qualification and active E3 machine gates;
- `smoke:donor` — donor contract, v0 equivalence, v1 equivalence/policy exercise and mobile input.

Every push runs full smoke + production build. Pages publishes only from `main`.

## 8. Durable evidence lineage

### Foundation / A

Controller-owned mover established useful player agency, gravity/support, dynamic push, moving support and fair-enough capsule traversal.

### B

A real solver-owned finite-mass translational root demonstrated natural solver participation but the minimal implementation performed poorly at ordinary traversal. This rejected that specimen as a replacement, not all solver-owned/hybrid futures.

### A′

Causal-component reciprocity removed artificial cross-axis momentum manufactured by rounded contact normals while preserving useful push/landing/traversal behavior.

### A″

Dynamic-contact reaction was recognized as current `Δv`, not a persistent future velocity target. Removing that contact-memory write eliminated delayed wrong-direction residual slide while preserving immediate physical reaction.

### E2.3 binding finding

`box3d.js@0.1.1` loses solved `b3CollisionPlane.push` mutations across separate JS wrapper calls. Full native clipping was not behavior-neutral and broke valid stair traversal.

### A‴

Intent-capped surface-relative constraint velocity survived the falsifier matrix, moved into an isolated production path, then passed Owner free play and became current Donor v1.

### E3

Finite internal angular authority has now demonstrated a repeatable machine-measured recoverability frontier in sagittal, 3D and real-contact conditions. Its gameplay value is still **OPEN pending Owner judgement**.

## 9. Durable invariants

Do not change these without new reason + matching evidence:

- Donor v0 meaning remains immutable;
- Donor v1 numeric feel constants remain current until reproduced play evidence justifies tuning;
- dynamic consequence and static/kinematic constraint ownership remain separate causal concerns;
- moving-support inheritance is a qualified behavior, not accidental external velocity;
- public default remains current-best A‴, not the active research specimen;
- historical modes stay available for evidence/regression but out of normal UX;
- machine PASS and Owner acceptance remain distinct evidence classes;
- current A‴ is current-best, not a final architecture winner;
- E3 fall observation must not cause the fall;
- E3 authority remains physically finite and reaction-conserving within the tested organism;
- articulation, stepping and locomotion integration must earn complexity through a separated question.

## 10. Known debts / open boundaries

These are stored uncertainties, **not automatic tasks**.

### A‴ constraint envelope

- horizontal-normal activation threshold `0.35` is qualified only by the existing matrix;
- arbitrary rotating kinematic side constraints remain unpromoted;
- arbitrary dense/curved multi-plane networks are not exhaustively proven;
- plane-push reconstruction duplicates native solver logic and depends on current binding behavior.

### Representation

- A‴ deliberately duplicates a limited movement solve path;
- controller-owned state still uses virtual mass, manual reciprocity and explicit support transport;
- E2 B did not settle controller-owned vs solver-owned vs hybrid architecture;
- E3 likewise does not settle that architecture question yet.

### E3-specific unknowns

- Owner has not yet judged whether physical balance/recovery is enjoyable or worth integrating;
- `Kp/Kd` and `320 Nm` are research parameters, not current feel constants;
- side/diagonal frontier differences are observed but not reduced to one simple predictor;
- yaw balance/facing is not studied;
- support relocation/stepping is observed as a possible separate channel but not yet designed as a player capability;
- no internal angular-momentum / hip-like degree of freedom has yet been tested;
- no locomotion + balance integration has been attempted;
- no active ragdoll or humanoid articulation has been justified.

### Locomotion

Grounded no-input recovery remains a strong horizontal momentum sink, but it is not currently an Owner-reported defect and must not trigger tuning by itself.

### Mobile

Initial Android touch free play proved feasibility/usability. Sustained performance, thermal cost, ergonomics and broader device coverage remain unqualified.

### Downstream/networking

The pure intent boundary is useful, but this laboratory owns no generic reconciliation/prediction/serialization framework. A real consumer must earn one.

## 11. Execution loop

Default loop:

> **real friction / capability need → determine what is actually unknown → smallest useful research/experiment → smallest justified change → validation proportional to causal blast radius → faithful browser/device evidence → Owner judgement → stabilization or next question**

This is not a rigid ceremony.

### Before work

- re-fetch live `main` and exact SHA;
- inspect relevant current docs/code;
- distinguish demonstrated fact, interpretation, plan and unknown;
- ask whether prior evidence already answers the question;
- treat old proposals as candidates, not commitments.

### During research

- prefer falsifiers that separate competing explanations;
- preserve controls and previously positive cases;
- avoid coupled tuning before causal localization;
- distinguish harness failure from implementation failure;
- keep probes disposable until production relevance is earned.

### During implementation

- branch from exact re-fetched base;
- keep blast radius no larger than the question requires;
- avoid refactor inside an experiment unless correctness requires it;
- preserve donor compatibility;
- add the smallest gate proving the intended semantic distinction;
- merge only with expected head/base SHAs.

### During validation

- numerical/causal → deterministic falsifier/regression;
- API/contract → contract/equivalence;
- browser/presentation → production build + faithful runtime/render evidence;
- feel → Owner hands-on evidence;
- device → real-device evidence;
- dependency/binding → requalify affected envelope.

Never make a stronger claim than the evidence class supports.

### At a natural boundary

Record:

- proven;
- rejected;
- exact SHA/run when useful;
- remaining unknowns;
- explicit non-claims;
- natural next trigger.

Then stop rather than opening a distinct stage by inertia.

## 12. Current trigger logic

After E2.3e, active locomotion defect hunting is closed.

A new stage is justified only by:

1. reproduced play friction;
2. a real new embodied capability question;
3. real downstream integration pressure;
4. substrate/runtime change invalidating a qualified envelope.

E3 is justified by **#2**: a deliberately chosen new embodied capability question about physical posture/balance.

The next E3 stage is **not** automatically E3.2. The immediate gate is E3.1c Owner judgement.

If Owner judgement is positive, the strongest next falsifier is likely:

> Can one additional internal angular-momentum degree of freedom recover states that the ankle-dominant organism cannot?

Only if that earns its complexity should support relocation/stepping become a deliberate capability, followed later by locomotion integration.

## 13. Public/current surfaces

Current public runtime:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Normal URL = **current Donor v1 / A‴**.

Active experimental surface:

- `?mode=balance` or `?mode=e3` — E3.1c balance playground; experimental, not donor/current.

Historical research surfaces:

- `?mode=controller` — Foundation A;
- `?mode=solver` — B;
- `?mode=causal` — A′;
- `?mode=momentum` — historical A″ composition;
- `?mode=donor` or `?mode=previous` — frozen Donor v0/A″;
- `?mode=constraint` — compatibility alias resolving to current behavior;
- `?mode=causal&capture=1` — historical A′ capture instrument.

## 14. Takeover reading order

Fresh takeover / long-gap regrounding:

1. `docs/PROJECT_STATE.md` — canonical current state and authority boundaries;
2. `README.md` — compact public/current map;
3. `docs/E3_ROTATIONAL_EMBODIMENT.md` — active research line and current Owner gate;
4. `docs/E2_3E_STABILIZATION.md` — why A‴ became current;
5. `docs/DONOR_CONTRACT.md` — exact current/previous donor semantics;
6. only then the earlier stage doc required by a specific question.

`docs/RESEARCH.md` remains an early historical ledger, not live planning authority.

## 15. Present natural boundary

Current accepted locomotion remains healthy:

- A‴ / Donor v1 is machine-qualified and Owner-accepted;
- current/previous donor semantics are explicit;
- default public runtime is current-best;
- old experiment choices remain available as evidence;
- normal locomotion regression gates remain green.

Current E3 research has reached a different boundary:

- E3.0 angular substrate: machine-qualified;
- E3.1a sagittal finite-authority recoverability: machine-qualified;
- authority-dependence and support-relocation distinction: demonstrated;
- E3.1b 3D pitch/roll frontier: machine-qualified;
- real dynamic-body ram path: machine-qualified;
- E3.1c browser instrument: production-build qualified;
- **Owner experiential judgement: still OPEN**.

Therefore the next high-value action is not more autonomous mechanics expansion. It is to put the E3.1c instrument in the Owner’s hands and determine whether this physical struggle for posture is genuinely valuable.

Until that judgement exists, do **not** automatically start active ragdoll, stepping, locomotion reintegration or a new donor revision.
