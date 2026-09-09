import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const outPath = outArg ? outArg.slice('--out='.length) : null;
const canonicalName = process.env.CLEANUP_CANONICAL_REF ?? 'main';

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function gitText(args) {
  return runGit(args).stdout.trim();
}

function parseRefs(prefix) {
  const raw = gitText(['for-each-ref', '--format=%(refname)%09%(objectname)', prefix]);
  if (!raw) return [];
  return raw.split('\n').map((line) => {
    const [ref, sha] = line.split('\t');
    return { ref, sha };
  });
}

function isAncestor(ancestor, descendant) {
  return runGit(['merge-base', '--is-ancestor', ancestor, descendant], { allowFailure: true }).status === 0;
}

function countRange(range) {
  return Number(gitText(['rev-list', '--count', range]));
}

function changedFiles(base, tip) {
  const raw = gitText(['diff', '--name-only', `${base}...${tip}`]);
  return raw ? raw.split('\n').filter(Boolean) : [];
}

function recentBranchOnlyCommits(base, tip, limit = 5) {
  const raw = gitText(['log', `--max-count=${limit}`, '--format=%H%x09%s', `${base}..${tip}`]);
  if (!raw) return [];
  return raw.split('\n').map((line) => {
    const [sha, ...messageParts] = line.split('\t');
    return { sha, message: messageParts.join('\t') };
  });
}

const canonicalRemoteRef = `refs/remotes/origin/${canonicalName}`;
const canonicalSha = gitText(['rev-parse', canonicalRemoteRef]);

const branchRefs = parseRefs('refs/remotes/origin/')
  .filter(({ ref }) => !ref.endsWith('/HEAD'))
  .map(({ ref, sha }) => ({
    remoteRef: ref,
    ref: `refs/heads/${ref.slice('refs/remotes/origin/'.length)}`,
    branch: ref.slice('refs/remotes/origin/'.length),
    sha,
  }));

const prHeadRefs = parseRefs('refs/remotes/pull/')
  .filter(({ ref }) => ref.endsWith('/head'))
  .map(({ ref, sha }) => ({
    remoteRef: ref,
    ref: ref.replace('refs/remotes/pull/', 'refs/pull/'),
    sha,
  }));

const prRefsBySha = new Map();
for (const entry of prHeadRefs) {
  if (!prRefsBySha.has(entry.sha)) prRefsBySha.set(entry.sha, []);
  prRefsBySha.get(entry.sha).push(entry.ref);
}

const aliasesBySha = new Map();
for (const entry of branchRefs) {
  if (!aliasesBySha.has(entry.sha)) aliasesBySha.set(entry.sha, []);
  aliasesBySha.get(entry.sha).push(entry.ref);
}

const analysisBySha = new Map();
for (const [sha, aliases] of aliasesBySha.entries()) {
  const equalCanonical = sha === canonicalSha;
  const ancestorOfCanonical = equalCanonical || isAncestor(sha, canonicalSha);
  const canonicalAncestorOfTip = equalCanonical || isAncestor(canonicalSha, sha);
  const branchOnlyCommits = ancestorOfCanonical ? 0 : countRange(`${canonicalSha}..${sha}`);
  const prHeadMatches = prRefsBySha.get(sha) ?? [];
  let proofClass;
  if (equalCanonical) proofClass = 'EQUAL_CANONICAL';
  else if (ancestorOfCanonical) proofClass = 'ANCESTOR_OF_CANONICAL';
  else if (prHeadMatches.length > 0) proofClass = 'PR_HEAD_PRESERVED';
  else proofClass = 'DIVERGENT_UNIQUE';

  const files = ancestorOfCanonical ? [] : changedFiles(canonicalSha, sha);
  analysisBySha.set(sha, {
    sha,
    aliases: [...aliases].sort(),
    equalCanonical,
    ancestorOfCanonical,
    canonicalAncestorOfTip,
    branchOnlyCommits,
    prHeadMatches: [...prHeadMatches].sort(),
    proofClass,
    changedFileCount: files.length,
    changedFiles: files.slice(0, 50),
    changedFilesTruncated: files.length > 50,
    recentBranchOnlyCommits: ancestorOfCanonical ? [] : recentBranchOnlyCommits(canonicalSha, sha),
  });
}

const records = branchRefs
  .sort((a, b) => a.ref.localeCompare(b.ref))
  .map((entry) => {
    const analysis = analysisBySha.get(entry.sha);
    let preliminaryDisposition = 'REVIEW';
    if (entry.branch === canonicalName) preliminaryDisposition = 'KEEP';
    else if (analysis.proofClass === 'EQUAL_CANONICAL' || analysis.proofClass === 'ANCESTOR_OF_CANONICAL') {
      preliminaryDisposition = 'DELETE_CANDIDATE_AFTER_ARCHIVE_FREEZE';
    } else if (analysis.proofClass === 'PR_HEAD_PRESERVED') {
      preliminaryDisposition = 'REVIEW_ARCHIVE_COVERAGE';
    }
    return {
      ref: entry.ref,
      branch: entry.branch,
      expectedSha: entry.sha,
      aliasesAtSameSha: analysis.aliases,
      proofClass: entry.branch === canonicalName ? 'CANONICAL' : analysis.proofClass,
      preliminaryDisposition,
      branchOnlyCommits: analysis.branchOnlyCommits,
      prHeadRefs: analysis.prHeadMatches,
      canonicalAncestorOfTip: analysis.canonicalAncestorOfTip,
      changedFileCount: analysis.changedFileCount,
      changedFiles: analysis.changedFiles,
      changedFilesTruncated: analysis.changedFilesTruncated,
      recentBranchOnlyCommits: analysis.recentBranchOnlyCommits,
    };
  });

const counts = records.reduce((acc, record) => {
  acc[record.proofClass] = (acc[record.proofClass] ?? 0) + 1;
  return acc;
}, {});

const residual = records
  .filter((record) => record.proofClass === 'DIVERGENT_UNIQUE' || record.proofClass === 'PR_HEAD_PRESERVED')
  .sort((a, b) => b.branchOnlyCommits - a.branchOnlyCommits || a.ref.localeCompare(b.ref));

const report = {
  schema: 'box3d-character-controller-repo-cleanup-gate1-classification-v1',
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? null,
  canonicalRef: `refs/heads/${canonicalName}`,
  canonicalSha,
  branchCount: records.length,
  distinctBranchTipCount: aliasesBySha.size,
  prHeadCount: prHeadRefs.length,
  proofClassCounts: counts,
  records,
};

console.log(`GATE1_CLASSIFICATION canonical=${report.canonicalRef}@${canonicalSha}`);
console.log(`GATE1_CLASSIFICATION branches=${report.branchCount} distinctTips=${report.distinctBranchTipCount} prHeads=${report.prHeadCount}`);
console.log(`GATE1_CLASSIFICATION proofCounts=${JSON.stringify(counts)}`);
console.log(`GATE1_CLASSIFICATION residualCount=${residual.length}`);
for (const item of residual) {
  console.log(`RESIDUAL ${item.branchOnlyCommits.toString().padStart(3)} ${item.proofClass.padEnd(18)} ${item.ref} ${item.expectedSha}${item.prHeadRefs.length ? ` pr=${item.prHeadRefs.join(',')}` : ''}`);
}

if (outPath) {
  fs.mkdirSync(new URL('.', `file://${process.cwd()}/${outPath}`).pathname, { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (records.filter((record) => record.ref === `refs/heads/${canonicalName}`).length !== 1) {
  throw new Error('Canonical branch must appear exactly once in inventory');
}
if (new Set(records.map((record) => record.ref)).size !== records.length) {
  throw new Error('Semantic duplicate branch refs detected');
}
