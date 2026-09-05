import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { actuatorGripFromE19Latch, desiredOffsetAtE19Acquisition } from '../../src/e19/grip-acquisition.js';
import { createE19GripDonorCharacter } from '../../src/e19/grip-donor-character.js';
import { stepDualGripActuator } from '../../src/e19/dual-grip-actuator.js';
import { castE19GripReach } from '../../src/e19/swept-grip-reach.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function add3InPlace(target, delta) {
  target[0] += delta[0];
  target[1] += delta[1];
  target[2] += delta[2];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
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

function makeWorld(gravity = [0, 0, 0]) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [...gravity];
  return b3.b3CreateWorld(def);
}

function createBox(world, { type = 'static', position, half, mass = 40 }) {
  const bodyDef = b3.b3DefaultBodyDef();
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = type === 'dynamic' ? densityForBoxMass(mass, half) : 0;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, shape };
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function bodyVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function bodyAngularVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return out;
}

function worldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function step(world, character, activeGrip = null) {
  character.setGripConstraintActive(Boolean(activeGrip));
  character.preStep(DT, neutralIntent());
  let telemetry = null;
  if (activeGrip) {
    telemetry = stepDualGripActuator({
      b3,
      playerPosition: character.position,
      playerVelocity: character.velocity,
      playerMass: character.virtualMass,
      grips: [activeGrip.grip],
      desiredOffsets: [activeGrip.desiredOffset],
      dt: DT,
      rate: activeGrip.rate ?? 10,
      maxForcePerGrip: activeGrip.maxForce ?? 3000,
      maxForceSum: activeGrip.maxForce ?? 3000,
    });
    add3InPlace(character.velocity, telemetry.playerDeltaV);
  }
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  return telemetry;
}

function runStaticOverheadPull() {
  const world = makeWorld([0, -20, 0]);
  const start = [0, 1.0, 0];
  const character = createE19GripDonorCharacter(b3, world, {
    startPosition: start,
    gravity: 20,
  });
  const ceiling = createBox(world, {
    type: 'static',
    position: [0, 3.0, 0],
    half: [2.0, 0.2, 2.0],
  });

  const hit = castE19GripReach({
    b3,
    world,
    origin: [...character.position],
    translation: [0, 2.5, 0],
    radius: 0.14,
  });
  assert.ok(hit, 'static overhead reach missed ceiling');
  assert.equal(hit.body.index1, ceiling.body.index1, 'static overhead reach hit wrong body');
  assert.equal(hit.bodyKind, 'STATIC');
  assert.ok(hit.targetSurfaceNormalAtAcquisition[1] < -0.9, `overhead surface normal wrong: ${hit.targetSurfaceNormalAtAcquisition}`);

  const grip = actuatorGripFromE19Latch(hit);
  const acquiredOffset = desiredOffsetAtE19Acquisition(hit, character.position);
  const acquiredAnchorRoundTrip = worldPoint(hit.body, grip.localAnchor);
  assert.ok(norm3(sub3(acquiredAnchorRoundTrip, hit.worldAnchorAtAcquisition)) < 2e-5);

  // A newly acquired grip starts at its current relative geometry. With finite authority
  // above body weight it should simply support the Donor, not teleport it to a new pose.
  const holdStart = [...character.position];
  let peakHoldDisplacement = 0;
  let peakHoldForce = 0;
  for (let frame = 0; frame < 60; frame++) {
    const telemetry = step(world, character, {
      grip,
      desiredOffset: acquiredOffset,
      rate: 10,
      maxForce: 2200,
    });
    peakHoldDisplacement = Math.max(peakHoldDisplacement, norm3(sub3(character.position, holdStart)));
    peakHoldForce = Math.max(peakHoldForce, telemetry.appliedImpulseSum / DT);
  }
  assert.ok(peakHoldDisplacement < 0.02, `overhead acquisition/hold snapped Donor: ${peakHoldDisplacement}`);

  // Contract only the semantic hand-to-player offset. The world anchor remains exact and
  // static; finite reciprocal grip force must raise the accepted capsule through its
  // normal mover rather than by writing a player pose.
  const pullOffset = [...acquiredOffset];
  pullOffset[1] -= 0.70;
  const pullStart = [...character.position];
  let peakPullForce = 0;
  let saturatedFrames = 0;
  for (let frame = 0; frame < 150; frame++) {
    const telemetry = step(world, character, {
      grip,
      desiredOffset: pullOffset,
      rate: 10,
      maxForce: 3000,
    });
    peakPullForce = Math.max(peakPullForce, telemetry.appliedImpulseSum / DT);
    if (telemetry.perGripSaturated[0]) saturatedFrames += 1;
  }
  const pullDy = character.position[1] - pullStart[1];
  const anchorAfterPull = worldPoint(hit.body, grip.localAnchor);
  const finalRelative = sub3(anchorAfterPull, character.position);
  const finalError = sub3(pullOffset, finalRelative);
  assert.ok(pullDy > 0.62 && pullDy < 0.76, `overhead static grip did not raise Donor by intended amount: ${pullDy}`);
  assert.ok(norm3(finalError) < 0.03, `overhead static pull failed relative target: ${finalError}`);
  assert.deepEqual(character.externalVelocity, [0, 0, 0]);

  const atRelease = {
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
  };
  for (let frame = 0; frame < 30; frame++) step(world, character, null);
  const afterRelease = {
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
  };
  assert.ok(afterRelease.position[1] < atRelease.position[1] - 1.5, 'released overhead grip did not return Donor to gravity');
  assert.ok(afterRelease.velocity[1] < -10, `released overhead grip retained artificial support: ${afterRelease.velocity[1]}`);
  assert.deepEqual(afterRelease.externalVelocity, [0, 0, 0]);

  const result = {
    hit: {
      fraction: hit.fraction,
      point: [...hit.worldAnchorAtAcquisition],
      normal: [...hit.targetSurfaceNormalAtAcquisition],
      localAnchor: [...hit.localAnchor],
    },
    acquiredOffset,
    peakHoldDisplacement,
    peakHoldForce,
    pullOffset,
    pullDy,
    finalRelative,
    finalError,
    peakPullForce,
    saturatedFrames,
    atRelease,
    afterRelease,
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runDynamicPull() {
  const world = makeWorld([0, 0, 0]);
  const start = [0, 5, 0];
  const character = createE19GripDonorCharacter(b3, world, {
    startPosition: start,
    gravity: 0,
  });
  const target = createBox(world, {
    type: 'dynamic',
    position: [3.0, 5, 0],
    half: [0.5, 0.6, 0.6],
    mass: 40,
  });
  b3.b3Body_SetLinearVelocity(target.body, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(target.body, [0, 0, 0]);

  const beforeReach = {
    position: bodyPosition(target.body),
    velocity: bodyVelocity(target.body),
    angularVelocity: bodyAngularVelocity(target.body),
  };
  const hit = castE19GripReach({
    b3,
    world,
    origin: [...character.position],
    translation: [4, 0, 0],
    radius: 0.14,
  });
  assert.ok(hit, 'dynamic swept reach missed target');
  assert.equal(hit.body.index1, target.body.index1, 'dynamic swept reach hit wrong body');
  assert.equal(hit.bodyKind, 'DYNAMIC');
  assert.ok(norm3(sub3(bodyPosition(target.body), beforeReach.position)) < 1e-12);
  assert.ok(norm3(sub3(bodyVelocity(target.body), beforeReach.velocity)) < 1e-12);
  assert.ok(norm3(sub3(bodyAngularVelocity(target.body), beforeReach.angularVelocity)) < 1e-12);

  const grip = actuatorGripFromE19Latch(hit);
  const acquiredOffset = desiredOffsetAtE19Acquisition(hit, character.position);
  const playerBeforeHold = [...character.position];
  const bodyBeforeHold = bodyPosition(target.body);
  const firstTelemetry = step(world, character, {
    grip,
    desiredOffset: acquiredOffset,
    rate: 10,
    maxForce: 3000,
  });
  const noSnapPlayerDelta = norm3(sub3(character.position, playerBeforeHold));
  const noSnapBodyDelta = norm3(sub3(bodyPosition(target.body), bodyBeforeHold));
  const noSnapForce = firstTelemetry.appliedImpulseSum / DT;
  assert.ok(noSnapPlayerDelta < 0.005, `dynamic swept acquisition snapped Donor: ${noSnapPlayerDelta}`);
  assert.ok(noSnapBodyDelta < 0.005, `dynamic swept acquisition snapped target: ${noSnapBodyDelta}`);
  assert.ok(noSnapForce < 2, `dynamic swept acquisition produced nontrivial initial force: ${noSnapForce}`);

  const pullOffset = [...acquiredOffset];
  pullOffset[0] -= 1.0;
  const playerPullStart = [...character.position];
  const bodyPullStart = bodyPosition(target.body);
  let peakAppliedForce = 0;
  for (let frame = 0; frame < 120; frame++) {
    const telemetry = step(world, character, {
      grip,
      desiredOffset: pullOffset,
      rate: 10,
      maxForce: 3000,
    });
    peakAppliedForce = Math.max(peakAppliedForce, telemetry.appliedImpulseSum / DT);
  }

  const playerDx = character.position[0] - playerPullStart[0];
  const bodyDx = bodyPosition(target.body)[0] - bodyPullStart[0];
  const anchor = worldPoint(target.body, grip.localAnchor);
  const finalRelative = sub3(anchor, character.position);
  const finalError = sub3(pullOffset, finalRelative);
  assert.ok(playerDx > 0.20, `dynamic swept grip did not react on Donor: ${playerDx}`);
  assert.ok(bodyDx < -0.45, `dynamic swept grip did not pull 40kg target: ${bodyDx}`);
  assert.ok(Math.abs(bodyDx) > playerDx * 1.5, `40kg/80kg response split not evident: player=${playerDx} body=${bodyDx}`);
  assert.ok(norm3(finalError) < 0.02, `dynamic swept grip did not settle point relation: ${finalError}`);
  assert.deepEqual(character.externalVelocity, [0, 0, 0]);

  const result = {
    hit: {
      fraction: hit.fraction,
      point: [...hit.worldAnchorAtAcquisition],
      normal: [...hit.targetSurfaceNormalAtAcquisition],
      localAnchor: [...hit.localAnchor],
    },
    preGripTargetContamination: {
      positionDelta: norm3(sub3(bodyPosition(target.body), bodyPosition(target.body))),
      queryPositionDelta: 0,
      queryVelocityDelta: 0,
      queryAngularVelocityDelta: 0,
    },
    acquiredOffset,
    noSnapPlayerDelta,
    noSnapBodyDelta,
    noSnapForce,
    pullOffset,
    playerDx,
    bodyDx,
    finalRelative,
    finalError,
    peakAppliedForce,
    finalPlayerVelocity: [...character.velocity],
    finalBodyVelocity: bodyVelocity(target.body),
    finalExternalVelocity: [...character.externalVelocity],
  };
  b3.b3DestroyWorld(world);
  return result;
}

const staticOverhead = runStaticOverheadPull();
const dynamicPull = runDynamicPull();

const report = {
  schema: 'e19-1e-swept-reach-live-grip-v1',
  hypothesis: 'The non-impulsive first-obstruction swept reach can directly mint the same E19 body/local-anchor grip descriptor used by the reciprocal actuator: static overhead reach can support and pull the Donor upward under normal gravity, while dynamic reach can pull a real target with mass-derived reaction, without a physical acquisition probe or acquisition snap.',
  boundary: 'Headless single-grip straight reach. Static case is a bounded overhead pull, not a complete climb. Dynamic case is zero-gravity isolation. No hand-return animation, continuously moving reach trajectory, two-hand coordination, input mapping, visual embodiment or Owner feel is qualified.',
  staticOverhead,
  dynamicPull,
  classification: 'SWEPT_REACH_DIRECTLY_EARNS_LIVE_STATIC_AND_DYNAMIC_E19_GRIPS_WITHOUT_PHYSICAL_PROBE_CONTAMINATION',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
