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
  'b3Body_GetWorldCenter',
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

const packageRoot = path.resolve('node_modules/box3d.js');
const signatures = collectTypeSignatures(packageRoot);
const runtimeFunctions = Object.fromEntries(wanted.map((name) => [name, {
  type: typeof b3[name],
  arity: typeof b3[name] === 'function' ? b3[name].length : null,
}]));

const report = {
  schema: 'e17-inertia-binding-probe-v2',
  packageRoot,
  runtimeFunctions,
  signatures,
  boundary: 'Read-only binding contract probe from the exact installed box3d.js package. No physics call is made through an uncertain signature and no runtime behavior is changed.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (signatures.length === 0) {
  throw new Error('Could not locate relevant box3d.js TypeScript signatures in installed package');
}
