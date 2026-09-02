# E3 — Rotational Embodiment & Balance

Status: **active research line; machine-qualified through E3.1b, awaiting Owner judgement in E3.1c; experimental, not donor/current behavior**.

## Why E3 exists

E2 through E2.3e established a current-best translational contract (A‴ / Donor v1). That line is deliberately not reopened here.

E3 asks:

> Can maintaining posture become a finite, physically negotiated capability of the player's body rather than a guaranteed property of the controller?

The target is not cosmetic lean or a binary ragdoll switch. It is a continuum in which player intent can spend finite physical authority to retain or recover control, while sufficiently strong world consequences can exhaust that authority and produce a natural loss of balance.

## Invariants

- Donor v1 / A‴ remains untouched and is the experiential control arm.
- E3 specimens are disposable until evidence earns promotion.
- Fall classification may observe state; it must never cause the fall.
- No `if tilt > threshold => ragdoll` transition is allowed as the mechanism of failure.
- Balance control must expose a finite authority budget.
- The first active actuator is internal: equal torque on the torso and opposite torque on the dynamic support body. It cannot borrow reaction torque from a world anchor.
- Locomotion, stepping, yaw, grabbing and articulated limbs remain out of scope until simpler balance evidence earns them.

## E3.0 — Angular substrate qualification

Before gameplay research, the exact qualified substrate (`box3d.js@0.1.1`) had to demonstrate through the JS binding:

- central point impulse does not create material angular velocity;
- an off-center impulse creates signed angular velocity consistent with the lever arm;
- mirrored lever arms mirror the response;
- a larger lever arm produces a larger response;
- direct angular impulse reaches the rigid body;
- a spherical joint holds the shared point while still allowing angular motion.

Native API availability was not treated as proof of JS behavior.

### Result

Initial E3.0 qualification passed on exact branch commit `d74df480c5141829a2b1e24c8d43f810ca6e3a11`:

- central impulse: `0.00e+0 rad/s` angular X response;
- +0.25 m lever arm: `+1.0417 rad/s`;
- mirrored -0.25 m lever arm: `-1.0417 rad/s`;
- +0.50 m lever arm: `+2.0833 rad/s`;
- spherical-anchor drift after angular excitation: effectively `0 m` at reported precision;
- pinned body retained `3.9418 rad/s` angular speed.

This is sufficient evidence to use the current JS binding for the first balance crucibles. It does **not** qualify every rotational/joint API for future articulated work.

## E3.1a — Sagittal standing-balance crucible

The first organism contains only:

1. a dynamic support plate representing a finite base of support;
2. a dynamic main body representing the majority of player mass;
3. a spherical ankle joint fixing the shared ankle point while allowing rotation;
4. an explicit finite internal pitch actuator.

The actuator uses torso world tilt and angular velocity to request a stabilizing torque, clamps that request to `maxTorque`, then applies equal-and-opposite angular impulses to torso and foot. The controller targets world-up without receiving a hidden world reaction. The foot/ground contact must carry the reaction physically.

The initial sagittal reduction locks lateral translation and non-pitch angular axes only to remove unrelated degrees of freedom. Translation in the tested support direction remains solver-owned.

### Authority scale

Raw torque is not interpreted as a human biomechanical claim. Project gravity is 20 m/s², so a useful normalization is:

`supportMomentScale = totalMass × gravity × supportHalfExtent`

For the 80 kg first organism and 0.34 m sagittal support half-extent this is about `544 Nm`.

This scale is a dimensional reference, **not** a universal balance predictor.

### First implementation falsifier

The first E3.1a CI attempt failed before the perturbation sweep because the supposedly quiet rig drifted to `0.022684 rad` torso pitch during setup. Inspection found a construction error rather than a balance-law result: the initial torso and foot spherical-joint anchors were separated by `0.055 m` in world Y, pre-loading the ankle constraint at creation.

The rig was corrected so the two local ankle anchors coincide exactly in the initial world transform. This failure is retained as evidence:

> Initial joint pre-stress can masquerade as spontaneous balance instability and must remain excluded from future specimens.

### Clean sagittal recoverability frontier

The corrected specimen demonstrated a bounded recovery region with `320 Nm` authority:

- passive control: natural fall throughout the tested `2..128 N·s` perturbation sweep;
- finite 320 Nm: recovery through `64 N·s`;
- first demonstrated natural fall at `80 N·s`;
- `64 N·s` recovery reached about `11°` peak tilt and saturated the torque budget;
- `80 N·s` crossed into a physical fall at about `93°` peak tilt;
- maximum foot translation among the recovered finite trials was only about `0.017 m`;
- mirrored perturbations produced matching outcomes;
- lowering foot friction to `0.18` did not materially move the demonstrated `48 recover / 80 fall` distinction.

Canonical clean-frontier run: `33578418890`.

The result rejects the explanation that ordinary finite recovery is merely the whole support plate sliding under the body.

### Authority-dependence falsifier

Keeping geometry and `Kp/Kd` fixed while changing only maximum internal balance torque moved the empirical frontier:

| max torque | fraction of 544 Nm reference | max demonstrated recovery | first demonstrated fall |
| ---: | ---: | ---: | ---: |
| 80 Nm | 0.15× | 12 N·s | 24 N·s |
| 160 Nm | 0.29× | 24 N·s | 36 N·s |
| 240 Nm | 0.44× | 48 N·s | 64 N·s |
| 320 Nm | 0.59× | 64 N·s | 80 N·s |

At `480 Nm`, the organism recovered stronger tested perturbations, but the `128 N·s` trial moved the support about `1.24 m`. At that point the experiment is no longer cleanly ankle-dominant and begins recruiting **support relocation** as a different physical capability.

Canonical authority run: `33578549695`, branch commit `5652e6ba06a1d8ff0d66b5aeeef6fef0bd920f64`.

This is a central E3 finding:

> **Recoverability changes with finite physical authority, and increasing authority far enough can recruit a qualitatively different recovery channel rather than merely making the same controller stronger.**

`320 Nm` is therefore retained as the first clean research specimen, not because it is a final tuning value but because it provides both recovery and natural failure while keeping recovered support relocation small.

## E3.1b — 3D pitch/roll balance

The same organism was then extended from sagittal pitch into world-space pitch + roll while keeping yaw outside the problem.

The control law remains the same hypothesis:

- derive body-up from the solver quaternion;
- use `cross(bodyUp, worldUp)` as the pitch/roll correction axis;
- damp horizontal angular velocity;
- clamp the whole horizontal torque vector to one finite budget;
- apply equal-and-opposite angular impulses to torso and dynamic support.

The first passive 3D harness exposed another useful harness error: it required an unactuated inverted pendulum to remain exactly upright for a long quiet period. That assumption was removed. Passive now acts only as the physically unstable negative control; strict quiet-state qualification applies to the active specimen.

### 3D direct-perturbation result

At `320 Nm`:

- **forward:** recover through `64 N·s`, fall from `80 N·s`; maximum recovered foot travel about `0.009 m`;
- **side:** recover through `80 N·s`, fall from `96 N·s`; maximum recovered foot travel about `0.083 m`;
- **diagonal:** recover through `80 N·s`, fall from `96 N·s`; maximum recovered foot travel about `0.033 m`;
- mirrored perturbations passed their symmetry controls;
- every direction demonstrated both recovery and natural fall.

Canonical 3D run: `33578768329`, head `4be0f5310e12d85af5686969e411c2b4cb49989b`.

The forward 3D frontier closely reproduced the earlier sagittal frontier, strongly arguing that the first result was not merely a 1D harness artifact.

The side result is also an important caution. Its recoverability was stronger by impulse than a naive comparison of the narrower static support dimension would predict. Therefore:

> static `mass × gravity × support radius` is a useful normalization, not a predictor of the dynamic recovery frontier.

Geometry, inertia, controller authority and contact dynamics jointly determine the result.

### Real dynamic-body ram

Directly injected impulses are useful causal probes but not sufficient ecological evidence. A second E3.1b gate therefore used a real `35 kg` dynamic rigid-body ram striking the upper torso through ordinary Box3D contact.

With the same `320 Nm` organism:

- `1.0 m/s` — recover;
- `1.5 m/s` — recover;
- `2.0 m/s` — recover;
- `2.5 m/s` — recover;
- `3.0 m/s` — recover, about `7.7°` peak tilt;
- `4.0 m/s` — natural fall, about `91°` peak tilt;
- `5.0..10.0 m/s` — natural fall;
- maximum support translation in recovered ram trials was about `0.038 m`.

Canonical dynamic-ram run: `33578936583`, branch commit `8adedbb3e26174f8e494f71578fffa94348a330b`.

This establishes that the balance/fall distinction survives a real contact pathway rather than existing only under idealized direct impulse injection.

## E3.1c — Owner balance playground

After machine qualification, a deliberately small browser instrument was added behind:

- `?mode=balance`
- `?mode=e3`

It does **not** replace the normal runtime and is explicitly labeled experimental / not donor.

The Owner playground provides:

- direct solver rendering of dynamic foot, torso and 35 kg ram;
- no procedural character lean or animation authority;
- world-up orbit camera;
- selectable authority: `0 / 160 / 320 / 480 Nm`;
- selectable ram speed and forward/back/left/right/diagonal launch directions;
- reset;
- live body tilt, horizontal angular speed, torque utilization and support travel.

Changing authority resets the organism so comparisons remain understandable. The browser path intentionally contains **no locomotion**: this gate asks whether physical self-stabilization and loss of balance are experientially meaningful before locomotion contaminates the judgement.

Branch browser/build qualification: run `33579122379`, head `930366d15eba7bcb02830f064eafdf00b0177907`, full smoke + production build PASS.

### Current evidence boundary

Machine evidence now supports all of the following:

1. the exact JS angular substrate is sufficient for this research line;
2. finite internal angular authority creates a real bounded recoverability frontier;
3. the frontier moves when the authority budget changes;
4. excessive authority can recruit support relocation as a distinct mechanism;
5. the phenomenon survives 3D pitch/roll and ordinary dynamic rigid-body contact;
6. current Donor v1/A‴ remains regression-clean throughout the experimental branch.

Machine evidence does **not** establish that this behavior is enjoyable, readable, appropriately physical or worth integrating into a controllable player.

The next required evidence class is therefore **Owner hands-on judgement** in E3.1c.

## Conditional continuation after Owner judgement

If Owner judgement says the physical balance struggle is genuinely valuable, the next high-information question is not generic polish. It is whether one additional internal angular-momentum degree of freedom can recover states that the ankle-dominant organism cannot.

That would be the first E3.2 test of whether articulation earns its complexity as a new physical capability rather than decoration.

Only if that result is valuable should support relocation / stepping be opened deliberately. Locomotion + balance integration comes later still.

No later stage is pre-approved merely by appearing here.
