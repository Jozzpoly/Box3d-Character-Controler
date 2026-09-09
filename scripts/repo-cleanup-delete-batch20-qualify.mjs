import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!outArg) throw new Error('Usage: node repo-cleanup-delete-batch20-qualify.mjs --out=<result.json>');
const outPath = outArg.slice('--out='.length);

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
    input: options.input,
  });
}
function git(args, { allowFailure = false } = {}) {
  const result = run('git', args);
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function remoteSha(remote, ref) {
  const result = git(['ls-remote', '--heads', remote, ref]);
  const text = result.stdout.trim();
  if (!text) return null;
  const [sha, actualRef] = text.split('\t');
  assert(actualRef === ref, `Unexpected remote ref ${actualRef}`);
  return sha;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-cleanup-batch20-'));
const remote = path.join(tmp, 'remote.git');
assert(git(['init', '--bare', remote]).status === 0, 'Failed to initialize disposable bare remote');

const canonicalSha = git(['rev-parse', 'refs/remotes/origin/main']).stdout.trim();
const helperSha = git(['rev-parse', 'HEAD']).stdout.trim();
const archiveSha = git(['rev-parse', 'refs/remotes/origin/archive/pre-cleanup-2026-09-09-dca388f4']).stdout.trim();
const candidateSha = git(['rev-parse', 'HEAD^']).stdout.trim();
const alternateSha = canonicalSha !== candidateSha ? canonicalSha : git(['rev-parse', 'HEAD^^']).stdout.trim();

const canonicalRef = 'refs/heads/main';
const helperRef = 'refs/heads/fixture/helper';
const archiveRef = 'refs/heads/fixture/archive';
const candidateRefs = Array.from({ length: 20 }, (_, i) => `refs/heads/fixture/batch20-${String(i + 1).padStart(2, '0')}`);

for (const [sha, ref] of [[canonicalSha, canonicalRef], [helperSha, helperRef], [archiveSha, archiveRef]]) {
  const pushed = git(['push', remote, `${sha}:${ref}`], { allowFailure: true });
  assert(pushed.status === 0, `Fixture push failed ${ref}: ${pushed.stderr || pushed.stdout}`);
}
for (const ref of candidateRefs) {
  const pushed = git(['push', remote, `${candidateSha}:${ref}`], { allowFailure: true });
  assert(pushed.status === 0, `Candidate fixture push failed ${ref}: ${pushed.stderr || pushed.stdout}`);
}

const freezeSha256 = 'fixture-batch20-freeze';
const authorization = `DELETE_FROZEN_REFS:${freezeSha256}:${archiveSha}`;
const makePreflight = () => ({
  schema: 'box3d-character-controller-delete-preflight-v1',
  status: 'PASS_DRY_RUN_NO_DELETIONS',
  expected: {
    canonicalRef,
    canonicalSha,
    helperRef,
    helperSha,
    archiveRef,
    archiveSha,
    freezeSha256,
  },
  policy: {
    blockers: [],
    hardDenyRefs: [canonicalRef, helperRef, archiveRef],
    deleteReady: candidateRefs.map((ref) => ({ ref, expectedSha: candidateSha, proofClass: 'ANCESTOR_OF_CANONICAL' })),
    alreadyAbsent: [],
  },
  destructiveActionsPerformed: 0,
});

function invokeApply(name) {
  const preflightFile = path.join(tmp, `${name}-preflight.json`);
  const batchFile = path.join(tmp, `${name}-batch.json`);
  const resultFile = path.join(tmp, `${name}-result.json`);
  writeJson(preflightFile, makePreflight());
  writeJson(batchFile, candidateRefs);
  const proc = run('node', [
    'scripts/repo-cleanup-delete-apply.mjs',
    `--preflight=${preflightFile}`,
    `--batch=${batchFile}`,
    `--out=${resultFile}`,
    `--remote=${remote}`,
    '--execute',
  ], {
    env: {
      CLEANUP_DELETE_AUTHORIZATION: authorization,
      CLEANUP_MAX_DELETE_BATCH: '20',
    },
  });
  return {
    proc,
    result: fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : null,
  };
}

const cases = [];

// Full production-sized batch succeeds as one atomic leased transaction.
let attempt = invokeApply('exact-batch20');
assert(attempt.proc.status === 0, `20-ref exact delete failed: ${attempt.proc.stderr || attempt.proc.stdout}`);
assert(attempt.result?.status === 'PASS_BOUNDED_ATOMIC_DELETE', '20-ref exact delete missing PASS result');
assert(attempt.result.deletedRefs.length === 20, `Expected 20 deleted refs, got ${attempt.result?.deletedRefs?.length}`);
for (const ref of candidateRefs) assert(remoteSha(remote, ref) === null, `20-ref exact delete left ${ref}`);
assert(remoteSha(remote, canonicalRef) === canonicalSha, 'Canonical changed during 20-ref delete');
assert(remoteSha(remote, archiveRef) === archiveSha, 'Archive changed during 20-ref delete');
assert(remoteSha(remote, helperRef) === helperSha, 'Helper changed during 20-ref delete');
cases.push({ name: 'exact-20-ref-leased-atomic-delete', status: 'PASS' });

// Restore the batch and move one ref behind a stale expected SHA.
for (const ref of candidateRefs) {
  const pushed = git(['push', remote, `${candidateSha}:${ref}`], { allowFailure: true });
  assert(pushed.status === 0, `Failed to restore ${ref}`);
}
const staleRef = candidateRefs[13];
assert(git(['push', '--force', remote, `${alternateSha}:${staleRef}`], { allowFailure: true }).status === 0, 'Failed to create stale 20-ref fixture');

// Executor precheck must stop before any remote delete.
attempt = invokeApply('stale-batch20-precheck');
assert(attempt.proc.status !== 0, '20-ref stale candidate unexpectedly passed executor precheck');
for (const ref of candidateRefs) {
  const expectedSha = ref === staleRef ? alternateSha : candidateSha;
  assert(remoteSha(remote, ref) === expectedSha, `Precheck partially changed ${ref}`);
}
cases.push({ name: '20-ref-stale-precheck-fails-before-delete', status: 'PASS' });

// Exact underlying transport must reject the whole 20-ref atomic transaction if one lease is stale.
const rawArgs = ['push', '--atomic'];
for (const ref of candidateRefs) rawArgs.push(`--force-with-lease=${ref}:${candidateSha}`);
rawArgs.push(remote);
for (const ref of candidateRefs) rawArgs.push(`:${ref}`);
const rawAtomic = git(rawArgs, { allowFailure: true });
assert(rawAtomic.status !== 0, 'Raw 20-ref atomic stale-lease delete unexpectedly succeeded');
for (const ref of candidateRefs) {
  const expectedSha = ref === staleRef ? alternateSha : candidateSha;
  assert(remoteSha(remote, ref) === expectedSha, `Atomic stale transaction partially changed ${ref}`);
}
cases.push({ name: '20-ref-atomic-stale-lease-rejects-entire-transaction', status: 'PASS' });

const report = {
  schema: 'box3d-character-controller-delete-batch20-qualification-v1',
  status: 'PASS_PRODUCTION_SIZED_BATCH_ON_DISPOSABLE_REMOTE',
  batchSize: 20,
  staleFixtureRef: staleRef,
  caseCount: cases.length,
  cases,
  productionRemoteTouched: false,
  destructiveProductionActionsPerformed: 0,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`DELETE_BATCH20_QUALIFICATION status=${report.status} batch=${report.batchSize} cases=${report.caseCount} productionDeletions=0`);
for (const item of cases) console.log(`BATCH20_CASE ${item.name} ${item.status}`);
