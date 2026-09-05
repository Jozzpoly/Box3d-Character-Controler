# E18 P3.0 — coupled two-point causal crucible

Date: 2026-09-05  
Branch: `experiment/e18-p3-coupled-two-point`  
Base checkpoint: `2ef25bced3140a24223d9a29157f7a8b2ba017af`

## Research question

> Can one finite, coupled two-point task materially improve intentional object-axis/orientation control over the frozen E17/P1 one-point baseline without winning merely through extra authority or silently turning the object into a pose cursor?

This is a **mechanical** experiment first. Browser input grammar is deliberately out of scope until the coupled task itself earns an Owner-facing build.

## Why P3 now

E17 established that intent-first object manipulation can generate play, but one point cannot deliberately own rigid-body orientation. E17-depth corrected local one-point inertia accounting yet Owner could not reliably distinguish the gameplay result from E17 after several minutes.

E18.0 then qualified an explicit 3D intent/proxy boundary and closed the input-frame questions sufficiently to stop blocking architecture work.

The next unknown is therefore not another one-point parameter. It is whether a second noncoincident task point creates useful orientation authority while keeping finite physical execution meaningful.

## Fixed boundaries

Keep fixed unless a probe explicitly says otherwise:

- accepted Donor v1 traversal (`31/36 m/s²` ground agency);
- E15 finite physical core and existing body-response → Donor consequence bridge;
- Box3D outer `dt=1/60 s`, `4` substeps;
- no teleportation of object or core;
- no direct quaternion/pose write;
- no humanoid arms / IK;
- no browser input changes in P3.0;
- no automatic self-lift cleanup;
- inherited E17 reaction placement at physical-core COM remains declared causal debt;
- P1/E17 remains frozen reference evidence.

## New mechanism under test

A manipulated rigid body exposes two fixed local anchors `p1`, `p2`, with two requested world targets `t1`, `t2`.

The executor attempts the two point-velocity corrections **jointly**.

It must not be implemented as two independent E17 springs.

For object COM-relative offsets `r1`, `r2`, world inverse rotational inertia `I^-1`, object inverse mass `mo^-1` and physical-core inverse mass `mc^-1`, define the relative point-velocity response to impulses `J1`, `J2`:

`Δv_rel_i = Σ_j K_ij J_j`

with

`K_ij = (mo^-1 + mc^-1) I3 - [r_i]x I^-1 [r_j]x`.

The `mc^-1` term appears in every block because the opposite reaction `-(J1 + J2)` changes physical-core COM velocity and therefore both point velocities relative to the core.

For a single point/direction this reduces to the same directional effective-mass semantics already used by E17-depth.

## Expected rank / free twist

Two noncoincident rigid-body points determine translation and an axis, but do not observe or command twist around the line joining them.

Therefore the coupled task naturally has one unowned rotational DOF. The point-space operator may be rank-deficient / near-singular in exactly this direction.

P3.0 must handle this explicitly with a bounded pseudoinverse / regularized solve or another justified rank-aware method. It must **not** inject an arbitrary quaternion twist target merely to make the matrix invertible.

Free twist is a feature to evaluate, not an implementation error to erase.

## Authority budget

P3 must not receive two E17-sized actuators for free.

Initial shared budget for the first crucible:

`|J1| + |J2| <= J_budget`

with

`J_budget = 900 N * dt`

unless a diagnostic demonstrates that another directly comparable budget definition is required.

If the uncapped joint solution exceeds the shared budget, scale both point impulses by the same factor. This preserves the coupled impulse distribution while making saturation explicit.

This initial budget is a fairness probe, not a claim that `900 N` is the final two-hand strength model.

## Initial solver semantics

P3.0 should separate:

1. requested target-point position error;
2. requested relative point-velocity correction;
3. coupled effective-mass solve;
4. shared budget saturation;
5. actual Box3D point/core response;
6. residual task error.

Do not hide stiffness, damping or saturation in one opaque constant.

The first kernel may use a small declared regularization only to resolve the rank-deficient point-space solve. Regularization must be reported and tested; it is not permission to add large damping until the desired result appears.

## P3.0a — pure coupled-kernel qualification

Before applying anything to Box3D, qualify the algebra itself.

Required cases:

- **pure translation:** symmetric two-point target motion should not create a spurious torque couple;
- **axis rotation:** opposite point velocities corresponding to rotation perpendicular to the point axis should produce a torque couple;
- **free twist:** requested twist around the point axis must not create fake point motion/authority;
- **cross-coupling:** impulse at point 1 must measurably affect point-2 velocity and vice versa;
- **symmetry:** the assembled effective-mass operator should satisfy expected block transpose symmetry within numerical tolerance;
- **shared saturation:** `|J1| + |J2|` must never exceed `900 * dt`;
- **degenerate geometry:** coincident/nearly coincident anchors must stay finite and be classified rather than exploding.

Natural stop:

- algebra is finite, coupled, rank-aware and budgeted → proceed to P3.0b Box3D response;
- matrix/sign/rank assumptions fail → stop and fix the model before any gameplay implementation.

## P3.0b — Box3D response qualification

Apply the solved `+J1/+J2` at the two exact object points and reaction `-(J1+J2)` at physical-core COM.

Compare predicted vs measured relative point-velocity change in controlled free-space cases before adding contact ecology.

Then probe:

- light vs heavy body;
- long beam;
- centre-symmetric vs off-centre anchors;
- large target step / saturation;
- blocked/contact case;
- release after accumulated motion.

P3 must retain perceptible mass/inertia/contact/failure. A result that only succeeds because the shared budget is effectively bypassed is negative evidence.

## Comparison to P1

Do not require identical internal mechanics; require a fair declared authority envelope.

High-value comparison metrics:

- axis-direction error between current anchor vector and requested target vector;
- midpoint/translation error;
- overshoot / oscillation;
- shared-budget saturation fraction;
- object angular velocity outside the intended axis correction;
- residual free twist;
- mass-dependent lag;
- contact-dependent failure;
- release momentum.

The first headless comparison asks whether P3 can deliberately control the object axis. It does **not** ask whether the eventual desktop UI is fun.

## Positive evidence

P3 earns P3.1 Owner-facing work if, under one shared authority budget:

- target-axis/orientation error is materially lower than one-point P1 in representative beam/off-centre cases;
- translation remains finite rather than kinematic;
- heavy objects still lag/saturate more than light ones;
- contacts can block/disturb the task visibly;
- release preserves physical momentum;
- the free-twist DOF remains genuinely physical unless a later grammar explicitly claims it.

## Negative evidence / falsifiers

Stop or redirect if:

- two point actuators fight because coupling was not actually solved;
- P3 only looks better when allowed materially more total impulse than P1;
- the regularization effectively becomes hidden pose damping;
- object orientation improves only by erasing mass/contact distinction;
- the remaining free twist makes the grammar mechanically useless;
- coupled mechanics are substantially less stable/readable than P1 without a compensating capability gain.

If P3 mechanics fail on these grounds, preserve the negative result and use P2 finite 6-DoF pose coupling as the clean control reference rather than tuning indefinitely.

## Owner boundary

Do **not** ask for Owner free play during P3.0a/0b algebra and causal qualification.

P3.1 should become browser/Owner-facing only after the mechanical result is strong enough that the next uncertainty is genuinely input/readability/play rather than basic solver correctness.
