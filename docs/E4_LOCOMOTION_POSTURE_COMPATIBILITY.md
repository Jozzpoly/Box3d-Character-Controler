# E4 — Locomotion ↔ finite-posture compatibility

Status: **closed research stage / evidence only**

Base canonical `main` when the stage began:

`ae8affcc5e9c7fd70b24e009f42fa25c45548168`

E4 does **not** modify A‴ / Donor v1, E3 runtime mechanics, browser behavior, or any donor contract. All E4 implementation is research-harness code.

## 1. Why E4 existed

E3.1 established an Owner-positive phenomenon: a body whose right to remain upright is finite can produce a readable physical struggle for posture.

A‴ / Donor v1 simultaneously remains the accepted locomotion behavior, with its current profile including:

- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- gravity `20 m/s²`;
- fixed outer step `1/60 s`;
- canonical `4` Box3D substeps.

The next useful question was not yet “integrate E3 into Donor”. It was earlier and more falsifiable:

> **Can the translational agency envelope already accepted in A‴ coexist with finite physical posture, or does naive combination make the two capabilities mechanically incompatible?**

E4 intentionally used a kinematic support carriage beneath the E3 sagittal organism. The carriage reproduces the inertial demand associated with an acceleration/deceleration profile while preserving a simple, well-understood support/contact path.

This is an **inertial compatibility proxy**, not an embodied locomotion implementation.

## 2. Important representation boundary

Re-reading the actual A‴ implementation during E4 closure matters to interpretation.

A‴ is a controller-owned mover representation:

- intent is integrated into controller-owned horizontal velocity;
- mover/plane solving advances controller-owned position;
- `virtualMass` supports reciprocity against dynamic contacts, but accepted locomotion is not produced by applying a rigid-body propulsion force to an articulated body.

Therefore the E4 carriage must not be described as “almost A‴ + E3 integration”. It asks whether the accepted **kinematic response profile** is compatible with finite posture under an equivalent inertial demand.

The unresolved bridge after E4 is deeper:

> **Where should accepted translational authority physically enter an embodied organism, and how should that authority remain legible/reciprocal without simply restoring controller-owned immunity to physical consequence?**

## 3. Common E4 specimen

Unless a probe explicitly varies solver resolution:

- E3 sagittal support/torso organism;
- finite posture authority `320 Nm`;
- same research mass/geometry as the E3.1 sagittal specimen;
- support carriage: kinematic Box3D body;
- carriage friction `0.95`;
- gravity `20 m/s²`;
- outer `dt = 1/60 s`;
- canonical `4` substeps;
- target speed `5.2 m/s`;
- mirrored `±` directions;
- reactive support evidence uses the E3.1 diagnostic `touching OR solver-loaded` interpretation.

The E4 outcome classifier remains a research classifier. No E4 PASS proves gameplay feel.

## 4. E4.0 — naive acceleration compatibility

Probe:

`scripts/e4-0-locomotion-acceleration-compatibility.mjs`

The carriage accelerated from rest to `5.2 m/s` with world-upright posture control. Finite acceleration sweep:

`[4, 8, 12, 16, 20, 24, 31] m/s²`.

Key finite-320 result:

- `4 m/s²` — RECOVER / RECOVER;
- `8 m/s²` and every larger tested magnitude through current `31 m/s²` — FALL / FALL.

At current A‴ `31 m/s²`, the organism reached roughly `100°` peak tilt and lost support.

Durable result:

> **Naively combining current A‴ acceleration magnitude with finite world-upright posture is mechanically incompatible in this proxy.**

Non-claim:

This is **not** evidence that accepted A‴ acceleration should be reduced. The purpose of later E4 probes was to test whether posture strategy, rather than weaker agency, could resolve part of the conflict.

## 5. E4.1 — acceleration magnitude vs duration / Δv

Probe:

`scripts/e4-1-acceleration-duration-decomposition.mjs`

Matrix:

- acceleration `[8, 16, 31] m/s²`;
- target Δv `[0.5, 1.0, 2.0, 3.0, 5.2] m/s`;
- mirrored directions.

Results:

| Accel | `0.5` | `1.0` | `2.0` | `3.0` | `5.2` |
| ---: | --- | --- | --- | --- | --- |
| `8` | R/R | R/R | R/R | F/F | F/F |
| `16` | R/R | R/R | F/F | F/F | F/F |
| `31` | R/R | R/R | F/F | F/F | F/F |

Durable correction:

> **Peak acceleration alone is not the complete incompatibility variable.**

Even current `31 m/s²` is survived when applied only long enough to create `0.5–1.0 m/s` Δv. The failure depends on the evolution of posture over the acceleration episode / accumulated velocity change.

## 6. E4.2 — effective-up posture target

Probe:

`scripts/e4-2-effective-up-lean-falsifier.mjs`

Compared:

1. always target world-up;
2. during carriage acceleration, target the acceleration-aligned effective-up direction:

`theta = atan(a / g)`.

No torque, support, friction or translational parameters changed.

Results:

- `8 m/s²`: upright F/F → effective-up **R/R**;
- `16 m/s²`: F/F → F/F;
- `31 m/s²`: F/F → F/F.

At `8`, required effective-up lean is about `21.8°`.

Durable result:

> **Posture interpretation can preserve a stronger translational demand without increasing posture authority or weakening the translational profile.**

But merely targeting effective-up at the moment acceleration begins is insufficient for the higher current A‴ acceleration.

## 7. E4.3 — static pre-lean feasibility

Probe:

`scripts/e4-3-static-prelean-feasibility.mjs`

Tested whether the organism could physically reach and hold the corresponding effective-up angles while its support remained stationary:

- `8 m/s²` equivalent → ~`21.8°`;
- `16 m/s²` → ~`38.7°`;
- `31 m/s²` → ~`57.2°`.

All tested targets eventually FALL/FALL.

The torso could pass close to the requested angle, but without the counteracting inertial demand the tilted pose was not a static equilibrium.

Durable correction:

> **The useful lean observed in E4 is not a static pose that can simply be set before locomotion. It is a dynamic relationship between posture state and an imminent/ongoing acceleration.**

This rejects hidden teleport-to-lean as an honest solution.

## 8. E4.4 — anticipatory physical preparation

Probe:

`scripts/e4-4-anticipatory-lean-lead.mjs`

The controller was given advance knowledge of the upcoming translational demand and allowed to spend the same finite `320 Nm` posture authority for a fixed number of frames before carriage acceleration began.

No pose teleport and no stronger actuator.

Predeclared lead bracket:

`[0, 1, 2, 3, 4, 6, 8, 12]` frames.

Mirrored outcomes:

### `8 m/s²`

All tested leads, including `0`, recovered.

### `16 m/s²`

- lead `4` → **R/R**;
- lead `6` → F/R;
- other tested leads → F/F.

### current A‴ `31 m/s²`

- lead `8` → **R/R**;
- all other tested leads → F/F.

For current `31 + lead8`, launch posture was only about `-9.1° / +8.5°`, with nonzero angular velocity. Peak tilt remained about `14–15°`, and recovered trials had zero support-loss frames.

Interpretation:

The useful quantity is not “pre-set 57° lean”. A short dynamically evolving posture state, timed relative to the upcoming inertial demand, can move the organism into a recoverable trajectory.

However a single canonical timing survivor is not enough to promote a strategy. E3.2 already demonstrated why substrate robustness must be checked before trusting a recover/fall bifurcation.

## 9. E4.5 — launch substrate robustness

Probe:

`scripts/e4-5-anticipatory-substrate-robustness.mjs`

Held fixed:

- outer `dt = 1/60`;
- controller cadence;
- support geometry/friction;
- gravity;
- `320 Nm` posture authority;
- target speed `5.2 m/s`;
- acceleration and chosen lead cases.

Changed only Box3D substeps:

`[1, 2, 4, 8]`.

Canonical `4` first reproduced E4.4.

Key matched outcomes:

### `8 m/s²`, no anticipation

R/R at `1,2,4,8`.

### `16 m/s²`, lead4 vs lead0

Symmetric matched F→R benefit at:

`[4,8]` substeps.

### current `31 m/s²`, lead8 vs lead0

Baseline lead0 remained F/F at all tested resolutions.

Lead8:

- sub1 → F/F;
- sub2 → **R/R**;
- sub4 → **R/R**;
- sub8 → **R/R**.

Therefore current-acceleration symmetric matched F→R benefit survived:

`[2,4,8]` substeps.

A telemetry correction was made after the first E4.5 run: world-space foot travel incorrectly included carriage translation. The corrected metric is foot↔carriage **relative drift**. The outcome gates were independent of this telemetry error, and the corrected exact head was revalidated.

Recovered current-31 lead8 relative drift remained modest in this proxy (~`0.13–0.18 m` across sub2/4/8) with zero support-loss frames.

Durable result:

> **Current-acceleration anticipatory preparation is not merely a canonical-four-substep coincidence in this proxy: its matched F→R benefit survives substeps 2, 4 and 8, but not 1.**

Non-claim:

This is not solver independence and does not select substeps, `8` frames or a gameplay posture law.

## 10. E4.6 — current braking compatibility

Probe:

`scripts/e4-6-braking-posture-compatibility.mjs`

To isolate braking from launch failure, each trial:

1. settled;
2. accelerated safely at `4 m/s²` to `±5.2 m/s`;
3. cruised `120` frames until the organism returned to neutral/recovered state;
4. then applied current Donor-v1 ground deceleration `36 m/s²` to zero.

World-upright braking reference:

F/F.

Effective-up lead bracket `[0,2,4,6,8,12]`:

- 0 → F/F;
- 2 → F/F;
- 4 → F/F;
- 6 → F/F;
- **8 → R/R**;
- 12 → F/F.

At lead8, brake-start torso state was approximately `+8.8° / -9.5°` with angular velocity, peak tilt ~`13–14°`, and zero support-loss frames.

This reproduced the same qualitative preparation phenomenon on the opposite phase of current locomotion agency: stopping rather than starting.

## 11. E4.7 — braking substrate robustness

Probe:

`scripts/e4-7-braking-substrate-robustness.mjs`

Exact-head workflow:

- branch head at the E4.7 result: `6011dfbf79495d475da0e5966eabb87d9377061b`;
- GitHub Actions run: `33672840618`;
- research smoke: SUCCESS;
- Donor smoke: SUCCESS;
- production build: SUCCESS.

Held fixed:

- outer `dt = 1/60`;
- controller cadence;
- cruise `5.2 m/s`;
- current braking `36 m/s²`;
- safe setup acceleration `4 m/s²`;
- `320 Nm` posture authority;
- support geometry/friction;
- lead0 vs fixed lead8;
- mirrored directions.

Changed only substeps `[1,2,4,8]`.

Results:

| Substeps | lead0 `-/+` | lead8 `-/+` | symmetric benefit |
| ---: | --- | --- | --- |
| `1` | F/F | F/F | no |
| `2` | F/F | **R/R** | F→R |
| `4` | F/F | **R/R** | F→R |
| `8` | F/F | **R/R** | F→R |

Recovered lead8 support-relative foot drift:

- sub2: ~`0.211 / 0.222 m`;
- sub4: ~`0.159 / 0.141 m`;
- sub8: ~`0.149 / 0.156 m`;
- support-loss frames: `0` in all recovered cases.

Durable result:

> **Current `36 m/s²` braking shows the same matched anticipation robustness pattern as current `31 m/s²` launch in this proxy: F→R at substeps 2, 4 and 8; no rescue at 1.**

That alignment is stronger evidence than either canonical timing survivor alone.

## 12. What E4 established

### Proven / retained within the declared proxy

1. Naive finite world-upright posture is incompatible with the full accepted A‴ ground acceleration/deceleration profile in this specimen.
2. The conflict is not reducible to peak acceleration alone; duration / Δv and posture phase matter.
3. Acceleration-aligned posture can materially change recoverability without raising torque or reducing translational demand.
4. Useful preparation is dynamic; the equivalent tilted posture is not statically holdable on stationary support.
5. Advance knowledge of an imminent translational demand can be converted into **physical pre-action** using finite posture authority rather than pose teleportation.
6. For current `31 m/s²` acceleration, fixed lead8 gives matched symmetric F→R at substeps `[2,4,8]` but not `1`.
7. For current `36 m/s²` braking from established cruise, the same fixed lead8 gives matched symmetric F→R at `[2,4,8]` but not `1`.
8. In recovered 2/4/8 cases, benefit does not require support loss; support-relative foot drift remains bounded within the measured proxy envelope.

### Rejected / corrected

- “finite balance means current A‴ acceleration must simply be reduced” — not established; posture strategy can preserve stronger demand in the proxy.
- “31 m/s² is intrinsically impossible for the body” — false for short Δv and false with qualified anticipation at sub2/4/8.
- “just target effective-up when acceleration starts” — insufficient for current 31/36 magnitudes.
- “pre-lean to the final effective-up angle before moving” — rejected by static feasibility test.
- “8 frames is now a gameplay constant” — rejected; it is a fixed research survivor used for robustness qualification.
- “substeps 2/4/8 are preferred settings” — rejected; solver resolution is an evidence axis, not a tuning target.
- “moving-platform E4 is almost Donor integration” — false; it is an inertial compatibility proxy.

## 13. The central conceptual result

E4 provides the first sustained evidence for a potentially important embodied-control principle:

> **Player intent can contain useful information about a physical demand before that demand has fully occurred. A controller may use that information to make the body physically prepare with finite authority, rather than granting free upright or weakening the intended translation.**

In shorthand:

```text
player intends
→ controller predicts near-term physical demand
→ body physically prepares using finite authority
→ translational consequence occurs
→ physics still determines whether the attempt succeeds
```

This is a **research principle**, not yet a runtime policy.

## 14. What E4 did not answer

E4 deliberately stops before the true locomotion bridge.

Open:

- where accepted A‴ translational authority should physically enter an embodied organism;
- whether propulsion should be world-external, support-mediated, hybrid, or another representation;
- how much of accepted A‴ velocity response can survive reciprocal rigid-body actuation;
- whether intentional support relocation / stepping becomes necessary for sustained locomotion;
- how preparation should be derived from continuous player intent rather than a fixed hand-authored lead;
- what happens under rapidly changing/reversing input;
- terrain, dynamic-body and moving-support interactions in a true embodied locomotion representation;
- 3D turning/yaw and lateral posture;
- Owner feel of any integrated representation.

## 15. Natural boundary

E4.0–E4.7 are sufficient for the carriage proxy.

Do **not** add another platform sequence merely for completeness. A forward→cruise→brake→reverse script would exercise the same proxy more continuously but would not answer the newly exposed representation question.

The next high-information stage should separately contract the physical locomotion bridge:

> **How should accepted player translational authority be coupled into a physically embodied organism while preserving both agency and meaningful physical consequence?**

Candidate mechanisms must be treated as competing hypotheses, not inherited commitments. In particular, do not assume that a direct torso force, a traction-limited support force, deliberate support relocation or stepping is the answer before a bounded comparison earns it.

No E4 runtime promotion is justified before that bridge question is answered and Owner hands-on evidence exists.
