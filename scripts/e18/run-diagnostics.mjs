import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const outDirArg = process.argv.find((arg) => arg.startsWith('--out-dir='))?.slice(10);
const outDir = path.resolve(ROOT, outDirArg || 'e18-diagnostics');
fs.mkdirSync(outDir, { recursive: true });

const diagnostics = [
  {
    name: 'E18.0a current target-frame diagnostic',
    script: 'scripts/e18/e18-0a-target-frame-diagnostic.mjs',
    out: 'e18-0a-target-frame.json',
  },
  {
    name: 'E18.0b hold-frame physical diagnostic',
    script: 'scripts/e18/e18-0b-hold-frame-physical-diagnostic.mjs',
    out: 'e18-0b-hold-frame-physical.json',
  },
  {
    name: 'E18.0c camera-orbit hold diagnostic',
    script: 'scripts/e18/e18-0c-camera-orbit-hold-physical.mjs',
    out: 'e18-0c-camera-orbit-hold.json',
  },
  {
    name: 'E18.0d manipulation-intent contract',
    script: 'scripts/e18/e18-0d-intent-contract.mjs',
    out: 'e18-0d-intent-contract.json',
  },
  {
    name: 'E18.0e screen-delta geometry',
    script: 'scripts/e18/e18-0e-screen-delta-geometry.mjs',
    out: 'e18-0e-screen-delta-geometry.json',
  },
  {
    name: 'E18.0f transport-origin physical diagnostic',
    script: 'scripts/e18/e18-0f-transport-origin-physical-diagnostic.mjs',
    out: 'e18-0f-transport-origin-physical.json',
  },
  {
    name: 'E18.0g accepted-feedback transport diagnostic',
    script: 'scripts/e18/e18-0g-accepted-feedback-transport-diagnostic.mjs',
    out: 'e18-0g-accepted-feedback-transport.json',
  },
  {
    name: 'E18.0h headless intent pipeline diagnostic',
    script: 'scripts/e18/e18-0h-headless-intent-pipeline-diagnostic.mjs',
    out: 'e18-0h-headless-intent-pipeline.json',
  },
  {
    name: 'E18.0j carrier precompensation falsifier',
    script: 'scripts/e18/e18-0j-carrier-precompensation-falsifier.mjs',
    out: 'e18-0j-carrier-precompensation-falsifier.json',
  },
  {
    name: 'E18 P3.0a coupled-kernel diagnostic',
    script: 'scripts/e18/e18-p3-0a-coupled-kernel-diagnostic.mjs',
    out: 'e18-p3-0a-coupled-kernel.json',
  },
  {
    name: 'E18 P3.0b Box3D response diagnostic',
    script: 'scripts/e18/e18-p3-0b-box3d-response-diagnostic.mjs',
    out: 'e18-p3-0b-box3d-response.json',
  },
  {
    name: 'E18 P3.0c axis-control crucible',
    script: 'scripts/e18/e18-p3-0c-axis-control-crucible.mjs',
    out: 'e18-p3-0c-axis-control.json',
  },
  {
    name: 'E18 P3.0d authority and mass stress',
    script: 'scripts/e18/e18-p3-0d-authority-mass-stress.mjs',
    out: 'e18-p3-0d-authority-mass-stress.json',
  },
  {
    name: 'E18 P3.0e free-twist null-DOF audit',
    script: 'scripts/e18/e18-p3-0e-free-twist-audit.mjs',
    out: 'e18-p3-0e-free-twist-audit.json',
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

console.log(`\nE18 diagnostic suite complete: ${diagnostics.length} diagnostic(s) → ${outDir}`);
