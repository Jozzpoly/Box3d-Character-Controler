# Repository hygiene closure — 2026-09-10

## Final authority boundary

- Canonical/public main: `e7a98beaca4c010e056c31db97b33c05b4610e38`.
- Exact-main smoke/build/Pages qualification: run `34465909309` — success.
- Frozen pre-prune archive anchor: `fd5cae330fb80280617ce7b241347f1edafdb875`.
- Immutable annotated tag `archive/pre-cleanup-2026-09-09-dca388f4` points to tag object `7423e25ed9532f410a35cc4f7c3ff9c492a7fbc3`, peeled to the frozen anchor.
- Historical archive freeze SHA-256: `dca388f456480489492ea2069c2ce8ecd5930d3ab41028cda88f25fe72cc9584`.
- Recovery manifest SHA-256: `beba606add09a9b60d9296acd75c42068e6859b24509e7b6426b3166d0992b60`.
- Final cleanup-helper tip to be preserved by the archive seal: `c66d7a2a3a7b4d957f2ee484bbc4257f134f24ad`.

The post-cleanup archive documentation is committed on the archive line descending from the frozen anchor. A final seal commit joins that prepared archive line with the final cleanup-helper tip and final canonical `main`. The immutable pre-prune tag remains unchanged on the frozen anchor.

## Destructive execution evidence

- one-ref canary: run `34412321168`, artifact `10127711066`, digest `sha256:26f2e3100d177774e69e2ecfd586f91780d97e5afd609cc8b9720b2df53238b5`;
- aggressive-GC / exact-recovery rehearsal: run `34416353700`, artifact `10129215137`, current GitHub metadata digest `sha256:9bb89e24869ac5b8347155dd6c37276b28e114f9662842a90d271eb4c23af14d`;
- final transaction specimen: run `34431119947`, artifact `10134512857`, digest `sha256:bec336424ea7ba6707493492dcc41d0df2cbdf9673b86f62d80d2fd95007a149`;
- owner-authorized atomic bulk prune: run `34464748439`, artifact `10147021517`, digest `sha256:28e76214ccaec8c3c6a23b5dd93fd850f48a3c3379fe77b6801ee079e8eb156f`; executed transaction SHA-256 `94f19b09125837d09c22a203f754bf5984a91ae4883a067cfca8a58aeb50d149`;
- qualified post-bulk provenance/platform snapshot: run `34465088280`, artifact `10147187125`, digest `sha256:af43223dadb18f43afd4be2cf1a6b6d8904640e77d939147d1443ee50ee0c259`;
- stale registry-only workflow closure: run `34465295332`, artifact `10147238417`, digest `sha256:9cd117310e576ddd44e93083dd170704483c38d38fe1245ab1360bcc63f6f43d`;
- final helper-workflow registry closure: run `34466827224`; its frozen catalog/provenance and registry steps succeeded, disabling 13 remaining helper-only cleanup workflows before archive publication was stopped by `git diff --check` on two Markdown trailing-space line breaks.

## Preservation result

The frozen set contains **86 historical names / 75 distinct tips**. Classification at freeze: **52 ancestor-of-canonical, 21 exact PR-head preserved, 13 divergent unique**.

The real bulk transaction deleted 85 still-live frozen historical refs plus 7 accidental rehearsal aliases in one atomic 92-delete transaction. `tmp-noop` had already been deleted as the one-ref canary.

The qualified post-bulk provenance snapshot from run `34465088280` resolved **73/73 referenced Actions runs** and **7/7 referenced artifact records** with zero missing records; one historical artifact record was already expired. Later administrative closure documents add additional run references, so the 73/7 result is intentionally treated as a bounded post-bulk evidence snapshot rather than a moving invariant.

## GitHub platform closure

Run `34466827224` revalidated the three-branch namespace and then disabled **13** remaining helper-only cleanup workflow registry entries. Together with the earlier six registry-only residues disabled by run `34465295332`, this left exactly **one active workflow** in the 20-entry Actions registry: canonical `.github/workflows/deploy-pages.yml` (workflow ID `345000233`). Historical workflow runs were intentionally retained.

Some administration-scoped GitHub settings remained unobservable to the cleanup token, including detailed Actions permissions/retention, webhooks, and immutable-release administration. Pre-prune `protected=true` branch enumeration and repository ruleset enumeration were empty; unobservable administration detail was never treated as proof of emptiness.

## Remaining live helper boundary

The cleanup helper is deliberately **not deleted by this archive closure**. Its final tip `c66d7a2a3a7b4d957f2ee484bbc4257f134f24ad` is preserved by the final archive seal and its cleanup workflows are disabled. Deleting the helper is the final separate destructive namespace action and requires explicit Owner authorization after one last live revalidation.

Full historical branch identities: [`CATALOG.md`](CATALOG.md). The frozen machine-readable recovery contract is [`recovery-manifest.json`](recovery-manifest.json).
