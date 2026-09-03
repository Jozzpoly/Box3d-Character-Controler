# E12 — Graded capacity entitlement and dynamic-support placement boundary

Status: **closed research stage / positive architecture-boundary evidence / no runtime promotion**

Canonical base when E12 began:

`f1c64a812dde50dd00b2f2f2879da2e62df58421`

E12 starts from the E11 conclusion that binary support eligibility is too weak for a world-external residual: materially weak traction can become only a key that unlocks accepted-looking translation. E12 does **not** select a production hybrid, change A‴/Donor v1, weaken accepted `31/36 m/s²` agency, or promote any new runtime mechanic.

## 1. Research question

E11 left two candidate authority ideas that were causally distinct enough to justify a bounded comparison:

1. **graded world-external entitlement** — nonreciprocal residual authority scales with a physical support-capability signal rather than a boolean contact flag;
2. **reciprocal support-mediated placement** — the granted authority appears as equal-and-opposite player/support momentum exchange.

The E12 sequence asked four progressively narrower questions:

1. Can a capability-derived graded entitlement preserve current31 on normal support without masking weak/zero traction?
2. Does the same entitlement survive current36 braking without changing the accepted brake-start protocol?
3. Can the same entitlement be compared fairly between world-external and reciprocal placement on a real dynamic support?
4. Does an isolated player+free-support system contain any meaningful relative/contact/posture discriminator between those placements, or are they essentially the same support-relative motion plus a world-frame momentum offset?

No gain/ratio sweep was used to rescue a failure.

## 2. Common capacity signal

E12 uses the existing pinned-substrate E5.0a load calibration:

`J_n~ = 0.5 × totalNormalImpulse`

The ordinary settled support traction scale for the canonical research surface is:

`J_capacity,nominal = 0.95 × 80 kg × 20 m/s² × 1/60 s = 25.3333 N·s/frame`

The graded entitlement is therefore:

`q = clamp( μ × J_n~ / 25.3333, 0, 1 )`

Important scope:

- `q` is an E12 research entitlement signal, not a promoted gameplay formula;
- the denominator is not fitted to E12 output — it is the pre-existing ordinary `μ=.95` static-support capacity;
- `J_n~` remains the pinned E5 diagnostic load estimate, not a universal support policy;
- no `J_assist/J_phys` ratio is fitted or swept;
- lower measured `J_phys` is not automatically called masking, preserving the E11.1a correction.

## 3. E12.0a — current31 graded-entitlement falsifier

Probe:

`scripts/e12-0a-capacity-entitled-residual.mjs`

### Question

> **Can instantaneous traction capacity grade a physics-first world-external residual strongly enough that normal support retains accepted current31 translation while materially weak and zero-friction worlds remain translationally distinct?**

The specimen keeps the qualified E4/E5 current31 + lead8 kinematic-support protocol. Friction is symmetrically matched on player and platform at `μ=.95`, `.20`, or `0`, so the declared coefficient remains the actual mixed coefficient.

After every Box3D solve:

1. physical contact acts first;
2. `J_n~` is read from that solve;
3. `q` is computed;
4. any residual remains world-external and mass-proportional;
5. the frame cap is `q × (80 × 31 × 1/60) = q × 41.3333 N·s`;
6. the residual still requires support before+after solve and a positive same-frame intent-aligned physical horizontal whole-body impulse.

Predeclared discrimination reused the existing E5.2 accepted near-match window `|v_end−5.2| <= 0.10 m/s`: normal support must near-match and recover; weak and zero support must not look accepted.

Exact positive head:

`8ab931d4b9bbf5d998520ae7c7f98453215b0cea`

Workflow:

`33755367571` — SUCCESS; research smoke, Donor smoke and build passed.

### Results

Normal `μ=.95`:

- direction `-`: physical `4.204 m/s`; entitled `5.218 m/s`, error `−0.018`, `RECOVER`;
- direction `+`: physical `4.216 m/s`; entitled `5.273 m/s`, error `−0.073`, `RECOVER`;
- mean `q = 0.965 / 0.970`, max `1.000`;
- entitled external fraction about `0.382 / 0.397`;
- zero support loss.

Weak `μ=.20`:

- physical `1.046 / 1.066 m/s`, both `FALL`;
- entitled `1.748 / 1.707 m/s`, both `FALL`;
- mean `q = 0.126 / 0.115`;
- still roughly `3.45–3.49 m/s` short of accepted speed.

Zero friction:

- `q=0`;
- external impulse exactly `0`;
- ramp speed remains essentially `0`.

### Result

> **A support-capacity-derived graded entitlement can preserve accepted current31 translation on the normal canonical support specimen without turning materially weak or zero traction into accepted-looking translation.**

This is the direct anti-masking improvement over E11.2a. It qualifies only the declared canonical launch specimen.

## 4. E12.1a — current36 braking

Probe:

`scripts/e12-1a-capacity-entitled-braking.mjs`

### First attempt — confounded harness failure

The first braking harness directly assigned `±5.2 m/s` to player and platform before lead8. That state was **not** dynamically equivalent to the qualified E4.6 history: even the normal physical-only control fell, despite canonical E4.6 current36/lead8 being a known `RECOVER` case.

Exact confounded head:

`ff6c8bf511c61bcd3e254a463763be4de278f598`

Workflow:

`33756365385` — FAILURE.

This is retained as a harness failure, not negative evidence against graded entitlement.

### Corrected protocol

The corrected specimen reproduces E4.6 history before introducing the friction counterfactual:

`settle → physical 4 m/s² cruise setup → 120f neutral cruise → lead8`

All of that occurs at normal `μ=.95`. Only after the qualified lead8 state, with no intervening physics step, are player/platform frictions switched to `.95/.20/0` for braking.

The final partial braking frame uses its actual platform deceleration (`24 m/s²`) for the effective-up posture target rather than incorrectly pretending every frame is a full `36 m/s²` step.

A hard pre-state control requires physical/assisted and all friction counterfactuals to match brake-start whole-body speed, torso tilt, torso angular velocity and foot tilt inside `1e-6` before friction changes.

Brake entitlement uses the same `q` and a current36 cap:

`q × (80 × 36 × 1/60) = q × 48 N·s/frame`

Exact corrected head:

`d3e8886bbf55da47d33835cbc6e346779a155208`

Workflow:

`33756915671` — SUCCESS; research smoke, Donor smoke and build passed.

### Results

Normal `μ=.95`:

- physical-only brake ends at `1.430 / 1.426 m/s`, both `RECOVER`;
- entitled brake ends essentially at `0.000 / 0.000 m/s`, both `RECOVER`;
- mean `q = 0.970 / 0.964`;
- zero support loss.

Weak `μ=.20`:

- physical-only ends `3.701 / 3.830 m/s`, both `FALL`;
- entitled ends `3.222 / 3.387 m/s`, both `FALL`;
- mean `q = 0.109 / 0.119`;
- the weak world remains materially far from accepted stopping.

Zero friction:

- entitled impulse is exactly `0`;
- body retains about `4.318 / 4.479 m/s` and falls.

### Result

> **The same capacity-entitlement principle survives the accepted current36 braking demand when the qualified E4.6 brake-start history is reproduced exactly.**

E12 therefore has positive canonical evidence on both accepted longitudinal agency directions: current31 launch and current36 braking.

## 5. E12.2a — dynamic-support placement calibration

Probe:

`scripts/e12-2a-dynamic-support-placement-calibration.mjs`

### Why support-relative scaling matters

A direct comparison that applies the same impulse to world-external and reciprocal variants is mechanically unfair. If an equal-and-opposite impulse also recoils the support, the same player impulse produces a larger **player-relative-to-support** velocity change.

For an `80 kg` player and `800 kg` dynamic support, E12 therefore compares the same granted support-relative agency:

- world-external: `J = M_player × Δv_rel`;
- reciprocal: `J = M_reduced × Δv_rel`, where `M_reduced = 1/(1/M_player + 1/M_support)`.

This is ordinary two-body mechanics, not a fitted compensation gain.

The specimen uses the full finite `SagittalBalanceOrganism` on a real `800 kg` dynamic platform free only along the sagittal axis. A neutral physics-first outer step establishes `q`; then exactly one authority pulse is applied.

This gate intentionally does **not** reuse the kinematic E12 positive-horizontal-`Jphys` eligibility condition. On dynamic support, that sign can itself depend on reaction placement and would contaminate an experiment intended to isolate placement. Support existence and the common `q` are held fixed; placement is the only causal difference.

Exact head:

`62a6f4e391d5753527a98c4701acabcc64bef46d`

Workflow:

`33759730042` — SUCCESS.

### Results

Normal `μ=.95`:

- `q=1.000` in both mirrors;
- granted relative `Δv = 0.51667 m/s`;
- world-external: player/support/total authority momentum `41.333 / 0 / 41.333 N·s`;
- reciprocal: `37.576 / −37.576 / ~0 N·s`;
- both placements produce the same support-relative `Δv`.

Weak `μ=.20`:

- `q=0.211` in both mirrors;
- granted relative `Δv = 0.10877 m/s`;
- world-external total injected momentum `8.702 N·s`;
- reciprocal player/support exchange `±7.911 N·s`, total `~0`;
- weak relative authority is only about `21.1%` of normal.

### Result

> **The same graded entitlement composes coherently with either placement when support-relative agency is compared fairly. World-external placement injects horizontal system momentum; reciprocal placement produces equal-and-opposite dynamic-support reaction.**

This qualifies placement/accounting semantics only. It does not choose a placement.

## 6. E12.2b — Galilean placement decomposition

Probe:

`scripts/e12-2b-galilean-placement-decomposition.mjs`

### Question

> **After matched support-relative authority is granted, does an isolated player + freely translating support contain any meaningful relative/contact/posture difference between world-external and reciprocal placement, or do the variants differ only by a common world-frame boost?**

A source audit before execution found an important existing world-relative channel: `SagittalBalanceOrganism` uses `linearDamping=0.015` on foot and torso while the dynamic platform has zero damping. E12.2b therefore predeclares a causal decomposition:

- canonical player linear damping `0.015` — observation;
- diagnostic zero-player-damping control — exact Galilean-equivalence gate.

Each case receives one E12.2a q-entitled current31 support-relative pulse and then `60` frames / `1.0 s` with **zero further translational authority**. Frame traces compare relative velocity/position, torso and foot posture/angular velocity, support load, world-frame boost, total horizontal momentum, support continuity and fall status.

Exact head:

`df1077128d76769cca008d1bc2fcb6566ec55070`

Workflow:

`33760538078` — SUCCESS; `76` research scripts, `4` Donor scripts and production build passed; Pages correctly skipped on the branch.

### Zero-damping causal control

Normal support:

- max world-external vs reciprocal relative-velocity divergence: `5.08e−8 / 1.91e−7 m/s`;
- relative-position divergence about `8.5e−9 m`;
- torso-tilt divergence below about `1.3e−6°`;
- reciprocal total horizontal momentum stayed below about `9e−6 N·s`;
- world-external total momentum stayed exactly `41.3333 → 41.3333 N·s` inside the declared numerical envelope;
- support stayed continuous and neither variant fell.

Weak support was similarly equivalent near machine precision; world-external momentum stayed `8.7017 N·s`, reciprocal total stayed approximately zero.

This validates the expected isolated two-body symmetry.

### Canonical `0.015` player damping

Normal support:

- initial matched relative pulse: `0.516667 m/s`;
- after `1 s`, both placements converge to about `0.002743 m/s` relative velocity;
- maximum placement-induced relative-velocity divergence: only `3.26e−5 m/s`;
- that is **0.006% of the granted relative pulse**;
- max relative-position divergence about `1.14e−5 m`;
- max torso-tilt divergence about `1.34e−3°`;
- max load divergence about `1.63e−3 N·s`;
- world-external system momentum decays slightly `41.333 → 41.275 N·s` through the canonical player damping;
- reciprocal momentum remains near zero apart from the same small world-relative damping effect;
- support remains continuous and neither variant falls.

Weak support shows the same scale:

- max relative-velocity divergence `6.88e−6 m/s`;
- again about **0.006%** of the granted weak pulse.

### E12.2b result

> **In an isolated player + freely translating dynamic-support system, fair world-external and reciprocal authority placements are essentially Galilean-equivalent in support-relative/contact/posture dynamics. The current player linear damping breaks that equivalence only negligibly in this specimen. The substantive difference is the world-frame momentum/common boost.**

This is not evidence that placement is irrelevant. It identifies **where placement can matter**:

> **Placement discrimination now requires a genuine external world reference or interaction. More isolated two-body player/support tests are informationally exhausted.**

A wall, anchored structure, third body, externally driven support, or another world-coupled interaction may expose consequences of whole-system momentum placement. E12 does not preselect which specimen should be used next.

## 7. What E12 established

### Proven / retained

1. A physically derived graded support-capacity signal can prevent the E11.2a weak-traction masking failure in the canonical current31 launch specimen without weakening accepted normal-support agency.
2. The same principle survives the qualified current36 braking protocol.
3. The first E12.1a red result was a harness-state error; reproducing exact E4.6 history restores the known normal physical control before the entitlement question is judged.
4. Support-relative reduced-mass scaling provides a fair mechanics-derived comparison between nonreciprocal and reciprocal placement on dynamic support.
5. Reciprocal placement preserves player+support horizontal momentum in the isolated gate; world-external placement injects it.
6. Once the same relative agency is granted, an isolated free player+support pair cannot materially distinguish those placements through relative motion, contact load or posture; they are essentially related by a Galilean boost.
7. Canonical `0.015` player damping is a world-relative channel, but its measured placement discrimination here is only about `0.006%` of the granted pulse over one second.

### Not proven / not selected

E12 does **not** prove:

- that `q` is the production entitlement formula;
- a production residual magnitude or hybrid controller;
- world-external placement is preferable;
- reciprocal placement is preferable;
- a multi-frame dynamic-support current31 launch controller;
- dynamic-support current36 braking;
- moving/rotating support behavior;
- disturbances or support loss;
- solver-resolution robustness of E12 authority semantics;
- a new articulated support mechanism;
- Owner feel.

No runtime or Donor behavior changes in E12.

## 8. Durable boundary after E12

E11 asked how to stop weak physical support from becoming only a boolean key for dominant assist. E12 supplies one positive answer at the **entitlement principle** level:

> **Make available nonphysical authority scale with measured physical support capacity rather than mere contact existence.**

But E12 also shows that entitlement and **reaction placement** are separate questions.

On a free isolated support:

- world-external and reciprocal placement can produce effectively identical local/support-relative behavior;
- their key difference is the momentum/common motion of the combined system relative to the world.

Therefore the next highest-value authority question is no longer another `q`, friction, support-mass, or residual-ratio sweep.

It is:

> **When a dynamically supported player is coupled to a genuine external world reference, what observable gameplay-relevant consequences distinguish nonreciprocal world-external authority from reciprocal support reaction, and which consequences do we actually want?**

A useful next experiment must introduce that reference **without smuggling in an arbitrary tuned parameter merely to force a difference**. Candidate forms include a world-anchored interaction, third-body/environment contact, or externally driven support, but the specific topology should be selected by information gain before implementation.

Stop here. E12 has reached its natural boundary.
