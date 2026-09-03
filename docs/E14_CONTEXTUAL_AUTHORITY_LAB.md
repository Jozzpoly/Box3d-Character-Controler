# E14 — Contextual Authority Laboratory

Status: **active research stage / Owner-lab qualification in progress / no runtime promotion**

Canonical base:

`bd05ac2aa8ad256e53a09a65b8d3bb6cb5454fd7`

## 1. Research intent

E14 asks a broader ecological question than the E14.0 one-pulse placement surface:

> **Can one coherent player-agency contract remain useful while real environmental relationships determine how physical consequence propagates through player, support and wider world?**

This stage deliberately separates:

1. **agency contract** — what support-relative motion the player requests;
2. **authority entitlement** — how much supplemental agency current physical evidence can honestly support;
3. **reaction routing** — where the reaction associated with supplemental authority is placed.

E12 `q` remains a qualified research signal for the declared current31/current36 family, not a universal support policy. World-external and reciprocal placement remain diagnostic endpoint policies, not production architecture selections.

## 2. Execution method

E14 is intentionally larger in horizon but bounded in each execution slice.

The current implementation slice is only:

- **E14.1 — reusable continuous-authority causal core**;
- **E14.1B — thin public Owner Lab**.

Do not automatically proceed into the broader ecological multi-environment lab after E14.1B. Stop for Owner hands-on judgement unless new evidence requires an earlier stop.

The run itself is adaptive:

> current unknown → smallest discriminating implementation/measurement → validation → correction if causal assumptions fail → next bounded slice.

A roadmap is not permission to preserve a design that new evidence falsifies.

## 3. Fixed inherited boundaries

Unless an explicit diagnostic override says otherwise:

- player interaction mass `80 kg`;
- accepted reference ground acceleration `31 m/s²`;
- accepted reference braking `36 m/s²`;
- accepted max speed `5.2 m/s`;
- gravity `20 m/s²`;
- canonical outer `dt=1/60 s`;
- canonical `4` Box3D substeps;
- finite balance authority reference `320 Nm`;
- normal player/support friction reference `μ=.95`;
- E5 load estimate `J_n~ = 0.5 × totalNormalImpulse`;
- E12 entitlement reference `q = clamp(μ × J_n~ / 25.3333, 0, 1)` within its qualified scope.

Do not silently weaken accepted `31/36` to make embodiment easier.

## 4. Causal core contract

The continuous experimental controller must preserve the E11/E12 physics-first ordering:

1. player input defines desired support-relative motion;
2. finite posture control prepares/attempts the demand;
3. Box3D contact physics solves first;
4. actual physical response and current support evidence are measured;
5. a bounded supplemental shortfall may be granted only under the declared entitlement policy;
6. the supplemental grant uses an explicit reaction-routing policy;
7. the next frame starts from the resulting real physical state.

No continuous implementation may regress to blindly injecting `q × 31` every frame without first measuring what physics already achieved.

## 5. Initial diagnostic policies

The first lab exposes three intentionally explicit policies:

- `NATURAL_ONLY` — no supplemental translation;
- `ENTITLED_EXTERNAL` — physics-first entitled shortfall is granted to the player without reciprocal support impulse;
- `ENTITLED_RECIPROCAL` — the same requested support-relative shortfall is granted with reduced-mass equal-and-opposite player/support impulse.

A future manual blend may be useful as a counterfactual oracle, but it is not required to qualify E14.1 and must not be presented as a production policy.

## 6. E14.1 machine qualification goals

Machine gates establish causal/accounting integrity only. They must not encode a preferred gameplay outcome.

Required before Owner Lab publication:

- NATURAL_ONLY produces zero supplemental impulse;
- zero/weak support cannot silently receive accepted-looking supplemental ground agency;
- external and reciprocal placements receive the same requested support-relative grant before the subsequent solve;
- reciprocal placement accounts equal-and-opposite player/support authority impulse;
- isolated free-support behavior remains consistent with the E12 Galilean boundary within declared numerical bands;
- continuous accelerate, release, brake and reversal do not introduce hidden authority outside the selected policy;
- reset reproduces the same declared initial state;
- browser and deterministic qualification use the same causal kernel rather than duplicated locomotion semantics;
- controller behavior must not branch on scenario names such as `cart`, `sled` or `ground`;
- default Donor/runtime remains unchanged.

## 7. E14.1B thin Owner Lab

The first Owner surface should arrive early, before investment in a broad environment catalogue.

Minimum intended interaction:

- continuous left/right player intent;
- free finite dynamic support with strong fixed visual world references;
- switch between NATURAL / EXTERNAL / RECIPROCAL;
- manual support mass;
- player/support friction;
- acceleration / braking demand;
- max balance torque;
- pause / reset and, if inexpensive, slow motion or single-step;
- direct perturbation of player and/or support if it remains causally clean;
- compact telemetry sufficient to distinguish player world motion, support world motion, relative motion, entitlement, posture and supplemental reaction.

Exploratory controls may leave the qualified envelope. The UI should label this rather than block it.

## 8. Early Owner stop

After exact-head machine validation and public deployment, stop for unscripted Owner play.

Do not require the Owner to answer a questionnaire before playing. First collect spontaneous behavior, recording and comments. Only then decompose feedback into:

- agency;
- physical consequence;
- causal readability;
- artificiality;
- fun / sandbox value;
- surprising or emergent affordances;
- observation-surface defects.

## 9. Deferred scope

Not part of E14.1/E14.1B unless evidence forces reconsideration:

- multiple ecological environment families;
- production contextual-routing formula;
- second foot, hands, bracing limbs or traversal;
- jump integration;
- full 2D locomotion;
- large telemetry dashboard;
- automated parameter optimization;
- promotion into Donor/default runtime.

## 10. Falsifiers / reasons to stop early

Stop or redesign rather than polish around the problem if:

- continuous placement fairness cannot be maintained without changing requested relative agency;
- the E12 entitlement becomes causally incoherent under continuous dynamic-support use;
- the current balance organism dominates the result so strongly that routing cannot be judged;
- browser and headless implementations require divergent mechanics;
- an apparently useful result depends on scenario-name special cases;
- solver-resolution sensitivity dominates the mechanism;
- Owner hands-on evidence says the surface is mechanically legible but not useful enough to justify deeper reaction-routing work.

A negative result is a valid stage outcome.
