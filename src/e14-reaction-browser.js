import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from './donor/profile.js';
import { BalanceOrganism3D } from './e3-balance-organism-3d.js';
import { placementImpulseForRelativeDeltaV } from './reaction-placement.js';
import { createWorldRenderer } from './world-renderer.js';
import './style.css';
import './e3-balance.css';

const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const SUPPORT_MASS = 800;
const MU = 0.95;
const FINITE_TORQUE = 320;
const SETTLE_FRAMES = 90;
const LOAD_EPS = 1e-6;
const PLATFORM_HALF = [2.2, 0.16, 2.2];
const PLATFORM_START = [0, -PLATFORM_HALF[1], 0];
const NOMINAL_TRACTION_CAPACITY = MU * PLAYER_MASS * G * DT;
const ONE_FRAME_CURRENT31_DV = ACCEL * DT;
const IDENTITY_QUAT = [0, 0, 0, 1];
const RELATIVE_DV_EPS = 1e-4;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function vec3(getter, body) {
  const out = [0, 0, 0];
  getter(out, body);
  return out;
}

function createFreePlatform(b3, world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [...PLATFORM_START];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  // Preserve the qualified E12.2b one-axis support representation, rotated
  // into browser X: the 800 kg platform is physically free only horizontally.
  bd.motionLocks.linearY = true;
  bd.motionLocks.linearZ = true;
  bd.motionLocks.angularX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(SUPPORT_MASS, PLATFORM_HALF);
  sd.baseMaterial.friction = MU;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...PLATFORM_HALF);
  const mass = b3.b3Body_GetMass(body);
  if (Math.abs(mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E14 platform mass contract drifted: ${mass}`);
  }
  return { body, shape, mass };
}

function createSupportReader(b3, organism, platformShape) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    let totalNormalImpulse = 0;
    let matchedPlatform = false;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      const footIsA = sameId(contact.shapeIdA, organism.footShape);
      const footIsB = sameId(contact.shapeIdB, organism.footShape);
      if (!footIsA && !footIsB) continue;
      const otherShape = footIsA ? contact.shapeIdB : contact.shapeIdA;
      if (!sameId(otherShape, platformShape)) continue;
      matchedPlatform = true;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          totalNormalImpulse += totalJn;
          if (finalJn > LOAD_EPS || totalJn > LOAD_EPS) loaded += 1;
        }
      }
    }

    return {
      reactive: matchedPlatform && (touching > 0 || loaded > 0),
      frameNormalImpulse: 0.5 * totalNormalImpulse,
    };
  }

  return { read };
}

function qFromSignal(signal) {
  if (!signal.reactive) return 0;
  return clamp(MU * signal.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY, 0, 1);
}

function playerState(b3, organism) {
  organism._sync();
  const footV = vec3(b3.b3Body_GetLinearVelocity, organism.foot);
  const torsoV = vec3(b3.b3Body_GetLinearVelocity, organism.torso);
  return {
    x: (organism.footMass * organism.footCom[0] + organism.torsoMass * organism.torsoCom[0]) / PLAYER_MASS,
    vx: (organism.footMass * footV[0] + organism.torsoMass * torsoV[0]) / PLAYER_MASS,
  };
}

function applyPlayerImpulse(b3, organism, impulseX) {
  const footImpulse = impulseX * organism.footMass / PLAYER_MASS;
  const torsoImpulse = impulseX * organism.torsoMass / PLAYER_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [footImpulse, 0, 0], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [torsoImpulse, 0, 0], true);
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
  scene.fog = new THREE.Fog(0xaebfc8, 18, 42);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 90);
  camera.position.set(5.2, 2.7, 6.3);
  camera.up.set(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xeaf4f7, 0x59605c, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2d8, 3.0);
  sun.position.set(6, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 28;
  scene.add(sun);

  const grid = new THREE.GridHelper(18, 36, 0x596468, 0x707b7f);
  grid.position.y = -0.42;
  grid.material.transparent = true;
  grid.material.opacity = 0.30;
  scene.add(grid);

  const origin = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.9, 0.08),
    new THREE.MeshStandardMaterial({ roughness: 0.8 }),
  );
  origin.position.set(0, 0.03, -2.65);
  origin.castShadow = true;
  scene.add(origin);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.55, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.0;
  controls.maxDistance = 14;
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
  panel.setAttribute('aria-label', 'E14 reaction placement comparison controls');
  panel.innerHTML = `
    <div class="e3-title">E14.0 · OWNER REACTION PLACEMENT A/B</div>
    <div class="e3-row">
      <div class="e3-label">Supplemental authority placement</div>
      <div class="e3-buttons" data-group="placement">
        <button class="e3-button is-active" data-placement="world-external">World-external</button>
        <button class="e3-button" data-placement="reciprocal">Reciprocal</button>
      </div>
    </div>
    <div class="e3-row">
      <div class="e3-label">One qualified current31 pulse</div>
      <div class="e3-buttons">
        <button class="e3-button" data-pulse="-1">← Left · A</button>
        <button class="e3-button" data-pulse="1">Right · D →</button>
      </div>
    </div>
    <div class="e3-row e3-buttons">
      <button class="e3-button e3-danger" data-action="reset">Reset · R</button>
    </div>
    <div class="e3-telemetry">
      <div><span>state</span><strong id="e14-state">—</strong></div>
      <div><span>q at pulse</span><strong id="e14-q">—</strong></div>
      <div><span>granted Δv rel</span><strong id="e14-grant">—</strong></div>
      <div><span>player vX</span><strong id="e14-player-v">—</strong></div>
      <div><span>platform vX</span><strong id="e14-support-v">—</strong></div>
      <div><span>relative vX</span><strong id="e14-relative-v">—</strong></div>
      <div><span>platform travel</span><strong id="e14-support-x">—</strong></div>
      <div><span>player+platform pX</span><strong id="e14-momentum">—</strong></div>
      <div><span>torso tilt</span><strong id="e14-tilt">—</strong></div>
    </div>
    <div class="e3-note">One pulse per reset. Both placements receive the same q-scaled support-relative Δv. World-external uses Mplayer·Δv; reciprocal uses reduced-mass equal-and-opposite impulses. The world grid and origin post are visual world-frame references only. Experimental research surface — not Donor.</div>
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
  phaseEl.textContent = 'EXPERIMENT · E14 CONTEXTUAL REACTION OWNERSHIP · NOT DONOR';
  controlsEl.innerHTML = '<strong>A / D</strong> one pulse · <strong>Drag</strong> orbit · <strong>Wheel</strong> zoom';
  secondaryEl.innerHTML = '<strong>R</strong> reset · placement switch resets automatically';
  statusEl.textContent = 'Loading E14 reaction-placement surface…';

  const b3 = await Box3D();
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -G, 0];
  const world = b3.b3CreateWorld(worldDef);
  const platform = createFreePlatform(b3, world);
  const organism = new BalanceOrganism3D(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: MU,
  });
  const actualPlayerMass = organism.footMass + organism.torsoMass;
  if (Math.abs(actualPlayerMass - PLAYER_MASS) > 1e-3) {
    throw new Error(`E14 player mass contract drifted: ${actualPlayerMass}`);
  }
  const supportReader = createSupportReader(b3, organism, platform.shape);

  const appearance = new Map();
  appearance.set(bodyKey(platform.body), { color: 0x5c91bd, roughness: 0.68 });
  appearance.set(bodyKey(organism.foot), { color: 0xe1b85d, roughness: 0.65 });
  appearance.set(bodyKey(organism.torso), { color: 0xd9544d, roughness: 0.56 });

  const { renderer, scene, camera, controls } = setupScene(canvas);
  const worldView = createWorldRenderer(b3, world, { appearance });
  scene.add(worldView.object3d);
  const panel = createPanel();

  const urlPlacement = new URLSearchParams(window.location.search).get('placement');
  let placement = urlPlacement === 'reciprocal' ? 'reciprocal' : 'world-external';
  let signal = supportReader.read();
  let pulseUsed = false;
  let qAtPulse = null;
  let grantedDv = null;
  let supportStartX = 0;

  const stateEl = panel.querySelector('#e14-state');
  const qEl = panel.querySelector('#e14-q');
  const grantEl = panel.querySelector('#e14-grant');
  const playerVEl = panel.querySelector('#e14-player-v');
  const supportVEl = panel.querySelector('#e14-support-v');
  const relativeVEl = panel.querySelector('#e14-relative-v');
  const supportXEl = panel.querySelector('#e14-support-x');
  const momentumEl = panel.querySelector('#e14-momentum');
  const tiltEl = panel.querySelector('#e14-tilt');

  function syncPlacementButtons() {
    for (const button of panel.querySelectorAll('[data-placement]')) {
      button.classList.toggle('is-active', button.dataset.placement === placement);
    }
  }

  function pulseButtonsDisabled(disabled) {
    for (const button of panel.querySelectorAll('[data-pulse]')) button.disabled = disabled;
  }

  function solveOne() {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    signal = supportReader.read();
  }

  function resetExperiment() {
    b3.b3Body_SetTransform(platform.body, [...PLATFORM_START], IDENTITY_QUAT);
    b3.b3Body_SetLinearVelocity(platform.body, [0, 0, 0]);
    b3.b3Body_SetAngularVelocity(platform.body, [0, 0, 0]);
    organism.reset();
    for (let frame = 0; frame < SETTLE_FRAMES; frame++) solveOne();
    signal = supportReader.read();
    supportStartX = vec3(b3.b3Body_GetPosition, platform.body)[0];
    pulseUsed = false;
    qAtPulse = null;
    grantedDv = null;
    pulseButtonsDisabled(false);
    syncPlacementButtons();
    const q = qFromSignal(signal);
    statusEl.textContent = signal.reactive
      ? `Ready · ${placement} · settled q=${q.toFixed(3)} · one current31 pulse available`
      : `Not ready · ${placement} · support not reactive after settle`;
  }

  function applyPulse(direction) {
    if (pulseUsed) return;
    const q = qFromSignal(signal);
    if (!signal.reactive || q <= 0) {
      statusEl.textContent = 'Pulse blocked · no qualified reactive support capacity';
      return;
    }

    const signedGrantedDv = direction * q * ONE_FRAME_CURRENT31_DV;
    const beforePlayer = playerState(b3, organism);
    const beforeSupportV = vec3(b3.b3Body_GetLinearVelocity, platform.body)[0];
    const beforeRelativeV = beforePlayer.vx - beforeSupportV;
    const accounting = placementImpulseForRelativeDeltaV({
      placement,
      relativeDeltaV: signedGrantedDv,
      playerMass: PLAYER_MASS,
      supportMass: SUPPORT_MASS,
    });

    applyPlayerImpulse(b3, organism, accounting.playerImpulse);
    if (accounting.supportImpulse !== 0) {
      b3.b3Body_ApplyLinearImpulseToCenter(platform.body, [accounting.supportImpulse, 0, 0], true);
    }

    const immediatePlayer = playerState(b3, organism);
    const immediateSupportV = vec3(b3.b3Body_GetLinearVelocity, platform.body)[0];
    const immediateRelativeV = immediatePlayer.vx - immediateSupportV;
    const measuredDelta = immediateRelativeV - beforeRelativeV;
    if (Math.abs(measuredDelta - signedGrantedDv) > RELATIVE_DV_EPS) {
      throw new Error(`E14 immediate relative Δv mismatch expected=${signedGrantedDv} measured=${measuredDelta}`);
    }

    pulseUsed = true;
    qAtPulse = q;
    grantedDv = signedGrantedDv;
    pulseButtonsDisabled(true);
    statusEl.textContent = `${placement} pulse · q=${q.toFixed(3)} · granted Δv_rel=${signedGrantedDv.toFixed(3)} m/s · reset before next pulse`;
  }

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.placement) {
      placement = button.dataset.placement;
      resetExperiment();
      return;
    }
    if (button.dataset.pulse !== undefined) {
      applyPulse(Number(button.dataset.pulse));
      return;
    }
    if (button.dataset.action === 'reset') resetExperiment();
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'r') resetExperiment();
    if (key === 'a') applyPulse(-1);
    if (key === 'd') applyPulse(1);
  });

  resetExperiment();
  let previous = performance.now();
  let accumulator = 0;
  let hudAccumulator = 0;

  function frame(now) {
    const frameDt = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    accumulator += frameDt;
    while (accumulator >= DT) {
      solveOne();
      accumulator -= DT;
    }

    worldView.update();
    controls.update();
    hudAccumulator += frameDt;
    if (hudAccumulator >= 0.05) {
      hudAccumulator = 0;
      const player = playerState(b3, organism);
      const supportV = vec3(b3.b3Body_GetLinearVelocity, platform.body)[0];
      const supportX = vec3(b3.b3Body_GetPosition, platform.body)[0];
      const totalMomentum = PLAYER_MASS * player.vx + SUPPORT_MASS * supportV;
      const relativeV = player.vx - supportV;
      const t = organism.telemetry();
      let state = 'REACTIVE';
      let stateClass = 'e3-state-recovering';
      if (!signal.reactive) {
        state = 'SUPPORT LOST';
        stateClass = 'e3-state-fallen';
      } else if (t.fallObserved) {
        state = 'FALL OBSERVED';
        stateClass = 'e3-state-fallen';
      } else if (t.recovered) {
        state = pulseUsed ? 'RECOVERED' : 'READY';
        stateClass = 'e3-state-balanced';
      }
      stateEl.textContent = state;
      stateEl.className = stateClass;
      qEl.textContent = qAtPulse === null ? '—' : qAtPulse.toFixed(3);
      grantEl.textContent = grantedDv === null ? '—' : `${grantedDv.toFixed(3)} m/s`;
      playerVEl.textContent = `${player.vx.toFixed(3)} m/s`;
      supportVEl.textContent = `${supportV.toFixed(3)} m/s`;
      relativeVEl.textContent = `${relativeV.toFixed(3)} m/s`;
      supportXEl.textContent = `${((supportX - supportStartX) * 100).toFixed(1)} cm`;
      momentumEl.textContent = `${totalMomentum.toFixed(2)} N·s`;
      tiltEl.textContent = `${(t.torsoTilt * 180 / Math.PI).toFixed(1)}°`;
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
  if (statusEl) statusEl.textContent = `E14 error: ${error?.message ?? error}`;
});
