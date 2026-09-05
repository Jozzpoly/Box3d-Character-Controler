# Project state — Embodied Player Laboratory

Grounded: **2026-09-05, after E17-depth Owner closure and E18.0 intent/proxy qualification**

This is the compact canonical orientation layer. Before any future write, re-fetch live `main` and exact SHA. Recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 narrow one-leg/contextual tuning is closed by Owner judgement; causal evidence remains valid provenance.
- E15 established a bounded body-response → player-consequence bridge but Owner judged the passive torso too gameplay-irrelevant.
- E16 established capability-first embodiment and useful manipulation mechanics, but Owner judged end-effector-first control far too awkward.
- **E17 intent-first physical manipulation** remains the strongest current gameplay direction from Owner free play and is preserved as **P1 — one-point chaos baseline**.
- **E17-depth** is mechanically legitimate but Owner could not reliably distinguish it from E17 in blind/free play after several minutes. Preserve it as technical executor evidence, not as a gameplay winner or automatic P1 replacement.
- **E18** is the active manipulation-architecture frontier.
- E18.0a–0j qualified the explicit 3D manipulation-intent/transport boundary sufficiently to stop blocking architectural work.
- Current-best next crucible is **P3.0 — deterministic coupled two-point mechanics**, headless/scripted before Owner-facing input work.
- Reproducibility debt and E17 browser-shell drift are closed maintenance work, not current research frontiers.

Latest verified canonical/public implementation:

- `main`: `f8c4126f3f6a32eb80a0d87349e8d2e75e02438a`
- PR #45: `Converge E17 Owner A/B browser shell`
- exact-main workflow `33954457600` — **SUCCESS**
- public E17 route: `?mode=e17` / `?mode=intent`
- public E17-depth route: `?mode=e17depth` / `?mode=pointmass`

Latest qualified E18 internal checkpoint before the current documentation commits:

- branch: `experiment/e18-manipulation-v0`
- checkpoint: `6a1aef0ca0ea025e3ab8ceefd9e31f59a00aada0`
- E18 diagnostics run `33959216463` — **SUCCESS**
- canonical verify/build run `33959216478` — **SUCCESS**

After any merge or new research commit, re-fetch exact state; do not treat these SHAs as eternally current.

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

## 4. Durable E14 → E17 lesson

E14 showed that a more physical representation can still lose to the plain Donor when it removes too much agency or strategy space.

E15 preserved Donor traversal but the physical torso mostly reacted after the interesting player action had already happened.

E16 gave a solver-owned physical subsystem a deliberate capability, but Owner attention became dominated by operating the subsystem itself.

E17 reset the abstraction boundary:

> **high-level player/object intent first → finite physical execution second**

Owner free play then shifted from interface testing to deliberate world experimentation. One capability generated lift, carry, drag, swing, throw, leverage, pile/stack attempts, object↔object interaction and persistent scene history.

Durable lesson:

> **Embodiment should add useful verbs and consequences without forcing the player to micromanage low-level physics merely to express intent.**

## 5. E17 — one-point chaos baseline

Interaction contract:

> **select nearby dynamic object / exact surface point → express 3D target intent → finite physical actuator attempts it**

The object is not teleported. Finite impulse acts at the selected point and equal/opposite reaction acts on the finite physical core.

Owner-positive evidence:

- attention shifted toward experimenting with the world;
- one capability generated a family of verbs;
- mass, leverage, collision and release momentum remained perceptible parts of play.

Owner-negative evidence:

- strong oscillation/overshoot;
- poor precise placement;
- uncontrolled orientation;
- off-centre grabs can create extreme rotation;
- representation remains prototype-grade.

Interpretation:

> **E17 does not prove the manipulator is good. It proves the intent-first abstraction is promising enough to generate play despite a bad executor.**

Preserve E17 as **P1 — one-point chaos baseline**.

## 6. E17-depth — bounded executor correction, Owner-closed

E17-depth preserves the E17 interaction grammar, input, acquisition/release lifecycle, reach and `900 N` force cap.

Only requested impulse calculation changes: it uses the directional effective mass of the grabbed rigid-body point, including the rotational contribution from world COM and inverse rotational inertia.

Machine evidence establishes a real bounded mechanical distinction.

Owner blind/free comparison on 2026-09-05 found the difference too subtle to identify reliably after several minutes.

Therefore:

> **E17-depth is a mechanically valid but gameplay-insufficient local refinement. It did not remove the dominant P1 limitation.**

Do not spend more Owner attention trying to force a preference from this A/B. Do not call E17-depth a gameplay winner. Preserve E17 as the historical P1 chaos/fun reference and E17-depth as technical evidence about one-point execution.

## 7. Self-lift / closed-loop authority exploit

Standing on a manipulated dynamic object can let the closed player↔object subsystem lift itself through the hybrid Donor/manipulation authority arrangement.

Current classification:

- **generative exploit** — funny, high-fun, creates a new toy/verb;
- **authority exploit / causal debt** — closed subsystem receives effective external translation authority.

Do not remove it merely because it is an exploit during exploratory work. Also do not call it physically valid merely because it is fun.

## 8. E18 research frontier

Current question:

> **What interaction grammar lets a player express useful 6-DoF object intent while finite physics, mass, leverage, contacts, body reaction and failure remain meaningful parts of execution?**

Candidate portfolio:

- **P1** — E17 one-point chaos baseline;
- **P2** — finite 6-DoF pose coupling;
- **P3** — bounded two-point / virtual two-hand grip;
- **P4** — one-point manipulation plus a separated precision/rotation clutch.

P3 remains the current-best next architectural crucible because it can test intentional orientation while preserving leverage without committing to humanoid anatomy.

P2 remains the engineering/control reference. P4 remains the usability alternative.

### E18.0 intent/proxy boundary now qualified

The current hybrid should proceed with these rules:

1. manipulation intent is explicit persistent 3D state, not an absolute frozen click-time drag plane;
2. camera motion alone does not mutate the target;
3. explicit screen/depth input changes intent incrementally using the current camera basis;
4. high-level transport origin is the accepted Donor carrier, `character.position`, not raw physical `bodyPosition`;
5. target transport follows **realized** Donor displacement at normal update boundaries;
6. the known within-outer-step phase separation remains explicit debt for now;
7. do not pre-compensate it from commanded/pre-solve velocity — collision solving can invalidate almost the entire predicted carrier step;
8. reach, force, saturation and physical failure remain downstream executor concerns.

Detailed evidence:

[`E18_INTENT_PROXY_QUALIFICATION_2026-09-05.md`](E18_INTENT_PROXY_QUALIFICATION_2026-09-05.md)

Broader architecture map:

[`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md)

Execution policy:

[`E18_EXECUTION_SPINE_2026-09-05.md`](E18_EXECUTION_SPINE_2026-09-05.md)

## 9. Current action / stop boundary

The immediate research boundary is now **P3.0 — deterministic coupled two-point mechanics**.

Do not begin with browser UX. First separate the mechanical question from the input question.

P3.0 should:

- use scripted/deterministic target-point trajectories;
- preserve accepted Donor traversal and current hybrid body/core unless the probe specifically requires otherwise;
- treat both point constraints as one coupled rigid-body task, not two independent E17 springs;
- use one declared shared force/impulse authority budget so P3 cannot win merely by receiving twice the strength;
- preserve finite saturation/failure;
- exploit the useful geometric fact that two noncoincident points determine translation + an axis while leaving twist about that axis free;
- compare centre/off-centre, long-beam leverage, light/heavy, blocked/contact and release cases against the frozen one-point reference where meaningful.

Natural stop:

- if coupled two-point mechanics materially improve intentional axis/orientation control without simply overpowering objects, build a bounded Owner-facing P3.1 toybox/input grammar;
- if P3 mechanics are intrinsically poor, preserve the negative evidence and use P2 finite 6-DoF coupling as the control reference;
- do not ask Owner for another broad pass until the capability difference is large enough to matter in play.

## 10. Workflow / maintenance state

Canonical workflow policy is documented in [`WORKFLOW.md`](WORKFLOW.md).

Important current rules:

- `main` is canonical/public truth;
- dependencies are reproduced with Node `22.23.2` + committed lockfile + `npm ci`;
- `npm run smoke` preserves the foundation/historical regression spine;
- `npm run smoke:current` covers currently promoted E16/E17/E17-depth prototypes;
- experiment-specific diagnostics belong to bounded branch-local qualification, not permanent branch-name conditions in the Pages workflow;
- negative/confounded experiments remain provenance and do not need to be converted into permanent green CI;
- separate playground/map work remains a parallel lane and must not contaminate E18 manipulation causality.
