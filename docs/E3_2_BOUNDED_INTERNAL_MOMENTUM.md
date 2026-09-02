# E3.2 — bounded internal angular-momentum research ledger

Status: **mechanically qualified as a local/canonical-substrate phenomenon, rejected for promotion as a robust articulated capability in the tested representation**.

This ledger records the E3.2 branch honestly, including positive results, confounds, rejected interpretations and the final solver-resolution falsifier.

It does **not** promote a hip, humanoid architecture, runtime behavior, donor revision, feel tuning or solver setting.

## 1. Question

E3.1 established that the original always-active spherical-ankle organism accidentally contained an effectively unbounded unsupported reaction-mass channel.

E3.2 asked a narrower question:

> **Can one explicitly finite internal angular-momentum resource extend grounded recoverability after ankle authority saturates?**

The experiment was deliberately designed as a capability test, not an anatomical commitment.

## 2. Matched representation

The E3.2 laboratory organism keeps nominal total mass at `80 kg`:

- support/foot: `10 kg`;
- external torso: `60 kg`;
- internal reaction mass: `10 kg`.

The internal body:

- starts at the torso CoM;
- uses the same torso box dimensions for its inertia distribution;
- has collisions disabled (`maskBits = 0`);
- is connected to the external torso by one sagittal revolute DOF.

Matched passive and active controls contain the same three bodies and the same joint. The difference is only whether internal equal-and-opposite actuation is available.

Common E3.2 laboratory actuator envelope:

- ankle max torque: `320 Nm`;
- internal max torque: `160 Nm` in the main capacity studies;
- nominal drive-speed cutoff: `6 rad/s`;
- tested symmetric stroke commonly `±60°` after the capacity bracket;
- outer controller/physics cadence: `1/60 s`.

These are research parameters, not player constants or biomechanical claims.

## 3. E3.2a — representation neutrality and first capacity sweep

The split representation preserved the first passive angular response closely:

- canonical-ish reference `ω = 1.27745 rad/s`;
- split locked control `ω = 1.28489 rad/s`;
- difference about `0.58%`.

Locked and free-passive variants both reproduced a `72 N·s RECOVER / 80 N·s FALL` neighborhood.

At `±45°` stroke, increasing internal torque from `80` through `320 Nm` did **not** move that frontier.

Increasing available angular stroke did:

- `15°` → `72 R / 80 F`;
- `30°` → `72 R / 80 F`;
- `45°` → `72 R / 80 F`;
- `60°` → `80 R / 88 F`;
- `90°` → `80 R / 88 F`;
- `120°` → `80 R / 88 F`.

Initial interpretation:

> available exchange capacity mattered more than merely increasing instantaneous internal torque in this specimen.

This remained a local observation pending matched controls and robustness tests.

## 4. E3.2b — capacity crossover and angular-momentum conservation

At `80 N·s`, `160 Nm`:

- `45°` → FALL;
- `50°` → RECOVER;
- `55°` → RECOVER;
- `60°` → RECOVER;
- `65°` → RECOVER.

The first recovered trial used only about `0.026 m` support travel and did not lose the then-qualified reactive-support signal.

A zero-gravity/no-ground control computed total system angular momentum about X, including body spin and orbital CoM terms.

Observed maximum total-`Lx` drift:

- `45°`: about `0.020%`;
- `60°`: about `0.014%`.

Therefore the manual equal-and-opposite actuator was not borrowing a material hidden world angular impulse in that control. It redistributed angular momentum internally.

## 5. E3.2c — matched passive versus active ownership

At the same mass, geometry, joint and stroke:

| Stroke | Passive | Active |
| --- | --- | --- |
| `45°` | FALL | FALL |
| `50°` | FALL | RECOVER |
| `55°` | FALL | RECOVER |
| `60°` | FALL | RECOVER |
| `90°` | FALL | RECOVER |

This established that the local crossover was not caused merely by adding a free extra segment. Active internal redistribution owned the outcome change inside this canonical test configuration.

## 6. E3.2e/f — sign qualification and mirrored capacity boundary

The exact revolute sign convention was calibrated before interpreting a one-sided result:

- positive torso / negative internal impulse drives negative reported joint angle;
- `GetAngle` and B-minus-A relative angular velocity signs matched the harness assumption.

Mirrored `±80 N·s` capacity bracket at `160 Nm`:

- `45°`: passive F/F, active F/F;
- `50°`: passive F/F, active F/R;
- `55°`: passive F/F, active F/R;
- `60°`: passive F/F, active **R/R**;
- `65°`, `75°`, `90°`: passive F/F, active R/R.

The first symmetric canonical-substrate survivor was therefore `60°`.

The one-sided `50/55°` region is retained as a real bifurcation observation, not rewritten as a tuning mistake.

## 7. E3.2d/h/i — real-contact ecological falsification

A matched `35 kg` dynamic ram was then used instead of the idealized direct impulse.

At canonical `4` Box3D substeps the passive ecological frontier was symmetric:

- direction `-`: max recover `3.75 m/s`, min fall `4.0 m/s`;
- direction `+`: max recover `3.75 m/s`, min fall `4.0 m/s`.

Active manual internal redistribution produced:

- direction `-`: max recover `3.75 m/s`, min fall `4.0 m/s`;
- direction `+`: max recover `4.0 m/s`, min fall `4.25 m/s`.

Thus the apparent ecological benefit was only `+0.25 m/s` on one side.

E3.2h decomposed the mirrored `±4 m/s` contact trajectory. The first ram coupling was nearly mirrored and occurred in the same frame. The larger divergence appeared several solver steps later in the foot↔ground/support path, and a related asymmetry was already visible in passive contact evolution.

This rejected the simple story that the one-sided ram result came from a trivial ram-placement or hip-sign bug.

## 8. E3.2j — resource-phase trace

The failing side used about `720 N·m·s` of absolute internal actuator impulse versus about `72 N·m·s` on the recovered side.

A cancellation/thrashing hypothesis was tested and rejected:

- torque reversals: `0 / 0`;
- `|signed impulse| / absolute impulse = 1.000 / 1.000`.

The failing side instead spent many frames applying torque while the revolute configuration remained very near the hard angular limit. The simple software angle cutoff did not map cleanly onto solver-level constraint activity.

Important semantic correction:

> large `∫|τ|dt` is actuator effort, not energy and not by itself consumed angular-momentum capacity.

## 9. E3.2k/l — rejected actuator/limit interpretations

### Constraint-torque signal

`b3Joint_GetConstraintTorque` was tested as a possible physical hard-limit indicator.

It did not behave as a clean universal limit switch in the isolated and ecological traces. No threshold/policy was promoted.

### Native revolute motor

A solver-native motor was compared with the manual equal-and-opposite body-impulse actuator under matched mass, stroke, torque budget and nominal drive speed.

It conserved total angular momentum acceptably in zero-g, but did not improve robustness:

- manual direct `±80 N·s`: R/R;
- native motor direct: F/R;
- manual ecological frontier: `3.75 / 4.0 m/s` by direction;
- native motor ecological frontier: the same directional pattern.

Native motor was therefore rejected as a solution to the observed E3.2 asymmetry.

## 10. E3.2m — sequencing falsifier

A predeclared ankle-saturation dwell bracket tested whether delaying internal authority would produce a broad cleaner strategy:

`0, 1, 2, 3, 4, 6, 8, 12` outer frames.

Direct `±80 N·s`:

- `0` → R/R;
- `1` → F/R;
- `2` → F/R;
- `3+` → F/F.

At ram `4 m/s`:

- no tested dwell produced R/R;
- early dwells retained F/R;
- longer dwells degraded to F/F.

Therefore a simple "ankle first, hip later" delay was rejected. No timing constant was selected.

## 11. E3.2n — solver-resolution falsifier

This was the decisive robustness test.

Only Box3D solver resolution changed:

- outer `dt` stayed `1/60 s`;
- controller/actuator cadence stayed once per outer frame;
- mass, geometry, friction, gravity, torque budgets, stroke, drive cutoff, perturbations and classifiers stayed fixed;
- substeps swept `[1, 2, 4, 8]`.

Canonical `4` reproduced the previous E3.2 results exactly, validating the harness:

- direct passive F/F;
- direct active R/R;
- passive ram `3.75 R / 4.0 F` both directions;
- active ram at `4.0 m/s`: F/R.

### Direct `±80 N·s`

| Substeps | Passive `-/+` | Active `-/+` |
| ---: | --- | --- |
| `1` | R/F | R/R |
| `2` | F/F | F/F |
| `4` | F/F | R/R |
| `8` | F/F | F/F |

The previously strong canonical direct survivor is therefore **not robust across solver resolution**.

### 35 kg ram neighborhood

Tested speeds: `3.75 / 4.0 / 4.25 m/s`.

Observed coarse frontiers:

- `1` substep: passive and active recovered through the whole tested neighborhood on both sides;
- `2` substeps: passive fell already at `3.75`, while active recovered `3.75` and fell from `4.0` on both sides;
- `4` substeps: passive `3.75/4.0` both sides; active `3.75/4.0` on `-`, `4.0/4.25` on `+`;
- `8` substeps: passive itself became directional in this narrow bracket (`-` fell at `3.75`, `+` recovered `3.75`); active recovered `3.75` and fell at `4.0` on both sides.

This is not a monotonic convergence pattern. Outcome classifications and the apparent active-minus-passive benefit materially change with solver resolution.

### E3.2n verdict

> **The E3.2 manual bounded-internal-momentum specimen demonstrates a real local causal mechanism at the canonical `1/60 × 4-substep` substrate, but its recoverability benefit is not robust to solver resolution in the tested representation.**

Therefore the stronger statement "bounded articulation has now proven a robust physical recovery capability" is rejected.

No `16`-substep extension is justified by the current evidence because the `[1,2,4,8]` pattern is non-monotonic rather than a clear convergence trend.

## 12. Final evidence classification

### Retain as durable

- A finite internal DOF can redistribute angular momentum without material hidden world torque in the zero-g control.
- Under the canonical 4-substep research substrate, matched active redistribution can change direct recoverability while matched passive articulation does not.
- Available stroke/capacity materially affects that canonical result.
- The current ecological and even direct recovery boundaries are highly sensitive to solver resolution.
- Contact/support trajectory near the fall/recover frontier is a major co-owner of outcomes.
- Native revolute motor and simple ankle-first timing do not resolve the observed robustness problem.

### Reject / correct

- Do **not** call `60°` a player parameter or biomechanical optimum.
- Do **not** call `160 Nm` a tuned hip value.
- Do **not** infer robust ecological benefit from the one-sided canonical `+4 m/s` recovery.
- Do **not** infer robust articulated capability merely from canonical direct R/R.
- Do **not** treat absolute actuator impulse as energy/capacity consumption.
- Do **not** treat native motor representation as inherently more physical or robust.
- Do **not** tune substeps to obtain a preferred outcome.

## 13. Repository/runtime consequence

E3.2 remains research-only.

No E3.2 behavior is promoted into:

- `src/e3-balance-organism.js`;
- browser E3 playground behavior;
- A‴;
- Donor v1;
- any new donor revision.

The public E3 playground remains the earlier E3.1 experimental specimen.

The historical `scripts/e3-2d-mirror-and-dynamic-ram.mjs` intentionally retains its canonical `4 m/s` mirror failure. E3.2n demonstrated that this exact outcome is not a robust cross-resolution gate, so E3.2d should remain archaeology/falsification evidence rather than a required canonical smoke condition.

## 14. Natural boundary

E3.2 has earned **knowledge**, not promotion.

The immediate next move should **not** be another torque/stroke/gain/substep sweep or an attempt to make this particular specimen pass.

Reopen this line only when a new question can separate something genuinely new, for example:

- a different articulated representation whose recoverability claim is explicitly tested for substrate robustness;
- a physically motivated support/actuation strategy that changes the causal model rather than a tuning constant;
- a concrete gameplay need that makes finite internal angular momentum worth revisiting.

Otherwise return to the broader Embodied Player Laboratory question and select the next capability by information gain and Owner/project need.

Provenance at the decisive E3.2n run:

- branch: `experiment/e3-2-bounded-internal-momentum`;
- E3.2n-containing head: `b9cfcb38acb5f48dd233aff3e75d4a6c96dc662f`;
- workflow run: `33664593725`;
- E3.2n itself PASSed its canonical-reference and sensitivity gates;
- the workflow then failed at the deliberately retained E3.2d `4 m/s` canonical mirror assertion (`FALL / RECOVER`).
