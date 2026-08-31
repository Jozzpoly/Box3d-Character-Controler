# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current research state — E2.2c-2 momentum semantics falsifier

The current line of research compares deliberately different ownership/state models rather than assuming one final character-controller architecture:

- **A** — frozen Foundation 02.1 controller-owned mover;
- **B** — frozen E2 solver-owned finite-mass translational root;
- **A′** — A with E2.2 causal-component dynamic reciprocity;
- **A″** — disposable Owner-test probe: same A′ contact path, but dynamic-contact `Δv` is not retained as a persistent `externalVelocity` target.

Owner free play established that A′ is preferable to A for the original dynamic-edge launch pathology, but still shows an exaggerated residual slide after some physical bounce interactions. The first E2.2c-1 Owner-marked capture sharpened that complaint: some residual motion also felt as if it failed to preserve the direction of momentum.

The capture supported a specific code-level concern. A′ applies dynamic-contact reaction once to current `velocity`, but also writes the same reaction into horizontal `externalVelocity`; locomotion later targets `desiredVelocity + externalVelocity`. In clear marked events, the physical contact largely arrested incoming motion while leaving a large remembered external target in a different or opposite direction. Grounded zero-input recovery could then accelerate current velocity toward that old contact `Δv` after dynamic contact had ended.

E2.2c-2 therefore tests the smallest semantic alternative before designing a new momentum framework: keep the full A′ physical collision and body impulse, but do not remember dynamic-contact `Δv` as an absolute external target. A recovered-state `owner-1` anchor preserved the identical first collision and moving-support inheritance while reducing the measured 0.50 s tail from `0.773 m` to `0.110 m` and peak reversal relative to incoming direction from `2.547 m/s` to `0.418 m/s`.

A″ is now a machine-qualified **Owner comparison probe**, not an accepted baseline.

Detailed evidence:

- [`docs/E2_1_LOCALIZATION.md`](docs/E2_1_LOCALIZATION.md) — terrain/support boundary localization;
- [`docs/E2_2_RECIPROCITY.md`](docs/E2_2_RECIPROCITY.md) — reciprocity falsifier and A′ qualification;
- [`docs/E2_2B_MOMENTUM_PERSISTENCE.md`](docs/E2_2B_MOMENTUM_PERSISTENCE.md) — momentum-persistence diagnostic;
- [`docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md`](docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md) — bounded reproduction gate and negative Owner-like verdict;
- [`docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md`](docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md) — Owner-marked capture contract and non-interference gate;
- [`docs/E2_2C2_MOMENTUM_SEMANTICS.md`](docs/E2_2C2_MOMENTUM_SEMANTICS.md) — real-capture diagnosis and A″ falsifier.

## A — frozen Foundation 02.1 baseline

- controller-owned capsule position/state;
- `80 kg` virtual interaction mass;
- rounded mover plane solve;
- original normal-directed effective-mass exchange with dynamic contacts;
- body-local support transport;
- persistent external recoil component;
- camera-relative bounded locomotion and shaped jump;
- exact Owner-tested Foundation 02.1 specimen: `12841bd5c095827092ee5aae0acc19981a848490`.

E2.1 reproduced A's dynamic-edge problem deterministically. A vertical drop near a dynamic cube edge produced about `1.10 m` lateral drift and `1.34 m/s` horizontal speed with about `259 N·s` of manual contact impulse. Removing dynamic reciprocity reduced that case to the mover's underlying positional correction of about `0.23 m`.

A remains frozen as a historical comparison control.

## A′ — causal-component reciprocity survivor

A′ uses the same controller-owned mover and locomotion/support mechanisms as A. The E2.2 variable is only how manual dynamic reciprocity distributes momentum across axes.

The working separation is:

> **The mover owns geometric deflection. Reciprocity transfers causal momentum rather than using the mover's edge normal to manufacture a new momentum axis.**

Machine qualification included:

- dynamic edge at `x≈0.74`: A `1.10 m / 1.34 m/s` → A′ `0.23 m / 0.02 m/s`;
- isolated ordinary push: both `-1.48 m / 169.4 N·s`;
- reverse ram: both about `-0.16 m / 0.32 m/s` external response;
- central dynamic landing: both `159` dynamic-support frames / `474.5 N·s`;
- ordinary stairs: PASS;
- `0.52 m` ledge remains a jump boundary: PASS;
- broader matrix: `21/21` problematic A cases improved, `0` meaningfully worse, with physical response retained.

A′ remains a survivor, not an accepted final baseline or architecture verdict.

## E2.2b — persistence boundary

The corrected airborne isolate measured current A′ at:

- `0.623 m` tail after `0.25 s`;
- `1.212 m` after `0.50 s`;
- `2.298 m` after `1.00 s`;
- about `2.30 m/s` horizontal `velocity` and `externalVelocity` still present at `0.50 s`.

Test-local damping showed that ordinary `velocity` was the larger immediate displacement carrier while remembered `externalVelocity` still materially participated. A global policy strong enough to reduce contact persistence also materially reduced translating-support jump carry, so E2.2b did not justify blind drag/deceleration tuning.

## E2.2c-0 — representative reproduction gate

Bounded normal-gravity candidates were deterministic but did not qualify as representative Owner complaint specimens. A separate normal-gravity side-ram did independently corroborate post-contact persistence under natural separation.

Verdict:

> **Owner-like laboratory reproduction NOT QUALIFIED; normal-gravity persistence independently corroborated.**

The project therefore changed evidence-acquisition method rather than searching offsets, masses and speeds until a desired pathology appeared.

## E2.2c-1 — Owner-marked free-play capture

Capture remains available for A′:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=causal&capture=1`

In capture mode:

- play normally;
- press `C` when the problematic residual slide has just occurred;
- the ring buffer preserves up to `3.0 s` before that marker and continues for `1.5 s` after it;
- press `X` to export marked events as JSON.

Each frame records the exact camera-relative input basis, character position/velocity/external state/support/contact summary, and the transform plus linear/angular velocity of all `11` bounded resettable playground bodies. Reset boundaries create explicit capture epochs.

The capture-on and capture-off deterministic runs ended in the same character and world state at the `1e-12` comparison tolerance used by the gate.

## E2.2c-2 — A″ contact-momentum semantics probe

The first real Owner capture exposed a narrower defect than generic "too much slide": dynamic-contact reaction is a `Δv`, yet A′ also stores that same vector as future `externalVelocity` target state.

A″ is intentionally implemented as a disposable adapter around A′ instead of a new controller architecture. The complete A′ `postStep` still performs mover solve, causal reciprocity, current-velocity reaction, rigid-body impulse, clipping and support discovery. Only the newly added horizontal dynamic-contact memory is removed afterward; non-contact external state and moving-support inheritance remain untouched.

Recovered `owner-1` anchor results:

| metric | A′ | A″ |
| --- | ---: | ---: |
| contact episode | `7f` | `7f` |
| first impulse | `86.86 N·s` | `86.86 N·s` |
| peak external speed | `3.222 m/s` | `0.488 m/s` |
| post-contact tail at `0.25 s` | `0.395 m` | `0.054 m` |
| post-contact tail at `0.50 s` | `0.773 m` | `0.110 m` |
| peak reversal relative to incoming direction | `2.547 m/s` | `0.418 m/s` |

The contacted body's first linear and angular responses were identical at the diagnostic tolerance. Translating-support jump carry was also identical in both variants: `1.501 m/s` inherited external speed and `0.735 m` displacement after `0.50 s`.

Working interpretation:

> **Dynamic-contact `Δv` should not automatically be treated as a persistent absolute velocity target.**

This does not settle the remaining contact-impulse magnitude, multi-frame accumulation, player recovery law or final use of `externalVelocity`.

## B — frozen E2 solver-owned root

- real `80 kg` Box3D dynamic capsule;
- translation/collision response owned by the solver;
- angular motion intentionally locked;
- locomotion/jump through bounded centre-of-mass impulses;
- no mover position solve;
- no manual dynamic reciprocity;
- no manual support-position transport.

E2.1 showed that its rough-terrain limitation is not fixed by ordinary friction or stronger horizontal authority. B naturally passed only roughly `0.05–0.10 m` vertical steps in the diagnostic and remained blocked on `0.15–0.22 m` steps even at `104 m/s²` ground authority.

B remains evidence, not a discarded representation and not a current winner. Current upstream Box2D research also demonstrates richer solver-owned mover designs than this intentionally minimal B, so B's terrain failure must not be generalized to the entire representation class.

## Public controls

Mode changes reload the world so one specimen does not inherit another specimen's disturbed playground.

- `1` — A frozen normal-reciprocity baseline
- `2` — B frozen solver-owned root
- `3` — A′ causal-component reciprocity with current contact memory
- `4` — A″ same A′ physical contact, but contact `Δv` is not remembered as external target
- `WASD` — camera-relative movement
- `Space` — jump
- `Shift` — sprint
- mouse drag — orbit camera
- mouse wheel — zoom
- `R` — reset world + player
- `H` — telemetry
- A′ capture URL only: `C` mark event, `X` export events

Public build: https://jozzpoly.github.io/Box3d-Character-Controler/

Direct A′: https://jozzpoly.github.io/Box3d-Character-Controler/?mode=causal

Direct A″: https://jozzpoly.github.io/Box3d-Character-Controler/?mode=momentum

Owner capture: https://jozzpoly.github.io/Box3d-Character-Controler/?mode=causal&capture=1

## Playground

The yard remains intentionally open rather than a prescribed obstacle course. It contains rigid bodies with different mass/shape affordances, a loose stack, slab, beam, static elevation changes and one translating/rotating support.

Known traversal fixtures include four `0.22 m` static stair rises, a nearby `0.52 m` jump boundary and low dynamic props that remain physical/pushable matter.

## Evidence history

The implementation is disposable; accepted observations are not.

- `cadb9405097ede149e64a64d8070c6127e8849a5` — E1-A1 physical-contact baseline.
- `5fd2aabdff35e79944bd82901175a9f64e73578f` — E1-A2 static gravity/support gate.
- `ee5bb1813ac691750359c1d8f6f3934c29d9426b` — E1-A2 dynamic-support specimen.
- `1416c2b7dc618fa99e5a3916326414178414997f` — Foundation 01 open embodied-player playground.
- `9d6e8ca77d024e784ed6aa5d71786ee3e223733d` — Foundation 02 quality/feel baseline.
- `12841bd5c095827092ee5aae0acc19981a848490` — exact Owner-tested Foundation 02.1 runtime.
- `ca7316da9d80ae1bf0fd009629316352991c9733` — machine-qualified E2 A/B runtime before documentation.
- `3725586c6369a978afbdb0f63a8c02fb1f03a451` — machine-qualified E2.1 diagnostic specimen before documentation.
- `cedf8a0315787d315445929d289651b6780d6b65` — machine-qualified E2.2 A/A′/B runtime before documentation.
- `462334ce98199eb1f66f832c032ab49e408567c5` — corrected E2.2b persistence diagnostic before documentation.
- `d786c0882aed950a64ada583ae521a878b48c09c` — completed E2.2c-0 reproduction-gate branch record before canonical merge.
- `c92183869ad9978f866863f91fda6fc4cdb9f148` — E2.2c-1 capture substrate machine qualification before documentation.
- `3293a92cf26ab73e28de23d769e700accdeec804` — first machine-qualified E2.2c-2 semantic falsifier before public A″ exposure.

## Runtime provenance

Current browser substrate remains intentionally small:

- `box3d.js@0.1.1`
- `three@0.183.0`
- `vite@7.0.0`

`box3d.js@0.1.1` vendors native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92`. Binding version and native engine snapshot are distinct provenance facts.

## Validation

```bash
npm install
npm run smoke
npm run build
```

Canonical smoke runs the frozen Foundation/E2 gates first, then E2.1 localization, E2.2 falsifiers, E2.2b persistence, E2.2c-0 reproduction, E2.2c-1 capture non-interference and the E2.2c-2 momentum-semantics falsifier.

## Current stage boundary

Confirmed current-best facts:

1. E2.2 causal-component reciprocity materially improved the old cross-axis dynamic-edge amplification.
2. Owner still finds some A′ residual post-bounce slide excessive and reports that its direction can feel inconsistent with the physical momentum.
3. Real Owner capture confirms that contact can largely arrest incoming motion while leaving a large remembered `externalVelocity` target in another direction; zero-input grounded control can then rebuild velocity toward that target after dynamic contact ends.
4. A recovered-state anchor shows that removing only dynamic-contact memory preserves the first collision and body response while reducing the 0.50 s tail from `0.773 m` to `0.110 m` and peak reversal from `2.547 m/s` to `0.418 m/s`.
5. Moving-support inheritance remains exactly unchanged in that falsifier.
6. This strongly supports a contact-memory semantic defect but does not settle remaining impulse magnitude/contact accumulation or final agency recovery.
7. A″ is therefore exposed only as an Owner comparison probe.

Do not automatically:

- replace A′ with A″ as the accepted baseline;
- remove `externalVelocity` globally;
- change moving-support inheritance;
- tune drag constants to force a desired answer;
- cap contact impulses before remaining magnitude is isolated;
- add B terrain negotiation;
- infer that controller-owned or solver-owned representation has won.

The next evidence is **Owner A′↔A″ free play**. If A″ preserves credible physical consequence while removing the wrong-direction / excessive tail, the next distinct research target becomes remaining impulse magnitude/contact accumulation and bounded player recovery. If A″ feels too dead or still directionally wrong, the next falsifier should be chosen from that failure rather than restoring the old duplicated target semantics.
