# R2 runtime shadow integration checkpoint — 2026-09-11

Status: **MACHINE-QUALIFIED READ-ONLY RUNTIME INTEGRATION / LIVE OWNER-BROWSER EVIDENCE PENDING**.

Branch:

`research/temporal-input-runtime-shadow-r2-2026-09-11`

Qualified implementation head before this checkpoint:

`dfa1afcf949cbde0508fa9b55a1c0e9f6dfef999`

## What is now true

R2 is wired into the real `src/main.js` loop only when the explicit query flag `?temporalShadow=1` is present.

The existing gameplay authority remains:

`PlayerInput.sample(basis) -> intent -> character.preStep(dt, intent)`

The temporal shadow runs beside that path. It does not replace, retime, prevent, or consume gameplay input.

At each real RAF frame it:

1. mirrors the frame in `TemporalFrameEpochMapper`,
2. drains timestamped real browser input observations,
3. classifies delivery vs temporal entitlement,
4. audits whether current mutable state would be visible too early inside a catch-up batch,
5. observes the actual number of physics ticks executed by the real accumulator,
6. invalidates `trustworthyTimeline` if predicted and actual tick counts ever diverge.

Observer failure is fail-open for gameplay: the observer destroys/disables itself while the game continues.

## Machine gates

The runtime-shadow workflow passes:

- the full previously-qualified R2 substrate stack,
- runtime shadow observer contract,
- explicit non-authority integration boundary guard,
- final Vite runtime build.

The normal playground verification workflow also passes foundation/current smoke and build on this research branch.

GitHub Pages publication is intentionally skipped for the research branch, so this checkpoint does **not** claim a public playable research build.

## Important evidence boundary

Demonstrated:

- query-gated integration builds,
- old gameplay input path remains direct authority,
- observer mirror can cross-check actual tick counts,
- observer contract detects both missed eligible physics opportunities and premature catch-up application,
- integration source guard prevents accidental obvious coupling of shadow into gameplay authority.

Not demonstrated yet:

- distribution/frequency of timing anomalies in real Owner gameplay,
- behavior on the Owner's actual desktop/mobile browsers,
- that `Event.timeStamp` and `performance.now()` remain well-aligned across every target browser/device,
- any gameplay-feel improvement from adopting R2 as authority,
- any live approximation policy for context-dependent late jump.

## Promotion rule

Do not promote R2 to gameplay authority from this checkpoint alone.

A later live browser campaign should collect real shadow evidence first. Until then the current gameplay path remains canonical.

## Next project-level move

R2 has reached diminishing returns without live browser evidence. Return to the broader A1–A5 foundation map and choose the next upstream defect class rather than indefinitely expanding temporal theory.
