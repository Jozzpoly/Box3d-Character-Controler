import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const preflightArg = process.argv.find((arg) => arg.startsWith('--preflight='));
const batchArg = process.argv.find((arg) => arg.startsWith('--batch='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const remoteArg = process.argv.find((arg) => arg.startsWith('--remote='));
const execute = process.argv.includes('--execute');
if (!preflightArg || !batchArg || !outArg || !execute) {
  throw new Error('Usage: node repo-cleanup-delete-apply.mjs --preflight=<preflight.json> --batch=<refs.json> --out=<result.json> [--remote=origin] --execute');
}
const preflightPath = preflightArg.slice('--preflight='.length);
const batchPath = batchArg.slice('--batch='.length);
const outPath = outArg.slice('--out='.length);
const remote = remoteArg ? remoteArg.slice('--remote='.length) : 'origin';
const maxBatch = Number(process.env.CLEANUP_MAX_DELETE_BATCH ?? 20);

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function lsRemote(ref) {
  const result = runGit(['ls-remote', '--heads', remote, ref]);
  const lines = result.stdout.trim() ? result.stdout.trim().split('\n').filter(Boolean) : [];
  assert(lines.length <= 1, `Remote returned multiple matches for exact ref ${ref}`);
  if (!lines.length) return null;
  const [sha, actualRef] = lines[0].split('\t');
  assert(actualRef === ref, `Remote exact-ref mismatch: requested ${ref}, got ${actualRef}`);
  return sha;
}

const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'));
const requestedRefs = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
assert(preflight.schema === 'box3d-character-controller-delete-preflight-v1', `Unexpected preflight schema ${preflight.schema}`);
assert(preflight.status === 'PASS_DRY_RUN_NO_DELETIONS', `Refusing non-PASS preflight: ${preflight.status}`);
assert(preflight.destructiveActionsPerformed === 0, 'Refusing preflight that reports prior destructive actions');
assert(Array.isArray(preflight.policy?.blockers) && preflight.policy.blockers.length === 0, 'Refusing preflight with blockers');
assert(Array.isArray(requestedRefs), 'Batch must be a JSON array');
assert(requestedRefs.length > 0, 'Delete batch must not be empty');
assert(Number.isInteger(maxBatch) && maxBatch > 0, `Invalid max batch ${maxBatch}`);
assert(requestedRefs.length <= maxBatch, `Delete batch ${requestedRefs.length} exceeds bounded max ${maxBatch}`);
assert(new Set(requestedRefs).size === requestedRefs.length, 'Delete batch contains duplicate refs');
for (const ref of requestedRefs) assert(/^refs\/heads\/.+/.test(ref), `Only refs/heads/* may be deleted: ${ref}`);

const expected = preflight.expected;
const authorization = process.env.CLEANUP_DELETE_AUTHORIZATION;
const expectedAuthorization = `DELETE_FROZEN_REFS:${expected.freezeSha256}:${expected.archiveSha}`;
assert(authorization === expectedAuthorization, 'Explicit frozen delete authorization token mismatch');

const hardDenySet = new Set(preflight.policy.hardDenyRefs ?? []);
for (const ref of [expected.canonicalRef, expected.helperRef, expected.archiveRef]) {
  assert(hardDenySet.has(ref), `Expected hard-deny ref missing from preflight: ${ref}`);
}
for (const ref of requestedRefs) assert(!hardDenySet.has(ref), `HARD_DENY requested for deletion: ${ref}`);

const readyByRef = new Map((preflight.policy.deleteReady ?? []).map((entry) => [entry.ref, entry]));
const absentByRef = new Map((preflight.policy.alreadyAbsent ?? []).map((entry) => [entry.ref, entry]));
for (const ref of requestedRefs) {
  assert(readyByRef.has(ref) || absentByRef.has(ref), `Requested ref is neither DELETE_READY nor SKIP_ALREADY_ABSENT: ${ref}`);
}

function assertHardDeniesExact(stage) {
  for (const [ref, sha] of [
    [expected.canonicalRef, expected.canonicalSha],
    [expected.archiveRef, expected.archiveSha],
    [expected.helperRef, expected.helperSha],
  ]) {
    const actual = lsRemote(ref);
    assert(actual === sha, `${stage}: hard-deny CAS mismatch ${ref}: expected ${sha}, got ${actual}`);
  }
}

assertHardDeniesExact('pre-delete');

const readyRequested = [];
const skippedAlreadyAbsent = [];
for (const ref of requestedRefs) {
  if (readyByRef.has(ref)) {
    const entry = readyByRef.get(ref);
    const actual = lsRemote(ref);
    assert(actual === entry.expectedSha, `candidate CAS mismatch ${ref}: expected ${entry.expectedSha}, got ${actual}`);
    readyRequested.push(entry);
  } else {
    const entry = absentByRef.get(ref);
    const actual = lsRemote(ref);
    assert(actual === null, `already-absent ref reappeared ${ref} at ${actual}`);
    skippedAlreadyAbsent.push(entry);
  }
}

let pushPerformed = false;
if (readyRequested.length) {
  // One atomic ref transaction. Every delete has an explicit expected-old SHA lease;
  // if any lease is stale, the remote must reject the whole ready subset.
  const args = ['push', '--atomic'];
  for (const entry of readyRequested) args.push(`--force-with-lease=${entry.ref}:${entry.expectedSha}`);
  args.push(remote);
  for (const entry of readyRequested) args.push(`:${entry.ref}`);
  const push = runGit(args, { allowFailure: true });
  assert(push.status === 0, `Atomic leased delete push failed: ${push.stderr || push.stdout}`);
  pushPerformed = true;
}

for (const ref of requestedRefs) {
  const actual = lsRemote(ref);
  assert(actual === null, `post-delete ref still present ${ref}@${actual}`);
}
assertHardDeniesExact('post-delete');

const result = {
  schema: 'box3d-character-controller-delete-apply-v1',
  status: 'PASS_BOUNDED_ATOMIC_DELETE',
  remote,
  requestedRefs,
  deletedRefs: readyRequested.map((entry) => ({ ref: entry.ref, expectedSha: entry.expectedSha })),
  skippedAlreadyAbsent,
  maxBatch,
  pushPerformed,
  hardDeniesReverified: [expected.canonicalRef, expected.archiveRef, expected.helperRef],
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`DELETE_APPLY status=${result.status} requested=${requestedRefs.length} deleted=${result.deletedRefs.length} skipped=${skippedAlreadyAbsent.length} atomicPush=${pushPerformed}`);
