import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
if (!outArg || !manifestArg) {
  throw new Error('Usage: node repo-cleanup-provenance-snapshot.mjs --manifest=<recovery-manifest.json> --out=<directory>');
}

const outDir = outArg.slice('--out='.length);
const manifestPath = manifestArg.slice('--manifest='.length);
const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const canonicalRef = process.env.CANONICAL_REF ?? 'refs/heads/main';
if (!token || !repository) throw new Error('GH_TOKEN and GITHUB_REPOSITORY are required');

const apiBase = `https://api.github.com/repos/${repository}`;
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

async function api(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'box3d-character-controller-cleanup-audit',
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} ${url}: ${text.slice(0, 800)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function pagedArray(relativeUrl, { wrapper = null, perPage = 100 } = {}) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const joiner = relativeUrl.includes('?') ? '&' : '?';
    const payload = await api(`${apiBase}${relativeUrl}${joiner}per_page=${perPage}&page=${page}`);
    const items = wrapper ? payload?.[wrapper] : payload;
    assert(Array.isArray(items), `Expected array from ${relativeUrl} page ${page}`);
    all.push(...items);
    if (items.length < perPage) break;
    if (page > 100) throw new Error(`Pagination guard exceeded for ${relativeUrl}`);
  }
  return all;
}

function iso(value) {
  return value ?? null;
}

function compactUser(user) {
  if (!user) return null;
  return { login: user.login ?? null, id: user.id ?? null, type: user.type ?? null };
}

function compactPull(pr) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: Boolean(pr.draft),
    mergedAt: iso(pr.merged_at),
    createdAt: iso(pr.created_at),
    updatedAt: iso(pr.updated_at),
    closedAt: iso(pr.closed_at),
    htmlUrl: pr.html_url,
    author: compactUser(pr.user),
    base: { ref: pr.base?.ref ?? null, sha: pr.base?.sha ?? null },
    head: {
      ref: pr.head?.ref ?? null,
      sha: pr.head?.sha ?? null,
      repository: pr.head?.repo?.full_name ?? null,
    },
    mergeCommitSha: pr.merge_commit_sha ?? null,
    commits: pr.commits ?? null,
    additions: pr.additions ?? null,
    deletions: pr.deletions ?? null,
    changedFiles: pr.changed_files ?? null,
    body: pr.body ?? '',
  };
}

function compactIssueComment(comment) {
  return {
    id: comment.id,
    htmlUrl: comment.html_url,
    issueUrl: comment.issue_url,
    createdAt: iso(comment.created_at),
    updatedAt: iso(comment.updated_at),
    author: compactUser(comment.user),
    body: comment.body ?? '',
  };
}

function compactReviewComment(comment) {
  return {
    id: comment.id,
    pullRequestReviewId: comment.pull_request_review_id ?? null,
    htmlUrl: comment.html_url,
    pullRequestUrl: comment.pull_request_url,
    createdAt: iso(comment.created_at),
    updatedAt: iso(comment.updated_at),
    author: compactUser(comment.user),
    path: comment.path ?? null,
    line: comment.line ?? null,
    originalLine: comment.original_line ?? null,
    body: comment.body ?? '',
  };
}

function compactReview(review, prNumber) {
  return {
    id: review.id,
    prNumber,
    htmlUrl: review.html_url ?? null,
    state: review.state ?? null,
    submittedAt: iso(review.submitted_at),
    commitId: review.commit_id ?? null,
    author: compactUser(review.user),
    body: review.body ?? '',
  };
}

function compactRun(run) {
  return {
    id: run.id,
    name: run.name,
    path: run.path ?? null,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    headBranch: run.head_branch,
    headSha: run.head_sha,
    runNumber: run.run_number,
    runAttempt: run.run_attempt,
    createdAt: iso(run.created_at),
    updatedAt: iso(run.updated_at),
    runStartedAt: iso(run.run_started_at),
    htmlUrl: run.html_url,
  };
}

function compactArtifact(artifact) {
  return {
    id: artifact.id,
    name: artifact.name,
    sizeBytes: artifact.size_in_bytes,
    expired: Boolean(artifact.expired),
    createdAt: iso(artifact.created_at),
    updatedAt: iso(artifact.updated_at),
    expiresAt: iso(artifact.expires_at),
    digest: artifact.digest ?? null,
    workflowRunId: artifact.workflow_run?.id ?? null,
    workflowRunHeadBranch: artifact.workflow_run?.head_branch ?? null,
    workflowRunHeadSha: artifact.workflow_run?.head_sha ?? null,
  };
}

function compactWorkflow(workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    path: workflow.path,
    state: workflow.state,
    createdAt: iso(workflow.created_at),
    updatedAt: iso(workflow.updated_at),
    htmlUrl: workflow.html_url,
  };
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
  for (const pattern of runPatterns) {
    for (const match of text.matchAll(pattern)) runs.add(Number(match[1]));
  }
  for (const pattern of artifactPatterns) {
    for (const match of text.matchAll(pattern)) artifacts.add(Number(match[1]));
  }
  return { runs, artifacts };
}

const pullsRaw = await pagedArray('/pulls?state=all&sort=created&direction=asc');
const pulls = pullsRaw.map(compactPull).sort((a, b) => a.number - b.number);
const issueComments = (await pagedArray('/issues/comments?sort=created&direction=asc')).map(compactIssueComment);
const reviewComments = (await pagedArray('/pulls/comments?sort=created&direction=asc')).map(compactReviewComment);

const reviews = [];
for (const pr of pulls) {
  const prReviews = await pagedArray(`/pulls/${pr.number}/reviews`);
  reviews.push(...prReviews.map((review) => compactReview(review, pr.number)));
}
reviews.sort((a, b) => a.prNumber - b.prNumber || a.id - b.id);

const workflowsRaw = await pagedArray('/actions/workflows?', { wrapper: 'workflows' });
const workflows = workflowsRaw.map(compactWorkflow).sort((a, b) => a.id - b.id);
const runsRaw = await pagedArray('/actions/runs?', { wrapper: 'workflow_runs' });
const runs = runsRaw.map(compactRun).sort((a, b) => a.id - b.id);
const artifactsRaw = await pagedArray('/actions/artifacts?', { wrapper: 'artifacts' });
const artifacts = artifactsRaw.map(compactArtifact).sort((a, b) => a.id - b.id);

const textCorpus = [
  ...pulls.map((pr) => pr.body),
  ...issueComments.map((comment) => comment.body),
  ...reviewComments.map((comment) => comment.body),
  ...reviews.map((review) => review.body),
].join('\n');
const mentions = extractMentionIds(textCorpus);
const runById = new Map(runs.map((run) => [run.id, run]));
const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

const mentionedRuns = [...mentions.runs].sort((a, b) => a - b).map((id) => ({
  id,
  state: runById.has(id) ? 'PRESENT_IN_ACTIONS_RUN_INVENTORY' : 'MISSING_OR_NO_LONGER_LISTABLE',
  run: runById.get(id) ?? null,
}));
const mentionedArtifacts = [...mentions.artifacts].sort((a, b) => a - b).map((id) => {
  const artifact = artifactById.get(id) ?? null;
  return {
    id,
    state: artifact ? (artifact.expired ? 'PRESENT_BUT_EXPIRED' : 'PRESENT_AND_DOWNLOADABLE') : 'MISSING_OR_NO_LONGER_LISTABLE',
    artifact,
  };
});

const canonicalBranch = canonicalRef.replace(/^refs\/heads\//, '');
const canonicalSha = git(['rev-parse', `refs/remotes/origin/${canonicalBranch}`]).stdout.trim();
const prByHeadSha = new Map();
for (const pr of pulls) {
  if (!pr.head.sha) continue;
  const list = prByHeadSha.get(pr.head.sha) ?? [];
  list.push(pr.number);
  prByHeadSha.set(pr.head.sha, list);
}

const historicalCatalog = manifest.historicalBranches.map((entry) => {
  const branch = entry.ref.replace(/^refs\/heads\//, '');
  const ancestor = git(['merge-base', '--is-ancestor', entry.expectedSha, canonicalSha], { allowFailure: true }).status === 0;
  const prWitnesses = [...(prByHeadSha.get(entry.expectedSha) ?? [])];
  const proofClass = ancestor ? 'ANCESTOR_OF_CANONICAL' : prWitnesses.length ? 'PR_HEAD_PRESERVED' : 'DIVERGENT_UNIQUE';
  const branchOnlyCommitCount = Number(git(['rev-list', '--count', `${canonicalSha}..${entry.expectedSha}`]).stdout.trim());
  const tipSubject = git(['show', '-s', '--format=%s', entry.expectedSha]).stdout.trim();
  const tipCommittedAt = git(['show', '-s', '--format=%cI', entry.expectedSha]).stdout.trim();
  const treeSha = git(['rev-parse', `${entry.expectedSha}^{tree}`]).stdout.trim();
  const mergeBase = git(['merge-base', canonicalSha, entry.expectedSha]).stdout.trim();
  const changedFiles = git(['diff', '--name-only', `${mergeBase}..${entry.expectedSha}`]).stdout.trim().split('\n').filter(Boolean);
  const topLevelAreas = [...new Set(changedFiles.map((file) => file.split('/')[0]))].sort();
  return {
    ref: entry.ref,
    branch,
    expectedSha: entry.expectedSha,
    treeSha,
    tipSubject,
    tipCommittedAt,
    proofClass,
    branchOnlyCommitCount,
    exactPrHeadWitnesses: prWitnesses,
    mergeBase,
    changedFileCountFromMergeBase: changedFiles.length,
    topLevelAreas,
    disposition: 'PRESERVE_IDENTITY_AND_SEMANTICS_THEN_DELETE_LIVE_BRANCH',
  };
}).sort((a, b) => a.ref.localeCompare(b.ref));

const aliasesBySha = new Map();
for (const row of historicalCatalog) {
  const refs = aliasesBySha.get(row.expectedSha) ?? [];
  refs.push(row.ref);
  aliasesBySha.set(row.expectedSha, refs);
}
const aliasGroups = [...aliasesBySha.entries()]
  .filter(([, refs]) => refs.length > 1)
  .map(([sha, refs]) => ({ sha, refs: refs.sort(), count: refs.length }))
  .sort((a, b) => b.count - a.count || a.sha.localeCompare(b.sha));

const expiredArtifacts = artifacts.filter((artifact) => artifact.expired);
const liveArtifacts = artifacts.filter((artifact) => !artifact.expired);
const missingMentionedArtifacts = mentionedArtifacts.filter((entry) => entry.state === 'MISSING_OR_NO_LONGER_LISTABLE');
const expiredMentionedArtifacts = mentionedArtifacts.filter((entry) => entry.state === 'PRESENT_BUT_EXPIRED');
const missingMentionedRuns = mentionedRuns.filter((entry) => entry.state === 'MISSING_OR_NO_LONGER_LISTABLE');

const snapshot = {
  schema: 'box3d-character-controller-github-provenance-snapshot-v1',
  generatedAt: new Date().toISOString(),
  repository,
  canonical: { ref: canonicalRef, sha: canonicalSha },
  frozenArchive: {
    ref: process.env.ARCHIVE_REF ?? null,
    sha: process.env.ARCHIVE_SHA ?? null,
    freezeSha256: manifest.historicalArchiveFreezeSha256,
    historicalBranchCount: historicalCatalog.length,
    distinctHistoricalTipCount: new Set(historicalCatalog.map((entry) => entry.expectedSha)).size,
  },
  preservationModel: {
    gitObjectPreservation: 'QUALIFIED_BY_SHADOW_PRUNE_GC_FRESH_CLONE_AND_BUNDLE_REHEARSAL',
    branchIdentityPreservation: 'RECOVERY_MANIFEST_OLD_REF_TO_EXACT_SHA',
    semanticPreservation: 'THIS_SNAPSHOT_PLUS_POST_PRUNE_HUMAN_CATALOG_REQUIRED',
    githubNativeProvenance: 'SNAPSHOTTED_HERE_BUT_ACTIONS_ARTIFACT_PAYLOADS_ARE_NOT_EMBEDDED',
    externalOwnerEvidence: 'NOT_EMBEDDED_IN_PUBLIC_REPOSITORY_WITHOUT_EXPLICIT_OWNER_PUBLICATION_DECISION',
    offsiteBackup: 'NOT_PROVIDED_BY_SAME_REPOSITORY_ARCHIVE_REFS',
  },
  historicalCatalog,
  aliasGroups,
  github: {
    pulls,
    issueComments,
    reviewComments,
    reviews,
    workflows,
    actionsRuns: runs,
    actionsArtifacts: artifacts,
    mentionedRuns,
    mentionedArtifacts,
  },
  summary: {
    pullCount: pulls.length,
    mergedPullCount: pulls.filter((pr) => pr.mergedAt).length,
    openPullCount: pulls.filter((pr) => pr.state === 'open').length,
    issueCommentCount: issueComments.length,
    reviewCommentCount: reviewComments.length,
    reviewSubmissionCount: reviews.length,
    workflowRegistryCount: workflows.length,
    activeWorkflowCount: workflows.filter((workflow) => workflow.state === 'active').length,
    actionsRunCount: runs.length,
    actionsArtifactCount: artifacts.length,
    liveArtifactCount: liveArtifacts.length,
    expiredArtifactCount: expiredArtifacts.length,
    mentionedRunCount: mentionedRuns.length,
    missingMentionedRunCount: missingMentionedRuns.length,
    mentionedArtifactCount: mentionedArtifacts.length,
    expiredMentionedArtifactCount: expiredMentionedArtifacts.length,
    missingMentionedArtifactCount: missingMentionedArtifacts.length,
    historicalBranchCount: historicalCatalog.length,
    historicalDistinctTipCount: new Set(historicalCatalog.map((entry) => entry.expectedSha)).size,
    historicalAliasGroupCount: aliasGroups.length,
    proofClassCounts: historicalCatalog.reduce((acc, entry) => {
      acc[entry.proofClass] = (acc[entry.proofClass] ?? 0) + 1;
      return acc;
    }, {}),
  },
};

assert(snapshot.summary.pullCount === 51, `Expected 51 PRs, got ${snapshot.summary.pullCount}`);
assert(snapshot.summary.openPullCount === 0, `Open PRs appeared during cleanup: ${snapshot.summary.openPullCount}`);
assert(snapshot.summary.historicalBranchCount === Number(process.env.EXPECTED_HISTORICAL_BRANCHES ?? 86), 'Historical branch count drift');
assert(snapshot.summary.historicalDistinctTipCount === Number(process.env.EXPECTED_DISTINCT_TIPS ?? 75), 'Historical distinct-tip count drift');

fs.writeFileSync(path.join(outDir, 'github-provenance-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);

const md = [];
md.push('# GitHub-native provenance snapshot');
md.push('');
md.push(`Generated: ${snapshot.generatedAt}`);
md.push(`Canonical: \`${canonicalRef}@${canonicalSha}\``);
md.push(`Frozen historical identities: **${snapshot.summary.historicalBranchCount} branches / ${snapshot.summary.historicalDistinctTipCount} distinct tips**.`);
md.push('');
md.push('## GitHub history surface');
md.push('');
md.push(`- PRs: **${snapshot.summary.pullCount}** total, **${snapshot.summary.mergedPullCount}** merged, **${snapshot.summary.openPullCount}** open.`);
md.push(`- Issue/PR discussion comments: **${snapshot.summary.issueCommentCount}**.`);
md.push(`- Inline review comments: **${snapshot.summary.reviewCommentCount}**.`);
md.push(`- Review submissions: **${snapshot.summary.reviewSubmissionCount}**.`);
md.push(`- Workflow registry: **${snapshot.summary.workflowRegistryCount}**, active **${snapshot.summary.activeWorkflowCount}**.`);
md.push(`- Workflow runs inventoried: **${snapshot.summary.actionsRunCount}**.`);
md.push(`- Actions artifacts inventoried: **${snapshot.summary.actionsArtifactCount}**; live **${snapshot.summary.liveArtifactCount}**, expired **${snapshot.summary.expiredArtifactCount}**.`);
md.push('');
md.push('## References embedded in research discussion');
md.push('');
md.push(`- Mentioned workflow-run IDs: **${snapshot.summary.mentionedRunCount}**; missing/no-longer-listable **${snapshot.summary.missingMentionedRunCount}**.`);
md.push(`- Mentioned artifact IDs: **${snapshot.summary.mentionedArtifactCount}**; expired **${snapshot.summary.expiredMentionedArtifactCount}**, missing/no-longer-listable **${snapshot.summary.missingMentionedArtifactCount}**.`);
md.push('');
md.push('## Historical branch proof');
md.push('');
for (const [proof, count] of Object.entries(snapshot.summary.proofClassCounts).sort()) md.push(`- ${proof}: **${count}**`);
md.push(`- Same-SHA alias groups: **${snapshot.summary.historicalAliasGroupCount}**.`);
md.push('');
md.push('## Preservation boundary');
md.push('');
md.push('- Git objects are separately qualified by the shadow-prune / aggressive-GC / fresh-clone / bundle recovery rehearsal.');
md.push('- This snapshot preserves GitHub-native metadata and research narrative, but does not embed every Actions artifact payload.');
md.push('- Actions artifact IDs are locators, not durable evidence contracts; expiry/missing state is retained explicitly.');
md.push('- Raw external Owner evidence is intentionally not copied into this public repository without an explicit publication decision.');
md.push('- Same-repository refs and this snapshot are not an off-site backup.');
md.push('');
md.push('This file is evidence for post-prune archive closure; it is not destructive authorization.');
fs.writeFileSync(path.join(outDir, 'github-provenance-summary.md'), `${md.join('\n')}\n`);

console.log(`PROVENANCE_SNAPSHOT prs=${snapshot.summary.pullCount} comments=${snapshot.summary.issueCommentCount} reviews=${snapshot.summary.reviewSubmissionCount} runs=${snapshot.summary.actionsRunCount} artifacts=${snapshot.summary.actionsArtifactCount} liveArtifacts=${snapshot.summary.liveArtifactCount} expiredArtifacts=${snapshot.summary.expiredArtifactCount}`);
console.log(`PROVENANCE_MENTIONS runs=${snapshot.summary.mentionedRunCount} missingRuns=${snapshot.summary.missingMentionedRunCount} artifacts=${snapshot.summary.mentionedArtifactCount} expiredMentioned=${snapshot.summary.expiredMentionedArtifactCount} missingArtifacts=${snapshot.summary.missingMentionedArtifactCount}`);
console.log(`PROVENANCE_BRANCHES historical=${snapshot.summary.historicalBranchCount} tips=${snapshot.summary.historicalDistinctTipCount} aliases=${snapshot.summary.historicalAliasGroupCount} proof=${JSON.stringify(snapshot.summary.proofClassCounts)}`);
