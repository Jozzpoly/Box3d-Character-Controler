import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const SUITES = {
  research: [
    {
      name: 'Foundation / closure',
      scripts: [
        'scripts/smoke.mjs',
        'scripts/closure-smoke.mjs',
        'scripts/e2-smoke.mjs',
        'scripts/e2-playability-smoke.mjs',
      ],
    },
    {
      name: 'E2.1 localization',
      scripts: [
        'scripts/e2-1-localization.mjs',
        'scripts/e2-1-edge-authority.mjs',
        'scripts/e2-1-a-dynamic-decomposition.mjs',
      ],
    },
    {
      name: 'E2.2 reciprocity / momentum semantics',
      scripts: [
        'scripts/e2-2-reciprocity-falsifier.mjs',
        'scripts/e2-2-continuity-falsifier.mjs',
        'scripts/e2-2-survivor-falsifier.mjs',
        'scripts/e2-2-aprime-smoke.mjs',
        'scripts/e2-2b-momentum-persistence.mjs',
        'scripts/e2-2c0-residual-slide-reproduction.mjs',
        'scripts/e2-2c1-capture-noninterference.mjs',
        'scripts/e2-2c2-momentum-semantics.mjs',
      ],
    },
    {
      name: 'E2.3 constraint-velocity / A-triple-prime qualification',
      scripts: [
        'scripts/e2-3-momentum-preservation-boundary.mjs',
        'scripts/e2-3b-constraint-release-relevance.mjs',
        'scripts/e2-3c-constraint-velocity-policy.mjs',
        'scripts/e2-3c-intent-cap-policy.mjs',
        'scripts/e2-3c-moving-constraint-boundary.mjs',
        'scripts/e2-3d-baseline-fingerprint.mjs',
        'scripts/e2-3d-production-smoke.mjs',
        'scripts/e2-3d-oblique-constraint-smoke.mjs',
      ],
    },
    {
      name: 'E3.1 rotational embodiment / support semantics',
      scripts: [
        'scripts/e3-angular-substrate.mjs',
        'scripts/e3-1a-sagittal-balance.mjs',
        'scripts/e3-1b-balance-3d.mjs',
        'scripts/e3-1b-dynamic-ram.mjs',
        'scripts/e3-1d-support-dependence.mjs',
        'scripts/e3-1e-reaction-mass.mjs',
        'scripts/e3-1f-airborne-attitude.mjs',
        'scripts/e3-1g-support-contact-binding.mjs',
        'scripts/e3-1h-support-gated-ab.mjs',
        'scripts/e3-1i-support-transition-semantics.mjs',
        'scripts/e3-1j-physics-transition-relevance.mjs',
        'scripts/e3-1k-support-signal-policy.mjs',
      ],
    },
    {
      name: 'E3.2 bounded internal momentum',
      scripts: [
        'scripts/e3-2a-bounded-internal-momentum.mjs',
        'scripts/e3-2b-capacity-causality.mjs',
        'scripts/e3-2c-active-vs-passive-capacity.mjs',
        'scripts/e3-2e-joint-sign-calibration.mjs',
        'scripts/e3-2f-mirrored-capacity-boundary.mjs',
        'scripts/e3-2h-real-contact-mirror-decomposition.mjs',
        'scripts/e3-2i-mirrored-ecological-frontier.mjs',
        'scripts/e3-2j-internal-resource-phase-trace.mjs',
        'scripts/e3-2k-revolute-limit-reaction-signal.mjs',
        'scripts/e3-2l-actuator-representation-crucible.mjs',
        'scripts/e3-2m-strategy-sequencing-crucible.mjs',
        'scripts/e3-2n-solver-resolution-sensitivity.mjs',
      ],
    },
    {
      name: 'E4 locomotion-posture compatibility',
      scripts: [
        'scripts/e4-0-locomotion-acceleration-compatibility.mjs',
        'scripts/e4-1-acceleration-duration-decomposition.mjs',
        'scripts/e4-2-effective-up-lean-falsifier.mjs',
        'scripts/e4-3-static-prelean-feasibility.mjs',
        'scripts/e4-4-anticipatory-lean-lead.mjs',
        'scripts/e4-5-anticipatory-substrate-robustness.mjs',
        'scripts/e4-6-braking-posture-compatibility.mjs',
        'scripts/e4-7-braking-substrate-robustness.mjs',
      ],
    },
    {
      name: 'E5 translational authority placement',
      scripts: [
        'scripts/e5-0a-contact-load-calibration.mjs',
        'scripts/e5-0b-authority-placement-corrected.mjs',
        'scripts/e5-1-posture-load-recruitment.mjs',
        'scripts/e5-2-residual-authority-accounting.mjs',
      ],
    },
    {
      name: 'E6 bounded support-relative translation',
      scripts: [
        'scripts/e6-0a-prismatic-binding-calibration.mjs',
      ],
    },
  ],
  donor: [
    {
      name: 'Donor contract / equivalence / input',
      scripts: [
        'scripts/donor-contract-smoke.mjs',
        'scripts/donor-smoke.mjs',
        'scripts/donor-v1-smoke.mjs',
        'scripts/mobile-input-smoke.mjs',
      ],
    },
  ],
};

function fail(message) {
  console.error(`smoke-suite: ${message}`);
  process.exit(2);
}

const suiteName = process.argv[2];
const groups = SUITES[suiteName];
if (!groups) {
  fail(`expected one of: ${Object.keys(SUITES).join(', ')}`);
}

let scriptCount = 0;
const suiteStarted = Date.now();

for (const group of groups) {
  console.log(`\n=== ${group.name} ===`);
  for (const relativeScript of group.scripts) {
    scriptCount += 1;
    const started = Date.now();
    console.log(`\n→ ${relativeScript}`);

    const result = spawnSync(
      process.execPath,
      [path.join(ROOT, relativeScript)],
      {
        cwd: ROOT,
        stdio: 'inherit',
      },
    );

    if (result.error) {
      console.error(`Failed to launch ${relativeScript}:`, result.error);
      process.exit(1);
    }
    if (result.status !== 0) {
      console.error(`\n✗ ${relativeScript} failed with exit code ${result.status}`);
      process.exit(result.status ?? 1);
    }

    console.log(`✓ ${relativeScript} (${((Date.now() - started) / 1000).toFixed(2)}s)`);
  }
}

console.log(
  `\nsmoke-suite ${suiteName} PASS: ${scriptCount} scripts in ` +
  `${((Date.now() - suiteStarted) / 1000).toFixed(2)}s`,
);
