# Project state — Embodied Player Laboratory

Grounded: **2026-09-02, after E4 locomotion↔finite-posture compatibility qualification**

This document is the canonical current-state/orientation layer for the repository. It does not replace stage evidence.

Before any future write, **re-fetch live `main` and its exact SHA**. Recorded SHAs are provenance, not permission to assume the repository has not moved.

## 1. Project identity

This repository is an **Embodied Player Laboratory**.

Central question:

> How can a player possess a physically meaningful body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working mental model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Method:

> **Controlled enough to explain, open enough to play.**

Implementation and probes may be disposable. Accepted observations, reproduced failures, causal distinctions and explicitly qualified behavior are durable.

This is not a project to polish one capsule forever. It is a long-lived laboratory for physical player presence, control authority, contact consequence, support, traversal and later embodied capabilities when a real question earns them.

## 2. Relation to broader work

The laboratory remains intentionally independent from Jozz Vehicle, JES, Anvil and other projects.

Transfer boundary:

- observations may transfer as knowledge;
- qualified behavior may transfer through an explicit donor contract;
- code transfer requires deliberate consumer integration with provenance and validation;
- this repository does not dictate another project's architecture;
- another project does not become this repository's source of truth merely because it consumes a donor.

Do not turn this repository into a generic engine, mini-JES, universal gameplay framework or shared-utils dump.

## 3. Authority hierarchy

### Owner judgement — experiential truth

Owner hands-on/free play is authoritative for claims such as whether behavior feels artificial, sticky, satisfying, physically legible or worth continuing. A green machine suite cannot prove feel.

### Live repository + exact SHA + CI — implementation truth

For implementation claims prefer:

1. live `main` exact SHA;
2. exact code/diff at that SHA;
3. canonical smoke/build result for that SHA;
4. deployed Pages result when browser/device evidence matters.

Never infer live authority from an old branch name.

### Stage docs — research/provenance truth

Stage documents record what a stage actually tested. Their local words such as “current”, “next” or “candidate” are stage-local unless this current-state layer promotes them.

Do not rewrite rejected or historical outcomes merely to make history sound cleaner.

## 4. Accepted current player behavior

### CURRENT — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

Current donor entry points:

- `createCurrentDonorCharacter(...)`;
- `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`.

A‴ became current-best after machine qualification of the real production path and Owner free play identified and removed a real stale-blocked-velocity feel problem.

Current horizontal static/kinematic constraint interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Dynamic-body consequence remains on the separately qualified causal-reciprocity/contact-memory path.

### PREVIOUS — Donor v0 / A″

A″ remains frozen previous compatibility/reference behavior.

`createDonorCharacter(...)` deliberately still means **v0/A″**. Do not silently retarget it.

### Current Donor v1 numeric contract

v1 intentionally retains the accepted v0 numeric feel profile:

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

Qualified execution envelope:

- fixed outer physics step `1/60 s`;
- canonical `4` Box3D substeps;
- `box3d.js@0.1.1`;
- Three.js `0.183.0` in browser presentation;
- Vite `7.0.0`.

Lifecycle:

1. `character.preStep(dt, intent)`;
2. `b3World_Step(world, dt, substeps)`;
3. `character.postStep(dt)`.

Keyboard and touch feed the same device-independent move/jump/sprint intent.

### Representation fact relevant after E4

A‴ is a **controller-owned mover**, not rigid-body propulsion of an articulated player:

- intent is integrated into controller-owned horizontal velocity;
- mover/plane solving advances controller-owned position;
- `virtualMass` participates in reciprocal contact consequence but does not make locomotion itself a finite-mass rigid-body motor.

This representation fact is central to the next research boundary. E4 tested the inertial demands of the accepted A‴ profile, not a completed physical integration of A‴ with E3.

## 5. E3 rotational embodiment — experimental evidence

E3 asked:

> Can maintaining posture become a physically negotiated capability rather than a guaranteed controller property?

E3 remains **experimental**. It is not a donor revision and does not replace A‴.

### E3.1 — Owner-positive support-mediated balance

At the standard finite `320 Nm` specimen, representative machine evidence included:

- direct forward `64 N·s` — RECOVER;
- direct forward `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

Owner hands-on feedback on the E3.1c playground:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is positive experiential evidence that physical struggle for posture is perceptually legible and worth research. It does **not** promote E3 to current player behavior.

Post-Owner falsification separated at least three channels:

1. **support-mediated grounded balance**;
2. **internal airborne attitude control** through a reaction mass;
3. **support relocation** under some geometry/authority conditions.

Strong E3.1 result:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested E3.1 envelope.**

### E3.1 support/contact semantics

E3.1i–k established that manifold presence, geometric touching and solver load are distinct evidence signals.

A diagnostic survivor for the current specimen is:

```text
reactiveSupport = touchingPointExists || loadedPointExists
```

It preserved the tested grounded balance/ram envelope and removed the reproduced speculative-only takeoff actuation. It remains **diagnostic research only**, not promoted runtime policy.

Detailed E3.1 ledgers:

- `docs/E3_ROTATIONAL_EMBODIMENT.md`
- `docs/E3_1_VALIDATION_LOOP.md`
- `docs/E3_1_SUPPORT_TRANSITIONS.md`

## 6. E3.2 — bounded internal angular momentum

E3.2 asked whether articulation could earn complexity through a separated physical capability rather than anatomy-by-default.

At canonical `1/60 × 4 substeps`, a matched three-body specimen showed a real local causal difference:

- matched passive `±80 N·s` — FALL/FALL;
- matched active `±80 N·s` — RECOVER/RECOVER;
- zero-g total angular momentum remained conserved to small measured drift;
- available angular stroke materially affected the canonical result.

But stronger interpretations failed falsification:

- smaller direct-survivor ranges were one-sided;
- ecological ram benefit was one-sided at canonical resolution;
- native revolute motor did not improve robustness;
- simple ankle-first/hip-later sequencing did not produce a robust interval;
- absolute actuator impulse was corrected as effort, not energy/capacity consumption.

### E3.2n decisive robustness result

Changing only substeps `[1,2,4,8]` produced non-monotonic recover/fall outcomes.

Direct `±80 N·s`:

| Substeps | Passive `-/+` | Active `-/+` |
| ---: | --- | --- |
| `1` | R/F | R/R |
| `2` | F/F | F/F |
| `4` | F/F | R/R |
| `8` | F/F | F/F |

Final verdict:

> **The bounded-internal-momentum specimen demonstrates a real local mechanism at canonical resolution, but its recoverability benefit is not substrate-robust in the tested representation.**

E3.2 earned **knowledge, not promotion**.

Detailed ledger:

- `docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`

Do not rescue this representation with another torque/stroke/gain/substep sweep.

## 7. E4 — locomotion ↔ finite-posture compatibility

E4 is a **closed research stage / evidence only**.

It asked an earlier question than full integration:

> **Can the translational agency envelope already accepted in A‴ coexist with finite physical posture, or does naive combination make the two capabilities mechanically incompatible?**

E4 used a kinematic support carriage under the E3 sagittal organism. The carriage reproduces inertial demand associated with the accepted acceleration/deceleration profile while keeping the support path simple enough to interpret.

This is an **inertial compatibility proxy**, not embodied locomotion implementation.

### E4.0–E4.3 — incompatibility and posture mechanism

Key results:

- full `0→5.2 m/s` world-upright acceleration recovers at `4 m/s²` but falls from `8 m/s²` upward in the declared sweep, including current `31 m/s²`;
- current `31 m/s²` is not intrinsically fatal: short episodes producing `0.5–1.0 m/s` Δv recover;
- acceleration-aligned effective-up posture changes `8 m/s²` from F/F to R/R without increasing `320 Nm` authority or reducing translational demand;
- equivalent effective-up lean cannot be statically held on stationary support, even for the ~`21.8°` a8 target.

Correction:

> **The useful posture state is dynamic cooperation with imminent/ongoing inertial demand, not a static pose to pre-set.**

### E4.4 — anticipatory physical preparation

Without pose teleportation or stronger torque, a short physical preparation interval before acceleration changed recoverability.

At canonical resolution:

- `16 m/s²` had one symmetric survivor at lead4;
- current `31 m/s²` had one symmetric survivor at lead8;
- current-31 lead8 started acceleration around `±9°` torso lean with angular velocity, then completed the full `0→5.2 m/s` profile with ~`14–15°` peak tilt and no support loss.

The timing was treated as a research survivor, not gameplay tuning.

### E4.5 — launch substrate robustness

With only substeps varied `[1,2,4,8]`:

- current `31 m/s²` lead0 remained F/F at all tested resolutions;
- lead8 was F/F at sub1 and **R/R at sub2/4/8**.

Thus matched current-acceleration F→R benefit survived substeps:

`[2,4,8]`.

Corrected support-relative foot drift for recovered current-31 lead8 trials was roughly `0.13–0.18 m`, with zero support-loss frames.

### E4.6–E4.7 — current braking and robustness

Braking was isolated by safely reaching `±5.2 m/s` at `4 m/s²`, cruising until neutral/recovered, then applying current Donor-v1 ground deceleration `36 m/s²`.

Canonical world-upright / lead0 braking: F/F.

At canonical resolution, fixed lead8 preparation: **R/R** with ~`13–14°` peak tilt and no support loss.

E4.7 then varied only substeps `[1,2,4,8]`:

| Substeps | lead0 `-/+` | lead8 `-/+` |
| ---: | --- | --- |
| `1` | F/F | F/F |
| `2` | F/F | **R/R** |
| `4` | F/F | **R/R** |
| `8` | F/F | **R/R** |

Recovered lead8 support-relative foot drift remained about `0.14–0.22 m`, with zero support-loss frames.

Strong E4 result:

> **In the declared carriage proxy, the same fixed anticipatory physical-preparation pattern gives a matched symmetric F→R benefit for both current `31 m/s²` launch and current `36 m/s²` braking at substeps 2, 4 and 8, while failing at 1.**

This is materially more robust than the E3.2 local canonical survivor, but it is **not solver-independent** and does not select `8` frames as a gameplay constant.

### E4 central conceptual result

E4 supports a potentially important embodied-control principle:

> **Player intent can reveal an imminent physical demand before that demand is fully realized. A controller may spend finite posture authority to physically prepare the body, rather than granting free upright or simply weakening the intended translation.**

This remains a research principle, not runtime policy.

Detailed ledger:

- `docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`

## 8. Repository/runtime consequence

E3.2 and E4 are **knowledge only**.

No E4 behavior is promoted into:

- `src/character.js`;
- `src/constraint-velocity-character.js`;
- `src/e3-balance-organism.js`;
- browser E3 behavior;
- A‴ / Donor v1;
- any new donor revision.

The public default remains A‴. The public E3 browser still represents the earlier E3.1 experimental always-active actuator.

E4 scripts are deterministic research probes. They do not implement actual player locomotion.

## 9. Architecture map

### Accepted locomotion mechanics

- `src/character.js` — historical/shared controller-owned mover foundation and intent integration;
- `src/constraint-velocity-character.js` — current A‴ production behavior;
- `src/constraint-velocity.js` — recovered plane-push state + relative intent-cap policy;
- `src/solver-owned-character.js` — frozen B experiment;
- `src/donor/contact-memory.js` — velocity-only dynamic-contact consequence;
- `src/donor/*` — stable donor API/profiles/revision metadata.

### E3 experimental mechanics / probes

- `src/e3-balance-organism.js` — sagittal first organism;
- `src/e3-balance-organism-3d.js` — 3D pitch/roll organism;
- `scripts/e3-1*` — E3.1 balance/support qualification;
- `scripts/e3-2*` — E3.2 bounded-internal-momentum falsification chain;
- `src/e3-balance-browser.js` — isolated Owner instrument for the earlier E3.1 specimen.

### E4 compatibility probes

- `scripts/e4-0*` — naive acceleration compatibility;
- `scripts/e4-1*` — acceleration duration / Δv decomposition;
- `scripts/e4-2*` — effective-up posture A/B;
- `scripts/e4-3*` — static-prelean feasibility falsifier;
- `scripts/e4-4*` — anticipatory lead bracket;
- `scripts/e4-5*` — launch substrate robustness;
- `scripts/e4-6*` — current braking compatibility;
- `scripts/e4-7*` — braking substrate robustness.

### Browser/runtime

- `src/bootstrap.js` — routes explicit E3 query mode away from normal runtime;
- `src/main.js` — accepted/historical locomotion runtime;
- `src/playground.js` — normal yard;
- `src/player-input.js` — keyboard/touch intent;
- `src/follow-camera.js` — normal camera;
- `src/character-visual.js` — presentation without physics authority;
- `src/world-renderer.js` — direct Box3D→Three body rendering.

## 10. Verification model

`npm run smoke` remains split into:

- `smoke:research` — historical research chain + A‴ qualification + active E3/E4 research gates;
- `smoke:donor` — contract, frozen v0 equivalence, v1 equivalence/policy and mobile input.

Every push runs full smoke + production build. Pages publishes only from `main`.

Do not add CI ceremony without a concrete information/risk benefit.

## 11. Durable evidence lineage

This compact lineage is retained because old specimens remain useful falsifiers even when no longer current behavior.

### Foundation / A

Established useful controller-owned agency, gravity/support, dynamic push, moving support and workable capsule traversal.

### B

A real solver-owned finite-mass translational root demonstrated solver participation but performed poorly at ordinary traversal in that minimal specimen. This rejected the specimen, not every solver-owned/hybrid future.

### A′

Causal-component reciprocity removed artificial cross-axis momentum while preserving useful physical responses.

### A″

Dynamic contact reaction became current `Δv`, not a persistent future external-velocity target, removing delayed wrong-direction residual slide. This remains frozen Donor v0 compatibility/reference behavior.

### E2.3 binding finding

`box3d.js@0.1.1` loses solved `b3CollisionPlane.push` mutation across separate JS wrapper calls. Reconstructing native-intended clipping was not behavior-neutral and broke valid traversal, so the binding was not patched for purity.

### A‴

Intent-capped surface-relative constraint velocity survived the scenario matrix, entered the real production path, passed Owner free play and became current Donor v1.

### E3.1

Physically negotiated grounded posture became Owner-positive experimental evidence. Later falsification separated support-mediated balance from accidental unsupported attitude control and qualified a first support/contact-signal model.

### E3.2

Bounded internal angular momentum demonstrated a real local mechanism but failed solver-resolution robustness. Retained as knowledge, not capability promotion.

### E4

The accepted A‴ acceleration/deceleration envelope was shown to conflict with naive finite world-upright posture in an inertial carriage proxy. Dynamic anticipatory posture preparation rescued both current launch and braking at substeps 2/4/8 without stronger torque or weaker translation. E4 is retained as compatibility/strategy evidence, not locomotion integration.

## 12. Durable invariants

Do not change these without a new reason and matching evidence:

- Donor v0 semantics remain immutable;
- Donor v1 numeric profile remains accepted until reproduced play evidence justifies tuning;
- normal public default remains A‴;
- dynamic consequence vs static/kinematic constraint ownership remain separate causal concerns;
- moving-support inheritance remains qualified valid behavior;
- historical modes remain evidence tools, not normal UX;
- machine PASS and Owner acceptance remain distinct evidence classes;
- A‴ is current-best, not a final architecture declaration;
- E3 fall classification must not cause the fall;
- equal-and-opposite internal actuation must not borrow hidden world reaction;
- finite torque must not be conflated with finite total angular-momentum capacity;
- unsupported attitude control must be treated separately from support-mediated balance;
- support availability must not be reduced to `manifold exists`, `separation <= 0` or instantaneous `normalImpulse > ε` without matching evidence;
- support relocation must not be renamed “stepping” before a real stepping capability is designed;
- a local effect at one solver resolution must not be promoted as robust capability without substrate-sensitivity evidence;
- E4's moving-platform carriage must not be mistaken for actual A‴/rigid-body integration;
- `8` anticipation frames is a research survivor, not accepted gameplay timing;
- solver substeps are an evidence axis, not a tuning knob for obtaining preferred outcomes;
- strong accepted player agency should not be weakened merely to make a physical-body prototype easier unless evidence and Owner judgement justify that trade.

## 13. Known debts / open boundaries

These are stored uncertainties, not automatic tasks.

### A‴

- horizontal-normal activation threshold `0.35` is qualified only by the current matrix;
- arbitrary rotating kinematic side constraints remain unpromoted;
- dense/curved multi-plane networks are not exhaustive;
- recovered plane-push logic duplicates native solver behavior and is coupled to current binding semantics;
- grounded no-input recovery remains a strong momentum sink but is not an Owner-reported current defect;
- accepted translational motion is controller-owned mover authority, not yet a physically embodied propulsion model.

### E3

- E3.1 support-gating and `reactiveSupport` remain test-harness policies, not runtime behavior;
- out-of-band support invalidation can still make cached support stale for one controller tick;
- `1e-5` load epsilon is not accepted gameplay tuning;
- current E3.1 spherical ankle has no realistic range limit;
- whether any airborne reorientation is desirable gameplay remains OPEN;
- side/diagonal differences are observed but not reduced to a simple predictor;
- yaw/facing balance remains unstudied;
- support relocation/stepping is not designed;
- no active ragdoll/humanoid architecture has been justified;
- E3.2 current internal-momentum representation is not substrate-robust and should not be rescued by another parameter sweep.

### E4 / physical locomotion bridge

- the carriage proxy does not tell us where translational authority should physically enter the body;
- a direct world-external force, support-mediated propulsion, hybrid authority and deliberate support relocation are competing hypotheses, not selected mechanisms;
- sustained physical locomotion may require support relocation/stepping, but sliding must not be mislabeled as stepping;
- continuous intent, reversals, terrain, moving supports and dynamic interactions remain untested in a true embodied locomotion representation;
- anticipation needs a state/intent-derived policy before it can become gameplay behavior; fixed lead8 is not that policy;
- no Owner feel evidence exists for an integrated locomotion+posture representation.

### Mobile

Initial Android touch free play proved feasibility/usability of accepted locomotion. Sustained performance, thermals, ergonomics and broader device coverage remain unqualified.

### Networking/downstream

The pure intent boundary is useful, but this repository does not own a generic reconciliation/prediction/serialization framework. A real consumer must earn it.

## 14. Current natural boundary / next-work rule

E4 is **closed as a carriage-proxy research stage**. It earned a compatibility result and a promising physical-preparation principle, not runtime promotion.

Do **not** continue with another moving-platform sequence merely for completeness. A forward→cruise→brake→reverse carriage script would exercise the same proxy more continuously but would not answer the newly exposed representation question.

The next high-information question is:

> **How should accepted player translational authority be coupled into a physically embodied organism while preserving both strong agency and meaningful physical consequence?**

This is the next **problem**, not a preselected implementation.

Candidate mechanism families include, without commitment:

- finite world-external translational force/impulse as a deliberate assist model;
- support-mediated / traction-limited propulsion;
- hybrid authority sharing;
- deliberate support relocation / stepping;
- another representation that preserves the accepted A‴ response envelope while exposing physical consequences more honestly.

The next stage should first separate these authority models with the smallest causal crucible possible. Do not build legs, humanoid gait or a new Donor revision before the authority-placement question earns them.

## 15. Execution loop

Default:

> **real friction / capability need → determine what is actually unknown → smallest useful research/experiment → smallest justified change → validation proportional to causal blast radius → faithful browser/device evidence → Owner judgement → stabilization or next question**

This is not a rigid ceremony.

### Before work

- re-fetch live `main` and exact SHA;
- inspect only relevant current docs/code;
- distinguish fact / interpretation / plan / unknown;
- check whether prior evidence already answers the question;
- treat old proposals as candidates, not commitments.

### Research

- prefer falsifiers separating competing explanations;
- preserve controls and positive historical cases;
- avoid coupled tuning before causal localization;
- distinguish harness failure from implementation failure;
- retain confounds/failures honestly;
- test substrate/solver sensitivity early near recover/fall bifurcations;
- keep probes disposable until production relevance is earned.

### Implementation

- branch from exact re-fetched base;
- keep blast radius no larger than the question;
- avoid refactor inside an experiment unless correctness requires it;
- preserve donor compatibility;
- add the smallest gate proving the semantic distinction;
- merge with expected head/base SHAs.

### Validation

- numerical/causal → deterministic falsifier/regression;
- API/contract → contract/equivalence;
- browser/presentation → production build + faithful runtime/render;
- feel → Owner hands-on;
- device → real device;
- dependency/binding → requalify affected envelope.

Never make a stronger claim than the evidence class supports.

### Natural boundary

Record:

- proven;
- rejected/corrected;
- exact SHA/run when useful;
- remaining unknown;
- explicit non-claims;
- natural next trigger.

Then stop instead of opening a distinct stage by inertia.
