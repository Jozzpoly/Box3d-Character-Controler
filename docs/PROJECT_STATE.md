# Project state — Embodied Player Laboratory

Grounded: **2026-09-02, after E6.0 support-relative-translation substrate qualification**

This is the canonical current-state/orientation layer. Detailed experiment history belongs in stage ledgers; this file should stay compact enough to make fresh takeover cheap.

Before any future write, **re-fetch live `main` and its exact SHA**. Recorded SHAs are provenance, not authority to assume the repository has not moved.

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

Implementation/probes may be disposable. Accepted observations, reproduced failures, causal distinctions and qualified behavior are durable.

The lab is intentionally independent from Jozz Vehicle, JES, Anvil and other projects. Knowledge may transfer; architecture and code do not transfer by default.

Do not turn this repository into a generic engine, mini-JES, universal gameplay framework or shared-utils dump.

## 2. Authority hierarchy

### Owner judgement — experiential truth

Owner hands-on/free play is authoritative for feel: artificiality, stickiness, satisfaction, physical legibility and whether a behavior is worth pursuing. Machine PASS cannot prove feel.

### Live repository + exact SHA + CI — implementation truth

Prefer:

1. live `main` exact SHA;
2. exact code/diff at that SHA;
3. smoke/build result on that exact SHA;
4. deployed Pages evidence when browser/device behavior matters.

A branch name is never current authority by itself.

### Stage ledgers — research/provenance truth

Stage documents say what was actually tested. Their historical words such as “current”, “next” or “candidate” are stage-local unless promoted here.

Rejected/confounded results remain evidence. Do not rewrite history merely to make it cleaner.

## 3. Accepted current player — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

Current donor entry points:

- `createCurrentDonorCharacter(...)`;
- `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`.

Historical `createDonorCharacter(...)` deliberately remains frozen **Donor v0 / A″**. Do not silently retarget it.

Current horizontal static/kinematic constraint interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Dynamic-body consequence remains on the separately qualified causal reciprocity/contact-memory path.

### Donor v1 numeric contract

v1 intentionally retains the accepted v0 feel profile:

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

- fixed outer step `1/60 s`;
- canonical `4` Box3D substeps;
- `box3d.js@0.1.1`;
- Three.js `0.183.0`;
- Vite `7.0.0`.

Lifecycle:

1. `character.preStep(dt, intent)`;
2. `b3World_Step(world, dt, substeps)`;
3. `character.postStep(dt)`.

Keyboard and touch feed the same device-independent move/jump/sprint intent.

### Representation fact

A‴ is a **controller-owned mover**, not rigid-body propulsion of an articulated player:

- intent integrates into controller-owned horizontal velocity;
- mover/plane solving advances controller-owned position;
- `virtualMass` participates in reciprocal contact consequence but does not make locomotion itself finite-mass rigid-body propulsion.

E3–E6 study bridges toward richer physical embodiment. None silently modifies A‴.

## 4. E3 — finite physical posture

E3 remains **experimental evidence**, not a donor revision.

### E3.1 retained result

At the standard finite `320 Nm` specimen:

- direct forward `64 N·s` — RECOVER;
- direct forward `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

Owner feedback:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is evidence that finite physical struggle for posture can be perceptually legible and valuable.

Post-Owner decomposition separated:

1. support-mediated grounded balance;
2. internal unsupported attitude control;
3. support relocation.

The Owner-positive grounded balance effect survives removal of the accidental unsupported reaction-wheel channel inside the tested envelope.

E3.1i–k also established that manifold presence, geometric touching and solver load are distinct. Diagnostic survivor:

`reactiveSupport = touchingPointExists || loadedPointExists`

This remains research-only, not runtime policy.

### E3.2 retained result

A bounded internal angular-momentum mechanism demonstrated a real local effect at canonical resolution, but its recoverability changed materially and non-monotonically across solver substeps `[1,2,4,8]`.

Verdict:

> **Real local mechanism, not substrate-robust recovery capability in the tested representation.**

Do not rescue E3.2 with another torque/stroke/gain/substep sweep.

Ledgers:

- `docs/E3_ROTATIONAL_EMBODIMENT.md`
- `docs/E3_1_VALIDATION_LOOP.md`
- `docs/E3_1_SUPPORT_TRANSITIONS.md`
- `docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`

## 5. E4 — accepted translation vs finite posture

E4 is a **closed carriage-proxy research stage / evidence only**.

It asked whether the accepted A‴ translation envelope is mechanically compatible with finite posture before attempting real locomotion integration.

Retained result:

- naive world-upright posture is incompatible with full current-strength launch/braking in the declared carriage proxy;
- peak acceleration alone is insufficient to describe the problem — duration/Δv and posture phase matter;
- finite physical preparation based on near-term intent can preserve stronger demand without raising the `320 Nm` posture budget;
- current `31 m/s²` launch and `36 m/s²` braking both change matched lead0 FALL/FALL → lead8 RECOVER/RECOVER at substeps `2/4/8`, but not `1`.

Important qualification:

> **E4 proves finite-posture survivability/compatibility under the inertial demand, not physical reproduction of A‴ translational authority.**

`lead8` is a research survivor, not gameplay timing. The carriage is a proxy, not integration. Solver substeps are an evidence axis, not a tuning knob.

Ledger:

- `docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`

## 6. E5 — translational authority placement/accounting

E5 is a **closed research stage / evidence only**.

It asked where accepted translational authority physically enters the system and how much the current single-support organism earns through real contact.

### Contact-load calibration

On the pinned E5 substrate, raw Box3D `totalNormalImpulse` includes relaxation accumulation. The qualified E5 outer-step diagnostic estimate is:

`0.5 * totalNormalImpulse`

This is an E5 measurement qualification, not a universal gameplay support policy.

### Placement result

- world-external authority preserves requested acceleration even without support, but injects net system momentum;
- support-mediated exchange requires support and can preserve equal-and-opposite horizontal momentum;
- ordinary Coulomb-limited exchange with `μ=.95` under static weight saturates near `19 m/s²`, below current `31/36 m/s²` demand in the simple specimen.

### Posture recruits real translation

In recovered E5.1 lead8 cases across substeps `2/4/8`:

- support-load recruitment increased materially versus lead0;
- real contact supplied about `64.6–71.0%` of the full `80 kg × 5.2 m/s` ramp impulse requirement;
- whole-body ramp-end speed was about `4.20–4.42 m/s` while support reached `5.2 m/s`.

Thus:

> **Anticipatory posture can materially increase physically earned translational authority, but the current single-support organism does not fully reproduce accepted A‴ translation through contact alone.**

### Residual assist result

A support-gated world-external residual can close some response gap, but it:

- remains externally injected authority;
- changes contact contribution;
- can change recoverability;
- can mask substrate insufficiency.

E5 selects neither pure traction nor hybrid assist, no assist cap, no A‴ retune and no stepping/support relocation mechanism.

Ledger:

- `docs/E5_AUTHORITY_PLACEMENT.md`

## 7. E6.0 — support-relative translation substrate

E6.0 is a **closed negative representation stage / evidence only**.

Stage base:

`2f341aed904ecdccf61b1264a77f849aeaa236fd`

Question:

> **Can a bounded support-relative translational DOF be inserted while preserving the already-qualified E5 finite-posture/support organism closely enough that later active relocation would be causally interpretable?**

### E6.0a — binding capability PASS

`box3d.js@0.1.1` exposes the needed mirrored, force-bounded prismatic joint in the sagittal axis. A `±0.25 m` calibration reached approximately `±0.251407 m` with no material off-axis leak.

This positive substrate fact remains in durable smoke.

### Locked representation gate — FAIL

E6 then inserted the proposed topology but kept the prismatic DOF locked:

`support foot ↔ prismatic carriage ↔ spherical ankle ↔ torso`

The representation was required to preserve the established E5 current-31 / lead8 control before any motorized relocation could be interpreted.

Several causal corrections were tested without relaxing the match thresholds:

- initial `9.5 kg foot + 0.5 kg carriage + 70 kg torso` retained translation closely but shifted peak posture beyond the declared tolerance;
- reducing carriage mass to `0.05 kg` caused a severe collapse and falsified “carriage mass alone” as the explanation;
- restoring balance reaction directly torso ↔ support foot still failed strongly;
- the final support-foot-preserving proxy kept the exact `10 kg` E5 support foot, used `0.5 kg` carriage and `69.5 kg` torso, retained direct torso ↔ foot balance reaction and total `80 kg`.

The final proxy recovered in both directions, kept ramp support and reproduced physically earned horizontal impulse/speed surprisingly closely:

- `Jx / required`: `0.671 → 0.664` and `0.646 → 0.673`;
- ramp-end body speed: `4.204 → 4.279 m/s` and `4.216 → 4.319 m/s`.

But peak torso tilt still changed materially:

- `14.08 → 20.38°`;
- `14.98 → 19.26°`.

The predeclared allowed peak-tilt difference was `4°`; the final shifts were about `+6.30°` and `+4.28°`.

A COM-relative `sliderRel` diagnostic printed by E6.0d is explicitly rejected as direct prismatic-translation evidence because foot rotation contaminates that measure. The representation FAIL does not depend on it.

Final E6.0 verdict:

> **The binding supports a bounded prismatic DOF, but serially inserting a locked prismatic carriage between the support foot and spherical ankle changes posture mechanics enough that this topology is not a qualified E5-relative substrate.**

Important distinction:

> **Translational agreement alone is not representation equivalence for embodied-player research. Topology itself is part of the mechanics.**

No motorized E6.1 was opened. This does **not** falsify support relocation generally and does not select gameplay assist.

Ledger:

- `docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`

## 8. Repository/runtime consequence

Current runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ remains frozen;
- E3.1 public balance surface remains an isolated earlier experimental playground;
- E3.2, E4, E5 and E6 are machine research only;
- no E6 code belongs in `src/` or current donor behavior.

Canonical smoke intentionally distinguishes durable regression from preserved research archaeology. After E6 closure:

- E6.0a prismatic binding calibration is durable positive smoke;
- E6.0b/c/d remain negative provenance and are not mandatory smoke gates.

## 9. Architecture map

Current main conceptual surfaces:

- `src/character.js` / current donor path — accepted controller-owned A‴ behavior;
- `src/donor/*` — explicit downstream donor contract/profile/lifecycle;
- E3 sagittal organism — finite physical posture research substrate;
- E4 scripts — carriage-proxy compatibility evidence;
- E5 scripts — authority placement/contact contribution/residual accounting;
- E6 scripts — prismatic binding qualification + rejected serial representation probes;
- `scripts/smoke-suite.mjs` — grouped canonical regression runner;
- `docs/PROJECT_STATE.md` — canonical compact orientation;
- stage ledgers — detailed research provenance.

Do not infer a final articulated-player architecture from this map.

## 10. Durable evidence lineage

High-level lineage:

1. controller-owned contact baseline established useful push/contact;
2. gravity/support/moving-support research recovered physical support behavior without fixed world-Y authority;
3. A′/A″ work separated reciprocal consequence from persistent locomotion state;
4. A‴ removed a real blocked-velocity semantic defect and became current Donor v1 after Owner free play;
5. E3.1 showed finite support-mediated posture struggle can be real and perceptually valuable;
6. E3.2 showed a local internal-momentum mechanism but failed solver-resolution robustness;
7. E4 showed accepted acceleration/braking demand can coexist with finite posture when the body physically prepares for known near-term demand;
8. E5 showed that preparation recruits real contact momentum but the simple single-support organism does not physically reproduce full A‴ translation;
9. E6.0 showed the desired prismatic DOF exists in the binding, but a naive locked serial insertion is not representation-equivalent to the qualified E5 organism.

## 11. Durable invariants

Preserve these unless new evidence explicitly overturns them:

- Donor v0/A″ is immutable historical compatibility behavior.
- Donor v1/A‴ current numeric feel is accepted; do not silently retune it.
- The normal public runtime is A‴ unless an explicit new promotion earns replacement.
- Dynamic-body consequence and static/kinematic constraint semantics remain causally distinct.
- Moving-support inheritance is accepted behavior and must not be casually broken.
- Machine PASS and Owner acceptance are different evidence classes.
- A‴ is current-best, not declared final player architecture.
- An observed E3 FALL/RECOVER classifier is an outcome, not itself a causal explanation.
- Internal actuation must not receive hidden world reaction merely to stabilize behavior.
- Finite torque is not equivalent to finite total internal angular-momentum capacity.
- Unsupported attitude control is a separate capability from grounded balance.
- Support truth is not reducible to one naive manifold/separation/impulse boolean.
- Support relocation must not be called stepping until real stepping capability is designed and tested.
- A local effect at one solver resolution is not a robust capability claim.
- E4 carriage motion is an inertial proxy, not physical locomotion integration.
- `lead8` is not accepted gameplay timing.
- Solver substeps are an evidence dimension, not a tuning knob for preferred behavior.
- Do not weaken strong accepted agency merely to make a body prototype easier unless evidence/Owner judgement justifies that trade.
- Raw Box3D `totalNormalImpulse` is not automatically an outer-step physical impulse; E5's calibrated `0.5×` interpretation is substrate-specific evidence.
- Support-gated world-external assistance is still world-external authority.
- Matching desired speed does not prove the mechanism that produced it.
- Contact-earned momentum and externally granted momentum must be accounted separately.
- **A new mechanical DOF must pass a locked representation-match gate before its active behavior can support causal claims.**
- **Translational equivalence alone is insufficient if posture/contact dynamics change materially.**

## 12. Known debts / unresolved questions

Current meaningful unknowns include:

- what organism/contact representation can add a genuine support-relocation DOF without perturbing the qualified finite-posture/support behavior before actuation;
- whether a parallel/multiple-support topology can earn additional agency physically without hidden external authority;
- whether some explicit bounded gameplay assist will eventually be preferable to further physical complexity;
- how any future representation behaves under reversal, continuous locomotion, terrain and moving supports;
- whether future embodied capabilities remain robust across solver resolution;
- what Owner feel emerges once a mechanically qualified embodied locomotion candidate actually exists.

These are questions, not scheduled tasks.

## 13. Current natural boundary

E5 left a fork between physically earning more agency and explicitly granting some gameplay authority.

E6.0 tested the smallest naive bridge toward the physical branch and rejected its **serial representation**, not the broader physical direction.

The next high-information physical question is now:

> **What organism/contact representation can add a real support-relocation degree of freedom without materially changing the already-qualified finite-posture/support mechanics while that DOF is locked?**

This is a representation-design problem before it is an actuator-tuning problem.

Do **not**:

- motor-tune the rejected E6 serial prismatic chain;
- open another mass/limit/tolerance sweep to make it pass;
- call support relocation “stepping”;
- build legs/humanoid gait by inertia;
- weaken accepted A‴ `31/36 m/s²` agency;
- select external assist merely because this representation failed;
- choose solver substeps to obtain preferred behavior.

The next stage should be selected separately by information gain. E6.0 closure does not automatically authorize another representation experiment.

## 14. Execution loop

Use the smallest loop that matches the uncertainty:

1. identify the highest-value unknown;
2. inspect only the code/evidence needed to define it;
3. write a falsifiable gate before tuning;
4. keep controls/representation matches where causal attribution matters;
5. run exact-head smoke/build;
6. distinguish machine evidence from Owner judgement;
7. promote only what the evidence supports;
8. stop at a natural boundary instead of opening the next stage automatically.

For fresh navigation also see `docs/README.md`.