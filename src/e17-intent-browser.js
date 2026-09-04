import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createCharacterVisual } from './character-visual.js';
import { createE17IntentManipulatorCharacter } from './e17-intent-manipulator-character.js';
import { createE16Toybox } from './e16-toybox.js';
import { FollowCamera } from './follow-camera.js';
import { PlayerInput } from './player-input.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const PICK_DISTANCE = 100;
const EMBODIMENT_CATEGORY = 1n << 63n;
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

function enumValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

function setupScene() {
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

  const grid = new THREE.GridHelper(22, 22, 0x636d70, 0x737d80);
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

function createManipulatorVisual(scene, maxReach) {
  const positions = new Float32Array(6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x26353d, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  scene.add(line);

  const anchorMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xf6d15c }),
  );
  anchorMarker.visible = false;
  scene.add(anchorMarker);

  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe8f3f0, transparent: true, opacity: 0.92 }),
  );
  targetMarker.visible = false;
  scene.add(targetMarker);

  const reachShell = new THREE.Mesh(
    new THREE.SphereGeometry(maxReach, 24, 16),
    new THREE.MeshBasicMaterial({
      color: 0x88a8b4,
      wireframe: true,
      transparent: true,
      opacity: 0.10,
      depthWrite: false,
    }),
  );
  reachShell.visible = false;
  scene.add(reachShell);

  function update(character) {
    const active = Boolean(character.manipulatedBody);
    line.visible = active;
    anchorMarker.visible = active;
    targetMarker.visible = active;
    reachShell.visible = active;
    if (!active) return;

    positions[0] = character.bodyPosition[0];
    positions[1] = character.bodyPosition[1];
    positions[2] = character.bodyPosition[2];
    positions[3] = character.manipulatedAnchorWorld[0];
    positions[4] = character.manipulatedAnchorWorld[1];
    positions[5] = character.manipulatedAnchorWorld[2];
    geometry.attributes.position.needsUpdate = true;
    anchorMarker.position.set(...character.manipulatedAnchorWorld);
    targetMarker.position.set(...character.manipulatorTarget);
    reachShell.position.set(...character.bodyPosition);
  }

  return { update };
}

async function main() {
  statusEl.textContent = 'Loading Box3D…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene();
  const playground = createPlayground(b3);
  const character = createE17IntentManipulatorCharacter(b3, playground.world, {
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
  const worldView = createWorldRenderer(b3, playground.world, { appearance: playground.appearance });
  scene.add(worldView.object3d);
  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);
  const manipulatorVisual = createManipulatorVisual(scene, character.manipulatorMaxReach);

  const playerInput = new PlayerInput({ touchRoot, forceTouch: false });
  const followCamera = new FollowCamera(camera, canvas, {
    dragButtons: [2],
    allowWheelZoom: () => true,
  });
  followCamera.snap(character.position);

  let resetQueued = false;
  let debugVisible = false;
  let dragPlaneActive = false;
  const pointerNdc = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane();
  const dragPlaneNormal = new THREE.Vector3();
  const dragHit = new THREE.Vector3();
  const pickFilter = b3.b3DefaultQueryFilter();
  pickFilter.maskBits &= ~EMBODIMENT_CATEGORY;

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function setRayFromPointer() {
    raycaster.setFromCamera(pointerNdc, camera);
    return raycaster.ray;
  }

  function pickWorld() {
    const ray = setRayFromPointer();
    const o = ray.origin;
    const d = ray.direction;
    const translation = [d.x * PICK_DISTANCE, d.y * PICK_DISTANCE, d.z * PICK_DISTANCE];
    const result = b3.b3World_CastRayClosest(
      playground.world,
      [o.x, o.y, o.z],
      translation,
      pickFilter,
    );
    if (!result.hit) return null;
    const body = b3.b3Shape_GetBody(result.shapeId);
    const point = [
      o.x + translation[0] * result.fraction,
      o.y + translation[1] * result.fraction,
      o.z + translation[2] * result.fraction,
    ];
    return { body, shape: result.shapeId, point };
  }

  function updateDragTarget() {
    if (!dragPlaneActive || !character.manipulatedBody) return;
    const ray = setRayFromPointer();
    const hit = ray.intersectPlane(dragPlane, dragHit);
    if (!hit) return;
    character.setManipulationTarget([hit.x, hit.y, hit.z]);
  }

  canvas.style.cursor = 'crosshair';
  canvas.addEventListener('pointermove', (event) => {
    updatePointer(event);
    updateDragTarget();
  });
  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    if (event.pointerType === 'touch' || event.button !== 0) return;
    event.preventDefault();

    const picked = pickWorld();
    if (!picked) return;
    const dynamic = enumValue(b3.b3Body_GetType(picked.body)) === enumValue(b3.b3BodyType.b3_dynamicBody);
    if (!dynamic) return;
    if (!character.beginManipulation(picked.body, picked.point)) return;

    camera.getWorldDirection(dragPlaneNormal).normalize();
    dragPlane.setFromNormalAndCoplanarPoint(dragPlaneNormal, new THREE.Vector3(...picked.point));
    dragPlaneActive = true;
    character.setManipulationTarget(picked.point);
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button !== 0) return;
    if (character.manipulatedBody) character.releaseManipulation('owner-release');
    dragPlaneActive = false;
    canvas.style.cursor = 'crosshair';
  });
  window.addEventListener('blur', () => {
    if (character.manipulatedBody) character.releaseManipulation('window-blur');
    dragPlaneActive = false;
    canvas.style.cursor = 'crosshair';
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'r' && !event.repeat) resetQueued = true;
    if (key === 'h' && !event.repeat) {
      debugVisible = !debugVisible;
      debugEl.hidden = !debugVisible;
    }
  });

  if (touchResetButton) {
    touchResetButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      resetQueued = true;
    });
  }

  phaseEl.textContent = 'E17 · INTENT-FIRST PHYSICAL MANIPULATOR';
  if (controlsEl) {
    controlsEl.innerHTML = '<strong>WASD</strong> move · <strong>Space</strong> jump · <strong>Shift</strong> sprint · <strong>RMB drag</strong> camera · <strong>wheel</strong> zoom';
  }
  if (secondaryEl) {
    secondaryEl.innerHTML = '<strong>LMB directly on a nearby dynamic object + drag</strong> = manipulate its clicked surface point in 3D · object mass/collision still win · <strong>release LMB</strong> let go · <strong>R</strong> reset · <strong>H</strong> telemetry';
  }
  debugLabels.external.textContent = 'intent reach / error';
  debugLabels.impulse.textContent = 'physical manipulator';
  debugLabels.transport.textContent = 'core reaction';

  const baseCounts = playground.stats();
  const toyboxCounts = toybox.stats();
  statusEl.textContent = `E17 architecture reset · NO green end-effector aiming · direct object intent -> finite physical execution · ${baseCounts.dynamicCount + toyboxCounts.dynamicBodies + 1} dynamic bodies`;

  function resetAll() {
    character.releaseManipulation('reset');
    playground.reset();
    toybox.reset();
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.reset();
    followCamera.snap(character.position);
    dragPlaneActive = false;
    canvas.style.cursor = 'crosshair';
    resetQueued = false;
  }

  function resetCharacterOnly() {
    character.releaseManipulation('character-reset');
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.snap(character.position);
    dragPlaneActive = false;
    canvas.style.cursor = 'crosshair';
  }

  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;

  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    toybox.preStep(dt);
    updateDragTarget();

    const basis = followCamera.basis();
    const intent = playerInput.sample(basis);
    character.preStep(dt, intent);
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);

    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) {
      resetCharacterOnly();
    }
  }

  function updateVisuals(frameDt) {
    worldView.update();
    characterVisual.update(frameDt);
    manipulatorVisual.update(character);
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
    debugValues.contacts.textContent = data.manipulating ? 'DIRECT OBJECT INTENT' : 'free';
    debugValues.impulse.textContent = data.manipulating
      ? `${data.manipulatorForce.toFixed(0)} N · ${data.manipulatorImpulse.toFixed(1)} N·s/tick`
      : '0 N';
    debugValues.transport.textContent = `${data.bodyFeedbackImpulse.toFixed(1)} N·s`;
    debugValues.constraintClips.textContent = data.bodyFeedbackClipped ? 'CLIPPED' : 'open';
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
}

main().catch((error) => {
  console.error(error);
  statusEl.textContent = `E17 failed: ${error?.message ?? error}`;
});
