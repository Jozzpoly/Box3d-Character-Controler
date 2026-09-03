# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after Owner-selected E14 pin qualification and bounded braking-ablation evidence**

This is the compact canonical orientation layer. Detailed stage provenance remains in the E14 ledger and the post-PIN checkpoint. Before any future write, re-fetch live `main` and exact SHA; recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 does **not** promote new mechanics into Donor/default runtime.
- Public experimental routes remain:
  - `?mode=e14` / `?mode=reaction` — E14.0 reaction-placement surface;
  - `?mode=e14lab` / `?mode=contextual` — E14.1C pinned-boundary Owner instrument.
- E14.1C runtime/publication gates remain PASS.
- Owner has now selected a concrete E14 specimen during public play.
- Exact generic machine qualification of that specimen passed without tuning.
- A one-variable `braking 36 → 3` causal ablation shows that the Owner pin's braking asymmetry materially changes deterministic Natural-only posture/contact trajectories.
- This does **not** yet establish boundary skill, a production controller or a preferred braking value.
- Current action is **Owner A/B play: exact pin vs symmetric-braking ablation**.

Current post-PIN checkpoint:

[`E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md`](E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md)

Earlier detailed E14 stage ledger:

[`E14_CONTEXTUAL_AUTHORITY_LAB.md`](E14_CONTEXTUAL_AUTHORITY_LAB.md)

Its final pre-PIN `STOP FOR OWNER / no specimen selected` statement is historical after this checkpoint and must not override the newer current state.

Current hard stop:

> **Owner pin selected and exact-qualified; braking asymmetry is a proven deterministic causal lever in this specimen, but its gameplay meaning remains unresolved. STOP FOR OWNER A/B.**

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

Relevant reference values:

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

Do not silently weaken accepted `31/36` to make embodiment easier. The Owner-selected E14 specimen's `a=3` is an experimental lab configuration, not a Donor/reference change.

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

Finite support-mediated posture established a real embodied struggle. `FALL` remains valid historical failure of the E3/E4 balance objective. For future player gameplay, loss of upright posture need not necessarily mean permanent loss of agency.

### E4 — locomotion/posture compatibility

Preparation can physically help finite posture coexist with current-strength launch/braking. Historical `lead8` is a foresight oracle, not a gameplay timing contract. Preparation-only testing later showed that hidden target freezing can oppose translation already generated by the body.

### E5–E12 — authority accounting and graded entitlement

Research separated physical/contact contribution from supplemental authority, rejected weak binary eligibility, qualified graded capacity entitlement in bounded cases, and separated **support-relative agency** from **reaction placement**.

### E13 — wider-world coupling

Durable rule:

> **Do not create an external reaction path at authority time and then call it causally neutral plumbing.**

If the wider world carries reaction, that physical/gameplay coupling must already arise naturally from the situation and retain its history/consequences.

### E14.0 — Owner-readable placement

Owner distinguished world-external wind-like acceleration from reciprocal support recoil. This rejected global scenario-named reaction modes as a long-term controller architecture, but selected no production policy.

### E14.1B — continuous lab + Owner play

Corrected E14.1 uses the exact sagittal E4/E12 representation: motion world `Z`, ankle/balance world `X`, qualified `0.34 m` sagittal foot half-length.

At reference no-lead settings Natural strongly under-delivers accepted agency; External and Reciprocal recover nearly identical local support-relative agency; finite-body specimens can still fall. The immediate tension remained **agency demand ↔ finite embodied capacity**.

Owner's spontaneous mobile play then became unscripted tuning/exploration, producing the first meaningful evidence that E14 can behave like a primitive physical toy. Competing explanations remained boundary/competence play, tuning/experimentation, slapstick/novelty, world/affordance proxy and missing strategy repertoire.

### E14.1C — pinned-boundary instrument

E14.1C added versioned specimen serialization/identity, PIN / clean RESTORE / LOCK, URL-shareable configs, finite telemetry contracts and a generic exact-specimen qualifier. Runtime was published through PR #29 at `b6589decb120567aa16deb0bb90d78a05d2328ec`; exact-main workflow `33811769614` passed build and Pages deployment. Docs closure PR #30 produced pre-PIN canonical state `a92690e0eaa6a6f8597eed65f94b8a3b2fc7ca08`.

E14.1C did not change the authority kernel, continuous physics sim, balance organism or Donor/default mechanics.

## 5. Owner-selected specimen — current frontier

Owner-selected canonical config:

`e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only`

ID:

`E14C1-261a1519`

Owner judgement after play: still far from a player, but slow progress is perceptible and there may be a small promising signal. This is value/feel evidence only.

Important semantics:

- support mass `1180 kg`;
- friction `.65`;
- acceleration `3`;
- braking `36`;
- max balance torque `1000 Nm`;
- policy `natural-only`.

Machine did not choose or optimize this config.

## 6. Exact specimen qualification — PASS within machine scope

Evidence branch:

`experiment/e14-owner-pin-1180-065-3-36-1000`

Qualification commit:

`e231be4a02de1e57ee2ea99da09aeb1c89979737`

Workflow `33813566783` — SUCCESS.

Artifact `9915719258`.

Verdict:

- no-input: `SANE`;
- reset determinism: PASS / delta `0`;
- repeated trace determinism: PASS / delta `0`;
- input differentiation: `INPUT_DIFFERENTIATED`, all `6/6` declared pairs differentiated;
- finite/current telemetry passed.

This rejects easy numerical-chaos/non-repeatability explanations under the declared apparatus. It cannot emit FUN/SKILL PASS.

## 7. Braking-asymmetry causal probe — PASS as sensitivity evidence

Source semantics matter: with `natural-only`, supplemental translational authority grant is zero, but target-relative-velocity logic still produces `desiredAcceleration`; posture maps that to `targetLean = atan2(desiredAcceleration, gravity)`.

For the Owner pin:

- `a=3` → target lean about `8.53°`;
- `b=36` release/reversal phase → target lean up to about `60.95°`;
- with `kp=1600` and `t=1000`, the strong braking transient can saturate the balance actuator.

Bounded ablation changed only `b=36 → b=3`.

Ablation canonical config:

`e14c1|s1|m=1180|f=0.65|a=3|b=3|t=1000|p=natural-only`

ID:

`E14C1-6d63bdef`

Final evidence head `d5a6fcaed7b5c07d9947388316b8252cbb830e95`; workflow `33813784471` SUCCESS; artifact `9915781223`.

All four tap/hold × release/reversal trajectories differentiated, while repeated runs of both variants remained deterministic with worst sample delta `0`.

Representative longer evidence:

- hold→release max abs relative velocity: pinned `~1.184 m/s`, symmetric brake `~0.621 m/s`;
- hold→reversal: pinned `~1.409 m/s`, symmetric brake `~0.621 m/s`;
- pinned had brief support-loss frames in these longer traces (`2` / `3`), symmetric brake had `0`;
- max torso lean remained similar rather than simply increasing (`~15.28°` pinned vs `~15.79°` symmetric in hold→release).

Therefore braking asymmetry is a real deterministic causal lever in command timing, torque saturation, support/contact response and trajectory. This does **not** establish whether that lever is desirable embodied control or an accidental posture kick.

## 8. Current hypothesis boundary

Current best model:

> **Mild `a=3` builds motion/posture; release/reversal under `b=36` produces a much stronger counter-posture transient; with `t=1000` this can become a physically mediated catch/counter action.**

Because the specimen is `natural-only`, observed support/player translation in this probe is not produced by supplemental authority grant.

Two live interpretations remain:

1. a useful state-dependent physical action and seed of boundary/competence play;
2. an interesting but synthetic posture kick created by the velocity-target braking contract.

Owner hands-on A/B is required to separate them.

## 9. Instrumentation provenance correction remains binding

Historical workflow `33802322554`, artifact `9911568231`, head `b858bf48e300b8c9297cd22ac86357f658fedccc` has invalid E14.1d body-lean phase summaries because its consumer read stale `signedLeanX` while the corrected sagittal sim emitted `signedLean`. This is an observation/tooling defect, not a physics negative.

Corrected evidence began at commit `4b70cbf6e37566c357c84eed87a67ce9b2310d01`, workflow `33811359560`, artifact `9914925276`, schema `e14-1d-corrected-sagittal-telemetry-v2`.

Do not rewrite historical evidence classes.

## 10. Current Owner protocol

Exact A/B only; no parameter sweep:

- **A — Owner pin:** `m=1180, f=.65, a=3, b=36, t=1000, natural-only`;
- **B — symmetric-braking ablation:** identical except `b=3`.

Owner should play both spontaneously rather than follow an ideal timing script or target success rate.

Primary questions:

- does the interesting catch/counter feel weaken or disappear in B?;
- is A used through state-reading/correction or mostly through a reusable release/reversal kick?;
- does B retain an interesting action-space?
- after returning to A, is the difference legible and intentionally usable?

Analyse recording and spontaneous feedback before selecting any next mechanics experiment.

## 11. Hard stop / next action

Current execution has reached:

> **Owner pin selected and exact-qualified; braking asymmetry is causally active, gameplay meaning unresolved.**

**STOP FOR OWNER A/B.**

Do not yet:

- tune braking or torque toward a preferred value;
- automatically run a torque ablation;
- start World Transfer;
- start Strategy Repertoire;
- change or promote Donor/default runtime;
- promote Natural-only;
- claim H1 boundary skill as established.
