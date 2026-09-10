# Donor foundation repair design — 2026-09-10

Branch: `research/donor-foundation-repair-a4-2026-09-10`  
Parent evidence checkpoint: `research/donor-foundation-falsification-2026-09-10` @ `3d9ee777304e5e4a138c2c45a2fa00f356d91064`  
Canonical product baseline remains `main` @ `e7a98beaca4c010e056c31db97b33c05b4610e38`.

## Purpose

This branch starts repair design after the bounded A1–A5 falsification campaign. The evidence branch remains unchanged as a characterization carrier. No finding is automatically promoted into a product change.

## Repair classification

### A4 — render cadence leaks into camera-relative mechanics

Classification: **hard determinism/integration defect with direct Owner-test contamination potential**.

The Donor contract already puts `forward/right` basis construction outside the donor. Therefore A4 can be repaired at the caller/camera integration boundary without rewriting Donor v1 mechanics, numerical profile, support semantics or contact reciprocity.

Current browser ordering is:

1. zero or more fixed physics ticks sample `FollowCamera.basis()`;
2. one render-side `FollowCamera.update(frameDt)` advances yaw;
3. render.

That means a render frame containing two or six catch-up physics ticks holds mechanical yaw fixed for the whole batch, while high render cadence may advance presentation yaw multiple times before the next physics tick.

### A3 / A3b — support endpoint transport and temporary bilateral attachment

Classification: **hard geometric/topology debt, but higher feel risk**.

The current Donor explicitly applies the previous support anchor endpoint delta directly to character position before ordinary mover solving. A naïve clamp or removal could destroy useful moving-platform carry. Repair should therefore follow A4 rather than be first.

### A1 — reduced-mass standing load

Classification: **explicit authority-law ambiguity with real physical consequence**.

The current result is reproducible, but the desired gameplay law is not yet established. Do not force 100% virtual player weight merely because reduced-mass transfer is surprising.

### A2 — constraint velocity robustness

Classification: **hard mathematical boundary, bounded by already Owner-qualified v1 horizontal behavior**.

Repair must preserve the existing v1 stale-horizontal-authority fix and avoid a broad replacement of the accepted movement path.

### A5 — sensors and stale body lifecycle

Classification is split:

- stale destroyed support ID: **objective safety/lifecycle bug**;
- sensor participation: **semantic policy not yet chosen**.

The stale-ID guard is mandatory before body destruction becomes ordinary gameplay, but it currently has less Owner-test contamination than A4.

## R1 selection

**R1 = fixed-step mechanical camera yaw.**

The goal is not to make camera motion deterministic as presentation. The goal is to make the world-space basis consumed by physics deterministic for a given sequence of fixed ticks and camera target yaw updates.

### Preserve

- Donor v1 code and profile unchanged;
- `1/60 s` fixed physics step;
- existing camera target input (`desiredYaw`);
- existing visual camera yaw damping rate `17`;
- current 60 Hz ordering where the first physics tick after a yaw target change still consumes the pre-damped yaw;
- visual camera smoothing independent from physics;
- ordinary PlayerInput intent contract.

### Introduce

`FollowCamera` receives a separate mechanical/control yaw state initialized with the camera yaw.

A fixed physics tick should:

1. sample a basis from the current control yaw;
2. use that basis for mechanical movement and any camera-relative mechanical reach/acquisition;
3. after the tick, advance control yaw toward `desiredYaw` using the same exponential damping law/rate (`17`) and exactly the fixed physics `dt`.

Render-side `update(frameDt)` may continue advancing visual yaw independently.

This ordering intentionally reproduces the current 60 Hz first-tick behavior while removing render-batch cadence from subsequent mechanical yaw samples.

### E19 boundary

E19 currently uses render-smoothed camera basis for both locomotion and swept grip aim/acquisition. R1 should route **mechanical** movement and reach acquisition through the fixed-step basis. Render-only arm preview may remain presentation-relative unless evidence shows an unacceptable mismatch.

## R1 falsification contract

A candidate is not successful merely because it builds.

Using the same A4 matrix:

- 30 Hz render schedule;
- 60 Hz;
- 144 Hz;
- legal 100 ms leading hitch;
- exact 60 fixed physics ticks in every case;
- identical held-forward input and identical 90° desired yaw target;

require:

1. mechanical yaw samples are identical tick-for-tick across schedules within floating-point tolerance;
2. donor final position and velocity are identical across schedules within numerical tolerance;
3. the first mechanical yaw sample remains `0`, matching the current 60 Hz ordering;
4. visual camera yaw is allowed to remain render-schedule-dependent because it is presentation state;
5. canonical donor/research smoke and playground build remain green.

A candidate that simply switches physics to unsmoothed `desiredYaw` fails the preservation intent even if it passes schedule invariance, because it changes camera-relative response semantics substantially.

## Promotion boundary

R1 is initially a repair specimen, not a donor revision.

If executable evidence passes, the likely semantic interpretation is a browser/integration repair because the donor receives the same intent shape and remains untouched. Owner gameplay still decides whether the fixed-step camera-relative response preserves or improves feel before any canonical promotion.

## Deferred

Do not start A3/A3b support repair, A1 load-law rewrite, A2 generalized projection, global sensor exclusion, E20 or broad architecture refactoring inside R1.

**Current stage: R1 DESIGN FROZEN / IMPLEMENTATION AND FALSIFICATION NEXT.**
