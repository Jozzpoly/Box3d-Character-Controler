# E2.2b — Post-contact Momentum Persistence Localization

Status: **diagnostic complete; runtime unchanged; new policy/model boundary identified**.

Exact machine-qualified diagnostic specimen before documentation: `462334ce98199eb1f66f832c032ab49e408567c5`.

## Why this follow-up exists

Owner free play of public A′ (`3`, causal-component reciprocity) produced a materially better result than frozen A, but did **not** close the original feel complaint.

Owner judgement after comparing the public modes:

> A′ is better, but after a physical bounce there is still an exaggerated slippery tail. A small amount of slide is desirable; the current amount is not.

Video review suggested that E2.2 removed much of the earlier edge-launch amplification, while a second failure family remained: after the contact itself ended, lateral motion could remain perceptibly active for too long.

The immediate implementation fact was also suspicious:

- dynamic reciprocity adds the horizontal reaction directly to `velocity`;
- the same horizontal reaction is also added to `externalVelocity`;
- locomotion then targets `desiredVelocity + externalVelocity`;
- airborne `externalVelocity` decays slowly (`externalAirDrag = 0.22`);
- ordinary airborne no-input recovery of `velocity` is also weak (`airDeceleration = 1.2 m/s²`).

However, `externalVelocity` is not exclusively contact recoil. It also stores intentionally useful momentum inherited from moving support at jump. Therefore simply increasing global airborne damping would conflate two physically different situations.

E2.2b asked:

> Is A′'s remaining post-bounce slide primarily a bad global decay constant, or does the current state model entangle distinct momentum sources and persistence channels in a way that requires a more explicit policy decision?

## Scope

E2.2b is diagnostic only.

It does **not**:

- change A, A′ or B runtime behavior;
- choose a new drag/deceleration constant;
- change the causal-component reciprocity rule;
- alter terrain negotiation;
- add a new architecture or framework;
- claim that every Owner-observed slide has exactly the same causal path as the synthetic isolate.

Frozen Foundation 02.1, E2, E2.1 and E2.2 gates still run first.

## Methodological correction

The first zero-gravity contact-tail fixture was invalid.

The dynamic donor body remained in contact with the mover for the whole run, so the supposed "post-contact" displacement samples collapsed to the final frame. It still showed that a contact-generated external state could remain large (`2.57 m/s` peak and `1.77 m/s` after the nominal 0.5 s sample at the default air drag), but it did **not** establish a post-contact tail.

That fixture was rejected and corrected rather than treating its output as evidence for the hypothesis.

The corrected fixture:

1. creates a clean horizontal airborne dynamic ram in zero gravity;
2. records the real A′ contact reaction;
3. immediately kicks the donor body away **after** the first measured contact, creating a bounded no-contact interval;
4. observes the subsequent motion with zero player input;
5. applies test-local post-contact damping only after contact has ended when testing individual state channels.

Zero gravity is deliberate causal isolation, not a gameplay approximation.

## Corrected contact-tail baseline

With current A′ settings:

- peak contact-generated `externalVelocity`: `2.57 m/s`;
- peak horizontal `velocity`: `2.57 m/s`;
- peak manual contact impulse: `205.9 N·s`;
- post-contact displacement after `0.25 s`: `0.623 m`;
- after `0.50 s`: `1.212 m`;
- after `1.00 s`: `2.298 m`;
- after `0.50 s`, both horizontal `externalVelocity` and ordinary horizontal `velocity` remain about `2.30 m/s`.

This isolate therefore reproduces a large, long-lived no-input post-contact tail without requiring the old E2.1 cross-axis edge amplification.

## Global recovery probes

Four global airborne policies were compared while keeping the collision itself unchanged.

| policy | contact tail at 0.50 s | ext at 0.50 s | velocity at 0.50 s | moving-support jump carry at 0.50 s |
| --- | ---: | ---: | ---: | ---: |
| current (`airDrag=.22`, `airDecel=1.2`) | `1.212 m` | `2.30` | `2.30` | `0.734 m` |
| `airDrag=2`, decel unchanged | `1.122 m` | `0.92` | `1.95` | `0.620 m` |
| drag unchanged, `airDecel=4` | `1.212 m` | `2.30` | `2.30` | `0.734 m` |
| `airDrag=2` + `airDecel=4` | `0.786 m` | `0.92` | `0.92` | `0.491 m` |

Important consequences:

1. **Increasing only `externalAirDrag` is weak against the actual displacement tail.** External state falls sharply, but ordinary `velocity` remains high and continues moving the player.
2. **Increasing only `airDeceleration` does essentially nothing here.** Current `velocity` and the `externalVelocity` target begin equal, so a stronger rate toward that same target has no useful work to do.
3. **Increasing both works much better on the contact tail**, but also cuts the valid moving-support jump carry from about `0.734 m` to `0.491 m` over the same half-second.

So the simple global solution is causally entangled with behavior that E2.1 already identified as intentional and proportional.

## Test-local channel probes

To localize state ownership of the tail without changing production, extra post-contact damping was applied separately to the two horizontal state channels after the donor body had left contact.

All variants preserved the same immediate collision (`2.57 m/s` peak external, `2.57 m/s` peak velocity, same contact impulse).

| test-local post-contact policy | tail at 0.50 s | ext at 0.50 s | velocity at 0.50 s | ratio vs baseline tail |
| --- | ---: | ---: | ---: | ---: |
| none | `1.212 m` | `2.30` | `2.30` | `1.00` |
| damp `externalVelocity` only | `1.127 m` | `0.29` | `1.96` | `0.93` |
| damp `velocity` only | `0.626 m` | `2.30` | `0.58` | `0.52` |
| damp both | `0.515 m` | `0.29` | `0.29` | `0.43` |

This is a more precise result than the initial video hypothesis.

### Current causal interpretation

The post-contact tail is **not primarily a single `externalVelocity` damping bug**.

- ordinary `velocity` is the dominant immediate carrier of continued displacement in this isolate;
- `externalVelocity` acts as a persistent target that helps keep/rebuild that motion;
- writing the same physical reaction into both channels creates a coupled persistence path;
- damping only one channel leaves the other capable of sustaining a substantial tail.

A concise model is:

> **contact consequence is applied once physically, but represented twice in controller state: as current motion and as remembered external target.**

That duplication was originally useful for preserving world authority against immediate player-control cancellation, but Owner evidence now shows that its airborne recovery policy can keep the player a passenger for too long.

## Source entanglement

The same `externalVelocity` field also carries moving-support launch momentum.

Current translating-support jump control:

- support point velocity at jump: `1.50 m/s`;
- inherited external velocity: `1.50 m/s`;
- horizontal carry over the next `0.50 s`: about `0.734 m`.

A global policy strong enough to materially reduce the contact tail (`airDrag=2` + `airDecel=4`) reduces that carry to about `0.491 m`.

This does **not** prove that `0.734 m` is the final correct feel. It proves that one shared decay policy changes two semantically different consequences at once.

## What is now demonstrated

E2.2 remains valid: causal-component reciprocity removed the dominant cross-axis edge amplification without weakening the tested pure-axis interactions.

E2.2b adds a second demonstrated boundary:

1. the remaining Owner-observed excessive slide is consistent with a real post-contact persistence mechanism independent of the old edge-launch bug;
2. that persistence is co-owned by ordinary `velocity` plus remembered `externalVelocity`;
3. `velocity` is the larger immediate displacement carrier in the corrected isolate;
4. `externalVelocity` still materially participates by remaining the locomotion target;
5. stronger global airborne recovery can reduce the tail;
6. the same global policy materially changes valid moving-support jump carry;
7. therefore the next implementation move cannot be justified as "turn up one drag constant" without deciding what kinds of external consequence should share state and recovery semantics.

## What is NOT demonstrated

E2.2b does not establish that:

- every residual Owner slide is caused only by these two state channels;
- contact recoil should have zero memory;
- support momentum should remain exactly at the current magnitude;
- the correct answer is necessarily multiple `externalVelocity` vectors;
- contact impulses should update only `velocity`;
- a source-tagged momentum system is required;
- A′ has beaten solver-owned representation;
- B terrain negotiation should be abandoned.

Those are now design hypotheses, not evidence.

## New stage boundary

A real policy/model decision has appeared.

Before changing production A′, the project must decide the smallest falsifiable representation of **external physical consequence versus player recovery** that can answer questions such as:

- Should contact impulse, support carry and other world-derived motion share one remembered state at all?
- Should a physical contact reaction directly modify current velocity but use a separately bounded/short-lived agency lock rather than duplicating the same vector into a long-lived target?
- Should persistence depend on source, contact phase, grounded/airborne phase, magnitude, or some more general physical invariant?
- How much residual slide is desirable before player agency should recover?

The Owner has already supplied one important judgement: **some slide is desirable; the current tail is excessive**. That is not enough to choose among the above representations without another bounded experiment.

Therefore E2.2b stops here.

Do not automatically:

- tune `externalAirDrag` or `airDeceleration` on production A′;
- split `externalVelocity` into multiple channels without a falsifiable reason;
- remove recoil persistence entirely;
- alter moving-support inheritance;
- start B terrain negotiation;
- promote A′ to accepted baseline.

The next stage must first choose the smallest experiment that distinguishes competing recovery/state representations while preserving the already demonstrated E2.2 causal reciprocity result.
