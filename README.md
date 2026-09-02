# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working mental model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap regrounding, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then read the newest stage ledger relevant to the question.

## Current accepted player — Donor v1 / A‴

The normal public/default runtime remains **A‴ / Donor v1**.

A‴ is current-best because it passed both machine qualification and Owner free play. It removed a real stale-blocked-velocity feel defect without replacing valid traversal, dynamic-body consequence or moving-support behavior.

Current static/kinematic constraint interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

Current donor entry points:

- `createCurrentDonorCharacter(...)`;
- `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`.

Historical `createDonorCharacter(...)` deliberately remains frozen **Donor v0 / A″**. Do not silently retarget it.

Current important ground profile values remain:

- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- gravity `20 m/s²`;
- fixed outer step `1/60 s`;
- canonical `4` Box3D substeps.

A‴ is a **controller-owned mover representation**. Its accepted locomotion is not yet rigid-body propulsion of an articulated physical player. This distinction became central after E4.

See [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md) and [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md).

## E3 rotational embodiment & balance — experimental

E3 does **not** replace or retune A‴.

Research question:

> Can maintaining posture become a physically negotiated capability of the player's body rather than a guaranteed controller property?

### E3.1 — grounded balance survived causal decomposition

At the common `320 Nm` E3.1 research specimen:

- direct forward perturbation: recover through `64 N·s`, fall from `80 N·s`;
- real 35 kg dynamic ram: recover through `3.0 m/s`, fall from `4.0 m/s`.

Owner hands-on feedback on the E3.1c playground:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is positive evidence that physical struggle for posture is perceptually legible and worth research. It does **not** promote E3 to current player behavior or a donor revision.

Post-Owner falsification separated at least:

1. **support-mediated grounded balance**;
2. **internal airborne attitude control** through a reaction mass;
3. **support relocation** under some geometry/authority conditions.

Strong result:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested envelope.**

E3.1i–k also established that manifold presence, geometric touching and solver load are distinct evidence signals. `touching OR solver-loaded` survived as a diagnostic support signal for the tested specimen, but is not promoted runtime policy.

Detailed E3.1 evidence:

- [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md)
- [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md)
- [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md)

## E3.2 bounded internal angular momentum — closed, not promoted

E3.2 tested whether articulation could earn complexity through a finite internal angular-momentum capability rather than anatomy-by-default.

At canonical `1/60 × 4 substeps`, matched active internal redistribution changed direct `±80 N·s` from passive FALL/FALL to active RECOVER/RECOVER while zero-g controls preserved total angular momentum to small measured drift.

But the stronger capability claim failed solver-resolution falsification:

| Substeps | Passive `-/+` | Active `-/+` |
| ---: | --- | --- |
| `1` | R/F | R/R |
| `2` | F/F | F/F |
| `4` | F/F | R/R |
| `8` | F/F | F/F |

The ecological ram frontier was also materially and non-monotonically resolution-sensitive.

Final E3.2 verdict:

> **Real local mechanism, not substrate-robust recovery capability in this representation.**

E3.2 earned **knowledge, not promotion**. Do not rescue it with another torque/stroke/gain/substep sweep.

Detailed ledger:

- [`docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md)

## E4 locomotion ↔ finite-posture compatibility — closed proxy stage

E4 asked an earlier question than full integration:

> **Can the accepted A‴ translational response envelope coexist with finite posture, or does naive combination make the two capabilities mechanically incompatible?**

E4 used a kinematic support carriage beneath the E3 sagittal organism. This creates the inertial demand associated with the accepted acceleration/deceleration profile while keeping the support path simple enough to interpret.

It is an **inertial compatibility proxy**, not A‴ + E3 integration.

### What failed first

With finite `320 Nm` posture authority and a world-upright target:

- full `0→5.2 m/s` acceleration recovered at `4 m/s²`;
- it fell from `8 m/s²` upward in the declared sweep, including current `31 m/s²`.

But E4.1 showed peak acceleration is not the whole story: current `31 m/s²` survives short episodes producing `0.5–1.0 m/s` Δv.

### Posture mediation

At `8 m/s²`, changing only the posture target from world-up to acceleration-aligned effective-up changed F/F → R/R without stronger torque or weaker translation.

Static-prelean testing then showed that the corresponding tilted poses cannot simply be held on stationary support. The useful posture state is **dynamic**, not a pose teleport or static setup.

### Anticipatory physical preparation

A short period of finite physical preparation before the known acceleration/deceleration demand produced a much stronger result.

At canonical resolution:

- current `31 m/s²` launch: lead0 F/F, lead8 **R/R**;
- current `36 m/s²` braking from established `5.2 m/s` cruise: lead0 F/F, lead8 **R/R**.

No torque increase, acceleration/deceleration reduction or pose teleport was used.

### Substrate robustness

Changing only Box3D substeps `[1,2,4,8]`:

**Current launch `31 m/s²`:**

- lead0: F/F at all tested resolutions;
- lead8: F/F at sub1, **R/R at sub2/4/8**.

**Current braking `36 m/s²`:**

- lead0: F/F at all tested resolutions;
- lead8: F/F at sub1, **R/R at sub2/4/8**.

Recovered 2/4/8 cases had zero support-loss frames and bounded support-relative foot drift in the declared proxy.

Strong E4 result:

> **In the carriage proxy, the same anticipatory physical-preparation pattern preserves both current launch and current braking demand across substeps 2/4/8, while failing at 1.**

This is materially stronger than a single canonical recover/fall survivor, but it is **not solver-independent**.

Do not interpret `8` frames as accepted gameplay timing or choose solver substeps to obtain a preferred outcome.

Detailed ledger:

- [`docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md)

## Current research boundary

E4 is closed. More moving-platform sequences would mostly elaborate the proxy rather than answer the newly exposed problem.

Re-reading the actual A‴ implementation matters here: accepted locomotion is controller-owned mover authority, while E3's body is a different physical representation.

The next high-information question is therefore:

> **How should accepted player translational authority be coupled into a physically embodied organism while preserving both strong agency and meaningful physical consequence?**

This is a **problem statement, not a selected mechanism**.

Competing future mechanism families may include:

- finite world-external translational assist;
- support-mediated / traction-limited propulsion;
- hybrid authority sharing;
- deliberate support relocation / stepping;
- another representation preserving the useful A‴ response envelope while exposing physical consequence.

Do not build legs, humanoid gait, a new Donor revision or another platform sequence by inertia. The next stage should first separate the smallest useful authority-placement alternatives.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

Alias:

`?mode=e3`

The deployed E3 playground still represents the earlier E3.1 always-active experimental actuator. E3.1 support-gated/reactive decompositions, all E3.2 mechanics and all E4 work are machine research only.

## Normal controls

- `WASD` / touch left stick — camera-relative movement;
- `Space` / `JUMP` — jump;
- `Shift` / `SPRINT` — sprint;
- mouse/touch drag — orbit camera;
- mouse wheel — zoom;
- `R` / `RESET` — reset;
- `H` — telemetry.

These controls describe the normal A‴ playground. E3 balance mode has its own explicit experimental controls.

## Research / historical URL modes

- `?mode=balance` or `?mode=e3` — E3.1 experimental surface;
- `?mode=controller` — Foundation A;
- `?mode=solver` — B;
- `?mode=causal` — A′;
- `?mode=momentum` — historical A″ research composition;
- `?mode=donor` or `?mode=previous` — frozen Donor v0 / A″;
- `?mode=constraint` — compatibility alias resolving to current A‴;
- `?mode=causal&capture=1` — historical A′ Owner-capture path.

Historical modes are evidence/regression tools, not normal user-facing choices.

## Runtime provenance

Current browser substrate:

- `box3d.js@0.1.1`;
- `three@0.183.0`;
- `vite@7.0.0`.

`box3d.js@0.1.1` release commit:

`5d5a3af049cccd9948b2b55bac4342414af0ef64`

Vendored native Box3D snapshot:

`8441b4a06d6d09dcfb0b0f704df4d847d1437b92`

Binding version and native engine snapshot are separate provenance facts.

## Validation

```bash
npm install
npm run smoke
npm run build
```

Canonical smoke preserves the Foundation/E2 lineage, frozen A″ reference, A‴ production qualification, donor v0/v1 gates, mobile-input gate, E3 falsification chain and E4 compatibility/robustness probes.

## Reading order

For current work:

1. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — canonical identity/current player/current research boundary;
2. [`docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md`](docs/E4_LOCOMOTION_POSTURE_COMPATIBILITY.md) — newest closed compatibility stage and next authority-placement boundary;
3. [`docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md) — internal-momentum robustness falsification;
4. [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md) — support-transition/contact-signal evidence;
5. [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md) — E3 research origin;
6. [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md) — post-Owner causal decomposition;
7. [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md) — accepted A‴ promotion;
8. [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md) — donor compatibility/versioning;
9. earlier stage docs only when a specific question requires them.

`docs/RESEARCH.md` is an early historical ledger, not live planning authority.

## Do not automatically

- retune A‴ / Donor v1 because E3/E4 exists;
- change frozen v0 semantics;
- patch `box3d.js` to full native clipping;
- equate finite torque with finite total angular capability;
- equate manifold presence, touching and load as one support truth;
- promote the E3.1 reactive-support signal without a concrete integration need;
- call support sliding “stepping”;
- rescue E3.2 by tuning torque/stroke/gain/substeps;
- turn E4 lead8 into a gameplay constant;
- select solver substeps because they produce a preferred E4 outcome;
- mistake the E4 moving-support carriage for actual locomotion integration;
- weaken accepted A‴ agency merely to make a physical-body prototype easier;
- add active ragdoll/humanoid gait by inertia;
- create a new donor revision from research evidence alone;
- declare controller-owned, solver-owned or hybrid representation the final architecture winner.
