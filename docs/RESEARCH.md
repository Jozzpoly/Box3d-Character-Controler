# Research ledger

## E1-A1 — First Physical Contact Baseline

Exact specimen: `cadb9405097ede149e64a64d8070c6127e8849a5`.

- Machine/API smoke: PASS.
- Production build + GitHub Pages: PASS.
- Owner browser runtime: PASS.
- Controller-owned capsule could push and rotate a dynamic Box3D body through contact-point impulses.
- The character still had fixed world Y and effectively infinite authority relative to the pushed body.
- Owner free play immediately moved beyond the scripted push task and produced a vertical affordance: wanting to jump onto / use the box as part of the world.
- Result: useful contact/substrate baseline, **not** evidence that controller-owned embodiment is sufficient.

## E1-A2 — Support Reciprocity Crucible

Question:

> Can a controller-owned mover participate in gravity, support, support loss and dynamic support using a small number of general, causally legible rules rather than scenario-specific patches?

### Gate 1 — Gravity + static support

Exact specimen: `5fd2aabdff35e79944bd82901175a9f64e73578f`.

- Deterministic smoke: PASS for unsupported fall → static landing, bounded jump → return to support, and support loss → resumed falling.
- Production build: PASS.
- GitHub Pages deployment: PASS.
- No fixed world-Y correction remains in the character solver.
- Result: controller-owned state is **not falsified by static gravity/support alone**.

### Gate 2 — Dynamic support

The next bounded mechanisms are deliberately general:

1. identify the actual support body from mover contact geometry;
2. use an explicit finite virtual player mass (`80 kg`) to transfer landing/standing normal load into a dynamic support body;
3. transport the controller-owned character by the dynamic support body's actual translational displacement, and inherit its horizontal linear velocity on jump.

No crate-specific state, platform mode, ground snap, stair logic, mantling, or full angular contact-point transport is added. If these general mechanisms are insufficient, that insufficiency is evidence rather than an invitation to immediately accumulate special cases.