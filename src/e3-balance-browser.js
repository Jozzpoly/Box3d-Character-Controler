import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BalanceOrganism3D } from './e3-balance-organism-3d.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';
import './e3-balance.css';

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const IDENTITY_QUAT = [0, 0, 0, 1];
const RAM_MASS = 35;

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

function createStaticGround(b3, world) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [0, -0.10, 0];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.95;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, 5, 0.10, 5);
  return body;
}

function createRam(b3, world) {
  const half = [0.22, 0.22, 0.22];
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [0, -10, 0];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0.02;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = RAM_MASS / (8 * half[0] * half[1] * half[2]);
  shapeDef.baseMaterial.friction = 0.45;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
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
  scene.fog = new THREE.Fog(0xaebfc8, 14, 34);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
  camera.position.set(3.6, 2.3, 4.5);
  camera.up.set(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xeaf4f7, 0x59605c, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2d8, 3.0);
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 24;
  scene.add(sun);

  const grid = new THREE.GridHelper(10, 20, 0x636d70, 0x737d80);
  grid.position.y = 0.006;
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  scene.add(grid);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.65, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  return { renderer, scene, camera, controls };
}

function createPanel() {
  const panel = document.createElement('section');
  panel.id = 'e3-panel';
  panel.setAttribute('aria-label', 'E3 balance experiment controls');
  panel.innerHTML = `
    <div class="e3-title">E3.1c · OWNER BALANCE PLAYGROUND</div>
    <div class="e3-row">
      <div class="e3-label">Balance authority</div>
      <div class="e3-buttons" data-group="authority">
        <button class="e3-button" data-torque="0">Passive · 0</button>
        <button class="e3-button" data-torque="160">Weak · 160</button>
        <button class="e3-button is-active" data-torque="320">Finite · 320</button>
        <button class="e3-button" data-torque="480">High · 480</button>
      </div>
    </div>
    <div class="e3-row">
      <div class="e3-label">35 kg ram speed</div>
      <div class="e3-buttons" data-group="speed">
        <button class="e3-button" data-speed="1.5">1.5 m/s</button>
        <button class="e3-button" data-speed="2.5">2.5</button>
        <button class="e3-button is-active" data-speed="3">3.0</button>
        <button class="e3-button" data-speed="4">4.0</button>
        <button class="e3-button" data-speed="5">5.0</button>
      </div>
    </div>
    <div class="e3-row">
      <div class="e3-label">Launch ram</div>
      <div class="e3-direction-grid">
        <span></span><button class="e3-button" data-dir="forward">Forward</button><span></span>
        <button class="e3-button" data-dir="left">Left</button><button class="e3-button" data-dir="diagonal">Diagonal</button><button class="e3-button" data-dir="right">Right</button>
        <span></span><button class="e3-button" data-dir="back">Back</button><span></span>
      </div>
    </div>
    <div class="e3-row e3-buttons">
      <button class="e3-button e3-danger" data-action="reset">Reset organism</button>
    </div>
    <div class="e3-telemetry">
      <div><span>state</span><strong id="e3-state">—</strong></div>
      <div><span>tilt</span><strong id="e3-tilt">—</strong></div>
      <div><span>angular speed</span><strong id="e3-omega">—</strong></div>
      <div><span>torque use</span><strong id="e3-torque">—</strong></div>
      <div><span>foot travel</span><strong id="e3-foot">—</strong></div>
    </div>
    <div class="e3-note">No locomotion by design. The visible foot, torso and ram are direct Box3D rigid-body transforms. Changing authority resets the organism.</div>
  `;
  document.body.appendChild(panel);
  return panel;
}

async function run() {
  const canvas = document.querySelector('#app');
  const phaseEl = document.querySelector('#phase');
  const statusEl = document.querySelector('#status');
  const controlsEl = document.querySelector('#hud .controls');
  const secondaryEl = document.querySelector('#hud .secondary');
  const debugEl = document.querySelector('#debug');
  const touchEl = document.querySelector('#touch-controls');
  debugEl.hidden = true;
  touchEl.hidden = true;
  phaseEl.textContent = 'EXPERIMENT · E3 ROTATIONAL EMBODIMENT · NOT DONOR';
  controlsEl.innerHTML = '<strong>Drag</strong> orbit · <strong>Wheel</strong> zoom';
  secondaryEl.innerHTML = '<strong>R</strong> reset · panel controls authority and physical ram';
  statusEl.textContent = 'Loading E3 balance organism…';

  const b3 = await Box3D();
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  const ground = createStaticGround(b3, world);
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: 320 });
  const ram = createRam(b3, world);

  const appearance = new Map();
  appearance.set(bodyKey(ground), { color: 0x868e90, roughness: 0.94 });
  appearance.set(bodyKey(organism.foot), { color: 0xe1b85d, roughness: 0.65 });
  appearance.set(bodyKey(organism.torso), { color: 0xd9544d, roughness: 0.56 });
  appearance.set(bodyKey(ram), { color: 0x5c91bd, roughness: 0.55 });

  const { renderer, scene, camera, controls } = setupScene(canvas);
  const worldView = createWorldRenderer(b3, world, { appearance });
  scene.add(worldView.object3d);
  const panel = createPanel();

  let selectedTorque = 320;
  let selectedSpeed = 3.0;
  let launchFootStart = [...organism.telemetry().footCom];

  const stateEl = panel.querySelector('#e3-state');
  const tiltEl = panel.querySelector('#e3-tilt');
  const omegaEl = panel.querySelector('#e3-omega');
  const torqueEl = panel.querySelector('#e3-torque');
  const footEl = panel.querySelector('#e3-foot');

  function parkRam() {
    b3.b3Body_SetTransform(ram, [0, -10, 0], IDENTITY_QUAT);
    b3.b3Body_SetLinearVelocity(ram, [0, 0, 0]);
    b3.b3Body_SetAngularVelocity(ram, [0, 0, 0]);
  }

  function resetOrganism() {
    organism.reset();
    organism.maxTorque = selectedTorque;
    organism.mode = selectedTorque === 0 ? 'passive' : 'finite';
    parkRam();
    launchFootStart = [...organism.telemetry().footCom];
    statusEl.textContent = `Ready · E3 experimental · authority ${selectedTorque} Nm · ram ${selectedSpeed.toFixed(1)} m/s`;
  }

  const directions = {
    forward: [0, 0, 1],
    back: [0, 0, -1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
    diagonal: [Math.SQRT1_2, 0, Math.SQRT1_2],
  };

  function launchRam(name) {
    const direction = directions[name];
    const telemetry = organism.telemetry();
    const distance = 0.78;
    const position = [
      telemetry.torsoCom[0] - direction[0] * distance,
      telemetry.torsoCom[1] + 0.25,
      telemetry.torsoCom[2] - direction[2] * distance,
    ];
    b3.b3Body_SetTransform(ram, position, IDENTITY_QUAT);
    b3.b3Body_SetLinearVelocity(ram, [direction[0] * selectedSpeed, 0, direction[2] * selectedSpeed]);
    b3.b3Body_SetAngularVelocity(ram, [0, 0, 0]);
    launchFootStart = [...telemetry.footCom];
    statusEl.textContent = `Ram launched · ${name} · ${RAM_MASS} kg @ ${selectedSpeed.toFixed(1)} m/s · authority ${selectedTorque} Nm`;
  }

  function refreshSelection(group, attribute, value) {
    for (const button of panel.querySelectorAll(`[data-group="${group}"] .e3-button`)) {
      button.classList.toggle('is-active', Number(button.dataset[attribute]) === value);
    }
  }

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.torque !== undefined) {
      selectedTorque = Number(button.dataset.torque);
      refreshSelection('authority', 'torque', selectedTorque);
      resetOrganism();
      return;
    }
    if (button.dataset.speed !== undefined) {
      selectedSpeed = Number(button.dataset.speed);
      refreshSelection('speed', 'speed', selectedSpeed);
      statusEl.textContent = `Ready · E3 experimental · authority ${selectedTorque} Nm · ram ${selectedSpeed.toFixed(1)} m/s`;
      return;
    }
    if (button.dataset.dir) {
      launchRam(button.dataset.dir);
      return;
    }
    if (button.dataset.action === 'reset') resetOrganism();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r' && !event.repeat) resetOrganism();
    const torqueKeys = { '1': 0, '2': 160, '3': 320, '4': 480 };
    if (torqueKeys[event.key] !== undefined && !event.repeat) {
      selectedTorque = torqueKeys[event.key];
      refreshSelection('authority', 'torque', selectedTorque);
      resetOrganism();
    }
  });

  resetOrganism();
  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;

  function frame(now) {
    const frameDt = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    accumulator += frameDt;
    while (accumulator >= FIXED_DT) {
      organism.preStep(FIXED_DT);
      b3.b3World_Step(world, FIXED_DT, SUBSTEPS);
      organism.postStep();
      accumulator -= FIXED_DT;
    }

    worldView.update();
    controls.update();
    hudAccumulator += frameDt;
    if (hudAccumulator >= 0.06) {
      hudAccumulator = 0;
      const t = organism.telemetry();
      const footTravel = Math.hypot(t.footCom[0] - launchFootStart[0], t.footCom[2] - launchFootStart[2]);
      let state = 'RECOVERING';
      let stateClass = 'e3-state-recovering';
      if (t.fallObserved) {
        state = 'FALL OBSERVED';
        stateClass = 'e3-state-fallen';
      } else if (t.recovered) {
        state = 'BALANCED';
        stateClass = 'e3-state-balanced';
      }
      stateEl.textContent = state;
      stateEl.className = stateClass;
      tiltEl.textContent = `${(t.torsoTilt * 180 / Math.PI).toFixed(1)}°`;
      omegaEl.textContent = `${t.horizontalAngularSpeed.toFixed(2)} rad/s`;
      torqueEl.textContent = selectedTorque > 0 ? `${Math.round(t.torqueUtilization * 100)}% of ${selectedTorque} Nm` : '0 Nm';
      footEl.textContent = `${(footTravel * 100).toFixed(1)} cm`;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  worldView.update();
  requestAnimationFrame(frame);
}

run().catch((error) => {
  console.error(error);
  const statusEl = document.querySelector('#status');
  if (statusEl) statusEl.textContent = `E3 FAILED: ${error instanceof Error ? error.message : String(error)}`;
});
