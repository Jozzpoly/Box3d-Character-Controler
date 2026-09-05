# Project state — Embodied Player Laboratory

Grounded: **2026-09-05, after E17-depth publication, reproducible-dependency maintenance and E17 lifecycle convergence**

This is the compact canonical orientation layer. Before any future write, re-fetch live `main` and exact SHA. Recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 narrow one-leg/contextual tuning is closed by Owner judgement; causal evidence remains valid provenance.
- E15 established a bounded body-response → player-consequence bridge but Owner judged the passive torso too gameplay-irrelevant.
- E16 established capability-first embodiment and useful manipulation mechanics, but Owner judged end-effector-first control far too awkward.
- **E17 intent-first physical manipulation** is the strongest current gameplay direction from Owner free play.
- **E17-depth** is now a public bounded A/B executor probe: same one-point grammar and force/reach budget, but inertia-aware directional point effective mass.
- **E18** remains the broader manipulation-architecture research frontier.
- Reproducibility debt is closed: Node is pinned, `package-lock.json` is committed and CI uses `npm ci`.
- E17 and E17-depth now share one manipulation lifecycle implementation; E17-depth overrides only effective-mass calculation and extra telemetry.

Latest exact canonical implementation before this documentation cleanup:

- `main`: `af9fab3207df2b84d3eee990a22d37cad4188a14`
- PR #41: `Publish E17-depth inertia-aware one-point owner probe`
- PR #42: `Make dependency resolution reproducible`
- PR #43: `Converge E17 manipulator lifecycle`
- exact-main workflow `33953856762` — **SUCCESS**
- locked install, foundation/history smoke, E16 regressions, E17, E17-depth, build and Pages deploy — **SUCCESS**
- public E17 route: `?mode=e17` / `?mode=intent`
- public E17-depth route: `?mode=e17depth` / `?mode=pointmass`

After any merge following this grounding, re-fetch `main`; do not treat the SHA above as eternally current.

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

## 6. E17-depth — bounded one-point executor correction

E17-depth preserves the E17 interaction grammar, input, acquisition/release lifecycle, reach and `900 N` force cap.

Only requested impulse calculation changes: it uses the directional effective mass of the grabbed rigid-body point, including the rotational contribution from world COM and inverse rotational inertia.

Machine evidence establishes the bounded mechanical distinction and successful browser build/publication. It does **not** establish better feel, better gameplay or Owner preference.

Therefore:

> **E17-depth is an Owner-facing A/B candidate, not an accepted replacement for E17.**

Do not quietly add damping, orientation ownership, a second grip point or stronger force and still call the result this same bounded A/B.

## 7. Self-lift / closed-loop authority exploit

Standing on a manipulated dynamic object can let the closed player↔object subsystem lift itself through the hybrid Donor/manipulation authority arrangement.

Current classification:

- **generative exploit** — funny, high-fun, creates a new toy/verb;
- **authority exploit / causal debt** — closed subsystem receives effective external translation authority.

Do not remove it merely because it is an exploit during exploratory work. Also do not call it physically valid merely because it is fun.

## 8. E18 research frontier

Current question:

> **What interaction grammar lets a player express useful 6-DoF object intent while finite physics, mass, leverage, contacts, body reaction and failure remain meaningful parts of execution?**

Current candidate portfolio:

- **P1** — E17 one-point chaos baseline;
- **P2** — finite 6-DoF pose coupling;
- **P3** — bounded two-point / virtual two-hand grip;
- **P4** — one-point manipulation plus a separated precision/rotation clutch.

E18-R0 selected **P3** as the current-best next architectural crucible because it can test intentional orientation while preserving leverage without committing to humanoid anatomy.

P2 remains the engineering/control reference. P4 remains the usability alternative.

Detailed map:

[`E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](E18_MANIPULATION_LANDSCAPE_2026-09-04.md)

## 9. Current action / stop boundary

The immediate Owner-facing evidence boundary is now the **E17 vs E17-depth one-point A/B**.

Do not infer that E17-depth won because its causal/mechanical qualifier passed.

After Owner judgement, use the result to decide whether:

- one-point execution quality was materially improved enough to keep as the P1 reference; or
- the dominant limitation is still the one-point interaction grammar/orientation problem, in which case proceed to the smallest bounded E18 P3 crucible.

Do not build full arms, humanoid anatomy or a production manipulation UI before this distinction is learned.

## 10. Workflow / maintenance state

Canonical workflow policy is documented in [`WORKFLOW.md`](WORKFLOW.md).

Important current maintenance rules:

- `main` is canonical;
- dependencies are reproduced with Node `22.23.2` + committed lockfile + `npm ci`;
- `npm run smoke` preserves the existing foundation/historical green regression spine;
- `npm run smoke:current` covers currently promoted E16/E17/E17-depth prototypes;
- experiment-specific diagnostics belong to bounded branch-local qualification, not permanent branch-name conditions in the Pages workflow;
- negative/confounded experiments remain provenance and do not need to be converted into permanent green CI.
