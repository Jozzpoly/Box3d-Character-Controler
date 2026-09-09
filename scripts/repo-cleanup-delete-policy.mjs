import crypto from 'node:crypto';

export const FREEZE_SCHEMA = 'box3d-character-controller-historical-archive-freeze-v1';
export const MANIFEST_SCHEMA = 'box3d-character-controller-pre-cleanup-recovery-manifest-v2';
export const CLASSIFICATION_SCHEMA = 'box3d-character-controller-repo-cleanup-gate1-classification-v1';

export function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function recomputeHistoricalFreeze(manifest) {
  return sha256Json({
    schema: FREEZE_SCHEMA,
    repository: manifest.repository,
    canonicalRef: manifest.canonicalRef,
    canonicalSha: manifest.canonicalSha,
    historicalArchiveRecords: manifest.historicalBranches,
    historicalArchiveTipShas: manifest.historicalArchiveTipShas,
    archiveAnchorParentShas: manifest.archiveAnchorParentShas,
  });
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function blocker(code, detail = null) {
  return { code, detail };
}

export function evaluateDeletePolicy({ manifest, classification, expected }) {
  const blockers = [];
  const add = (code, detail = null) => blockers.push(blocker(code, detail));

  if (manifest?.schema !== MANIFEST_SCHEMA) add('MANIFEST_SCHEMA_MISMATCH', manifest?.schema ?? null);
  if (classification?.schema !== CLASSIFICATION_SCHEMA) add('CLASSIFICATION_SCHEMA_MISMATCH', classification?.schema ?? null);

  const historical = Array.isArray(manifest?.historicalBranches) ? manifest.historicalBranches : [];
  const tipShas = Array.isArray(manifest?.historicalArchiveTipShas) ? manifest.historicalArchiveTipShas : [];
  const parentShas = Array.isArray(manifest?.archiveAnchorParentShas) ? manifest.archiveAnchorParentShas : [];
  const live = Array.isArray(classification?.records) ? classification.records : [];

  const historicalRefs = historical.map((entry) => entry.ref);
  const liveRefs = live.map((entry) => entry.ref);
  const historicalDuplicates = duplicateValues(historicalRefs);
  const liveDuplicates = duplicateValues(liveRefs);
  if (historicalDuplicates.length) add('DUPLICATE_MANIFEST_REF', historicalDuplicates);
  if (liveDuplicates.length) add('DUPLICATE_LIVE_REF', liveDuplicates);
  if (duplicateValues(tipShas).length) add('DUPLICATE_MANIFEST_TIP_SHA', duplicateValues(tipShas));
  if (duplicateValues(parentShas).length) add('DUPLICATE_ARCHIVE_PARENT_SHA', duplicateValues(parentShas));

  if (manifest?.repository !== expected.repository) add('REPOSITORY_MISMATCH', manifest?.repository ?? null);
  if (manifest?.canonicalRef !== expected.canonicalRef) add('MANIFEST_CANONICAL_REF_MISMATCH', manifest?.canonicalRef ?? null);
  if (manifest?.canonicalSha !== expected.canonicalSha) add('MANIFEST_CANONICAL_SHA_MISMATCH', manifest?.canonicalSha ?? null);
  if (manifest?.historicalBranchCount !== expected.historicalBranchCount) add('MANIFEST_BRANCH_COUNT_MISMATCH', manifest?.historicalBranchCount ?? null);
  if (manifest?.historicalDistinctTipCount !== expected.historicalTipCount) add('MANIFEST_TIP_COUNT_MISMATCH', manifest?.historicalDistinctTipCount ?? null);
  if (historical.length !== expected.historicalBranchCount) add('MANIFEST_BRANCH_ARRAY_COUNT_MISMATCH', historical.length);
  if (tipShas.length !== expected.historicalTipCount) add('MANIFEST_TIP_ARRAY_COUNT_MISMATCH', tipShas.length);
  if (parentShas.length !== expected.archiveParentCount) add('MANIFEST_PARENT_COUNT_MISMATCH', parentShas.length);
  if (parentShas[0] !== expected.canonicalSha) add('CANONICAL_NOT_FIRST_ARCHIVE_PARENT', parentShas[0] ?? null);

  let recomputedFreeze = null;
  try {
    recomputedFreeze = recomputeHistoricalFreeze(manifest);
    if (recomputedFreeze !== expected.freezeSha256) add('FREEZE_RECOMPUTE_MISMATCH', recomputedFreeze);
    if (manifest?.historicalArchiveFreezeSha256 !== expected.freezeSha256) {
      add('MANIFEST_FREEZE_FIELD_MISMATCH', manifest?.historicalArchiveFreezeSha256 ?? null);
    }
  } catch (error) {
    add('FREEZE_RECOMPUTE_ERROR', String(error));
  }

  const hardDenyRefs = [expected.canonicalRef, expected.helperRef, expected.archiveRef];
  const hardDenySet = new Set(hardDenyRefs);
  const hardDenyManifestHits = historicalRefs.filter((ref) => hardDenySet.has(ref));
  if (hardDenyManifestHits.length) add('HARD_DENY_IN_MANIFEST', [...new Set(hardDenyManifestHits)].sort());

  const historicalRefSet = new Set(historicalRefs);
  const liveByRef = new Map();
  for (const record of live) {
    if (!liveByRef.has(record.ref)) liveByRef.set(record.ref, record);
  }

  const canonicalLive = liveByRef.get(expected.canonicalRef);
  if (!canonicalLive) add('CANONICAL_REF_MISSING');
  else if (canonicalLive.expectedSha !== expected.canonicalSha) add('CANONICAL_SHA_MISMATCH', canonicalLive.expectedSha);

  const archiveLive = liveByRef.get(expected.archiveRef);
  if (!archiveLive) add('ARCHIVE_REF_MISSING');
  else if (archiveLive.expectedSha !== expected.archiveSha) add('ARCHIVE_SHA_MISMATCH', archiveLive.expectedSha);

  const helperLive = liveByRef.get(expected.helperRef);
  if (!helperLive) add('HELPER_REF_MISSING');
  else if (expected.helperSha && helperLive.expectedSha !== expected.helperSha) add('HELPER_SHA_MISMATCH', helperLive.expectedSha);

  const allowedLiveRefs = new Set([...historicalRefs, ...hardDenyRefs]);
  const unexpectedLive = liveRefs.filter((ref) => !allowedLiveRefs.has(ref));
  if (unexpectedLive.length) add('UNEXPECTED_LIVE_BRANCH', [...new Set(unexpectedLive)].sort());

  const tipSet = new Set(tipShas);
  const deleteReady = [];
  const alreadyAbsent = [];
  const moved = [];
  for (const entry of historical) {
    if (!tipSet.has(entry.expectedSha)) {
      add('MANIFEST_BRANCH_TIP_NOT_COVERED', { ref: entry.ref, expectedSha: entry.expectedSha });
      continue;
    }
    const liveRecord = liveByRef.get(entry.ref);
    if (!liveRecord) {
      alreadyAbsent.push({ ref: entry.ref, expectedSha: entry.expectedSha });
    } else if (liveRecord.expectedSha === entry.expectedSha) {
      deleteReady.push({
        ref: entry.ref,
        expectedSha: entry.expectedSha,
        proofClass: liveRecord.proofClass ?? null,
      });
    } else {
      moved.push({ ref: entry.ref, expectedSha: entry.expectedSha, actualSha: liveRecord.expectedSha });
      add('REF_MOVED', moved[moved.length - 1]);
    }
  }

  const proofPriority = new Map([
    ['ANCESTOR_OF_CANONICAL', 0],
    ['PR_HEAD_PRESERVED', 1],
    ['DIVERGENT_UNIQUE', 2],
  ]);
  deleteReady.sort((a, b) =>
    (proofPriority.get(a.proofClass) ?? 9) - (proofPriority.get(b.proofClass) ?? 9)
      || a.ref.localeCompare(b.ref));
  alreadyAbsent.sort((a, b) => a.ref.localeCompare(b.ref));

  const deletionHardDenyHits = deleteReady.filter((entry) => hardDenySet.has(entry.ref));
  if (deletionHardDenyHits.length) add('HARD_DENY_IN_DELETE_SET', deletionHardDenyHits);

  const uniqueBlockers = [];
  const blockerKeys = new Set();
  for (const item of blockers) {
    const key = JSON.stringify(item);
    if (!blockerKeys.has(key)) {
      blockerKeys.add(key);
      uniqueBlockers.push(item);
    }
  }

  return {
    allowed: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    recomputedFreezeSha256: recomputedFreeze,
    hardDenyRefs,
    deleteReady,
    alreadyAbsent,
    moved,
    expectedHistoricalBranchCount: expected.historicalBranchCount,
    observedLiveBranchCount: live.length,
  };
}
