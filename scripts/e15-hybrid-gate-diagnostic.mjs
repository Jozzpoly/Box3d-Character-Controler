import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE15HybridCharacter } from '../src/e15-hybrid-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? 'e15-hybrid-gate-diagnostic.json';

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_staticBody;
  bodyDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.8;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, shapeDef, 30, 0.5, 30);
  return world;
}

function intent(overrides = {}) {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function tick(world, character, control, between = null) {
  character.preStep(DT, control);
  between?.(character);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function rootSignature(character) {
  return [
    ...character.position,
    ...character.velocity,
    ...character.externalVelocity,
    character.desiredSpeed,
    ...character.desiredDirection,
  ];
}

function maxDelta(a, b) {
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
}

function neutralDiagnostic() {
  const donorWorld = makeWorld();
  const hybridWorld = makeWorld();
  const donor = createCurrentDonorCharacter(b3, donorWorld, { startPosition: [0, 0.9, 0], gravity: 20 });
  const hybrid = createE15HybridCharacter(b3, hybridWorld, { startPosition: [0, 0.9, 0], gravity: 20, feedbackGain: 1 });
  let rootDelta = 0;
  let offset = 0;
  let horizontalOffset = 0;
  let verticalOffset = 0;
  let tilt = 0;
  let feedbackImpulse = 0;
  const phases = {};

  function phase(name, frames, controlForFrame) {
    const metrics = { offset: 0, horizontalOffset: 0, verticalOffset: 0, tilt: 0, feedbackImpulse: 0, rootDelta: 0 };
    for (let i = 0; i < frames; i++) {
      const control = controlForFrame(i);
      tick(donorWorld, donor, control);
      tick(hybridWorld, hybrid, control);
      const d = maxDelta(rootSignature(donor), rootSignature(hybrid));
      metrics.rootDelta = Math.max(metrics.rootDelta, d);
      metrics.offset = Math.max(metrics.offset, hybrid.bodyOffsetDistance);
      metrics.horizontalOffset = Math.max(metrics.horizontalOffset, hybrid.bodyHorizontalOffset);
      metrics.verticalOffset = Math.max(metrics.verticalOffset, Math.abs(hybrid.bodyVerticalOffset));
      metrics.tilt = Math.max(metrics.tilt, hybrid.bodyTilt);
      metrics.feedbackImpulse = Math.max(metrics.feedbackImpulse, hybrid.lastBodyFeedbackImpulse);
      rootDelta = Math.max(rootDelta, d);
      offset = Math.max(offset, hybrid.bodyOffsetDistance);
      horizontalOffset = Math.max(horizontalOffset, hybrid.bodyHorizontalOffset);
      verticalOffset = Math.max(verticalOffset, Math.abs(hybrid.bodyVerticalOffset));
      tilt = Math.max(tilt, hybrid.bodyTilt);
      feedbackImpulse = Math.max(feedbackImpulse, hybrid.lastBodyFeedbackImpulse);
    }
    phases[name] = metrics;
  }

  phase('settle', 45, () => intent());
  phase('forward-sprint', 75, (i) => intent({ moveForward: 1, sprint: i > 35 }));
  phase('diagonal', 30, () => intent({ moveRight: 0.65, moveForward: 0.35 }));
  phase('pre-jump-neutral', 8, () => intent());
  phase('jump', 80, (i) => intent({ jump: i === 0, jumpHeld: i < 12, moveForward: i < 42 ? 0.55 : 0 }));
  phase('post-jump-neutral', 60, () => intent());

  const result = { rootDelta, offset, horizontalOffset, verticalOffset, tilt, feedbackImpulse, phases };
  b3.b3DestroyWorld(donorWorld);
  b3.b3DestroyWorld(hybridWorld);
  return result;
}

function bodyImpulseDiagnostic() {
  const activeWorld = makeWorld();
  const controlWorld = makeWorld();
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const active = createE15HybridCharacter(b3, activeWorld, { ...common, feedbackGain: 1 });
  const control = createE15HybridCharacter(b3, controlWorld, { ...common, feedbackGain: 0 });
  for (let i = 0; i < 45; i++) {
    tick(activeWorld, active, intent());
    tick(controlWorld, control, intent());
  }
  tick(activeWorld, active, intent(), (character) => character.applyBodyImpulse([20, 0, 0]));
  tick(controlWorld, control, intent(), (character) => character.applyBodyImpulse([20, 0, 0]));
  const samples = [{
    frame: 0,
    activeVelocityX: active.velocity[0],
    activeExternalX: active.externalVelocity[0],
    controlVelocityX: control.velocity[0],
    controlExternalX: control.externalVelocity[0],
    activeBodyPhysicsImpulse: active.lastBodyPhysicsImpulse,
    controlBodyPhysicsImpulse: control.lastBodyPhysicsImpulse,
    activeFeedbackImpulse: active.lastBodyFeedbackImpulse,
    bodyOffset: active.bodyOffsetDistance,
  }];
  for (let i = 1; i <= 20; i++) {
    tick(activeWorld, active, intent());
    tick(controlWorld, control, intent());
    if ([1, 3, 5, 10, 20].includes(i)) {
      samples.push({
        frame: i,
        activeVelocityX: active.velocity[0],
        activeExternalX: active.externalVelocity[0],
        controlVelocityX: control.velocity[0],
        controlExternalX: control.externalVelocity[0],
        activeBodyPhysicsImpulse: active.lastBodyPhysicsImpulse,
        activeFeedbackImpulse: active.lastBodyFeedbackImpulse,
        bodyOffset: active.bodyOffsetDistance,
      });
    }
  }
  b3.b3DestroyWorld(activeWorld);
  b3.b3DestroyWorld(controlWorld);
  return { samples };
}

function rotationDiagnostic() {
  const world = makeWorld();
  const character = createE15HybridCharacter(b3, world, { startPosition: [0, 0.9, 0], gravity: 20, feedbackGain: 0 });
  for (let i = 0; i < 45; i++) tick(world, character, intent());
  tick(world, character, intent(), (hybrid) => b3.b3Body_ApplyAngularImpulse(hybrid.embodimentBody, [5, 0, 0], true));
  let peakTilt = character.bodyTilt;
  let peakTorque = character.lastUprightTorque;
  const samples = [{ frame: 0, tilt: character.bodyTilt, torque: character.lastUprightTorque }];
  for (let i = 1; i <= 120; i++) {
    tick(world, character, intent());
    peakTilt = Math.max(peakTilt, character.bodyTilt);
    peakTorque = Math.max(peakTorque, character.lastUprightTorque);
    if ([1, 3, 5, 10, 20, 40, 80, 120].includes(i)) samples.push({ frame: i, tilt: character.bodyTilt, torque: character.lastUprightTorque });
  }
  const result = { peakTilt, peakTorque, finalTilt: character.bodyTilt, samples };
  b3.b3DestroyWorld(world);
  return result;
}

const report = { schema: 'e15-hybrid-gate-diagnostic-v1' };
for (const [name, fn] of [
  ['neutral', neutralDiagnostic],
  ['bodyImpulse', bodyImpulseDiagnostic],
  ['rotation', rotationDiagnostic],
]) {
  try {
    report[name] = { status: 'CAPTURED', data: fn() };
  } catch (error) {
    report[name] = { status: 'ERROR', error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`E15 gate diagnostic captured: ${outPath}`);
