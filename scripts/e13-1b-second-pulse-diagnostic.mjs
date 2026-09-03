import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('./e13-1b-second-pulse-world-coupling.mjs', import.meta.url));
const tempPath = path.join(path.dirname(sourcePath), `.e13-1b-diagnostic-${process.pid}.mjs`);

let source = await fs.readFile(sourcePath, 'utf8');
const needle = `  if (reciprocal.releasedRecoil <= NUMERIC_POSITION_EPS) {\n    throw new Error(\`E13.1b reciprocal pulse2 release did not cross discriminating lower side dir=\${direction}\`);\n  }`;
const replacement = `  if (reciprocal.releasedRecoil <= NUMERIC_POSITION_EPS) {\n    console.log(\`E13.1b DIAGNOSTIC qualification miss dir=\${direction}: releasedRecoil=\${reciprocal.releasedRecoil.toExponential(9)}m <= paid position band \${NUMERIC_POSITION_EPS.toExponential(1)}m; continuing only to expose already-computed pulse2 telemetry.\`);\n  }`;

if (!source.includes(needle)) {
  throw new Error('E13.1b diagnostic could not find the exact predeclared qualification gate; refusing to alter any other code.');
}
source = source.replace(needle, replacement);

await fs.writeFile(tempPath, source, 'utf8');
try {
  await import(`${pathToFileURL(tempPath).href}?diagnostic=${Date.now()}`);
} finally {
  await fs.unlink(tempPath).catch(() => {});
}

console.log('E13.1b diagnostic wrapper complete: mechanics, thresholds, impulses, q, stop geometry, and solver sequence were unchanged; only the early qualification throw was converted to telemetry for this diagnostic execution.');
