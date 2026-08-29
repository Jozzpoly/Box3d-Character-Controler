import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';

const b3 = await Box3D();
const required = [
  'b3CreateWorld','b3World_Step','b3World_CollideMover','b3World_CastMover','b3SolvePlanes','b3ClipVector',
  'b3Body_GetInverseMass','b3Body_GetWorldInverseRotationalInertia','b3Body_GetWorldCenterOfMass','b3Body_GetAngularVelocity',
  'b3Body_ApplyLinearImpulse','b3Body_SetTargetTransform','b3World_OverlapAABB','b3Shape_GetType','b3Shape_GetHullVertices',
];
for (const name of required) if (typeof b3[name] !== 'function') throw new Error(`Missing required Box3D API: ${name}`);

const dt = 1 / 60;
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -18, 0];
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
const dynamicBox = box('dynamic', [0, 0.6, -0.3], [0.6, 0.6, 0.6], 35);
const movingPlatform = box('kinematic', [3, 0.25, 0], [1.5, 0.25, 1.5]);
const dynamicMass = b3.b3Body_GetMass(dynamicBox);
const character = new ControllerOwnedCharacter(b3, world, { startPosition: [0, 2.2, 2.8], gravity: 18, virtualMass: 80 });
const forward = [0, 0, -1];
const right = [1, 0, 0];

function tick(intent = {}, preWorld = null) {
  preWorld?.();
  character.preStep(dt, { forward, right, moveForward: 0, moveRight: 0, jump: false, sprint: false, ...intent });
  b3.b3World_Step(world, dt, 4);
  character.postStep(dt);
}

try {
  // 1. Static gravity/support and jump.
  for (let i = 0; i < 180; i++) tick();
  if (!character.currentSupport || character.currentSupport.type !== 'STATIC') throw new Error('Static landing/support failed');
  const landedY = character.position[1];
  let peakY = landedY;
  tick({ jump: true });
  for (let i = 0; i < 150; i++) { tick(); peakY = Math.max(peakY, character.position[1]); }
  if (peakY < landedY + 0.7 || !character.currentSupport) throw new Error(`Jump/return failed: landedY=${landedY.toFixed(2)} peakY=${peakY.toFixed(2)}`);

  // 2. Natural body contact pushes a dynamic object without a debug actuator.
  b3.b3Body_SetTransform(dynamicBox, [0, 0.6, -0.3], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(dynamicBox, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(dynamicBox, [0, 0, 0]);
  character.reset([0, character.halfHeight + 0.02, 2.8]);
  for (let i = 0; i < 20; i++) tick();
  let maxPushImpulse = 0;
  for (let i = 0; i < 120; i++) { tick({ moveForward: 1 }); maxPushImpulse = Math.max(maxPushImpulse, character.lastContactImpulse); }
  const boxPosition = [0, 0, 0];
  b3.b3Body_GetPosition(boxPosition, dynamicBox);
  if (boxPosition[2] > -0.55 || maxPushImpulse <= 0) throw new Error(`Natural push failed: boxZ=${boxPosition[2].toFixed(2)} impulse=${maxPushImpulse.toFixed(2)}`);

  // 3. Reverse reciprocity: a dynamic ram perturbs the controller-owned character.
  b3.b3Body_SetTransform(dynamicBox, [2.0, 0.6, 0], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(dynamicBox, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(dynamicBox, [0, 0, 0]);
  character.reset([0, character.halfHeight + 0.02, 0]);
  for (let i = 0; i < 20; i++) tick();
  const ramStartX = character.position[0];
  b3.b3Body_ApplyLinearImpulse(dynamicBox, [-dynamicMass * 6.0, 0, 0], [2.0, 0.6, 0], true);
  let ramImpulse = 0;
  for (let i = 0; i < 90; i++) { tick(); ramImpulse = Math.max(ramImpulse, character.lastContactImpulse); }
  const ramDisplacement = character.position[0] - ramStartX;
  if (ramDisplacement > -0.06 || ramImpulse <= 0) throw new Error(`Reverse reciprocity failed: dx=${ramDisplacement.toFixed(3)} impulse=${ramImpulse.toFixed(2)}`);

  // 4. Translational moving-support transport.
  b3.b3Body_SetTransform(movingPlatform, [3, 0.25, 0], [0, 0, 0, 1]);
  character.reset([3, 0.5 + character.halfHeight + 0.02, 0]);
  for (let i = 0; i < 30; i++) tick();
  if (character.currentSupport?.type !== 'KINEMATIC') throw new Error(`Kinematic support acquisition failed: ${character.currentSupport?.type ?? 'NONE'}`);
  const rideStartX = character.position[0];
  for (let i = 0; i < 60; i++) {
    const alpha = (i + 1) / 60;
    tick({}, () => b3.b3Body_SetTargetTransform(movingPlatform, { position: [3 + alpha, 0.25, 0], quaternion: [0, 0, 0, 1] }, dt, true));
  }
  const rideDx = character.position[0] - rideStartX;
  if (rideDx < 0.55 || rideDx > 1.45) throw new Error(`Moving support transport failed: dx=${rideDx.toFixed(3)}`);

  // 5. Angular support transport: an off-centre rider follows the real rotated contact anchor.
  b3.b3Body_SetTransform(movingPlatform, [3, 0.25, 0], [0, 0, 0, 1]);
  b3.b3Body_SetLinearVelocity(movingPlatform, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(movingPlatform, [0, 0, 0]);
  character.reset([3.8, 0.5 + character.halfHeight + 0.02, 0]);
  for (let i = 0; i < 30; i++) tick();
  if (character.currentSupport?.type !== 'KINEMATIC') throw new Error('Rotating support acquisition failed');
  const rotateStart = [...character.position];
  for (let i = 0; i < 60; i++) {
    const angle = ((i + 1) / 60) * (Math.PI / 4);
    const half = angle * 0.5;
    tick({}, () => b3.b3Body_SetTargetTransform(movingPlatform, { position: [3, 0.25, 0], quaternion: [0, Math.sin(half), 0, Math.cos(half)] }, dt, true));
  }
  const rotateDx = character.position[0] - rotateStart[0];
  const rotateDz = character.position[2] - rotateStart[2];
  const rotateTravel = Math.hypot(rotateDx, rotateDz);
  if (rotateTravel < 0.30 || Math.abs(rotateDz) < 0.20) throw new Error(`Angular support transport failed: dx=${rotateDx.toFixed(3)} dz=${rotateDz.toFixed(3)}`);

  console.log(`Foundation smoke PASS: push=${maxPushImpulse.toFixed(1)}Ns ramDx=${ramDisplacement.toFixed(2)}m rideDx=${rideDx.toFixed(2)}m rotate=${rotateTravel.toFixed(2)}m`);
} finally {
  b3.b3DestroyWorld(world);
}
