# Mobile Pages — touch donor surface

Status: **machine-qualified; initial Owner real-device smoke PASS for automatic touch activation and basic free play; ergonomics/performance acceptance still open; character mechanics unchanged**.

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

The mobile branch did not edit:

- `src/character.js`;
- `src/donor-character.js` at the time of the mobile stage;
- `src/solver-owned-character.js`;
- `src/playground.js`;
- Box3D parameters or fixed timestep/substeps.

Camera pointer routing changed only from a single global dragging flag to tracking the active pointer ID. This prevents a second simultaneous pointer from stealing an existing camera drag while preserving ordinary one-pointer desktop drag behavior.

## Machine qualification

Candidate head before the original mobile documentation:

`62595249d87d945fc55cfb029b05997b80e47967`

GitHub Actions run `33542671489`:

- complete historical mechanical smoke: **PASS**;
- stabilized donor equivalence gate: **PASS** as part of canonical smoke;
- synthetic mobile-input gate: **PASS** as part of canonical smoke;
- production build: **PASS**;
- Pages deployment intentionally skipped because the run was on a branch.

Merged mobile main:

`5e4aedc48ea01f8794ee779953355d0aa11a23d8`

GitHub Actions run `33542853906`:

- complete smoke/build: **PASS**;
- Pages artifact: **PASS**;
- GitHub Pages deployment: **PASS**.

The synthetic mobile-input gate checks dead-zone behavior, axial input, diagonal magnitude clamping, out-of-radius stick clamping and keyboard+touch movement composition.

## Initial Owner real-device evidence

On 2026-09-01 the public `?mode=donor` Pages build was opened on a real Android phone. Touch controls appeared automatically without using the diagnostic `?touch=1` override.

The accompanying ~39 s screen recording provides direct evidence that:

- the touch surface renders correctly in the real mobile browser viewport;
- the virtual stick can drive the player through the playground;
- jump input is used during the same session;
- the donor runtime remains interactive during ordinary free play.

Owner judgement immediately after opening the build was positive: the touch version worked from the first attempt and was already perceived as genuinely usable.

This is a **mobile feasibility / initial interaction PASS**, not full ergonomic acceptance.

## What remains unproven

Current evidence still does not establish:

- that virtual-stick size/placement is the preferred long-term layout;
- that camera sensitivity is ideal under a real thumb;
- that Sprint deserves its current hold-button placement;
- that portrait orientation is the preferred game orientation;
- sustained renderer performance, thermal behavior or battery cost;
- touch-target quality across multiple phone/tablet sizes;
- accessibility requirements;
- downstream multiplayer integration.

Those should be resolved from real consumer/device evidence rather than speculative framework work.

## Next Owner device gate

Further mobile work should answer concrete experience questions rather than reopen character mechanics by default:

1. Can movement + camera be used simultaneously without pointer conflicts during longer free play?
2. Are joystick range/dead-zone and camera sensitivity comfortable enough to stop thinking about the controls?
3. Are Jump/Sprint/Reset reachable without obscuring important play space?
4. Does the existing A″ physical feel remain recognizable under touch input?
5. Is sustained performance acceptable on the actual phone?

If the mechanics seem different, first distinguish input/camera ergonomics from an actual physics regression before changing donor parameters.
