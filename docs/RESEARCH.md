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

## Foundation 02 — Quality / Feel Baseline (candidate under validation)

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
- natural push peak: `169.4 N·s` (close to Foundation 01 rather than being sacrificed for feel);
- reverse ram displacement: `-1.08 m` with `1.73 m/s` peak external horizontal response;
- translating support transport: `1.00 m`;
- rotating support arc: `1.03 m`;
- production build: PASS.

These numbers are machine evidence, not a positive Owner-feel verdict. In particular, stronger/persistent recoil may still be too much and must be judged in free play.

Promotion requirements:

- existing push/reverse-recoil/translating-support/rotating-support machine gates remain green;
- jump shaping/buffering behaves deterministically;
- production build passes;
- only then may the exact candidate replace Foundation 01 on public Pages for a new Owner free-play verdict.

### Donor/provenance notes

- Native Box3D `CharacterMover` remains the reference for controller-owned mover collision and effective-mass dynamic contact response.
- Current `box3d.js` browser examples remain donors for camera-relative control and generic Box3D→Three rendering, not an architecture to copy wholesale.
- `box3d.js@0.1.1` vendors native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92`; binding version and engine snapshot remain distinct facts.
