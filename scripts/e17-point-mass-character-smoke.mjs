import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17IntentManipulatorCharacter } from '../src/e17-intent-manipulator-character.js';
import { createE17PointMassManipulatorCharacter } from '../src/e17-point-mass-manipulator-character.js';

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

function createDynamicBox(world, position, half = [0.35, 0.25, 0.20], density = 80) {
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

function tick(world, character, count = 1) {
  for (let i = 0; i < count; i++) {
    character.preStep(DT, ZERO_INTENT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
  }
}

function run(factory, anchorKind) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);
  const character = factory(b3, world, {
    startPosition: [0, 0, 0],
    gravity: 0,
    feedbackGain: 0,
    manipulatorRate: 10,
    manipulatorMaxForce: 900,
  });
  tick(world, character, 12);

  const half = [0.35, 0.25, 0.20];
  const start = [1.10, character.bodyPosition[1], 0];
  const body = createDynamicBox(world, start, half);
  const anchor = anchorKind === 'center'
    ? [...start]
    : [start[0], start[1] + half[1], start[2] + half[2]];
  if (!character.beginManipulation(body, anchor)) throw new Error(`Failed to acquire ${anchorKind} fixture`);

  const target = [anchor[0] - 0.12, anchor[1] + 0.018, anchor[2] + 0.024];
  character.setManipulationTarget(target);

  let peakAngularSpeed = 0;
  let saturationFrames = 0;
  let totalImpulse = 0;
  let peakError = 0;
  let peakMassRatio = 1;
  for (let i = 0; i < 120; i++) {
    tick(world, character, 1);
    const omega = [0, 0, 0];
    b3.b3Body_GetAngularVelocity(omega, body);
    peakAngularSpeed = Math.max(peakAngularSpeed, Math.hypot(...omega));
    if (character.lastManipulatorImpulse >= 900 * DT - 1e-6) saturationFrames += 1;
    totalImpulse += character.lastManipulatorImpulse;
    peakError = Math.max(peakError, character.lastManipulatorError);
    peakMassRatio = Math.max(peakMassRatio, character.lastManipulatorEffectiveMassRatio ?? 1);
  }

  const finalAnchor = [0, 0, 0];
  b3.b3Body_GetWorldPoint(finalAnchor, body, character.manipulatedLocalAnchor);
  const finalError = distance3(finalAnchor, character.manipulatorTarget);
  const finalOmega = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(finalOmega, body);
  const finalAngularSpeed = Math.hypot(...finalOmega);
  const released = character.releaseManipulation('smoke-release');
  tick(world, character, 1);

  const report = {
    mode: character.telemetry().mode,
    anchorKind,
    finalError,
    peakError,
    peakAngularSpeed,
    finalAngularSpeed,
    saturationFrames,
    totalImpulse,
    peakMassRatio,
    released,
    impulseAfterRelease: character.lastManipulatorImpulse,
  };
  b3.b3DestroyWorld(world);
  return report;
}

const report = {
  schema: 'e17-point-mass-character-smoke-v1',
  center: {
    scalar: run(createE17IntentManipulatorCharacter, 'center'),
    point: run(createE17PointMassManipulatorCharacter, 'center'),
  },
  corner: {
    scalar: run(createE17IntentManipulatorCharacter, 'corner'),
    point: run(createE17PointMassManipulatorCharacter, 'corner'),
  },
  boundary: 'Actual E17/E17-depth character A/B on the E15 physical-core substrate. Same one-point grammar, rate=10 and 900 N cap. Only directional effective-mass accounting differs. Machine mechanics evidence only; no Owner feel claim.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const centerErrorDelta = Math.abs(report.center.scalar.finalError - report.center.point.finalError);
if (centerErrorDelta > 5e-4) {
  throw new Error(`Center A/B should remain close when rotational leverage is absent: ${JSON.stringify(report.center)}`);
}
if (!(report.corner.point.finalError < report.corner.scalar.finalError * 0.35)) {
  throw new Error(`Point accounting did not materially improve off-centre tracking: ${JSON.stringify(report.corner)}`);
}
if (!(report.corner.point.saturationFrames < report.corner.scalar.saturationFrames)) {
  throw new Error(`Point accounting did not reduce force-cap fighting: ${JSON.stringify(report.corner)}`);
}
if (!(report.corner.point.peakAngularSpeed > 0.05)) {
  throw new Error(`Point accounting erased physical leverage instead of controlling it: ${JSON.stringify(report.corner.point)}`);
}
if (!report.corner.point.released || report.corner.point.impulseAfterRelease > 1e-9) {
  throw new Error(`Point variant release lifecycle failed: ${JSON.stringify(report.corner.point)}`);
}
