# E18 P3.1 — Owner interaction contract

Date: 2026-09-05

This document defines the bounded Owner-facing integration earned by P3.0 mechanical qualification. It is not a production UX specification.

## Question

> Can the Owner manipulate objects with the intent-first freedom that made E17 fun, while gaining direct depth and optional deliberate axis/orientation control without recreating E16-style end-effector micromanagement?

## Interaction architecture

P3.1 is deliberately staged rather than permanently precision-locked.

### Rough/default

- primary pointer acquisition selects a nearby dynamic object and one surface anchor;
- ordinary pointer movement translates a persistent 3D target incrementally in the current camera plane;
- explicit depth input moves that target toward/away from the camera;
- execution remains one-point, inertia-aware and finite;
- off-centre leverage/free rotation/throwing remain possible.

### Precision/orientation clutch

- a temporary clutch promotes the current hold to the already-qualified coupled two-point P3 executor;
- the second virtual anchor is derived automatically from the held rigid body rather than separately picked by the Owner;
- entering precision initializes from the **current physical object pose**, avoiding a hidden pose snap;
- translation continues to move the two-point target pair together;
- while the clutch is actively used for orientation, pointer delta rotates the target axis around the current camera up/right basis;
- releasing the clutch returns to rough one-point execution without teleporting or zeroing physical momentum;
- twist around the two-point axis remains physically free.

This is intended to feel like “grab normally; temporarily steady/orient when needed”, not “pilot two hands”.

## Provisional desktop mapping

The mapping is a candidate to test, not canonical UI:

- `LMB press/hold` — acquire/hold/release manipulation;
- pointer delta while holding — translate target in current camera plane;
- mouse wheel while holding — explicit target depth; wheel retains camera zoom when not manipulating;
- `Ctrl` held while manipulating — precision/orientation clutch;
- pointer delta while `Ctrl` is held — rotate the P3 target axis instead of translating it;
- `RMB` — existing camera orbit when not consumed by manipulation state;
- movement/jump/sprint retain existing Donor controls.

The clutch mapping is chosen because Shift already owns sprint and RMB owns camera. It should be changed if Owner use shows a better grammar.

## Mechanical invariants inherited from P3.0

- one shared `900 N` authority scale;
- no object pose writes or teleports;
- mass/inertia remain execution costs;
- world contact may defeat requested motion;
- release preserves momentum;
- free twist remains unowned;
- opposite linear reaction enters the E15 embodiment core and existing Donor consequence bridge;
- full angular/wrench closure remains explicit debt.

## Intent/proxy invariants inherited from E18.0

- persistent explicit world-space target state;
- no frozen click-time drag plane;
- camera-only motion does not mutate manipulation intent;
- screen deltas use the current camera basis only when explicit input occurs;
- depth is an explicit independent channel;
- high-level target transport follows realized Donor `character.position`;
- no pre-solve carrier prediction; the known outer-step phase separation remains visible.

## Automatic second anchor

P3.1 should not ask the Owner to click two surface points.

At precision engagement:

1. read the held object's world COM;
2. convert COM to object-local coordinates;
3. mirror the primary local anchor through local COM to obtain the second virtual anchor;
4. if the resulting separation is pathologically small, use a bounded fallback axis rather than inventing a second full-force one-point spring;
5. capture the current world positions of both anchors as the initial two-point target pair.

This gives a mechanically useful lever arm without humanoid anatomy or extra acquisition burden. The second point is a **virtual rigid-body control point**, not a claim of a literal hand touching that surface.

## Readability requirements

Owner-facing P3.1 must make these states visible enough to understand:

- primary grip point;
- rough target;
- precision second grip/target when active;
- target axis while precision is active;
- shared saturation/effort;
- rough vs precision state;
- reach/break failure.

Do not drown the play view in full research telemetry by default.

## Ecology requirement

Do not request Owner judgement on cubes alone. The bounded test yard should include at least:

- a long beam/plank;
- a light object;
- a substantially heavier object;
- a stacking/placement target;
- an asymmetric object;
- at least one simple orientation-dependent interaction such as a slot, gate/lever, bridge placement or narrow shelf.

The yard remains open-ended; it must not encode one intended solution.

## Owner milestone

P3.1 deserves Owner free play only when the build materially exposes all of the following at once:

1. camera-stable incremental translation;
2. explicit controllable depth;
3. rough E17-like physical manipulation;
4. temporary deliberate axis/orientation control;
5. finite mass/contact/recoil/release consequences;
6. readable mode/target/effort state;
7. several objects/mechanisms where orientation changes what can be done.

The Owner question is qualitative:

> Does this let you manipulate the world more deliberately **without making manipulation itself the chore**?

Machine tests should guard mechanics and lifecycle. They cannot answer that question.
