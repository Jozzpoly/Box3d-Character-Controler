import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorldRenderer } from './world-renderer.js';
import { createE14ContinuousSim, E14_DEFAULTS } from './e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from './e14-authority-kernel.js';
import { assertE14TelemetrySample } from './e14-telemetry-contract.js';
import {
  e14SpecimenId,
  e14SpecimenToSimConfig,
  isE14SpecimenLockedSearch,
  normalizeE14Specimen,
  readE14SpecimenFromSearch,
  serializeE14Specimen,
  writeE14SpecimenToSearch,
} from './e14-specimen-config.js';
import './style.css';
import './e3-balance.css';
import './e14-lab.css';

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
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
  scene.fog = new THREE.Fog(0xaebfc8, 20, 55);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 120);
  camera.position.set(7.6, 3.2, 5.0);
  camera.up.set(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xeaf4f7, 0x59605c, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2d8, 3.0);
  sun.position.set(6, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 32;
  scene.add(sun);

  const grid = new THREE.GridHelper(36, 72, 0x596468, 0x707b7f);
  grid.position.y = -0.42;
  grid.material.transparent = true;
  grid.material.opacity = 0.36;
  scene.add(grid);

  // Abstract, floor-bound experiment-axis guide. Unlike the former vertical
  // posts, these marks do not resemble collidable world objects.
  const guidePoints = [
    new THREE.Vector3(0, -0.414, -8), new THREE.Vector3(0, -0.414, 8),
  ];
  for (const z of [-6, -3, 0, 3, 6]) {
    const half = z === 0 ? 0.75 : 0.42;
    guidePoints.push(
      new THREE.Vector3(-half, -0.413, z),
      new THREE.Vector3(half, -0.413, z),
    );
  }
  const guideGeometry = new THREE.BufferGeometry().setFromPoints(guidePoints);
  const guideMaterial = new THREE.LineBasicMaterial({ color: 0xe9b44c, transparent: true, opacity: 0.8 });
  scene.add(new THREE.LineSegments(guideGeometry, guideMaterial));

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.55, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 18;
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
  panel.setAttribute('aria-label', 'E14 pinned boundary skill probe controls');
  panel.innerHTML = `
    <div class="lab-title">E14.1C · PINNED BOUNDARY SKILL PROBE</div>
    <div class="lab-sub">DISCOVERY → PIN → LOCK → PLAY · immediate A/D · experimental</div>

    <div class="lab-section lab-discovery-only">
      <div class="lab-label">Supplemental authority policy</div>
      <div class="lab-row lab-policy-row">
        <button data-policy="${E14_AUTHORITY_POLICIES.NATURAL_ONLY}">Natural</button>
        <button data-policy="${E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL}">External</button>
        <button data-policy="${E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL}" class="active">Reciprocal</button>
      </div>
    </div>

    <div class="lab-section lab-row lab-move-row">
      <button id="lab-left">◀ A</button>
      <button id="lab-right">D ▶</button>
      <button id="lab-reset">Reset · R</button>
    </div>

    <div class="lab-section lab-specimen">
      <div class="lab-row lab-instrument-row">
        <button id="lab-pin">PIN</button>
        <button id="lab-restore" disabled>RESTORE PIN</button>
        <button id="lab-lock" disabled>LOCK</button>
        <button id="lab-unlock" hidden>UNLOCK</button>
        <button id="lab-copy" disabled>Copy link</button>
      </div>
      <div class="lab-specimen-state">
        <span id="lab-lock-state">DISCOVERY · unpinned</span>
        <strong id="lab-specimen-id">—</strong>
      </div>
      <code id="lab-specimen-code" class="lab-specimen-code">PIN a configuration to create a canonical specimen.</code>
    </div>

    <div class="lab-section lab-grid lab-discovery-only">
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

    <div class="lab-section lab-row lab-discovery-only lab-diagnostic-actions">
      <button id="lab-pause">Pause</button>
      <button id="lab-shove-player">Shove player</button>
      <button id="lab-shove-support">Shove support</button>
      <button id="lab-step">Single step</button>
    </div>

    <div class="lab-section lab-telemetry" id="lab-telemetry"></div>
    <p class="lab-note" id="lab-envelope">REFERENCE · 31/36 · μ=.95 · 800 kg · 320 Nm · 60 Hz / 4 substeps</p>
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
    if (Array.isArray(obj.material)) obj.material.forEach((material) => material.dispose?.());
    else obj.material?.dispose?.();
  });
}

async function run() {
  const canvas = document.querySelector('#app');
  const phaseEl = document.querySelector('#phase');
  const statusEl = document.querySelector('#status');
  const controlsEl = document.querySelector('#hud .controls');
  const secondaryEl = document.querySelector('#hud .secondary');
  const debugEl = document.querySelector('#debug');
  const touchEl = document.querySelector('#touch-controls');

  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('E14 Lab expected #app canvas');
  if (debugEl) debugEl.hidden = true;
  if (touchEl) touchEl.hidden = true;
  phaseEl.textContent = 'EXPERIMENT · E14.1C PINNED BOUNDARY SKILL PROBE · NOT DONOR';
  controlsEl.innerHTML = '<strong>A / D</strong> immediate intent · <strong>Drag</strong> orbit · <strong>Wheel</strong> zoom';
  secondaryEl.innerHTML = '<strong>R</strong> reset · floor grid/ticks are non-physical world-Z guides';
  statusEl.textContent = 'Loading E14.1C Owner instrument…';

  const { renderer, scene, camera, controls } = setupScene(canvas);
  const panel = createPanel();
  const telemetryEl = panel.querySelector('#lab-telemetry');
  const envelopeEl = panel.querySelector('#lab-envelope');
  const specimenIdEl = panel.querySelector('#lab-specimen-id');
  const specimenCodeEl = panel.querySelector('#lab-specimen-code');
  const lockStateEl = panel.querySelector('#lab-lock-state');
  const pinButton = panel.querySelector('#lab-pin');
  const restoreButton = panel.querySelector('#lab-restore');
  const lockButton = panel.querySelector('#lab-lock');
  const unlockButton = panel.querySelector('#lab-unlock');
  const copyButton = panel.querySelector('#lab-copy');
  const pauseButton = panel.querySelector('#lab-pause');

  let pinnedConfig = null;
  let locked = false;
  let queryNotice = '';
  try {
    const querySpecimen = readE14SpecimenFromSearch(window.location.search);
    if (querySpecimen) {
      pinnedConfig = querySpecimen;
      locked = isE14SpecimenLockedSearch(window.location.search);
      queryNotice = `Loaded pinned specimen ${e14SpecimenId(querySpecimen)} from URL`;
    }
  } catch (error) {
    queryNotice = `Rejected invalid pinned specimen URL: ${error?.message ?? error}`;
  }

  let config = pinnedConfig
    ? e14SpecimenToSimConfig(pinnedConfig)
    : {
        ...E14_DEFAULTS,
        supportHalf: [...E14_DEFAULTS.supportHalf],
        policy: E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL,
        preparationFrames: 0,
      };
  let sim = null;
  let worldView = null;
  let rebuilding = false;
  let held = 0;
  let paused = false;
  let resetSerial = 0;
  let accumulator = 0;

  function editableSpecimen() {
    return normalizeE14Specimen({
      supportMass: config.supportMass,
      friction: config.friction,
      acceleration: config.acceleration,
      braking: config.braking,
      maxBalanceTorque: config.maxBalanceTorque,
      policy: config.policy,
    });
  }

  function syncPolicyButtons() {
    for (const button of panel.querySelectorAll('[data-policy]')) {
      button.classList.toggle('active', button.dataset.policy === config.policy);
      button.disabled = locked;
    }
  }

  function syncSliders() {
    for (const [id, keyName, outId] of [
      ['mass', 'supportMass', 'mass-out'],
      ['friction', 'friction', 'friction-out'],
      ['accel', 'acceleration', 'accel-out'],
      ['brake', 'braking', 'brake-out'],
      ['torque', 'maxBalanceTorque', 'torque-out'],
    ]) {
      const inputEl = panel.querySelector(`#${id}`);
      inputEl.value = String(config[keyName]);
      inputEl.disabled = locked;
      panel.querySelector(`#${outId}`).textContent = config[keyName];
    }
  }

  function syncPauseButton() {
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
  }

  function syncSpecimenUi() {
    panel.classList.toggle('locked', locked);
    pinButton.hidden = locked;
    lockButton.hidden = locked;
    unlockButton.hidden = !locked;
    pinButton.disabled = locked;
    restoreButton.disabled = !pinnedConfig;
    lockButton.disabled = !pinnedConfig;
    copyButton.disabled = !pinnedConfig;
    if (pinnedConfig) {
      const id = e14SpecimenId(pinnedConfig);
      specimenIdEl.textContent = id;
      specimenCodeEl.textContent = serializeE14Specimen(pinnedConfig);
      lockStateEl.textContent = locked ? `LOCKED · ${pinnedConfig.policy}` : `PINNED · discovery open · ${pinnedConfig.policy}`;
    } else {
      specimenIdEl.textContent = '—';
      specimenCodeEl.textContent = 'PIN a configuration to create a canonical specimen.';
      lockStateEl.textContent = 'DISCOVERY · unpinned';
    }
    syncPolicyButtons();
    syncSliders();
  }

  function updateSpecimenUrl() {
    if (!pinnedConfig) return;
    const params = writeE14SpecimenToSearch(window.location.search, pinnedConfig, { locked });
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', next);
  }

  function renderTelemetry(sample) {
    if (!sample) return;
    assertE14TelemetrySample(sample, 'E14.1C browser telemetry');
    telemetryEl.innerHTML = `
      <div><span>state</span><strong>${sample.fallen ? 'FALL OBSERVED' : sample.recovered ? 'RECOVERED' : sample.reactiveSupport ? 'REACTIVE' : 'NO SUPPORT'}</strong></div>
      <div><span>actual v rel</span><strong>${fmt(sample.relativeVelocity)} m/s</strong></div>
      <div><span>body lean</span><strong>${fmt(THREE.MathUtils.radToDeg(sample.signedLean), 1)}°</strong></div>
      <div><span>support v world Z</span><strong>${fmt(sample.supportVelocity)} m/s</strong></div>
      <div><span>q entitlement</span><strong>${fmt(sample.entitlement)}</strong></div>
      <div class="lab-detail-only"><span>target v rel</span><strong>${fmt(sample.targetRelativeVelocity)} m/s</strong></div>
      <div class="lab-detail-only"><span>player v world Z</span><strong>${fmt(sample.playerVelocity)} m/s</strong></div>
      <div class="lab-detail-only"><span>natural Δv rel</span><strong>${fmt(sample.physicalRelativeDeltaV, 4)}</strong></div>
      <div class="lab-detail-only"><span>supplemental Δv rel</span><strong>${fmt(sample.grantedRelativeDeltaV, 4)}</strong></div>
      <div class="lab-detail-only"><span>player authority J</span><strong>${fmt(sample.playerImpulse, 2)} N·s</strong></div>
      <div class="lab-detail-only"><span>support reaction J</span><strong>${fmt(sample.supportImpulse, 2)} N·s</strong></div>
      <div class="lab-detail-only"><span>system pZ</span><strong>${fmt(sample.combinedMomentum, 2)} N·s</strong></div>
      <div class="lab-detail-only"><span>target lean</span><strong>${fmt(THREE.MathUtils.radToDeg(sample.targetLean), 1)}°</strong></div>
      <div class="lab-detail-only"><span>balance torque</span><strong>${fmt(sample.balanceTorque, 1)} Nm</strong></div>
    `;

    const outsideReference = (
      config.supportMass !== E14_DEFAULTS.supportMass ||
      config.friction !== E14_DEFAULTS.friction ||
      config.acceleration !== E14_DEFAULTS.acceleration ||
      config.braking !== E14_DEFAULTS.braking ||
      config.maxBalanceTorque !== E14_DEFAULTS.maxBalanceTorque
    );
    if (locked && pinnedConfig) {
      envelopeEl.textContent = `LOCKED ${e14SpecimenId(pinnedConfig)} · configuration + policy frozen · A/D + clean pinned reset`;
    } else {
      envelopeEl.textContent = outsideReference
        ? 'EXPLORATORY / OUTSIDE REFERENCE VALUES · useful for discovery, not qualified evidence'
        : 'REFERENCE VALUES · mechanism experimental · no Donor promotion';
    }
    envelopeEl.classList.toggle('wild', outsideReference && !locked);
  }

  function clearHeldInput() {
    held = 0;
    sim?.setInput(0);
  }

  async function rebuild(reason, nextConfig, { clean = false } = {}) {
    if (rebuilding) return;
    rebuilding = true;
    statusEl.textContent = `${reason}…`;
    const oldSim = sim;
    const oldWorldView = worldView;
    if (clean) {
      clearHeldInput();
      paused = false;
      accumulator = 0;
      syncPauseButton();
    }
    try {
      const nextSim = await createE14ContinuousSim(nextConfig);
      nextSim.setInput(clean ? 0 : held);
      nextSim.setPaused(clean ? false : paused);

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
      const prefix = clean ? 'Clean restore' : 'Play rebuild';
      statusEl.textContent = `${prefix} ready · ${config.policy} · specimen instance ${resetSerial}`;
      renderTelemetry(sim.snapshot());
    } catch (error) {
      statusEl.textContent = `E14 Lab rebuild failed: ${error?.message ?? error}`;
      console.error(error);
    } finally {
      rebuilding = false;
    }
  }

  async function rebuildPlay(reason = 'play reset') {
    await rebuild(reason, config, { clean: false });
  }

  async function restorePinned(reason = 'restore pin') {
    if (!pinnedConfig) return;
    config = e14SpecimenToSimConfig(pinnedConfig);
    syncSpecimenUi();
    await rebuild(reason, config, { clean: true });
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
    if (key === 'r') {
      if (locked && pinnedConfig) restorePinned('clean pinned reset');
      else rebuildPlay('play reset');
    }
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if ((key === 'a' || event.key === 'ArrowLeft') && held === -1) setHeld(0);
    if ((key === 'd' || event.key === 'ArrowRight') && held === 1) setHeld(0);
  });
  window.addEventListener('blur', clearHeldInput);

  panel.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.policy) {
      if (locked) return;
      config.policy = button.dataset.policy;
      sim?.setPolicy(config.policy);
      syncPolicyButtons();
      statusEl.textContent = `Policy → ${config.policy} · discovery physical state preserved`;
      return;
    }
    if (button.id === 'lab-reset') {
      if (locked && pinnedConfig) await restorePinned('clean pinned reset');
      else await rebuildPlay('play reset');
    }
    if (button.id === 'lab-pin') {
      if (locked) return;
      pinnedConfig = editableSpecimen();
      locked = false;
      updateSpecimenUrl();
      syncSpecimenUi();
      statusEl.textContent = `Pinned ${e14SpecimenId(pinnedConfig)} · configuration contract saved in URL`;
    }
    if (button.id === 'lab-restore') await restorePinned('clean PIN restore');
    if (button.id === 'lab-lock') {
      if (!pinnedConfig) return;
      locked = true;
      updateSpecimenUrl();
      syncSpecimenUi();
      await restorePinned('LOCK → clean PIN restore');
      statusEl.textContent = `LOCKED ${e14SpecimenId(pinnedConfig)} · play the organism, not the sliders`;
    }
    if (button.id === 'lab-unlock') {
      locked = false;
      updateSpecimenUrl();
      syncSpecimenUi();
      statusEl.textContent = `Unlocked ${e14SpecimenId(pinnedConfig)} · discovery controls restored`;
    }
    if (button.id === 'lab-copy' && pinnedConfig) {
      updateSpecimenUrl();
      try {
        await navigator.clipboard.writeText(window.location.href);
        statusEl.textContent = `Copied ${e14SpecimenId(pinnedConfig)} specimen URL`;
      } catch {
        window.prompt('Copy pinned specimen URL', window.location.href);
      }
    }
    if (locked) return;
    if (button.id === 'lab-pause') {
      paused = !paused;
      sim?.setPaused(paused);
      syncPauseButton();
    }
    if (button.id === 'lab-step') {
      sim?.step(true);
      renderTelemetry(sim?.snapshot());
    }
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
      if (locked) return;
      const value = Number(inputEl.value);
      config[keyName] = value;
      panel.querySelector(`#${outId}`).textContent = value;
    });
    inputEl.addEventListener('change', async () => {
      if (locked) return;
      await rebuildPlay(`${keyName}=${config[keyName]}`);
    });
  }

  syncSpecimenUi();
  syncPauseButton();
  await rebuild(pinnedConfig ? 'initial pinned restore' : 'initializing discovery', config, { clean: Boolean(pinnedConfig) });
  if (queryNotice) statusEl.textContent = queryNotice;

  let previous = performance.now();
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
        try {
          renderTelemetry(sim.snapshot());
        } catch (error) {
          statusEl.textContent = `Telemetry contract failure: ${error?.message ?? error}`;
          console.error(error);
          paused = true;
          sim.setPaused(true);
          syncPauseButton();
        }
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
