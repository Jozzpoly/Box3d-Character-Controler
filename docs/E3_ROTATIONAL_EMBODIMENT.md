# E3 — Rotational Embodiment & Balance

Status: **active research line; Owner-positive at E3.1c and causally decomposed through E3.1h; experimental, not donor/current behavior**.

Detailed post-Owner validation evidence is recorded in [`E3_1_VALIDATION_LOOP.md`](E3_1_VALIDATION_LOOP.md).

## Why E3 exists

E2 through E2.3e established the accepted translational contract: **A‴ / Donor v1**. E3 does not reopen that locomotion line.

E3 asks:

> Can maintaining posture become a physically negotiated capability of the player's body rather than a guaranteed property of the controller?

The target is not cosmetic lean or a binary ragdoll switch. It is a continuum in which physical authority can preserve or recover control, while sufficiently strong world consequences can exceed that capability and produce a natural loss of balance.

## Current conceptual correction

The initial E3 wording used “finite physical authority” too broadly.

The evidence now distinguishes at least three physical channels:

1. **support-mediated grounded balance** — the clean current E3.1 capability specimen;
2. **internal airborne attitude control** — momentum-conserving reorientation through the foot as reaction mass;
3. **support relocation** — material translation of the support, currently an observed mechanism rather than designed stepping.

The current actuator has a finite instantaneous torque budget, but the spherical ankle does **not** yet impose a finite angular range or angular-momentum capacity. Therefore the always-active unsupported variant can use the foot as an effectively unbounded crude reaction wheel.

That airborne channel is not required for the currently tested grounded balance behavior; E3.1h demonstrated that support-contact gating removes it while preserving the grounded direct and dynamic-ram boundaries.

## Invariants

- Donor v1 / A‴ remains untouched and is the accepted locomotion control arm.
- E3 specimens remain experimental until evidence earns promotion.
- Fall classification observes state; it must never cause the fall.
- No `if tilt > threshold => ragdoll` transition is allowed as the failure mechanism.
- Internal actuation remains reaction-conserving: torso torque has equal-and-opposite reaction on the paired body.
- Machine PASS and Owner judgement remain different evidence classes.
- Locomotion, stepping, yaw, grabbing and articulated limbs remain separate questions.
- Unsupported attitude control must not be silently treated as the same capability as grounded balance.

---

## E3.0 — angular substrate qualification

The exact qualified substrate (`box3d.js@0.1.1`) was tested through the JavaScript binding before gameplay research continued.

Qualified observations:

- central point impulse: effectively zero angular response;
- +0.25 m lever arm: `+1.0417 rad/s`;
- mirrored -0.25 m lever arm: `-1.0417 rad/s`;
- +0.50 m lever arm: `+2.0833 rad/s`;
- spherical shared-point drift: effectively `0 m` at reported precision;
- angular motion survives the spherical joint.

Initial qualifying commit:

`d74df480c5141829a2b1e24c8d43f810ca6e3a11`

This qualifies the substrate needed by E3. It does not qualify every future articulated/joint API.

---

## E3.1a — sagittal standing-balance crucible

The first organism contains:

1. a dynamic support plate;
2. a dynamic torso carrying most player mass;
3. a spherical ankle fixing the shared point while allowing orientation change;
4. a finite internal pitch actuator.

The controller computes a world-up correction, damps angular velocity, clamps the request to `maxTorque`, then applies equal-and-opposite angular impulses to torso and foot.

### Construction falsifier

The first harness failed because the initial ankle anchors were separated by `0.055 m`, pre-loading the joint and masquerading as spontaneous instability.

The anchors were corrected to coincide in world space.

Durable lesson:

> Initial joint pre-stress can masquerade as balance instability and must remain excluded from future specimens.

### Clean 320 Nm sagittal frontier

After correction:

- passive falls throughout the tested `2..128 N·s` perturbation sweep;
- finite 320 Nm recovers through `64 N·s`;
- first demonstrated fall at `80 N·s`;
- `64 N·s` recovery reaches about `11°` peak tilt and saturates authority;
- `80 N·s` crosses about `93°` peak tilt;
- maximum support translation among recovered trials is about `0.017 m`;
- mirrored pushes match;
- low-friction localization did not erase the recover/fall distinction.

Canonical clean-frontier run:

`33578418890`

### Authority dependence

Keeping geometry and `Kp/Kd` fixed while changing maximum torque moved the frontier:

| max torque | max demonstrated recovery | first demonstrated fall |
| ---: | ---: | ---: |
| 80 Nm | 12 N·s | 24 N·s |
| 160 Nm | 24 N·s | 36 N·s |
| 240 Nm | 48 N·s | 64 N·s |
| 320 Nm | 64 N·s | 80 N·s |

At `480 Nm`, stronger perturbations could be recovered, but a `128 N·s` trial moved the support about `1.24 m`. That is already recruitment of another channel rather than merely “more ankle balance”.

Canonical authority run:

`33578549695`

Durable result:

> Recoverability changes with available authority, and sufficiently strong authority/perturbation combinations can recruit support relocation as a qualitatively different mechanism.

`320 Nm` is retained only as a useful research specimen with both recovery and natural failure. It is not final tuning or a biomechanical claim.

---

## E3.1b — 3D pitch/roll and real contact

The same hypothesis was extended to pitch + roll while keeping yaw outside the problem.

At 320 Nm the direct-perturbation frontier was:

- **forward:** recover through `64 N·s`, fall from `80 N·s`;
- **side:** recover through `80 N·s`, fall from `96 N·s`;
- **diagonal:** recover through `80 N·s`, fall from `96 N·s`;
- mirrored controls passed;
- every tested direction demonstrated both recovery and natural fall.

Canonical 3D run:

`33578768329`

The stronger side/diagonal boundary reinforces that static `mass × gravity × support radius` is only a normalization. Geometry, inertia, contact dynamics and actuator authority jointly shape the frontier.

### 35 kg dynamic ram

A real dynamic rigid body was then used instead of only direct impulse injection.

With the same 320 Nm organism:

- `1.0..3.0 m/s` — RECOVER;
- `4.0..10.0 m/s` — FALL;
- `3.0 m/s` reaches about `7.7°` peak tilt;
- `4.0 m/s` crosses about `91°`;
- maximum recovered support translation is about `0.038 m`.

Canonical dynamic-ram run:

`33578936583`

This demonstrates that the recover/fall distinction survives ordinary Box3D contact rather than existing only under idealized direct perturbation.

---

## E3.1c — Owner balance playground and experiential gate

The browser instrument is exposed only through:

- `?mode=balance`
- `?mode=e3`

Normal public runtime remains Donor v1 / A‴.

The E3 playground directly renders Box3D foot, torso and 35 kg ram and provides:

- authority selection `0 / 160 / 320 / 480 Nm`;
- ram speed/direction selection;
- reset;
- world-up orbit camera;
- live tilt/angular-speed/torque/support-travel telemetry.

There is deliberately no locomotion in this gate.

Branch browser/build qualification:

`33579122379`

### Owner evidence

Owner hands-on feedback:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is a **positive experiential gate** for continuing the research direction.

It supports the claim that the physical struggle for posture is perceptually legible and meaningfully different from a decorative lean.

It does **not** promote the organism to current behavior, a donor revision, final tuning, locomotion integration or final architecture.

A recording was supplied with the feedback, but the analysis environment did not expose that new upload at its grounded sandbox path. No claim in the research ledger depends on machine analysis of that recording; the written Owner judgement is the accepted evidence.

---

## E3.1d–h — validation/falsification loop after Owner acceptance

The Owner-positive result opened a harder causal question:

> Is the grounded “fight for balance” actually support-mediated, or is it partly an artifact of the always-active world-up actuator using the foot as a reaction mass even without ground support?

Detailed evidence, including failed harnesses and confounds, is preserved in [`E3_1_VALIDATION_LOOP.md`](E3_1_VALIDATION_LOOP.md).

### E3.1d — support geometry + zero-g unsupported control

Commit:

`85def1db834817dc1569c54090dc54429fcd82f6`

Run:

`33580221854`

Findings:

- standard support reproduces `64 R / 80 F`;
- wide support also reproduces that observed boundary while reducing recovered support travel;
- narrow support begins large translation/relocation instead of simply producing a lower fall threshold;
- without ground/gravity, always-active torque can return torso near world-up while the foot spins near `47 rad/s`.

This identified **internal airborne attitude control** as a distinct capability.

### E3.1e — mass-distribution sensitivity

Commit:

`8ee2c1b426e489d019e421b7f39f947eade14fe7`

Run:

`33580418472`

Changing foot/torso mass distribution changed the behavior, but the experiment also changed torso inertia. It is retained only as mass-distribution sensitivity, not clean reaction-mass proof.

### E3.1f — clean unsupported decomposition

Commit:

`7ae79b7a9fedab7777cad20fb012fe73cf380677`

Run:

`33580671628`

Torso mass/geometry and direct perturbation were fixed while only foot mass changed.

Initial torso response was identical across foot-mass variants:

- `48 N·s` -> `2.2113 rad/s`;
- `64 N·s` -> `2.9484 rad/s`.

With finite world-up actuation, the torso returned near upright while the foot accumulated tens to hundreds of radians of angular travel.

Therefore:

> `maxTorque` bounds instantaneous torque, but the current spherical ankle does not bound the internal angular-momentum storage/range used for unsupported righting.

This is a real momentum-conserving internal attitude channel, not evidence of ground balance.

### E3.1g — exact support-contact sensing

Initial run:

`33580863378` — failed a new harness assumption.

Corrected run:

`33580930317` — PASS.

Exact `box3d.js@0.1.1` body-contact data reliably distinguishes grounded foot support from unsupported control through persistent near-vertical manifold points.

The failed harness also established that positive per-step `normalImpulse` is **not** a valid persistent-support boolean for a settled contact. Impulse remains transient load evidence; active manifold points define support presence for this experiment.

### E3.1h — support-gated causal A/B

Commit:

`8597ecd7be4bb8cbbce0489d4b7e413f579c4ad1`

Canonical run:

`33581155856`

Policies:

- `always` — current E3 actuator up to 320 Nm every step;
- `gated` — 320 Nm only with measured near-vertical foot support;
- `passive` — 0 Nm.

Unsupported zero-g result:

- `always` strongly reorients torso and drives about `175 rad` of foot angular travel;
- `gated` matches `passive` within deterministic asserted tolerance;
- gated unsupported actuation frames = `0`.

Grounded direct result:

- both always and gated: `48 R / 64 R / 80 F / 96 F`;
- observed peak tilts and support travel match in this matrix;
- no support loss occurred, including during observed falls.

35 kg ram boundary:

- both always and gated: `3.0 m/s` RECOVER, `4.0 m/s` FALL;
- measured peak tilts and support travel match in the tested cases.

Strongest current causal conclusion:

> **The Owner-positive grounded balance behavior in the tested E3.1 envelope does not require the accidental unsupported reaction-mass channel.**

Support-mediated grounded balance is therefore the clean current E3.1 capability specimen.

---

## What E3.1 now proves

Evidence now supports all of the following:

1. exact JS angular mechanics are sufficient for this research line;
2. finite torque authority produces a bounded grounded recoverability frontier;
3. the frontier changes with authority;
4. support relocation can emerge as a separate recovery channel;
5. the phenomenon survives 3D and real rigid-body collision;
6. Owner can perceive the result as a primitive body actively fighting for balance;
7. the original always-active actuator also contains a separate unsupported attitude-control channel;
8. that unsupported channel can be removed through measured support gating without changing the currently tested grounded direct/ram behavior;
9. current A‴ / Donor v1 remains regression-clean throughout the research line.

## What E3.1 does not prove

E3.1 does not establish:

- final human-like tuning;
- realistic ankle/joint limits;
- a final airborne-control policy;
- a final support detector for every future terrain/contact case;
- stepping;
- yaw/facing control;
- active ragdoll;
- humanoid articulation;
- balance + A‴ locomotion integration;
- a new donor revision;
- controller-owned vs solver-owned vs hybrid architecture winner.

## Current natural boundary

The post-Owner falsification loop answered its motivating question:

> The grounded mannequin-like balance struggle survives causal removal of unsupported internal attitude control.

The immediate next unknown is therefore **not** “is E3 just a reaction-wheel artifact?”.

Before opening articulation or locomotion integration, the smallest high-information boundary is support-transition behavior:

- support loss/takeoff;
- support reacquisition/landing;
- one-step contact-observation latency;
- whether any airborne attitude authority is desirable, and if so what explicit finite physical resource should bound it.

Those are new questions and must not be silently answered by the old always-active spherical-ankle actuator.
