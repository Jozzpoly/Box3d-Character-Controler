# E2.1 — Terrain / Support Boundary Localization

Status: **diagnostic stage complete**. Production A/B runtime was not changed by this stage.

Exact machine-qualified diagnostic specimen before documentation: `3725586c6369a978afbdb0f63a8c02fb1f03a451`.

## Why this stage existed

Owner free play of the public E2 A/B instrument rejected both current options as satisfactory locomotion:

- **A / Foundation 02.1 controller-owned** had the useful ability to walk ordinary stairs, but Owner observed a strange slippery / unstable effect that sometimes appeared while jumping onto or around physical objects.
- **B / solver-owned translational root** felt too limited for ordinary uneven terrain because small vertical discontinuities often required explicit jumping; repeated Space input is not an acceptable general rough-terrain locomotion model.

The purpose of E2.1 was **not** to fix either controller. It was to determine whether these failures were local implementation defects or evidence of deeper representational costs.

## Gate A — support/jump transfer channels

Flat-support controls first separated support inheritance from edge-contact effects.

With zero player horizontal input:

- static support: `0.00 m/s` support velocity → `0.00 m/s` inherited external velocity;
- stationary dynamic support: `0.00 m/s` → `0.00 m/s`;
- translating kinematic support: `1.50 m/s` → exactly `1.50 m/s` inherited at jump;
- rotating kinematic support: about `1.20 m/s` point velocity → about `1.20 m/s` inherited at jump.

Interpretation:

> Flat support-velocity inheritance is deterministic and is **not sufficient to reproduce the Owner-observed anomaly**. It remains a possible feel contributor on moving objects, but it is not the primary reproduced failure.

## Gate A2 — vertical edge landing

A more relevant crucible dropped the character vertically, with **zero horizontal input**, onto a cube at increasing offsets from its center.

This exposed the anomaly directly.

### Static cube

For A, center and ordinary top-surface landings remained stable. Near the edge:

- `x=0.74`: about `0.24 m` horizontal position drift despite reported horizontal velocity remaining `0.00 m/s`; strongest mover contact plane had horizontal component about `0.99`;
- `x=0.86`: about `0.12 m` drift with horizontal velocity still `0.00 m/s`; contact plane again almost horizontal.

This is strong evidence that the controller-owned mover can convert a vertical edge encounter into **lateral positional correction that is not represented as horizontal velocity state**.

That mechanism is closely related to why the rounded mover can negotiate small vertical steps: oblique capsule/edge contact normals allow motion around an obstacle rather than treating every vertical face as an absolute wall.

### Dynamic cube

The same A edge encounter became much stronger on a dynamic cube:

- `x=0.74`: about `1.10 m` drift, `1.34 m/s` peak horizontal player speed, about `259.3 N·s` manual dynamic-contact impulse;
- `x=0.86`: about `1.05 m` drift, `1.64 m/s` peak horizontal speed, about `149.3 N·s` manual impulse.

B also shows ordinary rigid-body edge response at extreme offsets, so edge sliding is not unique to A. However at `x=0.74` the contrast was materially smaller:

- B/static: about `0.01 m` drift;
- B/dynamic: about `0.46 m` drift, `1.16 m/s` peak speed.

## Gate A3 — decomposition of A dynamic amplification

The diagnostic script monkey-patched individual A mechanisms **only inside the test**. Production runtime was not edited.

At `x=0.74`:

- full A: `1.10 m` drift, `1.34 m/s`, `259.3 N·s` manual impulse;
- **no dynamic impulse exchange**: `0.23 m` drift, `0.00 m/s` horizontal velocity;
- **no support-anchor transport**: `1.00 m` drift, `1.31 m/s`, same `259.3 N·s` manual impulse;
- no exchange + no transport: `0.23 m` drift.

The dynamic cube reached about `4.00 rad/s` peak angular speed in the full/no-transport cases, while the no-exchange control did not spin it. Maximum accepted support-anchor transport in the full case was only about `1.8 cm/tick` and lasted a few support frames.

At `x=0.86`, where no dynamic support was acquired, the result was even cleaner:

- full: `1.05 m` drift / `1.64 m/s`;
- no exchange: `0.11 m` / `0.00 m/s`;
- no transport: unchanged from full.

### A causal verdict

The Owner-observed slippery / launch-like behavior is best explained by **two layers**:

1. **base edge geometry / mover positional solve** — rounded capsule contact near an edge can create lateral displacement even from a purely vertical fall, without corresponding horizontal velocity state;
2. **manual dynamic reciprocity strongly amplifies that edge event** — the effective-mass impulse exchange injects horizontal reaction into player velocity/external velocity and strongly excites the dynamic object.

The body-local support transport bridge is **not the dominant amplifier in the reproduced failure**.

This does not prove every observed slippery event has exactly this cause, but it reproduces the same failure family under deterministic zero-input conditions and sharply localizes the dominant mechanisms.

## Gate B — natural vertical-step boundary

A and B were driven forward with no jump against single vertical steps.

Measured maximum passed step height in this fixture:

- A controller-owned mover: **`0.25 m`**; `0.30 m` blocked;
- B solver-owned, friction `0.20`: **`0.10 m`**;
- B solver-owned, friction `0.45`: **`0.10 m`**;
- B solver-owned, friction `0.82`: **`0.05 m`**.

Higher friction did not rescue B. In this fixture it **reduced** the natural step boundary.

This weakens the explanation that B merely lacks traction.

## Gate B2 — authority sensitivity

The first robustly blocking heights (`0.15`, `0.20`, `0.22 m`) were tested at player ground-acceleration authority:

- `13 m/s²`;
- `26 m/s²` (current E2 value);
- `52 m/s²`;
- `104 m/s²`.

All tested heights remained blocked at every authority level.

At `104 m/s²`, peak controller impulses reached roughly `145–159 N·s` per tick in the blocking interaction, yet the body rose only about `0.01–0.02 m` rather than negotiating the step.

### B causal verdict

> The current B rough-terrain failure is **not primarily an underpowered locomotion motor and is not solved by adding ordinary friction**.

A simple upright rigid capsule driven horizontally by bounded impulses has a genuine contact/geometric boundary around small vertical discontinuities. Brute-force horizontal authority mostly pushes harder into the obstacle rather than creating useful terrain negotiation.

Therefore a future solver-owned character that must traverse ordinary rough terrain needs **some additional terrain-negotiation capability or representation**, not merely stronger traction or a stronger horizontal servo.

## Combined mechanism map

E2.1 separates the two Owner failures:

| Need / failure | Current evidence |
| --- | --- |
| Ordinary small-step continuity | A gets it naturally from rounded mover geometry; B does not beyond roughly `0.10 m` in the diagnostic fixture. |
| A slippery edge behavior | Reproduced with zero input. Base mover edge correction causes positional drift; manual dynamic impulse exchange is the dominant dynamic amplifier. |
| Support-anchor transport | Useful bridge, but not the dominant cause of the reproduced A dynamic-edge anomaly. |
| Flat moving-support velocity inheritance | Deterministic and proportional to support point velocity; not sufficient by itself to reproduce the anomaly. |
| B traction | Increasing friction does not solve the vertical-step boundary and can worsen it. |
| B horizontal authority | Increasing ground acceleration to `104 m/s²` does not solve `0.15–0.22 m` steps. |

## Interpretation

The project should no longer frame the immediate problem as simply **controller-owned A versus solver-owned B**.

E2.1 shows two partially independent requirements:

1. **terrain negotiation / locomotion affordance** — player intent must remain continuous across ordinary small discontinuities;
2. **physical coupling / consequence** — contact with dynamic matter must remain causally coherent without edge geometry plus reciprocity producing disproportionate lateral behavior.

A currently obtains terrain continuity from the same rounded contact geometry that can create edge correction, then manually layers reciprocity on top. B obtains cleaner solver-owned physical coupling, but has no mechanism that interprets a vertical discontinuity as terrain to negotiate.

This is evidence for separating those responsibilities in future experiments rather than choosing the less-bad current option.

## Non-claims

E2.1 does **not** establish:

- that explicit teleporting step-up is the correct solution;
- that all rounded-capsule traversal is bad;
- that manual effective-mass reciprocity is always wrong;
- that solver-owned roots are architecture winners;
- that active ragdoll, feet, articulation or balance are now required;
- that the next implementation should simply combine A and B.

It also does not justify more A polish or more brute-force B tuning by default.

## Stage boundary

E2.1 ends with a **mechanism map**, not a new controller.

The next stage should begin by choosing the smallest experiment that can test a terrain-negotiation capability **without surrendering solver-owned physical consequence or recreating A's dynamic-edge amplification**.

That design is a new stage and is intentionally not started here.
