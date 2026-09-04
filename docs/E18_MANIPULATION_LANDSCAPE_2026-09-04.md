# E18-R0 — Manipulation Landscape / Architecture Research

Date: **2026-09-04**  
Status: **research checkpoint; no runtime change**

## 0. Why E18 exists

E14–E16 established useful causal mechanics, but Owner hands-on repeatedly showed that physical correctness or physical reaction is not enough. E15's passive torso was technically real but mostly behaved like a physical appendage after the Donor controller had already done the interesting work. E16 gave a solver-owned organ a deliberate capability, but Owner interaction remained dominated by piloting the organ itself.

E17 changed the abstraction boundary:

> **high-level object intent first → finite physical execution second**

instead of:

> **pilot a physical end effector → earn contact → maybe create useful object behavior**.

That architecture reset is the first post-E14 manipulation direction that caused Owner free play to shift from testing the interface to deliberately making a mess in the physical world.

E18 therefore does **not** start by tuning E17's actuator or by adding a rotation button. It maps the problem space before the next implementation.

---

## 1. Live implementation / evidence boundary at takeover

Canonical implementation when this document was created:

- `main`: `c51bee303e85762ca5583fd63db02918205a9da5`
- PR #39: **Publish E17 intent-first physical manipulator**
- exact-main workflow: `33883029369` / run #668 — **SUCCESS**
- exact-main E16 regressions, E17 qualifier, build and GitHub Pages deploy — **SUCCESS**
- public E17 route: `?mode=e17` / `?mode=intent`

Machine evidence establishes that E17 can directly acquire a nearby dynamic object from the clicked surface point, apply finite 3D actuation, preserve off-centre leverage, reject static/out-of-range acquisition, provide equal-and-opposite finite-core reaction, and release cleanly.

It does **not** establish quality of control, orientation, fun, embodied plausibility or long-term balance.

---

## 2. Owner evidence — the important part

The first E17 Owner recording is the current highest-value evidence for gameplay direction.

### 2.1 Strong positive result

Owner no longer spent most of the session figuring out how to operate the interaction mechanism. Very quickly the session became about the **world**:

- lifting and dropping objects;
- carrying objects while moving;
- throwing/releasing with momentum;
- grabbing off-centre and producing leverage/rotation;
- piling and attempting to stack objects;
- pushing objects into other objects and into the player;
- using multiple previously disturbed objects as the starting state for the next action;
- experimenting with both boxes and a rolling sphere;
- combining locomotion and manipulation;
- intentionally creating increasingly complicated physical situations.

This is the first strong evidence that one physical capability is producing a **family of verbs** rather than one scripted mechanic.

Working verb cloud:

`grab → lift → carry → drag → swing → throw → press → pile → stack-attempt → collide → leverage → release`

These are observations, not a required feature list.

### 2.2 Strong negative result

E17 is still extremely crude.

Owner description:

> **"latający niestabilny wibrator, nad którym nadal ciężko mieć jakąś kontrolę"**

Observed weaknesses:

- aggressive spring-like oscillation / overshoot;
- large uncontrolled angular velocities from off-centre grabs;
- low predictability of precise placement;
- no deliberate orientation ownership;
- difficult distinction between player skill and accidental actuator chaos;
- visual representation remains prototype-grade;
- current physical core/carrier relation is still not a finished embodied character.

The positive E17 result is therefore **not** "the manipulator is good".

It is:

> **the intent-first abstraction is good enough that the player starts generating gameplay questions despite the manipulator being bad.**

That distinction must survive future takeovers.

---

## 3. The sphere self-lift exploit

During Owner free play, Owner stood on the dynamic sphere, grabbed/manipulated it and was able to lift the sphere and player together, effectively flying.

Owner judgement:

- immediately funny and high-fun;
- useful as a stress test;
- should **not** be removed now;
- likely dangerous to long-term balance and coherence if treated as ordinary intended traversal.

### 3.1 Classification

This behavior is both:

1. a **generative exploit** — it creates a new toy/verb and encourages experimentation;
2. an **authority exploit / causal debt** — player and held support form a closed player↔object loop, while Donor authority supplies an effectively external translation channel that lets the closed subsystem raise itself.

Working name:

> **self-lift / closed-loop authority exploit**

Do not patch it during exploratory E18 work merely because it is an exploit. Also do not use its fun as evidence that the current causal accounting is physically coherent.

### 3.2 Durable exploit taxonomy

Future unexpected behaviors should first be classified rather than immediately fixed:

- **Generative exploit** — unintended but creates interesting skill, strategy, humor or problem solving.
- **Authority exploit** — behavior exists because two authority systems can do net work that the represented physical situation should not permit.
- **Degenerate exploit** — bypasses interaction without producing a new interesting problem or skill.
- **Hybrid** — both generative and causally invalid, as current self-lift appears to be.

Preserve the specimen until the research question it exposes is understood.

This is consistent with useful historical precedent: Human: Fall Flat's developer explicitly declined to automatically remove unintended hand-over-hand climbing because the game was intentionally open, while players described route-breaking climbing as solving a different problem rather than simply skipping play.

---

## 4. Core E18 question

The wrong question is:

> **How do we add rotation to E17?**

The useful question is:

> **What interaction grammar lets a player express useful 6-DoF object intent while finite physics, mass, leverage, contacts, body reaction and failure remain meaningful parts of execution?**

This splits manipulation into several coupled but independently researchable problems.

---

## 5. Manipulation taxonomy

### 5.1 Selection / acquisition

What does the player select?

- arbitrary object;
- exact surface point;
- inferred surface frame;
- semantic handle / grip affordance;
- first physical contact;
- centre of mass;
- one of several simultaneously valid contacts.

E17 currently selects **dynamic body + exact clicked surface point**.

### 5.2 Translation intent

What does "move this" mean?

- clicked point follows target;
- COM follows target;
- object frame follows target;
- a virtual proxy/god-object follows target and the physical object follows the proxy;
- two or more target points jointly define object translation.

### 5.3 Orientation intent

This is a separate frontier, not one missing parameter.

Candidate grammars include:

- **free orientation** — one-point grip; rotation is entirely physical consequence;
- **explicit orientation mode** — translation and rotation are separate player operations;
- **pose target** — desired position + desired quaternion/frame, executed through finite force/torque;
- **surface-frame intent** — clicked surface normal/tangent frame becomes the controlled orientation reference;
- **second virtual grip** — two target points imply orientation geometrically;
- **two physical effectors/hands** — orientation emerges from two real force paths;
- **assisted alignment** — optional weak/snap/axis alignment rather than full pose authority;
- **environment-derived orientation** — placement/contact geometry stabilizes orientation rather than the controller doing all work.

Do not assume one grammar should cover carrying, rough throwing and precision assembly equally well.

### 5.4 Compliance / execution

How strongly is intent allowed to dominate physics?

Spectrum:

`kinematic teleport → hard constraint → virtual coupling → finite impedance → force-limited actuation → purely physical contact/body`

E17 is a primitive finite force-limited virtual coupling for translation at one grabbed point.

The research target is **controlled failure**: the player should understand the desired result, while mass/contact/leverage can prevent or distort execution in legible ways.

### 5.5 Reaction / authority closure

Where does equal-and-opposite reaction go?

- nowhere (god-tool / editor authority);
- avatar/root;
- physical core;
- support graph;
- second held object;
- another player;
- vehicle/world constraint.

This axis determines whether a manipulator is an editing tool, a superpower, a physical body capability or some hybrid.

### 5.6 Reach and strength

Separate concepts:

- acquisition range;
- commanded workspace;
- maximum force;
- maximum torque;
- sustainable load;
- transient peak load;
- leverage dependence;
- support/posture dependence.

Do not collapse all of them into one "object too heavy" threshold.

### 5.7 Release / momentum

Release is gameplay, not cleanup.

Questions:

- does current physical momentum simply continue?;
- does control inject artificial release velocity?;
- does precise placement need velocity damping before release?;
- can the same grammar support both careful placement and throwing without modes?

### 5.8 Object semantics

Generic physics can coexist with authored affordances.

Possible future spectrum:

- every surface is grabbable;
- geometry-inferred stable grip features;
- authored handles / ports / attachment frames;
- component-specific semantics in JV-like construction;
- tools exposing specific reaction/torque capabilities.

Avoid assuming semantic handles are "cheating". They may be the correct level for tools/components while generic surfaces remain available elsewhere.

### 5.9 Multiplayer ownership

Not an implementation task for E18, but manipulation architecture should not accidentally forbid future Multi_World use.

Questions to retain:

- two players holding one body;
- competing vs cooperative target constraints;
- how force budgets combine;
- authoritative simulation vs replicated intent;
- whether ownership is per object, per grip or per constraint;
- latency tolerance of high-level intent versus low-level contact replication.

Do not optimize current single-player prototype around a network architecture yet.

---

## 6. Donor landscape — useful lessons, not templates

### 6.1 Human: Fall Flat — body/verbs first

Useful evidence:

- several fundamentally different controller prototypes reportedly produced similar feel;
- the chosen implementation was the one that best supported desired verbs;
- developer explicitly lists push, pull, climb, carry, place, align and tool use;
- character motion is heavily force/physics/joint based;
- open unintended traversal behavior was not automatically patched when it produced alternative problem solving.

Lesson for us:

> **judge control architecture by the strategy/verb ecology it enables, not by resemblance to a canonical animation/IK solution.**

Also important: Human: Fall Flat does not prove its control scheme is our answer. It proves that difficult low-level physics control can be worthwhile when a broad verb ecology pays for the learning cost.

Sources:

- https://nobrakesgames.itch.io/human
- https://nobrakesgames.itch.io/human/comments?after=0
- https://www.ps4blog.net/2017/04/ps4blog-net-interview-tomas-sakalauskas-on-human-fall-flat/

### 6.2 Boneworks — coherent finite authority

Useful evidence:

- physical agency and full-body presence were explicit design goals;
- player mass and object interaction forces are intended to be mutually coherent;
- developer emphasizes avoiding infinite-force shortcuts and using equal/opposite physical reactions;
- the payoff is systemic compatibility: unconventional solutions can feel exploit-like without relying on solver bugs.

Lesson for us:

> **closed authority accounting is not only realism; it can be infrastructure for composability.**

This makes E17 self-lift an important long-term diagnostic rather than a trivial balance bug.

Source:

- https://www.gamedeveloper.com/design/how-classical-game-mechanics-and-physics-converge-in-vr-hit-i-boneworks-i-

### 6.3 Garry's Mod Physgun — explicit DOF separation

Physgun exposes a very readable interaction grammar:

- target/select;
- move with aim;
- change distance separately;
- rotate in a separate mode;
- optional angle snapping;
- freeze/unfreeze.

It sacrifices embodiment and finite strength but achieves tremendous construction/manipulation clarity.

Lesson:

> **separating translation and rotation is a legitimate design choice, not necessarily an admission of failure.**

It is a useful precision/control donor, not our embodiment target.

Source:

- https://wiki.facepunch.com/gmod/Using_your_Physgun

### 6.4 Tears of the Kingdom / Ultrahand — staged creator grammar

Nintendo exposes high-level move, rotate and attach operations rather than asking physics alone to infer construction intent. The system is designed around huge combinatorial object-to-object variation and readable attachment state.

Lesson:

> **for construction, exact authoring intent may deserve explicit channels even inside a physics-rich world.**

This may become highly relevant to future JV-style component building, but E18 should not simply turn the player into an editor tool.

Source:

- https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-4/

### 6.5 VR/HCI literature — no universal 6-DoF answer

Useful recurring results:

- depth/Z manipulation is harder and generates less agreement than simpler translation tasks;
- integrated 6-DoF manipulation can be fast/natural in some contexts;
- separated translation/rotation can improve precision and reduce unintended transformation in other contexts;
- hybrid/staged systems can outperform one universal mapping;
- users do not always prefer simultaneous two-hand operation; alternating/specialized hand roles can be easier.

Lesson:

> **we should compare control grammars by task and play ecology instead of searching for one theoretically "natural" 6-DoF mapping.**

Representative sources:

- https://link.springer.com/article/10.1186/s13673-018-0154-5
- https://www.sciencedirect.com/science/article/abs/pii/S1071581920300367
- https://doi.org/10.1109/VRW70859.2026.00073

### 6.6 Robotics / haptics — useful control vocabulary

Operational/task-space and impedance control provide mature language for what E17 has stumbled toward:

- separate desired task-space pose from low-level mechanism coordinates;
- represent position and orientation as task variables;
- use compliance/impedance so contact can cause controlled deviation from the target;
- virtual coupling / god-object methods separate user intent/proxy motion from physically feasible object motion.

Lesson:

> **"intent proxy + finite physical executor" is a serious control architecture family, not merely a game hack.**

But robotics optimizes stability/task success, while this project also optimizes fun, surprise and useful imperfection.

Representative sources:

- https://motion.cs.illinois.edu/RoboticSystems/RobotControl.html
- https://pubmed.ncbi.nlm.nih.gov/17356213/
- https://www.iris.unina.it/handle/11588/464928

---

## 7. Main design tensions discovered

### T1 — precision vs physical richness

More orientation authority improves placement but may erase leverage, wobble, accidents and throwing character.

### T2 — intent readability vs embodied effort

E17 dramatically improved intent readability by skipping end-effector piloting. Too much skipping could turn the character into a remote editor rather than an embodied actor.

### T3 — finite strength vs responsiveness

Low force budgets preserve mass but may feel unresponsive. High budgets create the current flying vibrator and can enable authority exploits.

### T4 — one-point simplicity vs orientation control

A single surface point is elegant and produces leverage naturally, but does not define full rigid-body orientation.

### T5 — generic surfaces vs authored handles

Generic grabbing maximizes emergence. Semantic handles can improve tools, construction and predictable orientation.

### T6 — fun exploits vs causal coherence

Some physically invalid loops can be excellent toys. Removing them too early destroys discovery; canonizing them too early corrupts system coherence.

### T7 — one universal grammar vs staged grammar

Rough throwing, carrying, exact stacking and vehicle-component assembly may genuinely need different control submodes or precision stages.

---

## 8. Prototype families worth testing

These are deliberately **different architectures**, not parameter variants.

### P1 — One-point chaos baseline (current E17)

Keep exact E17 behavior as a frozen comparison specimen.

Properties:

- clicked surface point;
- finite translational actuator at that point;
- no explicit orientation target;
- maximum leverage/chaos;
- self-lift currently legal as stress behavior.

Purpose:

- preserve current fun and failures;
- ensure future "improvements" do not become sterile.

### P2 — Six-DoF compliant pose intent

Selection captures a local object frame, not only a point.

Player controls desired position **and orientation** of that frame. Physics receives finite force **and finite torque** budgets; the real object may lag, collide, oscillate or fail to reach the pose.

This is closest to 6-DoF virtual coupling / impedance control.

Questions:

- can orientation become intentional without becoming kinematic?;
- do heavy/awkward objects remain meaningfully difficult?;
- can throwing coexist with pose control?;
- does off-centre leverage disappear too much?

### P3 — Two-point / virtual two-hand grip

Do not command a quaternion directly.

One point is the primary grip. A second virtual grip/reference point defines orientation geometrically. Two finite force paths act on the rigid body.

The second point can initially be a **virtual capability endpoint**, not a rendered anatomical hand.

Questions:

- does two-point control make place/align behavior intuitive?;
- can it naturally produce torque while retaining mass/leverage?;
- is sequential acquisition easier than simultaneous control?;
- does this architecture naturally motivate future physical hands rather than assuming them?

### P4 — Separated precision clutch

Keep E17 one-point manipulation as default rough mode. Add a temporary explicit orientation/precision clutch inspired by Physgun/Ultrahand rather than always controlling orientation.

Questions:

- is rough physical manipulation fun while precision becomes available only on demand?;
- does mode separation preserve throwing and chaos better than permanent 6-DoF pose control?;
- can snap/align aids become optional construction affordances later?

P4 is lower architectural ambition than P2/P3 but may be a highly useful control baseline.

---

## 9. Recommended experiment order

Do **not** immediately build all three.

### First: P3 — two-point virtual grip

Current-best reason:

- attacks the Owner's biggest missing ability — intentional orientation;
- remains force/geometry-based instead of directly owning quaternion pose;
- tests the conceptual value of two hands **without** committing to humanoid anatomy;
- naturally exposes leverage, torque sharing and closed-loop problems;
- could later map to mouse+modifier, two physical hands, multiplayer cooperation, vehicle-component handles or tools;
- is sufficiently different from E17 to teach us something even if it fails.

### Keep P2 as the engineering/control reference

Even if P3 is more playful, a clean finite 6-DoF pose-coupling specimen is valuable because it tells us what maximum controllability looks like without kinematic teleportation.

### Keep P4 as the usability/reference control

If P2/P3 remain too awkward, explicit staged rotate/align may be the correct desktop grammar. That would not invalidate the physical execution layer.

---

## 10. Required stress ecology for future prototypes

Do not validate orientation only with a cube docking test.

Every serious candidate should eventually survive a common free-play ecology containing:

- light cube;
- heavy cube;
- long beam with strong leverage;
- rolling sphere;
- awkward asymmetric object when support exists;
- object-on-object stacking;
- carrying while walking/jumping;
- throwing/releasing with momentum;
- object contacting the player's body;
- held object supporting the player;
- **self-lift closed loop**;
- later: two objects/constraints simultaneously;
- later: two players acting on one object.

Machine tests can measure causal contracts. Owner free play remains the gate for whether the grammar produces worthwhile behavior.

---

## 11. What NOT to do next

- Do not tune E17 spring/damping for many iterations before comparing architectures.
- Do not patch sphere self-lift yet.
- Do not build a full humanoid or two articulated arms merely because Human: Fall Flat has them.
- Do not add direct quaternion rotation to E17 and call orientation solved.
- Do not make precision the only objective; preserve E17 as a chaos/fun baseline.
- Do not merge Multi_World/JV/JES concerns into current implementation scope.
- Do not design networking now, but avoid architecture choices that assume one uncontested actor forever.
- Do not weaken accepted Donor movement to make manipulation easier.

---

## 12. Cross-project relevance — context, not scope

Owner immediately connected E17's "player and object belong to one physical world" feeling with long-term Multi_World and Nextgen JV possibilities: several players physically manipulating shared things, and eventually building/using vehicles or mechanisms from components.

This is strategically useful but is **not** an instruction to integrate projects now.

What this project can responsibly export later are generic primitives and lessons:

- intent representation;
- grip/constraint topology;
- finite force/torque authority;
- support/contact graphs;
- object-level manipulation semantics;
- closed-loop exploit tests;
- multiplayer-compatible high-level intent concepts;
- generic attachment/handle ideas.

Multi_World/JV should consume proven primitives when useful, not become hidden requirements of E18.

---

## 13. Current E18 frontier

The next implementation should be a **bounded P3 two-point virtual-grip crucible**, not a production hand system.

Before browser implementation, design a minimal causal experiment that answers:

> **Can two finite target points give materially better intentional orientation/placement than E17 while preserving physical leverage, collision response, mass differences and emergent throwing behavior?**

The crucible should compare P3 against frozen E17 under the same bodies and force scale where possible.

Natural stopping conditions:

- P3 clearly improves orientation ownership while preserving useful physical richness → promote to Owner-facing toybox;
- P3 only hides instability by overpowering the object → reject/rethink;
- P3 is cognitively worse than one-point E17 → keep as negative evidence and test P2/P4;
- an unexpected behavior dominates fun → classify it before fixing it.

No runtime work belongs in this E18-R0 checkpoint.
