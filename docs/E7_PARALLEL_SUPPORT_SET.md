# E7 — Parallel support-set representation and load-path boundary

Status: **closed research stage / evidence only**

Date: **2026-09-03**

E7 does not modify Donor v1 / A‴ or the public runtime. It is a machine-research stage continuing the E5/E6 question of whether more accepted translational agency can be earned physically rather than granted as world-external authority.

## 1. Starting boundary

E5 established that anticipatory posture materially recruits real contact momentum, but the qualified single-support organism still does not physically reproduce the full accepted A‴ `31/36 m/s²` translational response.

E6 then rejected two attempts to put latent support-relative translation into the **primary ankle path before actuation**:

1. a serial extra-body prismatic chain;
2. a direct two-body two-DOF ankle replacement.

Both changed qualified E5 mechanics while the new translational DOF was locked.

Therefore E7 changed mechanism family rather than tuning either rejected E6 representation.

E7 question:

> **Can an additional physical support element exist in parallel with the qualified primary foot↔torso path, acquire real ground contact through finite internal actuation, and become a meaningful load-bearing support without world-external translational authority?**

The causal order was deliberately staged:

1. inactive representation non-interference;
2. contact-reachable inactive representation;
3. finite internal support acquisition;
4. contact provenance;
5. settled body-load transfer;
6. demand-aligned load-transfer attempt.

A later step was not allowed to retroactively excuse failure of an earlier gate.

## 2. E7 representation

The qualified primary E5 path was preserved:

`10 kg primary foot ↔ spherical ankle ↔ torso`

E7 added a **parallel** physical probe rather than inserting anything into that path.

Representative E7 specimen:

- total organism mass: `80 kg`;
- primary foot: `10 kg`;
- torso: `69 kg`;
- parallel probe: `1 kg`;
- final probe length: `0.9 m`;
- probe half-thickness: `0.06 m`;
- probe revolute joint attached to torso;
- primary posture authority remains direct torso↔primary-foot `320 Nm`;
- canonical outer step `1/60 s`, Box3D substeps `4`, gravity `20 m/s²`, friction `μ=.95`;
- no world-external horizontal authority.

The initial `0.7 m` probe passed inactive representation matching, but before activation it was replaced by a single geometry-corrected `0.9 m` specimen so the distal contact region would lie cleanly outside the primary foot envelope. The corrected geometry itself was then re-qualified inactive before any contact-acquisition claim.

## 3. E7.0a — inactive parallel representation PASS

Script:

- `scripts/e7-0a-inactive-parallel-support-probe.mjs`

A real `1 kg` parallel rigid body with its own joint was locked upward, unactuated and required to make **zero contacts**.

Against exact E5 current-31 / lead8 reference at canonical substeps4:

### Direction −

- outcome: RECOVER → RECOVER;
- `Jx / required`: `0.671 → 0.659`;
- ramp-end whole-body speed: `4.204 → 4.149 m/s`;
- peak torso tilt: `14.08 → 13.58°`;
- foot-relative travel: `0.128 → 0.125 m`;
- probe contacts: `0`;
- lock error: `0.0601°`;
- ramp support loss: `0`.

### Direction +

- outcome: RECOVER → RECOVER;
- `Jx / required`: `0.646 → 0.643`;
- ramp-end speed: `4.216 → 4.189 m/s`;
- peak torso tilt: `14.98 → 14.54°`;
- foot-relative travel: `0.144 → 0.140 m`;
- probe contacts: `0`;
- lock error: `0.0710°`;
- ramp support loss: `0`.

Verdict:

> **A real parallel support-capable body can exist inactive without materially perturbing the qualified E5 primary organism inside the declared representation envelope.**

This was the first positive representation result after the two E6 primary-path failures.

## 4. E7.0b — contact-reachable inactive geometry PASS

Script:

- `scripts/e7-0b-contact-reachable-inactive-probe.mjs`

Before activation, probe length was changed once from `0.7 → 0.9 m` for a geometric reason: at approximately `140°`, the distal center lies at about `|z|=.579 m`, with nearest distal extent about `.533 m`, outside the primary-foot half-width `.340 m`.

The corrected `0.9 m` specimen had to pass inactive non-interference again.

### Direction −

- `Jx / required`: `0.671 → 0.654`;
- ramp-end speed: `4.204 → 4.127 m/s`;
- peak tilt: `14.08 → 13.38°`;
- foot-relative travel: `0.128 → 0.125 m`;
- probe contacts: `0`;
- lock error: `0.0726°`;
- ramp support loss: `0`.

### Direction +

- `Jx / required`: `0.646 → 0.642`;
- ramp-end speed: `4.216 → 4.179 m/s`;
- peak tilt: `14.98 → 14.37°`;
- foot-relative travel: `0.144 → 0.140 m`;
- probe contacts: `0`;
- lock error: `0.0921°`;
- ramp support loss: `0`.

Exact branch head:

`300bec432188129e8dfd18b2258170475bc5679b`

Exact workflow:

`33686427721` — SUCCESS, full smoke + production build; Pages correctly skipped off `main`.

Verdict:

> **The contact-reachable parallel representation is qualified before activation.**

## 5. E7.1a — finite internal support acquisition PASS

Script:

- `scripts/e7-1a-finite-internal-support-acquisition.mjs`

Question:

> Can the already-qualified parallel element acquire a persistent second support using only finite internal actuation while primary support remains present?

The actuator was derived from probe geometry rather than swept to a passing value:

- probe mass `1 kg`;
- length `0.9 m`;
- pivot inertia ≈ `0.2712 kg·m²`;
- maximum gravity moment ≈ `9 Nm`;
- torque cap `18 Nm = 2×` maximum gravity moment;
- critically damped target around `8 rad/s`;
- command target `±140°`;
- physical joint limit `±145°`.

Actuation used equal-and-opposite angular impulses on probe and torso. No Box2D motor/spring supplied hidden world reaction.

The `target=0` same-rig control remained inactive:

- fall: false;
- primary support loss: `0`;
- probe contacts: `0`;
- maximum probe angle ≈ `.004°`;
- peak torso tilt ≈ `.008°`.

Active acquisition:

### Direction −

- first reactive contact: frame `25`;
- persistent loaded acquisition begins: frame `25`;
- maximum loaded points: `2`;
- primary support loss before/after: `0/0`;
- fall: false;
- peak torso tilt: `0.53°`;
- terminal probe angle: `-132.17°`;
- maximum actuator torque: `18 Nm`.

### Direction +

The corresponding values were mirrored, including acquisition at frame `25`, peak torso tilt `0.53°`, terminal `+132.17°` and `18 Nm` maximum torque.

Exact head:

`f8f0e3646967b49aff6257119a3bcd449d2460ee`

Exact workflow:

`33688504012` — SUCCESS.

Verdict:

> **Finite internal actuation can add a persistent solver-loaded second contact in both sagittal directions without losing the primary support or adding world-external horizontal authority.**

At this point the contact body was not yet treated as proven ground support; contact identity was hardened next.

## 6. E7.1b — probe↔ground contact identity PASS

Script:

- `scripts/e7-1b-ground-contact-identity.mjs`

The upstream binding was inspected and `shapeIdA` / `shapeIdB` were used to distinguish:

- probe↔platform;
- probe↔any other shape.

Mechanics remained identical to E7.1a.

Both directions showed:

- probe↔platform first reactive and first loaded contact at frame `25`;
- persistent loaded acquisition beginning at frame `25`;
- maximum ground loaded points `2`;
- `otherRaw=0`;
- `otherLoaded=0`;
- no pre-command probe contact;
- primary support loss `0/0`;
- no fall;
- peak torso tilt `0.53°`;
- actuator cap `18 Nm`.

Exact head:

`db0b658087503bacf19b6f4092c913eadb8d5c71`

Exact workflow:

`33688878419` — SUCCESS, full research + donor smoke and production build.

Verdict:

> **E7.1 acquired a real second ground support, not self-contact.**

This qualifies ground-contact acquisition only. It does not prove that the support carries meaningful body load.

## 7. E7.2a — settled upright body-load transfer FAIL

Script:

- `scripts/e7-2a-settled-support-load-transfer.mjs`

The test used E5.0a's already-calibrated settled-support accounting:

- expected outer-step support impulse for `80 kg`, `g=20`: `26.666667 Ns`;
- final-substep channel: `normalImpulse × 4`;
- native-equivalent channel: `0.5 × totalNormalImpulse`;
- retained E5 calibration tolerance: `3%`, i.e. `0.8 Ns`;
- probe's own `1 kg` weight impulse: `0.333333 Ns`.

Predeclared meaningful body-load transfer required the probe to carry more than its own weight **plus one full existing E5 calibration band**:

`probe load > 1.133333 Ns/frame`

in both calibrated channels, while primary-foot load fell correspondingly and total support load remained conserved.

The same-rig target0 control validated the accounting exactly:

- primary foot: `26.6667 / 26.6667 Ns`;
- probe: `0 / 0`;
- total: `26.6667 / 26.6667 Ns`;
- primary support loss: `0`;
- other contacts: `0`.

After acquiring and settling the second support, direction − measured:

- primary foot: `26.4956 / 26.4877 Ns`;
- probe: `0.1216 / 0.1789 Ns`;
- probe excess above own-weight reference: `-0.2118 / -0.1544 Ns`;
- primary-foot drop: `0.1711 / 0.1789 Ns`;
- total: `26.6171 / 26.6667 Ns`;
- both supports continuously present;
- no other contacts;
- no fall;
- mean hinge constraint-force magnitude ≈ `12.69 N`.

The probe therefore carried **less than its own nominal 1 kg weight impulse on average**, not meaningful body load from the rest of the organism.

Exact head:

`d6303df42ab409b422e03386ace09d384effb470`

Exact workflow:

`33689351597` — FAIL at E7.2a as intended by the falsifiable gate; preceding regression scripts passed and build was skipped after smoke failure.

Verdict:

> **Acquiring a second ground contact does not by itself create meaningful body-load transfer while the organism remains upright over the primary foot.**

Thresholds, actuator torque, geometry and target were not relaxed after this failure.

## 8. E7.2b — current-31 demand-aligned load transfer FAIL

Script:

- `scripts/e7-2b-demand-aligned-load-transfer.mjs`

E7.2a left a causal possibility: perhaps the second support was capable of carrying load, but upright COM placement simply gave it no reason to do so.

E7.2b therefore changed **only the primary posture demand after the already-qualified second support had been acquired**.

The target was not selected from an angle sweep. It came directly from the accepted current launch demand:

`atan2(31, 20) = 57.17°`

Using E7 torso mass `69 kg` and the existing `.55 m` torso COM lever, the torso-weighted whole-organism COM projection is approximately:

`0.399 m`

which lies beyond the primary foot half-width `.340 m` while still inside the acquired parallel-support reach.

The existing `320 Nm` primary ankle controller was asked to reach `57.17°` **toward the measured probe side**. No new translational force or world authority was added.

The posture HOLD contract reused E4.3-style criteria:

- target error ≤ `2°`;
- `|ω| ≤ .16 rad/s`;
- primary foot tilt ≤ `6°`;
- `30` consecutive stable frames.

### Direction −

- acquired probe support: frame `25`;
- measured support side: negative;
- target: `-57.17°`;
- best target error: `0.27°`;
- outcome: FALL;
- peak target-phase tilt: `99.60°`;
- primary-foot support-loss frames: `41`;
- probe support-loss frames: `0`;
- other contacts: `0`.

Upright dual-support baseline before the shift:

- primary foot: `26.4956 / 26.4877 Ns`;
- probe: `0.1216 / 0.1789 Ns`;
- total: `26.6171 / 26.6667 Ns`;
- whole COM `z≈-0.0040 m`;
- probe COM `z≈-0.3319 m`.

### Direction +

- acquired probe support: frame `25`;
- measured support side: positive;
- target: `+57.17°`;
- best target error: `1.79°`;
- outcome: FALL;
- peak target-phase tilt: `99.72°`;
- primary-foot support-loss frames: `9`;
- probe support-loss frames: `0`;
- other contacts: `0`.

Upright baseline:

- primary foot: `26.4975 / 26.4880 Ns`;
- probe: `0.1213 / 0.1787 Ns`;
- total: `26.6188 / 26.6667 Ns`;
- whole COM `z≈+0.0042 m`;
- probe COM `z≈+0.3321 m`.

Exact head:

`7e3dffc45738d29576fb07a7230317f066e38c5d`

Exact workflow:

`33689785902` — FAIL at E7.2b; prior E7.0/E7.1 and all older mandatory smoke gates passed before the expected research failure.

Important observation:

> **In both directions the probe remained continuously grounded while the primary support unloaded/lost contact and the organism fell. The torso came close to the demand-derived target, but no stable dual-support HOLD state emerged.**

This is not evidence that the probe needs more placement torque. It is evidence that the tested single-hinge torso-COM strut does not provide a stable/regulatable body-load path for the demanded weight shift.

No angle, torque, length, mass, timing or tolerance sweep was opened after this result.

## 9. Cumulative E7 result

E7 cleanly separates four increasingly strong claims:

1. **Representation neutrality — PASS.** A real parallel support body can exist inactive without materially changing qualified E5 mechanics.
2. **Finite internal placement — PASS.** The body can be moved using bounded equal-and-opposite internal actuation.
3. **Real ground acquisition — PASS.** The probe acquires mirrored persistent solver-loaded probe↔platform contact while primary support remains active.
4. **Meaningful stable body-load path — FAIL in the tested single-hinge strut.** Upright settling does not transfer body load, and current-31 demand-aligned weight shift loses the primary support and falls while the probe remains grounded.

Central conclusion:

> **Contact acquisition is not support capacity. A useful support-set mechanism must prove a stable, regulatable compressive load path, not merely place another body on the ground.**

A more specific representation conclusion is also warranted:

> **The tested single rigid probe hinged at the torso COM is a successful finite contact-placement mechanism but not a qualified load-bearing support architecture.**

## 10. Nonclaims

E7 does **not** establish that:

- support relocation generally fails;
- stepping or gait is unnecessary or impossible;
- humanoid legs are required;
- a stronger probe actuator would solve the problem;
- a lower demand tilt would be an acceptable substitute for current A‴ agency;
- external assistance should now be selected;
- two supports cannot earn additional translational agency;
- current Donor v1 should change;
- E7.1 is a gameplay locomotion mechanism.

Do not call E7.1 a step. It is a controlled support-acquisition event.

## 11. Smoke/provenance policy

Durable positive E7 gates remain mandatory research smoke:

- `e7-0a-inactive-parallel-support-probe.mjs`;
- `e7-0b-contact-reachable-inactive-probe.mjs`;
- `e7-1a-finite-internal-support-acquisition.mjs`;
- `e7-1b-ground-contact-identity.mjs`.

Negative E7 load-path falsifiers remain executable provenance but are intentionally **not** permanent green smoke gates:

- `e7-2a-settled-support-load-transfer.mjs`;
- `e7-2b-demand-aligned-load-transfer.mjs`.

They must not be rewritten into artificial PASS assertions merely to keep CI green.

## 12. Natural next boundary

Do not open current-31 translational-agency A/B on this single-hinge strut: E7.2 failed the more fundamental load-bearing prerequisite.

The next physical-family question, if pursued, is:

> **Can a parallel support mechanism provide a finite, stable and regulatable compressive load path while remaining non-interfering when inactive?**

This points toward changing **support mechanics**, not tuning contact-placement gains. Candidate families may include an axial/telescopic or articulated parallel support limb, but no architecture is selected by E7.

Any new family must again begin with inactive representation matching before its actuation is interpreted.

Explicit bounded gameplay authority remains a live alternative branch of the broader E5 fork.
