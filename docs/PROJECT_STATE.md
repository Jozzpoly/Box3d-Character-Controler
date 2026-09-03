# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after E8 unilateral axial-compliance / serial-telescope boundary**

This is the compact canonical orientation layer. Detailed experiment history belongs in stage ledgers. Before any future write, **re-fetch live `main` and its exact SHA**; recorded SHAs are provenance, not authority to assume the repository has not moved.

## 1. Project identity

This repository is an **Embodied Player Laboratory**.

Central question:

> How can a player possess a physically meaningful body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Method:

> **Controlled enough to explain, open enough to play.**

Implementation/probes may be disposable. Accepted observations, reproduced failures, causal distinctions and Owner judgement are durable evidence.

The lab is independent from Jozz Vehicle, JES, Anvil and other projects. Knowledge may transfer; architecture/code do not transfer by default.

## 2. Authority hierarchy

1. **Owner hands-on judgement** — experiential truth about feel, legibility, artificiality and whether a behavior is worth pursuing.
2. **Live `main` + exact SHA + CI** — implementation truth.
3. **Stage ledgers** — research/provenance truth about what was actually tested.
4. Historical conversation/handoffs — context only when live evidence does not contradict them.

Machine PASS cannot prove feel. A branch name is never authority by itself. Rejected/confounded results remain evidence and must not be rewritten into success.

## 3. Accepted current player — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

Current entry points:

- `createCurrentDonorCharacter(...)`;
- `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`.

Historical `createDonorCharacter(...)` deliberately remains frozen **Donor v0 / A″**.

Current static/kinematic constraint interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Dynamic-body consequence remains on the separately qualified reciprocal/contact-memory path.

### Donor v1 numeric contract

- radius `0.36`;
- half segment `0.54`;
- virtual interaction mass `80 kg`;
- max speed `5.2 m/s`;
- sprint `1.32`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- air acceleration `7.5 m/s²`;
- air deceleration `1.2 m/s²`;
- external ground drag `2.0`;
- external air drag `0.22`;
- gravity `20 m/s²`;
- fall gravity multiplier `1.22`;
- jump-release multiplier `1.75`;
- jump speed `7.2 m/s`;
- coyote `0.11 s`;
- jump buffer `0.12 s`;
- support normal minimum Y `0.58`.

Qualified execution envelope:

- fixed outer step `1/60 s`;
- canonical `4` Box3D substeps;
- `box3d.js@0.1.1`;
- Three.js `0.183.0`;
- Vite `7.0.0`.

Lifecycle:

1. `preStep(dt, intent)`;
2. `b3World_Step(world, dt, substeps)`;
3. `postStep(dt)`.

### Representation fact

A‴ is a **controller-owned mover**, not rigid-body propulsion of an articulated player:

- intent integrates controller-owned horizontal velocity;
- mover/plane solving advances controller-owned position;
- `virtualMass` participates in reciprocal contact consequence but does not turn locomotion into finite-mass rigid-body propulsion.

E3–E8 are bridge research. None has modified A‴.

## 4. E3 — finite physical posture

E3 remains experimental evidence.

### E3.1 retained result

At finite `320 Nm`:

- direct `64 N·s` — RECOVER;
- direct `80 N·s` — FALL;
- `35 kg` ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

Owner feedback was positive: the specimen felt like a primitive mannequin physically fighting for balance.

Post-Owner work separated:

1. support-mediated grounded balance;
2. unsupported internal attitude control;
3. support relocation.

Diagnostic `reactiveSupport = touchingPointExists || loadedPointExists` remains research-only, not runtime policy.

### E3.2 retained result

Bounded internal angular momentum showed a real local mechanism at canonical resolution but materially/non-monotonically changed across substeps `[1,2,4,8]`.

Verdict:

> **Real local mechanism, not substrate-robust recovery capability in the tested representation.**

Do not rescue it through another torque/stroke/gain/substep sweep.

## 5. E4 — accepted translation vs finite posture

E4 is a closed **carriage-proxy** compatibility stage, not A‴ + E3 integration.

Retained result:

- world-upright finite posture is incompatible with full current-strength launch/braking in the proxy;
- acceleration duration/Δv and posture phase matter, not peak acceleration alone;
- finite preparation based on near-term intent can preserve stronger demand without raising the `320 Nm` posture budget;
- current `31 m/s²` launch and `36 m/s²` braking both change matched lead0 F/F → lead8 R/R at substeps `2/4/8`, but not `1`.

Important qualification:

> **E4 proves finite-posture survivability/compatibility under inertial demand, not physical reproduction of A‴ translational authority.**

`lead8` is evidence, not gameplay timing. Solver substeps are an evidence axis, not a tuning knob.

## 6. E5 — translational authority placement/accounting

E5 is a closed accounting stage.

Retained facts:

- world-external authority can act without support and inject net system momentum;
- support-mediated exchange requires support and can conserve equal-and-opposite horizontal momentum;
- ordinary Coulomb-limited exchange with `μ=.95` under static weight saturates near `19 m/s²`, below accepted `31/36 m/s²` demand in the simple specimen;
- on the pinned E5 substrate, `0.5 × totalNormalImpulse` is a calibrated outer-step load estimate, not a universal support policy.

In recovered lead8 cases across substeps `2/4/8`:

- preparation materially recruited support load;
- real contact supplied about `64.6–71.0%` of the full `80 kg × 5.2 m/s` ramp impulse;
- ramp-end whole-body speed was about `4.20–4.42 m/s` while support reached `5.2 m/s`.

Therefore:

> **Anticipatory posture can materially increase physically earned translational authority, but the current single-support organism does not fully reproduce accepted A‴ translation through contact alone.**

A support-gated world-external residual can close some gap but changes reciprocity/contact contribution and can mask substrate insufficiency.

E5 selects neither pure traction, hybrid assist, assist cap, A‴ retune nor stepping.

## 7. E6 — latent translation in the primary ankle path

E6 established a hard causal rule:

> **Representation match before actuation.**

A serial prismatic carriage and then a cleaner direct two-body two-DOF ankle replacement both changed qualified E5 mechanics while their translational DOF was locked.

Cumulative conclusion:

> **Do not keep replacing/interposing the qualified primary ankle with latent translation variants merely to search for a passing one. Change mechanism family.**

Negative representation probes remain provenance; binding calibrations remain positive smoke.

## 8. E7 — parallel support-set experiment

E7 preserved the primary E5 ankle path and added a separate physical support branch.

Representative topology:

- exact primary `10 kg foot ↔ spherical ankle ↔ torso`;
- separate `1 kg`, `0.9 m` probe;
- torso `69 kg`, total mass `80 kg`;
- probe attached through its own sagittal revolute joint;
- no world-external translational authority.

### E7.0 — inactive representation PASS

The contact-reachable branch remained locked, elevated and contact-inactive while preserving current31/lead8 behavior inside the declared representation envelope.

### E7.1 — finite internal ground acquisition PASS

Derived placement actuator:

- target `±140°`;
- limit `±145°`;
- torque cap `18 Nm`;
- critically damped target around `8 rad/s`;
- equal-and-opposite internal angular impulses probe↔torso.

Both directions acquired persistent **probe↔platform** solver-loaded contact at frame `25`, with primary support continuous and peak torso tilt about `.53°`.

### E7.2 — stable load path FAIL

Quiet upright settling left almost all body load on the primary foot. The probe carried only about `.12–.18 Ns/frame`, below its own nominal `.333 Ns/frame` weight impulse and far below the predeclared meaningful body-transfer threshold.

A current31 demand-derived posture shift `atan2(31,20)=57.17°` moved COM demand toward the acquired support. In both directions the probe remained grounded while the primary foot unloaded/lost support, but the organism fell instead of establishing stable dual-support HOLD.

Cumulative result:

> **Contact acquisition is not support capacity. A useful support-set mechanism must prove a stable, regulatable compressive load path.**

Do not rescue the E7 strut by sweeping torque, angle, length, mass, timing or tolerances.

## 9. E8 — unilateral axial compliance

E8 investigated a finite/regulatable compressive path without touching the qualified primary ankle.

### E8.0a — compression-only axial primitive PASS

Pinned distance-joint spring:

- finite mirrored compression;
- effectively zero spring tension;
- isolated `200 N` cap qualified.

Exact positive head:

`043d994db9d37dba3d6723fa8424573c52154ef3`

Workflow `33692228730` — SUCCESS.

### E8.0b — guide + compliance composition PASS

A limit-only prismatic guide can suspend a real `1 kg` distal pad at an extension stop while the distance spring remains tension-free. Inside guide travel, the stop disengages and the spring alone supplies material compression.

Corrected exact head:

`b035fccac26bb730316adc39b5f881cfe9b93117`

Workflow `33693885658` — SUCCESS.

Important substrate caveat: generic prismatic constraint-force vector direction is not authoritative for the physical slide axis on the pinned binding; translation/geometry define axis truth, generic force magnitude only signals load presence.

### E8.0c — cache-safe internal latch release PASS

Direct exact-lock → `SetLimits(open)` retains a measurable first-open-frame warm-start difference versus a fresh-open rig.

The sequence:

`EnableLimit(false) → SetLimits(open) → EnableLimit(true)`

clears the relevant limit cache and reproduces fresh-open response inside the declared numerical envelope without a material zero-g kick.

Exact head:

`2988e886204b5683fb82a3972a39976565e5e13c`

Workflow `33695014480` — SUCCESS.

### E8.1 — first embodied serial telescope FAIL

To isolate topology rather than arbitrary mass changes, the qualified E7 `1 kg × 0.9 m` uniform probe was split into two contiguous `0.5 kg × 0.45 m` segments.

The split analytically preserves:

- branch mass `1 kg`;
- COM `0.45 m` from torso pivot;
- sagittal pivot inertia `0.2712 kg·m²`.

Tested inactive topology:

`torso → exact-zero revolute → proximal → exact-locked prismatic → distal`

with coaxial compression-only distance spring.

Predeclared additional mechanical gates included:

- hinge lock ≤ `0.25°`;
- prismatic lock error ≤ `0.005 m`;
- segment alignment ≤ `0.25°`;
- settled spring preload ≤ `0.5 N`.

A first failure contained one new distal↔torso self-contact caused by splitting the one-piece probe. Contact identity proved it; a shared negative internal collision group removed it without changing geometry, masses, joints, spring or thresholds.

Final corrected E8.1a head:

`09ad152406298b495b1f0067a918ae586bee5ba8`

Workflow `33696051005` — FAIL at the intended representation gate.

After the self-contact correction the macro envelope was close and healthy:

- RECOVER/RECOVER;
- zero primary ramp support loss;
- zero auxiliary contacts;
- impulse/speed/peak-tilt/mirror gates passed;
- prismatic error about `5.91e-4 m`;
- alignment about `.08–.09°`;
- settled spring preload about `.175 N`.

But exact placement-hinge drift was about:

- direction −: `0.296716°`;
- direction +: `0.2945°`;

above the declared `0.250000°` gate.

The gate was not relaxed to fit the result.

### E8.1b — distance-spring decomposition

With every other property held fixed, removing only the distance spring left hinge drift essentially unchanged:

- full: about `.2967° / .2945°`;
- no spring: about `.2965° / .2942°`.

Thus the spring is not the material cause.

First valid decomposition run:

- temp head `2ebd04f1647ff02a1bedc3eb3a63eac9ae295fac`;
- workflow `33697836866` — expected negative failure.

### E8.1c — native-coordinate hardening

`b3RevoluteJoint_GetAngle(...)` reproduced the historical world-angle result exactly at the maximum:

- world metric `0.296716°`;
- native revolute coordinate `0.296716°`;
- declared gate `0.250000°`.

Final temp head:

`596e2138fc830f858613927fd2ffcbb9935d90d1`

Workflow `33698276340` — expected negative failure.

Therefore:

> **The E8.1 inactive failure is mechanical, not a self-contact artifact, not caused by the distance spring, and not a world-angle measurement artifact.**

Cumulative E8 verdict:

> **A useful compression-only axial primitive exists, but the tested latent serial telescopic representation is not qualified to advance into placement, load-sharing or translational-agency tests.**

Do not rescue E8.1 via tolerance, mass, geometry, spring or solver-substep sweep.

Ledger: `docs/E8_UNILATERAL_AXIAL_COMPLIANCE.md`.

## 10. Runtime / smoke consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface remains isolated experimental presentation;
- E3.2–E8 are machine research only;
- no E6/E7/E8 mechanism belongs in current `src/` or Donor behavior.

Canonical positive research smoke retains:

- E6 binding calibrations;
- E7.0a/b inactive representation;
- E7.1a/b finite ground acquisition/contact identity;
- E8.0a compression-only distance primitive;
- E8.0b guide/compliance composition;
- E8.0c cache-safe latch release.

Negative E7.2 and E8.1 scripts remain executable provenance outside mandatory green smoke.

## 11. Durable evidence lineage

1. Controller-owned contact baseline established useful push/contact.
2. Gravity/support/moving-support work recovered physical support behavior without fixed world-Y authority.
3. A′/A″ separated reciprocal consequence from persistent locomotion state.
4. A‴ removed a real blocked-velocity semantic defect and became current Donor v1 after Owner free play.
5. E3.1 showed finite support-mediated posture struggle can be real and perceptually valuable.
6. E3.2 showed local internal-momentum capacity but failed solver-resolution robustness.
7. E4 showed accepted launch/braking demand can coexist with finite posture when the body physically prepares.
8. E5 showed preparation recruits real contact momentum, but the simple single-support organism does not reproduce full A‴ translation.
9. E6 showed adding latent translation to the primary ankle path changes qualified mechanics before actuation.
10. E7 showed a parallel branch can preserve the primary organism and physically acquire a second ground contact, but contact alone did not become a stable body-load path.
11. E8 showed compression-only axial compliance and internal latch release are substrate-viable, but a mass/inertia-matched **latent serial telescope still perturbs inactive mechanics beyond its declared lock gate**.

## 12. Durable invariants

Preserve unless new evidence explicitly overturns them:

- Donor v0/A″ is immutable compatibility behavior.
- Donor v1/A‴ numeric feel is accepted; do not silently retune it.
- Normal public runtime is A‴ unless explicit promotion earns replacement.
- Dynamic-body consequence and static/kinematic constraint semantics remain causally distinct.
- Moving-support inheritance is accepted behavior and must not be casually broken.
- Machine PASS and Owner acceptance are different evidence classes.
- A‴ is current-best, not declared final architecture.
- E3 FALL/RECOVER is an outcome, not a causal explanation.
- Internal actuation must not receive hidden world reaction merely to stabilize behavior.
- Unsupported attitude control is distinct from grounded balance.
- Support truth is not one naive contact boolean.
- Support relocation is not “stepping” until real stepping capability is designed/tested.
- A local effect at one solver resolution is not robust capability evidence.
- E4 carriage motion is a proxy, not locomotion integration.
- `lead8` is not gameplay timing.
- Solver substeps are an evidence dimension, not a tuning knob.
- Do not weaken accepted `31/36 m/s²` agency merely to make embodiment easier without evidence/Owner judgement.
- E5's `0.5× totalNormalImpulse` interpretation is substrate-specific.
- Support-gated world-external assistance is still world-external authority.
- Contact-earned and externally granted momentum must be accounted separately.
- **A new mechanical DOF/branch must pass inactive representation matching before active causal claims.**
- **Translational equivalence is insufficient if posture/contact dynamics change materially.**
- **After E6, do not keep replacing the primary ankle with latent translation variants.**
- **After E7, do not equate contact acquisition with load-bearing support capacity.**
- **A candidate support architecture must prove stable/regulatable body-load transmission before translational-agency claims.**
- **After E8.1, do not activate or tune the failed latent serial telescope merely because its macro response is close.**

## 13. Current unresolved questions

Highest-value unknowns now include:

- can a split parallel branch be **mechanically rigid while inactive** and still reproduce the already-qualified one-piece E7 probe inside the strict representation envelope;
- if yes, can a rigid-stow → axial-guide/compliance transition be made internally with continuous pose/velocity/momentum and no material energy/impulse kick;
- only after such a representation passes, can an axial-compliant branch acquire support and stably/regulably transfer body load in both sagittal directions;
- only after that, can changing support set/load distribution earn additional current31/current36 physical agency without world-external horizontal authority;
- if representation complexity keeps growing without robust load-bearing payoff, is explicit bounded gameplay authority the better design trade;
- whether a different minimal articulated support family has better representation/load-path economics;
- how any later qualified mechanism survives reversal, continuous locomotion, terrain, moving supports and solver-resolution changes;
- what Owner feel emerges once a mechanically qualified embodied locomotion candidate exists.

These are research questions, not architecture commitments.

## 14. Current natural boundary

E8.0a–c are qualified substrate/composition evidence. E8.1 has exhausted the useful claim of the tested latent serial telescope without tuning it into a different experiment.

The next smallest physical-family question is:

> **Can a mass/COM/inertia-matched split auxiliary branch be made mechanically rigid while inactive and reproduce the qualified one-piece E7 probe inside the same strict representation envelope?**

Pinned binding inspection shows a native weld joint exists, making a rigid-stow specimen substrate-plausible. This is a candidate, not selected architecture.

If a rigid split fails inactive representation matching, do not tune it indefinitely; reconsider the split-body/clutch family.

If it passes, the next separate question is whether a state-continuous rigid-stow → prismatic/compression-compliance transition can be qualified without hidden authority or a mode-change kick.

Do **not** by inertia:

- relax E8.1's `0.25°` hinge threshold;
- sweep E8.1 mass/segment geometry/spring/substeps until it passes;
- run E8.1 active placement or load-sharing despite the failed representation gate;
- increase E7 probe torque or retune E7 geometry;
- run current31 translational-agency A/B on failed E7/E8 representations;
- call E7.1 stepping/gait;
- build a full humanoid by default;
- weaken A‴ `31/36` agency;
- select external assist merely because the mechanical path is difficult.

## 15. Execution loop

Use the smallest loop matching the uncertainty:

1. identify the highest-value unknown;
2. inspect only evidence/code needed to define it;
3. declare a falsifiable control before tuning;
4. preserve inactive/representation controls where causal attribution matters;
5. run exact-head smoke/build;
6. distinguish machine evidence from Owner judgement;
7. retain negative evidence without making it permanent red CI;
8. promote only what evidence supports;
9. stop at a natural boundary rather than opening an unrelated stage automatically.

For navigation see `docs/README.md`.