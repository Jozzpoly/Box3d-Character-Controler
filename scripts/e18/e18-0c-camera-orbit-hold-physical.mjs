import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createE17IntentManipulatorCharacter } from '../../src/e17-intent-manipulator-character.js';
import { FollowCamera } from '../../src/follow-camera.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const ORBIT_FRAMES = 60;
const ORBIT_ANGLE = Math.PI / 4;
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

function createStaticBox(world, position, half) {
  const def = b3.b3DefaultBodyDef();
  def.position = [...position];
  const body = b3.b3CreateBody(world, def);
  const shape = b3.b3DefaultShapeDef();
  shape.baseMaterial.friction = 0.95;
  b3.b3CreateBoxShape(body, shape, half[0], half[1], half[2]);
}

function createDynamicBox(world, position, half, density) {
  const def = b3.b3DefaultBodyDef();
  def.type = b3.b3BodyType.b3_dynamicBody;
  def.position = [...position];
  def.linearDamping = 0.04;
  def.angularDamping = 0.08;
  def.enableSleep = false;
  const body = b3.b3CreateBody(world, def);
  const shape = b3.b3DefaultShapeDef();
  shape.density = density;
  shape.baseMaterial.friction = 0.72;
  b3.b3CreateBoxShape(body, shape, half[0], half[1], half[2]);
  return body;
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function tick(world, character) {
  character.preStep(DT, ZERO_INTENT);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function fakeCanvas() {
  return {
    addEventListener() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() { return false; },
  };
}

function run(policy) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  createStaticBox(world, [0, -0.5, -1], [8, 0.5, 8]);

  const character = createE17IntentManipulatorCharacter(b3, world, {
    startPosition: [0, 0.90, 0],
    gravity: 20,
    feedbackGain: 0,
  });
  const object = createDynamicBox(world, [0.65, 0.52, -0.65], [0.22, 0.50, 0.22], 130);
  for (let i = 0; i < 90; i++) tick(world, character);
  if (!character.currentSupport) throw new Error(`${policy}: support setup failed`);

  const carrierStart = [...character.position];
  const objectStart = bodyPosition(object);
  const anchor = [...objectStart];
  if (!character.beginManipulation(object, anchor)) throw new Error(`${policy}: acquisition failed`);
  const initialReach = distance3(anchor, character.bodyPosition);
  if (initialReach > character.manipulatorMaxReach - 0.10) {
    throw new Error(`${policy}: fixture lacks command-reach margin (${initialReach})`);
  }

  const camera = new THREE.PerspectiveCamera(51, 16 / 9, 0.05, 130);
  const follow = new FollowCamera(camera, fakeCanvas(), { dragButtons: [] });
  follow.snap(character.position);
  camera.updateMatrixWorld(true);

  const projected = new THREE.Vector3(...anchor).project(camera);
  const pointerNdc = new THREE.Vector2(projected.x, projected.y);
  const raycaster = new THREE.Raycaster();
  const planeNormal = new THREE.Vector3();
  camera.getWorldDirection(planeNormal).normalize();
  const frozenPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    planeNormal,
    new THREE.Vector3(...anchor),
  );
  const hit = new THREE.Vector3();

  // Use the real FollowCamera control path: the user changes desiredYaw and the camera
  // reaches it through the production damping law. No manipulation-pointer motion occurs.
  follow.desiredYaw = ORBIT_ANGLE;

  let previousObject = [...objectStart];
  let previousTarget = [...anchor];
  let objectPath = 0;
  let targetPath = 0;
  let peakTargetDrift = 0;
  let peakError = 0;
  let sumError = 0;
  let activeFrames = 0;
  let saturationFrames = 0;
  let peakRequestedReach = initialReach;
  let reachClampFrames = 0;
  const checkpoints = [];

  for (let frame = 0; frame <= ORBIT_FRAMES; frame++) {
    follow.update(character.position, Boolean(character.currentSupport), DT);
    camera.updateMatrixWorld(true);

    let target;
    if (policy === 'frozen-plane') {
      raycaster.setFromCamera(pointerNdc, camera);
      const intersection = raycaster.ray.intersectPlane(frozenPlane, hit);
      if (!intersection) throw new Error(`${policy}: ray missed frozen plane at frame ${frame}`);
      target = [hit.x, hit.y, hit.z];
    } else {
      target = [...anchor];
    }

    targetPath += distance3(previousTarget, target);
    previousTarget = [...target];
    peakTargetDrift = Math.max(peakTargetDrift, distance3(target, anchor));
    const requestedReach = distance3(target, character.bodyPosition);
    peakRequestedReach = Math.max(peakRequestedReach, requestedReach);
    if (requestedReach > character.manipulatorMaxReach + 1e-6) reachClampFrames += 1;

    character.setManipulationTarget(target);
    tick(world, character);

    const currentObject = bodyPosition(object);
    objectPath += distance3(previousObject, currentObject);
    previousObject = [...currentObject];
    if (character.manipulatedBody) {
      activeFrames += 1;
      sumError += character.lastManipulatorError;
      peakError = Math.max(peakError, character.lastManipulatorError);
      if (character.lastManipulatorForce >= character.manipulatorMaxForce - 1e-4) saturationFrames += 1;
    }

    if (frame % 15 === 0 || frame === ORBIT_FRAMES) {
      checkpoints.push({
        frame,
        desiredYaw: follow.desiredYaw,
        actualYaw: follow.yaw,
        target,
        object: currentObject,
        targetDrift: distance3(target, anchor),
        manipulatorError: character.lastManipulatorError,
        manipulatorForce: character.lastManipulatorForce,
      });
    }
  }

  const objectEnd = bodyPosition(object);
  const result = {
    policy,
    requestedOrbitAngle: ORBIT_ANGLE,
    finalActualYaw: follow.yaw,
    finalYawError: Math.abs(ORBIT_ANGLE - follow.yaw),
    initialReach,
    carrierDrift: distance3(character.position, carrierStart),
    targetPath,
    finalTargetDrift: distance3(previousTarget, anchor),
    peakTargetDrift,
    objectPath,
    objectNetTravel: distance3(objectStart, objectEnd),
    peakRequestedReach,
    reachClampFrames,
    forceCapOccupancy: activeFrames > 0 ? saturationFrames / activeFrames : null,
    meanError: activeFrames > 0 ? sumError / activeFrames : null,
    peakError,
    releaseReason: character.lastManipulatorReleaseReason,
    checkpoints,
  };
  if (result.finalYawError > 1e-5) {
    throw new Error(`${policy}: FollowCamera did not converge to requested 45deg orbit; error=${result.finalYawError}`);
  }
  b3.b3DestroyWorld(world);
  return result;
}

const frozen = run('frozen-plane');
const stable = run('stable-world-reference');
const report = {
  schema: 'e18-0c-camera-orbit-hold-physical-v1',
  boundary: 'Real E17 + Box3D diagnostic. Carrier and manipulation pointer stay stationary while production FollowCamera smoothing converges to a requested 45-degree yaw change. The current frozen click-plane mapping is compared with a stable world target solely to test whether camera orbit itself creates manipulation command. This does not select the final E18 hold frame.',
  frozenPlane: frozen,
  stableWorldReference: stable,
  contrast: {
    targetPath: frozen.targetPath - stable.targetPath,
    objectNetTravel: frozen.objectNetTravel - stable.objectNetTravel,
    objectPath: frozen.objectPath - stable.objectPath,
    meanError: frozen.meanError - stable.meanError,
  },
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
