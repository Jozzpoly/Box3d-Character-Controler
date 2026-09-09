# Repository cleanup kit feedback — final red-team addendum

Date: **2026-09-10**  
Status: **LIVE INPUT FOR POST-CAMPAIGN V3 RETROSPECTIVE — NOT FINAL GENERIC DESIGN**

This addendum captures lessons that became visible only after the Character Controller cleanup had a real frozen archive, a qualified delete executor, a successful one-ref production canary and a final semantic/platform red-team.

Read together with:

- `REPO_CLEANUP_KIT_FEEDBACK_LEDGER_2026-09-09.md`;
- `REPO_CLEANUP_FINAL_PRE_BULK_RED_TEAM_2026-09-10.md`.

Do not convert every lesson below into permanent machinery without the post-campaign retrospective. Some may be Character-Controller-specific. The point is to preserve the evidence while fresh.

## New candidate principles

### 1. History preservation and history discoverability are separate gates

A commit can remain reachable while the repository becomes harder for humans and future agents to understand.

A complete cleanup therefore needs at least two preservation questions:

1. **Can the exact old history still be recovered?**
2. **Can a future maintainer discover what existed, why it mattered and how to recover it without archaeology?**

The first is graph/reachability. The second is catalog/navigation/recovery UX.

### 2. Use a two-phase archive lifecycle

The Character Controller exposed a clean distinction:

- **pre-prune frozen anchor** — immutable-for-execution deletion authority;
- **post-prune archive closure/catalog** — human-facing maintained archive state after the destructive campaign.

Do not keep moving the same archive ref while it is serving as a CAS authority for deletion.

A reusable system should model these as explicit lifecycle states rather than one vague `archive` object.

### 3. Add independent ref-type redundancy before large prune

One ordinary mutable archive branch was technically sufficient for reachability but too weak as the only explicit preservation pointer before deleting 85 refs.

Candidate rule:

> Before large-scale deletion, create at least one independently named durable witness of a different ref type — preferably an annotated tag — pointing exactly to the frozen pre-prune anchor.

The annotation should record:

- repository identity;
- exact archive anchor SHA;
- freeze/manifest digest;
- recovery-manifest path;
- purpose and lifecycle state.

This protects against accidental movement/deletion of the archive branch. It is **not** an off-site backup.

### 4. Archive redundancy is not repository backup

Do not use words such as `backup` when all witnesses live in the same Git repository.

A branch + tag pair protects namespace/recovery semantics inside the repo. It does not protect against loss of the repository/account/provider.

If off-site disaster recovery is a requirement, model it separately (mirror/bundle/export policy).

### 5. The cleanup helper itself needs post-prune preservation

Excluding the active helper from the historical freeze was correct because it kept the freeze stable while tooling evolved.

But that creates a terminal obligation:

> the final helper tip and campaign evidence must be attached to the post-prune archive closure before the helper branch is deleted.

This should become a first-class self-cleanup invariant.

### 6. Never leave qualification metadata pretending to be final archive metadata

The real pushed archive branch still had README wording saying the object was `local-only` and not a final pushed archive ref.

The mechanism remained mechanically valid, but the human-facing semantics became false.

Reusable rule:

> Promotion of a qualification artifact to real authority must include an explicit metadata-state transition, or the lifecycle must require a later closure commit that corrects qualification-only wording.

### 7. Git refs cleanup and GitHub platform cleanup are separate campaigns/layers

After the branch audit, GitHub's Actions workflow registry still contained multiple entries with state `active`, including one-shot cleanup workflows whose source files were already removed from the current helper tree.

Therefore a reusable cleanup system should inventory at least:

- Git refs;
- open PRs/issues;
- Actions workflow registry;
- deployments/environments;
- Pages source;
- rulesets/branch protection when observable;
- webhooks when observable.

Do not infer platform cleanliness from a clean branch namespace.

### 8. Actions registry state must be separated from source/ref executability

`workflow.state == active` does not prove that a current live/default ref contains the workflow file or that the historical workflow remains meaningfully executable.

The system should classify registry entries using both:

- platform registry metadata/ID/state;
- source-file existence and owning refs.

Stale registry entries can then be disabled after prune without deleting historical runs.

### 9. Platform observability must be tri-state, not boolean

The final audit could read deployments, environments, Pages, workflows and rulesets, but webhooks and branch-protection detail endpoints returned 403.

A professional report must distinguish:

- **PASS / observed empty or safe**;
- **BLOCK / observed unsafe**;
- **UNOBSERVABLE / permission or API boundary**.

Never convert `403` or unsupported connector capability into `nothing exists`.

### 10. Branch list protection flags are useful secondary evidence, not a substitute for protection API

Even though detailed branch-protection endpoints were 403, the ordinary branches API reported no protected branches and repository rulesets were observable as empty.

A future system can combine these signals, but it must retain the weaker confidence classification when the authoritative admin endpoint is unavailable.

### 11. Audit deployments and Pages refs explicitly

The Character Controller had 68 observed deployments and all referred to `main`; only `github-pages` existed as an environment and Pages source was `main` through workflow deployment.

This is much stronger evidence than merely scanning YAML for branch names.

Reusable gate:

> Before deleting branches, query actual deployment/environment/Pages state where available and look for consumers of candidate refs.

### 12. Canonical link safety and canonical semantic truth are different

The final audit found zero canonical branch URLs that would break on deletion, yet found wording such as:

`Research provenance is preserved on branch ...`

That sentence becomes false even though it is not a link.

The documentation audit should therefore distinguish:

- broken navigational links;
- stale branch-name provenance labels that remain historically meaningful;
- semantic claims that assert the branch still exists/preserves something.

Only the last class necessarily requires wording repair.

### 13. Do not mutate canonical solely to fix docs while canonical SHA is a frozen delete guard

Once destructive authority is frozen against an exact canonical SHA, documentation cleanup that changes `main` should generally wait until after the frozen deletion campaign unless it fixes a true safety blocker.

Otherwise the process creates its own concurrency drift and forces a new freeze.

For Character Controller, branch-history recovery wording is therefore a mandatory post-bulk closure gate.

### 14. Patch uniqueness is not sufficient evidence of state uniqueness

Historical squash/nonlinear PRs produced commits that `git cherry` considers patch-unique even though their exact tip trees also occur in canonical history.

Use multiple dimensions:

- commit identity;
- patch equivalence;
- tree equivalence;
- canonical ancestry;
- exact PR-head witness;
- aggregate archive reachability.

Do not equate `git cherry +` with `deleting this ref loses the product state`.

### 15. Aggregate archive coverage can decouple evidence value from branch-name retention

Deep E16/E18 research branches contain dozens of unique commits and are highly valuable evidence. The correct response was not necessarily to keep their branch names forever.

Once exact history, original names and recovery metadata are durably archived, retention decisions can answer a different question:

> Does this branch name still serve a live working/navigation purpose?

This is a better model for research repositories than `valuable history => permanent branch`.

### 16. Canary evidence should feed the generic protocol, not just authorize the next batch

The `tmp-noop` canary proved real remote lease deletion, immediate postflight, retry accounting and cleanup of the one-shot write workflow.

Future kits should explicitly ingest canary outcomes into subsequent planning/retrospective rather than treating canary as a ceremonial checkbox.

### 17. One-shot mutating workflows need a lifecycle and registry cleanup

Removing the YAML file after use is necessary but not sufficient. GitHub may continue to list the workflow registry entry.

The protocol should record:

- workflow ID;
- creation/use run IDs;
- removal commit;
- final registry disposition (disabled/retained with reason);
- historical runs preserved.

### 18. Batch ordering by risk class remains valuable

The current dry-run ordering keeps:

1. canonical ancestors first;
2. exact PR-head-preserved branches next;
3. divergent research-only branches last.

Even with universal archive coverage this ordering is useful because it makes early production batches maximally boring and leaves the most valuable/complex history until the executor has accumulated real success evidence.

### 19. Bulk authorization must be a separate Owner boundary from canary authorization

The Owner explicitly authorized only the one-ref canary. A successful canary must not silently broaden that consent to 85 further deletions.

This should remain a generic destructive-operation policy.

### 20. Post-prune recovery sampling should test semantics, not merely SHA reachability

A final closure should restore a representative sample of historical branch names in a throwaway namespace or detached checkout and prove that:

- expected exact SHA is recovered;
- expected stage-specific files exist;
- a representative deep research diagnostic/source can be read;
- original branch name and provenance are discoverable from the catalog.

This tests the human/system recovery contract, not only Git graph reachability.

## Questions partly resolved by real execution

### Aggregate anchor coverage

For this repository, preserving **all distinct frozen historical tips** proved simpler and safer than trying to decide which divergent histories deserved archive coverage. This reduced the semantic review from a preservation decision to a live-name-retention decision.

Candidate retrospective classification: **KEEP/MODIFY**, likely useful for research repositories with many experimental refs.

### Branch vs tag

Real evidence now favors **both, with different roles**:

- branch = maintainable archive/catalog lifecycle;
- annotated tag = exact frozen pre-prune witness.

Do not use two refs as if they were independent storage backups.

### Batch size

A 20-ref atomic leased delete passed on a disposable remote, including all-or-nothing rejection when one lease was stale. This supports bounded batches around 20 as technically viable here, but the final retrospective should still evaluate operational readability and recovery cost after real bulk execution.

### Permanent deleted-push CI guard

The guard solved a real repository-specific problem: broad `on: push` CI would otherwise react to every branch deletion. It belongs in reusable detection logic; whether the guard itself should be permanent depends on the repository's trigger model.

## Required post-campaign retrospective additions

When the cleanup is complete, explicitly evaluate these final-red-team discoveries:

- Was the annotated pre-prune tag actually useful during execution/recovery?
- Did the two-phase archive lifecycle reduce risk or add unnecessary complexity?
- Was the post-prune archive catalog sufficient to replace branch namespace discoverability?
- Did stale Actions registry entries create practical confusion, and was disabling them safe?
- Did any external dependency on deleted branch names surface despite the GitHub-visible audits?
- Was 20-ref atomic batching the right production size?
- Did risk-tier ordering provide useful containment or merely slow the run?
- Was helper self-archival/cleanup clean?
- Could a future version perform more of the platform audit directly through GitHub connector primitives instead of temporary Actions workflows?
- Which observability gaps genuinely matter enough to justify requesting broader permissions?

The next kit version should be built only after those questions have real post-prune evidence.
