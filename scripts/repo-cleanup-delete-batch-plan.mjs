import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const preflightArg = process.argv.find((arg) => arg.startsWith('--preflight='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!preflightArg || !outArg) {
  throw new Error('Usage: node repo-cleanup-delete-batch-plan.mjs --preflight=<preflight.json> --out=<plan.json>');
}
const preflightPath = preflightArg.slice('--preflight='.length);
const outPath = outArg.slice('--out='.length);
const canaryRef = process.env.CLEANUP_CANARY_REF ?? 'refs/heads/tmp-noop';
const maxBatch = Number(process.env.CLEANUP_MAX_DELETE_BATCH ?? 20);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'));
assert(preflight.schema === 'box3d-character-controller-delete-preflight-v1', `Unexpected preflight schema ${preflight.schema}`);
assert(preflight.status === 'PASS_DRY_RUN_NO_DELETIONS', `Refusing non-PASS preflight ${preflight.status}`);
assert(Array.isArray(preflight.policy?.blockers) && preflight.policy.blockers.length === 0, 'Refusing preflight with blockers');
assert(Number.isInteger(maxBatch) && maxBatch > 0 && maxBatch <= 20, `Invalid bounded batch size ${maxBatch}`);

const ready = [...preflight.policy.deleteReady];
const absent = [...preflight.policy.alreadyAbsent];
const totalHistorical = preflight.policy.expectedHistoricalBranchCount;
assert(Number.isInteger(totalHistorical) && totalHistorical > 0, `Invalid expected historical count ${totalHistorical}`);
assert(ready.length + absent.length === totalHistorical, `Ready + absent ${ready.length + absent.length} != historical ${totalHistorical}`);

const hardDeny = new Set(preflight.policy.hardDenyRefs ?? []);
for (const entry of [...ready, ...absent]) assert(!hardDeny.has(entry.ref), `Hard-deny leaked into historical set: ${entry.ref}`);

const readyByRef = new Map(ready.map((entry) => [entry.ref, entry]));
const absentByRef = new Map(absent.map((entry) => [entry.ref, entry]));
assert(!(readyByRef.has(canaryRef) && absentByRef.has(canaryRef)), 'Canary cannot be both ready and absent');
assert(readyByRef.has(canaryRef) || absentByRef.has(canaryRef), `Canary is outside frozen historical set: ${canaryRef}`);

const canary = readyByRef.has(canaryRef)
  ? { ref: canaryRef, state: 'DELETE_READY', expectedSha: readyByRef.get(canaryRef).expectedSha }
  : { ref: canaryRef, state: 'SKIP_ALREADY_ABSENT', expectedSha: absentByRef.get(canaryRef).expectedSha };

const proofOrder = ['ANCESTOR_OF_CANONICAL', 'PR_HEAD_PRESERVED', 'DIVERGENT_UNIQUE'];
const proofRank = new Map(proofOrder.map((value, index) => [value, index]));
const remainingReady = ready
  .filter((entry) => entry.ref !== canaryRef)
  .sort((a, b) => (proofRank.get(a.proofClass) ?? 99) - (proofRank.get(b.proofClass) ?? 99) || a.ref.localeCompare(b.ref));

const unknownProofs = [...new Set(remainingReady.map((entry) => entry.proofClass).filter((value) => !proofRank.has(value)))];
assert(unknownProofs.length === 0, `Unknown proof classes in delete-ready set: ${unknownProofs.join(', ')}`);

const batches = [];
let index = 1;
for (const proofClass of proofOrder) {
  const tier = remainingReady.filter((entry) => entry.proofClass === proofClass);
  for (let offset = 0; offset < tier.length; offset += maxBatch) {
    const entries = tier.slice(offset, offset + maxBatch);
    batches.push({
      index,
      proofClass,
      count: entries.length,
      refs: entries.map((entry) => entry.ref),
      expected: entries.map((entry) => ({ ref: entry.ref, expectedSha: entry.expectedSha })),
    });
    index += 1;
  }
}

const flattened = batches.flatMap((batch) => batch.refs);
assert(new Set(flattened).size === flattened.length, 'Duplicate ref across bounded batches');
assert(flattened.length === remainingReady.length, 'Batch coverage does not equal remaining ready set');
for (const batch of batches) {
  assert(batch.count > 0 && batch.count <= maxBatch, `Invalid batch ${batch.index} count ${batch.count}`);
  assert(batch.refs.every((ref) => ref !== canaryRef), `Canary leaked into bulk batch ${batch.index}`);
}

const tierCounts = proofOrder.reduce((acc, proofClass) => {
  acc[proofClass] = remainingReady.filter((entry) => entry.proofClass === proofClass).length;
  return acc;
}, {});

const deterministicCore = {
  schema: 'box3d-character-controller-delete-batch-plan-v1',
  freezeSha256: preflight.expected.freezeSha256,
  archiveSha: preflight.expected.archiveSha,
  canonicalSha: preflight.expected.canonicalSha,
  historicalBranchCount: totalHistorical,
  readyCount: ready.length,
  alreadyAbsentCount: absent.length,
  canary,
  maxBatch,
  tierOrder: proofOrder,
  tierCounts,
  batches,
};
const plan = {
  ...deterministicCore,
  generatedAt: new Date().toISOString(),
  batchPlanSha256: sha256Json(deterministicCore),
  destructiveAuthorized: false,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`DELETE_BATCH_PLAN canary=${canary.state} ready=${ready.length} absent=${absent.length} bulkRefs=${remainingReady.length} batches=${batches.length} maxBatch=${maxBatch}`);
console.log(`DELETE_BATCH_PLAN tiers=${JSON.stringify(tierCounts)}`);
console.log(`DELETE_BATCH_PLAN sha256=${plan.batchPlanSha256} destructiveAuthorized=false`);
