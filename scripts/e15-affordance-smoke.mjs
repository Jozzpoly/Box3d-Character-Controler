import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE15Affordances } from '../src/e15-affordances.js';
import { createE15ContactSemanticCharacter } from '../src/e15-contact-semantic-character.js';
import { createPlayground } from '../src/playground.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function createScenario(kind) {
  const playground = createPlayground(b3);
  const affordances = createE15Affordances(b3, playground.world, playground.appearance);
  const common = { startPosition: playground.spawn, gravity: playground.gravity };
  const character = kind === 'donor'
    ? createCurrentDonorCharacter(b3, playground.world, common)
    : createE15ContactSemanticCharacter(b3, playground.world, {
        ...common,
        feedbackGain: kind === 'active' ? 1 : 0,
      });
  return { playground, affordances, character };
}

function intent(moveForward = 0) {
  return {
    moveForward,
    moveRight: 0,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function tick(scenario, control) {
  scenario.playground.preStep(DT);
  scenario.affordances.preStep(DT);
  scenario.character.preStep(DT, control);
  b3.b3World_Step(scenario.playground.world, DT, SUBSTEPS);
  scenario.character.postStep(DT);
}

function rootSignature(character) {
  return [...character.position, ...character.velocity, ...character.externalVelocity];
}

function maxDelta(a, b) {
  const av = rootSignature(a);
  const bv = rootSignature(b);
  return Math.max(...av.map((value, index) => Math.abs(value - bv[index])));
}

const donor = createScenario('donor');
const active = createScenario('active');
const control = createScenario('control');
let controlVsDonorMaxDelta = 0;
let activeContactFrames = 0;
let controlContactFrames = 0;
let activePersistentFrames = 0;
let activeConstraintFrames = 0;
let maxActiveOffset = 0;
let firstContact = null;
let frame = 0;

function stepAll(controlIntent, phase, phaseFrame) {
  tick(donor, controlIntent);
  tick(active, controlIntent);
  tick(control, controlIntent);
  controlVsDonorMaxDelta = Math.max(
    controlVsDonorMaxDelta,
    maxDelta(control.character, donor.character),
  );

  if (active.character.lastBodyContacts > 0) activeContactFrames += 1;
  if (control.character.lastBodyContacts > 0) controlContactFrames += 1;
  if (active.character.lastBodyPersistentFeedbackImpulse > 1e-8) activePersistentFrames += 1;
  if (active.character.lastBodyConstraintFeedbackImpulse > 1e-8) activeConstraintFrames += 1;
  maxActiveOffset = Math.max(maxActiveOffset, active.character.bodyOffsetDistance);

  if (active.character.lastBodyContacts > 0 && !firstContact) {
    firstContact = {
      frame,
      phase,
      phaseFrame,
      rootPosition: [...active.character.position],
      bodyPosition: [...active.character.bodyPosition],
      velocity: [...active.character.velocity],
      externalVelocity: [...active.character.externalVelocity],
      physicsImpulse: active.character.lastBodyPhysicsImpulse,
      feedbackImpulse: active.character.lastBodyFeedbackImpulse,
      persistentImpulse: active.character.lastBodyPersistentFeedbackImpulse,
      bodyOffset: active.character.bodyOffsetDistance,
    };
  }
  frame += 1;
}

for (let i = 0; i < 45; i++) stepAll(intent(0), 'settle', i);
for (let i = 0; i < 90; i++) stepAll(intent(1), 'forward-through-first-beam', i);
for (let i = 0; i < 45; i++) stepAll(intent(0), 'release', i);

const report = {
  schema: 'e15-browser-affordance-smoke-v1',
  controlVsDonorMaxDelta,
  activeContactFrames,
  controlContactFrames,
  activePersistentFrames,
  activeConstraintFrames,
  maxActiveOffset,
  firstContact,
  final: {
    donor: {
      position: [...donor.character.position],
      velocity: [...donor.character.velocity],
      externalVelocity: [...donor.character.externalVelocity],
    },
    active: {
      position: [...active.character.position],
      velocity: [...active.character.velocity],
      externalVelocity: [...active.character.externalVelocity],
      contactEpisodes: active.character.bodyContactEpisodeCount,
    },
    control: {
      position: [...control.character.position],
      velocity: [...control.character.velocity],
      externalVelocity: [...control.character.externalVelocity],
    },
  },
  boundary:
    'Browser-ecology plumbing gate only. It proves the E15-only affordance is reachable by the physical body while feedback-off traversal remains Donor-equivalent. It does not decide whether the interaction is fun.',
};

if (controlVsDonorMaxDelta > 1e-9) {
  throw new Error(`E15 browser feedback-off path diverged from Donor: ${controlVsDonorMaxDelta}`);
}
if (!(activeContactFrames > 0 && controlContactFrames > 0)) {
  throw new Error(`E15 first browser affordance missed physical torso: active=${activeContactFrames} control=${controlContactFrames}`);
}
if (!(activePersistentFrames > 0 && firstContact?.persistentImpulse > 1e-4)) {
  throw new Error(`E15 browser affordance did not generate persistent impact transient: ${JSON.stringify(firstContact)}`);
}
if (!(activeConstraintFrames > 0)) {
  throw new Error('E15 browser affordance did not exercise sustained current-only contact response');
}
if (!(maxActiveOffset < 0.6)) {
  throw new Error(`E15 browser affordance separated body/carrier beyond bounded probe range: ${maxActiveOffset}`);
}

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `E15 browser affordance PASS: controlVsDonor=${controlVsDonorMaxDelta.toExponential(2)} ` +
  `contacts=${activeContactFrames} persistent=${activePersistentFrames} constraint=${activeConstraintFrames} ` +
  `impact=${firstContact.feedbackImpulse.toFixed(1)}N·s offset=${maxActiveOffset.toFixed(3)}m`,
);

for (const scenario of [donor, active, control]) b3.b3DestroyWorld(scenario.playground.world);
