# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

The implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap regrounding, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md). It is the canonical current-state/orientation layer. Stage documents remain the evidence record for what a specific experiment actually tested.

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

## Active research — E3 rotational embodiment & balance

E3 does **not** replace or retune A‴.

Research question:

> Can maintaining posture become a physically negotiated capability of the player's body rather than a guaranteed controller property?

The first E3 organism uses a dynamic support/foot, dynamic torso, spherical ankle and equal-and-opposite pitch/roll actuation.

### What machine evidence established first

At the common `320 Nm` research specimen:

- direct forward perturbation: recover through `64 N·s`, fall from `80 N·s`;
- 3D forward: `64 R / 80 F`;
- side: `80 R / 96 F`;
- diagonal: `80 R / 96 F`;
- real 35 kg dynamic ram: recover through `3.0 m/s`, fall from `4.0 m/s`;
- increasing torque authority moves the recoverability frontier;
- sufficiently strong authority/perturbations can recruit material support relocation as a separate mechanism.

`320 Nm`, current Kp/Kd, geometry and masses are research parameters, **not** final gameplay tuning or biomechanical claims.

### Owner experiential gate

Owner hands-on feedback on the E3.1c playground:

> `działa, feel rzeczywiście jest jakby primitywny manekin walczył o równowagę :D`

This is positive evidence that the physical struggle for posture is perceptually legible and worth continued research.

It does **not** promote E3 to current player behavior or a donor revision.

### Post-Owner falsification loop

The positive feel signal was immediately challenged rather than treated as proof of the whole model.

The loop established three distinct channels:

1. **support-mediated grounded balance**;
2. **internal airborne attitude control** through the foot as reaction mass;
3. **support relocation** under some geometry/authority conditions.

The original always-active actuator has finite instantaneous torque, but the spherical ankle does not bound angular range/angular-momentum storage. With no ground or gravity it can right the torso while the foot accumulates tens to hundreds of radians of rotation.

That is momentum-conserving internal attitude control — not a hidden world torque — but it is a separate capability and currently has an unrealistic unbounded sink.

A support-contact-gated causal A/B then removed this unsupported righting channel while preserving the tested grounded behavior:

- direct: both always and gated `48 R / 64 R / 80 F / 96 F`;
- real ram: both `3.0 m/s R / 4.0 m/s F`;
- unsupported zero-g: gated matches passive, while always-active recruits the large reaction-mass channel.

Strongest current E3.1 result:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested envelope.**

Detailed evidence:

- [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md)
- [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md)

## Current E3 boundary

The next high-information question is **not automatically articulation, ragdoll or locomotion integration**.

Before the balance capability is allowed near jumping/general locomotion, qualify:

- support loss / takeoff;
- support reacquisition / landing;
- one-step contact-observation latency;
- whether any airborne attitude authority is desirable at all;
- if yes, what explicit finite physical resource bounds it.

Do not silently use the old always-active spherical-ankle actuator as the answer.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

Alias:

`?mode=e3`

The deployed E3 playground still represents the original always-active experimental actuator. The support-gated decomposition is currently machine research, not promoted browser behavior.

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

- `?mode=balance` or `?mode=e3` — active E3 experimental surface;
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

Canonical smoke preserves the Foundation/E2 lineage, frozen A″ reference, A‴ production qualification, donor v0/v1 contract/equivalence gates, mobile-input gate and the active E3 research falsifiers.

## Reading order

For current work:

1. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — canonical state/boundaries;
2. [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md) — active E3 line;
3. [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md) — post-Owner causal decomposition;
4. [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md) — accepted A‴ promotion;
5. [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md) — donor compatibility/versioning;
6. earlier stage docs only when a specific question requires them.

`docs/RESEARCH.md` is an early historical ledger, not live planning authority.

## Do not automatically

- retune A‴ / Donor v1 because E3 exists;
- change frozen v0 semantics;
- patch `box3d.js` to full native clipping;
- treat finite E3 torque as proof of finite total angular capability;
- call support sliding “stepping”;
- add active ragdoll/humanoid articulation by inertia;
- combine E3 with locomotion before support-transition semantics are qualified;
- create a new donor revision from research evidence alone;
- declare controller-owned, solver-owned or hybrid representation the final architecture winner.
