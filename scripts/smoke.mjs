import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { quatFromAxisAngle } from '../src/math.js';

const b3 = await Box3D();
const required = ['b3CreateWorld','b3World_Step','b3World_CollideMover','b3World_CastMover','b3SolvePlanes','b3ClipVector','b3Body_GetInverseMass','b3Body_GetWorldInverseRotationalInertia','b3Body_GetWorldCenterOfMass','b3Body_GetAngularVelocity','b3Body_ApplyLinearImpulse','b3Body_SetTargetTransform'];
for (const name of required) if (typeof b3[name] !== 'function') throw new Error(`Missing required Box3D API: ${name}`);
const dt = 1 / 60;
const worldDef = b3.b3DefaultWorldDef(); worldDef.gravity = [0, -20, 0]; const world = b3.b3CreateWorld(worldDef);
function box(type, position, half, density = 30) {
  const bodyDef = b3.b3DefaultBodyDef(); if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody; if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody; bodyDef.position = [...position]; const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef(); shapeDef.baseMaterial.friction = 0.8; if (type === 'dynamic') shapeDef.density = density; b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]); return body;
}
box('static', [0, -0.5, 0], [8, 0.5, 8]);
const dynamicBox = box('dynamic', [0, 0.6, -0.3], [0.6, 0.6, 0.6], 35);
const movingPlatform = box('kinematic', [3, 0.25, 0], [1.5, 0.25, 1.5]);
const dynamicMass = b3.b3Body_GetMass(dynamicBox);
const character = new ControllerOwnedCharacter(b3, world, { startPosition: [0, 2.2, 2.8], gravity: 20, virtualMass: 80 });
const forward = [0, 0, -1]; const right = [1, 0, 0];
function tick(intent = {}, preWorld = null) { preWorld?.(); character.preStep(dt, { forward, right, moveForward: 0, moveRight: 0, jump: false, jumpHeld: false, sprint: false, ...intent }); b3.b3World_Step(world, dt, 4); character.postStep(dt); }
function settle(frames = 180) { for (let i = 0; i < frames; i++) tick(); }
try {
  settle();
  if (!character.currentSupport || character.currentSupport.type !== 'STATIC') throw new Error('Static landing/support failed');
  const landedY = character.position[1]; let fullPeak = landedY; tick({ jump: true, jumpHeld: true });
  for (let i = 0; i < 150; i++) { tick({ jumpHeld: i < 18 }); fullPeak = Math.max(fullPeak, character.position[1]); }
  if (fullPeak < landedY + 0.8 || !character.currentSupport) throw new Error(`Full jump/return failed: landedY=${landedY.toFixed(2)} peak=${fullPeak.toFixed(2)}`);
  character.reset([0, character.halfHeight + 0.02, 2.8]); settle(30); const shortBase = character.position[1]; let shortPeak = shortBase; tick({ jump: true, jumpHeld: true });
  for (let i = 0; i < 120; i++) { tick({ jumpHeld: false }); shortPeak = Math.max(shortPeak, character.position[1]); }
  if (!(shortPeak < fullPeak - 0.15)) throw new Error(`Jump release shaping failed: full=${fullPeak.toFixed(2)} short=${shortPeak.toFixed(2)}`);
  character.reset([0, character.halfHeight + 0.62, 5.2]); let bufferedPressed = false; let bufferedLaunch = false;
  for (let i = 0; i < 120; i++) { const approaching = !bufferedPressed && !character.currentSupport && character.velocity[1] < 0 && character.position[1] < character.halfHeight + 0.20; tick({ jump: approaching, jumpHeld: approaching }); if (approaching) bufferedPressed = true; if (bufferedPressed && character.velocity[1] > 4.0 && character.position[1] > character.halfHeight + 0.08) { bufferedLaunch = true; break; } }
  if (!bufferedPressed || !bufferedLaunch) throw new Error(`Jump buffer failed: pressed=${bufferedPressed} launch=${bufferedLaunch}`);
  b3.b3Body_SetTransform(dynamicBox, [0, 0.6, -0.3], [0, 0, 0, 1]); b3.b3Body_SetLinearVelocity(dynamicBox, [0, 0, 0]); b3.b3Body_SetAngularVelocity(dynamicBox, [0, 0, 0]); character.reset([0, character.halfHeight + 0.02, 2.8]); settle(20); let maxPushImpulse = 0;
  for (let i = 0; i < 120; i++) { tick({ moveForward: 1 }); maxPushImpulse = Math.max(maxPushImpulse, character.lastContactImpulse); }
  const boxPosition = [0, 0, 0]; b3.b3Body_GetPosition(boxPosition, dynamicBox); if (boxPosition[2] > -0.55 || maxPushImpulse <= 0) throw new Error(`Natural push failed: boxZ=${boxPosition[2].toFixed(2)} impulse=${maxPushImpulse.toFixed(2)}`);
  b3.b3Body_SetTransform(dynamicBox, [2.0, 0.6, 0], [0, 0, 0, 1]); b3.b3Body_SetLinearVelocity(dynamicBox, [0, 0, 0]); b3.b3Body_SetAngularVelocity(dynamicBox, [0, 0, 0]); character.reset([0, character.halfHeight + 0.02, 0]); settle(20); const ramStartX = character.position[0]; b3.b3Body_ApplyLinearImpulse(dynamicBox, [-dynamicMass * 6.0, 0, 0], [2.0, 0.6, 0], true); let ramImpulse = 0; let maxExternal = 0;
  for (let i = 0; i < 90; i++) { tick(); ramImpulse = Math.max(ramImpulse, character.lastContactImpulse); maxExternal = Math.max(maxExternal, character.telemetry().externalSpeed); }
  const ramDisplacement = character.position[0] - ramStartX; if (ramDisplacement > -0.08 || ramImpulse <= 0 || maxExternal < 0.2) throw new Error(`Reverse reciprocity failed: dx=${ramDisplacement.toFixed(3)} impulse=${ramImpulse.toFixed(2)} external=${maxExternal.toFixed(2)}`);
  b3.b3Body_SetTransform(movingPlatform, [3, 0.25, 0], [0, 0, 0, 1]); character.reset([3, 0.5 + character.halfHeight + 0.02, 0]); settle(30); if (character.currentSupport?.type !== 'KINEMATIC') throw new Error(`Kinematic support acquisition failed: ${character.currentSupport?.type ?? 'NONE'}`); const rideStartX = character.position[0];
  for (let i = 0; i < 60; i++) { const alpha = (i + 1) / 60; tick({}, () => b3.b3Body_SetTargetTransform(movingPlatform, { position: [3 + alpha, 0.25, 0], quaternion: [0, 0, 0, 1] }, dt, true)); }
  const rideDx = character.position[0] - rideStartX; if (rideDx < 0.55 || rideDx > 1.45) throw new Error(`Moving support transport failed: dx=${rideDx.toFixed(3)}`);
  b3.b3Body_SetTransform(movingPlatform, [3, 0.25, 0], [0, 0, 0, 1]); character.reset([4.0, 0.5 + character.halfHeight + 0.02, 0]); settle(30); const rotateStart = [...character.position];
  for (let i = 0; i < 60; i++) { const angle = ((i + 1) / 60) * Math.PI / 4; tick({}, () => b3.b3Body_SetTargetTransform(movingPlatform, { position: [3, 0.25, 0], quaternion: quatFromAxisAngle([0, 1, 0], angle) }, dt, true)); }
  const rotateDistance = Math.hypot(character.position[0] - rotateStart[0], character.position[2] - rotateStart[2]); if (rotateDistance < 0.35) throw new Error(`Angular support transport failed: distance=${rotateDistance.toFixed(3)}`);
  console.log(`Foundation 02 smoke PASS: fullJump=${(fullPeak - landedY).toFixed(2)}m shortJump=${(shortPeak - shortBase).toFixed(2)}m push=${maxPushImpulse.toFixed(1)}Ns ramDx=${ramDisplacement.toFixed(2)}m external=${maxExternal.toFixed(2)}m/s rideDx=${rideDx.toFixed(2)}m rotate=${rotateDistance.toFixed(2)}m`);
} finally { b3.b3DestroyWorld(world); }
