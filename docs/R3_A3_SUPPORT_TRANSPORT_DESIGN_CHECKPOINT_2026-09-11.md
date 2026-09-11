# R3 / A3 support transport repair design checkpoint — 2026-09-11

Status: **REPAIR POLICY QUALIFIED IN TEST-LOCAL DESIGN CRUCIBLES / RUNTIME REPAIR NEXT**.

Branch:

`research/donor-foundation-repair-a3-design-2026-09-11`

Qualified design head before this checkpoint:

`2beb05048cef7386babed72419401d171e3839b6`

Base:

canonical `main` at `e7a98beaca4c010e056c31db97b33c05b4610e38`.

## Root cause

Current support transport is a privileged endpoint teleport. Before the world step it stores a point on the support body. After the world step it computes the point displacement and applies that displacement directly to the character position before the character's normal collision solve.

This one authority explains both qualified A3 defects:

- third-party topology cannot block the support carry, so a fast platform can carry the capsule through a wall;
- support attachment is bilateral for the whole tick, so a support moving away can drag the character with it.

## Compared repair policies

Three policies were compared against the same actual Box3D/Donor scenarios:

1. `legacy`: full endpoint delta applied directly;
2. `swept`: full endpoint delta swept against third-party geometry;
3. `unilateral-swept`: remove support-normal separation from the carry proposal, then sweep the remaining carry against third-party geometry.

The design crucible demonstrated:

- legacy preserves ordinary carry but reproduces wall tunneling and receding-support pull;
- sweep alone fixes path tunneling but does not fix receding-support pull;
- unilateral + sweep preserves ordinary lateral carry and upward support carry while avoiding both qualified defect classes.

Canonical smoke and build remained green because the design branch changes only tests/docs, not runtime source.

## Adversarial refinement: rotating supports

A stale world-space support normal is not a safe unilateral frame for rotating supports. An off-center support point under a large support rotation can leave a materially receding component when filtered against the previous world normal.

The safer candidate is therefore a **support-local contact frame**:

- preserve local support point,
- preserve support normal transformed into support-local space at capture time,
- after the support moves, transform that local normal back into the current world orientation,
- classify the support point displacement against that current normal.

This is not merely a convenience for rotation. It makes the authority relation explicit: the contact frame belongs to the support, not to stale world coordinates.

## Adversarial refinement: ceiling / third-party topology

Upward carry must remain useful, but it must not outrank other world geometry. Candidate swept policies were checked under a low ceiling and clipped carry rather than inheriting the full support displacement through the ceiling.

The source support body is excluded from blocking its own carry sweep. Third-party geometry is not.

## Candidate runtime law

For an existing support relation during one world step:

1. capture support local point and local normal before the step;
2. after the step, rebuild the support point and support normal in the support's current transform;
3. compute support-point displacement;
4. remove only the component that represents the support moving away from the character along the current support normal;
5. sweep the remaining proposed carry through the character mover query, excluding the source support body itself;
6. apply only the safe fraction;
7. continue through the existing character movement/contact solver.

This design is a candidate, not yet canonical Donor behavior.

## What is not yet demonstrated

- runtime implementation equivalence to the test-local candidate;
- preservation across the complete original A3/A3b falsification scripts;
- broad rotating-support ecology;
- Owner feel;
- safe interaction with every dynamic/support topology;
- readiness for merge to `main`.

## Next gate

Implement the minimum candidate law on a fresh repair branch from canonical `main`, then replay original A3/A3b evidence plus preservation tests. Do not stack the repair on R1/R2 research branches.
