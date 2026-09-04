import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createCharacterVisual } from './character-visual.js';
import {
  E16_CAPABILITY_LIMITS,
  chooseGrabCandidate,
  horizontalOrganTargetOffset,
  horizontalPointTargetOffset,
} from './e16-capability-interaction.js';
import { createE16ContactQualifiedGrabCharacter } from './e16-contact-qualified-grab-character.js';
import { createE16Toybox } from './e16-toybox.js';
import { FollowCamera } from './follow-camera.js';
import { PlayerInput } from './player-input.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
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

function createCapabilityVisual(scene) {
  const positions = new Float32Array(6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x26353d, transparent: true, opacity: 0.82 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);

  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe8f3f0, transparent: true, opacity: 0.88 }),
  );
  targetMarker.visible = false;
  scene.add(targetMarker);

  const grabMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xf6d15c, transparent: true, opacity: 0.92 }),
  );
  grabMarker.visible = false;
  scene.add(grabMarker);

  function update(character, held) {
    positions[0] = character.bodyPosition[0];
    positions[1] = character.bodyPosition[1];
    positions[2] = character.bodyPosition[2];
    positions[3] = character.organPosition[0];
    positions[4] = character.organPosition[1];
    positions[5] = character.organPosition[2];
    geometry.attributes.position.needsUpdate = true;

    material.opacity = character.grabJoint ? 1.0 : held ? 0.92 : 0.52;
    targetMarker.visible = held;
    if (held) targetMarker.position.set(...character.organTarget);
    grabMarker.visible = Boolean(character.grabJoint);
    if (character.grabJoint) grabMarker.position.set(...character.grabAnchorWorld);
  }

  return { update };
}

async function main() {
  statusEl.textContent = 'Loading Box3D…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene();
  const playground = createPlayground(b3);
  const character = createE16ContactQualifiedGrabCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
    subsystemFeedbackGain: 1,
    constraintTransportGain: 1,
  });

  playground.appearance.set(bodyKey(character.embodimentBody), {
    color: 0xe5b84e,
    roughness: 0.48,
    metalness: 0.025,
  });
  playground.appearance.set(bodyKey(character.organBody), {
    color: 0x69d29b,
    roughness: 0.38,
    metalness: 0.035,
  });

  const toybox = createE16Toybox(b3, playground.world, playground.appearance);
  const worldView = createWorldRenderer(b3, playground.world, { appearance: playground.appearance });
  scene.add(worldView.object3d);
  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);
  const capabilityVisual = createCapabilityVisual(scene);

  const playerInput = new PlayerInput({ touchRoot, forceTouch: false });
  let capabilityHeld = false;
  let desiredReach = E16_CAPABILITY_LIMITS.engageReach;
  let capabilityDirection = [0, 0, -1];
  let resetQueued = false;
  let debugVisible = false;

  const followCamera = new FollowCamera(camera, canvas, {
    dragButtons: [2],
    allowWheelZoom: () => true,
  });
  followCamera.snap(character.position);

  const pointerNdc = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const targetPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pointerWorld = new THREE.Vector3();

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function directTargetOffset() {
    targetPlane.constant = -character.bodyPosition[1];
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.ray.intersectPlane(targetPlane, pointerWorld);
    if (!hit) {
      return horizontalOrganTargetOffset(capabilityDirection, desiredReach);
    }

    const offset = horizontalPointTargetOffset(
      [pointerWorld.x, pointerWorld.y, pointerWorld.z],
      character.bodyPosition,
      capabilityDirection,
    );
    desiredReach = Math.hypot(offset[0], offset[2]);
    if (desiredReach > 1e-9) {
      capabilityDirection = [offset[0] / desiredReach, 0, offset[2] / desiredReach];
    }
    return offset;
  }

  canvas.style.cursor = 'crosshair';
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    if (event.pointerType === 'touch' || event.button !== 0) return;
    event.preventDefault();
    capabilityHeld = true;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) capabilityHeld = false;
  });
  window.addEventListener('blur', () => { capabilityHeld = false; });

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

  phaseEl.textContent = 'E16 DIRECT · POINTER TASK-SPACE A/B';
  if (controlsEl) {
    controlsEl.innerHTML = '<strong>WASD</strong> move · <strong>Space</strong> jump · <strong>Shift</strong> sprint · <strong>RMB drag</strong> camera · <strong>wheel</strong> zoom';
  }
  if (secondaryEl) {
    secondaryEl.innerHTML = '<strong>move cursor</strong> choose horizontal capability target · <strong>LMB hold</strong> physically reach / earn grab · <strong>release LMB</strong> let go · <strong>R</strong> reset · <strong>H</strong> telemetry';
  }
  debugLabels.external.textContent = 'pointer reach / error';
  debugLabels.impulse.textContent = 'grab reaction';
  debugLabels.transport.textContent = 'constraint transport';

  const baseCounts = playground.stats();
  const toyboxCounts = toybox.stats();
  statusEl.textContent = `E16 direct-control probe · SAME mechanics as E16.2a · pointer = direction + reach · ${baseCounts.dynamicCount + toyboxCounts.dynamicBodies + 2} dynamic bodies`;

  function resetAll() {
    if (character.grabJoint) character.releaseGrab();
    playground.reset();
    toybox.reset();
    character.reset(playground.spawn);
    characterVisual.reset();
    capabilityHeld = false;
    desiredReach = E16_CAPABILITY_LIMITS.engageReach;
    capabilityDirection = [0, 0, -1];
    followCamera.reset();
    followCamera.snap(character.position);
    resetQueued = false;
  }

  function resetCharacterOnly() {
    if (character.grabJoint) character.releaseGrab();
    character.reset(playground.spawn);
    characterVisual.reset();
    capabilityHeld = false;
    desiredReach = E16_CAPABILITY_LIMITS.engageReach;
    capabilityDirection = [0, 0, -1];
    followCamera.snap(character.position);
  }

  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;

  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);
    toybox.preStep(dt);

    const basis = followCamera.basis();
    const intent = playerInput.sample(basis);
    if (!capabilityHeld && character.grabJoint) character.releaseGrab();

    const targetOffset = capabilityHeld
      ? directTargetOffset()
      : horizontalOrganTargetOffset(capabilityDirection, E16_CAPABILITY_LIMITS.restReach);
    character.setOrganTargetOffset(targetOffset);
    character.preStep(dt, intent);
    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);

    if (capabilityHeld && !character.grabJoint && character.grabCandidates.length > 0) {
      const candidate = chooseGrabCandidate(character.grabCandidates, character.organTarget);
      if (candidate) character.grabContactCandidate(candidate);
    }

    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) {
      resetCharacterOnly();
    }
  }

  function updateVisuals(frameDt) {
    worldView.update();
    characterVisual.update(frameDt);
    capabilityVisual.update(character, capabilityHeld);
    followCamera.update(character.position, Boolean(character.currentSupport), frameDt);
  }

  function updateHud(frameDt) {
    hudAccumulator += frameDt;
    if (hudAccumulator < 0.08) return;
    hudAccumulator = 0;
    const data = character.telemetry();
    debugValues.speed.textContent = `${data.speed.toFixed(2)} m/s`;
    debugValues.external.textContent = `${desiredReach.toFixed(2)} m / ${data.organTargetError.toFixed(2)} m`;
    debugValues.vertical.textContent = `${data.verticalSpeed.toFixed(2)} m/s`;
    debugValues.support.textContent = data.grounded ? data.supportType : 'AIR';
    debugValues.contacts.textContent = `${data.organContacts} organ / ${data.grabCandidateCount} grab candidates`;
    debugValues.impulse.textContent = data.grabbed
      ? `GRABBED · ${data.grabConstraintFeedbackImpulse.toFixed(1)} N·s`
      : `${data.subsystemFeedbackImpulse.toFixed(1)} N·s`;
    debugValues.transport.textContent = `${(data.appliedGrabTransportDistance * 1000).toFixed(2)} mm/tick`;
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
  capabilityVisual.update(character, false);
  requestAnimationFrame(frame);
}

main().catch((error) => {
  console.error(error);
  statusEl.textContent = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
});
