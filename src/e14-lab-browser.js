import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createE14ContinuousSim, E14_DEFAULTS } from './e14-continuous-sim.js';
import { E14_AUTHORITY_POLICIES } from './e14-authority-kernel.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="lab-shell">
    <div class="lab-stage" id="lab-stage"></div>
    <aside class="lab-panel">
      <h1>E14 Contextual Authority Lab</h1>
      <p class="lab-sub">continuous support-relative agency · research surface</p>

      <div class="lab-section">
        <div class="lab-row lab-policy-row">
          <button data-policy="${E14_AUTHORITY_POLICIES.NATURAL_ONLY}">Natural</button>
          <button data-policy="${E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL}">External</button>
          <button data-policy="${E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL}" class="active">Reciprocal</button>
        </div>
        <div class="lab-row">
          <button id="left">◀ A</button>
          <button id="right">D ▶</button>
          <button id="reset">Reset</button>
          <button id="pause">Pause</button>
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
        <button id="shove-player">Shove player</button>
        <button id="shove-support">Shove support</button>
        <button id="step">Single step</button>
      </div>

      <div class="lab-section lab-telemetry" id="telemetry"></div>
      <p class="lab-note" id="envelope">QUALIFIED REFERENCE: 31/36 · μ=.95 · 800 kg · 320 Nm · 60 Hz / 4 substeps</p>
    </aside>
  </div>
`;

const stage = document.querySelector('#lab-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111820);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
camera.position.set(7.5, 4.8, 8.5);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(5, 9, 4);
scene.add(key);

const grid = new THREE.GridHelper(40, 40, 0x5b6b78, 0x26333d);
grid.position.y = -2;
scene.add(grid);

const originPost = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 4.5, 0.18),
  new THREE.MeshStandardMaterial({ color: 0xffc857 }),
);
originPost.position.set(0, 0.25, -3.4);
scene.add(originPost);

const supportMesh = new THREE.Mesh(
  new THREE.BoxGeometry(4.4, 0.5, 4.4),
  new THREE.MeshStandardMaterial({ color: 0x4f7cac, roughness: 0.72 }),
);
scene.add(supportMesh);
const footMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.32, 0.95),
  new THREE.MeshStandardMaterial({ color: 0xe04b4b }),
);
scene.add(footMesh);
const torsoMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.85, 1.65, 0.55),
  new THREE.MeshStandardMaterial({ color: 0xe66f51 }),
);
scene.add(torsoMesh);

let sim = null;
let config = { ...E14_DEFAULTS, policy: E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL };
let rebuilding = false;
let held = 0;
let paused = false;

function bodyTransform(body, mesh) {
  const p = [0, 0, 0];
  const q = [0, 0, 0, 1];
  sim.b3.b3Body_GetPosition(p, body);
  sim.b3.b3Body_GetRotation(q, body);
  mesh.position.set(p[0], p[1], p[2]);
  mesh.quaternion.set(q[0], q[1], q[2], q[3]);
}

async function rebuild() {
  if (rebuilding) return;
  rebuilding = true;
  sim?.destroy();
  sim = await createE14ContinuousSim(config);
  sim.setInput(held);
  sim.setPaused(paused);
  rebuilding = false;
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function renderTelemetry(s) {
  if (!s) return;
  document.querySelector('#telemetry').innerHTML = `
    <div><span>state</span><strong>${s.fallen ? 'FALLEN' : s.recovered ? 'RECOVERED' : s.reactiveSupport ? 'REACTIVE' : 'NO SUPPORT'}</strong></div>
    <div><span>target v rel</span><strong>${fmt(s.targetRelativeVelocity)} m/s</strong></div>
    <div><span>actual v rel</span><strong>${fmt(s.relativeVelocity)} m/s</strong></div>
    <div><span>player v world</span><strong>${fmt(s.playerVelocity)} m/s</strong></div>
    <div><span>support v world</span><strong>${fmt(s.supportVelocity)} m/s</strong></div>
    <div><span>q entitlement</span><strong>${fmt(s.entitlement)}</strong></div>
    <div><span>natural Δv rel</span><strong>${fmt(s.physicalRelativeDeltaV, 4)}</strong></div>
    <div><span>supplemental Δv rel</span><strong>${fmt(s.grantedRelativeDeltaV, 4)}</strong></div>
    <div><span>player authority J</span><strong>${fmt(s.playerImpulse, 2)} Ns</strong></div>
    <div><span>support reaction J</span><strong>${fmt(s.supportImpulse, 2)} Ns</strong></div>
    <div><span>system pX</span><strong>${fmt(s.combinedMomentum, 2)} Ns</strong></div>
    <div><span>torso tilt</span><strong>${fmt(THREE.MathUtils.radToDeg(s.torsoTilt), 1)}°</strong></div>
    <div><span>balance torque</span><strong>${fmt(s.balanceTorque, 1)} Nm</strong></div>
  `;

  const outside = config.supportMass !== 800 || config.friction !== 0.95 || config.acceleration !== 31 || config.braking !== 36 || config.maxBalanceTorque !== 320;
  const envelope = document.querySelector('#envelope');
  envelope.textContent = outside
    ? 'EXPLORATORY / OUTSIDE QUALIFIED REFERENCE — reset/rebuild applied intentionally'
    : 'QUALIFIED REFERENCE VALUES — mechanism still experimental, not Donor promotion';
  envelope.classList.toggle('wild', outside);
}

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = Math.max(w, 1) / Math.max(h, 1);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function setHeld(value) {
  held = value;
  sim?.setInput(value);
}
function bindHold(id, value) {
  const el = document.querySelector(id);
  const down = (e) => { e.preventDefault(); setHeld(value); };
  const up = (e) => { e.preventDefault(); if (held === value) setHeld(0); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
}
bindHold('#left', -1);
bindHold('#right', 1);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') setHeld(-1);
  if (e.code === 'KeyD' || e.code === 'ArrowRight') setHeld(1);
  if (e.code === 'KeyR') rebuild();
});
window.addEventListener('keyup', (e) => {
  if ((e.code === 'KeyA' || e.code === 'ArrowLeft') && held === -1) setHeld(0);
  if ((e.code === 'KeyD' || e.code === 'ArrowRight') && held === 1) setHeld(0);
});

document.querySelectorAll('[data-policy]').forEach((button) => {
  button.addEventListener('click', () => {
    config.policy = button.dataset.policy;
    sim?.setPolicy(config.policy);
    document.querySelectorAll('[data-policy]').forEach((b) => b.classList.toggle('active', b === button));
  });
});

document.querySelector('#reset').addEventListener('click', rebuild);
document.querySelector('#pause').addEventListener('click', () => {
  paused = !paused;
  sim?.setPaused(paused);
  document.querySelector('#pause').textContent = paused ? 'Resume' : 'Pause';
});
document.querySelector('#step').addEventListener('click', () => sim?.step(true));
document.querySelector('#shove-player').addEventListener('click', () => sim?.shovePlayer(55));
document.querySelector('#shove-support').addEventListener('click', () => sim?.shoveSupport(260));

for (const [id, keyName, outId] of [
  ['mass', 'supportMass', 'mass-out'],
  ['friction', 'friction', 'friction-out'],
  ['accel', 'acceleration', 'accel-out'],
  ['brake', 'braking', 'brake-out'],
  ['torque', 'maxBalanceTorque', 'torque-out'],
]) {
  const inputEl = document.querySelector(`#${id}`);
  inputEl.addEventListener('input', () => {
    const value = Number(inputEl.value);
    config[keyName] = value;
    document.querySelector(`#${outId}`).textContent = value;
  });
  inputEl.addEventListener('change', rebuild);
}

await rebuild();
resize();
let lastTime = performance.now();
let accumulator = 0;

function animate(now) {
  requestAnimationFrame(animate);
  if (!sim || rebuilding) return;
  const elapsed = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  accumulator += elapsed;
  while (accumulator >= sim.config.dt) {
    sim.step();
    accumulator -= sim.config.dt;
  }

  bodyTransform(sim.support, supportMesh);
  bodyTransform(sim.organism.foot, footMesh);
  bodyTransform(sim.organism.torso, torsoMesh);
  renderTelemetry(sim.snapshot());
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
