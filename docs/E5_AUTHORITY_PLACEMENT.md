# E5 — Translational authority placement and accounting

Status: **closed research stage / evidence only**

Base canonical `main` when the stage began:

`04d2c97eeaa8d0724f4849d3c1d90541fae515cb`

Final research head before canonical documentation:

`556fc0749784247aa1bc37fbdf529fa0c0afdbae`

E5 does **not** modify A‴ / Donor v1, E3 runtime mechanics, browser behavior, or any donor contract. Its implementation is research-harness code plus research-smoke wiring.

## 1. Why E5 existed

E4 established that current A‴-strength launch and braking demands can coexist with finite posture in the carriage proxy when the organism is allowed to physically prepare. That result did **not** establish where translational authority should physically enter an embodied organism.

The question entering E5 was therefore:

> **If accepted player translation is no longer treated as a controller-owned mover right, what physically supplies that authority, what momentum bookkeeping follows, and how much of the accepted A‴ response can the current single-support organism actually earn through contact?**

E5 intentionally separated authority-placement mechanisms before designing stepping, legs, gait or a new donor revision.

## 2. Common comparison envelope

Unless a probe explicitly varies solver resolution:

- Donor-v1 comparison mass: `80 kg`;
- gravity: `20 m/s²`;
- current ground acceleration: `31 m/s²`;
- current ground deceleration: `36 m/s²`;
- target speed: `5.2 m/s`;
- fixed outer step: `1/60 s`;
- canonical Box3D substeps: `4`;
- E3 sagittal finite-posture organism where posture is involved;
- finite posture authority: `320 Nm`;
- comparison support friction: `μ = 0.95`;
- mirrored `±` directions.

The E5 probes are causal/accounting instruments. A machine PASS does not prove gameplay feel.

## 3. E5.0 initial authority-placement crucible — superseded measurement

Historical probe:

`scripts/e5-0-authority-placement-crucible.mjs`

The first crucible already separated three intended authority semantics:

1. **world-external** — direct player impulse independent of support;
2. **support-uncapped** — authority exists only with support and applies equal-and-opposite impulse to dynamic support;
3. **support-coulomb** — same support exchange, additionally bounded by a Coulomb-style `μJ_n` budget.

However the first implementation treated raw contact impulse telemetry too casually: it combined `normalImpulse` and `totalNormalImpulse` without first qualifying what those Box3D fields mean over one outer step.

That makes the first E5.0 useful as provenance but **not the authoritative quantitative traction result**.

It remains in the repository as a historical falsifier showing why contact telemetry semantics had to be calibrated before interpreting force capacity.

## 4. E5.0a — Box3D contact-load calibration

Probe:

`scripts/e5-0a-contact-load-calibration.mjs`

E5 stopped the authority comparison and first calibrated the pinned `box3d.js@0.1.1` contact signals on a settled `80 kg` support case across substeps `[1,2,4,8]`.

Expected outer-step support impulse:

`m g dt = 80 × 20 × 1/60 ≈ 26.667 N·s`

The calibration established two distinct signals in the settled control:

- `normalImpulse` is the final-substep impulse; in this control `normalImpulse × substeps ≈ m g dt`;
- raw `totalNormalImpulse` is approximately `2 × m g dt` because its accumulation includes the relaxation iteration.

The pinned native Box3D debug-force convention corrects the latter with:

`0.5 × totalNormalImpulse`

Therefore E5 may use `0.5 * totalNormalImpulse` as an **outer-step diagnostic normal-load estimate** on this pinned substrate.

Non-claim:

> This calibration does not promote `0.5 * totalNormalImpulse`, a load epsilon, or any scalar contact signal as a universal gameplay support policy.

## 5. E5.0b — corrected authority-placement crucible

Probe:

`scripts/e5-0b-authority-placement-corrected.mjs`

After calibration, E5 repeated the mechanism comparison with passive horizontal friction disabled so horizontal impulse came only from the declared authority model.

### World-external authority

In zero gravity with no support, world-external authority reproduced the requested current `31 m/s²` acceleration.

On dynamic support, total player+support momentum changed by approximately the externally applied control impulse.

Durable result:

> **World-external authority can preserve requested translation without support, but it injects net momentum into the player+support system.**

This can be a legitimate gameplay authority model, but it must not be described as support-earned reciprocity.

### Support-mediated exchange

Both support-mediated modes produced no authority without support.

Against dynamic support, their player/support impulses were equal-and-opposite to the declared tolerance, preserving total horizontal momentum accounting.

Durable result:

> **Support-mediated authority can preserve reciprocity, but its existence and throughput are properties of the support interaction rather than unconditional player rights.**

### Ordinary Coulomb throughput

With `μ = 0.95`, the settled simple-support scale is:

`μg ≈ 19 m/s²`

Requests at or below the calibrated scale pass through. Larger requests saturate around that scale.

Current Donor-v1 demands are larger:

- launch: `31 m/s²`;
- braking: `36 m/s²`.

Durable result:

> **Ordinary Coulomb-limited exchange in the simple single-support specimen cannot by itself reproduce the full accepted A‴ ground acceleration/deceleration envelope under static weight.**

This rejects neither physical traction nor support-mediated locomotion generally. It exposes the capacity conflict the representation must solve.

## 6. E5.1 — posture ↔ support-load recruitment

Probe:

`scripts/e5-1-posture-load-recruitment.mjs`

E5.1 returned to the exact E4.5 current-31 launch and asked a narrower question:

> **Does the anticipatory posture state merely keep the organism from falling, or does it materially change the physical contact/load state and horizontal momentum actually transferred through support?**

The probe first reproduced the qualified E4.5 outcome pattern:

| Substeps | lead0 `-/+` | lead8 `-/+` |
| ---: | --- | --- |
| `1` | F/F | F/F |
| `2` | F/F | R/R |
| `4` | F/F | R/R |
| `8` | F/F | R/R |

Recovered lead8 cases at substeps `2/4/8` retained reactive support through the imposed ramp.

For whole-body horizontal transfer, E5.1 deliberately avoids inferring the answer from scalar contact telemetry. Internal ankle impulses cancel in whole-body linear momentum and gravity has no horizontal component, so whole-body horizontal `ΔP` is the exact net horizontal support impulse in this experiment.

In the robust recovered `[2,4,8]` lead8 cases:

- posture preparation recruited at least about **1.12×** the ramp normal-load diagnostic relative to lead0;
- physical support/contact supplied about **64.6–71.0%** of the full `80 kg × 5.2 m/s` ramp impulse requirement;
- whole-body speed at ramp end was about **4.20–4.42 m/s** while support reached `5.2 m/s`.

Durable correction to E4 interpretation:

> **E4 proved survivability/posture compatibility under current-strength inertial demand. E5.1 shows that physical preparation also recruits real contact load and physical horizontal momentum transfer — but the current single-support organism still does not fully reproduce the accepted A‴ translational response through contact alone.**

## 7. E5.2 — residual-authority accounting

Probe:

`scripts/e5-2-residual-authority-accounting.mjs`

E5.2 did **not** propose a hybrid controller. It introduced an explicit diagnostic residual channel to measure the cost of closing the remaining response gap after physical support/contact had acted.

Residual semantics:

- world-external linear impulse;
- mass-proportional across foot + torso;
- only while `reactiveSupport` exists;
- only during the acceleration ramp;
- never a direct velocity assignment;
- bounded by current velocity shortfall;
- momentum contribution accounted separately from support/contact.

The declared residual-acceleration sweep was:

`[0, 4, 8, 12, 16] m/s²`

Near-match diagnostic window:

`|v_end - 5.2| <= 0.10 m/s`

### Coarse-sweep result

| Substeps | First useful coarse observation |
| ---: | --- |
| `1` | `16 m/s²` reaches a symmetric near-match; roughly **57%** of required ramp authority is external in that case |
| `2` | `8 m/s²` gives R/R and roughly `5.22–5.27 m/s`; external share is about **29.5%** |
| `4` | `8` remains too weak; `12` begins asymmetric overshoot, so the declared coarse sweep contains no clean symmetric near-match |
| `8` | `12` comes very close, but one direction remains about `0.134 m/s` outside the declared diagnostic window |

These are accounting observations, not tuning targets.

### Interaction between external assist and physical contact

The residual does not simply add a fixed missing amount after an unchanged physical response. As residual authority increases, the support/contact contribution can decrease.

That means authority channels interact dynamically rather than forming a clean independent sum.

At stronger residual levels, recoverability can also degrade again. The sweep reproduced asymmetric falls at high assist and F/F at substeps `8` for the strongest declared residual.

Most importantly, at `substeps=1` even `4 m/s²` residual changes the previous physical-only F/F case to R/R.

Durable warning:

> **World-external assistance can mask a physical substrate that does not independently possess the required recoverability/capacity.**

Support gating prevents the diagnostic residual from becoming an airborne locomotion right, but it does not restore reciprocity or make the authority physically earned.

## 8. What E5 established

### Proven / retained in the declared specimens

1. Authority placement is a real causal distinction, not an implementation detail.
2. World-external authority can preserve accepted acceleration without support, at the cost of unilateral system-momentum injection.
3. Support-mediated exchange can preserve equal-and-opposite momentum accounting and naturally disappears without support.
4. Ordinary `μ=.95` Coulomb throughput under static load is about `19 m/s²` in the simple specimen, below current `31/36 m/s²` demands.
5. E4-style anticipatory posture preparation materially recruits support load and increases physically transferred horizontal momentum.
6. In recovered lead8 current-31 cases across substeps `2/4/8`, physical support supplies a majority, but not all, of the full accepted ramp momentum requirement.
7. A world-external residual can close part or all of the response gap in some tested cases.
8. Increasing residual authority can displace physical contact contribution and change recoverability rather than merely adding independent momentum.
9. External residual authority can rescue a solver-resolution case where the physical-only substrate fails, so it can hide physical inadequacy.

### Corrected / rejected interpretations

- raw `totalNormalImpulse` is not a direct one-outer-step load value on this pinned solver; the relaxation accumulation must be accounted for;
- E4 did **not** prove full physical reproduction of A‴ translation;
- `μg ≈ 19 m/s²` does **not** prove all traction-based designs are incapable of accepted agency;
- a coarse residual value that happens to land near `5.2 m/s` is not a selected gameplay constant;
- residual assist is not independent of contact mechanics;
- support gating does not turn world-external assistance into reciprocal propulsion;
- a hybrid architecture has not been selected.

## 9. Explicit non-claims

E5 does **not** select:

- pure traction;
- hybrid authority sharing;
- a world-external force/impulse controller;
- `4`, `8`, `12`, `16`, or any interpolated residual acceleration as gameplay tuning;
- solver substeps as a tuning knob;
- deliberate support relocation or stepping;
- legs, gait or humanoid architecture;
- Donor v2;
- an A‴ retune;
- weaker `31/36 m/s²` accepted agency;
- a production support-signal policy.

In particular, E5 deliberately stops rather than tuning `9/10/11 m/s²` merely to obtain a visually satisfying `5.2` match.

## 10. Runtime consequence

There is **no runtime promotion** in E5.

No E5 mechanics enter:

- `src/character.js`;
- `src/constraint-velocity-character.js`;
- `src/e3-balance-organism.js`;
- the browser E3 surface;
- A‴ / Donor v1;
- any donor contract or profile.

The normal public/default player remains A‴ / Donor v1.

## 11. Validation / provenance

Final research branch head before documentation:

`556fc0749784247aa1bc37fbdf529fa0c0afdbae`

GitHub Actions run:

`33677278776`

On that exact head:

- research smoke: SUCCESS;
- Donor smoke: SUCCESS;
- production build: SUCCESS;
- Pages configuration/upload/deploy: correctly skipped on the non-main branch.

The branch was `10` commits ahead / `0` behind the E4 canonical base at that boundary. Before documentation, changed surface was limited to E5 research scripts and research-smoke wiring; `src/`, README and docs were unchanged from E4 canonical state.

## 12. Natural boundary after E5

The authority-placement question is now narrower than after E4.

We know that posture preparation can increase physically earned authority, but the current single-support organism does not reproduce the complete accepted response through contact alone. We also know that world-external residual authority can preserve agency, but doing so changes reciprocity, displaces contact contribution and can conceal physical failure.

The next problem is therefore:

> **Should the next portion of missing agency be earned physically by changing the support/contact representation — for example deliberate support relocation — or should some bounded gameplay authority be granted explicitly and honestly as non-reciprocal assistance?**

This is a decision/problem boundary, not permission to implement either answer immediately.

Before a new research stage, candidate next experiments should be compared by information gain. In particular:

- do not build humanoid gait merely because support relocation is now plausible;
- do not tune residual acceleration merely because bounded assist is now measurable;
- do not weaken accepted A‴ agency merely to make the existing organism easier to control;
- do not claim sliding support drift is stepping;
- do not open E5.3 by inertia.
