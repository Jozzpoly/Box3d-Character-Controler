# Donor foundation falsification checkpoint — 2026-09-10

Branch: `research/donor-foundation-falsification-2026-09-10`  
Canonical baseline: `main` @ `e7a98beaca4c010e056c31db97b33c05b4610e38`  
Pre-checkpoint research head: `6314375df9859882f35571cdca90ec931f249fac`

This document closes the bounded A1–A5 Donor-foundation falsification campaign. Creating this checkpoint advances the research branch itself; the SHA above is therefore the exact pre-checkpoint evidence head, not the checkpoint commit.

## 1. Boundary and repository state

The campaign deliberately characterized the accepted current Donor without repairing it.

Before this checkpoint:

- research branch was `14` commits ahead / `0` behind `main`;
- merge base was exactly canonical `main` `e7a98beaca4c010e056c31db97b33c05b4610e38`;
- diff contained exactly `13` files: `6` temporary Actions workflows + `7` headless harness scripts;
- there were **no `src/` changes and no runtime changes**;
- normal canonical branch CI continued to pass through the campaign.

The evidence below therefore characterizes the same accepted Donor v1 mechanics present on canonical `main`; failures were not produced by branch-local runtime repairs or tuning.

## 2. Executable findings

### A1 — dynamic-support standing load accounting

Current manual dynamic-support reciprocity does not transfer the full `80 kg × 20 m/s²` gravitational load to the support. At `60 Hz`, the full expected player gravity impulse would be about `26.67 N·s/tick`.

Observed standing-load fractions:

| Dynamic support | Full-weight fraction | Approx. effective player load |
| --- | ---: | ---: |
| ~28.15 kg | ~26.09% | ~20.9 kg |
| 80 kg | ~50.08% | ~40.1 kg |
| ~82.37 kg | ~50.81% | ~40.6 kg |
| 320 kg | ~80.05% | ~64.0 kg |

The result follows the simple reduced-mass prediction to roughly `0.05–0.08` percentage points. This is therefore a reproducible authority/load-accounting property, not observed jitter.

**Confirmed fact:** standing load is effectively reduced-mass partitioned rather than full-player-weight transfer.

**Not established:** that exactly 100% full player weight is necessarily the correct final gameplay law, or that this mechanism causes the previously observed E19 self-lift exploit. A clean causal self-lift fixture does not yet exist.

A1 exact artifact metadata was not recovered during this closure pass; the numerical result and harness remain on this branch. Its canonical branch regression boundary had already passed earlier in the campaign.

### A2 — blocked velocity and multi-plane constraint order

Workflow run: `34521543100`  
Evidence artifact: `10169843713`  
Artifact ZIP SHA-256: `dc3d271409e2742c06b00bd2c3f9b69969105267d4c2561dd5e6c96325a2122d`  
Canonical regression run: `34521542947`

**Ceiling specimen**

- geometry correctly blocks the capsule near center `y ≈ 1.255` for an expected `1.25` boundary plus mover slop;
- for `22` constrained ticks, stored vertical velocity remains exactly `+6.0 m/s`;
- constraint clip count remains `0`.

Classification: `GEOMETRY_BLOCKED_BUT_UPWARD_VELOCITY_REMAINS_STORED`.

**75° nonorthogonal corner**

- reversing the order of two active planes changes the output velocity by `0.241481 m/s`;
- each ordering leaves about `0.241481 m/s` inward violation against the plane processed first.

Classification: `OUTPUT_DEPENDS_ON_ACTIVE_PLANE_ORDER`.

**90° orthogonal control**

- order delta `0`;
- final inward violation `0`.

Classification: `ORDER_INVARIANT_FOR_THIS_CASE`.

**Confirmed fact:** current horizontal-only policy can retain blocked vertical velocity, and sequential per-plane clipping is not a general order-independent projection for nonorthogonal active constraints.

### A3 — support transport path safety

Workflow run: `34521849185`  
Evidence artifact: `10169959378`  
Artifact ZIP SHA-256: `1d7b410ff7cfbb92a753ab880b41da79654eaf7eceb5a9ac2a354e19f20f3952`  
Canonical regression run: `34521849455`

The test geometry lets the support platform physically pass below a raised wall while the player capsule must collide with that wall.

- ordinary carry: character follows support exactly `3.0 m`, retaining support for `180/180` frames;
- slow carry into wall: capsule stops at about `x = -0.405`, matching the expected near-side collision boundary;
- one-tick fast support move: platform moves `3.0 m` from `x=-1.5` to `x=+1.5`, and the character is transported the same `3.0 m` through the wall, ending at `x=+1.5` while still classified as `KINEMATIC` support.

Classification: `FAST_SUPPORT_ENDPOINT_TRANSPORT_CROSSES_A_WALL_THAT_NORMAL_SLOW_MOVEMENT_RESPECTS`.

**Confirmed fact:** support endpoint transport is not swept against third-party geometry.

### A3b — support detach / unilateral-contact semantics

Workflow run: `34522009423`  
Evidence artifact: `10170025991`  
Artifact ZIP SHA-256: `35b854424af8aac763ab37955d494d9512cc53be97e2d4a4a9e9a5dd182b22c7`  
Canonical regression run: `34522009281`

- stationary support: negligible vertical drift;
- support moved `+1.0 m` in one tick: character moves `+1.0 m` and remains supported;
- support moved `-1.0 m` in one tick: character also moves `-1.0 m` and remains supported;
- one-tick free-fall displacement from rest at `g=20` is only about `0.00278 m`.

The receding support therefore drags the character downward about `360×` farther than free fall would move it in that tick.

Classification: `FAST_RECEDING_SUPPORT_PULLS_CHARACTER_DOWN_AND_REMAINS_ATTACHED_FOR_THE_TICK`.

**Confirmed fact:** previous-frame support transport behaves as a temporary bilateral attachment before support is re-evaluated; ordinary carry works, but large support changes do not obey a strict unilateral detach entitlement.

### A4 — render cadence leaks into camera-relative mechanics

Initial protocol-miss run: `34522195229`  
Protocol-only correction commit: `0a659f8f6e74382e01805f107ea00c8c67bc5cee`  
Corrected successful run: `34522314029`  
Evidence artifact: `10170141527`  
Artifact ZIP SHA-256: `e41d632bab6fec1ecee157547236b02c75d827fec735f05b7ec32f1e521747e0`  
Canonical regression run: `34522314047`

The first synthetic run exposed a harness timing issue: nominal exact `1.0 s` produced `59` ticks for the 60 Hz schedule because of floating-point accumulator remainder. That run is retained as **protocol-miss provenance**, not mechanics evidence. The correction added the same negligible `+1 ns` schedule pad to every case; production accumulator comparison, browser-loop ordering and Donor mechanics were not changed.

Corrected experiment: identical `W` input, identical 90° desired camera turn, exactly `60` physics ticks, different render schedules.

Final positions:

- 30 Hz: approximately `[-4.5742, 0.8950, -0.3091]`;
- 60 Hz: approximately `[-4.6254, 0.8950, -0.2746]`;
- 144 Hz: approximately `[-4.6893, 0.8950, -0.2253]`;
- legal 100 ms leading hitch: approximately `[-4.2327, 0.8950, -0.5010]`.

Maximum endpoint difference:

- uniform 30/60/144 Hz: `0.142325 m`;
- including the 100 ms hitch: `0.533346 m`.

Final velocities are nearly identical. The displacement difference comes from physics ticks sampling different presentation-updated `FollowCamera.basis()` states. At 144 Hz the first physics tick already samples yaw about `0.33035 rad`; 30/60 Hz begin at yaw `0`; the leading hitch makes the first six physics ticks use the old yaw.

Classification: `CAMERA_RELATIVE_DONOR_TRAJECTORY_DEPENDS_ON_RENDER_FRAME_SCHEDULE`.

**Confirmed fact:** current presentation/render scheduling materially affects camera-relative mechanical trajectory, despite identical physics tick count and nominal player input.

**Gameplay consequence not yet quantified:** how much this changes subjective Owner feel in ordinary play or E19 grip/reach decisions. It is nevertheless a direct contamination path into those evaluations because the same camera basis participates in intent construction.

### A5 — sensor query semantics and stale-body lifecycle

Workflow run: `34526125777`  
Evidence artifact: `10171607901`  
Artifact ZIP SHA-256: `1cee0d7eeefdc4cf074b752697f0d6a4af020e50c27c9e2ab725418890568e73`  
Canonical regression run: `34526125685`

**Mover sensor specimen**

- unobstructed route: `7.4072 m`;
- solid wall route: `0.5950 m`;
- sensor wall route: `0.5950 m`, with the same blocking pattern.

Classification: `SENSOR_BLOCKS_CURRENT_DONOR_MOVER_LIKE_SOLID_GEOMETRY`.

**E19 swept reach sensor specimen**

- first obstruction is the sensor at sweep fraction `0.26167`;
- solid geometry behind it is not reached.

Classification: `SENSOR_IS_FIRST_SWEPT_GRIP_OBSTRUCTION`.

**Destroyed-support lifecycle specimen**

- active support body reports `b3Body_IsValid = true` before destruction;
- after `b3DestroyBody`, validity becomes `false`;
- the next character `preStep()` with the stale support relation terminates the isolated child with `RuntimeError: memory access out of bounds`, on the path through body-local support-anchor update.

Classification: `ORPHANED_SUPPORT_RELATION_THROWS_AFTER_BODY_DESTRUCTION`.

**Confirmed facts:** current mover and E19 swept-reach semantics include sensors; stale destroyed support IDs are unsafe to consume.

**Not established:** that sensors should universally be excluded. Sensor participation is currently an implicit semantics decision that needs an explicit query contract. The destroyed-ID case is more objective: before runtime body destruction becomes a normal gameplay operation, stale relation validity must be handled safely.

## 3. Cross-campaign synthesis

The campaign does **not** support a conclusion that Donor v1 should be discarded or wholesale-replaced. Its accepted ordinary locomotion/regression behavior continued to pass while the falsifiers exposed narrower boundaries outside or at the edges of its historically qualified envelope.

The findings cluster into five foundation debts:

1. **Dynamic load authority/accounting** — standing load follows reduced-mass partition rather than full player gravity transfer.
2. **Constraint-velocity robustness** — blocked vertical velocity can remain stored; sequential nonorthogonal plane clipping is order-dependent.
3. **Support topology and transport** — ordinary carry is useful, but large support transforms are unswept and temporarily bilateral.
4. **Physics/presentation separation** — render-driven camera state leaks into physics intent and changes trajectories.
5. **Query/lifecycle contracts** — sensor semantics are implicit; stale destroyed-body relations can reach an invalid native/WASM access path.

These are now executable, bounded facts. They should replace broad intuition such as “the controller feels weird because physics is unstable” with specific mechanisms that can be independently repaired or deliberately accepted.

## 4. What this campaign deliberately did not prove

- It did not prove that every observed boundary is currently visible or harmful in normal Owner gameplay.
- It did not prove A1 causes the known E19 self-lift observation.
- It did not define the final standing-load law, sensor policy, detach threshold, generalized constraint solver, or camera/input architecture.
- It did not alter Donor v1 or choose a replacement character-controller architecture.
- It did not start E20.

Owner hands-on judgement remains above these technical findings when deciding which debt materially harms feel, fun, readability or future interaction capability.

## 5. Next phase — repair prioritization/design, not automatic implementation

Do **not** continue by inventing A6 merely because more falsifiers are possible. The bounded campaign has enough evidence to change phase.

Provisional technical priority, subordinate to Owner judgement:

1. **Tier 1 — A4 + A3/A3b:** physics/presentation timing and support topology/path safety have broad potential to contaminate gameplay evaluation and future moving-world mechanics.
2. **Tier 2 — A1:** resolve the intended authority/load contract before building mechanics that depend on believable player↔dynamic-world loading.
3. **Tier 3 — A2:** design a bounded vertical/multi-plane constraint policy without casually replacing the successful accepted horizontal behavior.
4. **Tier 4 — A5:** make query semantics explicit; stale-ID/lifecycle guard becomes mandatory before dynamic body destruction is part of normal gameplay. Sensor exclusion itself should not be assumed without gameplay semantics.

The next execution stage should first compare repair candidates, risks and likely Owner-visible value. Runtime implementation should begin only after that prioritization establishes a narrow first repair boundary.

## 6. Closure state

**A1–A5 falsification campaign: COMPLETE.**  
**Current stage: EVIDENCE SYNTHESIS COMPLETE / REPAIR DESIGN PENDING.**

Canonical `main` remains the accepted product baseline; this research branch is an evidence carrier, not a promoted replacement.
