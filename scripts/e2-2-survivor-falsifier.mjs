import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { cross3, dot3, length3, mulMat3Vec3, scale3, sub3 } from '../src/math.js';

const b3 = await Box3D();
const dt = 1 / 60;
const forward = [0, 0, -1];
const right = [1, 0, 0];

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(wd);
  function box(type, position, half, density = 35) {
    const bd = b3.b3DefaultBodyDef();
    if (type === 'dynamic') bd.type = b3.b3BodyType.b3_dynamicBody;
    bd.position = [...position];
    bd.enableSleep = false;
    bd.linearDamping = 0.08;
    bd.angularDamping = 0.10;
    const body = b3.b3CreateBody(world, bd);
    const sd = b3.b3DefaultShapeDef();
    sd.baseMaterial.friction = 0.8;
    sd.baseMaterial.restitution = 0;
    if (type === 'dynamic') sd.density = density;
    b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
    return body;
  }
  return { world, box };
}

function intent() {
  return { forward, right, moveForward: 0, moveRight: 0, jump: false, jumpHeld: false, sprint: false };
}

function causalExchange(character, planes, extras) {
  character.lastContactImpulse = 0;
  character.lastDynamicContacts = 0;
  const invMassA = 1 / character.virtualMass;
  for (let i = 0; i < planes.length; i++) {
    const extra = extras[i];
    if (!extra) continue;
    const body = b3.b3Shape_GetBody(extra.shapeId);
    if (bodyTypeValue(b3.b3Body_GetType(body)) !== bodyTypeValue(b3.b3BodyType.b3_dynamicBody)) continue;
    const normal = [-planes[i].plane.normal[0], -planes[i].plane.normal[1], -planes[i].plane.normal[2]];
    const pointVelocity = character._bodyPointVelocity(body, extra.point);
    const relative = sub3(character.velocity, pointVelocity);
    const closing = dot3(relative, normal);
    if (closing <= 0) continue;

    const invMassB = b3.b3Body_GetInverseMass(body);
    const invIB = b3.b3Body_GetWorldInverseRotationalInertia(body);
    b3.b3Body_GetWorldCenterOfMass(character._bodyCenter, body);
    const rB = sub3(extra.point, character._bodyCenter);
    const rn = cross3(rB, normal);
    const k = invMassA + invMassB + dot3(rn, mulMat3Vec3(invIB, rn));
    if (!(k > 0)) continue;
    const baselineMagnitude = closing / k;

    const hLen = Math.hypot(normal[0], normal[2]);
    const hClosing = Math.max(0, relative[0] * normal[0] + relative[2] * normal[2]);
    const vClosing = Math.max(0, relative[1] * normal[1]);
    const sum = hClosing + vClosing;
    if (sum <= 1e-8) continue;
    const hWeight = hClosing / sum;
    const vWeight = vClosing / sum;
    const direction = [0, 0, 0];
    if (hLen > 1e-8 && hWeight > 0) {
      direction[0] = hWeight * normal[0] / hLen;
      direction[2] = hWeight * normal[2] / hLen;
    }
    if (Math.abs(normal[1]) > 1e-8 && vWeight > 0) direction[1] = vWeight * Math.sign(normal[1]);
    if (length3(direction) <= 1e-8) continue;

    const impulse = scale3(direction, baselineMagnitude);
    const reaction = scale3(impulse, -invMassA);
    character.velocity[0] += reaction[0];
    character.velocity[1] += reaction[1];
    character.velocity[2] += reaction[2];
    character.externalVelocity[0] += reaction[0];
    character.externalVelocity[2] += reaction[2];
    b3.b3Body_ApplyLinearImpulse(body, impulse, extra.point, true);
    character.lastContactImpulse += length3(impulse);
    character.lastDynamicContacts += 1;
  }
}

function crossAxisExchange(character, planes, extras) {
  character.lastContactImpulse = 0;
  character.lastDynamicContacts = 0;
  const invMassA = 1 / character.virtualMass;
  for (let i = 0; i < planes.length; i++) {
    const extra = extras[i];
    if (!extra) continue;
    const body = b3.b3Shape_GetBody(extra.shapeId);
    if (bodyTypeValue(b3.b3Body_GetType(body)) !== bodyTypeValue(b3.b3BodyType.b3_dynamicBody)) continue;
    const normal = [-planes[i].plane.normal[0], -planes[i].plane.normal[1], -planes[i].plane.normal[2]];
    const pointVelocity = character._bodyPointVelocity(body, extra.point);
    const relative = sub3(character.velocity, pointVelocity);
    const closing = dot3(relative, normal);
    if (closing <= 0) continue;
    const hN = Math.hypot(normal[0], normal[2]);
    const hClosing = relative[0] * normal[0] + relative[2] * normal[2];
    const vClosing = relative[1] * normal[1];
    if (hN > 0.05 && hClosing <= 1e-6 && vClosing > 0) continue;

    const invMassB = b3.b3Body_GetInverseMass(body);
    const invIB = b3.b3Body_GetWorldInverseRotationalInertia(body);
    b3.b3Body_GetWorldCenterOfMass(character._bodyCenter, body);
    const rB = sub3(extra.point, character._bodyCenter);
    const rn = cross3(rB, normal);
    const k = invMassA + invMassB + dot3(rn, mulMat3Vec3(invIB, rn));
    if (!(k > 0)) continue;
    const j = closing / k;
    const impulse = scale3(normal, j);
    const reaction = scale3(impulse, -invMassA);
    character.velocity[0] += reaction[0];
    character.velocity[1] += reaction[1];
    character.velocity[2] += reaction[2];
    character.externalVelocity[0] += reaction[0];
    character.externalVelocity[2] += reaction[2];
    b3.b3Body_ApplyLinearImpulse(body, impulse, extra.point, true);
    character.lastContactImpulse += j;
    character.lastDynamicContacts += 1;
  }
}

function install(character, variant) {
  if (variant === 'baseline') return;
  if (variant === 'causal-components') character._exchangeDynamicContactImpulses = function (p, e) { causalExchange(this, p, e); };
  else if (variant === 'cross-axis-gate') character._exchangeDynamicContactImpulses = function (p, e) { crossAxisExchange(this, p, e); };
  else throw new Error(`unknown ${variant}`);
}

function edgeTrial(variant, offsetX, vx, vz) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const half = 0.62;
  const cube = setup.box('dynamic', [0, half, 0], [half, half, half], 42);
  const character = new ControllerOwnedCharacter(b3, setup.world, {
    startPosition: [offsetX, half * 2 + 0.90 + 1.45, 0], gravity: 20, virtualMass: 80,
  });
  install(character, variant);
  character.velocity[0] = vx;
  character.velocity[2] = vz;
  character.externalVelocity[0] = vx;
  character.externalVelocity[2] = vz;

  const start = [...character.position];
  let maxDrift = 0;
  let maxHorizontalSpeed = 0;
  let maxImpulse = 0;
  let maxAngular = 0;
  const av = [0, 0, 0];
  for (let i = 0; i < 180; i++) {
    character.preStep(dt, intent());
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);
    maxDrift = Math.max(maxDrift, Math.hypot(character.position[0] - start[0], character.position[2] - start[2]));
    maxHorizontalSpeed = Math.max(maxHorizontalSpeed, Math.hypot(character.velocity[0], character.velocity[2]));
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
    b3.b3Body_GetAngularVelocity(av, cube);
    maxAngular = Math.max(maxAngular, length3(av));
  }
  return { variant, offsetX, vx, vz, maxDrift, maxHorizontalSpeed, maxImpulse, maxAngular };
}

const offsets = [0.62, 0.68, 0.74, 0.80, 0.86];
const motions = [
  [0, 0],
  [-0.03, 0],
  [-0.10, 0],
  [-0.10, 0.12],
  [0.10, 0],
];
const baseline = [];
const causal = [];
for (const offset of offsets) {
  for (const [vx, vz] of motions) {
    baseline.push(edgeTrial('baseline', offset, vx, vz));
    causal.push(edgeTrial('causal-components', offset, vx, vz));
  }
}

console.log('E2.2 causal-components edge matrix:');
for (let i = 0; i < baseline.length; i++) {
  const a = baseline[i];
  const c = causal[i];
  console.log(`  x=${a.offsetX.toFixed(2)} vx=${a.vx.toFixed(2)} vz=${a.vz.toFixed(2)} baseline=${a.maxDrift.toFixed(2)}m/${a.maxHorizontalSpeed.toFixed(2)}mps causal=${c.maxDrift.toFixed(2)}m/${c.maxHorizontalSpeed.toFixed(2)}mps imp=${c.maxImpulse.toFixed(1)}Ns ang=${c.maxAngular.toFixed(2)}`);
}

const problematic = baseline.map((entry, i) => ({ baseline: entry, causal: causal[i] })).filter(({ baseline: b }) => b.maxDrift > 0.50 && Math.hypot(b.vx, b.vz) <= 0.16);
const improved = problematic.filter(({ baseline: b, causal: c }) => c.maxDrift <= Math.max(0.35, b.maxDrift * 0.60));
const worseThanBaseline = baseline.map((entry, i) => ({ baseline: entry, causal: causal[i] })).filter(({ baseline: b, causal: c }) => c.maxDrift > b.maxDrift + 0.15);
const physicalEdgeResponse = causal.filter((entry) => entry.maxImpulse > 20 && entry.maxAngular > 0.2).length;

const crossLow = edgeTrial('cross-axis-gate', 0.74, -0.01, 0);
const crossTrigger = edgeTrial('cross-axis-gate', 0.74, -0.03, 0);
const crossJump = crossTrigger.maxDrift - crossLow.maxDrift;
const crossRejected = crossJump > 0.40;
console.log(`E2.2 cross-axis corrected verdict: low=${crossLow.maxDrift.toFixed(2)}m trigger=${crossTrigger.maxDrift.toFixed(2)}m jump=${crossJump.toFixed(2)}m => ${crossRejected ? 'REJECT discontinuous threshold behavior' : 'NOT REJECTED'}`);

const matrixPass = problematic.length >= 3 && improved.length === problematic.length && worseThanBaseline.length === 0 && physicalEdgeResponse >= 3;
console.log(`E2.2 causal-components matrix verdict: problematic=${problematic.length} improved=${improved.length} worse=${worseThanBaseline.length} physicalResponses=${physicalEdgeResponse} => ${matrixPass ? 'SURVIVOR' : 'REJECT'}`);
if (!crossRejected) throw new Error('E2.2 expected cross-axis gate discontinuity was not reproduced');
if (!matrixPass) throw new Error(`E2.2 causal-components matrix failed: problematic=${problematic.length} improved=${improved.length} worse=${worseThanBaseline.length} physical=${physicalEdgeResponse}`);
