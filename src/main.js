import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#app');
const statusEl = document.querySelector('#status');
const speedEl = document.querySelector('#speed');
const verticalEl = document.querySelector('#vertical-speed');
const desiredEl = document.querySelector('#desired');
const supportedEl = document.querySelector('#supported');
const supportTypeEl = document.querySelector('#support-type');
const supportSpeedEl = document.querySelector('#support-speed');
const loadImpulseEl = document.querySelector('#load-impulse');
const platformSpeedEl = document.querySelector('#platform-speed');

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 10.0;
const CHARACTER_RADIUS = 0.35;
const CHARACTER_HALF_SEGMENT = 0.55;
const CHARACTER_HALF_HEIGHT = CHARACTER_RADIUS + CHARACTER_HALF_SEGMENT;
const CHARACTER_START = [0, CHARACTER_HALF_HEIGHT + 0.02, 3.0];
const CHARACTER_MASS = 80.0;
const MAX_SPEED = 4.0;
const ACCELERATION = 14.0;
const FRICTION = 8.0;
const MIN_SPEED = 0.01;
const STOP_SPEED = 0.8;
const JUMP_SPEED = 4.6;
const SUPPORT_NORMAL_MIN_Y = 0.55;
const PUSH_LIMIT = 3.4e38;
const PLATFORM_START = [2.7, 0.3, -0.7];
const PLATFORM_HALF = [1.25, 0.3, 1.25];
const PLATFORM_DENSITY = 35;
const PLATFORM_NUDGE_SPEED = 1.5;

const keys = new Set();
let jumpQueued = false;
let nudgeQueued = false;

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (event.code === 'Space' && !event.repeat) jumpQueued = true;
  if (key === 'f' && !event.repeat) nudgeQueued = true;
  if (key === 'r') reset();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  jumpQueued = false;
  nudgeQueued = false;
});

let b3;
let world;
let dynamicPlatformBody;
let dynamicPlatformMass = 0;
let characterPosition = [...CHARACTER_START];
let characterVelocity = [0, 0, 0];
let desiredSpeed = 0;
let currentSupport = null;
let supportLoadImpulse = 0;
let supportTransportDistance = 0;

let renderer;
let scene;
let camera;
let characterVisual;
let dynamicPlatformVisual;

const planeResultScratch = { current: null };
const platformPosition = [0, 0, 0];
const platformRotation = [0, 0, 0, 1];
const platformVelocity = [0, 0, 0];
const supportVelocityScratch = [0, 0, 0];
const supportPositionBefore = [0, 0, 0];
const supportPositionAfter = [0, 0, 0];

const lengthXZ = (v) => Math.hypot(v[0], v[2]);
const length3 = (v) => Math.hypot(v[0], v[1], v[2]);
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function setupThree() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171d23);

  camera = new THREE.PerspectiveCamera(52, 1, 0.05, 100);
  camera.position.set(8.4, 5.8, 9.4);
  camera.lookAt(0, 0.8, 0);

  const hemi = new THREE.HemisphereLight(0xdcecff, 0x4b4033, 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  scene.add(sun);

  addStaticBoxVisual([0, -0.25, 0], [8, 0.25, 8], 0x454c53);
  addStaticBoxVisual([-2.7, 0.28, -0.7], [1.2, 0.28, 1.2], 0x587185);

  const grid = new THREE.GridHelper(16, 16, 0x6f7d87, 0x3d454b);
  grid.position.y = 0.005;
  scene.add(grid);

  const staticLabel = makeLabel('STATIC SUPPORT');
  staticLabel.position.set(-2.7, 1.65, -0.7);
  scene.add(staticLabel);

  dynamicPlatformVisual = new THREE.Mesh(
    new THREE.BoxGeometry(PLATFORM_HALF[0] * 2, PLATFORM_HALF[1] * 2, PLATFORM_HALF[2] * 2),
    new THREE.MeshStandardMaterial({ color: 0xd7a447, roughness: 0.72 }),
  );
  dynamicPlatformVisual.castShadow = true;
  dynamicPlatformVisual.receiveShadow = true;
  scene.add(dynamicPlatformVisual);

  const dynamicLabel = makeLabel('DYNAMIC SUPPORT · F NUDGE');
  dynamicLabel.position.set(PLATFORM_START[0], 1.75, PLATFORM_START[2]);
  scene.add(dynamicLabel);

  characterVisual = new THREE.Group();
  const capsuleMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(CHARACTER_RADIUS, CHARACTER_HALF_SEGMENT * 2, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xe85d5d, roughness: 0.45 }),
  );
  capsuleMesh.castShadow = true;
  characterVisual.add(capsuleMesh);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.34, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
  );
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.18, -0.42);
  characterVisual.add(nose);
  scene.add(characterVisual);

  const startLabel = makeLabel('SPACE → JUMP');
  startLabel.position.set(0, 2.05, CHARACTER_START[2]);
  scene.add(startLabel);

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();
}

function addStaticBoxVisual(position, halfExtents, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(halfExtents[0] * 2, halfExtents[1] * 2, halfExtents[2] * 2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
  );
  mesh.position.set(position[0], position[1], position[2]);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = '700 34px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8eef2';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.4, 0.5, 1);
  return sprite;
}

function createStaticBox(position, halfExtents) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), halfExtents[0], halfExtents[1], halfExtents[2]);
}

function setupPhysics() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  world = b3.b3CreateWorld(worldDef);

  createStaticBox([0, -0.25, 0], [8, 0.25, 8]);
  createStaticBox([-2.7, 0.28, -0.7], [1.2, 0.28, 1.2]);

  const platformDef = b3.b3DefaultBodyDef();
  platformDef.type = b3.b3BodyType.b3_dynamicBody;
  platformDef.position = [...PLATFORM_START];
  platformDef.linearDamping = 0.15;
  platformDef.angularDamping = 0.7;
  dynamicPlatformBody = b3.b3CreateBody(world, platformDef);

  const platformShapeDef = b3.b3DefaultShapeDef();
  platformShapeDef.density = PLATFORM_DENSITY;
  platformShapeDef.baseMaterial.friction = 0.7;
  b3.b3CreateBoxShape(
    dynamicPlatformBody,
    platformShapeDef,
    PLATFORM_HALF[0],
    PLATFORM_HALF[1],
    PLATFORM_HALF[2],
  );
  dynamicPlatformMass = b3.b3Body_GetMass(dynamicPlatformBody);

  planeResultScratch.current = b3.createPlaneResult();
}

function reset() {
  if (!b3 || !world) return;

  characterPosition = [...CHARACTER_START];
  characterVelocity = [0, 0, 0];
  desiredSpeed = 0;
  currentSupport = null;
  supportLoadImpulse = 0;
  supportTransportDistance = 0;
  jumpQueued = false;
  nudgeQueued = false;

  b3.b3Body_SetTransform(dynamicPlatformBody, [...PLATFORM_START], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(dynamicPlatformBody, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(dynamicPlatformBody, [0, 0, 0]);
}

function supportLinearVelocity(support, out) {
  if (!support || support.type !== 'DYNAMIC') {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  b3.b3Body_GetLinearVelocity(out, support.body);
  return out;
}

function updateIntent(dt) {
  let x = 0;
  let z = 0;
  if (keys.has('a')) x -= 1;
  if (keys.has('d')) x += 1;
  if (keys.has('w')) z -= 1;
  if (keys.has('s')) z += 1;

  const inputLength = Math.hypot(x, z);
  if (inputLength > 1) {
    x /= inputLength;
    z /= inputLength;
  }

  const desired = [x * MAX_SPEED, 0, z * MAX_SPEED];
  desiredSpeed = Math.hypot(desired[0], desired[2]);

  const speed = lengthXZ(characterVelocity);
  if (speed < MIN_SPEED) {
    characterVelocity[0] = 0;
    characterVelocity[2] = 0;
  } else {
    const control = speed < STOP_SPEED ? STOP_SPEED : speed;
    const drop = control * FRICTION * dt;
    const scale = Math.max(0, speed - drop) / speed;
    characterVelocity[0] *= scale;
    characterVelocity[2] *= scale;
  }

  if (desiredSpeed > 1e-6) {
    const dirX = desired[0] / desiredSpeed;
    const dirZ = desired[2] / desiredSpeed;
    const currentAlongDesired = characterVelocity[0] * dirX + characterVelocity[2] * dirZ;
    const addSpeed = desiredSpeed - currentAlongDesired;
    if (addSpeed > 0) {
      const accel = Math.min(ACCELERATION * dt, addSpeed);
      characterVelocity[0] += accel * dirX;
      characterVelocity[2] += accel * dirZ;
    }
  }

  if (jumpQueued && currentSupport) {
    if (currentSupport.type === 'DYNAMIC') {
      supportLinearVelocity(currentSupport, supportVelocityScratch);
      characterVelocity[0] += supportVelocityScratch[0];
      characterVelocity[2] += supportVelocityScratch[2];
    }
    characterVelocity[1] = JUMP_SPEED;
    currentSupport = null;
  }
  jumpQueued = false;

  characterVelocity[1] -= GRAVITY * dt;
}

function captureSupportTransport() {
  if (!currentSupport || currentSupport.type !== 'DYNAMIC') return null;
  b3.b3Body_GetPosition(supportPositionBefore, currentSupport.body);
  return {
    body: currentSupport.body,
    before: [...supportPositionBefore],
  };
}

function applySupportTransport(probe) {
  supportTransportDistance = 0;
  if (!probe) return;

  b3.b3Body_GetPosition(supportPositionAfter, probe.body);
  const dx = supportPositionAfter[0] - probe.before[0];
  const dy = supportPositionAfter[1] - probe.before[1];
  const dz = supportPositionAfter[2] - probe.before[2];
  characterPosition[0] += dx;
  characterPosition[1] += dy;
  characterPosition[2] += dz;
  supportTransportDistance = Math.hypot(dx, dy, dz);
}

function applyPlatformNudge() {
  if (!nudgeQueued) return;
  nudgeQueued = false;
  b3.b3Body_GetPosition(platformPosition, dynamicPlatformBody);
  b3.b3Body_ApplyLinearImpulse(
    dynamicPlatformBody,
    [dynamicPlatformMass * PLATFORM_NUDGE_SPEED, 0, 0],
    [...platformPosition],
    true,
  );
}

function collectMoverPlanes(capsule) {
  const filter = b3.b3DefaultQueryFilter();
  const planes = [];
  const extras = [];
  const scratch = planeResultScratch.current;

  b3.b3World_CollideMover(
    world,
    characterPosition,
    capsule,
    filter,
    (shapeId, buffer) => {
      const count = b3.getNumPlaneResults(buffer);
      for (let i = 0; i < count; i++) {
        b3.getPlaneResultAt(scratch, buffer, i);
        const normal = scratch.plane.normal;
        planes.push({
          plane: {
            normal: [normal[0], normal[1], normal[2]],
            offset: scratch.plane.offset,
          },
          pushLimit: PUSH_LIMIT,
          push: 0,
          clipVelocity: true,
        });
        extras.push({
          shapeId,
          point: [
            characterPosition[0] + scratch.point[0],
            characterPosition[1] + scratch.point[1],
            characterPosition[2] + scratch.point[2],
          ],
        });
      }
      return true;
    },
  );

  return { filter, planes, extras };
}

function findSupport(planes, extras, preClipVelocity) {
  let bestIndex = -1;
  let bestUp = SUPPORT_NORMAL_MIN_Y;

  for (let i = 0; i < planes.length; i++) {
    const up = planes[i].plane.normal[1];
    if (up > bestUp) {
      bestUp = up;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || preClipVelocity[1] > 0.05) return null;

  const extra = extras[bestIndex];
  if (!extra) return null;

  const body = b3.b3Shape_GetBody(extra.shapeId);
  const mass = b3.b3Body_GetMass(body);
  return {
    body,
    type: Number.isFinite(mass) && mass > 0 ? 'DYNAMIC' : 'STATIC',
    mass,
    point: extra.point,
    normal: planes[bestIndex].plane.normal,
  };
}

function applyDynamicSupportLoad(support, preClipVelocity) {
  supportLoadImpulse = 0;
  if (!support || support.type !== 'DYNAMIC') return;

  supportLinearVelocity(support, supportVelocityScratch);
  const relativeVelocity = [
    preClipVelocity[0] - supportVelocityScratch[0],
    preClipVelocity[1] - supportVelocityScratch[1],
    preClipVelocity[2] - supportVelocityScratch[2],
  ];
  const closingSpeed = dot3(relativeVelocity, support.normal);
  if (closingSpeed >= 0) return;

  const magnitude = CHARACTER_MASS * -closingSpeed;
  const impulse = [
    -support.normal[0] * magnitude,
    -support.normal[1] * magnitude,
    -support.normal[2] * magnitude,
  ];
  b3.b3Body_ApplyLinearImpulse(support.body, impulse, support.point, true);
  supportLoadImpulse = magnitude;
}

function solveCharacter(dt) {
  const capsule = {
    center1: [0, -CHARACTER_HALF_SEGMENT, 0],
    center2: [0, CHARACTER_HALF_SEGMENT, 0],
    radius: CHARACTER_RADIUS,
  };

  const target = [
    characterPosition[0] + dt * characterVelocity[0],
    characterPosition[1] + dt * characterVelocity[1],
    characterPosition[2] + dt * characterVelocity[2],
  ];

  let lastPlanes = [];
  let lastExtras = [];
  const tolerance = 0.002;

  for (let iteration = 0; iteration < 5; iteration++) {
    const { filter, planes, extras } = collectMoverPlanes(capsule);
    const targetDelta = [
      target[0] - characterPosition[0],
      target[1] - characterPosition[1],
      target[2] - characterPosition[2],
    ];
    const solved = b3.b3SolvePlanes(targetDelta, planes);
    let delta = solved.delta;
    const fraction = b3.b3World_CastMover(world, characterPosition, capsule, delta, filter, () => true);
    delta = [delta[0] * fraction, delta[1] * fraction, delta[2] * fraction];

    characterPosition = [
      characterPosition[0] + delta[0],
      characterPosition[1] + delta[1],
      characterPosition[2] + delta[2],
    ];

    lastPlanes = planes;
    lastExtras = extras;

    if (dot3(delta, delta) < tolerance * tolerance) break;
  }

  const preClipVelocity = [...characterVelocity];
  const nextSupport = findSupport(lastPlanes, lastExtras, preClipVelocity);
  applyDynamicSupportLoad(nextSupport, preClipVelocity);
  characterVelocity = b3.b3ClipVector(characterVelocity, lastPlanes);
  currentSupport = nextSupport;

  if (currentSupport && characterVelocity[1] < 0) characterVelocity[1] = 0;
  if (!currentSupport) supportLoadImpulse = 0;
}

function physicsTick(dt) {
  updateIntent(dt);
  const transportProbe = captureSupportTransport();
  applyPlatformNudge();
  b3.b3World_Step(world, dt, SUBSTEPS);
  applySupportTransport(transportProbe);
  solveCharacter(dt);
}

function syncVisuals() {
  characterVisual.position.set(characterPosition[0], characterPosition[1], characterPosition[2]);

  b3.b3Body_GetPosition(platformPosition, dynamicPlatformBody);
  b3.b3Body_GetRotation(platformRotation, dynamicPlatformBody);
  b3.b3Body_GetLinearVelocity(platformVelocity, dynamicPlatformBody);
  dynamicPlatformVisual.position.set(platformPosition[0], platformPosition[1], platformPosition[2]);
  dynamicPlatformVisual.quaternion.set(
    platformRotation[0],
    platformRotation[1],
    platformRotation[2],
    platformRotation[3],
  );

  if (currentSupport?.type === 'DYNAMIC') supportLinearVelocity(currentSupport, supportVelocityScratch);
  else supportVelocityScratch.fill(0);

  speedEl.textContent = `${lengthXZ(characterVelocity).toFixed(2)} m/s`;
  verticalEl.textContent = `${characterVelocity[1].toFixed(2)} m/s`;
  desiredEl.textContent = `${desiredSpeed.toFixed(2)} m/s`;
  supportedEl.textContent = currentSupport ? 'YES' : 'no';
  supportTypeEl.textContent = currentSupport?.type ?? 'none';
  supportSpeedEl.textContent = `${length3(supportVelocityScratch).toFixed(2)} m/s`;
  loadImpulseEl.textContent = `${supportLoadImpulse.toFixed(1)} N·s`;
  platformSpeedEl.textContent = `${length3(platformVelocity).toFixed(2)} m/s`;
}

async function main() {
  setupThree();
  b3 = await Box3D();
  setupPhysics();
  reset();

  statusEl.textContent = `Gate 2: jump onto the dynamic support. Virtual player mass = ${CHARACTER_MASS.toFixed(0)} kg. Press F while standing on it to nudge the support.`;

  let previous = performance.now();
  let accumulator = 0;

  const frame = (now) => {
    const frameDt = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    accumulator += frameDt;

    while (accumulator >= FIXED_DT) {
      physicsTick(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    syncVisuals();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

main().catch((error) => {
  console.error(error);
  statusEl.textContent = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
});