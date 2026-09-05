# E18 Manipulation V0 — execution spine

Date: 2026-09-05  
Branch: `experiment/e18-manipulation-v0`  
Base: `f8c4126f3f6a32eb80a0d87349e8d2e75e02438a`

## Purpose

This branch is the long-running research/execution lane for the next manipulation architecture. It is not a production feature branch and not a place to tune E17 indefinitely.

Working target:

> Let the player express useful object position/orientation intent directly, while finite physics remains the executor and mass, inertia, leverage, contact, collision, force limits, failure and release momentum remain meaningful.

The desired architecture is:

> player input -> manipulation intent -> task representation -> finite physical executor -> physical consequence

The main reason for this split is to keep input mapping, task grammar, executor mechanics and embodiment/reaction separately replaceable and testable.

## Evidence entering E18

### E17 baseline

E17 established the important positive result: intent-first manipulation changes Owner attention from piloting an end effector toward experimenting with the physical world. Preserve E17 as the frozen one-point chaos/fun reference.

Its dominant weaknesses remain:

- oscillation/overshoot;
- poor precise placement;
- no deliberate orientation ownership;
- severe off-centre rotation;
- prototype-grade input/presentation;
- incomplete causal closure through the Donor + physical-core hybrid.

### E17-depth Owner closure

E17-depth corrected one real local executor issue by using directional point effective mass, including rotational inertia, while preserving the E17 one-point grammar and budget.

Owner blind/free comparison on 2026-09-05 found the gameplay delta too subtle to identify reliably after several minutes.

Interpretation:

> The correction is mechanically legitimate but not a current high-leverage gameplay improvement. Do not spend further Owner attention tuning this line. Preserve it as technical evidence, not as the next architecture.

## Main unknown

The current central question is broader than P3 alone:

> What manipulation stack gives a large improvement in control and useful verbs without turning physical objects into editor cursors?

The highest-value suspected bottlenecks are:

1. the current browser target is not a robust general 3D intent representation;
2. a one-point grammar cannot deliberately specify rigid-body orientation;
3. the current one-point velocity-servo has poor controlled-failure behavior under saturation/inertia/contact;
4. player-facing rough manipulation and precision/orientation may deserve staged rather than permanently integrated control;
5. the current physical ecology is not rich enough to judge the value of orientation and mechanism interaction deeply.

These are hypotheses to test, not assumptions to force into one implementation.

## Execution strategy

Owner cadence:

> Large Owner milestones, small internal causal steps.

Do not request broad Owner free play for tiny parameter changes. Use deterministic/scripted probes for mechanical questions. A new Owner-facing build should expose a materially new capability or a clearly different interaction quality.

### Workstream A — 3D intent proxy

Goal: decouple player input from the physical executor and replace the frozen click-time drag plane as the only translation representation.

Requirements:

- explicit 3D requested target state;
- a readable depth channel in addition to screen-plane motion;
- stable behavior while player/camera moves;
- target/proxy may respond quickly; physical object must remain finite;
- no hidden teleportation of the manipulated body;
- input mapping kept outside executor mechanics.

Stop boundary: the proxy can be scripted and player-driven independently of E17 actuator details.

### Workstream B — finite execution kernel

Goal: make failure/stiffness/lag deliberate and measurable rather than incidental spring chaos.

Keep separate concepts for:

- target position/velocity;
- translational compliance/stiffness;
- damping;
- force budget;
- saturation;
- later orientation target/error;
- torque budget.

Do not optimize merely for zero error. Heavy, awkward, blocked and badly leveraged objects should be allowed to fail or lag legibly.

Stop boundary: scripted light/heavy/off-centre/contact cases have interpretable bounded behavior before adding a broader grammar.

### Workstream C — orientation architecture

Current-best first serious candidate: bounded two-point / virtual two-hand execution, possibly surfaced to the player only through a precision/orientation clutch.

Do not implement two independent E17 springs with separate full force budgets.

Two point constraints are mechanically coupled through rigid-body translation and rotation. Solve or approximate them as one coupled authority problem, using one declared shared budget so P3 cannot win merely by receiving twice the force.

Important property to preserve for study: two points specify translation plus an axis but leave twist around that axis underdetermined. Do not automatically erase that remaining physical DOF.

Stop boundary: compare intentional orientation/placement, leverage, collision response, mass distinction and release behavior against frozen E17 under controlled cases.

### Workstream D — rough vs precision grammar

Do not assume one universal mode should serve throwing, carrying, stacking and precise placement equally well.

Working candidate:

- rough/default manipulation preserves E17-like freedom and physical rotation;
- a temporary precision/orientation engagement adds deliberate orientation authority;
- precision does not imply infinite force or kinematic motion.

The exact desktop mapping (modifier, second button, wheel/depth, clutch, etc.) remains open until the underlying target/executor needs are clearer.

### Workstream E — manipulation ecology

Build only enough new environment/objects to expose the new capability.

High-value specimens include:

- light/medium/heavy bodies;
- long beam;
- rolling sphere;
- asymmetric body;
- stacking/placement surface or recess;
- simple hinge/door or lever;
- body usable as bridge/traversal aid;
- held-object support / self-lift specimen.

The ecology is not a challenge course and must not encode one intended solution.

Keep broader playground/map work separate from this branch where possible.

## Frozen / deferred boundaries

Do not expand E18 into:

- full humanoid anatomy;
- articulated arms/IK as a prerequisite;
- full dynamic-player replacement;
- production attachment system;
- multiplayer ownership implementation;
- JV integration;
- production UI;
- automatic removal of the self-lift exploit;
- full causal closure of the Donor/core/manipulator hybrid before the manipulation grammar earns further investment.

These may become justified later, but not by default.

## Causal debt retained explicitly

The current manipulator applies impulse to an arbitrary object point and opposite linear impulse to the embodiment core centre. This preserves a bounded linear reaction path but is not full wrench/angular-momentum closure.

The physical core itself is still a finite body attached to a controller-owned Donor traversal system. Self-lift demonstrates that the full player/object authority loop is not closed.

Treat this as known causal debt. Do not silently promote future E18 success into a claim of fully physical embodiment.

## Validation policy

Use three layers.

### Mechanical contract

Examples:

- no teleportation;
- force/torque/shared-budget limits;
- deterministic acquisition/release;
- reach/break rules;
- momentum behavior on release;
- two-point coupling accounting;
- finite reaction path.

### Control behavior

Scripted specimens should cover:

- light vs heavy;
- centre vs off-centre acquisition;
- long-beam leverage;
- large target step;
- moving target;
- collision blocking;
- saturation;
- convergence/overshoot;
- intentional orientation;
- release after motion.

### Owner ecology

Only after a meaningful milestone, evaluate whether the system enables or improves:

- lift/carry/drag;
- throwing;
- deliberate orientation;
- stacking/placement;
- use of leverage;
- object-object interaction;
- traversal aids;
- emergent exploits/strategies;
- overall preference and desire to keep playing.

Machine PASS cannot establish this layer.

## Repository discipline

- `main` remains canonical/public truth.
- E17 and E17-depth source should remain frozen unless a correctness/refactor need is separately justified.
- E18 work lives here until a bounded result deserves a clean publication candidate.
- branch-local probes/diagnostics may be disposable;
- only representative regressions that protect a promoted result belong in permanent `smoke:current`;
- do not make the permanent CI a history museum;
- prefer small reversible commits with one causal meaning;
- do not mix maintenance refactors into a causal result unless needed for correctness.

## Owner milestone criteria

Do not ask for another broad Owner gameplay pass merely because a branch builds.

A useful E18 Owner milestone should demonstrate several of the following at once:

- genuine controllable depth;
- stable target behavior during movement/camera changes;
- materially reduced meaningless oscillation;
- deliberate orientation capability;
- preserved mass/leverage/collision consequences;
- preserved throwing/release momentum;
- a useful rough/precision distinction;
- richer object/mechanism interactions than the E17 cube/sphere baseline.

If a candidate only improves an internal metric or creates a subtle feel delta, keep working without spending Owner attention.

## Natural redirections

- If proper 3D intent plus a better one-point executor produces a large jump, exploit that before assuming orientation must come immediately.
- If two-point mechanics work but player control is cognitively poor, retain the executor and test a staged P4-like UI.
- If P3 mechanics themselves are poor, use finite 6-DoF pose coupling (P2) as the clean control reference.
- If even a strong manipulation stack still feels like a remote physgun attached to a capsule, reopen deeper embodiment as the next architectural question.

The branch is successful if it resolves these unknowns and produces a materially better manipulation capability or clear negative evidence. It is not required to end with the architecture currently preferred at branch creation.
