# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

The implementation/probes may be disposable; accepted observations are not.

For a fresh takeover or long-gap regrounding, start with [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), then read the newest active-stage ledger. Stage documents remain the evidence record for what a specific experiment actually tested.

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

### Post-Owner causal decomposition

The positive feel signal was immediately challenged rather than treated as proof of the whole model.

The E3.1d–h loop established three distinct channels:

1. **support-mediated grounded balance**;
2. **internal airborne attitude control** through the foot as reaction mass;
3. **support relocation** under some geometry/authority conditions.

The original always-active actuator has finite instantaneous torque, but the spherical ankle does not bound angular range/angular-momentum storage. With no ground or gravity it can right the torso while the foot accumulates tens to hundreds of radians of rotation.

That is momentum-conserving internal attitude control — not a hidden world torque — but it is a separate capability and currently has an unrealistic unbounded sink.

A support-contact-gated causal A/B then removed this unsupported righting channel while preserving the tested grounded behavior:

- direct: both always and gated `48 R / 64 R / 80 F / 96 F`;
- real ram: both `3.0 m/s R / 4.0 m/s F`;
- unsupported zero-g: gated matches passive, while always-active recruits the large reaction-mass channel.

Strong result:

> **The Owner-positive grounded mannequin-like balance struggle does not require the accidental unsupported attitude-control channel inside the tested envelope.**

### Support-transition qualification — E3.1i–k

The next loop tested what “support exists” means at takeoff/landing instead of assuming that a cached contact boolean was exact truth.

It produced several corrections:

- if a platform is externally invalidated between solves, cached support can genuinely be stale for one controller tick and inject up to the tested `5.333 N·m·s` of balance angular impulse;
- ordinary physics-driven takeoff does **not** show an extra whole post-manifold-loss support tick: once the manifold disappears, the next full tick has `0 Nm`;
- bare manifold presence is still slightly too broad: one `64 N·s + 3 m/s` takeoff retained a no-touch/no-load manifold for two actuated frames (`1.161 N·m·s` total);
- geometric `separation <= 0` is also too narrow as complete support truth: Box3D generated loaded predictive landing contact at about `+5 mm` separation;
- manifold presence, geometric touching and solver load are therefore distinct evidence signals.

A diagnostic candidate derived from those observations:

> **reactive support = near-vertical contact that is geometrically touching OR carried solver load in the previous solve.**

In E3.1k this candidate:

- kept quiet grounded support continuous;
- preserved direct `64 RECOVER / 80 FALL` with the same measured peak tilts;
- preserved real-ram `3 m/s RECOVER / 4 m/s FALL` with the same measured peaks;
- removed the reproduced speculative-only takeoff actuation (`2 frames / 1.161 N·m·s` → `0`);
- increased that takeoff's peak tilt from `3.58°` to `4.40°`, a real consequence of removing unsupported corrective authority.

This is a **diagnostic survivor, not promoted runtime policy**. No `src/` behavior changed in E3.1i–k.

Detailed evidence:

- [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md)
- [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md)
- [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md)

## Current E3 boundary

The immediate support-transition uncertainty is now sufficiently qualified for the current specimen.

Do **not** automatically interpret that as permission to merge balance into locomotion or to start a humanoid ragdoll.

The next large research question is again open and should be selected by information gain/project need. Current serious candidates include:

- deliberately bounded internal angular-momentum / hip-like recovery;
- designed support relocation / stepping;
- a small bounded balance+locomotion integration crucible.

A separate decision should choose among them. The surviving `touching OR loaded` support signal remains research evidence until a later stage has a concrete reason to promote it.

## Public build

Normal current player:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Experimental E3 balance playground:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=balance`

Alias:

`?mode=e3`

The deployed E3 playground still represents the original always-active experimental actuator. The support-gated/reactive decompositions are machine research, not promoted browser behavior.

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

1. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — canonical project identity/current accepted player/boundaries;
2. [`docs/E3_1_SUPPORT_TRANSITIONS.md`](docs/E3_1_SUPPORT_TRANSITIONS.md) — newest support-transition evidence and current E3 boundary;
3. [`docs/E3_ROTATIONAL_EMBODIMENT.md`](docs/E3_ROTATIONAL_EMBODIMENT.md) — E3 research line;
4. [`docs/E3_1_VALIDATION_LOOP.md`](docs/E3_1_VALIDATION_LOOP.md) — post-Owner causal decomposition;
5. [`docs/E2_3E_STABILIZATION.md`](docs/E2_3E_STABILIZATION.md) — accepted A‴ promotion;
6. [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md) — donor compatibility/versioning;
7. earlier stage docs only when a specific question requires them.

Until the next full project-state regrounding, the support-transition ledger is the latest E3 evidence overlay when an older `PROJECT_STATE.md` sentence still describes support transitions as the next open question.

`docs/RESEARCH.md` is an early historical ledger, not live planning authority.

## Do not automatically

- retune A‴ / Donor v1 because E3 exists;
- change frozen v0 semantics;
- patch `box3d.js` to full native clipping;
- treat finite E3 torque as proof of finite total angular capability;
- equate manifold presence, touching and load as one support truth;
- promote the E3.1k reactive support signal without a concrete integration need;
- call support sliding “stepping”;
- add active ragdoll/humanoid articulation by inertia;
- combine E3 with locomotion just because support-transition semantics are now qualified;
- create a new donor revision from research evidence alone;
- declare controller-owned, solver-owned or hybrid representation the final architecture winner.
