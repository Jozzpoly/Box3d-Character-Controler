import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const required = [
  'b3CreateWorld',
  'b3World_Step',
  'b3Body_GetWorldCenterOfMass',
  'b3Body_GetRotation',
  'b3Body_GetAngularVelocity',
  'b3Body_ApplyLinearImpulse',
  'b3Body_ApplyAngularImpulse',
  'b3Body_GetLocalRotationalInertia',
  'b3DefaultSphericalJointDef',
  'b3CreateSphericalJoint',
];
for (const name of required) {
  if (typeof b3[name] !== 'function') throw new Error(`Missing E3 angular API: ${name}`);
}

const dt = 1 / 60;
const substeps = 4;

function makeWorld(gravity = [0, 0, 0]) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = gravity;
  return b3.b3CreateWorld(def);
}

function makeBody(world, half = [0.3, 0.6, 0.2], density = 50) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, 1, 0];
  bd.enableSleep = false;
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = density;
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
  return body;
}

function angularXAfterPointImpulse({ leverArm = 0, impulse = 8 }) {
  const world = makeWorld();
  const body = makeBody(world);
  const com = [0, 0, 0];
  const omega = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(com, body);
  b3.b3Body_ApplyLinearImpulse(body, [0, 0, impulse], [com[0], com[1] + leverArm, com[2]], true);
  b3.b3World_Step(world, dt, substeps);
  b3.b3Body_GetAngularVelocity(omega, body);
  return omega[0];
}

const central = angularXAfterPointImpulse({ leverArm: 0, impulse: 8 });
const positive = angularXAfterPointImpulse({ leverArm: 0.25, impulse: 8 });
const mirrored = angularXAfterPointImpulse({ leverArm: -0.25, impulse: 8 });
const farther = angularXAfterPointImpulse({ leverArm: 0.50, impulse: 8 });

if (Math.abs(central) > 1e-4) throw new Error(`Central impulse created unexpected angular response: wx=${central}`);
if (!(positive > 0.05 && mirrored < -0.05)) throw new Error(`Lever-arm sign gate failed: +wx=${positive} mirrored=${mirrored}`);
if (Math.abs(positive + mirrored) > Math.abs(positive) * 0.08 + 1e-4) throw new Error(`Mirrored angular response is not symmetric enough: +${positive} / ${mirrored}`);
if (Math.abs(farther) < Math.abs(positive) * 1.7) throw new Error(`Larger lever arm did not materially increase angular response: near=${positive} far=${farther}`);

{
  const world = makeWorld();
  const body = makeBody(world);
  const omega = [0, 0, 0];
  b3.b3Body_ApplyAngularImpulse(body, [1.5, 0, 0], true);
  b3.b3World_Step(world, dt, substeps);
  b3.b3Body_GetAngularVelocity(omega, body);
  if (omega[0] < 0.05 || Math.abs(omega[1]) > 1e-4 || Math.abs(omega[2]) > 1e-4) throw new Error(`Direct angular impulse gate failed: omega=${omega.join(',')}`);
}

let pinError = 0;
let pinnedAngularSpeed = 0;
{
  const world = makeWorld();
  const anchorDef = b3.b3DefaultBodyDef();
  anchorDef.position = [0, 1, 0];
  const anchor = b3.b3CreateBody(world, anchorDef);
  const body = makeBody(world, [0.25, 0.45, 0.18], 40);

  const jointDef = b3.b3DefaultSphericalJointDef();
  jointDef.base.bodyIdA = anchor;
  jointDef.base.bodyIdB = body;
  jointDef.base.localFrameA = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  jointDef.base.localFrameB = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  b3.b3CreateSphericalJoint(world, jointDef);

  b3.b3Body_ApplyAngularImpulse(body, [2, 0, 0], true);
  for (let i = 0; i < 30; i++) b3.b3World_Step(world, dt, substeps);
  const pos = [0, 0, 0];
  const omega = [0, 0, 0];
  b3.b3Body_GetPosition(pos, body);
  b3.b3Body_GetAngularVelocity(omega, body);
  pinError = Math.hypot(pos[0], pos[1] - 1, pos[2]);
  pinnedAngularSpeed = Math.abs(omega[0]);
  if (pinError > 0.025) throw new Error(`Spherical anchor drifted too far: ${pinError}m`);
  if (pinnedAngularSpeed < 0.02) throw new Error(`Spherical joint unexpectedly suppressed angular motion: ${pinnedAngularSpeed}`);
}

console.log(`E3.0 angular substrate PASS: centralWx=${central.toExponential(2)} nearWx=${positive.toFixed(4)} mirroredWx=${mirrored.toFixed(4)} farWx=${farther.toFixed(4)} pinError=${pinError.toExponential(2)}m pinnedWx=${pinnedAngularSpeed.toFixed(4)}`);
