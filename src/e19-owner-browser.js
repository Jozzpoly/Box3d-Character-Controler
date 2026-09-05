import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createCharacterVisual } from './character-visual.js';
import { FollowCamera } from './follow-camera.js';
import { PlayerInput } from './player-input.js';
import { createPlayground } from './playground.js';
import { createWorldRenderer } from './world-renderer.js';
import { stepDualGripActuator } from './e19/dual-grip-actuator.js';
import { actuatorGripFromE19Latch, desiredOffsetAtE19Acquisition } from './e19/grip-acquisition.js';
import { createE19GripDonorCharacter } from './e19/grip-donor-character.js';
import { createE19OwnerYard } from './e19/owner-yard.js';
import { castE19GripReach } from './e19/swept-grip-reach.js';
import './style.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const REACH_LENGTH = 2.75;
const REACH_RADIUS = 0.14;
const SHOULDER_Y = 0.30;
const SHOULDER_SIDE = 0.24;
const PULL_SPEED = 0.86;
const MIN_GRIP_LENGTH = 0.68;
const GRIP_RATE = 9.5;
const MAX_FORCE_PER_GRIP = 2400;
const MAX_FORCE_SUM = 4000;

function add3InPlace(target, delta) {
  target[0] += delta[0];
  target[1] += delta[1];
  target[2] += delta[2];
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize3(v, fallback = [0, 0, -1]) {
  const n = norm3(v);
  if (n < 1e-9) return [...fallback];
  return [v[0] / n, v[1] / n, v[2] / n];
}

function worldPoint(b3, body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
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

function createArmVisual(scene, color) {
  const positions = new Float32Array(6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78 });
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  scene.add(line);

  const markerMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const marker = new THREE.Mesh(new THREE.SphereGeometry(REACH_RADIUS * 0.74, 16, 12), markerMaterial);
  marker.visible = false;
  scene.add(marker);

  const shoulderMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.74 });
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 9), shoulderMaterial);
  shoulder.visible = false;
  scene.add(shoulder);

  return {
    line,
    marker,
    shoulder,
    material,
    markerMaterial,
    baseColor: color,
    set(origin, endpoint, visible, latched, saturated) {
      line.visible = visible;
      marker.visible = visible;
      shoulder.visible = visible;
      if (!visible) return;
      positions[0] = origin[0]; positions[1] = origin[1]; positions[2] = origin[2];
      positions[3] = endpoint[0]; positions[4] = endpoint[1]; positions[5] = endpoint[2];
      geometry.attributes.position.needsUpdate = true;
      marker.position.set(...endpoint);
      shoulder.position.set(...origin);
      const displayColor = saturated ? 0xff725e : color;
      material.color.setHex(displayColor);
      markerMaterial.color.setHex(displayColor);
      material.opacity = latched ? 1.0 : 0.50;
      markerMaterial.opacity = latched ? 0.98 : 0.48;
      marker.scale.setScalar(latched ? 1.22 : 0.82);
    },
  };
}

function handState(name, key, side, color) {
  return {
    name,
    key,
    side,
    color,
    held: false,
    grip: null,
    latch: null,
    direction: [0, 0, -1],
    targetLength: 0,
    desiredOffset: [0, 0, 0],
    previewHit: null,
    origin: [0, 0, 0],
    aim: [0, 0, -1],
    lastForce: 0,
    saturated: false,
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

  statusEl.textContent = 'Loading E19 grip runtime…';
  const b3 = await Box3D();
  const { renderer, scene, camera } = setupScene(canvas);
  const playground = createPlayground(b3);
  const ownerYard = createE19OwnerYard(b3, playground.world, playground.appearance);
  const character = createE19GripDonorCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
  });

  const worldView = createWorldRenderer(b3, playground.world, { appearance: playground.appearance });
  scene.add(worldView.object3d);
  const characterVisual = createCharacterVisual(character);
  scene.add(characterVisual.object3d);

  const leftVisual = createArmVisual(scene, 0xf0bd55);
  const rightVisual = createArmVisual(scene, 0x67d3cf);
  const left = handState('LEFT', 'q', -1, 0xf0bd55);
  const right = handState('RIGHT', 'e', 1, 0x67d3cf);
  const hands = [left, right];

  const playerInput = new PlayerInput({ touchRoot, forceTouch: false });
  const followCamera = new FollowCamera(camera, canvas, {
    dragButtons: [2],
    allowWheelZoom: () => true,
  });
  followCamera.snap(character.position);

  let pointerX = 0;
  let pointerY = 0.22;
  let pulling = false;
  let resetQueued = false;
  let debugVisible = false;
  let lastActuatorTelemetry = null;

  function clearHand(hand) {
    hand.grip = null;
    hand.latch = null;
    hand.targetLength = 0;
    hand.desiredOffset = [0, 0, 0];
    hand.previewHit = null;
    hand.lastForce = 0;
    hand.saturated = false;
  }

  function clearHands() {
    for (const hand of hands) {
      hand.held = false;
      clearHand(hand);
    }
    pulling = false;
    lastActuatorTelemetry = null;
    character.setGripConstraintActive(false);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, 1 - ((event.clientY - rect.top) / rect.height) * 2));
  }

  canvas.style.cursor = 'crosshair';
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    if (event.pointerType === 'touch' || event.button !== 0) return;
    event.preventDefault();
    pulling = true;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) pulling = false;
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'q') left.held = true;
    if (key === 'e') right.held = true;
    if (key === 'r' && !event.repeat) resetQueued = true;
    if (key === 'h' && !event.repeat) {
      debugVisible = !debugVisible;
      debugEl.hidden = !debugVisible;
    }
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'q') {
      left.held = false;
      clearHand(left);
    }
    if (key === 'e') {
      right.held = false;
      clearHand(right);
    }
  });
  window.addEventListener('blur', clearHands);

  if (touchResetButton) {
    touchResetButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      resetQueued = true;
    });
  }

  phaseEl.textContent = 'E19 · DUAL-GRIP OWNER PROBE V0';
  if (controlsEl) {
    controlsEl.innerHTML = '<strong>WASD</strong> move · <strong>Space</strong> jump · <strong>Shift</strong> sprint · <strong>RMB drag</strong> camera · <strong>wheel</strong> zoom';
  }
  if (secondaryEl) {
    secondaryEl.innerHTML = '<strong>cursor</strong> aim both reaches · <strong>Q hold</strong> left grip · <strong>E hold</strong> right grip · <strong>LMB hold</strong> retract latched hand(s) · <strong>release Q/E</strong> let go · <strong>R</strong> reset · <strong>H</strong> telemetry';
  }
  debugLabels.external.textContent = 'grip state';
  debugLabels.impulse.textContent = 'grip force';
  debugLabels.transport.textContent = 'target length';
  const baseCounts = playground.stats();
  statusEl.textContent = `E19 owner probe · finite swept reach + reciprocal grips · ${baseCounts.dynamicCount + ownerYard.dynamicBodies} dynamic bodies`;

  function resetAll() {
    clearHands();
    playground.reset();
    ownerYard.reset();
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.reset();
    followCamera.snap(character.position);
    resetQueued = false;
  }

  function resetCharacterOnly() {
    clearHands();
    character.reset(playground.spawn);
    characterVisual.reset();
    followCamera.snap(character.position);
  }

  function aimForHand(hand) {
    const basis = followCamera.basis();
    const rightVector = basis.right;
    hand.origin = [
      character.position[0] + rightVector[0] * SHOULDER_SIDE * hand.side,
      character.position[1] + SHOULDER_Y,
      character.position[2] + rightVector[2] * SHOULDER_SIDE * hand.side,
    ];

    // Third-person camera rays pass through/near the character, so E19 v0 maps cursor
    // motion into a camera-relative reach direction instead. Pointer X fans the arm left/
    // right; pointer Y gives enough elevation to intentionally reach overhead geometry.
    const vertical = pointerY * 1.15 + 0.18;
    const lateral = pointerX * 0.92;
    hand.aim = normalize3([
      basis.forward[0] + rightVector[0] * lateral,
      vertical,
      basis.forward[2] + rightVector[2] * lateral,
    ]);
    return hand.aim;
  }

  function updateReachAndAcquire(hand) {
    const aim = aimForHand(hand);
    if (!hand.held || hand.grip) {
      hand.previewHit = null;
      return;
    }

    const hit = castE19GripReach({
      b3,
      world: playground.world,
      origin: hand.origin,
      translation: scale3(aim, REACH_LENGTH),
      radius: REACH_RADIUS,
    });
    hand.previewHit = hit;
    if (!hit) return;

    hand.latch = hit;
    hand.grip = actuatorGripFromE19Latch(hit);
    const acquiredOffset = desiredOffsetAtE19Acquisition(hit, character.position);
    hand.targetLength = norm3(acquiredOffset);
    hand.direction = normalize3(acquiredOffset, aim);
    hand.desiredOffset = [...acquiredOffset];
    hand.previewHit = null;
  }

  function physicsTick(dt) {
    if (resetQueued) resetAll();
    playground.preStep(dt);

    const basis = followCamera.basis();
    const intent = playerInput.sample(basis);
    character.preStep(dt, intent);

    for (const hand of hands) updateReachAndAcquire(hand);
    const activeHands = hands.filter((hand) => hand.grip);
    character.setGripConstraintActive(activeHands.length > 0);

    lastActuatorTelemetry = null;
    for (const hand of hands) {
      hand.lastForce = 0;
      hand.saturated = false;
    }

    if (activeHands.length > 0) {
      if (pulling) {
        for (const hand of activeHands) {
          hand.targetLength = Math.max(MIN_GRIP_LENGTH, hand.targetLength - PULL_SPEED * dt);
        }
      }
      for (const hand of activeHands) {
        hand.desiredOffset = scale3(hand.direction, hand.targetLength);
      }

      lastActuatorTelemetry = stepDualGripActuator({
        b3,
        playerPosition: character.position,
        playerVelocity: character.velocity,
        playerMass: character.virtualMass,
        grips: activeHands.map((hand) => hand.grip),
        desiredOffsets: activeHands.map((hand) => hand.desiredOffset),
        dt,
        rate: GRIP_RATE,
        maxForcePerGrip: MAX_FORCE_PER_GRIP,
        maxForceSum: MAX_FORCE_SUM,
      });
      add3InPlace(character.velocity, lastActuatorTelemetry.playerDeltaV);
      activeHands.forEach((hand, index) => {
        hand.lastForce = norm3(lastActuatorTelemetry.impulses[index]) / dt;
        hand.saturated = Boolean(lastActuatorTelemetry.perGripSaturated[index]);
      });
    }

    b3.b3World_Step(playground.world, dt, SUBSTEPS);
    character.postStep(dt);

    if (character.position[1] < -10 || Math.hypot(character.position[0], character.position[2]) > 45) {
      resetCharacterOnly();
    }
  }

  function visualEndpoint(hand) {
    if (hand.grip?.body) return worldPoint(b3, hand.grip.body, hand.grip.localAnchor);
    if (hand.grip?.staticWorldAnchor) return [...hand.grip.staticWorldAnchor];
    if (hand.previewHit) return [...hand.previewHit.worldAnchorAtAcquisition];
    return add3(hand.origin, scale3(hand.aim, REACH_LENGTH));
  }

  function updateHandVisual(hand, visual) {
    aimForHand(hand);
    if (!hand.held && !hand.grip) {
      visual.set(hand.origin, hand.origin, false, false, false);
      return;
    }
    visual.set(
      hand.origin,
      visualEndpoint(hand),
      true,
      Boolean(hand.grip),
      hand.saturated,
    );
  }

  function updateVisuals(frameDt) {
    worldView.update();
    characterVisual.update(frameDt);
    updateHandVisual(left, leftVisual);
    updateHandVisual(right, rightVisual);
    followCamera.update(character.position, Boolean(character.currentSupport), frameDt);
  }

  let hudAccumulator = 0;
  function updateHud(frameDt) {
    hudAccumulator += frameDt;
    if (hudAccumulator < 0.08) return;
    hudAccumulator = 0;
    const data = character.telemetry();
    const stateText = (hand) => hand.grip ? 'GRIP' : hand.held ? (hand.previewHit ? 'HIT' : 'REACH') : 'OFF';
    const lengthText = (hand) => hand.grip ? `${hand.targetLength.toFixed(2)}m` : '—';
    debugValues.speed.textContent = `${data.speed.toFixed(2)} m/s`;
    debugValues.external.textContent = `L ${stateText(left)} · R ${stateText(right)}`;
    debugValues.vertical.textContent = `${data.verticalSpeed.toFixed(2)} m/s`;
    debugValues.support.textContent = data.grounded ? data.supportType : 'AIR';
    debugValues.contacts.textContent = `L ${left.previewHit ? left.previewHit.bodyKind : '—'} · R ${right.previewHit ? right.previewHit.bodyKind : '—'}`;
    debugValues.impulse.textContent = `${left.lastForce.toFixed(0)} / ${right.lastForce.toFixed(0)} N`;
    debugValues.transport.textContent = `${lengthText(left)} / ${lengthText(right)}${pulling ? ' · PULL' : ''}`;
    debugValues.constraintClips.textContent = Number.isFinite(data.gripVerticalConstraintClips)
      ? `${data.gripVerticalConstraintClips}/tick`
      : Number.isFinite(data.constraintClips) ? `${data.constraintClips}/tick` : '—';
    debugValues.constraintSolve.textContent = lastActuatorTelemetry
      ? lastActuatorTelemetry.residualNorm.toExponential(2)
      : Number.isFinite(data.constraintSolveError) ? data.constraintSolveError.toExponential(2) : '—';
  }

  let previous = performance.now();
  let accumulator = 0;
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
  const statusEl = document.querySelector('#status');
  if (statusEl) statusEl.textContent = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
});
