# Project state — Embodied Player Laboratory

Grounded: **2026-09-02, after E5 translational-authority placement/accounting qualification**

This document is the canonical current-state/orientation layer for the repository. It is intentionally shorter than the accumulated stage ledgers: detailed experiment history belongs in the stage documents linked below.

Before any future write, **re-fetch live `main` and its exact SHA**. Recorded SHAs are provenance, not permission to assume that the repository has not moved.

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

### Representation fact relevant to the current research boundary

A‴ is a **controller-owned mover**, not rigid-body propulsion of an articulated player:

- intent is integrated into controller-owned horizontal velocity;
- mover/plane solving advances controller-owned position;
- `virtualMass` participates in reciprocal dynamic-contact consequence but does not make locomotion itself a finite-mass rigid-body motor.

E4/E5 study the bridge from this accepted response envelope toward a physically embodied organism. They do not silently change A‴.

## 5. E3 rotational embodiment — experimental evidence

E3 asks:

> Can maintaining posture become a physically negotiated capability rather than a guaranteed controller property?

E3 remains **experimental**. It is not a donor revision and does not replace A‴.

### E3.1 — Owner-positive support-mediated balance

At the standard finite `320 Nm` specimen, representative evidence included:

- direct forward `64 N·s` — RECOVER;
- direct forward `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

Owner hands-on feedback:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

Post-Owner falsification separated at least:

1. **support-mediated grounded balance**;
2. **internal airborne attitude control** through a reaction mass;
3. **support relocation** under some geometry/authority conditions.

Strong retained result:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested E3.1 envelope.**

E3.1i–k further established that manifold presence, geometric touching and solver load are distinct evidence signals. A diagnostic survivor for the tested specimen is:

`reactiveSupport = touchingPointExists || loadedPointExists`

It is **diagnostic research only**, not promoted runtime policy.

Detailed E3.1 ledgers:

- `docs/E3_ROTATIONAL_EMBODIMENT.md`
- `docs/E3_1_VALIDATION_LOOP.md`
- `docs/E3_1_SUPPORT_TRANSITIONS.md`

### E3.2 — bounded internal angular momentum

At canonical `1/60 × 4 substeps`, a matched three-body specimen demonstrated a real local mechanism: active internal angular-momentum redistribution changed direct `±80 N·s` from passive FALL/FALL to active RECOVER/RECOVER while zero-g total angular momentum remained conserved to small measured drift.

The stronger capability claim failed solver-resolution robustness. Changing only substeps `[1,2,4,8]` produced non-monotonic outcomes; the canonical active survivor did not generalize across the sweep.

Final verdict:

> **The bounded-internal-momentum specimen demonstrates a real local mechanism at canonical resolution, but its recoverability benefit is not substrate-robust in the tested representation.**

E3.2 earned **knowledge, not promotion**. Do not rescue this representation with another torque/stroke/gain/substep sweep.

Detailed ledger:

- `docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`

## 6. E4 — locomotion ↔ finite-posture compatibility

E4 is a **closed research stage / evidence only**.

Question:

> **Can the translational agency envelope already accepted in A‴ coexist with finite physical posture, or does naive combination make the two capabilities mechanically incompatible?**

E4 used a kinematic support carriage under the E3 sagittal organism. It is an **inertial compatibility proxy**, not embodied locomotion implementation.

Retained results:

- full `0→5.2 m/s` world-upright acceleration recovers at `4 m/s²` but falls from `8 m/s²` upward in the declared sweep, including current `31 m/s²`;
- current `31 m/s²` is not intrinsically fatal: short episodes producing `0.5–1.0 m/s` Δv recover;
- acceleration-aligned posture can preserve stronger demand without raising the `320 Nm` posture budget;
- the useful posture state is dynamic cooperation with imminent/ongoing inertial demand, not a statically pre-set pose;
- fixed lead8 preparation changes current `31 m/s²` launch and current `36 m/s²` braking from matched F/F to matched R/R at substeps `2/4/8`, but not at `1`;
- recovered `2/4/8` cases retain reactive support and bounded support-relative foot drift.

Central conceptual result:

> **Player intent can reveal an imminent physical demand before that demand is fully realized. A controller may spend finite posture authority to physically prepare the body, rather than granting free upright or simply weakening the intended translation.**

E4 did not prove physical reproduction of A‴ translation and did not select an `8`-frame gameplay timing.

Detailed ledger:

- `docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`

## 7. E5 — translational authority placement and accounting

E5 is a **closed research stage / evidence only**.

Question:

> **If accepted translation is no longer treated as a controller-owned mover right, what physically supplies that authority, what momentum bookkeeping follows, and how much of the A‴ response can the current single-support organism earn through contact?**

### E5.0a — contact-load semantics corrected first

The pinned Box3D substrate was calibrated before quantitative traction claims were accepted.

In settled `80 kg` support across substeps `[1,2,4,8]`:

- final-substep `normalImpulse × substeps ≈ m g dt`;
- raw `totalNormalImpulse ≈ 2 × m g dt` because relaxation is included;
- `0.5 * totalNormalImpulse` matches the pinned native debug-force outer-step convention and is retained as an E5 diagnostic load estimate.

The original E5.0 probe remains historical/superseded evidence because it predated this correction.

### E5.0b — authority placement is causal

Corrected comparison established:

- **world-external** authority preserves requested acceleration without support but injects net momentum into the player+support system;
- **support-mediated exchange** requires support and can preserve equal-and-opposite horizontal momentum accounting;
- ordinary Coulomb-limited exchange with `μ=.95` under static weight saturates near `19 m/s²`, below current Donor-v1 `31/36 m/s²` launch/braking demand.

This does not reject traction generally. It establishes the capacity conflict of the current simple representation.

### E5.1 — posture recruits real translational authority

E5.1 reproduced the E4 current-31 outcome pattern and measured whole-body horizontal momentum directly.

In recovered lead8 cases across substeps `2/4/8`:

- support-load recruitment increased by at least about `1.12×` relative to lead0;
- physical support/contact supplied about `64.6–71.0%` of the full `80 kg × 5.2 m/s` ramp impulse requirement;
- body speed at ramp end was about `4.20–4.42 m/s` while support reached `5.2 m/s`.

Correction to E4 interpretation:

> **E4 proved survivability/posture compatibility at current-strength inertial demand. E5.1 shows that preparation also increases physically earned translation, but the current single-support organism does not reproduce the complete accepted A‴ response through contact alone.**

### E5.2 — residual authority can preserve agency, but changes the physics

A diagnostic support-gated world-external residual channel separately measured missing authority after physical support/contact had acted.

The coarse `[0,4,8,12,16] m/s²` sweep showed that some residual values can close the accepted-speed gap, but:

- the amount needed is solver-resolution dependent;
- stronger residual can reduce the share contributed by contact;
- stronger residual can change recover/fall outcomes rather than simply adding independent momentum;
- at substeps `1`, only `4 m/s²` residual already changes the physical-only F/F case to R/R.

Strong warning:

> **World-external assistance can mask a physical substrate that does not independently possess the required recoverability/capacity.**

E5 does **not** select pure traction, hybrid authority, a residual cap, stepping, Donor v2 or an A‴ retune.

Detailed ledger:

- `docs/E5_AUTHORITY_PLACEMENT.md`

## 8. Repository/runtime consequence

E3.2, E4 and E5 are **knowledge only**.

No E4/E5 behavior is promoted into:

- `src/character.js`;
- `src/constraint-velocity-character.js`;
- `src/e3-balance-organism.js`;
- browser E3 behavior;
- A‴ / Donor v1;
- any new donor revision.

The public default remains A‴. The public E3 browser still represents the earlier E3.1 experimental always-active actuator.

E4/E5 scripts are deterministic research probes, not player locomotion implementation.

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

- `scripts/e4-0*` through `scripts/e4-7*` — acceleration/braking compatibility, posture mediation and substrate sensitivity.

### E5 authority probes

- `scripts/e5-0-authority-placement-crucible.mjs` — superseded historical first measurement;
- `scripts/e5-0a-contact-load-calibration.mjs` — Box3D contact-load calibration;
- `scripts/e5-0b-authority-placement-corrected.mjs` — corrected placement/reciprocity/traction crucible;
- `scripts/e5-1-posture-load-recruitment.mjs` — posture/load/whole-body momentum accounting;
- `scripts/e5-2-residual-authority-accounting.mjs` — diagnostic residual authority accounting.

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

- `smoke:research` — historical research chain + current active research gates;
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

Accepted A‴ acceleration/deceleration demand conflicted with naive finite world-upright posture in an inertial carriage proxy. Dynamic anticipatory preparation rescued current launch and braking at substeps `2/4/8` without stronger torque or weaker translation.

### E5

Authority placement was separated causally. Posture preparation was shown to increase physically earned support momentum, but the current single-support organism still leaves a gap to the accepted A‴ response. World-external residual authority can close that gap in some cases, while changing reciprocity/contact contribution and potentially masking physical substrate failure.

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
- strong accepted player agency should not be weakened merely to make a physical-body prototype easier unless evidence and Owner judgement justify that trade;
- raw `totalNormalImpulse` is not an outer-step support impulse on the pinned Box3D substrate; E5's `0.5×` correction is a calibrated diagnostic, not universal gameplay semantics;
- a support-gated world-external assist remains world-external authority; gating does not make it reciprocal;
- a residual assist that produces a desired speed is not automatically a valid gameplay mechanism;
- physical-contact contribution and external assist must be accounted separately when evaluating embodied locomotion.

## 13. Known debts / open boundaries

These are stored uncertainties, not automatic tasks.

### A‴

- horizontal-normal activation threshold `0.35` is qualified only by the current matrix;
- arbitrary rotating kinematic side constraints remain unpromoted;
- dense/curved multi-plane networks are not exhaustive;
- recovered plane-push logic duplicates native solver behavior and is coupled to current binding semantics;
- grounded no-input recovery remains a strong momentum sink but is not an Owner-reported current defect;
- accepted translational motion is controller-owned mover authority, not a physically embodied propulsion model.

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

### E4/E5 physical locomotion bridge

- E4's carriage remains an inertial proxy, not a locomotion implementation;
- E5's simple authority crucibles do not establish a final propulsion architecture;
- the current single-support organism physically earns a majority but not all of the current launch response in the recovered E5.1 cases;
- ordinary static-weight Coulomb capacity near `19 m/s²` is a property of the declared simple specimen, not a universal traction limit;
- world-external residual authority is measurable but not selected;
- deliberate support relocation may increase physically available authority, but no real stepping capability is designed;
- continuous intent, reversals, terrain, moving supports and dynamic interactions remain untested in a true embodied locomotion representation;
- anticipation still needs a state/intent-derived policy before it can become gameplay behavior;
- no Owner feel evidence exists for an integrated locomotion+posture representation.

### Mobile

Initial Android touch free play proved feasibility/usability of accepted locomotion. Sustained performance, thermals, ergonomics and broader device coverage remain unqualified.

### Networking/downstream

The pure intent boundary is useful, but this repository does not own a generic reconciliation/prediction/serialization framework. A real consumer must earn it.

## 14. Current natural boundary / next-work rule

E5 is **closed as an authority-placement/accounting stage**.

Do **not** continue by interpolating residual acceleration until a preferred `5.2 m/s` number appears. Do not build legs or humanoid gait merely because support relocation is now plausible. Do not weaken `31/36 m/s²` merely to make the present organism easier to satisfy.

The next high-information problem is:

> **Should the next portion of missing agency be earned physically by changing support/contact representation — for example deliberate support relocation — or should some bounded gameplay authority be granted explicitly and honestly as non-reciprocal assistance?**

This is the next **problem**, not a preselected implementation.

Candidate families include, without commitment:

- deliberate support relocation / a minimal stepping-like mechanism whose physical contribution can be measured;
- bounded world-external gameplay assistance with explicit accounting and failure-masking checks;
- another support/contact representation that can increase physical authority without silently granting controller-owned immunity;
- a hybrid only if a future experiment demonstrates that its division of responsibility is useful rather than merely tunable.

The next stage should first separate these possibilities with the smallest causal experiment that produces meaningful information gain.

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
