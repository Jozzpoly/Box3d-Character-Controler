# Box3d Character Controler

Experimental Box3D physical-player / embodiment laboratory.

Current stage: **E1-A2 — Support Reciprocity Crucible**.

## Current specimen

The controller-owned capsule now participates in vertical consequence:

- gravity and vertical velocity;
- support detection from mover collision geometry;
- support loss, falling and landing;
- one bounded jump intent;
- static and dynamic support;
- explicit `80 kg` virtual player mass used to apply landing/standing load impulse to a dynamic support body;
- generic translational support transport from the dynamic body's actual displacement;
- horizontal support velocity inherited when jumping away from a moving dynamic support.

Controls:

- `WASD` — planar intent
- `Space` — bounded jump intent while supported
- `F` — physically nudge the dynamic support sideways
- `R` — reset

## Research boundary

This remains a falsifier, not a finished character controller. There is no stair/step system, slope policy, mantling, grabbing, articulation, active ragdoll, solver-owned root, or scenario-specific platform mode. Support transport currently follows body translation, not full angular contact-point motion; that limitation is deliberately visible rather than hidden behind more patches.

Evidence history:

- E1-A1 planar-push baseline: `cadb9405097ede149e64a64d8070c6127e8849a5`
- E1-A2 Gate 1 gravity/static-support machine + Pages PASS: `5fd2aabdff35e79944bd82901175a9f64e73578f`