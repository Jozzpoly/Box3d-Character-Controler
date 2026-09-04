import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE15HybridCharacter } from '../src/e15-hybrid-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShapeDef = b3.b3DefaultShapeDef();
  groundShapeDef.baseMaterial.friction = 0.8;
  groundShapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, groundShapeDef, 30, 0.5, 30);

  // Deliberately above the Donor capsule top (~1.795 m after settle) while
  // intersecting the E15 upper-body envelope (~1.986 m after settle). The carrier
  // can pass underneath; only the physical body layer should hit this obstacle.
  const barDef = b3.b3DefaultBodyDef();
  barDef.position = [1.45, 2.0, 0];
  const bar = b3.b3CreateBody(world, barDef);
  const barShapeDef = b3.b3DefaultShapeDef();
  barShapeDef.baseMaterial.friction = 0.4;
  barShapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(bar, barShapeDef, 0.08, 0.08, 1.2);

  return world;
}

function intent(moveForward = 0) {
  return {
    moveForward,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function tick(world, character, control) {
  character.preStep(DT, control);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function maxRootDelta(a, b) {
  const av = [...a.position, ...a.velocity, ...a.externalVelocity];
  const bv = [...b.position, ...b.velocity, ...b.externalVelocity];
  return Math.max(...av.map((value, index) => Math.abs(value - bv[index])));
}

function finiteCharacter(character, label) {
  const values = [
    ...character.position,
    ...character.velocity,
    ...character.externalVelocity,
    character.bodyOffsetDistance ?? 0,
    character.lastBodyPhysicsImpulse ?? 0,
    character.lastBodyFeedbackImpulse ?? 0,
  ];
  if (!values.every(Number.isFinite)) {
    throw new Error(`${label} produced non-finite state: ${JSON.stringify(values)}`);
  }
}

const donorWorld = makeWorld();
const activeWorld = makeWorld();
const controlWorld = makeWorld();
const common = { startPosition: [0, 0.9, 0], gravity: 20 };
const donor = createCurrentDonorCharacter(b3, donorWorld, common);
const active = createE15HybridCharacter(b3, activeWorld, { ...common, feedbackGain: 1 });
const control = createE15HybridCharacter(b3, controlWorld, { ...common, feedbackGain: 0 });

let controlVsDonorMaxDelta = 0;
let activeVsDonorMaxDelta = 0;
let activeMaxBodyOffset = 0;
let controlMaxBodyOffset = 0;
let activeMaxPhysicsImpulse = 0;
let controlMaxPhysicsImpulse = 0;
let activeMaxFeedbackImpulse = 0;
let activeContactFrames = 0;
let controlContactFrames = 0;
let firstActiveContact = null;
let firstControlContact = null;
const samples = [];
let globalFrame = 0;

function stepAll(controlIntent, phase, phaseFrame) {
  tick(donorWorld, donor, controlIntent);
  tick(activeWorld, active, controlIntent);
  tick(controlWorld, control, controlIntent);

  controlVsDonorMaxDelta = Math.max(controlVsDonorMaxDelta, maxRootDelta(control, donor));
  activeVsDonorMaxDelta = Math.max(activeVsDonorMaxDelta, maxRootDelta(active, donor));
  activeMaxBodyOffset = Math.max(activeMaxBodyOffset, active.bodyOffsetDistance);
  controlMaxBodyOffset = Math.max(controlMaxBodyOffset, control.bodyOffsetDistance);
  activeMaxPhysicsImpulse = Math.max(activeMaxPhysicsImpulse, active.lastBodyPhysicsImpulse);
  controlMaxPhysicsImpulse = Math.max(controlMaxPhysicsImpulse, control.lastBodyPhysicsImpulse);
  activeMaxFeedbackImpulse = Math.max(activeMaxFeedbackImpulse, active.lastBodyFeedbackImpulse);

  if (active.lastBodyContacts > 0) {
    activeContactFrames += 1;
    firstActiveContact ??= {
      globalFrame,
      phase,
      phaseFrame,
      rootX: active.position[0],
      bodyX: active.bodyPosition[0],
      bodyOffset: active.bodyOffsetDistance,
      physicsImpulse: active.lastBodyPhysicsImpulse,
      feedbackImpulse: active.lastBodyFeedbackImpulse,
      externalX: active.externalVelocity[0],
    };
  }
  if (control.lastBodyContacts > 0) {
    controlContactFrames += 1;
    firstControlContact ??= {
      globalFrame,
      phase,
      phaseFrame,
      rootX: control.position[0],
      bodyX: control.bodyPosition[0],
      bodyOffset: control.bodyOffsetDistance,
      physicsImpulse: control.lastBodyPhysicsImpulse,
      externalX: control.externalVelocity[0],
    };
  }

  if (
    phaseFrame % 10 === 0 ||
    active.lastBodyContacts > 0 ||
    control.lastBodyContacts > 0
  ) {
    samples.push({
      globalFrame,
      phase,
      phaseFrame,
      donorX: donor.position[0],
      activeX: active.position[0],
      controlX: control.position[0],
      activeVelocityX: active.velocity[0],
      controlVelocityX: control.velocity[0],
      activeExternalX: active.externalVelocity[0],
      controlExternalX: control.externalVelocity[0],
      activeBodyX: active.bodyPosition[0],
      controlBodyX: control.bodyPosition[0],
      activeBodyOffset: active.bodyOffsetDistance,
      controlBodyOffset: control.bodyOffsetDistance,
      activeContacts: active.lastBodyContacts,
      controlContacts: control.lastBodyContacts,
      activePhysicsImpulse: active.lastBodyPhysicsImpulse,
      controlPhysicsImpulse: control.lastBodyPhysicsImpulse,
      activeFeedbackImpulse: active.lastBodyFeedbackImpulse,
    });
  }

  finiteCharacter(active, `active frame ${globalFrame}`);
  finiteCharacter(control, `control frame ${globalFrame}`);
  globalFrame += 1;
}

for (let i = 0; i < 45; i++) stepAll(intent(0), 'settle', i);
for (let i = 0; i < 120; i++) stepAll(intent(1), 'drive-under-bar', i);
for (let i = 0; i < 120; i++) stepAll(intent(0), 'release', i);

const report = {
  schema: 'e15-world-contact-causality-v0',
  geometry: {
    barCenter: [1.45, 2.0, 0],
    barHalf: [0.08, 0.08, 1.2],
    intent: 'forward +X, carrier capsule geometrically below bar',
  },
  invariants: {
    controlVsDonorMaxDelta,
    activeVsDonorMaxDelta,
    activeContactFrames,
    controlContactFrames,
  },
  active: {
    finalRootX: active.position[0],
    finalVelocityX: active.velocity[0],
    finalExternalX: active.externalVelocity[0],
    finalBodyX: active.bodyPosition[0],
    maxBodyOffset: activeMaxBodyOffset,
    maxPhysicsImpulse: activeMaxPhysicsImpulse,
    maxFeedbackImpulse: activeMaxFeedbackImpulse,
    firstContact: firstActiveContact,
  },
  feedbackOffControl: {
    finalRootX: control.position[0],
    finalVelocityX: control.velocity[0],
    finalExternalX: control.externalVelocity[0],
    finalBodyX: control.bodyPosition[0],
    maxBodyOffset: controlMaxBodyOffset,
    maxPhysicsImpulse: controlMaxPhysicsImpulse,
    firstContact: firstControlContact,
  },
  donor: {
    finalRootX: donor.position[0],
    finalVelocityX: donor.velocity[0],
    finalExternalX: donor.externalVelocity[0],
  },
  samples,
  boundary:
    'Diagnostic only: establishes whether a real Box3D body/world contact reaches the declared consequence channel without changing feedback-off Donor traversal. It does not decide feel, fun, or production architecture.',
};

if (controlVsDonorMaxDelta > 1e-9) {
  throw new Error(`E15 feedback-off control diverged from Donor under body-only obstacle: ${controlVsDonorMaxDelta}`);
}
if (activeContactFrames === 0 || controlContactFrames === 0) {
  throw new Error(
    `E15 overhead obstacle did not produce body/world contact: active=${activeContactFrames} control=${controlContactFrames}`,
  );
}
if (!(activeMaxPhysicsImpulse > 1e-4 && controlMaxPhysicsImpulse > 1e-4)) {
  throw new Error(
    `E15 body/world contact produced no measurable horizontal body response: active=${activeMaxPhysicsImpulse} control=${controlMaxPhysicsImpulse}`,
  );
}
if (!(activeMaxFeedbackImpulse > 1e-4)) {
  throw new Error(`E15 real body/world contact did not reach consequence channel: ${activeMaxFeedbackImpulse}`);
}

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `E15 world-contact diagnostic PASS: controlVsDonor=${controlVsDonorMaxDelta.toExponential(2)} ` +
  `contacts=${activeContactFrames}/${controlContactFrames} ` +
  `activeFeedback=${activeMaxFeedbackImpulse.toFixed(2)}N·s ` +
  `activeX=${active.position[0].toFixed(3)} donorX=${donor.position[0].toFixed(3)} ` +
  `activeOffset=${activeMaxBodyOffset.toFixed(3)}m`,
);

b3.b3DestroyWorld(donorWorld);
b3.b3DestroyWorld(activeWorld);
b3.b3DestroyWorld(controlWorld);
