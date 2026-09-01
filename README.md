# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

The implementation is disposable; accepted observations are not. Detailed stage documents are the research record. This README is intentionally a compact map of the current state rather than a second copy of every experiment.

## Current research state — E2.3d production-path Owner gate

Current public specimens deliberately keep different hypotheses alive:

- **A** — frozen Foundation 02.1 controller-owned mover;
- **B** — frozen E2 solver-owned finite-mass translational root;
- **A′** — A with E2.2 causal-component dynamic reciprocity;
- **A″** — A′ physical contact with dynamic-contact `Δv` no longer retained as a persistent `externalVelocity` target;
- **donor A″** — the behavior-preserving, explicitly profiled downstream contract for the current A″ semantics;
- **A‴** — isolated E2.3d production-path candidate implementing intent-capped surface-relative constraint velocity, pending Owner free-play judgement.

A″ remains the current **Owner-preferred contact-semantics specimen**, not an accepted final controller architecture. A‴ is machine-qualified for direct comparison, not yet preferred and not donor-promoted.

Owner free play of A″ removed the previously objectionable delayed wrong-direction slide and produced wall reactions described as appropriate. That success does **not** justify immediately adding slide back or declaring the entire momentum model solved.

E2.3 then found two independent boundaries:

1. **Grounded locomotion is a strong momentum sink.** With zero input, `groundDeceleration = 36 m/s²` can remove `0.6 m/s` of horizontal velocity every 60 Hz tick. A clean `5 m/s` grounded state stops in about `0.15 s`, while the same airborne state still has about `4.4 m/s` after `0.50 s`.
2. **The apparent Box3D mover velocity clip is currently inert because of a box3d.js@0.1.1 binding-state loss.** Native `b3SolvePlanes` writes `b3CollisionPlane.push`, and native `b3ClipVector` uses that state. The JS wrapper copies planes into temporary vectors for each call and does not copy solved `push` values back to JavaScript, so the later JS `b3ClipVector` call receives stale `push = 0` planes.

A faithful JS reconstruction of the exact vendored native plane solver matches native solved deltas to tiny numerical error and proves the missing state boundary. Diagnostic propagation of the missing `push` activates native-intended clipping, but that is **not a neutral fix**: in the recovered Owner anchor the dynamic contact episode changes from `7` frames to `1`, the first clean-separation speed changes from about `1.52 m/s` to `0.25 m/s`, and support state changes as well.

E2.3b then established gameplay relevance. Current A″ spent `53` frames geometrically blocked by a low obstacle while still retaining `5.2 m/s` into it; after three neutral grounded ticks it still retained `3.4 m/s`, and a neutral jump released `1.282 m` of forward movement with no directional input.

E2.3c tested explicit policies rather than assuming the native clip was the answer. Immediate full/horizontal clipping removed the stale release but **broke ordinary `0.22 m` stair traversal**. Separating static/kinematic geometry from dynamic reciprocity preserved the Owner dynamic anchor but still failed stairs when clipping was immediate.

The E2.3c research survivor is **intent-capped relative constraint velocity** for active horizontal static/kinematic constraints:

- evaluate character and desired velocity relative to the constraint surface velocity;
- preserve at most the inward relative normal component still justified by current player intent;
- retire only stale excess normal authority;
- leave tangent velocity unchanged;
- leave dynamic-body consequence to the separately qualified causal reciprocity path.

E2.3d now implements that policy as the separate A‴ runtime specimen. The real implementation reproduces the E2.3c results, preserves stairs/ledge, the exact `7f` Owner dynamic anchor and moving-support carry, handles moving kinematic constraints in the relative frame, passes a two-plane corner release, and passes an oblique-wall projection falsifier. A frozen 360-tick A″/Donor trajectory fingerprint remains unchanged, demonstrating that candidate work has not altered the accepted A″ path.

The next evidence is **Owner free play**, not another arbitrary policy sweep. A‴ remains a candidate until hands-on comparison establishes whether the mechanically cleaner constraint semantics actually improve embodied control without making ordinary traversal feel artificially sanitized.

## Detailed evidence

- [`docs/E2_1_LOCALIZATION.md`](docs/E2_1_LOCALIZATION.md) — terrain/support and A-vs-B boundary localization;
- [`docs/E2_2_RECIPROCITY.md`](docs/E2_2_RECIPROCITY.md) — causal-component reciprocity falsifier and A′ qualification;
- [`docs/E2_2B_MOMENTUM_PERSISTENCE.md`](docs/E2_2B_MOMENTUM_PERSISTENCE.md) — post-contact persistence diagnostic;
- [`docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md`](docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md) — bounded reproduction gate;
- [`docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md`](docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md) — Owner-marked free-play capture contract;
- [`docs/E2_2C2_MOMENTUM_SEMANTICS.md`](docs/E2_2C2_MOMENTUM_SEMANTICS.md) — real-capture diagnosis and A″ falsifier;
- [`docs/E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md`](docs/E2_3_MOMENTUM_PRESERVATION_BOUNDARY.md) — grounded momentum sink, box3d.js binding contract and intended-clip comparison;
- [`docs/E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md`](docs/E2_3B_CONSTRAINT_RELEASE_RELEVANCE.md) — gameplay-level proof that blocked velocity can re-enter motion after constraint release;
- [`docs/E2_3C_CONSTRAINT_VELOCITY_POLICY.md`](docs/E2_3C_CONSTRAINT_VELOCITY_POLICY.md) — policy falsifiers, rejected clip classes and the intent-capped relative survivor;
- [`docs/E2_3D_PRODUCTION_SPECIMEN.md`](docs/E2_3D_PRODUCTION_SPECIMEN.md) — isolated A‴ implementation, non-interference fingerprint, real-runtime qualification and Owner gate;
- [`docs/DONOR_CONTRACT.md`](docs/DONOR_CONTRACT.md) — preliminary long-term donor profile/API boundary, still describing frozen A″ rather than A‴.

## Current-best facts

### Foundation / A

Foundation 02.1 established a useful controller-owned embodied-player baseline:

- controller-owned capsule position/state;
- `80 kg` virtual interaction mass;
- rounded Box3D mover plane solve;
- dynamic-body reciprocity;
- body-local moving-support transport;
- camera-relative bounded locomotion and shaped jump;
- natural traversal of the `0.22 m` stairs and a `0.52 m` jump boundary.

Exact Owner-tested Foundation 02.1 specimen:

`12841bd5c095827092ee5aae0acc19981a848490`

A remains frozen as a historical comparison.

### E2 / B

B uses a real `80 kg` solver-owned Box3D capsule with locked angular motion and bounded COM impulses for locomotion. E2.1 showed that this deliberately minimal solver-owned implementation does not negotiate rough terrain well: it passes only roughly `0.05–0.10 m` vertical steps and remains blocked by `0.15–0.22 m` steps even with much stronger horizontal authority.

B is evidence about this implementation, not a verdict against the entire solver-owned/hybrid representation class.

### E2.2 / A′

A′ changed only dynamic reciprocity direction semantics. Instead of letting an oblique rounded-edge contact normal manufacture a new momentum axis, reciprocity transfers the horizontal/vertical components that actually contributed to closing the contact.

Working interpretation:

> **The mover owns geometric deflection. Reciprocity transfers causal momentum.**

The broader E2.2 matrix improved all `21/21` targeted problematic A cases with no meaningful regression in that matrix while preserving ordinary push, reverse contact, landing, stairs and ledge behavior.

A′ remained a survivor, not a final baseline.

### E2.2c-2 / A″

The first real Owner-marked capture exposed a narrower state-semantics defect in A′:

1. dynamic reciprocity computes a contact reaction that is a **delta velocity** (`Δv`);
2. A′ adds it to current `velocity`;
3. A′ also adds the same vector to horizontal `externalVelocity`;
4. locomotion later targets `desiredVelocity + externalVelocity`.

That can turn a contact impulse already used to change momentum into a later absolute velocity target.

A″ keeps the same A′ contact/body response but removes only that dynamic-contact memory write. In the recovered Owner anchor:

| metric | A′ | A″ |
| --- | ---: | ---: |
| contact episode | `7f` | `7f` |
| first impulse | `86.86 N·s` | `86.86 N·s` |
| peak external speed | `3.222 m/s` | `0.488 m/s` |
| tail at `0.25 s` | `0.395 m` | `0.054 m` |
| tail at `0.50 s` | `0.773 m` | `0.110 m` |
| peak reversal vs incoming direction | `2.547 m/s` | `0.418 m/s` |

Moving-support inheritance remained unchanged in that falsifier.

Owner free play then confirmed the perceptual result: the objectionable residual slide disappeared and wall rebounds felt appropriate.

### E2.3 / actual substrate boundary

The current A/A′/A″ runtime calls `b3SolvePlanes(...)` and later `b3ClipVector(...)`, but with `box3d.js@0.1.1` these two calls do not share the native `plane.push` state required by the exact vendored Box3D implementation. Those specimens therefore behave as if this mover-plane velocity clip were absent.

The E2.3 diagnostic recovered the missing native-equivalent `push` state and verified the JS reconstruction against native solved deltas. On a shallow wall isolate:

- native solve delta and reconstructed solve delta differ by only about `1.12e-10` in the measured case;
- JS-visible push after native solve: `0`;
- reconstructed push: `0.015`;
- stale-plane `b3ClipVector`: no velocity change;
- push-propagated `b3ClipVector`: removes the constrained normal component as native design intends.

On the recovered Owner anchor, activating full intended clip changes contact lifecycle substantially, so it remains rejected as a neutral substrate repair.

### E2.3b / constraint-release relevance

The neutral-jump falsifier establishes that current blocked locomotion velocity can survive sustained geometric blocking and later re-enter movement.

Current A″:

- sustained blocker contact: `53f`;
- velocity into blocker after that contact: `5.200 m/s`;
- after `3f` of neutral grounded input: `3.400 m/s`;
- low blocker vertically clears after jump: `6f`;
- far face crossed: `24f`;
- max forward velocity after clearance: `2.680 m/s`;
- zero-direction release displacement: `1.282 m`.

Open-space inertia control also has `3.400 m/s` after the same three neutral grounded ticks and travels `1.412 m` during the neutral jump. The wall therefore leaves current A″ with essentially the same stored horizontal locomotion state as free space even though displacement was constrained for almost a second.

### E2.3c / constraint-velocity policy

E2.3c rejected three tempting shortcuts before identifying a survivor.

**Immediate clipping is too aggressive.** Full native-intended clipping, all-horizontal clipping and static/kinematic-only horizontal clipping all removed the E2.3b release, but all failed ordinary stair traversal. Full/all clipping additionally changed the dynamic Owner contact from `7f` to `1f`; static/kinematic-only clipping preserved that contact but still destroyed step negotiation.

**Binary intent ownership is too permissive.** A policy that removes blocked velocity only when current intent has zero inward component fixes neutral/tangent release, but a 45° input still allowed the old `4.763 m/s` normal component to survive even though current intent justified only `3.677 m/s`.

**World-space capping is wrong for moving kinematic constraints.** Against a wall receding at `4.000 m/s`, world-space capping dropped the character from `5.200` to `0.000 m/s`; relative-frame capping dropped it to the surface velocity `4.000 m/s`, retiring only the `1.200 m/s` relative closing excess.

The survivor uses:

```text
v_rel_in = (velocity - surfaceVelocity) · horizontalNormal
d_rel_in = (desiredVelocity - surfaceVelocity) · horizontalNormal
allowed_rel_in = min(0, d_rel_in)

if v_rel_in < allowed_rel_in:
    retire only the excess normal component
```

Working interpretation:

> **Constraint velocity is relative, and the player may retain only the constrained normal authority still justified by current intent.**

### E2.3d / A‴ production-path candidate

A‴ implements the E2.3c survivor as a real character path without changing `src/character.js` or Donor v0. A separate helper reconstructs only the missing Box3D plane-push state and every candidate solve cross-checks its reconstructed delta against native `b3SolvePlanes`.

Before candidate code was added, A″/Donor behavior was frozen with a 360-tick world+character trajectory fingerprint:

`e13a64ccd6cbd5c82ba4f18f1abf9fa1a7eae4ac06ba07a71ca08860f8e330c2`

That fingerprint still passes after A‴ implementation.

Corrected real-runtime qualification:

- neutral release: `0.000 m`;
- tangent normal leak: `0.000 m`, tangent travel `4.936 m`;
- 45° diagonal allowed normal velocity: `3.677 m/s`;
- held-forward velocity: `5.200 m/s`, cross `13f`;
- stationary kinematic release: `0.000 m`;
- stairs/ledge: PASS;
- Owner anchor: `7f`, `87.697 N·s`, tails `0.074/0.128 m`, STATIC after separation;
- moving-support carry: `1.501 m/s`, `0.710 m @ .50s`;
- receding `4.000 m/s` wall: neutral `4.000 m/s`, held `5.200 m/s`;
- two-plane corner neutral release: `0.000 / 0.000 m`;
- max recovered/native solve error: `6.61e-9`.

Oblique-wall qualification on an actual `150°` collision normal additionally produced:

- tangent switch: `0.000 m/s` normal velocity, `0.000 m` normal travel, `2.735 m` tangent travel;
- partial inward intent: expected `-2.326 m/s`, measured `-2.326 m/s` normal component while retaining `2.954 m/s` tangent velocity;
- max recovered/native solve error: `5.08e-9`.

This establishes **machine qualification for Owner testing**, not behavioral promotion.

## Public controls

Mode changes reload the playground so one specimen does not inherit another specimen's disturbed state.

- `1` — A frozen normal-reciprocity baseline
- `2` — B frozen solver-owned root
- `3` — A′ causal-component reciprocity with old contact memory
- `4` — historical A″ composition
- `5` — stabilized donor A″ entry point
- `6` — A‴ E2.3d constraint-velocity candidate
- `WASD` / touch left stick — camera-relative movement
- `Space` / `JUMP` — jump
- `Shift` / `SPRINT` — sprint
- mouse/touch drag — orbit camera
- mouse wheel — zoom
- `R` / `RESET` — reset world + player
- `H` — telemetry; A‴ additionally exposes constraint caps/tick and reconstructed/native solve delta
- A′ capture URL only: `C` mark event, `X` export events

Public build:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Stable donor A″:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=donor`

A‴ Owner gate:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=constraint`

Direct A″ historical composition:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=momentum`

Owner capture for A′:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=causal&capture=1`

## Playground

The yard remains intentionally open rather than a prescribed obstacle course. It includes dynamic rigid bodies with different mass/shape affordances, a loose stack, slab, beam, static elevation changes, four `0.22 m` stair rises, a nearby `0.52 m` jump boundary, and one translating/rotating support.

## Runtime provenance

Current browser substrate:

- `box3d.js@0.1.1`
- `three@0.183.0`
- `vite@7.0.0`

`box3d.js@0.1.1` release commit:

`5d5a3af049cccd9948b2b55bac4342414af0ef64`

That release vendors native Box3D commit:

`8441b4a06d6d09dcfb0b0f704df4d847d1437b92`

Binding version and native engine snapshot are distinct provenance facts.

## Evidence history

- `cadb9405097ede149e64a64d8070c6127e8849a5` — E1-A1 physical-contact baseline.
- `5fd2aabdff35e79944bd82901175a9f64e73578f` — E1-A2 static gravity/support gate.
- `ee5bb1813ac691750359c1d8f6f3934c29d9426b` — E1-A2 dynamic-support specimen.
- `1416c2b7dc618fa99e5a3916326414178414997f` — Foundation 01 open embodied-player playground.
- `9d6e8ca77d024e784ed6aa5d71786ee3e223733d` — Foundation 02 quality/feel baseline.
- `12841bd5c095827092ee5aae0acc19981a848490` — exact Owner-tested Foundation 02.1 runtime.
- `ca7316da9d80ae1bf0fd009629316352991c9733` — machine-qualified E2 A/B runtime before documentation.
- `3725586c6369a978afbdb0f63a8c02fb1f03a451` — E2.1 diagnostic specimen before documentation.
- `cedf8a0315787d315445929d289651b6780d6b65` — E2.2 A/A′/B runtime before documentation.
- `462334ce98199eb1f66f832c032ab49e408567c5` — corrected E2.2b persistence diagnostic.
- `d786c0882aed950a64ada583ae521a878b48c09c` — completed E2.2c-0 reproduction gate before canonical merge.
- `c92183869ad9978f866863f91fda6fc4cdb9f148` — E2.2c-1 capture substrate qualification.
- `3293a92cf26ab73e28de23d769e700accdeec804` — first machine-qualified E2.2c-2 semantic falsifier.
- `4ed1a2c5555af2a59369784cc376f2153fdb1733` — first complete E2.3 binding-contract + intended-clip diagnostic before documentation.

## Validation

```bash
npm install
npm run smoke
npm run build
```

Canonical smoke preserves the older Foundation/E2 gates and then runs E2.1 localization, E2.2 falsifiers, E2.2b persistence, E2.2c capture/semantics gates, E2.3 momentum/binding boundary, E2.3b constraint-release relevance, the E2.3c policy falsifiers, frozen A″ fingerprint, E2.3d real-runtime/corner/oblique qualification, and donor/mobile contract gates.

## Current stage boundary

Confirmed current-best interpretation:

1. The old A′ delayed wrong-direction slide was a real contact-memory semantic pathology, and A″ removes it while preserving immediate contact consequence.
2. Owner free play currently prefers A″ behavior and reports appropriate wall rebounds.
3. There is no evidence that the absence of a visible grounded slide tail is itself a defect requiring "slide" to be added.
4. Grounded zero-input locomotion is independently a very strong momentum sink.
5. The current box3d.js binding silently prevents the intended native mover-plane velocity clipping contract from operating across separate JS solve/clip calls.
6. Restoring full intended clipping changes contact lifecycle and stair traversal, so it cannot be treated as a neutral substrate repair.
7. E2.3b establishes that current A″ can retain velocity through sustained geometric blocking and later release it into motion when the constraint clears, even after directional input has gone neutral.
8. E2.3c rejects immediate clipping and binary intent-release policies, then identifies intent-capped **surface-relative** normal velocity as the research survivor for static/kinematic constraints while leaving dynamic consequence to causal reciprocity.
9. E2.3d implements that survivor in isolated A‴ and machine-qualifies the real runtime against neutral/tangent/diagonal/held, stairs/ledge, Owner dynamic anchor, support carry, moving kinematic, multi-plane corner and oblique projection gates.
10. A″/Donor v0 non-interference is independently guarded by the frozen pre-E2.3d trajectory fingerprint.
11. The next high-information question is **Owner judgement of A‴ in ordinary free play against A″/Donor v0**, not more machine tuning. Does retiring stale blocked authority feel physically correct and controllable without making contact response feel sanitized or sticky?

Do not automatically:

- patch `box3d.js` / propagate `plane.push` into existing A″ or Donor v0;
- adopt native-intended full clipping;
- mutate Donor v0 or `DONOR_PROFILE_V0` to A‴ before Owner acceptance and a separate promotion decision;
- refactor A‴ back into `ControllerOwnedCharacter` merely to remove temporary duplication;
- tune constraint thresholds or locomotion deceleration without a reproduced perceptual problem;
- add a slide or recoil-memory system;
- reopen causal-component reciprocity;
- cap contact impulses;
- delete `externalVelocity` globally;
- promote A″ or A‴ to a final architecture winner.
