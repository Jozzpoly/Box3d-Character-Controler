# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, E14.1C pinned-boundary Owner instrument candidate after successful pre-public branch qualification**

This is the compact canonical orientation layer. Detailed experiment history belongs in the stage ledgers. Before any future write, re-fetch live `main` and exact SHA; recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 does **not** promote new mechanics into Donor/default runtime.
- Existing public experimental routes remain:
  - `?mode=e14` / `?mode=reaction` — E14.0 reaction-placement surface;
  - `?mode=e14lab` / `?mode=contextual` — E14 continuous Owner Lab, upgraded by E14.1C once the current branch is merged/deployed.
- E14.1B Owner play produced the first meaningful evidence that the current mechanism can become a primitive physical toy, but not evidence of a good character controller.
- The immediate research frontier is **E14.1C — Pinned Boundary Skill Probe**.
- E14.1C is instrumentation/Owner-surface work, **not physics redesign**.
- Pre-public branch qualification at `4b70cbf6e37566c357c84eed87a67ce9b2310d01` passed mechanics smoke, mandatory instrumentation contracts, corrected diagnostics and build.
- Exact merged-main CI + Pages still determines the publication gate. Do not treat branch PASS as publication PASS.

Current E14 stage document:

[`E14_CONTEXTUAL_AUTHORITY_LAB.md`](E14_CONTEXTUAL_AUTHORITY_LAB.md)

Current hard stop:

> **Publish and qualify the E14.1C Owner instrument, then STOP. Owner must choose the pinned specimen during public DISCOVERY.**

Do not automatically proceed to World Transfer, Strategy Repertoire, replay infrastructure, recovery controller or Donor promotion.

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

## 2. Authority hierarchy

1. **Owner hands-on judgement** — feel, causal readability, artificiality, fun and whether a behavior/mechanism is worth pursuing.
2. **Live `main` + exact SHA + source + CI/Pages** — implementation/publication truth.
3. Current stage handoff/orientation — current research intent where repo docs lag live work.
4. Stage ledgers/docs — provenance and prior qualification.
5. Historical branches/conversations/recommendations — context only.

Machine PASS does not prove feel. Owner fun does not prove a causal claim. Negative, confounded, protocol-miss and tooling-defect evidence must retain their correct class.

## 3. Accepted player / inherited boundaries

Normal public/default runtime remains **A‴ / Donor v1**.

Key accepted/reference values relevant to E14:

- player interaction mass `80 kg`;
- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground braking `36 m/s²`;
- gravity `20 m/s²`;
- fixed outer `dt=1/60 s`;
- canonical `4` Box3D substeps;
- finite balance torque reference `320 Nm`;
- friction reference `μ=.95`;
- support mass reference `800 kg`;
- E14 Owner Lab `preparationFrames=0`.

Do not silently weaken accepted `31/36` to make embodiment easier.

E12 research entitlement remains:

`q = clamp( μ × J_n~ / 25.3333, 0, 1 )`

within its qualified scope. It is not a production policy or universal support-quality metric.

E11/E12/E14 causal order remains physics-first:

1. intent requests support-relative motion;
2. finite body/posture attempts it;
3. contact physics solves first;
4. actual physical contribution/support evidence are measured;
5. bounded supplemental shortfall may be granted;
6. reaction routing is explicit;
7. the next frame starts from the resulting state.

## 4. Durable research lineage

### E3 — finite posture

Finite support-mediated posture established a real embodied struggle. `FALL` remains valid historical failure of the E3/E4 balance objective. For future player gameplay, loss of upright posture need not necessarily mean permanent loss of agency, but that is not an E14.1C implementation change.

### E4 — locomotion/posture compatibility

Preparation can physically help finite posture coexist with current-strength launch/braking. `lead8` is a foresight oracle, not a gameplay timing contract. Preparation-only testing later showed that hidden target freezing can oppose translation already generated by the body.

### E5–E12 — authority accounting and graded entitlement

Research separated physical/contact contribution from supplemental authority, rejected weak binary eligibility, qualified graded capacity entitlement in bounded cases, and separated **support-relative agency** from **reaction placement**.

On an isolated free player+support pair, fair External vs Reciprocal placement is nearly Galilean-equivalent in local relative/contact/posture behavior; that isolated pair cannot choose placement on its own.

### E13 — wider-world coupling

Genuine external world coupling can make reaction placement materially observable. However, quiet engagement being neutral does not imply active-state engagement is neutral.

Durable rule:

> **Do not create an external reaction path at authority time and then call it causally neutral plumbing.**

If the wider world carries reaction, the physical/gameplay coupling must already arise naturally from the situation and retain its history/consequences.

### E14.0 — Owner-readable placement

Owner could distinguish world-external wind-like acceleration from reciprocal support recoil. This rejected global scenario-named reaction modes as a long-term controller architecture, but selected no production policy.

### E14.1B — continuous lab + Owner play

Corrected E14.1 uses the exact sagittal E4/E12 representation: motion world `Z`, ankle/balance world `X`, qualified `0.34 m` sagittal foot half-length.

At reference no-lead settings:

- Natural strongly under-delivers accepted agency and remains a useful physical-truth probe;
- External and Reciprocal recover nearly identical local support-relative agency;
- both finite-body specimens can still fall;
- the main immediate tension is **agency demand ↔ finite embodied capacity**, not External vs Reciprocal.

Owner's ~`142.6 s` spontaneous mobile session moved from comparison into unscripted tuning/play. The strongest signal is that E14 began acting like a **primitive physical toy**. Competing sources remain open: boundary/competence play, tuning/experimentation, slapstick/novelty, world/affordance proxy and missing strategy repertoire.

## 5. E14.1C — current frontier

Central question:

> **Can one unchanged current-E14 configuration support enough causal repeatability, sensitivity, flexibility and persistence that Owner can learn to predict/correct it without further parameter tuning?**

This is deliberately not a test of which policy is best or how to build the final player.

A locked-play negative has three possible interpretations, not two:

- H1 boundary/competence play weakens;
- tuning/experimentation may be the main value;
- **ACTION SPACE / INSTRUMENT INSUFFICIENT TO TEST H1** — current one-strategy organism may simply offer too few meaningful alternatives.

Machine does not decide fun/skill.

## 6. E14.1C instrument truth

The bounded implementation introduces:

- versioned pure specimen configuration contract;
- deterministic canonical serialization and stable specimen ID;
- URL-shareable/reloadable pinned specimens on existing `?mode=e14lab` route;
- PIN / clean RESTORE / LOCK semantics;
- locked-play UI that removes discovery sliders/policy/pause/step/shoves from the primary interaction surface;
- clean restore with neutral input `0`, cleared stale held state, declared running state and fresh settle;
- generic later specimen qualifier for no-input sanity, reset determinism, repeated trace determinism, finite telemetry and qualitative input differentiation;
- explicit mandatory finite telemetry contract;
- abstract floor/grid world-axis guides instead of false-affordance non-collidable vertical posts.

PIN stores configuration, **not** Box2D bodies/contacts/solver caches/runtime snapshot.

Format v1 reference specimen:

`e14c1|s1|m=800|f=0.95|a=31|b=36|t=320|p=entitled-reciprocal`

Reference ID:

`E14C1-befd707b`

## 7. Instrumentation provenance correction

Historical exact-head E14 diagnostic artifact:

- workflow `33802322554`;
- artifact `9911568231`;
- head `b858bf48e300b8c9297cd22ac86357f658fedccc`.

Its E14.1d body-lean phase summaries were invalid because the consumer still read `signedLeanX` while the corrected sagittal sim emitted `signedLean`. This is an observation/tooling defect, not a physics negative. Do not rewrite the historical artifact as corrected.

Corrected evidence from E14.1C implementation commit:

- commit `4b70cbf6e37566c357c84eed87a67ce9b2310d01`;
- workflow `33811359560`;
- artifact `9914925276`;
- schema `e14-1d-corrected-sagittal-telemetry-v2`;
- body/target lean extrema finite across all diagnostic scenario phases.

Mandatory instrumentation now fails on missing required fields, `NaN`, infinities, stale `signedLeanX` and wrong sagittal axis semantics.

## 8. Validation model

Report E14.1C through three separate gates.

### MECHANICS GATE

Existing research + Donor regressions. No E14.1C claim may hide a Donor/mechanics regression.

### INSTRUMENTATION GATE

Required finite telemetry, versioned specimen roundtrip/validation/ID, clean restore, lock mutation boundary, query share/reload, generic qualifier and browser axis/temporal/UI contract.

Key instrumentation contracts are part of mandatory smoke through `scripts/e14-1c-browser-contract.mjs`; diagnostic artifact upload is supplementary provenance rather than the only qualification path.

### PUBLICATION GATE

Exact merged `main`, build, Pages deployment, E14.1C route availability and unchanged default Donor.

Do not summarize these three evidence classes merely as `green`.

## 9. Files intentionally outside E14.1C mechanics blast radius

E14.1C should not require changes to:

- `src/e14-authority-kernel.js`;
- `src/e14-continuous-sim.js`;
- `src/e3-balance-organism.js`;
- Donor files/default runtime;
- dependencies;
- current routing semantics in `src/bootstrap.js`.

A future need to change those for PIN/LOCK would be a scope alarm requiring causal justification.

## 10. Owner protocol after publication

After exact-main publication gate passes:

> **DISCOVERY → find something interesting → PIN → LOCK → play → record.**

Owner selects the specimen. Machine must not optimize/select one beforehand.

Locked play should preserve A/D, camera and clean pinned reset. Do not give a scripted ideal solution or target success rate.

Analyse the recording and spontaneous feedback first, then ask questions if needed.

After Owner supplies the pinned representation, run the exact config through the generic qualifier without parameter tuning.

## 11. Outcome boundary

Possible post-Owner outcomes:

- **Boundary skill supported** → smallest next candidate is one-property World Transfer (mass **or** friction), but not inside E14.1C.
- **Locked play flat with real action-space** → H1 weakens; build/tune/test sandbox value may strengthen.
- **Action-space/instrument insufficient** → do not falsify H1; next frontier becomes Strategy Repertoire, without assuming a second leg.
- **Numerical/solver chaos** → stop and decompose.
- **Mostly slapstick/spectacle** → secondary value only unless it also helps the central player-intent/physical-consequence problem.

## 12. Hard stop / next action

Current execution must end at:

> **E14.1C Owner instrument is public and mechanically/instrumentally qualified; no Owner specimen has yet been selected.**

Then **STOP FOR OWNER**.

Before any future continuation:

1. verify live `main` exact SHA and CI/Pages;
2. read this file;
3. read [`E14_CONTEXTUAL_AUTHORITY_LAB.md`](E14_CONTEXTUAL_AUTHORITY_LAB.md);
4. preserve the historical E13/E14 evidence classes;
5. do not choose or tune the pinned specimen for Owner.
