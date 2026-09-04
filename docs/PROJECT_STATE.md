# Project state — Embodied Player Laboratory

Grounded: **2026-09-04, after E17 public Owner free play and E18-R0 research synthesis**

This is the compact canonical orientation layer. Before any future write, re-fetch live `main` and exact SHA. Recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 one-leg/contextual tuning is closed for now by Owner judgement; its causal evidence remains valid provenance.
- E15 established a bounded path from solver-owned body response to player consequence without replacing Donor traversal.
- E16 established capability-first embodiment, contact-earned grab topology and constraint-transport authority, but Owner judged its end-effector-first interaction far too awkward.
- Current public experiment is **E17 — intent-first physical manipulator**.
- Current research frontier is **E18 — manipulation architecture / orientation / compliance / closed-loop authority**.

Current exact implementation at this grounding:

- `main`: `c51bee303e85762ca5583fd63db02918205a9da5`
- PR #39: `Publish E17 intent-first physical manipulator`
- exact-main workflow `33883029369` / run #668 — **SUCCESS**
- E16 regressions, E17 qualifier, build and Pages deploy — **SUCCESS**
- public E17 route: `?mode=e17` / `?mode=intent`

Detailed current research map:

[`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md)

## 1. Project identity

This repository is an **Embodied Player Laboratory**, not a realistic-ragdoll project.

Central question:

> **How can a player possess a physically meaningful body while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?**

Central tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body/system attempts. Physics answers.**

Method:

> **Controlled enough to explain, open enough to play.**

Mechanical/controller complexity must pay rent in agency, embodiment, causal readability, gameplay value or explanatory power. Physical purity is not a goal by itself.

## 2. Authority / evidence hierarchy

1. **Owner hands-on judgement** — feel, artificiality, readability, fun, strategy generation and whether a mechanism is worth pursuing.
2. **Live `main` + exact SHA + source + CI/Pages** — implementation/publication truth.
3. Current research/frontier docs — experiment intent and evidence boundary.
4. Stage ledgers/docs — provenance and prior qualification.
5. Historical branches/conversations/recommendations — context only.

Machine PASS proves declared mechanics, not fun. Owner fun does not prove a causal claim.

## 3. Accepted Donor boundaries

Normal/default player remains **A‴ / Donor v1**.

Reference values:

- interaction mass `80 kg`;
- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground braking `36 m/s²`;
- gravity `20 m/s²`;
- outer `dt=1/60 s`;
- `4` Box3D substeps.

Do not silently weaken `31/36` to make embodiment easier.

E12 research entitlement remains, within its qualified scope:

`q = clamp(mu * Jn~ / 25.3333, 0, 1)`

E13 durable rule remains:

> **Do not create an external reaction path at authority time and then call it causally neutral plumbing.**

Historical `lead8` remains a foresight oracle only, not gameplay timing.

## 4. Durable E14 → E16 lesson

E14 showed that a more physical representation can still lose to the plain Donor when it removes too much agency or strategy space.

E15 preserved Donor agency but a passive physical torso mostly reacted after Donor had already done the interesting work.

E16 therefore gave one solver-owned physical part a deliberate capability. This established useful mechanics:

- aggregate subsystem momentum accounting;
- internal momentum-neutral actuation;
- contact-qualified grab topology;
- explicit grab constraint;
- constraint transport authority through the normal analytical mover.

But Owner free play showed the interaction abstraction was still wrong: piloting the end effector dominated attention and remained extremely awkward even after direct/radial task-space mapping improvements.

Durable lesson:

> **Embodiment should add useful verbs and consequences; the player should not need to micromanage low-level physics merely to express intent.**

## 5. E17 — current public experiment

E17 is an **architecture reset**, not E16 tuning.

Interaction contract:

> **click nearby dynamic object / exact surface point → express 3D target intent → finite physical actuator attempts it**

instead of:

> **pilot organ → collide → earn grab → manipulate**.

The selected object is not teleported. E17 applies finite force at the selected world point and equal/opposite reaction to the finite physical core. Mass, collision, off-centre leverage and release momentum remain physical consequences.

Current E17 is still crude and unstable. It is not accepted as a finished manipulation system.

## 6. Owner E17 judgement

Owner free play gave the strongest positive gameplay evidence of the E14–E17 line so far.

Positive:

- attention shifted from operating the interface to experimenting with the world;
- spontaneous behavior included lift, carry, throw, drag, pile/stack attempts, leverage, object↔object interaction, object↔player interaction, sphere play and locomotion+manipulation;
- one capability began generating a family of verbs and persistent scene history;
- Owner explicitly judged the direction substantially closer to something sensible.

Negative:

- current manipulator is a **"latający niestabilny wibrator"**;
- strong oscillation/overshoot;
- weak precise placement;
- uncontrolled orientation;
- off-centre grabs can generate extreme rotation;
- unclear boundary between skill and accidental chaos;
- representation remains prototype-grade.

Interpretation:

> **E17 does not prove the manipulator is good. It proves intent-first manipulation is promising enough to produce spontaneous play despite a bad executor.**

## 7. Self-lift / closed-loop authority exploit

Owner discovered that standing on the dynamic sphere while manipulating it can lift sphere + player together and enable flight.

Do **not** remove this during exploratory work.

Current classification:

- **generative exploit** — funny, high-fun, creates a new toy/verb;
- **authority exploit / causal debt** — closed player↔object subsystem gains net translation through hybrid Donor/manipulation authority.

Use it as a stress specimen for future authority coherence and balance. Do not call it physically valid merely because it is fun.

## 8. E18 research frontier

Do not ask only "how do we add rotation?".

Current question:

> **What interaction grammar lets a player express useful 6-DoF object intent while finite physics, mass, leverage, contacts, body reaction and failure remain meaningful parts of execution?**

E18 separates at least:

- selection/grip topology;
- translation intent;
- orientation intent;
- compliance / force and torque authority;
- reach and strength;
- release momentum;
- reaction closure;
- object semantics / handles;
- self-interaction / support loops;
- eventual multi-agent ownership.

Research/donor synthesis and candidate architectures are in:

[`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md)

## 9. Current prototype portfolio

Preserve E17 as **P1 — one-point chaos baseline**.

Current next candidates:

- **P2 — finite 6-DoF pose coupling:** desired position + orientation executed through bounded force/torque;
- **P3 — two-point / virtual two-hand grip:** orientation emerges from two finite target points rather than direct quaternion ownership;
- **P4 — separated precision clutch:** keep rough E17 one-point physics, add explicit temporary rotate/align control for precision.

Current-best first implementation candidate after E18-R0:

> **P3 — bounded two-point virtual-grip crucible**

because it tests intentional orientation while preserving leverage and does not require committing to humanoid anatomy.

P2 remains the control/engineering reference; P4 remains the usability/reference alternative.

## 10. Exploit policy during research

Do not immediately patch unexpected behavior.

Classify first:

- **generative exploit** — creates interesting skill/strategy/play;
- **authority exploit** — violates causal authority/accounting;
- **degenerate exploit** — bypasses play without generating a useful new problem;
- **hybrid** — both generative and causally invalid.

Preserve representative specimens until the question they expose is understood.

## 11. Cross-project relevance

Owner sees long-term convergence with Multi_World, Nextgen JV and other projects. Treat that as strategic context, **not current implementation scope**.

Potentially exportable primitives include:

- intent representation;
- grip/constraint topology;
- finite force/torque authority;
- support/contact graphs;
- object-level manipulation semantics;
- closed-loop exploit tests;
- future multiplayer-compatible high-level intent;
- generic attachment/handle concepts.

Do not integrate projects merely because the possibilities are exciting.

## 12. Current action / stop boundary

E18-R0 is a research stage. **Do not tune E17 through many spring/damping iterations and do not patch self-lift.**

Next implementation, once E18-R0 is reviewed/accepted, should be the smallest causal P3 experiment answering:

> **Can two finite target points materially improve intentional orientation/placement over E17 while preserving mass, leverage, collision response and emergent physical play?**

Do not build full arms, humanoid anatomy or a production manipulation UI before this question is separated.
