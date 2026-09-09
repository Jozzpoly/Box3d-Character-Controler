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
assert(plan.schema === 'box3d-character-controller-repo-cleanup-preliminary-plan-v3', `Unexpected plan schema ${plan.schema}`);
assert(plan.status === 'PRELIMINARY_NON_DESTRUCTIVE', `Unexpected plan status ${plan.status}`);
assert(plan.destructiveAuthorized === false, 'Qualification refuses a plan marked destructiveAuthorized=true');
assert(Array.isArray(plan.historicalArchiveRecords), 'Missing historicalArchiveRecords');
assert(Array.isArray(plan.historicalArchiveTipShas), 'Missing historicalArchiveTipShas');
assert(Array.isArray(plan.archiveAnchorParentShas), 'Missing archiveAnchorParentShas');
assert(plan.historicalArchiveRecords.length === plan.historicalArchiveBranchCount, 'Historical archive branch count invariant failed');
assert(plan.historicalArchiveTipShas.length === plan.historicalArchiveTipCount, 'Historical archive tip count invariant failed');
assert(new Set(plan.historicalArchiveTipShas).size === plan.historicalArchiveTipShas.length, 'Duplicate historical archive tip SHA detected');
assert(new Set(plan.archiveAnchorParentShas).size === plan.archiveAnchorParentShas.length, 'Duplicate archive anchor parent SHA detected');
assert(plan.archiveAnchorParentShas[0] === plan.canonicalSha, 'Canonical SHA must be the first archive anchor parent');
assert(!plan.historicalArchiveRecords.some((record) => record.ref === plan.activeCleanupRef), 'Active cleanup ref leaked into historical archive records');
assert(!plan.historicalArchiveTipShas.includes(plan.activeCleanupSha), 'Active cleanup tip leaked into historical archive tips');
if (plan.targetArchivePresent) {
  assert(!plan.historicalArchiveRecords.some((record) => record.ref === plan.targetArchiveRef), 'Archive ref leaked into historical archive records');
  assert(!plan.historicalArchiveTipShas.includes(plan.targetArchiveSha), 'Archive anchor leaked into historical archive tip set');
}

const expectedHistoricalRecords = plan.records
  .filter((record) => record.preliminaryDisposition === 'ARCHIVE_THEN_DELETE_CANDIDATE')
  .map((record) => ({ ref: record.ref, expectedSha: record.expectedSha }))
  .sort((a, b) => a.ref.localeCompare(b.ref));
assert(JSON.stringify(expectedHistoricalRecords) === JSON.stringify(plan.historicalArchiveRecords), 'Historical archive records do not equal candidate records');

for (const sha of plan.archiveAnchorParentShas) {
  const type = git(['cat-file', '-t', sha]);
  assert(type === 'commit', `Archive parent is not a commit: ${sha} (${type})`);
}
for (const record of plan.historicalArchiveRecords) {
  assert(plan.historicalArchiveTipShas.includes(record.expectedSha), `Historical record tip missing from archive set: ${record.ref}`);
}

const recoveryManifest = {
  schema: 'box3d-character-controller-pre-cleanup-recovery-manifest-v2',
  historicalArchiveFreezeSha256: plan.historicalArchiveFreezeSha256,
  repository: plan.repository,
  canonicalRef: plan.canonicalRef,
  canonicalSha: plan.canonicalSha,
  historicalBranchCount: plan.historicalArchiveBranchCount,
  historicalDistinctTipCount: plan.historicalArchiveTipCount,
  historicalArchiveTipShas: plan.historicalArchiveTipShas,
  archiveAnchorParentShas: plan.archiveAnchorParentShas,
  historicalBranches: plan.historicalArchiveRecords,
};
const manifestText = `${JSON.stringify(recoveryManifest, null, 2)}\n`;
const readmeText = `# Pre-cleanup repository archive\n\nThis synthetic archive tree preserves the exact historical branch-tip graph selected by the frozen cleanup plan for Jozzpoly/Box3d-Character-Controler.\n\nThe active cleanup helper branch is intentionally excluded from the historical freeze.\n\nThe machine-readable recovery contract is \`archive/recovery-manifest.json\`.\n\nThis qualification object is local-only and must not be confused with a final pushed archive ref.\n`;

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
for (const sha of plan.archiveAnchorParentShas) commitArgs.push('-p', sha);
const canonicalCommitDate = git(['show', '-s', '--format=%cI', plan.canonicalSha]);
const identityEnv = {
  GIT_AUTHOR_NAME: 'Repo Cleanup Archive Qualification',
  GIT_AUTHOR_EMAIL: 'repo-cleanup-qualification@invalid.local',
  GIT_COMMITTER_NAME: 'Repo Cleanup Archive Qualification',
  GIT_COMMITTER_EMAIL: 'repo-cleanup-qualification@invalid.local',
  GIT_AUTHOR_DATE: canonicalCommitDate,
  GIT_COMMITTER_DATE: canonicalCommitDate,
};
const anchorSha = git(commitArgs, {
  env: identityEnv,
  input: `QUALIFICATION ONLY: synthetic pre-cleanup archive anchor\n\nhistorical-archive-freeze-sha256: ${plan.historicalArchiveFreezeSha256}\n`,
});

const commitText = git(['cat-file', '-p', anchorSha]);
const actualParents = commitText
  .split('\n')
  .filter((line) => line.startsWith('parent '))
  .map((line) => line.slice('parent '.length));
assert(actualParents.length === plan.archiveAnchorParentShas.length, `Parent count ${actualParents.length} != ${plan.archiveAnchorParentShas.length}`);
assert(new Set(actualParents).size === actualParents.length, 'Anchor contains duplicate parents');
assert(JSON.stringify(actualParents) === JSON.stringify(plan.archiveAnchorParentShas), 'Anchor parent order/set does not equal frozen plan');

const reachabilityFailures = [];
for (const sha of plan.historicalArchiveTipShas) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', sha, anchorSha], { encoding: 'utf8' });
  if (result.status !== 0) reachabilityFailures.push(sha);
}
assert(reachabilityFailures.length === 0, `Archive reachability failed for: ${reachabilityFailures.join(', ')}`);
assert(spawnSync('git', ['merge-base', '--is-ancestor', plan.canonicalSha, anchorSha]).status === 0, 'Canonical SHA is not reachable from archive anchor');

const recoveredManifestText = git(['show', `${anchorSha}:archive/recovery-manifest.json`]);
const recoveredManifest = JSON.parse(recoveredManifestText);
assert(recoveredManifest.historicalArchiveFreezeSha256 === plan.historicalArchiveFreezeSha256, 'Recovered freeze hash mismatch');
assert(recoveredManifest.historicalBranchCount === plan.historicalArchiveBranchCount, 'Recovered historical branch count mismatch');
assert(recoveredManifest.historicalDistinctTipCount === plan.historicalArchiveTipCount, 'Recovered historical tip count mismatch');
assert(JSON.stringify(recoveredManifest.historicalBranches) === JSON.stringify(plan.historicalArchiveRecords), 'Recovered branch mapping mismatch');

const result = {
  schema: 'box3d-character-controller-archive-anchor-qualification-v3',
  status: 'PASS_LOCAL_ONLY_NO_REMOTE_REF',
  historicalArchiveFreezeSha256: plan.historicalArchiveFreezeSha256,
  livePlanSha256: plan.livePlanSha256,
  anchorSha,
  treeSha,
  manifestBlob,
  parentCount: actualParents.length,
  verifiedHistoricalReachableTipCount: plan.historicalArchiveTipCount,
  historicalBranchCount: plan.historicalArchiveBranchCount,
  canonicalSha: plan.canonicalSha,
  excludedActiveCleanupRef: plan.activeCleanupRef,
  excludedActiveCleanupSha: plan.activeCleanupSha,
  targetArchiveRef: plan.targetArchiveRef,
  targetArchivePresentAtQualification: plan.targetArchivePresent,
  targetArchiveShaAtQualification: plan.targetArchiveSha,
  remoteWritePerformed: false,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`ARCHIVE_QUALIFICATION status=${result.status}`);
console.log(`ARCHIVE_QUALIFICATION anchor=${anchorSha} tree=${treeSha}`);
console.log(`ARCHIVE_QUALIFICATION parents=${result.parentCount} historicalReachable=${result.verifiedHistoricalReachableTipCount} historicalBranches=${result.historicalBranchCount}`);
console.log(`ARCHIVE_QUALIFICATION historicalArchiveFreezeSha256=${plan.historicalArchiveFreezeSha256}`);
console.log(`ARCHIVE_QUALIFICATION excludedHelper=${plan.activeCleanupRef}@${plan.activeCleanupSha}`);
console.log(`ARCHIVE_QUALIFICATION targetArchive=${plan.targetArchivePresent ? plan.targetArchiveSha : 'ABSENT'} ref=${plan.targetArchiveRef}`);
