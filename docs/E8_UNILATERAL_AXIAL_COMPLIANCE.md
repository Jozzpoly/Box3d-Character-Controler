# E8 — unilateral axial compliance

Status: **E8.0a binding/substrate qualification PASS; embodied support representation not yet selected or tested.**

This ledger records the first E8 result after E7 closed the tested single-hinge parallel support probe. It is deliberately narrower than a support, stepping or locomotion claim.

## 1. Why E8 exists

E7 established four different facts that must not be collapsed:

1. a parallel support-capable branch can preserve the qualified primary E5 organism while inactive;
2. finite internal actuation can place that branch into real probe↔platform contact in both sagittal directions;
3. merely acquiring the second contact does not make it carry meaningful body load in quiet upright settling;
4. when body demand shifts far enough toward the second contact, the primary foot can unload/lose support while the probe remains grounded, but the tested organism falls instead of establishing a stable dual-support HOLD.

The fourth observation sharpens the E7 diagnosis. The rigid revolute probe did not literally lack a reaction path between distal contact and torso: its joint already transmitted translational constraint reaction, and E7.2b demonstrated that the second support could participate strongly enough for the primary support to unload.

The more precise unresolved property is therefore:

> **Can a parallel physical support admit finite, gradual and regulatable load sharing instead of behaving like a rigid support-set transition/pivot takeover?**

This correction does not rewrite E7.2 into success. E7 still failed its declared stable-load-bearing gate, and the single rigid torso-COM hinged probe remains closed against torque/angle/length/mass/timing sweeps.

## 2. Candidate mechanism property

A Box3D distance joint exposes a spring force range with distinct tension and compression bounds. In the pinned `box3d.js@0.1.1` binding the relevant fields/functions include:

- `enableSpring`;
- `lowerSpringForce`;
- `upperSpringForce`;
- `hertz`;
- `dampingRatio`;
- `b3DistanceJoint_SetSpringForceRange(...)`;
- `b3Joint_GetConstraintForce(...)`.

Upstream Box3D semantics identify the lower spring-force bound with tension capacity and the upper bound with compression capacity. The solver clamps spring impulse to that configured force interval.

That makes a spring-only distance constraint with:

- `lowerSpringForce = 0`;
- finite positive `upperSpringForce`;

an interesting primitive-level candidate for **compression-only finite axial compliance**: it may push while compressed but should not pull while stretched.

This is a candidate property, not an architecture selection. A usable embodied support still needs a fair topology, inactive representation qualification, real contact/load transfer, robustness and eventually Owner judgement.

## 3. Corrected E8.0a question

E8.0a asks only:

> **Does the exact pinned Box3D binding provide a mirrored spring-only axial constraint that materially transmits finite compression while providing effectively zero tensile restoring authority?**

It does **not** ask whether this primitive can already serve as a leg, support set, load-sharing controller or source of translational agency.

## 4. Superseded draft — not evidence

The first branch draft at commit:

`8495708db4a9adf98a9b7b62f3e08dfdd4e73c73`

configured the distance joint with `enableSpring=false` while attempting to qualify limit/motor behavior. Review against Box3D semantics showed this was the wrong specimen: the rigid-distance mode does not test the intended spring/motor property fairly.

That draft was also absent from `scripts/smoke-suite.mjs`; its push workflow `33690555458` therefore validated only the pre-existing smoke/build surface.

Consequently:

> **The original draft and its green workflow are not E8.0a research evidence.**

The mistake is retained in Git history as provenance rather than rewritten as a successful experiment.

## 5. Final E8.0a specimen

Script:

`scripts/e8-0a-distance-joint-axial-binding-calibration.mjs`

Corrected implementation commit:

`0a2610ad44cc2abd39b40ecc0060abbbf41a6baa`

Exact validated branch head after adding the script to canonical research smoke:

`043d994db9d37dba3d6723fa8424573c52154ef3`

### Substrate

- outer `dt = 1/60 s`;
- `4` Box3D substeps;
- `box3d.js@0.1.1`;
- zero gravity;
- no contacts;
- no distance limit;
- no motor;
- static anchor;
- `20 kg` dynamic body;
- dynamic body linear X/Y locked, angular X/Y/Z locked, axial Z free;
- collision mask `0`.

### Spring configuration

- rest length `1.0 m`;
- spring enabled;
- `lowerSpringForce = 0 N`;
- `upperSpringForce = 200 N`;
- `hertz = 8 Hz`;
- damping ratio `1`.

Four fresh mirrored rigs are evaluated:

1. `+Z` compression from `0.8 m`;
2. `-Z` compression from `0.8 m`;
3. `+Z` tension from `1.2 m`;
4. `-Z` tension from `1.2 m`.

The specimen samples six outer frames and reads the actual generic joint constraint force rather than validating only stored configuration values.

## 6. Why the compression case should hit the cap

For the isolated static-anchor/`20 kg` body with COM anchors, axial effective mass is `20 kg`.

At `8 Hz` and `0.2 m` compression, the corresponding undamped linear spring scale is:

`m * (2πf)^2 * x ≈ 20 * (2π*8)^2 * 0.2 ≈ 10106.5 N`

This is more than `50×` the declared `200 N` compression cap.

Therefore material cap engagement is a derived expectation, not the result of a post-failure parameter sweep.

## 7. Predeclared gates

The final script requires:

- exact current Donor-v1 fixed-step substrate;
- required distance-joint/constraint-force bindings present;
- derived uncapped compression demand > `50×` the finite cap;
- spring enabled, motor disabled, limit disabled;
- configured `8 Hz` / damping ratio `1` retained;
- transverse body leak ≤ `1e-6 m`;
- transverse constraint force ≤ `1e-3 N`;
- compression peak axial force ≤ `201 N` and ≥ `190 N`;
- compression moves outward by at least `0.02 m`;
- tension peak axial force ≤ `0.1 N`;
- tension length change ≤ `1e-6 m`;
- mirrored compression final lengths agree within `1e-6 m`;
- mirrored compression peak forces agree within `1e-3 N`;
- mirrored tension final lengths agree within `1e-6 m`.

No threshold was relaxed after execution.

## 8. Exact result

Workflow:

`33692228730`

Exact head:

`043d994db9d37dba3d6723fa8424573c52154ef3`

Result: **SUCCESS**.

Measured E8.0a output:

- derived uncapped compression demand: `10106.5 N` vs finite cap `200.0 N`;
- `+Z` compression: `0.800000 → 0.852083 m`, peak axial force `200.000 N`, zero transverse force/leak;
- `-Z` compression: `0.800000 → 0.852083 m`, peak axial force `200.000 N`, zero transverse force/leak;
- `+Z` tension: `1.200000 → 1.200000 m`, peak axial force `0.000 N`, zero transverse force/leak;
- `-Z` tension: `1.200000 → 1.200000 m`, peak axial force `0.000 N`, zero transverse force/leak.

The same exact-head workflow also completed:

- research smoke: **66 scripts PASS**;
- Donor smoke: **4 scripts PASS**;
- production build: **PASS**;
- Pages configuration/deployment: correctly skipped on the experiment branch.

## 9. Qualified claim

E8.0a supports the following claim and no stronger one:

> **On the pinned canonical substrate, box3d.js exposes a mirrored spring-only distance-joint primitive that saturates at a finite declared compression force while producing effectively zero tensile restoring authority in the isolated axial specimen.**

This is useful because it gives E8 a solver-native candidate mechanism for finite unilateral axial compliance.

It does **not** prove:

- inactive embodied non-interference;
- a viable leg topology;
- suspension of a distal support body under gravity;
- ground-contact acquisition;
- stable dual-support load sharing;
- added contact-earned horizontal authority;
- gait, stepping or locomotion;
- gameplay feel.

## 10. Immediate topology problem exposed by the PASS

The primitive PASS does not automatically yield a fair embodied support.

A single compression-only distance joint attached to a real distal pad has a fundamental inactive-state issue under gravity: because it cannot sustain tension, by itself it cannot suspend an elevated distal body below the torso. Adding a world lock/kinematic hold would contaminate the physical representation; adding a second hard constraint without DOF analysis may overconstrain the branch.

Therefore the next experiment must **not** simply instantiate the distance joint inside the E5 organism and call it a leg.

Before another write, compare the smallest physically interpretable topologies that can simultaneously provide:

1. a real distal support body;
2. finite internal suspension/placement while inactive;
3. future finite axial compression/load sharing;
4. no world-anchored or kinematic cheat;
5. no duplicate hard constraint on the same DOF;
6. preservation of the exact primary E5 ankle path;
7. total organism mass `80 kg`;
8. a fair inactive representation gate before actuation/contact claims.

A minimal telescopic/articulated parallel limb is a candidate, not a commitment. E6 forbids blindly perturbing the qualified **primary ankle path**; it does not by itself forbid a carefully qualified prismatic/compliant DOF in a separate parallel branch.

## 11. Natural boundary

E8.0a is complete.

The next highest-value question is no longer whether the Box3D primitive exists. It is:

> **What is the smallest physically honest parallel topology that can keep a real distal support element internally attached/placed under gravity, expose finite unilateral axial compliance for future load sharing, and still pass inactive current31/lead8 representation matching?**

Do not yet:

- tune compression force for a desired gameplay outcome;
- add world-external support force;
- run current31 translational-agency A/B;
- promote any E8 mechanism into `src/` or Donor;
- build a full humanoid by default;
- treat the `200 N`, `8 Hz` binding specimen as gameplay constants.
