import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE16GrabCharacter } from '../src/e16-grab-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function makeWorld({ obstacle = 'wall' } = {}) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShape, 20, 0.5, 20);

  let obstacleBody;
  if (obstacle === 'wall') {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [0.90, 1.0, 0];
    obstacleBody = b3.b3CreateBody(world, bodyDef);
    const shape = b3.b3DefaultShapeDef();
    shape.baseMaterial.friction = 0.55;
    b3.b3CreateBoxShape(obstacleBody, shape, 0.08, 1.0, 0.65);
  } else {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [1.00, 0.80, 0];
    bodyDef.linearDamping = 0.02;
    bodyDef.angularDamping = 0.08;
    bodyDef.enableSleep = false;
    obstacleBody = b3.b3CreateBody(world, bodyDef);
    const shape = b3.b3DefaultShapeDef();
    shape.density = 18;
    shape.baseMaterial.friction = 0.72;
    shape.baseMaterial.restitution = 0.02;
    b3.b3CreateBoxShape(obstacleBody, shape, 0.25, 0.80, 0.48);
  }

  return { world, obstacleBody };
}

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

function tick(world, character) {
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

function finiteState(character, label) {
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
  if (!values.every(Number.isFinite)) throw new Error(`${label} non-finite: ${JSON.stringify(values)}`);
}

function makeCharacter(world, feedback = 1) {
  return createE16GrabCharacter(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    subsystemFeedbackGain: feedback,
  });
}

function runStaticPull() {
  const activeScene = makeWorld({ obstacle: 'wall' });
  const noFeedbackScene = makeWorld({ obstacle: 'wall' });
  const noGrabScene = makeWorld({ obstacle: 'wall' });
  const active = makeCharacter(activeScene.world, 1);
  const noFeedback = makeCharacter(noFeedbackScene.world, 0);
  const noGrab = makeCharacter(noGrabScene.world, 1);

  let frame = 0;
  let activeGrabFrame = null;
  let noFeedbackGrabFrame = null;
  let activeRootAtGrab = null;
  let noFeedbackRootAtGrab = null;
  let activePeakX = -Infinity;
  let noFeedbackPeakX = -Infinity;
  let noGrabPeakX = -Infinity;
  let persistentFramesWhileGrabbed = 0;
  let constraintFramesWhileGrabbed = 0;
  let maxConstraintFeedback = 0;
  const samples = [];

  function step(target, phase, phaseFrame) {
    active.setOrganTargetOffset(target);
    noFeedback.setOrganTargetOffset(target);
    noGrab.setOrganTargetOffset(target);
    tick(activeScene.world, active);
    tick(noFeedbackScene.world, noFeedback);
    tick(noGrabScene.world, noGrab);

    if (!active.grabJoint && activeGrabFrame === null && active.lastOrganContacts > 0) {
      active.grabBody(activeScene.obstacleBody, frontAnchor(active));
      activeGrabFrame = frame;
      activeRootAtGrab = [...active.position];
    }
    if (!noFeedback.grabJoint && noFeedbackGrabFrame === null && noFeedback.lastOrganContacts > 0) {
      noFeedback.grabBody(noFeedbackScene.obstacleBody, frontAnchor(noFeedback));
      noFeedbackGrabFrame = frame;
      noFeedbackRootAtGrab = [...noFeedback.position];
    }

    activePeakX = Math.max(activePeakX, active.position[0]);
    noFeedbackPeakX = Math.max(noFeedbackPeakX, noFeedback.position[0]);
    noGrabPeakX = Math.max(noGrabPeakX, noGrab.position[0]);
    if (active.grabJoint) {
      if (active.lastSubsystemFeedbackPersistent) persistentFramesWhileGrabbed += 1;
      if (active.lastConstraintSubsystemFeedbackImpulse > 1e-8) constraintFramesWhileGrabbed += 1;
      maxConstraintFeedback = Math.max(maxConstraintFeedback, active.lastConstraintSubsystemFeedbackImpulse);
    }

    if (phaseFrame % 8 === 0 || active.lastOrganContacts > 0) {
      samples.push({
        frame,
        phase,
        phaseFrame,
        activeRoot: [...active.position],
        noFeedbackRoot: [...noFeedback.position],
        noGrabRoot: [...noGrab.position],
        organ: [...active.organPosition],
        target: [...active.organTarget],
        grabbed: Boolean(active.grabJoint),
        organContacts: active.lastOrganContacts,
        feedbackImpulse: active.lastSubsystemFeedbackImpulse,
        persistent: active.lastSubsystemFeedbackPersistent,
        constraintImpulse: active.lastConstraintSubsystemFeedbackImpulse,
      });
    }
    finiteState(active, `static active ${frame}`);
    finiteState(noFeedback, `static noFeedback ${frame}`);
    finiteState(noGrab, `static noGrab ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 40; i++) step([0.42, 0, 0], 'settle', i);
  for (let i = 0; i < 90; i++) step([0.88, 0, 0], 'reach-and-grab', i);
  for (let i = 0; i < 90; i++) step([0.22, 0, 0], 'retract-while-grabbed', i);

  const activeBeforeRelease = [...active.position];
  const noFeedbackBeforeRelease = [...noFeedback.position];
  const activeExternalBeforeRelease = [...active.externalVelocity];
  const releasedActive = active.releaseGrab();
  const releasedNoFeedback = noFeedback.releaseGrab();
  for (let i = 0; i < 55; i++) step([0.42, 0, 0], 'released-recovery', i);

  const result = {
    activeGrabFrame,
    noFeedbackGrabFrame,
    activeRootAtGrab,
    noFeedbackRootAtGrab,
    activePeakX,
    noFeedbackPeakX,
    noGrabPeakX,
    activePullDelta: activeRootAtGrab ? activePeakX - activeRootAtGrab[0] : null,
    noFeedbackPullDelta: noFeedbackRootAtGrab ? noFeedbackPeakX - noFeedbackRootAtGrab[0] : null,
    activeVsNoGrabPeakDelta: activePeakX - noGrabPeakX,
    persistentFramesWhileGrabbed,
    constraintFramesWhileGrabbed,
    maxConstraintFeedback,
    activeBeforeRelease,
    noFeedbackBeforeRelease,
    activeExternalBeforeRelease,
    releasedActive,
    releasedNoFeedback,
    activeGrabbedAfterRelease: Boolean(active.grabJoint),
    noFeedbackGrabbedAfterRelease: Boolean(noFeedback.grabJoint),
    activeFinal: [...active.position],
    noFeedbackFinal: [...noFeedback.position],
    noGrabFinal: [...noGrab.position],
    samples,
  };

  b3.b3DestroyWorld(activeScene.world);
  b3.b3DestroyWorld(noFeedbackScene.world);
  b3.b3DestroyWorld(noGrabScene.world);
  return result;
}

function runDynamicPull() {
  const grabScene = makeWorld({ obstacle: 'dynamic' });
  const noGrabScene = makeWorld({ obstacle: 'dynamic' });
  const noFeedbackScene = makeWorld({ obstacle: 'dynamic' });
  const grab = makeCharacter(grabScene.world, 1);
  const noGrab = makeCharacter(noGrabScene.world, 1);
  const noFeedback = makeCharacter(noFeedbackScene.world, 0);

  const grabObstacleStart = bodyPosition(grabScene.obstacleBody);
  const noGrabObstacleStart = bodyPosition(noGrabScene.obstacleBody);
  let frame = 0;
  let grabFrame = null;
  let noFeedbackGrabFrame = null;
  let obstacleAtGrab = null;
  let rootAtGrab = null;
  let minObstacleXAfterGrab = Infinity;
  let minDistanceAfterGrab = Infinity;
  let maxRootXAfterGrab = -Infinity;
  let persistentFramesWhileGrabbed = 0;
  let maxConstraintFeedback = 0;
  const samples = [];

  function step(target, phase, phaseFrame) {
    grab.setOrganTargetOffset(target);
    noGrab.setOrganTargetOffset(target);
    noFeedback.setOrganTargetOffset(target);
    tick(grabScene.world, grab);
    tick(noGrabScene.world, noGrab);
    tick(noFeedbackScene.world, noFeedback);

    if (!grab.grabJoint && grabFrame === null && grab.lastOrganContacts > 0) {
      grab.grabBody(grabScene.obstacleBody, frontAnchor(grab));
      grabFrame = frame;
      obstacleAtGrab = bodyPosition(grabScene.obstacleBody);
      rootAtGrab = [...grab.position];
    }
    if (!noFeedback.grabJoint && noFeedbackGrabFrame === null && noFeedback.lastOrganContacts > 0) {
      noFeedback.grabBody(noFeedbackScene.obstacleBody, frontAnchor(noFeedback));
      noFeedbackGrabFrame = frame;
    }

    if (grab.grabJoint) {
      const obstacle = bodyPosition(grabScene.obstacleBody);
      minObstacleXAfterGrab = Math.min(minObstacleXAfterGrab, obstacle[0]);
      minDistanceAfterGrab = Math.min(minDistanceAfterGrab, Math.abs(obstacle[0] - grab.position[0]));
      maxRootXAfterGrab = Math.max(maxRootXAfterGrab, grab.position[0]);
      if (grab.lastSubsystemFeedbackPersistent) persistentFramesWhileGrabbed += 1;
      maxConstraintFeedback = Math.max(maxConstraintFeedback, grab.lastConstraintSubsystemFeedbackImpulse);
    }

    if (phaseFrame % 8 === 0 || grab.lastOrganContacts > 0) {
      samples.push({
        frame,
        phase,
        phaseFrame,
        root: [...grab.position],
        noGrabRoot: [...noGrab.position],
        noFeedbackRoot: [...noFeedback.position],
        obstacle: bodyPosition(grabScene.obstacleBody),
        noGrabObstacle: bodyPosition(noGrabScene.obstacleBody),
        noFeedbackObstacle: bodyPosition(noFeedbackScene.obstacleBody),
        grabbed: Boolean(grab.grabJoint),
        contacts: grab.lastOrganContacts,
        aggregateImpulse: [...grab.lastAggregateWorldImpulse],
        feedbackImpulse: grab.lastSubsystemFeedbackImpulse,
        persistent: grab.lastSubsystemFeedbackPersistent,
        constraintImpulse: grab.lastConstraintSubsystemFeedbackImpulse,
      });
    }
    finiteState(grab, `dynamic grab ${frame}`);
    finiteState(noGrab, `dynamic noGrab ${frame}`);
    finiteState(noFeedback, `dynamic noFeedback ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 40; i++) step([0.42, 0, 0], 'settle', i);
  for (let i = 0; i < 100; i++) step([0.88, 0, 0], 'reach-and-grab', i);
  for (let i = 0; i < 120; i++) step([0.20, 0, 0], 'retract-while-grabbed', i);

  const grabObstacleFinal = bodyPosition(grabScene.obstacleBody);
  const noGrabObstacleFinal = bodyPosition(noGrabScene.obstacleBody);
  const noFeedbackObstacleFinal = bodyPosition(noFeedbackScene.obstacleBody);
  const distanceAtGrab = obstacleAtGrab && rootAtGrab ? Math.abs(obstacleAtGrab[0] - rootAtGrab[0]) : null;
  const result = {
    grabFrame,
    noFeedbackGrabFrame,
    grabObstacleStart,
    noGrabObstacleStart,
    obstacleAtGrab,
    rootAtGrab,
    grabObstacleFinal,
    noGrabObstacleFinal,
    noFeedbackObstacleFinal,
    grabObstacleDisplacement: grabObstacleFinal[0] - grabObstacleStart[0],
    noGrabObstacleDisplacement: noGrabObstacleFinal[0] - noGrabObstacleStart[0],
    pullAdvantageVsNoGrab: noGrabObstacleFinal[0] - grabObstacleFinal[0],
    minObstacleXAfterGrab: Number.isFinite(minObstacleXAfterGrab) ? minObstacleXAfterGrab : null,
    distanceAtGrab,
    minDistanceAfterGrab: Number.isFinite(minDistanceAfterGrab) ? minDistanceAfterGrab : null,
    distanceReduction: distanceAtGrab !== null && Number.isFinite(minDistanceAfterGrab)
      ? distanceAtGrab - minDistanceAfterGrab
      : null,
    rootPullDelta: rootAtGrab && Number.isFinite(maxRootXAfterGrab) ? maxRootXAfterGrab - rootAtGrab[0] : null,
    persistentFramesWhileGrabbed,
    maxConstraintFeedback,
    grabRootFinal: [...grab.position],
    noGrabRootFinal: [...noGrab.position],
    noFeedbackRootFinal: [...noFeedback.position],
    samples,
  };

  if (grab.grabJoint) grab.releaseGrab();
  if (noFeedback.grabJoint) noFeedback.releaseGrab();
  b3.b3DestroyWorld(grabScene.world);
  b3.b3DestroyWorld(noGrabScene.world);
  b3.b3DestroyWorld(noFeedbackScene.world);
  return result;
}

function runReleaseRegrab() {
  const scene = makeWorld({ obstacle: 'wall' });
  const character = makeCharacter(scene.world, 0);
  let frame = 0;
  let contactBeforeFirstGrab = false;
  let contactBeforeSecondGrab = false;
  let firstGrab = false;
  let secondGrab = false;

  function step(target) {
    character.setOrganTargetOffset(target);
    tick(scene.world, character);
    finiteState(character, `release-regrab ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 40; i++) step([0.42, 0, 0]);
  for (let i = 0; i < 100 && !firstGrab; i++) {
    step([0.88, 0, 0]);
    if (character.lastOrganContacts > 0) {
      contactBeforeFirstGrab = true;
      firstGrab = character.grabBody(scene.obstacleBody, frontAnchor(character));
    }
  }
  for (let i = 0; i < 25; i++) step([0.25, 0, 0]);
  const firstRelease = character.releaseGrab();
  for (let i = 0; i < 45; i++) step([0.34, 0, 0]);
  for (let i = 0; i < 100 && !secondGrab; i++) {
    step([0.88, 0, 0]);
    if (character.lastOrganContacts > 0) {
      contactBeforeSecondGrab = true;
      secondGrab = character.grabBody(scene.obstacleBody, frontAnchor(character));
    }
  }
  for (let i = 0; i < 20; i++) step([0.28, 0, 0]);
  const secondRelease = character.releaseGrab();
  for (let i = 0; i < 30; i++) step([0.42, 0, 0]);

  const result = {
    contactBeforeFirstGrab,
    firstGrab,
    firstRelease,
    contactBeforeSecondGrab,
    secondGrab,
    secondRelease,
    grabCount: character.grabCount,
    releaseCount: character.releaseCount,
    grabbedFinal: Boolean(character.grabJoint),
    finalRoot: [...character.position],
    finalOrgan: [...character.organPosition],
  };
  b3.b3DestroyWorld(scene.world);
  return result;
}

function capture(name, fn) {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      stack: error instanceof Error ? error.stack : null,
      name,
    };
  }
}

const report = {
  schema: 'e16-explicit-grab-pull-crucible-v0',
  hypothesis:
    'After real physical contact, an explicit spherical grab plus momentum-neutral organ retraction can create a new pull/anchor capability while sustained joint reaction remains current-only rather than accumulating fake persistent knockback.',
  staticPull: capture('staticPull', runStaticPull),
  dynamicPull: capture('dynamicPull', runDynamicPull),
  releaseRegrab: capture('releaseRegrab', runReleaseRegrab),
  boundary:
    'Machine topology qualification only. PASS does not establish preferred controls, anatomy, fun, visual representation, auto-grab policy, climbing quality or production architecture.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

for (const [name, section] of Object.entries({
  staticPull: report.staticPull,
  dynamicPull: report.dynamicPull,
  releaseRegrab: report.releaseRegrab,
})) {
  if (!section.ok) throw new Error(`E16.1 ${name} execution failed: ${section.error}`);
}

const s = report.staticPull.value;
if (s.activeGrabFrame === null || s.noFeedbackGrabFrame === null) {
  throw new Error(`E16.1 static contact never became a grab: active=${s.activeGrabFrame} control=${s.noFeedbackGrabFrame}`);
}
if (!(s.activePullDelta > 0.04 && s.activeVsNoGrabPeakDelta > 0.04)) {
  throw new Error(`E16.1 static grab did not pull carrier meaningfully: pull=${s.activePullDelta} vsNoGrab=${s.activeVsNoGrabPeakDelta}`);
}
if (!(Math.abs(s.noFeedbackPullDelta) < 1e-6)) {
  throw new Error(`E16.1 static physical pull leaked into analytical root with feedback disabled: ${s.noFeedbackPullDelta}`);
}
if (s.persistentFramesWhileGrabbed !== 0) {
  throw new Error(`E16.1 sustained grab accumulated persistent feedback on ${s.persistentFramesWhileGrabbed} frames`);
}
if (!(s.constraintFramesWhileGrabbed > 0 && s.maxConstraintFeedback > 0.05)) {
  throw new Error(`E16.1 static grab did not create measurable current-only constraint response: frames=${s.constraintFramesWhileGrabbed} max=${s.maxConstraintFeedback}`);
}
if (!(s.releasedActive && s.releasedNoFeedback && !s.activeGrabbedAfterRelease && !s.noFeedbackGrabbedAfterRelease)) {
  throw new Error(`E16.1 static release did not remove attachment cleanly`);
}

const d = report.dynamicPull.value;
if (d.grabFrame === null || d.noFeedbackGrabFrame === null) {
  throw new Error(`E16.1 dynamic contact never became a grab: active=${d.grabFrame} control=${d.noFeedbackGrabFrame}`);
}
if (!(d.pullAdvantageVsNoGrab > 0.08)) {
  throw new Error(`E16.1 grab did not materially change prop interaction from push to pull: advantage=${d.pullAdvantageVsNoGrab}`);
}
if (!(d.distanceReduction > 0.08)) {
  throw new Error(`E16.1 grabbed prop/player did not converge: reduction=${d.distanceReduction}`);
}
if (!(d.rootPullDelta > 0.02 && d.maxConstraintFeedback > 0.05)) {
  throw new Error(`E16.1 dynamic grab did not reciprocally affect carrier: rootPull=${d.rootPullDelta} maxConstraint=${d.maxConstraintFeedback}`);
}
if (d.persistentFramesWhileGrabbed !== 0) {
  throw new Error(`E16.1 dynamic sustained grab accumulated persistent feedback on ${d.persistentFramesWhileGrabbed} frames`);
}

const r = report.releaseRegrab.value;
if (!(r.contactBeforeFirstGrab && r.firstGrab && r.firstRelease && r.contactBeforeSecondGrab && r.secondGrab && r.secondRelease)) {
  throw new Error(`E16.1 explicit grab/release cycle was not repeatable: ${JSON.stringify(r)}`);
}
if (!(r.grabCount === 2 && r.releaseCount === 2 && !r.grabbedFinal)) {
  throw new Error(`E16.1 topology state did not close cleanly: ${JSON.stringify(r)}`);
}

console.log(
  `E16.1 grab PASS: static pull=${s.activePullDelta.toFixed(3)}m ` +
  `dynamic advantage=${d.pullAdvantageVsNoGrab.toFixed(3)}m ` +
  `distance reduction=${d.distanceReduction.toFixed(3)}m ` +
  `regrabs=${r.grabCount}`,
);
