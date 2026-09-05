# Box3D Character Controler — Embodied Player Laboratory

Public browser laboratory for one broader question:

> **How can a player possess a physically meaningful body while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?**

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working model:

> **Player intends. Controller interprets. Body/system attempts. Physics answers.**

Implementation probes may be disposable; accepted observations are not.

## Fresh takeover

Do not reconstruct the project from stage numbers or old branch names.

Read in this order:

1. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — compact current truth and active boundary;
2. [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — how research, qualification, publication and maintenance are separated;
3. [`docs/E18_MANIPULATION_LANDSCAPE_2026-09-04.md`](docs/E18_MANIPULATION_LANDSCAPE_2026-09-04.md) — current manipulation research map;
4. [`docs/README.md`](docs/README.md) — navigation into historical evidence only when needed.

Live `main` + exact SHA + CI/Pages remain implementation/publication truth.

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

## Current experimental portfolio

### E17 — intent-first physical manipulation

E17 changed the interaction boundary from low-level organ piloting to:

> **select nearby dynamic object / exact surface point → express 3D target intent → finite physical actuator attempts it**

The object is not teleported. Finite impulse is applied at the selected point, with equal-and-opposite reaction on the finite physical core. Mass, collisions, leverage, orientation drift and release momentum remain physical consequences.

Owner free play showed the strongest positive gameplay evidence of the post-E14 line so far: one capability generated lift, carry, drag, throw, leverage, piling, stack attempts and object↔object play despite the executor still being crude and unstable.

Public route:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=e17`

alias: `?mode=intent`

### E17-depth — inertia-aware one-point A/B probe

E17-depth keeps the same one-point grammar, input, reach and force budget, but computes requested impulse from the directional effective mass of the grabbed rigid-body point using world COM + inverse rotational inertia.

It is a bounded executor correction, **not** orientation control, a two-hand system, extra damping or a new gameplay architecture.

Public route:

`https://jozzpoly.github.io/Box3d-Character-Controler/?mode=e17depth`

alias: `?mode=pointmass`

E17 remains the one-point chaos baseline. E17-depth is an Owner-facing A/B candidate, not an automatic replacement.

## Current research frontier — E18

E18 asks a larger question than “how do we add rotation?”:

> **What interaction grammar lets a player express useful 6-DoF object intent while finite physics, mass, leverage, contacts, body reaction and failure remain meaningful parts of execution?**

Current candidate portfolio:

- **P1** — E17 one-point chaos baseline;
- **P2** — finite 6-DoF pose coupling;
- **P3** — bounded two-point / virtual two-hand grip;
- **P4** — one-point manipulation plus a separate precision/rotation clutch.

Current-best architectural candidate from E18-R0 remains **P3**, but E17-depth should be judged as the bounded one-point A/B before its evidence is overinterpreted.

The sphere self-lift behavior remains deliberately unpatched during exploratory work: it is both a generative toy and a closed-loop authority debt.

## Durable lessons

- **E12:** capability entitlement can be graded; do not regress to blind full-strength authority.
- **E13:** do not manufacture an external reaction path exactly when authority needs it and call that neutral plumbing.
- **E14:** more physical representation can still be worse gameplay than the plain Donor.
- **E15:** a passive physical body can become little more than a reactive appendage if it owns no useful player capability.
- **E16:** giving a physical subsystem a capability is insufficient if the player must micromanage the subsystem itself.
- **E17:** high-level intent + finite physical execution can generate a family of verbs and persistent scene history even before the executor is good.

## Validation

Reproducible toolchain:

- Node `22.23.2` (`.nvmrc`);
- npm lockfile committed;
- CI uses `npm ci`;
- `box3d.js@0.1.1`;
- `three@0.183.0`;
- `vite@7.0.0`.

Commands:

- `npm run smoke` — existing foundation + accepted historical green regressions;
- `npm run smoke:current` — current promoted E16/E17/E17-depth regressions;
- `npm run build` — browser build.

The canonical GitHub Actions workflow runs locked install → both smoke layers → build, then deploys Pages only from `main`.

Experiment-specific diagnostics belong to the experiment branch/workflow and should not accumulate forever in the canonical deploy workflow. See [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## Normal controls

- `WASD` / touch left stick — camera-relative movement;
- `Space` / `JUMP` — jump;
- `Shift` / `SPRINT` — sprint;
- mouse/touch drag — orbit camera;
- mouse wheel — zoom;
- `R` / `RESET` — reset;
- `H` — telemetry.

Normal/default build:

`https://jozzpoly.github.io/Box3d-Character-Controler/`
