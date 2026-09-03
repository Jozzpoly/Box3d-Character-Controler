import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE15HybridCharacter } from '../src/e15-hybrid-character.js';

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

function maxAbsVectorDelta(a, b) {
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
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

function assertFinite(values, label) {
  if (!values.every(Number.isFinite)) throw new Error(`${label} contains non-finite values: ${values}`);
}

function runNeutralEquivalence() {
  const donorWorld = makeWorld();
  const hybridWorld = makeWorld();
  const donor = createCurrentDonorCharacter(b3, donorWorld, { startPosition: [0, 0.9, 0], gravity: 20 });
  const hybrid = createE15HybridCharacter(b3, hybridWorld, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    feedbackGain: 1,
  });

  let worstRootDelta = 0;
  let maxBodyOffset = 0;
  let maxBodyTilt = 0;
  let maxNeutralFeedback = 0;
  let frame = 0;

  const stepBoth = (control) => {
    tick(donorWorld, donor, control);
    tick(hybridWorld, hybrid, control);
    const rootDelta = maxAbsVectorDelta(rootSignature(donor), rootSignature(hybrid));
    worstRootDelta = Math.max(worstRootDelta, rootDelta);
    maxBodyOffset = Math.max(maxBodyOffset, hybrid.bodyOffsetDistance);
    maxBodyTilt = Math.max(maxBodyTilt, hybrid.bodyTilt);
    maxNeutralFeedback = Math.max(maxNeutralFeedback, hybrid.lastBodyFeedbackImpulse);
    assertFinite(rootSignature(hybrid), `neutral frame ${frame} root`);
    assertFinite([
      hybrid.bodyOffsetDistance,
      hybrid.bodyTilt,
      hybrid.lastBodyFeedbackImpulse,
      hybrid.lastFollowImpulse,
      hybrid.lastUprightTorque,
    ], `neutral frame ${frame} body telemetry`);
    frame += 1;
  };

  for (let i = 0; i < 45; i++) stepBoth(intent());
  for (let i = 0; i < 75; i++) stepBoth(intent({ moveForward: 1, sprint: i > 35 }));
  for (let i = 0; i < 30; i++) stepBoth(intent({ moveRight: 0.65, moveForward: 0.35 }));
  for (let i = 0; i < 8; i++) stepBoth(intent());
  for (let i = 0; i < 80; i++) {
    stepBoth(intent({ jump: i === 0, jumpHeld: i < 12, moveForward: i < 42 ? 0.55 : 0 }));
  }
  for (let i = 0; i < 60; i++) stepBoth(intent());

  if (worstRootDelta > EPS) {
    throw new Error(`E15 inactive body layer changed Donor root trajectory: max delta ${worstRootDelta}`);
  }
  if (maxNeutralFeedback > 1e-7) {
    throw new Error(`E15 neutral body produced horizontal consequence feedback: ${maxNeutralFeedback} N·s`);
  }
  if (maxBodyOffset > 0.5) {
    throw new Error(`E15 body bridge ran away during neutral Donor episode: offset ${maxBodyOffset} m`);
  }
  if (maxBodyTilt > 0.35) {
    throw new Error(`E15 body bridge accumulated unexplained neutral tilt: ${maxBodyTilt} rad`);
  }

  b3.b3DestroyWorld(donorWorld);
  b3.b3DestroyWorld(hybridWorld);
  return { worstRootDelta, maxBodyOffset, maxBodyTilt, maxNeutralFeedback };
}

function createHybridPair() {
  const activeWorld = makeWorld();
  const controlWorld = makeWorld();
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const active = createE15HybridCharacter(b3, activeWorld, { ...common, feedbackGain: 1 });
  const control = createE15HybridCharacter(b3, controlWorld, { ...common, feedbackGain: 0 });
  for (let i = 0; i < 45; i++) {
    tick(activeWorld, active, intent());
    tick(controlWorld, control, intent());
  }
  return { activeWorld, controlWorld, active, control };
}

function runBodyImpulseCausality() {
  const { activeWorld, controlWorld, active, control } = createHybridPair();
  const bodyImpulse = [20, 0, 0];

  tick(activeWorld, active, intent(), (character) => character.applyBodyImpulse(bodyImpulse));
  tick(controlWorld, control, intent(), (character) => character.applyBodyImpulse(bodyImpulse));

  const immediate = {
    activeVelocityX: active.velocity[0],
    activeExternalX: active.externalVelocity[0],
    controlVelocityX: control.velocity[0],
    controlExternalX: control.externalVelocity[0],
    activeBodyPhysicsImpulse: active.lastBodyPhysicsImpulse,
    controlBodyPhysicsImpulse: control.lastBodyPhysicsImpulse,
    activeFeedbackImpulse: active.lastBodyFeedbackImpulse,
  };

  if (active.lastBodyPhysicsImpulse < 19.5 || control.lastBodyPhysicsImpulse < 19.5) {
    throw new Error(`E15 body impulse was not measured as physical body response: active=${active.lastBodyPhysicsImpulse} control=${control.lastBodyPhysicsImpulse}`);
  }
  if (!(active.velocity[0] > 0.20 && active.externalVelocity[0] > 0.20)) {
    throw new Error(`E15 active body consequence did not reach root/external velocity: vx=${active.velocity[0]} external=${active.externalVelocity[0]}`);
  }
  if (Math.abs(control.velocity[0]) > 1e-8 || Math.abs(control.externalVelocity[0]) > 1e-8) {
    throw new Error(`E15 feedback-off control changed root after body-only impulse: vx=${control.velocity[0]} external=${control.externalVelocity[0]}`);
  }

  const initialExternal = active.externalVelocity[0];
  let after3 = initialExternal;
  let after20 = initialExternal;
  for (let i = 0; i < 20; i++) {
    tick(activeWorld, active, intent());
    tick(controlWorld, control, intent());
    if (i === 2) after3 = active.externalVelocity[0];
    if (i === 19) after20 = active.externalVelocity[0];
  }

  if (!(after3 > 0.05)) {
    throw new Error(`E15 body consequence was erased too quickly by responsive Donor: external after 3f=${after3}`);
  }
  if (!(after20 < after3)) {
    throw new Error(`E15 body consequence did not decay through declared external-velocity semantics: 3f=${after3} 20f=${after20}`);
  }

  b3.b3DestroyWorld(activeWorld);
  b3.b3DestroyWorld(controlWorld);
  return { ...immediate, initialExternal, after3, after20 };
}

function runRotationalResponse() {
  const world = makeWorld();
  const character = createE15HybridCharacter(b3, world, {
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
  const earlyTilt = character.bodyTilt;
  for (let i = 0; i < 120; i++) {
    tick(world, character, intent());
    peakTilt = Math.max(peakTilt, character.bodyTilt);
    peakTorque = Math.max(peakTorque, character.lastUprightTorque);
  }
  const finalTilt = character.bodyTilt;

  if (!(peakTilt > 0.03)) throw new Error(`E15 angular impulse did not visibly perturb body tilt: ${peakTilt}`);
  if (!(peakTorque > 1)) throw new Error(`E15 upright actuator never responded to body tilt: ${peakTorque}`);
  if (!(finalTilt < peakTilt)) throw new Error(`E15 finite upright response did not reduce perturbation: peak=${peakTilt} final=${finalTilt}`);
  if (peakTorque > character.maxUprightTorque + 1e-8) {
    throw new Error(`E15 upright torque exceeded finite cap: ${peakTorque} > ${character.maxUprightTorque}`);
  }

  b3.b3DestroyWorld(world);
  return { earlyTilt, peakTilt, finalTilt, peakTorque };
}

const report = {
  schema: 'e15-donor-physical-body-bridge-v0',
  neutral: runNeutralEquivalence(),
  bodyImpulse: runBodyImpulseCausality(),
  rotation: runRotationalResponse(),
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `E15 hybrid bridge smoke PASS: neutralRootDelta=${report.neutral.worstRootDelta.toExponential(2)} ` +
  `neutralFeedback=${report.neutral.maxNeutralFeedback.toExponential(2)}N·s ` +
  `bodyFeedback=${report.bodyImpulse.activeFeedbackImpulse.toFixed(2)}N·s ` +
  `external3f=${report.bodyImpulse.after3.toFixed(3)}m/s ` +
  `tiltPeak=${(report.rotation.peakTilt * 180 / Math.PI).toFixed(2)}deg`,
);
