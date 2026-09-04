import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createCharacterVisual } from './character-visual.js';
import { createE15Affordances } from './e15-affordances.js';
import { createE15ContactSemanticCharacter } from './e15-contact-semantic-character.js';
import { FollowCamera } from './follow-camera.js';
import { PlayerInput } from './player-input.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const urlParams = new URLSearchParams(window.location.search);
const forceTouch = urlParams.get('touch') === '1'
  ? true
  : urlParams.get('touch') === '0'
    ? false
    : null;
const feedbackGain = urlParams.get('feedback') === '0' ? 0 : 1;

const canvas = document.querySelector('#app');
const statusEl = document.querySelector('#status');
const phaseEl = document.querySelector('#phase');
const debugEl = document.querySelector('#debug');
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
const playerInput = new PlayerInput({ touchRoot, forceTouch });

let resetQueued = false;
let debugVisible = false;

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'r' && !event.repeat) resetQueued = true;
  if (key === 'h' && !event.repeat) {
    debugVisible = !debugVisible;
    debugEl.hidden = !debugVisible;
  }
});

if (touchResetButton) {
  const releaseReset = (event) => {
    touchResetButton.classList.remove('is-held');
    if (touchResetButton.hasPointerCapture?.(event.pointerId)) {
      touchResetButton.releasePointerCapture?.(event.pointerId);
    }
  };
  touchResetButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    resetQueued = true;
    touchResetButton.classList.add('is-held');
    touchResetButton.setPointerCapture?.(event.pointerId);
  });
  touchResetButton.addEventListener('pointerup', releaseReset);
  touchResetButton.addEventListener('pointercancel', releaseReset);
  touchResetButton.addEventListener('lostpointercapture', () => touchResetButton.classList.remove('is-held'));
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

async function main() {
  statusEl.textContent = 'Loading Box3D…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene();
  const playground = createPlayground(b3);
  const character = createE15ContactSemanticCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
    feedbackGain,
  });

  // Make the split representation legible during Owner free play:
  // red capsule = accepted Donor agency carrier; gold box = solver-owned physical body.
  playground.appearance.set(bodyKey(character.embodimentBody), {
    color: 0xf0c45e,
    roughness: 0.5,
    metalness: 0.02,
  });
  const affordances = createE15Affordances(b3, playground.world, playground.appearance);

  const worldView = createWorldRenderer(b3, playground.world, {
    appearance: playground.appearance,
  });
  scene.add(worldView.object3d);

  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);
  const followCamera = new FollowCamera(camera, canvas);
  followCamera.snap(character.position);

  phaseEl.textContent = feedbackGain > 0
    ? 'E15.1 · DONOR AGENCY + CONTACT-EPISODE PHYSICAL BODY'
    : 'E15.1 CONTROL · PHYSICAL BODY FEEDBACK DISABLED';
  debugLabels.external.textContent = 'body offset';
  debugLabels.impulse.textContent = 'body→root feedback';
  debugLabels.transport.textContent = 'upright torque';

  const counts = playground.stats();
  statusEl.textContent = playerInput.touchEnabled
    ? `E15.1 experimental · red = Donor carrier · gold = physical torso · touch active · ${counts.dynamicCount + 1} dynamic bodies`
    : `E15.1 experimental · red = Donor carrier · gold = physical torso · ${counts.dynamicCount + 1} dynamic bodies`;

  function resetAll() {
    playground.reset();
    affordances.reset();
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.reset();
    followCamera.snap(character.position);
    resetQueued = false;
  }

  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;

  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    affordances.preStep(dt);
    const basis = followCamera.basis();
    const intent = playerInput.sample(basis);

    character.preStep(dt, intent);
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);

    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) {
      character.reset(playground.spawn);
      characterVisual.reset();
      followCamera.snap(character.position);
    }
  }

  function updateVisuals(frameDt) {
    worldView.update();
    characterVisual.update(frameDt);
    followCamera.update(character.position, Boolean(character.currentSupport), frameDt);
  }

  function updateHud(frameDt) {
    hudAccumulator += frameDt;
    if (hudAccumulator < 0.08) return;
    hudAccumulator = 0;
    const data = character.telemetry();
    debugValues.speed.textContent = `${data.speed.toFixed(2)} m/s`;
    debugValues.external.textContent = `${data.bodyOffset.toFixed(2)} m`;
    debugValues.vertical.textContent = `${data.verticalSpeed.toFixed(2)} m/s`;
    debugValues.support.textContent = data.grounded ? data.supportType : 'AIR';
    debugValues.contacts.textContent = `${data.bodyContacts} body / ${data.dynamicContacts} root`;
    debugValues.impulse.textContent =
      `${data.bodyFeedbackImpulse.toFixed(1)} N·s ` +
      `(P ${data.bodyPersistentFeedbackImpulse.toFixed(1)} / C ${data.bodyConstraintFeedbackImpulse.toFixed(1)})`;
    debugValues.transport.textContent = `${data.bodyUprightTorque.toFixed(0)} N·m`;
    debugValues.constraintClips.textContent = Number.isFinite(data.constraintClips)
      ? `${data.constraintClips}/tick`
      : '—';
    debugValues.constraintSolve.textContent = Number.isFinite(data.constraintSolveError)
      ? data.constraintSolveError.toExponential(2)
      : '—';
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

  worldView.update();
  characterVisual.update(FIXED_DT);
  requestAnimationFrame(frame);
}

main().catch((error) => {
  console.error(error);
  statusEl.textContent = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
});
