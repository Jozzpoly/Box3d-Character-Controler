import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { ControllerOwnedCharacter } from './character.js';
import { FollowCamera } from './follow-camera.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const canvas = document.querySelector('#app');
const statusEl = document.querySelector('#status');
const debugEl = document.querySelector('#debug');
const debugValues = { speed: document.querySelector('#d-speed'), vertical: document.querySelector('#d-vertical'), support: document.querySelector('#d-support'), contacts: document.querySelector('#d-contacts'), impulse: document.querySelector('#d-impulse'), transport: document.querySelector('#d-transport') };
const keys = new Set();
let jumpQueued = false;
let resetQueued = false;
let debugVisible = false;
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (event.code === 'Space' && !event.repeat) { jumpQueued = true; event.preventDefault(); }
  if (key === 'r' && !event.repeat) resetQueued = true;
  if (key === 'h' && !event.repeat) { debugVisible = !debugVisible; debugEl.hidden = !debugVisible; }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); jumpQueued = false; });

function createCharacterVisual(character) {
  const group = new THREE.Group();
  const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(character.radius, character.halfSegment * 2, 10, 18), new THREE.MeshStandardMaterial({ color: 0xe85d5d, roughness: 0.46 }));
  capsule.castShadow = true;
  capsule.receiveShadow = true;
  group.add(capsule);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.20, 0.15), new THREE.MeshStandardMaterial({ color: 0xf7f9fb, roughness: 0.4 }));
  chest.position.set(0, 0.22, -character.radius * 0.9);
  group.add(chest);
  const direction = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 12), new THREE.MeshStandardMaterial({ color: 0x1b2329, roughness: 0.5 }));
  direction.rotation.x = -Math.PI / 2;
  direction.position.set(0, 0.05, -character.radius * 1.35);
  group.add(direction);
  return group;
}

function setupScene() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x161d23);
  scene.fog = new THREE.Fog(0x161d23, 24, 58);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.05, 120);
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x3d3328, 1.65));
  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(8, 15, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22; sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22; sun.shadow.camera.near = 1; sun.shadow.camera.far = 45;
  scene.add(sun);
  const grid = new THREE.GridHelper(48, 48, 0x687783, 0x35414a);
  grid.position.y = 0.012; grid.material.transparent = true; grid.material.opacity = 0.38; scene.add(grid);
  function resize() { const width = window.innerWidth; const height = window.innerHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  return { renderer, scene, camera };
}
function shortestAngleDelta(from, to) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }

async function main() {
  statusEl.textContent = 'Loading Box3D…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene();
  const playground = createPlayground(b3);
  const worldView = createWorldRenderer(b3, playground.world);
  scene.add(worldView.object3d);
  const character = new ControllerOwnedCharacter(b3, playground.world, { startPosition: playground.spawn, gravity: playground.gravity, virtualMass: 80 });
  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual);
  const followCamera = new FollowCamera(camera, canvas);
  followCamera.snap(character.position);
  function resetAll() { playground.reset(); character.reset(playground.spawn); followCamera.snap(character.position); resetQueued = false; }
  const counts = playground.stats();
  statusEl.textContent = `Free play · ${counts.dynamicCount} dynamic bodies · ${counts.kinematicCount} moving support`;
  let facingYaw = 0;
  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;
  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    const basis = followCamera.basis();
    let moveForward = 0; let moveRight = 0;
    if (keys.has('w')) moveForward += 1; if (keys.has('s')) moveForward -= 1; if (keys.has('d')) moveRight += 1; if (keys.has('a')) moveRight -= 1;
    character.preStep(dt, { moveForward, moveRight, forward: basis.forward, right: basis.right, jump: jumpQueued, sprint: keys.has('shift') });
    jumpQueued = false;
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);
    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) { character.reset(playground.spawn); followCamera.snap(character.position); }
  }
  function updateVisuals(frameDt) {
    worldView.update();
    characterVisual.position.set(character.position[0], character.position[1], character.position[2]);
    if (character.desiredSpeed > 0.05) { const desiredYaw = Math.atan2(character.desiredDirection[0], -character.desiredDirection[2]); facingYaw += shortestAngleDelta(facingYaw, desiredYaw) * (1 - Math.exp(-frameDt * 14)); }
    characterVisual.rotation.y = facingYaw;
    followCamera.update(character.position, frameDt);
  }
  function updateHud(frameDt) {
    hudAccumulator += frameDt; if (hudAccumulator < 0.08) return; hudAccumulator = 0;
    const data = character.telemetry();
    debugValues.speed.textContent = `${data.speed.toFixed(2)} m/s`; debugValues.vertical.textContent = `${data.verticalSpeed.toFixed(2)} m/s`; debugValues.support.textContent = data.grounded ? data.supportType : 'AIR'; debugValues.contacts.textContent = `${data.dynamicContacts}`; debugValues.impulse.textContent = `${data.contactImpulse.toFixed(1)} N·s`; debugValues.transport.textContent = `${(data.supportTransport * 100).toFixed(1)} cm/tick`;
  }
  function frame(now) {
    const frameDt = Math.min((now - previous) / 1000, 0.1); previous = now; accumulator += frameDt;
    while (accumulator >= FIXED_DT) { physicsTick(FIXED_DT); accumulator -= FIXED_DT; }
    updateVisuals(frameDt); updateHud(frameDt); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  worldView.update(); requestAnimationFrame(frame);
}
main().catch((error) => { console.error(error); statusEl.textContent = `FAILED: ${error instanceof Error ? error.message : String(error)}`; });
