import fs from 'node:fs';
import path from 'node:path';
import { evaluateDeletePolicy } from './repo-cleanup-delete-policy.mjs';

const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const classificationArg = process.argv.find((arg) => arg.startsWith('--classification='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!manifestArg || !classificationArg || !outArg) {
  throw new Error('Usage: node repo-cleanup-delete-adversarial.mjs --manifest=<manifest.json> --classification=<classification.json> --out=<result.json>');
}
const manifestPath = manifestArg.slice('--manifest='.length);
const classificationPath = classificationArg.slice('--classification='.length);
const outPath = outArg.slice('--out='.length);

const baselineManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const baselineClassification = JSON.parse(fs.readFileSync(classificationPath, 'utf8'));
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

const clone = (value) => structuredClone(value);
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const codes = (result) => new Set(result.blockers.map((item) => item.code));

function runCase(name, mutate, expectation) {
  const manifest = clone(baselineManifest);
  const classification = clone(baselineClassification);
  const localExpected = clone(expected);
  mutate({ manifest, classification, expected: localExpected });
  const result = evaluateDeletePolicy({ manifest, classification, expected: localExpected });
  expectation(result);
  results.push({
    name,
    allowed: result.allowed,
    blockerCodes: [...codes(result)].sort(),
    deleteReadyCount: result.deleteReady.length,
    alreadyAbsentCount: result.alreadyAbsent.length,
  });
}

const baseline = evaluateDeletePolicy({
  manifest: clone(baselineManifest),
  classification: clone(baselineClassification),
  expected: clone(expected),
});
assert(baseline.allowed, `Baseline policy unexpectedly blocked: ${JSON.stringify(baseline.blockers)}`);
assert(baseline.deleteReady.length + baseline.alreadyAbsent.length === expected.historicalBranchCount,
  `Baseline coverage ${baseline.deleteReady.length}+${baseline.alreadyAbsent.length} != ${expected.historicalBranchCount}`);
results.push({
  name: 'baseline-live-state',
  allowed: true,
  blockerCodes: [],
  deleteReadyCount: baseline.deleteReady.length,
  alreadyAbsentCount: baseline.alreadyAbsent.length,
});

const firstHistorical = baselineManifest.historicalBranches[0];
assert(firstHistorical, 'No historical branch fixture available');
const liveReadyFixture = baseline.deleteReady[0] ?? firstHistorical;

runCase('moved-candidate-ref', ({ classification }) => {
  let record = classification.records.find((item) => item.ref === liveReadyFixture.ref);
  if (!record) {
    record = {
      ref: liveReadyFixture.ref,
      branch: liveReadyFixture.ref.replace(/^refs\/heads\//, ''),
      expectedSha: liveReadyFixture.expectedSha,
      proofClass: liveReadyFixture.proofClass ?? 'ANCESTOR_OF_CANONICAL',
    };
    classification.records.push(record);
  }
  record.expectedSha = '1111111111111111111111111111111111111111';
}, (result) => {
  assert(!result.allowed && codes(result).has('REF_MOVED'), 'Moved candidate did not fail closed');
});

runCase('wrong-archive-sha', ({ classification }) => {
  const record = classification.records.find((item) => item.ref === expected.archiveRef);
  record.expectedSha = '2222222222222222222222222222222222222222';
}, (result) => {
  assert(!result.allowed && codes(result).has('ARCHIVE_SHA_MISMATCH'), 'Wrong archive SHA did not fail closed');
});

runCase('archive-ref-missing', ({ classification }) => {
  classification.records = classification.records.filter((item) => item.ref !== expected.archiveRef);
}, (result) => {
  assert(!result.allowed && codes(result).has('ARCHIVE_REF_MISSING'), 'Missing archive did not fail closed');
});

runCase('canonical-moved', ({ classification }) => {
  const record = classification.records.find((item) => item.ref === expected.canonicalRef);
  record.expectedSha = '3333333333333333333333333333333333333333';
}, (result) => {
  assert(!result.allowed && codes(result).has('CANONICAL_SHA_MISMATCH'), 'Moved canonical did not fail closed');
});

runCase('helper-moved', ({ classification }) => {
  const record = classification.records.find((item) => item.ref === expected.helperRef);
  record.expectedSha = '4444444444444444444444444444444444444444';
}, (result) => {
  assert(!result.allowed && codes(result).has('HELPER_SHA_MISMATCH'), 'Moved helper did not fail closed');
});

runCase('unexpected-live-branch', ({ classification }) => {
  classification.records.push({
    ref: 'refs/heads/unexpected/concurrent-work',
    branch: 'unexpected/concurrent-work',
    expectedSha: expected.canonicalSha,
    proofClass: 'ANCESTOR_OF_CANONICAL',
  });
}, (result) => {
  assert(!result.allowed && codes(result).has('UNEXPECTED_LIVE_BRANCH'), 'Unexpected live branch did not fail closed');
});

runCase('duplicate-live-ref', ({ classification }) => {
  classification.records.push(clone(classification.records[0]));
}, (result) => {
  assert(!result.allowed && codes(result).has('DUPLICATE_LIVE_REF'), 'Duplicate live ref did not fail closed');
});

runCase('duplicate-manifest-ref', ({ manifest }) => {
  manifest.historicalBranches[1].ref = manifest.historicalBranches[0].ref;
}, (result) => {
  assert(!result.allowed && codes(result).has('DUPLICATE_MANIFEST_REF'), 'Duplicate manifest ref did not fail closed');
});

runCase('hard-deny-injected-into-manifest', ({ manifest }) => {
  manifest.historicalBranches[0] = { ref: expected.archiveRef, expectedSha: expected.archiveSha };
}, (result) => {
  assert(!result.allowed && codes(result).has('HARD_DENY_IN_MANIFEST'), 'Archive injected into manifest did not fail closed');
});

runCase('manifest-freeze-field-corrupted', ({ manifest }) => {
  manifest.historicalArchiveFreezeSha256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
}, (result) => {
  assert(!result.allowed && codes(result).has('MANIFEST_FREEZE_FIELD_MISMATCH'), 'Corrupt freeze field did not fail closed');
});

runCase('manifest-branch-tip-not-covered', ({ manifest }) => {
  manifest.historicalArchiveTipShas = manifest.historicalArchiveTipShas.filter((sha) => sha !== firstHistorical.expectedSha);
}, (result) => {
  assert(!result.allowed && codes(result).has('MANIFEST_BRANCH_TIP_NOT_COVERED'), 'Uncovered branch tip did not fail closed');
});

runCase('one-more-prior-deletion-is-idempotent', ({ classification }) => {
  const removable = baseline.deleteReady[0];
  if (removable) classification.records = classification.records.filter((item) => item.ref !== removable.ref);
}, (result) => {
  assert(result.allowed, `Additional prior deletion should pass: ${JSON.stringify(result.blockers)}`);
  const expectedReady = baseline.deleteReady.length > 0 ? baseline.deleteReady.length - 1 : 0;
  const expectedAbsent = baseline.alreadyAbsent.length + (baseline.deleteReady.length > 0 ? 1 : 0);
  assert(result.deleteReady.length === expectedReady, `Expected ${expectedReady} ready refs, got ${result.deleteReady.length}`);
  assert(result.alreadyAbsent.length === expectedAbsent, `Expected ${expectedAbsent} absent refs, got ${result.alreadyAbsent.length}`);
});

runCase('all-historical-already-absent-is-idempotent', ({ classification }) => {
  const historicalRefs = new Set(baselineManifest.historicalBranches.map((entry) => entry.ref));
  classification.records = classification.records.filter((item) => !historicalRefs.has(item.ref));
}, (result) => {
  assert(result.allowed, `Fully pruned state should pass: ${JSON.stringify(result.blockers)}`);
  assert(result.alreadyAbsent.length === expected.historicalBranchCount, `Expected all refs absent, got ${result.alreadyAbsent.length}`);
  assert(result.deleteReady.length === 0, `Expected zero ready refs, got ${result.deleteReady.length}`);
});

const report = {
  schema: 'box3d-character-controller-delete-adversarial-v2',
  status: 'PASS_ALL_ADVERSARIAL_POLICY_CASES_NO_DELETIONS',
  baselineReadyCount: baseline.deleteReady.length,
  baselineAlreadyAbsentCount: baseline.alreadyAbsent.length,
  caseCount: results.length,
  results,
  destructiveActionsPerformed: 0,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`DELETE_ADVERSARIAL status=${report.status} baselineReady=${report.baselineReadyCount} baselineAbsent=${report.baselineAlreadyAbsentCount} cases=${report.caseCount} deletions=0`);
for (const item of results) {
  console.log(`CASE ${item.name} allowed=${item.allowed} blockers=${item.blockerCodes.join(',') || 'none'} ready=${item.deleteReadyCount} absent=${item.alreadyAbsentCount}`);
}
