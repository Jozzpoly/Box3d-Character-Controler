import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createCharacterVisual } from './character-visual.js';
import { createE16Toybox } from './e16-toybox.js';
import { createE18P3StagedManipulatorCharacter } from './e18/p3-staged-manipulator-character.js';
import {
  applyManipulationCameraDelta,
  createManipulationIntent,
  transportManipulationIntent,
} from './e18/manipulation-intent.js';
import {
  cameraForwardDepth,
  screenPixelDeltaToManipulationCommand,
} from './e18/manipulation-screen-mapping.js';
import { createE18P3OwnerYard } from './e18/p3-owner-yard.js';
import { FollowCamera } from './follow-camera.js';
import { PlayerInput } from './player-input.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const PICK_DISTANCE = 100;
const EMBODIMENT_CATEGORY = 1n << 63n;
const ORIENTATION_RAD_PER_PIXEL = 0.0055;
const DEPTH_METRES_PER_WHEEL_UNIT = 0.0025;
const MAX_DEPTH_DELTA_PER_EVENT = 0.45;

function enumValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setupScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaebfc8);
  scene.fog = new THREE.Fog(0xaebfc8, 30, 72);
  const camera = new THREE.PerspectiveCamera(51, 1, 0.05, 130);

  scene.add(new THREE.HemisphereLight(0xeaf4f7, 0x59605c, 1.65));
  const sun = new THREE.DirectionalLight(0xfff2d8, 3.1);
  sun.position.set(10, 17, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 48;
  sun.shadow.bias = -0.00018;
  scene.add(sun);

  const grid = new THREE.GridHelper(24, 24, 0x636d70, 0x737d80);
  grid.position.y = 0.012;
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  scene.add(grid);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  return { renderer, scene, camera };
}

function createLine(scene, color, opacity = 0.9) {
  const positions = new Float32Array(6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  scene.add(line);
  return {
    line,
    material,
    set(a, b, visible = true) {
      line.visible = visible;
      if (!visible) return;
      positions[0] = a[0]; positions[1] = a[1]; positions[2] = a[2];
      positions[3] = b[0]; positions[4] = b[1]; positions[5] = b[2];
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

function createMarker(scene, radius, color, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, material };
}

function createP3ManipulatorVisual(scene, maxReach) {
  const coreToPrimary = createLine(scene, 0x26353d, 0.88);
  const actualAxis = createLine(scene, 0xf4b34e, 0.92);
  const targetAxis = createLine(scene, 0x66e1d2, 0.94);
  const primary = createMarker(scene, 0.072, 0xf6d15c);
  const second = createMarker(scene, 0.066, 0xf19a56);
  const physicalTarget1 = createMarker(scene, 0.078, 0x72d9ce, 0.90);
  const physicalTarget2 = createMarker(scene, 0.074, 0x72d9ce, 0.90);
  const rawProxy = createMarker(scene, 0.055, 0xf5f7f4, 0.72);

  const reachShell = new THREE.Mesh(
    new THREE.SphereGeometry(maxReach, 24, 16),
    new THREE.MeshBasicMaterial({
      color: 0x88a8b4,
      wireframe: true,
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
    }),
  );
  reachShell.visible = false;
  scene.add(reachShell);

  function update(character, intentState) {
    const active = Boolean(character.manipulatedBody);
    primary.mesh.visible = active;
    physicalTarget1.mesh.visible = active;
    rawProxy.mesh.visible = active && Boolean(intentState);
    reachShell.visible = active;
    coreToPrimary.set(character.bodyPosition, character.manipulatedAnchorWorld, active);

    if (!active) {
      second.mesh.visible = false;
      physicalTarget2.mesh.visible = false;
      actualAxis.set([0, 0, 0], [0, 0, 0], false);
      targetAxis.set([0, 0, 0], [0, 0, 0], false);
      return;
    }

    primary.mesh.position.set(...character.manipulatedAnchorWorld);
    physicalTarget1.mesh.position.set(...character.manipulatorTarget);
    reachShell.position.set(...character.bodyPosition);
    if (intentState) rawProxy.mesh.position.set(...intentState.targetWorld);

    const saturated = character.precisionActive
      ? character.lastPrecisionSaturated
      : character.lastManipulatorForce >= character.manipulatorMaxForce * 0.985;
    const effortColor = saturated ? 0xff765e : 0x72d9ce;
    physicalTarget1.material.color.setHex(effortColor);
    physicalTarget2.material.color.setHex(effortColor);
    targetAxis.material.color.setHex(saturated ? 0xff765e : 0x66e1d2);

    if (character.precisionActive) {
      second.mesh.visible = true;
      physicalTarget2.mesh.visible = true;
      second.mesh.position.set(...character.precisionAnchorWorld2);
      physicalTarget2.mesh.position.set(...character.precisionTarget2);
      actualAxis.set(character.manipulatedAnchorWorld, character.precisionAnchorWorld2, true);
      targetAxis.set(character.precisionTarget1, character.precisionTarget2, true);
    } else {
      second.mesh.visible = false;
      physicalTarget2.mesh.visible = false;
      actualAxis.set([0, 0, 0], [0, 0, 0], false);
      targetAxis.set([0, 0, 0], [0, 0, 0], false);
    }
  }

  return { update };
}

function cameraBasis3(camera) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  return {
    forward: [forward.x, forward.y, forward.z],
    right: [right.x, right.y, right.z],
    up: [up.x, up.y, up.z],
  };
}

async function main() {
  const canvas = document.querySelector('#app');
  const statusEl = document.querySelector('#status');
  const phaseEl = document.querySelector('#phase');
  const debugEl = document.querySelector('#debug');
  const controlsEl = document.querySelector('#hud .controls');
  const secondaryEl = document.querySelector('#hud .secondary');
  const touchRoot = document.querySelector('#touch-controls');
  const touchResetButton = document.querySelector('#touch-reset');
  const debugValues = {
    speed: document.querySelector('#d-speed'),
    external: document.querySelector('#d-external'),
    vertical: document.querySelector('#d-vertical'),
    support: document.querySelector('#d-support'),
    contacts: document.querySelector('#d-contacts'),
    impulse: document.querySelector('#d-impulse'),
    transport: document.querySelector('#d-transport'),
    constraintClips: document.querySelector('#d-constraint-clips'),
    constraintSolve: document.querySelector('#d-constraint-solve'),
  };
  const debugLabels = {
    external: document.querySelector('#l-external'),
    impulse: document.querySelector('#l-impulse'),
    transport: document.querySelector('#l-transport'),
  };

  statusEl.textContent = 'Loading E18 P3.1…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene(canvas);
  const playground = createPlayground(b3);
  const character = createE18P3StagedManipulatorCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
    feedbackGain: 1,
  });

  playground.appearance.set(bodyKey(character.embodimentBody), {
    color: 0xe5b84e,
    roughness: 0.48,
    metalness: 0.025,
  });

  const toybox = createE16Toybox(b3, playground.world, playground.appearance);
  const p3Yard = createE18P3OwnerYard(b3, playground.world, playground.appearance);
  const worldView = createWorldRenderer(b3, playground.world, { appearance: playground.appearance });
  scene.add(worldView.object3d);
  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);
  const manipulatorVisual = createP3ManipulatorVisual(scene, character.manipulatorMaxReach);

  const playerInput = new PlayerInput({ touchRoot, forceTouch: false });
  const followCamera = new FollowCamera(camera, canvas, {
    dragButtons: [2],
    allowWheelZoom: () => !character.manipulatedBody,
  });
  followCamera.snap(character.position);

  let resetQueued = false;
  let debugVisible = false;
  let manipulationIntent = null;
  let manipulationPointerId = null;
  let lastManipulationX = 0;
  let lastManipulationY = 0;
  let cameraOrbitHeld = false;
  let precisionKeyHeld = false;

  const pointerNdc = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const pickFilter = b3.b3DefaultQueryFilter();
  pickFilter.maskBits &= ~EMBODIMENT_CATEGORY;

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickWorld() {
    raycaster.setFromCamera(pointerNdc, camera);
    const o = raycaster.ray.origin;
    const d = raycaster.ray.direction;
    const translation = [d.x * PICK_DISTANCE, d.y * PICK_DISTANCE, d.z * PICK_DISTANCE];
    const result = b3.b3World_CastRayClosest(
      playground.world,
      [o.x, o.y, o.z],
      translation,
      pickFilter,
    );
    if (!result.hit) return null;
    const body = b3.b3Shape_GetBody(result.shapeId);
    return {
      body,
      point: [
        o.x + translation[0] * result.fraction,
        o.y + translation[1] * result.fraction,
        o.z + translation[2] * result.fraction,
      ],
    };
  }

  function resetIntentTo(targetWorld) {
    manipulationIntent = createManipulationIntent({
      targetWorld,
      transportOriginWorld: character.position,
    });
    character.setManipulationTarget(targetWorld);
  }

  function engagePrecision() {
    if (!character.manipulatedBody || character.precisionActive) return;
    const midpoint = character.beginPrecisionManipulation();
    if (midpoint) resetIntentTo(midpoint);
  }

  function disengagePrecision() {
    if (!character.precisionActive) return;
    const primary = character.endPrecisionManipulation();
    if (primary) resetIntentTo(primary);
  }

  function clearManipulationPointer() {
    if (manipulationPointerId !== null && canvas.hasPointerCapture?.(manipulationPointerId)) {
      canvas.releasePointerCapture?.(manipulationPointerId);
    }
    manipulationPointerId = null;
  }

  function releaseManipulation(reason) {
    if (character.manipulatedBody) character.releaseManipulation(reason);
    manipulationIntent = null;
    clearManipulationPointer();
    canvas.style.cursor = 'crosshair';
  }

  function applyScreenTranslation(dx, dy) {
    if (!manipulationIntent) return;
    const basis = cameraBasis3(camera);
    const cameraPosition = [camera.position.x, camera.position.y, camera.position.z];
    const forwardDepth = Math.max(
      0.35,
      cameraForwardDepth(manipulationIntent.targetWorld, cameraPosition, basis.forward),
    );
    const command = screenPixelDeltaToManipulationCommand({
      deltaXPx: dx,
      deltaYPx: dy,
      forwardDepth,
      verticalFovRadians: THREE.MathUtils.degToRad(camera.fov),
      viewportHeightPx: Math.max(1, renderer.domElement.clientHeight || window.innerHeight),
    });
    applyManipulationCameraDelta(manipulationIntent, {
      ...basis,
      lateral: command.lateral,
      vertical: command.vertical,
      depth: 0,
    });
  }

  function applyPrecisionRotation(dx, dy) {
    const basis = cameraBasis3(camera);
    character.rotatePrecisionTarget(basis.up, -dx * ORIENTATION_RAD_PER_PIXEL);
    character.rotatePrecisionTarget(basis.right, -dy * ORIENTATION_RAD_PER_PIXEL);
  }

  function applyDepthWheel(deltaY) {
    if (!manipulationIntent) return;
    const basis = cameraBasis3(camera);
    const depth = clamp(
      deltaY * DEPTH_METRES_PER_WHEEL_UNIT,
      -MAX_DEPTH_DELTA_PER_EVENT,
      MAX_DEPTH_DELTA_PER_EVENT,
    );
    applyManipulationCameraDelta(manipulationIntent, {
      ...basis,
      lateral: 0,
      vertical: 0,
      depth,
    });
  }

  canvas.style.cursor = 'crosshair';
  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    if (event.pointerType === 'touch') return;

    if (event.button === 2) {
      cameraOrbitHeld = true;
      return;
    }
    if (event.button !== 0 || character.manipulatedBody) return;
    event.preventDefault();
    const picked = pickWorld();
    if (!picked) return;
    const dynamic = enumValue(b3.b3Body_GetType(picked.body)) === enumValue(b3.b3BodyType.b3_dynamicBody);
    if (!dynamic || !character.beginManipulation(picked.body, picked.point)) return;

    resetIntentTo(picked.point);
    manipulationPointerId = event.pointerId;
    lastManipulationX = event.clientX;
    lastManipulationY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grabbing';
    if (precisionKeyHeld) engagePrecision();
  });

  canvas.addEventListener('pointermove', (event) => {
    updatePointer(event);
    if (!character.manipulatedBody || event.pointerId !== manipulationPointerId) return;
    const dx = event.clientX - lastManipulationX;
    const dy = event.clientY - lastManipulationY;
    lastManipulationX = event.clientX;
    lastManipulationY = event.clientY;
    if (cameraOrbitHeld || (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9)) return;
    if (character.precisionActive) applyPrecisionRotation(dx, dy);
    else applyScreenTranslation(dx, dy);
  });

  window.addEventListener('pointerup', (event) => {
    if (event.button === 2) {
      cameraOrbitHeld = false;
      return;
    }
    if (event.button === 0 && character.manipulatedBody) releaseManipulation('owner-release');
  });
  window.addEventListener('pointercancel', (event) => {
    if (event.pointerId === manipulationPointerId) releaseManipulation('pointer-cancel');
  });
  window.addEventListener('blur', () => {
    cameraOrbitHeld = false;
    precisionKeyHeld = false;
    releaseManipulation('window-blur');
  });

  canvas.addEventListener('wheel', (event) => {
    if (!character.manipulatedBody || !manipulationIntent) return;
    event.preventDefault();
    applyDepthWheel(event.deltaY);
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'control') {
      precisionKeyHeld = true;
      if (!event.repeat) engagePrecision();
      return;
    }
    if (key === 'r' && !event.repeat) resetQueued = true;
    if (key === 'h' && !event.repeat) {
      debugVisible = !debugVisible;
      debugEl.hidden = !debugVisible;
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.key.toLowerCase() !== 'control') return;
    precisionKeyHeld = false;
    disengagePrecision();
  });

  if (touchResetButton) {
    touchResetButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      resetQueued = true;
    });
  }

  phaseEl.textContent = 'E18 P3.1 · ROUGH + PRECISION AXIS';
  if (controlsEl) {
    controlsEl.innerHTML = '<strong>WASD</strong> move · <strong>Space</strong> jump · <strong>Shift</strong> sprint · <strong>RMB drag</strong> camera · <strong>wheel</strong> zoom when free';
  }
  if (secondaryEl) {
    secondaryEl.innerHTML = '<strong>LMB hold + mouse</strong> rough grab · <strong>wheel while held</strong> depth · <strong>Ctrl + mouse</strong> precision axis · <strong>R</strong> reset · <strong>H</strong> debug';
  }
  debugLabels.external.textContent = 'reach / task error';
  debugLabels.impulse.textContent = 'shared physical authority';
  debugLabels.transport.textContent = 'player recoil bridge';

  const baseCounts = playground.stats();
  const toyboxCounts = toybox.stats();
  const p3Counts = p3Yard.stats();
  statusEl.textContent = `P3.1 staged manipulation · ${baseCounts.dynamicBodies + toyboxCounts.dynamicBodies + p3Counts.dynamicBodies} dynamic bodies · rough one-point + Ctrl precision axis · free twist retained`;

  function resetAll() {
    releaseManipulation('reset');
    playground.reset();
    toybox.reset();
    p3Yard.reset();
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.reset();
    followCamera.snap(character.position);
    cameraOrbitHeld = false;
    precisionKeyHeld = false;
    resetQueued = false;
  }

  function resetCharacterOnly() {
    releaseManipulation('character-reset');
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.snap(character.position);
    cameraOrbitHeld = false;
    precisionKeyHeld = false;
  }

  function synchronizeIntentAndLifecycle() {
    if (!character.manipulatedBody) {
      if (manipulationIntent) {
        manipulationIntent = null;
        clearManipulationPointer();
        canvas.style.cursor = 'crosshair';
      }
      return;
    }
    if (!manipulationIntent) resetIntentTo(character.manipulationIntentTarget());
    transportManipulationIntent(manipulationIntent, character.position);
    character.setManipulationTarget(manipulationIntent.targetWorld);
  }

  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;

  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    toybox.preStep(dt);
    p3Yard.preStep(dt);
    synchronizeIntentAndLifecycle();

    const basis = followCamera.basis();
    const intent = playerInput.sample(basis);
    character.preStep(dt, intent);
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);
    synchronizeIntentAndLifecycle();

    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 48) {
      resetCharacterOnly();
    }
  }

  function updateVisuals(frameDt) {
    worldView.update();
    characterVisual.update(frameDt);
    manipulatorVisual.update(character, manipulationIntent);
    followCamera.update(character.position, Boolean(character.currentSupport), frameDt);
  }

  function updateHud(frameDt) {
    hudAccumulator += frameDt;
    if (hudAccumulator < 0.08) return;
    hudAccumulator = 0;
    const data = character.telemetry();
    debugValues.speed.textContent = `${data.speed.toFixed(2)} m/s`;
    debugValues.external.textContent = `${data.manipulatorReach.toFixed(2)} m / ${data.manipulatorError.toFixed(2)} m`;
    debugValues.vertical.textContent = `${data.verticalSpeed.toFixed(2)} m/s`;
    debugValues.support.textContent = data.grounded ? data.supportType : 'AIR';
    debugValues.contacts.textContent = data.manipulating
      ? data.precisionActive ? 'PRECISION · 5-DoF AXIS' : 'ROUGH · ONE POINT'
      : 'free';
    debugValues.impulse.textContent = data.manipulating
      ? `${data.manipulatorForce.toFixed(0)} / ${character.manipulatorMaxForce.toFixed(0)} N${data.precisionSaturated ? ' · SAT' : ''}`
      : '0 N';
    debugValues.transport.textContent = `${data.bodyFeedbackImpulse.toFixed(1)} N·s`;
    debugValues.constraintClips.textContent = data.bodyFeedbackClipped ? 'FEEDBACK CLIPPED' : data.precisionActive ? 'twist free' : 'open';
    debugValues.constraintSolve.textContent = data.manipulatorReleaseReason ?? '—';
  }

  function frame(now) {
    const frameDt = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    accumulator += frameDt;
    while (accumulator >= FIXED_DT) {
      physicsTick(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    updateVisuals(frameDt);
    updateHud(frameDt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return { character, playground, toybox, p3Yard };
}

main().catch((error) => {
  console.error(error);
  const statusEl = document.querySelector('#status');
  if (statusEl) statusEl.textContent = `E18 P3.1 failed: ${error?.message ?? error}`;
});
