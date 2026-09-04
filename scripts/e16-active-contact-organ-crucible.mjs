import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE16ActiveContactOrganCharacter } from '../src/e16-active-contact-organ-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function makeWorld({ obstacle = 'none' } = {}) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShape, 20, 0.5, 20);

  let obstacleBody = null;
  if (obstacle === 'wall') {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [0.90, 1.0, 0];
    obstacleBody = b3.b3CreateBody(world, bodyDef);
    const shape = b3.b3DefaultShapeDef();
    shape.baseMaterial.friction = 0.55;
    b3.b3CreateBoxShape(obstacleBody, shape, 0.08, 1.0, 0.65);
  }

  if (obstacle === 'dynamic') {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [1.00, 0.80, 0];
    bodyDef.linearDamping = 0.02;
    bodyDef.angularDamping = 0.08;
    obstacleBody = b3.b3CreateBody(world, bodyDef);
    const shape = b3.b3DefaultShapeDef();
    shape.density = 18;
    shape.baseMaterial.friction = 0.72;
    shape.baseMaterial.restitution = 0.02;
    b3.b3CreateBoxShape(obstacleBody, shape, 0.25, 0.80, 0.48);
  }

  return { world, obstacleBody };
}

function intent(moveForward = 0, moveRight = 0, overrides = {}) {
  return {
    moveForward,
    moveRight,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
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

function bodyPosition(body) {
  if (!body) return null;
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function finiteCharacter(character, label) {
  const values = [
    ...character.position,
    ...character.velocity,
    ...character.externalVelocity,
    ...character.bodyPosition,
    ...character.bodyVelocity,
    ...character.organPosition,
    ...character.organVelocity,
    ...character.lastAggregateWorldImpulse,
  ];
  if (!values.every(Number.isFinite)) {
    throw new Error(`${label} produced non-finite state: ${JSON.stringify(values)}`);
  }
}

function runInternalMotionNeutrality() {
  const donorScenario = makeWorld();
  const activeScenario = makeWorld();
  const controlScenario = makeWorld();
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const donor = createCurrentDonorCharacter(b3, donorScenario.world, common);
  const active = createE16ActiveContactOrganCharacter(b3, activeScenario.world, {
    ...common,
    subsystemFeedbackGain: 1,
  });
  const control = createE16ActiveContactOrganCharacter(b3, controlScenario.world, {
    ...common,
    subsystemFeedbackGain: 0,
  });

  let activeVsDonor = 0;
  let controlVsDonor = 0;
  let maxAggregateImpulse = 0;
  let maxMotorImpulse = 0;
  let maxTargetError = 0;
  let contactFrames = 0;
  const samples = [];
  let frame = 0;

  function step(controlIntent, targetOffset, phase, phaseFrame) {
    active.setOrganTargetOffset(targetOffset);
    control.setOrganTargetOffset(targetOffset);
    tick(donorScenario.world, donor, controlIntent);
    tick(activeScenario.world, active, controlIntent);
    tick(controlScenario.world, control, controlIntent);

    activeVsDonor = Math.max(activeVsDonor, maxRootDelta(active, donor));
    controlVsDonor = Math.max(controlVsDonor, maxRootDelta(control, donor));
    maxAggregateImpulse = Math.max(maxAggregateImpulse, active.lastAggregateWorldImpulseMagnitude);
    maxMotorImpulse = Math.max(maxMotorImpulse, active.lastOrganMotorImpulse);
    maxTargetError = Math.max(maxTargetError, active.lastOrganTargetError);
    if (active.lastOrganContacts > 0 || active.lastBodyContacts > 0) contactFrames += 1;

    if (phaseFrame % 10 === 0) {
      samples.push({
        frame,
        phase,
        phaseFrame,
        root: [...active.position],
        core: [...active.bodyPosition],
        organ: [...active.organPosition],
        target: [...active.organTarget],
        targetError: active.lastOrganTargetError,
        motorImpulse: active.lastOrganMotorImpulse,
        aggregateWorldImpulse: [...active.lastAggregateWorldImpulse],
        aggregateWorldImpulseMagnitude: active.lastAggregateWorldImpulseMagnitude,
        feedbackImpulse: active.lastSubsystemFeedbackImpulse,
      });
    }
    finiteCharacter(active, `neutral active frame ${frame}`);
    finiteCharacter(control, `neutral control frame ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 45; i++) step(intent(), [0.42, 0, 0], 'settle', i);
  for (let i = 0; i < 30; i++) step(intent(), [0.82, 0.10, 0.18], 'internal-extend', i);
  for (let i = 0; i < 30; i++) step(intent(), [0.30, -0.10, -0.18], 'internal-retract', i);
  for (let i = 0; i < 75; i++) {
    const offset = i < 35 ? [0.78, 0.06, 0.16] : [0.34, 0.02, -0.12];
    step(intent(1, 0, { sprint: i > 35 }), offset, 'move-and-articulate', i);
  }
  for (let i = 0; i < 45; i++) step(intent(), [0.42, 0, 0], 'release', i);

  const result = {
    activeVsDonor,
    controlVsDonor,
    maxAggregateImpulse,
    maxMotorImpulse,
    maxTargetError,
    contactFrames,
    finalRoot: [...active.position],
    finalOrgan: [...active.organPosition],
    samples,
  };

  b3.b3DestroyWorld(donorScenario.world);
  b3.b3DestroyWorld(activeScenario.world);
  b3.b3DestroyWorld(controlScenario.world);
  return result;
}

function runContact({ obstacle }) {
  const activeScenario = makeWorld({ obstacle });
  const controlScenario = makeWorld({ obstacle });
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const active = createE16ActiveContactOrganCharacter(b3, activeScenario.world, {
    ...common,
    subsystemFeedbackGain: 1,
  });
  const control = createE16ActiveContactOrganCharacter(b3, controlScenario.world, {
    ...common,
    subsystemFeedbackGain: 0,
  });

  const activeObstacleStart = bodyPosition(activeScenario.obstacleBody);
  const controlObstacleStart = bodyPosition(controlScenario.obstacleBody);
  let activeContactFrames = 0;
  let controlContactFrames = 0;
  let persistentFrames = 0;
  let constraintFrames = 0;
  let maxAggregateImpulse = 0;
  let maxFeedbackImpulse = 0;
  let firstContact = null;
  const samples = [];
  let frame = 0;

  function step(targetOffset, phase, phaseFrame) {
    active.setOrganTargetOffset(targetOffset);
    control.setOrganTargetOffset(targetOffset);
    tick(activeScenario.world, active, intent());
    tick(controlScenario.world, control, intent());

    const activeInContact = active.lastOrganContacts > 0 || active.lastBodyContacts > 0;
    const controlInContact = control.lastOrganContacts > 0 || control.lastBodyContacts > 0;
    if (activeInContact) activeContactFrames += 1;
    if (controlInContact) controlContactFrames += 1;
    if (active.lastPersistentSubsystemFeedbackImpulse > 1e-8) persistentFrames += 1;
    if (active.lastConstraintSubsystemFeedbackImpulse > 1e-8) constraintFrames += 1;
    maxAggregateImpulse = Math.max(maxAggregateImpulse, active.lastAggregateWorldImpulseMagnitude);
    maxFeedbackImpulse = Math.max(maxFeedbackImpulse, active.lastSubsystemFeedbackImpulse);

    if (activeInContact && !firstContact) {
      firstContact = {
        frame,
        phase,
        phaseFrame,
        root: [...active.position],
        externalVelocity: [...active.externalVelocity],
        core: [...active.bodyPosition],
        organ: [...active.organPosition],
        target: [...active.organTarget],
        organContacts: active.lastOrganContacts,
        coreContacts: active.lastBodyContacts,
        aggregateWorldImpulse: [...active.lastAggregateWorldImpulse],
        aggregateWorldImpulseMagnitude: active.lastAggregateWorldImpulseMagnitude,
        feedbackImpulse: active.lastSubsystemFeedbackImpulse,
        persistentFeedbackImpulse: active.lastPersistentSubsystemFeedbackImpulse,
      };
    }

    if (phaseFrame % 5 === 0 || activeInContact) {
      samples.push({
        frame,
        phase,
        phaseFrame,
        activeRoot: [...active.position],
        controlRoot: [...control.position],
        activeExternal: [...active.externalVelocity],
        controlExternal: [...control.externalVelocity],
        organ: [...active.organPosition],
        target: [...active.organTarget],
        organContacts: active.lastOrganContacts,
        coreContacts: active.lastBodyContacts,
        aggregateWorldImpulse: [...active.lastAggregateWorldImpulse],
        aggregateWorldImpulseMagnitude: active.lastAggregateWorldImpulseMagnitude,
        feedbackImpulse: active.lastSubsystemFeedbackImpulse,
        persistent: active.lastSubsystemFeedbackPersistent,
        obstacleActive: bodyPosition(activeScenario.obstacleBody),
        obstacleControl: bodyPosition(controlScenario.obstacleBody),
      });
    }
    finiteCharacter(active, `${obstacle} active frame ${frame}`);
    finiteCharacter(control, `${obstacle} control frame ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 45; i++) step([0.42, 0, 0], 'settle', i);
  for (let i = 0; i < 65; i++) step([0.88, 0, 0], 'press', i);
  for (let i = 0; i < 50; i++) step([0.32, 0, 0], 'retract', i);

  const activeObstacleFinal = bodyPosition(activeScenario.obstacleBody);
  const controlObstacleFinal = bodyPosition(controlScenario.obstacleBody);
  const result = {
    obstacle,
    activeContactFrames,
    controlContactFrames,
    persistentFrames,
    constraintFrames,
    maxAggregateImpulse,
    maxFeedbackImpulse,
    firstContact,
    activeRootFinal: [...active.position],
    controlRootFinal: [...control.position],
    activeExternalFinal: [...active.externalVelocity],
    controlExternalFinal: [...control.externalVelocity],
    activeObstacleStart,
    activeObstacleFinal,
    controlObstacleStart,
    controlObstacleFinal,
    activeObstacleDisplacement: activeObstacleStart && activeObstacleFinal
      ? activeObstacleFinal[0] - activeObstacleStart[0]
      : null,
    controlObstacleDisplacement: controlObstacleStart && controlObstacleFinal
      ? controlObstacleFinal[0] - controlObstacleStart[0]
      : null,
    samples,
  };

  b3.b3DestroyWorld(activeScenario.world);
  b3.b3DestroyWorld(controlScenario.world);
  return result;
}

const report = {
  schema: 'e16-active-contact-organ-crucible-v0',
  hypothesis:
    'A solver-owned task-space organ can add a deliberate physical capability while aggregate momentum accounting prevents internal actuation from masquerading as external player consequence.',
  internalMotion: runInternalMotionNeutrality(),
  staticWall: runContact({ obstacle: 'wall' }),
  dynamicPush: runContact({ obstacle: 'dynamic' }),
  boundary:
    'Machine topology probe only. PASS establishes internal-momentum cancellation and causal world interaction for one active physical organ. It does not establish fun, preferred controls, anatomy, production architecture, or that an appendage should be the next Owner specimen.',
};

// Preserve negative evidence too.
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (report.internalMotion.contactFrames !== 0) {
  throw new Error(`E16 internal-motion control unexpectedly contacted world: ${report.internalMotion.contactFrames}`);
}
if (!(report.internalMotion.maxMotorImpulse > 0.1 && report.internalMotion.maxTargetError > 0.05)) {
  throw new Error(`E16 internal actuator was not meaningfully exercised: ${JSON.stringify(report.internalMotion)}`);
}
if (report.internalMotion.maxAggregateImpulse > 1e-4) {
  throw new Error(`E16 internal actuation leaked into aggregate horizontal world impulse: ${report.internalMotion.maxAggregateImpulse}`);
}
if (report.internalMotion.activeVsDonor > 1e-7 || report.internalMotion.controlVsDonor > 1e-7) {
  throw new Error(
    `E16 internal organ motion changed Donor root without world interaction: active=${report.internalMotion.activeVsDonor} control=${report.internalMotion.controlVsDonor}`,
  );
}
if (!(report.staticWall.activeContactFrames > 0 && report.staticWall.maxAggregateImpulse > 0.05)) {
  throw new Error(`E16 static wall did not create external subsystem impulse: ${JSON.stringify(report.staticWall.firstContact)}`);
}
if (!(report.staticWall.maxFeedbackImpulse > 0.05 && report.staticWall.activeRootFinal[0] < report.staticWall.controlRootFinal[0] - 0.01)) {
  throw new Error(
    `E16 wall reaction did not causally reach carrier: activeX=${report.staticWall.activeRootFinal[0]} controlX=${report.staticWall.controlRootFinal[0]} feedback=${report.staticWall.maxFeedbackImpulse}`,
  );
}
if (!(report.dynamicPush.activeContactFrames > 0 && report.dynamicPush.controlContactFrames > 0)) {
  throw new Error(`E16 organ failed to contact dynamic prop in both causal variants`);
}
if (!(report.dynamicPush.controlObstacleDisplacement > 0.03)) {
  throw new Error(
    `E16 physical organ did not add the capability to move the dynamic prop: ${report.dynamicPush.controlObstacleDisplacement}`,
  );
}
if (!(report.dynamicPush.maxAggregateImpulse > 0.05 && report.dynamicPush.maxFeedbackImpulse > 0.05)) {
  throw new Error(
    `E16 dynamic push did not produce reciprocal world consequence: impulse=${report.dynamicPush.maxAggregateImpulse} feedback=${report.dynamicPush.maxFeedbackImpulse}`,
  );
}

console.log(
  `E16 active organ PASS: internal world impulse=${report.internalMotion.maxAggregateImpulse.toExponential(2)} ` +
  `wall feedback=${report.staticWall.maxFeedbackImpulse.toFixed(2)}N·s ` +
  `dynamic push=${report.dynamicPush.controlObstacleDisplacement.toFixed(3)}m ` +
  `dynamic feedback=${report.dynamicPush.maxFeedbackImpulse.toFixed(2)}N·s`,
);
