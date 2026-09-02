# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after E7 parallel-support-set closure**

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

E3–E7 are bridge research. None has modified A‴.

## 4. E3 — finite physical posture

E3 remains experimental evidence.

### E3.1 retained result

At finite `320 Nm`:

- direct `64 N·s` — RECOVER;
- direct `80 N·s` — FALL;
- 35 kg ram `3.0 m/s` — RECOVER;
- ram `4.0 m/s` — FALL.

Owner feedback was positive: the specimen felt like a primitive mannequin physically fighting for balance.

Post-Owner work separated:

1. support-mediated grounded balance;
2. unsupported internal attitude control;
3. support relocation.

Diagnostic support survivor:

`reactiveSupport = touchingPointExists || loadedPointExists`

This is research-only, not runtime policy.

### E3.2 retained result

Bounded internal angular momentum showed a real local mechanism at canonical resolution but materially/non-monotonically changed across substeps `[1,2,4,8]`.

Verdict:

> **Real local mechanism, not substrate-robust recovery capability in the tested representation.**

Do not rescue it through another torque/stroke/gain/substep sweep.

Ledgers:

- `docs/E3_ROTATIONAL_EMBODIMENT.md`
- `docs/E3_1_VALIDATION_LOOP.md`
- `docs/E3_1_SUPPORT_TRANSITIONS.md`
- `docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`

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

Ledger: `docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`.

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

Ledger: `docs/E5_AUTHORITY_PLACEMENT.md`.

## 7. E6 — latent translation in the primary ankle path

E6 is a closed negative representation stage.

Hard rule established:

> **Representation match before actuation.**

### E6.0 — serial prismatic chain

The Box3D prismatic binding itself passed, but:

`foot ↔ locked prismatic carriage ↔ spherical ankle ↔ torso`

changed posture mechanics while translation was locked. Strongest final control kept RECOVER/RECOVER and near-reference horizontal accounting, but peak tilt shifted `14.08→20.38°` and `14.98→19.26°`, beyond the declared `4°` representation tolerance.

### E6.1 — direct two-body two-DOF ankle replacement

A wheel-like two-body binding exposed clean sagittal translation + pitch without an intermediate carriage and was much closer to E5. Nevertheless, with translation locked it retained a persistent directional mismatch. Changing only nominal `±10 μm` lock to exact `0/0` did not remove it.

Cumulative conclusion:

> **Do not keep replacing/interposing the qualified primary ankle with latent translation variants merely to search for a passing one. Change mechanism family.**

Ledger: `docs/E6_SUPPORT_RELATIVE_TRANSLATION_SUBSTRATE.md`.

## 8. E7 — parallel support-set experiment

E7 changed mechanism family while preserving the primary E5 ankle path.

Representative topology:

- exact primary `10 kg foot ↔ spherical ankle ↔ torso`;
- separate parallel `1 kg`, `0.9 m` support probe;
- torso reduced to `69 kg`, keeping total mass `80 kg`;
- probe attached through its own revolute joint;
- no world-external translational authority.

### E7.0 — inactive representation PASS

A real parallel support-capable body could exist locked, elevated and contact-inactive while preserving current31/lead8 E5 behavior inside the declared representation envelope.

The final contact-reachable `0.9 m` geometry was separately re-qualified before actuation.

Retained invariant:

> **A parallel support branch can be representation-neutral even though primary-path latent-DOF replacements failed.**

### E7.1 — finite internal ground acquisition PASS

A single finite actuator specimen was derived from probe mechanics rather than swept:

- target `±140°`;
- limit `±145°`;
- torque cap `18 Nm` (`2×` maximum probe gravity moment);
- critically damped target around `8 rad/s`;
- equal-and-opposite angular impulses probe↔torso.

Both directions acquired persistent solver-loaded contact at frame `25`, with:

- primary support loss `0`;
- fall false;
- peak torso tilt about `.53°`;
- no world-external horizontal authority.

Contact identity hardening proved the contact was specifically **probe↔platform**, with `otherRaw=0` and `otherLoaded=0` throughout.

Exact positive provenance includes:

- E7.0b head `300bec432188129e8dfd18b2258170475bc5679b`, run `33686427721` SUCCESS;
- E7.1a head `f8f0e3646967b49aff6257119a3bcd449d2460ee`, run `33688504012` SUCCESS;
- E7.1b head `db0b658087503bacf19b6f4092c913eadb8d5c71`, run `33688878419` SUCCESS.

### E7.2a — upright load transfer FAIL

After acquiring and settling the second ground contact, E5-calibrated load accounting remained valid, but the probe carried only about `.12–.18 Ns/frame`, less than its own nominal `1 kg` weight impulse `.333 Ns` and far below the predeclared meaningful body-load threshold `1.133 Ns`.

The primary foot remained responsible for essentially the whole `80 kg` support load.

Exact negative provenance:

- head `d6303df42ab409b422e03386ace09d384effb470`;
- run `33689351597` FAIL at the intended E7.2a gate.

### E7.2b — current31 demand-aligned weight shift FAIL

To test whether E7.2a failed merely because COM remained above the primary foot, the existing `320 Nm` primary ankle was asked to reach the demand-derived current31 effective-up target:

`atan2(31,20) = 57.17°`

in the direction of the already-acquired probe.

This target moves the dominant torso-weighted COM projection to about `.399 m`, beyond the primary foot half-width `.340 m` while still inside the acquired support reach.

Both mirrored runs failed to establish a stable HOLD:

- probe support remained present continuously;
- no self/other contact appeared;
- torso came close to the requested target (`0.27°` / `1.79°` best error);
- primary foot unloaded/lost contact (`41` / `9` frames);
- organism fell to about `99.6–99.7°` peak tilt.

Exact negative provenance:

- head `7e3dffc45738d29576fb07a7230317f066e38c5d`;
- run `33689785902` FAIL at the intended E7.2b gate.

Thresholds, `18 Nm` actuator, probe geometry, target and tolerances were not relaxed after failure.

### Cumulative E7 conclusion

E7 separates contact placement from support capacity:

1. inactive parallel representation — PASS;
2. finite internal placement — PASS;
3. real mirrored ground acquisition — PASS;
4. meaningful stable body-load path in the tested single-hinge torso-COM strut — FAIL.

Central retained result:

> **Contact acquisition is not support capacity. A useful support-set mechanism must prove a stable, regulatable compressive load path, not merely place another body on the ground.**

More specifically:

> **The tested single rigid probe hinged at the torso COM is a qualified contact-placement mechanism, not a qualified load-bearing support architecture.**

Do not rescue it by sweeping torque, angle, length, mass or tolerances.

Ledger: `docs/E7_PARALLEL_SUPPORT_SET.md`.

## 9. Runtime / smoke consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface remains isolated experimental presentation;
- E3.2–E7 are machine research only;
- no E6/E7 mechanism belongs in current `src/` or Donor behavior.

Canonical research smoke retains durable positive E7 gates:

- E7.0a inactive parallel representation;
- E7.0b contact-reachable inactive representation;
- E7.1a finite internal support acquisition;
- E7.1b probe↔ground contact identity.

E7.2a/b remain executable negative provenance, intentionally outside mandatory green smoke.

## 10. Durable evidence lineage

1. Controller-owned contact baseline established useful push/contact.
2. Gravity/support/moving-support work recovered physical support behavior without fixed world-Y authority.
3. A′/A″ separated reciprocal consequence from persistent locomotion state.
4. A‴ removed a real blocked-velocity semantic defect and became current Donor v1 after Owner free play.
5. E3.1 showed finite support-mediated posture struggle can be real and perceptually valuable.
6. E3.2 showed local internal-momentum capacity but failed solver-resolution robustness.
7. E4 showed accepted launch/braking demand can coexist with finite posture when the body physically prepares.
8. E5 showed preparation recruits real contact momentum, but the simple single-support organism does not reproduce full A‴ translation.
9. E6 showed adding latent translation to the primary ankle path changed qualified mechanics before actuation.
10. E7 showed a parallel branch can preserve the primary organism and physically acquire a second ground contact, but **contact alone did not become a stable body-load path**.

## 11. Durable invariants

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

## 12. Current unresolved questions

Highest-value unknowns now include:

- can a **parallel finite support mechanism with a true compressive/load-bearing path** remain non-interfering when inactive;
- if yes, can it stably transfer body load in both sagittal directions before any locomotion claim;
- only after that, can changing support set/load distribution earn additional current31/current36 physical agency without world-external horizontal authority;
- if representation complexity keeps growing without robust load-bearing payoff, is explicit bounded gameplay authority the better design trade;
- how any later qualified mechanism survives reversal, continuous locomotion, terrain, moving supports and solver-resolution changes;
- what Owner feel emerges once a mechanically qualified embodied locomotion candidate exists.

These are research questions, not architecture commitments.

## 13. Current natural boundary

E7 has exhausted the useful claim of the **single rigid torso-COM hinged probe** without tuning it into a different experiment.

The next physical-family question is:

> **Can a parallel support mechanism provide a finite, stable and regulatable compressive load path while remaining mechanically non-interfering when inactive?**

Candidate families may include an axial/telescopic support or a minimal articulated limb, but E7 does not select either.

Do **not** by inertia:

- increase E7 probe torque;
- sweep E7 target angle/length/mass/timing until load transfer appears;
- run current31 translational-agency A/B on the failed E7.2 strut;
- call E7.1 stepping/gait;
- build a full humanoid by default;
- weaken A‴ `31/36` agency;
- select external assist merely because E7.2 failed;
- tune solver substeps for preferred outcomes.

Any new physical family starts again with **inactive non-interference**. Only a representation-qualified candidate may advance to contact acquisition, load transfer, then translational agency.

## 14. Execution loop

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
