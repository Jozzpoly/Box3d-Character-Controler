# Box3d Character Controler

Experimental Box3D character-embodiment laboratory.

Current stage: **E1-A1 — First Physical Contact Baseline**.

The first experiment intentionally stays small: a controller-owned human-scale capsule can move on a flat plane and transfer contact impulse into one dynamic Box3D body. The goal is not to prove a final controller architecture; it is to obtain the first direct Owner evidence about whether this style of physical coupling already feels meaningful.

## Controls

- `WASD` — move
- `R` — reset

## Current implementation boundary

- browser runtime: `box3d.js@0.1.1` + Three.js + Vite;
- character motion: Box3D mover collision/plane solving, restricted to the horizontal plane for this experiment;
- dynamic coupling: a deliberately first-order port of the native CharacterMover push step — contacted dynamic bodies receive an impulse at the contact point;
- controller authority: intentionally effectively infinite mass; no equal-and-opposite recoil is applied to the character in E1-A1;
- deployment: GitHub Pages via GitHub Actions.

## Current non-claims

This is not a locomotion system, active ragdoll, final character architecture, animation system, or reusable framework. Grounding, jumping, stairs, grabbing, solver-owned character motion and richer articulation are deliberately outside this stage.
