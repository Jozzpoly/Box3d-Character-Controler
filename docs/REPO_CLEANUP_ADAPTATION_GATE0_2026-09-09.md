# Repository cleanup adaptation — Gate 0 — 2026-09-09

Status: **GATE 0 COMPLETE ENOUGH FOR GATE 1 PREPARATION / NO DELETION AUTHORIZED**

This document adapts the reusable repository-cleanup kit to `Jozzpoly/Box3d-Character-Controler`. It extends the prior falsification-first readiness audit and records the project-specific protocol that should govern any later branch pruning.

It is deliberately conservative. It authorizes preparation, inventory freezing, archival qualification and executor testing. It does **not** authorize deleting or moving historical refs.

## A. Canonical truth and execution boundary

Current canonical implementation truth at Gate-0 continuation start:

- repository: `Jozzpoly/Box3d-Character-Controler`;
- default/canonical branch: `main`;
- exact canonical SHA: `230d9d0cf43953ca7774b664d1cfcc9969d8f0d9`;
- this SHA is the merge of PR #50, which incorporated the completed cleanup-readiness audit;
- `main` is currently unprotected by GitHub branch-protection/ruleset policy, so destructive safety cannot be delegated to repository settings;
- canonical workflow: `.github/workflows/deploy-pages.yml`;
- workflow trigger is broad `push` plus `workflow_dispatch`;
- Pages deployment itself remains conditional on `refs/heads/main`.

The cleanup operation must never treat a stored SHA as permanently authoritative. Immediately before any mutation, re-fetch default branch identity and exact canonical SHA. Any unexpected canonical movement invalidates the frozen destructive plan and forces re-review.

## B. Kit adaptation mode

The reusable kit's generic model includes candidate preparation/promotion before pruning. That is not the dominant problem here.

For this repository the appropriate mode is:

> **canonical-already-promoted / archival-prune-only**

`main` is already the accepted product/research spine. The cleanup campaign should not create a competing product candidate or reinterpret old branches as promotion candidates merely because the generic workflow supports that shape.

The campaign exists to reduce noisy live ref namespace while preserving recoverability and research provenance.

## C. Live namespace and freshness rule

The original readiness audit enumerated 85 branches. The package-review phase observed 86 after the readiness branch itself existed. After creating the current continuation branch, live enumeration returns **87 branches**.

This drift is expected and useful evidence: branch counts in documents are snapshots, not execution authority.

Hard rule:

> **The final manifest must be generated from a fresh complete branch enumeration immediately before Gate 1 freeze.**

The continuation branch itself (`maintenance/repo-cleanup-adaptation-2026-09-09`) must also receive an explicit terminal disposition before final cleanup closure; maintenance work must not become permanent unexplained clutter.

## D. Graph/provenance proof classes

Branch names, age and apparent merge semantics are non-authoritative. Each ref should be assigned one mechanical proof class before any disposition is considered.

Recommended proof classes:

1. `CANONICAL` — current default/canonical ref; immutable by cleanup policy.
2. `EQUAL_CANONICAL` — tip equals canonical SHA.
3. `ANCESTOR_OF_CANONICAL` — exact tip is reachable from canonical history.
4. `PR_HEAD_PRESERVED` — exact tip is represented by an existing `refs/pull/<n>/head` recovery witness.
5. `DIVERGENT_UNIQUE` — exact tip is not reachable from canonical and is not represented by a matching PR-head ref.
6. `ARCHIVE_REACHABLE` — exact tip is verified reachable from the qualified archive anchor.
7. `SUPERSEDED_REVIEWED` — unique branch-only history was explicitly judged temporary/superseded and is acceptable to lose as a live branch name after archive coverage exists.
8. `REVIEW` — insufficient evidence; fail closed.

A branch can have more than one useful witness, but destructive eligibility must use the strongest explicit proof and preserve the exact expected SHA.

## E. Cheap-first classification strategy

The repository is large enough that running a heavy compare/diff review for every ref wastes attention.

Preferred classification pipeline:

1. enumerate all live branch names and exact tip SHAs;
2. retrieve all available `refs/pull/*/head` refs and exact SHAs;
3. deduplicate exact tip SHAs while retaining all branch-name aliases;
4. cheaply test whether each distinct tip is already reachable from canonical history;
5. mark exact matches to PR-head refs;
6. reserve expensive compare/branch-only review for the residual set:
   `not canonical-reachable ∩ not PR-head-preserved`;
7. inspect commit/file summaries for that residual set before assigning semantic disposition.

This preserves the readiness-audit principle that every divergent ref is reviewed while avoiding equal-cost archaeology on already-safe aliases/ancestors.

## F. Preservation architecture

The prior readiness audit correctly rejected blanket deletion because several E16–E18, foundation and stabilization branches contain branch-only history.

The preferred current preservation candidate is **not** a tag-per-branch scheme.

Target shape:

- `main` — canonical current truth;
- one explicit archive ref, provisionally named `archive/pre-cleanup-2026-09-09` (actual date/name frozen at execution);
- archive tree containing a machine-readable and human-readable recovery manifest mapping every pre-cleanup branch name to its exact tip SHA and disposition/proof;
- one synthetic archive-anchor commit whose parent set makes the required historical tip SHAs reachable through the archive ref.

The anchor should use a deduplicated parent-SHA set. A simple conservative design is:

- canonical SHA as one parent;
- every distinct pre-cleanup branch-tip SHA selected for archival retention as additional parents;
- archive tree based on canonical tree plus recovery manifest/evidence files.

A local throwaway Git test has already shown the mechanism works with 100 parents and remains reachable after source-branch deletion plus aggressive GC. That is **mechanism evidence only**. The real repository anchor must still pass GitHub-side creation, exact-parent verification and post-creation reachability checks before any deletion is authorized.

The archive ref should be treated as protected by cleanup policy even if GitHub does not enforce branch protection.

## G. Why PR-head refs are useful but insufficient as sole archive policy

GitHub currently exposes `refs/pull/1..50/head` and several nonlinear/squash-era branch tips exactly match those refs. This is valuable recovery evidence and prevents needless branch-by-branch archaeology.

However PR-head refs are platform-managed/read-only implementation details, not the sole durability contract for material research history.

Therefore:

- use exact PR-head matches as a classification/recovery witness;
- do not rely on PR-head refs alone for the campaign's complete preservation guarantee;
- material pre-cleanup history should be covered by the explicit archive anchor when the noisy source branch is to be removed.

This avoids both extremes: pretending squash-merged exact heads disappeared, and pretending hidden PR refs are equivalent to an Owner-controlled archive contract.

## H. CI consumer side effect discovered during adaptation

Canonical workflow currently listens to every `push`.

GitHub branch deletion is represented as a push event. Therefore a large prune can generate a large number of useless verify/build runs even though only refs are being removed.

This is a real cleanup consumer side effect and must be addressed before large-scale deletion.

Preferred permanent correction candidate:

- preserve normal `push` validation for real branch updates;
- skip the verification job when the push event represents ref deletion (`github.event.deleted == true`);
- retain `workflow_dispatch` behavior;
- retain Pages deployment only for canonical `main`.

This should be implemented only as a separately reviewed maintenance change and qualified before destructive cleanup. It must not become a temporary broad disabling of CI.

## I. Frozen manifest contract

Before destructive execution, produce a complete manifest with one record per pre-cleanup branch ref.

Minimum fields:

- `ref` — full `refs/heads/...` name;
- `expectedSha` — exact tip captured at freeze;
- `proofClass`;
- `disposition` — `KEEP`, `DELETE`, or `REVIEW` (archive coverage is expressed as proof, not a reason to mutate automatically);
- `reason` — concise human-readable decision;
- `archiveCovered` — boolean;
- `archiveAnchorSha` — exact anchor when available;
- `prHeadRef` / `prHeadSha` when applicable;
- `canonicalShaAtFreeze`;
- optional evidence pointers (PR, docs, compare summary).

Schema-level checks must ensure semantic uniqueness of refs, not merely JSON item uniqueness.

The destructive executor must consume only this frozen manifest. It must never discover new deletion candidates on the fly.

## J. Destructive executor contract

Current Browser GitHub tool surface can read, create and move refs and can create blob/tree/multi-parent commits, but exposes no branch/ref deletion primitive and no workflow-dispatch primitive.

Therefore Gate 0 separates planning from the tiny destructive executor.

Preferred executor requirements regardless of environment:

1. explicit repository identity allowlist;
2. explicit default/canonical branch hard deny;
3. explicit `main` hard deny as a second repository-specific guard;
4. explicit archive-prefix hard deny;
5. only refs with manifest disposition `DELETE` are eligible;
6. immediately fetch each target ref before deletion;
7. require current SHA == manifest `expectedSha` (CAS/fail-closed semantics);
8. if target disappeared or moved, stop/skip safely; never retarget it;
9. refuse unknown refs not present in the manifest;
10. refuse duplicate semantic refs in the manifest;
11. re-check canonical SHA before first mutation and between bounded batches;
12. produce append-only result log containing attempted ref, expected SHA, observed SHA and outcome;
13. support interruption/resume without changing already-surviving refs incorrectly.

Candidate execution environments:

- a minimal audited GitHub Actions `workflow_dispatch` job with `contents: write` and frozen manifest;
- an equally small local/Codex/Work executor with authenticated GitHub API or Git access.

Environment selection is secondary to contract compliance. Do not weaken the executor because one UI is more convenient.

## K. Executor tooling-quality gate

Before the executor may touch the real repository, validate it against a disposable repository or isolated test namespace.

Required adversarial cases include at least:

- canonical ref appears in deletion manifest -> hard refusal;
- archive ref appears in deletion manifest -> hard refusal;
- unknown ref -> refusal;
- duplicate semantic ref entries -> refusal;
- expected SHA stale because branch moved -> refusal;
- branch already deleted -> safe idempotent handling;
- wrong repository identity -> refusal;
- partial interruption after some successful deletions -> safe restart;
- one failed deletion in a batch -> clear halt/continue policy without broadening scope;
- canonical SHA moves after manifest freeze -> global abort before further mutation;
- unexpected new branch appears after freeze -> it survives because it is absent from manifest.

Passing happy-path deletion is not enough.

## L. Gate sequence for this repository

### Gate 0 — adaptation and protocol design

Status after this document: **PASS for moving to Gate 1 preparation; destructive phase remains NO-GO.**

Gate 0 has established:

- project-specific archival-prune mode;
- live namespace/freshness rule;
- proof classes;
- cheap-first graph classification strategy;
- archive-anchor preservation candidate;
- CI deletion-event side effect;
- frozen manifest contract;
- destructive executor contract and capability boundary;
- adversarial tooling-quality gate.

### Gate 1 — preservation + manifest preparation

Required next work:

1. optionally qualify the CI deleted-push guard as an isolated maintenance change;
2. regenerate complete live branch + PR-head inventories;
3. compute exact classification for every ref;
4. review only residual divergent/unpreserved tips deeply;
5. build the complete pre-cleanup manifest;
6. create the archive manifest/tree/anchor/ref through low-level GitHub primitives;
7. verify exact archive parents/recoverability and survival of canonical state;
8. freeze candidate deletion manifest;
9. dry-run the executor against the frozen manifest with **zero deletion**;
10. independently re-audit `main`, archive ref and all KEEP/REVIEW refs.

Only after Gate 1 and the tooling-quality gate pass should an explicit destructive Gate 2 be considered.

### Gate 2 — bounded ref deletion

Not authorized by this document.

If later authorized, execute small batches from the frozen manifest with canonical/archive checks between batches.

### Gate 3 — post-cleanup qualification

After deletion:

- complete re-enumeration;
- exact canonical SHA verification;
- archive ref and manifest recovery verification;
- CI/build/Pages health;
- open PR/issue sanity check;
- cleanup of the cleanup's own temporary maintenance refs where safe;
- final repository-hygiene closure note.

### Gate 4 — kit retrospective

The reusable cleanup kit must then be reviewed against the actual campaign. Preserve failures, friction, unnecessary work and successful adaptations before preparing a next version.

## Stop boundary

This document intentionally stops before archive creation, manifest freeze, CI mutation or branch deletion.

The next natural unit of work is **Gate 1 preparation**, beginning with exact live classification and an isolated decision on the deleted-push CI guard.
