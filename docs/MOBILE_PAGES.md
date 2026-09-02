# Mobile Pages — touch donor surface

Status: **touch/input feasibility is qualified and initial Owner real-device smoke passed; current mobile mechanics are Donor v1 / A‴; ergonomics, sustained performance and thermal/device acceptance remain open.**

## Current-state overlay after E2.3e

The original mobile stage was built and first tested while Donor v0 / A″ was the current donor. That historical evidence remains valid for the touch/input surface, but the project has since promoted A‴ to **current Donor v1**.

Current rules:

- the normal public URL uses Donor v1 / A‴ on desktop and touch devices;
- mobile does not own a separate character controller or separate physics constants;
- `?mode=donor` / `?mode=previous` now means the frozen previous Donor v0 / A″ reference;
- the old numeric mode shortcuts, including key `5`, are no longer part of the normal public UI;
- `?touch=1` / `?touch=0` remain diagnostic UI overrides only;
- touch and keyboard still feed the same device-independent donor intent contract.

The initial Android recording therefore proves the **touch substrate and v0-era mobile feasibility**, not a complete post-E2.3e device qualification of v1. Donor v1 itself is mechanically qualified independently by the canonical donor/research smoke matrix.

## Goal

Expose the current qualified donor behavior through the same GitHub Pages runtime on desktop and phone/tablet without creating device-specific character semantics.

This remains an interaction/presentation concern, not a separate embodiment architecture.

## Input contract

Keyboard and touch produce the same intent shape consumed by the donor runtime:

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

Pointer Events and pointer capture keep simultaneous movement and camera drag independent.

## Touch activation

Touch UI is enabled when the browser reports touch points or a coarse primary pointer.

Diagnostic overrides:

- `?touch=1` — force touch UI on;
- `?touch=0` — force touch UI off.

These switches affect only UI/input availability, not character mechanics.

## Layout boundary

The Pages surface includes:

- `viewport-fit=cover`;
- safe-area inset positioning for HUD and controls;
- dynamic viewport-height sizing;
- no page scrolling/overscroll during play;
- coarse/mobile HUD reduction so controls do not consume the play surface.

No device-specific physics constants are introduced.

## Historical mobile-stage provenance

The original mobile work started from:

`d4e98787c179ab14816b87ca6073f353a50386b6`

At that time `createDonorCharacter(...)` represented the current A″ behavior and `?mode=donor` plus key `5` selected it. Those mode/key details are historical and have been superseded by E2.3e public cleanup; the underlying touch/input evidence remains useful.

Candidate head before the original mobile documentation:

`62595249d87d945fc55cfb029b05997b80e47967`

GitHub Actions run `33542671489`:

- complete historical mechanical smoke: **PASS**;
- donor equivalence gate: **PASS**;
- synthetic mobile-input gate: **PASS**;
- production build: **PASS**;
- Pages deployment skipped because the run was on a branch.

Merged mobile main:

`5e4aedc48ea01f8794ee779953355d0aa11a23d8`

GitHub Actions run `33542853906`:

- complete smoke/build: **PASS**;
- Pages artifact: **PASS**;
- GitHub Pages deployment: **PASS**.

The synthetic mobile-input gate checks dead-zone behavior, axial input, diagonal magnitude clamping, out-of-radius stick clamping and keyboard+touch movement composition. It remains part of canonical `smoke:donor` after the v1 promotion.

## Initial Owner real-device evidence

On 2026-09-01 the then-current public donor Pages build was opened on a real Android phone. Touch controls appeared automatically without the diagnostic `?touch=1` override.

The accompanying ~39 s screen recording established that:

- the touch surface rendered correctly in the real mobile browser viewport;
- the virtual stick drove the player through the playground;
- jump was usable during the same session;
- the donor runtime remained interactive during ordinary free play.

Owner judgement was positive: the touch version worked from the first attempt and was already perceived as genuinely usable.

This is a **mobile feasibility / initial interaction PASS**, not full ergonomic or performance acceptance.

## Mechanical non-regression boundary

The original mobile stage did not alter character mechanics. After E2.3e, the same principle remains mandatory: mobile-specific fixes should first stay in input/camera/layout unless evidence demonstrates a real mechanics problem shared by the donor.

If behavior feels different on phone, distinguish in this order:

1. stick/dead-zone/sensitivity effects;
2. camera ergonomics;
3. frame pacing/performance;
4. only then an actual physics regression.

Do not retune Donor v1 merely to compensate for a touch-control problem.

## What remains unproven

Current evidence still does not establish:

- preferred long-term virtual-stick size/placement;
- ideal real-thumb camera sensitivity;
- whether Sprint deserves its current hold-button placement;
- preferred orientation policy;
- sustained renderer performance, thermal behavior or battery cost;
- touch-target quality across multiple phone/tablet sizes;
- accessibility requirements;
- downstream multiplayer integration.

These remain consumer/device questions, not reasons to reopen character mechanics automatically.

## Next real-device gate

When mobile work becomes relevant again, test the **normal current URL / Donor v1 / A‴** and answer concrete experience questions:

1. Can movement + camera be used simultaneously without pointer conflicts during longer free play?
2. Are joystick range/dead-zone and camera sensitivity comfortable enough to stop thinking about the controls?
3. Are Jump/Sprint/Reset reachable without obscuring important play space?
4. Does the current A‴ feel remain intact under touch input?
5. Is sustained performance acceptable on the actual target phone/tablet?

Until a real device/consumer need makes these questions important, no further mobile framework work is required.
