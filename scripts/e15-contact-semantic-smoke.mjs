import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE15ContactSemanticCharacter } from '../src/e15-contact-semantic-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const EPS = 1e-9;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.8;
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
  const av = rootSignature(a);
  const bv = rootSignature(b);
  return Math.max(...av.map((value, index) => Math.abs(value - bv[index])));
}

function runNeutral() {
  const donorWorld = makeWorld();
  const hybridWorld = makeWorld();
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const donor = createCurrentDonorCharacter(b3, donorWorld, common);
  const hybrid = createE15ContactSemanticCharacter(b3, hybridWorld, { ...common, feedbackGain: 1 });
  let worstRootDelta = 0;
  let maxHorizontalOffset = 0;
  let maxFeedback = 0;

  const step = (control) => {
    tick(donorWorld, donor, control);
    tick(hybridWorld, hybrid, control);
    worstRootDelta = Math.max(worstRootDelta, maxDelta(donor, hybrid));
    maxHorizontalOffset = Math.max(maxHorizontalOffset, hybrid.bodyHorizontalOffset);
    maxFeedback = Math.max(maxFeedback, hybrid.lastBodyFeedbackImpulse);
  };

  for (let i = 0; i < 45; i++) step(intent());
  for (let i = 0; i < 75; i++) step(intent({ moveForward: 1, sprint: i > 35 }));
  for (let i = 0; i < 30; i++) step(intent({ moveForward: 0.35, moveRight: 0.65 }));
  for (let i = 0; i < 8; i++) step(intent());
  for (let i = 0; i < 80; i++) {
    step(intent({ jump: i === 0, jumpHeld: i < 12, moveForward: i < 42 ? 0.55 : 0 }));
  }
  for (let i = 0; i < 60; i++) step(intent());

  const result = {
    worstRootDelta,
    maxHorizontalOffset,
    maxFeedback,
    contactEpisodes: hybrid.bodyContactEpisodeCount,
  };
  if (worstRootDelta > EPS) throw new Error(`E15.1 neutral traversal changed Donor root: ${worstRootDelta}`);
  if (maxFeedback > 1e-7) throw new Error(`E15.1 neutral traversal created consequence feedback: ${maxFeedback}`);
  if (maxHorizontalOffset > 0.01) throw new Error(`E15.1 neutral horizontal body lag exceeded sanity bound: ${maxHorizontalOffset}`);
  if (hybrid.bodyContactEpisodeCount !== 0) throw new Error(`E15.1 neutral episode unexpectedly contacted world: ${hybrid.bodyContactEpisodeCount}`);

  b3.b3DestroyWorld(donorWorld);
  b3.b3DestroyWorld(hybridWorld);
  return result;
}

function runFreeBodyImpulse() {
  const activeWorld = makeWorld();
  const controlWorld = makeWorld();
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const active = createE15ContactSemanticCharacter(b3, activeWorld, { ...common, feedbackGain: 1 });
  const control = createE15ContactSemanticCharacter(b3, controlWorld, { ...common, feedbackGain: 0 });
  for (let i = 0; i < 45; i++) {
    tick(activeWorld, active, intent());
    tick(controlWorld, control, intent());
  }

  tick(activeWorld, active, intent(), (character) => character.applyBodyImpulse([20, 0, 0]));
  tick(controlWorld, control, intent(), (character) => character.applyBodyImpulse([20, 0, 0]));

  const immediate = {
    activeVelocityX: active.velocity[0],
    activeExternalX: active.externalVelocity[0],
    controlVelocityX: control.velocity[0],
    controlExternalX: control.externalVelocity[0],
    physicsImpulse: active.lastBodyPhysicsImpulse,
    feedbackImpulse: active.lastBodyFeedbackImpulse,
    persistentImpulse: active.lastBodyPersistentFeedbackImpulse,
    constraintImpulse: active.lastBodyConstraintFeedbackImpulse,
  };

  let externalAfter3 = active.externalVelocity[0];
  for (let i = 0; i < 3; i++) tick(activeWorld, active, intent());
  externalAfter3 = active.externalVelocity[0];

  if (!(immediate.physicsImpulse > 19.5 && immediate.persistentImpulse > 19.5)) {
    throw new Error(`E15.1 free body impulse did not become persistent consequence: ${JSON.stringify(immediate)}`);
  }
  if (immediate.constraintImpulse > 1e-8) {
    throw new Error(`E15.1 free body impulse was misclassified as contact constraint: ${immediate.constraintImpulse}`);
  }
  if (!(immediate.activeExternalX > 0.20 && externalAfter3 > 0.05)) {
    throw new Error(`E15.1 free body consequence did not persist: immediate=${immediate.activeExternalX} after3=${externalAfter3}`);
  }
  if (Math.abs(immediate.controlVelocityX) > 1e-8 || Math.abs(immediate.controlExternalX) > 1e-8) {
    throw new Error(`E15.1 feedback-off free body impulse changed root: ${JSON.stringify(immediate)}`);
  }

  b3.b3DestroyWorld(activeWorld);
  b3.b3DestroyWorld(controlWorld);
  return { ...immediate, externalAfter3 };
}

function runRotation() {
  const world = makeWorld();
  const character = createE15ContactSemanticCharacter(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    feedbackGain: 0,
  });
  for (let i = 0; i < 45; i++) tick(world, character, intent());
  tick(world, character, intent(), (hybrid) => {
    b3.b3Body_ApplyAngularImpulse(hybrid.embodimentBody, [5, 0, 0], true);
  });
  let peakTilt = character.bodyTilt;
  let peakTorque = character.lastUprightTorque;
  for (let i = 0; i < 120; i++) {
    tick(world, character, intent());
    peakTilt = Math.max(peakTilt, character.bodyTilt);
    peakTorque = Math.max(peakTorque, character.lastUprightTorque);
  }
  const result = { peakTilt, finalTilt: character.bodyTilt, peakTorque };
  if (!(peakTilt > 0.03 && character.bodyTilt < peakTilt)) {
    throw new Error(`E15.1 rotational embodiment failed finite perturb/recovery: ${JSON.stringify(result)}`);
  }
  if (peakTorque > character.maxUprightTorque + 1e-8) {
    throw new Error(`E15.1 upright torque exceeded cap: ${peakTorque}`);
  }
  b3.b3DestroyWorld(world);
  return result;
}

const report = {
  schema: 'e15-contact-semantic-bridge-smoke-v1',
  neutral: runNeutral(),
  freeBodyImpulse: runFreeBodyImpulse(),
  rotation: runRotation(),
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `E15.1 bridge smoke PASS: neutral=${report.neutral.worstRootDelta.toExponential(2)} ` +
  `freePersistent=${report.freeBodyImpulse.persistentImpulse.toFixed(2)}N·s ` +
  `external3f=${report.freeBodyImpulse.externalAfter3.toFixed(3)}m/s ` +
  `tiltPeak=${(report.rotation.peakTilt * 180 / Math.PI).toFixed(2)}deg`,
);
