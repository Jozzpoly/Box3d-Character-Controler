# E3.1i–k — Support transition semantics

Status: **research evidence; no player/runtime policy promoted**

Base `main` for this stage:

`2e9f2f02b0b92764e2d7426b4a789f91f347863b`

This stage follows the E3.1 Owner-positive balance result and the E3.1d–h causal decomposition. Its question is deliberately narrower than jump/locomotion design:

> What does “support exists” actually mean at the boundary where support is lost or acquired, and does the start-of-step contact observation create material balance authority artifacts?

The stage does not add locomotion, jump behavior, airborne attitude control, stepping, articulation or a new Donor revision.

## Starting model

E3.1h used a diagnostic support gate based on the presence of near-vertical foot contact manifold points. That gate cleanly removed the zero-gravity reaction-wheel channel while preserving the tested grounded `64 R / 80 F` direct boundary and `3 m/s R / 4 m/s F` dynamic-ram boundary.

However, E3.1h mostly tested stable grounded versus fully unsupported states. It did not qualify the transition itself.

The execution lifecycle is:

1. read support state retained from the previous solve;
2. run balance `preStep`;
3. step Box3D;
4. observe the new contact manifold.

That ordering creates a possible one-solve observation delay. E3.1i–k was built to determine whether that delay is material and, more importantly, what contact signal is actually meaningful near takeoff/landing.

---

## E3.1i — explicit asynchronous transition latency

First implementation had a confounded support-loss control: a passive specimen was compared after a different 60-frame grounded history. That comparison was rejected and removed. The accepted support-loss A/B uses two specimens with identical grounded history until the transition event.

Canonical corrected run before later extension:

`33640657822`

### Asynchronous support loss

The ground was deliberately removed between contact observation and the next Box3D solve. This represents an out-of-band support invalidation such as a platform being teleported/destroyed, not an ordinary jump.

The cached-manifold policy therefore spent one stale support tick while an event-oracle test control knew that the support had been invalidated.

Measured deltas:

- `24 N·s`: stale torque `232.2 Nm`, angular impulse `3.870 N·m·s`, `Δω = 0.6083 rad/s`, about `55.0%` of pre-step `|ω|`;
- `48 N·s`: stale torque `320 Nm`, `5.333 N·m·s`, `Δω = 0.8355 rad/s`, about `37.8%`;
- `64 N·s`: stale torque `320 Nm`, `5.333 N·m·s`, `Δω = 0.8361 rad/s`, about `28.4%`.

Therefore asynchronous support invalidation can make cached support materially stale for one balance step.

This result must **not** be generalized to normal physics-driven takeoff without a separate test.

### Explicit support reacquisition

The reciprocal synthetic case restored the floor immediately before a solve while the cached state was unsupported.

The event-oracle upper-bound control could apply the first `3.870..5.333 N·m·s` balance impulse immediately; the normal lagged path could not know about the new contact until after the solve.

Observed one-step `Δω / pre-step |ω|` was about `0.6..5.3%` across the tested cases.

Again, the event oracle is a causal upper bound, **not** a proposed production implementation: a real physics controller cannot generally know in `preStep` that a predictive collision will be created by the upcoming solve.

---

## E3.1j — physics-driven takeoff/landing and contact-signal decomposition

The first E3.1j harness assumed that a modest physical launch would make the support manifold disappear quickly. It failed at `1 m/s` launch. This was treated as a harness/model failure rather than “insufficient jump speed”.

The probe was rewritten to separate three signals exposed by the exact `box3d.js@0.1.1` manifold points:

1. **manifold presence** — at least one near-vertical manifold point exists;
2. **geometric touching** — at least one relevant point has `separation <= 0`;
3. **solver load** — at least one relevant point carries positive `normalImpulse` or `totalNormalImpulse` above the diagnostic epsilon.

These signals are not interchangeable.

Canonical run:

`33641366198`

### Physics-driven takeoff

At a strong `7.2 m/s` shared upward launch, the support manifold disappeared during the physics solve in all tested `24/48/64 N·s` perturbations. The **immediately following full controller tick applied `0 Nm`**.

Therefore normal takeoff did not reproduce E3.1i's whole post-loss stale-support tick.

This is a critical distinction:

> Start-of-step support is not automatically “wrong” on the solve in which a physically valid contact is being lost. The support reaction may still exist during part of that solve, and once the manifold is actually gone the next full tick is unsupported.

A smaller/more complex `64 N·s + 3 m/s` case exposed a different residual:

- manifold remained present;
- for `2` controller frames it was neither geometrically touching nor carrying solver load;
- the bare-manifold policy still allowed balance actuation;
- total actuation during those speculative-only frames was `1.161 N·m·s`.

That is a clean but much narrower airborne leak than the synthetic asynchronous E3.1i case.

### Physics-driven landing

All five tested landings first exposed a relevant manifold at approximately **`+5 mm` separation**. No `separation <= 0` touching point had yet appeared, but the same solve already reported positive support load.

Representative timelines:

- `24 N·s`, drop `0.25 m`: manifold/load frame `9`, first separation `+5.00 mm`;
- `48 N·s`, drop `0.25 m`: frame `9`, `+5.00 mm`;
- `48 N·s`, drop `0.50 m`: frame `13`, `+5.00 mm`;
- `48 N·s`, drop `0.25 m`, initial downward `2 m/s`: frame `5`, `+5.00 mm`;
- `64 N·s`, drop `0.50 m`: frame `13`, `+5.00 mm`.

The balance controller necessarily applied `0 Nm` on the solve that first created that predictive contact, because its preStep occurred before the solver exposed it. On the next tick the cached support was available and the controller applied the corresponding finite torque.

Durable correction:

> `separation <= 0` is not a complete definition of reactive support. Box3D can transmit a real predictive contact impulse while surfaces are still positively separated.

Likewise, bare manifold presence is broader than demonstrated reactive support because a manifold can persist briefly without touching or load.

---

## E3.1k — support-signal policy falsifier

The evidence suggested a deliberately non-distance-tuned diagnostic candidate:

> **reactive support = near-vertical manifold where at least one point is geometrically touching OR at least one point carried solver load in the last solve.**

Equivalently:

```text
reactiveSupport = touchingPointExists || loadedPointExists
```

This is not claimed as a final player-support ontology. It is a falsification candidate designed to reject only the demonstrated `manifold && !touching && !loaded` leak while preserving predictive loaded contact and quiet resting support.

An initial run reached the final takeoff section and then failed due to a JavaScript harness bug: a default destructured options argument did not itself default to `{}`. No physics criterion was changed. The corrected exact-head run was:

`33641951795`

Head:

`25ef910a6165edab36861a4787bdbabea3fa3c24`

Full research smoke, Donor v0/v1 gates, mobile-input gate and production build succeeded.

### Quiet grounded support

Over the final `120` settled frames:

- manifold: `0/120` false support frames;
- reactive: `0/120` false support frames;
- load-only negative control also happened to remain loaded throughout this specific quiet specimen.

All three saw a stable manifold; minimum separation was about `-1.907 mm` and final tilt `0°`.

This does **not** overturn the earlier E3.1g warning that instantaneous impulse should not be treated as a universal persistent-support boolean. It only says this particular E3 organism remained solver-loaded in the E3.1k quiet matrix.

### Grounded behavior preservation

Direct boundary:

- manifold: `64 RECOVER`, `80 FALL`, peak tilts `11.8° / 91.5°`;
- reactive: identical observed outcomes and peak tilts.

35 kg dynamic ram:

- manifold: `3 m/s RECOVER`, `4 m/s FALL`, peaks `7.7° / 91.1°`;
- reactive: identical observed outcomes and peaks.

Thus the reactive candidate did not perturb the already Owner-relevant grounded envelope tested here.

### Reproduced takeoff leak

`64 N·s + 3 m/s` physics-driven takeoff:

- bare manifold policy: peak tilt `3.58°`, `2` speculative-only actuation frames, total `1.161 N·m·s`;
- reactive candidate: peak tilt `4.40°`, `0` speculative-only actuation frames, `0 N·m·s`; three manifold-only/non-reactive cached frames were rejected by the policy.

The increased peak tilt is useful evidence rather than a regression to hide: removing unsupported corrective authority makes the body slightly less able to self-correct after takeoff.

Strongest E3.1k result:

> **`touching OR solver-loaded` preserves the tested grounded balance/ram behavior while eliminating the reproduced manifold-only/no-touch/no-load takeoff actuation.**

It is a **diagnostic survivor**, not promoted runtime behavior.

---

## Current support semantics model

The transition loop rejects the idea that support is a single trivial boolean derived from one contact property.

Current evidence supports these distinctions:

### Contact manifold envelope

A near-vertical manifold means Box3D is tracking a candidate support constraint. It may represent:

- penetrating/touching contact;
- predictive loaded contact;
- briefly retained speculative/no-load contact.

Therefore manifold presence is useful but broader than proven reactive support.

### Reactive support evidence

For the tested E3 organism, either:

- geometric touching, or
- actual solver load from the previous solve

is enough to justify that the support constraint demonstrated a physical reaction channel.

The `touching OR loaded` rule survived the current falsifier without arbitrary separation tuning.

### Async invalidation

If support is externally invalidated **between** solves — destroyed/teleported platform, explicit world edit, etc. — previous-solve contact data can remain stale by construction.

That is not the same problem as normal takeoff. A future system that performs such world mutations may need to invalidate support authority explicitly as part of the event/ownership contract rather than hoping contact polling can predict it.

### Landing latency

A controller whose authority is decided before the Box3D solve cannot use a support contact that the upcoming solve has not yet produced.

The first predictive landing solve can already carry physical load; the controller can respond on the next preStep. The current stage does not demonstrate that this one-step response latency is gameplay-significant enough to justify prediction or a different lifecycle.

---

## Rejected / corrected interpretations

- **“one cached support tick is necessarily a normal jump bug”** — rejected; physics-driven takeoff does not show a whole post-manifold-loss stale tick.
- **“manifold points are exact physical support truth”** — too broad; a no-touch/no-load speculative tail was reproduced.
- **“touching means support, separation means airborne”** — false; predictive landing contact carried solver load at `+5 mm` separation.
- **“positive impulse alone is the universal persistent support boolean”** — still unsupported; prior E3.1g showed why load must not silently replace contact persistence semantics everywhere.
- **“event oracle should be implemented”** — rejected as an interpretation; it exists only to bound observation-latency effects.

---

## Explicit non-claims

This stage does **not** prove:

- that `touching OR loaded` is the final player support policy;
- that the diagnostic `1e-5` load epsilon is a final gameplay constant;
- that support must be binary in the eventual controller;
- that a one-step landing response delay is perceptually important;
- that airborne body attitude control should be absent;
- that jump/landing locomotion is solved;
- that the spherical foot+torso organism is an anatomical model;
- that E3 should now replace A‴;
- that a Donor v2 is justified;
- that stepping, hip strategy or active ragdoll should start automatically.

No `src/` behavior was changed by E3.1i–k.

---

## Natural boundary

The question that opened this stage is sufficiently answered for the current specimen:

> **Support transition semantics are more nuanced than a cached manifold boolean, but normal physics-driven takeoff does not exhibit the large whole-tick stale-authority artifact suggested by synthetic asynchronous invalidation. A smaller manifold-only speculative leak exists and can be removed by a touching-or-loaded diagnostic signal without changing the tested grounded balance envelope.**

This closes the immediate support-transition uncertainty.

The next large research question should be selected separately. Plausible candidates include deliberately bounded internal angular-momentum / hip-like recovery, designed support relocation/stepping, or a first bounded balance+locomotion integration crucible. Do not choose among them merely because the transition stage is complete; choose by information gain and project need.
