# E6 — support-relative translation substrate

Status: **closed research stage / negative representation boundary / evidence only**

E6.0 stage base:

`2f341aed904ecdccf61b1264a77f849aeaa236fd`

E6.1 stage base after canonical E6.0 closure:

`17b040a5f83b39e8589bae48322f56de462d3725`

E6 did **not** change A‴ / Donor v1, browser runtime, public controls or accepted locomotion parameters.

## 1. Why E6 existed

E5 established two facts that create a real design fork:

1. anticipatory finite posture can recruit materially more real support load and horizontal contact momentum;
2. the current single-support organism still does not reproduce the full accepted A‴ translational response through contact alone.

A world-external residual can cover the gap, but E5 also showed that it changes system momentum accounting, displaces contact contribution and can mask a physically insufficient substrate.

Before selecting bounded gameplay assist, E6 asked:

> **Can we introduce a real bounded support-relative translational degree of freedom while preserving the already-qualified E5 finite-posture/support behavior closely enough to test whether support relocation can earn more translational agency physically?**

This is intentionally earlier than stepping, gait or humanoid locomotion.

## 2. Hard rule: representation match before actuation

E6 used a strict ordering:

1. qualify the candidate Box3D joint/binding;
2. insert the proposed translational DOF but lock it;
3. require the locked representation to reproduce the established E5 current-31 / lead-8 control within fixed tolerances;
4. only then may active support-relative translation be interpreted.

Representation gates required, in both sagittal directions:

- E5 reference remains `RECOVER`;
- candidate remains `RECOVER`;
- zero ramp support-loss frames;
- whole-body ramp horizontal impulse fraction within `0.05` of reference;
- ramp-end body speed within `0.25 m/s` of reference;
- peak torso tilt within `4°` of reference;
- mirrored candidate ramp-end speed within `0.15 m/s`;
- mirrored candidate impulse fraction within `0.035`.

E6.1 additionally measured direct world-space joint-anchor separation and required it to remain within `0.002 m` for the locked control.

Those thresholds were declared before observing the later failures and were not relaxed afterward.

Central methodological invariant:

> **Do not interpret an active new DOF if merely inserting and locking its representation already changes the qualified organism materially.**

## 3. E6.0a — prismatic binding calibration

Probe:

`scripts/e6-0a-prismatic-binding-calibration.mjs`

Purpose:

> Establish whether `box3d.js@0.1.1` exposes a usable mirrored, force-bounded prismatic joint aligned with project sagittal world-Z.

Calibration:

- zero gravity;
- static reference frame;
- dynamic slider;
- prismatic local X rotated onto world Z;
- translation limits `±0.25 m`;
- motor speed `±2.0 m/s`;
- max motor force `200 N`;
- `1/60 s × 4` substrate.

Result:

- positive motor ≈ `+0.251407 m` world Z;
- negative motor ≈ `-0.251407 m` world Z;
- no material X/Y leakage;
- mirrored bounded translation qualified.

Exact successful head:

`6414e434f7af04f58130e9d93d1d707607bd39e9`

Workflow:

`33680794741` — SUCCESS.

Verdict:

> **The required bounded prismatic binding capability exists.**

This is substrate evidence only.

## 4. E6.0b–d — serial carriage representation

Tested topology:

`support foot ↔ locked prismatic carriage ↔ spherical ankle ↔ torso`

All controls repeated the E5 current-strength launch:

- `31 m/s²` support acceleration;
- `5.2 m/s` target;
- lead `8` preparation frames;
- `320 Nm` finite posture authority;
- `μ = 0.95`;
- canonical `4` substeps.

### E6.0b — first serial representation

Probe:

`scripts/e6-0b-support-translation-representation-match.mjs`

Initial mass placement:

- support foot `9.5 kg`;
- carriage `0.5 kg`;
- torso `70 kg`;
- total `80 kg`.

Exact head:

`520279e47232b37ab6fbf267ba7770487cec2e01`

Workflow:

`33681076041`

Results:

| Direction | Reference | Locked | `Jx / required` | ramp-end speed | peak tilt | ramp support loss |
| --- | --- | --- | --- | --- | --- | --- |
| `-` | RECOVER | RECOVER | `0.671 → 0.673` | `4.341 → 4.443 m/s` | `14.08 → 19.62°` | `0 → 0` |
| `+` | RECOVER | RECOVER | `0.646 → 0.673` | `4.233 → 4.334 m/s` | `14.98 → 19.00°` | `0 → 0` |

Translation remained close but posture exceeded the declared match envelope.

A targeted correction reduced the carriage from `0.5 kg` to `0.05 kg` and restored the support foot to `9.95 kg`. Instead of rescuing the control, it collapsed:

- both directions changed RECOVER → FALL;
- `Jx / required` fell to about `0.12`;
- ramp-end speed fell to about `1 m/s`;
- peak tilt rose to about `47–48°`.

Exact head:

`a95a69abd4bcc012ae1efeb262ec870bee11a0a7`

Workflow:

`33681400869`

This falsified “the mismatch is primarily the 0.5 kg carriage mass” as an explanation.

### E6.0c — restore balance reaction to the real support foot

Probe:

`scripts/e6-0c-support-reaction-path-representation-match.mjs`

Correction:

- support foot `9.95 kg`;
- carriage `0.05 kg`;
- torso `70 kg`;
- balance torque closed directly torso ↔ support foot;
- carriage owned only the translation topology.

Exact head:

`513cc4dcf0831a7ee2fd21b140d0c9cc506b7841`

Workflow:

`33681760213`

Result remained strongly non-equivalent:

- both directions `UNRESOLVED`;
- `Jx / required ≈ 0.135`;
- ramp-end speed ≈ `1.05 m/s`;
- peak torso tilt ≈ `47°`;
- no formal ramp support loss.

So the failure was not explained solely by closing finite balance reaction through the wrong body.

### E6.0d — support-foot-preserving final serial control

Probe:

`scripts/e6-0d-support-foot-preserving-representation-match.mjs`

Final serial correction preserved the E5 support body exactly:

- support foot `10 kg`;
- carriage `0.5 kg`;
- torso `69.5 kg`;
- total `80 kg`;
- balance reaction torso ↔ support foot;
- prismatic locked.

Exact head:

`8834a18f22848ec1e7d6c69f9615279b477e174d`

Workflow:

`33682130865`

Results:

| Direction | Reference | Locked proxy | `Jx / required` | ramp-end speed | peak tilt | ramp support loss |
| --- | --- | --- | --- | --- | --- | --- |
| `-` | RECOVER | RECOVER | `0.671 → 0.664` | `4.204 → 4.279 m/s` | `14.08 → 20.38°` | `0 → 0` |
| `+` | RECOVER | RECOVER | `0.646 → 0.673` | `4.216 → 4.319 m/s` | `14.98 → 19.26°` | `0 → 0` |

This is the strongest E6.0 result:

- recoverability returned;
- ramp support remained continuous;
- physically earned horizontal impulse remained close;
- ramp-end body speed remained close;
- **posture still failed the predeclared `4°` representation threshold**.

Peak shifts were about `+6.30°` and `+4.28°`.

### Rejected E6.0 telemetry interpretation

E6.0d printed a `sliderRel` value based on carriage-COM minus foot-COM displacement. Foot rotation contaminates that signal, so it is explicitly rejected as a direct joint-translation measurement.

The E6.0 representation FAIL does not depend on it.

## 5. E6.0 verdict

E6.0 separated:

1. **prismatic binding capability:** PASS;
2. **faithful E5-relative serial representation:** FAIL.

Therefore:

> **A translationally similar result is not sufficient representation equivalence for embodied-player research. Topology itself is part of the mechanics.**

The serial carriage topology was not qualified for active support-relocation claims.

This did **not** reject support relocation generally.

E6.0 was canonicalized through PR #20 as squash:

`17b040a5f83b39e8589bae48322f56de462d3725`

Exact canonical main workflow:

`33684312865` — full smoke, build and Pages deployment SUCCESS.

## 6. Why E6.1 changed representation family

Read-only recovery of E3.1 clarified an important point: its observed support travel was movement of the existing physical foot across the world while the torso remained directly connected to that foot. There was no hidden serial carriage.

The E6.0 failure therefore suggested a more faithful candidate:

> preserve the same `10 kg` foot and `70 kg` torso and connect them directly with one two-body constraint exposing both sagittal ankle pitch and a latent support-relative translation.

A Box3D wheel joint was investigated **only as a solver primitive**, not as a semantic wheel:

- local joint X → world Z translation;
- local joint Z → world X sagittal rotation;
- no intermediate body;
- same total mass distribution as E5;
- finite balance reaction remains direct torso ↔ foot.

If its translational DOF could be locked without perturbing E5, later finite internal translation could have been tested without world-external propulsion.

## 7. E6.1a — direct two-body two-DOF binding calibration

Probe:

`scripts/e6-1a-wheel-two-dof-binding-calibration.mjs`

The joint frame was rotated so that:

- suspension translation acts on world Z;
- free spin acts on world X.

Calibration results:

- translation `+` → `[0, 0, +0.250000] m`;
- translation `-` → `[0, 0, -0.250000] m`;
- positive sagittal spin → `ω=[+2,0,0] rad/s` with no translation;
- negative sagittal spin → `ω=[-2,0,0] rad/s` with no translation.

Exact branch workflow:

`33684613545` — full smoke + build SUCCESS.

Verdict:

> **`box3d.js@0.1.1` exposes a clean two-body joint substrate with bounded sagittal translation plus free sagittal rotation.**

Again, this is a positive binding fact, not representation or locomotion qualification.

## 8. E6.1b — locked two-body representation gate

Probe:

`scripts/e6-1b-two-body-wheel-representation-match.mjs`

Candidate:

- exact E5 `10 kg` support foot;
- exact E5 `70 kg` torso;
- no carriage;
- direct two-body wheel-like constraint;
- suspension spring disabled;
- translation nominally locked to `±1e-5 m`;
- spin motor disabled;
- steering disabled;
- same direct `320 Nm` torso ↔ foot posture reaction;
- same current31 / lead8 / `μ=.95` / substep4 control.

Unlike E6.0d, E6.1b measured actual world-space separation of the two joint anchors derived from body transforms rather than using COM displacement as a proxy.

Exact head:

`ba7c2166a9c331f71038589f158505864125754e`

Workflow:

`33684828207` — expected representation gate FAILURE.

Results:

| Direction | Reference → candidate | `Jx / required` | ramp-end speed | peak tilt | support-relative foot travel | max anchor separation | ramp loss |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `-` | R → R | `0.671 → 0.676` | `4.204 → 4.207 m/s` | `14.08 → 14.57°` | `0.128 → 0.138 m` | `2.142 mm` | `0 → 0` |
| `+` | R → R | `0.646 → 0.616` | `4.216 → 4.018 m/s` | `14.98 → 12.06°` | `0.144 → 0.107 m` | `1.902 mm` | `0 → 0` |

The candidate was **far closer to E5 than the serial carriage representation**:

- RECOVER/RECOVER preserved;
- no ramp support loss;
- each direction individually remained inside the declared impulse, speed and peak-tilt differences.

But it still failed the complete representation contract:

1. negative-side max anchor separation `2.142 mm` exceeded the declared `2.0 mm` bound;
2. more importantly, candidate direction symmetry was outside the predeclared envelope:
   - candidate ramp-end speed gap ≈ `0.189 m/s` > `0.15 m/s`;
   - candidate `Jx / required` gap ≈ `0.060` > `0.035`.

The tiny anchor miss therefore was not the real reason to reject the representation. Relaxing `2.0 → 2.2 mm` would not make the candidate representation-equivalent.

## 9. E6.1c — exact-zero lock causal replay

Probe:

`scripts/e6-1c-exact-lock-representation-replay.mjs`

Before rejecting the two-body candidate, one potential control semantic error was isolated:

> did `±1e-5 m` accidentally leave enough nominal stroke to create the asymmetry?

E6.1c preserved the failed E6.1b script untouched as provenance and replayed the **same code, mechanics, thresholds and classifiers**, changing exactly one parameter:

`LOCK_EPS = 1e-5` → `LOCK_EPS = 0`

Exact replay head:

`43d64565db23bf707e93e2c370ad6a250940de06`

Workflow:

`33685036270` — expected representation gate FAILURE.

Results:

| Direction | Reference → candidate | `Jx / required` | ramp-end speed | peak tilt | support-relative foot travel | max anchor separation | ramp loss |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `-` | R → R | `0.671 → 0.675` | `4.204 → 4.204 m/s` | `14.08 → 14.52°` | `0.128 → 0.137 m` | `2.120 mm` | `0 → 0` |
| `+` | R → R | `0.646 → 0.616` | `4.216 → 4.019 m/s` | `14.98 → 12.08°` | `0.144 → 0.107 m` | `1.880 mm` | `0 → 0` |

The exact-zero replay was effectively the same mechanically:

- negative anchor miss remained ≈ `0.120 mm` above threshold;
- candidate speed mirror gap remained ≈ `0.185 m/s`;
- candidate impulse-fraction mirror gap remained ≈ `0.059`.

Therefore:

> **The E6.1 mismatch is not explained by the nominal ±10 μm lock stroke.**

No threshold was relaxed and no frame/mass/torque/friction/lead/substep tuning followed.

## 10. E6.1 verdict

E6.1 separates another pair of claims:

1. **direct two-body two-DOF binding capability:** PASS;
2. **faithful locked E5 representation:** FAIL under the declared full mirror contract.

This failure is subtler than E6.0:

- the candidate is close;
- recoverability and support continuity survive;
- single-direction metrics look plausible;
- but the candidate introduces a persistent directional asymmetry not present strongly enough in the reference to satisfy the declared representation gate.

That makes it dangerous as a substrate for a later active relocation test: any apparent directional benefit/cost could already belong to the replacement joint representation rather than the opened translation capability.

Therefore:

> **Do not unlock or motorize the E6.1 wheel-like translation DOF and then attribute resulting agency to support relocation. The control did not earn that causal right.**

## 11. Cumulative E6 result

Two structurally different attempts to hide a future support-relative translation inside the current ankle path have now failed representation qualification **before actuation**:

1. serial extra-body prismatic carriage — failed posture equivalence;
2. direct two-body wheel-like replacement constraint — much closer, but failed the complete locked mirror/constraint equivalence contract even under exact-zero translation lock.

This is stronger evidence than either failure alone.

Current retained interpretation:

> **Replacing or interposing the qualified E5 ankle constraint with a latent translational joint is itself mechanically consequential. The next physical-support experiment should not be another ankle-joint substitution/tuning exercise.**

And:

> **If we continue the physical branch, the next useful representation family should change the support set/contact topology while leaving the already-qualified primary foot↔torso ankle path intact in its inactive control.**

This points toward a minimal parallel/alternate support-effector or support-exchange experiment, **not** automatically a leg, gait or stepping architecture.

External bounded gameplay authority remains a live alternative. E6 does not decide between it and a physically richer support set.

## 12. What E6 does not prove

E6 does **not** prove that:

- support relocation is useless;
- multiple supports cannot increase physically earned agency;
- stepping is required or selected;
- humanoid legs are a good representation;
- another parallel support topology cannot preserve the primary E5 organism;
- bounded gameplay assist should now be selected;
- accepted A‴ `31/36 m/s²` agency should be weakened;
- a particular support-effector mass, reach, force or timing is correct.

No active E6 support-relative translation result is promoted because neither latent-joint representation passed its locked causal gate.

## 13. Smoke / evidence handling

Durable canonical-smoke candidates from E6 are the **positive binding qualifications**:

- `scripts/e6-0a-prismatic-binding-calibration.mjs`;
- `scripts/e6-1a-wheel-two-dof-binding-calibration.mjs`.

Negative representation probes remain executable provenance and should not keep canonical CI red:

- `scripts/e6-0b-support-translation-representation-match.mjs`;
- `scripts/e6-0c-support-reaction-path-representation-match.mjs`;
- `scripts/e6-0d-support-foot-preserving-representation-match.mjs`;
- `scripts/e6-1b-two-body-wheel-representation-match.mjs`;
- `scripts/e6-1c-exact-lock-representation-replay.mjs`.

A failed research gate must remain a failed gate in history; do not rewrite it into a synthetic PASS merely to preserve executable coverage.

## 14. Natural boundary after E6

The next high-information physical question is now:

> **Can a parallel/alternate support element be added in an inactive state without perturbing the qualified E5 primary foot↔torso organism, so that a later support-set change could be tested without replacing the ankle mechanics?**

The next experiment, if opened, should begin with **inactive non-interference**, not active movement.

It should answer only whether a second support-capable element can exist without materially changing the baseline when it is not participating.

Only after that gate passes would it make sense to test contact acquisition, support transfer or relocation.

Do not:

- tune the rejected serial prismatic chain;
- tune the wheel-like joint until its mirror threshold passes;
- unlock either failed latent translation representation;
- call the next support-set experiment stepping;
- build a humanoid gait system by inertia;
- weaken A‴ agency to make a prototype easier;
- choose solver substeps for preferred behavior;
- select external assist merely because two physical representations failed.

E6 closes at this boundary.