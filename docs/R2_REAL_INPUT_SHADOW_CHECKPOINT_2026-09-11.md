# R2 real input shadow checkpoint — 2026-09-11

Status: **isolated temporal substrate + real-input shadow/timeline probe qualified; runtime observer integration next**.

Qualified branch:

`research/temporal-input-substrate-r2-2026-09-10`

Qualified head at this checkpoint:

`06719ec7a78ded2459f791ea8cf9947f65d0d15a`

## What is now demonstrated

The R2 stack has 18 green CI gates. It now separates four facts that the current mutable `PlayerInput` path collapses together:

1. input occurrence time (`Event.timeStamp`),
2. handler delivery time,
3. simulation entitlement time,
4. the physics-consumption frontier.

A browser event can therefore be characterized independently as:

- delivered late after one or more eligible physics ticks have already passed,
- still on time even though its JS handler was delayed,
- part of wall time explicitly discarded by the 100 ms frame clamp,
- before a hard lifecycle cut,
- or available before a catch-up batch but temporally entitled only to a later tick inside that batch.

The last case exposes the opposite failure mode from late delivery: current mutable input state can be applied **too early** to catch-up history. In the qualified long-stall specimen, an input occurring near the end of the retained 100 ms tail would be visible to five catch-up ticks that precede its temporal entitlement if sampled naively from current mutable state.

## Important terminology correction

Input capture now uses `lifecycleEpoch` for blur/hidden boundaries. The frame mapper's `epoch` is a different concept: it also advances for visible long-stall discontinuities. These must not be compared as if they were the same authority.

## Current temporal model

- Continuous frames: earliest-causal event mapping.
- Visible long stall: retain only the recent tail owned by the simulation; discarded wall time is not replayed.
- Hidden/blur/session break: hard temporal cut.
- Held state: reconcile current state rather than replay stale duration.
- Edge intent: preserve original occurrence age; never mint a new full semantic lifetime at delivery.
- Context-dependent late edge after the world has advanced past its opportunity: exact truth is no longer available without history/rollback; the policy must expose that approximation boundary.

## What has NOT happened

- No R2 component controls gameplay.
- `PlayerInput.sample()` remains the gameplay authority.
- Donor mechanics are unchanged.
- `main` is unchanged by R2.
- No approximation policy for context-dependent late jump has been promoted.
- No claim is made yet about frequency/distribution of these timing cases during real Owner gameplay.

## Next gate

Create a query-gated, read-only runtime observer that runs beside the existing input path and records real browser events against the mirrored frame/physics timeline. It must not prevent, consume, retime, or replace gameplay input.

The first live evidence should answer:

- how often normal input misses an eligible tick,
- how often catch-up batching would expose new state to ticks before its entitlement,
- whether keyboard/touch/jump differ materially,
- and whether these effects occur only under forced stalls or also during ordinary play.
