# Project state — Embodied Player Laboratory

Grounded: **2026-09-04, after public E16.2a deployment and exact-main verification**

This is the compact canonical orientation layer. Before any future write, re-fetch live `main` and exact SHA. Recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 is closed by Owner judgement as exhausted for now; its causal evidence remains valid provenance.
- E15 established that accepted Donor traversal can coexist with a separate solver-owned physical consequence layer.
- Current research frontier is **E16 — capability-first embodiment**.
- Current public experiment is **E16.2a — Horizontal Physical Capability Yard**.
- E16.2a preserves accepted Donor traversal and adds one solver-owned physical organ that can physically reach, earn a grab only through actual contact, reel while constrained and create geometry-checked carrier transport.
- E16.1c contact-earned topology, E16.2a interaction policy and integrated yard are machine-qualified on the clean publication composition and on exact merged `main`.
- Exact-main Pages deployment succeeded and the deployed artifact contains the E16 browser bundle and route mapping.
- Current action is **Owner spontaneous free play on `?mode=e16`**.

Current public/Owner boundary:

[`E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md`](E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md)

Detailed E16 design/evidence boundary:

[`E16_CAPABILITY_YARD_2026-09-04.md`](E16_CAPABILITY_YARD_2026-09-04.md)

Current hard stop:

> **STOP FOR OWNER E16.2a FREE PLAY.**

Do not automatically implement E16.2b, add vertical aiming/climbing, a second organ, anatomy, or tune the interaction before Owner judgement gives a reason.

## 1. Project identity

This repository is an **Embodied Player Laboratory**, not a realistic-ragdoll project.

Central question:

> **How can a player possess a physically meaningful body while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?**

Central tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Method:

> **Controlled enough to explain, open enough to play.**

Mechanical/controller complexity must pay rent in agency, embodiment, causal readability, gameplay value or explanatory power. Physical purity is not a goal by itself.

Current design lesson from E14 → E15 → E16:

> **Preserve agency already known to be fun. Embodiment should add useful physical competencies and consequences rather than amputating the player's action repertoire.**

## 2. Authority hierarchy

1. **Owner hands-on judgement** — feel, causal readability, artificiality, fun and whether a behavior/mechanism is worth pursuing.
2. **Live `main` + exact SHA + source + CI/Pages** — implementation/publication truth.
3. Current stage handoff/orientation — research intent where repo docs lag live work.
4. Stage ledgers/docs — provenance and prior qualification.
5. Historical branches/conversations/recommendations — context only.

Machine PASS does not prove feel. Owner fun does not prove a causal claim. Negative, confounded, protocol-miss and tooling-defect evidence must retain their correct class.

## 3. Accepted player / inherited boundaries

Normal public/default runtime remains **A‴ / Donor v1**.

Relevant reference values:

- player interaction mass `80 kg`;
- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground braking `36 m/s²`;
- gravity `20 m/s²`;
- fixed outer `dt=1/60 s`;
- canonical `4` Box3D substeps.

Do not silently weaken accepted `31/36` to make embodiment easier.

E12 research entitlement remains:

`q = clamp( μ × J_n~ / 25.3333, 0, 1 )`

within its qualified scope. It is not a production policy or universal support-quality metric.

E13 durable rule remains:

> **Do not create an external reaction path at authority time and then call it causally neutral plumbing.**

If the wider world carries reaction, that coupling must already arise naturally from the situation and retain its physical/history consequences.

Historical `lead8` remains a foresight oracle only, not gameplay timing.

## 4. Closed E14 frontier

E14 developed a finite one-leg/contextual organism and established useful causal results about support, reaction placement and control quality. Owner later judged that the accepted capsule/Donor controller still offered more fun and more possibilities than the best E14 organism.

That closes the one-leg tuning frontier for now without invalidating its evidence. The dominant limitation was the restricted strategy/action repertoire of the representation itself.

## 5. E15 durable result

E15 preserved full Donor traversal while adding a finite Box3D upper-body consequence layer. After representation corrections it established a bounded causal path:

> **world → solver-owned body → measured physical response → player consequence**

without replacing Donor locomotion policy.

E15.1 corrected sustained-contact semantics so a persistent constraint reaction is not accumulated every frame as fresh knockback.

Durable lesson:

> **Separating responsive intent from physical consequence avoids the E2 failure where one active velocity servo immediately erased knockback.**

Owner free play then exposed the next limitation: a passive torso mostly reacted after Donor had already done the interesting thing. This motivated E16 capability-first embodiment.

Detailed E15 evidence:

[`E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md`](E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md)

## 6. E16 hypothesis — capability-first embodiment

E16 does not start by adding more anatomy. It asks whether a solver-owned physical part can own a useful deliberate capability while accepted Donor traversal remains intact.

Current representation:

- Donor analytical carrier remains traversal authority;
- E15 physical core remains a finite solver-owned body layer;
- one additional solver-owned spherical organ is driven relative to that core by internal `+J/-J` actuation;
- internal organ/core actuation is momentum-neutral across the bounded physical subsystem;
- genuine wider-world action is measured from aggregate subsystem response rather than one body's velocity alone.

This is not a humanoid arm, IK system, hand, tether or final anatomy claim.

## 7. E16 authority split

E16 currently separates three authority channels:

1. **Donor intent/traversal authority** — responsive accepted locomotion.
2. **External impulse consequence** — genuine world impulses can persist separately from intent.
3. **Constraint transport authority lease** — while an explicit player-created grab topology exists, measured solver-imposed subsystem displacement may contribute to carrier displacement for that tick through the normal analytical capsule mover.

Constraint transport is not direct teleportation or a bespoke `pullPlayer()` rule. It enters the existing mover as an instantaneous transport contribution; the normal mover/plane/cast solve remains final geometry authority.

## 8. E16.1c — contact-earned topology

Owner-facing grab is earned from the organ's real current Box3D contact manifold.

Each current-tick candidate carries:

- exact opposite shape/body identity;
- separate organ-side and world-side contact anchors;
- separation, normal impulse and manifold normal;
- a contact epoch.

A candidate becomes invalid as soon as physics advances. Physics does not choose among simultaneous candidates; interaction policy is separate.

Current bounded assumption: E16.2a grab-eligible yard bodies use one centred primitive per body. Compound/off-centre bodies require deliberate anchor reconstruction before generalization.

## 9. E16.2a — Horizontal Physical Capability Yard

E16.2a deliberately stays horizontal. Full 3D aim, climbing, a second organ and anatomical interpretation are deferred so Owner judgement can isolate the value of the capability itself.

Desktop controls:

- `WASD` — Donor movement;
- `Space` — jump;
- `Shift` — sprint;
- `RMB drag` — camera;
- `LMB hold` — engage physical capability / reach / earn grab from actual contact;
- `LMB + wheel` — retract / extend desired reach;
- release `LMB` — release grab;
- `R` — reset;
- `H` — telemetry.

When capability input is inactive, rotating the camera does not sweep the organ through the world. Camera direction becomes capability direction only while engaged.

If several current contacts exist, interaction policy selects the manifold midpoint nearest the active task-space target. Solver enumeration order is therefore not hidden gameplay semantics.

Public route:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=e16`

Aliases: `?mode=organ`, `?mode=toybox`.

## 10. Capability yard philosophy

The yard is an affordance ecology, not a challenge course. It has no success condition and no scripted solution. Nearby primitives provide several mass, anchoring and leverage situations so Owner free play can reveal spontaneous strategies.

Expected verbs are observations, not requirements. Push, pull, drag, brace, anchor, release, sling-like behavior or something unexpected are all valid evidence if they emerge naturally.

## 11. Exact publication evidence

Research provenance branch:

`experiment/e16-active-contact-organ`

Qualified research head at extraction:

`cf93b5c2da2cbf181887ee1c4a8cd4250a1926e0`

Clean publication head:

`bb5405895bd43af68c1741d9b745ec4e0490b2db`

Clean publication workflow:

`33873317419` / run #634 — **SUCCESS**

PR #35 merged to first E16.2a main SHA:

`7b1c4a7c264d85cb4341853d13635805ec2d1ebc`

Exact-main workflow:

`33873543165` / run #635 — **SUCCESS**

Exact-main jobs:

- verify `101024971864` — SUCCESS;
- deploy `101025201469` — SUCCESS.

Artifacts:

- E16 evidence `9936910663`, digest `sha256:77f5e251da9222d26db80bc662c39a6e6ffa4c4cc3ec5c0e31627e1cc754fe92`;
- Pages `9936913157`, digest `sha256:850fad1fdac302a7c714ced6753ac5d4334e4fa4600b90322ad8e9decbf9e15d`.

Downloaded Pages artifact contains `assets/e16-toybox-browser-B2T3GhBy.js`; its bootstrap bundle maps `e16|organ|toybox` to that bundle.

Exact-main representative machine facts:

- neutral grab candidates `0`;
- stale candidate rejected;
- contact-manifold grab qualified;
- static retract carrier pull `0.14611056898716657 m` with `0` persistent leak frames;
- release → recontact → regrab qualified;
- dynamic-object distance closure `0.2807130194146339 m`;
- integrated yard horizontal pull `0.37321099868430263 m`;
- integrated persistent leak frames `0`;
- release succeeds;
- build and Pages deploy succeed.

Detailed exact publication record:

[`E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md`](E16_2A_PUBLIC_OWNER_BOUNDARY_2026-09-04.md)

Machine evidence establishes declared mechanics and publication identity only. It does not establish gameplay value.

## 12. Current Owner protocol

Play `?mode=e16` **spontaneously**.

Do not prescribe a challenge route, timing pattern, expected trick or success metric before the first session. The most valuable evidence is what Owner naturally tries to do.

Primary questions are qualitative:

- does the capability actually add possibilities rather than merely another thing to manage?;
- does earning a grab through contact read physically, or feel arbitrary?;
- does reel/constraint transport feel like useful physical leverage or disguised movement assistance?;
- are the red Donor carrier, gold physical core and green organ legible enough to understand cause/effect?;
- which behaviors are voluntarily repeated because they are interesting or fun?;
- what immediately damages Donor-level agency or flow?;
- does any spontaneous behavior suggest the next useful capability more strongly than the planned 3D-aim/climb idea?

Recording is useful if interesting behavior emerges, but it is not required to begin play.

## 13. Hard stop

> **STOP FOR OWNER E16.2a FREE PLAY.**

Do not automatically proceed to E16.2b. Treat 3D aiming, climbing, a second organ, more anatomy, stronger/weaker reel authority and visual redesign as candidates only. The next stage should be chosen from Owner evidence plus live machine evidence, not inherited from the previous plan.
