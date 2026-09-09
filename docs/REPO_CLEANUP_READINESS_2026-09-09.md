# Repository cleanup readiness audit — 2026-09-09

Status: **PREPARATION GO / DESTRUCTIVE CLEANUP NO-GO UNTIL EXPLICIT GATES PASS**

This audit was performed after the E19 stage closure specifically to falsify the assumption that the repository was ready for branch cleanup. No branch was deleted or moved during the audit.

## 1. Canonical anchor

Grounded canonical state at audit start:

- repository: `Jozzpoly/Box3d-Character-Controler`;
- default branch: `main`;
- exact `main`: `cdf20ced5e23f7115226c946e0b0c70460491fbe`;
- E19 stage closure: merged PR #49;
- exact-main workflow run: `34396668404` — full verify/build/Pages deployment success;
- open PRs: `0` at audit time;
- open issues: `0` at audit time;
- canonical workflow directory contains only `deploy-pages.yml`;
- tags: `0`;
- releases: `0`;
- repository rulesets: `0`;
- `main` is not protected by a GitHub branch-protection rule.

The repository is therefore canonically clean enough to begin a maintenance preparation sequence. It is **not** protected strongly enough to let a destructive branch-cleanup script rely on GitHub configuration for safety.

## 2. Complete branch inventory

GitHub branch enumeration was paginated to exhaustion.

- first page: `85` refs;
- second page: `0` refs;
- exact branch count at audit time: **85**.

The inventory is complete, not a sample.

Observed namespaces include:

- `diagnostic/`;
- `docs/`;
- `experiment/`;
- `foundation/`;
- `maintenance/`;
- `mobile/`;
- `playground/`;
- `publication/`;
- `research/`;
- `stabilize/`;
- root `tmp`, `tmp-invalid`, `tmp-noop`;
- `main`.

A cleanup workflow must discover refs dynamically rather than assume only the modern `experiment/publication/maintenance` taxonomy exists.

## 3. Central falsification result

The repository is **not** a simple forest of branches whose useful work has all been merged into `main`.

Two materially different historical classes exist:

### A. Ancestor / duplicate refs

Many old branches have no branch-only commits. Their tip is already reachable through `main`, or several branch names point to exactly the same commit.

Representative examples:

- `experiment/e2-1-terrain-support-localization` — ancestor of `main`;
- `experiment/e2-2-reciprocity-decontamination` — ancestor;
- `diagnostic/e13-2b-log-probe` — ancestor;
- `experiment/e14-owner-reaction-surface` — ancestor;
- `experiment/e17-intent-first-manipulator` — ancestor;
- `research/e19-hand-grip-reframe` — ancestor;
- `maintenance/e19-stage-closure-2026-09-09` — ancestor;
- `mobile/pages-touch-donor` — ancestor;
- `playground/playground-v2` — ancestor;
- `stabilize/a-double-prime-donor-candidate` — ancestor;
- `tmp` and `tmp-noop` — ancestors despite their names.

Obvious duplicate-tip families also exist. For example four E16 radial publication names point to the same SHA, and three E16 task-space publication names point to another single SHA.

These refs are strong future deletion candidates because removing their branch names does not make their commits unreachable from `main`.

### B. Diverged refs containing branch-only history

Other branches contain commits that are not ancestors of `main`.

This is not an edge case. It occurs in foundation, stabilization, maintenance and major research lines.

Representative measured branch-only commit counts:

| Branch | Branch-only commits | Preliminary interpretation |
| --- | ---: | --- |
| `experiment/e14-world-transfer-mass-800` | 1 | temporary CI-only delta; likely superseded |
| `maintenance/dependency-lock-probe` | 5 | probe later superseded by merged reproducible-dependencies work |
| `tmp-invalid` | 3 | non-empty runtime/smoke changes despite disposable-looking name |
| `foundation/donor-contract-v0` | 12 | meaningful Donor-contract evolution; preservation review required |
| `foundation/traversal-polish-021` | 9 | historical traversal branch; preservation review required |
| `stabilize/e2-3e-current-donor-v1` | 11 | Donor stabilization lineage; preservation review required |
| `maintenance/repo-hygiene-2026-09-02` | 3 | earlier docs/smoke-spine maintenance, now apparently superseded |
| `experiment/e16-active-contact-organ` | 35 | deep E16 evidence campaign; preservation-class |
| `experiment/e16-body-owned-feasibility` | 5 | unmerged E16 feasibility history; review required |
| `experiment/e17-one-point-depth` | 18 | E17-depth research history; review required |
| `experiment/e18-manipulation-v0` | 28 | E18 manipulation research history; review required |
| `experiment/e18-p3-coupled-two-point` | 49 | deep P3 mechanics campaign; preservation-class |
| `experiment/e18-p3-owner-interaction` | 56 | deep Owner-facing P3 interaction history; preservation-class |

The branch-only E16 `active-contact-organ` history includes crucibles/probes such as contact manifold/identity, grab pull, transport causal tests and API probes that were not linearly merged into `main`. This is direct evidence that canonical publication intentionally distilled results while leaving useful research apparatus in branch history.

Therefore:

> **Deleting every old research branch would erase the only durable named refs to some material research history.**

## 4. Branch names are not evidence classifications

The audit directly falsified name-based deletion heuristics.

Examples:

- `tmp` is safely reachable from `main`;
- `tmp-invalid` has three unique commits and non-trivial runtime/smoke differences;
- a branch named `publication/...` can be a duplicate ref;
- a branch named `foundation/...` can either be a clean ancestor or contain a dozen unique commits;
- a branch named `maintenance/...` may be a fully merged result or a divergent probe later superseded by another maintenance line.

Hard rule for the cleanup workflow:

> **Never classify deletion safety from branch name, age or merge-looking semantics alone. Determine graph relation first; inspect branch-only history for every divergent ref.**

## 5. Provenance model required before deletion

The repository currently has **no tags and no releases**.

This matters because a branch may be the only durable named ref keeping an otherwise unmerged research campaign easy to recover. A SHA written into a Markdown document is useful provenance, but it is not an equivalent long-lived retention mechanism if the commit later becomes unreachable by normal refs and GitHub eventually garbage-collects unreachable objects.

For every divergent branch, the future workflow must resolve one of these outcomes before deletion:

1. **KEEP** — branch remains because it is itself an intentional historical archive/current working ref;
2. **ARCHIVE** — create a durable archival ref/tag (or another explicit retention mechanism) to the exact required commit, verify it, then allow deletion of the noisy branch name;
3. **DELETE-SUPERSEDED** — branch-only commits are proven to be temporary/probe work whose durable result is already present elsewhere and whose loss is acceptable;
4. **REVIEW** — evidence is insufficient; do nothing.

Default for ambiguity is **REVIEW / KEEP**, never delete.

The goal is not minimum branch count. The goal is a small live namespace plus explicit preservation of material research history.

## 6. Main/default-branch safety requirement

At audit time:

- GitHub reports no repository rulesets;
- `main` is not protected by branch-protection status checks.

Therefore the cleanup executor must implement its own fail-closed guards.

Minimum destructive-phase guards:

- discover the repository default branch dynamically;
- hard refuse to delete or move that ref;
- hard refuse `main` explicitly as a second guard for this repository;
- capture expected `main` SHA before planning;
- re-fetch `main` immediately before execution and abort if it moved unexpectedly;
- never use force-update against canonical refs as part of branch cleanup;
- operate only from an explicit reviewed manifest;
- require post-operation re-enumeration and exact survival checks for protected/archive refs.

## 7. Executor gap

The GitHub connector available during this audit can enumerate, compare, create and move branches/refs, but exposes **no direct delete-branch/delete-ref action**.

This is not a blocker for preparation. It is a blocker for performing the destructive phase in this exact tool surface.

Before branch deletion begins, the imported `jv_web` workflow must either:

- provide/identify a safe execution path that can delete refs (for example an audited GitHub API/Action, Codex/local Git workflow, or another authorized executor), or
- explicitly separate Browser GPT planning/verification from deletion performed in the suitable environment.

Do not improvise destructive workarounds merely to keep execution inside one interface.

## 8. Active-work collision audit

At readiness audit time:

- no open PRs;
- no open issues;
- E19 is closed/frozen;
- no endorsed E20 or active manipulation implementation branch;
- only the canonical deploy/verify workflow remains active on `main`.

This substantially lowers the risk that cleanup will delete or rename a branch another live task expects.

The future workflow must nevertheless repeat this check immediately before destructive execution because branch/PR state can change after this checkpoint.

## 9. Prior hygiene / maintenance history

`maintenance/repo-hygiene-2026-09-02` itself is divergent by three commits. Its branch-only state contains an earlier documentation map and initial smoke-suite/package wiring that have since been materially superseded by the current canonical spine.

This is useful process evidence:

- the repository has already attempted hygiene once;
- cleanup work itself can leave stale maintenance refs;
- the next reusable workflow should include **self-cleanup / closure of its own temporary branch** after merge/execution when safe.

Similarly, `maintenance/dependency-lock-probe` shows how a divergent experimental maintenance branch can later be superseded by a properly merged canonical result. Divergence alone means “review”, not automatically “archive forever”.

## 10. Readiness verdict

### Preparation sequence — GO

The repository is ready to begin the structured preparation/classification sequence because:

- canonical `main` is freshly grounded and green;
- E19 has a truthful closure boundary;
- docs and workflow spine are current;
- there are no open PRs/issues competing for branch ownership;
- active workflow state is simple;
- the full branch namespace is known (`85` refs);
- the audit has identified the major failure modes of naive cleanup;
- there is a clear distinction between ancestor/duplicate refs and branch-only research history.

### Immediate destructive cleanup — NO-GO

Do not delete branches yet.

Destructive cleanup becomes GO only after all of these gates pass:

1. receive and review the `jv_web` cleanup workflow/package;
2. extract lessons/failures from that previous run rather than copying it mechanically;
3. resolve the actual delete-ref executor;
4. enumerate the current branch set again and freeze expected `main` SHA;
5. graph-classify **every** non-main ref as ancestor/equal/diverged;
6. inspect branch-only commit/file summaries for every diverged ref;
7. produce a complete explicit manifest with `KEEP / ARCHIVE / DELETE / REVIEW` and reasons;
8. create and verify durable archival refs for every material unique-history branch chosen for namespace deletion;
9. verify no open PR/issue/workflow/current project dependency points at a deletion target;
10. dry-run the exact manifest with zero mutations;
11. independently re-check that `main`, archive refs and required live refs cannot be selected;
12. execute in bounded batches with verification between batches;
13. re-enumerate refs after execution and verify canonical `main` + CI/Pages are unchanged/healthy;
14. close the cleanup branch/process itself and record a retrospective to improve the reusable workflow.

## 11. Recommended high-level sequence once the package arrives

1. **Workflow archaeology** — understand what `jv_web` did, what worked, what was risky and what should change here.
2. **Inventory regeneration** — do not trust the 85-count snapshot blindly; regenerate live.
3. **Mechanical graph classification** — cheap automated separation of ancestor/equal vs diverged.
4. **Diverged evidence review** — expensive attention only where unique commits exist.
5. **Archival design** — decide whether a small `archive/...` branch namespace, annotated tags, or another durable ref scheme best fits this repository.
6. **Manifest freeze** — exact target refs + exact SHAs + reason + preservation proof.
7. **Dry run / adversarial review** — attempt to falsify every deletion decision.
8. **Bounded destructive batches** — easiest ancestor/duplicate refs first; preservation-sensitive refs last or retained.
9. **Post-cleanup verification** — branch count, retained refs, main SHA, PR/issues, CI/build/Pages.
10. **Workflow retrospective** — improve the reusable cleanup procedure for the next repository.

## 12. Stop boundary

This readiness audit authorizes **preparation**, not deletion.

Until the `jv_web` workflow package has been reviewed and a complete preservation-aware manifest exists, do not remove any of the 85 branch refs.

The strongest current conclusion is:

> **We are genuinely ready to start preparing a cleanup, precisely because the audit proved that we are not yet safe to perform a naive cleanup.**
