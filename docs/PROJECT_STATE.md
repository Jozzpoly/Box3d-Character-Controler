# Project state — Embodied Player Laboratory

Grounded: **2026-09-02, after E3.1 support-transition qualification**

This document is the canonical current-state/orientation layer for the repository. It does not replace stage evidence.

Before any future write, **re-fetch live `main` and its exact SHA**. The recorded SHAs below are provenance, not permission to assume the repository has not moved.

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

The implementation/probes may be disposable. Accepted observations, reproduced failures, causal distinctions and explicitly qualified behavior are durable.

This is not a project to polish one capsule forever. It is a long-lived laboratory for physical player presence, control authority, contact consequence, support, traversal and later embodied capabilities when a real question earns them.

## 2. Relation to broader work

The laboratory remains intentionally independent from Jozz Vehicle, JES, Anvil and other projects.

Transfer boundary:

- observations may transfer as knowledge;
- qualified behavior may transfer through an explicit donor contract;
- code transfer requires deliberate consumer integration with provenance and validation;
- this repository does not dictate another project’s architecture;
- another project does not become this repository’s source of truth merely because it consumes a donor.

Do not turn this repository into a generic engine, mini-JES, universal gameplay framework or shared-utils dump.

## 3. Authority hierarchy

Different evidence classes answer different questions.

### Owner judgement — experiential truth

Owner hands-on/free play is authoritative for claims such as:

- whether behavior feels artificial, sticky, satisfying or physically legible;
- whether an interaction invites meaningful/emergent play;
- whether a defect actually matters;
- whether a machine-qualified specimen is worth continuing or accepting as current-best.

A green machine suite cannot prove feel.

### Live repository + exact SHA + CI — implementation truth

For implementation claims prefer:

1. live `main` exact SHA;
2. exact code/diff at that SHA;
3. canonical smoke/build result for that SHA;
4. deployed Pages result when browser/device evidence matters.

Never infer live authority from an old branch name.

### Stage docs — research/provenance truth

Stage documents record what a stage actually tested. Their local words such as “current”, “next” or “candidate” are stage-local unless a later current-state layer promotes them.

Do not rewrite rejected/historical outcomes merely to make history sound cleaner.

### Historical branches — archaeology/evidence

Historical `foundation/*`, `research/*`, `experiment/*`, `mobile/*` branches are evidence stores, not automatic active work.

## 4. Accepted current player behavior

### CURRENT — Donor v1 / A‴

The normal public runtime remains **A‴**.

Current donor entry points:

- `createCurrentDonorCharacter(...)`;
- `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`.

A‴ became current-best after:

- machine qualification of the real production path;
- Owner free play identifying and removing a real previously hard-to-name feel problem.

That defect was stale blocked locomotion authority: velocity could remain stored while geometry prevented movement, then re-enter motion after input or constraint state changed.

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

### HISTORY

A, B, A′ and historical A″ research compositions remain useful falsification specimens, not normal public choices.

## 5. Current Donor v1 mechanical contract

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

## 6. Active research line — E3 rotational embodiment / balance

E3 is justified by a **new embodied capability question**, not by reopening locomotion tuning.

Research question:

> Can maintaining posture become a physically negotiated capability rather than a guaranteed controller property?

E3 remains **experimental**. It is not a donor revision and does not replace A‴.

### E3 organism

Current first organism uses:

- dynamic support/foot;
- dynamic torso;
- spherical ankle;
- world-up pitch/roll control;
- yaw kept outside the problem;
- equal-and-opposite torso↔foot angular impulses;
- research `Kp = 1600`, `Kd = 210`;
- common clean specimen `maxTorque = 320 Nm`;
- total nominal organism mass `80 kg`.

These numbers are research parameters, not accepted player feel constants or biomechanical claims.

## 7. Current E3 causal model

The post-Owner E3.1 validation loop materially corrected the earlier simplified model.

There are now at least **three distinct physical capability channels**, plus a separately qualified support-signal boundary.

### A. Support-mediated grounded balance

This is the clean current E3.1 capability specimen.

With a standard support and 320 Nm:

- direct forward `64 N·s` — RECOVER;
- direct forward `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

The same grounded boundaries remain when torque is available only through the qualified support-gated diagnostic path.

Support availability is **not equivalent to one simple contact boolean**. The transition work established that:

- manifold presence can persist speculatively after useful reaction has ended;
- geometric `separation <= 0` is too narrow to describe every physically reactive contact;
- Box3D can create a solver-loaded predictive landing contact while separation is still about `+5 mm`;
- per-step `normalImpulse > ε` cannot by itself define persistent settled support.

The current diagnostic survivor is:

```text
reactiveSupport = touchingPointExists || loadedPointExists
```

This is evidence about the current specimen, **not a promoted runtime/player support policy**.

### B. Internal airborne attitude control

The original E3 actuator was always active.

Without ground and gravity, it can reorient the torso by driving equal-and-opposite angular motion into the foot.

This is momentum-conserving internal attitude control, not a hidden world torque.

However, the current spherical ankle does not impose a finite angular range or finite angular-momentum storage capacity. In clean zero-g tests the foot accumulated tens to hundreds of radians of angular travel and reached roughly `47 rad/s` while the torso was driven near upright.

Therefore:

> **Finite max torque does not mean the complete capability is finite.**

Current E3 has finite instantaneous torque but an effectively unbounded unsupported reaction-mass sink.

### C. Support relocation

Under some footprint/authority/perturbation conditions the support translates materially rather than simply staying in an ankle-dominant recovery/fall regime.

Examples:

- at 480 Nm, a strong recovered trial translated support about `1.24 m`;
- a narrowed support plate in later validation entered large `0.4..2.2 m` translation states rather than a simple lower fall threshold.

This is evidence that support relocation is a distinct physical mechanism.

It is **not** yet a designed stepping capability.

## 8. E3 evidence status

### E3.0 — angular substrate

Qualified exact JS binding behavior:

- central impulse does not create material angular response;
- off-center impulses create signed lever-arm-dependent angular velocity;
- mirrored lever arms mirror response;
- spherical anchor holds while allowing angular motion.

### E3.1a — sagittal recoverability

At clean 320 Nm:

- passive falls throughout tested perturbation sweep;
- finite recovers through `64 N·s`;
- first demonstrated fall at `80 N·s`;
- recovered support travel remains small (~`0.017 m`).

Authority sweep moved the frontier:

- 80 Nm → 12 recover / 24 fall N·s;
- 160 → 24 / 36;
- 240 → 48 / 64;
- 320 → 64 / 80.

### E3.1b — 3D + real ram

At 320 Nm:

- forward `64 R / 80 F`;
- side `80 R / 96 F`;
- diagonal `80 R / 96 F`;
- mirrored controls PASS.

35 kg ram:

- `1..3 m/s` recover;
- `4..10 m/s` fall.

### E3.1c — Owner experiential evidence

Owner hands-on judgement:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is a positive experiential gate for **continuing E3 research**.

It means the physical struggle for posture is perceptually legible.

It does **not** make the current specimen production-ready/current/donor behavior.

The accompanying new recording was not machine-analyzed because the analysis runtime did not expose it at its grounded uploaded-file path. Do not later claim video-derived evidence from that recording unless it is actually recovered.

### E3.1d–f — falsification of the simple balance story

These probes established:

- footprint changes can recruit support relocation;
- unsupported always-active world-up control can right the torso using the foot as reaction mass;
- an early mass-distribution probe was confounded by torso inertia and is retained only as sensitivity evidence;
- a clean zero-g experiment fixed torso mass/geometry and proved identical initial torso perturbation while the finite controller transferred large angular motion into the foot.

### E3.1g — support-contact binding

The exact `box3d.js@0.1.1` body-contact facade was qualified for the current research need.

Durable semantic correction:

- persistent near-vertical manifold points can identify broad support/contact presence;
- per-step `normalImpulse > ε` is **not** a valid persistent-contact boolean in a settled contact;
- impulse remains transient load evidence.

### E3.1h — support-gated causal A/B

Three policies were compared in the harness:

- always-active 320 Nm;
- support-gated 320 Nm;
- passive 0 Nm.

Unsupported zero-g:

- gated matched passive within deterministic asserted tolerance;
- always-active recruited the large internal reaction-mass channel.

Grounded direct:

- always and gated both produced `48 R / 64 R / 80 F / 96 F`;
- observed peak tilts/support travel matched in this matrix;
- the foot retained near-vertical support contact throughout these trials, including observed falls.

Real ram:

- both always and gated: `3 m/s R / 4 m/s F` with matching measured response at the tested boundary.

Strongest causal result from this phase:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested E3.1 envelope.**

### E3.1i — explicit support-transition observation latency

A synthetic out-of-band support invalidation/reacquisition crucible isolated the cost of one-step cached observation.

Support loss invalidated between solves:

- stale authority reached `5.333 N·m·s`;
- measured torso `Δω` reached up to `55%` of pre-step `|ω|` in the tested matrix.

Synthetic support reacquisition:

- one-preStep missed authority also reached `5.333 N·m·s`;
- measured `Δω/pre` in the tested matrix was about `0.6..5.3%`.

The event-oracle path is a causal control/upper bound, **not a proposed runtime implementation**.

### E3.1j — physics-driven takeoff and landing relevance

Normal physical transitions differ from the synthetic out-of-band case.

Takeoff:

- no full extra post-manifold-loss authority tick was reproduced;
- once the manifold disappeared during the solve, the next full controller tick applied `0 Nm`;
- one `64 N·s + 3 m/s` case retained a speculative manifold that was neither touching nor loaded for two actuated frames, totaling `1.161 N·m·s`.

Landing:

- Box3D created the first loaded predictive manifold at about `+5 mm` separation;
- geometric touching was therefore not required for a solver-reactive landing contact.

Durable correction:

> **manifold presence, geometric touching/separation and solver load are distinct evidence signals.**

### E3.1k — support-signal policy falsifier

Evidence-derived diagnostic candidate:

```text
reactiveSupport = touchingPointExists || loadedPointExists
```

It survived the tested matrix:

- quiet support remained continuous;
- direct `64 RECOVER / 80 FALL` was preserved with matching peak tilts;
- 35 kg ram `3 m/s RECOVER / 4 m/s FALL` was preserved with matching peaks;
- the reproduced speculative-only takeoff actuation changed from `2 frames / 1.161 N·m·s` to `0`;
- removing that authority changed takeoff peak tilt from `3.58°` to `4.40°`, demonstrating a real dynamic consequence rather than a telemetry-only distinction.

This remains a **diagnostic survivor only**. No runtime support policy, load epsilon, jump behavior or airborne-control policy is promoted by E3.1k.

Detailed ledgers:

- `docs/E3_1_VALIDATION_LOOP.md`
- `docs/E3_1_SUPPORT_TRANSITIONS.md`

## 9. Current architecture map

### Accepted locomotion mechanics

- `src/character.js` — historical/shared controller-owned mover foundation;
- `src/constraint-velocity-character.js` — current A‴ production behavior;
- `src/constraint-velocity.js` — recovered plane-push state + relative intent-cap policy;
- `src/solver-owned-character.js` — frozen B experiment;
- `src/donor/contact-memory.js` — velocity-only dynamic-contact consequence;
- `src/donor/*` — stable donor API/profiles/revision metadata.

### E3 experimental mechanics

- `src/e3-balance-organism.js` — sagittal first organism;
- `src/e3-balance-organism-3d.js` — 3D pitch/roll organism;
- `scripts/e3-angular-substrate.mjs` — angular binding qualification;
- `scripts/e3-1a-sagittal-balance.mjs` — recoverability/authority dependence;
- `scripts/e3-1b-balance-3d.mjs` — directional 3D frontier;
- `scripts/e3-1b-dynamic-ram.mjs` — real contact falsifier;
- `scripts/e3-1d-support-dependence.mjs` — footprint + unsupported diagnostic;
- `scripts/e3-1e-reaction-mass.mjs` — confounded mass-distribution sensitivity probe;
- `scripts/e3-1f-airborne-attitude.mjs` — controlled internal attitude decomposition;
- `scripts/e3-1g-support-contact-binding.mjs` — exact support-sensing qualification;
- `scripts/e3-1h-support-gated-ab.mjs` — support-gated causal A/B;
- `scripts/e3-1i-support-transition-semantics.mjs` — synthetic support-loss/reacquisition latency isolation;
- `scripts/e3-1j-physics-transition-relevance.mjs` — physical takeoff/landing manifold-touch-load timeline;
- `scripts/e3-1k-support-signal-policy.mjs` — manifold vs reactive-support falsifier;
- `src/e3-balance-browser.js` — isolated Owner instrument.

### Browser/runtime

- `src/bootstrap.js` — routes explicit E3 query mode away from normal runtime;
- `src/main.js` — accepted/historical locomotion runtime;
- `src/playground.js` — normal yard;
- `src/player-input.js` — keyboard/touch intent;
- `src/follow-camera.js` — normal camera;
- `src/character-visual.js` — presentation without physics authority;
- `src/world-renderer.js` — direct Box3D→Three body rendering.

E3 browser orientation comes directly from Box3D transforms, not procedural character lean.

The public E3 browser still uses the original always-active experimental actuator. E3.1h/k support policies remain machine-research variants only.

## 10. Verification model

`npm run smoke` remains split into:

- `smoke:research` — historical research chain + A‴ qualification + active E3 gates;
- `smoke:donor` — contract, frozen v0 equivalence, v1 equivalence/policy and mobile input.

Every push runs full smoke + production build. Pages publishes only from `main`.

Do not add CI ceremony without a concrete information/risk benefit.

## 11. Durable evidence lineage

### Foundation / A

Established useful agency, gravity/support, dynamic push, moving support and workable capsule traversal.

### B

A real solver-owned finite-mass translational root demonstrated solver participation but performed poorly at ordinary traversal in that minimal specimen. This rejected the specimen, not all solver-owned/hybrid futures.

### A′

Causal-component reciprocity removed artificial cross-axis momentum while preserving useful physical responses.

### A″

Dynamic contact reaction became current `Δv`, not a persistent future external-velocity target, removing delayed wrong-direction residual slide.

### E2.3 binding finding

`box3d.js@0.1.1` loses solved `b3CollisionPlane.push` mutation across separate JS wrapper calls. Full native-intended clipping was not behavior-neutral and broke valid traversal.

### A‴

Intent-capped surface-relative constraint velocity survived the matrix, entered the real production path, passed Owner free play and became current Donor v1.

### E3

E3 now has machine and Owner evidence that physically negotiated grounded posture is worth continued research, a causal separation of grounded balance from accidental unsupported attitude control, and a qualified first model of support-transition/contact-signal semantics for the current specimen.

It is still experimental.

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
- **finite torque must not be conflated with finite angular-momentum capacity**;
- unsupported attitude control must be treated separately from support-mediated balance;
- support availability must not be reduced to `manifold exists`, `separation <= 0` or instantaneous `normalImpulse > ε` without matching evidence;
- support relocation must not be renamed “stepping” before a real stepping capability is designed;
- articulation and locomotion integration must earn complexity through a separated question.

## 13. Known debts / open boundaries

These are stored uncertainties, not automatic tasks.

### A‴

- horizontal-normal activation threshold `0.35` is qualified only by the current matrix;
- arbitrary rotating kinematic side constraints remain unpromoted;
- dense/curved multi-plane networks are not exhaustive;
- recovered plane-push logic duplicates native solver behavior and is coupled to current binding semantics;
- grounded no-input recovery remains a strong momentum sink but is not an Owner-reported current defect.

### E3

- support-gating and `reactiveSupport` are currently **test-harness causal/diagnostic policies**, not promoted runtime behavior;
- normal physics-driven takeoff/landing lifecycle is qualified only for the current sparse specimen/matrix, not as a universal support model;
- out-of-band support invalidation can still make cached support genuinely stale for one controller tick; an explicit event/ownership semantic remains OPEN if real gameplay requires disappearing/teleported support;
- the `1e-5` load epsilon used by the diagnostic harness is not accepted gameplay tuning or a universal physical threshold;
- support need not ultimately be binary; the current reactive boolean is a falsification tool, not an ontology declaration;
- whether the measured one-preStep landing response difference is perceptually/gameplay relevant remains OPEN;
- current spherical ankle has no realistic range limit;
- unsupported angular-momentum capacity is not physically bounded;
- whether any airborne reorientation is desirable gameplay remains OPEN;
- if airborne authority is desirable, its finite resource/model remains OPEN;
- current `320 Nm`, Kp/Kd, geometry and mass distribution remain research parameters;
- side/diagonal differences are observed but not reduced to a simple predictor;
- yaw/facing balance remains unstudied;
- support relocation/stepping is not designed;
- no internal hip/flywheel/articulated degree of freedom has yet earned promotion;
- no balance + A‴ locomotion integration has been attempted;
- no active ragdoll/humanoid architecture has been justified.

### Mobile

Initial Android touch free play proved feasibility/usability of the accepted locomotion surface. Sustained performance, thermals, ergonomics and broader device coverage remain unqualified.

### Networking/downstream

The pure intent boundary is useful, but this repository does not own a generic reconciliation/prediction/serialization framework. A real consumer must earn it.

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

## 15. Trigger logic

Active locomotion defect hunting remains closed after A‴ stabilization.

A new stage is justified by at least one of:

1. reproduced play friction;
2. a real new embodied capability question;
3. real downstream integration pressure;
4. substrate/runtime change invalidating a qualified envelope.

E3 is justified by #2.

The immediate E3.1 support-transition question is now sufficiently answered for the current specimen to stop treating it as the automatic next task.

What is now known:

- normal physics-driven takeoff does not exhibit a whole extra post-manifold-loss support-authority tick;
- landing can become solver-reactive before geometric touching through predictive contact;
- manifold-only gating can leak authority through a no-touch/no-load speculative manifold;
- `touching OR solver-loaded` removed the reproduced leak while preserving the tested grounded balance/ram boundaries;
- out-of-band support invalidation is a distinct event-semantics problem and can create a genuinely stale cached tick.

Therefore the next high-value E3 stage is **open for fresh selection by information gain/project need**, not predetermined by the old plan.

Current strong candidates include:

- bounded internal angular-momentum / hip-strategy research — does one explicit finite internal DOF enlarge recoverability under the same support and ankle authority?;
- explicit support relocation / stepping — only if we want to study recovery by moving the base of support;
- a small balance+locomotion integration crucible — only if a concrete integration question now has higher value than another isolated capability experiment.

Do not start one merely because it appears next in numbering. Re-evaluate the evidence and Owner priorities first.

## 16. Public/current surfaces

Normal public runtime:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Normal URL = **current Donor v1 / A‴**.

Experimental E3 surface:

- `?mode=balance`
- `?mode=e3`

The public E3.1c browser currently still represents the original always-active experimental actuator. The support-gated/reactive decomposition remains machine research only at this boundary.

Historical surfaces:

- `?mode=controller` — Foundation A;
- `?mode=solver` — B;
- `?mode=causal` — A′;
- `?mode=momentum` — historical A″ composition;
- `?mode=donor` or `?mode=previous` — frozen Donor v0/A″;
- `?mode=constraint` — compatibility alias resolving to current A‴;
- `?mode=causal&capture=1` — historical A′ capture instrument.

## 17. Takeover reading order

Fresh takeover / long-gap regrounding:

1. `docs/PROJECT_STATE.md` — canonical current state and boundaries;
2. `README.md` — compact public/current map;
3. `docs/E3_ROTATIONAL_EMBODIMENT.md` — active E3 line;
4. `docs/E3_1_VALIDATION_LOOP.md` — post-Owner causal decomposition;
5. `docs/E3_1_SUPPORT_TRANSITIONS.md` — latest E3 support-transition qualification and falsifiers;
6. `docs/E2_3E_STABILIZATION.md` — why A‴ became current;
7. `docs/DONOR_CONTRACT.md` — exact current/previous donor semantics;
8. only then earlier stage docs required by a specific question.

`docs/RESEARCH.md` remains an early historical ledger, not live planning authority.

## 18. Present natural boundary

Accepted locomotion remains stable:

- A‴ / Donor v1 is machine-qualified and Owner-accepted;
- donor semantics remain explicit;
- normal public default remains current-best;
- normal locomotion regression gates remain green.

E3 has now moved through its first Owner gate and the first support-transition falsification sequence:

- angular substrate: qualified;
- sagittal recoverability + authority dependence: demonstrated;
- 3D + real dynamic ram: demonstrated;
- Owner hands-on: positive for the perceptible “primitive mannequin fighting for balance” quality;
- unsupported reaction-mass artifact/channel: reproduced and causally isolated;
- exact body-contact sensing path: qualified;
- support-gated A/B: removes unsupported righting while preserving tested grounded `64 R / 80 F` and ram `3 R / 4 F` boundaries;
- support-loss/reacquisition observation latency: causally isolated in a synthetic boundary case;
- normal takeoff/landing manifold-touch-load timelines: qualified for the current specimen;
- speculative-only takeoff leak: reproduced;
- `touching OR solver-loaded` diagnostic policy: removes that reproduced leak while preserving the tested grounded envelope.

Therefore the current natural boundary is:

> **E3.1 has established a serious Owner-positive support-mediated balance phenomenon, separated it from accidental unlimited airborne attitude control, and qualified the immediate support-transition semantics far enough to stop. The next stage should be freshly selected by information gain rather than automatically integrating locomotion or adding articulation.**

Do not automatically promote `reactiveSupport`, start ragdoll, stepping, locomotion integration or a donor revision from these results alone.
