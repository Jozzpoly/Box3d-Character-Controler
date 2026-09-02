# Project state — Embodied Player Laboratory

Grounded: **2026-09-02, after E6.1 latent support-translation representation qualification**

This is the canonical current-state/orientation layer. Detailed experiment history belongs in stage ledgers; keep this file compact enough for cheap fresh takeover.

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

## 2. Authority hierarchy

### Owner judgement — experiential truth

Owner hands-on/free play is authoritative for feel: artificiality, stickiness, satisfaction, physical legibility and whether behavior is worth pursuing. Machine PASS cannot prove feel.

### Live repository + exact SHA + CI — implementation truth

Prefer:

1. live `main` exact SHA;
2. exact code/diff at that SHA;
3. smoke/build on that exact SHA;
4. deployed Pages evidence when browser/device behavior matters.

A branch name is never current authority by itself.

### Stage ledgers — research/provenance truth

Stage documents say what was actually tested. Historical words such as “current”, “next” or “candidate” are stage-local unless promoted here.

Rejected/confounded results remain evidence. Do not rewrite history to make it cleaner.

## 3. Accepted current player — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

Current donor entry points:

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

### Representation fact

A‴ is a **controller-owned mover**, not rigid-body propulsion of an articulated player:

- intent integrates controller-owned horizontal velocity;
- mover/plane solving advances controller-owned position;
- `virtualMass` participates in reciprocal dynamic-contact consequence but does not make locomotion a finite-mass rigid-body motor.

E3–E6 study possible bridges toward richer physical embodiment. None modifies A‴.

## 4. E3 — finite physical posture

E3 remains experimental evidence, not a donor revision.

### E3.1 retained result

At finite `320 Nm`:

- direct `64 N·s` — RECOVER;
- direct `80 N·s` — FALL;
- real 35 kg ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

Owner feedback:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

Post-Owner decomposition separated:

1. support-mediated grounded balance;
2. unsupported internal attitude control;
3. support relocation.

The Owner-positive grounded balance effect survives removal of the accidental unsupported reaction-wheel channel inside the tested envelope.

Diagnostic support survivor:

`reactiveSupport = touchingPointExists || loadedPointExists`

This is research-only, not runtime policy.

### E3.2 retained result

A bounded internal-angular-momentum mechanism showed a real local effect at canonical resolution, but recoverability changed materially and non-monotonically across substeps `[1,2,4,8]`.

Verdict:

> **Real local mechanism, not substrate-robust recovery capability in the tested representation.**

Do not rescue E3.2 via another torque/stroke/gain/substep sweep.

Ledgers:

- `docs/E3_ROTATIONAL_EMBODIMENT.md`
- `docs/E3_1_VALIDATION_LOOP.md`
- `docs/E3_1_SUPPORT_TRANSITIONS.md`
- `docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`

## 5. E4 — accepted translation vs finite posture

E4 is a closed **carriage-proxy** compatibility stage, not A‴ + E3 integration.

Retained result:

- naive world-upright finite posture is incompatible with full current-strength launch/braking in the proxy;
- acceleration duration/Δv and posture phase matter, not peak acceleration alone;
- finite physical preparation based on near-term intent can preserve stronger demand without raising the `320 Nm` posture budget;
- current `31 m/s²` launch and `36 m/s²` braking both change matched lead0 F/F → lead8 R/R at substeps `2/4/8`, but not `1`.

Important qualification:

> **E4 proves finite-posture survivability/compatibility under inertial demand, not physical reproduction of A‴ translational authority.**

`lead8` is research evidence, not accepted gameplay timing. Solver substeps are an evidence axis, not a tuning knob.

Ledger:

- `docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`

## 6. E5 — translational authority placement/accounting

E5 is a closed accounting stage.

Retained placement facts:

- world-external authority can act without support and injects net system momentum;
- support-mediated exchange requires support and can conserve equal-and-opposite horizontal momentum;
- ordinary Coulomb-limited exchange with `μ=.95` under static weight saturates near `19 m/s²`, below accepted `31/36 m/s²` demand in the simple specimen.

On the pinned E5 substrate, the calibrated outer-step support-load estimate is:

`0.5 * totalNormalImpulse`

This is substrate-specific measurement evidence, not universal support policy.

### Posture recruits real translation

In recovered E5.1 lead8 cases across substeps `2/4/8`:

- support-load recruitment increased materially versus lead0;
- real contact supplied about `64.6–71.0%` of the full `80 kg × 5.2 m/s` ramp impulse requirement;
- whole-body ramp-end speed was about `4.20–4.42 m/s` while support reached `5.2 m/s`.

Therefore:

> **Anticipatory posture can materially increase physically earned translational authority, but the current single-support organism does not fully reproduce accepted A‴ translation through contact alone.**

A support-gated world-external residual can close some gap but changes momentum/contact contribution and can mask substrate insufficiency.

E5 selects neither pure traction, hybrid assist, assist cap, A‴ retune nor stepping.

Ledger:

- `docs/E5_AUTHORITY_PLACEMENT.md`

## 7. E6 — support-relative translation representation

E6 is a **closed negative representation stage / evidence only**.

Question:

> **Can a latent support-relative translational DOF be inserted while preserving the qualified E5 primary organism closely enough that later active relocation would be causally interpretable?**

Hard rule:

> **Representation match before actuation.**

No active support-relocation claim was allowed unless the new representation first passed while translation was locked.

### E6.0 — serial prismatic carriage

Positive fact:

- `box3d.js@0.1.1` exposes a mirrored, force-bounded sagittal prismatic joint; `±0.25 m` calibration reached approximately `±0.251407 m`.

Rejected topology:

`foot ↔ locked prismatic carriage ↔ spherical ankle ↔ torso`

Several causal corrections were tested without relaxing match thresholds. The strongest final control preserved the exact `10 kg` E5 support foot, total `80 kg`, direct torso↔foot balance reaction, RECOVER/RECOVER and near-reference translational accounting:

- `Jx / required`: `0.671 → 0.664`, `0.646 → 0.673`;
- ramp-end speed: `4.204 → 4.279`, `4.216 → 4.319 m/s`.

But peak tilt shifted:

- `14.08 → 20.38°`;
- `14.98 → 19.26°`;

beyond the declared `4°` representation tolerance.

Verdict:

> **Serially interposing the latent prismatic DOF changes posture mechanics before actuation.**

E6.0 was canonicalized as:

`17b040a5f83b39e8589bae48322f56de462d3725`

with exact main workflow `33684312865` SUCCESS including Pages deployment.

### E6.1 — direct two-body two-DOF replacement constraint

Read-only E3.1 recovery showed its support travel came from the existing foot moving while foot↔torso stayed direct. E6.1 therefore removed the carriage and tested a direct two-body wheel-like solver constraint, used only because it can expose:

- world-Z translation;
- world-X sagittal rotation.

Binding calibration PASS:

- translation `±0.25 m` remained clean/mirrored;
- sagittal spin `±2 rad/s` remained free with locked translation.

But the locked representation still failed the full E5-equivalence contract.

E6.1b (`±1e-5 m` nominal lock):

- RECOVER/RECOVER;
- zero ramp support loss;
- individually close impulse/speed/tilt metrics;
- persistent candidate asymmetry:
  - ramp-end speed gap ≈ `0.189 m/s` > allowed `0.15`;
  - impulse-fraction gap ≈ `0.060` > allowed `0.035`;
- negative max anchor separation `2.142 mm` > declared `2.0 mm`.

E6.1c changed **only** nominal lock `±1e-5 m → exact 0/0` and preserved every threshold/other mechanic. The same asymmetry remained:

- speed gap ≈ `0.185 m/s`;
- impulse-fraction gap ≈ `0.059`;
- negative anchor separation ≈ `2.120 mm`.

Therefore the mismatch is not explained by the tiny nominal stroke.

E6.1 verdict:

> **The direct two-body two-DOF binding exists and is much closer to E5 than the serial carriage, but replacing the ankle constraint still changes the locked organism enough to fail the complete representation contract. Do not unlock/motorize it and attribute later results to support relocation.**

### Cumulative E6 conclusion

Two different latent-translation insertions altered qualified mechanics before actuation:

1. serial extra-body prismatic chain;
2. direct two-body replacement constraint.

Retained interpretation:

> **The next physical-support experiment should not be another attempt to replace or interpose the qualified primary ankle with a translational joint.**

Instead, if the physical branch continues, test a **parallel/alternate support-set topology** whose inactive state leaves the existing primary foot↔torso path intact.

This does not select humanoid legs, stepping or external assist.

Ledger:

- `docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`

## 8. Repository/runtime consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface remains isolated experimental presentation;
- E3.2, E4, E5, E6 are machine research only;
- no E6 mechanic belongs in `src/` or current Donor behavior.

Canonical smoke distinguishes durable positive substrate facts from negative archaeology:

- durable E6 smoke: prismatic binding calibration + direct two-body two-DOF binding calibration;
- failed E6 representation probes remain executable provenance but not mandatory green regression gates.

## 9. Durable evidence lineage

1. Controller-owned contact baseline established useful push/contact.
2. Gravity/support/moving-support research recovered physical support behavior without fixed world-Y authority.
3. A′/A″ separated reciprocal consequence from persistent locomotion state.
4. A‴ removed a real blocked-velocity semantic defect and became current Donor v1 after Owner free play.
5. E3.1 showed finite support-mediated posture struggle can be real and perceptually valuable.
6. E3.2 showed a local internal-momentum mechanism but failed solver-resolution robustness.
7. E4 showed accepted launch/braking demand can coexist with finite posture when the body physically prepares.
8. E5 showed preparation recruits real contact momentum, but the simple single-support organism does not physically reproduce full A‴ translation.
9. E6.0 showed a latent serial translation topology changes posture before actuation.
10. E6.1 showed even a direct two-body latent translation replacement, while much closer, fails the complete locked E5 representation contract.

## 10. Durable invariants

Preserve unless new evidence explicitly overturns them:

- Donor v0/A″ is immutable historical compatibility behavior.
- Donor v1/A‴ numeric feel is accepted; do not silently retune it.
- Normal public runtime is A‴ unless explicit promotion earns replacement.
- Dynamic-body consequence and static/kinematic constraint semantics remain causally distinct.
- Moving-support inheritance is accepted behavior and must not be casually broken.
- Machine PASS and Owner acceptance are different evidence classes.
- A‴ is current-best, not declared final player architecture.
- E3 FALL/RECOVER is an outcome, not a causal explanation.
- Internal actuation must not receive hidden world reaction merely to stabilize behavior.
- Unsupported attitude control is distinct from grounded balance.
- Support truth is not one naive contact boolean.
- Support relocation is not “stepping” until real stepping capability is designed/tested.
- A local effect at one solver resolution is not robust capability evidence.
- E4 carriage motion is a proxy, not locomotion integration.
- `lead8` is not accepted gameplay timing.
- Solver substeps are an evidence dimension, not a tuning knob.
- Do not weaken accepted agency merely to make a body prototype easier without evidence/Owner judgement.
- E5's `0.5× totalNormalImpulse` interpretation is substrate-specific.
- Support-gated world-external assistance is still world-external authority.
- Matching desired speed does not prove the mechanism that produced it.
- Contact-earned and externally granted momentum must be accounted separately.
- **A new mechanical DOF must pass an inactive/locked representation gate before active behavior can support causal claims.**
- **Translational equivalence alone is insufficient if posture/contact dynamics change materially.**
- **After E6, do not keep replacing the qualified ankle with latent translation variants merely to search for a passing one. Change mechanism family.**

## 11. Current unresolved questions

Highest-value unknowns now include:

- can a parallel/alternate support-capable element exist **inactive** without perturbing the qualified E5 primary organism;
- if yes, can changing the support set/load distribution earn additional physical agency without world-external horizontal authority;
- if not, is explicit bounded gameplay authority preferable to further representation complexity;
- how any later qualified mechanism survives reversal, continuous locomotion, terrain, moving supports and solver-resolution changes;
- what Owner feel emerges once a mechanically qualified embodied locomotion candidate exists.

These are questions, not architecture commitments.

## 12. Current natural boundary

E5 left a fork between physically earning more agency and explicitly granting some bounded gameplay authority.

E6 tested two increasingly faithful ways to embed support-relative translation in the current ankle path and rejected both as causal substrates before actuation.

The next high-information physical question is:

> **Can a minimal parallel/alternate support element be added in an inactive state without materially perturbing the qualified E5 primary foot↔torso organism?**

This is a **support-set non-interference problem** before support transfer, relocation or gait.

Do **not**:

- tune either rejected E6 latent-translation representation until it passes;
- unlock/motorize them;
- build humanoid legs/gait by inertia;
- call the next experiment stepping;
- weaken accepted A‴ `31/36 m/s²` agency;
- select external assist merely because E6 failed;
- choose solver substeps for preferred outcomes.

If the next stage is opened, its first gate should be inactive non-interference. Only a passing inactive control may authorize a later support-set/contact-acquisition experiment.

## 13. Execution loop

Use the smallest loop matching the uncertainty:

1. identify the highest-value unknown;
2. inspect only evidence/code needed to define it;
3. declare a falsifiable control before tuning;
4. preserve representation/inactive controls where causal attribution matters;
5. run exact-head smoke/build;
6. distinguish machine evidence from Owner judgement;
7. promote only what the evidence supports;
8. stop at a natural boundary rather than opening an unrelated stage automatically.

For navigation see `docs/README.md`.