# E2.3d — production-path constraint-velocity specimen

Status: **machine-qualified A‴ candidate; Owner free-play required before any donor/baseline promotion**.

Base: current A″ / Donor v0 profile and contact semantics.

Canonical research input: E2.3c intent-capped surface-relative constraint-velocity survivor.

## Purpose

E2.3c identified a policy survivor in diagnostic shims. E2.3d asks a different question:

> Can that policy survive as a real runtime character implementation, preserve the previously qualified mechanics, remain isolated from A″ / Donor v0, and become suitable for direct Owner free play?

This stage does **not** promote A‴ to Donor v0, mutate the existing donor profile, change the default public mode, or declare the representation architecture final.

## Blast-radius decision

A tempting implementation was to add an opt-in policy hook to `ControllerOwnedCharacter`. E2.3d deliberately rejected that for the first production candidate.

Instead:

- `src/character.js` remains unchanged;
- A/A′/A″/Donor continue through their existing runtime path;
- `ConstraintVelocityCharacter` subclasses the current controller and overrides only `_solveMovement()`;
- the E2.3c constraint policy is isolated in `src/constraint-velocity.js`;
- A‴ still composes the current donor mechanical profile, causal-component reciprocity, and velocity-only dynamic-contact memory.

This creates a small amount of controlled duplication. At this stage that is intentional: experimental isolation is more valuable than prematurely refactoring a policy that has not yet won Owner free play. If A‴ is later accepted, shared integration can be reconsidered with behavioral evidence.

## Frozen A″ non-interference gate

Before the first candidate runtime change, a 360-tick A″/Donor trajectory was fingerprinted over:

- character position, velocity, external velocity and desired state;
- support/contact telemetry;
- full resettable playground body positions, rotations and linear/angular velocities.

Frozen pre-change fingerprint:

`e13a64ccd6cbd5c82ba4f18f1abf9fa1a7eae4ac06ba07a71ca08860f8e330c2`

Coverage:

- dynamic-contact frames: `106`;
- supported frames: `312`.

The fingerprint remains a canonical smoke gate. Candidate development must not change it.

## Runtime mechanism

`box3d.js@0.1.1` loses solved `b3CollisionPlane.push` across separate JS calls. A‴ does not patch the dependency and does not pretend the missing state is trustworthy.

For the candidate only:

1. call native `b3SolvePlanes` for the actual movement result;
2. reconstruct the vendored plane solver only to recover the missing per-plane `push` state;
3. compare reconstructed solved delta with native solved delta every candidate solve;
4. fail explicitly if divergence exceeds `2e-5`;
5. after existing dynamic reciprocity, apply the E2.3c policy only to active horizontal static/kinematic constraints;
6. calculate character and desired velocity relative to the surface point velocity;
7. retire only inward relative normal velocity exceeding current intent;
8. preserve tangent velocity;
9. leave dynamic-body consequence to causal reciprocity.

The largest measured reconstruction error in current A‴ qualification is about `6.61e-9`, far below the guard threshold.

## Production qualification matrix

The first production harness had a real test-design error: it counted clipping only after three neutral setup ticks and accidentally applied those three neutral ticks to tangent/diagonal cases. The mechanical neutral result was already correct (`~0 m` release, `0 m/s`), but the gate was not faithful to E2.3c. The test was corrected rather than weakening policy thresholds.

The corrected real-runtime matrix produced:

| case | A‴ result |
| --- | ---: |
| neutral low-blocker release | `0.000 m` |
| tangent unwanted normal release | `0.000 m` |
| tangent travel | `4.936 m` |
| 45° diagonal allowed normal velocity | `3.677 m/s` |
| held-forward normal velocity | `5.200 m/s` |
| held-forward blocker crossing | `13f` |
| stationary kinematic release | `0.000 m` |
| stairs | PASS |
| ledge | PASS |
| Owner dynamic anchor | `7f`, `87.697 N·s`, same tails/support |
| moving-support jump carry | `1.501 m/s`, `0.710 m @ .50s` |
| receding `4 m/s` kinematic wall, neutral | `4.000 m/s` |
| receding wall, held intent | `5.200 m/s` |
| two-plane corner neutral release | `0.000 / 0.000 m` |
| corner cap events | `2` |
| max reconstructed/native solve error | `6.61e-9` |

## Oblique / projection falsifier

Axis-aligned tests are insufficient for a normal-projection policy. A separate real-runtime test uses a wall yawed by `30°` and obtains the actual collision normal from mover planes.

Measured normal: `150.0°` in XZ.

### Immediate tangent switch

After sustained blocked motion, current intent switches immediately to the wall tangent while jumping clear.

- first normal velocity: `0.000 m/s`;
- normal travel: `0.000 m`;
- tangent travel: `2.735 m`;
- actual cap events: `1`.

### Partial inward intent

The desired direction contains a deliberate inward component (`0.5` relative to the tangent). The policy must preserve exactly the projected amount justified by intent rather than treating X/Z axes specially.

- expected allowed normal velocity: `-2.326 m/s`;
- measured first normal velocity: `-2.326 m/s`;
- measured tangent velocity: `2.954 m/s`;
- tangent travel: `1.517 m`;
- actual cap events: `1`;
- max reconstruction error: `5.08e-9`.

This materially strengthens the claim that the candidate implements a normal-space policy rather than an axis-specific patch.

## Public Owner gate

A‴ is exposed as a separate specimen:

- query: `?mode=constraint`;
- desktop shortcut: `6`;
- touch input uses the same `PlayerInput` intent path as donor/mobile;
- telemetry adds per-tick constraint cap count and reconstructed/native solve-delta error.

A/A′/A″/Donor remain available for direct comparison and the default mode remains unchanged.

## What Owner free play should judge

The next evidence is perceptual/interaction evidence, not another arbitrary tuning sweep. Useful questions include:

- Does leaving or jumping away from walls feel less like stored invisible propulsion?
- Does changing direction along a wall feel natural rather than sticky or over-corrected?
- Do diagonal approaches preserve enough agency?
- Do stairs, rough traversal, moving supports and dynamic-body interactions still feel like the accepted A″ baseline?
- Can the policy be noticed in helpful situations without making ordinary motion feel artificially sanitized?

Unexpected behavior should be captured as evidence before changing thresholds.

## Promotion boundary

Machine qualification means only that A‴ is safe enough to test publicly as a candidate.

Do **not** automatically:

- replace A″;
- update `DONOR_PROFILE_V0`;
- change `DONOR_API_VERSION`;
- move the candidate code into `ControllerOwnedCharacter`;
- patch `box3d.js`;
- tune the horizontal-normal threshold or solver tolerance because they look aesthetically inelegant;
- infer final architecture from this single policy success.

If Owner free play accepts A‴, the next decision is whether to promote the behavior as a new explicit donor profile/specimen and whether the isolated implementation should then be integrated/refactored. If Owner free play rejects it, preserve this machine evidence and localize the perceptual failure before changing policy.
