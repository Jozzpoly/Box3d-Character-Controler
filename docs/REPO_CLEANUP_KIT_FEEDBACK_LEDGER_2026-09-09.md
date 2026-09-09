# Repository cleanup kit feedback ledger — 2026-09-09

Status: **LIVE FEEDBACK — DO NOT TREAT AS FINAL V3 DESIGN YET**

Purpose: capture what the reusable cleanup kit got right, where it was too repo-specific or incomplete, and what the Character Controller campaign teaches us while evidence is fresh. This ledger should survive through the entire cleanup and be revisited after post-cleanup qualification before producing a new kit version.

## What is already working well

1. **Gate 0 before mutation** is valuable. It prevented a branch-deletion task from collapsing into a name-based cleanup script.
2. **Classification before execution** is the correct separation of concerns.
3. **Fail-closed defaults** fit research repositories where unique evidence may live outside canonical history.
4. **Tooling-quality gates for mutating executors** are essential and should remain first-class.
5. **Explicit dry-run before destructive execution** remains non-negotiable.
6. **Promotion/preservation/prune separation** is useful generically, even though this repository needs a no-promotion mode.
7. **Checksums/manifests for the kit itself** were useful; the supplied package verified cleanly before adaptation.

## Adaptations that should become candidate kit features

### 1. Add a `canonical-already-promoted / archival-prune-only` mode

The current kit is biased toward candidate preparation/promotion. Some repositories enter cleanup with an already-qualified canonical branch. In that case promotion steps should become explicit no-ops instead of ceremony.

### 2. Aggregate archive anchor as a first-class preservation option

Do not assume `one archive tag per divergent branch` is the only durable strategy.

Candidate pattern:

- one explicit archive ref;
- one recovery manifest mapping old refs to exact SHAs;
- one synthetic multi-parent commit retaining selected historical tips.

This can preserve large research forests without moving clutter from Branches to Tags.

The mechanism must be treated as an option with a qualification gate, not universally imposed.

### 3. Separate `durable ref` from `immutable ref`

A branch, tag, PR-head ref and archive anchor have different mutability/ownership semantics. Documentation should not casually call every durable pointer immutable.

### 4. Add explicit `ARCHIVE_REACHABLE` proof class

If a branch tip is preserved through an aggregate archive anchor, the manifest should express that directly rather than forcing the case into `archived_exact` or `ancestor_of_canonical`.

### 5. Inventory branch tips and PR-head refs together

A high-value optimization is:

`branch tips − canonical-reachable tips − exact PR-head tips = expensive review residual`

GitHub's `refs/pull/*/head` can explain nonlinear/squash-era branch tips and reduce unnecessary archaeology. They are recovery witnesses, not a complete archive policy.

### 6. Cheap reachability screening before full compare/diff

Do not run expensive branch-only diff analysis for every ref equally. First deduplicate SHA aliases and test canonical reachability; reserve expensive review for the residual set.

### 7. Audit broad `push` workflows for delete-ref side effects

GitHub branch deletion can emit a push event. A repository with `on: push` may run CI once per deleted branch even when no source changed.

The consumer audit should explicitly check:

- `on: delete` consumers;
- broad `on: push` consumers;
- event-specific guards such as `github.event.deleted`;
- deployment conditions that might behave differently on deleted refs.

### 8. Freeze manifest after cleanup's own preparation refs exist

A cleanup campaign creates its own branches/files. Therefore a branch count captured before the campaign is necessarily stale. Final destructive inventory must be regenerated immediately before freeze.

### 9. Self-cleanup must be part of the closure contract

Cleanup/maintenance branches themselves easily become the next generation of clutter. Every reusable protocol should require an explicit terminal disposition for its own helper refs.

### 10. Schema semantic uniqueness must be tested explicitly

JSON Schema `uniqueItems` does not guarantee that two records cannot describe the same logical ref with different ancillary fields. The manifest validator must enforce unique normalized ref names.

### 11. Canonical branch identity must be encoded twice

Useful defense in depth:

- discover actual default branch dynamically;
- also support an optional repository-specific hard deny (here: `main`).

This protects against both configuration drift and manifest/tool bugs.

### 12. Capability discovery belongs in Gate 0

Do not assume the orchestration environment can or cannot create/delete refs from memory. Discover exact primitives before designing the execution path.

The Character Controller review corrected an initial underestimation: Browser GPT can create low-level blobs, trees, multi-parent commits and branch refs, even though it still lacks delete-ref and workflow-dispatch primitives.

### 13. Executor environment should be pluggable

The safety contract should be independent of whether execution happens through:

- GitHub Action;
- local Git/GitHub API;
- Codex/Work;
- another authorized environment.

Do not couple policy correctness to one UI.

### 14. Require CAS semantics per deletion target

Each deletion should compare the live target SHA with the frozen expected SHA immediately before deletion. A branch that moved after review is no longer the reviewed object.

### 15. Unknown refs must survive by construction

The executor should never compute deletion candidates dynamically. New branches created after manifest freeze must be ignored automatically because they are absent from the manifest.

## Kit assumptions that proved too narrow for this repository

1. Branch names are too weak to drive even preliminary safety classification.
2. `merged PR` is not equivalent to `exact branch tip is ancestor of canonical`; squash/nonlinear history matters.
3. A small branch-only commit count does not imply low evidence value.
4. Disposable-looking names (`tmp`, `temp`, probes) can contain meaningful unique history.
5. Divergence does not imply “archive forever”; superseded probes exist.
6. No tags/releases does not mean no recoverability witnesses exist; PR-head refs can still exist.
7. Consumer audit limited to explicit deletion hooks misses broad push-trigger costs.
8. The final target should minimize **live cognitive namespace**, not mechanically minimize branch count or maximize tags.

## Process friction observed in this adaptation

### File-package discoverability

The package was usable earlier in the conversation and its checksums were verified, but later semantic file search could not rediscover it by content. The reusable process should not assume a future turn can re-search an uploaded archive reliably. Important extracted kit contracts should therefore be summarized into the live campaign state early.

### Connector capability discovery

Tool discovery is cheap enough that it should happen before declaring an execution capability gap. The first pass incorrectly assumed low-level archive construction would need an external environment; later discovery found native blob/tree/multi-parent commit/ref primitives.

### Branch inventory drift

The act of preparing cleanup increased the branch count from the original 85 to 86 and then 87. This is expected, but the workflow should surface this as normal state evolution rather than a discrepancy/error.

## Questions intentionally left open until real execution evidence exists

1. Should the aggregate archive anchor contain every distinct old branch tip or only divergent/material tips?
2. Should the archive ref be a branch, annotated tag, or both?
3. Is one archive anchor enough for very large repositories, or should anchors be partitioned by era/project stage?
4. Should the archive tree contain only a recovery manifest or also compact provenance summaries?
5. Is a permanent CI deleted-push guard worth keeping in every repo, or only repositories with broad push CI and large prune campaigns?
6. Which destructive executor gives the best balance of auditability and low Owner attention in practice?
7. How large should deletion batches be after executor qualification?
8. Should PR-head preservation affect semantic disposition or remain only an auxiliary witness?

Do not resolve these by aesthetics. Use the Character Controller Gate 1/2/3 evidence and post-cleanup experience.

## Required post-campaign retrospective

After the repository is cleaned and verified, revisit this ledger and classify each item as:

- **KEEP** — validated reusable principle;
- **MODIFY** — useful but needs changed wording/design;
- **DROP** — added complexity without enough value;
- **NEW** — lesson discovered only during real execution/recovery/post-audit.

Then create the next kit version from evidence, not by simply copying the Character Controller adaptation.
