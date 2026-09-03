# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after E13 world-coupled authority-placement closure**

This is the compact canonical orientation layer. Detailed experiment history belongs in stage ledgers. Before any future write, re-fetch live `main` and its exact SHA; recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player: **A‴ / Donor v1**, unchanged.
- Accepted ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E3.1 remains the only public experimental balance surface.
- E3.2–E13 are machine research only.
- E12 qualified a graded physical-capacity entitlement as a research principle and separated support-relative agency from reaction placement.
- E13 introduced a genuine external world reference and closed the immediate placement boundary.
- **No E13 mechanism has been promoted to runtime or Donor.**

Newest ledger:

[`E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md`](E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md)

Current durable boundary:

> **Do not manufacture a world reaction path when authority needs somewhere to react and then treat that path as causally neutral. If the external world carries reaction, that coupling must already exist as part of the physical/gameplay situation, with its history and consequences left visible.**

Next high-value problem:

> **Which naturally present environmental relationships should legitimately carry player-authority reaction, and when should accepted agency remain explicitly controller/world-external instead?**

This is a contextual reaction-ownership / environmental-causality question, not another stop, `q`, friction, residual-ratio or support-mass sweep.

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
4. Active experimental branches — provisional evidence.
5. Historical conversations/handoffs — context only when live evidence does not contradict them.

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

Research E3+ asks which parts of accepted agency can be physically earned or honestly supplemented without destroying control/feel. None of E3–E13 has promoted new locomotion mechanics into Donor/runtime.

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

E5 separated:

- **world-external authority** — can preserve translation without reciprocal support momentum, including without support;
- **support-mediated authority** — exists through support and can preserve equal-and-opposite momentum accounting.

A naive world-external residual can close response gaps but can mask physical insufficiency.

### E6 — primary-path latent translation rejected

Hard rule:

> **Representation match before actuation.**

Adding latent translation into the qualified primary ankle changed mechanics while inactive. Do not continue primary-ankle latent-DOF variants.

### E7 — real second contact, no stable load regulation

A representation-neutral `1 kg × 0.9 m` one-piece parallel probe passed inactive matching. Finite `18 Nm` internal placement acquired real persistent probe↔ground contact in both directions while primary support remained intact.

Quiet settling transferred almost no meaningful body load to the probe. Demand-aligned COM shift caused primary support unload/fall while probe stayed grounded.

> **Contact acquisition is not support capacity. A useful support mechanism must prove stable, regulatable load sharing.**

### E8/E9 — serial support representation rejected

E8 qualified local axial-compliance / guide / latch primitives, but an embodied mass/COM/inertia-matched split telescope failed inactive representation.

E9 removed prismatic/spring complexity. Even a rigidly welded split still failed the strict internal representation gate.

> **On the current substrate/contract, another serial constrained body is not a free route to better support mechanics.**

### E10 — one-piece brace helps but does not create stable support capacity

The already-qualified one-piece probe can be latched cleanly after real acquisition. The transition is quiet and resists low-demand drift.

Under current31 demand it still fails stable dual-support HOLD. The brace materially reduces peak fall, so the mechanism is real, but support continuity/load regulation remain insufficient.

> **Contact acquisition + a clean latch + a rigid brace is still not stable/regulatable support capacity.**

Ledger: [`E10_ONE_PIECE_SUPPORT_BRACE.md`](E10_ONE_PIECE_SUPPORT_BRACE.md).

### E11 — binary physical eligibility rejected

E11 made residual assistance physics-first.

Durable results:

1. fixed physical-only deficit is not independently additive because earlier assist changes later slip/contact demand;
2. lower later physical impulse is not automatically masking — reduced relative slip can legitimately reduce frictional work;
3. a boolean `support + positive physical impulse` gate is still too weak: weak `μ=.20` traction could unlock accepted-looking translation dominated by external authority while posture still fell.

> **A materially weak physical channel must not become only a key that unlocks dominant accepted-looking translation.**

Ledger: [`E11_PHYSICS_FIRST_RESIDUAL.md`](E11_PHYSICS_FIRST_RESIDUAL.md).

### E12 — graded capacity survives; placement is a separate variable

E12 qualified a physically derived research entitlement:

`J_n~ = 0.5 × totalNormalImpulse`

`q = clamp( μ × J_n~ / (0.95 × 80 × 20 × 1/60), 0, 1 )`

Canonical current31:

- normal `μ=.95`: `5.218 / 5.273 m/s`, both RECOVER;
- weak `μ=.20`: `1.748 / 1.707 m/s`, both FALL;
- zero friction: `q=0`, zero assist.

Canonical current36 braking, after restoring exact E4.6 state history:

- normal support stops essentially at zero and recovers;
- weak support ends around `3.22–3.39 m/s` and falls;
- zero friction gets no assist.

On a real `800 kg` dynamic support, fair world-external vs reciprocal comparison must preserve the same **support-relative** granted agency:

- world-external `J=M_player × Δv_rel`;
- reciprocal `J=M_reduced × Δv_rel` with equal-and-opposite support recoil.

An isolated free player+support pair is then almost exactly Galilean-equivalent in relative/contact/posture behavior. With zero player damping the match is near machine precision; canonical `0.015` player damping breaks it by only about `0.006%` of the granted pulse over one second.

> **Support-relative agency and reaction placement are distinct design variables, and an isolated free player+support pair cannot choose placement.**

Ledger: [`E12_GRADED_CAPACITY_ENTITLEMENT.md`](E12_GRADED_CAPACITY_ENTITLEMENT.md).

### E13 — genuine world coupling discriminates placement, but late engagement is not neutral

E13 introduced an external world reference while preserving the E12 fair support-relative placement contract.

#### Representation qualification

- Direct tangent wall contact failed inactive representation and remains negative/confounded provenance.
- A corrected prismatic unilateral world stop passed isolated binding after removing a source-confirmed `fixedRotation` harness conflict.
- The free-prismatic `800 kg` support passed embodied inactive representation.
- Enabling the zero-gap stop at a **quiet settled state** was passive-neutral.

#### Genuine world-coupled one-step discrimination

E13.1a factorial `{world-external, reciprocal} × {stop OFF, ON}` delivered the same support-relative grant before solve.

Stop-isolated wider-world effect:

- world-external: approximately `0 N·s`;
- reciprocal: **`33.177096 / 33.177056 N·s`**.

> **A genuine external reaction path ends the isolated Galilean ambiguity: reaction placement becomes physically observable.**

#### Intermittent reaction path

A second-pulse persistence probe did not qualify its own lower-boundary crossing: RELEASE crossed only about `56–60 µm` versus the predeclared `100 µm` discrimination scale.

This is a protocol miss, not a persistence verdict. It also shows that the unilateral reaction path behaves like a real intermittent contact: the first reaction can move the support into the allowed side.

#### Bounded current31 trajectory

With a fixed lead8 + 11-frame current31 command trajectory, reciprocal stop ON produced about **`153–174 N·s`** more wider-world ramp momentum effect than reciprocal stop OFF.

But the stop also generated about **`56.8 / 68.6 N·s`** ON−OFF world effect during lead8 **before translational authority began**.

This exposed the decisive confound: the world reference was already participating in posture mechanics.

#### Prepared-state engagement boundary — MATERIAL / MATERIAL

E13.2b prepared two identical free-prismatic systems through exact lead8 with no translational authority, then at the actual current translation gave both the same limit geometry and enabled the lower stop only in the candidate.

The API transition itself was mutation-free. One subsequent identical internal posture solve produced:

- differential world impulse **`80.793918 N·s`** in one mirror;
- **`72.348356 N·s`** in the other;
- material relative/support/angular-velocity changes beyond previously-paid representation/transition bands.

No authority pulse, arbitrary gap, body reset or support reset existed.

> **Quiet-state neutrality does not imply active-state neutrality. Engaging the external world relation after physical preparation is itself a large physical event because the support already has world-relative state.**

Therefore:

> **Do not create a reciprocal world reaction path after the fact and call it neutral plumbing. Once external coupling is real, reaction placement is inseparable from environmental contact history/topology.**

This does **not** reject reciprocal mechanics in a naturally world-braced situation, and it does not select world-external authority for production.

Ledger: [`E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md`](E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md).

## 5. Runtime / smoke consequence

Runtime remains unchanged:

- normal URL: A‴ / Donor v1;
- Donor v0/A″ frozen;
- E3.1 public balance surface isolated;
- E3.2–E13 machine research only.

Durable positive research smoke now includes the E13 closure set:

- E13.0b corrected prismatic world-stop binding;
- E13.0c1 embodied free-prismatic representation;
- E13.0d quiet embodied stop neutrality;
- E13.1a world-coupled placement factorial;
- E13.2a bounded current31 world-coupled trajectory;
- E13.2b prepared-state engagement boundary.

E13.0a wall variants and E13.1b second-pulse persistence remain executable negative/confounded/protocol-miss provenance outside mandatory green smoke.

Earlier negative/confounded E7.2, E8.1, E9.0b, E10.1, E11.0a, E11.2a and first E12.1a also remain provenance rather than artificial PASSes.

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
- Lower physical impulse is not automatically masking; relative demand matters.
- Binary contact / positive-impulse gating is not sufficient anti-masking for world-external residual authority.
- A graded physical-capacity entitlement is qualified research evidence for canonical current31/current36, not a production formula.
- Support-relative agency and reaction placement are distinct variables; compare placement with fair reduced-mass accounting.
- An isolated free player+support pair cannot meaningfully choose world-external versus reciprocal placement by local relative/contact/posture behavior.
- Genuine external world coupling can make reaction placement materially observable.
- **Quiet world-reference engagement can be neutral while engagement after physical preparation is materially non-neutral. State history matters.**
- **Do not manufacture an external reaction path at authority time and then treat it as causally invisible.**
- Reciprocal mechanics are not rejected; if the world carries reaction, the environmental coupling must be naturally present and evaluated as mechanics/gameplay.
- Physical purity is not the goal; causal honesty and gameplay value are.
- Complexity must earn information or gameplay value.
- Confounded harness failures are corrected causally, not counted as physical failures or silently tuned away.

## 7. Current highest-value unknown

E13 exhausts the immediate “add a genuine world reference so placement can be distinguished” question.

The next useful research question is narrower and more ecological:

> **Which naturally present environmental relationships should legitimately carry player-authority reaction, and when should accepted agency remain explicitly controller/world-external instead?**

A useful next specimen should have the external coupling **already present independently of the authority command**. Candidate families include:

- a support already braced/anchored by the level before player intent;
- an externally driven support;
- a third-body/environment contact with its own causal history.

Do not create a stop exactly at the current support position merely to harvest reaction. Do not choose a wall gap, spring stiffness, support mass or clutch timing to force a preferred architecture.

The purpose of the next stage is not momentum purity. It is to discover **reaction ownership that is causally honest, mechanically legible and potentially valuable to gameplay**.

A genuinely new physical support mechanism remains admissible if it introduces a capability E6–E10 did not already exercise. More anatomy is not the default.

## 8. Validation / provenance hygiene

Canonical validation command:

`npm run smoke`

Split suites:

- `npm run smoke:research`;
- `npm run smoke:donor`.

Suite membership lives in `scripts/smoke-suite.mjs`.

Important rule:

> **A failed research experiment may remain executable provenance without belonging to permanent green smoke.**

At E13 closure the experimental research branch contains no runtime/Donor/source promotion; only E13 research scripts, smoke membership and closure documentation differ from the E12 canonical base.

Before continuing from a future conversation:

1. verify live `main` SHA and CI;
2. read this file;
3. read [`E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md`](E13_WORLD_COUPLED_AUTHORITY_PLACEMENT.md);
4. inspect branch/history only if needed for evidence or provenance;
5. do not automatically resume E13 stop variants.