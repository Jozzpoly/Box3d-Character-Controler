# E18 Manipulation V0 — intent/proxy qualification

Date: 2026-09-05  
Branch: `experiment/e18-manipulation-v0`  
Qualified checkpoint before this documentation commit: `6a1aef0ca0ea025e3ab8ceefd9e31f59a00aada0`

Validation at that exact checkpoint:

- E18 branch diagnostics run `33959216463` — **SUCCESS**;
- canonical `Verify and deploy playground` run `33959216478` — verify job **SUCCESS**;
- foundation/history smoke, `smoke:current` and build all passed;
- Pages deployment was correctly skipped because this is not `main`.

## Purpose

E18.0a–0j isolated the manipulation-intent representation and transport boundary before spending more work on a new orientation executor.

The question was not yet “what final mouse controls feel best?”. It was:

> Can we represent a persistent 3D manipulation request independently of camera observation and finite execution, transport it with the accepted player carrier without inventing physical consequence, and feed it into the existing E17 executor without silently changing authority?

The answer is **yes, with one explicit outer-step phase boundary that should remain visible rather than be hidden by naive prediction**.

This qualification is preparation for P3/P2/P4 architecture work. It does not promote a new public runtime.

## E18.0a — frozen click-plane representation is not a general hold frame

The current E17 browser grammar freezes a world drag plane at acquisition and repeatedly intersects the current camera ray with it.

Pure geometric reconstruction showed that this representation can transform later player/camera motion into target motion even without an explicit manipulation command.

Representative evidence:

- carrier forward `2 m`: frozen-plane target reached about **1.90 m peak carrier-relative drift**;
- carrier right `2 m`: drift was essentially zero in that particular geometry;
- stationary carrier + `45°` camera orbit: target drifted about **0.416 m**.

The rightward control is important: the problem is geometry-dependent and can therefore hide during casual testing. This is not merely a constant offset or sensitivity issue.

Conclusion:

> A click-time frozen ray plane must not remain the canonical representation of persistent manipulation intent.

## E18.0b — the representation error survives real E17 + Box3D

A physical E17 diagnostic compared the frozen-plane policy with a carrier-relative reference while keeping the same character/executor mechanics.

Forward carry:

- frozen-plane object↔carrier offset drift: **~1.908 m**;
- carrier-relative reference: **~0.299 m**.

Rightward carry:

- frozen-plane: **~0.486 m**;
- carrier-relative reference: **~0.299 m**.

The carrier-relative policy is only a reference here; 0b did not promote final UX. It established that the target-frame problem is mechanically consequential rather than a visualization artifact.

## E18.0c — camera observation must not silently become object command

With carrier and pointer stationary, production-equivalent camera smoothing performed a `45°` yaw orbit.

Frozen-plane policy:

- target path: **~0.493 m**;
- final target drift: **~0.492 m**;
- object net travel: **~0.481 m**.

Stable-world target reference:

- target drift: **0**;
- object net travel: approximately numerical noise.

Conclusion:

> Camera motion is observation. It may define the basis used by an explicit manipulation input event, but camera orbit alone must not mutate persistent manipulation intent.

## E18.0d — explicit `ManipulationIntent` contract

A pure intent-state layer was introduced and qualified independently of Box3D, DOM and Three.js.

It separates:

- persistent requested `targetWorld`;
- explicit target deltas;
- transport origin bookkeeping;
- camera-relative input conversion from the physical executor.

Result: **PASS**.

This layer deliberately does not own reach, force, saturation or physics.

## E18.0e — incremental screen mapping

A perspective-correct incremental screen-plane mapping was qualified over tested camera orientations, depths, viewport sizes and FOVs.

Properties:

- screen delta becomes an explicit world-space manipulation delta;
- camera basis is sampled when the input event occurs rather than preserved as an absolute click-time plane;
- a separate explicit depth delta exists;
- zero command produces zero intent mutation.

Result: **PASS**.

This proves geometry, not final sensitivity, pointer-lock policy, wheel mapping or Owner feel.

## E18.0f — physical core is not the high-level transport frame

With `feedbackGain=0`, Donor carrier and finite E15 physical core were compared as possible transport origins without feeding the counterfactual core-relative target into the manipulator.

Ordinary Donor walk:

- carrier/core final divergence: below **0.5 µm**.

Physical consequence cases:

- manipulator recoil: peak core-beyond-carrier divergence **~3.16 cm**, residual differential path **~11.6 cm**;
- external core impulse: peak divergence **~7.5 cm**, differential path **~15 cm**.

Conclusion:

> In the present E15/E17 hybrid, `bodyPosition` would convert solver-level physical consequence into new high-level manipulation command. The transport origin should be the accepted Donor carrier, `character.position`.

This is scoped to the current hybrid architecture, not a universal rule for a future fully physical player body.

## E18.0g — accepted feedback already carries consequence into Donor

The same distinction was tested with live/default `feedbackGain=1`.

Physical consequence already enters the Donor carrier through the accepted E15 bridge:

- external core impulse: carrier net travel **~0.275 m**;
- manipulator recoil under `0.45 m` explicit target motion: carrier net travel **~0.344 m**.

The physical core still had residual motion beyond the carrier:

- external impulse peak residual: **~6.45 cm**;
- manipulator recoil peak residual: **~3.16 cm**.

Conclusion:

> A core-relative intent transport frame would not simply preserve “more physics”. It would create a second solver-level consequence→intent path in addition to the already accepted body-response→Donor bridge.

Canonical E18 transport origin for the current architecture:

> **`ManipulationIntent.transportOriginWorld = character.position`**

## E18.0h — full headless pipeline composition

The qualified layers were composed on real E17 + Box3D:

`incremental screen command -> ManipulationIntent -> Donor transport -> existing E17 target API -> finite E17 executor`

Results:

- explicit screen command reached E17 target API exactly;
- camera-only change left carrier-relative intent invariant;
- raw E18 request remained separate from E17 downstream reach clamp;
- target transport remained exact when updated from realized Donor carrier state.

One timing property became visible during locomotion:

- at `0.5` forward/right input, peak post-step carrier separation was **0.0433333 m**;
- after the next normal target update, carrier-relative drift returned to about **1.8e-15 m**.

Correct phase model:

1. target is updated from current realized carrier state;
2. E17 resolves/applies its finite manipulator command in `preStep`;
3. Box3D world steps;
4. Donor carrier movement is resolved later in `postStep` through support transport / `_solveMovement`;
5. next target update transports by that now-realized carrier delta.

Verdict: **QUALIFIED_WITH_OUTER_STEP_PHASE_SEPARATION**.

This is not evidence that the separation is perceptually harmful.

## Disproven 0i seam hypothesis

A temporary hypothesis incorrectly attributed the 0h separation to `character.position` advancing inside `preStep` and introduced a hook after `super.preStep()`.

Source audit and the 0i falsifier corrected that interpretation:

- `preStep` integrates intent/velocity;
- actual Donor position displacement occurs later in `postStep/_solveMovement`;
- therefore the proposed hook was in the wrong phase and could not eliminate the observed separation.

The hook was removed from E17 and 0i was retired from the active diagnostic apparatus. The failed experiment remains commit-history provenance.

Durable lesson:

> Do not preserve an abstraction merely because the regression suite tolerates it. A green no-op seam is still unjustified if its causal model is wrong.

## E18.0j — naive pre-compensation is rejected

0j tested the strongest simple counterproposal: before the mover solve, predict carrier translation as `dt * preStep velocity` and use that to pre-transport manipulation intent.

Open-space control:

- predicted steady-state step: **0.0866667 m**;
- realized step: **0.0866667 m**;
- peak prediction error: **2.22e-16 m**.

This makes the policy look perfect in unconstrained motion.

Static-wall case using the same Donor:

- first large collision mismatch: predicted **8.67 cm**, realized **0.64 cm**, error **~8.03 cm**;
- once blocked: predicted **8.67 cm**, realized approximately zero, error **~8.67 cm**;
- carrier remained correctly stopped at the wall (`x≈1.520 m`).

Conclusion:

> Pre-solve velocity describes attempted Donor motion, not realized carrier motion. Collision planes and CastMover clipping can invalidate nearly the entire predicted step. A generic pre-compensation policy would therefore inject manipulation motion that the player never actually realized.

Verdict:

> **NAIVE PRECOMPENSATION REJECTED**

Do not hide the 0h phase boundary by predicting movement before the mover solve unless a future architecture can use the *actual solved displacement* without introducing a new authority path.

## Qualified E18 intent boundary after 0a–0j

For the current hybrid architecture, proceed with these rules:

1. Manipulation intent is an explicit persistent 3D state, not an absolute frozen drag plane.
2. Camera motion alone does not mutate the target.
3. Explicit screen/depth input mutates target intent incrementally using the current camera basis.
4. High-level transport follows the accepted Donor carrier: `character.position`.
5. Transport uses **realized** carrier displacement at normal update boundaries.
6. The current within-outer-step separation remains explicit debt; do not “fix” it with commanded/pre-solve motion prediction.
7. Reach, force, saturation and physical failure stay downstream in the executor.
8. The physical object is never teleported to the proxy.

## What is not qualified

E18.0 does **not** establish:

- final mouse/wheel/modifier sensitivity;
- pointer-lock or browser event policy;
- final visual representation of the proxy;
- that 4.33 cm phase separation is perceptible or harmful;
- a new one-point executor;
- deliberate orientation control;
- coupled two-point mechanics;
- final torque/shared-force budgeting;
- full angular reaction closure;
- a preferred Owner-facing manipulation architecture.

## Next research boundary

The intent/proxy layer is now sufficiently understood to stop blocking the architectural experiment.

The next high-value work is **P3.0 — deterministic coupled two-point mechanics**, initially headless/scripted so that two questions remain separated:

1. does a finite two-point physical task materially improve intentional orientation while preserving mass/leverage/collision/failure?;
2. only after that, what desktop grammar lets the Owner express the two-point task without recreating E16-style end-effector micromanagement?

P3.0 must not be implemented as two independent E17 springs with two independent `900 N` budgets.

The two point constraints are coupled through rigid-body translation and inertia. The first crucible should solve them as one coupled task (or an explicitly justified approximation) under one declared shared authority budget.
