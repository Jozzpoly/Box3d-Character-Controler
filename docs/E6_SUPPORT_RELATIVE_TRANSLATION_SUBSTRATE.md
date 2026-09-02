# E6 — support-relative translation substrate

Status: **closed research stage / negative representation boundary / evidence only**

Stage base `main` at opening:

`2f341aed904ecdccf61b1264a77f849aeaa236fd`

E6 did **not** change A‴ / Donor v1, browser runtime, public controls or accepted locomotion parameters.

## 1. Why E6 existed

E5 established two facts that create a genuine design fork:

1. anticipatory finite posture can recruit materially more real support load and horizontal contact momentum;
2. the current single-support organism still does not reproduce the full accepted A‴ translational response through contact alone.

A world-external residual can cover the gap, but E5 also showed that it changes system momentum accounting, displaces contact contribution and can mask a physically insufficient substrate.

Before selecting bounded gameplay assist, E6 asked a narrower physical question:

> **Can we introduce a real bounded support-relative translational degree of freedom while preserving the already-qualified E5 finite-posture/support behavior closely enough to test whether support relocation can earn more translational agency physically?**

This is intentionally earlier than stepping, gait or humanoid locomotion. A translational support DOF must first earn a clean causal substrate.

## 2. Experimental rule: representation match before actuation

E6 adopted a hard ordering:

1. qualify the Box3D prismatic binding;
2. insert the proposed DOF but lock it;
3. require the locked representation to reproduce the established E5 current-31 / lead-8 control within fixed tolerances;
4. only then would active support-relative translation be interpretable.

The representation gate required, in both sagittal directions:

- reference E5 case remains `RECOVER`;
- locked proxy remains `RECOVER`;
- zero ramp support-loss frames;
- whole-body ramp horizontal impulse fraction within `0.05` of reference;
- ramp-end body speed within `0.25 m/s` of reference;
- peak torso tilt within `4°` of reference;
- mirrored locked speed within `0.15 m/s`;
- mirrored locked impulse fraction within `0.035`.

Those thresholds were declared before the later representation corrections and were not relaxed after failures.

Central methodological rule:

> **Do not interpret an active new DOF if merely inserting and locking its representation already changes the qualified organism materially.**

## 3. E6.0a — prismatic binding calibration

Probe:

`scripts/e6-0a-prismatic-binding-calibration.mjs`

Purpose:

> Establish whether `box3d.js@0.1.1` exposes a usable mirrored, force-bounded prismatic joint aligned with the project sagittal world-Z axis.

Declared calibration:

- zero gravity;
- static reference frame;
- dynamic slider;
- local prismatic X rotated onto world Z;
- translation limits `±0.25 m`;
- motor speed `±2.0 m/s`;
- maximum motor force `200 N`;
- current `1/60 s × 4` execution substrate.

Result:

- positive motor: approximately `+0.251407 m` world Z;
- negative motor: approximately `-0.251407 m` world Z;
- no material X/Y leakage;
- mirrored limit behavior qualified.

Exact successful head:

`6414e434f7af04f58130e9d93d1d707607bd39e9`

Workflow run:

`33680794741`

Result:

- full preceding research smoke: SUCCESS;
- E6.0a: SUCCESS;
- production build: SUCCESS;
- Pages skipped as expected off `main`.

Verdict:

> **The required bounded prismatic DOF exists in the pinned JS binding.**

This is binding/substrate evidence only. It says nothing yet about whether inserting that DOF yields a faithful embodied-player representation.

## 4. E6.0b — first locked serial representation

Probe:

`scripts/e6-0b-support-translation-representation-match.mjs`

Topology:

`support foot ↔ locked prismatic carriage ↔ spherical ankle ↔ torso`

First mass placement:

- support foot `9.5 kg`;
- carriage `0.5 kg`;
- torso `70 kg`;
- total `80 kg`.

Finite balance torque initially closed through torso ↔ carriage.

The control repeated the E5 current-strength launch:

- `31 m/s²` support acceleration;
- `5.2 m/s` target;
- lead `8` finite preparation frames;
- `320 Nm` posture authority;
- `μ = 0.95`;
- canonical `4` substeps.

Exact run:

`33681076041`

Exact head:

`520279e47232b37ab6fbf267ba7770487cec2e01`

Results:

| Direction | Reference | Locked | `Jx / required` | ramp-end body speed | peak torso tilt | ramp support loss |
| --- | --- | --- | --- | --- | --- | --- |
| `-` | RECOVER | RECOVER | `0.671 → 0.673` | `4.341 → 4.443 m/s` | `14.08 → 19.62°` | `0 → 0` |
| `+` | RECOVER | RECOVER | `0.646 → 0.673` | `4.233 → 4.334 m/s` | `14.98 → 19.00°` | `0 → 0` |

The representation preserved translation surprisingly well, but failed the predeclared posture-match threshold.

This mattered because the target capability is not “horizontal speed at any internal mechanical cost”. E5 had already qualified a finite-posture organism; a bridge that materially changes posture dynamics is not a clean causal continuation of that evidence.

### E6.0b correction — reducing carriage mass did not rescue the representation

A specific confound was then tested rather than relaxing the threshold: the first proxy had moved `0.5 kg` from the support foot COM to the ankle carriage.

The carriage was reduced to `0.05 kg` and the support foot restored to `9.95 kg`, while torque still reacted through the carriage.

Exact run:

`33681400869`

Exact head:

`a95a69abd4bcc012ae1efeb262ec870bee11a0a7`

Results:

| Direction | Reference → proxy | `Jx / required` | ramp-end speed | peak torso tilt | ramp support loss |
| --- | --- | --- | --- | --- | --- |
| `-` | RECOVER → FALL | `0.671 → 0.122` | `4.341 → 0.930 m/s` | `14.08 → 48.31°` | `0 → 3` |
| `+` | RECOVER → FALL | `0.646 → 0.125` | `4.233 → 1.051 m/s` | `14.98 → 46.79°` | `0 → 3` |

This falsified the idea that the mismatch was primarily “too much mass moved into the carriage”. A nearly massless carriage receiving the finite balance reaction was mechanically pathological.

## 5. E6.0c — restore the balance reaction to the support foot

Probe:

`scripts/e6-0c-support-reaction-path-representation-match.mjs`

The next correction addressed a causal topology error rather than tuning a result:

- support foot `9.95 kg`;
- carriage `0.05 kg`;
- torso `70 kg`;
- prismatic still locked;
- finite balance torque closed directly torso ↔ support foot;
- carriage owned translation topology only.

No representation-match threshold was relaxed.

Exact head:

`513cc4dcf0831a7ee2fd21b140d0c9cc506b7841`

Workflow run:

`33681760213`

Results:

| Direction | Reference → proxy | `Jx / required` | ramp-end speed | peak torso tilt | support-relative foot drift | ramp support loss |
| --- | --- | --- | --- | --- | --- | --- |
| `-` | RECOVER → UNRESOLVED | `0.671 → 0.135` | `4.204 → 1.047 m/s` | `14.08 → 46.97°` | `0.128 → 1.183 m` | `0 → 0` |
| `+` | RECOVER → UNRESOLVED | `0.646 → 0.135` | `4.216 → 1.048 m/s` | `14.98 → 46.92°` | `0.144 → 1.184 m` | `0 → 0` |

The proxy no longer formally lost reactive support during the ramp, yet posture and physically transferred horizontal momentum still collapsed.

Verdict:

> The failure was not explained solely by closing the balance reaction through the wrong body.

## 6. E6.0d — final support-foot-preserving representation gate

Probe:

`scripts/e6-0d-support-foot-preserving-representation-match.mjs`

This was explicitly declared as the final representation correction before rejecting the serial prismatic chain for E5-relative claims.

The most important E5 support body was preserved exactly:

- support foot: exact original `10 kg`;
- carriage: `0.5 kg`;
- torso: `69.5 kg`;
- total: `80 kg`;
- balance reaction: torso ↔ support foot;
- prismatic: locked;
- same E5 current-31 / lead-8 / `320 Nm` / `μ=.95` / substep-4 control.

Exact branch head for the final gate:

`8834a18f22848ec1e7d6c69f9615279b477e174d`

Workflow run:

`33682130865`

Results:

| Direction | Reference | Locked proxy | `Jx / required` | ramp-end body speed | peak torso tilt | ramp support loss |
| --- | --- | --- | --- | --- | --- | --- |
| `-` | RECOVER | RECOVER | `0.671 → 0.664` | `4.204 → 4.279 m/s` | `14.08 → 20.38°` | `0 → 0` |
| `+` | RECOVER | RECOVER | `0.646 → 0.673` | `4.216 → 4.319 m/s` | `14.98 → 19.26°` | `0 → 0` |

This is the strongest E6.0 result and the reason the final verdict must remain nuanced:

- recoverability returned in both directions;
- ramp support was retained;
- physically earned whole-body horizontal impulse was very close to the E5 reference;
- ramp-end body speed was very close to the E5 reference;
- **posture dynamics still failed the predeclared representation gate**:
  - negative direction peak shift about `+6.30°`;
  - positive direction peak shift about `+4.28°`;
  - threshold was `4°`.

### Rejected telemetry interpretation

E6.0d also printed a `sliderRel` value computed from carriage-COM minus foot-COM displacement.

That is **not a valid direct measurement of prismatic joint translation** when the foot rotates. The value is retained in historical script output but is explicitly rejected as evidence for whether the locked joint itself translated materially.

The final E6.0 representation verdict does not depend on that signal. It follows from the valid posture mismatch alone, while the earlier E6.0b/c probes provide stronger corroborating failures.

## 7. Central result

E6.0 separates two claims that would otherwise be easy to conflate:

1. **Binding capability:** PASS — a bounded sagittal prismatic DOF is available in `box3d.js@0.1.1`.
2. **Faithful E5-relative serial representation:** FAIL — inserting a locked `foot → prismatic carriage → spherical ankle → torso` chain changes the organism's posture mechanics beyond the declared match envelope.

The final proxy is especially informative because translational accounting remained close while posture dynamics moved materially.

Therefore:

> **A translationally similar result is not sufficient representation equivalence for embodied-player research. Topology itself is part of the mechanics.**

And:

> **The serial prismatic chain is not qualified as a clean E5-relative substrate from which to claim that active support relocation earns more physical agency.**

## 8. What E6.0 does not prove

E6.0 does **not** show that:

- support relocation is useless;
- stepping is unnecessary or impossible;
- multiple support contacts cannot help;
- another organism representation cannot preserve E5 posture while adding translation;
- bounded gameplay assist should now be selected;
- the A‴ `31/36 m/s²` response should be weakened;
- a particular motor force, stroke, timing or support policy is correct.

No motorized support-relocation experiment was interpreted.

**E6.1 was intentionally not opened.**

The failed representation gate prevented a confounded active test.

## 9. Smoke / evidence handling

Durable canonical smoke retains:

- `scripts/e6-0a-prismatic-binding-calibration.mjs`

because the binding qualification is a stable positive substrate fact.

E6.0b/c/d remain in the repository as falsification/provenance evidence but are intentionally not mandatory canonical smoke gates. Their purpose is to record why this representation was rejected, not to keep CI permanently red or to convert a negative experiment into an artificial PASS.

## 10. Natural boundary

The next physical question is now narrower than after E5:

> **What organism/contact representation can add a real support-relocation degree of freedom without materially changing the already-qualified finite-posture/support behavior before that DOF is even actuated?**

Possible future families may include different parallel/alternate support topology, multiple real support contacts or another organism representation, but E6.0 selects none of them.

The immediate lesson is methodological rather than architectural:

> **Representation equivalence must be earned before active capability claims.**

Stop here. Do not motor-tune the rejected serial chain, do not rename support relocation as stepping, and do not select external assist merely because this representation failed.