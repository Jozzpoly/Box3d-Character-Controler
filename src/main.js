import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#app');
const statusEl = document.querySelector('#status');
const speedEl = document.querySelector('#speed');
const desiredEl = document.querySelector('#desired');
const contactEl = document.querySelector('#contact');
const impulseEl = document.querySelector('#impulse');
const boxSpeedEl = document.querySelector('#box-speed');

const FIXED_DT = 1 / 60;
const SUBSTEPS = 4;
const CHARACTER_RADIUS = 0.35;
const CHARACTER_HALF_SEGMENT = 0.55;
const CHARACTER_Y = CHARACTER_RADIUS + CHARACTER_HALF_SEGMENT + 0.02;
const CHARACTER_START = [0, CHARACTER_Y, 3];
const BOX_START = [0, 0.68, -1.6];
const BOX_HALF = 0.65;
const MAX_SPEED = 4.0;
const ACCELERATION = 14.0;
const FRICTION = 8.0;
const MIN_SPEED = 0.01;
const STOP_SPEED = 0.8;
const PUSH_LIMIT = 3.4e38;

const keys = new Set();
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === 'r') reset();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

let b3;
let world;
let boxBody;
let boxShape;
let characterPosition = [...CHARACTER_START];
let characterVelocity = [0, 0, 0];
let desiredSpeed = 0;
let dynamicContact = false;
let pushImpulse = 0;

let renderer;
let scene;
let camera;
let characterVisual;
let boxVisual;

const boxPosition = [0, 0, 0];
const boxRotation = [0, 0, 0, 1];
const boxVelocity = [0, 0, 0];
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
  camera.position.set(7.2, 5.2, 8.5);
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

  const groundVisual = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x454c53, roughness: 0.95 }),
  );
  groundVisual.position.y = -0.25;
  groundVisual.receiveShadow = true;
  scene.add(groundVisual);

  const grid = new THREE.GridHelper(16, 16, 0x6f7d87, 0x3d454b);
  grid.position.y = 0.005;
  scene.add(grid);

  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 9),
    new THREE.MeshBasicMaterial({ color: 0x25313a, transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(0, 0.012, 0.8);
  scene.add(lane);

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

  boxVisual = new THREE.Mesh(
    new THREE.BoxGeometry(BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2),
    new THREE.MeshStandardMaterial({ color: 0xd7a447, roughness: 0.7 }),
  );
  boxVisual.castShadow = true;
  boxVisual.receiveShadow = true;
  scene.add(boxVisual);

  const boxLabel = makeLabel('DYNAMIC BOX');
  boxLabel.position.set(0, 1.7, BOX_START[2]);
  scene.add(boxLabel);

  const startLabel = makeLabel('W → PUSH');
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

function setupPhysics() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -10, 0];
  world = b3.b3CreateWorld(worldDef);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.25, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 8, 0.25, 8);

  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...BOX_START];
  bodyDef.linearDamping = 0.12;
  bodyDef.angularDamping = 0.2;
  boxBody = b3.b3CreateBody(world, bodyDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = 25;
  shapeDef.baseMaterial.friction = 0.75;
  boxShape = b3.b3CreateBoxShape(boxBody, shapeDef, BOX_HALF, BOX_HALF, BOX_HALF);

  planeResultScratch.current = b3.createPlaneResult();
}

function reset() {
  if (!b3 || !world || !boxBody) return;

  characterPosition = [...CHARACTER_START];
  characterVelocity = [0, 0, 0];
  desiredSpeed = 0;
  dynamicContact = false;
  pushImpulse = 0;

  b3.b3Body_SetTransform(boxBody, [...BOX_START], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(boxBody, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(boxBody, [0, 0, 0]);
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
}

function solveCharacter(dt) {
  const capsule = {
    center1: [0, -CHARACTER_HALF_SEGMENT, 0],
    center2: [0, CHARACTER_HALF_SEGMENT, 0],
    radius: CHARACTER_RADIUS,
  };
  const filter = b3.b3DefaultQueryFilter();

  const target = [
    characterPosition[0] + dt * characterVelocity[0],
    CHARACTER_Y,
    characterPosition[2] + dt * characterVelocity[2],
  ];

  let lastPlanes = [];
  let lastExtras = [];
  const tolerance = 0.002;

  dynamicContact = false;
  pushImpulse = 0;

  for (let iteration = 0; iteration < 5; iteration++) {
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
      CHARACTER_Y,
      characterPosition[2] + delta[2],
    ];

    lastPlanes = planes;
    lastExtras = extras;

    if (dot3(delta, delta) < tolerance * tolerance) break;
  }

  applyDynamicPush(lastPlanes, lastExtras);
  characterVelocity = b3.b3ClipVector(characterVelocity, lastPlanes);
  characterVelocity[1] = 0;
}

function applyDynamicPush(planes, extras) {
  const bodyVelocity = [0, 0, 0];

  for (let i = 0; i < planes.length; i++) {
    const extra = extras[i];
    if (!extra) continue;

    const body = b3.b3Shape_GetBody(extra.shapeId);
    const mass = b3.b3Body_GetMass(body);
    if (!Number.isFinite(mass) || mass <= 0) continue;

    dynamicContact = true;
    b3.b3Body_GetLinearVelocity(bodyVelocity, body);

    const planeNormal = planes[i].plane.normal;
    const pushNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]];
    const relativeVelocity = [
      bodyVelocity[0] - characterVelocity[0],
      bodyVelocity[1] - characterVelocity[1],
      bodyVelocity[2] - characterVelocity[2],
    ];
    const closingSpeed = dot3(relativeVelocity, pushNormal);

    // First-order port of the native CharacterMover push step. The controller is
    // intentionally treated as infinite-mass (invMassA = 0). For this first
    // baseline we use the body's translational mass and let Box3D turn the
    // off-center impulse into angular response at the application point.
    const impulseMagnitude = Math.max(-mass * closingSpeed, 0);
    if (impulseMagnitude <= 0) continue;

    const impulse = [
      impulseMagnitude * pushNormal[0],
      impulseMagnitude * pushNormal[1],
      impulseMagnitude * pushNormal[2],
    ];
    b3.b3Body_ApplyLinearImpulse(body, impulse, extra.point, true);
    pushImpulse += impulseMagnitude;
  }
}

function physicsTick(dt) {
  updateIntent(dt);
  b3.b3World_Step(world, dt, SUBSTEPS);
  solveCharacter(dt);
}

function syncVisuals() {
  characterVisual.position.set(characterPosition[0], characterPosition[1], characterPosition[2]);

  b3.b3Body_GetPosition(boxPosition, boxBody);
  b3.b3Body_GetRotation(boxRotation, boxBody);
  b3.b3Body_GetLinearVelocity(boxVelocity, boxBody);
  boxVisual.position.set(boxPosition[0], boxPosition[1], boxPosition[2]);
  boxVisual.quaternion.set(boxRotation[0], boxRotation[1], boxRotation[2], boxRotation[3]);

  speedEl.textContent = `${lengthXZ(characterVelocity).toFixed(2)} m/s`;
  desiredEl.textContent = `${desiredSpeed.toFixed(2)} m/s`;
  contactEl.textContent = dynamicContact ? 'YES' : 'no';
  impulseEl.textContent = `${pushImpulse.toFixed(1)} N·s`;
  boxSpeedEl.textContent = `${Math.hypot(boxVelocity[0], boxVelocity[1], boxVelocity[2]).toFixed(2)} m/s`;
}

async function main() {
  setupThree();
  b3 = await Box3D();
  setupPhysics();
  reset();

  statusEl.textContent = 'Ready. Hold W and drive into the box.';

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
