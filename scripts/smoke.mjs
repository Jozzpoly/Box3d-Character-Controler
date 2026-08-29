import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { quatFromAxisAngle, yawFromForwardXZ } from '../src/math.js';

const b3 = await Box3D();
const required = [
  'b3CreateWorld',
  'b3World_Step',
  'b3World_CollideMover',
  'b3World_CastMover',
  'b3SolvePlanes',
  'b3ClipVector',
  'b3Body_GetInverseMass',
  'b3Body_GetWorldInverseRotationalInertia',
  'b3Body_GetWorldCenterOfMass',
  'b3Body_GetAngularVelocity',
  'b3Body_ApplyLinearImpulse',
  'b3Body_SetTargetTransform',
];
for (const name of required) {
  if (typeof b3[name] !== 'function') throw new Error(`Missing required Box3D API: ${name}`);
}

function angleDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

const facingCases = [
  { name: 'forward', direction: [0, 0, -1], yaw: 0 },
  { name: 'right', direction: [1, 0, 0], yaw: -Math.PI / 2 },
  { name: 'back', direction: [0, 0, 1], yaw: Math.PI },
  { name: 'left', direction: [-1, 0, 0], yaw: Math.PI / 2 },
  { name: 'forward-right', direction: [1, 0, -1], yaw: -Math.PI / 4 },
  { name: 'forward-left', direction: [-1, 0, -1], yaw: Math.PI / 4 },
];
for (const test of facingCases) {
  const actual = yawFromForwardXZ(test.direction);
  if (Math.abs(angleDelta(actual, test.yaw)) > 1e-8) {
    throw new Error(`Facing convention failed for ${test.name}: got ${actual}, expected ${test.yaw}`);
  }
}

const dt = 1 / 60;
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -20, 0];
const world = b3.b3CreateWorld(worldDef);

function box(type, position, half, density = 30) {
  const bodyDef = b3.b3DefaultBodyDef();
  if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.8;
  if (type === 'dynamic') shapeDef.density = density;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

box('static', [0, -0.5, 0], [8, 0.5, 8]);

for (let i = 0; i < 4; i++) {
  const top = 0.22 * (i + 1);
  box('static', [-5, top * 0.5, 5.0 - i * 0.9], [0.7, top * 0.5, 0.45]);
}
box('static', [-3, 0.26, 5.0], [0.7, 0.26, 0.45]);
const lowDynamic = box('dynamic', [-1, 0.10, 5.0], [0.45, 0.10, 0.45], 28);

const dynamicBox = box('dynamic', [0, 0.6, -0.3], [0.6, 0.6, 0.6], 35);
const movingPlatform = box('kinematic', [3, 0.25, 0], [1.5, 0.25, 1.5]);
const dynamicMass = b3.b3Body_GetMass(dynamicBox);

const character = new ControllerOwnedCharacter(b3, world, {
  startPosition: [0, 2.2, 2.8],
  gravity: 20,
  virtualMass: 80,
});
const forward = [0, 0, -1];
const right = [1, 0, 0];

function tick(intent = {}, preWorld = null) {
  preWorld?.();
  character.preStep(dt, {
    forward,
    right,
    moveForward: 0,
    moveRight: 0,
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...intent,
  });
  b3.b3World_Step(world, dt, 4);
  character.postStep(dt);
}

function settle(frames = 180) {
  for (let i = 0; i < frames; i++) tick();
}

try {
  settle();
  if (!character.currentSupport || character.currentSupport.type !== 'STATIC') {
    throw new Error('Static landing/support failed');
  }

  const landedY = character.position[1];
  let fullPeak = landedY;
  tick({ jump: true, jumpHeld: true });
  for (let i = 0; i < 150; i++) {
    tick({ jumpHeld: i < 18 });
    fullPeak = Math.max(fullPeak, character.position[1]);
  }
  if (fullPeak < landedY + 0.8 || !character.currentSupport) {
    throw new Error(
      `Full jump/return failed: landedY=${landedY.toFixed(2)} peak=${fullPeak.toFixed(2)}`,
    );
  }

  character.reset([0, character.halfHeight + 0.02, 2.8]);
  settle(30);
  const shortBase = character.position[1];
  let shortPeak = shortBase;
  tick({ jump: true, jumpHeld: true });
  for (let i = 0; i < 120; i++) {
    tick({ jumpHeld: false });
    shortPeak = Math.max(shortPeak, character.position[1]);
  }
  if (!(shortPeak < fullPeak - 0.15)) {
    throw new Error(
      `Jump release shaping failed: full=${fullPeak.toFixed(2)} short=${shortPeak.toFixed(2)}`,
    );
  }

  character.reset([0, character.halfHeight + 0.62, 5.2]);
  let bufferedPressed = false;
  let bufferedLaunch = false;
  for (let i = 0; i < 120; i++) {
    const approaching =
      !bufferedPressed &&
      !character.currentSupport &&
      character.velocity[1] < 0 &&
      character.position[1] < character.halfHeight + 0.20;
    tick({ jump: approaching, jumpHeld: approaching });
    if (approaching) bufferedPressed = true;
    if (
      bufferedPressed &&
      character.velocity[1] > 4.0 &&
      character.position[1] > character.halfHeight + 0.08
    ) {
      bufferedLaunch = true;
      break;
    }
  }
  if (!bufferedPressed || !bufferedLaunch) {
    throw new Error(`Jump buffer failed: pressed=${bufferedPressed} launch=${bufferedLaunch}`);
  }

  character.reset([-5, character.halfHeight + 0.02, 6.15]);
  settle(20);
  let stairPeak = character.position[1];
  for (let i = 0; i < 110; i++) {
    tick({ moveForward: 1 });
    stairPeak = Math.max(stairPeak, character.position[1]);
    if (character.position[2] < 1.9) break;
  }
  if (stairPeak < character.halfHeight + 0.68 || character.position[2] >= 1.9) {
    throw new Error(
      `Static stair ascent failed: peakY=${stairPeak.toFixed(3)} z=${character.position[2].toFixed(3)}`,
    );
  }

  let descentPeakVertical = 0;
  for (let i = 0; i < 130; i++) {
    tick({ moveForward: -1 });
    descentPeakVertical = Math.max(descentPeakVertical, Math.abs(character.velocity[1]));
    if (character.position[2] > 6.0) break;
  }
  if (character.position[2] <= 5.7 || character.position[1] > character.halfHeight + 0.12) {
    throw new Error(
      `Static stair descent failed: y=${character.position[1].toFixed(3)} z=${character.position[2].toFixed(3)}`,
    );
  }

  character.reset([-3, character.halfHeight + 0.02, 6.15]);
  settle(20);
  let ledgeMinZ = character.position[2];
  for (let i = 0; i < 70; i++) {
    tick({ moveForward: 1 });
    ledgeMinZ = Math.min(ledgeMinZ, character.position[2]);
  }
  if (ledgeMinZ < 5.70) {
    throw new Error(`High ledge boundary failed: minZ=${ledgeMinZ.toFixed(3)}`);
  }

  b3.b3Body_SetTransform(lowDynamic, [-1, 0.10, 5.0], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(lowDynamic, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(lowDynamic, [0, 0, 0]);
  character.reset([-1, character.halfHeight + 0.02, 6.15]);
  settle(20);
  let lowPushImpulse = 0;
  for (let i = 0; i < 70; i++) {
    tick({ moveForward: 1 });
    lowPushImpulse = Math.max(lowPushImpulse, character.lastContactImpulse);
  }
  const lowDynamicPosition = [0, 0, 0];
  b3.b3Body_GetPosition(lowDynamicPosition, lowDynamic);
  if (lowDynamicPosition[2] > 4.75 || lowPushImpulse <= 0) {
    throw new Error(
      `Dynamic prop preservation failed: z=${lowDynamicPosition[2].toFixed(3)} impulse=${lowPushImpulse.toFixed(2)}`,
    );
  }

  b3.b3Body_SetTransform(dynamicBox, [0, 0.6, -0.3], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(dynamicBox, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(dynamicBox, [0, 0, 0]);
  character.reset([0, character.halfHeight + 0.02, 2.8]);
  settle(20);
  let maxPushImpulse = 0;
  for (let i = 0; i < 120; i++) {
    tick({ moveForward: 1 });
    maxPushImpulse = Math.max(maxPushImpulse, character.lastContactImpulse);
  }
  const boxPosition = [0, 0, 0];
  b3.b3Body_GetPosition(boxPosition, dynamicBox);
  if (boxPosition[2] > -0.55 || maxPushImpulse <= 0) {
    throw new Error(
      `Natural push failed: boxZ=${boxPosition[2].toFixed(2)} impulse=${maxPushImpulse.toFixed(2)}`,
    );
  }

  b3.b3Body_SetTransform(dynamicBox, [2.0, 0.6, 0], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(dynamicBox, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(dynamicBox, [0, 0, 0]);
  character.reset([0, character.halfHeight + 0.02, 0]);
  settle(20);
  const ramStartX = character.position[0];
  b3.b3Body_ApplyLinearImpulse(dynamicBox, [-dynamicMass * 6.0, 0, 0], [2.0, 0.6, 0], true);
  let ramImpulse = 0;
  let maxExternal = 0;
  for (let i = 0; i < 90; i++) {
    tick();
    ramImpulse = Math.max(ramImpulse, character.lastContactImpulse);
    maxExternal = Math.max(maxExternal, character.telemetry().externalSpeed);
  }
  const ramDisplacement = character.position[0] - ramStartX;
  if (ramDisplacement > -0.08 || ramImpulse <= 0 || maxExternal < 0.2) {
    throw new Error(
      `Reverse reciprocity failed: dx=${ramDisplacement.toFixed(3)} impulse=${ramImpulse.toFixed(2)} external=${maxExternal.toFixed(2)}`,
    );
  }

  b3.b3Body_SetTransform(movingPlatform, [3, 0.25, 0], [0, 0, 0, 1]);
  character.reset([3, 0.5 + character.halfHeight + 0.02, 0]);
  settle(30);
  if (character.currentSupport?.type !== 'KINEMATIC') {
    throw new Error(`Kinematic support acquisition failed: ${character.currentSupport?.type ?? 'NONE'}`);
  }
  const rideStartX = character.position[0];
  for (let i = 0; i < 60; i++) {
    const alpha = (i + 1) / 60;
    tick({}, () =>
      b3.b3Body_SetTargetTransform(
        movingPlatform,
        { position: [3 + alpha, 0.25, 0], quaternion: [0, 0, 0, 1] },
        dt,
        true,
      ),
    );
  }
  const rideDx = character.position[0] - rideStartX;
  if (rideDx < 0.55 || rideDx > 1.45) {
    throw new Error(`Moving support transport failed: dx=${rideDx.toFixed(3)}`);
  }

  b3.b3Body_SetTransform(movingPlatform, [3, 0.25, 0], [0, 0, 0, 1]);
  character.reset([4.0, 0.5 + character.halfHeight + 0.02, 0]);
  settle(30);
  const rotateStart = [...character.position];
  for (let i = 0; i < 60; i++) {
    const angle = ((i + 1) / 60) * Math.PI / 4;
    tick({}, () =>
      b3.b3Body_SetTargetTransform(
        movingPlatform,
        { position: [3, 0.25, 0], quaternion: quatFromAxisAngle([0, 1, 0], angle) },
        dt,
        true,
      ),
    );
  }
  const rotateDistance = Math.hypot(
    character.position[0] - rotateStart[0],
    character.position[2] - rotateStart[2],
  );
  if (rotateDistance < 0.35) {
    throw new Error(`Angular support transport failed: distance=${rotateDistance.toFixed(3)}`);
  }

  console.log(
    `Foundation 02.1 smoke PASS: facing=${facingCases.length} stairPeak=${(stairPeak - character.halfHeight).toFixed(2)}m ledgeMinZ=${ledgeMinZ.toFixed(2)} lowPropZ=${lowDynamicPosition[2].toFixed(2)} fullJump=${(fullPeak - landedY).toFixed(2)}m shortJump=${(shortPeak - shortBase).toFixed(2)}m push=${maxPushImpulse.toFixed(1)}Ns ramDx=${ramDisplacement.toFixed(2)}m external=${maxExternal.toFixed(2)}m/s rideDx=${rideDx.toFixed(2)}m rotate=${rotateDistance.toFixed(2)}m descentV=${descentPeakVertical.toFixed(2)}m/s`,
  );
} finally {
  b3.b3DestroyWorld(world);
}
