# E2.2 — Reciprocity Decontamination Falsifier

Status: **machine-qualified survivor exposed as A′ for Owner free play**.

Exact machine-qualified public A/A′/B runtime before documentation: `cedf8a0315787d315445929d289651b6780d6b65`.

## Question

E2.1 showed that A's rounded mover gives useful small-terrain continuity, but a vertical edge encounter can create lateral positional correction; the manual finite-mass reciprocity layer can then amplify the corresponding dynamic-object case from roughly `0.23–0.24 m` into more than `1 m` of lateral motion.

E2.2 therefore asked:

> Can a small, general reciprocity rule separate mover-owned geometric deflection from momentum exchange with dynamic matter, reducing the edge amplification without sacrificing ordinary push, reverse consequence, dynamic landing or static traversal?

This stage deliberately did **not** add terrain negotiation to B, polish movement feel, change the mover geometry, or build another character architecture.

## Frozen controls

- **A** remains Foundation 02.1 with the original normal-directed effective-mass exchange.
- **B** remains the E2 solver-owned translational root.
- Frozen Foundation 02.1 and E2 tests run before E2.2 tests.

The E2.2 candidates were initially implemented only inside diagnostic harnesses. Production runtime was touched only after one candidate survived broader falsification.

## Negative control — no exchange

Disabling dynamic reciprocity entirely reduces the reproduced `x=0.74` dynamic-edge case from about `1.10 m / 1.34 m/s / 259.3 N·s` to about `0.23 m / 0.00 m/s / 0 N·s`.

But it also destroys the intended physical coupling:

- isolated push falls from about `-1.48 m / 169.4 N·s` to about `-0.30 m / 0 N·s`;
- reverse ram response falls from about `-0.16 m` with `0.32 m/s` external response to about `-0.04 m / 0`;
- dynamic landing retains support detection but transfers no manual contact impulse.

Therefore simply removing reciprocity is not a solution.

## Rejected candidate — cross-axis gate

A first candidate suppressed exchange when an oblique contact had a meaningful horizontal normal but the measured closing motion was purely vertical.

It initially looked nearly perfect:

- edge drift fell to the no-exchange floor;
- ordinary push, reverse ram, dynamic landing and static traversal all matched baseline.

That apparent survivor was rejected after a continuity probe.

At the same `x=0.74` edge case:

- `vx = 0.00`: about `0.23 m` drift;
- `vx = -0.01`: about `0.23 m`;
- `vx = -0.03`: suddenly about `0.89 m`, with about `256 N·s` exchange restored.

The threshold rule therefore created a discontinuous switch between "no exchange" and nearly full baseline exchange. A first automated verdict failed to notice this because it compared only the two smallest velocity samples. The verdict was corrected rather than accepting a fixture-winning result.

Final verdict:

> **REJECT — discontinuous threshold behavior.**

## Dominated candidate — approach-aligned exchange

A second candidate kept the finite-mass scalar ceiling but directed the exchanged impulse along relative approach instead of the mover contact normal.

It removed the edge launch, but it also weakened ordinary interactions:

- isolated push displacement fell from about `-1.48 m` to about `-0.80 m`;
- reverse response fell from roughly `-0.16 m / 0.32 m/s` to `-0.13 m / 0.25 m/s`.

It was not pursued because a later candidate preserved those baseline behaviors exactly while providing the same edge benefit.

## Survivor — causal-components reciprocity

The surviving rule keeps the existing finite-mass effective-mass scalar as a ceiling but changes how that scalar is distributed across axes.

For each dynamic contact it asks which components of **relative motion actually contributed to closing the contact**:

- horizontal relative closing contributes only to the horizontal contact-normal direction;
- vertical relative closing contributes only to the vertical direction;
- mixed contacts receive a continuous weighted combination;
- the mixed direction is not renormalized, so the total transferred momentum does not exceed the original normal-impulse scalar.

The conceptual separation is:

> **The mover owns geometric deflection. Reciprocity transfers causal momentum; it does not use the mover's oblique edge normal to manufacture a new momentum axis.**

Consequently a vertical fall can still load and excite a dynamic body, but it cannot create a large horizontal character impulse solely because the rounded mover encountered an oblique edge normal.

## Continuity result

At `x=0.74`, with a vertical drop plus increasing small inward horizontal velocity:

| initial `vx` | baseline drift | causal-components drift |
| ---: | ---: | ---: |
| `0.00` | `1.10 m` | `0.23 m` |
| `-0.01` | `1.10 m` | `0.23 m` |
| `-0.03` | `0.97 m` | `0.23 m` |
| `-0.10` | `0.71 m` | `0.23 m` |
| `-0.30` | `0.54 m` | `0.22 m` |

Unlike the rejected threshold gate, the survivor does not show a discontinuous return of the launch as a tiny horizontal component appears.

## Broader edge matrix

The survivor was then stressed across:

- edge offsets `0.62`, `0.68`, `0.74`, `0.80`, `0.86`;
- zero horizontal motion;
- small inward motion;
- larger inward motion;
- mixed X/Z motion;
- outward motion.

Results:

- **21/21** cases where baseline drift exceeded the diagnostic problem threshold were materially improved;
- **0** matrix cases became meaningfully worse than baseline;
- all **25/25** causal-component cases still produced measurable physical response in the dynamic body under the test criterion;
- dynamic bodies continued receiving large impulses and substantial angular motion, so the result is not produced by silently turning physics off.

Representative examples:

- `x=0.68, vx=0`: baseline `0.71 m` → causal `0.29 m`;
- `x=0.74, vx=0`: baseline `1.10 m` → causal `0.23 m`;
- `x=0.80, vx=0`: baseline `1.35 m` → causal `0.18 m`;
- `x=0.86, vx=-0.03`: baseline `1.48 m` → causal `0.11 m`.

## Pure-axis preservation

The important counter-falsifiers remained at baseline values:

- isolated ordinary push: baseline `-1.48 m / 169.4 N·s`; causal `-1.48 m / 169.4 N·s`;
- reverse ram: baseline about `-0.16 m / 0.32 m/s`; causal about `-0.16 m / 0.32 m/s`;
- central dynamic landing: baseline `159` dynamic-support frames / `474.5 N·s`; causal `159 / 474.5`;
- ordinary static stairs: PASS;
- `0.52 m` ledge remains a jump boundary: PASS.

This is expected from the rule: a purely horizontal physical interaction remains horizontal, and a purely vertical one remains vertical. The changed behavior is concentrated in mixed-axis contacts where the mover's geometry would otherwise redirect momentum.

## Production-path qualification

After the harness survivor was established, the rule was promoted into `ControllerOwnedCharacter` as an explicit optional `reciprocityMode`:

- default `normal` preserves frozen A;
- `causal-components` creates A′.

The real production path reproduced the diagnostic result:

- edge: A `1.10 m / 1.34 m/s` → A′ `0.23 m / 0.02 m/s`;
- push: identical `-1.48 m / 169.4 N·s`;
- reverse: identical `-0.16 m / 0.32 m/s`;
- dynamic landing: identical `159 / 474.5 N·s`;
- stairs: PASS;
- ledge boundary: PASS.

Frozen A remains the default mode and its existing Foundation 02.1 qualification values still pass.

## Public Owner instrument

The public research surface now exposes three independently reloaded modes:

- `1` — **A**: frozen Foundation 02.1 normal reciprocity;
- `2` — **B**: frozen E2 solver-owned translational root;
- `3` — **A′**: same controller-owned mover as A, changing only dynamic reciprocity to causal-components.

Direct A′ query: `?mode=causal`.

The important Owner comparison is primarily **A versus A′**, especially during unscripted jumping, landing and moving across dynamic props. B remains present as a useful ownership contrast but E2.2 did not alter it.

## Interpretation

E2.2 materially weakens the claim that A's observed dynamic-edge pathology is an unavoidable cost of controller-owned state.

A small general coupling change can, in the tested space, preserve useful terrain continuity and the previously accepted physical interactions while removing the dominant cross-axis amplification identified in E2.1.

That does **not** establish that A′ is a final controller or that controller-owned representation wins. Important residual facts remain:

- the underlying rounded mover still performs about `0.1–0.3 m` of positional edge correction in the reproduced edge family;
- A′ still uses manual support transport and manual finite-mass reciprocity;
- the broader feel of A′ has not yet been Owner-tested;
- B's rough-terrain boundary remains unresolved;
- future representation experiments remain open.

## Stage boundary

E2.2 stops at a **single machine-qualified public A′ survivor awaiting Owner free play**.

Do not automatically:

- replace A with A′ as the accepted baseline;
- tune A′ further;
- fix the remaining static edge correction;
- start a new B terrain-negotiation subsystem;
- add rotation, balance, ragdoll, grab or traversal features;
- generalize the rule into a character-controller framework.

The next evidence is Owner observation of whether A′ actually removes the reported slippery / launch-like behavior in open play **without making physical interaction feel weaker or less coherent**.
