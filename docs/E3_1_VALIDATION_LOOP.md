# E3.1 — Owner validation and causal decomposition

Status: **research evidence; not donor/current behavior**

This document records the validation/falsification loop opened after the first Owner hands-on pass of the E3.1c balance playground.

It intentionally preserves failed harness assumptions, confounded probes and negative findings instead of rewriting the research history into a clean success story.

## Starting evidence

E3.1a/b had already established a machine-measured recoverability frontier for the first dynamic foot + torso organism, and E3.1c exposed that organism in a browser instrument.

The Owner’s written hands-on judgement was positive in a narrow but important sense:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

Interpretation:

- the physical struggle for posture is perceptually recognizable;
- the result is meaningfully different from a merely decorative/procedural lean;
- E3 has earned continued research.

It does **not** mean:

- the current E3 organism is production-ready;
- its tuning is accepted as final feel;
- it should replace A‴ / Donor v1;
- it should already be merged into locomotion;
- the current representation is anatomically or mechanically realistic.

A screen recording was supplied together with the feedback, but the analysis runtime did not expose the new upload at its grounded sandbox path. The written Owner feedback is therefore the evidence used here; this ledger does not claim that the new recording was machine-analyzed.

## Question opened by the Owner gate

The positive feel signal justified a harder falsification question:

> Is the perceived “fight for balance” actually support-mediated physical balance, or is it partly an artifact of the spherical joint plus a world-up PD actuator that can reorient the torso even without ground support?

This question matters before locomotion, jumping or articulation because the initial E3 actuator is always active and applies equal-and-opposite torque between torso and foot.

That is momentum-conserving, but it does not by itself prove that the observed capability is *ground balance*.

---

## E3.1d — support geometry and unsupported control

Branch base:

`49e55f292954911aa5b1044cfd411d62bc74e9e4`

First diagnostic commit:

`85def1db834817dc1569c54090dc54429fcd82f6`

Canonical run:

`33580221854`

### Footprint sensitivity

The sagittal support half-extent was varied while keeping the same `320 Nm` actuator:

- narrow: `0.17 m`;
- standard: `0.34 m`;
- wide: `0.68 m`.

Standard reproduced the known direct-impulse frontier:

- `64 N·s` — RECOVER;
- `80 N·s` — FALL.

Wide support also demonstrated `64 R / 80 F`, but with even less recovered support translation.

Narrow support behaved qualitatively differently:

- `24 N·s` — RECOVER;
- `36 N·s` — RECOVER;
- `48 N·s` — RECOVER;
- `64 N·s` — UNRESOLVED, support travel about `0.42 m`;
- `80 N·s` — UNRESOLVED, support travel about `0.47 m`;
- `96 N·s` — UNRESOLVED, support travel about `0.68 m`;
- `128 N·s` — UNRESOLVED, support travel about `2.24 m`.

### Interpretation

Narrowing the base did not simply produce a lower monotonic fall threshold. It caused the specimen to recruit large support translation/sliding before the existing FALL observation fired.

This means the old three-label research vocabulary:

`RECOVER / FALL / UNRESOLVED`

is too coarse once support relocation becomes material.

A future research harness may need an observational `RELOCATE` class, but the current sliding plate is **not** being promoted as a stepping model.

It also reinforces the earlier warning:

> Static support geometry is not, by itself, a predictor of the dynamic recoverability frontier.

### Unsupported zero-gravity control

The same always-active 320 Nm world-up controller was then tested with:

- no ground;
- zero gravity;
- the same foot + torso organism.

After direct perturbations of `24 / 48 / 64 / 80 N·s`, the torso returned close to world-up while the unconstrained foot rotated violently.

Representative observations:

- `48 N·s`: final torso about `0.2°`; foot peak about `180°` and `47.16 rad/s`;
- `64 N·s`: final torso about `0.0°`; foot peak about `180°` and `47.22 rad/s`;
- `80 N·s`: final torso about `0.2°`; foot peak about `180°` and `47.26 rad/s`.

This did **not** reveal a hidden world torque. Equal-and-opposite impulses remained internal.

It did reveal a second capability:

> The foot can act as an internal reaction mass, letting the actuator perform airborne attitude control even when no support reaction exists.

---

## E3.1e — mass-distribution sensitivity, retained with a confound

Commit:

`8ee2c1b426e489d019e421b7f39f947eade14fe7`

Canonical run:

`33580418472`

This probe kept total mass at 80 kg while varying foot/torso distribution:

- `2 / 78 kg`;
- `10 / 70 kg`;
- `30 / 50 kg`.

Grounded frontiers and airborne behavior changed with the distribution.

However, this probe cannot isolate reaction-mass contribution because changing foot mass while keeping total mass fixed also changes torso mass/inertia and therefore the initial response to the same direct impulse.

Durable conclusion:

> E3.1e demonstrates **mass-distribution sensitivity only**. It is not accepted as clean evidence that foot reaction-mass capacity caused the grounded frontier change.

The confound is explicitly retained because it motivated the controlled E3.1f experiment.

---

## E3.1f — clean airborne internal-attitude decomposition

Commit:

`7ae79b7a9fedab7777cad20fb012fe73cf380677`

Canonical run:

`33580671628`

### Controlled design

To remove the E3.1e confound:

- gravity = `0`;
- no ground;
- torso mass fixed at `70 kg`;
- torso geometry fixed;
- direct perturbation fixed;
- only foot mass changed: `2 / 10 / 30 kg`;
- passive and finite-320 controls were compared.

The immediate torso angular response was measured before later solver/controller evolution.

### Critical control result

Initial torso angular velocity was identical across all foot-mass variants:

- `48 N·s` -> `2.2113 rad/s`;
- `64 N·s` -> `2.9484 rad/s`.

The causal input to the torso was therefore controlled.

### Finite-controller result

With the actuator active, the torso was driven back near world-up while the foot absorbed very large angular motion.

Representative `48 N·s` results:

- 2 kg foot: final torso `~0.04° / 0.004 rad/s`; foot angular travel `~55.9 rad`;
- 10 kg foot: final torso `~0.16° / 0.629 rad/s`; foot angular travel `~175.7 rad`;
- 30 kg foot: final torso `~2.41° / 0.819 rad/s`; foot angular travel `~155.7 rad`.

Representative `64 N·s` results:

- 2 kg foot: final torso `~0.02° / 0.003 rad/s`; foot travel `~67.5 rad`;
- 10 kg foot: final torso `~0.01° / 0.721 rad/s`; foot travel `~175.5 rad`;
- 30 kg foot: final torso `~0.88° / 0.502 rad/s`; foot travel `~202.9 rad`.

Passive controls did not produce the same sustained torso stabilization.

### Corrected model

The earlier phrase “finite physical authority” was incomplete.

The current specimen has:

- **finite instantaneous torque authority** (`maxTorque`);
- but no finite ankle rotation range;
- and therefore no explicit finite angular-momentum storage/capacity for the internal reaction-mass channel.

In air, the spherical ankle can let the foot act like an effectively unbounded crude reaction wheel.

This is physical inside the model — momentum is conserved — but it is not yet a realistic representation of a body.

Durable distinction:

> **Ground support balance** and **internal airborne attitude control** must be treated as separate capabilities.

---

## E3.1g — exact support-contact sensing path

Initial commit:

`6bf5cfc9789ca46540a02f4d7003faa2977e2ea5`

Initial run:

`33580863378` — FAILED at the new support semantic gate.

Corrected commit:

`3b02a2c96ee1642ba7d40ffa13fb16e58225fbd7`

Corrected run:

`33580930317` — full smoke + build PASS.

### Binding qualification

The exact `box3d.js@0.1.1` reusable body-contact facade was exercised through:

- `createContactsBuffer()`;
- `getBodyContactData(...)`;
- contact/manifold readers;
- manifold normals and points.

Grounded control exposed:

- 1 foot contact;
- 1 manifold;
- 4 points;
- near-vertical normal (`|Ny| = 1.000`).

Unsupported zero-g control exposed zero contacts.

### Failed harness assumption

The first gate also required positive `normalImpulse` in the final quiet frame as the boolean definition of support.

That failed even though the persistent manifold was clearly present. Earlier samples had positive load impulses, but a settled persistent contact can report zero per-step normal impulse.

The harness was corrected:

- active near-vertical manifold points define persistent support presence;
- normal/total impulse is retained as transient load evidence, not the boolean support truth.

This is a harness semantic correction, not a Box3D physics defect.

---

## E3.1h — support-gated causal A/B

Commit:

`8597ecd7be4bb8cbbce0489d4b7e413f579c4ad1`

Canonical run:

`33581155856`

Full historical research smoke, E3 diagnostics, Donor v0/v1 gates, mobile-input gate and production build all passed.

### Compared policies

The physical organism and control law were unchanged. Only torque availability differed:

- `always` — current E3 behavior, up to `320 Nm` every step;
- `gated` — up to `320 Nm` only when an active near-vertical foot support contact is present;
- `passive` — `0 Nm`.

The gated policy was implemented only in the test harness. It is **not** yet promoted into the browser specimen or a player controller.

### Unsupported zero-g result

At `48 N·s`:

- always: torso `~0.16° / 0.629 rad/s`, foot angular travel `~175.7 rad`, unsupported actuation on all 480 measured frames;
- gated: torso `~96.45° / 1.496 rad/s`, foot travel `~15.1 rad`, zero unsupported actuation;
- passive: same measured final state/travel as gated.

At `64 N·s`:

- always: torso `~0.01° / 0.721 rad/s`, foot travel `~175.5 rad`;
- gated: torso `~9.70° / 2.340 rad/s`, foot travel `~19.9 rad`;
- passive: same measured result as gated.

Within the deterministic harness, unsupported `gated` matched `passive` to the asserted numerical tolerance.

Therefore:

> Solver-contact gating cleanly removes the internal airborne righting channel.

### Grounded direct-impulse result

The same A/B was run at `48 / 64 / 80 / 96 N·s`.

`always` reproduced the canonical frontier:

- 48 — RECOVER;
- 64 — RECOVER;
- 80 — FALL;
- 96 — FALL.

`gated` produced the same observed outcomes, peak tilts and support travel in this matrix:

- 48 — RECOVER;
- 64 — RECOVER;
- 80 — FALL;
- 96 — FALL.

The foot never lost near-vertical support contact in these trials, including the observed falls (`firstSupportLossFrame = -1`).

### Real dynamic ram result

The same 35 kg ram control was repeated at the established boundary:

- `3.0 m/s` always — RECOVER, `~7.7°` peak, `~0.038 m` support travel;
- `4.0 m/s` always — FALL, `~91.1°` peak, `~0.228 m` support travel;
- `3.0 m/s` gated — same measured recover result;
- `4.0 m/s` gated — same measured fall result.

Both ram cases materially coupled into the torso, and the gated controller applied zero torque while unsupported.

### Strongest current conclusion

The first Owner-positive grounded E3 behavior does **not** require the unbounded airborne reaction-mass channel inside the tested envelope.

The evidence now supports a cleaner causal decomposition:

1. **support-mediated grounded balance** — responsible for the currently tested mannequin-like struggle/recovery/fall behavior;
2. **internal airborne attitude control** — a separate momentum-conserving capability accidentally present because the same actuator remains active without support;
3. **support relocation** — a third mechanism recruited under some geometry/authority conditions, currently represented only by sliding support rather than designed stepping.

This is a materially stronger interpretation than the pre-Owner E3.1 model.

---

## What is now rejected or corrected

Rejected/corrected interpretations:

- “the whole E3 effect may just be decorative wobble” — inconsistent with Owner judgement + physical/machine evidence;
- “finite max torque means the complete balance capability is finite” — false; airborne angular-momentum capacity was not bounded;
- “all self-righting demonstrated by E3 is ground balance” — false; unsupported internal attitude control exists;
- “positive `normalImpulse` is required every frame to detect support” — false for settled persistent contact;
- “narrower support simply lowers a single fall threshold” — not supported; support relocation can become the dominant response;
- E3.1e as isolated proof of reaction-mass influence — rejected because torso inertia was confounded.

Preserved findings:

- the 320 Nm grounded direct frontier remains `64 R / 80 F` in the canonical forward case;
- real 35 kg ram remains `3 m/s R / 4 m/s F` at the tested boundary;
- Owner recognizes the behavior as a primitive body fighting for balance;
- removing unsupported actuation does not change those tested grounded results.

---

## Explicit non-claims

This loop does **not** prove:

- that support-gating is the final player policy;
- that 320 Nm, current Kp/Kd, current geometry or mass distribution are final tuning;
- that airborne body reorientation should be removed from the eventual game;
- that an eventual airborne attitude capability should be binary on/off;
- that the current spherical ankle is a realistic anatomical joint;
- that sliding support is a valid stepping implementation;
- that yaw/facing control is solved;
- that balance is ready to combine with A‴ locomotion;
- that active ragdoll or a humanoid skeleton is now justified;
- that controller-owned, solver-owned or hybrid representation has won architecturally.

---

## Current natural boundary

The validation loop has answered the question that justified it:

> The Owner-positive grounded balance phenomenon survives causal removal of the accidental unsupported attitude-control channel.

That is enough to preserve E3 as a serious research direction and to treat **support-mediated balance** as the clean current E3.1 capability specimen.

The next high-information question is no longer “is this just a reaction-wheel artifact?”.

Before locomotion integration or E3.2 articulation, the most useful remaining boundary is **support-transition semantics**:

- takeoff/support loss;
- landing/support reacquisition;
- whether one-step contact observation latency creates a meaningful angular artifact;
- whether a deliberately bounded airborne attitude capability is desirable at all, and if so what physical resource should bound it (joint range, angular momentum capacity, articulated reaction mass, explicit player capability, or another representation).

Those are new questions. They should not be silently answered by the current always-active ankle actuator.
