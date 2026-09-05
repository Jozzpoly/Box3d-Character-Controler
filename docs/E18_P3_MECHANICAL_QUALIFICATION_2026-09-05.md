# E18 P3 — coupled two-point mechanical qualification

Date: 2026-09-05  
Branch: `experiment/e18-p3-coupled-two-point`  
Qualified implementation checkpoint before this document: `f3bbae48d9db51848307fc034f872d65edc4b635`

## Decision

P3.0 is mechanically qualified strongly enough to stop spending the next iteration on isolated two-point kernel questions.

The qualified statement is intentionally narrower than “P3 is good gameplay”:

> A finite coupled two-point actuator can own object position plus one deliberate axis under one shared E17-scale authority budget, while preserving mass cost, collision failure, release momentum, a real unowned twist DOF, and a bounded player-side reaction path through the existing E15 hybrid bridge.

This earns an interaction/Owner-facing integration experiment. It does **not** earn promotion to `main`, replacement of E17, full 6-DoF ownership, or a claim of fully physical embodiment.

## Fixed mechanical contract

P3.0 uses two local anchors on one dynamic object and two world-space targets.

The coupled relative point-response operator is:

`K_ij = (1/m_object + 1/m_core) I - [r_i]x I^-1 [r_j]x`

The solve is one damped least-squares task, not two independent springs:

`(K^T K + lambda^2 I) J = K^T b`

One shared authority cap applies after the coupled solve:

`|J1| + |J2| <= 900 N * dt`

Object impulses are applied at the exact two anchors. The opposite **linear** reaction `-(J1 + J2)` is applied at the E15 embodiment-core COM. Angular/wrench closure remains explicit debt.

## P3.0 evidence

### 0a — algebraic kernel

- operator rank is exactly `5` for separated points;
- matrix symmetry error is `0`;
- the one-point diagonal response matches E17-depth directional point-effective-mass semantics;
- cross-point coupling is non-zero;
- pure translation produces equal impulses with zero torque;
- axis rotation produces an impulse couple with zero net linear impulse;
- the null mode is projected to residual rather than amplified;
- a huge request remains capped to `15 N s` total at `dt=1/60`, not `15 N s` per point;
- coincident anchors collapse to rank `3` without numerical explosion.

### 0b — Box3D response validation

With an asymmetric rotated body and world-space inverse inertia, predicted coupled response matched actual Box3D point-relative-to-core velocity response to approximately `1e-7 m/s` or better in direct, solved and saturated cases.

This qualified signs, world-inertia convention and the finite-core reaction term independently of the algebraic self-test.

### 0c — axis-control crucible

Under the same `900 N` authority scale:

- P3 settled axis error: about `0.000018 deg`;
- one-point E17-depth-style reference: about `67.5 deg`;
- P3 midpoint error: approximately `0`;
- one-point midpoint error: about `0.833 m`;
- P3 did not need more total authority to obtain the distinction.

The second point therefore bought a real mechanical capability: a torque couple without redundant translation.

### 0d — asymmetric authority and mass stress

Simultaneous `110 deg` axis rotation plus `[1.2, 0.35, -0.8] m` translation with asymmetric anchors:

- `24 kg` P3 settled axis error: about `0.128 deg`;
- settled midpoint error: about `0.00072 m`;
- one-point `24 kg` reference: about `88.1 deg` and `0.923 m`;
- `96 kg` specimen saturated during about `54.3%` of command frames while `12/24 kg` did not.

Mass/inertia therefore remained an execution cost rather than being erased by the solver.

### 0e — free-twist audit

The retained angular motion in the asymmetric specimen is not solver self-excitation.

- stationary asymmetric hold: `0` actuator impulse and `0` self-excited spin;
- manually injected `4 rad/s` pure twist: active P3 and passive Box3D responses were identical, with `0` actuator impulse;
- commanded asymmetric tail angular motion was approximately `99.9988%` twist around the current grip axis;
- axis error remained about `0.128 deg` and midpoint error about `0.000724 m`.

Classification:

`P3_FREE_TWIST_CONFIRMED_AS_MATERIAL_UNOWNED_NULL_DOF`

Therefore P3 is naturally a **5-DoF physical grip**, not a hidden 6-DoF pose lock. Do not silently add quaternion/twist ownership before gameplay evidence asks for it.

### 0f — contact failure and release

Reachable open target:

- settled midpoint error about `2.4e-7 m`.

Same target blocked by a static wall:

- settled residual about `1.55 m`;
- actuator saturated about `86.1%` of the episode;
- object COM stopped at the expected wall boundary rather than penetrating it.

Zero-damping release specimen:

- release speed about `2.3990 m/s`;
- speed retention exactly `1` at reported precision;
- ballistic displacement error about `3e-6 m`;
- no post-release actuator correction.

Classification:

`P3_CONTACT_CAN_DEFEAT_TASK_AND_RELEASE_PRESERVES_MOMENTUM`

A world contact can therefore defeat the requested task under the finite shared budget.

### 0g — full E15 hybrid blocked-reaction audit

0f’s isolated free core reached about `64.6 m/s` under sustained jam, correctly exposing that a free reaction body accumulates momentum. The real E17-era hybrid does not leave that core free.

Using the actual temporal path:

`Donor/E15 preStep -> P3 object/core impulses -> Box3D -> E15 postStep feedback`

and accepted E15 defaults:

- blocked object residual remained about `0.800 m`;
- P3 saturated about `82.8%` of the episode;
- wall geometry remained respected;
- embodiment-body peak speed was about `5.50 m/s`;
- embodiment horizontal offset remained only about `0.063 m` peak;
- feedback never clipped;
- feedback-off counterfactual left the Donor root essentially stationary;
- feedback-on translated the same sustained reaction into about `12.05 m` of Donor displacement and about `5.69 m/s` peak root speed over the intentionally sustained fixed-world task;
- open-space manipulation also produced material recoil (about `4.18 m` root displacement in this long fixed-target specimen).

Classification:

`P3_FULL_HYBRID_REACTION_BOUNDED_AND_TRANSLATED`

The important interpretation is two-sided:

1. the physical core does **not** run away once the real E15 follow/feedback bridge is present;
2. recoil is not hidden — it becomes a strong player-side gameplay consequence.

Whether that consequence feels useful, excessive, funny, readable or strategically valuable is now an Owner/gameplay question. Do not tune it away from headless metrics alone.

## What P3.0 does not prove

P3.0 does not establish:

- good mouse/keyboard interaction grammar;
- whether free twist is enjoyable or irritating;
- whether the strong recoil magnitude feels correct;
- robust acquisition/release/reach UX for two-point manipulation;
- good behavior while the Donor moves and the camera changes in a real play session;
- useful rough-vs-precision mode switching;
- richer mechanism/affordance gameplay;
- full angular reaction closure;
- removal or physical legitimization of self-lift;
- production-quality visualization/UI;
- superiority over every P2/P4 architecture.

The current browser integration must therefore remain an **experiment**, not a promotion.

## Next boundary — P3.1 interaction integration

The next useful result should be qualitatively visible to the Owner, not another subtle scalar improvement.

P3.1 should combine the already-qualified pieces into one bounded interaction experiment:

- explicit stable 3D translation intent including a deliberate depth channel;
- E17-like rough manipulation remains available rather than forcing precision all the time;
- a deliberate precision/orientation engagement activates the coupled two-point grip;
- P3 keeps the single shared `900 N` authority scale;
- free twist remains free unless a later Owner result specifically justifies owning it;
- mass, collision, blocked failure, recoil and release momentum remain visible;
- target/grip/axis/saturation state is readable;
- the test ecology contains at least a few specimens where orientation matters, not only cubes in open space.

The next Owner pass should ask whether this creates a materially better manipulation loop and new strategies, not whether a small parameter feels slightly different.

## Stop rule

Do not continue a long headless P3.0 series merely because more cases can be invented. Reopen mechanical qualification only if P3.1 exposes a concrete causal failure that the current evidence does not explain.
