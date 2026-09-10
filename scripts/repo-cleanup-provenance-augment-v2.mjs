import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const snapshotPath = arg('snapshot');
const manifestPath = arg('manifest');
const outDir = arg('out');
if (!snapshotPath || !manifestPath || !outDir) {
  throw new Error('Usage: node repo-cleanup-provenance-augment-v2.mjs --snapshot=<v1.json> --manifest=<manifest.json> --out=<dir>');
}

const v1 = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result;
}

function extractMentionIds(text) {
  const runs = new Set();
  const artifacts = new Set();
  const runPatterns = [
    /actions\/runs\/(\d{8,})/gi,
    /\bworkflow(?:\s+run)?\s*(?:#\d+\s*\/\s*)?[`'"\[]?(\d{8,})/gi,
    /\brun\s*(?:#\d+\s*\/\s*)?[`'"\[]?(\d{8,})/gi,
  ];
  const artifactPatterns = [
    /artifacts\/(\d{8,})/gi,
    /\bartifact(?:\s+id)?\s*[:#]?\s*[`'"\[]?(\d{8,})/gi,
  ];
  for (const pattern of runPatterns) for (const match of text.matchAll(pattern)) runs.add(Number(match[1]));
  for (const pattern of artifactPatterns) for (const match of text.matchAll(pattern)) artifacts.add(Number(match[1]));
  return { runs, artifacts };
}

function isResearchTextPath(file) {
  if (file === 'README.md') return true;
  if (file.startsWith('docs/') && /\.(?:md|txt|json)$/i.test(file)) return true;
  if (file.startsWith('archive/') && /\.(?:md|txt|json)$/i.test(file)) return true;
  return false;
}

const canonicalSha = v1.canonical.sha;
const tipShas = [...new Set([canonicalSha, ...manifest.historicalArchiveTipShas])].sort();
const blobSources = new Map();

for (const tipSha of tipShas) {
  const listed = git(['ls-tree', '-r', '-z', tipSha]).stdout.split('\0').filter(Boolean);
  for (const row of listed) {
    const match = row.match(/^(\d+)\s+blob\s+([0-9a-f]{40})\t(.+)$/);
    if (!match) continue;
    const [, mode, blobSha, file] = match;
    if (!isResearchTextPath(file)) continue;
    const existing = blobSources.get(blobSha) ?? { blobSha, mode, sources: [] };
    existing.sources.push({ tipSha, file });
    blobSources.set(blobSha, existing);
  }
}

const gitTextRunSources = new Map();
const gitTextArtifactSources = new Map();
let scannedBlobCount = 0;
for (const entry of [...blobSources.values()].sort((a, b) => a.blobSha.localeCompare(b.blobSha))) {
  const blob = git(['cat-file', 'blob', entry.blobSha]).stdout;
  const ids = extractMentionIds(blob);
  if (ids.runs.size || ids.artifacts.size) {
    const sourceRecord = {
      blobSha: entry.blobSha,
      sources: entry.sources.sort((a, b) => a.tipSha.localeCompare(b.tipSha) || a.file.localeCompare(b.file)),
    };
    for (const id of ids.runs) {
      const list = gitTextRunSources.get(id) ?? [];
      list.push(sourceRecord);
      gitTextRunSources.set(id, list);
    }
    for (const id of ids.artifacts) {
      const list = gitTextArtifactSources.get(id) ?? [];
      list.push(sourceRecord);
      gitTextArtifactSources.set(id, list);
    }
  }
  scannedBlobCount += 1;
}

const discussionRuns = new Set(v1.github.mentionedRuns.map((entry) => entry.id));
const discussionArtifacts = new Set(v1.github.mentionedArtifacts.map((entry) => entry.id));
const unionRuns = [...new Set([...discussionRuns, ...gitTextRunSources.keys()])].sort((a, b) => a - b);
const unionArtifacts = [...new Set([...discussionArtifacts, ...gitTextArtifactSources.keys()])].sort((a, b) => a - b);
const runById = new Map(v1.github.actionsRuns.map((entry) => [entry.id, entry]));
const artifactById = new Map(v1.github.actionsArtifacts.map((entry) => [entry.id, entry]));

const runRecords = unionRuns.map((id) => ({
  id,
  state: runById.has(id) ? 'PRESENT_IN_ACTIONS_RUN_INVENTORY' : 'MISSING_OR_NO_LONGER_LISTABLE',
  inGithubDiscussion: discussionRuns.has(id),
  inPreservedGitText: gitTextRunSources.has(id),
  gitTextSources: gitTextRunSources.get(id) ?? [],
  run: runById.get(id) ?? null,
}));
const artifactRecords = unionArtifacts.map((id) => {
  const artifact = artifactById.get(id) ?? null;
  return {
    id,
    state: artifact ? (artifact.expired ? 'PRESENT_BUT_EXPIRED' : 'PRESENT_AND_DOWNLOADABLE') : 'MISSING_OR_NO_LONGER_LISTABLE',
    inGithubDiscussion: discussionArtifacts.has(id),
    inPreservedGitText: gitTextArtifactSources.has(id),
    gitTextSources: gitTextArtifactSources.get(id) ?? [],
    artifact,
  };
});

const gitOnlyRuns = runRecords.filter((entry) => entry.inPreservedGitText && !entry.inGithubDiscussion);
const discussionOnlyRuns = runRecords.filter((entry) => entry.inGithubDiscussion && !entry.inPreservedGitText);
const gitOnlyArtifacts = artifactRecords.filter((entry) => entry.inPreservedGitText && !entry.inGithubDiscussion);
const missingRuns = runRecords.filter((entry) => entry.state === 'MISSING_OR_NO_LONGER_LISTABLE');
const missingArtifacts = artifactRecords.filter((entry) => entry.state === 'MISSING_OR_NO_LONGER_LISTABLE');
const expiredArtifacts = artifactRecords.filter((entry) => entry.state === 'PRESENT_BUT_EXPIRED');

const v2 = {
  ...v1,
  schema: 'box3d-character-controller-github-provenance-snapshot-v2',
  v1GeneratedAt: v1.generatedAt,
  augmentedAt: new Date().toISOString(),
  preservationModel: {
    ...v1.preservationModel,
    semanticPreservation: 'GITHUB_METADATA_PLUS_PRESERVED_GIT_TEXT_UNION_AND_HUMAN_SPECIMEN_CATALOG_REQUIRED',
    evidenceReferenceCoverage: 'UNION_OF_GITHUB_DISCUSSION_AND_README_DOCS_ARCHIVE_TEXT_ACROSS_PRESERVED_TIP_GRAPH',
  },
  evidenceReferences: {
    preservedTipCountScanned: tipShas.length,
    uniqueResearchTextBlobCountScanned: scannedBlobCount,
    githubDiscussion: {
      runIds: [...discussionRuns].sort((a, b) => a - b),
      artifactIds: [...discussionArtifacts].sort((a, b) => a - b),
    },
    preservedGitText: {
      runIds: [...gitTextRunSources.keys()].sort((a, b) => a - b),
      artifactIds: [...gitTextArtifactSources.keys()].sort((a, b) => a - b),
    },
    union: {
      runs: runRecords,
      artifacts: artifactRecords,
    },
  },
  summary: {
    ...v1.summary,
    evidencePreservedTipCountScanned: tipShas.length,
    evidenceUniqueResearchTextBlobCountScanned: scannedBlobCount,
    discussionMentionedRunCount: discussionRuns.size,
    discussionMentionedArtifactCount: discussionArtifacts.size,
    gitTextMentionedRunCount: gitTextRunSources.size,
    gitTextMentionedArtifactCount: gitTextArtifactSources.size,
    unionMentionedRunCount: unionRuns.length,
    unionMentionedArtifactCount: unionArtifacts.length,
    gitOnlyRunCount: gitOnlyRuns.length,
    discussionOnlyRunCount: discussionOnlyRuns.length,
    gitOnlyArtifactCount: gitOnlyArtifacts.length,
    missingUnionRunCount: missingRuns.length,
    missingUnionArtifactCount: missingArtifacts.length,
    expiredUnionArtifactCount: expiredArtifacts.length,
  },
};

assert(v2.summary.evidencePreservedTipCountScanned === 76, `Expected 76 preserved tips, got ${v2.summary.evidencePreservedTipCountScanned}`);
assert(v2.summary.unionMentionedRunCount === Number(process.env.EXPECTED_UNION_RUN_IDS ?? 73), `Unexpected union run count ${v2.summary.unionMentionedRunCount}`);
assert(v2.summary.unionMentionedArtifactCount === Number(process.env.EXPECTED_UNION_ARTIFACT_IDS ?? 7), `Unexpected union artifact count ${v2.summary.unionMentionedArtifactCount}`);
assert(v2.summary.gitOnlyRunCount === 33, `Expected 33 Git-only run IDs, got ${v2.summary.gitOnlyRunCount}`);
assert(v2.summary.gitOnlyArtifactCount === 2, `Expected 2 Git-only artifact IDs, got ${v2.summary.gitOnlyArtifactCount}`);
assert(v2.summary.missingUnionRunCount === 0, `Missing referenced Actions runs: ${missingRuns.map((entry) => entry.id).join(',')}`);
assert(v2.summary.missingUnionArtifactCount === 0, `Missing referenced Actions artifacts: ${missingArtifacts.map((entry) => entry.id).join(',')}`);

const outJson = path.join(outDir, 'github-provenance-snapshot-v2.json');
fs.writeFileSync(outJson, `${JSON.stringify(v2, null, 2)}\n`);

const md = [
  '# GitHub + preserved-Git provenance snapshot v2',
  '',
  `Augmented: ${v2.augmentedAt}`,
  `Canonical: \`${v2.canonical.ref}@${v2.canonical.sha}\``,
  '',
  '## Coverage correction from v1',
  '',
  `- GitHub discussion corpus: **${v2.summary.discussionMentionedRunCount} run IDs / ${v2.summary.discussionMentionedArtifactCount} artifact IDs**.`,
  `- Preserved Git research text: **${v2.summary.gitTextMentionedRunCount} run IDs / ${v2.summary.gitTextMentionedArtifactCount} artifact IDs**.`,
  `- Full union: **${v2.summary.unionMentionedRunCount} run IDs / ${v2.summary.unionMentionedArtifactCount} artifact IDs**.`,
  `- Evidence found only in preserved Git text: **${v2.summary.gitOnlyRunCount} run IDs / ${v2.summary.gitOnlyArtifactCount} artifact IDs**.`,
  `- Referenced run records missing: **${v2.summary.missingUnionRunCount}**.`,
  `- Referenced artifact records missing: **${v2.summary.missingUnionArtifactCount}**; expired records: **${v2.summary.expiredUnionArtifactCount}**.`,
  '',
  '## Scan surface',
  '',
  `- Preserved tip trees scanned: **${v2.summary.evidencePreservedTipCountScanned}**.`,
  `- Unique README/docs/archive text blobs scanned: **${v2.summary.evidenceUniqueResearchTextBlobCountScanned}**.`,
  '- GitHub metadata remains the v1 complete PR/comment/review/workflow/run/artifact inventory.',
  '',
  '## Boundary',
  '',
  '- Presence of an Actions artifact record does not make its payload durable; expired state is retained explicitly.',
  '- Raw external Owner evidence is not embedded or published by this snapshot.',
  '- This snapshot is preservation evidence, not destructive authorization.',
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'github-provenance-summary-v2.md'), md);

console.log(`PROVENANCE_V2 tips=${v2.summary.evidencePreservedTipCountScanned} blobs=${v2.summary.evidenceUniqueResearchTextBlobCountScanned} unionRuns=${v2.summary.unionMentionedRunCount} unionArtifacts=${v2.summary.unionMentionedArtifactCount} gitOnlyRuns=${v2.summary.gitOnlyRunCount} gitOnlyArtifacts=${v2.summary.gitOnlyArtifactCount} missingRuns=${v2.summary.missingUnionRunCount} missingArtifacts=${v2.summary.missingUnionArtifactCount} expiredArtifacts=${v2.summary.expiredUnionArtifactCount}`);
