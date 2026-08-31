# E2.2c-2 — Contact Momentum Semantics Falsifier

Status: **machine-qualified A″ Owner-test probe; A′ remains unchanged and no architecture winner is selected**.

## Why this stage exists

E2.2c-1 produced the first real Owner-marked free-play capture. The Owner's qualitative complaint was more specific than the earlier generic "too much slide": the residual motion felt both too strong and as if it did not preserve the direction of momentum.

The capture materially sharpened the earlier E2.2b diagnosis. In the clearest marked events, dynamic contact strongly reduced the incoming horizontal velocity, while the controller simultaneously accumulated a large `externalVelocity` in approximately the opposite direction. Once grounded, zero-input locomotion then moved current `velocity` toward that remembered external target even after dynamic contact had ended.

The implementation fact is:

1. dynamic reciprocity computes `reaction = impulse / -virtualMass`, which is a **delta velocity** (`Δv`);
2. production A′ adds that reaction to current `velocity`;
3. production A′ also adds the same reaction to horizontal `externalVelocity`;
4. locomotion later targets `desiredVelocity + externalVelocity`.

The concern is therefore not merely "external drag is too weak". A contact `Δv` may be stored with the semantics of a persistent target velocity.

## Question

> If dynamic-contact reaction changes current `velocity` exactly once but is not also remembered as `externalVelocity`, does the excessive direction-changing tail collapse while the immediate physical collision and moving-support inheritance remain intact?

This is a falsifier of state semantics, not a proposed final controller architecture.

## Owner evidence basis

The uploaded E2.2c-1 capture contained five complete marked events. Across the clearest cases, the measured post-contact `externalVelocity` could be close to opposite or strongly oblique to the character's actual remaining horizontal velocity. In the owner-1/owner-2 family, an incoming roughly `-Z` motion was largely arrested by contact while a large `+Z` external target remained. Subsequent grounded zero-input frames then accelerated the character toward that target with no new dynamic contact.

This establishes a real free-play symptom consistent with the code-level semantic concern. It does **not** by itself establish that contact impulse magnitude is final or that every marked event has one identical causal path.

## Minimal candidate

The candidate is intentionally smaller than a new momentum system.

A″ keeps production A′ intact through `postStep`, including:

- mover geometry and plane solve;
- causal-component dynamic reciprocity;
- current-velocity reaction;
- rigid-body impulse at the contact point;
- velocity clipping;
- support classification.

Only after that production path completes, if a dynamic contact occurred in the tick, the probe restores horizontal `externalVelocity` to its pre-contact value. Thus the contact consequence remains in current motion and in the dynamic body, but the contact `Δv` is not retained as a future target velocity.

Moving-support launch inheritance is deliberately untouched.

The Owner-facing implementation lives in `src/momentum-semantics-probe.js` as a disposable adapter rather than being promoted into the core controller state model.

## Empirical anchor

The diagnostic reconstructs the relevant floor, body-1 and character state from the Owner-marked `owner-1` capture immediately before its first dynamic contact. This is an empirical anchor, not a claim of full event replay equivalence.

Both production A′ and the velocity-only-contact candidate reached first contact on the same frame with an identical first collision:

- first contact impulse: `86.86 N·s` in both;
- contacted body's first linear response: identical at the gate tolerance;
- contacted body's first angular response: identical at the gate tolerance.

After the seven-frame contact episode:

| metric | A′ current | velocity-only contact candidate |
| --- | ---: | ---: |
| contact episode | `0–6` (`7f`) | `0–6` (`7f`) |
| landing frame | `6` | `6` |
| first impulse | `86.86 N·s` | `86.86 N·s` |
| horizontal `externalVelocity` peak | `3.222 m/s` | `0.488 m/s` |
| post-episode tail at `0.25 s` | `0.395 m` | `0.054 m` |
| post-episode tail at `0.50 s` | `0.773 m` | `0.110 m` |
| peak reversal relative to incoming direction | `2.547 m/s` | `0.418 m/s` |

At `0.10 s` after the episode:

- A′ velocity was approximately `(-0.076, +2.085) m/s` in X/Z while remembered external was `(-0.047, +2.637) m/s`;
- the candidate was approximately `(-0.004, +0.391) m/s` for both current and external horizontal state.

The candidate therefore removed most of the delayed reversal/tail in this recovered-state anchor without weakening the first physical contact.

## Moving-support control

The same test preserves translating-support jump inheritance exactly:

- jump external speed: `1.501 m/s` in both;
- horizontal carry at `0.50 s`: `0.735 m` in both;
- external speed at `0.50 s`: `1.345 m/s` in both;
- actual horizontal speed at `0.50 s`: `1.345 m/s` in both;
- support state at `0.50 s`: `AIR` in both.

This is important because E2.2b showed that blindly increasing global damping altered contact persistence and support carry together. The current falsifier separates those sources without introducing a general source-tagged momentum framework.

## Interpretation

The result strongly supports a narrower statement than "externalVelocity is bad":

> **Dynamic-contact `Δv` should not automatically be treated as a persistent absolute velocity target.**

The physical collision can remain strong and reciprocal at the instant of contact while the delayed direction-changing tail collapses once that duplicate target-state write is removed.

This does not yet prove the final desired recovery law. In particular:

- current `velocity` can still carry substantial physical consequence after contact;
- player motor authority may still cancel or redirect that consequence too quickly or too slowly in other cases;
- the magnitude and multi-frame accumulation of dynamic-contact impulses remain open;
- pre-existing non-contact `externalVelocity` can still contribute to some residual reversal;
- moving-support inheritance remains implemented through the same external target mechanism and is not declared final.

## Public Owner probe

The branch exposes A″ as a fourth comparison mode:

- `1` — A frozen baseline;
- `2` — B frozen solver-owned root;
- `3` — A′ causal-component reciprocity with current contact memory;
- `4` — A″ same A′ collision path, but dynamic-contact `Δv` is not retained as `externalVelocity`.

Direct query once deployed:

`?mode=momentum`

A″ is an Owner-test probe, not a promoted baseline.

## Stage boundary

Machine evidence now justifies Owner A′↔A″ free play before building a more elaborate momentum model.

The next useful Owner question is narrow:

> Does A″ preserve the desired sense of physical consequence while removing the wrong-direction / excessive residual slide in ordinary play?

Interpretation after Owner play:

- if direction and tail feel materially better while physical impacts remain credible, the contact-memory semantic defect is strongly confirmed and the next research target becomes remaining impulse magnitude/contact accumulation and bounded agency recovery;
- if A″ feels too dead or world consequence is cancelled too quickly, investigate the smallest explicit recovery/agency mechanism rather than restoring `Δv` as an absolute target;
- if strong wrong-direction motion remains, attribute the residual to contact generation, clipping/mover deflection, pre-existing external state or player motor behavior before adding new architecture.

Do not automatically:

- replace A′ with A″ as the accepted baseline;
- delete `externalVelocity` globally;
- change moving-support inheritance;
- tune drag constants to force a desired answer;
- cap contact impulses before the remaining magnitude question is isolated;
- infer that solver-owned or controller-owned architecture has won.
