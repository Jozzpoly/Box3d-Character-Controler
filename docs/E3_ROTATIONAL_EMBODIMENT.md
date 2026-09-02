# E3 — Rotational Embodiment & Balance

Status: **active research line; experimental, not donor/current behavior**.

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
- The first crucible isolates sagittal pitch. Locomotion, stepping, roll, yaw, grabbing and articulated limbs are out of scope until the simpler experiment earns them.

## E3.0 — Angular substrate qualification

Before gameplay research, the exact qualified substrate (`box3d.js@0.1.1`) must demonstrate through the JS binding:

- central point impulse does not create material angular velocity;
- an off-center impulse creates signed angular velocity consistent with the lever arm;
- mirrored lever arms mirror the response;
- a larger lever arm produces a larger response;
- direct angular impulse reaches the rigid body;
- a spherical joint holds the shared point while still allowing angular motion.

Native API availability is not treated as proof of JS behavior.

### First executed result

On branch `experiment/e3-rotational-embodiment`, initial E3.0 qualification passed on exact branch commit `d74df480c5141829a2b1e24c8d43f810ca6e3a11`:

- central impulse: `0.00e+0 rad/s` angular X response;
- +0.25 m lever arm: `+1.0417 rad/s`;
- mirrored -0.25 m lever arm: `-1.0417 rad/s`;
- +0.50 m lever arm: `+2.0833 rad/s`;
- spherical-anchor drift after angular excitation: effectively `0 m` at reported precision;
- pinned body retained `3.9418 rad/s` angular speed.

This is sufficient evidence to continue using the current JS binding for the first balance crucible. It does **not** qualify every rotational/joint API for future articulated work.

## E3.1a — Sagittal standing-balance crucible

The first organism contains only:

1. a dynamic support plate representing a finite base of support;
2. a dynamic main body representing the majority of player mass;
3. a spherical ankle joint fixing the shared ankle point while allowing rotation;
4. an explicit finite internal pitch actuator.

The actuator uses torso world tilt and angular velocity to request a stabilizing torque, clamps that request to `maxTorque`, then applies equal-and-opposite angular impulses to torso and foot. The controller targets world-up without receiving a hidden world reaction. The foot/ground contact must carry the reaction physically.

The initial sagittal reduction locks lateral translation and non-pitch angular axes only to remove unrelated degrees of freedom. Translation in the tested support direction remains solver-owned.

### Authority scale

Raw torque is not interpreted as a human biomechanical claim. Project gravity is 20 m/s², so a useful scale is:

`supportMomentScale = totalMass × gravity × supportHalfExtent`

The first specimen uses finite torque below that static support-moment scale. This is a research normalization, not a universal balance law.

### Perturbation protocol

Machine trials use a known linear impulse at a known point above the torso center of mass. This gives controlled impulse magnitude, direction and lever arm before adding noisy rigid-body ram collisions.

The first sweep compares `passive` and `finite` authority, with mirrored pushes as a causal symmetry control.

### Observation and outcome

Telemetry includes torso/foot tilt, angular speed, centers of mass, applied balance torque, torque utilization and peak tilt.

`RECOVER`, `FALL` and `UNRESOLVED` are observational labels only. A fall is recorded after the torso exceeds a large tilt angle; recording it does not alter the dynamics.

The important durable artifact is the empirical **recoverability frontier**: which perturbations can be recovered from by a given physical capability set.

### First implementation falsifier

The first E3.1a CI attempt failed before the perturbation sweep because the supposedly quiet passive rig drifted to `0.022684 rad` torso pitch during setup. Inspection found a construction error rather than a balance-law result: the initial torso and foot spherical-joint anchors were separated by `0.055 m` in world Y, pre-loading the ankle constraint at creation.

The rig was corrected so the two local ankle anchors coincide exactly in the initial world transform before the next qualification run. This failure is retained as evidence: initial joint pre-stress can masquerade as spontaneous balance instability and must remain excluded from future specimens.

## Conditional continuation

If E3.1a demonstrates a real finite recovery region rather than a numerical artifact:

1. extend to 3D roll + pitch and real collision perturbations;
2. build a faithful browser balance playground for Owner judgement;
3. only if Owner judgement is positive, test whether one additional internal angular-momentum degree of freedom expands the recovery frontier;
4. only if that earns its complexity, investigate support relocation / stepping;
5. only later ask how discovered balance capabilities should coexist with A‴ locomotion.

No later stage is pre-approved merely by appearing in this list.
