# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for one broader question:

> **How can a player possess a physically meaningful body while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?**

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body/system attempts. Physics answers.**

Implementation probes may be disposable; accepted observations are not.

## Fresh takeover

Do not reconstruct the project from stage numbers, branch names or chat chronology.

Read in this order:

1. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — compact live orientation and stop boundary;
2. [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — research / qualification / publication / maintenance policy;
3. [`docs/E19_STAGE_CLOSURE_2026-09-09.md`](docs/E19_STAGE_CLOSURE_2026-09-09.md) — latest completed embodiment/manipulation stage and evidence boundary;
4. [`docs/README.md`](docs/README.md) — navigation into historical evidence only when needed.

Live `main` + exact SHA + source + CI/Pages remain implementation/publication truth.

## Accepted/default player

The normal public runtime remains **A‴ / Donor v1**, a controller-owned mover.

Reference contract:

- interaction mass `80 kg`;
- max speed `5.2 m/s`;
- ground acceleration `31 m/s²`;
- ground braking `36 m/s²`;
- gravity `20 m/s²`;
- outer step `1/60 s`;
- `4` Box3D substeps.

Do not silently weaken `31/36` to make embodiment easier.

Normal/default build:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

## Current checkpoint — post-E19

There is currently **no automatically endorsed next manipulation architecture**.

The latest completed line is E19, which reframed remote object manipulation around independent semantic left/right grips that can address both static world and dynamic matter.

E19 earned a bounded technical result:

> **semantic reach intent → finite swept volume → first physical obstruction → exact anchor → finite reciprocal grip → physics determines whether player, target or both move**

The mechanics/acquisition path is technically qualified and the public Owner probe was successfully promoted. A confirmed post-publication Owner gameplay verdict is not present in the grounded Character Controller record, so E19's controls, feel and climbing quality are **not accepted by inference**.

Stage status:

- mechanics / acquisition — **technical PASS**;
- publication — **complete**;
- gameplay / UX acceptance — **not established**;
- research status — **closed / frozen checkpoint**.

Detailed closure:

[`docs/E19_STAGE_CLOSURE_2026-09-09.md`](docs/E19_STAGE_CLOSURE_2026-09-09.md)

A future stage should begin from a fresh Owner/problem question and may reuse E17, P3, E19 or earlier mechanisms as donors without preselecting any one of them as architecture.

## Preserved manipulation probes

### E17 — intent-first object manipulation

E17 changed the abstraction boundary from low-level physical-organ piloting to:

> **select nearby dynamic object / exact surface point → express 3D target intent → finite physical actuator attempts it**

Owner free play produced the strongest positive manipulation evidence before E19: lift, carry, drag, throw, leverage, piling/stack attempts and object↔object play emerged despite a crude executor.

Public route:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=e17`

alias: `?mode=intent`

E17 remains an important gameplay/evidence donor, not the current architecture.

### E17-depth — inertia-aware one-point executor evidence

E17-depth keeps the same one-point grammar but accounts for directional rigid-body point effective mass including rotational inertia.

Machine evidence established a real local mechanical distinction; Owner comparison did not show a reliably distinguishable gameplay improvement.

Public route:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=e17depth`

alias: `?mode=pointmass`

### E18 / P3 — coupled two-point mechanical donor

P3.0 qualified bounded coupled two-point leverage/orientation under one finite shared authority scale. P3.1 then exposed it as a special precision/orientation clutch.

The mechanical result remains useful. The interaction direction was superseded after Owner feedback showed the remote object-centric/clutch grammar remained too raw, indirect and restrictive.

Do not describe P3.1 as the current frontier.

### E19 — reciprocal semantic-grip probe

E19 preserved useful P3 mathematics but changed the ontology from remote object target to independent grips that can address both world and matter.

Public route:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=e19`

alias: `?mode=grip`

The public probe uses independent `Q/E` grips, cursor-directed bounded swept reach and `LMB` relation retraction. It is preserved as research evidence, **not** the default player and not a final control scheme.

## Durable lessons

- **E12:** capability entitlement can be graded; do not regress to blind full-strength authority.
- **E13:** do not manufacture an external reaction path exactly when authority needs it and call that neutral plumbing.
- **E14:** more physical representation can still be worse gameplay than the plain Donor.
- **E15:** a passive physical body can become little more than a reactive appendage if it owns no useful player capability.
- **E16:** giving a physical subsystem a capability is insufficient if the player must micromanage the subsystem itself.
- **E17:** high-level intent + finite physical execution can generate a family of verbs and persistent scene history even before the executor is good.
- **E18/P3:** coupled two-point mechanics can add deliberate orientation leverage without full pose ownership, but a useful mechanic can still be wrapped in a poor interaction grammar.
- **E19:** static and dynamic grip targets can share one finite reciprocal relation; intent assistance at acquisition can coexist with physical authority after latch; technical qualification still does not substitute for Owner feel.

## Validation

Reproducible toolchain:

- Node `22.23.2` (`.nvmrc`);
- npm lockfile committed;
- CI uses `npm ci`;
- `box3d.js@0.1.1`;
- `three@0.183.0`;
- `vite@7.0.0`.

Canonical commands:

- `npm run smoke` — foundation + accepted historical green regressions;
- `npm run smoke:current` — promoted/current representative regressions;
- `npm run build` — browser build.

The canonical GitHub Actions workflow runs locked install → smoke layers → build, then deploys Pages only from `main`.

Experiment-specific diagnostics belong to bounded research workflows/history rather than accumulating forever in canonical CI. See [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## Normal controls

- `WASD` / touch left stick — camera-relative movement;
- `Space` / `JUMP` — jump;
- `Shift` / `SPRINT` — sprint;
- mouse/touch drag — orbit camera;
- mouse wheel — zoom;
- `R` / `RESET` — reset;
- `H` — telemetry.

## Maintenance boundary

Repository branch hygiene is intentionally pending after the E19 closure. Historical branches must not be deleted ad hoc. The next maintenance campaign will first import/review the dedicated cleanup workflow used in `jv_web`, adapt it to this repository's provenance needs, and only then classify branches for retention or deletion.
