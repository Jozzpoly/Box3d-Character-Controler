import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { cameraRelativeManipulationDelta } from '../../src/e18/manipulation-intent.js';
import {
  cameraForwardDepth,
  screenPixelDeltaToManipulationCommand,
  screenPlaneMetresPerPixel,
} from '../../src/e18/manipulation-screen-mapping.js';

const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
const DEG = Math.PI / 180;
const PIXEL_TOLERANCE = 1e-8;
const ZERO_TOLERANCE = 1e-15;

function projectPixel(point, camera, width, height) {
  const ndc = new THREE.Vector3(...point).project(camera);
  return [
    (ndc.x + 1) * width * 0.5,
    (1 - ndc.y) * height * 0.5,
  ];
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function getCameraBasis(camera) {
  camera.updateMatrixWorld(true);
  const forward3 = new THREE.Vector3();
  camera.getWorldDirection(forward3).normalize();
  const right3 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const up3 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  return {
    forward: [forward3.x, forward3.y, forward3.z],
    right: [right3.x, right3.y, right3.z],
    up: [up3.x, up3.y, up3.z],
  };
}

function makeCamera({ width, height, fovDeg, position, lookDirection }) {
  const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.05, 200);
  camera.position.set(...position);
  const look = new THREE.Vector3(...lookDirection).normalize();
  camera.lookAt(
    camera.position.x + look.x * 10,
    camera.position.y + look.y * 10,
    camera.position.z + look.z * 10,
  );
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

const cases = [
  {
    name: 'default-1080p-near',
    width: 1920,
    height: 1080,
    fovDeg: 51,
    position: [0, 2.2, 6],
    lookDirection: [0, -0.28, -1],
    depth: 4.5,
    planeOffset: [0.55, -0.32],
    pointerDelta: [120, -80],
  },
  {
    name: 'yawed-720p-mid',
    width: 1280,
    height: 720,
    fovDeg: 51,
    position: [2, 3.1, 7],
    lookDirection: [-0.62, -0.22, -0.78],
    depth: 6.0,
    planeOffset: [-0.70, 0.45],
    pointerDelta: [-95, 60],
  },
  {
    name: 'pitched-square-far',
    width: 900,
    height: 900,
    fovDeg: 51,
    position: [-3, 4, 5],
    lookDirection: [0.48, -0.48, -0.74],
    depth: 9.0,
    planeOffset: [1.1, -0.8],
    pointerDelta: [70, 105],
  },
  {
    name: 'wide-fov-off-axis',
    width: 1440,
    height: 900,
    fovDeg: 70,
    position: [1.5, 1.4, 4],
    lookDirection: [-0.38, 0.10, -0.92],
    depth: 5.0,
    planeOffset: [0.9, 0.6],
    pointerDelta: [130, -55],
  },
];

const results = [];
for (const specimen of cases) {
  const camera = makeCamera(specimen);
  const basis = getCameraBasis(camera);
  const target = add3(
    add3(
      add3(specimen.position, scale3(basis.forward, specimen.depth)),
      scale3(basis.right, specimen.planeOffset[0]),
    ),
    scale3(basis.up, specimen.planeOffset[1]),
  );

  const measuredDepth = cameraForwardDepth(target, specimen.position, basis.forward);
  assert.ok(Math.abs(measuredDepth - specimen.depth) < 1e-10, `${specimen.name}: forward-depth reconstruction`);

  const beforePx = projectPixel(target, camera, specimen.width, specimen.height);
  const command = screenPixelDeltaToManipulationCommand({
    deltaXPx: specimen.pointerDelta[0],
    deltaYPx: specimen.pointerDelta[1],
    forwardDepth: measuredDepth,
    verticalFovRadians: specimen.fovDeg * DEG,
    viewportHeightPx: specimen.height,
    depthDeltaMetres: 0,
  });
  const worldDelta = cameraRelativeManipulationDelta({ ...basis, ...command });
  const afterTarget = add3(target, worldDelta);
  const afterPx = projectPixel(afterTarget, camera, specimen.width, specimen.height);
  const actualPixelDelta = [afterPx[0] - beforePx[0], afterPx[1] - beforePx[1]];
  const error = [
    actualPixelDelta[0] - specimen.pointerDelta[0],
    actualPixelDelta[1] - specimen.pointerDelta[1],
  ];
  assert.ok(Math.abs(error[0]) < PIXEL_TOLERANCE, `${specimen.name}: horizontal pixel fidelity ${error[0]}`);
  assert.ok(Math.abs(error[1]) < PIXEL_TOLERANCE, `${specimen.name}: vertical pixel fidelity ${error[1]}`);

  results.push({
    name: specimen.name,
    viewport: [specimen.width, specimen.height],
    fovDeg: specimen.fovDeg,
    forwardDepth: measuredDepth,
    pointerDeltaPx: specimen.pointerDelta,
    metresPerPixel: command.metresPerPixel,
    worldDelta,
    actualPixelDelta,
    pixelError: error,
  });
}

// Resolution independence: the same fraction of viewport height at the same depth/FOV
// must produce the same world distance even when pixel counts differ.
const common = { forwardDepth: 6, verticalFovRadians: 51 * DEG };
const scale1080 = screenPlaneMetresPerPixel({ ...common, viewportHeightPx: 1080 });
const scale720 = screenPlaneMetresPerPixel({ ...common, viewportHeightPx: 720 });
const worldAtTenPercent1080 = scale1080 * 108;
const worldAtTenPercent720 = scale720 * 72;
assert.ok(
  Math.abs(worldAtTenPercent1080 - worldAtTenPercent720) < 1e-12,
  'same viewport fraction must be resolution-independent',
);

// Depth remains explicit and independent from the pointer-plane scaling. Signed zero
// is numerically zero and must not make this geometric contract depend on JS bit-level
// representation details.
const explicitDepth = screenPixelDeltaToManipulationCommand({
  deltaXPx: 0,
  deltaYPx: 0,
  forwardDepth: 6,
  verticalFovRadians: 51 * DEG,
  viewportHeightPx: 1080,
  depthDeltaMetres: -0.35,
});
assert.ok(Math.abs(explicitDepth.lateral) < ZERO_TOLERANCE);
assert.ok(Math.abs(explicitDepth.vertical) < ZERO_TOLERANCE);
assert.equal(explicitDepth.depth, -0.35);

// No pointer/depth event means no numerical command even if projection geometry changes.
const zeroA = screenPixelDeltaToManipulationCommand({
  deltaXPx: 0,
  deltaYPx: 0,
  forwardDepth: 4,
  verticalFovRadians: 51 * DEG,
  viewportHeightPx: 1080,
});
const zeroB = screenPixelDeltaToManipulationCommand({
  deltaXPx: 0,
  deltaYPx: 0,
  forwardDepth: 9,
  verticalFovRadians: 70 * DEG,
  viewportHeightPx: 900,
});
for (const [label, command] of [['nearProjection', zeroA], ['farProjection', zeroB]]) {
  assert.ok(Math.abs(command.lateral) < ZERO_TOLERANCE, `${label}: lateral zero`);
  assert.ok(Math.abs(command.vertical) < ZERO_TOLERANCE, `${label}: vertical zero`);
  assert.ok(Math.abs(command.depth) < ZERO_TOLERANCE, `${label}: depth zero`);
}

const report = {
  schema: 'e18-0e-screen-delta-geometry-v0',
  boundary: 'Geometric browser-adapter qualification only. It proves a perspective-correct incremental screen-plane mapping can preserve pointer displacement across tested camera orientations, depths, viewports and FOVs without using an absolute frozen ray plane. It does not select feel sensitivity, pointer-lock policy, depth-device mapping, transport origin, reach policy or a final Owner UX.',
  cases: results,
  resolutionFractionCheck: {
    viewportFraction: 0.10,
    worldAt1080: worldAtTenPercent1080,
    worldAt720: worldAtTenPercent720,
    difference: worldAtTenPercent1080 - worldAtTenPercent720,
  },
  explicitDepthCheck: explicitDepth,
  zeroCommandCheck: {
    nearProjection: zeroA,
    farProjection: zeroB,
  },
  verdict: 'PASS',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));