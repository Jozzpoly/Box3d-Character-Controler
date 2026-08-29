import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { ControllerOwnedCharacter } from './character.js';
import { createCharacterVisual } from './character-visual.js';
import { FollowCamera } from './follow-camera.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const canvas = document.querySelector('#app');
const statusEl = document.querySelector('#status');
const debugEl = document.querySelector('#debug');
const debugValues = { speed: document.querySelector('#d-speed'), external: document.querySelector('#d-external'), vertical: document.querySelector('#d-vertical'), support: document.querySelector('#d-support'), contacts: document.querySelector('#d-contacts'), impulse: document.querySelector('#d-impulse'), transport: document.querySelector('#d-transport') };
const keys = new Set();
let jumpQueued = false;
let resetQueued = false;
let debugVisible = false;
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase(); keys.add(key);
  if (event.code === 'Space' && !event.repeat) { jumpQueued = true; event.preventDefault(); }
  if (key === 'r' && !event.repeat) resetQueued = true;
  if (key === 'h' && !event.repeat) { debugVisible = !debugVisible; debugEl.hidden = !debugVisible; }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); jumpQueued = false; });

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
  sun.position.set(10, 17, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20; sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20; sun.shadow.camera.near = 1; sun.shadow.camera.far = 48; sun.shadow.bias = -0.00018;
  scene.add(sun);
  const grid = new THREE.GridHelper(22, 22, 0x636d70, 0x737d80);
  grid.position.y = 0.012; grid.material.transparent = true; grid.material.opacity = 0.18; scene.add(grid);
  function resize() { const width = window.innerWidth; const height = window.innerHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  return { renderer, scene, camera };
}

async function main() {
  statusEl.textContent = 'Loading Box3D…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene();
  const playground = createPlayground(b3);
  const worldView = createWorldRenderer(b3, playground.world, { appearance: playground.appearance });
  scene.add(worldView.object3d);
  const character = new ControllerOwnedCharacter(b3, playground.world, { startPosition: playground.spawn, gravity: playground.gravity, virtualMass: 80 });
  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);
  const followCamera = new FollowCamera(camera, canvas);
  followCamera.snap(character.position);
  function resetAll() { playground.reset(); character.reset(playground.spawn); characterVisual.reset(); followCamera.reset(); followCamera.snap(character.position); resetQueued = false; }
  const counts = playground.stats();
  statusEl.textContent = `Ready · ${counts.dynamicCount} dynamic bodies · 80 kg virtual body`;
  let previous = performance.now(); let accumulator = 0; let hudAccumulator = 0;
  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    const basis = followCamera.basis();
    let moveForward = 0; let moveRight = 0;
    if (keys.has('w')) moveForward += 1; if (keys.has('s')) moveForward -= 1; if (keys.has('d')) moveRight += 1; if (keys.has('a')) moveRight -= 1;
    character.preStep(dt, { moveForward, moveRight, forward: basis.forward, right: basis.right, jump: jumpQueued, jumpHeld: keys.has(' '), sprint: keys.has('shift') });
    jumpQueued = false;
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);
    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) { character.reset(playground.spawn); characterVisual.reset(); followCamera.snap(character.position); }
  }
  function updateVisuals(frameDt) { worldView.update(); characterVisual.update(frameDt); followCamera.update(character.position, Boolean(character.currentSupport), frameDt); }
  function updateHud(frameDt) {
    hudAccumulator += frameDt; if (hudAccumulator < 0.08) return; hudAccumulator = 0;
    const data = character.telemetry();
    debugValues.speed.textContent = `${data.speed.toFixed(2)} m/s`; debugValues.external.textContent = `${data.externalSpeed.toFixed(2)} m/s`; debugValues.vertical.textContent = `${data.verticalSpeed.toFixed(2)} m/s`; debugValues.support.textContent = data.grounded ? data.supportType : 'AIR'; debugValues.contacts.textContent = `${data.dynamicContacts}`; debugValues.impulse.textContent = `${data.contactImpulse.toFixed(1)} N·s`; debugValues.transport.textContent = `${(data.supportTransport * 100).toFixed(1)} cm/tick`;
  }
  function frame(now) {
    const frameDt = Math.min((now - previous) / 1000, 0.1); previous = now; accumulator += frameDt;
    while (accumulator >= FIXED_DT) { physicsTick(FIXED_DT); accumulator -= FIXED_DT; }
    updateVisuals(frameDt); updateHud(frameDt); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  worldView.update(); characterVisual.update(FIXED_DT); requestAnimationFrame(frame);
}
main().catch((error) => { console.error(error); statusEl.textContent = `FAILED: ${error instanceof Error ? error.message : String(error)}`; });
