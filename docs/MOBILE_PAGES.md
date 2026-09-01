# Mobile Pages — touch donor surface

Status: **machine-qualified mobile interaction candidate; Owner device free-play pending; character mechanics unchanged**.

## Goal

Expose the stabilized A″ donor behavior on the same GitHub Pages runtime with phone/tablet controls, so downstream projects can inherit one qualified controller/input contract instead of independently rebuilding mobile character semantics.

This is an interaction/presentation stage, not a new embodiment experiment.

Base before mobile work:

`d4e98787c179ab14816b87ca6073f353a50386b6`

That base already contains the machine-qualified `createDonorCharacter(...)` entry point for current Owner-preferred A″ behavior.

## Runtime contract

Mobile does **not** create a second controller. Keyboard and touch both produce the same intent shape consumed by the existing character runtime:

- `moveForward` / `moveRight` in `[-1, 1]` with unit-magnitude diagonal clamp;
- camera-relative `forward` / `right` basis;
- queued `jump` plus held `jumpHeld`;
- held `sprint`.

Touch controls:

- left virtual stick — analog movement;
- drag on the remaining canvas — orbit camera;
- `JUMP` — queued press + held jump semantics;
- `SPRINT` — held sprint;
- `RESET` — restore playground + player.

Pointer Events and pointer capture are used so simultaneous left-stick movement and right-side camera drag remain independent.

## Donor mode

A new explicit public mode selects the stabilized donor factory:

`?mode=donor`

Keyboard shortcut:

`5`

Historical research modes remain unchanged:

- `1` — frozen A / Foundation 02.1;
- `2` — frozen B solver-owned translational root;
- `3` — A′ causal-component reciprocity;
- `4` — historical A″ probe composition;
- `5` — stabilized donor A″ entry point.

The donor mode is intentionally explicit rather than silently changing the repository's historical default mode according to device type.

## Touch activation

Touch UI is enabled when the browser reports touch points or a coarse primary pointer.

Diagnostic overrides:

- `?touch=1` — force touch UI on;
- `?touch=0` — force touch UI off.

These switches affect only UI/input availability, not character mechanics.

## Layout boundary

The Pages surface now includes:

- `viewport-fit=cover`;
- safe-area inset positioning for HUD and controls;
- dynamic viewport-height sizing;
- no page scrolling/overscroll during play;
- coarse/mobile HUD reduction so controls do not consume the play surface.

No device-specific physics constants are introduced.

## Mechanical non-regression boundary

The mobile branch does not edit:

- `src/character.js`;
- `src/donor-character.js`;
- `src/solver-owned-character.js`;
- `src/playground.js`;
- Box3D parameters or fixed timestep/substeps.

Camera pointer routing changes only from a single global dragging flag to tracking the active pointer ID. This prevents a second simultaneous pointer from stealing an existing camera drag while preserving ordinary one-pointer desktop drag behavior.

## Machine qualification

Candidate head before this document:

`62595249d87d945fc55cfb029b05997b80e47967`

GitHub Actions run `33542671489`:

- complete historical mechanical smoke: **PASS**;
- stabilized donor equivalence gate: **PASS** as part of canonical smoke;
- synthetic mobile-input gate: **PASS** as part of canonical smoke;
- production build: **PASS**;
- Pages deployment intentionally skipped because the run is on a branch.

The synthetic mobile-input gate checks dead-zone behavior, axial input, diagonal magnitude clamping, out-of-radius stick clamping and keyboard+touch movement composition.

## What remains unproven

Machine qualification does not establish:

- that virtual-stick size/placement feels good on the Owner's phone;
- that camera sensitivity feels right under a real thumb;
- that Sprint deserves its current hold-button placement;
- that portrait orientation is enjoyable;
- that renderer performance/thermal behavior is adequate on the target phone;
- that touch targets are ideal across phone sizes;
- that downstream multiplayer integration is complete.

Those require real-device evidence.

## Owner device gate

The first public mobile Owner test should answer only:

1. Can movement + camera be used simultaneously without pointer conflicts?
2. Is ordinary movement/jump/sprint controllable enough for free play?
3. Are controls readable and reachable without obscuring the important play area?
4. Does the existing A″ physical feel appear preserved rather than mechanically different?
5. Is performance obviously unacceptable on the actual phone?

If the mechanics feel different, first distinguish input/camera ergonomics from an actual physics regression before changing controller parameters.
