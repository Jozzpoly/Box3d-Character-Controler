# Repository cleanup protocol conformance audit — 2026-09-10

Scope: `Jozzpoly/Box3d-Character-Controler`, comparing the generic Repository Cleanup Agent Kit v2 protocol with the project-specific cleanup adaptation currently staged on `maintenance/repo-cleanup-adaptation-2026-09-09`.

This is a pre-destructive red-team record. It does not authorize deletion.

## Verdict

**REPAIR_REQUIRED_BEFORE_BULK**.

The adaptation has unusually strong Git-object preservation and read-only falsification evidence, but it currently weakens two delete-transaction requirements that v2 explicitly preferred, and v2 itself lacks several preservation/lifecycle concerns exposed by this repository.

## Conformance matrix

| Area | v2 requirement / intent | Current evidence | Status | Required action |
|---|---|---|---|---|
| Repository identity | Pin authoritative repo/default branch and live authority | Public repo `Jozzpoly/Box3d-Character-Controler`; `main@b0eac372...` | PASS | Re-read immediately before any write |
| Unknown refs | Preserve by default | Frozen executor ignored seven later accidental aliases | PASS, empirically falsified | Keep fail-closed unknown-ref rule |
| Unique Git history | Persist before destructive ref operations | Aggregate archive + exact old-ref→SHA manifest; 75/75 tips | PASS | Incorporate archive into final closure |
| Git object survivability | Prove preservation survives ref deletion/GC | Shadow prune + reflog expiry + aggressive GC + fsck + fresh clone | PASS | Retain evidence in final closure |
| Exact identity recovery | Restore old names to exact SHAs | 86/86 exact restoration from manifest | PASS | Retain manifest and hash |
| Portable Git recovery | Out-of-band snapshot when justified | 1.42 MiB bundle; clone restored 75/75 tips and 86/86 identities | PASS mechanically / OFFSITE pending | Put final capsule in Owner-controlled storage later |
| External Git payloads | Audit LFS/submodules/external objects | No LFS pointers, `.gitmodules`, gitlinks or external Git payload found | PASS | Record boundary |
| Consumer audit | Hosting/workflow/branch consumers | Pages deploy is main-only; branch-delete pushes skip verify | PASS for repo-visible consumers | External webhooks/bots/bookmarks remain UNOBSERVABLE |
| Branch protections/rules | Observe governance | `main` unprotected; no rulesets/tags/releases | OBSERVED WEAK GOVERNANCE | Rely on exact fail-closed execution; consider future lightweight protection separately |
| Delete proof classes | Typed proof, never name/age | 52 canonical ancestors / 21 exact PR-head-preserved / 13 divergent unique | PASS mechanically | Add semantic meaning for branch-only specimens |
| Last pre-delete snapshot | Every KEEP/DELETE exact, preservation intact | Implemented preflight and repeated live checks | PASS | Must be rerun immediately before write |
| DELETE CAS | Exact lease for every deletion | Canary used explicit `--force-with-lease=<ref>:<sha>` | PASS on production canary | Use same exact leases for all frozen refs |
| Preferred atomic campaign | One atomic transaction when supported/size-safe | Current adaptation plans max 20-ref batches despite production atomic support and 85-ref local qualification | **REGRESSION VS V2** | Restore one atomic 85-ref campaign as preferred path |
| Retained authority witness | KEEP refs participate in same atomic transaction | Current canary pre/post-checks main/archive but does not send no-op witness refspecs | **REGRESSION VS V2 / REAL RACE FOUND** | Add exact no-op witness refspecs + leases for main/archive/helper |
| Command size/platform | Prove giant transaction is practical | 85 DELETE command ~13.6 KB; local atomic happy/stale tests pass | PASS | Production dry-run/read-gate still desirable immediately before execution |
| Partial failure | Avoid ambiguous partial prune | Batch-20 plan creates recoverable but partial intermediate states | WEAKER THAN AVAILABLE | Prefer one atomic transaction; retain batch fallback only |
| Post-write authority | Independent remote readback | Canary postflight exists; protocol requires independent audit | PASS design | Execute after future bulk transaction |
| Execution receipt | Preserve exact plan/result/failures | Planned, but bulk receipt cannot exist yet | PENDING BY PHASE | Include final plan digest + actual results in archival closure |
| Cleanup self-preservation | Preserve helper/tooling history before deleting helper | Pre-cleanup archive predates current helper | **V2 GAP / CURRENT BLOCKER** | Final closure must parent/include final helper history |
| Cleanup-created refs | Ref budget + terminal disposition | Seven accidental alias refs were created during audit | **V2 GAP / OBSERVED FAILURE MODE** | Record them; separate authorized closure; no ad-hoc refs in v3 |
| Semantic preservation | Preserve why a specimen existed and what it proved | PR bodies strong, but 13 divergent branch-only tips have uneven semantic anchoring | **V2 GAP / CURRENT BLOCKER** | Create per-specimen semantic catalog before prune |
| GitHub-native metadata | Preserve PR/Actions research decision history | Snapshot v1 captures 51 PRs, 1017 runs, 366 artifact records | PARTIAL | Carry durable compact snapshot into final closure |
| Evidence-reference coverage | Include Git and platform evidence locators | v1 scans PR discussion only: 40 run / 5 artifact IDs; full Git+GitHub union is 73 / 7 | **SNAPSHOT V1 DEFECT** | Provenance v2 must scan preserved Git text graph too |
| Actions retention | Treat artifacts as expiring locators, not permanent archive | 27 artifact records already expired; referenced Pages artifact expired | **V2 GAP** | Classify payloads: reproducible / exact-output witness / non-reproducible |
| Raw Owner evidence | Preserve non-reproducible causal inputs without silent publication | E2.2c-1 raw Owner capture located outside repo | **V2 GAP** | Record external-evidence state; do not publish without explicit Owner decision |
| PR lifecycle | Avoid live merged heads accumulating indefinitely | Repo has `delete_branch_on_merge=false`; 51/86 historical refs were PR heads | **OPERATING-MODEL DEBT** | After cleanup, merged PR heads should normally die; further work uses new branch |
| Non-PR branch lifecycle | Terminal disposition for branch-only work | 35/86 historical refs were never a PR head | **OPERATING-MODEL DEBT** | Evidence promotion/archive/delete/keep must be explicit at stage closure |
| Post-merge branch mutation | Do not hide new work on an already-merged branch | `research/e18-manipulation-landscape` gained one commit after PR #40 head | **OBSERVED FAILURE MODE** | Branch dies after merge; new work gets a new branch |
| Status aliases | Branch must mean lineage, not status | Same-SHA `ready/final/validated` groups; 86 names → 75 tips | **OBSERVED FAILURE MODE** | Status belongs in PR/check/evidence, not refs |
| CI/ref coupling | Avoid multiplying identical full CI through alias pushes | 1017 runs; 108 excess same-workflow/same-SHA duplicates; alias SHA caused 8 canonical runs | **V2 GAP / COST & PROVENANCE DEBT** | Gate full CI by meaningful evidence transitions, not ref proliferation |
| Assertion quality | Green proof must itself be falsified | First fresh-clone negative check used wrong manifest field; later corrected | **V2 GAP / OBSERVED FAILURE MODE** | Require negative-control/assertion review in v3 |
| Final topology | Smallest truthful live state, not minimum count | Likely `main` branch + one archival closure tag; not yet proven | PENDING EXPERIMENT | Rehearse closure-tag-only recovery before choosing |

## Strongest current blockers

1. **Retained-authority race:** deleting refs without main/archive/helper as same-transaction witnesses can succeed after retained authority drifts.
2. **Self-preservation gap:** current pre-cleanup archive does not contain the newest cleanup helper/tooling/evidence history.
3. **Provenance-v1 coverage defect:** discussion-only parsing misses 33 run IDs and 2 artifact IDs that exist only in preserved Git text.
4. **Semantic gap:** object reachability alone does not explain several branch-only specimens, especially post-merge `research/e18-manipulation-landscape@554b9f...`.
5. **Offsite gap:** every same-repository ref/tag can disappear with the repository/account; a portable bundle exists but has not yet been finalized as a post-cleanup recovery capsule.

## v3 additions suggested by this case

- cleanup ref budget / allowlist and terminal disposition;
- preserve cleanup's own helper history in final archival closure;
- evidence model with `Git object`, `identity`, `semantic`, `GitHub-native metadata`, `external Owner evidence` layers;
- artifact-retention classification;
- full Git-text + platform-metadata evidence-reference union;
- assertion-quality/negative-control review;
- branch lifecycle rules (post-merge death, no status aliases, non-PR terminal disposition);
- CI/ref proliferation audit;
- preferred single atomic exact-lease transaction with retained no-op witnesses when qualified;
- final empty-directory recovery drill from a portable capsule.
