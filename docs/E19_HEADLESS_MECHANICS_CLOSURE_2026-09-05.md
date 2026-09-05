# E19 headless mechanics closure — 2026-09-05

Branch: `research/e19-hand-grip-reframe`

This checkpoint closes the bounded **headless reciprocal-grip mechanics** frontier after E19.0a–0f2. It does not promote E19 to `main` and does not claim Owner-qualified gameplay.

## Decision

The current evidence is sufficient to stop adding new headless “can the grip law physically do X?” cases and move the research frontier to **E19.1 — intent-assisted contact acquisition**.

The earned mechanical claim is now:

> A single finite relative-grip law can couple the accepted Donor virtual mass to static anchors and dynamic Box3D bodies over multiple frames. Static/dynamic identity does not select a separate control branch: target mass/inertia, the second grip, and Box3D world constraints determine how motion and load are distributed. Impossible tasks remain finite and residual rather than being solved by teleportation or hidden persistent velocity.

This remains narrower than “two physical hands”. Current E19 still uses semantic grip relations around one translational player virtual mass.

## E19.0f — dynamic/mixed multi-frame reciprocity

The diagnostic deliberately used zero world gravity and `gravity: 0` on the Donor to isolate horizontal/rotational reciprocity. Static hanging and Donor/ceiling vertical behavior were already qualified separately by E19.0d/e.

### Same law, different mass

Both cases started with the same player, target geometry, target relative request, rate and `3000 N` per-grip cap. Only target mass changed.

| Case | Player Δx | Target Δx | Final relative error |
|---|---:|---:|---:|
| `20 kg` | `+0.136 m` | `-0.864 m` | `~2.9e-6 m` |
| `200 kg` | `+0.634 m` | `-0.366 m` | `~4.2e-6 m` |

The light target therefore supplied most of the closure itself, while the heavy target made the Donor supply most of it. There is no `if light -> move object / if heavy -> move player` branch in the actuator.

Peak speeds changed consistently with the same physical split:

- light: player `1.32 m/s`, body `5.43 m/s`;
- heavy: player `3.96 m/s`, body `1.63 m/s`.

Both settled essentially exactly and left `externalVelocity = [0,0,0]`.

### Two grips on one dynamic body

A symmetric differential request on two anchors of a `55 kg` long box produced:

- final rotation: `0.666 rad` (`~38.2°`);
- peak angular speed: `5.84 rad/s`;
- player displacement: effectively numerical zero;
- player peak speed: effectively numerical zero.

This is the desired P3-derived leverage result in the E19 ontology: equal/opposite same-body grip work can generate orientation authority without object pose ownership and without inventing player translation.

It does **not** establish player-side angular response; the Donor is still translational.

### Mixed static + dynamic bracing

The same `80 kg` target pull was run once with one dynamic grip only and once with an added static grip behind the player.

Unbraced:

- player: `+0.410 m`;
- body: `-0.590 m`.

Braced with the same coupled grip solver:

- player: numerical zero displacement;
- body: `-1.000 m`.

No dedicated brace mode exists. The static grip simply contributes another relation in the same operator and changes the physically available motion partition.

### First blocked-target specimen was insufficiently strong

The original E19.0f blocked-target case did reach the wall (`3.39998 m` against expected `3.4 m`) without tunnelling and stayed bounded, but it was not a truly impossible task: the Donor was free to retreat. The system therefore eventually satisfied the requested `4 m` relative offset by moving the player to about `-1.35 m`, after which the box moved back away from the wall.

That is physically coherent, but it does **not** prove sustained behavior under a genuinely incompatible world/grip request.

It was therefore not accepted as the final blocked-target gate.

## E19.0f2 — genuinely impossible mixed task

The strengthened specimen used:

- one static grip fixing the Donor’s initial world relation;
- one dynamic grip on a `60 kg` box;
- a real Box3D wall limiting box center to about `x = 3.1 m`;
- requested dynamic relative offset `x = 3.8 m`;
- `4000 N` cap on each grip;
- 180 frames of sustained contradiction.

This leaves roughly `0.7 m` of geometric error that **cannot** be removed by moving either the player or box through available space.

Observed:

- body peak `x = 3.1111 m`, consistent with Box3D contact slop around the `3.1 m` boundary;
- body at release `x = 3.09995 m`;
- geometric residual `0.70005 m`;
- player displacement: `0`;
- player peak speed: `0`;
- player velocity at release: `0`;
- `externalVelocity`: always zero;
- both grips saturated on **180 / 180 frames**;
- final applied forces: `4000 N + 4000 N`;
- Donor mover solve error: `0`;
- release created no hidden player motion.

The dynamic body retains only a very small post-contact residual velocity (`-0.0139 m/s` at release), and drifts slightly away from the wall after force removal. That is ordinary Box3D body state, not stored Donor grip state.

This is the stronger result we needed:

> the same mixed grip relation can remain deliberately unsatisfied for seconds under real world opposition, with finite capacity and explicit residual instead of increasing hidden authority until the task is forced through.

## What is now strong enough to stop headless mechanics

Taken together, E19.0a–0f2 have separated and qualified the main low-level concerns:

1. shared algebra for one/two, static/dynamic/mixed grips;
2. independent Box3D point-impulse agreement;
3. finite static load capacity and two-grip load sharing;
4. direct Donor reaction without E15 mediation;
5. Donor geometry arbitration and grip-scoped vertical blocked-velocity cleanup;
6. mass-derived dynamic motion partition;
7. same-body rotational leverage;
8. mixed static/dynamic bracing;
9. genuinely impossible world/grip tasks remaining finite, saturated and residual;
10. no persistent grip contribution to Donor `externalVelocity`.

More synthetic mechanics cases now have declining value compared with testing **how a player actually earns and controls the relation**.

## Remaining mechanical caveats

These are explicitly not closed:

- arbitrary 3D/sloped static and kinematic constraint-velocity cleanup;
- moving kinematic anchors;
- player angular state / body torque;
- physical hand/arm masses and collision bodies;
- optimal constrained allocation under asymmetric multi-grip saturation;
- final strength/rate values;
- real gravity + dynamic target combinations as gameplay rather than isolated mechanics.

None currently blocks the next acquisition experiment. Reopen them only if interaction evidence makes them material.

# E19.1 frontier — intent-assisted contact acquisition

E16 already provides the correct physics-provenance split and should be reused rather than rebuilt.

`E16ContactQualifiedGrabCharacter` established that the physics layer can expose immutable **current-post-step** contact candidates carrying:

- exact opposite body/shape identity;
- organ-side and world-side manifold anchors;
- anchor-pair gap;
- separation and normal impulse;
- manifold normal;
- per-contact epoch preventing stale candidates from being applied later.

Critically, E16 deliberately left **candidate selection outside the physics kernel**. Its own comment states that aim/timing/impulse ranking belongs to the interaction layer so solver iteration order does not become hidden gameplay policy.

That separation maps directly onto the current Owner need.

## E19.1 research question

> Can a left/right grip intent select and earn a nearby physical surface through current contact/reach evidence, with enough assistance to represent player intention reliably, without requiring manual endpoint piloting or reverting to a magical remote picker?

## Recommended bounded sequence

### E19.1a — extract/reuse contact-candidate kernel

Do not inherit E16’s old organ/controller architecture. Extract only the stable provenance concept into an E19-compatible helper:

- current-contact identity;
- exact body + local/world anchor reconstruction;
- epoch/staleness protection;
- static and dynamic body neutrality.

Natural gate: identical current contacts must produce safe E19 latch descriptors, and stale/foreign descriptors must fail.

### E19.1b — add intent ranking above physics truth

Introduce a small interaction-layer ranker using only explicit player-facing signals such as:

- left/right hand side;
- desired reach direction;
- reach distance/envelope;
- candidate angular alignment;
- distance/contact quality;
- optional contact persistence/hysteresis.

The ranker may assist intention. It must not fabricate an anchor on a body that did not satisfy the chosen reach/contact contract.

Natural gate: when two nearby candidates compete, deterministic intention-relevant ranking should pick the expected one without exposing manifold ordering.

### E19.1c — acquire/release the actual E19 grip relation

The selected descriptor should instantiate the already-qualified E19 semantic grip:

- static target -> `staticWorldAnchor`;
- dynamic target -> `body + localAnchor`;
- desired offset derived from the hand/reach intent contract;
- release destroys only the semantic relation; no residual E16 joint/organ architecture is needed.

Natural gate: static and dynamic surfaces share one Owner-facing acquisition grammar and feed the same E19 actuator.

## Next execution boundary

The next implementation should therefore be **E19.1a**, not another force/mass crucible and not yet a browser UX.

Browser free-play becomes justified only after acquisition provenance and ranking are sufficiently coherent to stop the hands from becoming a contact lottery.
