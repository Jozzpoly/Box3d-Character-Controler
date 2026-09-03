# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after E9 rigid-stow split boundary**

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

Mechanics must pay rent. Extra bodies, joints and constraints are not progress by themselves; they must earn useful physical agency, embodiment or explanatory value.

## 2. Authority hierarchy

1. **Owner hands-on judgement** — feel, legibility, artificiality and whether a behavior is worth pursuing.
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

Research E3+ asks which parts of accepted agency can be physically earned without destroying control/feel. None of E3–E9 has promoted new mechanics into Donor/runtime.

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

> **Contact acquisition is not support capacity. A useful support mechanism must prove a stable, regulatable load path.**

Do not rescue E7.2 by torque/angle/length/mass/timing sweeps.

### E8 — axial-compliance substrate / latent telescope rejected

Positive substrate evidence:

- finite mirrored compression-only distance-joint behavior — PASS;
- limit-only prismatic guide + unilateral compliance role separation — PASS;
- cache-safe exact-lock release using limit-state clear/re-enable — PASS.

Embodied mass/COM/inertia-matched two-segment telescope nevertheless failed inactive representation:

- macro current31/lead8 response close;
- corrected self-contact `0`;
- placement hinge `~0.295°` > predeclared `0.25°`.

Removing the distance spring did not fix it. Native `b3RevoluteJoint_GetAngle(...)` confirmed the same violation.

Conclusion:

> **The axial-compliance primitives are real, but the tested latent serial telescope is not qualified for actuation/load-sharing.**

Ledger: `docs/E8_UNILATERAL_AXIAL_COMPLIANCE.md`.

### E9 — rigid split falsifies the narrower E8 explanation

E9 asked whether E8.1 failed specifically because of the latent prismatic/compliance DOF.

E9.0a first qualified the pinned zero-Hz weld primitive with finite disconnected controls:

- axial/shear disconnected controls separated by metres while weld stayed below `4e-4 m` gap;
- angular disconnected control rotated almost a full turn while weld stayed about `0.045°` relative angle;
- reused envelopes: `0.005 m`, `0.25°`.

Corrected positive head:

`9e75358362ed97c041cb7e25ee924225d9e83d1e`

Workflow `33700074694` — SUCCESS.

E9.0b then removed the prismatic and distance spring entirely. It compared:

A. exact E5 base;
B. exact one-piece E7.0b probe;
C. two rigidly welded `0.5 kg × 0.45 m` segments.

B/C analytically preserved exactly:

- branch mass `1 kg`;
- COM `0.45 m`;
- sagittal pivot inertia `0.271200 kg·m²`.

Negative exact head:

`b25d269c1a8ace967bd8c0607918f2d3c9858dc6`

Workflow `33700371638` — FAIL at the intended inactive representation gate.

The macro B→C response was essentially identical:

- `|Δv| ≤ 0.0003 m/s`;
- `|Δpeak tilt| ≤ 0.010°`;
- `|ΔJ| ≤ 0.0003`;
- contacts `0`.

But internal mechanical equivalence failed in both directions:

- placement revolute `~0.292–0.294°` > `0.25°`;
- weld relative alignment `~0.323–0.328°` > `0.25°`;
- weld positional gap `~1.3–1.4 mm` remained inside its `5 mm` gate.

Therefore:

> **The E8 failure is broader than the latent prismatic DOF. On the current substrate/contract, splitting the qualified one-piece support into another serial constrained body is itself mechanically consequential under current31/lead8 dynamics.**

Do not proceed to the proposed rigid-stow → prismatic/compliance clutch. Do not tune weld hertz, segment mass/geometry, solver substeps or the `0.25°` threshold to manufacture a pass.

Ledger: `docs/E9_RIGID_STOW_SPLIT.md`.

## 5. Current runtime / smoke consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface isolated;
- E3.2–E9 machine research only.

Durable positive research smoke retains:

- E6 binding calibrations;
- E7 inactive representation + real ground acquisition/contact identity;
- E8 axial-compliance/latch substrate calibrations;
- E9.0a weld binding calibration.

Negative E7.2, E8.1 and E9.0b remain executable provenance outside mandatory green smoke.

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
- After E8/E9, do not recursively add serial bodies merely to obtain an axial mechanism when representation cost is already failing the gate.
- Complexity must earn information or gameplay value.

## 7. Current highest-value unknown

The most promising physical direction is now deliberately simpler and reuses already-qualified E7 mechanics:

> **After real E7 ground acquisition, can the existing one-piece probe↔torso revolute become a mechanical brace/latch at its acquired angle and establish a stable load-bearing path without adding another inactive body or DOF?**

Why this is worth testing:

- E7 one-piece inactive representation is already qualified;
- E7 finite ground acquisition is already qualified;
- E7.2's missing property is load-bearing stability, not contact placement;
- latching the existing revolute changes the support path only **after** physical acquisition;
- it avoids E8/E9's failed split-body representation economics.

This is a candidate family, not architecture selection.

## 8. Near-term decision chain

Do not jump directly to locomotion.

1. Inspect pinned revolute limit/cache semantics.
2. Qualify a **latch-at-current-angle transition** in the smallest isolated/matched specimen. Require no material pose/velocity/momentum kick relative to a properly matched control.
3. Reproduce exact E7.1 finite ground acquisition unchanged.
4. Engage the brace only after persistent real ground-loaded acquisition.
5. Test mirrored stable/regulatable body-load sharing using E5/E7 calibrated load accounting.
6. **Only on load-path PASS:** test whether the extra support earns more current31 launch / current36 braking impulse without world-external horizontal authority.
7. Only after machine qualification expose a useful embodied candidate to Owner free play and feel judgement.

Kill rule:

> If the one-piece brace cannot create a stable/regulatable load path without another layer of mechanical complexity or post-hoc tuning, stop and return to the E5 design fork.

## 9. Farther work / strategic fork

If the one-piece brace succeeds:

- qualify release/reversal/repeated support cycles;
- test changing support side and continuous locomotion demands;
- re-check solver-resolution robustness;
- test moving supports / uneven terrain only after the core load path is causal;
- eventually create a faithful play surface and let Owner judgement decide whether the physical struggle improves the character.

If it fails:

compare, explicitly rather than ideologically:

1. a genuinely different **minimal** physical support mechanism with better representation economics;
2. an **honest bounded gameplay assist** that preserves accepted agency while making its nonreciprocal contribution measurable, limited and separate from contact-earned authority.

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