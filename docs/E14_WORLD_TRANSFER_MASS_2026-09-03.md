# E14 World Transfer — support-mass boundary — 2026-09-03

Status: **Owner braking A/B resolved the immediate gameplay meaning of the `b=36` asymmetry strongly enough to advance one bounded step. A one-property support-mass transfer (`1180 → 800 kg`) is machine-qualified and is now at the Owner boundary.**

This document does not promote Natural-only, the current `3/36/1000` values, or the one-leg organism into Donor/default mechanics. It records a bounded research progression only.

## 1. Owner A/B result

Owner compared the exact selected pin against the symmetric-braking ablation in one short locked-play session.

A — selected pin:

`e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only`

ID: `E14C1-261a1519`

B — braking ablation:

`e14c1|s1|m=1180|f=0.65|a=3|b=3|t=1000|p=natural-only`

ID: `E14C1-6d63bdef`

Owner judgement:

- `b=36` feels as if the organism returns toward useful posture faster;
- it gives more control and makes the current one-leg locomotion attempt easier to perform;
- `b=36` feels stiffer, livelier and more energetic;
- `b=3` feels more like a flexible stick / compliant rod that keeps bending and swinging rather than being caught quickly.

The new comparative recording is about `31.1 s`. The first section uses `E14C1-261a1519`; the later section reloads `E14C1-6d63bdef`. Visual review is consistent with the spontaneous judgement: the high-braking variant repeatedly reaches short usable near-upright catches after excursions, while the low-braking variant more often continues through upright into a broad opposite excursion. This visual observation supports the Owner report but is not a standardized trace or independent causal proof.

## 2. What this changes epistemically

The previous open interpretations were:

1. useful state-dependent physical action;
2. accidental synthetic posture kick.

The A/B does not eliminate all synthetic-controller concerns, but it changes the balance of evidence.

Owner is not merely reporting that `b=36` produces a larger spectacle. The difference is legible as **control quality**: faster recenter/counter response, greater stiffness/liveliness and improved ability to perform the emergent one-leg walking action.

Therefore the current result is:

> **H1 boundary/competence play has a supported seed in the current organism: Owner can perceive and intentionally prefer a causal controller property because it improves manipulation of the physical state.**

This is weaker than "boundary skill established" and much weaker than "good player controller". The current body still has a tiny strategy repertoire and is far from a player.

## 3. Important semantic warning

Under `natural-only`, supplemental translational authority remains zero.

However `acceleration` and `braking` still update the target-relative-velocity command; its derivative becomes `desiredAcceleration`, which drives posture target lean.

Consequently, in this specimen the UI labels `acceleration` and `braking` are not merely physical translational acceleration/braking parameters. They also behave as **posture-command response rates**, especially during release/reversal.

The Owner result therefore suggests a useful future controller concept — asymmetric outbound versus recenter/reversal response bandwidth — but it does **not** justify renaming or redesigning the controller yet. First test whether the learned manipulation survives a small world change.

## 4. Why World Transfer is now the smallest useful next step

Repeating more braking values would mostly become tuning.

A torque ablation would ask a different internal-capacity question before we know whether the learned action generalizes at all.

The cleanest next question is:

> **Does the same unchanged Owner controller remain learnable/useful when one physical property of the support changes, requiring adaptation to a different world response?**

Only support mass changes.

Friction is deliberately not changed because it simultaneously alters traction/contact behavior and the E12 entitlement diagnostic. Support mass is a cleaner external-world property here and has a known qualitative meaning from E14.0: a lighter free support should recoil more.

## 5. Declared transfer pair

Baseline / learned world:

`e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only`

`E14C1-261a1519`

Transfer world:

`e14c1|s1|m=800|f=0.65|a=3|b=36|t=1000|p=natural-only`

`E14C1-f315bc9d`

Only `supportMass: 1180 → 800 kg` changes.

The `800 kg` value is the existing E14 reference support mass, not a machine-optimized target.

## 6. Machine prequalification

Evidence branch:

`experiment/e14-world-transfer-mass-800`

Evidence head:

`f5079a99521f974354ef370454032f5148a1b204`

Workflow:

`33814965049` — SUCCESS

Artifact:

`9916199522`

The same generic qualifier was run in one workflow for both the learned `1180 kg` specimen and the transfer `800 kg` specimen.

Both variants:

- no-input: `SANE`;
- reset determinism: PASS, delta `0`;
- repeated trace determinism: PASS, delta `0`;
- telemetry finite/current;
- input differentiation: `INPUT_DIFFERENTIATED`;
- no falls in the declared short traces.

The mass transfer does not destroy the apparatus or produce numerical chaos.

## 7. Expected physical difference is present without gross body drift

Representative `longerHold` trace:

### 1180 kg

- support velocity: `-0.018261 m/s`;
- player velocity: `0.268176 m/s`;
- relative velocity: `0.286437 m/s`;
- max abs lean: `9.700°`.

### 800 kg

- support velocity: `-0.025922 m/s`;
- player velocity: `0.258074 m/s`;
- relative velocity: `0.283997 m/s`;
- max abs lean: `9.747°`.

The lighter support recoils substantially more while body lean and local relative response remain close.

Representative `pulseReversal` final support velocity changes from about `0.02268` to `0.03318 m/s` with the lighter support, again showing stronger world reaction without a qualitative collapse of the controller.

This is the intended transfer geometry: **same controller, recognizably same organism, altered world consequence.**

## 8. Owner protocol

Do not tune either specimen during the comparison.

A — familiar world: `1180 kg`.

B — transfer world: `800 kg`.

Play spontaneously. No ideal rhythm or target success rate is prescribed.

Primary observations:

- can the same one-leg walking/catch skill still be used at all on the lighter support?;
- does Owner naturally change timing or correction size after feeling the different recoil?;
- is the difference read as a world property rather than as arbitrary controller damage?;
- after a short adaptation, does control improve again, remain equally good, or stay degraded?;
- does returning to `1180 kg` make the learned-world timing immediately obvious?

The strongest positive evidence is not equal performance. It is **legible adaptation**: the world changes, Owner notices the changed consequence and modifies control accordingly.

## 9. Outcome boundary

If the learned action survives with legible adaptation, H1 strengthens materially and the project can consider either a second small world transfer or the smallest strategy-repertoire expansion.

If it collapses but the reason is clearly insufficient physical capacity/repertoire, do not call H1 false; the one-leg representation may be too narrow.

If the same fixed rhythm works with no perceptible difference despite the stronger support recoil, the current action may be more open-loop/timing-driven than state-dependent.

If the lighter world becomes chaotic or unreadable despite machine sanity, stop and inspect the human-scale dynamics rather than tuning mass into a desired outcome.

## 10. Hard boundary

Current stage:

> **Owner A/B supports `b=36` as an intentionally useful control-quality lever in the current one-leg organism. The first one-property World Transfer (`supportMass 1180 → 800 kg`) is machine-qualified.**

**STOP FOR OWNER WORLD TRANSFER.**

Do not yet:

- sweep support mass;
- change friction at the same time;
- retune braking or torque for the `800 kg` world;
- start Strategy Repertoire;
- add recovery mechanics;
- promote Natural-only or current lab values;
- change Donor/default runtime.
