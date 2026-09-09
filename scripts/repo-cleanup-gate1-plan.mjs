import fs from 'node:fs';
import crypto from 'node:crypto';

const inArg = process.argv.find((arg) => arg.startsWith('--in='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!inArg || !outArg) throw new Error('Usage: node repo-cleanup-gate1-plan.mjs --in=<classification.json> --out=<plan.json>');
const inPath = inArg.slice('--in='.length);
const outPath = outArg.slice('--out='.length);
const activeCleanupBranch = process.env.CLEANUP_ACTIVE_BRANCH ?? 'maintenance/repo-cleanup-adaptation-2026-09-09';

const classification = JSON.parse(fs.readFileSync(inPath, 'utf8'));
if (classification.schema !== 'box3d-character-controller-repo-cleanup-gate1-classification-v1') {
  throw new Error(`Unexpected classification schema: ${classification.schema}`);
}
if (classification.records.length !== classification.branchCount) {
  throw new Error(`Record count ${classification.records.length} != branchCount ${classification.branchCount}`);
}

const normalizedRefs = classification.records.map((record) => record.ref.trim());
if (new Set(normalizedRefs).size !== normalizedRefs.length) {
  throw new Error('Semantic duplicate branch refs detected');
}

const canonicalRecords = classification.records.filter((record) => record.ref === classification.canonicalRef);
if (canonicalRecords.length !== 1 || canonicalRecords[0].expectedSha !== classification.canonicalSha) {
  throw new Error('Canonical ref/SHA invariant failed');
}

const archiveTipShas = [...new Set(classification.records.map((record) => record.expectedSha))].sort();
if (archiveTipShas.length !== classification.distinctBranchTipCount) {
  throw new Error(`Distinct tip count ${archiveTipShas.length} != classifier count ${classification.distinctBranchTipCount}`);
}

const records = classification.records.map((record) => {
  let preliminaryDisposition;
  let reason;
  if (record.ref === classification.canonicalRef) {
    preliminaryDisposition = 'KEEP';
    reason = 'Canonical default branch; cleanup hard deny.';
  } else if (record.branch === activeCleanupBranch) {
    preliminaryDisposition = 'KEEP_UNTIL_CLOSURE';
    reason = 'Active cleanup branch; terminal disposition required after campaign closure.';
  } else {
    preliminaryDisposition = 'ARCHIVE_THEN_DELETE_CANDIDATE';
    reason = 'Historical/non-live ref; exact tip must be covered by the universal archive before branch-name deletion can be considered.';
  }
  return {
    ref: record.ref,
    expectedSha: record.expectedSha,
    proofClass: record.proofClass,
    branchOnlyCommits: record.branchOnlyCommits,
    prHeadRefs: record.prHeadRefs,
    preliminaryDisposition,
    archiveCovered: false,
    reason,
  };
});

const planCore = {
  schema: 'box3d-character-controller-repo-cleanup-preliminary-plan-v1',
  status: 'PRELIMINARY_NON_DESTRUCTIVE',
  generatedAt: new Date().toISOString(),
  repository: classification.repository,
  canonicalRef: classification.canonicalRef,
  canonicalSha: classification.canonicalSha,
  observedBranchCount: classification.branchCount,
  distinctBranchTipCount: classification.distinctBranchTipCount,
  archivePolicyCandidate: 'UNIVERSAL_DISTINCT_PRE_CLEANUP_TIP_COVERAGE',
  archiveTipShas,
  archiveTipCount: archiveTipShas.length,
  destructiveAuthorized: false,
  records,
};

const canonicalJson = JSON.stringify(planCore);
const planSha256 = crypto.createHash('sha256').update(canonicalJson).digest('hex');
const plan = { ...planCore, planSha256 };

fs.mkdirSync(new URL('.', `file://${process.cwd()}/${outPath}`).pathname, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(plan, null, 2)}\n`);

const dispositionCounts = records.reduce((acc, record) => {
  acc[record.preliminaryDisposition] = (acc[record.preliminaryDisposition] ?? 0) + 1;
  return acc;
}, {});
console.log(`GATE1_PLAN branches=${records.length} archiveTips=${archiveTipShas.length}`);
console.log(`GATE1_PLAN dispositions=${JSON.stringify(dispositionCounts)}`);
console.log(`GATE1_PLAN sha256=${planSha256}`);
