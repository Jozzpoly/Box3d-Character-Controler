# Repo cleanup freeze drift witness — 2026-09-09

Purpose: provide a deliberate helper-only commit after the historical archive freeze was stabilized, so the next Gate 1 run can prove that moving the active cleanup helper does not mutate the historical preservation contract.

Baseline witness before this commit:

- canonical `main`: `b0eac372035ca12a63f808eb3201edd3605a163c`
- active cleanup helper: `a0227f45e951c31d98108e1ffeb3db7c035b9571`
- observed branches: 88
- historical archive branches: 86
- historical distinct tips: 75
- archive anchor parents: 76
- historical archive freeze SHA-256: `dca388f456480489492ea2069c2ce8ecd5930d3ab41028cda88f25fe72cc9584`
- qualified local-only archive anchor: `fd5cae330fb80280617ce7b241347f1edafdb875`
- historical reachability: 75/75

Expected next-run invariant:

1. the active helper SHA changes because of this commit;
2. canonical `main` remains unchanged;
3. `historicalArchiveFreezeSha256` remains exactly unchanged;
4. deterministic local-only archive `anchorSha` remains exactly unchanged;
5. historical branch/tip mapping and reachability remain unchanged;
6. only the live-plan hash is permitted to change.

Failure of any invariant other than helper/live-plan movement blocks remote archive creation until explained.
