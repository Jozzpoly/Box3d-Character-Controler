# E19 review checkpoint — after first post-Owner reframe probes

Date: 2026-09-05  
Branch: `research/e19-hand-grip-reframe`

This checkpoint is a critical review of the work started after the Owner rejected P3.1 as the main gameplay direction and asked for a more fundamental interaction model, including grabbing the static world and climbing.

It supersedes optimistic interpretations of the first E19 probes. It does **not** promote E19 to `main` or claim that embodied hands have been built.

## 1. Owner-driven reframe remains justified

The durable post-Owner problem is not “make P3.1 precision better”. The stronger question is:

> Can one simple left/right grip ontology let the player grab either the world or dynamic matter, while one finite reciprocal law lets physics decide whether the player, the target, or both move?

This remains aligned with the laboratory’s central tension `PLAYER INTENT ↔ PHYSICAL CONSEQUENCE` and with the E16/E17 lesson that useful physical capability should not require low-level organ piloting.

External donor checks reinforce the interaction grammar, not a literal implementation copy:

- *Human: Fall Flat* maps left/right controls to corresponding reaching arms; a hand that hits something can stick, and the same grammar supports moving objects, ledges and levers.
- The HFF developer later described rewriting grab behavior to be more deterministic and better aligned with player intention after contact/acquisition problems.
- *Grow Home* maps hands independently and lets them grab broadly across the environment; climbing and object interaction emerge from those hand relationships plus physics/procedural motion.

The project should borrow the **low-dimensional grip ontology + broad affordance ecology**, not inherit either game’s ragdoll, animation, strength, or exact controls.

## 2. What the first E19 work actually established

### E19.0a — unified relative-grip algebra

Established only a mathematical substrate for one or two semantic grip relations against one accepted `80 kg` player virtual mass.

Observed:

- one static grip: rank `3`;
- one dynamic grip: rank `3`;
- two grips on the same dynamic rigid body: rank `5` and numerically equivalent to the qualified P3 coupled body-side response;
- two grips on different dynamic bodies: rank `6`, coupled through the shared player mass;
- mixed static + dynamic: rank `6`;
- two static grips: rank `3`; incompatible requests remain residual rather than inventing motion;
- explicit per-grip and shared impulse caps survive the coupled solve.

This is useful reuse of P3 mathematics, but it does **not** prove hands, climbing or good control.

### E19.0b — Box3D target-side response

Box3D dynamic-body point response matched the operator prediction to roughly `1e-8 m/s` scale across one dynamic, same-body dual, different-body dual and mixed cases.

This independently supports signs/world-inertia/coupling on the target side.

Boundary remains strict: the player side was still a virtual point mass; the static side was an analytical infinite anchor; there was no multi-frame Donor controller or acquisition.

### E19.0c — stripped gravity capacity

A synthetic virtual-player specimen established expected finite load behavior:

- `900 N` one hand cannot support `80 kg * 20 m/s² = 1600 N`;
- `1600 N` is the exact static threshold in the stripped model;
- two `900 N` hands can share the `1600 N` load at roughly `800 N` each;
- release returns immediately to free fall.

This is force-budget arithmetic plus controller behavior, **not a final strength recommendation**.

### E19.0d — direct Donor static-grip bridge: partial success plus falsification

A more important test routed equal/opposite grip reaction directly into accepted Donor velocity before its normal capsule mover instead of using E15’s old physical-core bridge.

It demonstrated:

- ungripped Donor retains `31/36` constants;
- one `900 N` static grip fails to hang;
- one `1600 N` or two `900 N` grips can hold the real Donor controller from rest;
- grip reaction does not need to become persistent `externalVelocity`;
- the normal mover prevents a strong grip command from passing through a static ceiling.

But the first classification was too optimistic. The ceiling specimen exposed **`+10.74 m/s` of latent upward velocity while position was clamped**. Accepted Donor v1 intentionally cleans static/kinematic constraint velocity only in the horizontal domain; E19 introduced a new vertical authority path that the old policy was never designed to settle.

Therefore E19.0d is not “vertical integration solved”. It is:

> **static-grip support works at the position/force level, but raw direct injection reveals a vertical blocked-velocity debt.**

### E19.0e — grip-scoped vertical constraint policy

The next probe did not globally rewrite Donor. It first refactored the existing constraint-velocity call behind an overridable hook, with default behavior preserved, then added a branch-local E19 Donor variant whose extra vertical static/kinematic cleanup is active only while a grip relation is active.

Evidence:

- an ungripped 173-frame Donor route matched accepted `ConstraintVelocityCharacter` exactly: max position error `0`, max velocity error `0`;
- the ceiling remained geometry-limited at about `1.605 m` center for an expected `1.600 m` boundary including mover slop;
- the grip-scoped vertical policy engaged on `108` frames;
- blocked upward velocity after policy was `0`;
- release immediately produced normal gravity (`-0.3333 m/s` after one frame), not an upward stored-energy burst;
- two-hand static hanging still shared load at roughly `800 N` per hand;
- persistent `externalVelocity` remained zero.

This is a meaningful improvement, but it is still narrow: predominantly vertical static/kinematic normals only. Slopes, arbitrary 3D normals and moving kinematic anchors remain open.

## 3. Corrections to the earlier framing

### We have not built “two physical hands”

Current E19 mechanics use:

> semantic grip relation(s) ↔ one translational `80 kg` Donor virtual mass ↔ target rigid body/static anchor

There are no hand rigid bodies, arm masses, shoulders, limb inertia or player rotational reaction yet.

Calling the current substrate “embodied hands” would outrun evidence. The accurate name is currently:

> **dual semantic-grip relative-force substrate**

Physical hand endpoints remain a future representation hypothesis, not a requirement already earned.

### Do not rediscover E16

E16 already established valuable donor facts:

- current-contact manifold acquisition can create exact, stale-safe grab topology;
- static contact-earned grabs can pull the carrier horizontally;
- dynamic contact-earned grabs can close player/object distance.

E19 should reuse those lessons when acquisition becomes the frontier. A broad new “does static versus dynamic grabbing work at all?” series would waste attention.

### E15 is not automatically the correct player-side bridge

The first E19 plan assumed static-world grip reaction should flow through the old E15 embodiment core. That is now rejected as an automatic assumption.

E15 was designed around a hybrid body-follow/consequence experiment and its vertical player motion is not a qualified finite grip-reaction path. E19.0d/0e show a cleaner candidate: apply the explicit grip reaction directly to the accepted Donor virtual mass and let its normal mover remain geometry authority.

E15 remains useful provenance and may still donate concepts, but it is not mandatory mediation.

### The current coupled saturation is transparent, not optimal

The dual-grip kernel solves the unconstrained damped least-squares task, then applies per-grip/shared magnitude scaling and recomputes residual.

That is deliberately legible and bounded. It is **not** an optimal constrained solver under asymmetric saturation. Do not optimize this pre-emptively; reopen only if later mixed/dynamic behavior shows material allocation artifacts.

### Player angular response remains unresolved

Two static grips currently act through one translational player mass, so they cannot create player-body torque. This may be desirable while preserving accepted upright Donor agency, or it may erase important embodied consequence.

Do not choose a full rigid/ragdoll player body from aesthetics. Let later gameplay evidence decide whether player-side angular state must enter the contract.

## 4. Revised evidence frontier

The highest-value unknown is no longer static hanging by itself. It is whether the **same reciprocal law remains coherent over time when one or both opposite sides are real dynamic Box3D bodies while the player remains the accepted Donor mover**.

That is the first place where the intended principle can genuinely be tested:

> same grip law; static world makes the player move, light object makes the object move more, heavy object changes the split, mixed two-grip topology can brace player/object/world against each other.

## 5. Revised next plan

### E19.0f — multi-frame Donor ↔ dynamic/mixed reciprocity crucible

Build one bounded headless integration using the already-qualified actuator and E19 grip-aware Donor bridge.

Required specimens:

1. **one dynamic target** — same relative grip law, finite player reaction + exact Box3D point impulse;
2. **light vs heavy target** — no branch deciding “move player” or “move object”; mass/inertia alone should change motion split and saturation;
3. **two grips on the same dynamic rigid body** — preserve the P3-derived coupled orientation leverage without object pose ownership;
4. **mixed static + dynamic** — one grip braces the player to the world while the other acts on an object;
5. **blocked dynamic target** — world contact must be able to defeat requested relative motion without teleportation or runaway Donor velocity;
6. **release** — no latent grip impulse/persistent external velocity.

Natural stop: if these cases remain bounded and causally readable, stop headless mechanics and move to acquisition. If they reveal a representation/authority contradiction, fix that before browser UX.

### E19.1 — intent-assisted contact acquisition

Reuse E16 manifold/contact provenance instead of inventing another remote object picker.

Research question:

> Can the player express “left/right hand wants that nearby surface” while the system earns the exact latch through reachable physical/contact semantics, without forcing the Owner to pilot the endpoint?

The HFF lesson matters here: raw contact lottery is not sacred; acquisition can be deliberately made more deterministic when that better represents player intent.

### E19.2 — minimal two-grip browser free play

Only after mechanics/acquisition earn it:

- left/right semantic grip controls;
- static and dynamic surfaces use the same interaction grammar;
- no permanent Ctrl precision subsystem;
- enough world geometry for hanging, ledges, pulling, bracing, moving/rotating objects and mixed interactions;
- minimal readable grip/reach/effort feedback;
- no visual-polish detour.

### E19.3 — Owner gate

The useful question is not whether a benchmark scalar improved:

> **Do two simple grips make the player feel more physically present in the world while creating more things worth trying, without making the hands themselves the chore?**

## 6. Explicit debts held outside the current move

- final hand/arm/body visual representation, including the current cap/silhouette debt;
- final strength values;
- physical hand rigid bodies / arm inertia;
- full player angular reaction;
- slopes and arbitrary 3D static/kinematic constraint-velocity policy;
- exact acquisition assistance/reach envelope;
- multiplayer/network implications;
- production control mapping.

## 7. Current decision

**Continue E19, but with narrower claims and a corrected execution order.**

The direction is justified strongly enough to keep researching because it directly answers the latest Owner need and has already absorbed useful E16/P3 evidence. What is justified today is the semantic reciprocal-grip substrate, not a claim that the project has found its final embodied-hand architecture.

Next execution boundary: **E19.0f dynamic/mixed multi-frame reciprocity**.
