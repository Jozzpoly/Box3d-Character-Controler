# Box3d Character Controler

Experimental Box3D physical-player / embodiment laboratory.

Current stage: **E1-A2 — Support Reciprocity Crucible**.

## Current gate

**Gate 1 — Gravity + static support.** The controller-owned capsule no longer has a fixed world Y. It integrates vertical velocity and gravity, uses mover collision planes as support evidence, can lose support, fall, land, and perform one bounded jump from support.

Controls:

- `WASD` — planar intent
- `Space` — bounded jump intent while supported
- `R` — reset

## Research boundary

This is not a finished vertical controller and not an architecture verdict. Gate 1 is intentionally limited to static support. Dynamic support, finite player mass, moving-platform inheritance, stairs, slopes, mantling, grabbing, articulation, and solver-owned root are not part of this gate.

The previous E1-A1 planar-push baseline remains preserved in Git history at `cadb9405097ede149e64a64d8070c6127e8849a5`.