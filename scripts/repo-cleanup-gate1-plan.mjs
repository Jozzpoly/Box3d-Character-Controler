import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const inArg = process.argv.find((arg) => arg.startsWith('--in='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!inArg || !outArg) throw new Error('Usage: node repo-cleanup-gate1-plan.mjs --in=<classification.json> --out=<plan.json>');
const inPath = inArg.slice('--in='.length);
const outPath = outArg.slice('--out='.length);
const activeCleanupBranch = process.env.CLEANUP_ACTIVE_BRANCH ?? 'maintenance/repo-cleanup-adaptation-2026-09-09';
const activeCleanupRef = `refs/heads/${activeCleanupBranch}`;

const sha256 = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

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

const activeCleanupRecords = classification.records.filter((record) => record.ref === activeCleanupRef);
if (activeCleanupRecords.length !== 1) {
  throw new Error(`Active cleanup ref must appear exactly once: ${activeCleanupRef}`);
}

const records = classification.records.map((record) => {
  let preliminaryDisposition;
  let reason;
  if (record.ref === classification.canonicalRef) {
    preliminaryDisposition = 'KEEP';
    reason = 'Canonical default branch; cleanup hard deny.';
  } else if (record.ref === activeCleanupRef) {
    preliminaryDisposition = 'KEEP_UNTIL_CLOSURE';
    reason = 'Active cleanup branch; terminal disposition required after campaign closure.';
  } else {
    preliminaryDisposition = 'ARCHIVE_THEN_DELETE_CANDIDATE';
    reason = 'Historical/non-live ref; exact tip must be covered by the historical archive before branch-name deletion can be considered.';
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

const historicalArchiveRecords = records
  .filter((record) => record.preliminaryDisposition === 'ARCHIVE_THEN_DELETE_CANDIDATE')
  .map((record) => ({ ref: record.ref, expectedSha: record.expectedSha }))
  .sort((a, b) => a.ref.localeCompare(b.ref));

if (historicalArchiveRecords.length !== records.length - 2) {
  throw new Error(`Expected exactly canonical + active helper outside historical archive set; got ${historicalArchiveRecords.length}/${records.length}`);
}

const historicalArchiveTipShas = [...new Set(historicalArchiveRecords.map((record) => record.expectedSha))].sort();
for (const record of historicalArchiveRecords) {
  if (!historicalArchiveTipShas.includes(record.expectedSha)) {
    throw new Error(`Historical archive record tip missing from deduplicated tip set: ${record.ref}`);
  }
}

// Canonical stays live, but is also an explicit anchor parent so the archive commit is
// connected to the exact canonical state that authorized the freeze. The moving cleanup
// helper is deliberately excluded so preparation commits do not destabilize the archive.
const archiveAnchorParentShas = [
  classification.canonicalSha,
  ...historicalArchiveTipShas.filter((sha) => sha !== classification.canonicalSha),
];
if (new Set(archiveAnchorParentShas).size !== archiveAnchorParentShas.length) {
  throw new Error('Archive anchor parent set contains duplicates');
}

const historicalArchiveFreezeCore = {
  schema: 'box3d-character-controller-historical-archive-freeze-v1',
  repository: classification.repository,
  canonicalRef: classification.canonicalRef,
  canonicalSha: classification.canonicalSha,
  historicalArchiveRecords,
  historicalArchiveTipShas,
  archiveAnchorParentShas,
};
const historicalArchiveFreezeSha256 = sha256(historicalArchiveFreezeCore);

const livePlanDeterministicCore = {
  schema: 'box3d-character-controller-repo-cleanup-preliminary-plan-v2',
  status: 'PRELIMINARY_NON_DESTRUCTIVE',
  repository: classification.repository,
  canonicalRef: classification.canonicalRef,
  canonicalSha: classification.canonicalSha,
  activeCleanupRef,
  activeCleanupSha: activeCleanupRecords[0].expectedSha,
  observedBranchCount: classification.branchCount,
  distinctBranchTipCount: classification.distinctBranchTipCount,
  archivePolicyCandidate: 'UNIVERSAL_HISTORICAL_CANDIDATE_TIP_COVERAGE',
  historicalArchiveBranchCount: historicalArchiveRecords.length,
  historicalArchiveTipCount: historicalArchiveTipShas.length,
  historicalArchiveRecords,
  historicalArchiveTipShas,
  archiveAnchorParentShas,
  historicalArchiveFreezeSha256,
  destructiveAuthorized: false,
  records,
};
const livePlanSha256 = sha256(livePlanDeterministicCore);

const plan = {
  ...livePlanDeterministicCore,
  generatedAt: new Date().toISOString(),
  livePlanSha256,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(plan, null, 2)}\n`);

const dispositionCounts = records.reduce((acc, record) => {
  acc[record.preliminaryDisposition] = (acc[record.preliminaryDisposition] ?? 0) + 1;
  return acc;
}, {});
console.log(`GATE1_PLAN branches=${records.length} historicalBranches=${historicalArchiveRecords.length} historicalTips=${historicalArchiveTipShas.length} anchorParents=${archiveAnchorParentShas.length}`);
console.log(`GATE1_PLAN dispositions=${JSON.stringify(dispositionCounts)}`);
console.log(`GATE1_PLAN historicalArchiveFreezeSha256=${historicalArchiveFreezeSha256}`);
console.log(`GATE1_PLAN livePlanSha256=${livePlanSha256}`);

// Deliberate no-op drift witness: changing cleanup helper code must not change the historical archive freeze.
