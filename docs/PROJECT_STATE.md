# Project state — Embodied Player Laboratory

Grounded: **2026-09-03, after Owner braking A/B and machine-qualified one-property World Transfer preparation**

This is the compact canonical orientation layer. Detailed provenance lives in the E14 stage ledger and current checkpoint docs. Before any future write, re-fetch live `main` and exact SHA; recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 has **not** promoted new mechanics into Donor/default runtime.
- Public experimental routes remain:
  - `?mode=e14` / `?mode=reaction` — E14.0 reaction-placement surface;
  - `?mode=e14lab` / `?mode=contextual` — E14.1C pinned-boundary Owner instrument.
- E14.1C runtime/publication gates remain PASS.
- Owner-selected specimen:
  - `e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only`
  - ID `E14C1-261a1519`.
- Exact generic machine qualification passed without tuning.
- Bounded `b=36 → b=3` ablation proved braking asymmetry is a deterministic causal lever.
- Owner A/B now gives that lever gameplay meaning: `b=36` feels faster to recenter, more controllable, stiffer/livelier and allows better manipulation of the current one-leg locomotion; `b=3` feels like a flexible stick that continues bending/swinging.
- This supports a **seed of boundary/competence play**. It does not establish a good player controller or production mechanics.
- The next bounded test is a one-property World Transfer: support mass `1180 → 800 kg`, with all controller fields unchanged.
- The transfer specimen is machine-qualified and now awaits Owner play.

Current World Transfer checkpoint:

[`E14_WORLD_TRANSFER_MASS_2026-09-03.md`](E14_WORLD_TRANSFER_MASS_2026-09-03.md)

Owner-pin causal checkpoint:

[`E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md`](E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md)

Earlier E14 stage ledger:

[`E14_CONTEXTUAL_AUTHORITY_LAB.md`](E14_CONTEXTUAL_AUTHORITY_LAB.md)

Earlier `STOP FOR OWNER A/B` statements are historical after this state.

Current hard stop:

> **Owner A/B supports the high-braking variant as an intentionally useful control-quality lever in the current organism; one-property mass transfer `1180 → 800 kg` is machine-qualified. STOP FOR OWNER WORLD TRANSFER.**

Do not automatically proceed to friction transfer, Strategy Repertoire, replay infrastructure, recovery controller or Donor promotion.

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

Do not silently weaken accepted `31/36` to make embodiment easier. The current E14 Owner specimen's `a=3`, `b=36`, `t=1000` are experimental lab values, not Donor/reference changes.

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

At reference no-lead settings Natural strongly under-delivers accepted agency; External and Reciprocal recover nearly identical local support-relative agency; finite-body specimens can still fall. Owner spontaneous play then turned the lab into a primitive physical toy and motivated the pinned-boundary probe.

### E14.1C — pinned-boundary instrument

E14.1C added versioned specimen serialization/identity, PIN / clean RESTORE / LOCK, URL-shareable configs, finite telemetry contracts and a generic exact-specimen qualifier. Runtime was published through PR #29 at `b6589decb120567aa16deb0bb90d78a05d2328ec`; exact-main workflow `33811769614` passed build and Pages deployment. Docs closure PR #30 produced pre-PIN canonical state `a92690e0eaa6a6f8597eed65f94b8a3b2fc7ca08`.

E14.1C did not change the authority kernel, continuous physics sim, balance organism or Donor/default mechanics.

## 5. Owner-selected specimen — qualified

Canonical config:

`e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only`

ID: `E14C1-261a1519`

Qualification evidence:

- branch `experiment/e14-owner-pin-1180-065-3-36-1000`;
- commit `e231be4a02de1e57ee2ea99da09aeb1c89979737`;
- workflow `33813566783` — SUCCESS;
- artifact `9915719258`.

Machine verdict:

- no-input `SANE`;
- reset determinism PASS / delta `0`;
- repeated trace determinism PASS / delta `0`;
- input differentiation `6/6` declared pairs;
- finite/current telemetry.

This rejects easy numerical-chaos/non-repeatability explanations. It cannot prove skill/fun.

## 6. Braking A/B — causal + Owner-readable result

Ablation changed only `b=36 → b=3`:

`e14c1|s1|m=1180|f=0.65|a=3|b=3|t=1000|p=natural-only`

ID: `E14C1-6d63bdef`.

Machine evidence:

- evidence head `d5a6fcaed7b5c07d9947388316b8252cbb830e95`;
- workflow `33813784471` — SUCCESS;
- artifact `9915781223`;
- all four tap/hold × release/reversal comparisons differentiated;
- both variants deterministic with worst repeated delta `0`.

Under `natural-only`, supplemental translational grant is zero, but `acceleration` / `braking` still shape target-relative-velocity; its derivative drives `targetLean`. Therefore `a=3 / b=36` is also a posture-response asymmetry.

Owner A/B result after direct locked comparison:

- `b=36` returns toward useful position faster;
- gives more control;
- improves the current one-leg walking/manipulation;
- feels stiffer, livelier and more energetic;
- `b=3` feels like a flexible stick.

Comparative video (~31.1 s) contains the high-braking pin first and the `b=3` ablation later. Visual review is consistent with the Owner report: `b=36` repeatedly produces short usable catches near upright; `b=3` more often continues through upright into larger opposite excursions. This is supportive observational evidence, not a standardized trace.

Current interpretation:

> **The braking asymmetry is not merely a numerical perturbation or spectacle knob; Owner can intentionally read it as control quality and use it to manipulate the embodied state.**

This supports a seed of H1 boundary/competence play, but does not establish a final controller.

Important architecture warning: the current labels `acceleration` / `braking` are semantically overloaded in Natural-only. They act partly as posture-command response rates. Do not promote those names/contracts into a final player API yet.

## 7. One-property World Transfer — machine-qualified, Owner pending

Question:

> **Does the same learned controller remain usable when the support reacts differently, and does Owner adapt to that changed physical consequence?**

Only support mass changes:

### Familiar world

`e14c1|s1|m=1180|f=0.65|a=3|b=36|t=1000|p=natural-only`

`E14C1-261a1519`

### Transfer world

`e14c1|s1|m=800|f=0.65|a=3|b=36|t=1000|p=natural-only`

`E14C1-f315bc9d`

The `800 kg` value is the existing E14 reference support mass, not a tuned optimum.

Machine prequalification:

- branch `experiment/e14-world-transfer-mass-800`;
- head `f5079a99521f974354ef370454032f5148a1b204`;
- workflow `33814965049` — SUCCESS;
- artifact `9916199522`.

Both variants are `SANE`, deterministic (`delta=0`), finite and input-differentiated.

Representative `longerHold`:

- `1180 kg`: support velocity `-0.01826 m/s`, player velocity `0.26818 m/s`, max lean `9.700°`;
- `800 kg`: support velocity `-0.02592 m/s`, player velocity `0.25807 m/s`, max lean `9.747°`.

Thus the lighter support reacts more strongly while body/local-response geometry remains recognizably similar. This is the intended transfer rather than a broken second specimen.

Friction remains `.65`; do not vary it in the same test.

## 8. Current Owner protocol

Exact two-world comparison; no tuning:

- A — familiar `1180 kg` support;
- B — transfer `800 kg` support;
- all other fields remain `f=.65, a=3, b=36, t=1000, natural-only`.

No ideal rhythm or target success rate.

Primary evidence:

- whether the one-leg walking/catch action survives at all;
- whether Owner spontaneously changes timing/correction after feeling stronger support recoil;
- whether the change reads as a world property rather than arbitrary controller damage;
- whether performance/control improves again after adaptation;
- whether returning to `1180 kg` makes learned timing differences immediately legible.

Strong positive evidence is **adaptation**, not equal performance.

## 9. Instrumentation provenance correction remains binding

Historical workflow `33802322554`, artifact `9911568231`, head `b858bf48e300b8c9297cd22ac86357f658fedccc` has invalid E14.1d body-lean phase summaries because its consumer read stale `signedLeanX` while the corrected sagittal sim emitted `signedLean`. This is an observation/tooling defect, not a physics negative.

Corrected evidence began at commit `4b70cbf6e37566c357c84eed87a67ce9b2310d01`, workflow `33811359560`, artifact `9914925276`, schema `e14-1d-corrected-sagittal-telemetry-v2`.

Do not rewrite historical evidence classes.

## 10. Hard stop / next action

Current stage:

> **Owner A/B supports `b=36` as an intentionally useful control-quality lever in the current one-leg organism. One-property support-mass transfer `1180 → 800 kg` is machine-qualified.**

**STOP FOR OWNER WORLD TRANSFER.**

Do not yet:

- sweep support mass;
- change friction simultaneously;
- retune braking or torque for `800 kg`;
- start Strategy Repertoire;
- add recovery mechanics;
- promote Natural-only/current lab values;
- change Donor/default runtime.
