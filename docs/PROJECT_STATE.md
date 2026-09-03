# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after E12 graded-capacity entitlement / dynamic-placement boundary**

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

Research E3+ asks which parts of accepted agency can be physically earned or honestly supplemented without destroying control/feel. None of E3–E12 has promoted new locomotion mechanics into Donor/runtime.

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

E5 established the causal distinction between:

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

E8 qualified useful local primitives — unilateral axial compression, guided compliance and cache-safe latch release — but an embodied mass/COM/inertia-matched split telescope failed inactive representation.

E9 removed the prismatic and spring entirely. Even a rigidly welded split preserving branch mass, COM and sagittal pivot inertia still failed the strict internal representation gate.

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

### E11 — physics-first residual exposes the anti-masking boundary

E11 returned to the bounded-assist side of E5, but required contact physics to act before any world-external residual in every frame.

Three durable results:

1. **Fixed physical-only deficit is not independently additive.** Earlier residual impulses change later frictional demand/contact response.
2. **Absolute physical impulse/share is not a universal honesty metric.** In the matched normal-support decomposition, assisted cases produced less later `Jphys` mainly because positive relative-slip area fell about `43–45%`; calibrated normal load did not collapse.
3. **Binary physical eligibility is insufficient.** At weak `μ=.20`, physical-only translation reached only about `1.98 m/s` and the body fell, yet a support+positive-impulse-gated adaptive residual produced accepted-looking `~5.28 m/s` ramp-end translation using about `73%` external authority. Posture still honestly fell, but translational traction loss was masked.

> **A materially weak physical channel must not become only a key that unlocks dominant accepted-looking translation.**

Ledger: `docs/E11_PHYSICS_FIRST_RESIDUAL.md`.

### E12 — graded capacity survives canonical agency; placement becomes a world-reference problem

E12 tests a physically derived graded entitlement on the existing E5.0a pinned load scale:

`J_n~ = 0.5 × totalNormalImpulse`

`q = clamp( μ × J_n~ / (0.95 × 80 × 20 × 1/60), 0, 1 )`

This is research evidence, not a promoted runtime formula.

#### E12.0a — current31 launch: PASS

Normal `μ=.95`:

- entitled `5.218 / 5.273 m/s`;
- both `RECOVER`;
- mean `q=.965/.970`;
- zero support loss.

Weak `μ=.20`:

- entitled only `1.748 / 1.707 m/s`;
- both `FALL`;
- mean `q=.126/.115`.

Zero friction:

- `q=0`;
- exactly zero assist.

> **Grading entitlement by measured traction capacity prevents the E11.2a weak-traction masking failure in the canonical current31 specimen while preserving accepted normal-support agency.**

Exact head `8ab931d4b9bbf5d998520ae7c7f98453215b0cea`; workflow `33755367571` SUCCESS.

#### E12.1a — current36 braking: PASS after correcting a confounded setup

The first direct-velocity initialization did not reproduce the qualified E4.6 brake-start state; even normal physical-only fell. It remains preserved as a **harness failure**, not entitlement evidence:

- head `ff6c8bf511c61bcd3e254a463763be4de278f598`;
- workflow `33756365385` FAILURE.

Corrected protocol reproduces exact E4.6 history:

`settle → physical 4 m/s² cruise setup → 120f neutral cruise → lead8`

Only then is friction switched for the brake counterfactual.

Normal `μ=.95` entitled braking stops essentially at `0` and `RECOVER`s in both directions. Weak `μ=.20` still ends around `3.222 / 3.387 m/s` and falls. Zero friction receives no assist and remains near its brake-start speed.

> **The same graded-capacity principle survives accepted current36 braking when the known-good E4.6 state history is respected.**

Corrected head `d3e8886bbf55da47d33835cbc6e346779a155208`; workflow `33756915671` SUCCESS.

#### E12.2a — dynamic-support placement accounting: PASS

A fair world-external vs reciprocal comparison must preserve the same **support-relative** granted agency, not the same arbitrary player impulse.

For player mass `M_p` and dynamic support mass `M_s`:

- world-external `J = M_p × Δv_rel`;
- reciprocal equal-and-opposite `J = M_reduced × Δv_rel`, with `M_reduced = 1/(1/M_p + 1/M_s)`.

With an `800 kg` real dynamic platform:

Normal `μ=.95`, `q=1`:

- both placements grant `Δv_rel=0.51667 m/s`;
- world-external momentum: player/support/total `41.333 / 0 / 41.333 N·s`;
- reciprocal: `37.576 / −37.576 / ~0 N·s`.

Weak `μ=.20`, `q=.211`:

- both grant `Δv_rel=0.10877 m/s`;
- world-external injects `8.702 N·s` total;
- reciprocal exchanges `±7.911 N·s`, total `~0`.

> **Entitlement and reaction placement are separable. Reciprocal placement preserves combined momentum; world-external placement injects it.**

Exact head `62a6f4e391d5753527a98c4701acabcc64bef46d`; workflow `33759730042` SUCCESS.

#### E12.2b — isolated placement discrimination: PASS / boundary

Question:

> **If both placements grant identical support-relative agency, does a free player+support pair show any meaningful relative/contact/posture difference, or only a common world-frame boost?**

A source audit found canonical player `linearDamping=0.015`, a world-relative momentum sink. E12.2b therefore compares canonical damping with a diagnostic zero-damping control.

Zero-damping control:

- normal placement-relative velocity divergence only `~5e−8…2e−7 m/s`;
- relative-position/posture/load traces match near machine precision;
- reciprocal total horizontal momentum remains near zero;
- world-external momentum remains `41.3333 N·s` through the one-second release.

Canonical damping:

- normal maximum placement-induced relative-velocity divergence `3.26e−5 m/s`;
- weak `6.88e−6 m/s`;
- both are only about **0.006% of the granted relative pulse**;
- support remains continuous; no fall.

Therefore:

> **On an isolated freely translating support, fair world-external and reciprocal placements are essentially Galilean-equivalent in support-relative/contact/posture behavior. Their substantive difference is whole-system momentum/common motion relative to the external world.**

And therefore:

> **More isolated player+free-support tests are informationally exhausted for placement selection. A meaningful discriminator must introduce a genuine external world reference or interaction.**

Exact head `df1077128d76769cca008d1bc2fcb6566ec55070`; workflow `33760538078` SUCCESS (`76` research scripts, `4` Donor scripts, production build; Pages skipped on branch).

Ledger: `docs/E12_GRADED_CAPACITY_ENTITLEMENT.md`.

## 5. Runtime / smoke consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface isolated;
- E3.2–E12 machine research only.

Durable positive research smoke retains:

- E6 binding calibrations;
- E7 inactive representation + real ground acquisition/contact identity;
- E8 axial-compliance/latch substrate calibrations;
- E9 weld binding calibration;
- E10 isolated latch + real acquisition→brace transition;
- E11.1a residual/contact interaction decomposition;
- E12.0a capacity-entitled launch;
- corrected E12.1a capacity-entitled braking;
- E12.2a dynamic-support placement calibration;
- E12.2b Galilean/world-damping decomposition.

Negative/confounded E7.2, E8.1, E9.0b, E10.1a/b, E11.0a, E11.2a and first E12.1a remain executable provenance outside mandatory green smoke.

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
- **A graded physical-capacity entitlement is now a qualified research principle for canonical current31/current36, but not a production formula.**
- **Support-relative agency and reaction placement are distinct design variables. Compare placement using mechanically fair reduced-mass accounting on dynamic support.**
- **An isolated free player+support pair cannot meaningfully select world-external versus reciprocal placement by relative/contact/posture behavior; introduce a genuine external reference before further placement claims.**
- If external authority exists, the physical world's capability must remain materially relevant to resulting behavior or its nonreciprocal contribution must be explicitly understood as overriding that limitation.
- Physical purity is not the goal; causal honesty and gameplay value are.
- Complexity must earn information or gameplay value.

## 7. Current highest-value unknown

E12 has closed the immediate anti-masking/placement-semantics questions far enough that another entitlement or isolated-support sweep has low information value.

Highest-value question:

> **When a dynamically supported player is coupled to a genuine external world reference, what observable gameplay-relevant consequences distinguish nonreciprocal world-external authority from reciprocal support reaction, and which consequences do we actually want?**

This is **not** yet “choose reciprocal because momentum conservation is purer” and not “choose world-external because local feel can be identical.” The project must expose the consequences in a world-coupled scenario before selecting architecture.

## 8. Near-term decision chain

Before implementing another multi-frame authority controller:

1. identify the smallest scenario containing a **real external world reference** that can observe whole-system momentum placement;
2. prefer a parameter-free or mechanics-derived setup over a spring/gap/mass chosen merely to force divergence;
3. keep the already-qualified E12 `q` semantics fixed unless the new scenario reveals a genuine contract failure;
4. compare world-external and reciprocal placement at matched support-relative granted agency;
5. preserve normal and materially weak support controls where relevant;
6. measure external-world consequence, player/support-relative behavior and momentum accounting separately;
7. stop once architecture discrimination is achieved — do not immediately tune gameplay feel;
8. only after an authority class survives this boundary consider multi-frame dynamic launch/braking, disturbances, moving/rotating support, support loss, solver-resolution robustness and eventually a faithful Owner play surface.

Candidate external-reference families include a world-anchored interaction, delayed/environmental third-body contact, or externally driven support. These are candidates, not commitments.

Do **not** choose a wall gap, spring stiffness, support mass or similar free parameter merely because it makes a graph separate.

## 9. Strategic interpretation

E6–E10 show that low-complexity purely physical support mechanisms have not yet paid for their representation/control cost.

E11 shows that nonreciprocal residual authority is viable enough to preserve accepted translation, but naive binary safeguards can make traction capacity causally optional.

E12 adds two important corrections:

1. **A physically derived graded capacity entitlement can preserve accepted canonical agency without masking severe weak/zero traction in the tested launch/brake specimens.**
2. **That entitlement does not itself choose reaction placement. On a free isolated support, reciprocal and nonreciprocal placement can be locally almost identical; their real distinction lives in momentum relative to the wider world.**

Therefore the project is not at “physics failed, use assist,” “assist failed, build legs,” or “reciprocity is automatically correct.”

It is at a narrower world-coupling boundary:

> **Expose which reaction-placement consequences matter once the embodied player/support system participates in a wider physical world.**

Only then should architecture selection move closer to production/Owner feel.

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