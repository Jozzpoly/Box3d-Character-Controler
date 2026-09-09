# Repository cleanup Gate 1 — first disposition review — 2026-09-09

Status: **PRELIMINARY DISPOSITION READY / ARCHIVE NOT YET CREATED / DELETION NO-GO**

This checkpoint records the first semantic review performed after the qualified Git-native Gate-1 classifier narrowed the live branch forest.

## 1. Qualified mechanical result

Source workflow run: `34404913920` — **SUCCESS**.

Exact classification at canonical `main` `230d9d0cf43953ca7774b664d1cfcc9969d8f0d9`:

- live branches: **87**;
- distinct branch-tip SHAs: **76**;
- PR-head refs: **50**;
- `CANONICAL`: **1**;
- `ANCESTOR_OF_CANONICAL`: **51**;
- `PR_HEAD_PRESERVED`: **21**;
- `DIVERGENT_UNIQUE`: **14**.

The ordinary repository verification on the classifier head `aaf00489c01008619f15d6e5b6e49792c78b7f6a` also passed `smoke`, `smoke:current` and build (run `34404913853`).

The classifier itself had read-only token permissions and produced artifact `10124919739` with ZIP SHA-256:

`f17c4f0c82d3bcedf037dbed751e79f40bb08984a0ca59de8ef7a631fa3a57f8`

## 2. Key simplification: preservation should be universal, not value-selected

The original readiness model asked whether each divergent branch deserved `KEEP`, `ARCHIVE`, `DELETE-SUPERSEDED` or `REVIEW` treatment.

After seeing the exact graph, a stronger and lower-risk policy is available:

> **Archive every distinct pre-cleanup branch tip before deleting any historical branch name.**

This makes preservation independent of subjective branch value. A branch can be obsolete, failed, confounded or extremely valuable; its exact pre-cleanup tip is retained anyway.

With the observed graph this means archive coverage for **76 distinct exact tip SHAs**, not 87 duplicate names.

The recovery manifest still records every original branch name → exact SHA, so aliases and historical naming remain reconstructible even though duplicate tips need only one ancestry anchor.

This policy removes a dangerous decision from the destructive path: semantic review no longer decides whether history survives. It decides only whether a branch name has a continuing **live namespace purpose**.

## 3. The 14 `DIVERGENT_UNIQUE` refs

One of the 14 is the current cleanup helper branch and is intentionally live during this campaign. The other 13 are historical.

### Material research / evidence history — archive, then branch-name deletion candidate

| Branch | Unique commits | Evidence character |
| --- | ---: | --- |
| `experiment/e18-p3-owner-interaction` | 56 | deep Owner-facing P3 lifecycle/browser/mechanics evidence |
| `experiment/e18-p3-coupled-two-point` | 49 | deep P3 mechanics, reaction/contact/release qualification |
| `experiment/e16-active-contact-organ` | 35 | contact/manifold/grab/transport/capability-yard research apparatus |
| `experiment/e18-manipulation-v0` | 28 | E18 manipulation-intent diagnostic sequence and falsifiers |
| `experiment/e8-parallel-axial-support-decomposition-temp` | 26 | substantial E8 constraint/topology research despite `temp` name |
| `experiment/e17-one-point-depth` | 18 | effective-mass and inertia-aware one-point research/Owner probe |
| `experiment/e16-body-owned-feasibility` | 5 | body-feasibility and solver-residual evidence |
| `research/e18-manipulation-landscape` | 1 | focused E17 point-effective-mass diagnostic |

These histories are materially useful. The proposed disposition does **not** mean their work is unimportant. It means the archive ref, not dozens of live experiment branch names, should carry their long-term recoverability.

### Historical runtime / traversal alternatives — archive, then branch-name deletion candidate

- `foundation/traversal-polish-021` — 9 unique commits touching traversal runtime/smoke/visuals;
- `tmp-invalid` — 3 unique Foundation-02.1-era traversal/runtime commits despite disposable name.

Both are useful historical alternatives and should be retained exactly in the archive. Neither has an identified current live task or open PR/issue requiring the original branch name.

### Bounded experiment / evidence branches — archive, then branch-name deletion candidate

- `experiment/e14-owner-pin-1180-065-3-36-1000` — 3 commits containing exact Owner-pin qualification + braking ablation evidence;
- `experiment/e14-world-transfer-mass-800` — 1 unique commit whose only changed file is the historical CI workflow used to qualify the one-property mass-transfer run.

The first is valuable experiment evidence; the second is strongly superseded as live configuration. Universal archive coverage avoids needing to choose between preserving one and discarding the other.

### Superseded maintenance history — archive, then branch-name deletion candidate

`maintenance/dependency-lock-probe` contains 5 unique probe commits, but its actual `package-lock.json` blob is byte-identical to current `main` (`bd69c2aa3c783d1d007098978f92b0773fdb9d19`). The branch therefore carries process provenance, not a still-missing product state.

Proposed disposition: preserve exact history in archive, then remove the noisy branch name.

### Current cleanup branch — KEEP until closure

`maintenance/repo-cleanup-adaptation-2026-09-09` is the only `DIVERGENT_UNIQUE` ref with a current live purpose. It must remain until the cleanup campaign is closed and its useful docs/changes receive a final disposition.

It must not become permanent unexplained clutter afterward.

## 4. Current live-dependency check

At this checkpoint:

- open pull requests: **0**;
- open issues: **0**;
- current project stage is already closed/frozen before cleanup work;
- the canonical Pages workflow deploys only from `main`;
- targeted code search on representative deep unique branch names did not find canonical source/config dependencies on those literal branch names.

This supports, but does not yet execute, the target topology:

- `main` — canonical;
- one explicit `archive/pre-cleanup-...` ref — historical recovery;
- cleanup helper branch only while the campaign remains active.

A fresh dependency/open-work check remains mandatory immediately before destructive execution.

## 5. Preliminary branch-name disposition policy

For the current Gate-1 plan:

- `refs/heads/main` → `KEEP`;
- `refs/heads/maintenance/repo-cleanup-adaptation-2026-09-09` → `KEEP_UNTIL_CLOSURE`;
- every other currently observed historical branch → `ARCHIVE_THEN_DELETE_CANDIDATE`.

This is **not** a destructive manifest. Every historical record remains blocked while `archiveCovered == false`.

The machine-readable preliminary plan must be generated from classifier output, not typed manually, and must assert:

- record count == live branch count;
- semantic ref uniqueness;
- exactly one canonical record with exact canonical SHA;
- distinct archive-tip count == classifier distinct-tip count;
- destructive authorization remains false;
- plan SHA-256 is emitted for later freeze/review.

## 6. Why universal archive coverage is preferred here

Compared with selective archival, universal distinct-tip coverage has several advantages:

1. removes subjective preservation decisions from the destructive critical path;
2. preserves failed/confounded experiments that may become valuable donors later;
3. preserves seemingly trivial probes without keeping noisy branch names;
4. naturally handles duplicate branch aliases by deduplicating exact SHAs;
5. keeps original name → SHA provenance in a recovery manifest;
6. permits a genuinely small live namespace without history loss;
7. is mechanically testable before deletion.

The cost is a larger archive-anchor parent set. At the current snapshot it is only 76 distinct tips, below the already successful local 100-parent stress test. Real GitHub-side anchor creation still requires explicit qualification.

## 7. Remaining Gate-1 blockers

Before the first real historical branch deletion can be considered:

1. deterministic preliminary plan generation must pass on live classifier output;
2. re-run classification after any preparation changes and freeze a later exact snapshot;
3. qualify real GitHub multi-parent archive-anchor construction;
4. create explicit archive manifest + archive ref and verify every expected tip is reachable from it;
5. address broad `on: push` CI behavior for branch deletions before bulk prune;
6. resolve and adversarially test the actual delete-ref executor;
7. perform zero-mutation dry run of the final frozen manifest;
8. re-check open work, canonical SHA, archive ref and unknown-ref survival immediately before Gate 2.

## Stop boundary

No historical branch has been deleted or moved. No archive ref exists yet.

The next natural step is to qualify deterministic plan generation and then move to **real archive-anchor qualification**, still before destructive cleanup.
