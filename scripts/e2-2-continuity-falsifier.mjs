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

function intent(overrides = {}) {
  return { forward, right, moveForward: 0, moveRight: 0, jump: false, jumpHeld: false, sprint: false, ...overrides };
}

function normalExchange(character, planes, extras, gate = () => true) {
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
    if (closing <= 0 || !gate({ normal, relative, closing })) continue;
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

function causalComponentExchange(character, planes, extras) {
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

    const hNormalLength = Math.hypot(normal[0], normal[2]);
    const horizontalClosing = Math.max(0, relative[0] * normal[0] + relative[2] * normal[2]);
    const verticalClosing = Math.max(0, relative[1] * normal[1]);
    const causalSum = horizontalClosing + verticalClosing;
    if (causalSum <= 1e-8) continue;
    const hWeight = horizontalClosing / causalSum;
    const vWeight = verticalClosing / causalSum;

    let direction = [0, 0, 0];
    if (hNormalLength > 1e-8 && hWeight > 0) {
      direction[0] += hWeight * normal[0] / hNormalLength;
      direction[2] += hWeight * normal[2] / hNormalLength;
    }
    if (Math.abs(normal[1]) > 1e-8 && vWeight > 0) {
      direction[1] += vWeight * Math.sign(normal[1]);
    }
    const dirLength = length3(direction);
    if (dirLength <= 1e-8) continue;
    // Do not renormalize: mixed-axis events intentionally transfer no more total
    // momentum than the baseline scalar and smoothly split it by causal contribution.
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

function install(character, variant) {
  if (variant === 'baseline') return;
  if (variant === 'cross-axis-gate') {
    character._exchangeDynamicContactImpulses = function (planes, extras) {
      normalExchange(this, planes, extras, ({ normal, relative }) => {
        const hN = Math.hypot(normal[0], normal[2]);
        const hClosing = relative[0] * normal[0] + relative[2] * normal[2];
        const vClosing = relative[1] * normal[1];
        return !(hN > 0.05 && hClosing <= 1e-6 && vClosing > 0);
      });
    };
  } else if (variant === 'causal-components') {
    character._exchangeDynamicContactImpulses = function (planes, extras) {
      causalComponentExchange(this, planes, extras);
    };
  } else {
    throw new Error(`unknown variant ${variant}`);
  }
}

function edgeSensitivity(variant, initialVx) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const half = 0.62;
  setup.box('dynamic', [0, half, 0], [half, half, half], 42);
  const character = new ControllerOwnedCharacter(b3, setup.world, {
    startPosition: [0.74, half * 2 + 0.90 + 1.45, 0], gravity: 20, virtualMass: 80,
  });
  install(character, variant);
  character.velocity[0] = initialVx;
  character.externalVelocity[0] = initialVx;
  const startX = character.position[0];
  let minX = startX;
  let maxX = startX;
  let maxSpeed = 0;
  let maxImpulse = 0;
  for (let i = 0; i < 180; i++) {
    character.preStep(dt, intent());
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);
    minX = Math.min(minX, character.position[0]);
    maxX = Math.max(maxX, character.position[0]);
    maxSpeed = Math.max(maxSpeed, Math.hypot(character.velocity[0], character.velocity[2]));
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  return { initialVx, drift: Math.max(Math.abs(maxX - startX), Math.abs(minX - startX)), maxSpeed, maxImpulse };
}

function pushTrial(variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const cube = setup.box('dynamic', [0, 0.6, -0.3], [0.6, 0.6, 0.6], 35);
  const character = new ControllerOwnedCharacter(b3, setup.world, { startPosition: [0, 2.2, 2.8], gravity: 20, virtualMass: 80 });
  install(character, variant);
  const tick = (input = {}) => {
    character.preStep(dt, intent(input));
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);
  };
  for (let i = 0; i < 120; i++) tick();
  character.reset([0, character.halfHeight + 0.02, 2.8]);
  for (let i = 0; i < 20; i++) tick();
  let maxImpulse = 0;
  for (let i = 0; i < 120; i++) {
    tick({ moveForward: 1 });
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  const p = [0, 0, 0];
  b3.b3Body_GetPosition(p, cube);
  return { boxZ: p[2], maxImpulse };
}

function reverseTrial(variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const cube = setup.box('dynamic', [2.0, 0.6, 0], [0.6, 0.6, 0.6], 35);
  const mass = b3.b3Body_GetMass(cube);
  const character = new ControllerOwnedCharacter(b3, setup.world, { startPosition: [0, 0.92, 0], gravity: 20, virtualMass: 80 });
  install(character, variant);
  const tick = () => {
    character.preStep(dt, intent());
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);
  };
  for (let i = 0; i < 20; i++) tick();
  const startX = character.position[0];
  b3.b3Body_ApplyLinearImpulse(cube, [-mass * 6, 0, 0], [2, 0.6, 0], true);
  let maxExternal = 0;
  let maxImpulse = 0;
  for (let i = 0; i < 90; i++) {
    tick();
    maxExternal = Math.max(maxExternal, Math.hypot(character.externalVelocity[0], character.externalVelocity[2]));
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  return { dx: character.position[0] - startX, maxExternal, maxImpulse };
}

function landingTrial(variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  setup.box('dynamic', [0, 0.28, 0], [1.5, 0.28, 1.5], 32);
  const character = new ControllerOwnedCharacter(b3, setup.world, { startPosition: [0, 3.1, 0], gravity: 20, virtualMass: 80 });
  install(character, variant);
  let frames = 0;
  let maxImpulse = 0;
  for (let i = 0; i < 180; i++) {
    character.preStep(dt, intent());
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);
    if (character.currentSupport?.type === 'DYNAMIC') frames += 1;
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  return { frames, maxImpulse };
}

const velocities = [0, -0.01, -0.03, -0.10, -0.30];
const variants = ['baseline', 'cross-axis-gate', 'causal-components'];
const sensitivity = new Map();
for (const variant of variants) sensitivity.set(variant, velocities.map((vx) => edgeSensitivity(variant, vx)));

console.log('E2.2 edge continuity sensitivity (x=0.74 vertical drop + small inward horizontal velocity):');
for (const variant of variants) {
  console.log(`  ${variant}: ${sensitivity.get(variant).map((r) => `vx=${r.initialVx.toFixed(2)} drift=${r.drift.toFixed(2)}m v=${r.maxSpeed.toFixed(2)} imp=${r.maxImpulse.toFixed(1)}Ns`).join(' | ')}`);
}

const baselinePush = pushTrial('baseline');
const causalPush = pushTrial('causal-components');
const baselineReverse = reverseTrial('baseline');
const causalReverse = reverseTrial('causal-components');
const baselineLanding = landingTrial('baseline');
const causalLanding = landingTrial('causal-components');
console.log(
  `E2.2 causal-components preservation: push baseline=${baselinePush.boxZ.toFixed(2)}m/${baselinePush.maxImpulse.toFixed(1)}Ns causal=${causalPush.boxZ.toFixed(2)}m/${causalPush.maxImpulse.toFixed(1)}Ns | reverse baseline=${baselineReverse.dx.toFixed(2)}m/${baselineReverse.maxExternal.toFixed(2)} causal=${causalReverse.dx.toFixed(2)}m/${causalReverse.maxExternal.toFixed(2)} | landing baseline=${baselineLanding.frames}f/${baselineLanding.maxImpulse.toFixed(1)}Ns causal=${causalLanding.frames}f/${causalLanding.maxImpulse.toFixed(1)}Ns`,
);

const cross = sensitivity.get('cross-axis-gate');
const crossZero = cross[0];
const crossTiny = cross[1];
const crossDiscontinuous = crossTiny.drift > Math.max(0.50, crossZero.drift * 2.0);
console.log(`E2.2 cross-axis continuity verdict: ${crossDiscontinuous ? 'REJECT discontinuous' : 'no discontinuity reproduced'}`);

const causal = sensitivity.get('causal-components');
const causalMaxDrift = Math.max(...causal.slice(0, 3).map((r) => r.drift));
const causalEdgePass = causalMaxDrift <= 0.60;
const causalPushPass = causalPush.boxZ <= -0.55 && causalPush.maxImpulse >= baselinePush.maxImpulse * 0.55;
const causalReversePass = causalReverse.dx <= -0.08 && causalReverse.maxExternal >= 0.2;
const causalLandingPass = causalLanding.frames >= 5 && causalLanding.maxImpulse > 0;
console.log(`E2.2 causal-components verdict: edge=${causalEdgePass ? 'PASS' : 'FAIL'} push=${causalPushPass ? 'PASS' : 'FAIL'} reverse=${causalReversePass ? 'PASS' : 'FAIL'} landing=${causalLandingPass ? 'PASS' : 'FAIL'} => ${causalEdgePass && causalPushPass && causalReversePass && causalLandingPass ? 'SURVIVOR' : 'REJECT'}`);
