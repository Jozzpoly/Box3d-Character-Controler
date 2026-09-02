# Research ledger

> **Authority note — 2026-09-02:** this file is the preserved **early historical ledger through E2**. Its stage-local words such as “current”, “next” and “before Owner free play” describe the state at that historical point; they are not the live project plan. For current state, authority hierarchy, Donor v1/A‴ promotion and future execution rules, start with [`PROJECT_STATE.md`](PROJECT_STATE.md), then `README.md`, `E2_3E_STABILIZATION.md` and `DONOR_CONTRACT.md`. The historical body below is intentionally not rewritten.

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

## E2 — Authority Ownership Crucible

Question:

> Does a solver-owned finite-mass translational root produce materially different physical consequence from the accepted controller-owned baseline while retaining useful player agency through a small, general bounded control law?

E2 deliberately changes **translational state ownership** before changing body articulation. It is not a full dynamic-character architecture candidate.

### Experimental contrast

**A — Foundation 02.1 H-A** remains the accepted controller-owned comparison specimen. Its exact Owner-tested runtime remains `12841bd5c095827092ee5aae0acc19981a848490`.

**B — E2 solver-owned root** uses:

- a real Box3D dynamic capsule with approximately the same dimensions as H-A;
- actual solver mass of `80 kg` rather than a virtual interaction mass;
- all angular degrees of freedom locked, intentionally isolating translational ownership from balance, falling and orientation recovery;
- player locomotion expressed through bounded centre-of-mass impulses toward camera-relative intent;
- jump expressed through a bounded centre-of-mass impulse;
- support classification from the body's real contact manifolds;
- no mover-based position solve;
- no manual effective-mass impulse exchange with dynamic bodies;
- no manual support-anchor transport;
- no horizontal velocity overwrite.

The same playground, camera, input convention and visual character are used to keep obvious presentation differences from dominating Owner comparison.

### Causal corrections during implementation

The first implementation was deliberately not accepted just because it ran.

1. **Final displacement was a contaminated impact metric.**
   An early reverse-perturbation gate judged player displacement after roughly `1.5 s`. A dynamic collision did occur, but the bounded controller had time to recover afterwards, so that number mixed solver consequence with control recovery. The gate was changed to separate immediate solver-induced velocity/displacement from later recovery.

2. **The first idle servo erased consequence in one tick.**
   With active no-input deceleration, a reverse impact produced about `-0.32 m/s`, while the controller applied about `25.6 N·s` in the following recovery tick — approximately the same scale as the measured horizontal solver response. That control law was rejected as too helpful for this question.

3. **The first moving-support law reconstructed an H-A bridge.**
   An early version added support-point velocity to the control target. Although plausible for a finished controller, it made the moving-support test causally weak because transport was partially prescribed above the solver. That behavior was removed.

Current E2 no-input behavior therefore applies **zero horizontal control impulse**. Stopping, perturbation decay and support transport must be earned by ordinary rigid-body contact/friction.

### Traction sensitivity probe

A small diagnostic sweep was used instead of choosing friction by intuition. It is evidence about the control/consequence trade-off, not an optimization study:

- player friction `0.82`: peak walk `4.93 m/s`, release stop `0.73 m / 18 frames`, reverse perturbation `-0.32 m/s`, about `-0.006 m / 1 frame`, moving support `0.97 m`;
- player friction `0.45`: peak walk `5.00 m/s`, release stop `1.02 m / 25 frames`, reverse perturbation `-0.38 m/s`, about `-0.009 m / 2 frames`, moving support `0.96 m`;
- player friction `0.20`: peak walk `5.07 m/s`, release stop `1.57 m / 38 frames`, reverse perturbation `-0.42 m/s`, about `-0.014 m / 3 frames`, moving support `0.94 m`.

`0.45` is selected only as the **provisional fair-play floor** for the public E2 specimen. It is not claimed to be optimal feel. The probe already shows an important structural trade-off: the same ordinary contact friction that provides traction, passive stopping and natural support transport also damps external horizontal consequence.

### Machine qualification before public Owner comparison

Machine-qualified A/B runtime before documentation: `ca7316da9d80ae1bf0fd009629316352991c9733`.

The frozen Foundation 02.1 gates still pass unchanged before every E2 gate, including isolated natural push `169.4 N·s`.

E2 causal qualification at provisional friction `0.45`:

- actual solver body mass: `80.00 kg`;
- bounded-impulse walk: `5.00 m/s` peak, about `5.48 m` travelled in the qualification window;
- no-input release: stops after about `1.02 m`, with zero horizontal controller impulse during release;
- reverse perturbation: immediate player velocity about `-0.38 m/s`, minimum displacement about `-0.009 m`, settling in about `2` frames;
- controller impulse after reverse contact: `0.0 N·s`;
- horizontal solver-Δp proxy during that contact: about `30.1 N·s` — telemetry only, not an H-A-equivalent impulse metric;
- translating kinematic support carries the player about `0.96 m` with zero horizontal controller impulse and no manual position transport;
- ordinary jump rise: `1.28 m`, then return to support;
- natural solver push moves the test box about `6.12 m` in the qualification setup;
- a real `450 kg` dynamic slab is acquired as `DYNAMIC` support;
- production build: PASS.

### Public A/B instrument

The E2 runtime exposes both representations in the same public build:

- `1` — A: Foundation 02.1 controller-owned H-A;
- `2` — B: E2 solver-owned translational root.

Mode changes reload the page/world deliberately so the second representation does not inherit a disturbed world from the first. A remains the default mode. Debug labels are mode-specific where metrics are not semantically equivalent.

### Current interpretation — before Owner free play

Machine evidence already establishes several narrow facts:

- solver ownership can provide finite mass, natural dynamic push/recoil and dynamic/kinematic support participation without H-A's explicit dynamic-contact impulse bridge or support-position transport bridge;
- useful locomotion and jumping do not immediately require direct velocity overwrites;
- however physical consequence is not automatically persistent merely because the root is solver-owned: ordinary traction/friction can dissipate a moderate horizontal perturbation very quickly;
- therefore the next important evidence is not another machine-polish loop. It is whether this ownership change produces a meaningful difference in **embodiment, agency and emergent physical play** when the Owner uses both variants freely.

### Non-claims / current boundary

E2 has **not** established that a solver-owned root is better, worse, or the future architecture.

It does not test:

- free body rotation, balance or falling;
- torque as a player consequence;
- distributed/multi-part contacts;
- active ragdoll or articulated limbs;
- grab, mantle or other new gameplay features;
- final traversal semantics;
- an optimized solver-owned controller.

Do not add those merely because E2 exists. They would be separate research questions.

Current stage boundary:

> **Machine-qualify and publish the minimal A/B instrument, then stop for Owner free-play evidence before selecting another embodiment experiment or polishing either representation further.**
