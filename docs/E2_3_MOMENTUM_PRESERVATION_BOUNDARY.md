# E2.3 — Momentum Preservation Boundary

Status: **diagnostic complete; production runtime unchanged; A″ remains the Owner-preferred current contact-semantics specimen, not an accepted final controller baseline**.

## Why this stage exists

Owner free play of A″ produced a strong positive result: the previously objectionable residual slide disappeared, wall reactions felt appropriate, and the character no longer developed the delayed wrong-direction motion seen in A′.

That result created a new ambiguity:

> Did A″ repair a bad momentum-memory system, or did it merely remove too much physical after-motion?

The wrong next move would have been to immediately "add some slide back". E2.3 instead asks what the current A″ runtime actually does with horizontal momentum and whether the apparent lack of grounded slide comes from collision response, velocity clipping, or locomotion recovery.

No production behavior is changed by this stage.

## Initial motor boundary

A zero-input horizontal state of `[3, 0, 4]` (`5.0 m/s`) was injected into A″.

Grounded:

- after 1 tick: `4.400 m/s`;
- after 6 ticks: `1.400 m/s`;
- stopped by about the ninth tick (`~0.15 s`);
- horizontal displacement over `0.50 s`: `0.307 m`.

Airborne:

- after 1 tick: `4.980 m/s`;
- after 6 ticks: `4.880 m/s`;
- after 15 ticks: `4.700 m/s`;
- after 30 ticks (`0.50 s`): `4.400 m/s`.

This directly exposes the current policy split:

- grounded zero-input recovery uses `groundDeceleration = 36 m/s²`, i.e. up to `0.6 m/s` horizontal velocity change per 60 Hz tick;
- airborne zero-input recovery uses `airDeceleration = 1.2 m/s²`, i.e. `0.02 m/s` per tick.

The real recovered `owner-1` A″ anchor independently shows the same grounded sink. On the first clean no-dynamic-contact tick after the seven-frame contact episode, horizontal speed changes from about `1.520 m/s` before `preStep` to `0.921 m/s` after the zero-input grounded motor update.

Therefore the disappearance of grounded after-motion in current A″ is not evidence that the physical contact itself zeroes all horizontal velocity. The locomotion motor can consume substantial remaining horizontal speed immediately after contact.

## Unexpected substrate finding: `b3ClipVector` is inert in box3d.js@0.1.1's ordinary JS mover sequence

E2.3 initially attempted to separate contact clipping from motor recovery. Repeated falsified fixtures led to inspection of the exact runtime substrate rather than continued geometry tuning.

Current project provenance is:

- `box3d.js@0.1.1`;
- box3d.js release commit `5d5a3af049cccd9948b2b55bac4342414af0ef64`;
- vendored native Box3D commit `8441b4a06d6d09dcfb0b0f704df4d847d1437b92`.

At that exact native Box3D commit, `b3SolvePlanes` mutates every `b3CollisionPlane.push` while solving. `b3ClipVector` then ignores any plane whose `push == 0` and only clips velocity against planes activated by the solve.

The box3d.js 0.1.1 embind wrapper breaks that stateful contract across separate JavaScript calls:

1. `b3SolvePlanes(targetDelta, planes)` copies JS planes into a temporary `std::vector<b3CollisionPlane>`;
2. native Box3D mutates `push` in that temporary vector;
3. the wrapper returns only the solver result and does not copy the mutated planes back into the JS objects;
4. `b3ClipVector(vector, planes)` later creates a new temporary vector from the original JS planes, whose `push` values are still zero.

The library's own character example uses the same separate `b3SolvePlanes(..., planes)` then `b3ClipVector(..., planes)` sequence.

### Machine binding-contract proof

E2.3 includes a faithful JavaScript transcription of the exact native `b3SolvePlanes` loop solely as a diagnostic. It recovers `push` while comparing its solved delta against the native wrapper result.

For a shallow wall overlap:

- native wrapper solved delta: approximately `(-0.015, 0, 0)`;
- JS reconstruction solved delta: the same within `1.12e-10` maximum component error;
- JS-visible `push` after native `b3SolvePlanes`: `0.000000`;
- reconstructed native-equivalent `push`: `0.015000`.

For a constrained test velocity:

- input: approximately `(3, 0, -4)`;
- current box3d.js call using stale JS planes: unchanged `(3, 0, -4)`;
- `b3ClipVector` after diagnostic push propagation: `(0, 0, -4)`;
- independent JS implementation of the exact native clipping expression: `(0, 0, -4)`.

Thus current A/A′/A″ calls to `b3ClipVector(this.velocity, lastPlanes)` are effectively inert for freshly collected JS planes even though the source code superficially looks like the intended native mover pipeline.

This is **binding/substrate debt**, not proof that the current gameplay behavior is wrong.

## Intended native clipping is not a neutral substrate repair

E2.3 then used a diagnostic module shim that keeps native `b3SolvePlanes.delta` but propagates the reconstructed `push` values back into the same JS planes before production `b3ClipVector` runs.

The shim continuously validates the reconstruction against native solve output. Across the recovered `owner-1` trial:

- solve calls: `109`;
- activated plane instances: `97`;
- maximum reconstructed-vs-native solve delta error: `3.56e-9`.

Comparison:

| metric | current-binding A″ | push-propagated intended-clip A″ |
| --- | ---: | ---: |
| first contact impulse | `87.70 N·s` | `87.70 N·s` |
| dynamic contact episode | `7f` | `1f` |
| speed at first clean separation before motor | `1.520 m/s` | `0.254 m/s` |
| speed after that tick's motor update | `0.921 m/s` | `0.246 m/s` |
| speed after ~6 ticks | `0.391 m/s` | `0.224 m/s` |
| tail at `0.25 s` | `0.074 m` | `0.075 m` |
| tail at `0.50 s` | `0.129 m` | `0.140 m` |
| support at first clean separation | `STATIC` | `AIR` |

The first impulse remains the same, but restoring intended native velocity clipping materially changes the contact lifecycle and support transition. It is therefore not justified to patch the binding merely for API purity and assume gameplay equivalence.

## What E2.3 demonstrates

1. A″ solved the Owner-observed delayed wrong-direction slide well enough that current free play is reported as "super" and wall rebounds feel appropriate.
2. Current grounded locomotion recovery is a strong horizontal momentum sink: up to `0.6 m/s` per tick with zero input.
3. Current airborne recovery is much weaker, so the same horizontal state persists far longer in air.
4. `box3d.js@0.1.1` loses the native `b3CollisionPlane.push` mutation between separate `b3SolvePlanes` and `b3ClipVector` JS calls.
5. Consequently the apparent `b3ClipVector` path in current `ControllerOwnedCharacter` is effectively inert for these mover planes.
6. A faithful JS reconstruction matches native `b3SolvePlanes.delta` to very small numerical error and proves the missing push-state boundary directly.
7. Activating native-intended clipping is behaviorally significant in the recovered Owner anchor; it is not a harmless substrate correction.
8. Current A″ good feel therefore cannot be interpreted as evidence for the complete intended native mover contract. It is evidence for the actual runtime we have.

## What E2.3 does NOT demonstrate

- that current lack of grounded slide is itself a gameplay defect;
- that `groundDeceleration = 36 m/s²` should be reduced;
- that some arbitrary amount of slide should be added back;
- that the box3d.js binding should be patched in production immediately;
- that `b3ClipVector` should be permanently disabled;
- that intended native clipping is globally worse;
- that dynamic reciprocity magnitude is final;
- that A″ is the final controller architecture;
- that one velocity state or multiple source-aware states are required.

## Revised interpretation

The project should no longer frame the next problem as simply "restore physical slide".

There are now two independent policy boundaries:

1. **constraint velocity policy** — what should happen to velocity components blocked by geometric mover constraints, given that current binding semantics accidentally leave native clipping inactive;
2. **agency / momentum recovery** — how quickly player locomotion should consume or redirect physically acquired velocity once the character is grounded.

The current Owner-approved A″ behavior is a valuable reference specimen and should not be disturbed by a broad substrate fix before those questions are isolated.

## Natural boundary / next candidate

E2.3 stops before changing runtime.

The next candidate should ask a gameplay-relevant falsifier of the discovered constraint-velocity debt rather than patching the binding on principle. A useful question is:

> Does retaining velocity along a direction that the mover has geometrically blocked ever reappear as an observable unwanted release/corner/moving-constraint motion in ordinary A″ play?

If no meaningful pathology can be demonstrated, current no-clip behavior may remain an explicit controller policy despite the misleading binding call, and the next design question can move to agency/recovery only when Owner evidence requires it.

If a real latent-constraint-velocity pathology is demonstrated, the project should design the smallest explicit clipping policy it actually wants rather than silently inheriting a fixed wrapper's full native policy.

Do not automatically:

- restore `plane.push` in production;
- add slide/recoil memory;
- tune ground deceleration;
- reopen causal-component reciprocity;
- promote A″ to a final architecture winner.
