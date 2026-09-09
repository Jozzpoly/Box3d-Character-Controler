# Project state — Embodied Player Laboratory

Grounded: **2026-09-09 — post-E19 stage closure / pre-repository-hygiene checkpoint**

This is the compact canonical orientation layer. Before any future write, re-fetch live `main`, exact SHA and relevant CI/Pages. Recorded SHAs below are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- The repository remains an **Embodied Player Laboratory**, not a realistic-ragdoll project.
- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking. Do not silently weaken it to make embodiment easier.
- **E17** remains the strongest earlier Owner-positive manipulation evidence: high-level object intent plus finite physical execution generated a family of verbs despite a crude executor.
- **E17-depth** is mechanically legitimate but did not earn a reliably distinguishable Owner gameplay advantage.
- **E18/P3** supplied important persistent-3D-intent and coupled two-point mechanical evidence, but P3.1's remote object-centric precision-clutch interaction was superseded after negative Owner judgement.
- **E19** reframed manipulation around independent semantic left/right grips that can address both static world and dynamic matter.
- E19 reciprocal mechanics and bounded swept-reach acquisition are **technically qualified and closed as a research stage**.
- E19's public browser probe was successfully promoted to `main`, but **no confirmed post-publication Owner gameplay verdict is present in the grounded Character Controller record**. Therefore E19 gameplay/UX is not accepted by inference.
- There is currently **no endorsed next manipulation architecture and no automatic E20**. The next research stage should start from a newly framed Owner/problem question.
- Repository branch hygiene is intentionally **pending**. Do not delete historical branches ad hoc; a dedicated cleanup workflow will be applied separately.

Grounding provenance before this maintenance closure:

- live `main`: `425a55451ba223a83ef000ae69d0ed7dd5bb0a95`;
- E19 research head: `73ef9105c2910b3450e9c64c5c636e89d942a102`;
- E19 diagnostics run: `33970842840` — success;
- promotion: PR `#48`;
- exact-main verify/deploy run: `33970942169` — success.

Detailed closure:

[`E19_STAGE_CLOSURE_2026-09-09.md`](E19_STAGE_CLOSURE_2026-09-09.md)

## 1. Project identity

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
3. Current project/frontier/closure docs — research intent, state and evidence boundary.
4. Stage ledgers/docs — provenance and prior qualification.
5. Historical branches/conversations/recommendations — context only.

Machine PASS proves declared mechanics, not fun. Owner fun does not prove a causal claim.

## 3. Accepted Donor boundary

Normal/default player remains **A‴ / Donor v1**.

Reference values:

- interaction mass `80 kg`;
- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground braking `36 m/s²`;
- gravity `20 m/s²`;
- outer `dt = 1/60 s`;
- `4` Box3D substeps.

Durable authority rule from E13:

> **Do not create an external reaction path at authority time and then call it causally neutral plumbing.**

The default Donor is a fair provisional comparison specimen, not a claim that controller-owned traversal is the final embodiment architecture.

## 4. Durable E14 → E17 lesson

E14 showed that a more physical representation can still be worse gameplay when it removes too much agency or strategy space.

E15 preserved Donor traversal but the physical torso mostly reacted after the interesting player action had already happened.

E16 gave a solver-owned subsystem deliberate capability, but Owner attention became dominated by operating the subsystem itself.

E17 reset the abstraction boundary:

> **high-level player/object intent first → finite physical execution second**

Owner free play then shifted toward deliberate world experimentation. One capability generated lift, carry, drag, swing, throw, leverage, pile/stack attempts, object↔object interaction and persistent scene history.

Durable lesson:

> **Embodiment should add useful verbs and consequences without forcing the player to micromanage low-level physics merely to express intent.**

## 5. E17 — preserved intent-first baseline

Interaction contract:

> **select nearby dynamic object / exact surface point → express target intent → finite physical actuator attempts it**

The object is not teleported. Finite impulse acts at the selected point and equal/opposite reaction acts on the finite player-side representation.

Owner-positive evidence:

- attention shifted toward experimenting with the world;
- one capability generated a family of verbs;
- mass, leverage, collision and release momentum remained perceptible.

Owner-negative evidence:

- strong oscillation/overshoot;
- poor precise placement;
- uncontrolled orientation;
- off-centre grabs can create extreme rotation;
- prototype-grade representation.

Interpretation:

> **E17 did not prove the manipulator was good. It proved the intent-first abstraction was promising enough to generate play despite a bad executor.**

Preserve it as a gameplay/evidence donor, not the current architecture.

## 6. E18 / P3 — mechanically useful, interaction direction superseded

E18 qualified a persistent 3D manipulation-intent boundary that does not freeze control onto a click-time drag plane and separates camera observation from explicit manipulation command.

P3.0 qualified a coupled two-point rigid-body task under one shared finite authority budget. It demonstrated deliberate axis/orientation leverage, finite saturation, mass/inertia cost, blocked-task failure, release momentum and a real free-twist DOF.

P3.1 then staged that capability as a precision/orientation clutch on top of rough one-point manipulation.

Owner judgement did **not** justify retaining P3.1 as the main gameplay direction. Its interaction remained too raw, indirect and restrictive; much of the world could not be grabbed and static scenery could not become a handhold. The special precision clutch also recreated control/micromanagement problems.

Therefore:

- preserve P3.0 as a mechanical donor;
- preserve E18 intent/proxy work as interaction-mechanics evidence;
- do not describe P3.1 as the current frontier.

## 7. E19 — closed technical checkpoint

E19 changed the primary interaction noun from remote object target to **semantic grip**:

> **left/right reach intent → bounded acquisition → exact latch → finite reciprocal relation → physics answers**

Key hypothesis:

> **Static versus dynamic changes the physical consequence, not basic grip eligibility.**

### Mechanics closure

E19 qualified one finite relative-grip law across static, dynamic, two-grip and mixed cases.

Important evidence includes:

- mass-derived player/object motion split without a light/heavy behavior branch;
- two grips on one dynamic body generating rotational leverage without object pose ownership;
- static grip bracing materially changing how a dynamic pull resolves;
- genuinely impossible mixed tasks remaining finite, saturated and geometrically residual;
- grip reaction entering accepted Donor velocity without becoming stored `externalVelocity`;
- a scoped vertical blocked-velocity correction that preserves ungripped Donor behavior.

### Acquisition closure

E19.1 separated physics provenance from intention ranking, then found that a physical acquisition probe can causally disturb dynamic targets before the player has actually gripped them.

The stronger bounded acquisition candidate became:

> **semantic left/right reach → finite swept hand volume → first physical obstruction → exact body/local anchor → finite reciprocal grip**

The swept query is non-impulsive; repeated acquisition queries do not alter dynamic target motion before latch. E19.1e bridged this representation into live overhead-static and dynamic-target grip behavior with no initial snap and no measured pre-grip contamination.

### Publication / Owner boundary

PR #48 promoted a minimal `?mode=e19` / `?mode=grip` browser probe with independent `Q/E` grips, cursor-directed swept reach and `LMB` retraction.

Publication and CI are complete. A confirmed post-publication Owner gameplay verdict is not available in the grounded Character Controller record.

Therefore:

> **E19 mechanics/acquisition = technical PASS. E19 gameplay/UX = not accepted by evidence. Stage closed and frozen rather than left as an implicit active frontier.**

See [`E19_STAGE_CLOSURE_2026-09-09.md`](E19_STAGE_CLOSURE_2026-09-09.md).

## 8. Held debts — not automatic tasks

Preserved open questions include:

- final reach mapping/radius/rates/strength;
- good two-grip UX and actual climbing/hanging feel;
- physical hand/arm masses and collision bodies;
- player angular response/body torque;
- arbitrary sloped and moving-kinematic grip constraints;
- constrained allocation under asymmetric multi-grip saturation;
- final character/hand visuals and the recorded cap/silhouette debt;
- multiplayer/network behavior;
- final embodiment architecture.

These debts are not a queued roadmap. Reopen only when a future Owner/problem question makes them relevant.

## 9. Known authority/exploit debt

Standing on a manipulated dynamic object can let the closed player↔object system lift itself through hybrid authority arrangements.

Classification remains:

- **generative exploit** — potentially valuable play;
- **authority / causal debt** — not automatically physically legitimate.

Do not remove it merely because it is an exploit during research. Do not call it valid merely because it is fun.

## 10. Current stop boundary

The project is intentionally at a **post-E19 checkpoint**.

Do not automatically:

- continue E19 tuning;
- start E20;
- build a full humanoid/ragdoll;
- promote E19 controls to the default player;
- infer Owner acceptance from green CI;
- delete historical research branches before repository-hygiene review.

A future execution stage should first ask:

> **What embodiment/gameplay unknown is now most valuable to separate, given the preserved E14–E19 evidence?**

That question may reuse E17, P3, E19 or older mechanisms as donors without making any one of them the preselected architecture.

## 11. Workflow / maintenance state

Canonical workflow policy remains in [`WORKFLOW.md`](WORKFLOW.md).

Important rules:

- `main` is canonical/public truth;
- Node/dependencies remain pinned and reproduced with the committed lockfile + `npm ci`;
- permanent smoke protects accepted regression contracts, not every historical diagnostic;
- E19 stage-specific diagnostics remain evidence/provenance and are no longer an active frontier;
- Owner attention is reserved for qualitative gameplay deltas rather than subtle machine A/Bs;
- documentation should keep this file, root `README.md` and `docs/README.md` synchronized when the frontier changes.

Repository branch cleanup is the **next maintenance campaign after this closure**, but its deletion policy is intentionally not invented here. First import/review the dedicated `jv_web` cleanup workflow package, adapt it to this repo, inventory evidence/provenance, then delete only what that explicit process qualifies as safe.

## 12. Conversation/repository boundary note

The browser conversation that contained the final E19 work later moved into `Jozzpoly/Jozzue_Vehicles_Sandbox` and its Family C / Spatial Compass builder research.

That later JV work is useful in its own project, but it is **not** Character Controller evidence and must not be treated as a continuation of E19 merely because it occurred in the same chat thread.
