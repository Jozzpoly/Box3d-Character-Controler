import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { ControllerOwnedCharacter } from './character.js';
import { createDonorCharacter } from './donor-character.js';
import { SolverOwnedCharacter } from './solver-owned-character.js';
import { createCharacterVisual } from './character-visual.js';
import { FollowCamera } from './follow-camera.js';
import { createFreePlayCapture } from './free-play-capture.js';
import { installVelocityOnlyContactMemoryProbe } from './momentum-semantics-probe.js';
import { PlayerInput } from './player-input.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const urlParams = new URLSearchParams(window.location.search);
const requestedMode = urlParams.get('mode');
const EMBODIMENT_MODE = requestedMode === 'solver'
  ? 'solver'
  : requestedMode === 'momentum'
    ? 'momentum'
    : requestedMode === 'donor'
      ? 'donor'
      : requestedMode === 'causal'
        ? 'causal'
        : 'controller';
const CAPTURE_MODE = EMBODIMENT_MODE === 'causal' && urlParams.get('capture') === '1';
const forceTouch = urlParams.get('touch') === '1'
  ? true
  : urlParams.get('touch') === '0'
    ? false
    : null;

const canvas = document.querySelector('#app');
const statusEl = document.querySelector('#status');
const phaseEl = document.querySelector('#phase');
const debugEl = document.querySelector('#debug');
const secondaryControlsEl = document.querySelector('#hud .secondary');
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
};
const debugLabels = {
  external: document.querySelector('#l-external'),
  impulse: document.querySelector('#l-impulse'),
  transport: document.querySelector('#l-transport'),
};
const playerInput = new PlayerInput({ touchRoot, forceTouch });

function loadMode(mode) {
  const url = new URL(window.location.href);
  if (mode === 'solver') url.searchParams.set('mode', 'solver');
  else if (mode === 'causal') url.searchParams.set('mode', 'causal');
  else if (mode === 'momentum') url.searchParams.set('mode', 'momentum');
  else if (mode === 'donor') url.searchParams.set('mode', 'donor');
  else url.searchParams.delete('mode');
  url.searchParams.delete('capture');
  window.location.assign(url);
}

let resetQueued = false;
let debugVisible = false;
let captureControls = null;

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === '1' && !event.repeat) {
    loadMode('controller');
    return;
  }
  if (key === '2' && !event.repeat) {
    loadMode('solver');
    return;
  }
  if (key === '3' && !event.repeat) {
    loadMode('causal');
    return;
  }
  if (key === '4' && !event.repeat) {
    loadMode('momentum');
    return;
  }
  if (key === '5' && !event.repeat) {
    loadMode('donor');
    return;
  }
  if (key === 'c' && !event.repeat && captureControls) {
    captureControls.mark();
    return;
  }
  if (key === 'x' && !event.repeat && captureControls) {
    captureControls.export();
    return;
  }
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

  let character;
  if (EMBODIMENT_MODE === 'solver') {
    character = new SolverOwnedCharacter(b3, playground.world, {
      startPosition: playground.spawn,
      gravity: playground.gravity,
      mass: 80,
    });
  } else if (EMBODIMENT_MODE === 'donor') {
    character = createDonorCharacter(b3, playground.world, {
      startPosition: playground.spawn,
      gravity: playground.gravity,
    });
  } else {
    character = new ControllerOwnedCharacter(b3, playground.world, {
      startPosition: playground.spawn,
      gravity: playground.gravity,
      virtualMass: 80,
      reciprocityMode: EMBODIMENT_MODE === 'causal' || EMBODIMENT_MODE === 'momentum'
        ? 'causal-components'
        : 'normal',
    });
    if (EMBODIMENT_MODE === 'momentum') installVelocityOnlyContactMemoryProbe(character);
  }

  const worldView = createWorldRenderer(b3, playground.world, {
    appearance: playground.appearance,
    hiddenBody: character.body ?? null,
  });
  scene.add(worldView.object3d);

  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);
  const followCamera = new FollowCamera(camera, canvas);
  followCamera.snap(character.position);

  const capture = CAPTURE_MODE
    ? createFreePlayCapture({
      playground,
      character,
      fixedDt: FIXED_DT,
      substeps: SUBSTEPS,
      sourceUrl: window.location.href,
      userAgent: navigator.userAgent,
    })
    : null;

  if (EMBODIMENT_MODE === 'solver') {
    phaseEl.textContent = 'E2 B · SOLVER-OWNED TRANSLATIONAL ROOT';
    debugLabels.external.textContent = 'intent residual';
    debugLabels.impulse.textContent = 'solver Δp proxy';
    debugLabels.transport.textContent = 'manual transport';
  } else if (CAPTURE_MODE) {
    phaseEl.textContent = 'E2.2c-1 A′ · OWNER-MARKED FREE-PLAY CAPTURE';
    debugLabels.external.textContent = 'external';
    debugLabels.impulse.textContent = 'causal contact impulse';
    debugLabels.transport.textContent = 'support transport';
    secondaryControlsEl.insertAdjacentHTML('beforeend', ' · <strong>C</strong> mark slide · <strong>X</strong> export captures');
  } else if (EMBODIMENT_MODE === 'donor') {
    phaseEl.textContent = 'DONOR · STABILIZED A″ CURRENT BEHAVIOR';
    debugLabels.external.textContent = 'non-contact external';
    debugLabels.impulse.textContent = 'causal contact impulse';
    debugLabels.transport.textContent = 'support transport';
  } else if (EMBODIMENT_MODE === 'momentum') {
    phaseEl.textContent = 'E2.2c-2 A″ · VELOCITY-ONLY CONTACT CONSEQUENCE';
    debugLabels.external.textContent = 'non-contact external';
    debugLabels.impulse.textContent = 'causal contact impulse';
    debugLabels.transport.textContent = 'support transport';
  } else if (EMBODIMENT_MODE === 'causal') {
    phaseEl.textContent = 'E2.2 A′ · CAUSAL-COMPONENT RECIPROCITY';
    debugLabels.external.textContent = 'external';
    debugLabels.impulse.textContent = 'causal contact impulse';
    debugLabels.transport.textContent = 'support transport';
  } else {
    phaseEl.textContent = 'E2 A · FOUNDATION 02.1 H-A';
    debugLabels.external.textContent = 'external';
    debugLabels.impulse.textContent = 'contact impulse';
    debugLabels.transport.textContent = 'support transport';
  }

  const counts = playground.stats();
  let baseStatus;
  if (EMBODIMENT_MODE === 'solver') {
    baseStatus = `Ready · B solver-owned · real 80 kg body · rotation locked · ${counts.dynamicCount} playground bodies`;
  } else if (CAPTURE_MODE) {
    baseStatus = `Ready · A′ capture · causal-component reciprocity unchanged · ${counts.dynamicCount} dynamic bodies`;
  } else if (EMBODIMENT_MODE === 'donor') {
    baseStatus = playerInput.touchEnabled
      ? `Ready · donor A″ · touch controls active · ${counts.dynamicCount} dynamic bodies`
      : `Ready · donor A″ · qualified current behavior · ${counts.dynamicCount} dynamic bodies`;
  } else if (EMBODIMENT_MODE === 'momentum') {
    baseStatus = `Ready · A″ probe · contact Δv stays in current velocity only · support carry unchanged · ${counts.dynamicCount} dynamic bodies`;
  } else if (EMBODIMENT_MODE === 'causal') {
    baseStatus = `Ready · A′ controller-owned · causal-component reciprocity · 80 kg virtual interaction mass · ${counts.dynamicCount} playground bodies`;
  } else {
    baseStatus = `Ready · A controller-owned · baseline normal reciprocity · 80 kg virtual interaction mass · ${counts.dynamicCount} playground bodies`;
  }

  function refreshStatus(note = '') {
    if (!capture) {
      statusEl.textContent = baseStatus;
      return;
    }
    const info = capture.summary();
    const captureState = `CAPTURE ON · C mark · X export · marked ${info.marked} (${info.pending} collecting)`;
    statusEl.textContent = `${baseStatus} · ${captureState}${note ? ` · ${note}` : ''}`;
  }

  captureControls = capture ? {
    mark() {
      const id = capture.mark();
      refreshStatus(id ? `marked ${id}` : 'mark ignored before first physics tick');
    },
    export() {
      const eventCount = capture.download();
      refreshStatus(`exported ${eventCount} event${eventCount === 1 ? '' : 's'}`);
    },
  } : null;

  function resetAll() {
    capture?.resetEpoch('manual-reset');
    playground.reset();
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.reset();
    followCamera.snap(character.position);
    resetQueued = false;
    refreshStatus(capture ? 'new capture epoch after reset' : '');
  }

  refreshStatus();

  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;

  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    const basis = followCamera.basis();
    const intent = playerInput.sample(basis);

    character.preStep(dt, intent);
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);
    capture?.record(intent);

    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) {
      capture?.resetEpoch('player-auto-reset');
      character.reset(playground.spawn);
      characterVisual.reset();
      followCamera.snap(character.position);
      refreshStatus(capture ? 'new capture epoch after player reset' : '');
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
    debugValues.external.textContent = `${data.externalSpeed.toFixed(2)} m/s`;
    debugValues.vertical.textContent = `${data.verticalSpeed.toFixed(2)} m/s`;
    debugValues.support.textContent = data.grounded ? data.supportType : 'AIR';
    debugValues.contacts.textContent = `${data.dynamicContacts}`;
    debugValues.impulse.textContent = `${data.contactImpulse.toFixed(1)} N·s`;
    debugValues.transport.textContent = `${(data.supportTransport * 100).toFixed(1)} cm/tick`;
    if (capture) refreshStatus();
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
