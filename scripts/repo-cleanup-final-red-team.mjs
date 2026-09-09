import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
const classificationArg = process.argv.find((arg) => arg.startsWith('--classification='));
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const mdArg = process.argv.find((arg) => arg.startsWith('--markdown='));
if (!manifestArg || !classificationArg || !outArg || !mdArg) {
  throw new Error('Usage: node repo-cleanup-final-red-team.mjs --manifest=<json> --classification=<json> --out=<json> --markdown=<md>');
}

const manifestPath = manifestArg.slice('--manifest='.length);
const classificationPath = classificationArg.slice('--classification='.length);
const outPath = outArg.slice('--out='.length);
const mdPath = mdArg.slice('--markdown='.length);
const canonicalSha = process.env.EXPECTED_CANONICAL_SHA;
const archiveSha = process.env.EXPECTED_ARCHIVE_SHA;
const archiveRef = process.env.CLEANUP_ARCHIVE_REF ?? 'refs/heads/archive/pre-cleanup-2026-09-09-dca388f4';
const helperRef = `refs/heads/${process.env.CLEANUP_ACTIVE_BRANCH ?? 'maintenance/repo-cleanup-adaptation-2026-09-09'}`;
const expectedCanaryRef = process.env.CLEANUP_CANARY_REF ?? 'refs/heads/tmp-noop';
if (!canonicalSha || !archiveSha) throw new Error('Expected canonical/archive SHA required');

function runGit(args, { allowFailure = false } = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0 && !allowFailure) throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r;
}
function gitText(args, opts) { return runGit(args, opts).stdout.trim(); }
function isAncestor(a, b) { return runGit(['merge-base', '--is-ancestor', a, b], { allowFailure: true }).status === 0; }
function countRange(range) {
  const r = runGit(['rev-list', '--count', range], { allowFailure: true });
  return r.status === 0 ? Number(r.stdout.trim()) : null;
}
function grepAt(rev, needle, pathspec = []) {
  if (!needle) return [];
  const args = ['grep', '-n', '-I', '-F', needle, rev, '--', ...pathspec];
  const r = runGit(args, { allowFailure: true });
  if (r.status === 1) return [];
  if (r.status !== 0) return [`<grep-error:${r.stderr.trim() || r.status}>`];
  return r.stdout.trim() ? r.stdout.trim().split('\n').filter(Boolean) : [];
}
function changedFiles(tip) {
  const r = runGit(['diff', '--name-only', `${canonicalSha}...${tip}`], { allowFailure: true });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim().split('\n').filter(Boolean) : [];
}
function branchOnlyCommits(tip, limit = 8) {
  const r = runGit(['log', `--max-count=${limit}`, '--format=%H%x09%cI%x09%s', `${canonicalSha}..${tip}`], { allowFailure: true });
  if (r.status !== 0 || !r.stdout.trim()) return [];
  return r.stdout.trim().split('\n').map((line) => {
    const [sha, date, ...rest] = line.split('\t');
    return { sha, date, subject: rest.join('\t') };
  });
}
function cherryStats(tip) {
  const r = runGit(['cherry', canonicalSha, tip], { allowFailure: true });
  if (r.status !== 0) return { available: false, plus: null, minus: null, sample: [], error: r.stderr.trim() || r.stdout.trim() };
  const lines = r.stdout.trim() ? r.stdout.trim().split('\n').filter(Boolean) : [];
  return {
    available: true,
    plus: lines.filter((x) => x.startsWith('+ ')).length,
    minus: lines.filter((x) => x.startsWith('- ')).length,
    sample: lines.slice(0, 8),
  };
}
function categorizeFiles(files) {
  const c = { docs: 0, workflows: 0, scripts: 0, runtime: 0, deps: 0, assets: 0, other: 0 };
  for (const f of files) {
    if (f.startsWith('docs/') || f === 'README.md') c.docs++;
    else if (f.startsWith('.github/workflows/')) c.workflows++;
    else if (f.startsWith('scripts/')) c.scripts++;
    else if (f.startsWith('src/') || f === 'index.html') c.runtime++;
    else if (['package.json','package-lock.json','.nvmrc'].includes(f)) c.deps++;
    else if (f.startsWith('assets/') || /\.(png|jpg|jpeg|webp|glb|gltf|mp4)$/i.test(f)) c.assets++;
    else c.other++;
  }
  return c;
}
function looksLikeLiveLink(line, branch) {
  const encoded = encodeURIComponent(branch);
  const lower = line.toLowerCase();
  const needles = [branch.toLowerCase(), encoded.toLowerCase()];
  const host = lower.includes('github.com/') || lower.includes('raw.githubusercontent.com/');
  const pathy = lower.includes('/tree/') || lower.includes('/blob/') || lower.includes('/compare/') || lower.includes('/raw/');
  return host && pathy && needles.some((n) => lower.includes(n));
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const classification = JSON.parse(fs.readFileSync(classificationPath, 'utf8'));
if (manifest.canonicalSha !== canonicalSha) throw new Error('Manifest canonical SHA mismatch');
if (manifest.historicalArchiveFreezeSha256 !== process.env.EXPECTED_FREEZE_SHA) throw new Error('Manifest freeze mismatch');
if (classification.canonicalSha !== canonicalSha) throw new Error('Classification canonical SHA mismatch');

const liveByRef = new Map(classification.records.map((r) => [r.ref, r]));
const prBySha = new Map();
for (const line of (gitText(['for-each-ref', '--format=%(refname)%09%(objectname)', 'refs/remotes/pull/'], { allowFailure: true }) || '').split('\n').filter(Boolean)) {
  const [ref, sha] = line.split('\t');
  if (!prBySha.has(sha)) prBySha.set(sha, []);
  prBySha.get(sha).push(ref.replace('refs/remotes/pull/', 'refs/pull/'));
}
const tags = (gitText(['for-each-ref', '--format=%(refname)%09%(objectname)%09%(*objectname)', 'refs/tags/'], { allowFailure: true }) || '')
  .split('\n').filter(Boolean).map((line) => {
    const [ref, objectSha, peeledSha] = line.split('\t');
    return { ref, objectSha, peeledSha: peeledSha || objectSha };
  });
const archiveTagWitnesses = tags.filter((t) => t.peeledSha === archiveSha || t.objectSha === archiveSha);

const canonicalTreeLines = gitText(['log', '--format=%H%x09%T', canonicalSha]).split('\n').filter(Boolean);
const canonicalTreeWitness = new Map();
for (const line of canonicalTreeLines) {
  const [commit, tree] = line.split('\t');
  if (!canonicalTreeWitness.has(tree)) canonicalTreeWitness.set(tree, commit);
}

const records = [];
for (const frozen of manifest.historicalBranches) {
  const branch = frozen.ref.replace(/^refs\/heads\//, '');
  const tip = frozen.expectedSha;
  const live = liveByRef.get(frozen.ref) ?? null;
  const liveState = !live ? 'ABSENT' : live.expectedSha === tip ? 'EXACT' : 'MOVED';
  const archiveReachable = isAncestor(tip, archiveSha);
  const ancestorOfCanonical = isAncestor(tip, canonicalSha);
  const canonicalAncestorOfTip = isAncestor(canonicalSha, tip);
  const prHeadRefs = [...(prBySha.get(tip) ?? [])].sort();
  const proofClass = ancestorOfCanonical ? 'ANCESTOR_OF_CANONICAL' : prHeadRefs.length ? 'PR_HEAD_PRESERVED' : 'DIVERGENT_UNIQUE';
  const branchOnlyCount = ancestorOfCanonical ? 0 : countRange(`${canonicalSha}..${tip}`);
  const files = ancestorOfCanonical ? [] : changedFiles(tip);
  const fileCategories = categorizeFiles(files);
  const cherry = ancestorOfCanonical ? { available: true, plus: 0, minus: 0, sample: [] } : cherryStats(tip);
  const tipTree = gitText(['rev-parse', `${tip}^{tree}`]);
  const canonicalTreeMatchCommit = canonicalTreeWitness.get(tipTree) ?? null;
  const nameMentions = [...new Set([...grepAt(canonicalSha, branch), ...grepAt(canonicalSha, frozen.ref)])];
  const shaMentions = grepAt(canonicalSha, tip);
  const workflowMentions = [...new Set([...grepAt(canonicalSha, branch, ['.github/workflows']), ...grepAt(canonicalSha, frozen.ref, ['.github/workflows'])])];
  const liveLinkMentions = nameMentions.filter((line) => looksLikeLiveLink(line, branch));
  const docsMentions = nameMentions.filter((line) => line.includes(':docs/') || line.includes(':README.md:'));
  const latest = gitText(['show', '-s', '--format=%cI%x09%s', tip]).split('\t');

  const holdReasons = [];
  const repairReasons = [];
  const reviewNotes = [];
  if (!archiveReachable) holdReasons.push('ARCHIVE_NOT_REACHABLE');
  if (liveState === 'MOVED') holdReasons.push('LIVE_REF_MOVED');
  if (liveState === 'ABSENT' && frozen.ref !== expectedCanaryRef) holdReasons.push('UNEXPECTEDLY_ABSENT_BEFORE_BULK');
  if (canonicalAncestorOfTip && !ancestorOfCanonical) holdReasons.push('TIP_IS_DESCENDANT_OF_CURRENT_CANONICAL');
  if (workflowMentions.length) holdReasons.push('CANONICAL_WORKFLOW_DEPENDS_ON_BRANCH_NAME');
  if (liveLinkMentions.length) repairReasons.push('CANONICAL_LINK_WOULD_BREAK_ON_BRANCH_DELETE');
  if (nameMentions.length && !liveLinkMentions.length) reviewNotes.push('CANONICAL_TEXT_MENTIONS_BRANCH_NAME');
  if (shaMentions.length) reviewNotes.push('CANONICAL_TEXT_MENTIONS_EXACT_TIP_SHA');
  if (!ancestorOfCanonical && cherry.available && cherry.plus > 0) reviewNotes.push('HAS_PATCH_UNIQUE_HISTORY_PRESERVED_ONLY_BY_ARCHIVE_OR_OTHER_REF');
  if (!canonicalTreeMatchCommit && !ancestorOfCanonical) reviewNotes.push('TIP_TREE_NOT_SEEN_IN_CANONICAL_HISTORY');

  let disposition = 'DELETE_OK_AFTER_FINAL_REVIEW';
  if (holdReasons.length) disposition = 'HOLD_BLOCKED';
  else if (repairReasons.length) disposition = 'REPAIR_BEFORE_DELETE';
  else if (reviewNotes.length) disposition = 'DELETE_OK_BUT_SEMANTIC_REVIEW';

  records.push({
    ref: frozen.ref,
    branch,
    expectedSha: tip,
    liveState,
    currentSha: live?.expectedSha ?? null,
    archiveReachable,
    proofClass,
    ancestorOfCanonical,
    canonicalAncestorOfTip,
    prHeadRefs,
    branchOnlyCommitCount: branchOnlyCount,
    patchEquivalence: cherry,
    tipTree,
    canonicalTreeMatchCommit,
    changedFileCount: files.length,
    changedFileCategories: fileCategories,
    changedFiles: files.slice(0, 80),
    branchOnlyRecentCommits: ancestorOfCanonical ? [] : branchOnlyCommits(tip),
    latestCommit: { date: latest[0] ?? null, subject: latest.slice(1).join('\t') || null },
    canonicalMentions: {
      branchOrRefCount: nameMentions.length,
      exactShaCount: shaMentions.length,
      workflowCount: workflowMentions.length,
      docsCount: docsMentions.length,
      liveLinkCount: liveLinkMentions.length,
      branchSamples: nameMentions.slice(0, 8),
      shaSamples: shaMentions.slice(0, 5),
      workflowSamples: workflowMentions.slice(0, 5),
      liveLinkSamples: liveLinkMentions.slice(0, 5),
    },
    holdReasons,
    repairReasons,
    reviewNotes,
    disposition,
  });
}

const counts = records.reduce((acc, r) => {
  acc[r.disposition] = (acc[r.disposition] ?? 0) + 1;
  acc.live = acc.live ?? {};
  acc.live[r.liveState] = (acc.live[r.liveState] ?? 0) + 1;
  acc.proof = acc.proof ?? {};
  acc.proof[r.proofClass] = (acc.proof[r.proofClass] ?? 0) + 1;
  return acc;
}, {});
const blockers = records.filter((r) => r.disposition === 'HOLD_BLOCKED');
const repairs = records.filter((r) => r.disposition === 'REPAIR_BEFORE_DELETE');
const semanticReview = records.filter((r) => r.disposition === 'DELETE_OK_BUT_SEMANTIC_REVIEW');
const currentCandidates = records.filter((r) => r.liveState === 'EXACT');
const expectedAbsent = records.filter((r) => r.ref === expectedCanaryRef && r.liveState === 'ABSENT');

const globalFindings = [];
if (archiveTagWitnesses.length === 0) globalFindings.push({ severity: 'REPAIR_BEFORE_BULK', code: 'ARCHIVE_SINGLE_LIVE_REF_NO_TAG_WITNESS', detail: `${archiveRef}@${archiveSha}` });
if (expectedAbsent.length !== 1) globalFindings.push({ severity: 'BLOCKER', code: 'CANARY_ABSENCE_NOT_EXACTLY_ONE', detail: expectedAbsent.length });
if (currentCandidates.length !== manifest.historicalBranchCount - 1) globalFindings.push({ severity: 'BLOCKER', code: 'CURRENT_CANDIDATE_COUNT_UNEXPECTED', detail: currentCandidates.length });
if (blockers.length) globalFindings.push({ severity: 'BLOCKER', code: 'PER_REF_BLOCKERS', detail: blockers.map((r) => r.ref) });
if (repairs.length) globalFindings.push({ severity: 'REPAIR_BEFORE_BULK', code: 'BRANCH_LINK_REPAIRS_REQUIRED', detail: repairs.map((r) => r.ref) });
globalFindings.push({ severity: 'POST_BULK_REQUIRED', code: 'HELPER_NOT_IN_PRE_CLEANUP_ARCHIVE', detail: helperRef });
globalFindings.push({ severity: 'RESIDUAL_UNOBSERVABLE', code: 'EXTERNAL_WEBHOOKS_BOTS_BOOKMARKS_NOT_PROVABLE_FROM_GIT_GRAPH', detail: 'Requires platform/admin/user-side awareness; no silent PASS.' });

const report = {
  schema: 'box3d-character-controller-final-pre-bulk-red-team-v1',
  generatedAt: new Date().toISOString(),
  repository: manifest.repository,
  canonical: { ref: manifest.canonicalRef, sha: canonicalSha },
  archive: { ref: archiveRef, sha: archiveSha, tagWitnesses: archiveTagWitnesses },
  helperRef,
  frozenHistoricalBranchCount: manifest.historicalBranchCount,
  frozenDistinctTipCount: manifest.historicalDistinctTipCount,
  counts,
  currentDeleteCandidateCount: currentCandidates.length,
  expectedAbsentCanaryCount: expectedAbsent.length,
  blockerCount: blockers.length,
  repairCount: repairs.length,
  semanticReviewCount: semanticReview.length,
  globalFindings,
  bulkDecision: globalFindings.some((f) => f.severity === 'BLOCKER') ? 'BLOCKED' : globalFindings.some((f) => f.severity === 'REPAIR_BEFORE_BULK') ? 'REPAIR_REQUIRED_BEFORE_BULK' : 'READY_FOR_OWNER_BULK_DECISION',
  records,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

const md = [];
md.push('# Final pre-bulk branch red-team');
md.push('');
md.push(`Decision: **${report.bulkDecision}**`);
md.push('');
md.push(`- canonical: \`${manifest.canonicalRef}@${canonicalSha}\``);
md.push(`- archive: \`${archiveRef}@${archiveSha}\``);
md.push(`- frozen historical mappings: ${manifest.historicalBranchCount}`);
md.push(`- live exact candidates: ${currentCandidates.length}`);
md.push(`- expected absent canary: ${expectedAbsent.length}`);
md.push(`- per-ref blockers: ${blockers.length}`);
md.push(`- repair-before-delete refs: ${repairs.length}`);
md.push(`- semantic-review refs: ${semanticReview.length}`);
md.push(`- archive tag witnesses: ${archiveTagWitnesses.length}`);
md.push('');
md.push('## Global findings');
for (const f of globalFindings) md.push(`- **${f.severity} / ${f.code}** — ${typeof f.detail === 'string' ? f.detail : JSON.stringify(f.detail)}`);
md.push('');
md.push('## Flagged refs');
for (const r of records.filter((x) => x.disposition !== 'DELETE_OK_AFTER_FINAL_REVIEW')) {
  md.push(`### ${r.ref}`);
  md.push(`- disposition: **${r.disposition}**`);
  md.push(`- live/proof: ${r.liveState} / ${r.proofClass}`);
  md.push(`- branch-only commits: ${r.branchOnlyCommitCount}`);
  md.push(`- patch unique/equivalent: ${r.patchEquivalence.plus ?? 'n/a'} / ${r.patchEquivalence.minus ?? 'n/a'}`);
  md.push(`- canonical mentions: branch/ref=${r.canonicalMentions.branchOrRefCount}, SHA=${r.canonicalMentions.exactShaCount}, workflow=${r.canonicalMentions.workflowCount}, live-link=${r.canonicalMentions.liveLinkCount}`);
  if (r.holdReasons.length) md.push(`- HOLD: ${r.holdReasons.join(', ')}`);
  if (r.repairReasons.length) md.push(`- REPAIR: ${r.repairReasons.join(', ')}`);
  if (r.reviewNotes.length) md.push(`- REVIEW: ${r.reviewNotes.join(', ')}`);
  if (r.canonicalMentions.liveLinkSamples.length) for (const s of r.canonicalMentions.liveLinkSamples) md.push(`  - link: \`${s.replace(/`/g, '\\`')}\``);
  md.push('');
}
fs.writeFileSync(mdPath, `${md.join('\n')}\n`);

console.log(`FINAL_RED_TEAM decision=${report.bulkDecision}`);
console.log(`FINAL_RED_TEAM candidates=${currentCandidates.length} canaryAbsent=${expectedAbsent.length} blockers=${blockers.length} repairs=${repairs.length} semanticReview=${semanticReview.length}`);
console.log(`FINAL_RED_TEAM proof=${JSON.stringify(counts.proof ?? {})} live=${JSON.stringify(counts.live ?? {})}`);
console.log(`FINAL_RED_TEAM archiveTagWitnesses=${archiveTagWitnesses.length}`);
for (const f of globalFindings) console.log(`GLOBAL ${f.severity} ${f.code} ${JSON.stringify(f.detail)}`);
for (const r of [...blockers, ...repairs]) console.log(`FLAG ${r.disposition} ${r.ref} ${JSON.stringify([...r.holdReasons, ...r.repairReasons])}`);
