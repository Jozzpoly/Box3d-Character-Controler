# E2.3c — constraint-velocity policy falsifier

Status: **research survivor identified; production behavior unchanged**.

Base behavior under test: current A″ / Donor v0 at the E2.3b boundary.

## Question

E2.3b established that current A″ can preserve locomotion velocity through almost a second of geometric blocking and later release that velocity after the constraint clears. The bounded neutral-jump anchor retained `5.200 m/s` while blocked and travelled `1.282 m` after the player had released directional input.

E2.3c asks a narrower follow-up:

> What is the smallest explicit constraint-velocity policy that removes velocity no longer justified by the current player/world relationship without destroying useful mover negotiation, dynamic reciprocity, or moving-support carry?

This stage does **not** patch `box3d.js`, change `ControllerOwnedCharacter`, alter Donor v0, or select a new public baseline.

## Why full native clipping is not the answer by default

E2.3 already proved that `box3d.js@0.1.1` loses the solved `b3CollisionPlane.push` state across the separate JS `b3SolvePlanes(...)` and `b3ClipVector(...)` calls. Reconstructing and propagating that state activates the native-intended clip, but it also changes the recovered Owner contact lifecycle from `7` frames to `1` and changes support state.

E2.3c therefore treats native clipping as one comparison endpoint, not as correctness by definition.

## Matrix 1 — immediate active-plane clipping

The first falsifier compared:

- `current` — actual A″ binding behavior, effectively no fresh-plane velocity clip;
- `full-native` — recovered `plane.push` + native `b3ClipVector`;
- `horizontal-all` — clip only horizontal active planes, regardless of body type;
- `horizontal-world` — clip only horizontal static/kinematic active planes, leaving dynamic bodies to causal reciprocity.

Measured result:

| policy | neutral release | stairs | Owner dynamic anchor | moving-support carry | verdict |
| --- | ---: | --- | --- | --- | --- |
| current | `1.282 m` | PASS | `7f`, preserved | preserved | reference |
| full-native | `0.000 m` | **FAIL** | `1f`, changed | preserved | REJECT |
| horizontal-all | `0.000 m` | **FAIL** | `1f`, changed | preserved | REJECT |
| horizontal-world | `0.000 m` | **FAIL** | `7f`, preserved | preserved | REJECT |

`horizontal-world` was especially informative. Separating static/kinematic geometry from dynamic reciprocity preserved the exact dynamic Owner anchor, but immediate clipping still stopped the ordinary `0.22 m` stair traversal almost at its first riser.

Interpretation:

> Body-type separation was useful; immediate retirement of blocked velocity was too aggressive for short-lived geometric negotiation.

The mover sometimes needs intent-backed velocity to remain available while it resolves a step or similar shape transition.

## Matrix 2 — current intent as the ownership boundary

The next hypothesis avoided arbitrary persistence timers.

Instead of asking how long a blocked velocity has existed, it asks whether the **current player intent still justifies that normal component**.

Two policies were separated:

### `intent-release-world`

For an active horizontal static/kinematic constraint:

- if current desired motion has no inward component, remove inward velocity;
- if desired motion has any inward component, retain the whole current inward velocity.

This fixed neutral and tangent release while preserving stairs, held-forward jump, dynamic Owner contact, and support carry. It still failed a diagonal case because a small/partial current inward request allowed the entire stale `5.2 m/s` component to survive.

At 45-degree input:

- justified forward desired component: `3.677 m/s`;
- current / `intent-release-world` release component: `4.763 m/s`;
- stale excess: `1.086 m/s`.

Verdict: **REJECT**.

### `intent-cap-world`

For each active horizontal static/kinematic plane, decompose velocity onto its horizontal normal and cap only the inward component that exceeds the current desired inward component.

Conceptually, with horizontal plane normal `n`:

```text
v_in = velocity · n
d_in = desiredVelocity · n
allowed_in = min(0, d_in)

if v_in < allowed_in:
    remove only (v_in - allowed_in) along n
```

This means:

- neutral/tangent intent permits `0` inward velocity;
- 45-degree intent permits only the `3.677 m/s` component actually requested;
- held-forward intent permits the full `5.2 m/s` locomotion request, so the mover can still negotiate stairs/low geometry.

Measured result:

| case | current | intent-release-world | intent-cap-world |
| --- | ---: | ---: | ---: |
| neutral stale release | `1.282 m` | `0.000 m` | `0.000 m` |
| tangent unwanted forward release | `1.714 m` | `0.000 m` | `0.000 m` |
| diagonal max forward velocity | `4.763 m/s` | `4.763 m/s` | `3.677 m/s` |
| diagonal excess above current intent | `1.086 m/s` | `1.086 m/s` | `0.000 m/s` |
| held-forward max forward velocity | `5.200 m/s` | `5.200 m/s` | `5.200 m/s` |
| held-forward blocker crossing | `13f` | `13f` | `13f` |
| stairs | PASS | PASS | PASS |
| ledge block | PASS | PASS | PASS |
| Owner dynamic contact | `7f` | `7f` | `7f` |
| moving-support jump carry | preserved | preserved | preserved |

`intent-cap-world` therefore survived the static-world matrix.

## Matrix 3 — moving kinematic constraint

Treating every kinematic plane as though the obstacle had zero world velocity is not generally valid.

A dedicated isolate used a kinematic wall travelling away from the character at `4.000 m/s`, while the character approached at `5.200 m/s`.

With zero current movement intent, the meaningful constrained quantity is the **relative** closing velocity. A policy that simply caps world-normal character velocity to zero throws away the shared `4 m/s` motion of the moving boundary.

Measured result:

| policy | first constrained Vx | wall Vx | Vx five frames later | relative excess | verdict |
| --- | ---: | ---: | ---: | ---: | --- |
| current | `5.200` | `4.000` | `5.200` | `+1.200` | reference |
| intent-cap-world | `0.000` | `4.000` | `0.000` | `-4.000` | REJECT |
| intent-cap-relative | `4.000` | `4.000` | `4.000` | `~0.000` | **SURVIVOR** |

When forward intent remained held, `intent-cap-relative` preserved the full `5.200 m/s` locomotion request. Stationary static and stationary kinematic release both remained `0.000 m`, and moving-support jump carry remained unchanged.

## Current survivor — intent-capped relative constraint velocity

For static/kinematic horizontal constraints, the strongest current interpretation is:

1. obtain the constraint surface point velocity `c` (`0` for static);
2. evaluate character velocity in the surface-relative frame: `v_rel = v - c`;
3. evaluate desired locomotion in the same frame: `d_rel = desiredVelocity - c`;
4. along each active horizontal plane normal `n`, allow no more inward relative velocity than current desired relative motion asks for;
5. remove only the excess inward relative component;
6. leave tangent components unchanged;
7. do **not** apply this policy to dynamic-body planes — dynamic consequence remains owned by the separately qualified causal reciprocity path.

In scalar form:

```text
v_rel_in = (velocity - surfaceVelocity) · n
d_rel_in = (desiredVelocity - surfaceVelocity) · n
allowed_rel_in = min(0, d_rel_in)

if v_rel_in < allowed_rel_in:
    retire only the excess normal component
```

Working interpretation:

> **Constraint velocity is relative, and the player may retain only the constrained normal authority still justified by current intent.**

This fits the broader project model:

> Player intends. Controller interprets. Body attempts. Physics answers.

The controller may continue attempting a requested motion while geometry negotiates a step, but it should not preserve extra normal authority after the request or moving-boundary relationship no longer justifies it.

## What this does not prove

The survivor is still diagnostic. It has not yet earned production promotion.

E2.3c does not prove that:

- this policy is complete for arbitrary slopes, rotating kinematic side constraints, or multi-plane corners;
- every kinematic interaction should use exactly this ownership model;
- the recovered JS plane-push reconstruction should become a permanent runtime implementation detail;
- Donor v0 should change;
- A″ should be overwritten in place.

The recovered `plane.push` is currently test apparatus needed to identify which planes were actually active in the mover solve. A production implementation should be chosen deliberately rather than copying the diagnostic shim merely because it worked.

## Production boundary

No runtime file is changed by E2.3c.

A future production-path stage should create a **new explicit specimen**, preserving A″ and Donor v0 as qualified references. Before promotion, the survivor should be exercised in a public/free-play form and should retain the previous Foundation/E2 invariants.

High-value remaining falsifiers for a production candidate include:

- oblique wall/corner free play;
- rotating kinematic side constraints if they become relevant;
- Owner judgement on whether neutral/tangent release feels more correct without making movement feel sticky or over-controlled.

Do not silently patch the existing donor profile. A behavior promotion must receive a new specimen/profile revision after qualification.
