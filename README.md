# Box3d Character Controler

Experimental Box3D character-embodiment laboratory.

Current stage: **E1-A1 — First Physical Contact Baseline**.

The first experiment intentionally stays small: a controller-owned human-scale capsule can move on a flat plane and transfer contact impulse into one dynamic Box3D body. The goal is not to prove a final controller architecture; it is to obtain the first direct Owner evidence about whether this style of physical coupling already feels meaningful.

## Controls

- `WASD` — move
- `R` — reset

## Current non-claims

This is not a locomotion system, active ragdoll, final character architecture, animation system, or reusable framework. The character is controller-owned and intentionally has effectively infinite authority against the pushed body; that limitation is part of what this baseline is meant to expose.
