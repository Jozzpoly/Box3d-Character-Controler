# E15 — Donor Agency / Physical Body Bridge — 2026-09-04

Status: **E14 one-leg/contextual line is closed by Owner judgement as exhausted for now. E15.1 preserves accepted Donor agency while adding a separate finite physical upper-body consequence layer. Machine causality, contact semantics and the bounded browser ecology are qualified. Next boundary is Owner free play; no Donor/default promotion is authorized.**

## 1. Why E15 exists

The decisive Owner judgement after extensive E14 play was not that the best one-leg specimen was numerically broken. It was that the experiment had largely exhausted its possibilities:

- it was briefly interesting and produced a small amount of skill/tuning play;
- it remained far from a useful player;
- the accepted capsule/Donor controller still provided **more fun and more possibilities**.

That changes the research question.

E14 intentionally narrowed the action space to isolate finite posture/contact mechanisms. Continuing to tune `supportMass`, `friction`, `acceleration`, `braking` or `maxBalanceTorque` would now optimize a representation whose gameplay repertoire is itself the dominant limitation.

E15 therefore starts from the opposite side:

> **Preserve the agency/repertoire that already works; add physical consequence without requiring the player to surrender that agency first.**

The accepted/default Donor remains unchanged.

## 2. E15 V0 representation

Carrier:

- current A‴ / Donor v1;
- full camera-relative 2D movement;
- sprint;
- jump with existing coyote/buffer semantics;
- air control;
- stairs and moving-support behavior;
- accepted reference agency remains `31 m/s²` acceleration / `36 m/s²` braking.

Physical body layer:

- separate Box3D dynamic upper-body box;
- target mass `35 kg`;
- half extents `[0.30, 0.42, 0.22] m`;
- vertical offset `0.72 m` above Donor root;
- finite horizontal follow authority;
- finite upright torque;
- ordinary Box3D world collision participation.

Important scope boundary:

- **horizontal + rotational embodiment are the E15 V0 research channels**;
- vertical jump/traversal is explicit Donor carrier transport, not a claim of physically embodied jumping;
- the `35 kg` torso is a consequence probe, not a claim of whole-body `80 kg` momentum equivalence.

## 3. Separate intent and consequence velocity

Historical E2 established that simply making a root solver-owned is not enough. Responsive player control and physical knockback can fight over one velocity state; strong braking may erase consequence almost immediately.

E15 instead uses the Donor's existing split:

- commanded/current velocity remains the responsive intent channel;
- physical-body consequence can enter `externalVelocity`, which decays through the existing Donor external-drag semantics.

The purpose is not to make physical response unopposed forever. It is to avoid forcing ordinary responsive braking to erase a newly received physical impulse in the same tick.

## 4. First representation defect — vertical authority competition

The first bridge used one finite 3D follow cap for the torso.

During Donor jump, the physical body could separate vertically from its target by nearly `1 m` because the finite follow budget was consumed trying to reproduce traversal that E15 was not yet intended to physically solve.

This was not fixed by increasing actuator strength.

The representation was narrowed instead:

- vertical = explicit carrier transport;
- horizontal = finite body follow;
- rotation = finite upright response.

This preserves the experiment's actual question instead of smuggling a much harder physical-jump problem into the same actuator.

## 5. Second representation defect — carrier queried its own body as an obstacle

After the axis split, the neutral bridge still produced up to `52 N·s` body→root feedback and diverged dramatically from Donor despite no ordinary Box3D body contact.

Cause:

1. E15 measured torso velocity before the Box3D world step;
2. Box3D stepped;
3. Donor `super.postStep()` then ran its controller-owned mover queries;
4. those queries saw the E15 torso as an ordinary dynamic shape;
5. Donor dynamic-contact reciprocity pushed its own torso;
6. E15 misclassified that internal carrier↔body query response as external physical consequence.

Fix:

- dedicated `E15_EMBODIMENT_CATEGORY = 1n << 63n`;
- the torso keeps ordinary world-collision mask semantics;
- only the Donor carrier mover-query mask excludes the E15 embodiment category.

Thus:

> **carrier queries ignore its own body representation; the body remains physically present to the world.**

Fix commit:

`0590bf1f3fa7af8cb1e5f5acebb8d2b85eb37dcc`

After this fix, the generic neutral qualifier produced:

- worst Donor root delta: `0`;
- neutral horizontal body offset: about `1.98e-6 m`;
- neutral body feedback: `0`;
- no neutral tilt;
- body offset magnitude about `0.04924 m`, almost entirely the expected vertical gravity/transport equilibrium.

## 6. E15 V0 real world-contact causality

A dedicated causal diagnostic used three otherwise identical worlds:

1. pure Donor;
2. E15 feedback ON;
3. E15 feedback OFF.

A thin static bar was placed above the Donor capsule's vertical reach but inside the physical torso envelope.

Result:

- feedback-OFF remained **exactly Donor**: max root-state delta `0`;
- both E15 variants produced real torso contact with the bar;
- first body/world hit produced about `107.60 N·s` measured horizontal body response;
- feedback ON transferred a capped `52 N·s` response into the carrier;
- the active root materially diverged from Donor while the feedback-OFF root did not.

This establishes a genuine path:

> **world → physical torso → measured body response → carrier consequence**

without changing the underlying Donor traversal policy.

However V0 exposed a new semantic failure.

## 7. V0 sustained-contact failure

With the torso pressed against the bar, every frame of solver reaction was added to persistent `externalVelocity` as if it were a new independent knockback.

Observed in the declared overhead-bar trace:

- V0 body contact: `31` consecutive frames;
- first impact external delta-v: about `-0.65 m/s`;
- persistent external velocity accumulated to about `-4.60 m/s`;
- final path deficit relative to Donor: about `4.04 m`.

This is not random instability. It is a bookkeeping error in physical meaning:

> **a sustained contact force/constraint response was being integrated as repeated new momentum.**

The first impact is a plausible transient consequence. Continuing to press a body into a wall is not 30 fresh collisions.

## 8. E15.1 — contact-episode semantics

E15.1 changes only the storage/classification of the already measured body response.

Unchanged:

- Donor mechanics;
- torso geometry/mass;
- horizontal follow rate/cap;
- upright controller/cap;
- feedback gain;
- max feedback delta-v;
- world geometry.

New rule:

- every measured horizontal body response still affects **current carrier velocity**;
- body response with **no body contact** is a free external impulse and remains persistent;
- the **first frame of a new body-contact episode** may create persistent external momentum;
- subsequent frames of the same sustained contact are **current-only constraint response** and do not accumulate new persistent momentum.

Implementation:

`src/e15-contact-semantic-character.js`

## 9. E15.1 causal A/B result

Same overhead-bar trace, V0 vs E15.1:

### First impact

Identical:

- physics impulse: about `107.60 N·s`;
- feedback impulse: `52 N·s` cap;
- external delta-v: about `-0.65 m/s`.

The new semantics does **not** weaken the initial collision transient.

### Sustained contact

E15.1:

- contact frames: `11`;
- contact episodes: `1`;
- persistent-feedback frames: `1`;
- current-only constraint-feedback frames: `10`;
- minimum external velocity: about `-0.65 m/s`, not `-4.60 m/s`.

### Path consequence

- Donor final X: `10.3403 m`;
- V0 final X: `6.2993 m`;
- E15.1 final X: `9.9760 m`.

Path deficit vs Donor:

- V0: about `4.0409 m`;
- E15.1: about `0.3642 m`.

Interpretation:

> **E15.1 preserves a real impact and sustained contact resistance while removing frame-by-frame accumulation of fictitious persistent knockback.**

This is a semantic correction, not a softer parameter tune.

## 10. E15.1 generic bridge qualification

Declared E15.1 bridge smoke covers ordinary Donor repertoire plus isolated physical perturbations.

Neutral 2D/sprint/jump episode:

- worst root delta vs Donor: `0`;
- max neutral horizontal torso offset: about `1.98e-6 m`;
- max neutral feedback: `0`;
- contact episodes: `0`.

Free torso impulse:

- injected body impulse: `20 N·s`;
- measured body physics impulse: about `20.0000009 N·s`;
- persistent feedback impulse: about `20.0000009 N·s`;
- active root/external velocity: about `0.25 m/s`;
- feedback-OFF root/external velocity: `0`;
- external velocity after 3 frames: about `0.2262 m/s`.

Rotational perturbation:

- peak tilt: about `0.03175 rad` (`1.82°`);
- peak upright torque: about `315.74 Nm`;
- final tilt after recovery: effectively `0`;
- finite torque cap respected.

## 11. Bounded browser ecology

A barren floor would be a weak Owner test because the new physical channel would rarely be exercised.

`?mode=e15` therefore keeps the entire ordinary Donor playground and adds only three E15-specific upper-body affordances:

1. a thin static beam directly ahead of spawn;
2. a short upper-body canopy for sustained scrape/contact;
3. a moving upper-body ram for timing/dodge/impact play.

These occupy the narrow vertical band above the settled Donor mover capsule but inside the physical torso envelope.

Visual split:

- red capsule = accepted Donor agency carrier;
- gold box = solver-owned physical torso.

The ordinary/default playground is not modified.

Browser-affordance machine smoke on the direct spawn→beam path:

- feedback-OFF max delta vs pure Donor: `0`;
- active body-contact frames: `9`;
- persistent impact frames: `2` across `2` contact episodes in the exact playground ecology;
- current-only constraint frames: `6`;
- first impact physics response: about `84.85 N·s`;
- first transferred impact: `52 N·s`;
- max active body offset: about `0.1487 m`;
- final active path remains only about `0.33 m` behind the feedback-OFF/Donor trajectory in this bounded run.

The exact ecology therefore exercises the intended channel rather than merely rendering decorative geometry.

## 12. Evidence boundary

Experiment branch:

`experiment/e15-donor-physical-body-bridge`

Machine-qualified head at publication boundary:

`b451da5e7f10e7d29d3353e49e9e5e699ec75457`

Workflow:

`33827177763` — SUCCESS

Artifact:

`9920388010`

The artifact contains:

- `e15-hybrid-gate-diagnostic.json`;
- `e15-world-contact-causality.json`;
- `e15-contact-episode-semantics.json`;
- `e15-hybrid-bridge.json`;
- `e15-contact-semantic-smoke.json`;
- `e15-affordance-smoke.json`.

All pre-existing mandatory smoke and build steps also pass on the same head.

Machine evidence establishes:

- neutral Donor preservation in declared traces;
- isolated free-body consequence transfer;
- finite rotational embodiment;
- real body/world-contact causality;
- corrected sustained-contact storage semantics;
- functioning E15 browser affordances.

It does **not** establish:

- fun;
- superiority over Donor;
- useful embodiment in ordinary free play;
- whole-body physical correctness;
- production architecture;
- a reason to modify the accepted/default Donor.

## 13. Owner boundary

The next question is deliberately broad and gameplay-first:

> **With normal Donor movement still available, does the physical torso create interesting new consequences, decisions, recoveries, accidents or interactions that make the player more fun rather than merely more obstructed?**

Owner should play `?mode=e15` spontaneously.

Do not prescribe an ideal route or timing sequence. The beam/canopy/ram are probes, not objectives. The existing stairs, ramp, dynamic props and moving platform remain available for ordinary play.

Useful observations include:

- whether the physical body is immediately legible or just visual clutter;
- whether impacts feel like meaningful body/world events rather than arbitrary slowing;
- whether preserving full Donor agency avoids the E14 feeling of lost possibilities;
- whether the body creates anything Owner wants to deliberately exploit or avoid;
- whether free-body knockback persists long enough to matter but not so long that control feels stolen;
- whether the red carrier / gold body split reveals a promising architecture or an obviously artificial seam.

## 14. Hard boundary

Current stage:

> **E14's one-leg line is closed by Owner judgement as exhausted for now. E15.1 is a machine-qualified opt-in hybrid: accepted Donor agency plus a separate finite physical torso with contact-episode consequence semantics.**

Next action:

**publish the opt-in `?mode=e15` route and stop for Owner free play.**

Do not yet:

- replace/promote Donor/default mechanics;
- tune E15 parameters to chase a preferred feel before Owner evidence;
- add limbs or a full ragdoll;
- claim whole-body momentum correctness;
- interpret CI PASS as gameplay success;
- return automatically to E14 mass/friction/braking sweeps.
