# E10 — One-piece support brace

Status: **CLOSED — transition substrate PASS, support-capacity hypothesis FAIL**

E10 deliberately returned to the already-qualified one-piece E7 support probe after E8/E9 showed poor representation economics for adding another serial constrained body.

The question was not whether a revolute joint can be made numerically stiff in isolation. The project-relevant question was:

> **After real E7 ground acquisition, can the existing one-piece probe↔torso revolute be latched at its acquired angle and turn that already-real contact into stable, regulatable body-load support without adding another inactive body/DOF?**

No E10 experiment changed Donor/runtime behavior.

## 1. Why E10 existed

E7 had already established:

- inactive one-piece parallel support representation — PASS;
- finite equal-and-opposite internal placement — PASS;
- real mirrored probe↔ground acquisition while the primary foot remained supported — PASS;
- meaningful quiet body-load sharing — FAIL;
- current31 demand-aligned stable dual-support takeover — FAIL.

E8/E9 then showed that trying to obtain axial compliance by splitting the one-piece probe imposed a representation cost before useful actuation. E10 therefore tested a deliberately simpler idea: keep the qualified one-piece probe and change only its existing revolute state **after** real support acquisition.

Hard rule throughout E10:

> **A clean latch transition is only a prerequisite. The mechanism must still prove meaningful and stable load sharing before any locomotion-authority claim is allowed.**

## 2. Pinned revolute latch procedure

Pinned Box3D source inspection showed that changing revolute limits with `SetLimits(...)` does not itself clear accumulated lower/upper limit impulses, while toggling limit enable state clears that cache.

Conservative E10 latch sequence:

```text
EnableLimit(false)
SetLimits(currentAngle, currentAngle)
EnableLimit(true)
```

The angle is measured from the live joint at the transition; it is not a hard-coded gameplay angle.

## 3. E10.0a — isolated current-angle latch transition

Script:

`scripts/e10-0a-revolute-current-angle-latch.mjs`

Purpose:

> Can the existing E7-style one-piece revolute be changed from wide limits to an exact current-angle brace at a nonzero acquired-like angle without a material neutral kick, and does the brace resist a finite angular challenge that moves a matched wide-limit control outside the already-declared lock envelope?

The specimen used an acquired-like angle near `±132°`, zero gravity/contact, and the unchanged `0.25°` lock envelope.

Results:

- direction `-`:
  - wide/free challenge drift `8.449258°`;
  - braced drift `0.010983°`;
  - neutral linear/angular speed after latch about `1e-6`;
- direction `+`:
  - wide/free challenge drift `8.449395°`;
  - braced drift `0.010983°`;
  - neutral linear/angular speed after latch about `1e-6`;
- direct and cache-reset paths were numerically identical in this calm interior-limit specimen.

Verdict: **PASS**.

Exact experimental head:

`3ba24d14d5f9ded504c8101030862de99b1d1d92`

Workflow:

`33701058163` — SUCCESS.

Interpretation:

> A current-angle revolute brace is viable as an isolated transition primitive. This is not load-bearing evidence.

## 4. E10.0b — real acquisition → brace transition continuity

Script:

`scripts/e10-0b-acquired-support-brace-transition.mjs`

Mechanics before transition were kept at exact E7.1/E7.2a values:

- one-piece `1 kg × 0.9 m` probe;
- total organism mass `80 kg`;
- target `±140°`, limit `±145°`;
- finite `18 Nm` equal-and-opposite placement actuator;
- canonical `1/60 s × 4` cadence;
- real persistent probe↔ground acquisition;
- `90` frame dual-support settle.

Matched arms differed only by whether the existing revolute was latched at its measured current angle. The placement actuator remained identical in both arms.

Predeclared gates reused paid-for boundaries:

- pre-latch `|relative ω| ≤ 0.16 rad/s`;
- first outer-frame differential whole-body impulse `≤ 0.8 N·s` — one existing E5 `3%` calibration band;
- brace drift `≤ 0.25°`;
- both supports continuous and clean;
- mirrored acquisition timing inside the existing E7.1 window.

Results:

### Direction `-`

- acquisition frame `25`;
- latch angle `-132.452°`;
- pre-latch relative speed `0.00284 rad/s`;
- differential first-frame whole-body impulse `0.0424 N·s`;
- brace drift `0.009508°`;
- no support loss or contamination.

### Direction `+`

- acquisition frame `25`;
- latch angle `+132.452°`;
- pre-latch relative speed `-0.00285 rad/s`;
- differential first-frame whole-body impulse `0.0445 N·s`;
- brace drift `0.018004°`;
- no support loss or contamination.

Verdict: **PASS**.

Exact experimental head:

`b4c960e9f6b298abfed83cf4941aea8ded888e90`

Workflow:

`33745277753` — SUCCESS, full research smoke + Donor smoke + production build.

Interpretation:

> Real E7 support acquisition can transition into the brace with a very small matched-arm momentum difference and clean dual-support continuity. Transition cleanliness is no longer the limiting unknown.

## 5. E10.1a — quiet settled body-load transfer

Script:

`scripts/e10-1a-braced-settled-load-transfer.mjs`

Purpose:

> Does the brace itself recruit meaningful settled upright body load onto the real probe support?

Both arms retained exact E7.1 mechanics and the finite `18 Nm` placement actuator. After real acquisition and the E7.2a `90` frame settle, only the candidate was braced. A further `30` frame continuation excluded latch transient from the `60` frame settled-load sample.

The load gate reused E5.0a/E7.2a unchanged:

- expected total support impulse `26.666667 N·s/frame`;
- one E5 calibration band `0.8 N·s`;
- probe own-weight impulse `0.333333 N·s`;
- meaningful probe body load `> 1.133333 N·s` in **both** calibrated channels;
- primary-foot unload `> 0.8 N·s`;
- total support within `26.666667 ± 0.8 N·s`.

The first mirrored arm already falsified the claim cleanly:

### Direction `-`

Unlatched control reproduced E7.2a:

- primary foot `26.4956 / 26.4877 N·s`;
- probe `0.1216 / 0.1790 N·s`;
- total `26.6171 / 26.6667 N·s`.

Braced candidate:

- primary foot `26.4848 / 26.4847 N·s`;
- probe `0.1812 / 0.1820 N·s`;
- total `26.6661 / 26.6667 N·s`;
- primary unload only `0.0107 / 0.0030 N·s`;
- brace drift `0.009508°`;
- both supports continuous and clean.

The script intentionally failed immediately after this arm rather than continuing a gate that was already falsified.

Verdict: **FAIL**.

Exact experimental head:

`c27a6a682431c092cbd9c0f4bacf4452a0ced712`

Workflow:

`33745694854` — FAILURE at the intended E10.1a gate.

Interpretation:

> Clean bracing does **not** spontaneously create meaningful upright body-load sharing. The probe remains far below even its nominal own-weight impulse in the final-scaled channel and far below the predeclared meaningful body-transfer threshold in both channels.

This result is negative provenance, not a reason to relax the load gate.

## 6. Why one final demand-aligned falsifier was justified

E10.1a answered a quiet-preload question. The more important unresolved E7 boundary was different:

> E7.2b showed that under the physically motivated current31 demand, the probe stayed grounded while the primary foot unloaded and the organism fell. Could a brace stabilize that **already-demonstrated load takeover** even though it does not create static preload by itself?

That is an orthogonal causal question, not a parameter rescue. E10 therefore allowed exactly one final test using the **unchanged E7.2b demand and E4.3 HOLD contract**.

No angle, torque, length, mass, timing, solver substep or tolerance sweep was opened.

## 7. E10.1b — demand-aligned brace stability

Script:

`scripts/e10-1b-demand-aligned-brace-stability.mjs`

Matched A/B:

- control: exact E7.2b one-piece support with wide probe revolute;
- candidate: identical mechanics plus only the already-qualified current-angle brace after real acquisition and settle.

Demand and success criteria were reused unchanged:

- effective-up target `atan2(31,20) = 57.17°` toward the acquired support side;
- finite primary posture authority `320 Nm`;
- `240` frame prepare window;
- E4.3 HOLD = target error `≤ 2°`, `|ω| ≤ 0.16 rad/s`, foot tilt `≤ 6°`, `30` consecutive stable frames;
- both supports must remain continuous and uncontaminated;
- meaningful probe load and primary unload must exceed the same E5/E7 quantitative gates;
- brace drift must remain `≤ 0.25°`.

The unlatched controls first had to reproduce the known E7.2b failure. They did.

### Direction `-`

Unlatched control:

- `FALL`;
- best target error `0.27°`;
- peak torso tilt `99.57°`;
- target-phase primary/probe support-loss frames `33 / 0`.

Braced candidate:

- `UNRESOLVED`, not HOLD;
- best target error `23.73°`;
- peak torso tilt `33.44°`;
- target-phase primary/probe support-loss frames `100 / 4`;
- brace drift `5.78656°` > `0.25°`.

Upright pre-demand accounting remained clean:

- primary `26.4848 / 26.4847 N·s`;
- probe `0.1812 / 0.1820 N·s`;
- total `26.6661 / 26.6667 N·s`.

### Direction `+`

Unlatched control:

- `FALL`;
- best target error `1.79°`;
- peak torso tilt `99.72°`;
- support-loss frames `10 / 0`.

Braced candidate:

- `UNRESOLVED`, not HOLD;
- best target error `23.33°`;
- peak torso tilt `33.84°`;
- primary/probe support-loss frames `73 / 6`;
- brace drift `5.63471°` > `0.25°`.

Upright pre-demand accounting:

- primary `26.4675 / 26.4723 N·s`;
- probe `0.1823 / 0.1950 N·s`;
- total `26.6498 / 26.6673 N·s`.

Verdict: **FAIL in both mirrors**.

Exact experimental head:

`668e6c75f60c1cdf427acf51c2a47c50300057fa`

Workflow:

`33746227536` — FAILURE at the intended E10.1b gate.

## 8. What E10.1b did and did not show

There is a real partial effect:

- the brace reduced peak torso excursion from a full `~99.6°` fall to `~33–34°`.

That is worth preserving as evidence. It is **not** enough to call the mechanism a survivor:

- neither mirror reached the existing HOLD criterion;
- the torso stalled more than `23°` away from demand target;
- primary support was absent for `73–100` target-phase frames;
- probe support was also lost for `4–6` frames;
- the exact-angle brace itself yielded by `~5.6–5.8°`, over twenty times the qualified `0.25°` envelope.

The interpretation that this large drift reflects limit compliance / coupled solver loading is plausible, but it is not necessary to the project decision and is not promoted as a proven root cause.

The causal decision does not depend on that diagnosis:

> **At the canonical substrate and already-qualified mechanics, this brace does not provide stable, regulatable dual-support load sharing under the demand that matters.**

## 9. E10 conclusion

Positive results:

1. current-angle revolute latching can be clean in isolation;
2. real acquired support can transition into that brace with negligible matched-arm impulse difference and no immediate support loss.

Negative results:

1. the brace does not recruit meaningful quiet upright body load;
2. under the exact current31 demand that previously exposed unstable support takeover, the brace materially moderates the fall but does not produce HOLD, does not maintain both supports, and does not remain inside its own qualified lock envelope.

Canonical E10 boundary:

> **A one-piece acquired parallel probe can be latched cleanly at low demand, but current-angle revolute bracing neither recruits meaningful static body load nor produces stable, regulatable dual-support load sharing under the previously failing current31 demand.**

Retained invariant:

> **Contact acquisition + a rigid brace is still not sufficient support capacity/regulation.**

Do **not** rescue this family by sweeping:

- brace angle;
- probe target/length/mass;
- `18 Nm` placement authority;
- `320 Nm` primary authority;
- latch timing;
- limit stiffness/softness;
- solver substeps;
- E4.3 HOLD thresholds;
- E5/E7 load thresholds.

E10 is closed before current31/current36 translational-agency testing because the more fundamental stable/regulatable load-sharing prerequisite failed.

## 10. Strategic consequence

E6–E10 now form a meaningful cumulative boundary:

- primary-path serial translation: representation failure;
- one-piece parallel support: representation + contact acquisition success, support regulation failure;
- split compliant support: isolated primitive success, embodied representation failure;
- rigid split: embodied representation failure even without compliance DOF;
- one-piece brace: clean transition success, support regulation failure.

The next stage should **not** recursively add anatomy merely because each simpler physical mechanism failed.

Return explicitly to the E5 fork and compare the remaining design classes by information/gameplay value:

1. a genuinely different minimal physical mechanism only if it introduces a new causal capability that E6–E10 did not already test;
2. an honest bounded nonreciprocal residual authority that preserves accepted A‴ agency while keeping physically earned contact contribution measurable and first-class.

Physical purity is not the project objective. A bounded assist is acceptable only if its contribution is explicit, support-conditioned where justified, separately accounted, and incapable of silently masking total physical-support failure.

No E10 result changes Donor v1 or the public runtime.