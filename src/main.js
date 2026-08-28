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
const planesEl = document.querySelector('#planes');

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 10.0;
const CHARACTER_RADIUS = 0.35;
const CHARACTER_HALF_SEGMENT = 0.55;
const CHARACTER_HALF_HEIGHT = CHARACTER_RADIUS + CHARACTER_HALF_SEGMENT;
const CHARACTER_START = [0, CHARACTER_HALF_HEIGHT + 0.02, 3.0];
const MAX_SPEED = 4.0;
const ACCELERATION = 14.0;
const FRICTION = 8.0;
const MIN_SPEED = 0.01;
const STOP_SPEED = 0.8;
const JUMP_SPEED = 4.6;
const SUPPORT_NORMAL_MIN_Y = 0.55;
const PUSH_LIMIT = 3.4e38;

const keys = new Set();
let jumpQueued = false;

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (event.code === 'Space' && !event.repeat) jumpQueued = true;
  if (key === 'r') reset();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  jumpQueued = false;
});

let b3;
let world;
let characterPosition = [...CHARACTER_START];
let characterVelocity = [0, 0, 0];
let desiredSpeed = 0;
let supported = false;
let supportType = 'none';
let supportPlanes = 0;

let renderer;
let scene;
let camera;
let characterVisual;

const planeResultScratch = { current: null };

const lengthXZ = (v) => Math.hypot(v[0], v[2]);
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function setupThree() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171d23);

  camera = new THREE.PerspectiveCamera(52, 1, 0.05, 100);
  camera.position.set(7.5, 5.4, 8.8);
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
  addStaticBoxVisual([-2.6, 0.28, -0.6], [1.2, 0.28, 1.2], 0x587185);

  const grid = new THREE.GridHelper(16, 16, 0x6f7d87, 0x3d454b);
  grid.position.y = 0.005;
  scene.add(grid);

  const stepLabel = makeLabel('STATIC SUPPORT');
  stepLabel.position.set(-2.6, 1.65, -0.6);
  scene.add(stepLabel);

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
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = '700 38px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8eef2';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.7, 0.5, 1);
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
  createStaticBox([-2.6, 0.28, -0.6], [1.2, 0.28, 1.2]);

  planeResultScratch.current = b3.createPlaneResult();
}

function reset() {
  if (!b3 || !world) return;

  characterPosition = [...CHARACTER_START];
  characterVelocity = [0, 0, 0];
  desiredSpeed = 0;
  supported = false;
  supportType = 'none';
  supportPlanes = 0;
  jumpQueued = false;
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

  if (jumpQueued && supported) {
    characterVelocity[1] = JUMP_SPEED;
    supported = false;
    supportType = 'none';
  }
  jumpQueued = false;

  characterVelocity[1] -= GRAVITY * dt;
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

function identifySupport(planes, extras) {
  let bestIndex = -1;
  let bestUp = SUPPORT_NORMAL_MIN_Y;

  for (let i = 0; i < planes.length; i++) {
    const up = planes[i].plane.normal[1];
    if (up > bestUp) {
      bestUp = up;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || characterVelocity[1] > 0.05) {
    supported = false;
    supportType = 'none';
    supportPlanes = 0;
    return;
  }

  supported = true;
  supportPlanes = planes.filter((plane) => plane.plane.normal[1] > SUPPORT_NORMAL_MIN_Y).length;

  const extra = extras[bestIndex];
  if (!extra) {
    supportType = 'unknown';
    return;
  }

  const body = b3.b3Shape_GetBody(extra.shapeId);
  const mass = b3.b3Body_GetMass(body);
  supportType = Number.isFinite(mass) && mass > 0 ? 'DYNAMIC' : 'STATIC';
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

  characterVelocity = b3.b3ClipVector(characterVelocity, lastPlanes);
  identifySupport(lastPlanes, lastExtras);

  if (supported && characterVelocity[1] < 0) characterVelocity[1] = 0;
}

function physicsTick(dt) {
  updateIntent(dt);
  b3.b3World_Step(world, dt, SUBSTEPS);
  solveCharacter(dt);
}

function syncVisuals() {
  characterVisual.position.set(characterPosition[0], characterPosition[1], characterPosition[2]);

  speedEl.textContent = `${lengthXZ(characterVelocity).toFixed(2)} m/s`;
  verticalEl.textContent = `${characterVelocity[1].toFixed(2)} m/s`;
  desiredEl.textContent = `${desiredSpeed.toFixed(2)} m/s`;
  supportedEl.textContent = supported ? 'YES' : 'no';
  supportTypeEl.textContent = supportType;
  planesEl.textContent = String(supportPlanes);
}

async function main() {
  setupThree();
  b3 = await Box3D();
  setupPhysics();
  reset();

  statusEl.textContent = 'Gate 1: fall, land, jump, and use the static support block.';

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