# E14 Owner-pin causal checkpoint — 2026-09-03

Status: **Owner selected a concrete E14.1C specimen; exact machine qualification passed; one bounded braking-asymmetry ablation passed as deterministic causal-sensitivity evidence. Next evidence must come from Owner A/B play.**

This checkpoint supersedes only the earlier current-state statement that no Owner specimen had yet been selected. It does not rewrite E13/E14 history, promote Natural-only, choose production mechanics, or prove player skill/fun.

## 1. Owner evidence that moved the frontier

Owner returned after spontaneous public E14 lab play with a concrete pinned configuration and the judgement that the system is still far from a player, but progress is perceptible and there may be a very small promising signal worth investigating.

That judgement is gameplay-value evidence, not a causal proof.

Owner-selected canonical specimen:

`e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only`

Stable ID:

`E14C1-261a1519`

Fields:

- support mass `1180 kg`;
- friction `0.65`;
- acceleration `3 m/s²`;
- braking `36 m/s²`;
- max balance torque `1000 Nm`;
- policy `natural-only`.

Machine did not choose or tune this specimen.

## 2. Exact pinned-specimen qualification

Evidence branch:

`experiment/e14-owner-pin-1180-065-3-36-1000`

Exact qualification commit:

`e231be4a02de1e57ee2ea99da09aeb1c89979737`

Workflow:

`33813566783` — SUCCESS

Artifact:

`9915719258`

Mandatory smoke and build also passed on that branch. Pages deployment was skipped by branch design.

Exact generic-qualifier verdict:

- no-input sanity: `SANE`;
- reset determinism: PASS, max signature delta `0`;
- repeated trace determinism: PASS, worst max signature delta `0`;
- input differentiation: `INPUT_DIFFERENTIATED`;
- all `6 / 6` declared trace pairs differentiated above the numerical epsilon;
- short scripted traces produced no falls;
- `shortPulse` contained `2` support-loss frames, while the other declared traces contained `0`.

This rules out an easy explanation that the Owner-selected specimen is merely a numerically chaotic or non-repeatable accident under the declared apparatus. It does **not** prove skill or fun.

## 3. Source-level mechanism exposed by the pin

Under `natural-only`, `authorityGrantForShortfall(...)` returns zero supplemental translational grant. The target-relative-velocity machinery still computes `desiredAcceleration`, and E14 posture maps that demand to:

`targetLean = atan2(desiredAcceleration, gravity)`

Therefore the Owner pin's `a=3 / b=36` asymmetry is also a posture-command asymmetry.

At gravity `20 m/s²`:

- `3 m/s²` corresponds to about `8.53°` target lean;
- `36 m/s²` corresponds to about `60.95°` target lean.

With balance `kp=1600` and `maxBalanceTorque=1000 Nm`, a large release/reversal request can drive the posture controller into the torque cap while the ordinary `a=3` demand need not do so near neutral posture.

This produced the bounded causal question:

> Does the Owner-pinned `b=36` versus `a=3` asymmetry materially alter deterministic Natural-only posture/physics trajectories?

## 4. Bounded one-variable braking ablation

Only one field changed:

- pinned: `b=36`;
- ablation: `b=3`, exactly matching `a=3`.

Everything else remained fixed.

Ablation specimen:

`e14c1|s1|m=1180|f=0.65|a=3|b=3|t=1000|p=natural-only`

Ablation ID:

`E14C1-6d63bdef`

Final evidence-branch head:

`d5a6fcaed7b5c07d9947388316b8252cbb830e95`

Workflow:

`33813784471` — SUCCESS

Artifact:

`9915781223`

The probe ran four deterministic traces:

- tap → release;
- hold → release;
- tap → reversal;
- hold → reversal.

Both pinned and ablated variants repeated with worst max sample delta `0`.

The probe also asserted that `natural-only` produced zero `grantedRelativeDeltaV`; violation would fail the run.

## 5. Causal-sensitivity result

All four pinned-vs-ablation trajectories differentiated.

At the first release/reversal transition:

- pinned requested about `-36 m/s²` and `-60.95°` target lean;
- symmetric-brake requested about `-3 m/s²` and `-8.53°` target lean;
- pinned hit `-1000 Nm` balance torque;
- symmetric-brake remained below the cap in the measured transition (`~586–670 Nm` depending on prior state).

Representative longer traces:

### hold → release

Pinned `b=36`:

- max abs relative velocity `~1.184 m/s`;
- support-loss frames `2`;
- max abs signed lean `~15.28°`.

Symmetric `b=3`:

- max abs relative velocity `~0.621 m/s`;
- support-loss frames `0`;
- max abs signed lean `~15.79°`.

### hold → reversal

Pinned `b=36`:

- max abs relative velocity `~1.409 m/s`;
- support-loss frames `3`.

Symmetric `b=3`:

- max abs relative velocity `~0.621 m/s`;
- support-loss frames `0`.

Important nuance: the largest torso lean is not simply larger in the pinned case. The strong effect is in command timing, torque saturation, support/contact response and resulting physical trajectory. This is evidence against reducing the phenomenon to "bigger lean angle = more interesting".

## 6. Current interpretation boundary

The current best causal model is:

- ordinary input with `a=3` creates a mild posture/traction attempt;
- release or reversal with `b=36` creates a much stronger counter-posture transient;
- with `t=1000`, that transient can saturate balance torque;
- because the policy is `natural-only`, the resulting translation/recoil comes through the embodied physics/contact path rather than supplemental authority grant.

This makes the Owner's apparent "catch / counter / recovery" action a credible mechanism candidate rather than an unexplained feel report.

But two competing interpretations remain open:

1. **useful state-dependent physical action** — a seed of boundary/competence play;
2. **accidental posture kick** — an interesting but overly synthetic consequence of velocity-target braking semantics.

Machine evidence cannot choose between them.

## 7. Next bounded Owner test

Do **not** sweep braking or torque.

The next test is exact Owner A/B play:

- **A — pinned:** `m=1180, f=.65, a=3, b=36, t=1000, natural-only`;
- **B — braking ablation:** identical except `b=3`.

Owner should play both spontaneously rather than follow an ideal timing script. Primary questions:

- does the interesting "catch / counter" feel materially weaken or disappear in B?;
- does A create meaningful state-reading/correction, or merely a reusable release/reversal kick?;
- does B retain an interesting action-space despite removing the large braking transient?;
- after returning to A, is the difference immediately legible and intentionally usable?

Do not score success rate unless a later question specifically requires it.

## 8. Hard boundary

Current stage has reached:

> **Owner pin selected and exact-qualified; braking asymmetry is a proven deterministic causal lever in this specimen, but its gameplay meaning remains unresolved.**

**STOP FOR OWNER A/B.**

Do not yet:

- tune toward a preferred braking value;
- ablate torque next automatically;
- start World Transfer;
- start Strategy Repertoire;
- change Donor/default runtime;
- promote Natural-only;
- claim H1 boundary skill as established.
