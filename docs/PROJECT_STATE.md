# Project state — Embodied Player Laboratory

Grounded: **2026-09-02, after E3.2 bounded-internal-momentum falsification and robustness qualification**

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

Current horizontal static/kinematic constraint rule:

```text
v_rel_in = (velocity - surfaceVelocity) · horizontalNormal
d_rel_in = (desiredVelocity - surfaceVelocity) · horizontalNormal
allowed_rel_in = min(0, d_rel_in)

if v_rel_in < allowed_rel_in:
    retire only the excess normal component
```

Interpretation:

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

- fixed physics step `1/60 s`;
- `4` Box3D substeps;
- `box3d.js@0.1.1`;
- Three.js `0.183.0` in browser presentation;
- Vite `7.0.0`.

Lifecycle:

1. `character.preStep(dt, intent)`;
2. `b3World_Step(world, dt, substeps)`;
3. `character.postStep(dt)`.

Keyboard and touch feed the same device-independent move/jump/sprint intent.

## 5. Active research line — E3 rotational embodiment / balance

E3 is justified by a new embodied capability question, not by reopening locomotion tuning.

Research question:

> Can maintaining posture become a physically negotiated capability rather than a guaranteed controller property?

E3 remains **experimental**. It is not a donor revision and does not replace A‴.

The first E3 organism uses a dynamic support/foot, dynamic torso, spherical ankle, world-up pitch/roll control and equal-and-opposite internal angular impulses. Common research values such as `Kp = 1600`, `Kd = 210`, `320 Nm`, current geometry and mass distribution are **research parameters**, not player tuning or biomechanical claims.

## 6. E3.1 — grounded balance and causal decomposition

### Owner-positive grounded phenomenon

At the standard E3.1 specimen, machine evidence showed a finite recoverability frontier, including approximately:

- direct forward `64 N·s` — RECOVER;
- direct forward `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

Owner hands-on feedback on the E3.1c playground:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is positive experiential evidence that physical struggle for posture is perceptually legible and worth research. It does **not** promote E3 to current player behavior.

### Three separated capability channels

Post-Owner falsification separated at least three distinct channels:

1. **support-mediated grounded balance**;
2. **internal airborne attitude control** through a reaction mass;
3. **support relocation** under some geometry/authority conditions.

The original always-active E3 actuator has finite instantaneous torque but the spherical ankle does not bound angular range or total angular-momentum storage. In zero-g it can right the torso while the foot accumulates very large angular travel. This is momentum-conserving internal attitude control, not a hidden world torque, but it is a distinct and unrealistically unbounded capability.

Strong E3.1 causal result:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested E3.1 envelope.**

### Support-transition/contact semantics

E3.1i–k established that support availability is not one simple contact boolean:

- manifold presence can persist speculatively after useful reaction has ended;
- geometric `separation <= 0` is too narrow as complete support truth;
- Box3D can generate loaded predictive landing contact while separation is still about `+5 mm`;
- instantaneous `normalImpulse > ε` cannot define persistent settled support.

A diagnostic survivor for the current specimen is:

```text
reactiveSupport = touchingPointExists || loadedPointExists
```

It preserved the tested grounded balance/ram envelope and removed the reproduced speculative-only takeoff actuation. It remains **diagnostic research only**, not a promoted runtime support policy.

Detailed E3.1 ledgers:

- `docs/E3_ROTATIONAL_EMBODIMENT.md`
- `docs/E3_1_VALIDATION_LOOP.md`
- `docs/E3_1_SUPPORT_TRANSITIONS.md`

## 7. E3.2 — bounded internal angular momentum

E3.2 asked whether articulation could earn complexity through a separated physical capability rather than anatomy-by-default.

Question:

> Can one explicitly finite internal angular-momentum resource recover states that the same organism without active internal redistribution cannot recover?

### Matched representation

The principal E3.2 specimen kept the same outer support and external collision shape while splitting the nominal 70 kg torso mass into a 60 kg outer torso plus a 10 kg internal reaction mass at the same approximate CoM. Passive and active comparisons used the same three-body representation. The internal body did not contact the world.

The internal revolute DOF had finite angular stroke; the manual actuator used equal-and-opposite angular impulses with bounded instantaneous torque. No E3.2 mechanism was added to runtime or browser code.

### Canonical 4-substep local result

At the canonical `1/60 s × 4 substeps` research substrate, the manual specimen produced a genuine local causal difference:

- matched passive `±80 N·s` — FALL/FALL at the qualified 60° specimen;
- matched active `±80 N·s` — RECOVER/RECOVER;
- zero-g total angular momentum remained conserved to a small measured drift;
- increasing available internal stroke changed the canonical outcome while simply increasing torque at a smaller stroke did not.

This established a **local mechanism**: finite internal actuation can redistribute angular momentum and alter recoverability at the canonical substrate.

### Important failed interpretations

E3.2 deliberately challenged stronger stories:

- a 50°/55° direct survivor was one-sided; 60° was the first symmetric canonical survivor;
- ecological 35 kg ram benefit was one-sided at canonical resolution (`+4.0 m/s` recovered while the mirrored side fell);
- the first ram collision itself was nearly mirrored; material divergence emerged later through foot↔ground support/contact trajectory;
- high absolute actuator impulse was not actuator thrashing and must not be conflated with energy or consumed capacity;
- `b3Joint_GetConstraintTorque` did not provide a clean universal hard-limit signal;
- a solver-native revolute motor did not improve robustness and made the direct mirrored result worse;
- a predeclared ankle-first/hip-later dwell sweep did not produce a robust strategy interval.

### E3.2n — decisive solver-resolution falsifier

E3.2n changed **only** Box3D substeps `[1,2,4,8]` while holding outer `dt = 1/60`, controller cadence, masses, geometry, friction, gravity, perturbations, torque budgets, stroke, drive cutoff and classifiers fixed.

Canonical `4` reproduced all prior reference outcomes, validating the harness.

Direct `±80 N·s` outcomes:

| Substeps | Passive `-/+` | Active `-/+` |
| ---: | --- | --- |
| `1` | R/F | R/R |
| `2` | F/F | F/F |
| `4` | F/F | R/R |
| `8` | F/F | F/F |

The 35 kg ram neighborhood was also strongly resolution-sensitive. At 1 substep the whole tested `3.75..4.25 m/s` neighborhood recovered; at 2, 4 and 8 substeps both passive frontier and apparent active benefit changed materially. The pattern was **non-monotonic**, not a clean convergence trend.

Final E3.2 verdict:

> **The E3.2 manual bounded-internal-momentum specimen demonstrates a real local causal mechanism at the canonical `1/60 × 4-substep` substrate, but its recoverability benefit is not robust to solver resolution in the tested representation.**

Therefore the stronger claim that bounded articulation has proven a robust physical recovery capability is **rejected**.

No 16-substep tuning/convergence chase was justified because `[1,2,4,8]` did not show a monotonic trend.

### E3.2 durable evidence

Retain:

- finite internal DOF can redistribute angular momentum without material hidden world torque in the zero-g control;
- matched active redistribution can change recoverability locally at canonical 4-substep resolution;
- available stroke/capacity materially affects that local result;
- both direct and ecological recovery boundaries are highly solver-resolution-sensitive in this representation;
- contact/support trajectory near the fall/recover frontier is a major co-owner of outcomes;
- native revolute motor and simple sequencing delay did not resolve robustness.

Reject/correct:

- do not call `60°` a player parameter or optimum;
- do not call `160 Nm` tuned hip authority;
- do not infer robust ecological benefit from the one-sided canonical ram recovery;
- do not infer robust articulated capability from canonical direct R/R;
- do not treat absolute actuator impulse as energy/capacity consumption;
- do not tune substeps to obtain a preferred outcome.

Detailed ledger:

- `docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`

## 8. Repository/runtime consequence

E3.2 is **knowledge only**.

No E3.2 behavior is promoted into:

- `src/e3-balance-organism.js`;
- browser E3 playground behavior;
- A‴;
- Donor v1;
- any new donor revision.

The public E3 browser still uses the earlier E3.1 experimental always-active actuator. E3.1 support-gated/reactive policies remain machine-research variants only.

The historical `scripts/e3-2d-mirror-and-dynamic-ram.mjs` intentionally retains its canonical 4 m/s mirrored failure. E3.2n demonstrated that this exact outcome is not a robust cross-resolution gate, so E3.2d remains archaeology/falsification evidence rather than required canonical smoke.

`e3-2n-solver-resolution-sensitivity.mjs` is the final active E3.2 robustness gate in the research smoke chain.

## 9. Architecture map

### Accepted locomotion mechanics

- `src/character.js` — historical/shared controller-owned mover foundation;
- `src/constraint-velocity-character.js` — current A‴ production behavior;
- `src/constraint-velocity.js` — recovered plane-push state + relative intent-cap policy;
- `src/solver-owned-character.js` — frozen B experiment;
- `src/donor/contact-memory.js` — velocity-only dynamic-contact consequence;
- `src/donor/*` — stable donor API/profiles/revision metadata.

### E3 experimental mechanics / probes

- `src/e3-balance-organism.js` — sagittal first organism;
- `src/e3-balance-organism-3d.js` — 3D pitch/roll organism;
- `scripts/e3-1*` — E3.1 balance/support causal qualification;
- `scripts/e3-2*` — E3.2 bounded-internal-momentum falsification chain;
- `src/e3-balance-browser.js` — isolated Owner instrument for the earlier E3.1 specimen.

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

- `smoke:research` — historical research chain + A‴ qualification + active E3 gates;
- `smoke:donor` — contract, frozen v0 equivalence, v1 equivalence/policy and mobile input.

Every push runs full smoke + production build. Pages publishes only from `main`.

Do not add CI ceremony without a concrete information/risk benefit.

## 11. Durable invariants

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
- articulation and locomotion integration must earn complexity through a separated question;
- a local causal effect at one solver resolution must not be promoted as robust capability without substrate-sensitivity evidence.

## 12. Known debts / open boundaries

These are stored uncertainties, not automatic tasks.

### A‴

- horizontal-normal activation threshold `0.35` is qualified only by the current matrix;
- arbitrary rotating kinematic side constraints remain unpromoted;
- dense/curved multi-plane networks are not exhaustive;
- recovered plane-push logic duplicates native solver behavior and is coupled to current binding semantics;
- grounded no-input recovery remains a strong momentum sink but is not an Owner-reported current defect.

### E3

- E3.1 support-gating and `reactiveSupport` remain test-harness policies, not runtime behavior;
- out-of-band support invalidation can still make cached support stale for one controller tick;
- the `1e-5` load epsilon is not accepted gameplay tuning;
- support need not ultimately be binary;
- current E3.1 spherical ankle has no realistic range limit;
- whether any airborne reorientation is desirable gameplay remains OPEN;
- side/diagonal differences are observed but not reduced to a simple predictor;
- yaw/facing balance remains unstudied;
- support relocation/stepping is not designed;
- no balance + A‴ locomotion integration has been attempted;
- no active ragdoll/humanoid architecture has been justified;
- E3.2's current bounded-internal-momentum representation is not substrate-robust and should not be “fixed” by another parameter sweep;
- a future articulated representation must earn renewed work through a genuinely different causal question and should include solver/substrate robustness early rather than as a late cleanup.

### Mobile

Initial Android touch free play proved feasibility/usability of the accepted locomotion surface. Sustained performance, thermals, ergonomics and broader device coverage remain unqualified.

### Networking/downstream

The pure intent boundary is useful, but this repository does not own a generic reconciliation/prediction/serialization framework. A real consumer must earn it.

## 13. Current natural boundary / next-work rule

E3.2 is **closed as a research stage**. It earned knowledge, not promotion.

Do **not** automatically continue with E3.3, another hip controller, another torque/stroke/gain/substep sweep, humanoid articulation or balance+locomotion integration.

The next large research question is deliberately open again. Select it from the broader Embodied Player Laboratory mission by current information gain, Owner/project need and expected gameplay relevance.

Serious families of future questions may include, without commitment:

- a genuinely different articulated representation with robustness designed into the experiment;
- designed support relocation / stepping as its own capability;
- a small balance+locomotion integration crucible if a concrete gameplay question earns it;
- another embodied interaction problem with higher current value.

The previous E3.2 proposal is no longer an inherited obligation merely because it once looked promising.

## 14. Execution loop

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
- test substrate/solver sensitivity early when the phenomenon is near a recover/fall bifurcation;
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
