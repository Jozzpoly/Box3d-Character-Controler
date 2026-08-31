# Box3D Character Controler — Embodied Player Laboratory

This repository is a public browser laboratory for a broader question:

> How can a player possess a physical body in a simulated world while retaining enough control, readability, and fun that physics becomes part of gameplay rather than an obstacle?

The working tension is **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**.

## Current research state — E2.2c-1 Owner capture gate

The current line of research compares deliberately different ownership models rather than assuming one final character-controller architecture:

- **A** — frozen Foundation 02.1 controller-owned mover;
- **B** — frozen E2 solver-owned finite-mass translational root;
- **A′** — A with E2.2 causal-component dynamic reciprocity.

Owner free play established that A′ is preferable to A for the original dynamic-edge launch pathology, but still shows an exaggerated residual slide after some physical bounce interactions. A small amount of physical slide is desirable; the current complaint is that the tail can be excessive.

E2.2b proved that a real post-contact persistence mechanism exists: contact consequence can live simultaneously in ordinary `velocity` and remembered `externalVelocity`, and stronger global recovery changes useful moving-support carry as well. It did **not** prove that this mechanism dominates the Owner-observed free-play complaint.

E2.2c-0 therefore attempted a bounded, normal-gravity laboratory reproduction before designing another recovery model. The gate was negative: the tested Owner-like edge/fall and player-driven arc fixtures did not qualify as representative bounce-tail specimens. A separate normal-gravity side-ram did independently corroborate post-contact persistence under natural separation, but was not promoted as a gameplay representative.

The current E2.2c-1 stage changes the evidence-acquisition method instead of tuning fixtures until a desired pathology appears. An opt-in free-play capture records the few seconds around an event explicitly marked by the Owner. The capture path has been machine-qualified as non-interfering with the fixed-step physics result in its deterministic dynamic-contact fixture.

Detailed evidence:

- [`docs/E2_1_LOCALIZATION.md`](docs/E2_1_LOCALIZATION.md) — terrain/support boundary localization;
- [`docs/E2_2_RECIPROCITY.md`](docs/E2_2_RECIPROCITY.md) — reciprocity falsifier and A′ qualification;
- [`docs/E2_2B_MOMENTUM_PERSISTENCE.md`](docs/E2_2B_MOMENTUM_PERSISTENCE.md) — momentum-persistence diagnostic;
- [`docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md`](docs/E2_2C0_RESIDUAL_SLIDE_REPRODUCTION_GATE.md) — bounded reproduction gate and negative Owner-like verdict;
- [`docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md`](docs/E2_2C1_OWNER_FREEPLAY_CAPTURE.md) — Owner-marked capture contract and non-interference gate.

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

The baseline A exchange takes an effective-mass impulse along the mover contact normal. At a rounded edge that normal may be oblique, allowing a purely vertical approach to manufacture horizontal character momentum.

A′ instead transfers the components of momentum that actually contributed to closing the contact:

- horizontal closing transfers horizontal momentum along the horizontal contact-normal direction;
- vertical closing transfers vertical momentum;
- mixed contacts use a continuous weighted combination;
- the mixed direction is not renormalized above the original normal-impulse scalar.

Working interpretation:

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

The corrected airborne isolate, with zero player input after contact, measured current A′ at:

- `0.623 m` tail after `0.25 s`;
- `1.212 m` after `0.50 s`;
- `2.298 m` after `1.00 s`;
- about `2.30 m/s` horizontal `velocity` and `externalVelocity` still present at `0.50 s`.

Test-local damping showed that ordinary `velocity` was the larger immediate displacement carrier while remembered `externalVelocity` still materially participated. Damping only one channel left the other as a tail source.

A global airborne policy strong enough to reduce contact persistence also materially reduced translating-support jump carry. Therefore E2.2b did not justify a blind production drag/deceleration tune or a source-separated state model by itself.

## E2.2c-0 — representative reproduction gate

The bounded normal-gravity candidates were deterministic but did not qualify as the Owner complaint:

- slow edge glance: strong dynamic interaction, then `0.000 m` residual displacement over the clean first `0.25 s` after separation;
- medium edge glance: recontact after only two frames;
- player-driven arc at `3.2 m/s`: continuous/riding dynamic contact through the trial;
- nearby `4.0 m/s` arc: long contact and too-short clean separation before recontact.

A mechanism-control side-ram under normal gravity and without forced separation did show a short two-frame contact followed by `0.515 m` no-input displacement over `0.25 s`, with both horizontal `velocity` and `externalVelocity` still about `2.007 m/s`.

Verdict:

> **Owner-like laboratory reproduction NOT QUALIFIED; normal-gravity persistence independently corroborated.**

The project should not continue searching offsets, masses and speeds until a desired pathology appears.

## E2.2c-1 — Owner-marked free-play capture

Capture is opt-in and only active for A′:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=causal&capture=1`

In capture mode:

- play normally;
- press `C` when the problematic residual slide has just occurred;
- the ring buffer preserves up to `3.0 s` before that marker and continues for `1.5 s` after it;
- press `X` to export marked events as JSON.

Each frame records the exact camera-relative input basis, character position/velocity/external state/support/contact summary, and the transform plus linear/angular velocity of all `11` bounded resettable playground bodies. Reset boundaries create explicit capture epochs.

The capture path does not modify `src/character.js` and is not instantiated without `?mode=causal&capture=1`.

Machine non-interference qualification:

`dynamicContacts=1 · eventFrames=270 · pre=180 · post=90 · bodiesPerFrame=11`

The capture-on and capture-off deterministic runs ended in the same character and world state at the `1e-12` comparison tolerance used by the gate.

## B — frozen E2 solver-owned root

- real `80 kg` Box3D dynamic capsule;
- translation/collision response owned by the solver;
- angular motion intentionally locked;
- locomotion/jump through bounded centre-of-mass impulses;
- no mover position solve;
- no manual dynamic reciprocity;
- no manual support-position transport.

E2.1 showed that its rough-terrain limitation is not fixed by ordinary friction or stronger horizontal authority. B naturally passed only roughly `0.05–0.10 m` vertical steps in the diagnostic and remained blocked on `0.15–0.22 m` steps even at `104 m/s²` ground authority.

B remains evidence, not a discarded representation and not a current winner.

## Public controls

Mode changes reload the world so one specimen does not inherit another specimen's disturbed playground.

- `1` — A frozen normal-reciprocity baseline
- `2` — B solver-owned root
- `3` — A′ causal-component reciprocity
- `WASD` — camera-relative movement
- `Space` — jump
- `Shift` — sprint
- mouse drag — orbit camera
- mouse wheel — zoom
- `R` — reset world + player
- `H` — causal telemetry
- capture URL only: `C` mark event, `X` export events

Public build: https://jozzpoly.github.io/Box3d-Character-Controler/

Direct A′: https://jozzpoly.github.io/Box3d-Character-Controler/?mode=causal

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

Canonical smoke runs the frozen Foundation/E2 gates first, then E2.1 localization, E2.2 falsifiers, E2.2b persistence, E2.2c-0 reproduction and the E2.2c-1 capture non-interference gate.

## Current stage boundary

Confirmed current-best facts:

1. E2.2 causal-component reciprocity materially improved the old cross-axis dynamic-edge amplification.
2. Owner still finds some A′ residual post-bounce slide excessive while explicitly wanting some physical slide to remain.
3. A synthetic but valid post-contact persistence mechanism is co-owned by ordinary `velocity` and remembered `externalVelocity`.
4. Normal-gravity natural-separation evidence confirms that persistence is not merely a zero-gravity/forced-separation artifact.
5. Bounded laboratory attempts did not qualify a representative Owner-like slide specimen.
6. The next evidence should therefore come from an Owner-marked natural free-play event rather than further parameter search.
7. The opt-in capture path has been machine-qualified as non-interfering with the deterministic fixed-step physics state.

Do not automatically:

- tune production `externalAirDrag` / `airDeceleration`;
- split `externalVelocity` into source channels;
- cap contact impulses;
- alter moving-support inheritance;
- add B terrain negotiation;
- promote A′ to accepted baseline;
- begin deep phase attribution on the side-ram control.

The next distinct research stage is **E2.2c-2 Owner Event Recovery**, and it should begin only after a real Owner-marked capture is available. Its first question is whether the captured event can be replayed closely enough to reproduce the marked behavior. Only then should deeper instrumentation separate mover correction, active contact generation/accumulation, clip/support transitions and post-contact persistence.
