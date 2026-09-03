# E9 — rigid-stow split representation

Status: **E9.0a weld primitive PASS; E9.0b embodied rigid split FAIL. Rigid split / clutch family closed before transition or actuation. No runtime or Donor promotion.**

E9 followed E8.1's failure of a mass/COM/inertia-matched latent serial telescope. The narrow causal question was:

> **Did E8.1 fail because of the latent prismatic/compliance DOF, or because splitting the qualified one-piece E7 support into a serial multi-body constraint graph is itself mechanically consequential?**

The stage intentionally stopped before any clutch transition, support placement or load-transfer test if the inactive rigid split could not reproduce the qualified E7 representation.

## 1. Starting authority

E9 branch was created directly from canonical main:

`26a710d5c6d994356ea94607fb5bc1c71c31ef70`

That main closed E8 through PR #23 and workflow `33699042765` SUCCESS.

Runtime remained A‴ / Donor v1. E9 is machine research only.

Pinned substrate:

- `box3d.js@0.1.1`;
- wrapper `isaac-mason/box3d.js@5d5a3af049cccd9948b2b55bac4342414af0ef64`;
- Box3D `erincatto/box3d@8441b4a06d6d09dcfb0b0f704df4d847d1437b92`;
- fixed outer `dt=1/60 s`, canonical `4` substeps.

## 2. Predeclared decision chain

The rigid-stow family was not architecture selection. It was a bounded kill-chain:

1. weld primitive sanity;
2. rigid split inactive representation;
3. **only on PASS:** rigid → prismatic/compliance clutch continuity;
4. **only on PASS:** stable/regulatable body-load transfer;
5. **only on PASS:** current31/current36 translational-agency accounting.

A failure at step 2 closes the split/clutch family without weld-hertz, mass, geometry, tolerance or solver-substep sweeps.

## 3. E9.0a — weld binding calibration

Script:

`scripts/e9-0a-weld-binding-calibration.mjs`

Purpose:

> Does the pinned zero-Hz weld behave as a materially rigid two-body connection inside the already-paid-for E8 linear and E7/E8 angular inactive envelopes?

Specimen:

- two `0.5 kg × 0.45 m` bodies;
- zero gravity, no contacts;
- weld at shared boundary;
- `linearHertz=0`, `angularHertz=0` — pinned source defines zero as maximum stiffness;
- finite axial, shear and opposing sagittal-angular impulses;
- disconnected control receives the identical disturbance.

Reused envelopes:

- weld shared-anchor gap ≤ `0.005 m`;
- relative sagittal angle ≤ `0.25°`.

### First run — telemetry gate confounded

Workflow `33699793058` failed because the draft additionally required a material sampled `b3Joint_GetConstraintTorque(...)` value after the full outer step.

Geometry was already well inside the declared envelopes, so pinned-source inspection was performed before interpreting this as mechanical failure. Box3D's solver performs constraint solve followed by relaxation inside each substep; the getter reports the current accumulated terminal impulse state, not total transient corrective work across the substep sequence. The terminal torque could therefore return to zero after a finite disturbance that the weld had physically corrected.

The correction changed **observation/control only**:

- same weld;
- same bodies and impulses;
- same cadence;
- same geometric thresholds;
- force/torque getters retained as diagnostics only;
- identical disconnected control must now prove the challenge is material by leaving the relevant envelope.

### Corrected result — PASS

Exact head:

`9e75358362ed97c041cb7e25ee924225d9e83d1e`

Workflow:

`33700074694` — **SUCCESS**.

Representative results:

- axial: disconnected gap `4.000 m`; welded gap `3.562e-4 m`;
- shear: disconnected gap `4.000 m`; welded gap `3.775e-4 m`;
- sagittal rotation: disconnected relative angle `359.705°`; welded relative angle `0.045161°`, weld gap `8.941e-8 m`.

Qualified claim:

> **The pinned zero-Hz weld can keep this two-body split inside the existing linear/angular inactive envelopes under finite disturbances that drive an otherwise identical disconnected control far outside them.**

This is primitive evidence only.

## 4. E9.0b — embodied rigid split

Script:

`scripts/e9-0b-rigid-split-inactive-representation.mjs`

Question:

> **If the latent prismatic DOF and distance spring are removed entirely, can a rigid two-body split reproduce the already-qualified one-piece E7 support branch while inactive?**

Three fresh rigs were required:

### A — E5 base

`10 kg primary foot ↔ spherical ankle ↔ 70 kg torso`.

### B — one-piece E7 control

Exact E7.0b representation:

- primary path unchanged;
- torso `69 kg`;
- one `1 kg × 0.9 m` upward probe;
- exact-zero placement revolute;
- no auxiliary contact.

### C — rigid split candidate

- primary path unchanged;
- torso `69 kg`;
- proximal `0.5 kg × 0.45 m`;
- distal `0.5 kg × 0.45 m`;
- exact-zero torso↔proximal placement revolute;
- zero-Hz proximal↔distal weld;
- **no prismatic joint**;
- **no distance spring**;
- no motor, latch transition or active auxiliary authority.

The split analytically preserves the one-piece branch:

- total branch mass `1 kg`;
- COM `0.45 m` from torso pivot;
- sagittal pivot inertia `0.271200 kg·m²` exactly.

The split-induced distal↔torso self-collision relationship discovered in E8 was already understood, so torso/proximal/distal used the same negative internal collision group from the start. External/world collisions were unchanged.

## 5. E9.0b declared gates

No threshold was changed after seeing E8.

Reused representation gates:

- A, B, C RECOVER both sagittal directions;
- primary ramp-support loss `0`;
- auxiliary contacts `0`;
- native and historical placement-hinge drift ≤ `0.25°`;
- weld shared-anchor gap ≤ `0.005 m`;
- weld segment-alignment drift ≤ `0.25°`;
- relative to E5 base: `|ΔJ|≤0.05`, `|Δv|≤0.25 m/s`, `|Δpeak tilt|≤4°`;
- C must also match B inside the same macro envelope;
- mirror speed gap ≤ `0.15 m/s`;
- mirror impulse gap ≤ `0.035`;
- total mass `80 kg`.

No weld-hertz sweep, geometry sweep, mass sweep, solver-substep sweep or threshold relaxation was allowed.

## 6. E9.0b result — FAIL

Exact negative head:

`b25d269c1a8ace967bd8c0607918f2d3c9858dc6`

Workflow:

`33700371638` — **FAIL at the intended representation gate**.

### Direction −

E5 base:

- RECOVER;
- `J=0.671`;
- ramp-end speed `4.204 m/s`;
- peak torso tilt `14.08°`.

One-piece E7 control:

- RECOVER;
- `J=0.654`;
- `v=4.127 m/s`;
- peak `13.38°`;
- native/world hinge drift `0.0726°`;
- contacts `0`.

Rigid split:

- RECOVER;
- `J=0.654`;
- `v=4.127 m/s`;
- peak `13.38°`;
- contacts `0`;
- native/world placement-hinge drift **`0.2943°`**;
- weld gap `1.39e-3 m` — inside linear envelope;
- weld alignment drift **`0.3277°`**.

B→C macro deltas:

- `ΔJ=-0.0003`;
- `Δv=+0.0001 m/s`;
- `Δpeak=+0.005°`.

### Direction +

E5 base:

- RECOVER;
- `J=0.646`;
- `v=4.216 m/s`;
- peak `14.98°`.

One-piece E7 control:

- RECOVER;
- `J=0.642`;
- `v=4.179 m/s`;
- peak `14.37°`;
- hinge drift `0.0921°`.

Rigid split:

- RECOVER;
- `J=0.642`;
- `v=4.179 m/s`;
- peak `14.36°`;
- contacts `0`;
- native/world placement-hinge drift **`0.2917°`**;
- weld gap `1.31e-3 m`;
- weld alignment drift **`0.3229°`**.

B→C macro deltas:

- `ΔJ=+0.0001`;
- `Δv=-0.0003 m/s`;
- `Δpeak=-0.010°`.

The thrown gate was the native placement hinge in direction −:

`0.294287° > 0.250000°`.

The weld-alignment gate would independently have failed as well.

## 7. Interpretation

This is a strong causal refinement of E8.

E8.1 had already shown:

- removing self-contact did not restore the serial telescope;
- removing the distance spring did not restore it;
- native revolute angle confirmed the failure.

E9 now adds:

- the weld primitive alone is sufficiently rigid at canonical cadence;
- removing the latent prismatic DOF **entirely** still reproduces essentially the same `~0.29°` placement-hinge drift when the branch is split into a serial two-body constrained assembly;
- macro E5/E7 behavior is almost numerically identical to the one-piece probe while internal mechanical equivalence fails.

Therefore:

> **The material boundary is no longer “latent prismatic DOF is bad.” On this substrate and strict representation contract, splitting the qualified one-piece support into an additional serial constrained body is itself mechanically consequential under the E5 current31/lead8 organism dynamics.**

That conclusion is intentionally scoped. It does not claim all multi-body characters or all weld assemblies are invalid. It says this particular route is not earning enough information/value to justify further clutch complexity before passing representation.

## 8. Confounds considered and rejected as reasons to continue tuning

- **Weld primitive weakness:** falsified by E9.0a isolated finite-disturbance controls.
- **Mass/COM/inertia mismatch:** analytically matched exactly at the branch level.
- **Auxiliary self-contact:** prevented using the already-understood negative internal collision group; measured contacts `0`.
- **World-angle proxy:** placement revolute used native `b3RevoluteJoint_GetAngle(...)` and agrees with world measure.
- **Macro organism drift:** B→C macro differences are essentially zero, yet internal gates fail; macro equivalence therefore cannot substitute for mechanical representation equivalence.
- **Damping/motion-lock microdetails:** changing these now would create a new tuned representation despite an already clear failure. No sweep is justified.
- **Solver resolution:** remains an evidence axis, not a knob for recovering a preferred topology.
- **Threshold proximity:** `0.29–0.33°` is numerically close to `0.25°`, but the threshold was predeclared precisely to prevent post-hoc “close enough” promotion.

## 9. Cumulative E9 verdict

E9.0a: **PASS** — native weld primitive is viable.

E9.0b: **FAIL** — mass/COM/inertia-matched rigid split does not reproduce the one-piece E7 support inside the unchanged internal mechanical envelope.

Therefore:

> **Do not build the proposed rigid-stow → prismatic/compliance clutch. The prerequisite inactive representation failed before any transition was attempted.**

The failed candidate remains executable provenance. It is intentionally outside mandatory green smoke.

## 10. New research boundary

The project should now avoid adding another serial body merely to manufacture a compressive path.

The highest-information physical candidate returns to the already-qualified **one-piece E7 probe**, because it has two valuable proven properties:

1. inactive representation match;
2. finite internally actuated real ground acquisition.

E7.2 failed because the acquired probe behaved as a freely hinged strut and did not establish a stable/regulatable body-load path.

A smaller next family is therefore:

> **After real E7 ground acquisition, can the existing probe↔torso revolute become a mechanical brace/latch at its current acquired angle, creating a moment-bearing support path without adding a latent body or DOF while inactive?**

This is a candidate, not architecture selection.

The bounded decision chain should be:

1. inspect/qualify revolute latch-at-current-angle transition semantics and cache behavior;
2. reproduce E7.1 acquisition unchanged;
3. engage brace only after real ground-loaded acquisition and prove no material mode-switch kick;
4. test stable mirrored body-load sharing using the existing E7.2/E5 calibrated load accounting;
5. **only on stable load-path PASS**, test whether the additional support physically earns more current31/current36 translational impulse;
6. only after machine qualification expose a useful embodied candidate to Owner play/feel judgement.

If the one-piece brace also cannot establish stable/regulatable load sharing without growing new mechanical complexity, the project should explicitly revisit the E5 fork instead of recursively building anatomy:

- a different minimal support mechanism with better representation economics; or
- an honest bounded nonreciprocal gameplay assist with separately accounted contact-earned and externally granted authority.

The goal remains a controllable physical player, not maximal mechanical purity or maximal body-part count.