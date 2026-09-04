import fs from 'node:fs';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

const world = b3.b3CreateWorld(b3.b3DefaultWorldDef());
const bodyDef = b3.b3DefaultBodyDef();
bodyDef.type = b3.b3BodyType.b3_dynamicBody;
const body = b3.b3CreateBody(world, bodyDef);
const shapeDef = b3.b3DefaultShapeDef();
shapeDef.density = 80;
b3.b3CreateBoxShape(body, shapeDef, 0.35, 0.25, 0.20);

function describe(value) {
  if (value == null) return { type: String(value), value };
  const result = { type: typeof value, constructor: value?.constructor?.name ?? null };
  try { result.keys = Object.keys(value); } catch {}
  try { result.json = JSON.parse(JSON.stringify(value)); } catch (error) { result.jsonError = String(error); }
  for (const key of ['cx', 'cy', 'cz', 'ex', 'ey', 'ez', 'x', 'y', 'z', 'v', 's']) {
    if (key in Object(value)) {
      try { result[key] = value[key]; } catch {}
    }
  }
  return result;
}

const worldInverse = b3.b3Body_GetWorldInverseRotationalInertia(body);
const localInertia = b3.b3Body_GetLocalRotationalInertia(body);
const rotation = typeof b3.b3Body_GetRotation === 'function' ? b3.b3Body_GetRotation(body) : null;

const worldVectorOut = [0, 0, 0];
let worldVectorCall = null;
if (typeof b3.b3Body_GetWorldVector === 'function') {
  try {
    const returned = b3.b3Body_GetWorldVector(worldVectorOut, body, [1, 0, 0]);
    worldVectorCall = { convention: 'out-first', returned: describe(returned), out: worldVectorOut };
  } catch (error) {
    try {
      const returned = b3.b3Body_GetWorldVector(body, [1, 0, 0]);
      worldVectorCall = { convention: 'return-value', returned: describe(returned) };
    } catch (secondError) {
      worldVectorCall = { firstError: String(error), secondError: String(secondError) };
    }
  }
}

const report = {
  schema: 'e17-inertia-binding-probe-v1',
  functions: {
    getWorldInverseRotationalInertia: typeof b3.b3Body_GetWorldInverseRotationalInertia,
    getLocalRotationalInertia: typeof b3.b3Body_GetLocalRotationalInertia,
    getRotation: typeof b3.b3Body_GetRotation,
    getWorldVector: typeof b3.b3Body_GetWorldVector,
  },
  worldInverse: describe(worldInverse),
  localInertia: describe(localInertia),
  rotation: describe(rotation),
  worldVectorCall,
  boundary: 'Binding-shape probe only. No runtime behavior or physics parameters are changed.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
b3.b3DestroyWorld(world);
