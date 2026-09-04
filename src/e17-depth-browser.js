import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createCharacterVisual } from './character-visual.js';
import { createE17PointMassManipulatorCharacter } from './e17-point-mass-manipulator-character.js';
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
const controlsEl = document.querySelector('#hud .controls');
const secondaryEl = document.querySelector('#hud .secondary');
const touchRoot = document.querySelector('#touch-controls');

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

function createManipulatorVisual(scene) {
  const positions = new Float32Array(6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x26353d, transparent: true, opacity: 0.9 }),
  );
  line.visible = false;
  scene.add(line);

  const anchor = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xf6d15c }),
  );
  anchor.visible = false;
  scene.add(anchor);

  const target = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe8f3f0, transparent: true, opacity: 0.92 }),
  );
  target.visible = false;
  scene.add(target);

  return {
    update(character) {
      const active = Boolean(character.manipulatedBody);
      line.visible = active;
      anchor.visible = active;
      target.visible = active;
      if (!active) return;
      positions[0] = character.bodyPosition[0];
      positions[1] = character.bodyPosition[1];
      positions[2] = character.bodyPosition[2];
      positions[3] = character.manipulatedAnchorWorld[0];
      positions[4] = character.manipulatedAnchorWorld[1];
      positions[5] = character.manipulatedAnchorWorld[2];
      geometry.attributes.position.needsUpdate = true;
      anchor.position.set(...character.manipulatedAnchorWorld);
      target.position.set(...character.manipulatorTarget);
    },
  };
}

async function main() {
  statusEl.textContent = 'Loading E17-depth…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene();
  const playground = createPlayground(b3);
  const toybox = createE16Toybox(b3, playground.world, playground.appearance);
  const character = createE17PointMassManipulatorCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
    feedbackGain: 1,
  });

  playground.appearance.set(bodyKey(character.embodimentBody), {
    color: 0xe5b84e,
    roughness: 0.48,
    metalness: 0.025,
  });

  const worldView = createWorldRenderer(b3, playground.world, { appearance: playground.appearance });
  scene.add(worldView.object3d);
  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);
  const manipulatorVisual = createManipulatorVisual(scene);

  const playerInput = new PlayerInput({ touchRoot, forceTouch: false });
  const followCamera = new FollowCamera(camera, canvas, {
    dragButtons: [2],
    allowWheelZoom: () => true,
  });
  followCamera.snap(character.position);

  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane();
  const dragPlaneNormal = new THREE.Vector3();
  const dragHit = new THREE.Vector3();
  const pickFilter = b3.b3DefaultQueryFilter();
  pickFilter.maskBits &= ~EMBODIMENT_CATEGORY;
  let dragPlaneActive = false;
  let resetQueued = false;

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function rayFromPointer() {
    raycaster.setFromCamera(pointerNdc, camera);
    return raycaster.ray;
  }

  function pickWorld() {
    const ray = rayFromPointer();
    const translation = [
      ray.direction.x * PICK_DISTANCE,
      ray.direction.y * PICK_DISTANCE,
      ray.direction.z * PICK_DISTANCE,
    ];
    const result = b3.b3World_CastRayClosest(
      playground.world,
      [ray.origin.x, ray.origin.y, ray.origin.z],
      translation,
      pickFilter,
    );
    if (!result.hit) return null;
    const body = b3.b3Shape_GetBody(result.shapeId);
    return {
      body,
      point: [
        ray.origin.x + translation[0] * result.fraction,
        ray.origin.y + translation[1] * result.fraction,
        ray.origin.z + translation[2] * result.fraction,
      ],
    };
  }

  function updateDragTarget() {
    if (!dragPlaneActive || !character.manipulatedBody) return;
    const hit = rayFromPointer().intersectPlane(dragPlane, dragHit);
    if (hit) character.setManipulationTarget([hit.x, hit.y, hit.z]);
  }

  function release(reason) {
    if (character.manipulatedBody) character.releaseManipulation(reason);
    dragPlaneActive = false;
    canvas.style.cursor = 'crosshair';
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
    if (enumValue(b3.b3Body_GetType(picked.body)) !== enumValue(b3.b3BodyType.b3_dynamicBody)) return;
    if (!character.beginManipulation(picked.body, picked.point)) return;
    camera.getWorldDirection(dragPlaneNormal).normalize();
    dragPlane.setFromNormalAndCoplanarPoint(dragPlaneNormal, new THREE.Vector3(...picked.point));
    dragPlaneActive = true;
    character.setManipulationTarget(picked.point);
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) release('owner-release');
  });
  window.addEventListener('blur', () => release('window-blur'));
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r' && !event.repeat) resetQueued = true;
  });

  phaseEl.textContent = 'E17-depth · ONE-POINT, INERTIA-AWARE';
  if (controlsEl) controlsEl.innerHTML = '<strong>WASD</strong> move · <strong>Space</strong> jump · <strong>Shift</strong> sprint · <strong>RMB drag</strong> camera · <strong>wheel</strong> zoom';
  if (secondaryEl) secondaryEl.innerHTML = '<strong>LMB directly on a nearby dynamic object + drag</strong> = same E17 one-point intent · only point effective-mass accounting changed · <strong>release LMB</strong> let go · <strong>R</strong> reset';
  statusEl.textContent = 'E17-depth A/B · same one-point gameplay · rotational inertia now participates in actuator effective mass';

  function resetAll() {
    release('reset');
    playground.reset();
    toybox.reset();
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.reset();
    followCamera.snap(character.position);
    resetQueued = false;
  }

  let previous = performance.now();
  let accumulator = 0;

  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    toybox.preStep(dt);
    updateDragTarget();
    const intent = playerInput.sample(followCamera.basis());
    character.preStep(dt, intent);
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);
    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) resetAll();
  }

  function frame(now) {
    const frameDt = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    accumulator += frameDt;
    while (accumulator >= FIXED_DT) {
      physicsTick(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    worldView.update();
    characterVisual.update(frameDt);
    manipulatorVisual.update(character);
    followCamera.update(character.position, Boolean(character.currentSupport), frameDt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main().catch((error) => {
  console.error(error);
  statusEl.textContent = `E17-depth failed: ${error?.message ?? error}`;
});
