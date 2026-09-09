import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateDeletePolicy } from './repo-cleanup-delete-policy.mjs';

const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const classificationArg = process.argv.find((arg) => arg.startsWith('--classification='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!manifestArg || !classificationArg || !outArg) {
  throw new Error('Usage: node repo-cleanup-delete-preflight.mjs --manifest=<manifest.json> --classification=<classification.json> --out=<result.json>');
}
const manifestPath = manifestArg.slice('--manifest='.length);
const classificationPath = classificationArg.slice('--classification='.length);
const outPath = outArg.slice('--out='.length);

const expected = {
  repository: process.env.GITHUB_REPOSITORY ?? 'Jozzpoly/Box3d-Character-Controler',
  canonicalRef: 'refs/heads/main',
  canonicalSha: process.env.EXPECTED_CANONICAL_SHA,
  helperRef: `refs/heads/${process.env.CLEANUP_ACTIVE_BRANCH}`,
  helperSha: process.env.EXPECTED_HELPER_SHA ?? process.env.GITHUB_SHA,
  archiveRef: `refs/heads/${process.env.CLEANUP_ARCHIVE_BRANCH}`,
  archiveSha: process.env.EXPECTED_ARCHIVE_SHA,
  freezeSha256: process.env.EXPECTED_FREEZE_SHA,
  historicalBranchCount: Number(process.env.EXPECTED_HISTORICAL_BRANCHES),
  historicalTipCount: Number(process.env.EXPECTED_HISTORICAL_TIPS),
  archiveParentCount: Number(process.env.EXPECTED_ANCHOR_PARENTS),
};

for (const [key, value] of Object.entries(expected)) {
  if (value === undefined || value === null || value === '' || (typeof value === 'number' && !Number.isFinite(value))) {
    throw new Error(`Missing/invalid expected value: ${key}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const classification = JSON.parse(fs.readFileSync(classificationPath, 'utf8'));
const policy = evaluateDeletePolicy({ manifest, classification, expected });

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result;
}

const gitBlockers = [];
const addGitBlocker = (code, detail = null) => gitBlockers.push({ code, detail });
const branchName = (ref) => ref.replace(/^refs\/heads\//, '');

const canonicalRemote = `refs/remotes/origin/${branchName(expected.canonicalRef)}`;
const archiveRemote = `refs/remotes/origin/${branchName(expected.archiveRef)}`;
const helperRemote = `refs/remotes/origin/${branchName(expected.helperRef)}`;
for (const [label, ref, sha] of [
  ['CANONICAL', canonicalRemote, expected.canonicalSha],
  ['ARCHIVE', archiveRemote, expected.archiveSha],
  ['HELPER', helperRemote, expected.helperSha],
]) {
  const result = git(['rev-parse', ref], { allowFailure: true });
  if (result.status !== 0) addGitBlocker(`${label}_REMOTE_REF_UNRESOLVED`, ref);
  else if (result.stdout.trim() !== sha) addGitBlocker(`${label}_REMOTE_SHA_MISMATCH`, { expected: sha, actual: result.stdout.trim() });
}

const archiveCommit = git(['cat-file', '-p', expected.archiveSha], { allowFailure: true });
if (archiveCommit.status !== 0) {
  addGitBlocker('ARCHIVE_COMMIT_UNREADABLE', expected.archiveSha);
} else {
  const parents = archiveCommit.stdout
    .split('\n')
    .filter((line) => line.startsWith('parent '))
    .map((line) => line.slice('parent '.length));
  if (JSON.stringify(parents) !== JSON.stringify(manifest.archiveAnchorParentShas)) {
    addGitBlocker('ARCHIVE_PARENT_SET_OR_ORDER_MISMATCH', { expected: manifest.archiveAnchorParentShas, actual: parents });
  }
  if (!archiveCommit.stdout.includes(`historical-archive-freeze-sha256: ${expected.freezeSha256}`)) {
    addGitBlocker('ARCHIVE_COMMIT_MESSAGE_FREEZE_MISMATCH');
  }
}

const manifestFromArchive = git(['show', `${expected.archiveSha}:archive/recovery-manifest.json`], { allowFailure: true });
if (manifestFromArchive.status !== 0) {
  addGitBlocker('ARCHIVE_MANIFEST_TREE_READ_FAILED');
} else {
  try {
    const parsed = JSON.parse(manifestFromArchive.stdout);
    if (JSON.stringify(parsed) !== JSON.stringify(manifest)) addGitBlocker('ARCHIVE_MANIFEST_INPUT_DIFFERS_FROM_TREE');
  } catch (error) {
    addGitBlocker('ARCHIVE_MANIFEST_TREE_PARSE_FAILED', String(error));
  }
}

const reachabilityFailures = [];
for (const sha of manifest.historicalArchiveTipShas ?? []) {
  const result = git(['merge-base', '--is-ancestor', sha, expected.archiveSha], { allowFailure: true });
  if (result.status !== 0) reachabilityFailures.push(sha);
}
if (reachabilityFailures.length) addGitBlocker('ARCHIVE_REACHABILITY_FAILURE', reachabilityFailures);

const blockers = [...policy.blockers, ...gitBlockers];
const result = {
  schema: 'box3d-character-controller-delete-preflight-v1',
  status: blockers.length === 0 ? 'PASS_DRY_RUN_NO_DELETIONS' : 'BLOCKED_DRY_RUN_NO_DELETIONS',
  expected,
  policy: {
    ...policy,
    blockers,
  },
  archiveReachabilityCheckedTipCount: manifest.historicalArchiveTipShas?.length ?? 0,
  destructiveActionsPerformed: 0,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`DELETE_PREFLIGHT status=${result.status}`);
console.log(`DELETE_PREFLIGHT ready=${policy.deleteReady.length} absent=${policy.alreadyAbsent.length} blockers=${blockers.length}`);
console.log(`DELETE_PREFLIGHT archiveReachability=${result.archiveReachabilityCheckedTipCount} deletions=0`);
if (blockers.length) {
  for (const item of blockers) console.log(`BLOCKER ${item.code} ${JSON.stringify(item.detail)}`);
  process.exitCode = 1;
}
