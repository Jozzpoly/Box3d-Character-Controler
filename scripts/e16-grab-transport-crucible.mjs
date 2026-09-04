import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE16GrabTransportCharacter } from '../src/e16-grab-transport-character.js';

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

function makeWorld(kind = 'wall') {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShape, 20, 0.5, 20);

  const bodyDef = b3.b3DefaultBodyDef();
  if (kind === 'wall') {
    bodyDef.position = [0.90, 1.0, 0];
  } else {
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [1.00, 0.80, 0];
    bodyDef.linearDamping = 0.02;
    bodyDef.angularDamping = 0.08;
    bodyDef.enableSleep = false;
  }
  const targetBody = b3.b3CreateBody(world, bodyDef);
  const shape = b3.b3DefaultShapeDef();
  shape.baseMaterial.friction = kind === 'wall' ? 0.55 : 0.72;
  shape.baseMaterial.restitution = kind === 'wall' ? 0 : 0.02;
  if (kind !== 'wall') shape.density = 18;
  if (kind === 'wall') b3.b3CreateBoxShape(targetBody, shape, 0.08, 1.0, 0.65);
  else b3.b3CreateBoxShape(targetBody, shape, 0.25, 0.80, 0.48);

  return { world, targetBody };
}

function makeCharacter(world, transportGain) {
  return createE16GrabTransportCharacter(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    subsystemFeedbackGain: 1,
    constraintTransportGain: transportGain,
  });
}

function tick(world, character, target) {
  character.setOrganTargetOffset(target);
  character.preStep(DT, neutralIntent());
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function frontAnchor(character) {
  return [
    character.organPosition[0] + character.organRadius,
    character.organPosition[1],
    character.organPosition[2],
  ];
}

function ensureFinite(character, label) {
  const values = [
    ...character.position,
    ...character.velocity,
    ...character.externalVelocity,
    ...character.lastAggregateWorldTransport,
    ...character.lastAppliedGrabTransport,
  ];
  if (!values.every(Number.isFinite)) throw new Error(`${label} non-finite: ${JSON.stringify(values)}`);
}

function runStaticAuthorityLease() {
  const activeScene = makeWorld('wall');
  const controlScene = makeWorld('wall');
  const active = makeCharacter(activeScene.world, 1);
  const control = makeCharacter(controlScene.world, 0);

  let frame = 0;
  let activeGrabFrame = null;
  let controlGrabFrame = null;
  let rootAtRetractActive = null;
  let rootAtRetractControl = null;
  let activePeakToward = -Infinity;
  let controlPeakToward = -Infinity;
  let activeMinDuringExtend = Infinity;
  let controlMinDuringExtend = Infinity;
  let extendTransportSum = 0;
  let retractTransportSum = 0;
  let activeAppliedSumX = 0;
  let controlAppliedMagnitude = 0;
  let persistentAfterGrab = 0;
  let constraintFrames = 0;
  const samples = [];

  function step(target, phase, phaseFrame) {
    tick(activeScene.world, active, target);
    tick(controlScene.world, control, target);

    if (!active.grabJoint && activeGrabFrame === null && active.lastOrganContacts > 0) {
      active.grabBody(activeScene.targetBody, frontAnchor(active));
      activeGrabFrame = frame;
    }
    if (!control.grabJoint && controlGrabFrame === null && control.lastOrganContacts > 0) {
      control.grabBody(controlScene.targetBody, frontAnchor(control));
      controlGrabFrame = frame;
    }

    if (activeGrabFrame !== null && frame > activeGrabFrame) {
      if (active.lastSubsystemFeedbackPersistent) persistentAfterGrab += 1;
      if (active.lastConstraintSubsystemFeedbackImpulse > 1e-8) constraintFrames += 1;
      activeAppliedSumX += active.lastAppliedGrabTransport[0];
      controlAppliedMagnitude += control.lastAppliedGrabTransportDistance;
      if (phase === 'reach-held') {
        extendTransportSum += active.lastAggregateWorldTransport[0];
        activeMinDuringExtend = Math.min(activeMinDuringExtend, active.position[0]);
        controlMinDuringExtend = Math.min(controlMinDuringExtend, control.position[0]);
      }
      if (phase === 'retract') {
        retractTransportSum += active.lastAggregateWorldTransport[0];
        activePeakToward = Math.max(activePeakToward, active.position[0]);
        controlPeakToward = Math.max(controlPeakToward, control.position[0]);
      }
    }

    if (phaseFrame % 8 === 0 || (activeGrabFrame !== null && frame <= activeGrabFrame + 5)) {
      samples.push({
        frame,
        phase,
        phaseFrame,
        activeRoot: [...active.position],
        controlRoot: [...control.position],
        activeCore: [...active.bodyPosition],
        activeOrgan: [...active.organPosition],
        grabbed: Boolean(active.grabJoint),
        worldTransport: [...active.lastAggregateWorldTransport],
        appliedTransport: [...active.lastAppliedGrabTransport],
        aggregateImpulse: [...active.lastAggregateWorldImpulse],
        constraintImpulse: active.lastConstraintSubsystemFeedbackImpulse,
        persistent: active.lastSubsystemFeedbackPersistent,
      });
    }

    ensureFinite(active, `static active ${frame}`);
    ensureFinite(control, `static control ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 40; i++) step([0.42, 0, 0], 'settle', i);
  for (let i = 0; i < 45; i++) step([0.88, 0, 0], 'reach-to-contact', i);
  for (let i = 0; i < 45; i++) step([0.88, 0, 0], 'reach-held', i);

  rootAtRetractActive = [...active.position];
  rootAtRetractControl = [...control.position];
  for (let i = 0; i < 90; i++) step([0.22, 0, 0], 'retract', i);

  const activeRootBeforeRelease = [...active.position];
  const controlRootBeforeRelease = [...control.position];
  const activeRelease = active.releaseGrab();
  const controlRelease = control.releaseGrab();
  for (let i = 0; i < 40; i++) step([0.42, 0, 0], 'released', i);

  const result = {
    activeGrabFrame,
    controlGrabFrame,
    rootAtRetractActive,
    rootAtRetractControl,
    activePeakToward: Number.isFinite(activePeakToward) ? activePeakToward : null,
    controlPeakToward: Number.isFinite(controlPeakToward) ? controlPeakToward : null,
    activeRetractPull: rootAtRetractActive && Number.isFinite(activePeakToward)
      ? activePeakToward - rootAtRetractActive[0]
      : null,
    controlRetractPull: rootAtRetractControl && Number.isFinite(controlPeakToward)
      ? controlPeakToward - rootAtRetractControl[0]
      : null,
    transportPullAdvantage: Number.isFinite(activePeakToward) && Number.isFinite(controlPeakToward)
      ? activePeakToward - controlPeakToward
      : null,
    activeMinDuringExtend: Number.isFinite(activeMinDuringExtend) ? activeMinDuringExtend : null,
    controlMinDuringExtend: Number.isFinite(controlMinDuringExtend) ? controlMinDuringExtend : null,
    extendTransportSum,
    retractTransportSum,
    activeAppliedSumX,
    controlAppliedMagnitude,
    persistentAfterGrab,
    constraintFrames,
    activeRootBeforeRelease,
    controlRootBeforeRelease,
    activeRelease,
    controlRelease,
    activeFinal: [...active.position],
    controlFinal: [...control.position],
    samples,
  };

  b3.b3DestroyWorld(activeScene.world);
  b3.b3DestroyWorld(controlScene.world);
  return result;
}

function runDynamicMeet() {
  const activeScene = makeWorld('dynamic');
  const controlScene = makeWorld('dynamic');
  const active = makeCharacter(activeScene.world, 1);
  const control = makeCharacter(controlScene.world, 0);
  const activeObstacleStart = bodyPosition(activeScene.targetBody);
  const controlObstacleStart = bodyPosition(controlScene.targetBody);

  let frame = 0;
  let activeGrabFrame = null;
  let controlGrabFrame = null;
  let activeRootAtRetract = null;
  let controlRootAtRetract = null;
  let activeObstacleAtRetract = null;
  let controlObstacleAtRetract = null;
  let minActiveDistance = Infinity;
  let minControlDistance = Infinity;
  let activePeakRoot = -Infinity;
  let controlPeakRoot = -Infinity;
  let persistentAfterGrab = 0;
  const samples = [];

  function step(target, phase, phaseFrame) {
    tick(activeScene.world, active, target);
    tick(controlScene.world, control, target);

    if (!active.grabJoint && activeGrabFrame === null && active.lastOrganContacts > 0) {
      active.grabBody(activeScene.targetBody, frontAnchor(active));
      activeGrabFrame = frame;
    }
    if (!control.grabJoint && controlGrabFrame === null && control.lastOrganContacts > 0) {
      control.grabBody(controlScene.targetBody, frontAnchor(control));
      controlGrabFrame = frame;
    }

    if (activeGrabFrame !== null && frame > activeGrabFrame && active.lastSubsystemFeedbackPersistent) {
      persistentAfterGrab += 1;
    }

    if (phase === 'retract') {
      const activeObstacle = bodyPosition(activeScene.targetBody);
      const controlObstacle = bodyPosition(controlScene.targetBody);
      minActiveDistance = Math.min(minActiveDistance, Math.abs(activeObstacle[0] - active.position[0]));
      minControlDistance = Math.min(minControlDistance, Math.abs(controlObstacle[0] - control.position[0]));
      activePeakRoot = Math.max(activePeakRoot, active.position[0]);
      controlPeakRoot = Math.max(controlPeakRoot, control.position[0]);
    }

    if (phaseFrame % 10 === 0 || (activeGrabFrame !== null && frame <= activeGrabFrame + 4)) {
      samples.push({
        frame,
        phase,
        activeRoot: [...active.position],
        controlRoot: [...control.position],
        activeObstacle: bodyPosition(activeScene.targetBody),
        controlObstacle: bodyPosition(controlScene.targetBody),
        worldTransport: [...active.lastAggregateWorldTransport],
        appliedTransport: [...active.lastAppliedGrabTransport],
        aggregateImpulse: [...active.lastAggregateWorldImpulse],
      });
    }

    ensureFinite(active, `dynamic active ${frame}`);
    ensureFinite(control, `dynamic control ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 40; i++) step([0.42, 0, 0], 'settle', i);
  for (let i = 0; i < 100; i++) step([0.88, 0, 0], 'reach-and-grab', i);
  activeRootAtRetract = [...active.position];
  controlRootAtRetract = [...control.position];
  activeObstacleAtRetract = bodyPosition(activeScene.targetBody);
  controlObstacleAtRetract = bodyPosition(controlScene.targetBody);
  for (let i = 0; i < 120; i++) step([0.20, 0, 0], 'retract', i);

  const activeObstacleFinal = bodyPosition(activeScene.targetBody);
  const controlObstacleFinal = bodyPosition(controlScene.targetBody);
  const result = {
    activeGrabFrame,
    controlGrabFrame,
    activeObstacleStart,
    controlObstacleStart,
    activeRootAtRetract,
    controlRootAtRetract,
    activeObstacleAtRetract,
    controlObstacleAtRetract,
    activeObstacleFinal,
    controlObstacleFinal,
    activeRootFinal: [...active.position],
    controlRootFinal: [...control.position],
    activeRootPull: Number.isFinite(activePeakRoot) ? activePeakRoot - activeRootAtRetract[0] : null,
    controlRootPull: Number.isFinite(controlPeakRoot) ? controlPeakRoot - controlRootAtRetract[0] : null,
    rootTransportAdvantage: Number.isFinite(activePeakRoot) && Number.isFinite(controlPeakRoot)
      ? activePeakRoot - controlPeakRoot
      : null,
    minActiveDistance: Number.isFinite(minActiveDistance) ? minActiveDistance : null,
    minControlDistance: Number.isFinite(minControlDistance) ? minControlDistance : null,
    meetAdvantage: Number.isFinite(minActiveDistance) && Number.isFinite(minControlDistance)
      ? minControlDistance - minActiveDistance
      : null,
    persistentAfterGrab,
    samples,
  };

  if (active.grabJoint) active.releaseGrab();
  if (control.grabJoint) control.releaseGrab();
  b3.b3DestroyWorld(activeScene.world);
  b3.b3DestroyWorld(controlScene.world);
  return result;
}

function capture(name, fn) {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return {
      ok: false,
      name,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      stack: error instanceof Error ? error.stack : null,
    };
  }
}

const report = {
  schema: 'e16-grab-constraint-transport-crucible-v0',
  hypothesis:
    'During an explicit physical grab, aggregate solver-owned COM displacement residual can temporarily lease horizontal displacement authority to the physical subsystem without becoming persistent knockback or bypassing the Donor capsule mover.',
  staticAuthorityLease: capture('staticAuthorityLease', runStaticAuthorityLease),
  dynamicMeet: capture('dynamicMeet', runDynamicMeet),
  boundary:
    'Machine qualification of a horizontal authority-transfer primitive only. PASS does not establish fun, control mapping, climbing quality, vertical embodiment, final anatomy or production architecture.',
};
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

for (const [name, section] of Object.entries({
  staticAuthorityLease: report.staticAuthorityLease,
  dynamicMeet: report.dynamicMeet,
})) {
  if (!section.ok) throw new Error(`E16.1b ${name} execution failed: ${section.error}`);
}

const s = report.staticAuthorityLease.value;
if (s.activeGrabFrame === null || s.controlGrabFrame === null) {
  throw new Error(`E16.1b static grab missing: active=${s.activeGrabFrame} control=${s.controlGrabFrame}`);
}
if (!(s.extendTransportSum < -0.02 && s.retractTransportSum > 0.02)) {
  throw new Error(`E16.1b solver transport did not reverse with extend/retract: extend=${s.extendTransportSum} retract=${s.retractTransportSum}`);
}
if (!(s.activeRetractPull > 0.08 && s.transportPullAdvantage > 0.06)) {
  throw new Error(`E16.1b transport did not pull carrier toward static anchor: pull=${s.activeRetractPull} advantage=${s.transportPullAdvantage}`);
}
if (!(s.controlAppliedMagnitude < 1e-10)) {
  throw new Error(`E16.1b zero-gain control still applied transport: ${s.controlAppliedMagnitude}`);
}
if (s.persistentAfterGrab !== 0) {
  throw new Error(`E16.1b sustained grab leaked persistent feedback on ${s.persistentAfterGrab} post-grab frames`);
}
if (!(s.constraintFrames > 5 && s.activeRelease && s.controlRelease)) {
  throw new Error(`E16.1b constraint/release semantics incomplete: frames=${s.constraintFrames} releases=${s.activeRelease}/${s.controlRelease}`);
}

const d = report.dynamicMeet.value;
if (d.activeGrabFrame === null || d.controlGrabFrame === null) {
  throw new Error(`E16.1b dynamic grab missing: active=${d.activeGrabFrame} control=${d.controlGrabFrame}`);
}
if (!(d.activeRootPull > 0.04 && d.rootTransportAdvantage > 0.03)) {
  throw new Error(`E16.1b dynamic reaction did not move carrier toward prop: pull=${d.activeRootPull} advantage=${d.rootTransportAdvantage}`);
}
if (!(d.meetAdvantage > 0.02)) {
  throw new Error(`E16.1b authority lease did not improve player/prop convergence: ${d.meetAdvantage}`);
}
if (d.persistentAfterGrab !== 0) {
  throw new Error(`E16.1b dynamic sustained grab leaked persistent feedback on ${d.persistentAfterGrab} post-grab frames`);
}

console.log(
  `E16.1b transport PASS: static pull=${s.activeRetractPull.toFixed(3)}m ` +
  `static advantage=${s.transportPullAdvantage.toFixed(3)}m ` +
  `dynamic root pull=${d.activeRootPull.toFixed(3)}m ` +
  `meet advantage=${d.meetAdvantage.toFixed(3)}m`,
);
