import fs from 'node:fs';
import * as THREE from 'three';

const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
const STEPS = 60;
const DEFAULT_PITCH = 0.31;
const DEFAULT_DISTANCE = 6.0;
const FOV_DEG = 51;
const ASPECT = 16 / 9;

function vec3(value) {
  return [value.x, value.y, value.z];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function placeCamera(carrier, yaw, pitch = DEFAULT_PITCH, distance = DEFAULT_DISTANCE) {
  const focus = new THREE.Vector3(carrier[0], carrier[1] + 0.62, carrier[2]);
  const horizontal = Math.cos(pitch) * distance;
  const camera = new THREE.PerspectiveCamera(FOV_DEG, ASPECT, 0.05, 130);
  camera.position.set(
    focus.x + Math.sin(yaw) * horizontal,
    focus.y + Math.sin(pitch) * distance + 0.2,
    focus.z + Math.cos(yaw) * horizontal,
  );
  camera.lookAt(focus);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

const carrierStart = [0, 0, 0];
const clickedPoint = [0.90, 0.72, -0.60];
const initialCamera = placeCamera(carrierStart, 0);
const pointerNdc3 = new THREE.Vector3(...clickedPoint).project(initialCamera);
const pointerNdc = new THREE.Vector2(pointerNdc3.x, pointerNdc3.y);
const initialRaycaster = new THREE.Raycaster();
initialRaycaster.setFromCamera(pointerNdc, initialCamera);
const initialPlaneNormal = new THREE.Vector3();
initialCamera.getWorldDirection(initialPlaneNormal).normalize();
const frozenDragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
  initialPlaneNormal,
  new THREE.Vector3(...clickedPoint),
);
const initialOffset = sub3(clickedPoint, carrierStart);

function currentTargetForPose(carrier, yaw) {
  const camera = placeCamera(carrier, yaw);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointerNdc, camera);
  const hit = new THREE.Vector3();
  const result = raycaster.ray.intersectPlane(frozenDragPlane, hit);
  return result ? vec3(hit) : null;
}

function summarizeScenario(name, poseAt) {
  const samples = [];
  let intersectionMisses = 0;
  let maxCurrentRelativeDrift = 0;
  let maxCurrentDistanceFromCarrier = 0;
  let minCurrentDistanceFromCarrier = Infinity;

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const { carrier, yaw } = poseAt(t);
    const current = currentTargetForPose(carrier, yaw);
    const bodyRelative = add3(carrier, initialOffset);
    if (!current) {
      intersectionMisses += 1;
      samples.push({ t, carrier, yaw, current: null, bodyRelative });
      continue;
    }
    const currentRelative = sub3(current, carrier);
    const drift = distance3(currentRelative, initialOffset);
    const distance = Math.hypot(...currentRelative);
    maxCurrentRelativeDrift = Math.max(maxCurrentRelativeDrift, drift);
    maxCurrentDistanceFromCarrier = Math.max(maxCurrentDistanceFromCarrier, distance);
    minCurrentDistanceFromCarrier = Math.min(minCurrentDistanceFromCarrier, distance);
    samples.push({ t, carrier, yaw, current, bodyRelative, currentRelative });
  }

  const valid = samples.filter((sample) => sample.current);
  const first = valid[0];
  const last = valid.at(-1);
  return {
    name,
    intersectionMisses,
    initialRelativeOffset: initialOffset,
    current: {
      endWorld: last?.current ?? null,
      endRelative: last?.currentRelative ?? null,
      worldTravel: first && last ? distance3(first.current, last.current) : null,
      maxRelativeDrift: maxCurrentRelativeDrift,
      minDistanceFromCarrier: Number.isFinite(minCurrentDistanceFromCarrier)
        ? minCurrentDistanceFromCarrier
        : null,
      maxDistanceFromCarrier: maxCurrentDistanceFromCarrier,
    },
    bodyRelativeReference: {
      endWorld: samples.at(-1)?.bodyRelative ?? null,
      endRelative: initialOffset,
      relativeDrift: 0,
    },
    checkpoints: samples.filter((_, index) => index % 15 === 0 || index === samples.length - 1),
  };
}

const initialReconstruction = currentTargetForPose(carrierStart, 0);
const initialReconstructionError = initialReconstruction
  ? distance3(initialReconstruction, clickedPoint)
  : Infinity;
if (initialReconstructionError > 1e-6) {
  throw new Error(`Could not reconstruct E17 acquisition point from frozen drag-plane mapping: ${initialReconstructionError}`);
}

const report = {
  schema: 'e18-0a-current-target-frame-diagnostic-v0',
  boundary: 'Representation-only diagnostic. Reproduces E17 click-time frozen world drag-plane + moving camera ray with a stable FollowCamera-equivalent pose. It does not simulate object physics or Owner feel.',
  acquisition: {
    carrierStart,
    clickedPoint,
    pointerNdc: [pointerNdc.x, pointerNdc.y],
    frozenPlaneNormal: vec3(initialPlaneNormal),
    initialOffset,
    initialReconstructionError,
  },
  scenarios: [
    summarizeScenario('carrier-forward-2m-camera-follows', (t) => ({
      carrier: [0, 0, -2 * t],
      yaw: 0,
    })),
    summarizeScenario('carrier-right-2m-camera-follows', (t) => ({
      carrier: [2 * t, 0, 0],
      yaw: 0,
    })),
    summarizeScenario('camera-orbit-45deg-carrier-stationary', (t) => ({
      carrier: [0, 0, 0],
      yaw: (Math.PI / 4) * t,
    })),
    summarizeScenario('carrier-forward-2m-plus-camera-orbit-45deg', (t) => ({
      carrier: [0, 0, -2 * t],
      yaw: (Math.PI / 4) * t,
    })),
  ],
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
