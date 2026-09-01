# E2.3b — Constraint-release gameplay relevance

Status: **mechanical relevance established; production runtime unchanged; explicit constraint-velocity policy remains unresolved**.

## Question

E2.3 proved that `box3d.js@0.1.1` loses the solved `b3CollisionPlane.push` state across the JavaScript boundary, so the subsequent mover `b3ClipVector(...)` is inert for freshly collected planes.

That was not enough to justify changing gameplay. The remaining question was narrower:

> Does velocity retained only because a mover constraint blocked displacement later reappear as a real gameplay consequence when that constraint clears?

If not, the binding mismatch could remain an explicit substrate policy/debt. If yes, the project has evidence for designing an explicit constraint-velocity policy — but still not permission to adopt native-intended clipping blindly.

## Falsifier

`scripts/e2-3b-constraint-release-relevance.mjs`

The trial uses the qualified donor/A″ mechanics and ordinary locomotion inputs at the canonical `60 Hz / 4 substep` envelope.

Scenario:

1. settle on a static floor;
2. run directly into a `0.60 m` high blocker;
3. continue holding forward long enough to establish sustained geometric blocking;
4. release directional input for **3 grounded ticks**;
5. jump with **zero directional input**;
6. observe what happens when the capsule rises high enough for the blocker constraint to disappear.

Three paths are measured:

- **current A″** — actual `box3d.js@0.1.1` binding behavior;
- **intended-clip diagnostic** — the already-E2.3-validated JS reconstruction propagates solved `plane.push` back to the planes before clipping;
- **open-space inertia control** — same accelerate → 3 neutral ticks → neutral jump sequence with no blocker.

The intended path remains a diagnostic shim only. It is not a production candidate selected by this gate.

## Result

Canonical branch run on `7487f15cb5a2c45e2f157c113b277766f4280c58`:

| metric | current A″ | intended clip diagnostic |
| --- | ---: | ---: |
| sustained blocked frames | `53` | `53` |
| velocity into blocker after sustained contact | `5.200 m/s` | `0.000 m/s` |
| velocity after 3 neutral grounded ticks | `3.400 m/s` | `0.000 m/s` |
| blocker vertically clears after jump | `6f` | `6f` |
| crosses far face of blocker | `24f` | never |
| max forward velocity after vertical clearance | `2.680 m/s` | `0.000 m/s` |
| zero-direction release displacement after jump | `1.282 m` | `0.000 m` |

Open-space control after the same three neutral grounded ticks:

- velocity: `3.400 m/s`;
- neutral pre-jump displacement: `0.200 m`;
- neutral-jump release displacement: `1.412 m`.

Therefore the blocked current-A″ state retains essentially the **same horizontal locomotion velocity as the open-space run**, despite the character having spent 53 frames geometrically unable to move through the obstacle. Once the obstacle no longer constrains the capsule, that retained state becomes movement again.

This is not merely an internal API mismatch. It is an observable consequence of the current constraint-velocity policy.

## Interpretation

The gate establishes the following current-best fact:

> **A″ currently treats geometrically blocked locomotion velocity as still-existing character velocity. When the constraint disappears before locomotion recovery has consumed that state, the old blocked component can re-enter motion even with neutral directional input.**

The neutral jump is particularly informative because grounded recovery is strong (`36 m/s²`) while airborne recovery is weak (`1.2 m/s²`). The jump clears the geometry before the retained horizontal component has time to disappear.

The open-space control is important: the released motion is not a new impulse manufactured at clearance time. It is old locomotion velocity that the wall failed to remove. The research question is therefore policy/semantics — whether a blocked velocity component should remain owned by the character — rather than a mysterious post-release force.

## What this does *not* establish

This gate does **not** establish that:

- the exact native `b3ClipVector` policy is the desired production behavior;
- every solved plane should clip every velocity component;
- contact with dynamic bodies should use identical clipping semantics to static blockers;
- clipping should happen before or after reciprocity/support analysis exactly as native currently does;
- grounded/air acceleration or deceleration constants should be retuned;
- A″ should be abandoned as donor/current-best contact semantics.

E2.3 already demonstrated that activating full intended clipping changed the recovered Owner-anchor contact episode from `7f` to `1f`, changed separation velocity materially and changed support state. That prevents treating a binding repair as behavior-neutral.

## Decision boundary

The old question — *is constraint-velocity debt gameplay-relevant at all?* — is now answered **YES mechanically**.

The next separate research question should be:

> What is the smallest explicit constraint-velocity policy that removes clearly stale blocked velocity without destroying useful momentum, support behavior, contact continuity or player agency?

Candidate policies must be compared against at least:

1. current A″ / no effective clip;
2. native-intended full clip as a diagnostic reference, not presumed winner;
3. ordinary wall/obstacle traversal and neutral-jump release;
4. the recovered Owner contact anchor from E2.3;
5. moving-support inheritance and existing donor equivalence boundaries where applicable.

Do not solve that policy inside this closure stage.
