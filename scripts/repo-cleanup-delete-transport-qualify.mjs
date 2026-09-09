import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!outArg) throw new Error('Usage: node repo-cleanup-delete-transport-qualify.mjs --out=<result.json>');
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-cleanup-delete-transport-'));
const remote = path.join(tmp, 'remote.git');
assert(git(['init', '--bare', remote]).status === 0, 'Failed to initialize disposable bare remote');

const canonicalSha = git(['rev-parse', 'refs/remotes/origin/main']).stdout.trim();
const helperSha = git(['rev-parse', 'HEAD']).stdout.trim();
const archiveSha = git(['rev-parse', 'refs/remotes/origin/archive/pre-cleanup-2026-09-09-dca388f4']).stdout.trim();
const candidateASha = git(['rev-parse', 'HEAD^']).stdout.trim();
const candidateBSha = git(['rev-parse', 'HEAD^^']).stdout.trim();
const alternateSha = canonicalSha !== candidateBSha ? canonicalSha : git(['rev-parse', 'HEAD^^^']).stdout.trim();

const refs = {
  canonical: 'refs/heads/main',
  helper: 'refs/heads/fixture/helper',
  archive: 'refs/heads/fixture/archive',
  candidateA: 'refs/heads/fixture/candidate-a',
  candidateB: 'refs/heads/fixture/candidate-b',
};
for (const [sha, ref] of [
  [canonicalSha, refs.canonical],
  [helperSha, refs.helper],
  [archiveSha, refs.archive],
  [candidateASha, refs.candidateA],
  [candidateBSha, refs.candidateB],
]) {
  const pushed = git(['push', remote, `${sha}:${ref}`], { allowFailure: true });
  assert(pushed.status === 0, `Fixture push failed ${ref}: ${pushed.stderr || pushed.stdout}`);
}

const freezeSha256 = 'fixture-freeze-sha256';
const auth = `DELETE_FROZEN_REFS:${freezeSha256}:${archiveSha}`;
const makePreflight = ({ ready = [], absent = [] } = {}) => ({
  schema: 'box3d-character-controller-delete-preflight-v1',
  status: 'PASS_DRY_RUN_NO_DELETIONS',
  expected: {
    canonicalRef: refs.canonical,
    canonicalSha,
    helperRef: refs.helper,
    helperSha,
    archiveRef: refs.archive,
    archiveSha,
    freezeSha256,
  },
  policy: {
    blockers: [],
    hardDenyRefs: [refs.canonical, refs.helper, refs.archive],
    deleteReady: ready,
    alreadyAbsent: absent,
  },
  destructiveActionsPerformed: 0,
});

const invokeApply = ({ preflight, batch, name, maxBatch = 20 }) => {
  const preflightFile = path.join(tmp, `${name}-preflight.json`);
  const batchFile = path.join(tmp, `${name}-batch.json`);
  const resultFile = path.join(tmp, `${name}-result.json`);
  writeJson(preflightFile, preflight);
  writeJson(batchFile, batch);
  const result = run('node', [
    'scripts/repo-cleanup-delete-apply.mjs',
    `--preflight=${preflightFile}`,
    `--batch=${batchFile}`,
    `--out=${resultFile}`,
    `--remote=${remote}`,
    '--execute',
  ], {
    env: {
      CLEANUP_DELETE_AUTHORIZATION: auth,
      CLEANUP_MAX_DELETE_BATCH: String(maxBatch),
    },
  });
  return {
    process: result,
    result: fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : null,
  };
};

const cases = [];

// Exact leased two-ref delete must succeed atomically and preserve hard-deny refs.
let attempt = invokeApply({
  name: 'exact-two-ref',
  preflight: makePreflight({ ready: [
    { ref: refs.candidateA, expectedSha: candidateASha, proofClass: 'ANCESTOR_OF_CANONICAL' },
    { ref: refs.candidateB, expectedSha: candidateBSha, proofClass: 'DIVERGENT_UNIQUE' },
  ] }),
  batch: [refs.candidateA, refs.candidateB],
});
assert(attempt.process.status === 0, `Exact leased delete failed: ${attempt.process.stderr || attempt.process.stdout}`);
assert(attempt.result?.status === 'PASS_BOUNDED_ATOMIC_DELETE', 'Exact delete missing PASS result');
assert(remoteSha(remote, refs.candidateA) === null && remoteSha(remote, refs.candidateB) === null, 'Exact delete left candidate refs');
assert(remoteSha(remote, refs.canonical) === canonicalSha, 'Canonical changed during exact delete');
assert(remoteSha(remote, refs.archive) === archiveSha, 'Archive changed during exact delete');
assert(remoteSha(remote, refs.helper) === helperSha, 'Helper changed during exact delete');
cases.push({ name: 'exact-leased-atomic-delete', status: 'PASS' });

// Idempotent absent branch must be skipped without a push.
attempt = invokeApply({
  name: 'already-absent',
  preflight: makePreflight({ absent: [{ ref: refs.candidateA, expectedSha: candidateASha }] }),
  batch: [refs.candidateA],
});
assert(attempt.process.status === 0, `Already-absent retry failed: ${attempt.process.stderr || attempt.process.stdout}`);
assert(attempt.result?.pushPerformed === false && attempt.result?.skippedAlreadyAbsent?.length === 1, 'Already-absent retry was not a pure skip');
cases.push({ name: 'already-absent-idempotent-skip', status: 'PASS' });

// Recreate both candidates, then move B behind the stale expected SHA.
for (const [sha, ref] of [[candidateASha, refs.candidateA], [candidateBSha, refs.candidateB]]) {
  assert(git(['push', remote, `${sha}:${ref}`], { allowFailure: true }).status === 0, `Failed to recreate ${ref}`);
}
assert(git(['push', '--force', remote, `${alternateSha}:${refs.candidateB}`], { allowFailure: true }).status === 0, 'Failed to create stale-lease fixture');
const stalePreflight = makePreflight({ ready: [
  { ref: refs.candidateA, expectedSha: candidateASha, proofClass: 'ANCESTOR_OF_CANONICAL' },
  { ref: refs.candidateB, expectedSha: candidateBSha, proofClass: 'DIVERGENT_UNIQUE' },
] });
attempt = invokeApply({ name: 'stale-precheck', preflight: stalePreflight, batch: [refs.candidateA, refs.candidateB] });
assert(attempt.process.status !== 0, 'Stale candidate unexpectedly passed executor precheck');
assert(remoteSha(remote, refs.candidateA) === candidateASha, 'Candidate A was deleted despite stale B precheck');
assert(remoteSha(remote, refs.candidateB) === alternateSha, 'Moved candidate B changed during stale precheck');
cases.push({ name: 'stale-candidate-precheck-fails-before-delete', status: 'PASS' });

// Prove the exact atomic transport rejects a stale lease for the whole transaction.
const rawAtomic = git([
  'push', '--atomic',
  `--force-with-lease=${refs.candidateA}:${candidateASha}`,
  `--force-with-lease=${refs.candidateB}:${candidateBSha}`,
  remote,
  `:${refs.candidateA}`,
  `:${refs.candidateB}`,
], { allowFailure: true });
assert(rawAtomic.status !== 0, 'Raw atomic stale-lease delete unexpectedly succeeded');
assert(remoteSha(remote, refs.candidateA) === candidateASha, 'Atomic stale lease partially deleted candidate A');
assert(remoteSha(remote, refs.candidateB) === alternateSha, 'Atomic stale lease changed candidate B');
cases.push({ name: 'atomic-force-with-lease-rejects-stale-transaction', status: 'PASS' });

// Hard deny must fail before transport.
attempt = invokeApply({
  name: 'hard-deny',
  preflight: makePreflight({ ready: [{ ref: refs.canonical, expectedSha: canonicalSha, proofClass: 'CANONICAL' }] }),
  batch: [refs.canonical],
});
assert(attempt.process.status !== 0, 'Hard-deny ref unexpectedly accepted');
assert(remoteSha(remote, refs.canonical) === canonicalSha, 'Hard-deny canonical was changed');
cases.push({ name: 'hard-deny-ref-refused', status: 'PASS' });

// Reappeared branch cannot be accepted as an already-absent retry.
attempt = invokeApply({
  name: 'reappeared',
  preflight: makePreflight({ absent: [{ ref: refs.candidateA, expectedSha: candidateASha }] }),
  batch: [refs.candidateA],
});
assert(attempt.process.status !== 0, 'Reappeared absent ref unexpectedly accepted');
assert(remoteSha(remote, refs.candidateA) === candidateASha, 'Reappeared candidate changed');
cases.push({ name: 'already-absent-ref-reappearance-refused', status: 'PASS' });

// Explicit bounded batch limit must be enforced before transport.
const oversized = Array.from({ length: 21 }, (_, i) => `refs/heads/fixture/oversized-${i}`);
attempt = invokeApply({
  name: 'oversized',
  preflight: makePreflight({ absent: oversized.map((ref) => ({ ref, expectedSha: candidateASha })) }),
  batch: oversized,
  maxBatch: 20,
});
assert(attempt.process.status !== 0, 'Oversized batch unexpectedly accepted');
cases.push({ name: 'bounded-batch-limit-refused', status: 'PASS' });

const report = {
  schema: 'box3d-character-controller-delete-transport-qualification-v1',
  status: 'PASS_DISPOSABLE_LOCAL_REMOTE_ONLY',
  caseCount: cases.length,
  cases,
  productionRemoteTouched: false,
  destructiveProductionActionsPerformed: 0,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`DELETE_TRANSPORT_QUALIFICATION status=${report.status} cases=${report.caseCount} productionDeletions=0`);
for (const item of cases) console.log(`TRANSPORT_CASE ${item.name} ${item.status}`);
