# Project state — Embodied Player Laboratory

Grounded: **2026-09-04, E16.2a machine-qualified publication candidate; public deployment not yet claimed**

This is the compact canonical orientation layer. Before any future write, re-fetch live `main` and exact SHA. Recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 is closed by Owner judgement as exhausted for now; its causal evidence remains valid provenance.
- E15 established that accepted Donor traversal can coexist with a separate solver-owned physical consequence layer. Its public `?mode=e15` route remains historical/current comparison evidence, not the active frontier.
- Current research frontier is **E16 — capability-first embodiment**.
- Current candidate is **E16.2a — Horizontal Physical Capability Yard**.
- E16.2a preserves Donor movement and adds one solver-owned physical organ that can physically reach, earn a grab through actual contact, reel while constrained and create geometry-checked carrier transport.
- E16.1c contact-earned topology and E16.2a integrated mechanics are machine-qualified on the research branch.
- E16.2a is **not yet claimed as publicly deployed** in this snapshot. Publication must still pass clean-branch CI, merge to `main`, then exact-main CI/Pages verification.

Current E16 publication/evidence boundary:

[`E16_CAPABILITY_YARD_2026-09-04.md`](E16_CAPABILITY_YARD_2026-09-04.md)

Current hard stop:

> **Complete clean E16.2a publication verification. Do not begin E16.2b or ask Owner to judge an unverified build.**

After exact-main deployment is verified, the hard stop becomes **STOP FOR OWNER E16.2a FREE PLAY**.

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

1. **Owner hands-on judgement** — feel, causal readability, artificiality, fun and whether a mechanism is worth pursuing.
2. **Live `main` + exact SHA + source + CI/Pages** — implementation/publication truth.
3. Current stage handoff/orientation — current research intent where repo docs lag live work.
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

That judgement closes the one-leg tuning frontier for now. It does not invalidate E14 evidence.

Durable consequence:

- more support-mass/friction/braking/torque sweeps are not the high-value next question;
- the representation's restricted strategy/action repertoire was the dominant limitation.

## 5. E15 durable result

E15 preserved full Donor traversal while adding a finite Box3D upper-body consequence layer. After representation corrections it established a bounded causal path:

> **world → solver-owned body → measured physical response → player consequence**

without replacing Donor locomotion policy.

E15.1 additionally corrected sustained-contact semantics so a persistent constraint reaction is not accumulated every frame as fresh knockback.

Important lesson:

> **Separating responsive intent from physical consequence avoids the E2 failure where one active velocity servo immediately erased knockback.**

E15 free play then exposed a different limitation: a passive torso mostly reacts after Donor has already done the interesting thing. This motivated E16.

Detailed E15 evidence:

[`E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md`](E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md)

Public E15 boundary:

[`E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md`](E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md)

## 6. E16 hypothesis — capability-first embodiment

E16 does not start by adding more anatomy. It asks whether a solver-owned physical part can own a useful deliberate capability while Donor traversal remains intact.

Current representation:

- accepted Donor analytical carrier remains the traversal authority;
- E15 physical core remains a finite solver-owned body layer;
- one additional solver-owned spherical organ is driven relative to that core by internal `+J/-J` actuation;
- internal organ/core actuation is momentum-neutral across the bounded physical subsystem;
- genuine wider-world action is measured from aggregate subsystem response rather than from one body's velocity alone.

This is not a humanoid arm, IK system, hand, tether or final anatomy claim.

## 7. E16 authority split

E16 currently separates three authority channels:

1. **Donor intent/traversal authority** — responsive accepted locomotion.
2. **External impulse consequence** — genuine world impulses can persist separately from intent.
3. **Constraint transport authority lease** — while an explicit player-created grab topology exists, measured solver-imposed subsystem displacement may contribute to carrier displacement for that tick through the normal analytical capsule mover.

Constraint transport is not direct teleportation or a bespoke `pullPlayer()` rule. It enters the existing mover as an instantaneous transport contribution; `b3SolvePlanes` / mover casts remain the final geometry authority.

## 8. E16.1c — contact-earned topology

Laboratory E16.1 could create a joint with a known body supplied directly by the test. That was sufficient for causality but insufficient for gameplay.

E16.1c recovers current Box3D contact manifolds from the physical organ and exposes immutable current-tick grab candidates containing:

- exact opposite shape/body identity;
- separate organ-side and world-side contact anchors;
- contact separation, normal impulse and manifold normal;
- a contact epoch.

A candidate becomes invalid as soon as physics advances. The physics kernel does not choose between simultaneous candidates; gameplay policy is a separate layer.

Current bounded assumption: E16.2a grab-eligible toybox bodies use one centred primitive per body. Compound/off-centre bodies require deliberate anchor reconstruction before generalization.

## 9. E16.2a — Horizontal Physical Capability Yard

E16.2a deliberately stays horizontal. Full 3D aim, climbing, a second organ and anatomical interpretation remain deferred variables.

Desktop interaction candidate:

- `WASD` — Donor movement;
- `Space` — jump;
- `Shift` — sprint;
- `RMB drag` — camera;
- `LMB hold` — engage physical capability; the organ reaches physically and may earn a grab only from actual contact;
- `LMB + wheel` — retract / extend desired reach;
- release `LMB` — destroy the grab constraint;
- `R` — reset;
- `H` — telemetry.

When capability input is inactive, rotating the camera does not sweep the organ through the world. Camera direction becomes capability direction only while engaged.

If several current contacts exist, interaction policy chooses the manifold midpoint nearest the current task-space target. Solver enumeration order is therefore not hidden gameplay semantics.

Candidate route after publication: `?mode=e16` with aliases `organ` and `toybox`.

## 10. Capability yard philosophy

The yard is an affordance ecology, not a challenge course. It contains no success condition and no scripted solution. Nearby primitives provide several mass, anchoring and leverage situations so the first Owner session can reveal spontaneous strategies.

Do not interpret expected verbs as requirements. Push, pull, drag, brace, anchor, release, sling-like behavior or something unexpected are all observations, not goals that the runtime must manufacture.

## 11. Machine qualification boundary

Research provenance branch:

`experiment/e16-active-contact-organ`

Qualified research head at publication extraction:

`cf93b5c2da2cbf181887ee1c4a8cd4250a1926e0`

Final publication-representative qualifiers:

- `scripts/e16-contact-qualified-grab-crucible.mjs`;
- `scripts/e16-capability-interaction-smoke.mjs`;
- `scripts/e16-capability-yard-smoke.mjs`.

Established machine facts include:

- neutral state exposes zero grab candidates;
- stale candidate rejection works;
- exact contact-manifold grab works;
- static retract creates carrier movement with zero persistent-leak frames;
- release → recontact → regrab works;
- dynamic-object earned grab closes player/object distance;
- target mapping is horizontal and reach-bounded;
- candidate selection is independent of solver enumeration order;
- integrated Donor move → reach → actual contact → earned grab → reel → geometry-checked transport → release passes;
- bounded integrated reel on the research candidate produced about `0.373 m` horizontal carrier movement with zero persistent feedback leakage;
- build passed on the full research branch.

These establish only mechanical/causal coherence. They do not establish usability, discoverability or fun.

## 12. Publication discipline

The full research branch contains confounded diagnostics, failed hypotheses and intermediate apparatus that should remain provenance rather than be promoted wholesale into `main`.

Publication therefore uses a clean branch based directly on the current canonical `main` and copies only:

- the required E16 runtime dependency chain;
- the small backwards-compatible `FollowCamera` extension;
- E16 route/browser/toybox;
- the three final representative qualifiers;
- narrow CI hooks for those qualifiers;
- this canonical state and the E16 capability-yard boundary document.

Do not infer that an E16 research-branch PASS means the clean publication composition is also PASS. It must be requalified independently.

## 13. Next exact action

1. Build the clean publication tree from exact verified final blobs.
2. Run publication-branch CI including legacy smoke, E16.1c, E16.2a integrated qualification and build.
3. Audit `main…publication` diff for accidental research apparatus or Donor/default changes.
4. Merge only if the clean candidate is green and the diff matches publication scope.
5. Verify exact merged `main` workflow and Pages deployment identity.
6. Record that exact public evidence in a docs-only closure checkpoint.
7. **Then STOP FOR OWNER E16.2a FREE PLAY.**

Do not automatically proceed to E16.2b.
