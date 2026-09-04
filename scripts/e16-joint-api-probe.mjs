import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const names = [
  'b3DefaultDistanceJointDef',
  'b3CreateDistanceJoint',
  'b3DefaultSphericalJointDef',
  'b3CreateSphericalJoint',
  'b3DefaultMotorJointDef',
  'b3CreateMotorJoint',
  'b3Joint_GetConstraintForce',
  'b3Joint_GetConstraintTorque',
  'b3Body_GetLocalPoint',
  'b3Body_GetWorldPoint',
  'b3DestroyJoint',
];

const surface = Object.fromEntries(names.map((name) => [name, typeof b3[name]]));
console.log(JSON.stringify(surface, null, 2));

const required = [
  'b3DefaultDistanceJointDef',
  'b3CreateDistanceJoint',
  'b3DefaultSphericalJointDef',
  'b3CreateSphericalJoint',
  'b3Joint_GetConstraintForce',
  'b3Body_GetLocalPoint',
  'b3DestroyJoint',
];
for (const name of required) {
  if (surface[name] !== 'function') throw new Error(`Required joint binding missing: ${name} (${surface[name]})`);
}

const distance = b3.b3DefaultDistanceJointDef();
const spherical = b3.b3DefaultSphericalJointDef();
console.log('distance keys', Object.keys(distance).sort().join(','));
console.log('distance.base keys', Object.keys(distance.base ?? {}).sort().join(','));
console.log('spherical keys', Object.keys(spherical).sort().join(','));
console.log('spherical.base keys', Object.keys(spherical.base ?? {}).sort().join(','));
