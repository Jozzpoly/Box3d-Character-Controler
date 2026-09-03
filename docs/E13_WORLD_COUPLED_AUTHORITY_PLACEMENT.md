# E13 — World-coupled authority placement and reaction boundary

Status: **closed research stage / external-world discrimination established / prepared-state engagement materially non-neutral / no runtime promotion**

Canonical base when E13 began:

`48f0a59eba21c7fd95a54d4c1263d76f7379d926`

E13 asks the question left open by E12.2b:

> **Once a dynamically supported player is genuinely coupled to an external world reference, do world-external and reciprocal authority placements cease to be merely Galilean variants, and can that world reaction be introduced without changing the mechanics we are trying to compare?**

The answer is two-part:

1. **Yes: genuine world coupling makes reaction placement physically observable.**
2. **No: in an actively prepared state, creating the tested unilateral world relation is itself a material physical interaction. It cannot be treated as neutral controller plumbing around an otherwise matched authority comparison.**

This stage does **not** select reciprocal or world-external authority for production.

---

## 1. Fixed inherited contracts

E13 preserves the accepted/research contracts inherited from E12 unless a subexperiment explicitly says otherwise:

- player interaction mass `80 kg`;
- dynamic support mass `800 kg`;
- gravity `20 m/s²`;
- normal support friction `μ=.95`;
- current launch demand `31 m/s²`;
- target speed `5.2 m/s`;
- finite posture authority `320 Nm`;
- outer `dt=1/60 s`;
- canonical `4` Box3D substeps;
- E5 load estimate `J_n~ = 0.5 × totalNormalImpulse`;
- E12 graded entitlement `q = clamp(μ × J_n~ / 25.3333, 0, 1)`;
- E12.2 fair placement rule: compare the same granted support-relative `Δv`, using player mass for world-external placement and reduced mass for equal-and-opposite reciprocal placement.

No E13 result promotes `q`, lead timing, world-stop mechanics or a new authority placement into A‴ / Donor v1.

---

## 2. E13.0a — direct wall contact failed the inactive representation gate

The first external-reference candidate used a static wall on the recoil side of the dynamic support.

The first harness placed the wall before the support completed settling and produced material pre-authority horizontal momentum in one mirror. That was a confounded setup, not placement evidence.

The corrected version settled first and derived the wall from the actual support state, but an exact tangent wall still produced inactive preload in one mirror.

Therefore:

> **A zero-gap contact wall was not representation-neutral enough for this comparison.**

This failure is preserved as provenance. It is not evidence against reciprocal authority or against external world coupling in general.

The failed E13.0a wall probe remains outside mandatory green smoke.

---

## 3. E13.0b — corrected prismatic unilateral world-stop binding: PASS

The next candidate used a static frame plus mirrored prismatic joint. The local positive axis is allowed travel; the lower limit is the recoil/world-stop side.

### Initial failure and source correction

The first isolated prismatic harness also failed: the lower limit did not block the exact E12 reciprocal recoil impulse.

Pinned Box2D source inspection found the concrete cause. The prismatic axial limit path is skipped when the joint is effectively `fixedRotation`. The harness had locked all support angular motion at body level; with a static frame this made the axial limit path inapplicable.

The correction therefore removed those body motion locks and used the same prismatic representation in both control and candidate:

- FREE and LIMIT: same static frame;
- same dynamic support;
- same mirrored prismatic joint;
- no motor;
- lower translation `0`;
- upper translation `60 m` = one support length;
- only causal difference: `enableLimit`.

No impulse, gap, mass, threshold or stiffness was tuned.

Corrected commit:

`ecf52960eb9bb0a0e33936e99f99833ae442de0b`

Workflow:

`33766819115` — **SUCCESS**

### Corrected result

Exact E12 `q=1` reciprocal recoil scale:

- reduced mass `72.727273 kg`;
- relative pulse `0.516667 m/s`;
- impulse `37.575758 N·s`.

Both mirrors reproduced the same result:

FREE recoil:

- post momentum `−37.575755 N·s`;
- world reaction `0`;
- support velocity `−0.0469697 m/s`;
- translation `−7.828e−4 m`.

LIMIT recoil:

- post momentum `0` to printed precision;
- world reaction `+37.575755 N·s`;
- support velocity `0`;
- translation `−8.365e−6 m`.

Allowed-direction motion remained identical between FREE and LIMIT to printed precision.

Conclusion:

> **On the pinned substrate, a prismatic lower limit can represent an initially neutral mirrored unilateral world reference at the exact E12 reciprocal recoil scale.**

This qualifies the isolated binding only.

---

## 4. E13.0c1 — embodied free-prismatic representation: PASS

Before testing the world stop with the player present, the free prismatic support had to preserve the already-qualified embodied mechanics.

The first E13.0c measurement mixed a constrained-Y solver position bias with the question of whether the prismatic representation had introduced an unintended extra physical degree of freedom. The gate was corrected rather than retuned: constrained-Y bias became explicit telemetry, while the representation comparison retained the existing material bands.

Corrected smoke head:

`45baad47f7962449376cb8b7d0b68a52a51a317e`

Workflow:

`33769039766` — **SUCCESS**

Representative corrected results in both mirrors:

- support load `26.6667 → 26.6667 N·s`;
- maximum load difference about `0.0002 N·s`;
- relative-Z difference `8.918e−5 m`;
- relative-V difference `7.717e−7 m/s`;
- torso/foot tilt difference effectively zero;
- support loss `0/0`;
- constrained X error about `1.43e−6 m`;
- constrained-Y static solver bias `1.548e−4 m`, retained explicitly;
- support rotation error `0`;
- prismatic binding error about `4.547e−13 m`.

Conclusion:

> **The free-prismatic support preserves the qualified passive embodied representation inside the predeclared mechanical bands.**

---

## 5. E13.0d — quiet embodied world-stop engagement: PASS / neutral

E13.0d then enabled the unilateral stop while the real finite player stood quietly on the already-qualified free-prismatic support.

Protocol:

- `90` frame settle;
- no locomotion/assist authority;
- both rigs receive identical `SetLimits([settled t0, t0 + 60 m])`;
- control keeps the limit disabled;
- candidate enables the lower limit;
- `60` passive observation frames.

No arbitrary wall gap or offset was introduced.

Exact smoke head:

`1818c5e7f6e2daf5f49a57ff16d94abbe1f63a24`

Workflow:

`33769533653` — **SUCCESS**

Both mirrors stayed far inside the existing transition/representation bands:

- first/max differential world impulse about `4e−5 N·s`;
- support load essentially unchanged;
- relative/support displacement and velocity differences on the order of `1e−8`;
- no material tilt difference;
- no support loss;
- no material lower-limit penetration.

Conclusion:

> **At the quiet settled state, enabling the zero-gap unilateral world relation is passive-neutral.**

Important limitation:

> **Quiet-state neutrality does not establish neutrality after the support has acquired world-relative motion.**

That distinction becomes decisive later in E13.

---

## 6. E13.1a — one-step world-coupled placement factorial: PASS

E13.1a finally introduced the external world reference as a causal factor around the exact E12 placement contract.

Factorial:

- placement `{world-external, reciprocal}`;
- unilateral stop `{OFF, ON}`;
- mirrors `±`;
- real finite player on the `800 kg` support.

All variants:

1. settle on the free-prismatic support;
2. earn a neutral physics-first `q`;
3. apply the same zero-gap limit geometry;
4. grant the same E12 support-relative current31 `Δv`;
5. observe exactly one outer solve.

No lead, authority stream or post-result tuning.

Exact smoke head:

`d9d11de695fe9b157bc4cb3c88473cf7738fdb75`

Workflow:

`33781161984` — **SUCCESS**

### Result

The world-external stop-OFF/ON pair was essentially unchanged:

- stop-isolated world effect approximately `0 N·s`.

The reciprocal pair was not:

- `dir=-`: stop-isolated world effect `33.177096 N·s`;
- `dir=+`: `33.177056 N·s`.

The matching reciprocal one-step authority impulse was about `37.576 N·s`, so this was not a numerical trace-level difference.

The stop also changed support-relative velocity after solve by about `−0.020…−0.023 m/s` for reciprocal placement while world-external remained effectively unchanged.

Conclusion:

> **Genuine world coupling breaks the isolated E12 Galilean ambiguity. Reaction placement becomes physically observable once the support has a real reaction path to the wider world.**

This still does not select which consequence is desirable for gameplay.

---

## 7. E13.1b — second-pulse persistence probe: protocol miss, preserved negative provenance

E13.1b asked whether the world reaction remained active under a second identical reciprocal grant.

To avoid comparing already-diverged histories, both causal copies received the same first world-coupled pulse. Only before pulse two did RELEASE disable the lower limit while CONTINUOUS left it enabled.

The experiment failed its own discrimination precondition:

- released recoil after pulse two was only about `60.3 µm` in one mirror and `56.3 µm` in the other;
- the already-paid discrimination band was `100 µm`.

Therefore the released control did not strongly re-cross the unilateral boundary. No persistence verdict is justified.

A non-mutating diagnostic exposed the already-computed pulse-two telemetry without changing mechanics:

- reciprocal continuous-vs-release world effect about `11.89 / 11.35 N·s`;
- but the lower-side crossing remained below the declared qualifying scale.

Exact diagnostic workflow:

`33782291633` — **FAILURE by the preserved qualification gate**

Interpretation:

> **The unilateral stop behaves as an intermittent contact-like reaction path, not a permanent momentum sink. The first reaction can move the support into the allowed side so the next identical grant may not materially encounter the stop.**

Do not rescue this result by changing pulse magnitude, gap, support mass or the predeclared crossing band.

E13.1b remains executable provenance outside mandatory green smoke.

---

## 8. E13.2a — bounded current31 world-coupled trajectory: PASS / diagnostic

The one-step result was real, but one pulse was insufficient to understand the state-history consequence. E13.2a therefore used a fixed bounded current31 trajectory rather than a feedback loop tuned to reach `5.2 m/s`.

Frozen protocol:

- placement `{world-external, reciprocal}` × stop `{OFF, ON}` × mirrors;
- `90f` settle + neutral q solve;
- zero-gap stop transition;
- exact `8f` current31 posture preparation;
- fixed `11f` nominal current31 command stream from `0` to `5.2 m/s`, including the final partial frame;
- each command frame grants only `q(previous solve) × requested Δv_rel`;
- then `60f` with zero translational authority.

No outcome gate required target speed, RECOVER, placement superiority, reaction magnitude or mirror agreement. Only already-qualified accounting/constraint contracts could fail the harness.

Exact head:

`6c699f344ab26d58197e6fd1810c12e17af45bd2`

Workflow:

`33784033453` — **SUCCESS**

### Main observations

For reciprocal placement, stop ON produced large cumulative wider-world momentum changes during the ramp relative to stop OFF:

- `dir=-`: about `174.107 N·s` stop-isolated ramp world effect;
- `dir=+`: about `153.260 N·s`.

The corresponding world-external stop-isolated effects were much smaller:

- about `+6.357 N·s` in one mirror;
- approximately `0` in the other.

The reciprocal stop also reduced achieved ramp-end support-relative velocity relative to reciprocal OFF by roughly:

- `0.140 m/s`;
- `0.090 m/s`.

Most importantly, the stop was already doing substantial work **during the eight lead frames before translational authority began**:

- lead ON−OFF world effect about `56.829 N·s`;
- `68.550 N·s` in the opposite mirror.

The player later fell in all variants of this diagnostic trajectory and achieved only about `2.66–2.87 m/s` support-relative ramp-end speed as load/entitlement degraded. Those are observations of this bounded specimen, not a replacement Donor qualification.

Durable inference:

> **Once the support is actively preparing and moving relative to the world, the unilateral external reference is already part of the posture mechanics before translational authority is applied.**

That made a cleaner prepared-state engagement test necessary.

---

## 9. E13.2b — prepared-state world-stop engagement: PASS harness / MATERIAL physical verdict

E13.2b isolates exactly the issue exposed by E13.2a.

For each mirror, two physically matched copies perform:

1. free-prismatic `90f` settle;
2. exact `8f` current31 lead posture with **no translational authority**;
3. verify matched, reactive, non-fallen prepared states;
4. read the actual current prismatic translation `tLead`;
5. both receive identical `SetLimits([tLead, tLead+60m])`;
6. control remains limit OFF;
7. candidate only enables the lower limit;
8. API transition must be state-mutation-free;
9. both receive the same one-frame internal equal-and-opposite posture actuation;
10. exactly one Box3D outer solve.

There is:

- no authority pulse;
- no arbitrary gap;
- no support reset;
- no body reset;
- no threshold chosen from the observed result.

The classification reuses previously-paid transition/representation bands. Script `PASS` means the measurement harness completed; physical engagement is separately classified `NEUTRAL` or `MATERIAL`.

Exact research head:

`119ae4c53a678becfb454bc9322f437b043ad20c`

Full exact-head workflow:

`33784599133` — **SUCCESS**

Because the full Actions log exceeded the connector's readable response size, a tooling-only branch was created from this exact head and changed only smoke-suite membership to run the unchanged E13.2b script alone. Short workflow `33785159501` reproduced/exposed the script telemetry; the temporary diagnostic ref was then reset exactly to `119ae4c5…`. This was a log-extraction workaround, not a research-mechanics change.

### Result: MATERIAL / MATERIAL

#### `dir=-`

Prepared state:

- `tLead = −4.308277e−3 m`;
- `q=.801`;
- load `21.355 N·s`;
- support velocity `−0.068837 m/s` toward the newly created lower boundary;
- torso tilt `9.397°`;
- torso angular speed `1.9855 rad/s`.

One-solve combined horizontal momentum change:

- control: `−0.015992 N·s`;
- candidate: `+80.777926 N·s`;
- differential world impulse: **`80.793918 N·s`**.

Candidate-control also produced material relative/support velocity and angular-velocity differences. The lower-limit penetration itself stayed inside the qualified `1e−4 m` constraint band.

Physical verdict: **MATERIAL**.

#### `dir=+`

Prepared state:

- `tLead = −4.649593e−3 m`;
- `q=1.000`;
- load `39.218 N·s`;
- support velocity `−0.082526 m/s` toward the newly created lower boundary;
- torso tilt `8.777°`;
- torso angular speed `1.5063 rad/s`.

One-solve combined horizontal momentum change:

- control: `−0.017018 N·s`;
- candidate: `+72.331338 N·s`;
- differential world impulse: **`72.348356 N·s`**.

The same family of predeclared relative/support/angular-velocity bands was materially exceeded.

Physical verdict: **MATERIAL**.

### Meaning

The API operation itself remained body-state neutral before solve. The material event appears when physics is allowed to resolve the newly created world constraint against an already moving prepared support.

Therefore:

> **Engaging the qualified unilateral world reference at the exact current prepared state is itself a large real physical event, even with zero translational authority.**

And therefore:

> **A late-created reciprocal world reaction path cannot be treated as hidden-neutral controller plumbing around an otherwise matched active player/support system.**

---

## 10. What E13 establishes

E13 closes the immediate placement-boundary question with five durable findings.

### 10.1 Genuine external coupling is a real discriminator

E12.2b showed that fair placement variants on an isolated free player+support pair are almost Galilean-equivalent in local behavior.

E13.1a shows that once a real world reaction path exists, that equivalence ends: reciprocal support recoil can be transferred into the external world while world-external placement follows a different whole-system momentum history.

### 10.2 A unilateral world reaction path is intermittent

The E13.1b protocol miss and E13.2a trace both show that the stop behaves like a real one-sided interaction. It does not continuously absorb recoil merely because it exists; support can separate into the allowed side and later re-encounter it.

### 10.3 Quiet neutrality does not imply active-state neutrality

E13.0d legitimately proves that zero-gap engagement can be passive-neutral at a settled state.

E13.2b equally legitimately proves that the same type of engagement after lead8 is **material** because the support already has world-relative velocity and posture-driven state.

### 10.4 Reaction placement becomes inseparable from environmental history

Once an external reference is physically real, the state in which contact/constraint begins matters. The reaction path cannot be added after the fact while claiming the surrounding mechanics were unchanged.

### 10.5 Momentum purity is not enough to choose gameplay architecture

Reciprocal placement is not automatically better because it can preserve equal-and-opposite accounting before external interaction. World-external placement is not automatically better because it avoids the tested stop interaction.

The project still chooses mechanics by causal honesty **and gameplay value**, not conservation aesthetics alone.

---

## 11. What E13 does not prove or select

E13 does **not** prove:

- that reciprocal locomotion authority is bad;
- that world-external locomotion authority should remain the final production architecture;
- that every natural wall/terrain/anchored interaction creates the same response as this prismatic stop;
- that a naturally pre-existing world brace cannot legitimately carry locomotion reaction;
- a production rule for when authority should be reciprocal;
- a production formula for `q`;
- accepted current31/current36 gameplay feel on dynamic/world-coupled support;
- disturbance robustness, moving-platform gameplay, braking or Owner feel for an E13 mechanism.

E13 also does not justify inventing a spring stiffness, wall gap, clutch timing, stop placement or mass merely to manufacture a more convenient reaction history.

---

## 12. Durable boundary after E13

The key architectural correction is:

> **Do not manufacture a world reaction path at the moment authority needs somewhere to react and then treat that path as causally neutral. If the external world carries reaction, that environmental coupling must already exist as part of the physical/gameplay situation, with its history and consequences left visible.**

The next high-value problem is therefore no longer:

> “How do we make reciprocal placement show a difference?”

E13 already answered that.

The better question is:

> **Which naturally present environmental relationships should legitimately carry player-authority reaction, and when should accepted agency remain explicitly controller/world-external instead?**

A future specimen should make the external coupling **ecological rather than manufactured**. Examples may include:

- a support already braced/anchored by the level before player intent;
- an externally driven support;
- a third-body/environment interaction whose contact history exists independently of the authority command.

The reaction topology must precede the comparison; do not create a zero-gap stop at the current state merely to harvest a reciprocal reaction.

This is a **contextual reaction-ownership / environmental-causality** problem, not another E12 entitlement sweep and not another E13 stop-tuning exercise.

---

## 13. Smoke and provenance

Mandatory positive E13 research smoke at closure:

- `scripts/e13-0b-prismatic-world-stop-binding.mjs`;
- `scripts/e13-0c1-embodied-free-prismatic-representation.mjs`;
- `scripts/e13-0d-embodied-world-stop-neutrality.mjs`;
- `scripts/e13-1a-world-coupled-placement-factorial.mjs`;
- `scripts/e13-2a-current31-world-coupled-trajectory.mjs`;
- `scripts/e13-2b-prepared-world-stop-engagement.mjs`.

Preserved negative/confounded/protocol-miss E13 provenance outside mandatory green smoke includes:

- E13.0a direct wall-contact variants;
- initial locked-body E13.0b failure before the source-backed `fixedRotation` correction;
- first/confounded E13.0c measurement interpretation;
- E13.1b second-pulse persistence probe and diagnostic.

Do not rewrite those failures into PASS merely for a clean history.

---

## 14. Runtime consequence

None.

The public/default runtime remains **A‴ / Donor v1**. E13 is machine research only.

No E13 result changes:

- `31 m/s²` accepted acceleration;
- `36 m/s²` accepted braking;
- Donor v1 representation;
- public controls;
- runtime support/authority policy.

E13 closes an architecture boundary and sharpens the next research question. It does not promote an implementation.