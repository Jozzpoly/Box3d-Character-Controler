# E8 — unilateral axial compliance

Status: **E8.0a unilateral distance-spring primitive PASS; E8.0b telescopic guide + compliance composition PASS; embodied parallel-limb representation not yet qualified.**

This ledger records the E8 line after E7 closed the tested single-hinge parallel support probe. E8 remains research-only. No E8 mechanism belongs to the runtime or Donor.

## 1. Why E8 exists

E7 established four facts that must remain separate:

1. a parallel support-capable branch can preserve the qualified primary E5 organism while inactive;
2. finite internal actuation can place that branch into real probe↔platform contact in both sagittal directions;
3. acquiring the second contact does not by itself make it carry meaningful body load in quiet upright settling;
4. when demand shifts far enough toward the second contact, the primary foot can unload/lose support while the probe remains grounded, but the tested organism falls instead of establishing a stable dual-support HOLD.

The fourth observation sharpens the diagnosis. The rigid E7 branch did not literally lack a reaction path: the revolute joint transmitted translational constraint reaction, and E7.2b demonstrated enough participation for the primary support to unload.

The unresolved property is therefore:

> **Can a parallel physical support admit finite, gradual and regulatable load sharing instead of behaving like a rigid support-set transition / pivot takeover?**

This does not rewrite E7 into success. Its single rigid torso-COM hinged probe failed the declared stable-load-bearing gate and remains closed against torque/angle/length/mass/timing sweeps.

## 2. E8.0a — unilateral axial primitive

### Question

> **Does the exact pinned Box3D binding provide a mirrored spring-only axial constraint that materially transmits finite compression while providing effectively zero tensile restoring authority?**

This is a primitive/binding question only.

### Source semantics

Pinned wrapper:

`isaac-mason/box3d.js@5d5a3af049cccd9948b2b55bac4342414af0ef64`

Pinned Box3D submodule:

`erincatto/box3d@8441b4a06d6d09dcfb0b0f704df4d847d1437b92`

The distance-joint API exposes:

- `enableSpring`;
- `lowerSpringForce`;
- `upperSpringForce`;
- `hertz`;
- `dampingRatio`;
- `b3DistanceJoint_SetSpringForceRange(...)`;
- `b3Joint_GetConstraintForce(...)`.

Upstream semantics identify the lower bound with tension capacity and the upper bound with compression capacity. The solver clamps the spring impulse to the configured force interval.

Therefore:

- `lowerSpringForce = 0 N`;
- finite positive `upperSpringForce`;

is a solver-native candidate for finite **compression-only** axial compliance.

### Superseded first draft — not evidence

Commit:

`8495708db4a9adf98a9b7b62f3e08dfdd4e73c73`

The first draft configured `enableSpring=false` while attempting to qualify limit/motor behavior. Review showed this was the wrong specimen for the E8 question. It was also absent from `scripts/smoke-suite.mjs`; workflow `33690555458` therefore did not execute E8.0a.

Consequently:

> **The original draft and its green workflow are not E8.0a research evidence.**

The mistake remains in Git history as provenance.

### Final E8.0a specimen

Script:

`scripts/e8-0a-distance-joint-axial-binding-calibration.mjs`

Validated exact head:

`043d994db9d37dba3d6723fa8424573c52154ef3`

Workflow:

`33692228730` — **SUCCESS**.

Substrate/configuration:

- outer `dt = 1/60 s`;
- `4` Box3D substeps;
- zero gravity, no contacts;
- static anchor + `20 kg` dynamic axial body;
- no distance limit or motor;
- rest length `1.0 m`;
- spring `8 Hz`, damping ratio `1`;
- `lowerSpringForce = 0 N`;
- `upperSpringForce = 200 N`;
- four fresh cases: compression/tension × mirrored `±Z`.

At `0.2 m` compression, the simple undamped linear scale is about `10106.5 N`, >`50×` the declared `200 N` cap. This was a pre-execution scale check, not post-failure tuning.

Measured output:

- `+Z` compression: `0.800000 → 0.852083 m`, peak axial `200.000 N`;
- `-Z` compression: `0.800000 → 0.852083 m`, peak axial `200.000 N`;
- `+Z` tension: `1.200000 → 1.200000 m`, peak axial `0.000 N`;
- `-Z` tension: `1.200000 → 1.200000 m`, peak axial `0.000 N`;
- zero material transverse force/leak.

Qualified E8.0a claim:

> **On the pinned canonical substrate, a spring-only distance joint can provide mirrored finite compression while exerting effectively zero tensile restoring authority in the isolated axial specimen.**

It does not qualify a leg, distal-body suspension, ground contact, load sharing, locomotion or gameplay constants.

## 3. Topology selection after E8.0a

E8.0a exposed a real representation problem: a lone compression-only distance spring cannot suspend a real distal body hanging below a parent, because gravity asks the connection for tension.

A short topology audit compared the smallest families before another embodied write.

### Rejected for the immediate question

**Direct parent↔pad distance spring**

- preserves unilateral compliance;
- but only constrains radius;
- leaves uncontrolled angular/orbital placement of the distal body;
- therefore does not provide a clear support-placement channel.

**Direct parent↔pad prismatic spring**

- gives a clean one-dimensional guide;
- but the pinned prismatic spring exposes no separate lower/upper spring-force bounds;
- replacing the qualified distance spring with it would discard E8.0a's unilateral compression property.

**Full two-link/knee limb**

- physically interpretable;
- but introduces more mass distribution, bodies, joints, DOFs and control policy than the current unknown requires;
- rejected as premature, not as impossible.

### Selected minimal family

The selected candidate family is a **guided telescopic branch**:

`parent / future placement body ↔ limit-only prismatic guide ↔ real distal pad`

with a coaxial:

`parent / guide ↔ distal pad compression-only distance spring`.

Role separation:

- prismatic joint: remove five unwanted relative DOFs and provide finite travel stops;
- distance spring: act softly on the remaining axial DOF with E8.0a unilateral compliance;
- future revolute/placement DOF: orient the telescopic branch without asking the axial constraint to solve placement.

The prismatic spring and motor are not part of the E8.0b mechanism.

This is smaller than a humanoid leg while explicitly separating:

> **where support is placed** from **how much axial compression it can carry**.

## 4. E8.0b — composite telescopic semantics

### Question

Before embedding this family in the `80 kg` organism:

> **Can a limit-only prismatic guide and the qualified compression-only distance spring coexist on the same remaining axial DOF such that the guide can physically suspend a real distal mass at an extension stop, while inside travel the stop disengages and the distance spring alone supplies material compression?**

This is still a binding/composition gate, not an embodied-support gate.

### Specimen

Script:

`scripts/e8-0b-telescopic-guide-compliance-binding.mjs`

Representative values:

- real dynamic pad `1 kg`;
- gravity `20 m/s²` for suspension case;
- prismatic travel `0.70..1.00 m`;
- prismatic spring OFF;
- prismatic motor OFF;
- distance rest length `1.00 m`;
- distance spring `8 Hz`, damping ratio `1`;
- distance force range `0..200 N`;
- no collisions.

Two fresh rigs separate the roles.

**A — suspension at full extension**

- starts at `1.00 m` under gravity;
- upper prismatic stop may carry the pad's own `20 N` weight;
- compression-only distance spring must remain effectively tension-free.

**B — compression while interior to travel**

- starts at `0.80 m` in zero gravity;
- must remain clear of the extension stop;
- guide must carry no material constraint load;
- distance spring must provide material bounded compression and push the pad outward.

## 5. First E8.0b execution — confounded failure retained

Initial exact head after adding E8.0b to research smoke:

`9547c06b4ded38570618fae3403d0dd3d7112dd0`

Workflow:

`33693405335` — **FAIL at E8.0b**.

Observed before failure:

- suspension translation stayed at about `1.000141 m`;
- distance stayed about `1.000141 m`;
- distance-spring tension was `0 N`;
- compression moved `0.800000 → 0.833125 m`;
- distance spring produced about `103.832 N` in the compression case;
- old reader interpreted the prismatic reaction as transverse and failed the gate.

This failure was not immediately tuned away. Exact pinned source was inspected first.

## 6. Pinned prismatic-force telemetry mismatch

Source inspection found that on the exact pinned Box3D substrate:

- prismatic translation and the solver axis are built from local-frame **X**;
- `b3GetPrismaticJointForce(...)` constructs the reported local force vector with the axial accumulated impulse in the **Z** component before rotating to world space.

Therefore the generic `b3Joint_GetConstraintForce(...)` vector direction for this prismatic joint is not aligned with the actual physical slide axis represented by `b3PrismaticJoint_GetTranslation(...)`.

This exactly explained the apparent first-run contradiction:

- the pad remained physically at its extension stop under gravity;
- generic guide-force projection onto the real slide axis read approximately zero;
- the same reported force appeared in another component with magnitude `20 N`.

Consequently the first E8.0b run falsified the **reader assumption**, not the telescopic mechanics.

For the prismatic guide only, corrected E8.0b uses:

- joint translation / geometry as authority for the physical guide axis;
- generic constraint-force **magnitude** only to detect whether the guide is materially carrying load.

Distance-joint force direction remains physically usable and is projected normally.

This substrate-specific telemetry caveat must not silently become a universal Box3D rule.

## 7. Second methodological correction — implicit spring response

The first draft also assumed the lightweight `1 kg` compression specimen should necessarily hit the already-qualified `200 N` cap because naive `k*x` gives about `505.3 N` at `8 Hz` and `0.2 m` compression.

Pinned solver inspection showed the distance spring is implemented as an implicit soft constraint using bias/mass/impulse scaling. A complete outer-step constraint-force result is therefore not simply classical `k*x`.

E8.0a already proves that the configured `200 N` upper bound is real and saturates under a deliberately strong `20 kg` specimen.

E8.0b's independent purpose is **composition and role separation**, so the corrected gate requires the lightweight spring reaction to be:

- material relative to the `1 kg` pad-weight scale (`>20 N`);
- bounded by the already-qualified `200 N` cap;
- while the prismatic guide is interior to its stop and carries no material reported constraint load.

No mechanism parameter changed during these corrections.

## 8. Corrected E8.0b exact result

Corrected exact head:

`b035fccac26bb730316adc39b5f881cfe9b93117`

Workflow:

`33693885658` — **SUCCESS**.

Measured output:

### Suspension

- pad mass: `1.0 kg`;
- derived pad weight: `20.0 N`;
- prismatic translation: `1.000141 m`;
- sample range: `1.000141..1.000141 m`;
- distance: `1.000141 m`;
- mean reported prismatic reaction magnitude: `20.000 N`;
- raw guide force: `[0.000, -0.000, 20.000] N`;
- projection of that raw vector onto the physical slide axis: `0.000 N` — retained as evidence of the telemetry mismatch;
- mean distance-spring axial reaction: `0.000 N`.

### Compression while interior to travel

- length: `0.800000 → 0.833125 m`;
- prismatic translation: `0.833125 m`, safely interior to the `1.00 m` extension stop;
- peak reported guide reaction magnitude: `0.000 N`;
- distance-spring axial reaction: `103.832 N`;
- spring raw force: `[0.000, -103.832, 0.000] N`.

Whole exact-head validation:

- research smoke: **67 scripts PASS**;
- Donor smoke: **4 scripts PASS**;
- production build: **PASS**;
- Pages configure/upload/deploy: correctly skipped on the experiment branch.

## 9. Qualified E8.0b claim

E8.0b supports this claim and no stronger one:

> **On the pinned substrate, a limit-only prismatic guide can physically suspend a real distal mass at an internal extension stop while the E8.0a distance spring remains effectively tension-free; inside guide travel, the stop disengages and the finite compression-only distance spring supplies material axial reaction without material constraint-load assistance from the prismatic guide.**

This makes the guided-telescopic family a justified candidate for the next embodied representation test.

It does not prove:

- that a guide body + distal pad can be added to the E5 organism without perturbing it;
- a fair inactive/stowed geometry;
- a placement actuator or latch;
- ground contact;
- stable load sharing;
- translational agency;
- gait or gameplay feel.

## 10. New highest-value unknown: stow/deployment

E8.0b removes the basic constraint-composition uncertainty. The next problem is no longer whether the telescopic primitive can exist.

A real branch in the `80 kg` organism must be simultaneously:

1. internally physical;
2. ground-clear while inactive;
3. not materially preloading the compression spring while inactive;
4. free from world locks/kinematic holds;
5. capable of later reaching support;
6. representation-neutral before any active support claim.

This creates a mounting/deployment choice that must not be smuggled in as an implementation detail.

For example:

- stowing the branch upward is ground-clear, but gravity tends to compress a free telescope;
- pointing it downward at full extension risks immediate ground contact;
- holding it retracted with a motor introduces bilateral active axial authority unless carefully bounded and released;
- mechanically locking full extension and later releasing the compression travel behaves like an internal latch, but the lock/release transition itself needs qualification.

A promising next candidate is therefore a **finite internal latch / deployment transition**, not a hidden world reaction. It remains provisional until tested.

## 11. Required embodied gate after deployment semantics are resolved

Only after the stow/deployment mechanism is itself qualified should E8 embed the branch into the exact E5/current31 organism.

The inactive representation gate should preserve:

- exact primary `10 kg foot ↔ spherical ankle ↔ torso` path;
- total organism mass `80 kg`;
- real dynamic auxiliary bodies;
- zero initial distal-ground contact;
- no world/kinematic hold;
- no material unintended spring preload;
- reference and candidate RECOVER in both directions;
- zero ramp primary-support loss;
- whole-body ramp impulse fraction within `0.05` of reference;
- ramp-end speed within `0.25 m/s`;
- peak torso tilt within `4°`;
- candidate mirrored speed gap ≤ `0.15 m/s`;
- candidate mirrored impulse-fraction gap ≤ `0.035`.

These preserve the E6/E7 rule:

> **Representation match before actuation.**

## 12. Natural boundary after E8.0b

E8.0a and E8.0b are complete at binding/composition level.

The selected direction is now narrower:

> **guided telescopic parallel support with a separate placement channel and finite compression-only axial compliance.**

But the architecture is not yet promoted. The next smallest causal gate is:

> **Can the branch be physically stowed and released/deployed without world authority, unintended preload, or an impulsive representation change?**

Do not yet:

- choose gameplay spring constants from `200 N` / `8 Hz`;
- add a permanent bilateral axial motor;
- run ground load-sharing or current31 translational-agency A/B;
- tune the branch against desired recover/fall outcomes;
- promote E8 into `src/` or Donor;
- build a full humanoid by default.
