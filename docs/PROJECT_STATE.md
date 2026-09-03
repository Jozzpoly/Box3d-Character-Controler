# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after E11 physics-first residual / support-relevance boundary**

This is the compact canonical orientation layer. Detailed experiment history belongs in stage ledgers. Before any future write, re-fetch live `main` and its exact SHA; recorded SHAs are provenance, not permission to assume the repository has not moved.

## 1. Project identity

This repository is an **Embodied Player Laboratory**.

Central question:

> How can a player possess a physically meaningful body while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Method:

> **Controlled enough to explain, open enough to play.**

Mechanics and controller complexity must pay rent in useful agency, embodiment, gameplay value or explanatory power. Physical purity is not a goal by itself.

## 2. Authority hierarchy

1. **Owner hands-on judgement** — feel, legibility, artificiality and whether behavior is worth pursuing.
2. **Live `main` + exact SHA + CI** — implementation truth.
3. **Stage ledgers** — research/provenance truth.
4. Historical conversations/handoffs — context only when live evidence does not contradict them.

Machine PASS cannot prove feel. Negative/confounded evidence must not be rewritten into success.

## 3. Accepted player — A‴ / Donor v1

Normal public/default runtime remains **A‴ / Donor v1**.

Key accepted values:

- virtual interaction mass `80 kg`;
- max speed `5.2 m/s`;
- sprint `1.32`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- air acceleration `7.5 m/s²`;
- air deceleration `1.2 m/s²`;
- gravity `20 m/s²`;
- jump speed `7.2 m/s`;
- fixed outer `dt=1/60 s`;
- canonical `4` Box3D substeps.

Current static/kinematic interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Historical `createDonorCharacter(...)` remains frozen Donor v0 / A″.

Representation fact:

> **A‴ is a controller-owned mover. Its accepted translation is not articulated rigid-body propulsion.**

Research E3+ asks which parts of accepted agency can be physically earned or honestly supplemented without destroying control/feel. None of E3–E11 has promoted new locomotion mechanics into Donor/runtime.

Do not silently weaken accepted `31/36 m/s²` agency merely to make embodiment easier.

## 4. Durable research lineage

### E3 — finite physical posture

Finite `320 Nm` support-mediated balance produced a real embodied struggle and positive Owner response. Direct `64 N·s` recovered while `80 N·s` fell; a real `35 kg` ram at `3 m/s` recovered while `4 m/s` fell.

Bounded internal angular momentum later showed a real local mechanism but failed solver-resolution robustness. Do not rescue it by torque/stroke/gain/substep sweep.

### E4 — preparation before demand

Current-strength `31 m/s²` launch and `36 m/s²` braking can coexist with finite posture when the body physically prepares. `lead8` survived substeps `2/4/8` but not `1`.

`lead8` is research evidence, not gameplay timing. Solver substeps are an evidence axis, not a tuning knob.

### E5 — translational authority accounting

With ordinary `μ=.95` support and recovered lead8 posture, real contact supplied about **64.6–71.0%** of full `80 kg × 5.2 m/s` ramp impulse; body speed reached about `4.20–4.42 m/s` while support reached `5.2 m/s`.

E5 also established the causal distinction between:

- **world-external authority** — can preserve translation without reciprocal support momentum, including without support;
- **support-mediated authority** — exists through support and can preserve equal-and-opposite momentum accounting.

A naive world-external residual can close response gaps but can displace contact contribution and mask physical insufficiency.

E5 deliberately left the physical-vs-bounded-assist fork open.

### E6 — primary-path latent translation rejected

Hard rule:

> **Representation match before actuation.**

Adding latent translation into the qualified primary ankle changed mechanics while inactive. Do not continue primary-ankle latent-DOF variants.

### E7 — real second contact, no stable load regulation

A representation-neutral `1 kg × 0.9 m` one-piece parallel probe passed inactive matching. Finite `18 Nm` internal placement acquired real persistent probe↔ground contact in both directions while primary support remained intact.

Quiet settling transferred almost no meaningful body load to the probe. Demand-aligned COM shift caused primary support unload/fall while probe stayed grounded.

> **Contact acquisition is not support capacity. A useful support mechanism must prove stable, regulatable load sharing.**

### E8/E9 — serial support representation rejected

E8 qualified useful local primitives — unilateral axial compression, guided compliance and cache-safe latch release — but an embodied mass/COM/inertia-matched split telescope failed inactive representation (`~0.295° > 0.25°` placement-hinge drift).

E9 removed the prismatic and spring entirely. Even a rigidly welded split preserving branch mass, COM and sagittal pivot inertia failed the strict internal representation gate (`~0.292–0.294°` placement hinge; `~0.323–0.328°` weld alignment).

> **On the current substrate/contract, another serial constrained body is not a free route to better support mechanics.**

### E10 — one-piece brace transitions cleanly, but does not regulate load

E10 returned to the already-qualified one-piece E7 probe and changed only its existing revolute after real ground acquisition.

Positive:

- isolated current-angle latch **PASS**;
- acquisition→brace transition **PASS**;
- matched first-frame momentum difference `0.0424 / 0.0445 N·s` versus existing `0.8 N·s` band;
- low-demand lock drift `0.0095° / 0.0180°` versus `0.25°`.

Negative:

- quiet bracing did not meaningfully recruit body load;
- exact E7.2b/current31 demand remained unable to reach HOLD;
- brace reduced peak fall from about `99.6°` to `33–34°`, proving a real stabilizing effect, but primary/probe support continuity still failed;
- brace drift under demand reached `5.79° / 5.63°`, far outside its qualified envelope.

> **Contact acquisition + a rigid brace is still insufficient stable/regulatable support capacity.**

Ledger: `docs/E10_ONE_PIECE_SUPPORT_BRACE.md`.

### E11 — physics-first residual reveals the real anti-masking problem

E11 returned to the bounded-assist side of E5, but required contact physics to act **before** any world-external residual in every frame.

#### E11.0a — fixed physical-only deficit budget: FAIL

Each direction first measured its physical-only current31 deficit. The candidate then received at most that frozen total external budget, never enlarged when earlier residual impulses changed later contact response.

Physical-only:

- `J_phys = 279.33 / 268.80 N·s`;
- ramp-end speed `4.204 / 4.216 m/s`.

Physics-first candidate consumed exactly the frozen `79.68 / 78.71 N·s` residual budgets, stayed supported and `RECOVER`, but reached only `4.849 / 4.885 m/s`. Absolute physical share fell by `0.0782 / 0.0724`, beyond the predeclared `0.05` gate.

Conclusion:

> **Same-frame physics priority does not make external residual independently additive. Earlier external impulses change subsequent frictional demand/contact response.**

#### E11.1a — interaction decomposition: PASS / interpretation correction

Matched traces showed that the lower later physical impulse was **not** caused by normal-load collapse:

- positive relative-slip area fell about `43–45%`;
- calibrated normal-load sum increased about `1–4%`;
- divergence appeared only after the first residual impulse.

Therefore:

> **Preserving an unchanged absolute physical impulse/share is not a universal anti-masking criterion when another authority channel reduces the same relative-motion error. Less physical impulse can mean less friction was needed, not that physical capacity disappeared.**

E11.0a remains a valid negative result against its declared gate; E11.1a corrects the architectural interpretation of that gate.

#### E11.2a — support-relevance counterfactual: FAIL

A simple adaptive policy kept strict sequencing and required support before+after solve plus positive same-frame physical horizontal impulse. When eligible, it closed only the current post-solve speed shortfall, capped by accepted current31 per-frame authority.

Normal `μ=.95` support:

- adaptive ramp reached `5.218 / 5.273 m/s`;
- remained `RECOVER` with no support loss;
- external share about `38–40%`.

Weak `μ=.20` support:

- physical-only organism **FALL**, reaching only `1.972 / 1.980 m/s` with physical fraction about `28–29%`;
- adaptive organism still **FALL**, but translational ramp reached `5.283 / 5.280 m/s` — inside the existing accepted near-match window;
- external share rose to about `72.6–73.5%` while weak physical impulse remained essentially unchanged.

Zero friction did not unlock sustained residual authority; after one transient eligible frame the positive-physical gate blocked it.

Decisive conclusion:

> **Binary physical eligibility is too weak. A materially weak but nonzero traction channel can become only a key that unlocks dominant world-external translation, making severe traction loss nearly invisible in the translational response even while posture still honestly fails.**

Ledger: `docs/E11_PHYSICS_FIRST_RESIDUAL.md`.

## 5. Runtime / smoke consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface isolated;
- E3.2–E11 machine research only.

Durable positive research smoke retains:

- E6 binding calibrations;
- E7 inactive representation + real ground acquisition/contact identity;
- E8 axial-compliance/latch substrate calibrations;
- E9 weld binding calibration;
- E10 isolated latch + real acquisition→brace transition;
- E11.1a residual/contact interaction decomposition.

Negative E7.2, E8.1, E9.0b, E10.1a/b, E11.0a and E11.2a remain executable provenance outside mandatory green smoke.

## 6. Durable invariants

Preserve unless new evidence explicitly overturns them:

- Owner judgement and machine evidence are different evidence classes.
- A‴ numeric feel is accepted; do not silently weaken `31/36` to make embodiment easier.
- Internal actuation must not receive hidden world reaction merely to stabilize behavior.
- Contact-earned and world-external authority must be accounted separately.
- A new mechanical representation must pass inactive matching before active causal claims.
- Contact acquisition is not stable load capacity.
- Do not keep replacing the primary ankle or recursively add serial bodies after E6–E9.
- E10 partial fall reduction is not enough to justify support-mechanism tuning.
- A local effect at one solver resolution is not robust capability evidence.
- **Absolute physical impulse preservation is not automatically proof of honest embodiment, and lower physical impulse is not automatically masking. Relative demand matters.**
- **Binary contact / positive-impulse gating is not sufficient anti-masking for world-external residual authority.**
- If external authority exists, the physical world's capability must remain materially relevant to the resulting behavior or its nonreciprocal contribution must be explicitly understood as overriding that limitation.
- Physical purity is not the goal; causal honesty and gameplay value are.
- Complexity must earn information or gameplay value.

## 7. Current highest-value unknown

The project no longer needs another residual-cap sweep.

The highest-value authority question is now:

> **What causal contract, if any, can supplement physically earned locomotion authority without making the physical world's traction capacity optional?**

Two distinct candidate classes deserve comparison:

### A. graded support-earned entitlement for world-external residual

Residual entitlement would scale with a meaningful physical capability/quality signal rather than a boolean contact flag.

Do **not** jump to `J_assist <= k × J_phys` and sweep `k`. E11.1a shows that measured `J_phys` itself changes when assist reduces slip. A useful entitlement must distinguish:

- less physical impulse because less was needed;
- less physical capability because the world/support is genuinely weak.

A high-information test should derive the entitlement from an explicit physical quantity or counterfactual before tuning.

### B. reciprocal/support-mediated auxiliary authority

E5.0b already proved the primitive distinction: equal-and-opposite support-mediated authority can preserve player+support momentum and disappears without support.

A meaningful new experiment must make reciprocity observable — preferably with dynamic support — rather than merely relabeling authority on a kinematic platform.

This is a genuinely different architecture from world-external residual.

A genuinely new physical support mechanism remains admissible if it introduces a causal capability E6–E10 did not already exercise, but more anatomy is not the default.

## 8. Near-term decision chain

Before implementing another authority controller:

1. compare graded world-external entitlement against reciprocal support-mediated authority by **information gain**, not ideology;
2. identify the smallest specimen in which their causal difference is observable;
3. predeclare what counts as "physical world remains materially relevant" before tuning any gain/ratio;
4. include a normal-support control and at least one materially weak-support counterfactual so accepted-looking translation cannot hide lost capacity;
5. if using reciprocal authority, include dynamic-support momentum accounting;
6. preserve accepted current31/current36 targets as evidence references rather than weaken them;
7. stop after architecture discrimination; do not immediately tune a gameplay controller.

Only after an authority class survives this boundary should the project test launch/braking robustness, disturbances, moving support, support loss, solver resolution and finally a faithful Owner play surface.

## 9. Strategic interpretation

E6–E10 show that low-complexity purely physical support mechanisms have not yet paid for their representation/control cost.

E11 shows that nonreciprocal residual authority is viable enough to preserve accepted translation, but naive safeguards can make traction capacity causally optional.

Therefore the project is **not** at "physics failed, use assist" and not at "assist failed, build legs".

It is at a narrower authority-design boundary:

> **Find the smallest authority architecture in which the body/world remains causally meaningful while accepted player agency remains attainable.**

That may eventually be physical, reciprocal, graded-hybrid, or another mechanism. Evidence has not selected one yet.

## 10. Execution loop

For each stage:

1. identify the highest-value unknown;
2. inspect only evidence/source needed to define it;
3. declare a falsifiable control before tuning;
4. preserve representation/inactive controls where attribution matters;
5. run exact-head smoke/build;
6. distinguish confounded harness failure from physical failure;
7. preserve negative evidence without permanent red CI;
8. promote only what evidence supports;
9. stop at a natural boundary rather than opening unrelated work automatically.

For navigation see `docs/README.md`.