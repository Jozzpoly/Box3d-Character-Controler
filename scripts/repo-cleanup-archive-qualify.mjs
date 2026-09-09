import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const planArg = process.argv.find((arg) => arg.startsWith('--plan='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!planArg || !outArg) {
  throw new Error('Usage: node repo-cleanup-archive-qualify.mjs --plan=<plan.json> --out=<qualification.json>');
}
const planPath = planArg.slice('--plan='.length);
const outPath = outArg.slice('--out='.length);

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
    input: options.input ?? undefined,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
assert(plan.schema === 'box3d-character-controller-repo-cleanup-preliminary-plan-v1', `Unexpected plan schema ${plan.schema}`);
assert(plan.status === 'PRELIMINARY_NON_DESTRUCTIVE', `Unexpected plan status ${plan.status}`);
assert(plan.destructiveAuthorized === false, 'Qualification refuses a plan marked destructiveAuthorized=true');
assert(Array.isArray(plan.archiveTipShas) && plan.archiveTipShas.length === plan.archiveTipCount, 'Archive tip count invariant failed');
assert(new Set(plan.archiveTipShas).size === plan.archiveTipShas.length, 'Duplicate archive tip SHA detected');
assert(plan.archiveTipShas.includes(plan.canonicalSha), 'Canonical SHA must be represented in universal archive tip set');

for (const sha of plan.archiveTipShas) {
  const type = git(['cat-file', '-t', sha]);
  assert(type === 'commit', `Archive tip is not a commit: ${sha} (${type})`);
}

const recoveryManifest = {
  schema: 'box3d-character-controller-pre-cleanup-recovery-manifest-v1',
  sourcePlanSha256: plan.planSha256,
  repository: plan.repository,
  canonicalRef: plan.canonicalRef,
  canonicalSha: plan.canonicalSha,
  capturedBranchCount: plan.records.length,
  distinctCapturedTipCount: plan.archiveTipShas.length,
  archiveTipShas: plan.archiveTipShas,
  branches: plan.records.map((record) => ({
    ref: record.ref,
    expectedSha: record.expectedSha,
    proofClass: record.proofClass,
    preliminaryDisposition: record.preliminaryDisposition,
  })),
};
const manifestText = `${JSON.stringify(recoveryManifest, null, 2)}\n`;
const readmeText = `# Pre-cleanup repository archive\n\nThis synthetic archive tree preserves the exact pre-cleanup branch-tip graph for Jozzpoly/Box3d-Character-Controler.\n\nThe machine-readable recovery contract is \`archive/recovery-manifest.json\`.\n\nThis qualification object is local-only and must not be confused with a final pushed archive ref.\n`;

const manifestBlob = git(['hash-object', '-w', '--stdin'], { input: manifestText });
const readmeBlob = git(['hash-object', '-w', '--stdin'], { input: readmeText });

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-cleanup-archive-'));
const indexPath = path.join(tmpDir, 'index');
const indexEnv = { GIT_INDEX_FILE: indexPath };
git(['read-tree', '--empty'], { env: indexEnv });
git(['update-index', '--add', '--cacheinfo', `100644,${readmeBlob},README.md`], { env: indexEnv });
git(['update-index', '--add', '--cacheinfo', `100644,${manifestBlob},archive/recovery-manifest.json`], { env: indexEnv });
const treeSha = git(['write-tree'], { env: indexEnv });

const commitArgs = ['commit-tree', treeSha];
for (const sha of plan.archiveTipShas) commitArgs.push('-p', sha);
const identityEnv = {
  GIT_AUTHOR_NAME: 'Repo Cleanup Archive Qualification',
  GIT_AUTHOR_EMAIL: 'repo-cleanup-qualification@invalid.local',
  GIT_COMMITTER_NAME: 'Repo Cleanup Archive Qualification',
  GIT_COMMITTER_EMAIL: 'repo-cleanup-qualification@invalid.local',
  GIT_AUTHOR_DATE: plan.generatedAt,
  GIT_COMMITTER_DATE: plan.generatedAt,
};
const anchorSha = git(commitArgs, {
  env: identityEnv,
  input: `QUALIFICATION ONLY: synthetic pre-cleanup archive anchor\n\nsource-plan-sha256: ${plan.planSha256}\n`,
});

const commitText = git(['cat-file', '-p', anchorSha]);
const actualParents = commitText
  .split('\n')
  .filter((line) => line.startsWith('parent '))
  .map((line) => line.slice('parent '.length));
assert(actualParents.length === plan.archiveTipShas.length, `Parent count ${actualParents.length} != ${plan.archiveTipShas.length}`);
assert(new Set(actualParents).size === actualParents.length, 'Anchor contains duplicate parents');
const expectedSorted = [...plan.archiveTipShas].sort();
const actualSorted = [...actualParents].sort();
assert(JSON.stringify(actualSorted) === JSON.stringify(expectedSorted), 'Anchor parent set does not equal plan archive tip set');

const reachabilityFailures = [];
for (const sha of plan.archiveTipShas) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', sha, anchorSha], { encoding: 'utf8' });
  if (result.status !== 0) reachabilityFailures.push(sha);
}
assert(reachabilityFailures.length === 0, `Archive reachability failed for: ${reachabilityFailures.join(', ')}`);

const recoveredManifestText = git(['show', `${anchorSha}:archive/recovery-manifest.json`]);
const recoveredManifest = JSON.parse(recoveredManifestText);
assert(recoveredManifest.sourcePlanSha256 === plan.planSha256, 'Manifest source plan hash mismatch after tree recovery');
assert(recoveredManifest.capturedBranchCount === plan.records.length, 'Recovered branch count mismatch');
assert(recoveredManifest.distinctCapturedTipCount === plan.archiveTipShas.length, 'Recovered distinct tip count mismatch');

const result = {
  schema: 'box3d-character-controller-archive-anchor-qualification-v1',
  status: 'PASS_LOCAL_ONLY_NO_REMOTE_REF',
  sourcePlanSha256: plan.planSha256,
  anchorSha,
  treeSha,
  manifestBlob,
  parentCount: actualParents.length,
  verifiedReachableTipCount: plan.archiveTipShas.length,
  capturedBranchCount: plan.records.length,
  remoteWritePerformed: false,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`ARCHIVE_QUALIFICATION status=${result.status}`);
console.log(`ARCHIVE_QUALIFICATION anchor=${anchorSha} tree=${treeSha}`);
console.log(`ARCHIVE_QUALIFICATION parents=${result.parentCount} reachable=${result.verifiedReachableTipCount} branches=${result.capturedBranchCount}`);
console.log(`ARCHIVE_QUALIFICATION planSha256=${plan.planSha256}`);
