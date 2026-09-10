# Repository history archive — post-cleanup closure

This branch is the durable recovery surface for the Box3D Character Controller repository cleanup. It is **not canonical runtime/project authority**; live `main` remains that authority.

## Two anchors with different jobs

- Immutable annotated tag `archive/pre-cleanup-2026-09-09-dca388f4` points to the exact **pre-prune** archive anchor `fd5cae330fb80280617ce7b241347f1edafdb875`. It must remain frozen.
- The archive branch of the same name advances beyond that anchor with post-prune closure documentation while retaining the frozen anchor in its first-parent history.

The frozen machine-readable identity source is `archive/recovery-manifest.json` (SHA-256 `beba606add09a9b60d9296acd75c42068e6859b24509e7b6426b3166d0992b60`). It maps all 86 historical branch names to exact commit SHAs. `archive/CATALOG.md` is the human-readable recovery index.

## Recovering an old branch state

1. Find the historical branch name in `archive/CATALOG.md` or `archive/recovery-manifest.json`.
2. Copy its exact SHA.
3. Create a local recovery branch at that SHA, for example `git switch -c recovered/<name> <sha>`.
4. Recreate a remote historical branch only for a concrete reason; the cleanup intentionally removed those live names.

The archive graph preserves the frozen historical tips after the original live branch refs are gone. See `archive/CLOSURE.md` for the audited prune and closure evidence.
