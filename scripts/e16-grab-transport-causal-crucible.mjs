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

function makeWorld(kind) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShape, 20, 0.5, 20);

  const targetDef = b3.b3DefaultBodyDef();
  if (kind === 'static') {
    targetDef.position = [0.90, 1.0, 0];
  } else {
    targetDef.type = b3.b3BodyType.b3_dynamicBody;
    targetDef.position = [1.00, 0.80, 0];
    targetDef.linearDamping = 0.02;
    targetDef.angularDamping = 0.08;
    targetDef.enableSleep = false;
  }
  const targetBody = b3.b3CreateBody(world, targetDef);
  const targetShape = b3.b3DefaultShapeDef();
  targetShape.baseMaterial.friction = kind === 'static' ? 0.55 : 0.72;
  targetShape.baseMaterial.restitution = kind === 'static' ? 0 : 0.02;
  if (kind === 'dynamic') targetShape.density = 18;
  if (kind === 'static') b3.b3CreateBoxShape(targetBody, targetShape, 0.08, 1.0, 0.65);
  else b3.b3CreateBoxShape(targetBody, targetShape, 0.25, 0.80, 0.48);

  return { world, targetBody };
}

function makeCharacter(world) {
  return createE16GrabTransportCharacter(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    subsystemFeedbackGain: 1,
    // Both specimens start with transport disabled. The treatment is switched on
    // only at the causal boundary after a stable grab has already been established.
    constraintTransportGain: 0,
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

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function maxAbsDelta(a, b) {
  let result = 0;
  for (let i = 0; i < a.length; i++) result = Math.max(result, Math.abs(a[i] - b[i]));
  return result;
}

function snapshot(character, targetBody = null) {
  return {
    root: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
    core: [...character.bodyPosition],
    coreVelocity: [...character.bodyVelocity],
    organ: [...character.organPosition],
    organVelocity: [...character.organVelocity],
    targetBody: targetBody ? bodyPosition(targetBody) : null,
  };
}

function stateDelta(a, b) {
  const fields = ['root', 'velocity', 'externalVelocity', 'core', 'coreVelocity', 'organ', 'organVelocity'];
  let delta = 0;
  for (const field of fields) delta = Math.max(delta, maxAbsDelta(a[field], b[field]));
  if (a.targetBody && b.targetBody) delta = Math.max(delta, maxAbsDelta(a.targetBody, b.targetBody));
  return delta;
}

function finite(character, label) {
  const values = [
    ...character.position,
    ...character.velocity,
    ...character.externalVelocity,
    ...character.bodyPosition,
    ...character.organPosition,
    ...character.lastAggregateWorldTransport,
    ...character.lastAppliedGrabTransport,
  ];
  if (!values.every(Number.isFinite)) throw new Error(`${label} non-finite state`);
}

function establishIdenticalGrab(activeScene, controlScene, active, control) {
  let activeGrabFrame = null;
  let controlGrabFrame = null;
  let frame = 0;

  function step(target) {
    tick(activeScene.world, active, target);
    tick(controlScene.world, control, target);
    if (!active.grabJoint && active.lastOrganContacts > 0) {
      active.grabBody(activeScene.targetBody, frontAnchor(active));
      activeGrabFrame ??= frame;
    }
    if (!control.grabJoint && control.lastOrganContacts > 0) {
      control.grabBody(controlScene.targetBody, frontAnchor(control));
      controlGrabFrame ??= frame;
    }
    finite(active, `active pre-treatment ${frame}`);
    finite(control, `control pre-treatment ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 40; i++) step([0.42, 0, 0]);
  for (let i = 0; i < 100 && (!active.grabJoint || !control.grabJoint); i++) step([0.88, 0, 0]);
  if (!active.grabJoint || !control.grabJoint) {
    throw new Error(`Failed to establish both grabs: active=${activeGrabFrame} control=${controlGrabFrame}`);
  }

  // Let the same explicit constraint settle in both worlds before treatment.
  for (let i = 0; i < 30; i++) step([0.88, 0, 0]);

  const activeState = snapshot(active, activeScene.targetBody);
  const controlState = snapshot(control, controlScene.targetBody);
  return {
    activeGrabFrame,
    controlGrabFrame,
    frame,
    activeState,
    controlState,
    preTreatmentDelta: stateDelta(activeState, controlState),
  };
}

function runStaticTreatment() {
  const activeScene = makeWorld('static');
  const controlScene = makeWorld('static');
  const active = makeCharacter(activeScene.world);
  const control = makeCharacter(controlScene.world);
  const baseline = establishIdenticalGrab(activeScene, controlScene, active, control);

  active.constraintTransportGain = 1;
  const activeStart = [...active.position];
  const controlStart = [...control.position];
  let activeAppliedX = 0;
  let controlApplied = 0;
  let activeWorldTransportX = 0;
  let persistentFrames = 0;
  const samples = [];

  for (let i = 0; i < 90; i++) {
    tick(activeScene.world, active, [0.22, 0, 0]);
    tick(controlScene.world, control, [0.22, 0, 0]);
    activeAppliedX += active.lastAppliedGrabTransport[0];
    controlApplied += control.lastAppliedGrabTransportDistance;
    activeWorldTransportX += active.lastAggregateWorldTransport[0];
    if (active.lastSubsystemFeedbackPersistent) persistentFrames += 1;
    if (i % 10 === 0) {
      samples.push({
        frame: i,
        activeRoot: [...active.position],
        controlRoot: [...control.position],
        worldTransport: [...active.lastAggregateWorldTransport],
        appliedTransport: [...active.lastAppliedGrabTransport],
      });
    }
  }

  const activeDelta = active.position[0] - activeStart[0];
  const controlDelta = control.position[0] - controlStart[0];
  const result = {
    ...baseline,
    activeStart,
    controlStart,
    activeFinal: [...active.position],
    controlFinal: [...control.position],
    activeDelta,
    controlDelta,
    treatmentAdvantage: activeDelta - controlDelta,
    activeAppliedX,
    controlApplied,
    activeWorldTransportX,
    persistentFrames,
    samples,
  };

  active.releaseGrab();
  control.releaseGrab();
  b3.b3DestroyWorld(activeScene.world);
  b3.b3DestroyWorld(controlScene.world);
  return result;
}

function runDynamicTreatment() {
  const activeScene = makeWorld('dynamic');
  const controlScene = makeWorld('dynamic');
  const active = makeCharacter(activeScene.world);
  const control = makeCharacter(controlScene.world);
  const baseline = establishIdenticalGrab(activeScene, controlScene, active, control);

  active.constraintTransportGain = 1;
  const activeRootStart = [...active.position];
  const controlRootStart = [...control.position];
  const activePropStart = bodyPosition(activeScene.targetBody);
  const controlPropStart = bodyPosition(controlScene.targetBody);
  const activeDistanceStart = Math.abs(activePropStart[0] - activeRootStart[0]);
  const controlDistanceStart = Math.abs(controlPropStart[0] - controlRootStart[0]);
  let appliedX = 0;
  let persistentFrames = 0;
  const samples = [];

  for (let i = 0; i < 120; i++) {
    tick(activeScene.world, active, [0.20, 0, 0]);
    tick(controlScene.world, control, [0.20, 0, 0]);
    appliedX += active.lastAppliedGrabTransport[0];
    if (active.lastSubsystemFeedbackPersistent) persistentFrames += 1;
    if (i % 12 === 0) {
      samples.push({
        frame: i,
        activeRoot: [...active.position],
        controlRoot: [...control.position],
        activeProp: bodyPosition(activeScene.targetBody),
        controlProp: bodyPosition(controlScene.targetBody),
        worldTransport: [...active.lastAggregateWorldTransport],
        appliedTransport: [...active.lastAppliedGrabTransport],
      });
    }
  }

  const activePropFinal = bodyPosition(activeScene.targetBody);
  const controlPropFinal = bodyPosition(controlScene.targetBody);
  const activeRootDelta = active.position[0] - activeRootStart[0];
  const controlRootDelta = control.position[0] - controlRootStart[0];
  const activeDistanceFinal = Math.abs(activePropFinal[0] - active.position[0]);
  const controlDistanceFinal = Math.abs(controlPropFinal[0] - control.position[0]);
  const activeClosure = activeDistanceStart - activeDistanceFinal;
  const controlClosure = controlDistanceStart - controlDistanceFinal;

  const result = {
    ...baseline,
    activeRootStart,
    controlRootStart,
    activePropStart,
    controlPropStart,
    activeRootFinal: [...active.position],
    controlRootFinal: [...control.position],
    activePropFinal,
    controlPropFinal,
    activeRootDelta,
    controlRootDelta,
    rootTreatmentAdvantage: activeRootDelta - controlRootDelta,
    activeDistanceStart,
    controlDistanceStart,
    activeDistanceFinal,
    controlDistanceFinal,
    activeClosure,
    controlClosure,
    closureTreatmentAdvantage: activeClosure - controlClosure,
    appliedX,
    persistentFrames,
    samples,
  };

  active.releaseGrab();
  control.releaseGrab();
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
  schema: 'e16-grab-constraint-transport-causal-ab-v0',
  hypothesis:
    'Starting from an identical already-grabbed physical state, enabling aggregate constraint transport only at retract onset causes additional geometry-checked carrier displacement toward the anchor/prop without persistent-impulse leakage.',
  staticTreatment: capture('staticTreatment', runStaticTreatment),
  dynamicTreatment: capture('dynamicTreatment', runDynamicTreatment),
  boundary:
    'Causal machine A/B for the horizontal authority lease only. Treatment is introduced after the grab state is equalized; this does not establish Owner fun or final interaction design.',
};
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

for (const [name, section] of Object.entries({
  staticTreatment: report.staticTreatment,
  dynamicTreatment: report.dynamicTreatment,
})) {
  if (!section.ok) throw new Error(`E16.1b causal ${name} execution failed: ${section.error}`);
}

const s = report.staticTreatment.value;
if (s.preTreatmentDelta > 2e-5) {
  throw new Error(`E16.1b static specimens diverged before treatment: ${s.preTreatmentDelta}`);
}
if (!(s.activeAppliedX > 0.02 && s.activeWorldTransportX > 0.02)) {
  throw new Error(`E16.1b static retract produced no positive physical transport: applied=${s.activeAppliedX} world=${s.activeWorldTransportX}`);
}
if (!(s.activeDelta > 0.05 && s.treatmentAdvantage > 0.04)) {
  throw new Error(`E16.1b static authority lease had weak causal effect: active=${s.activeDelta} control=${s.controlDelta} advantage=${s.treatmentAdvantage}`);
}
if (s.controlApplied > 1e-10 || s.persistentFrames !== 0) {
  throw new Error(`E16.1b static control/leak failed: controlApplied=${s.controlApplied} persistent=${s.persistentFrames}`);
}

const d = report.dynamicTreatment.value;
if (d.preTreatmentDelta > 2e-5) {
  throw new Error(`E16.1b dynamic specimens diverged before treatment: ${d.preTreatmentDelta}`);
}
if (!(d.appliedX > 0.005)) {
  throw new Error(`E16.1b dynamic retract produced no positive authority-lease transport: ${d.appliedX}`);
}
if (!(d.activeRootDelta > d.controlRootDelta + 0.005)) {
  throw new Error(`E16.1b dynamic root did not respond causally: active=${d.activeRootDelta} control=${d.controlRootDelta}`);
}
if (!(d.closureTreatmentAdvantage > 0.002)) {
  throw new Error(`E16.1b dynamic lease did not improve player/prop closure: ${d.closureTreatmentAdvantage}`);
}
if (d.persistentFrames !== 0) {
  throw new Error(`E16.1b dynamic sustained grab leaked persistent feedback on ${d.persistentFrames} frames`);
}

console.log(
  `E16.1b causal PASS: static Δ=${s.activeDelta.toFixed(3)}m vs ${s.controlDelta.toFixed(3)}m; ` +
  `dynamic root advantage=${d.rootTreatmentAdvantage.toFixed(3)}m; ` +
  `closure advantage=${d.closureTreatmentAdvantage.toFixed(3)}m`,
);
