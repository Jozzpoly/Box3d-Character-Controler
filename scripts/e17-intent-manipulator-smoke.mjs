import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17IntentManipulatorCharacter } from '../src/e17-intent-manipulator-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
const ZERO_INTENT = {
  moveForward: 0,
  moveRight: 0,
  forward: [0, 0, -1],
  right: [1, 0, 0],
  jump: false,
  jumpHeld: false,
  sprint: false,
};

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function createDynamicBox(world, position, half = [0.25, 0.25, 0.25], density = 80) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = density;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createStaticBox(world, position, half = [0.2, 0.2, 0.2]) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function tick(world, character, count = 1) {
  for (let i = 0; i < count; i++) {
    character.preStep(DT, ZERO_INTENT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
  }
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);
const character = createE17IntentManipulatorCharacter(b3, world, {
  startPosition: [0, 0, 0],
  gravity: 0,
  feedbackGain: 1,
  manipulatorMaxForce: 900,
  manipulatorMaxReach: 1.6,
  manipulatorAcquireReach: 1.85,
});

tick(world, character, 12);
const rootBefore = [...character.position];
const coreBefore = [...character.bodyPosition];

const objectStart = [1.18, character.bodyPosition[1], 0];
const object = createDynamicBox(world, objectStart);
const objectMass = b3.b3Body_GetMass(object);
const anchor = [objectStart[0], objectStart[1] + 0.18, objectStart[2]];
const selected = character.beginManipulation(object, anchor);
if (!selected) throw new Error('E17 failed to acquire an in-range dynamic object directly');

const requestedTarget = [0.38, character.bodyPosition[1] + 0.70, 0.55];
character.setManipulationTarget(requestedTarget);

let peakImpulse = 0;
let peakForce = 0;
let peakError = 0;
let peakBodyFeedback = 0;
for (let i = 0; i < 30; i++) {
  tick(world, character, 1);
  peakImpulse = Math.max(peakImpulse, character.lastManipulatorImpulse);
  peakForce = Math.max(peakForce, character.lastManipulatorForce);
  peakError = Math.max(peakError, character.lastManipulatorError);
  peakBodyFeedback = Math.max(peakBodyFeedback, character.lastBodyFeedbackImpulse);
}

const objectAfter = [0, 0, 0];
const objectAngular = [0, 0, 0];
b3.b3Body_GetPosition(objectAfter, object);
b3.b3Body_GetAngularVelocity(objectAngular, object);
const rootAfter = [...character.position];
const coreAfter = [...character.bodyPosition];
const objectTravel = distance3(objectStart, objectAfter);
const objectLift = objectAfter[1] - objectStart[1];
const objectHorizontalTowardTarget = objectStart[0] - objectAfter[0];
const rootReactionX = rootAfter[0] - rootBefore[0];
const angularSpeed = Math.hypot(...objectAngular);

const released = character.releaseManipulation('smoke-release');
tick(world, character, 1);
const impulseAfterRelease = character.lastManipulatorImpulse;

const farObject = createDynamicBox(world, [5, character.bodyPosition[1], 0]);
const farRejected = !character.beginManipulation(farObject, [5, character.bodyPosition[1], 0]);
const staticBody = createStaticBox(world, [0.8, character.bodyPosition[1], 0.8]);
const staticRejected = !character.beginManipulation(staticBody, [0.8, character.bodyPosition[1], 0.8]);

const report = {
  schema: 'e17-intent-first-manipulator-smoke-v0',
  selected,
  objectMass,
  rootBefore,
  rootAfter,
  coreBefore,
  coreAfter,
  objectStart,
  objectAfter,
  requestedTarget,
  objectTravel,
  objectLift,
  objectHorizontalTowardTarget,
  rootReactionX,
  angularSpeed,
  peakImpulse,
  peakForce,
  peakError,
  peakBodyFeedback,
  released,
  impulseAfterRelease,
  farRejected,
  staticRejected,
  boundary: 'Machine qualification of direct selection + finite 3D physical execution. It does not establish Owner feel, fun or final embodiment architecture.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (objectTravel < 0.20 || objectLift < 0.08 || objectHorizontalTowardTarget < 0.10) {
  throw new Error(`E17 direct intent did not produce meaningful 3D object motion: ${JSON.stringify(report)}`);
}
if (!(rootReactionX > 0.001) || peakBodyFeedback <= 0) {
  throw new Error(`E17 manipulation did not produce opposite physical carrier reaction: ${JSON.stringify(report)}`);
}
if (angularSpeed < 0.05) {
  throw new Error(`E17 off-centre anchor did not produce leverage/rotation: ${angularSpeed}`);
}
if (!released || impulseAfterRelease > 1e-9 || !farRejected || !staticRejected) {
  throw new Error(`E17 lifecycle/range/type gate failed: ${JSON.stringify(report)}`);
}

b3.b3DestroyWorld(world);
