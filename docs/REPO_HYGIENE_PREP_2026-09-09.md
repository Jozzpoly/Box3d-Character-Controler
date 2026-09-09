# Repository hygiene preparation — 2026-09-09

Status: **PREPARATION GO — NO BRANCH DELETION AUTHORIZED YET**

A falsification-first readiness audit has now been completed. It confirms that the repository is ready to begin the preparation/classification sequence, while also proving that immediate blanket deletion would be unsafe.

Current audit authority:

[`REPO_CLEANUP_READINESS_2026-09-09.md`](REPO_CLEANUP_READINESS_2026-09-09.md)

Key result at audit time: the complete namespace contains **85 branches**; many are safe ancestor/duplicate candidates, but several important E16–E18 and Donor/foundation branches contain branch-only research history and require `KEEP / ARCHIVE / DELETE-SUPERSEDED / REVIEW` classification before mutation.

## Why this exists

The Character Controller repository has accumulated a large historical branch forest across many research stages, publication passes, maintenance work and temporary experiments.

That clutter now has a real attention/discoverability cost, but branch deletion can also destroy convenient provenance if performed from names or merge status alone.

The next maintenance campaign will therefore reuse and improve the repository-cleanup workflow previously exercised in `jv_web`, after the Owner supplies that workflow package.

This document prepares the boundary; it does not invent a competing deletion policy.

## Current canonical anchor before cleanup

At the start of E19 closure maintenance:

- repository: `Jozzpoly/Box3d-Character-Controler`;
- canonical branch: `main`;
- grounded pre-closure main SHA: `425a55451ba223a83ef000ae69d0ed7dd5bb0a95`;
- open PRs: `0`;
- latest promoted research line: E19 via PR `#48`;
- E19 research head: `73ef9105c2910b3450e9c64c5c636e89d942a102`;
- exact E19 research and publication provenance is recorded in [`E19_STAGE_CLOSURE_2026-09-09.md`](E19_STAGE_CLOSURE_2026-09-09.md).

The readiness audit was then grounded against post-closure `main` `cdf20ced5e23f7115226c946e0b0c70460491fbe` and exact-main workflow run `34396668404` (verify/build/Pages success). Future live `main` supersedes both recorded SHAs as implementation truth.

## What the later cleanup must protect

Before deleting any branch, the cleanup process should establish at least:

1. whether unique commits exist outside retained refs;
2. whether a branch contains corrected/negative/confounded evidence referenced by canonical docs;
3. whether an exact SHA needed for provenance remains reachable by retained refs/tags/history;
4. whether the branch is still connected to an open issue/PR/workflow or active maintenance task;
5. whether its useful state has already been merged or distilled into canonical source/docs;
6. whether temporary names such as `tmp`, publication duplicates or repair branches actually contain unique evidence despite appearing disposable.

Branch names are hints, not authority.

## Likely classification families — candidates only

The branch forest includes families such as:

- historical `experiment/...` research branches;
- `research/...` branches, including the completed E19 line;
- `publication/...` branches used to distill Owner/public candidates;
- `maintenance/...` and docs-only branches;
- `foundation/...`, `stabilize/...`, `mobile/...` and `playground/...` historical refs;
- temporary/repair branches (`tmp`, invalid/no-op style names and similar);
- older stage-specific branches already represented in later merged history.

These categories are **not deletion decisions**. The imported workflow must classify exact graph relation and branch-only history before acting.

## Evidence preservation strategy

Preferred long-term shape:

- small set of meaningful live branches;
- `main` as canonical current truth;
- concise canonical docs carrying exact historical SHAs/run IDs where material;
- Git/PR/Actions history used as provenance rather than a permanent branch-per-experiment UI;
- explicit durable archival refs/tags for material branch-only history when the adapted cleanup workflow determines that deleting the noisy branch name would otherwise remove the only reliable named anchor.

The readiness audit found no existing tags or releases, so archival retention cannot be assumed to exist already.

Do not create archival ceremony merely to replace one kind of clutter with another; preserve only what materially improves recoverability/evidence integrity.

## Maintenance already completed safely before branch cleanup

The E19 stage closure removed the stage-specific `e19-diagnostics.yml` workflow from canonical source because:

- it triggered only the completed `research/e19-hand-grip-reframe` branch or manual dispatch;
- its successful historical Actions runs remain recorded;
- E19 source/evidence remains preserved;
- one representative E19.1e end-to-end regression now lives in permanent `smoke:current`;
- canonical `WORKFLOW.md` explicitly prefers temporary experiment workflows not to accumulate after closure.

This was workflow maintenance, not branch deletion.

## Inputs expected from the Owner before cleanup execution

The next cleanup run should begin only after reviewing the Owner-provided `jv_web` workflow/package. We should extract:

- its inventory method;
- safety gates before deletion;
- treatment of merged vs unmerged refs;
- provenance/archive rules;
- rollback/recovery strategy;
- reporting format;
- actual destructive executor;
- any friction or mistakes discovered during the earlier cleanup.

Then adapt those rules to this repository rather than copying them mechanically.

The current Browser-GitHub tool surface used for the readiness audit does not expose a branch/ref deletion action, so the destructive executor must be resolved before deletion begins rather than improvised mid-run.

## Success condition for the later campaign

The goal is not “minimum possible branch count”.

Success means:

> **A substantially cleaner live branch namespace in which every retained branch has a current purpose or explicit preservation reason, while discarded refs do not erase material evidence or make project history harder to reconstruct.**

After execution, the cleanup workflow itself should receive a short retrospective so its reusable version becomes safer, faster and lower-attention for the next repository.
