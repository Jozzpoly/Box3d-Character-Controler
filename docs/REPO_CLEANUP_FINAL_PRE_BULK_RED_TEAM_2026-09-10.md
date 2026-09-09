# Repository cleanup — final adversarial pre-bulk audit

Date: **2026-09-10**  
Status: **BRANCH SET DEFENSIBLE / BULK DELETION STILL NO-GO UNTIL ARCHIVE REDUNDANCY REPAIR**

This is the final deep review of the historical branch deletion set after the one-ref `tmp-noop` canary succeeded. It deliberately challenges the previous cleanup decisions rather than merely re-running the earlier dry-run.

## Executive verdict

The final review found **no individual historical branch that currently requires KEEP as a live branch**.

The remaining frozen historical set consists of:

- **51 live branches whose tips are ancestors of canonical `main`**;
- **21 live branches whose exact tips have GitHub `refs/pull/*/head` witnesses in addition to aggregate archive coverage**;
- **13 live divergent/research-only branches whose exact branch-only histories are materially valuable, but whose live branch names have no current operational purpose and whose exact tips are covered by the aggregate archive**;
- **1 frozen branch (`tmp-noop`) already absent by the successful canary**.

Thus all **85 remaining live historical branches remain defensible deletion candidates** once the global preservation repair below is complete.

However, the red-team intentionally refuses to promote this to bulk-delete authorization yet.

The current bulk decision is:

> **REPAIR_REQUIRED_BEFORE_BULK**

The blocker is not one suspicious branch. It is the preservation topology itself: the pre-prune archive currently depends on one mutable branch ref and has no independent tag witness.

## Frozen authority

Canonical source before the prune campaign:

- `refs/heads/main`
- `b0eac372035ca12a63f808eb3201edd3605a163c`

Pre-prune archive:

- `refs/heads/archive/pre-cleanup-2026-09-09-dca388f4`
- `fd5cae330fb80280617ce7b241347f1edafdb875`
- historical archive freeze SHA-256: `dca388f456480489492ea2069c2ce8ecd5930d3ab41028cda88f25fe72cc9584`
- frozen historical mappings: `86`
- frozen distinct historical tips: `75`
- archive anchor parents: `76` (`main` + 75 distinct historical tips)

The archive recovery manifest is `archive/recovery-manifest.json` on the exact archive commit.

The one-ref canary removed only:

- `refs/heads/tmp-noop`
- expected SHA `2f341aed904ecdccf61b1264a77f849aeaa236fd`

Canary postflight established `85 ready / 1 absent / 0 blockers / 75 archive tips reachable`.

## What the final red-team tested beyond the previous preflight

The previous delete preflight established exact ref-to-SHA matching and archive reachability. This run additionally tested whether deletion of the *names* would lose operational or human meaning.

For every frozen historical mapping it inspected:

- current live state: `EXACT`, `ABSENT`, or `MOVED`;
- canonical ancestry and reverse ancestry;
- exact PR-head witnesses;
- branch-only commit count;
- `git cherry` patch-equivalence signal;
- exact tip tree and whether that tree occurs anywhere in canonical history;
- changed-file categories;
- recent branch-only commit subjects;
- exact branch/ref-name mentions in canonical source/docs;
- exact tip-SHA mentions in canonical source/docs;
- canonical workflow references to branch names;
- branch-name GitHub URLs that would become broken links;
- archive reachability.

It then added read-only GitHub platform probes for:

- current branches/protection flags;
- open pull requests;
- open issues;
- releases;
- Actions workflow registry;
- repository rulesets;
- deployments;
- environments;
- GitHub Pages source;
- Pages builds;
- webhooks where permission allowed;
- branch-protection endpoints where permission allowed.

## Per-ref result

Machine result on the exact reviewed state:

- current delete candidates: **85**;
- expected absent canary: **1**;
- per-ref hard blockers: **0**;
- branch-specific repair-before-delete refs: **0**;
- semantic-review refs: **52**.

The `52` semantic-review entries are not 52 reasons to retain branches. They are cases where history deserves interpretation rather than a blind name-based delete.

### 1. Ancestor-of-canonical cases

Across the frozen 86 mappings, 52 are `ANCESTOR_OF_CANONICAL`, including the now-absent `tmp-noop`; therefore **51 live ancestor branches remain**.

These branch tips are already reachable through `main`. Some are mentioned by historical name or exact SHA in canonical documentation. Those mentions are provenance labels, not consumers of a live branch ref.

No canonical workflow depends on one of these historical branch names.

### 2. Exact PR-head preserved cases

**21 live branches** have exact GitHub `refs/pull/<n>/head` witnesses.

Their commit identities may remain patch-unique under `git cherry` because many historical promotions used nonlinear/squash/merge paths, but the review found that their exact tip trees are also represented in canonical history. They additionally remain covered by the aggregate archive.

For these branches preservation is therefore intentionally redundant:

> canonical state/tree + exact PR-head witness + aggregate archive

They are strong deletion candidates once global archive redundancy is repaired.

### 3. Divergent/research-only cases

The **13 live `DIVERGENT_UNIQUE` historical branches** deserve the deepest scrutiny because branch deletion would otherwise remove the only ordinary `refs/heads/*` pointer to their branch-only histories.

They are:

- `experiment/e14-owner-pin-1180-065-3-36-1000` — 3 branch-only commits;
- `experiment/e14-world-transfer-mass-800` — 1;
- `experiment/e16-active-contact-organ` — 35;
- `experiment/e16-body-owned-feasibility` — 5;
- `experiment/e17-one-point-depth` — 18;
- `experiment/e18-manipulation-v0` — 28;
- `experiment/e18-p3-coupled-two-point` — 49;
- `experiment/e18-p3-owner-interaction` — 56;
- `experiment/e8-parallel-axial-support-decomposition-temp` — 26;
- `foundation/traversal-polish-021` — 9;
- `maintenance/dependency-lock-probe` — 5;
- `research/e18-manipulation-landscape` — 1;
- `tmp-invalid` — 3.

Several are highly valuable research archives despite disposable-looking names. They include deep E8, E16, E17 and E18/P3 crucibles, diagnostics and Owner-facing apparatus.

The conclusion is **not** that their content is disposable. The conclusion is that their content and their live branch namespace are different things.

Every exact tip is covered by the frozen aggregate archive. None is tied to an open PR or issue. None is an observed Pages/deployment consumer. None has a canonical workflow dependency on its branch name. Therefore their exact history should be retained through the archive while their live `refs/heads/*` names can be removed after the archive redundancy repair.

## Semantic/navigational fallout

The audit found:

- **0 canonical GitHub branch URLs** that would become broken links;
- **0 canonical workflow dependencies** on historical branch names;
- multiple historical text mentions such as `Branch: ...` or exact SHA references.

Most historical branch-name mentions remain valid as provenance labels if the final archive catalog preserves `original branch name → exact SHA` and canonical documentation explains how archived history is recovered.

One important wording class must be repaired after prune. Example from E16:

> `Research provenance is preserved on branch experiment/e16-active-contact-organ...`

After branch deletion that statement would become semantically false even though the commits survive in the archive.

Do **not** move `main` now merely to fix wording: the exact canonical SHA is part of the frozen deletion authority. Instead make canonical history-discoverability repairs a mandatory post-bulk closure gate before the helper branch is removed.

## New global preservation finding — one archive branch is not enough

The current aggregate archive is mechanically strong:

- it contains a complete recovery manifest;
- all 75 distinct historical tips are reachable from its exact anchor;
- local destructive/GC qualification showed the multi-parent preservation mechanism survives deletion of original refs;
- the real remote archive was independently re-read and verified.

But it currently has **only one ordinary mutable branch ref** and **zero tag witnesses**.

The final red-team therefore rejects immediate bulk deletion until an independent durable ref points at the exact frozen archive commit.

Required repair:

> create and verify an **annotated pre-prune archive tag** whose peeled target is exactly `fd5cae330fb80280617ce7b241347f1edafdb875` and whose annotation records the freeze hash, manifest path and purpose.

The archive branch itself must **not move before bulk**. Bulk deletion remains bound to its exact SHA and freeze.

This redundancy is protection against accidental movement/deletion of the archive branch within the repository. It is not an off-site disaster backup. A separate backup/mirror policy would be a different concern.

## Archive lifecycle correction

The current archive README still says:

> `This qualification object is local-only and must not be confused with a final pushed archive ref.`

That became false once the object was promoted to the real remote archive branch.

Changing the existing archive commit is impossible, and moving the archive branch before prune would unnecessarily alter the frozen authority. Therefore use a two-phase archive lifecycle:

### Phase A — immutable-for-prune pre-cleanup anchor

Keep exactly:

- archive branch at `fd5cae330fb80280617ce7b241347f1edafdb875`;
- new annotated tag witness at that same commit;
- frozen recovery manifest unchanged.

### Phase B — post-prune archive closure/catalog

After all historical deletion batches and full postflight:

- create a new archive closure commit descending from the original anchor;
- preserve the final cleanup helper tip (the helper is intentionally excluded from the pre-cleanup freeze);
- record final canonical closure SHA and CI/Pages evidence;
- replace the stale human-facing README with correct recovery instructions;
- add a readable archive catalog: original branch name, exact SHA, proof class, useful summary/date;
- record canary/bulk run IDs and artifact digests;
- record platform-cleanup results;
- only then advance the archive branch to that closure commit;
- retain the annotated pre-prune tag as the immutable witness to the original frozen anchor;
- optionally create a final closure tag if evidence justifies it.

This separates immutable deletion authority from maintainable human-facing archive UX.

## GitHub platform state — refs are not the whole repository

The expanded platform probe found:

- current branch count at audit: **88** (`main`, archive, helper and 85 historical candidates; the canary is absent);
- branch-list `protected` flags: **none**;
- open PRs: **0**;
- open issues: **0**;
- releases: **0**;
- rulesets: **0**;
- deployments observed: **68**, all with ref `main`;
- environments: only `github-pages`;
- GitHub Pages source: branch `main`, path `/`, build type `workflow`;
- Actions workflow registry entries in state `active`: **10**.

The Actions registry is a separate cleanup surface. It includes historical stage workflows and even one-shot cleanup workflows whose source files are no longer present at the current helper tip. Therefore:

> **Git branch cleanup ≠ GitHub Actions registry cleanup.**

Deleting historical branch refs may remove source files, but a post-prune platform audit must still classify Actions registry entries and, where appropriate, disable stale workflow IDs without deleting historical workflow runs/evidence.

Observed historical example: `maintenance/dependency-lock-probe` contains a branch-specific `workflow_dispatch` workflow with `contents: write`, even though its useful lockfile result was later superseded by canonical work. Removing the branch is appropriate, but the registry must not be assumed clean merely because the source ref disappears.

## Explicit observability limits

The read-only workflow could observe repository metadata, branches, PRs, issues, releases, workflows, rulesets, deployments, environments and Pages.

The following endpoints returned **403** under the available token and remain explicitly unobservable from this path:

- repository webhooks;
- `main` branch-protection detail endpoint;
- archive branch-protection detail endpoint.

The top-level branch list still reports no protected branches, and rulesets are empty, but this does not justify pretending the 403 surfaces were fully audited.

External bookmarks, bots and integrations that depend on a historical branch name also cannot be disproved purely from the Git graph.

This residual uncertainty is accepted only as an explicit observability boundary, not silently converted into PASS.

## Final branch-set decision

After this final audit:

- **no historical branch is newly promoted to KEEP**;
- **no current branch candidate is MOVED**;
- **no historical deployment/Pages dependency was found**;
- **no canonical workflow dependency on a historical branch name was found**;
- **no canonical branch URL repair is needed before deletion**;
- **all 13 divergent research histories remain exact archive content and should not be discarded conceptually**.

Therefore the **85-branch deletion set remains valid in principle**.

But the next destructive step is blocked until the exact pre-prune archive has a verified independent annotated-tag witness.

After that repair, a fresh final preflight should again require:

- canonical exact SHA unchanged;
- archive branch exact SHA unchanged;
- annotated archive tag peeled target exact;
- 85 current candidate refs still equal frozen expected SHAs;
- 1 expected absent canary;
- 0 blockers;
- all 75 distinct historical tips reachable from the exact archive anchor;
- no newly created unknown ref included in the delete manifest.

Only then is it reasonable to ask the Owner for **explicit bulk deletion authorization**.

## Mandatory post-bulk closure before removing helper

Bulk deletion is not the end of the campaign. Before deleting the cleanup helper itself:

1. verify every frozen historical ref is absent;
2. verify `main`, pre-prune tag and archive ancestry;
3. run canonical smoke/build/Pages checks as appropriate;
4. run GitHub platform audit again;
5. classify/disable stale Actions registry entries without erasing historical runs;
6. create the final archive catalog/closure commit;
7. update canonical docs with archive/recovery instructions and repair stale `provenance is preserved on branch ...` wording;
8. verify recovery of representative branches from the catalog/archive;
9. preserve the final helper tip in archive closure;
10. remove temporary cleanup workflows/tooling from the live project unless they have earned reusable permanent status;
11. only then delete the helper branch;
12. perform a final branch/platform inventory and project readiness check.

## Evidence

Final semantic red-team workflow:

- run `34413790211` — success;
- artifact `10128256845`;
- artifact SHA-256 `4e87b331c8a4a6926b6144873e69907a271082ea79d16a0865c2ddccb4b7623b`.

Expanded GitHub-platform red-team:

- helper head `8a57096a45d0d9e3b2e494520ceb9356d10568a3`;
- run `34414512290` — success;
- artifact `10128523210`;
- artifact SHA-256 `58abab6127116a16dbcf1eaa0136262217a20c9baf11aaa4fa5d3949e5ce9f2b`.

The final red-team was read-only with respect to GitHub refs. No historical branches were removed during this audit.
