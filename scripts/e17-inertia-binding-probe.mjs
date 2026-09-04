import fs from 'node:fs';
import path from 'node:path';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

const wanted = [
  'b3Body_GetWorldInverseRotationalInertia',
  'b3Body_GetLocalRotationalInertia',
  'b3Body_GetRotation',
  'b3Body_GetWorldVector',
  'b3Body_GetWorldCenterOfMass',
  'b3Matrix3',
];

function collectTypeSignatures(root) {
  const matches = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
        const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
        lines.forEach((line, index) => {
          if (wanted.some((name) => line.includes(name))) {
            matches.push({ file: full, line: index + 1, text: line.trim() });
          }
        });
      }
    }
  }
  walk(root);
  return matches;
}

function describe(value) {
  if (value == null) return { type: String(value), value };
  const result = { type: typeof value, constructor: value?.constructor?.name ?? null };
  try { result.keys = Object.keys(value); } catch {}
  try { result.json = JSON.parse(JSON.stringify(value)); } catch (error) { result.jsonError = String(error); }
  return result;
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);
const bodyDef = b3.b3DefaultBodyDef();
bodyDef.type = b3.b3BodyType.b3_dynamicBody;
const body = b3.b3CreateBody(world, bodyDef);
const shapeDef = b3.b3DefaultShapeDef();
shapeDef.density = 80;
b3.b3CreateBoxShape(body, shapeDef, 0.35, 0.25, 0.20);

const packageRoot = path.resolve('node_modules/box3d.js');
const signatures = collectTypeSignatures(packageRoot);
const runtimeFunctions = Object.fromEntries(wanted.filter((name) => name.startsWith('b3Body_')).map((name) => [name, {
  type: typeof b3[name],
  arity: typeof b3[name] === 'function' ? b3[name].length : null,
}]));

const center = [0, 0, 0];
b3.b3Body_GetWorldCenterOfMass(center, body);
const rotation = [0, 0, 0, 0];
b3.b3Body_GetRotation(rotation, body);
const worldX = [0, 0, 0];
b3.b3Body_GetWorldVector(worldX, body, [1, 0, 0]);
const worldInverse = b3.b3Body_GetWorldInverseRotationalInertia(body);
const localInertia = b3.b3Body_GetLocalRotationalInertia(body);

const report = {
  schema: 'e17-inertia-binding-probe-v3',
  packageRoot,
  runtimeFunctions,
  signatures,
  samples: {
    center,
    rotation,
    worldX,
    worldInverse: describe(worldInverse),
    localInertia: describe(localInertia),
  },
  boundary: 'Read-only binding contract probe using only signatures confirmed from the exact installed box3d.js package. Runtime behavior is unchanged.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (signatures.length === 0) throw new Error('Could not locate relevant box3d.js TypeScript signatures');
if (!Array.isArray(worldInverse?.ex) || !Array.isArray(worldInverse?.ey) || !Array.isArray(worldInverse?.ez)) {
  throw new Error(`Unexpected b3Matrix3 shape: ${JSON.stringify(describe(worldInverse))}`);
}

b3.b3DestroyWorld(world);
