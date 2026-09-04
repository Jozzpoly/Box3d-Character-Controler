import fs from 'node:fs';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
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
const required = [
  'b3DefaultDistanceJointDef',
  'b3CreateDistanceJoint',
  'b3DefaultSphericalJointDef',
  'b3CreateSphericalJoint',
  'b3Joint_GetConstraintForce',
  'b3Body_GetLocalPoint',
  'b3DestroyJoint',
];

const distance = b3.b3DefaultDistanceJointDef();
const spherical = b3.b3DefaultSphericalJointDef();
const report = {
  schema: 'e16-joint-binding-surface-v1',
  surface,
  distance: {
    keys: Object.keys(distance).sort(),
    baseKeys: Object.keys(distance.base ?? {}).sort(),
    defaults: distance,
  },
  spherical: {
    keys: Object.keys(spherical).sort(),
    baseKeys: Object.keys(spherical.base ?? {}).sort(),
    defaults: spherical,
  },
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

for (const name of required) {
  if (surface[name] !== 'function') throw new Error(`Required joint binding missing: ${name} (${surface[name]})`);
}
