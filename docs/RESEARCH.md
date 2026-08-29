# Research ledger

## Mission frame

The project studies **physical player embodiment**, not merely capsule traversal. A useful build must be controlled enough to explain and open enough to play.

Evidence is separated into machine behavior, causal interpretation and Owner observation. A green build does not imply good feel, and a fun moment does not by itself establish a mechanical claim.

## E1-A1 — First Physical Contact Baseline

Exact specimen: `cadb9405097ede149e64a64d8070c6127e8849a5`.

- Machine/API smoke: PASS.
- Production build + GitHub Pages: PASS.
- Owner browser runtime: PASS.
- Controller-owned capsule could push and rotate a dynamic Box3D body through contact-point impulses.
- Character still had fixed world Y and effectively infinite authority relative to the pushed body.
- Owner free play immediately moved beyond the scripted push task and produced a vertical affordance: wanting to jump onto / use the box as part of the world.
- Result: useful contact/substrate baseline, **not** evidence that controller-owned embodiment is sufficient.

## E1-A2 — Support Reciprocity Crucible

Question:

> Can a controller-owned mover participate in gravity, support, support loss and dynamic support using a small number of general, causally legible rules rather than scenario-specific patches?

### Gate 1 — gravity + static support

Exact specimen: `5fd2aabdff35e79944bd82901175a9f64e73578f`.

- Deterministic smoke: PASS for unsupported fall → static landing, bounded jump → return to support, and support loss → resumed falling.
- Production build + GitHub Pages: PASS.
- No fixed world-Y correction remained in the character solver.
- Result: controller-owned state was **not falsified by static gravity/support alone**.

### Gate 2 — dynamic support

Exact specimen: `ee5bb1813ac691750359c1d8f6f3934c29d9426b`.

- Machine smoke: PASS for dynamic landing/load, support transport and support loss.
- Production build + GitHub Pages: PASS.
- Owner runtime observation: gravity/jump/support broadly worked; moving-support feel appeared plausible and no obvious teleportation was observed.
- Owner verdict on the build as a play instrument: **regression**. Natural push interaction from E1-A1 had disappeared, most objects behaved as static fixtures from the player's perspective, and the fixed camera reduced exploration.

Methodological result:

> **Controlled enough to explain, open enough to play.**

## Foundation 01 — Embodied Player Playground

Exact specimen: `1416c2b7dc618fa99e5a3916326414178414997f`.

Goal:

> Combine previously isolated abilities into one open research surface: locomotion, jump, natural push, reverse perturbation, dynamic/moving support and free camera exploration.

Machine result:

- PASS for static land/jump;
- PASS for natural dynamic push (`175.3 N·s` peak in qualification smoke);
- PASS for reverse perturbation (ram displaced the controller-owned character by about `0.48 m`);
- PASS for translating support (`1.00 m` rider transport in qualification smoke);
- PASS for off-center rotating support (`0.61 m` rider arc during a 45° support rotation);
- CI/build/Pages: PASS.

Owner observation from the first unscripted gameplay recording:

- the playground did provoke broader free play: pushing, jumping across props, riding/using the moving slab, disturbing objects and revisiting different physical arrangements;
- core behavior broadly worked;
- however the overall experience remained **too raw**: camera, movement presentation, world composition and general feel did not meet the Owner's quality bar;
- Owner explicitly requested a fundamental improvement/polish pass before expanding into new capabilities.

Interpretation:

Foundation 01 is useful evidence that the combined mechanisms coexist, but it is **not a fair quality ceiling for controller-owned embodiment**. Architecture comparison should wait until this candidate is less obviously handicapped by crude locomotion/camera/presentation.

## Foundation 02 — Quality / Feel Baseline

Question:

> Can the same controller-owned representation become a substantially more coherent and satisfying baseline without reducing physical reciprocity or hiding consequences behind stronger controller authority?

The candidate deliberately does not add grab, ragdoll or a new character representation. It attacks quality debt in four coupled layers:

1. **Locomotion authority** — ground and air control are separated; target velocity is approached with bounded acceleration rather than the previous friction/acceleration loop.
2. **Physical consequence persistence** — horizontal velocity gained from dynamic contact is tracked as an external component that decays rather than being immediately erased by movement intent.
3. **Jump control** — coyote time, input buffering and early-release gravity shaping improve player timing without changing the fundamental ballistic/contact model.
4. **Perception/presentation** — camera orbit/follow is damped and ordinary jump height no longer drives camera Y one-to-one; the visual character exposes facing, landing and contact state without gaining physics authority; the yard uses a coherent, readable visual/material language.

First branch qualification at `cce2bcecfa82a2be07188379bfbd02d4540a13d1`:

- full jump apex above standing height: `1.23 m`;
- early-release jump apex: `0.73 m`;
- buffered-jump gate: PASS;
- natural push peak: `169.4 N·s`;
- reverse ram displacement: `-1.08 m` with `1.73 m/s` peak external horizontal response;
- translating support transport: `1.00 m`;
- rotating support arc: `1.03 m`;
- production build: PASS.

Owner observation after public Foundation 02 play:

- overall verdict was **better than Foundation 01**;
- the provisional visual character had an obvious facing error: side movement made the face/head turn the opposite way and visually suggested backwards walking;
- the existing objects presented as stairs could not be traversed by ordinary walking and required jumping;
- Owner asked to polish the provisional capsule while explicitly leaving future embodiment experiments free to solve traversal differently.

Interpretation:

Foundation 02 materially improved the fairness of the controller-owned candidate, but the two reported defects were sufficiently basic that they should be removed before treating the capsule as the stable provisional comparison specimen.

## Foundation 02.1 — Provisional Capsule Traversal Closure

Goal:

> Fix the reported visual-direction error and make ordinary small static steps traversable without turning the provisional capsule into a growing traversal framework or weakening physical interaction with dynamic props.

Exact Owner-tested public runtime: `12841bd5c095827092ee5aae0acc19981a848490`.

Accepted changes:

- explicit visual convention: provisional character local `-Z` is forward;
- deterministic facing checks for forward/back/left/right and two diagonals;
- playground staircase normalized to four ordinary `0.22 m` rises;
- nearby `0.52 m` ledge remains a deliberate jump boundary;
- low dynamic prop remains pushable physical matter rather than being reclassified as traversal geometry;
- Foundation 02 `character.js` movement/contact solver remains unchanged.

Machine qualification:

- six facing cases: PASS;
- four-step ascent without jump: `0.88 m` total rise, PASS;
- descent reaches the floor and independently recovers `STATIC` support, PASS;
- descent peak vertical speed is about `2.77 m/s`; retained as telemetry rather than an arbitrary quality threshold;
- high ledge remains blocked (`ledgeMinZ ≈ 5.80`), PASS;
- low dynamic prop is pushed rather than climbed, PASS;
- full jump: `1.23 m`;
- short jump: `0.73 m`;
- reverse ram: about `-1.05 m` character displacement with `1.73 m/s` peak external response;
- translating support: `1.00 m`;
- rotating support: `1.03 m`;
- isolated natural-push closure gate: `169.4 N·s`, with the box reaching about `z=-1.51`;
- production build + GitHub Pages: PASS.

The broad shared-world smoke reports a lower main push peak (`101.7 N·s`) after the traversal fixture has been disturbed. The isolated closure gate reproduces the prior Foundation 02 baseline exactly (`169.4 N·s`), so the broad value is treated as fixture/order contamination rather than evidence of runtime push regression.

### Owner closure verdict — PASS

Owner tested the final public Foundation 02.1 runtime after machine qualification and reported:

- facing direction: **PASS**;
- ordinary stair ascent without jump: **PASS**;
- stair descent: **looks fine / PASS**.

Owner explicitly accepts the stage as passed. The capsule still has feel shortcomings, but further capsule-only polishing is intentionally deferred because the project is not trying to perfect this one representation before continuing embodiment research.

Stage verdict:

> **Foundation 02.1 accepted as the provisional capsule baseline. Close this stage without further capsule polish.**

This is a baseline acceptance, not an architecture verdict. It means the current controller-owned capsule is now fair enough to serve as a known comparison/research specimen until a future question gives a reason to revisit it.

### Rejected / deferred traversal experiments

An explicit bounded step-up policy was implemented during exploration, then removed. With correctly sized `0.22 m` stairs the rounded capsule already traversed the staircase while the explicit step mechanism recorded no accepted step events. The proposed policy therefore did not earn its complexity for the reported problem.

A later experimental branch explored static ground adhesion to reduce machine-observed vertical velocity while descending. That line introduced downward probes, blocker classification and retry state, then failed its own falsifiers: variants interfered with normal stair ascent and the latest branch head could still apply adhesion during a real larger drop. The Owner had not reported stair descent as a feel problem, and final Owner play confirmed that descent looked acceptable without adhesion.

Current verdict:

> **Do not promote the ground-adhesion line. Preserve it only as negative research evidence.**

This is not a claim that step-up, floor-stick or other traversal policies are universally wrong. They remain available if a future representation, geometry set or Owner-observed problem earns them.

### Non-claims / boundary

Foundation 02.1 is a **provisional capsule baseline**, not an architecture winner and not a final traversal system. It does not establish that future articulated, dynamic-root or hybrid characters should inherit these traversal semantics. No mantle, crouch, grab, IK, ragdoll or universal movement framework is added by this stage.

The next stage should begin from a fresh embodiment question rather than continued automatic capsule polish.

### Donor/provenance notes

- Native Box3D `CharacterMover` remains the reference for controller-owned mover collision and effective-mass dynamic contact response.
- Current `box3d.js` browser examples remain donors for camera-relative control and generic Box3D→Three rendering, not an architecture to copy wholesale.
- `box3d.js@0.1.1` vendors native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92`; binding version and engine snapshot remain distinct facts.
