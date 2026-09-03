# E11 — Physics-first residual authority and anti-masking boundary

Status: **closed research stage / mixed diagnostic evidence / no runtime promotion**

Canonical base when E11 began:

`412e16cd913753e192cce559097af3e693681890`

E11 was opened only after E10 closed the cheap one-piece physical support-brace route. It does **not** select a hybrid player, tune accepted A‴ agency, or change runtime/Donor behavior.

## 1. Why E11 existed

E5 established that the current single-support finite organism physically earns a majority, but not all, of accepted current31 translational authority. E5.2 also showed that a world-external residual can close response gaps while displacing physical contact contribution and even rescuing a physically failing solver-resolution case.

E6–E10 then investigated several low-complexity physical alternatives. None established stable/regulatable extra support capacity without first paying unacceptable representation cost or failing the load-path prerequisite.

E11 therefore returned to the assist side of the E5 fork, but with a stricter causal question:

> **Can nonreciprocal residual authority preserve accepted agency while remaining genuinely subordinate to physically earned support, rather than merely being contact-gated decoration?**

The first suspected E5.2 confound was sequencing. E5.2 applies residual impulse before the Box3D solve of that outer frame, so residual authority can alter the same contact solve whose physical contribution is later interpreted.

E11 begins by giving physics unconditional same-frame priority.

Common declared specimen unless noted otherwise:

- exact E5/E4 sagittal finite organism;
- total mass `80 kg`;
- gravity `20 m/s²`;
- current launch `31 m/s²`;
- target speed `5.2 m/s`;
- lead `8` frames;
- finite posture authority `320 Nm`;
- fixed `1/60 s` outer step;
- canonical `4` Box3D substeps;
- mirrored sagittal directions;
- ordinary research support friction `μ=.95` unless a counterfactual explicitly changes it.

No E11 experiment weakens accepted `31 m/s²` agency.

## 2. E11.0a — physics-first locked-deficit residual

Probe:

`scripts/e11-0a-physics-first-locked-deficit-residual.mjs`

### Question

> **If contact physics always acts before residual authority, can a world-external residual limited to the deficit measured in a separate physical-only control reproduce accepted current31 without materially displacing the physical support contribution?**

### Sequencing

Each ramp frame is:

1. finite posture command;
2. Box3D/contact solve;
3. measure exact whole-body horizontal `ΔP` earned during that solve;
4. only then consider mass-proportional world-external residual impulse.

Residual eligibility additionally requires:

- support existed before the solve;
- support still exists after the solve;
- the same frame produced positive intent-aligned whole-body physical horizontal impulse.

Per-frame residual is bounded by accepted current31 impulse:

`80 × 31 × 1/60 = 41.3333 N·s`

The **total** residual budget is not tuned. For each mirrored direction a separate physical-only control first determines:

`locked deficit = required accepted ramp impulse − measured physical-only ramp impulse`

That budget is frozen before the candidate runs and can never expand if prior residual impulses later reduce contact contribution.

### Predeclared gates

E11.0a reused existing paid-for boundaries:

- existing E5.2 near-match: `|v_end − 5.2| <= 0.10 m/s`;
- candidate remains `RECOVER`;
- zero support loss;
- zero residual while unsupported or after nonpositive same-frame physical contribution;
- total residual does not exceed locked physical-only deficit;
- per-frame residual does not exceed `41.3333 N·s`;
- physical support fraction may drop by at most `0.05` versus matched physical-only control, reusing the old E6 whole-body impulse-fraction representation envelope;
- mirrored candidate speed gap `<=0.15 m/s`;
- mirrored physical-share gap `<=0.035`.

No deficit interpolation or residual-cap sweep was allowed.

### Exact evidence

The first run stopped after the first failing mirror. A reporting-only correction then collected both mirrors before raising the failure; it changed no mechanics, budgets or thresholds.

Full mirrored negative head:

`dc6c34f792bde05345d630bdb08eb3e77a7c21ba`

Workflow:

`33750302388` — expected FAILURE at E11.0a.

Physical-only references:

| direction | outcome | launch speed | ramp-end speed | required | physical impulse | physical fraction | locked deficit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `-` | RECOVER | `0.7124` | `4.2040` | `359.01 N·s` | `279.33 N·s` | `0.7781` | `79.68 N·s` |
| `+` | RECOVER | `0.8561` | `4.2161` | `347.51 N·s` | `268.80 N·s` | `0.7735` | `78.71 N·s` |

Physics-first fixed-deficit candidates:

| direction | outcome | ramp-end speed | speed error | physical impulse/fraction | residual impulse/fraction | total fraction | physical-share drop | support loss |
| --- | --- | ---: | ---: | --- | --- | ---: | ---: | ---: |
| `-` | RECOVER | `4.8491` | `0.3509` | `251.26 / 0.6999` | `79.68 / 0.2219` | `0.9218` | `0.0782` | `0` |
| `+` | RECOVER | `4.8853` | `0.3147` | `243.63 / 0.7011` | `78.71 / 0.2265` | `0.9276` | `0.0724` | `0` |

Both candidates consumed exactly the previously locked deficit, retained support and remained `RECOVER`. They still missed accepted ramp response and exceeded the declared `0.05` physical-share-drop gate.

Tiny numerical momentum-accounting residuals also exceeded the script's initial overly strict epsilon in the full output. They are not the causal failure and are not used to rescue or reinterpret the experiment.

### E11.0a result

> **Giving contact physics same-frame priority does not make a world-external residual independently additive. Prior residual impulses change subsequent contact response; a total external budget frozen from the physical-only deficit is therefore insufficient to reproduce the accepted ramp while also preserving the original absolute physical impulse share.**

This removed the narrow hypothesis that E5.2's interaction was merely caused by applying assist before the same-frame solver.

It did **not** establish that the lower later physical impulse represented degraded support capacity. That became the next diagnostic question.

E11.0a remains executable negative provenance outside mandatory green smoke.

## 3. E11.1a — residual/contact interaction decomposition

Probe:

`scripts/e11-1a-residual-contact-interaction-decomposition.mjs`

### Question

> **When prior residual impulses reduce later physical horizontal impulse, is the physical substrate losing load/posture capacity, or does the residual simply reduce relative slip and therefore reduce how much frictional impulse the contact needs to provide?**

E11.1a changes no authority and introduces no tuning. It reproduces the exact E11.0a physical-only and fixed-deficit candidate while recording per-frame:

- platform speed;
- whole-body speed before solve, after physics and after residual;
- pre-solve relative slip;
- exact whole-body physical horizontal `ΔP`;
- residual impulse;
- E5.0a-calibrated `0.5 × totalNormalImpulse` load estimate;
- corresponding `μJ_n` diagnostic budget;
- torso/foot posture and finite torque.

The script qualifies only that the known supported RECOVER controls are reproduced, the fixed-deficit candidate consumes the exact declared deficit, and momentum accounting closes to a diagnostic tolerance.

Exact positive diagnostic head:

`f0d9804e72c79ec0369ce0fe4d92c0b29e2e916e`

Workflow:

`33750781303` — SUCCESS; full research smoke, Donor smoke and build passed.

### Results

Direction `-`:

- physical impulse: `279.33 → 251.26 N·s` (`−28.07`);
- positive relative-slip area: `8.6434 → 4.7903 m/s·frame` (`−44.6%`);
- mean slip: `0.7547 → 0.4044 m/s`;
- calibrated normal impulse sum: `333.99 → 338.09 N·s` (`+1.2%`);
- physical impulse / estimated `μΣJ_n`: `0.880 → 0.782`;
- peak torso tilt: `14.083° → 15.306°`.

Direction `+`:

- physical impulse: `268.80 → 243.63 N·s` (`−25.17`);
- positive relative-slip area: `9.1744 → 5.2253 m/s·frame` (`−43.0%`);
- mean slip: `0.8032 → 0.4442 m/s`;
- calibrated normal impulse sum: `305.00 → 317.18 N·s` (`+4.0%`);
- physical impulse / estimated `μΣJ_n`: `0.928 → 0.809`;
- peak torso tilt: `14.976° → 16.887°`.

Frame traces are identical before the first residual impulse and diverge afterward. Earlier residual impulses keep the candidate substantially closer to platform velocity, so later contact solves see materially less relative-motion deficit. Normal load does **not** collapse; it is slightly higher in the assisted specimen.

### E11.1a correction

> **A reduction in absolute physical horizontal impulse is not, by itself, evidence that a hybrid authority channel has degraded or masked physical support capacity. When both channels act on the same motion error, earlier external authority can legitimately reduce later relative slip and therefore reduce the frictional impulse demanded from contact.**

This means the E11.0a `physical-share drop <=0.05` gate was a valid predeclared falsifier for that experiment but is **not** promoted as a universal anti-masking invariant.

E11.1a does not rewrite E11.0a into PASS. It corrects the interpretation of why its absolute physical-share condition is insufficient as an architecture criterion.

E11.1a is retained as a positive diagnostic regression in research smoke.

## 4. E11.2a — support-relevance counterfactual

Probe:

`scripts/e11-2a-support-relevance-counterfactual.mjs`

### Why a new falsifier was needed

After E11.1a, the relevant danger is no longer "does physical impulse stay numerically unchanged?"

The stronger project question is:

> **Does the nonreciprocal channel still depend materially on the physical world's ability to provide locomotion authority, or can a tiny positive physical contribution merely unlock an almost full accepted-looking translational response?**

E11.2a therefore tests causal **support relevance**, not fixed impulse share.

### Policy under test

The adaptive policy keeps the same strict sequencing:

`posture → Box3D/contact solve → exact physical horizontal ΔP → optional residual`

Residual still requires:

- support before and after solve;
- positive same-frame intent-aligned physical horizontal impulse.

There is no residual gain sweep and no fitted total budget. When eligible, residual simply closes the current post-solve speed shortfall, bounded by the accepted current31 per-frame impulse `41.3333 N·s`.

This is deliberately a maximal/simple binary-gated policy. Its purpose is to falsify whether boolean physical eligibility is enough protection against masking.

### Counterfactuals

Each mirrored direction compares physical-only and adaptive-assisted cases at:

- normal research support: `μ=.95`;
- materially weak support: `μ=.20`;
- zero friction: `μ=0`.

The declared discrimination gate reuses the existing E5.2 `±0.10 m/s` near-match window:

- normal `μ=.95` assisted case must reproduce accepted current31 ramp;
- weak `μ=.20` physical-only must demonstrate less physical horizontal authority than normal;
- weak `μ=.20` assisted case must **not** become an accepted-looking near-match;
- zero-friction physical-only must be no stronger than weak support;
- zero-friction assisted case must **not** become an accepted-looking near-match.

No new arbitrary speed-gap threshold was introduced.

Exact negative head:

`2a195626377fbdf1aae715ea1145071a12374a40`

Workflow:

`33751227681` — expected FAILURE at E11.2a.

### Normal `μ=.95`

Direction `-`:

- physical-only: `RECOVER`, `v_end=4.204`, `J_phys=279.33 N·s` (`0.778`);
- adaptive: `RECOVER`, `v_end=5.218`, error `−0.018`, near-match **true**;
- adaptive `J_phys=223.45 N·s` (`0.622`);
- adaptive `J_assist=136.99 N·s` (`0.382`);
- support loss `0`.

Direction `+`:

- physical-only: `RECOVER`, `v_end=4.216`, `J_phys=268.80 N·s` (`0.773`);
- adaptive: `RECOVER`, `v_end=5.273`, error `−0.073`, near-match **true**;
- adaptive `J_phys=215.59 N·s` (`0.620`);
- adaptive `J_assist=137.80 N·s` (`0.397`);
- support loss `0`.

So the adaptive physics-first policy can reproduce accepted current31 translation on the normal qualified support specimen.

### Weak `μ=.20`

Direction `-`:

- physical-only: `FALL`, `v_end=1.972`, `J_phys=106.99 N·s` (`0.293`);
- adaptive: `FALL`, `v_end=5.283`, error `−0.083`, near-match **true**;
- adaptive `J_phys=106.67 N·s` (`0.292`);
- adaptive `J_assist=265.22 N·s` (`0.726`);
- support contact itself remained present through the ramp.

Direction `+`:

- physical-only: `FALL`, `v_end=1.980`, `J_phys=101.90 N·s` (`0.283`);
- adaptive: `FALL`, `v_end=5.280`, error `−0.080`, near-match **true**;
- adaptive `J_phys=101.58 N·s` (`0.283`);
- adaptive `J_assist=264.33 N·s` (`0.735`).

This is the decisive E11.2a failure.

The weak-contact substrate physically supplies only about `28–29%` of required ramp authority and the body still falls, yet the binary-gated residual makes the **translational ramp endpoint** look accepted in both directions using about `73%` external authority.

Important qualification:

> E11.2a does **not** make the whole embodied response indistinguishable from normal support. The organism still physically falls at `μ=.20`. What is masked is the severe loss of translational traction capacity: accepted-looking position/velocity authority survives while posture honestly communicates physical failure.

That distinction may later become a gameplay design choice, but it cannot be called "support-earned translation".

### Zero friction

At `μ=0`, physical-only horizontal progress is essentially zero. The adaptive policy receives one initial transient eligible frame, applies one `41.33 N·s` impulse, reaches only about `0.515 m/s`, and is then blocked by the nonpositive-physical-contribution gate for the remaining relevant frames.

The zero-friction counterfactual therefore does **not** near-match accepted translation.

This does not rescue the binary rule: `μ=.20` already proves that a materially weak but nonzero physical channel can unlock almost full accepted translational authority.

### E11.2a result

> **Binary eligibility — support exists and same-frame physical horizontal impulse is positive — is not a sufficient anti-masking contract for world-external residual authority. A materially weak physical traction channel can act as a key that unlocks accepted-looking translation dominated by nonreciprocal external impulse.**

E11.2a remains executable negative provenance outside mandatory green smoke.

## 5. What E11 established

### Proven / retained

1. Physics-first sequencing removes the E5.2 same-frame ordering ambiguity but does not make external residual authority dynamically independent of physical contact.
2. A fixed residual budget calibrated from physical-only deficit cannot simply be added later; previous external impulses change subsequent frictional demand/contact contribution.
3. Absolute physical impulse/share preservation is not a sufficient universal anti-masking criterion because earlier external authority reduces relative slip and therefore reduces legitimate frictional impulse demand.
4. On normal `μ=.95` support, a simple adaptive physics-first residual can reproduce accepted current31 translational ramp while support remains continuous and posture recovers.
5. The same binary-gated adaptive rule also reproduces accepted-looking ramp-end translation on drastically weaker `μ=.20` support even though physical traction contribution is only about `28–29%` and the body falls.
6. `μ=0` does not unlock sustained residual authority under the same rule, so the failure is not "assist ignores physics completely". The failure is that **any merely-positive physical contribution is too weak a qualification threshold**.
7. Physical posture can remain an honest failure signal even when world-external translation masks loss of traction capacity. Translational agency and embodied failure therefore need not be identical channels.

### Rejected / corrected interpretations

- "Apply residual after Box3D and the displacement problem disappears" — rejected.
- "Preserve the exact physical-only impulse fraction and the hybrid is honest" — not a valid universal rule; corrected by E11.1a.
- "Support + positive same-frame physical impulse is enough to keep external residual causally subordinate to physics" — rejected by `μ=.20` E11.2a.
- E11 does **not** prove that all hybrid authority is dishonest or undesirable.
- E11 does **not** prove that a falling body with preserved translation is bad gameplay; that requires an eventual faithful Owner test if such a design is ever qualified.

## 6. Current architectural boundary

The residual problem is now narrower:

> **If nonreciprocal authority remains a candidate, its entitlement must scale with the magnitude/quality of physically available support authority or otherwise preserve a material support-dependent consequence. Binary contact eligibility is insufficient.**

Two broad next classes deserve comparison before implementation:

### A. graded physical entitlement for bounded world-external residual

A candidate residual could be limited by a causal measure of current physical support capacity/contribution rather than by a boolean contact flag.

But do **not** immediately choose or sweep an arbitrary ratio such as `J_assist <= k × J_phys`. E11.1a already shows that `J_phys` itself changes when assist reduces slip. A useful contract must distinguish "less physical impulse because less was needed" from "weak physical world being used only as permission for external motion".

A high-information next experiment should derive a graded entitlement from an explicit physical quantity or counterfactual and declare its failure behavior before tuning.

### B. reciprocal/support-mediated auxiliary authority

E5.0b already established the primitive distinction: support-mediated equal-and-opposite authority can preserve player+support momentum accounting and disappears without support.

A meaningful continuation would need a specimen where reciprocity is observable — especially dynamic support — rather than merely relabeling a force on the existing kinematic platform.

This is a genuinely different authority architecture from world-external residual and should be compared explicitly rather than assumed better.

A new physical support mechanism also remains admissible if it introduces a causal capability not already exercised by E6–E10, but another body/joint/stiffness variant is not the default next move.

## 7. Runtime / smoke consequence

There is **no runtime or Donor promotion** in E11.

Normal public/default player remains A‴ / Donor v1.

Research-smoke policy after E11 closure:

- E11.1a interaction decomposition remains a positive diagnostic regression;
- E11.0a fixed-deficit failure remains executable provenance outside green smoke;
- E11.2a weak-support masking failure remains executable provenance outside green smoke.

Do not relax their declared gates to make them green.

## 8. Natural boundary

E11 should stop here rather than opening an E11.3 ratio/gain sweep.

The project now knows **why** two simple safeguards are insufficient:

- a fixed physical-only deficit budget ignores authority-channel interaction;
- boolean physical eligibility allows materially weak traction to unlock dominant external authority.

The next stage should therefore be a small architecture-selection experiment, not parameter tuning:

> **Compare a principled graded support-earned entitlement against a genuinely reciprocal support-mediated auxiliary-authority model, and select the smallest falsifier that distinguishes whether either can preserve accepted agency without making the physical world causally optional.**

Only after that distinction is evidence-backed should a new hybrid candidate be tuned or exposed to Owner play.