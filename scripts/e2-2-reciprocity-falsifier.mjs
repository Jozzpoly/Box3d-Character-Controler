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
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  function box(type, position, half, options = {}) {
    const bodyDef = b3.b3DefaultBodyDef();
    if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
    bodyDef.position = [...position];
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = options.linearDamping ?? 0.08;
    bodyDef.angularDamping = options.angularDamping ?? 0.10;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = options.friction ?? 0.8;
    shapeDef.baseMaterial.restitution = 0;
    if (type === 'dynamic') shapeDef.density = options.density ?? 35;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  return { world, box };
}

function baseIntent(overrides = {}) {
  return {
    forward,
    right,
    moveForward: 0,
    moveRight: 0,
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function harness(setup, startPosition, variant) {
  const character = new ControllerOwnedCharacter(b3, setup.world, {
    startPosition,
    gravity: 20,
    virtualMass: 80,
  });
  installVariant(character, variant);

  function tick(intent = {}, preWorld = null) {
    preWorld?.();
    character.preStep(dt, baseIntent(intent));
    b3.b3World_Step(setup.world, dt, 4);
    character.postStep(dt);
  }

  function settle(frames = 60) {
    for (let i = 0; i < frames; i++) tick();
  }

  return { character, tick, settle };
}

function applyNormalExchange(character, planes, extras, shouldExchange = () => true) {
  character.lastContactImpulse = 0;
  character.lastDynamicContacts = 0;
  const invMassA = 1 / character.virtualMass;

  for (let i = 0; i < planes.length; i++) {
    const extra = extras[i];
    if (!extra) continue;
    const body = b3.b3Shape_GetBody(extra.shapeId);
    const type = bodyTypeValue(b3.b3Body_GetType(body));
    if (type !== bodyTypeValue(b3.b3BodyType.b3_dynamicBody)) continue;

    const normal = [-planes[i].plane.normal[0], -planes[i].plane.normal[1], -planes[i].plane.normal[2]];
    const pointVelocity = character._bodyPointVelocity(body, extra.point);
    const relative = sub3(character.velocity, pointVelocity);
    const closing = dot3(relative, normal);
    if (closing <= 0 || !shouldExchange({ normal, relative, closing })) continue;

    const invMassB = b3.b3Body_GetInverseMass(body);
    const invIB = b3.b3Body_GetWorldInverseRotationalInertia(body);
    b3.b3Body_GetWorldCenterOfMass(character._bodyCenter, body);
    const rB = sub3(extra.point, character._bodyCenter);
    const rnB = cross3(rB, normal);
    const kNormal = invMassA + invMassB + dot3(rnB, mulMat3Vec3(invIB, rnB));
    if (!(kNormal > 0)) continue;

    const impulseMagnitude = closing / kNormal;
    const impulse = scale3(normal, impulseMagnitude);
    const reaction = scale3(impulse, -invMassA);
    character.velocity[0] += reaction[0];
    character.velocity[1] += reaction[1];
    character.velocity[2] += reaction[2];
    character.externalVelocity[0] += reaction[0];
    character.externalVelocity[2] += reaction[2];
    b3.b3Body_ApplyLinearImpulse(body, impulse, extra.point, true);
    character.lastContactImpulse += impulseMagnitude;
    character.lastDynamicContacts += 1;
  }
}

function applyApproachAlignedExchange(character, planes, extras) {
  character.lastContactImpulse = 0;
  character.lastDynamicContacts = 0;
  const invMassA = 1 / character.virtualMass;

  for (let i = 0; i < planes.length; i++) {
    const extra = extras[i];
    if (!extra) continue;
    const body = b3.b3Shape_GetBody(extra.shapeId);
    const type = bodyTypeValue(b3.b3Body_GetType(body));
    if (type !== bodyTypeValue(b3.b3BodyType.b3_dynamicBody)) continue;

    const normal = [-planes[i].plane.normal[0], -planes[i].plane.normal[1], -planes[i].plane.normal[2]];
    const pointVelocity = character._bodyPointVelocity(body, extra.point);
    const relative = sub3(character.velocity, pointVelocity);
    const closing = dot3(relative, normal);
    const relativeSpeed = length3(relative);
    if (closing <= 0 || relativeSpeed < 1e-7) continue;

    const direction = scale3(relative, 1 / relativeSpeed);
    if (dot3(direction, normal) <= 1e-6) continue;

    const invMassB = b3.b3Body_GetInverseMass(body);
    const invIB = b3.b3Body_GetWorldInverseRotationalInertia(body);
    b3.b3Body_GetWorldCenterOfMass(character._bodyCenter, body);
    const rB = sub3(extra.point, character._bodyCenter);

    // Keep the baseline finite-mass scalar ceiling, but transfer that momentum along
    // the relative approach direction. The mover still owns geometric deflection;
    // reciprocity therefore cannot manufacture a new momentum axis from its edge normal.
    const rnNormal = cross3(rB, normal);
    const kNormal = invMassA + invMassB + dot3(rnNormal, mulMat3Vec3(invIB, rnNormal));
    if (!(kNormal > 0)) continue;
    const baselineMagnitude = closing / kNormal;

    const rnDirection = cross3(rB, direction);
    const kDirection = invMassA + invMassB + dot3(rnDirection, mulMat3Vec3(invIB, rnDirection));
    if (!(kDirection > 0)) continue;
    const directionalMagnitude = relativeSpeed / kDirection;
    const impulseMagnitude = Math.min(baselineMagnitude, directionalMagnitude);

    const impulse = scale3(direction, impulseMagnitude);
    const reaction = scale3(impulse, -invMassA);
    character.velocity[0] += reaction[0];
    character.velocity[1] += reaction[1];
    character.velocity[2] += reaction[2];
    character.externalVelocity[0] += reaction[0];
    character.externalVelocity[2] += reaction[2];
    b3.b3Body_ApplyLinearImpulse(body, impulse, extra.point, true);
    character.lastContactImpulse += impulseMagnitude;
    character.lastDynamicContacts += 1;
  }
}

function installVariant(character, variant) {
  if (variant === 'baseline') return;
  if (variant === 'no-exchange') {
    character._exchangeDynamicContactImpulses = function noExchange() {
      this.lastContactImpulse = 0;
      this.lastDynamicContacts = 0;
    };
    return;
  }
  if (variant === 'cross-axis-gate') {
    character._exchangeDynamicContactImpulses = function crossAxisGate(planes, extras) {
      applyNormalExchange(this, planes, extras, ({ normal, relative }) => {
        const horizontalNormal = Math.hypot(normal[0], normal[2]);
        const horizontalClosing = relative[0] * normal[0] + relative[2] * normal[2];
        const verticalClosing = relative[1] * normal[1];
        // Suppress only the diagnosed cross-axis case: a contact with meaningful
        // lateral normal whose closing is driven by vertical motion while horizontal
        // relative motion is not approaching the body.
        return !(horizontalNormal > 0.05 && horizontalClosing <= 1e-6 && verticalClosing > 0);
      });
    };
    return;
  }
  if (variant === 'approach-aligned') {
    character._exchangeDynamicContactImpulses = function approachAligned(planes, extras) {
      applyApproachAlignedExchange(this, planes, extras);
    };
    return;
  }
  throw new Error(`Unknown E2.2 variant: ${variant}`);
}

function edgeTrial(variant, offsetX = 0.74) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const half = 0.62;
  const cube = setup.box('dynamic', [0, half, 0], [half, half, half], {
    density: 42,
    friction: 0.78,
    angularDamping: 0.10,
  });
  const { character, tick } = harness(setup, [offsetX, half * 2 + 0.90 + 1.45, 0], variant);
  const startX = character.position[0];
  const angular = [0, 0, 0];
  let minX = startX;
  let maxX = startX;
  let maxSpeed = 0;
  let maxImpulse = 0;
  let maxExternal = 0;
  let peakAngular = 0;

  for (let i = 0; i < 180; i++) {
    tick();
    minX = Math.min(minX, character.position[0]);
    maxX = Math.max(maxX, character.position[0]);
    maxSpeed = Math.max(maxSpeed, Math.hypot(character.velocity[0], character.velocity[2]));
    maxExternal = Math.max(maxExternal, Math.hypot(character.externalVelocity[0], character.externalVelocity[2]));
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
    b3.b3Body_GetAngularVelocity(angular, cube);
    peakAngular = Math.max(peakAngular, length3(angular));
  }

  return {
    drift: Math.max(Math.abs(maxX - startX), Math.abs(minX - startX)),
    maxSpeed,
    maxExternal,
    maxImpulse,
    peakAngular,
  };
}

function isolatedPushTrial(variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const cube = setup.box('dynamic', [0, 0.6, -0.3], [0.6, 0.6, 0.6], { density: 35 });
  const { character, tick, settle } = harness(setup, [0, 2.2, 2.8], variant);
  settle(120);
  character.reset([0, character.halfHeight + 0.02, 2.8]);
  settle(20);
  let maxImpulse = 0;
  for (let i = 0; i < 120; i++) {
    tick({ moveForward: 1 });
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
  }
  const position = [0, 0, 0];
  b3.b3Body_GetPosition(position, cube);
  return { boxZ: position[2], maxImpulse };
}

function reverseRamTrial(variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const cube = setup.box('dynamic', [2.0, 0.6, 0], [0.6, 0.6, 0.6], { density: 35 });
  const mass = b3.b3Body_GetMass(cube);
  const { character, tick, settle } = harness(setup, [0, characterHalfHeight() + 0.02, 0], variant);
  settle(20);
  const startX = character.position[0];
  b3.b3Body_ApplyLinearImpulse(cube, [-mass * 6.0, 0, 0], [2.0, 0.6, 0], true);
  let maxImpulse = 0;
  let maxExternal = 0;
  for (let i = 0; i < 90; i++) {
    tick();
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
    maxExternal = Math.max(maxExternal, Math.hypot(character.externalVelocity[0], character.externalVelocity[2]));
  }
  return { dx: character.position[0] - startX, maxImpulse, maxExternal };
}

function characterHalfHeight() {
  return 0.36 + 0.54;
}

function dynamicLandingTrial(variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  const slab = setup.box('dynamic', [0, 0.28, 0], [1.5, 0.28, 1.5], {
    density: 32,
    friction: 0.9,
    angularDamping: 0.2,
  });
  const { character, tick } = harness(setup, [0, 3.1, 0], variant);
  let maxImpulse = 0;
  let dynamicSupportFrames = 0;
  let landingSpeed = 0;
  for (let i = 0; i < 180; i++) {
    tick();
    maxImpulse = Math.max(maxImpulse, character.lastContactImpulse);
    if (character.currentSupport?.type === 'DYNAMIC') dynamicSupportFrames += 1;
    if (character.justLanded) landingSpeed = Math.max(landingSpeed, character.landingSpeed);
  }
  const slabPosition = [0, 0, 0];
  b3.b3Body_GetPosition(slabPosition, slab);
  return { maxImpulse, dynamicSupportFrames, landingSpeed, slabY: slabPosition[1] };
}

function staticTraversalTrial(variant) {
  const setup = makeWorld();
  setup.box('static', [0, -0.5, 0], [8, 0.5, 8]);
  for (let i = 0; i < 4; i++) {
    const top = 0.22 * (i + 1);
    setup.box('static', [-5, top * 0.5, 5.0 - i * 0.9], [0.7, top * 0.5, 0.45]);
  }
  setup.box('static', [-3, 0.26, 5.0], [0.7, 0.26, 0.45]);
  const { character, tick, settle } = harness(setup, [-5, characterHalfHeight() + 0.02, 6.15], variant);
  settle(20);
  let stairPeak = character.position[1];
  for (let i = 0; i < 110; i++) {
    tick({ moveForward: 1 });
    stairPeak = Math.max(stairPeak, character.position[1]);
    if (character.position[2] < 1.9) break;
  }
  const stairPassed = stairPeak >= character.halfHeight + 0.68 && character.position[2] < 1.9;

  character.reset([-3, character.halfHeight + 0.02, 6.15]);
  settle(20);
  let ledgeMinZ = character.position[2];
  let ledgePeakY = character.position[1];
  for (let i = 0; i < 70; i++) {
    tick({ moveForward: 1 });
    ledgeMinZ = Math.min(ledgeMinZ, character.position[2]);
    ledgePeakY = Math.max(ledgePeakY, character.position[1]);
  }
  const ledgeBlocked = ledgeMinZ >= 5.70 && ledgePeakY <= character.halfHeight + 0.20;
  return { stairPassed, stairPeak, ledgeBlocked, ledgeMinZ };
}

const variants = ['baseline', 'no-exchange', 'cross-axis-gate', 'approach-aligned'];
const results = [];
for (const variant of variants) {
  results.push({
    variant,
    edge074: edgeTrial(variant, 0.74),
    edge086: edgeTrial(variant, 0.86),
    push: isolatedPushTrial(variant),
    ram: reverseRamTrial(variant),
    landing: dynamicLandingTrial(variant),
    traversal: staticTraversalTrial(variant),
  });
}

console.log('E2.2 reciprocity decontamination falsifier (test harness only):');
for (const r of results) {
  console.log(
    `  ${r.variant}: edge=.74 ${r.edge074.drift.toFixed(2)}m/${r.edge074.maxSpeed.toFixed(2)}mps/${r.edge074.maxImpulse.toFixed(1)}Ns .86 ${r.edge086.drift.toFixed(2)}m/${r.edge086.maxSpeed.toFixed(2)}mps | push=${r.push.boxZ.toFixed(2)}m/${r.push.maxImpulse.toFixed(1)}Ns | ram=${r.ram.dx.toFixed(2)}m ext=${r.ram.maxExternal.toFixed(2)} imp=${r.ram.maxImpulse.toFixed(1)}Ns | land=${r.landing.dynamicSupportFrames}f/${r.landing.maxImpulse.toFixed(1)}Ns | stairs=${r.traversal.stairPassed ? 'PASS' : 'FAIL'} ledge=${r.traversal.ledgeBlocked ? 'PASS' : 'FAIL'}`,
  );
}

const baseline = results.find((r) => r.variant === 'baseline');
const none = results.find((r) => r.variant === 'no-exchange');
if (baseline.edge074.drift < 0.5) throw new Error(`E2.2 baseline failed to reproduce edge amplification: ${JSON.stringify(baseline.edge074)}`);
if (none.edge074.maxImpulse > 0.01 || none.ram.maxExternal > 0.1) {
  throw new Error(`E2.2 no-exchange control unexpectedly retained reciprocity: ${JSON.stringify(none)}`);
}
if (!baseline.traversal.stairPassed || !baseline.traversal.ledgeBlocked) {
  throw new Error(`E2.2 static traversal control invalid: ${JSON.stringify(baseline.traversal)}`);
}

for (const r of results.filter((entry) => entry.variant !== 'baseline' && entry.variant !== 'no-exchange')) {
  const edgeImproved = r.edge074.drift <= baseline.edge074.drift * 0.55;
  const pushRetained = r.push.boxZ <= -0.55 && r.push.maxImpulse >= baseline.push.maxImpulse * 0.55;
  const ramRetained = r.ram.dx <= -0.08 && r.ram.maxExternal >= 0.2;
  const landingRetained = r.landing.dynamicSupportFrames >= 5 && r.landing.maxImpulse > 0;
  const traversalRetained = r.traversal.stairPassed && r.traversal.ledgeBlocked;
  r.survivor = edgeImproved && pushRetained && ramRetained && landingRetained && traversalRetained;
  console.log(
    `  verdict ${r.variant}: edge=${edgeImproved ? 'PASS' : 'FAIL'} push=${pushRetained ? 'PASS' : 'FAIL'} reverse=${ramRetained ? 'PASS' : 'FAIL'} landing=${landingRetained ? 'PASS' : 'FAIL'} traversal=${traversalRetained ? 'PASS' : 'FAIL'} => ${r.survivor ? 'SURVIVOR' : 'REJECT'}`,
  );
}
