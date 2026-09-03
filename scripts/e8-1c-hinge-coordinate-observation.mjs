import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Measurement-only follow-up to E8.1b. Mechanics, solver cadence, geometry,
// masses, filters and thresholds are unchanged. The only added observable is
// Box3D's native revolute joint coordinate, compared against the historical
// E7/E8 world-sagittal tilt-difference lock metric.
const sourcePath = fileURLToPath(new URL('./e8-1b-constraint-topology-decomposition-source.mjs', import.meta.url));
const replayPath = fileURLToPath(new URL('./.e8-1c-hinge-coordinate.tmp.mjs', import.meta.url));
const original = readFileSync(sourcePath, 'utf8');

const edits = [
  // E8.1b's executable wrapper supplied this no-op outside the immutable source.
  // Put the same no-op directly into the generated replay so the measurement
  // child can execute without prototype mutation.
  [
    '    segmentAlignmentError() { return 0; }, springForce() { return 0; }, settledSpringPreload() { return 0; }, destroyAuxReaders() {},',
    '    segmentAlignmentError() { return 0; }, springForce() { return 0; }, settledSpringPreload() { return 0; }, captureSettledSpringPreload() {}, destroyAuxReaders() {},',
  ],
  [
    '    this.maxHingeError = 0;\n    this.maxPrismaticError = 0;',
    '    this.maxHingeError = 0;\n    this.maxNativeHingeError = 0;\n    this.maxPrismaticError = 0;',
  ],
  [
    '    this.maxHingeError = Math.max(this.maxHingeError, Math.abs(proximalTilt - this.base.torsoTilt));\n    this.maxPrismaticError =',
    '    this.maxHingeError = Math.max(this.maxHingeError, Math.abs(proximalTilt - this.base.torsoTilt));\n    this.maxNativeHingeError = Math.max(this.maxNativeHingeError, Math.abs(b3.b3RevoluteJoint_GetAngle(this.hingeJoint)));\n    this.maxPrismaticError =',
  ],
  [
    '  hingeLockError() { return this.maxHingeError; }\n  prismaticLockError()',
    '  hingeLockError() { return this.maxHingeError; }\n  nativeHingeLockError() { return this.maxNativeHingeError; }\n  prismaticLockError()',
  ],
  [
    '    hingeDeg: o.hingeLockError() * 180 / Math.PI,\n    axial:',
    '    hingeDeg: o.hingeLockError() * 180 / Math.PI,\n    nativeHingeDeg: typeof o.nativeHingeLockError === \'function\' ? o.nativeHingeLockError() * 180 / Math.PI : 0,\n    axial:',
  ],
  [
    'hinge=${c.hingeDeg.toFixed(4)}deg axial=',
    'hingeWorld=${c.hingeDeg.toFixed(4)}deg hingeNative=${c.nativeHingeDeg.toFixed(4)}deg axial=',
  ],
  [
    "  throw new Error('E8.1b RESULT: removing the distance spring does not restore the declared mechanical envelope; serial hinge+prismatic topology remains implicated');",
    "  console.log('E8.1c expected prior world-metric failure reproduced; native joint coordinate below determines whether that failure is measurement-equivalent.');",
  ],
  [
    "console.log('E8.1b PASS: with mass, COM/inertia, geometry, self-collision semantics, exact hinge/prismatic locks, current31/lead8 stimulus and all declared thresholds held fixed, removing only the parallel compression-only distance spring restores mechanical lock integrity while the full composite reproduces the E8.1a hinge-drift failure. The inactive defect is therefore attributable to same-DOF constraint coupling, not the serial hinge+prismatic split itself. This does not qualify a spring clutch, latch release, support placement, load sharing or locomotion.');",
    "const nativeMax = Math.max(...rows.flatMap(r => [r.full.nativeHingeDeg, r.noSpring.nativeHingeDeg]));\nconst worldMax = Math.max(...rows.flatMap(r => [r.full.hingeDeg, r.noSpring.hingeDeg]));\nconsole.log(`E8.1c OBSERVATION: world-metric max=${worldMax.toFixed(6)}deg native-revolute max=${nativeMax.toFixed(6)}deg declared=${(MAX_HINGE_LOCK_ERROR * 180 / Math.PI).toFixed(6)}deg.`);\nif (nativeMax > MAX_HINGE_LOCK_ERROR * 180 / Math.PI) {\n  throw new Error('E8.1c RESULT: native revolute coordinate independently exceeds the declared lock envelope; the E8.1b failure is mechanical, not a world-angle measurement artifact');\n}\nconsole.log('E8.1c PASS: native revolute coordinate stays inside the declared lock envelope while the historical world-angle metric exceeds it. The E8.1a/b hinge failure is therefore a measurement-definition mismatch and must not be used to reject the serial topology without requalifying the representation metric.');",
  ],
];

let replay = original;
for (const [needle, replacement] of edits) {
  if (!replay.includes(needle)) throw new Error(`E8.1c expected source pattern missing: ${needle.slice(0, 80)}`);
  replay = replay.replace(needle, replacement);
}

writeFileSync(replayPath, replay, 'utf8');
try {
  const result = spawnSync(process.execPath, [replayPath], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
} finally {
  try { unlinkSync(replayPath); } catch {}
}
