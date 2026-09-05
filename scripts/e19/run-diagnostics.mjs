import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const outDirArg = process.argv.find((arg) => arg.startsWith('--out-dir='))?.slice(10);
const outDir = path.resolve(ROOT, outDirArg || 'e19-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

const diagnostics = [
  {
    name: 'E19.0a unified static/dynamic relative-grip algebra',
    script: 'scripts/e19/e19-0a-unified-relative-grip-kernel.mjs',
    out: 'e19-0a-unified-relative-grip-kernel.json',
  },
  {
    name: 'E19.0b Box3D + virtual-player impulse response',
    script: 'scripts/e19/e19-0b-box3d-virtual-player-response.mjs',
    out: 'e19-0b-box3d-virtual-player-response.json',
  },
  {
    name: 'E19.0c static-grip gravity capacity',
    script: 'scripts/e19/e19-0c-static-grip-gravity-capacity.mjs',
    out: 'e19-0c-static-grip-gravity-capacity.json',
  },
  {
    name: 'E19.0d direct Donor static-grip bridge',
    script: 'scripts/e19/e19-0d-donor-static-grip-bridge.mjs',
    out: 'e19-0d-donor-static-grip-bridge.json',
  },
  {
    name: 'E19.0e grip-scoped Donor vertical constraint policy',
    script: 'scripts/e19/e19-0e-grip-aware-donor-vertical-constraint.mjs',
    out: 'e19-0e-grip-aware-donor-vertical-constraint.json',
  },
  {
    name: 'E19.0f dynamic/mixed multi-frame Donor reciprocity',
    script: 'scripts/e19/e19-0f-dynamic-mixed-donor-reciprocity.mjs',
    out: 'e19-0f-dynamic-mixed-donor-reciprocity.json',
  },
  {
    name: 'E19.0f2 braced blocked impossible task',
    script: 'scripts/e19/e19-0f2-braced-blocked-impossible-task.mjs',
    out: 'e19-0f2-braced-blocked-impossible-task.json',
  },
  {
    name: 'E19.1a contact-qualified latch descriptors',
    script: 'scripts/e19/e19-1a-contact-qualified-latch-descriptors.mjs',
    out: 'e19-1a-contact-qualified-latch-descriptors.json',
  },
  {
    name: 'E19.1b intent-assisted contact ranking',
    script: 'scripts/e19/e19-1b-intent-assisted-contact-ranking.mjs',
    out: 'e19-1b-intent-assisted-contact-ranking.json',
  },
  {
    name: 'E19.1c contact-earned live grip bridge',
    script: 'scripts/e19/e19-1c-contact-earned-live-grip-bridge.mjs',
    out: 'e19-1c-contact-earned-live-grip-bridge.json',
  },
  {
    name: 'E19.1d non-impulsive swept reach',
    script: 'scripts/e19/e19-1d-nonimpulsive-swept-reach.mjs',
    out: 'e19-1d-nonimpulsive-swept-reach.json',
  },
];

for (const diagnostic of diagnostics) {
  const scriptPath = path.join(ROOT, diagnostic.script);
  const outPath = path.join(outDir, diagnostic.out);
  console.log(`\n=== ${diagnostic.name} ===`);
  const result = spawnSync(process.execPath, [scriptPath, `--out=${outPath}`], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nE19 diagnostic suite complete: ${diagnostics.length} diagnostic(s) -> ${outDir}`);
