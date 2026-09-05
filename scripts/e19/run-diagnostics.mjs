import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const outDirArg = process.argv.find((arg) => arg.startsWith('--out-dir='))?.slice(10);
const outDir = path.resolve(ROOT, outDirArg || 'e19-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

const diagnostics = [];

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
