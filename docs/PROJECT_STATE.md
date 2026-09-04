# Project state — Embodied Player Laboratory

Grounded: **2026-09-04, after public E15.1 deployment and exact-main verification**

This is the compact canonical orientation layer. Detailed experiment reasoning and evidence live in the linked stage documents. Before any future write, re-fetch live `main` and exact SHA; recorded SHAs are provenance, not permission to assume the repository has not moved.

## 0. Current snapshot

- Accepted public/default player remains **A‴ / Donor v1**.
- Accepted reference ground agency remains `31 m/s²` acceleration / `36 m/s²` braking.
- No E14 or E15 mechanics are promoted into Donor/default runtime.
- The E14 one-leg/contextual line is **closed by Owner judgement as exhausted for now**. Its causal evidence remains valid provenance.
- Current experiment is **E15.1 — Donor Agency / Physical Body Bridge**.
- E15.1 preserves normal Donor movement/repertoire and adds a separate finite Box3D upper-body consequence layer.
- E15.1 machine/causal qualification is PASS.
- E15.1 is publicly deployed as an opt-in route.
- Current action is **Owner free play on `?mode=e15`**.

Current publication / Owner boundary:

[`E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md`](E15_PUBLICATION_OWNER_BOUNDARY_2026-09-04.md)

Detailed E15 implementation/evidence checkpoint:

[`E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md`](E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md)

Latest E14 World Transfer checkpoint, now historical with respect to current action:

[`E14_WORLD_TRANSFER_MASS_2026-09-03.md`](E14_WORLD_TRANSFER_MASS_2026-09-03.md)

Earlier Owner-pin checkpoint:

[`E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md`](E14_OWNER_PIN_CAUSAL_CHECKPOINT_2026-09-03.md)

E14 stage ledger:

[`E14_CONTEXTUAL_AUTHORITY_LAB.md`](E14_CONTEXTUAL_AUTHORITY_LAB.md)

Current hard stop:

> **E15.1 publication is complete. STOP FOR OWNER E15 FREE PLAY.**

Do not automatically tune E15, add limbs/full ragdoll, change Donor/default mechanics, expand the ecology to manufacture interesting collisions, or return to E14 parameter sweeps.

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

Current design lesson from E14 → E15:

> **Agency already known to be fun is an asset to preserve, not noise that must be removed before embodiment can count.**

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
- support mass reference `800 kg`.

Do not silently weaken accepted `31/36` to make embodiment easier.

E12 research entitlement remains:

`q = clamp( μ × J_n~ / 25.3333, 0, 1 )`

within its qualified scope. It is not a production policy or universal support-quality metric.

E13 durable rule remains:

> **Do not create an external reaction path at authority time and then call it causally neutral plumbing.**

If the wider world carries reaction, that coupling must already arise naturally from the situation and retain its physical/history consequences.

Historical `lead8` remains a foresight oracle only, not gameplay timing.

## 4. Durable research lineage before E15

### E3 — finite posture

Finite support-mediated posture established a real embodied struggle. `FALL` remains valid historical failure of the E3/E4 balance objective. Loss of upright posture does not automatically imply that a future player must lose all agency.

### E4 — locomotion/posture compatibility

Preparation can help finite posture survive strong launch/braking. Later tests showed hidden target freezing can oppose translation already generated by the body. Do not reintroduce foresight as if it were ordinary gameplay control.

### E5–E12 — authority accounting

Research separated physical/contact contribution from supplemental authority, rejected weak binary eligibility, qualified bounded graded entitlement, and separated **support-relative agency** from **reaction placement**.

### E13 — wider-world coupling

World reaction cannot be manufactured only when authority needs it and then treated as neutral infrastructure. State history matters.

### E14.0 — Owner-readable reaction placement

Owner distinguished world-external wind-like acceleration from reciprocal support recoil. Global scenario-named reaction modes were rejected as a long-term controller architecture.

### E14.1 — continuous one-leg/contextual lab

E14 developed a finite sagittal body/support organism and public pinned specimen instrument. It established useful causal results:

- Natural-only under-delivers strong accepted agency at reference conditions;
- reaction placement materially changes world feel;
- support mass changes support recoil;
- Owner can read controller-response asymmetry as control quality;
- selected `b=36` was easier to catch/recenter than `b=3`;
- the lab could briefly become a primitive physical toy.

These results remain valid evidence. They do **not** imply that the one-leg representation is worth indefinite optimization.

## 5. E14 closure by Owner judgement

The strongest later Owner judgement was comparative:

> **the capsule/Donor controller still gave more fun and more possibilities than the best current E14 one-leg organism.**

Owner considered the current one-leg experiment largely exhausted for now.

This does not falsify E14's causal findings or the small supported seed of boundary/competence play. It changes the frontier:

- another support-mass/friction/braking/torque sweep is not the high-value question;
- the dominant limitation is the **restricted strategy/action repertoire of the representation itself**.

All earlier `STOP FOR OWNER WORLD TRANSFER` language is historical after this state.

## 6. Historical E2 lesson reused in E15

E2 showed that making the root solver-owned is not automatically a better embodied player. If responsive control and physical knockback fight over one velocity state, active braking can erase physical consequence almost immediately.

E15 therefore preserves the Donor split:

- **intent/current velocity** — responsive player-control channel;
- **external velocity** — physical consequence with its own decay semantics.

The objective is not to weaken Donor response. It is to keep a physical event alive long enough to matter without making normal control disappear.

## 7. E15 V0 representation

E15 starts from current Donor instead of replacing it.

Carrier retains:

- full camera-relative 2D movement;
- sprint;
- jump/coyote/buffer;
- air control;
- stairs;
- moving-support behavior;
- accepted Donor agency constants.

Physical body layer:

- separate Box3D dynamic upper-body box;
- target mass `35 kg`;
- half extents `[0.30, 0.42, 0.22] m`;
- vertical offset `0.72 m`;
- finite horizontal follow authority;
- finite upright torque;
- normal Box3D collisions with the world.

Scope is deliberately partial:

- horizontal + rotational embodiment are the research channels;
- vertical jump/traversal remains explicit carrier transport;
- `35 kg` torso is a consequence probe, not a whole-body `80 kg` momentum-equivalence claim.

## 8. E15 representation corrections

### 8.1 Vertical split

A shared finite 3D follow cap caused nearly `1 m` torso separation during Donor jump. This was not fixed by increasing actuator strength.

Representation was narrowed instead:

- vertical traversal = explicit carrier transport;
- horizontal follow = finite;
- rotation/upright response = finite.

### 8.2 Self-query isolation

Donor mover queries initially saw the E15 torso as an external dynamic obstacle and applied Donor reciprocity to the player's own body layer. E15 then misclassified that internal carrier↔body response as world consequence.

Fix:

- dedicated E15 embodiment collision category;
- carrier mover-query mask ignores that category;
- torso remains normally collidable by Box3D world physics.

After the fix, declared neutral Donor traces produce:

- root delta vs Donor: `0`;
- neutral body feedback: `0`;
- neutral horizontal torso offset ~`1.98e-6 m`.

## 9. Real body/world causality

A static bar above the Donor capsule envelope but inside the torso envelope was used in a three-world causal test:

1. pure Donor;
2. E15 feedback ON;
3. E15 feedback OFF.

Result:

- feedback-OFF root remained exactly Donor (`max delta 0`);
- torso genuinely contacted the bar;
- first hit produced ~`107.6 N·s` horizontal body response;
- active bridge transferred capped `52 N·s` consequence into the carrier.

Established bounded path:

> **world → solver-owned body → measured response → player consequence**

without changing Donor locomotion policy.

## 10. E15.1 — contact-episode consequence semantics

E15 V0 exposed a semantic failure: sustained wall reaction was accumulated into persistent `externalVelocity` every frame as if each frame were a fresh collision.

V0 overhead-bar trace:

- `31` consecutive contact frames;
- external velocity accumulated to ~`-4.60 m/s`;
- path deficit vs Donor ~`4.04 m`.

E15.1 changes only storage/classification of the already measured body response:

- every measured horizontal response still affects current carrier velocity;
- free-body response with no body contact remains persistent;
- first frame of a new contact episode may add persistent momentum;
- later frames in the same sustained contact are **current-only constraint response**.

The first impact remains unchanged:

- body response ~`107.6 N·s`;
- transferred impact `52 N·s`;
- initial external delta-v ~`-0.65 m/s`.

E15.1 same-bar trace:

- `11` contact frames;
- `1` contact episode;
- `1` persistent-impact frame;
- `10` current-only constraint frames;
- minimum external velocity ~`-0.65 m/s`;
- path deficit vs Donor ~`0.364 m`.

This is a semantic correction, not softer tuning.

## 11. Machine qualification

Detailed evidence:

[`E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md`](E15_DONOR_AGENCY_PHYSICAL_BODY_BRIDGE_2026-09-04.md)

Qualified PR head:

`d83e67bcea61d2b0fb362a76c49e26bd580970ce`

Exact PR-head workflow:

`33827423905` — SUCCESS

Representative qualified contracts:

- ordinary neutral Donor repertoire: root delta `0`;
- feedback-OFF exact browser path vs pure Donor: delta `0`;
- free `20 N·s` torso impulse produces ~`20 N·s` persistent consequence while feedback-OFF root remains unchanged;
- external consequence after 3 frames remains ~`0.226 m/s`;
- rotational perturbation peaks ~`1.82°`, respects finite torque cap and recovers;
- exact browser affordance ecology produces real torso contact and separated impact/constraint response;
- build PASS.

Machine evidence establishes declared mechanics/causal contracts only. It does not establish gameplay value.

## 12. Public E15.1 state

PR #33 merged E15.1 into `main`.

First published E15.1 main SHA:

`b8e2a2abc248000931b9093e2e9f0db435989d38`

Exact-main workflow:

`33827592660` — SUCCESS

Same run:

- mandatory mechanics smoke — SUCCESS;
- build — SUCCESS;
- Configure Pages — SUCCESS;
- Pages artifact upload — SUCCESS;
- deploy — SUCCESS.

Pages deployment identity:

- `pages_build_version`: `b8e2a2abc248000931b9093e2e9f0db435989d38`;
- Pages artifact: `9920519388`;
- artifact digest: `sha256:0d3ec7ae8d117edaee13f44b055c2ea1363da01d2dc42920934e7741f3bd6c4a`;
- deployment reported success;
- environment URL: `https://jozzpoly.github.io/Box3d-Character-Controler/`.

The exact deployed artifact contains:

- `assets/e15-hybrid-browser-DQi8qwPl.js`;
- bootstrap mapping `mode=e15 || mode=hybrid` to that E15 bundle;
- expected runtime identity `E15.1 · DONOR AGENCY + CONTACT-EPISODE PHYSICAL BODY`.

Primary Owner route:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=e15`

Alias:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=hybrid`

Diagnostic control:

append `&feedback=0` to disable body→carrier feedback while retaining the physical body representation.

## 13. E15 free-play ecology

The normal Donor playground remains available. E15 adds only three opt-in upper-body probes:

1. thin static beam ahead of spawn;
2. short torso-height canopy for sustained scrape/contact;
3. moving torso-height ram for timing/dodge/impact.

Visual split:

- **red capsule** = accepted Donor agency carrier;
- **gold box** = solver-owned physical torso.

The probes are not objectives and should not dictate Owner behavior.

## 14. Instrumentation provenance correction remains binding

Historical workflow `33802322554`, artifact `9911568231`, head `b858bf48e300b8c9297cd22ac86357f658fedccc` has invalid E14.1d body-lean summaries because its consumer read stale `signedLeanX` while corrected sagittal sim emitted `signedLean`.

That is an observation/tooling defect, not a physics negative.

Corrected evidence began at:

- commit `4b70cbf6e37566c357c84eed87a67ce9b2310d01`;
- workflow `33811359560`;
- artifact `9914925276`;
- schema `e14-1d-corrected-sagittal-telemetry-v2`.

Do not rewrite historical evidence classes.

## 15. Current Owner protocol

Play `?mode=e15` **spontaneously**.

Do not prescribe an ideal route, timing pattern or success metric.

Primary questions:

- does preserving full Donor agency avoid the E14 feeling of lost possibilities?;
- is the gold physical torso legible or merely visual clutter?;
- do impacts read as meaningful body/world consequences rather than arbitrary slowing?;
- does the body create anything Owner wants to deliberately exploit, dodge, recover from or repeat?;
- does recoil last long enough to matter without making control feel stolen?;
- is the red-carrier / gold-body seam promising, tolerable, or fundamentally too artificial?;
- most importantly: **is this more fun or more generative than plain Donor, not merely more physical?**

Recording is useful if spontaneous behavior becomes interesting, but it is not required to begin play.

## 16. Hard stop

Current stage:

> **E14's narrow one-leg line is closed by Owner judgement as exhausted for now. E15.1 is machine-qualified and publicly deployed as an opt-in hybrid preserving accepted Donor agency while adding a finite physical torso with contact-episode consequence semantics.**

**STOP FOR OWNER E15 FREE PLAY.**

Do not yet:

- replace or weaken Donor/default mechanics;
- tune torso mass, follow authority, upright torque, feedback gain or feedback cap;
- add limbs/full ragdoll merely because E15.1 is technically viable;
- expand the E15 ecology to manufacture success;
- claim whole-body momentum correctness;
- interpret machine/publication PASS as gameplay success;
- return automatically to E14 support-mass/friction/braking/torque sweeps.
