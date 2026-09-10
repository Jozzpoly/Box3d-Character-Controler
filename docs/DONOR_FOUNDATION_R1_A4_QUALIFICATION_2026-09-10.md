# Donor foundation R1 A4 qualification — 2026-09-10

## Status

**R1 A4 TECHNICALLY QUALIFIED / OWNER BEHAVIOR GATE PENDING**

This checkpoint qualifies the first repair slice selected after the bounded A1–A5 Donor foundation falsification campaign. It does **not** promote the repair to canonical `main`, does not revise Donor v1 internals, and does not authorize the next repair slice.

## Truth anchors

Canonical product baseline during this qualification:

- branch: `main`
- SHA: `e7a98beaca4c010e056c31db97b33c05b4610e38`

Evidence campaign parent:

- branch: `research/donor-foundation-falsification-2026-09-10`
- checkpoint SHA: `3d9ee777304e5e4a138c2c45a2fa00f356d91064`
- checkpoint: `docs/DONOR_FOUNDATION_FALSIFICATION_CHECKPOINT_2026-09-10.md`

Repair branch:

- `research/donor-foundation-repair-a4-2026-09-10`
- qualified runtime/test head before this documentation-only checkpoint: `06684694ac270889f2ada4c1271be8ab453412bd`

## Why R1 was A4

A4 demonstrated that render cadence leaked into camera-relative mechanics. The same 60 fixed physics ticks and the same held-forward / 90-degree yaw target could produce materially different trajectories depending only on render scheduling, including a legal 100 ms leading hitch.

This was selected before A3/A3b because:

1. it can directly contaminate Owner feel tests and E19 mechanical acquisition;
2. the Donor v1 contract already receives caller-owned world-space `forward/right`, so the defect can be repaired outside Donor internals;
3. the repair has a much smaller feel and topology blast radius than changing support transport;
4. we can preserve the existing 60 Hz response semantics exactly instead of retuning movement.

## Repair design

R1 separates presentation camera yaw from fixed-step mechanical yaw.

`FollowCamera` now has a control-yaw state which:

- is initialized/reset/snapped with the camera;
- exposes `controlBasis()` for mechanics;
- advances toward `desiredYaw` using the existing exponential damping rate `17` and fixed physics `dt`;
- advances **after** each mechanical tick, preserving the legacy first-tick ordering.

The existing render-side `basis()` and visual `update(frameDt)` remain presentation state.

Browser integration:

- `src/main.js` samples `controlBasis()` for `PlayerInput` and advances control yaw once after each physics tick;
- `src/e19-owner-browser.js` uses the same fixed-step basis for locomotion and mechanical swept reach/acquisition, then advances control yaw once after the physics tick;
- E19 render-only arm preview intentionally still defaults to visual `basis()`. A small visual/mechanical mismatch during unusual render timing is therefore an explicit presentation boundary, not hidden mechanical cadence dependence.

Donor v1 movement/contact/support internals and its numerical profile are unchanged.

## Substrate qualification before browser integration

Substrate commit:

- `809bb0dead9b065fbd83e31d5913e4a0f689c055`
- message: `Add R1 fixed-step camera basis substrate crucible`

R1 substrate run:

- workflow run: `34527876015`
- artifact: `10172278402`
- artifact ZIP SHA-256: `dc99dd2176afda6b97ee0a8b768bbc2b261fe1efe1d1d50e55514b2aa927b692`

Executable result over 30 Hz, 60 Hz, 144 Hz and a legal 100 ms leading-hitch render schedule, all with exactly 60 fixed physics ticks:

- maximum mechanical-yaw sequence delta across candidate schedules: `0`
- maximum final-position delta across candidate schedules: `0`
- maximum final-velocity delta across candidate schedules: `0`
- candidate 60 Hz vs legacy 60 Hz yaw-sequence delta: `0`
- candidate 60 Hz vs legacy 60 Hz final-position delta: `0`
- candidate 60 Hz vs legacy 60 Hz final-velocity delta: `0`
- first mechanical yaw sample remained `0`, preserving current first-tick ordering.

Canonical verify/build for the substrate:

- run `34527876040`
- foundation / accepted historical regressions: success
- current promoted prototypes: success
- playground build: success
- Pages/deploy: skipped as expected on research branch.

## Browser integration

The actual successful source integration commit is:

- `1089300a992dd1bd99a958b1fcf45d1b62b72990`
- message: `Integrate R1 fixed-step camera basis into browser runtimes`

The bounded source integration executor run is:

- run `34528557772`
- exact preflight and bounded source patch: success
- commit and push: success
- overall job: `completed / success`.

The one-shot executor was subsequently removed from the final tree. It is not part of the qualified runtime specimen.

A persistent static integration contract was then added as:

- `scripts/r1-a4-browser-integration-contract.mjs`

It guards that:

- main physics uses `controlBasis()` exactly once and advances control yaw exactly once per tick;
- E19 physics does the same;
- E19 mechanical reach receives the fixed-step basis;
- E19 render-preview code retains the visual-basis default;
- the old render-basis physics sampling pattern is absent from both browser physics loops.

## Final integrated qualification

Qualified pre-documentation head:

- `06684694ac270889f2ada4c1271be8ab453412bd`

Final R1 workflow:

- run `34528714767`
- integration contract: success
- R1 A4 crucible: success
- evidence upload: success
- overall job: success

Final evidence artifact:

- ID: `10172602905`
- ZIP SHA-256: `f9c710c067ab6396149447a702646c3af51b77da037b4f44124aec1ac97e8818`

Final integrated executable result:

- `maxYawSequenceDelta = 0`
- `maxPositionDelta = 0`
- `maxVelocityDelta = 0`
- legacy 60 Hz match: yaw `0`, position `0`, velocity `0`.

Therefore, within the executable specimen, R1 removes the measured render-cadence dependency while preserving the previous 60 Hz mechanical response exactly.

Final canonical verify/build on the same qualified head:

- run `34528714667`
- foundation / accepted historical regressions: success
- current promoted prototypes: success
- playground build: success
- Pages/deploy: skipped as expected on research branch.

## Runtime scope audit

Immediately before this documentation-only checkpoint, compare against canonical `main` showed the repair branch as `25 ahead / 0 behind` with merge-base exactly `e7a98beaca4c010e056c31db97b33c05b4610e38`.

Most of those commits/files are inherited falsification evidence and temporary research harnesses. The actual runtime repair surface is only:

- `src/follow-camera.js`: `+19 / -4`
- `src/main.js`: `+2 / -1`
- `src/e19-owner-browser.js`: `+6 / -6`

No `src/donor/**` runtime implementation file is changed by R1.

The research branch should therefore **not** be merged wholesale into `main`. If R1 passes the Owner behavior gate, canonical promotion should be a clean, bounded promotion of the qualified logical repair and durable regression coverage rather than importing the entire 25+ commit research/executor history.

## Tooling provenance — not runtime failures

Several executor-carrier attempts failed while finding a safe way to apply the two large browser-file edits. These failures are preserved deliberately so future readers do not misclassify them as R1 physics failures.

### Run `34528196275`

Immediate workflow failure with zero jobs. The executor YAML was malformed because nested multiline generated script content escaped the `run: |` indentation boundary. No source patch executed and no runtime source changed.

### Run `34528376911`

Second immediate workflow failure with zero jobs while simplifying the same carrier. Again, no source patch executed and no runtime source changed.

### Run `34528465064`

The corrected executor started normally. Its exact parent/string preflight and bounded source-patch contract passed. It produced a local integration commit, but the remote push was rejected because the GitHub Actions token was not permitted to modify a workflow file (`workflows` permission boundary). The remote source therefore remained unchanged by that run.

### Run `34528557772`

The executor was narrowed to source files only. Exact preflight, bounded patch, commit and push all succeeded. This is the execution that created the real remote source integration commit `1089300a992dd1bd99a958b1fcf45d1b62b72990`.

The executor workflow was removed afterward through the normal GitHub connector.

## What this qualification proves

R1 has strong executable evidence that:

1. the measured A4 mechanical path is invariant across the tested render schedules;
2. the candidate preserves the previous 60 Hz mechanical yaw sequence, position and velocity exactly in the controlled specimen;
3. the main browser locomotion path consumes the fixed-step basis;
4. E19 locomotion and mechanical reach/acquisition consume the same fixed-step basis;
5. existing canonical foundation/current smoke contracts and the playground build remain green;
6. Donor v1 internals are untouched.

## What this qualification does not prove

It does not prove that:

- every possible input/camera event timing is deterministic;
- visual camera and mechanical control yaw are perceptually indistinguishable during every hitch;
- the E19 render-preview presentation boundary is ideal for Owner feel;
- R1 should automatically be promoted to canonical `main`;
- A3/A3b, A1, A2 or A5 should be repaired in any particular order after this;
- the remaining Donor foundation findings are harmless.

## Owner gate and promotion boundary

The technical repair is now qualified strongly enough for an Owner behavior/feel gate.

The Owner test should focus on whether camera-relative movement and E19 aim/acquisition still feel coherent during ordinary play, quick camera rotations, low/high frame cadence and visible hitch/catch-up situations. The purpose is not to re-prove the numerical invariant by eye; it is to detect any perceptual cost introduced by separating presentation yaw from mechanical yaw.

Until that gate is passed:

- keep canonical `main` unchanged;
- do not merge the research branch wholesale;
- do not start A3/A3b support repair as part of R1;
- do not reinterpret technical qualification as Owner acceptance.

**Stage: R1 A4 TECHNICALLY QUALIFIED / OWNER BEHAVIOR GATE PENDING.**
