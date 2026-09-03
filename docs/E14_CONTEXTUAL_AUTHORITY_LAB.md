# E14 — Contextual Authority Laboratory

Status: **E14.1C pinned-boundary Owner instrument implemented and pre-public qualified on bounded branch; no Donor/default promotion. Publication must be verified on exact merged `main` before Owner play.**

This document is the current E14 stage orientation. Earlier E14.0/E14.1B statements below remain provenance; they are not rewritten into a cleaner success story.

## 1. Research intent

E14 asks how accepted player agency can coexist with finite body/support/world consequence without collapsing into either blind controller injection or physical purity for its own sake.

Current working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

E12's graded entitlement remains a qualified research principle in its declared scope. It is not production policy and is not a universal definition of support quality.

The causal ordering remains:

1. player intent requests support-relative motion;
2. finite posture/body attempts the demand;
3. Box3D contact physics solves first;
4. actual physical contribution and support evidence are measured;
5. bounded supplemental shortfall may be granted by the declared policy;
6. reaction routing remains explicit;
7. the next frame begins from the resulting physical state.

Do not regress to blind `q × desired acceleration` injection.

## 2. Durable E13 boundary

E13 established that genuine wider-world coupling can make reaction placement physically observable, while also showing that late-created coupling is not neutral plumbing.

Durable rule:

> **Do not manufacture an external reaction path exactly when authority needs somewhere to react and then treat that connection as causally invisible.**

Quiet engagement can be neutral while engagement after physical preparation is a large physical event. State history and environmental topology matter.

This does not reject reciprocal mechanics. If the wider world carries reaction, that coupling must arise naturally from the physical/gameplay situation.

## 3. E14.0 Owner result

The one-pulse reaction surface made the placement distinction readable:

- world-external felt more like a wind-like acceleration;
- reciprocal produced real support push/recoil;
- light/free support should visibly recoil more than a heavy floor/support;
- `ground`, `crate`, `raft`, `heavy platform` should not become global controller mode names;
- physical difficulty produced by world construction can be desirable sandbox gameplay if the mechanism earns its cost.

This rejected a global reaction-routing toggle as a long-term architecture. It did **not** choose External or Reciprocal as production policy.

## 4. E14.1B continuous lab truth

E14.1B returned to the exact sagittal E4/E12 representation:

- experiment motion axis: world `Z`;
- qualified sagittal foot half-length: `0.34 m`;
- balance torque axis: world `X`;
- dynamic support translates only along `Z`;
- reference defaults: `31/36`, `5.2 m/s`, `320 Nm`, `μ=.95`, `800 kg`, `dt=1/60`, `4` substeps, `preparationFrames=0`.

The earlier browser-X adaptation was confounded by the asymmetric foot's smaller X support radius and must not be interpreted as a physical negative.

### Immediate no-lead evidence

At reference values:

- `NATURAL_ONLY` preserves genuine physical truth but strongly under-delivers accepted agency, reaching only roughly `1.1 m/s` relative speed during launch while target heads toward `5.2 m/s`;
- External and Reciprocal recover nearly the same local support-relative agency, around `4.82 m/s` in the launch phase;
- their local posture/contact behavior is very similar;
- finite-body specimens can still fall near the end of launch;
- the primary tension is therefore **immediate player agency ↔ finite embodied physical capacity**, not simply External vs Reciprocal.

### Lead8 correction

E4 `lead8` remains a useful foresight oracle, not a gameplay delay contract. Preparation-only testing showed that posture preparation itself creates real translation; freezing locomotion target during those frames can cause the later controller to oppose motion the body already produced.

Do not revive this as hidden input latency, a lead sweep, a torque sweep, or a target-accumulation hack presented as gameplay.

## 5. E14.1B Owner evidence

Owner performed approximately `142.6 s` of spontaneous mobile play. After an initial policy comparison, the session became broad tuning/exploration across support mass, friction, acceleration, braking and torque, including deliberately extreme but also reduced values.

Spontaneous Owner judgement:

> E14 starts to be fun in a strange, raw way, but is still very far from being a player.

The key behavioral signal was not merely slapstick: Owner stopped only testing the hypothesis and began exploring the system through play.

Competing explanations remain open:

- **H1 boundary / competence play** — interesting action near current physical capacity;
- **H2 experimentation / tuning play** — "what happens if I change this?";
- **H3 slapstick / novelty**;
- **H4 world / affordance play** — lab variables may proxy real world properties;
- **H5 strategy repertoire** — current organism largely has one strategy, ankle/posture + traction, so insufficiency often collapses into struggle → FALL.

No one of these has been promoted to a conclusion.

## 6. Historical instrumentation defect

The pre-E14.1C `scripts/e14-1d-continuous-diagnostics.mjs` phase summary read stale `signedLeanX` while the corrected sagittal sim/browser emitted `signedLean`.

Historical exact-head diagnostic artifact:

- workflow `33802322554`;
- artifact `9911568231`;
- head `b858bf48e300b8c9297cd22ac86357f658fedccc`.

Its E14.1d phase `leanDeg.min/max` values were `null`. This is an **observation/tooling defect, not a physics negative**. Velocity/load/q/authority evidence may remain useful in its own scope, but body-lean summaries are degraded.

E14.1C repairs the consumer and introduces a mandatory finite telemetry contract. Missing, stale, `NaN` and infinite required values now fail instrumentation qualification.

Corrected branch evidence from the first E14.1C implementation commit:

- commit `4b70cbf6e37566c357c84eed87a67ce9b2310d01`;
- workflow `33811359560`;
- artifact `9914925276`;
- schema `e14-1d-corrected-sagittal-telemetry-v2`;
- all scenario phase body/target lean extrema are finite.

This is **new corrected evidence**, not retroactive repair of artifact `9911568231`.

## 7. E14.1C — Pinned Boundary Skill Probe

Central question:

> **Does one unchanged configuration of the current E14 organism contain a rich and causally readable enough action-space that Owner can learn to predict, repeat and correct its behavior without further parameter tuning?**

E14.1C is an **instrumentation / Owner-surface stage**, not a physics redesign.

Explicitly not being decided here:

- best authority policy;
- Natural as production controller;
- removal of FALL;
- new `31/36` values;
- bigger balance torque;
- final player architecture.

Negative locked-play boredom does **not** automatically falsify H1. A valid third verdict is:

> **ACTION SPACE / INSTRUMENT INSUFFICIENT TO TEST H1**

Machine does not judge fun or skill.

## 8. Versioned specimen contract

PIN stores a **configuration contract**, never a Box2D runtime snapshot.

Version `E14C1 / substrate s1` contains editable specimen fields:

- support mass;
- friction;
- acceleration;
- braking;
- max balance torque;
- authority policy.

The versioned substrate binds fixed semantics including:

- `dt=1/60`;
- `substeps=4`;
- gravity `20`;
- player mass `80`;
- max speed `5.2`;
- preparation frames `0`;
- settle frames `90`;
- current sagittal representation/support geometry.

Canonical representation is deterministic and shareable through namespaced query parameter `e14spec` on the existing `?mode=e14lab` route. `e14lock=1` records locked presentation state. Stable specimen identity is derived from canonical serialization.

Example canonical reference specimen:

`e14c1|s1|m=800|f=0.95|a=31|b=36|t=320|p=entitled-reciprocal`

Reference ID under format v1:

`E14C1-befd707b`

Do not serialize bodies, contacts, solver caches or arbitrary runtime world state. `localStorage` is not the source of truth.

## 9. PIN / RESTORE / LOCK semantics

### PLAY rebuild

Discovery remains stateful. Slider rebuilds may preserve currently held input/pause semantics where useful for exploration.

### PIN

Captures normalized canonical configuration + policy and writes a reloadable/shareable representation into the URL.

### RESTORE PIN

Creates a **fresh simulation** from the pinned configuration and declared settle contract. It atomically clears held input, establishes neutral input `0`, clears browser stepping remainder and uses the declared running state. It does not restore arbitrary mid-simulation state.

### LOCK

Freezes specimen configuration and policy, then begins from a **clean PIN restore**. Discovery sliders/policy switching/pause/single-step/shoves are removed from the normal locked interaction surface. Locked play retains A/D, camera and clean reset/restore.

Unlocking returns to discovery without changing the pinned identity.

PLAY and COMPARE/RESTORE are intentionally different epistemic modes; stateful policy switching is not clean A/B evidence.

## 10. Observation surface correction

The former vertical gold reference posts visually resembled physical obstacles while being non-collidable. E14.1C removes this false affordance and replaces it with abstract floor/grid world-Z guide marks.

E14.1C does **not** add environment obstacles.

## 11. Generic pre-public qualification apparatus

The reusable machine apparatus can run a later exact Owner-selected pinned specimen without changing its parameters.

It checks:

- no-input short sanity;
- fresh reset determinism;
- repeated scripted determinism;
- finite/current telemetry;
- qualitative differentiation among short pulse, longer hold, pulse+release and pulse+reversal traces.

It deliberately has no arbitrary gameplay success threshold. Possible machine statements include numerical instability, telemetry failure or an action-space that appears narrow under the declared traces. It cannot emit `FUN PASS` or `SKILL PASS`.

The concrete Owner specimen is **not** selected or qualified pre-public.

## 12. Validation gates

E14.1C reports three separate evidence classes.

### Mechanics gate

Existing research and Donor smoke must remain green. E14.1C must not change Donor/default mechanics.

### Instrumentation gate

Mandatory validation covers:

- stale `signedLeanX` rejection;
- all required telemetry finite/current;
- canonical specimen normalize/serialize/parse roundtrip;
- invalid config rejection;
- deterministic ID;
- versioned substrate agreement with current E14 fixed semantics;
- clean restore/reset semantics;
- lock mutation prevention contract;
- URL/share/reload representation;
- generic qualifier execution;
- browser sagittal/temporal/UI contract.

The key instrumentation checks run from mandatory `e14-1c-browser-contract.mjs`; they do not depend only on an optional uploaded artifact.

### Publication gate

Requires exact merged-main build/CI/Pages verification and the experimental route to be public while default Donor remains unchanged.

A branch CI PASS is **not** publication PASS.

## 13. Pre-public evidence at first implementation commit

At branch commit `4b70cbf6e37566c357c84eed87a67ce9b2310d01`, workflow `33811359560` completed successfully:

- mechanics smoke: SUCCESS;
- instrumentation sub-contracts (invoked from mandatory E14 browser contract): SUCCESS;
- corrected E14 diagnostic capture: SUCCESS;
- diagnostic upload: SUCCESS;
- Vite build: SUCCESS;
- Pages configure/upload/deploy: skipped by branch design.

No physics kernel, balance organism, Donor/default runtime or bootstrap routing semantics were changed by that implementation commit.

## 14. Owner protocol after publication

Only after exact-main publication gate passes:

> **DISCOVERY → find something interesting → PIN → LOCK → play → record.**

During DISCOVERY Owner may tune mass, friction, acceleration/braking, torque and policy. Machine must not select the specimen for Owner.

During LOCK Owner simply plays. Do not give an ideal timing script, target success rate or machine-optimized solution.

Analyse recording and spontaneous feedback first. Only then ask follow-up questions.

Observe repeatability, causal sensitivity, flexibility, anticipation, correction, reversal/recovery attempts, intentional near-failure, self-imposed goals, support/recoil use and when/why boredom appears.

## 15. Post-PIN specimen-specific qualification

After Owner supplies the pinned representation, run that exact configuration through the generic qualifier **without tuning it**.

Check:

- no-input sanity;
- reset determinism;
- repeated trace determinism;
- finite telemetry;
- input differentiation;
- numerical sensitivity.

If it fails, report why. Do not machine-sweep it into PASS.

## 16. Outcome tree — future only

- **A — boundary skill supported:** several of repeatability, causal sensitivity, flexibility, anticipation/recovery and persistent locked play appear. Next candidate becomes a small one-property World Transfer.
- **B — locked play flat despite real action-space:** H1 weakens; H2 tuning/build-test play strengthens.
- **C — action-space/instrument insufficient:** do not falsify H1; next frontier becomes the smallest representation-safe Strategy Repertoire option.
- **D — numerical/solver chaos:** stop and decompose before gameplay design.
- **E — mostly slapstick/spectacle:** may remain secondary value but does not solve `PLAYER INTENT ↔ PHYSICAL CONSEQUENCE` by itself.

Do not implement any of those next stages inside E14.1C.

## 17. Hard stop

Natural E14.1C boundary:

> **Owner instrument public and mechanically/instrumentally qualified; no Owner specimen has yet been selected.**

At that boundary: **STOP FOR OWNER**.
