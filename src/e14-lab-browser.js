import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorldRenderer } from './world-renderer.js';
import { createE14ContinuousSim, E14_DEFAULTS } from './e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from './e14-authority-kernel.js';
import './style.css';
import './e3-balance.css';
import './e14-lab.css';

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
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
  scene.fog = new THREE.Fog(0xaebfc8, 18, 48);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
  camera.position.set(6.2, 3.0, 7.3);
  camera.up.set(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xeaf4f7, 0x59605c, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2d8, 3.0);
  sun.position.set(6, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  scene.add(sun);

  const grid = new THREE.GridHelper(30, 60, 0x596468, 0x707b7f);
  grid.position.y = -0.42;
  grid.material.transparent = true;
  grid.material.opacity = 0.34;
  scene.add(grid);

  for (const x of [-4, 0, 4]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 1.8, 0.09),
      new THREE.MeshStandardMaterial({ color: x === 0 ? 0xe9b44c : 0x7c8589, roughness: 0.8 }),
    );
    post.position.set(x, 0.48, -3.2);
    post.castShadow = true;
    scene.add(post);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.55, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 16;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  return { renderer, scene, camera, controls };
}

function createPanel() {
  const panel = document.createElement('section');
  panel.id = 'e14lab-panel';
  panel.setAttribute('aria-label', 'E14 contextual authority laboratory controls');
  panel.innerHTML = `
    <div class="lab-title">E14.1B · CONTEXTUAL AUTHORITY LAB</div>
    <div class="lab-sub">continuous support-relative agency · thin Owner surface</div>

    <div class="lab-section">
      <div class="lab-label">Authority policy · diagnostic endpoints</div>
      <div class="lab-row lab-policy-row">
        <button data-policy="${E14_AUTHORITY_POLICIES.NATURAL_ONLY}">Natural</button>
        <button data-policy="${E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL}">External</button>
        <button data-policy="${E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL}" class="active">Reciprocal</button>
      </div>
      <div class="lab-row lab-move-row">
        <button id="lab-left">◀ A</button>
        <button id="lab-right">D ▶</button>
        <button id="lab-reset">Reset · R</button>
        <button id="lab-pause">Pause</button>
      </div>
    </div>

    <div class="lab-section lab-grid">
      <label>Support mass <output id="mass-out">${E14_DEFAULTS.supportMass}</output> kg
        <input id="mass" type="range" min="20" max="2000" step="20" value="${E14_DEFAULTS.supportMass}">
      </label>
      <label>Friction μ <output id="friction-out">${E14_DEFAULTS.friction}</output>
        <input id="friction" type="range" min="0" max="1.5" step="0.05" value="${E14_DEFAULTS.friction}">
      </label>
      <label>Acceleration <output id="accel-out">${E14_DEFAULTS.acceleration}</output> m/s²
        <input id="accel" type="range" min="2" max="70" step="1" value="${E14_DEFAULTS.acceleration}">
      </label>
      <label>Braking <output id="brake-out">${E14_DEFAULTS.braking}</output> m/s²
        <input id="brake" type="range" min="2" max="80" step="1" value="${E14_DEFAULTS.braking}">
      </label>
      <label>Balance torque <output id="torque-out">${E14_DEFAULTS.maxBalanceTorque}</output> Nm
        <input id="torque" type="range" min="0" max="1000" step="10" value="${E14_DEFAULTS.maxBalanceTorque}">
      </label>
    </div>

    <div class="lab-section lab-row">
      <button id="lab-shove-player">Shove player</button>
      <button id="lab-shove-support">Shove support</button>
      <button id="lab-step">Single step</button>
    </div>

    <div class="lab-section lab-telemetry" id="lab-telemetry"></div>
    <p class="lab-note" id="lab-envelope">REFERENCE VALUES · 31/36 · μ=.95 · 800 kg · 320 Nm · 60 Hz / 4 substeps</p>
  `;
  document.body.appendChild(panel);
  return panel;
}

function disposeWorldView(scene, worldView) {
  if (!worldView) return;
  scene.remove(worldView.object3d);
  worldView.object3d.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
    else obj.material?.dispose?.();
  });
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
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
  phaseEl.textContent = 'EXPERIMENT · E14 CONTEXTUAL AUTHORITY LAB · NOT DONOR';
  controlsEl.innerHTML = '<strong>A / D</strong> continuous intent · <strong>Drag</strong> orbit · <strong>Wheel</strong> zoom';
  secondaryEl.innerHTML = '<strong>R</strong> reset · change sliders to rebuild specimen';
  statusEl.textContent = 'Loading E14.1B thin Owner Lab…';

  const { renderer, scene, camera, controls } = setupScene(canvas);
  const panel = createPanel();
  const telemetryEl = panel.querySelector('#lab-telemetry');
  const envelopeEl = panel.querySelector('#lab-envelope');

  let config = {
    ...E14_DEFAULTS,
    supportHalf: [...E14_DEFAULTS.supportHalf],
    policy: E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL,
  };
  let sim = null;
  let worldView = null;
  let rebuilding = false;
  let held = 0;
  let paused = false;
  let resetSerial = 0;

  function syncPolicyButtons() {
    for (const button of panel.querySelectorAll('[data-policy]')) {
      button.classList.toggle('active', button.dataset.policy === config.policy);
    }
  }

  function renderTelemetry(s) {
    if (!s) return;
    telemetryEl.innerHTML = `
      <div><span>state</span><strong>${s.fallen ? 'FALL OBSERVED' : s.recovered ? 'RECOVERED' : s.reactiveSupport ? 'REACTIVE' : 'NO SUPPORT'}</strong></div>
      <div><span>target v rel</span><strong>${fmt(s.targetRelativeVelocity)} m/s</strong></div>
      <div><span>actual v rel</span><strong>${fmt(s.relativeVelocity)} m/s</strong></div>
      <div><span>player v world</span><strong>${fmt(s.playerVelocity)} m/s</strong></div>
      <div><span>support v world</span><strong>${fmt(s.supportVelocity)} m/s</strong></div>
      <div><span>q entitlement</span><strong>${fmt(s.entitlement)}</strong></div>
      <div><span>natural Δv rel</span><strong>${fmt(s.physicalRelativeDeltaV, 4)}</strong></div>
      <div><span>supplemental Δv rel</span><strong>${fmt(s.grantedRelativeDeltaV, 4)}</strong></div>
      <div><span>player authority J</span><strong>${fmt(s.playerImpulse, 2)} N·s</strong></div>
      <div><span>support reaction J</span><strong>${fmt(s.supportImpulse, 2)} N·s</strong></div>
      <div><span>system pX</span><strong>${fmt(s.combinedMomentum, 2)} N·s</strong></div>
      <div><span>target lean</span><strong>${fmt(THREE.MathUtils.radToDeg(s.targetLean), 1)}°</strong></div>
      <div><span>body lean</span><strong>${fmt(THREE.MathUtils.radToDeg(s.signedLeanX), 1)}°</strong></div>
      <div><span>balance torque</span><strong>${fmt(s.balanceTorque, 1)} Nm</strong></div>
    `;

    const outside = (
      config.supportMass !== E14_DEFAULTS.supportMass ||
      config.friction !== E14_DEFAULTS.friction ||
      config.acceleration !== E14_DEFAULTS.acceleration ||
      config.braking !== E14_DEFAULTS.braking ||
      config.maxBalanceTorque !== E14_DEFAULTS.maxBalanceTorque
    );
    envelopeEl.textContent = outside
      ? 'EXPLORATORY / OUTSIDE REFERENCE VALUES · allowed, but do not treat as qualified evidence'
      : 'REFERENCE VALUES · mechanism experimental, not Donor promotion';
    envelopeEl.classList.toggle('wild', outside);
  }

  async function rebuild(reason = 'reset') {
    if (rebuilding) return;
    rebuilding = true;
    statusEl.textContent = `${reason}…`;
    const oldSim = sim;
    const oldWorldView = worldView;
    try {
      const nextSim = await createE14ContinuousSim(config);
      nextSim.setInput(held);
      nextSim.setPaused(paused);

      const appearance = new Map();
      appearance.set(bodyKey(nextSim.support), { color: 0x5c91bd, roughness: 0.68 });
      appearance.set(bodyKey(nextSim.organism.foot), { color: 0xe1b85d, roughness: 0.65 });
      appearance.set(bodyKey(nextSim.organism.torso), { color: 0xd9544d, roughness: 0.56 });
      const nextWorldView = createWorldRenderer(nextSim.b3, nextSim.world, { appearance });
      scene.add(nextWorldView.object3d);
      nextWorldView.update();

      sim = nextSim;
      worldView = nextWorldView;
      resetSerial += 1;
      disposeWorldView(scene, oldWorldView);
      oldSim?.destroy();
      statusEl.textContent = `Ready · ${config.policy} · specimen ${resetSerial} · hold A/D and experiment`;
    } catch (error) {
      statusEl.textContent = `E14 Lab rebuild failed: ${error?.message ?? error}`;
      console.error(error);
    } finally {
      rebuilding = false;
    }
  }

  function setHeld(value) {
    held = value;
    sim?.setInput(value);
  }

  function bindHold(selector, value) {
    const element = panel.querySelector(selector);
    const down = (event) => {
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      setHeld(value);
    };
    const up = (event) => {
      event.preventDefault();
      if (held === value) setHeld(0);
      if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('lostpointercapture', () => {
      if (held === value) setHeld(0);
    });
  }
  bindHold('#lab-left', -1);
  bindHold('#lab-right', 1);

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'a' || event.key === 'ArrowLeft') setHeld(-1);
    if (key === 'd' || event.key === 'ArrowRight') setHeld(1);
    if (key === 'r') rebuild('reset');
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if ((key === 'a' || event.key === 'ArrowLeft') && held === -1) setHeld(0);
    if ((key === 'd' || event.key === 'ArrowRight') && held === 1) setHeld(0);
  });

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.policy) {
      config.policy = button.dataset.policy;
      sim?.setPolicy(config.policy);
      syncPolicyButtons();
      statusEl.textContent = `Policy → ${config.policy} · state preserved`; 
      return;
    }
    if (button.id === 'lab-reset') rebuild('reset');
    if (button.id === 'lab-pause') {
      paused = !paused;
      sim?.setPaused(paused);
      button.textContent = paused ? 'Resume' : 'Pause';
    }
    if (button.id === 'lab-step') sim?.step(true);
    if (button.id === 'lab-shove-player') sim?.shovePlayer(55);
    if (button.id === 'lab-shove-support') sim?.shoveSupport(260);
  });

  for (const [id, keyName, outId] of [
    ['mass', 'supportMass', 'mass-out'],
    ['friction', 'friction', 'friction-out'],
    ['accel', 'acceleration', 'accel-out'],
    ['brake', 'braking', 'brake-out'],
    ['torque', 'maxBalanceTorque', 'torque-out'],
  ]) {
    const inputEl = panel.querySelector(`#${id}`);
    inputEl.addEventListener('input', () => {
      const value = Number(inputEl.value);
      config[keyName] = value;
      panel.querySelector(`#${outId}`).textContent = value;
    });
    inputEl.addEventListener('change', () => rebuild(`${keyName}=${config[keyName]}`));
  }

  syncPolicyButtons();
  await rebuild('initializing');

  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const frameDt = Math.min((now - previous) / 1000, 0.1);
    previous = now;

    if (sim && !rebuilding) {
      accumulator += frameDt;
      while (accumulator >= sim.config.dt) {
        sim.step();
        accumulator -= sim.config.dt;
      }
      worldView?.update();
      hudAccumulator += frameDt;
      if (hudAccumulator >= 0.05) {
        hudAccumulator = 0;
        renderTelemetry(sim.snapshot());
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

run().catch((error) => {
  console.error(error);
  const statusEl = document.querySelector('#status');
  if (statusEl) statusEl.textContent = `E14 Lab error: ${error?.message ?? error}`;
});
