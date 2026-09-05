# E19 — Dual-Grip Embodied Interaction reframe

Date: 2026-09-05  
Research branch: `research/e19-hand-grip-reframe`

## Why E19 exists

P3.1 answered an important question, but not in the way the project needed.

The Owner explicitly valued the attempt to add deliberate orientation control, because that capability was missing from E17. However the hands-on result remained strongly negative as a control system:

- deliberate control still felt insufficient;
- the interaction remained extremely raw and unpleasant to operate;
- a large part of the world could not be touched/grabbed at all;
- static world geometry could not become a physical handhold;
- climbing, hanging and using the world to move the player were therefore absent;
- the Ctrl precision clutch also collided badly with ordinary desktop/browser movement (`Ctrl+W`).

The browser-shortcut problem is being handled separately as temporary maintenance via user-triggered fullscreen/keyboard lock. It is **not** evidence that P3.1 should be retained as the long-term interaction grammar.

The central architectural failure is deeper:

> **E17/P3 are object-centric remote manipulation systems. The Owner is asking for embodied grip interaction with the world.**

Current P3 starts from:

`select dynamic rigid body -> choose object point -> move a remote target -> finite executor attempts to move object`

That model naturally makes `dynamic` an eligibility condition and treats static scenery as something the player collides with, not something the player can possess through contact.

E19 changes the primary noun from **object target** to **hand/grip**.

---

## Donor research

### Human: Fall Flat — the valuable abstraction is the grip ontology

Human: Fall Flat uses separate left/right hand inputs. The corresponding arm reaches out and whatever the hand contacts can become grabbed. The same primitive is used to move crates, pull levers and pull the player onto ledges.

Sources:

- Xbox Wire, *Learning How to Walk Again in Human: Fall Flat*:  
  https://news.xbox.com/en-us/2016/03/17/gdc-2016-human-fall-flat-xbox-one/
- PS4Blog interview with Tomas Sakalauskas:  
  https://www.ps4blog.net/2017/04/ps4blog-net-interview-tomas-sakalauskas-on-human-fall-flat/

The original control idea came from actual hand tracking with Intel RealSense and was later mapped to left/right triggers or mouse buttons. That history matters: the interaction starts from **what the hands attempt**, not from an editor-like object transform.

### Human: Fall Flat — grabbing is deliberately intention-assisted

A particularly important developer comment says grabbing was rewritten because the old behavior made picking items, pressing buttons, operating mechanisms, grabbing other players and catching parkour edges too difficult. The new behavior was made more deterministic and better aligned with player intentions.

Source:

- No Brakes Games developer response on Steam:  
  https://steamcommunity.com/app/477160/discussions/0/3182216552780030265/

This is directly relevant to our project. A physically embodied hand does **not** require literal collision purity at acquisition time.

Working rule:

> **Assist the intention to acquire a plausible grip; once acquired, let finite physics determine the consequence.**

### Human: Fall Flat — do not cargo-cult the ragdoll

Tomas Sakalauskas described many prototypes. Early versions used PID + IK; the final controller used custom force-response behavior resembling muscles. He also said that several very different implementations produced similar feel and that he selected the approach that best supported the verbs he wanted: push, pull, climb, carry, place/align objects and use tools.

Source:

- NoBrakesGames itch.io comments:  
  https://nobrakesgames.itch.io/human/comments

The transferable lesson is therefore **not** “make a full ragdoll”. Our E14–E16 evidence already warns that more physical body representation can reduce agency and fun.

The useful lesson is:

> **Choose the physical representation that best supports the desired verb ecology.**

### Grow Home — two independent grips as a movement substrate

Grow Home independently controls both hands; the hands can grab essentially anything and climbing is built from those same grips. Ubisoft describes the interaction as physics-based and procedurally animated.

Sources:

- Ubisoft, *Get Ready to Grow Home*:  
  https://news.ubisoft.com/en-us/article/7fDmgKCCwWJQtyoVoOvvGM/get-ready-to-grow-home
- Game Developer, *Game Design Deep Dive: The plant-growing mechanics of Grow Home*:  
  https://www.gamedeveloper.com/design/game-design-deep-dive-the-plant-growing-mechanics-of-ubisoft-s-i-grow-home-i-

The Game Developer retrospective calls climbing the breakthrough feature: any surface, any angle, with weight transfer and stretching between two independent grab points.

This is much closer to the Owner request than P3's temporary object-orientation clutch.

---

## What we should steal — and what we should not

### Steal

1. **Two persistent semantic hands/grips.**
2. **Static and dynamic surfaces share one acquisition grammar.**
3. **The same grip primitive can move the object or move the player depending on what the world can yield.**
4. **Camera/look direction can express reach intent.**
5. **Independent grips naturally create climbing, hanging, bracing, carrying and two-point object control.**
6. **Acquisition may be deliberately intention-assisted.**
7. **Emergent traversal/shortcuts are evidence, not automatically bugs.**

### Do not steal blindly

1. HFF's intentional awkwardness is not our target.
2. We do not need a full humanoid ragdoll before proving the grip grammar.
3. We should not force the Owner to micromanage elbow/arm joints.
4. We should not make exact palm collision a skill gate.
5. We should not sacrifice accepted Donor locomotion merely to resemble another game.

The goal remains this project's own central tension:

> **PLAYER INTENT <-> PHYSICAL CONSEQUENCE**

---

## New interaction ontology

The candidate E19 contract is:

`left/right hand intent -> reach/contact candidate -> latch exact anchor -> finite physical relationship -> physics answers`

The key invariant is:

> **Static versus dynamic changes the physical consequence, not whether the surface is interactable.**

Examples:

- hand on light dynamic box -> box moves readily, player receives recoil;
- hand on heavy dynamic box -> both may move, with mass deciding the balance;
- hand on static wall/ledge -> world does not move, so the player is pulled/held instead;
- two hands on one rigid body -> deliberate orientation emerges from two grip points;
- one hand on static world + one on dynamic body -> brace/pull/lever behavior;
- two static grips -> hanging, climbing, body repositioning and weight transfer;
- two different dynamic bodies -> player can mediate a physical relation between them.

No separate “climb mode” or “object orientation mode” is required at the ontology level.

---

## Representation: hands first, arms later

E19 should **not** begin by building a humanoid.

Initial representation should be the smallest physically meaningful pair of hand endpoints that can answer the interaction question.

Each hand has at least:

- identity: `left` / `right`;
- state: `free -> reaching -> latched -> released`;
- a high-level desired reach point/direction relative to the player/look frame;
- a finite reach envelope;
- an optional acquired anchor;
- current effort/saturation;
- explicit release.

A latch stores:

- target body identity/type;
- exact acquired world point;
- local anchor when the target body can move;
- enough provenance to reconstruct the current world anchor every physics step.

Full arms, elbows, shoulder joints and procedural animation are deferred until hands prove they need them.

---

## Acquisition policy

Literal point-picking from E17/P3 should not become the new hand-acquisition rule.

Candidate acquisition should use a small intention volume around the requested hand trajectory, for example:

- swept sphere/capsule;
- short cone + proximity score;
- nearest plausible surface point to the intended reach;
- hysteresis so candidate selection is stable from frame to frame.

Possible candidate score terms:

- angular distance from desired reach ray;
- physical distance from shoulder/hand origin;
- continuity with the previous candidate;
- reach feasibility;
- optionally surface orientation if it proves useful.

Once latched, the system should preserve the exact physical anchor rather than continually retargeting to a convenient point.

This is **intent assistance at acquisition**, not teleportation after acquisition.

---

## Physics question

The next physics primitive is not “make P3 stronger”. It is a generic **grip relation between player-side hand intent and an arbitrary world/body anchor**.

Desired properties:

1. one finite authority contract works for static and dynamic anchors;
2. dynamic target receives impulse and player-side physical representation receives reciprocal reaction;
3. static target cannot absorb displacement, so reaction instead constrains/moves the player side;
4. two grips on one body are solved as a coupled task where necessary, rather than two ignorant full-strength springs;
5. two static grips can support body weight without hidden teleportation;
6. release preserves momentum;
7. blocked/impossible configurations saturate and fail legibly;
8. mass/inertia and gravity remain meaningful costs;
9. no silent weakening of accepted `31/36 m/s²` Donor ground agency.

P3.0 is not wasted work. Its coupled two-point operator may become a useful donor when two independent grips act on the same dynamic rigid body. But P3 is now a **mechanical donor**, not the interaction architecture.

---

## Player-side consequence and a major unresolved problem

Static grip immediately exposes a hard question that P3 could avoid:

> **What happens when accepted Donor locomotion wants to move through a world anchor that a hand is physically holding?**

Do not answer by silently weakening Donor movement or by making the static grip kinematic magic.

The first headless E19 work must establish how grip reaction enters the existing finite E15 embodiment/core -> Donor consequence bridge and whether this can produce useful hanging/climbing without unstable authority loops.

This is a first-class causal problem.

---

## Candidate desktop grammar — not yet implementation truth

If the hand ontology survives mechanical qualification, the strongest current desktop candidate is an immersive/pointer-lock grammar:

- mouse movement -> camera/look direction continuously;
- `LMB` -> left hand grip intent;
- `RMB` -> right hand grip intent;
- `WASD` -> accepted movement;
- `Space` -> jump;
- no Ctrl precision clutch;
- no RMB-drag camera mode;
- fullscreen/keyboard lock remains an optional browser capability layer, not the physics design.

Why this is attractive:

- both primary mouse buttons acquire stable semantic meaning;
- camera direction can steer where hands attempt to reach, like HFF/Grow Home;
- walking, looking and using both hands can happen simultaneously;
- two hands on an object naturally replace the special P3 orientation modifier;
- static grips naturally open climbing/hanging.

Do not implement this browser grammar before the grip physics can support both static and dynamic anchors.

---

## E19 staged research plan

### E19.0 — generic grip mechanics, headless

Goal: prove or falsify the unified physical relation before committing to UX.

Minimum specimens:

1. **one grip -> dynamic object**
   - light / heavy;
   - reciprocal motion;
   - finite saturation;
   - release momentum;
2. **one grip -> static world**
   - same high-level grip API;
   - world remains fixed;
   - player-side core is constrained/pulled;
3. **two grips -> same dynamic object**
   - independent left/right identities;
   - shared/coupled authority;
   - deliberate object orientation without a special orientation mode;
4. **two grips -> static world**
   - gravity load;
   - hanging / support capacity;
   - body weight transfer;
5. **mixed static + dynamic**
   - brace while pulling/manipulating another object;
6. **full E15/Donor hybrid**
   - verify that reaction becomes meaningful player consequence without runaway or hidden external authority.

Natural stop:

- if static and dynamic grip cannot share a coherent finite relation without corrupting Donor agency, stop and reframe representation;
- if the relation works, proceed to interaction grammar.

### E19.1 — acquisition and reach intent

Headless/geometric first:

- deterministic intention-assisted candidate acquisition;
- static + dynamic candidate parity;
- exact anchor persistence after latch;
- candidate hysteresis;
- reach/break rules;
- no remote 100 m ray-selection feel.

### E19.2 — immersive dual-hand browser crucible

Only after E19.0/0.1 qualify:

- pointer-lock mouse-look;
- LMB left hand, RMB right hand;
- simple visible hand endpoints/reach rays;
- no full arms yet;
- no Ctrl clutch;
- several static ledges/walls plus dynamic objects in the same yard.

### E19.3 — Owner capability gate

Do not request Owner free play until the build supports qualitatively new verbs in one coherent grammar:

- grab/carry/drag a dynamic object;
- two-hand orient it;
- grab a static ledge;
- hang;
- pull/climb the player using static grips;
- brace against static world while manipulating something dynamic;
- release into physical momentum.

The Owner question becomes:

> **Do the hands make the world feel physically possessable, while still letting you express what you mean without fighting the interface?**

---

## Explicit non-goals for this frontier

Do not expand E19.0 into:

- full humanoid arms/ragdoll;
- detailed hand animation;
- finger simulation;
- final climbing animation;
- production character art;
- networking;
- multiplayer grabbing;
- tools/weapons system;
- full angular/wrench closure everywhere;
- P3 parameter tuning;
- removal of generative self-lift before the new grip substrate explains it;
- visual redesign of the current character hat/cap.

The current hat/cap is recorded as Owner visual debt and should be revisited in a later visual pass, not mixed into grip causality.

---

## Working decision

P3.1 is preserved as useful evidence:

- it proved that deliberate orientation capability matters;
- P3.0 proved a viable finite two-point mechanical mechanism;
- but the Owner interaction remained too indirect, raw and restrictive.

Therefore:

> **Stop treating remote object manipulation as the main frontier. Reframe the next generation around two embodied grips that can attach to both the world and objects.**

This is a research direction, not yet a commitment to HFF-style full ragdoll or any final input mapping.
