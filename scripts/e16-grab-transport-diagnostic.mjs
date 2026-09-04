import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE16GrabCharacter } from '../src/e16-grab-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function neutralIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function makeWorld({ wall = false } = {}) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShape, 20, 0.5, 20);

  let wallBody = null;
  if (wall) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [0.90, 1.0, 0];
    wallBody = b3.b3CreateBody(world, bodyDef);
    const shape = b3.b3DefaultShapeDef();
    shape.baseMaterial.friction = 0.55;
    b3.b3CreateBoxShape(wallBody, shape, 0.08, 1.0, 0.65);
  }
  return { world, wallBody };
}

function makeCharacter(world) {
  return createE16GrabCharacter(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    subsystemFeedbackGain: 0,
  });
}

function tick(world, character, target) {
  character.setOrganTargetOffset(target);
  character.preStep(DT, neutralIntent());
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function frontAnchor(character) {
  return [
    character.organPosition[0] + character.organRadius,
    character.organPosition[1],
    character.organPosition[2],
  ];
}

function runInternalNeutral() {
  const scene = makeWorld();
  const character = makeCharacter(scene.world);
  let maxTransport = 0;
  let maxX = 0;
  const samples = [];
  for (let frame = 0; frame < 180; frame++) {
    const target = frame < 45
      ? [0.42, 0, 0]
      : frame < 90
        ? [0.82, 0.10, 0.18]
        : frame < 135
          ? [0.28, -0.08, -0.16]
          : [0.42, 0, 0];
    tick(scene.world, character, target);
    maxTransport = Math.max(maxTransport, character.lastAggregateWorldTransportDistance);
    maxX = Math.max(maxX, Math.abs(character.lastAggregateWorldTransport[0]));
    if (frame % 15 === 0) {
      samples.push({
        frame,
        transport: [...character.lastAggregateWorldTransport],
        distance: character.lastAggregateWorldTransportDistance,
        aggregateImpulse: [...character.lastAggregateWorldImpulse],
        contacts: character.lastOrganContacts + character.lastBodyContacts,
      });
    }
  }
  const result = { maxTransport, maxX, samples };
  b3.b3DestroyWorld(scene.world);
  return result;
}

function runStaticGrab() {
  const scene = makeWorld({ wall: true });
  const character = makeCharacter(scene.world);
  let frame = 0;
  let grabFrame = null;
  let peakMagnitude = 0;
  let maxPositiveX = -Infinity;
  let minNegativeX = Infinity;
  let sumXAfterGrab = 0;
  let framesAfterGrab = 0;
  let nontrivialFrames = 0;
  const samples = [];

  function step(target, phase) {
    tick(scene.world, character, target);
    if (!character.grabJoint && grabFrame === null && character.lastOrganContacts > 0) {
      character.grabBody(scene.wallBody, frontAnchor(character));
      grabFrame = frame;
    }
    if (grabFrame !== null && frame > grabFrame) {
      const x = character.lastAggregateWorldTransport[0];
      peakMagnitude = Math.max(peakMagnitude, character.lastAggregateWorldTransportDistance);
      maxPositiveX = Math.max(maxPositiveX, x);
      minNegativeX = Math.min(minNegativeX, x);
      sumXAfterGrab += x;
      framesAfterGrab += 1;
      if (Math.abs(x) > 1e-6) nontrivialFrames += 1;
    }
    if (frame % 8 === 0 || (grabFrame !== null && frame <= grabFrame + 8)) {
      samples.push({
        frame,
        phase,
        grabbed: Boolean(character.grabJoint),
        root: [...character.position],
        core: [...character.bodyPosition],
        organ: [...character.organPosition],
        transport: [...character.lastAggregateWorldTransport],
        distance: character.lastAggregateWorldTransportDistance,
        aggregateImpulse: [...character.lastAggregateWorldImpulse],
        constraintImpulse: character.lastConstraintSubsystemFeedbackImpulse,
      });
    }
    frame += 1;
  }

  for (let i = 0; i < 40; i++) step([0.42, 0, 0], 'settle');
  for (let i = 0; i < 90; i++) step([0.88, 0, 0], 'reach');
  for (let i = 0; i < 90; i++) step([0.22, 0, 0], 'retract');

  const result = {
    grabFrame,
    peakMagnitude,
    maxPositiveX: Number.isFinite(maxPositiveX) ? maxPositiveX : null,
    minNegativeX: Number.isFinite(minNegativeX) ? minNegativeX : null,
    meanXAfterGrab: framesAfterGrab ? sumXAfterGrab / framesAfterGrab : null,
    framesAfterGrab,
    nontrivialFrames,
    samples,
  };
  if (character.grabJoint) character.releaseGrab();
  b3.b3DestroyWorld(scene.world);
  return result;
}

const report = {
  schema: 'e16-grab-constraint-transport-diagnostic-v0',
  internalNeutral: runInternalNeutral(),
  staticGrab: runStaticGrab(),
  boundary:
    'Measurement only. No carrier transport is applied. This diagnostic asks whether aggregate COM displacement residual is neutral under internal actuation and directional during an explicit static grab.',
};
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (report.internalNeutral.maxTransport > 1e-5) {
  throw new Error(`E16.1 transport residual is contaminated without external interaction: ${report.internalNeutral.maxTransport}`);
}
if (report.staticGrab.grabFrame === null) {
  throw new Error('E16.1 transport diagnostic never established static grab');
}
if (!(report.staticGrab.peakMagnitude > 1e-5 && report.staticGrab.nontrivialFrames > 5)) {
  throw new Error(`E16.1 static grab produced no usable displacement residual: ${JSON.stringify(report.staticGrab)}`);
}

console.log(
  `E16.1 transport diagnostic PASS: internal=${report.internalNeutral.maxTransport.toExponential(2)}m ` +
  `grab peak=${report.staticGrab.peakMagnitude.toExponential(2)}m ` +
  `meanX=${report.staticGrab.meanXAfterGrab.toExponential(2)}m/tick`,
);
