# Project workflow — compact canonical policy

This file exists to reduce ambiguity and maintenance drift. It is not a ceremony checklist.

## 1. Truth hierarchy

When sources disagree, prefer:

1. **Owner hands-on judgement** for feel, readability, fun, artificiality and whether a mechanism is worth pursuing;
2. **live `main` + exact SHA + source + CI/Pages** for implementation/publication truth;
3. **current frontier / closure docs** for research intent and evidence boundaries;
4. stage ledgers, branches and old conversations as provenance/context.

Machine PASS proves declared mechanics. It does not prove fun. Owner fun does not prove causal validity.

## 2. Default research loop

Use the smallest loop that answers the real unknown:

> **real friction / unknown → bounded hypothesis or probe → causal qualification → faithful Owner-facing build when appropriate → Owner judgement → next decision**

Do not force every task through all stages. A documentation fix does not need a research experiment; a feel question cannot be closed by CI alone.

## 3. Branch roles

Naming is descriptive, not authority:

- `experiment/...` — provisional causal/research work;
- `research/...` — longer bounded research line when useful;
- `publication/...` — minimal clean candidate distilled from qualified research;
- `maintenance/...` — refactor, tooling, reproducibility or documentation work;
- `main` — canonical implementation/publication state.

A branch can contain valuable evidence and still be rejected. Branch existence is not promotion.

## 4. Experiment boundary

Before implementation, state at least:

- the specific unknown;
- the smallest mechanism that separates it;
- what remains fixed;
- what counts as positive/negative evidence;
- the natural stop boundary.

Do not tune unrelated parameters merely to make the intended result appear.

Keep failed/confounded/protocol-miss probes when they teach something. Correct the interpretation or harness; do not rewrite history into a fake PASS.

## 5. Qualification layers

### Canonical regression spine

The permanent workflow runs:

`npm ci → npm run smoke → npm run smoke:current → npm run build`

Where:

- `npm run smoke` preserves the established foundation + historical accepted green regressions and Donor contract;
- `npm run smoke:current` protects the small representative promoted-runtime spine currently implemented in `scripts/smoke-suite.mjs` (E16 capability, E17 manipulation and one E18 P3 lifecycle regression at the 2026-09-09 checkpoint).

Suite membership is source truth; this prose should describe it, not silently become a second manifest.

This is regression protection, not the full research archive. E19's deeper diagnostics remain stage evidence rather than being forced into the permanent smoke spine merely because E19 was publicly published.

### Branch-local qualification

Experiment-specific diagnostics, sweeps, artifacts and one-off causal gates belong to the experiment/research branch.

A temporary dedicated workflow is allowed when it materially improves qualification. Prefer removing it before a clean publication/maintenance merge unless it has become a genuine permanent regression contract.

Historical Actions runs and artifacts remain provenance even after the temporary workflow file is removed.

## 6. Publication rule

Do not merge a whole research apparatus merely because the experiment succeeded.

Prefer a clean publication candidate containing only what the public/canonical result actually needs:

- required runtime/source;
- route/presentation if Owner-facing;
- minimal representative permanent regression(s) when the behavior has earned permanent protection;
- concise documentation of evidence boundary.

Keep deeper probes, diagnostics and rejected variants on research branches/history when they are useful provenance.

After merge:

1. re-fetch exact `main` SHA;
2. require exact-main CI/build success;
3. for public changes, require Pages deployment success;
4. only then call publication complete.

## 7. Owner boundary

Stop for Owner hands-on when the unresolved question is primarily:

- feel;
- usability;
- readability;
- whether behavior invites play/strategy;
- whether one qualified variant is actually preferable.

Do not replace that boundary with more parameter sweeps.

Owner feedback can close or redirect a research line even when all machine gates pass.

If a stage must later be administratively closed without a recorded Owner verdict, state that verdict as **not established** rather than converting publication/CI into gameplay acceptance.

## 8. Maintenance / refactor boundary

Separate maintenance from active causal experiments when possible.

For refactors:

- preserve behavior and parameters by construction;
- run the exact affected regression(s), not just a generic build;
- inspect the final diff for hidden scope creep;
- merge only after a clean maintenance qualification.

For dependency/tooling changes:

- keep them isolated from runtime mechanics;
- use the pinned Node version and committed lockfile;
- validate from a clean checkout with `npm ci`.

For repository hygiene:

- inventory before deleting;
- treat branch names and merge status as hints rather than proof that a ref is disposable;
- preserve material provenance through retained refs/history/docs as appropriate;
- keep deletion as a distinct auditable maintenance campaign rather than opportunistic cleanup during research.

## 9. Documentation roles

Keep the information hierarchy small:

- `README.md` — public/current overview;
- `docs/PROJECT_STATE.md` — compact live orientation and current stop boundary;
- `docs/WORKFLOW.md` — this workflow contract;
- latest frontier **or closure** document — current deep research map/evidence boundary;
- stage ledgers — historical evidence/provenance.

Do not let root navigation point to an old stage as “current”.

When a new frontier materially replaces an old one, or a frontier is deliberately closed without an immediate successor, update `PROJECT_STATE.md`, `README.md` and `docs/README.md` together rather than creating another competing “current state” document.

## 10. What not to institutionalize

Avoid process for its own sake.

Do not require:

- a new document for every tiny experiment;
- a permanent CI step for every historical diagnostic;
- full replay of all prior research before every change;
- architecture/refactor work during a causal probe unless correctness requires it;
- automatic patching of interesting exploits before understanding what they reveal;
- permanent branches merely to prove that historical work once existed when commit/PR/Actions provenance is already sufficient.

The workflow should reduce Owner attention cost and preserve evidence quality, not become another project to maintain.
