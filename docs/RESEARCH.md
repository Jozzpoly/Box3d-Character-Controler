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
- Important correction: a technically narrower falsifier can increase directed evidence while reducing spontaneous affordance discovery.

Methodological result:

> **Controlled enough to explain, open enough to play.**

Future experiments should avoid removing previously useful natural interactions unless removal is itself necessary to isolate a question.

## Foundation 01 — Embodied Player Playground (candidate under validation)

This is a rebuild candidate, not yet accepted evidence.

Question:

> Can a small open playground preserve causal legibility while combining movement, jumping, natural object manipulation, moving support and reverse physical perturbation strongly enough to become a useful long-lived research surface?

Implementation hypothesis being tested:

1. Keep controller-owned character state for strong player authority.
2. Give the virtual character an explicit finite interaction mass (`80 kg`).
3. Use one general normal effective-mass impulse exchange for all dynamic contacts, including equal-and-opposite velocity change on the character rather than a separate side-push hack and standing-load hack.
4. Represent moving support by a body-local contact point; transport follows the real world-space motion of that point, including body rotation.
5. Treat camera-relative input and a follow/orbit camera as part of the embodiment apparatus once free exploration matters.
6. Preserve an open collection of ordinary physical objects so Owner free play can discover the next question without reading a test script.

The candidate must not be promoted to an architecture winner merely because CI passes or because the playground is more enjoyable than E1-A2.

### Donor/provenance notes

- Native Box3D `CharacterMover` provides the reference effective-mass contact calculation and demonstrates a substantially richer controller-owned specimen than E1.
- Current `box3d.js` browser example provides donor patterns for camera-relative control, open obstacle/play space and generic Box3D→Three rendering.
- `box3d.js@0.1.1` currently vendors native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92`; binding version and engine snapshot are distinct provenance facts.
