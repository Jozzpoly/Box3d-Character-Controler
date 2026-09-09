# Repository cleanup — pre-deletion gate

Date: 2026-09-09

Status: **TECHNICALLY READY FOR ONE-REF CANARY; PRODUCTION DELETION NOT YET AUTHORIZED IN THIS CHECKPOINT**

This document records the exact boundary reached after preservation, policy, adversarial and delete-transport qualification. It is intentionally written before the first historical branch deletion.

## Immutable preservation authority

- repository: `Jozzpoly/Box3d-Character-Controler`
- canonical ref: `refs/heads/main`
- canonical SHA: `b0eac372035ca12a63f808eb3201edd3605a163c`
- archive ref: `refs/heads/archive/pre-cleanup-2026-09-09-dca388f4`
- archive SHA: `fd5cae330fb80280617ce7b241347f1edafdb875`
- historical archive freeze SHA-256: `dca388f456480489492ea2069c2ce8ecd5930d3ab41028cda88f25fe72cc9584`
- frozen historical branch mappings: 86
- frozen distinct historical tips: 75
- archive anchor parents: 76 (`main` + 75 distinct historical tips)
- archive recovery manifest: `archive/recovery-manifest.json` on the archive ref

The active cleanup helper is deliberately not part of the historical freeze.

## Active workbench

Branch: `maintenance/repo-cleanup-adaptation-2026-09-09`

Latest fully qualified technical head before this documentation-only checkpoint:

`a5eb44c9ca3d23f150ffa49a0d69511361e02eee`

At that head:

- standard smoke/build CI: PASS
- immutable-archive delete preflight: PASS
- production live state: 86 `DELETE_READY`, 0 `SKIP_ALREADY_ABSENT`, 0 blockers
- archive reachability rechecked: 75/75
- adversarial policy cases: 14/14 PASS
- generic disposable delete-transport cases: 7/7 PASS
- production-sized disposable 20-ref cases: 3/3 PASS
- production historical branch deletions performed: **0**

The cleanup preflight workflow has `contents: read`. The one-shot archive materializer with write permission was removed after archive materialization. There is currently no active generic production-delete workflow on the helper branch.

## Qualified delete semantics

A production candidate may only be deleted when all of these remain true at execution time:

1. the immutable recovery manifest names the branch and frozen SHA;
2. current live ref SHA equals that frozen SHA;
3. the frozen SHA is reachable from the exact archive anchor;
4. canonical `main`, archive ref and active helper all still match their exact expected SHAs;
5. no unexpected concurrent live branch or semantic duplicate invalidates the preflight;
6. the ref is not any hard-deny ref;
7. the requested batch is bounded;
8. the delete uses an atomic Git ref transaction with per-ref expected-old-SHA leases;
9. postflight reclassifies the repository and rechecks all hard-deny refs.

Retry semantics are deliberate:

- frozen ref present at frozen SHA -> `DELETE_READY`;
- frozen ref already absent -> `SKIP_ALREADY_ABSENT`;
- frozen ref present at another SHA -> `REF_MOVED`, fail closed.

## Transport evidence

Disposable bare-remote tests demonstrated:

- exact leased atomic deletion succeeds;
- already-absent retry is a no-op;
- a stale candidate is rejected before delete;
- a stale lease rejects the entire atomic transaction without partial deletion;
- hard-deny refs are refused;
- a previously absent ref that reappears is refused;
- batches above the configured maximum are refused;
- a full 20-ref exact batch succeeds atomically;
- one stale lease among 20 causes the whole 20-ref transaction to fail without partial deletion.

No disposable-remote test touched production refs.

## Deterministic dry-run deletion topology

Current pre-delete plan:

- canary: `refs/heads/tmp-noop`
- frozen canary SHA: `2f341aed904ecdccf61b1264a77f849aeaa236fd`
- canary state: `DELETE_READY`
- after separating canary: 85 bulk refs
- bounded bulk batches: 6
- maximum batch size: 20
- tier order:
  1. `ANCESTOR_OF_CANONICAL` — 51 refs after canary
  2. `PR_HEAD_PRESERVED` — 21 refs
  3. `DIVERGENT_UNIQUE` — 13 refs
- dry-run batch-plan SHA-256: `1035955cf03e719a5035f0f6724fb4c2dfbc4ff498e2c2c9538174f20ee65d83`
- destructive authorization in the dry-run plan: `false`

The tiers are intentionally not mixed across batch boundaries.

## First production mutation boundary

The next destructive action, if explicitly authorized, is **only**:

`refs/heads/tmp-noop` at frozen SHA `2f341aed904ecdccf61b1264a77f849aeaa236fd`

The canary must not delete any second ref.

Required postflight:

- `tmp-noop` absent;
- 85 `DELETE_READY`;
- 1 `SKIP_ALREADY_ABSENT` (`tmp-noop`);
- 0 blockers;
- canonical `main` unchanged;
- archive unchanged;
- helper unchanged during the transaction;
- archive reachability remains 75/75;
- branch-deletion CI event must not run a full smoke/build because `main` now guards `github.event.deleted == true`.

Bulk deletion is **not** automatically authorized by a successful canary. Canary evidence must be reviewed first.

## Safety boundary encountered in Browser GPT

When the assistant attempted to create a workflow whose commit would immediately execute the first real branch deletion, the connected write path was blocked by the platform safety layer. That block was not bypassed through another mutation route.

Therefore this checkpoint treats an explicit Owner authorization for the first production canary as a separate boundary from general instructions to continue preparation.
