# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after E10 one-piece support-brace boundary**

This is the compact canonical orientation layer. Detailed experiment history belongs in stage ledgers. Before any future write, re-fetch live `main` and its exact SHA; recorded SHAs are provenance, not permission to assume the repository has not moved.

## 1. Project identity

This repository is an **Embodied Player Laboratory**.

Central question:

> How can a player possess a physically meaningful body while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Method:

> **Controlled enough to explain, open enough to play.**

Mechanics must pay rent. More bodies, joints and constraints are not progress by themselves; they must earn useful physical agency, embodiment or explanatory value.

## 2. Authority hierarchy

1. **Owner hands-on judgement** — feel, legibility, artificiality and whether behavior is worth pursuing.
2. **Live `main` + exact SHA + CI** — implementation truth.
3. **Stage ledgers** — research/provenance truth.
4. Historical conversations/handoffs — context only when live evidence does not contradict them.

Machine PASS cannot prove feel. Negative/confounded evidence must not be rewritten into success.

## 3. Accepted player — A‴ / Donor v1

Normal public/default runtime remains **A‴ / Donor v1**.

Key accepted values:

- virtual interaction mass `80 kg`;
- max speed `5.2 m/s`;
- sprint `1.32`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- air acceleration `7.5 m/s²`;
- air deceleration `1.2 m/s²`;
- gravity `20 m/s²`;
- jump speed `7.2 m/s`;
- fixed outer `dt=1/60 s`;
- canonical `4` Box3D substeps.

Current static/kinematic interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Historical `createDonorCharacter(...)` remains frozen Donor v0 / A″.

Representation fact:

> **A‴ is a controller-owned mover. Its accepted translation is not articulated rigid-body propulsion.**

Research E3+ asks which parts of accepted agency can be physically earned without destroying control/feel. None of E3–E10 has promoted new mechanics into Donor/runtime.

## 4. Durable research lineage

### E3 — finite physical posture

Finite `320 Nm` support-mediated balance produced a real embodied struggle and positive Owner response. Direct `64 N·s` recovered while `80 N·s` fell; a real `35 kg` ram at `3 m/s` recovered while `4 m/s` fell.

Bounded internal angular momentum later showed a real local mechanism but failed solver-resolution robustness. Do not rescue it by torque/stroke/gain/substep sweep.

### E4 — preparation before demand

Current-strength `31 m/s²` launch and `36 m/s²` braking can coexist with finite posture when the body physically prepares. `lead8` survived substeps `2/4/8` but not `1`.

`lead8` is research evidence, not gameplay timing. Solver substeps are an evidence axis, not a tuning knob.

### E5 — translational authority accounting

With ordinary `μ=.95` support and recovered lead8 posture, real contact supplied about **64.6–71.0%** of full `80 kg × 5.2 m/s` ramp impulse; body speed reached about `4.20–4.42 m/s` while support reached `5.2 m/s`.

World-external residual authority can close the gap but changes reciprocity and can mask physical insufficiency.

Retained fork:

- earn more authority physically; or
- grant an honest bounded nonreciprocal assist and account it separately.

E5 selects neither.

### E6 — primary-path latent translation rejected

Hard rule:

> **Representation match before actuation.**

Adding latent translation into the qualified primary ankle changed mechanics while inactive. Do not continue primary-ankle latent-DOF variants.

### E7 — parallel one-piece support

Qualified representation:

- exact primary `10 kg foot ↔ spherical ankle ↔ torso`;
- separate `1 kg × 0.9 m` one-piece probe;
- total `80 kg`;
- probe attached by its own sagittal revolute.

E7.0: inactive/contact-reachable representation **PASS**.

E7.1: finite `18 Nm` equal-and-opposite internal placement acquired real persistent probe↔ground support in both directions at frame ~25 while primary support remained intact — **PASS**.

E7.2: quiet settling transferred almost no meaningful body load to the probe; demand-aligned COM shift caused primary support unload/fall while probe stayed grounded — **FAIL**.

Central result:

> **Contact acquisition is not support capacity. A useful support mechanism must prove stable, regulatable load sharing.**

### E8 — axial-compliance substrate / latent telescope rejected

Positive substrate evidence:

- finite mirrored compression-only distance-joint behavior — PASS;
- limit-only prismatic guide + unilateral compliance role separation — PASS;
- cache-safe exact-lock release using limit-state clear/re-enable — PASS.

Embodied mass/COM/inertia-matched two-segment telescope nevertheless failed inactive representation at the placement hinge (`~0.295° > 0.25°`). Removing the distance spring did not repair the gate.

Conclusion:

> **The axial-compliance primitives are real, but the tested latent serial telescope is not qualified for actuation/load-sharing.**

Ledger: `docs/E8_UNILATERAL_AXIAL_COMPLIANCE.md`.

### E9 — rigid split rejected

A pinned zero-Hz weld primitive first passed isolated finite disturbances. E9 then removed the prismatic and distance spring entirely and split the qualified E7 branch into two rigidly welded `0.5 kg × 0.45 m` bodies while preserving branch mass, COM and sagittal pivot inertia exactly.

Macro current31/lead8 response remained essentially identical, but internal representation still failed:

- placement revolute `~0.292–0.294° > 0.25°`;
- weld relative alignment `~0.323–0.328° > 0.25°`.

Conclusion:

> **On the current substrate/contract, adding another serial constrained body to the qualified support branch is itself mechanically consequential before useful actuation.**

Do not continue the rigid-stow → clutch family or tune weld/geometry/substeps to manufacture a pass.

Ledger: `docs/E9_RIGID_STOW_SPLIT.md`.

### E10 — one-piece acquired support brace rejected as load-regulation mechanism

E10 deliberately avoided another body. It reused the qualified one-piece E7 probe and changed only the existing probe↔torso revolute **after** real support acquisition.

E10.0a isolated current-angle latch — **PASS**:

- wide-limit controls drifted about `8.449°` under the finite challenge;
- braced specimens drifted about `0.01098°`;
- neutral latch kick was only order `1e-6` linear/angular speed.

E10.0b real acquisition→brace transition — **PASS**:

- acquisition frame `25` both mirrors;
- first-frame matched whole-body impulse difference only `0.0424 / 0.0445 N·s` versus the existing `0.8 N·s` E5 band;
- brace drift `0.0095° / 0.0180°`;
- both supports stayed clean and continuous.

Transition cleanliness therefore ceased to be the limiting unknown.

E10.1a quiet settled load recruitment — **FAIL**:

- unlatched control reproduced E7.2a;
- brace preserved total `80 kg` support accounting but probe load remained only about `0.181–0.182 N·s`, far below the unchanged meaningful `>1.1333 N·s` gate;
- primary foot unloaded by only `0.0107 / 0.0030 N·s`, not `>0.8`.

One final orthogonal E10.1b reused the exact E7.2b current31 demand rather than tuning a new stimulus.

E10.1b demand-aligned brace stability — **FAIL both mirrors**:

- unlatched controls correctly reproduced `FALL/FALL` with peaks near `99.6°`;
- brace materially reduced peak tilt to `33.44° / 33.84°`, so it had a real stabilizing effect;
- nevertheless neither mirror reached the existing E4.3 HOLD;
- best target error remained `23.73° / 23.33°`;
- primary support was absent for `100 / 73` target-phase frames;
- probe support was absent for `4 / 6` frames;
- the exact-angle brace drifted `5.78656° / 5.63471°`, far beyond the qualified `0.25°` envelope.

Canonical E10 boundary:

> **A one-piece acquired parallel probe can be latched cleanly at low demand, but current-angle revolute bracing neither recruits meaningful static body load nor produces stable, regulatable dual-support load sharing under the previously failing current31 demand.**

Retained invariant:

> **Contact acquisition + a rigid brace is still not sufficient support capacity/regulation.**

Do not rescue E10 by brace-angle, torque, length, mass, latch-timing, limit-stiffness, substep or threshold sweeps.

Ledger: `docs/E10_ONE_PIECE_SUPPORT_BRACE.md`.

## 5. Current runtime / smoke consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface isolated;
- E3.2–E10 machine research only.

Durable positive research smoke retains:

- E6 binding calibrations;
- E7 inactive representation + real ground acquisition/contact identity;
- E8 axial-compliance/latch substrate calibrations;
- E9.0a weld binding calibration;
- E10.0a isolated latch transition;
- E10.0b real acquisition→brace transition continuity.

Negative E7.2, E8.1, E9.0b and E10.1a/b remain executable provenance outside mandatory green smoke.

## 6. Durable invariants

Preserve unless new evidence explicitly overturns them:

- A‴ numeric feel is accepted; do not silently retune `31/36 m/s²` agency to make embodiment easier.
- Owner judgement and machine evidence are different evidence classes.
- Internal actuation must not receive hidden world reaction merely to stabilize behavior.
- Support relocation/contact acquisition is not automatically stepping/gait.
- A local effect at one solver resolution is not robust capability evidence.
- Contact-earned and world-external authority must be accounted separately.
- A new mechanical representation must pass inactive matching before active causal claims.
- Macro translation matching is insufficient if internal posture/contact mechanics change materially.
- Do not keep replacing the primary ankle with latent DOFs.
- Do not equate second contact with stable body-load support.
- Stable/regulatable load transfer must precede claims that a mechanism earns more locomotion authority.
- After E8/E9, do not recursively add serial bodies merely to obtain an axial mechanism when representation cost is already failing.
- After E10, do not treat partial reduction of a fall as proof that a support mechanism deserves tuning; the project-relevant support prerequisite still failed.
- Complexity must earn information or gameplay value.
- Physical purity is not the goal. An explicit bounded assist remains an admissible design class if its contribution is honest and measurable.

## 7. Current highest-value unknown

E10 closes the last cheap variant that reused the qualified E7 one-piece support without adding another body.

The next question is therefore **not another joint parameter**:

> **Which remaining design class has the best information/gameplay economics: a genuinely new minimal physical support capability, or an explicitly bounded residual authority layered on top of physically earned contact contribution?**

This returns the project deliberately to the E5 fork.

Important cumulative evidence:

- E6: primary serial DOF failed representation;
- E7: one-piece support passed representation/contact acquisition but failed stable load regulation;
- E8/E9: split support primitives worked locally but embodied serial representation failed;
- E10: one-piece brace transitioned cleanly and moderated demand dynamics, but still failed stable/regulatable load sharing.

That is enough negative evidence to make **more anatomy by inertia** a poor default.

## 8. Near-term decision stage

Before implementing E11 mechanics, perform a bounded decision/decomposition stage.

Compare two classes explicitly:

### A. genuinely different minimal physical mechanism

Only continue physically if the candidate introduces a causal capability not already exercised by E6–E10 — for example true support-point relocation/regulation rather than another way of locking the same fixed-length branch.

Reject candidates that merely:

- add another serial body;
- add another stiffness/limit variant;
- repeat the same fixed support geometry with a new joint type;
- require weakening the accepted A‴ `31/36` demand to look viable.

### B. honest bounded residual gameplay authority

A residual path is admissible only if:

- physical contact/support remains first-class and measurable;
- nonreciprocal contribution is separately accounted;
- it does not become an airborne right without justified support semantics;
- it cannot silently mask complete loss of physical support;
- it preserves disturbance reactivity/readability rather than turning the body into decoration;
- accepted A‴ agency is preserved unless Owner evidence later justifies changing it.

E5.2 already proves that naive residual authority can displace contact contribution, so the next hybrid experiment must be **contact-prioritized/accounting-first**, not a sweep of assist caps.

## 9. Farther work

If a new physical mechanism wins the decision stage:

- require representation match before actuation;
- prove real support acquisition/placement if relevant;
- prove stable/regulatable load sharing before current31/current36 agency;
- re-check solver-resolution robustness before calling it durable;
- only then build a faithful play surface for Owner feel judgement.

If bounded residual authority wins:

- prove support gating / no-airborne-right semantics;
- separately measure contact-earned vs granted momentum every relevant phase;
- test launch and braking, external disturbances, moving support and support loss;
- predeclare a minimum meaningful physical contribution or other anti-masking invariant before tuning;
- expose the candidate to Owner only after machine evidence says its accounting is honest.

Do not build a humanoid simply because the physics problem is difficult. The target is a compelling physically embodied player, not mechanical purity.

## 10. Execution loop

For each stage:

1. identify the highest-value unknown;
2. inspect only evidence/source needed to define it;
3. declare a falsifiable control before tuning;
4. preserve representation/inactive controls where attribution matters;
5. run exact-head smoke/build;
6. distinguish confounded harness failure from physical failure;
7. preserve negative evidence without permanent red CI;
8. promote only what evidence supports;
9. stop at a natural boundary rather than opening unrelated work automatically.

For navigation see `docs/README.md`.