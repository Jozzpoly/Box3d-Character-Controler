# E8 — unilateral axial compliance

Status: **E8.0a–c substrate/composition PASS; E8.1 serial telescopic embodied representation FAIL. No runtime or Donor promotion.**

E8 follows E7's central negative result:

> **Contact acquisition is not support capacity. A useful support-set mechanism must prove a stable, regulatable compressive load path.**

E8 investigated whether a parallel support branch could gain such a load path through finite, compression-only axial compliance without weakening accepted A‴ agency or inserting hidden world authority.

The stage produced useful positive substrate evidence, but the first embodied serial telescopic representation failed the predeclared inactive representation gate. That topology is closed against parameter/tolerance rescue.

## 1. Authority / pinned substrate

Canonical runtime remains A‴ / Donor v1. E8 is machine research only.

Pinned wrapper/source used for substrate interpretation:

- `box3d.js@0.1.1` in the project;
- wrapper source `isaac-mason/box3d.js@5d5a3af049cccd9948b2b55bac4342414af0ef64`;
- Box3D submodule `erincatto/box3d@8441b4a06d6d09dcfb0b0f704df4d847d1437b92`.

Canonical experimental cadence remains:

- outer `dt = 1/60 s`;
- `4` Box3D substeps.

No E8 result changes Donor v1 constants or public runtime behavior.

## 2. E8.0a — unilateral distance-spring primitive PASS

Question:

> Can the pinned distance-joint spring transmit finite compression while providing effectively zero tensile restoring authority?

Script:

`scripts/e8-0a-distance-joint-axial-binding-calibration.mjs`

Final exact head:

`043d994db9d37dba3d6723fa8424573c52154ef3`

Workflow:

`33692228730` — **SUCCESS**.

Representative configuration:

- static anchor + `20 kg` dynamic body;
- zero gravity, no contacts;
- rest length `1.0 m`;
- spring `8 Hz`, damping ratio `1`;
- `lowerSpringForce = 0 N`;
- `upperSpringForce = 200 N`;
- no distance motor/limit.

Measured:

- mirrored compression `0.800000 → 0.852083 m`, peak axial force `200.000 N`;
- mirrored tension `1.200000 → 1.200000 m`, peak axial force `0.000 N`;
- no material transverse leak.

Qualified claim:

> **The pinned distance-joint binding can provide mirrored finite compression with effectively zero tensile spring authority in an isolated axial specimen.**

The original draft at `8495708db4a9adf98a9b7b62f3e08dfdd4e73c73` did not actually test this question (`enableSpring=false`) and was not executed by smoke. It remains non-evidence provenance.

## 3. E8.0b — guide + unilateral compliance composition PASS

A lone compression-only distance spring cannot suspend a real distal body below its parent because gravity requires tension. The smallest selected composition therefore separated roles:

- limit-only prismatic guide: remove unwanted DOFs + provide travel stops;
- coaxial distance spring: finite unilateral axial compression;
- future separate placement DOF: orientation, not axial authority.

Script:

`scripts/e8-0b-telescopic-guide-compliance-binding.mjs`

### First run — reader confound retained

Head:

`9547c06b4ded38570618fae3403d0dd3d7112dd0`

Workflow:

`33693405335` — **FAIL**.

The physical specimen behaved coherently, but the reader incorrectly treated generic prismatic constraint-force vector direction as the physical slide axis. Pinned source inspection showed a substrate-specific telemetry mismatch: prismatic translation/solver axis are defined from the joint local X axis, while the generic reported force packs accumulated axial impulse into a different local component before world rotation.

The correction changed observation semantics, not mechanism parameters:

- prismatic translation/geometry defines physical guide-axis truth;
- generic prismatic constraint-force **magnitude** is used only for material load presence.

A second methodological correction removed an invalid expectation that the lightweight `1 kg` implicit spring specimen must equal naive classical `k*x`; E8.0a had already independently qualified the `200 N` cap.

### Corrected result

Exact head:

`b035fccac26bb730316adc39b5f881cfe9b93117`

Workflow:

`33693885658` — **SUCCESS**.

Suspension at extension stop:

- `1 kg` pad under `20 m/s²` gravity;
- prismatic translation `1.000141 m`;
- mean guide reaction magnitude `20.000 N`;
- distance-spring reaction `0.000 N`.

Compression inside guide travel:

- length `0.800000 → 0.833125 m`;
- guide remained interior at `0.833125 m`;
- guide reaction magnitude `0.000 N`;
- distance-spring axial reaction `103.832 N`.

Qualified claim:

> **A limit-only guide can suspend a real distal mass at its extension stop while the unilateral distance spring remains tension-free; inside guide travel the stop disengages and the spring alone supplies material finite compression.**

This is composition evidence only, not an embodied leg/support.

## 4. E8.0c — internal latch/release cache boundary PASS

E8.0b exposed a stow problem. An upward neutral stow is mirror-symmetric and ground-clear, but gravity preloads a free telescope in compression. A temporary exact prismatic lock can act as an internal latch, provided its release does not inject a solver-cache kick.

Script:

`scripts/e8-0c-latch-release-cache-boundary.mjs`

Pinned-source inspection predicted a relevant distinction:

- `b3PrismaticJoint_SetLimits(...)` changes limits but does not itself clear retained limit impulses;
- toggling `b3PrismaticJoint_EnableLimit(...)` clears lower/upper limit impulse state when the limit state changes.

Three-way crucible:

1. fresh-open reference;
2. exact-lock → direct `SetLimits(open)`;
3. exact-lock → `EnableLimit(false) → SetLimits(open) → EnableLimit(true)`.

First measurement assumption expected the source-scale warm-start impulse to remain visible as the full outer-frame terminal `Δv`. That was falsified: later substep solves correct much of the first-substep difference. The gate was corrected before the second run to compare direct/reset release **relationally against fresh-open** instead of demanding the invalid terminal magnitude.

Final exact head:

`2988e886204b5683fb82a3972a39976565e5e13c`

Workflow:

`33695014480` — **SUCCESS**.

Key first-open-frame measurements:

- fresh: `v=-0.118907 m/s`, `t=0.998269 m`, spring `17.578 N`;
- direct SetLimits: `v=-0.108815 m/s`, `t=0.998780 m`, spring `15.167 N`;
- direct errors vs fresh: `1.01e-2 m/s`, `5.11e-4 m`, `2.41 N`;
- cache-reset release: errors vs fresh `6.41e-7 m/s`, `0 m`, `6.87e-5 N`;
- zero-g neutral reset drift `0`, max speed `2.71e-6 m/s`;
- loaded released pad settled inside guide travel with guide reaction `0 N` and spring reaction `20 N`.

Qualified claim:

> **The internal latch can be released without a material cache artifact by clearing the prismatic limit state around the limit change; direct SetLimits-only release is measurably different from a fresh-open rig.**

This qualifies a substrate procedure, not an embodied limb or deployment policy.

## 5. E8.1 — mass/inertia-matched embodied serial telescope

After E8.0c, the first embodied question returned to the E6/E7 rule:

> **Representation match before actuation.**

The candidate deliberately preserved the already-qualified E7 branch mass properties as closely as possible.

E7 probe:

- `1 kg` uniform body;
- length `0.9 m`;
- COM `0.45 m` from torso pivot;
- sagittal pivot inertia `0.2712 kg·m²`.

E8.1 split:

- proximal `0.5 kg × 0.45 m`;
- distal `0.5 kg × 0.45 m`;
- contiguous neutral geometry;
- total branch mass `1 kg`;
- COM exactly `0.45 m` from torso pivot;
- parallel-axis calculation gives the same `0.2712 kg·m²` sagittal pivot inertia.

Candidate organism:

- exact primary `10 kg foot ↔ spherical ankle ↔ 69 kg torso`;
- `torso ↔ exact-zero revolute ↔ proximal`;
- `proximal ↔ exact-locked prismatic ↔ distal`;
- coaxial compression-only distance spring;
- total organism mass `80 kg`;
- no motors, no latch release, no auxiliary actuation;
- current31 / lead8 E5 stimulus.

Declared representation envelope was not relaxed:

- reference and candidate RECOVER both directions;
- zero primary ramp-support loss;
- zero auxiliary contacts;
- ramp impulse fraction within `0.05`;
- ramp-end speed within `0.25 m/s`;
- peak torso tilt within `4°`;
- candidate mirror speed gap ≤ `0.15 m/s`;
- candidate mirror impulse gap ≤ `0.035`;
- placement hinge lock error ≤ `0.25°`;
- prismatic lock error ≤ `0.005 m`;
- segment alignment error ≤ `0.25°`;
- settled spring preload ≤ `0.5 N`.

## 6. E8.1a first run — self-contact confound

Script:

`scripts/e8-1a-inactive-telescopic-support-representation.mjs`

The first split introduced one new auxiliary contact and large mechanical distortion. A dedicated identity diagnostic proved the pair was **distal↔torso**.

Geometric cause:

- torso half-height `0.55 m`;
- distal segment begins about `0.45 m` above torso COM;
- nominal overlap is about `0.10 m`.

The one-piece E7 probe could not self-collide with torso through its direct joint connection; after the split, the distal body no longer had that implicit collision suppression.

One causal representation correction was made:

- common negative collision group for `torso + proximal + distal`;
- external/world collision rules preserved;
- no geometry, mass, joint, spring or threshold changes.

The confounded failure remains provenance; it is not used as the final E8.1 verdict.

## 7. E8.1a corrected representation — FAIL

Final corrected exact head:

`09ad152406298b495b1f0067a918ae586bee5ba8`

Workflow:

`33696051005` — **FAIL at the intended E8.1a gate**.

After self-contact removal, almost the entire macro representation envelope passed:

### direction −

- ref/candidate: RECOVER / RECOVER;
- ramp impulse fraction `0.671 → 0.654`;
- ramp-end speed `4.204 → 4.127 m/s`;
- peak torso tilt `14.08 → 13.38°`;
- foot-relative travel `0.128 → 0.125 m`;
- auxiliary contacts `0`;
- primary ramp support loss `0`;
- prismatic error `5.91e-4 m`;
- segment alignment error `0.0906°`;
- spring settled/max `0.175 / 1.155 N`;
- **hinge lock error `0.296716°` > declared `0.250000°`.**

### direction +

- ref/candidate: RECOVER / RECOVER;
- ramp impulse fraction `0.646 → 0.642`;
- ramp-end speed `4.216 → 4.179 m/s`;
- peak torso tilt `14.98 → 14.36°`;
- foot-relative travel `0.144 → 0.140 m`;
- auxiliary contacts `0`;
- primary ramp support loss `0`;
- prismatic error `5.91e-4 m`;
- segment alignment error `0.0801°`;
- spring settled/max `0.175 / 1.155 N`;
- **hinge lock error about `0.2945°` > declared `0.250000°`.**

The threshold was not changed to `0.30°` after seeing the result.

This is a small absolute mismatch but a real failure of the predeclared inactive-mechanical-equivalence contract.

## 8. E8.1b — distance-spring causal decomposition

A disposable branch was created from exact `09ad1524…` so the causal decomposition would not contaminate the live E8 line before interpretation.

Question:

> Is the hinge drift caused by the compression-only distance spring sharing the same axial DOF as the exact prismatic lock, or by the serial split topology itself?

Only one mechanical difference was introduced:

- full arm: locked prismatic + distance spring;
- control arm: identical locked prismatic, **no distance spring**.

Mass, COM/inertia, geometry, filters, revolute/prismatic frames, locks, solver cadence, current31/lead8 stimulus and all thresholds were held.

Two early executions stopped before physics because of harness-wrapper bugs; they are explicitly **not evidence**.

First valid physics decomposition:

- temp head `2ebd04f1647ff02a1bedc3eb3a63eac9ae295fac`;
- workflow `33697836866` — expected **FAIL** at the negative conclusion.

Result:

- full hinge drift: about `0.2967° / 0.2945°`;
- no-spring hinge drift: about `0.2965° / 0.2942°`;
- macro representation envelope remained good in both arms;
- axial/alignment errors were nearly unchanged;
- no-spring arm correctly reported zero spring force.

Therefore:

> **Removing the distance spring does not restore the declared inactive mechanical envelope. The distance spring is not the material cause of E8.1a's hinge-drift failure.**

Executable provenance is retained outside mandatory smoke:

- `scripts/e8-1b-constraint-topology-decomposition.mjs`;
- `scripts/e8-1b-constraint-topology-decomposition-source.mjs`.

## 9. E8.1c — native hinge-coordinate hardening

One final possible confound remained: E8.1a/b measured hinge lock error as the difference between world sagittal body tilts, whereas the actual locked revolute coordinate is available directly through `b3RevoluteJoint_GetAngle(...)`.

E8.1c changed **observation only**, not mechanics.

Script:

`scripts/e8-1c-hinge-coordinate-observation.mjs`

Final temp head:

`596e2138fc830f858613927fd2ffcbb9935d90d1`

Workflow:

`33698276340` — expected **FAIL** at the hardened negative conclusion.

Measured maximum:

- historical world-angle metric: `0.296716°`;
- native `b3RevoluteJoint_GetAngle`: `0.296716°`;
- declared limit: `0.250000°`.

The native coordinate reproduced the same violation.

Therefore:

> **E8.1a/b is not a world-angle measurement artifact. The exact locked revolute itself exceeds the declared inactive representation envelope in the tested serial split topology.**

## 10. Cumulative E8 verdict

E8 separates four claims:

1. finite mirrored compression-only distance primitive — **PASS**;
2. limit-guide + unilateral-compliance composition — **PASS**;
3. cache-safe internal prismatic latch release — **PASS**;
4. first embodied serial telescopic split preserving E7 mass/COM/inertia — **FAIL** inactive mechanical representation.

The final negative survives the meaningful confound checks:

- self-contact identified and removed causally;
- distance spring removed without changing the failure;
- native revolute coordinate confirms the world-angle metric;
- no representation threshold was relaxed;
- no mass, geometry, solver or spring sweep was used to search for a pass.

Central retained result:

> **A useful axial-compliance primitive can exist on the substrate without making this particular latent serial telescopic representation acceptable when inactive.**

More specifically:

> **Do not advance `torso → locked revolute → proximal → locked prismatic → distal` into placement, ground load-sharing or current31/current36 agency tests merely because its macro response looks close. It failed the declared inactive mechanical-equivalence gate.**

This is not evidence that all telescopic/compliant support mechanisms are impossible.

## 11. Smoke / provenance policy

Mandatory positive E8 smoke contains only qualified substrate/composition results:

- `e8-0a-distance-joint-axial-binding-calibration.mjs`;
- `e8-0b-telescopic-guide-compliance-binding.mjs`;
- `e8-0c-latch-release-cache-boundary.mjs`.

Negative embodied representation probes remain executable provenance outside mandatory green smoke:

- `e8-1a-inactive-telescopic-support-representation.mjs`;
- `e8-1b-constraint-topology-decomposition.mjs` + source;
- `e8-1c-hinge-coordinate-observation.mjs`.

A negative experiment is not rewritten into a PASS merely to keep CI green.

## 12. New research boundary

E8.1 changes the next question.

The problem is no longer simply “qualify latch release, then embed the prismatic telescope.” E8.0c already qualified release semantics; the latent serial prismatic representation itself failed before release.

The next family should therefore minimize or eliminate the **inactive latent serial DOF topology** rather than tuning it.

One physically interpretable candidate exposed by the pinned binding is a **rigid stow / mechanical clutch transition**:

- preserve the same split branch mass/COM/inertia;
- while inactive, make proximal+distal mechanically rigid rather than carrying a latent prismatic DOF;
- only at an explicitly qualified transition replace/release that rigid connection into the axial guide/compliance mechanism;
- require continuity of pose/velocity/momentum and no material energy/impulse kick at the transition before embedding it into E5.

The pinned binding exposes a native weld joint, so this is substrate-plausible. It is **not selected architecture yet**.

The smallest next causal question is:

> **Can a split auxiliary branch made rigid while inactive reproduce the already-qualified one-piece E7 probe inside the same representation envelope?**

Only if that passes should a weld/rigid-stow → prismatic/compliance clutch transition be separately qualified.

Alternative mechanism families remain live, including a different minimal articulated support or explicit bounded gameplay authority from the E5 fork.

Do not by inertia:

- relax the `0.25°` E8.1 hinge gate to fit the observed `~0.295°`;
- sweep spring, mass, segment length, hinge/prismatic tolerances or solver substeps;
- activate E8.1 and test ground contact/load sharing anyway;
- interpret the `200 N / 8 Hz` substrate values as gameplay constants;
- weaken A‴ `31/36 m/s²` agency;
- build a full humanoid by default;
- promote E8 mechanics into `src/` or Donor.

E8 closes with positive axial-compliance substrate evidence and a negative embodied serial-representation boundary.