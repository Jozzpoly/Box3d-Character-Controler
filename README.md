# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

The implementation/probes may be disposable; accepted observations are not.

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

The historical `createDonorCharacter(...)` deliberately remains frozen **Donor v0 / A″**. Do not silently retarget it.

v0 and v1 currently share the same numeric feel profile; v1 is a semantic/mechanical promotion, not a hidden retune.

See [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md) and [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md).

## E3 rotational embodiment & balance — experimental

E3 does **not** replace or retune A‴.

Research question:

> Can maintaining posture become a physically negotiated capability of the player's body rather than a guaranteed controller property?

### E3.1 — grounded balance survived causal decomposition

At the common `320 Nm` E3.1 research specimen:

- direct forward perturbation: recover through `64 N·s`, fall from `80 N·s`;
- 3D forward: `64 R / 80 F`;
- side: `80 R / 96 F`;
- diagonal: `80 R / 96 F`;
- real 35 kg dynamic ram: recover through `3.0 m/s`, fall from `4.0 m/s`.

Owner hands-on feedback on the E3.1c playground:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is positive evidence that the physical struggle for posture is perceptually legible and worth continued research. It does **not** promote E3 to current player behavior or a donor revision.

Post-Owner falsification separated at least three channels:

1. **support-mediated grounded balance**;
2. **internal airborne attitude control** through a reaction mass;
3. **support relocation** under some geometry/authority conditions.

The original always-active actuator has finite instantaneous torque but its spherical ankle does not bound total unsupported angular capacity. A support-gated causal A/B removed that accidental unsupported righting channel while preserving the tested grounded direct and ram envelope.

Strong E3.1 result:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested envelope.**

### E3.1 support-transition qualification

Later E3.1i–k work established that manifold presence, geometric touching and solver load are distinct evidence signals.

A diagnostic survivor for the current specimen is:

> **reactive support = near-vertical contact that is touching OR carried solver load in the previous solve.**

It preserved tested grounded balance while removing a reproduced speculative-only takeoff actuation. This remains a **diagnostic research policy**, not promoted runtime behavior.

Detailed E3.1 evidence:

- [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md)
- [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md)
- [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md)

## E3.2 bounded internal angular momentum — closed as research, not promoted

E3.2 tested whether articulation could earn complexity through a finite internal angular-momentum capability rather than anatomy-by-default.

A matched three-body specimen compared passive articulation with active equal-and-opposite internal angular redistribution while keeping the outer support/collision representation matched.

At the canonical `1/60 s × 4 Box3D substeps` substrate, the active specimen produced a real local causal difference:

- matched passive direct `±80 N·s` — FALL/FALL;
- matched active direct `±80 N·s` — RECOVER/RECOVER;
- zero-g controls preserved total angular momentum to small measured drift;
- available angular stroke materially affected the canonical result.

That initially looked like a strong articulation result. It was then deliberately challenged.

Important negative evidence:

- near the direct boundary, smaller angular ranges were one-sided;
- ecological 35 kg ram improvement was one-sided at canonical resolution;
- the first ram collision was nearly mirrored, while divergence appeared later through support/contact trajectory;
- a native revolute motor did not improve robustness;
- a simple ankle-first/hip-later dwell sweep did not produce a robust strategy interval;
- absolute actuator impulse was corrected as effort, not energy/capacity consumption.

### Decisive E3.2n solver-resolution falsifier

E3.2n changed only Box3D substeps `[1,2,4,8]` while holding outer timestep/controller cadence, masses, geometry, friction, gravity, torque budgets, stroke, perturbations and classifiers fixed.

Canonical `4` reproduced the previous reference exactly, validating the probe.

Direct `±80 N·s` outcomes:

| Substeps | Passive `-/+` | Active `-/+` |
| ---: | --- | --- |
| `1` | R/F | R/R |
| `2` | F/F | F/F |
| `4` | F/F | R/R |
| `8` | F/F | F/F |

The ram frontier also moved materially and non-monotonically with solver resolution.

Final E3.2 verdict:

> **The bounded-internal-momentum specimen demonstrates a real local causal mechanism at the canonical `1/60 × 4-substep` substrate, but its recoverability benefit is not robust to solver resolution in the tested representation.**

Therefore E3.2 earned **knowledge, not promotion**.

Do not treat `60°`, `160 Nm`, canonical direct R/R or the one-sided `+4 m/s` ram recovery as player tuning or robust capability evidence. Do not tune substeps to obtain a preferred result.

Detailed ledger:

- [`docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md)

## Current E3 boundary

E3.1 remains Owner-positive experimental evidence for support-mediated physical posture.

E3.2 is closed as a research stage. Its current bounded-internal-momentum representation is **not** promoted and should not be rescued by another torque/stroke/gain/substep sweep.

The next large research question is deliberately open again and should be selected by information gain, gameplay relevance and Owner/project need.

Possible future families — **candidates, not commitments** — include:

- a genuinely different articulated representation with substrate robustness designed into the experiment;
- designed support relocation / stepping as its own capability;
- a small bounded balance+locomotion integration crucible if a concrete gameplay question earns it;
- another embodied interaction problem with higher current value.

Do not automatically start “E3.3” merely because E3.2 ended.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

Alias:

`?mode=e3`

The deployed E3 playground still represents the earlier E3.1 always-active experimental actuator. E3.1 support-gated/reactive decompositions and all E3.2 bounded-internal-momentum mechanics are machine research only.

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

Canonical smoke preserves the Foundation/E2 lineage, frozen A″ reference, A‴ production qualification, donor v0/v1 contract/equivalence gates, mobile-input gate and active E3 research falsifiers.

The historical `e3-2d-mirror-and-dynamic-ram.mjs` intentionally keeps its canonical one-sided 4 m/s failure as evidence; E3.2n demonstrated that this exact outcome is not a robust cross-resolution gate, so E3.2n is the final active E3.2 robustness probe in canonical research smoke.

## Reading order

For current work:

1. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — canonical project identity/current player/current research boundary;
2. [`docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md`](docs/E3_2_BOUNDED_INTERNAL_MOMENTUM.md) — newest completed E3 stage and robustness verdict;
3. [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md) — support-transition/contact-signal evidence;
4. [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md) — E3 research origin;
5. [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md) — post-Owner causal decomposition;
6. [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md) — accepted A‴ promotion;
7. [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md) — donor compatibility/versioning;
8. earlier stage docs only when a specific question requires them.

`docs/RESEARCH.md` is an early historical ledger, not live planning authority.

## Do not automatically

- retune A‴ / Donor v1 because E3 exists;
- change frozen v0 semantics;
- patch `box3d.js` to full native clipping;
- treat finite torque as proof of finite total angular capability;
- equate manifold presence, touching and load as one support truth;
- promote the E3.1 reactive-support signal without a concrete integration need;
- call support sliding “stepping”;
- promote E3.2 bounded internal momentum from canonical 4-substep results;
- tune solver substeps to recover a preferred E3.2 outcome;
- add active ragdoll/humanoid articulation by inertia;
- combine E3 with locomotion merely because the previous research stage ended;
- create a new donor revision from research evidence alone;
- declare controller-owned, solver-owned or hybrid representation the final architecture winner.
