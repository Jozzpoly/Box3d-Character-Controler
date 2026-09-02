# Project state — Embodied Player Laboratory

Grounded: **2026-09-02**

Implementation/behavior baseline used for this grounding:

`f4877a46618a347c3be32edf7ddb39ab66a091bd`

This document is the **canonical current-state/orientation layer** for the repository. It does not replace stage evidence. Detailed experiment documents remain authoritative for what a particular stage actually tested and observed.

Before any future write, re-fetch `main`; branch names, old conversations and this recorded SHA are not substitutes for the live repository head.

## 1. Project identity

This repository is an **Embodied Player Laboratory**.

Its central question is broader than character-controller polish:

> How can a player possess a physically meaningful body in a simulated world while retaining enough control, readability and fun that physics becomes part of gameplay rather than an obstacle?

Working tension:

> **PLAYER INTENT ↔ PHYSICAL CONSEQUENCE**

Working mental model:

> **Player intends. Controller interprets. Body attempts. Physics answers.**

Methodological requirement:

> **Controlled enough to explain, open enough to play.**

The implementation may be disposable. Accepted observations, reproduced failures, causal distinctions and qualified behavior are not.

This is not a project to perfect one capsule forever. It is a long-lived place to investigate physical player presence, representation ownership, contact consequence, support, traversal and later embodied capabilities when a real question earns them.

## 2. Place in the broader work

The laboratory is intentionally **independent** from Jozz Vehicle, JES and other projects.

Its useful outputs may later transfer to projects such as next-generation Jozz Vehicle, JES or Anvil, but the transfer rules are strict:

- an observation or causal result may transfer as knowledge;
- a qualified behavior may transfer through the explicit donor contract;
- code may transfer only through a deliberate consumer integration with provenance and validation;
- this repository does **not** automatically dictate the architecture of another project;
- another project does not become the source of truth for this laboratory merely because it consumes a donor revision.

The broader value is therefore twofold:

1. discover reusable facts about physical player embodiment;
2. maintain a small, explicit donor surface when a real consumer wants a known qualified behavior.

Do not turn this repository into a generic engine, mini-JES, universal gameplay framework or shared-code dumping ground merely because several projects may benefit from its findings.

## 3. Authority hierarchy

Different sources answer different questions.

### Owner judgement — experiential truth

Owner free play is the authority for claims such as:

- whether a behavior feels wrong, sticky, artificial or satisfying;
- whether an interaction invites useful/emergent play;
- whether a supposedly small defect materially damages the experience;
- whether a machine-qualified candidate is acceptable as current-best.

A green smoke suite cannot prove feel.

### Repository + exact SHA + CI — implementation truth

The live repository determines what actually exists.

For implementation claims prefer, in order:

1. current `main` exact SHA;
2. exact changed files/code at that SHA;
3. canonical smoke/build result for that SHA;
4. deployed Pages result when browser/device evidence matters.

Never infer active work from an old branch name alone.

### Stage docs — research/provenance truth

`docs/E2_*` records are historical evidence. Their local words such as “current”, “candidate” or “next” refer to the stage when that document was written unless a later current-state document explicitly promotes them.

Do not rewrite old experiment conclusions merely to make the wording sound current.

### Historical branches — archaeology, not live authority

The repository intentionally retains many `foundation/*`, `experiment/*`, `research/*`, `mobile/*` and stabilization branches. They preserve useful provenance but are not automatically active.

A branch becomes relevant again only through a deliberate recovery/handoff or an open integration path. At the 2026-09-02 grounding point there were no open PRs or issues.

## 4. Current behavior

### CURRENT — Donor v1 / A‴

The normal public runtime uses **A‴**, exposed through:

- `createCurrentDonorCharacter(...)`;
- explicit `createDonorCharacterV1(...)`;
- `DONOR_CONTRACT_V1`;
- `CURRENT_DONOR_REVISION = 'v1'`.

A‴ is current-best because it passed both:

- machine qualification of the real production path;
- Owner free play, which identified and removed a real previously hard-to-name feel defect.

The defect was **stale blocked locomotion authority**: velocity could remain stored while geometry prevented the movement, then re-enter motion after input changed or the constraint disappeared.

Current constraint rule:

```text
v_rel_in = (velocity - surfaceVelocity) · horizontalNormal
d_rel_in = (desiredVelocity - surfaceVelocity) · horizontalNormal
allowed_rel_in = min(0, d_rel_in)

if v_rel_in < allowed_rel_in:
    retire only the excess normal component
```

Interpretation:

> **Constraint velocity is relative, and the player may retain only constrained normal authority still justified by current intent.**

The rule applies only to active horizontal static/kinematic constraints. Dynamic-body physical consequence remains on the separately qualified causal-reciprocity path.

### PREVIOUS — Donor v0 / A″

A″ remains a frozen compatibility/reference behavior.

The historical factory `createDonorCharacter(...)` deliberately continues to mean v0/A″. Existing symbols are not silently retargeted to current behavior.

A″ fixed the earlier A′ contact-memory defect but retains the old browser-binding constraint behavior that allowed stale blocked velocity to survive.

### HISTORY

A, B, A′ and the research A″ composition remain valuable falsification/evidence specimens.

They are not normal public choices and should not be re-promoted merely because their code/branches still exist.

## 5. Current mechanical contract

Current Donor v1 intentionally keeps the same numerical feel profile as v0:

- radius `0.36`;
- half segment `0.54`;
- virtual interaction mass `80 kg`;
- max speed `5.2 m/s`;
- sprint multiplier `1.32`;
- ground acceleration `31 m/s²`;
- ground deceleration `36 m/s²`;
- air acceleration `7.5 m/s²`;
- air deceleration `1.2 m/s²`;
- external ground drag `2.0`;
- external air drag `0.22`;
- gravity `20 m/s²`;
- fall gravity multiplier `1.22`;
- jump-release gravity multiplier `1.75`;
- jump speed `7.2 m/s`;
- coyote time `0.11 s`;
- jump buffer `0.12 s`;
- support normal minimum Y `0.58`.

Qualified execution envelope:

- fixed physics step `1/60 s`;
- `4` Box3D substeps;
- `box3d.js@0.1.1`;
- Three.js `0.183.0` in the browser presentation;
- Vite `7.0.0` build substrate.

Lifecycle:

1. `character.preStep(dt, intent)`;
2. one `b3World_Step(world, dt, substeps)`;
3. `character.postStep(dt)`.

The intent contract is device-independent. Keyboard and touch translate into the same move/jump/sprint intent rather than owning separate physics semantics.

## 6. Current architecture map

### Research/current mechanics

- `src/character.js` — historical/shared controller-owned mover foundation used by A/A′/A″/v0 paths;
- `src/constraint-velocity-character.js` — current A‴ production behavior, intentionally isolated from the historical class;
- `src/constraint-velocity.js` — reconstruction of missing solved plane-push state plus intent-capped relative constraint policy;
- `src/solver-owned-character.js` — frozen B representation experiment;
- `src/donor/contact-memory.js` — velocity-only dynamic-contact consequence adapter;
- `src/donor/*` — stable donor API, profiles, intent and revision metadata.

### Browser/play instrument

- `src/main.js` — mode routing and runtime composition;
- `src/playground.js` — open embodied-player yard;
- `src/player-input.js` — keyboard/touch intent producer;
- `src/follow-camera.js` — camera;
- `src/character-visual.js` — visual presentation without physics authority;
- `src/free-play-capture.js` — historical Owner-marked capture instrument;
- `src/world-renderer.js` — Box3D→Three presentation.

### Verification

`npm run smoke` is intentionally split into:

- `smoke:research` — historical research/falsification chain and A‴ production qualification;
- `smoke:donor` — donor contract, frozen v0 equivalence, v1 equivalence/policy exercise and mobile-input gates.

Every repository push currently runs full smoke + production build. Pages publication occurs only for `main`.

This simple pipeline is sufficient. Do not add CI ceremony merely to make the project look mature.

## 7. Evidence already established

The important lineage is:

### Foundation / A

Controller-owned mover established useful player agency, gravity/support, dynamic push, moving support and fair-enough capsule traversal. Foundation 02.1 became the accepted provisional comparison baseline, not an architecture winner.

### B

A real solver-owned finite-mass translational root demonstrated that solver ownership can provide natural physical participation, but the minimal implementation was poor at the ordinary traversal envelope. This is evidence about that implementation, not a rejection of all solver-owned/hybrid characters.

### A′

Causal-component reciprocity removed artificial cross-axis momentum manufactured by rounded contact normals while preserving useful push/landing/traversal behavior.

### A″

Dynamic-contact reaction was recognized as a current `Δv`, not a persistent future velocity target. Removing that contact-memory write eliminated the objectionable delayed wrong-direction residual slide while preserving the immediate physical reaction.

### E2.3 substrate finding

`box3d.js@0.1.1` loses solved `b3CollisionPlane.push` mutations across separate JavaScript wrapper calls. A later `b3ClipVector(...)` therefore sees stale zero push state.

Faithfully restoring full native clipping was **not** behavior-neutral: it changed contact lifecycle and broke valid stair traversal. “Fix the binding” is therefore not automatically the correct gameplay repair.

### A‴

E2.3c isolated intent-capped **surface-relative** constraint velocity as the surviving policy. E2.3d moved it into an isolated real production path and qualified neutral/tangent/partial-intent/held input, stairs, ledge, dynamic Owner anchor, support carry, moving kinematic constraint, corner and oblique cases.

E2.3e added the missing Owner evidence and promoted A‴ to current Donor v1.

## 8. Durable current invariants

Do not change these without a new reason and matching evidence:

- v0 meaning remains immutable;
- v1 numeric feel constants remain the accepted current profile until a reproduced problem justifies tuning;
- dynamic consequence and static/kinematic constraint ownership remain separate causal concerns;
- moving-support inheritance is a qualified valid behavior, not accidental external velocity;
- the public default represents current-best, not the entire experiment history;
- historical modes remain available for regression/provenance but stay out of normal UX;
- machine PASS and Owner acceptance remain distinct evidence classes;
- current behavior is a current-best specimen, not a declaration that controller-owned architecture won forever.

## 9. Known debts and open boundaries

These are **not automatic tasks**. They are stored uncertainties to revisit only when a relevant question makes them informative.

### Constraint policy envelope

- horizontal-normal activation threshold is currently `0.35`; it passed the existing stair/corner/oblique matrix but is not proven as a universal slope policy;
- arbitrary rotating kinematic side constraints have not received a dedicated promoted-policy falsifier;
- a 90° two-plane corner passed, but arbitrary dense/curved multi-plane networks are not exhaustively proven;
- active plane-push reconstruction duplicates native solver logic and is coupled to the current `box3d.js` binding behavior.

### Representation/architecture

- A‴ deliberately duplicates a limited movement-solve path instead of refactoring the historical base class;
- controller-owned state still uses virtual mass, manual dynamic reciprocity and explicit moving-support transport;
- B did not settle the long-term controller-owned vs solver-owned vs hybrid representation question.

### Locomotion

Grounded zero-input recovery remains a strong horizontal momentum sink. This is known, but it is not currently an Owner-reported defect and must not trigger tuning by itself.

### Mobile

Initial real Android touch free play proved feasibility/usability of the touch surface, but sustained performance, thermal cost and refined ergonomics remain unqualified. After E2.3e the normal mobile runtime should be treated as current Donor v1/A‴, not the old A″ donor stage.

### Downstream/networking

The pure intent boundary is a useful seam for replay, bots, gamepads and networking, but this laboratory does not yet own a generic reconciliation/prediction/serialization framework. A real consumer must earn those contracts.

## 10. Execution loop for future work

The default operating loop is deliberately lightweight:

> **real friction / capability need → determine what is actually unknown → smallest useful research or experiment → smallest justified change → validation proportional to causal blast radius → faithful browser/device evidence → Owner judgement → stabilization or next question**

This is not a rigid checklist. Scale it to the problem.

### Before work

- re-fetch `main` and exact SHA;
- inspect current docs/code relevant to the question;
- distinguish demonstrated fact, interpretation, plan and unknown;
- check whether a prior experiment already answers the question;
- do not treat old proposals as commitments.

### During research

- prefer a falsifier that separates competing explanations;
- preserve controls and positive historical cases;
- avoid tuning many coupled constants before the causal defect is localized;
- if a harness fails, first determine whether the implementation or the harness is wrong;
- keep disposable probes disposable unless they earn production relevance.

### During implementation

- branch from the re-fetched exact base;
- keep blast radius smaller than the question whenever possible;
- avoid refactors inside an experimental change unless required for correctness;
- preserve donor compatibility boundaries;
- add the smallest regression gate that proves the intended semantic distinction;
- use expected head/base SHAs when merging.

### During validation

Validation must answer the actual risk:

- numerical/causal changes -> deterministic falsifiers/regression;
- API/contract changes -> contract/equivalence tests;
- browser/presentation changes -> production build and faithful render/runtime evidence;
- feel changes -> Owner hands-on evidence;
- device changes -> real device evidence;
- dependency/binding changes -> requalify the affected mechanics envelope.

Do not claim success from a weaker evidence class than the claim requires.

### At stage closure

Record:

- what was proven;
- what was rejected;
- exact relevant SHA/run when useful;
- what remains unknown;
- explicit non-claims;
- the natural next trigger.

Then stop. Do not automatically open a second distinct stage merely because the first one succeeded.

## 11. Trigger rules for the next controller stage

After E2.3e, active locomotion defect hunting is closed.

A new controller/embodiment stage is justified only by at least one of:

1. **new reproduced play friction** — Owner or consumer evidence shows a real problem;
2. **new embodied capability** — the project asks a new physical-player question rather than another tuning pass;
3. **downstream integration pressure** — a real consumer exposes a missing contract or representation requirement;
4. **substrate change** — Box3D/binding/timestep/runtime changes invalidate the qualified envelope.

When none exists, preserving the current controller is the correct action.

## 12. Public/current surfaces

Current public runtime:

`https://jozzpoly.github.io/Box3d-Character-Controler/`

Normal URL = current Donor v1 / A‴.

Historical direct modes remain research tools:

- `?mode=controller` — Foundation A;
- `?mode=solver` — B;
- `?mode=causal` — A′;
- `?mode=momentum` — historical A″ composition;
- `?mode=donor` or `?mode=previous` — frozen Donor v0/A″;
- `?mode=constraint` — compatibility alias resolving to current behavior;
- `?mode=causal&capture=1` — historical A′ capture instrument.

## 13. Where to read next

For a fresh takeover, use this order:

1. `docs/PROJECT_STATE.md` — current identity, boundaries and operating model;
2. `README.md` — compact public/current map;
3. `docs/E2_3E_STABILIZATION.md` — why A‴ became current;
4. `docs/DONOR_CONTRACT.md` — exact current/previous downstream contract;
5. only then open the specific earlier stage document needed by the new question.

`docs/RESEARCH.md` is a valuable historical ledger of the early lineage, but it is not the live current-state document.

## 14. Present natural boundary

The project is currently in a healthy resting state:

- current mechanics are machine-qualified and Owner-accepted;
- current/previous donor semantics are explicit;
- public default is current-best;
- old experiment choices are removed from normal UX but preserved as evidence;
- CI/build/Pages are canonical and simple;
- no active controller defect is currently earned by evidence.

The next high-value action is therefore **not predetermined**. When a new need appears, first ask which uncertainty it creates and choose the smallest experiment that can distinguish the meaningful alternatives.
