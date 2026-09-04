# E16.2a — Physical Capability Yard

Status: **machine-qualified candidate; STOP FOR OWNER FREE PLAY**  
Date: 2026-09-04

## Why this exists

E14 showed useful physical control qualities but exhausted its gameplay space: the accepted Donor controller still offered more agency, verbs and fun. E15 then established that Donor-level traversal can coexist with a solver-owned physical layer, but a passive physical body mostly reacts after the player has already done the interesting thing.

E16 changes the question. Instead of physicalising the whole character first, one solver-owned physical organ is given a deliberate capability while accepted Donor traversal remains intact.

The current working principle is:

> Preserve accepted agency. Add physical competencies that can create new consequences and new verbs. Let body structure emerge later from useful competencies rather than assuming anatomy first.

## Authority model reached by E16

E16 currently separates three kinds of authority instead of forcing all motion through one velocity state:

1. **Donor intent/traversal authority** — responsive accepted locomotion remains the baseline.
2. **External impulse consequence** — genuine world impulses can persist separately from intent.
3. **Constraint transport authority lease** — while the player has explicitly created a physical constraint, solver-imposed subsystem displacement may temporarily contribute to carrier displacement through the normal analytical capsule solve.

The third channel is not `pullPlayer()`, teleportation or persistent knockback. Internal organ actuation is momentum-neutral across the solver-owned `{core + organ}` subsystem. A world-contact displacement residual is measured after the Box3D solve and, only while an explicit grab exists, enters the ordinary Donor mover as same-tick transport. `b3SolvePlanes` / `b3World_CastMover` remain the final geometry authority.

## Contact-earned topology

Owner-facing grab is stricter than the earlier laboratory `grabBody(body, anchor)` helper.

`E16ContactQualifiedGrabCharacter` recovers current Box3D contact manifolds for the physical organ and exposes immutable current-tick candidates containing:

- the exact opposite shape/body identity;
- separate organ-side and world-side contact anchors;
- manifold separation, normal impulse and normal;
- a contact epoch.

A candidate becomes invalid as soon as physics advances. The physics kernel does not choose among simultaneous contacts; the interaction layer currently selects the contact midpoint nearest the active task-space target. This prevents solver enumeration order from silently becoming gameplay policy.

Bounded limitation: current E16.2a grab-eligible toybox bodies each use one centred primitive. Compound/off-centre bodies require a deliberate anchor-reconstruction upgrade before this mechanism is generalized.

## E16.2a interaction

E16.2a intentionally stays horizontal. Full 3D aiming, climbing, a second organ and anatomical interpretation are deferred so the first Owner test can isolate whether the capability itself produces useful play.

Desktop controls:

- `WASD` — accepted Donor movement
- `Space` — jump
- `Shift` — sprint
- `RMB drag` — camera
- `LMB hold` — engage physical capability; the organ physically reaches and may earn a grab only through actual contact
- `LMB + wheel` — retract / extend desired reach
- release `LMB` — release the physical constraint
- `R` — reset
- `H` — telemetry

Route: `?mode=e16` (aliases: `organ`, `toybox`).

When capability input is inactive, rotating the camera does not sweep the physical organ through the world. Camera direction becomes capability direction only while the capability is engaged.

## Capability yard

The yard is an affordance ecology, not a challenge course. It deliberately contains no success condition and no scripted solution. Nearby centred primitives provide different mass and leverage situations: static anchors/posts, light/medium/heavy boxes, a long beam, a rolling sphere and a chunky side anchor.

The purpose of the first Owner session is not to validate an expected verb list. It is to discover what the player naturally starts doing and which behaviours are worth following, including unexpected ones.

## Machine evidence

Research provenance is preserved on branch `experiment/e16-active-contact-organ`; the publication candidate is intentionally narrower than that branch.

The final publication boundary is represented by three qualifiers:

- `scripts/e16-contact-qualified-grab-crucible.mjs`
  - neutral state exposes zero candidates;
  - stale candidate rejection works;
  - exact contact-manifold grab works;
  - static retract produces carrier pull with zero persistent-leak frames;
  - release → recontact → regrab works;
  - dynamic-object earned grab closes player/object distance.
- `scripts/e16-capability-interaction-smoke.mjs`
  - horizontal target mapping, bounded reel controls and solver-order-independent candidate selection.
- `scripts/e16-capability-yard-smoke.mjs`
  - integrated Donor move → physical reach → contact-earned grab → reel → geometry-checked transport → release.

On the full research branch the integrated candidate reached approximately `0.373 m` of horizontal carrier movement during the bounded reel phase with zero persistent feedback leakage. These are machine facts only; they do not establish usability or fun.

## Evidence boundary / current stop

Machine evidence supports that the mechanism is coherent enough for hands-on play. It does **not** establish:

- that LMB/wheel interaction feels good;
- that reach/reel authority is too weak or too strong;
- that the visual metaphor is readable;
- that the current yard produces enough strategies;
- that the organ should become a hand, hook, limb, tether or anything anatomical;
- that vertical/3D capability should be added next.

Those are now Owner questions.

**STOP FOR OWNER E16.2a FREE PLAY.**

Do not automatically proceed to E16.2b. First preserve the mechanics candidate, publish the exact tested build, and collect spontaneous Owner judgement about what they actually tried, what surprised them, what was fun, and what immediately damaged play.
