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

Current hypothesis under test:

> Can a controller-owned mover participate in gravity/support/support-loss and later dynamic support using a small number of general, causally legible rules rather than scenario-specific patches?

### Gate 1 — Gravity + static support

Required before dynamic support work:

- unsupported body falls;
- landing produces stable support without fixed-Y correction;
- leaving support restores ballistic motion;
- a bounded jump leaves and returns to support;
- support is identified from mover contact geometry, not a scripted ground state.

Dynamic support is intentionally deferred until Gate 1 passes.