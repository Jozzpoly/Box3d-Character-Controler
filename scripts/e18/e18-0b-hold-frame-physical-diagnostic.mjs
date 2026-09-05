import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createE17IntentManipulatorCharacter } from '../../src/e17-intent-manipulator-character.js';
import { FollowCamera } from '../../src/follow-camera.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const MAX_DRIVE_FRAMES = 90;
const TARGET_CARRIER_TRAVEL = 2.0;
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
const WALK_INTENT = {
  ...ZERO_INTENT,
  moveForward: 0.5,
};

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function createStaticBox(world, position, half) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.95;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createDynamicBox(world, position, half, density) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0.04;
  bodyDef.angularDamping = 0.08;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = density;
  shapeDef.baseMaterial.friction = 0.72;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function fakeCanvas() {
  return {
    addEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() { return false; },
  };
}

function tick(world, character, intent) {
  character.preStep(DT, intent);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function bodyAngularSpeed(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return Math.hypot(...out);
}

function run(policy) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createStaticBox(world, [0, -0.5, -1.0], [8, 0.5, 8]);

  const character = createE17IntentManipulatorCharacter(b3, world, {
    startPosition: [0, 0.90, 0],
    gravity: 20,
    feedbackGain: 0,
    manipulatorRate: 10,
    manipulatorMaxForce: 900,
    manipulatorMaxReach: 1.60,
    manipulatorAcquireReach: 1.85,
    manipulatorBreakReach: 2.35,
  });

  const half = [0.30, 0.50, 0.30];
  const object = createDynamicBox(world, [0.85, 0.52, -0.95], half, 70);

  for (let i = 0; i < 90; i++) tick(world, character, ZERO_INTENT);
  if (!character.currentSupport) throw new Error(`${policy}: Donor did not settle onto static support`);

  const objectStart = bodyPosition(object);
  const anchor = [...objectStart];
  const selected = character.beginManipulation(object, anchor);
  if (!selected) {
    throw new Error(`${policy}: failed to acquire centred diagnostic object; distance=${distance3(anchor, character.bodyPosition)}`);
  }

  const camera = new THREE.PerspectiveCamera(51, 16 / 9, 0.05, 130);
  const followCamera = new FollowCamera(camera, fakeCanvas(), { dragButtons: [] });
  followCamera.snap(character.position);

  const projected = new THREE.Vector3(...anchor).project(camera);
  const pointerNdc = new THREE.Vector2(projected.x, projected.y);
  const raycaster = new THREE.Raycaster();
  const planeNormal = new THREE.Vector3();
  camera.getWorldDirection(planeNormal).normalize();
  const frozenPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    planeNormal,
    new THREE.Vector3(...anchor),
  );
  const planeHit = new THREE.Vector3();
  const initialCarrierOffset = sub3(anchor, character.position);
  const carrierStart = [...character.position];
  const coreStart = [...character.bodyPosition];

  function requestedTarget() {
    if (policy === 'carrier-relative') {
      return add3(character.position, initialCarrierOffset);
    }
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.ray.intersectPlane(frozenPlane, planeHit);
    return hit ? [hit.x, hit.y, hit.z] : null;
  }

  const firstTarget = requestedTarget();
  if (!firstTarget || distance3(firstTarget, anchor) > 1e-5) {
    throw new Error(`${policy}: acquisition target reconstruction failed`);
  }

  let activeFrames = 0;
  let saturationFrames = 0;
  let reachClampFrames = 0;
  let totalImpulse = 0;
  let sumError = 0;
  let peakError = 0;
  let peakRequestedReach = 0;
  let peakAnchorCoreDistance = 0;
  let peakTargetRelativeDrift = 0;
  let peakAngularSpeed = 0;
  let targetWorldTravel = 0;
  let previousTarget = [...firstTarget];
  let releaseFrame = null;
  let targetMisses = 0;
  const checkpoints = [];

  for (let frame = 0; frame < MAX_DRIVE_FRAMES; frame++) {
    const target = requestedTarget();
    if (!target) {
      targetMisses += 1;
      break;
    }
    targetWorldTravel += distance3(previousTarget, target);
    previousTarget = [...target];

    const requestedReach = distance3(target, character.bodyPosition);
    peakRequestedReach = Math.max(peakRequestedReach, requestedReach);
    if (requestedReach > character.manipulatorMaxReach + 1e-6) reachClampFrames += 1;
    const relativeDrift = distance3(sub3(target, character.position), initialCarrierOffset);
    peakTargetRelativeDrift = Math.max(peakTargetRelativeDrift, relativeDrift);

    character.setManipulationTarget(target);
    tick(world, character, WALK_INTENT);
    followCamera.update(character.position, Boolean(character.currentSupport), DT);

    const angularSpeed = bodyAngularSpeed(object);
    peakAngularSpeed = Math.max(peakAngularSpeed, angularSpeed);

    if (character.manipulatedBody) {
      activeFrames += 1;
      totalImpulse += character.lastManipulatorImpulse;
      sumError += character.lastManipulatorError;
      peakError = Math.max(peakError, character.lastManipulatorError);
      if (character.lastManipulatorForce >= character.manipulatorMaxForce - 1e-4) saturationFrames += 1;
      peakAnchorCoreDistance = Math.max(
        peakAnchorCoreDistance,
        distance3(character.manipulatedAnchorWorld, character.bodyPosition),
      );
    } else if (releaseFrame === null) {
      releaseFrame = frame;
    }

    if (frame % 15 === 0 || frame === MAX_DRIVE_FRAMES - 1 || !character.manipulatedBody) {
      checkpoints.push({
        frame,
        carrier: [...character.position],
        core: [...character.bodyPosition],
        target,
        requestedReach,
        targetRelativeDrift: relativeDrift,
        manipulatorError: character.lastManipulatorError,
        manipulatorForce: character.lastManipulatorForce,
        releaseReason: character.lastManipulatorReleaseReason,
      });
    }

    if (!character.manipulatedBody) break;
    if (distance3(character.position, carrierStart) >= TARGET_CARRIER_TRAVEL) break;
  }

  const objectEnd = bodyPosition(object);
  const carrierEnd = [...character.position];
  const coreEnd = [...character.bodyPosition];
  const report = {
    policy,
    selected,
    objectMass: b3.b3Body_GetMass(object),
    carrierStart,
    carrierEnd,
    carrierTravel: distance3(carrierStart, carrierEnd),
    coreTravel: distance3(coreStart, coreEnd),
    objectStart,
    objectEnd,
    objectTravel: distance3(objectStart, objectEnd),
    initialCarrierOffset,
    activeFrames,
    releaseFrame,
    releaseReason: character.lastManipulatorReleaseReason,
    targetMisses,
    targetWorldTravel,
    peakTargetRelativeDrift,
    peakRequestedReach,
    reachClampFrames,
    reachClampOccupancy: activeFrames > 0 ? reachClampFrames / activeFrames : null,
    peakAnchorCoreDistance,
    saturationFrames,
    forceCapOccupancy: activeFrames > 0 ? saturationFrames / activeFrames : null,
    totalImpulse,
    meanError: activeFrames > 0 ? sumError / activeFrames : null,
    peakError,
    peakAngularSpeed,
    checkpoints,
  };

  b3.b3DestroyWorld(world);
  return report;
}

const report = {
  schema: 'e18-0b-hold-frame-physical-diagnostic-v0',
  boundary: 'Real E17 baseline character + Box3D diagnostic with identical mechanics and walking input. feedbackGain=0 isolates target-frame effects from carrier feedback. Centred grip minimizes orientation as a confound. Frozen-plane uses the actual FollowCamera implementation and click-time plane semantics; carrier-relative is a reference policy, not a promoted design.',
  frozenPlane: run('frozen-plane'),
  carrierRelative: run('carrier-relative'),
};

report.contrast = {
  targetRelativeDriftRatio: report.carrierRelative.peakTargetRelativeDrift > 1e-9
    ? report.frozenPlane.peakTargetRelativeDrift / report.carrierRelative.peakTargetRelativeDrift
    : null,
  frozenMinusCarrierReachClampOccupancy:
    report.frozenPlane.reachClampOccupancy - report.carrierRelative.reachClampOccupancy,
  frozenMinusCarrierForceCapOccupancy:
    report.frozenPlane.forceCapOccupancy - report.carrierRelative.forceCapOccupancy,
  frozenMinusCarrierMeanError: report.frozenPlane.meanError - report.carrierRelative.meanError,
  frozenMinusCarrierObjectTravel: report.frozenPlane.objectTravel - report.carrierRelative.objectTravel,
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
