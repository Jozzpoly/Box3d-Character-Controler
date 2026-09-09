# E19 stage closure — reciprocal semantic grips

Date: **2026-09-09**  
Closure branch: `maintenance/e19-stage-closure-2026-09-09`

## Verdict

**E19 is closed as a technically qualified research stage and frozen as evidence.**

This is deliberately **not** an Owner gameplay PASS.

The project qualified a unified finite reciprocal grip substrate, bounded non-impulsive reach/acquisition and a minimal public dual-grip Owner probe. A confirmed post-publication Owner verdict for that E19 probe is not present in the grounded Character Controller record, so usability, feel, final hand/reach UX and climbing quality remain **unaccepted / unresolved** rather than being silently inferred from green CI.

The correct closure is therefore:

- **mechanics / acquisition:** TECHNICAL PASS within the declared bounds;
- **publication:** COMPLETE;
- **Owner gameplay acceptance:** NOT ESTABLISHED;
- **research status:** FROZEN CHECKPOINT, not an active frontier;
- **next work:** requires a newly framed embodiment/gameplay question rather than automatic E19 tuning.

## Exact publication provenance

Grounded live state before this maintenance closure:

- E19 research branch: `research/e19-hand-grip-reframe`;
- qualified research head: `73ef9105c2910b3450e9c64c5c636e89d942a102`;
- E19 diagnostics run: `33970842840` — `completed / success`;
- promotion PR: `#48` — **Promote E19 reciprocal hand-grip owner probe**;
- merge commit on `main`: `425a55451ba223a83ef000ae69d0ed7dd5bb0a95`;
- exact-main verify/deploy run: `33970942169` — `completed / success`.

Recorded SHAs and run IDs are provenance. Future live `main` remains implementation/publication authority.

## What E19 established

### 1. One reciprocal law can cover static and dynamic grip targets

E19.0a–0f2 qualified one finite relative-grip operator across:

- one static grip;
- one dynamic grip;
- two grips on one dynamic rigid body;
- two grips on different dynamic bodies;
- mixed static + dynamic grips;
- two static grips;
- blocked/impossible world tasks.

The operator does not select a special `move player` versus `move object` mode. Target mass/inertia, available world motion and other active grips determine how the requested relation is physically resolved.

Representative multi-frame evidence:

- `20 kg` target: Donor `+0.136 m`, target `-0.864 m`;
- `200 kg` target: Donor `+0.634 m`, target `-0.366 m`;
- two grips on one `55 kg` body: about `0.666 rad` body rotation with essentially zero Donor translation;
- mixed unbraced pull: Donor `+0.410 m`, target `-0.590 m`;
- same pull with a static brace grip: Donor approximately `0`, target approximately `-1.000 m`.

A genuinely impossible mixed task remained finite for 180 frames with roughly `0.700 m` unresolved geometric error, both grips saturated, zero Donor drift and no persistent grip contribution to `externalVelocity`.

### 2. Direct Donor reaction is viable, with a scoped constraint-policy correction

E19 demonstrated that explicit reciprocal grip reaction can enter accepted Donor velocity before the normal mover rather than requiring the old E15 physical-core mediator.

The first vertical integration exposed a real falsifier: a strong overhead grip could leave about `+10.74 m/s` latent upward velocity while capsule position was blocked by a ceiling.

A grip-scoped vertical static/kinematic constraint-velocity policy removed that latent blocked velocity while an ungripped Donor route remained exactly equivalent in the qualified comparison. Release returned immediately to ordinary gravity rather than emitting stored upward motion.

This correction remains deliberately narrow; arbitrary sloped/3D static and kinematic constraints are not qualified by it.

### 3. Acquisition provenance and intention assistance were separated

E19.1a reused the durable E16 provenance idea without inheriting the old organ-control architecture:

- current-post-step contact candidates carry exact body/shape identity;
- exact local/world anchors can be reconstructed;
- stale, foreign and invalidated descriptors fail closed;
- semantic surface normals are independent of raw Box3D A/B manifold ordering.

E19.1b kept candidate ranking above physics truth. Left/right reach origins/directions use the same ranking mechanism; hard reach/aim gates and deterministic tie-breaking prevent manifold iteration order from becoming hidden gameplay policy.

The ranking weights used in the experiment remain provisional interaction apparatus, not product constants.

### 4. Physical contact probes were superseded as the preferred reach representation

E19.1c proved that a contact-earned descriptor can drive the same live grip path for static and dynamic targets, but it also exposed a causal drawback: a dynamic physical probe must collide before acquisition and can perturb a dynamic target before the intended grip begins.

E19.1d therefore tested a bounded non-impulsive swept reach using finite-volume Box3D shape casting.

Qualified properties:

- finite reach and finite radius;
- first obstruction remains authoritative;
- exact body + local anchor returned;
- static and dynamic targets share the same acquisition representation;
- repeated queries do not alter target position, linear velocity or angular velocity before grip;
- nearer geometry occludes farther candidates;
- insufficient reach returns no target.

The strongest experimental acquisition grammar at closure is:

> **semantic left/right reach → bounded swept hand volume → first physical obstruction → exact body/local anchor → finite reciprocal grip**

This is a semantic reach/grip representation, not evidence that rigid-body hands or full arms have been built.

### 5. Swept reach was bridged into live static and dynamic grip behavior

E19.1e closed the headless acquisition path:

- overhead static reach under normal gravity acquired an exact world anchor and pulled the Donor upward by about `0.700 m` without an initial snap;
- release returned control to ordinary gravity;
- a `40 kg` dynamic target acquired through the same swept representation produced roughly Donor `+0.266 m` / body `-0.734 m` closure;
- measured pre-grip target contamination was zero;
- no grip state was stored in Donor `externalVelocity`.

At that point further generic headless acquisition cases had declining value and the research correctly moved to a browser Owner probe.

## Public Owner probe

PR #48 promoted a minimal route:

- `?mode=e19`;
- alias `?mode=grip`.

The specimen provides:

- independent semantic left/right grips (`Q` / `E` hold);
- cursor-directed bounded swept reach;
- `LMB` retraction of already-latched relations;
- accepted Donor locomotion underneath;
- a compact grip gym containing static holds and light/heavy dynamic specimens.

Publication proved that the qualified research mechanisms could coexist in one public runtime. It did **not** prove the interaction was good, intuitive or worth adopting as a final control scheme.

## Durable lessons retained from E19

1. **Static versus dynamic should normally change physical consequence, not basic grip eligibility.**
2. **High-level hand/grip intent can be intention-assisted at acquisition while finite physics remains authoritative after latch.**
3. **Exact anchors should be preserved after acquisition rather than continuously retargeted for convenience.**
4. **Two independent grip relations can create orientation leverage and bracing without a dedicated object-orientation mode.**
5. **A finite reach query can be more causally neutral than forcing a physical probe to collide before the player has actually acquired anything.**
6. **The accepted Donor can remain the traversal authority while explicit reciprocal grip reaction becomes a material consequence path.**
7. **Mechanical qualification must not be promoted into a feel claim.**

## Explicit non-claims / held debt

E19 does not establish:

- final left/right input mapping;
- final reach radius, length, rates or strength;
- good two-hand UX;
- good climbing/hanging feel;
- physical rigid-body hands, arm masses, elbows or shoulders;
- player angular state / body torque;
- arbitrary sloped and moving-kinematic grip constraint policy;
- optimal constrained allocation under asymmetric multi-grip saturation;
- final character art, hand visuals or the recorded cap/silhouette visual debt;
- multiplayer/network semantics;
- a production embodiment architecture.

These are not automatic E19 follow-up tasks. Reopen only when a future question makes one of them material.

## Relationship to E17 / E18 / P3

- **E17** remains the strongest earlier Owner-positive proof that high-level manipulation intent can generate a family of useful verbs despite a crude executor.
- **E17-depth** remains legitimate executor evidence but did not earn a clear Owner gameplay advantage.
- **P3.0** remains valuable mechanical donor evidence for coupled two-point leverage.
- **P3.1** was superseded as the main interaction direction after Owner feedback showed the remote object-centric/clutch grammar remained too indirect, raw and restrictive.
- **E19** preserved useful P3 mathematics while changing the ontology from remote object target to left/right semantic grips that can address both world and matter.

None of these is promoted to the default player. Normal/default remains A‴ / Donor v1.

## Conversation / repository boundary correction

After the genuine Character Controller E19 publication work, the surrounding browser conversation later moved into `Jozzpoly/Jozzue_Vehicles_Sandbox` and its Family C / Spatial Compass construction-grammar research.

That work belongs to the JV project/repository. It is **not** Character Controller E19 evidence and must not be imported into this repository's stage history merely because it occurred in the same chat thread.

## Closure stop boundary

Do not automatically start E20, tune E19, build full arms, or reinterpret the public E19 probe as accepted gameplay.

The repository is now best understood as a **post-E19 Embodied Player Laboratory checkpoint**:

- accepted/default Donor baseline remains intact;
- E14–E19 provide a substantial evidence portfolio about authority, embodiment and manipulation;
- E19 mechanics/acquisition are technically grounded and preserved;
- there is no currently endorsed next manipulation architecture;
- the next research stage should begin from a fresh explicit Owner/problem question.

Before branch cleanup, preserve exact provenance and wait for the dedicated repository-hygiene workflow rather than deleting historical research ad hoc.
