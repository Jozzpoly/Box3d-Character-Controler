# Project state — Embodied Player Laboratory

Grounded: **2026-09-05, after E17-depth Owner closure, E18.0 intent/proxy qualification and P3.0 mechanical qualification; P3.1 prepared as the next Owner-facing probe**

This is the compact canonical orientation layer. Before any future write, re-fetch live `main` and exact SHA. Recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- E14 narrow contextual tuning is closed by Owner judgement; its causal evidence remains provenance.
- E15 established a bounded body-response → player-consequence bridge but the passive torso was judged too gameplay-irrelevant.
- E16 established capability-first embodiment and useful manipulation mechanics, but end-effector-first control was judged far too awkward.
- **E17 intent-first physical manipulation** remains the strongest Owner-positive manipulation direction and is preserved as **P1 — one-point chaos baseline**.
- **E17-depth** is a mechanically legitimate local correction, but Owner could not reliably distinguish it from E17 in blind/free play after several minutes. Preserve it as technical executor evidence, not as a gameplay winner.
- **E18.0** qualified the persistent 3D manipulation-intent boundary: no frozen click plane, explicit screen/depth deltas, camera observation separated from command, Donor `character.position` as the current transport origin, and no naive pre-solve carrier prediction.
- **P3.0 — coupled two-point mechanics is mechanically qualified.** It demonstrated deliberate position + axis control under one shared finite authority budget while preserving mass cost, contact failure, release momentum, a real free-twist DOF and bounded player-side reaction through E15.
- **P3.1 is the current Owner-facing experiment**, not the new default player. It stages E17-like rough one-point manipulation with a temporary coupled two-point precision/orientation clutch and explicit depth control.
- The next unresolved questions are gameplay questions: whether P3.1 is easier and more generative, whether free twist is useful or irritating, whether recoil is readable/fun, and whether the clutch avoids recreating E16-style micromanagement.

Publication preparation base:

- canonical `main` at preparation time: `f8c4126f3f6a32eb80a0d87349e8d2e75e02438a`;
- publication branch: `publication/e18-p3-owner-probe`;
- P3.0 mechanical qualification branch checkpoint before closure docs: `f3bbae48d9db51848307fc034f872d65edc4b635`;
- P3.1 interaction branch qualified build: `f7e15d2f3e8815b6fd8091f4b523fe8b9f30d62d`;
- that P3.1 checkpoint passed branch diagnostics, historical/current smoke and Vite build.

After merge, **live `main` + exact workflow/Pages state is authoritative**. Do not infer the final merge SHA from this prose.

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

E13 durable rule remains:

> **Do not create an external reaction path at authority time and then call it causally neutral plumbing.**

## 4. Durable E14 → E17 lesson

E14 showed that a more physical representation can still lose when it removes too much agency or strategy space.

E15 preserved Donor traversal but the physical torso mostly reacted after the interesting player action had already happened.

E16 gave a solver-owned subsystem a deliberate capability, but Owner attention became dominated by operating the subsystem itself.

E17 reset the abstraction boundary:

> **high-level player/object intent first → finite physical execution second**

Owner free play then shifted toward deliberate world experimentation. One capability generated lift, carry, drag, swing, throw, leverage, pile/stack attempts, object↔object interaction and persistent scene history.

Durable lesson:

> **Embodiment should add useful verbs and consequences without forcing the player to micromanage low-level physics merely to express intent.**

## 5. E17 — P1 one-point chaos baseline

Interaction contract:

> **select nearby dynamic object / exact surface point → express target intent → finite physical actuator attempts it**

The object is not teleported. Finite impulse acts at the selected point and equal/opposite reaction acts on the finite physical core.

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

> **E17 does not prove the manipulator is good. It proves the intent-first abstraction is promising enough to generate play despite a bad executor.**

Preserve E17 as **P1 — one-point chaos baseline**.

## 6. E17-depth — bounded correction, Owner-closed

E17-depth preserves E17 grammar, acquisition/release, reach and the `900 N` cap. Only requested impulse accounting changes to directional rigid-body point effective mass including rotational inertia.

Machine evidence establishes a real local mechanical distinction. Owner blind/free comparison on 2026-09-05 found the difference too subtle to identify reliably after several minutes.

Therefore:

> **E17-depth is mechanically valid but gameplay-insufficient as a local refinement.**

Do not repeat that Owner A/B or call E17-depth a gameplay winner.

## 7. Self-lift / authority debt

Standing on a manipulated dynamic object can let the closed player↔object system lift itself through the hybrid Donor/manipulation authority arrangement.

Current classification:

- **generative exploit** — funny and potentially valuable play;
- **authority exploit / causal debt** — not yet physically legitimized.

Do not remove it merely because it is an exploit during exploratory work. Also do not call it physically valid merely because it is fun.

## 8. E18 qualified architecture boundary

### E18.0 — persistent 3D manipulation intent

Qualified rules for the current hybrid architecture:

1. manipulation intent is explicit persistent 3D state, not an absolute frozen click-time drag plane;
2. camera motion alone does not mutate the target;
3. explicit screen/depth input changes intent incrementally using the current camera basis;
4. high-level transport origin is Donor `character.position`, not raw physical `bodyPosition`;
5. transport follows **realized** Donor displacement at normal update boundaries;
6. the known within-outer-step phase separation remains explicit debt;
7. do not hide it with pre-solve velocity prediction;
8. reach, force, saturation and physical failure remain downstream executor concerns.

### P3.0 — coupled two-point mechanics

P3.0 solves two point constraints as **one coupled rigid-body task**, not two independent E17 springs. A single shared authority cap applies:

`|J1| + |J2| <= 900 N * dt`

Qualified evidence includes:

- separated two-point operator rank `5` — translation + one deliberate axis, with twist around that axis unowned;
- strong axis control under the same authority scale where one-point control cannot own orientation;
- mass/inertia still increase saturation and execution cost;
- static world contact can defeat the requested task without teleportation;
- release preserves momentum;
- free twist is a real null DOF, not solver self-excitation;
- real E15 follow/feedback keeps the physical core bounded while translating manipulation reaction into material Donor recoil.

Detailed canonical provenance:

[`E18_P3_MECHANICAL_QUALIFICATION_2026-09-05.md`](E18_P3_MECHANICAL_QUALIFICATION_2026-09-05.md)

Do **not** silently add full quaternion/twist ownership or tune recoil away from headless metrics alone.

## 9. Current frontier — P3.1 Owner interaction probe

P3.1 combines already-qualified components into one deliberately larger gameplay delta:

- **rough/default:** E17-depth-equivalent one-point finite manipulation;
- persistent incremental screen-plane translation without frozen-plane drift;
- explicit depth channel;
- temporary **precision/orientation clutch** that promotes the hold to the P3 coupled two-point executor;
- automatically derived second virtual anchor — no second click and no literal two-hand simulation;
- precision entry captures current physical pose, avoiding target snap;
- precision exit resumes rough mode at the current physical primary anchor without zeroing momentum;
- free twist remains free;
- one shared `900 N` authority scale remains;
- mass, contact failure, recoil and release consequences remain physical;
- Owner-facing visuals expose grip, target/proxy, precision axis and saturation;
- an orientation yard adds a long beam/gate, shelf/cubby, heavy slab, stacking pieces and bridge-placement affordances.

Provisional desktop mapping:

- `LMB hold` — acquire / manipulate / release;
- pointer while rough — translate target in the current camera plane;
- wheel while holding — explicit depth; wheel zooms camera when not manipulating;
- `Ctrl` while holding — precision/orientation clutch;
- pointer while `Ctrl` is held — rotate the target axis instead of translating;
- `RMB` — camera orbit and does not silently mutate manipulation intent.

Detailed interaction boundary:

[`E18_P3_1_OWNER_INTERACTION_CONTRACT_2026-09-05.md`](E18_P3_1_OWNER_INTERACTION_CONTRACT_2026-09-05.md)

### Owner question

> **Does this let you manipulate the world more deliberately without making manipulation itself the chore?**

Useful observations include, without turning free play into a checklist:

- whether depth feels immediately understandable;
- whether rough mode preserves the fun/chaos of E17;
- whether precision feels like a useful clutch rather than operating a subsystem;
- whether the uncontrolled twist creates useful physical looseness or mostly frustration;
- whether recoil creates strategy/fun or merely loss of control;
- whether orientation-dependent objects create genuinely new strategies;
- whether switching rough ↔ precision becomes natural after a few minutes.

### Stop rule

Do **not** resume a long headless tuning series before Owner evidence. Reopen mechanics only if the Owner build exposes a concrete causal failure that current P3.0 evidence cannot explain.

Do not promote P3.1 to default merely because CI is green.

## 10. Workflow / maintenance state

Canonical workflow policy remains in [`WORKFLOW.md`](WORKFLOW.md).

Important rules:

- `main` is canonical/public truth;
- dependencies are reproduced with Node `22.23.2` + committed lockfile + `npm ci`;
- `npm run smoke` preserves foundation/historical regression;
- `npm run smoke:current` protects promoted/current experimental runtime boundaries, including one representative P3.1 lifecycle regression;
- heavy branch-local diagnostics remain research provenance rather than permanent canonical CI;
- negative/confounded experiments remain evidence and need not be converted into permanent green tests;
- separate playground/map work remains a parallel lane and must not contaminate E18 manipulation causality;
- Owner attention is reserved for qualitative gameplay deltas, not subtle mechanistic A/Bs.
