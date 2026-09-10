import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outArg = process.argv.find((arg) => arg.startsWith('--out='));
if (!outArg) throw new Error('Usage: node repo-cleanup-platform-state-snapshot.mjs --out=<directory>');
const outDir = outArg.slice('--out='.length);
const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if (!token || !repository) throw new Error('GH_TOKEN and GITHUB_REPOSITORY are required');
fs.mkdirSync(outDir, { recursive: true });

const [owner, repo] = repository.split('/');
const apiBase = `https://api.github.com/repos/${repository}`;

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...opts });
}

function classifyHttp(status, body, policy = {}) {
  if (status >= 200 && status < 300) {
    const isEmpty = Array.isArray(body)
      ? body.length === 0
      : body && typeof body === 'object' && Array.isArray(body.items)
        ? body.items.length === 0
        : false;
    return isEmpty ? 'EMPTY' : 'OBSERVED';
  }
  if (policy.emptyStatuses?.includes(status)) return 'EMPTY';
  return 'UNOBSERVABLE';
}

async function probe(name, relativeUrl, { emptyStatuses = [], summarize = null } = {}) {
  const url = `${apiBase}${relativeUrl}`;
  let response;
  let text = '';
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'box3d-character-controller-cleanup-platform-audit',
      },
    });
    text = await response.text();
  } catch (error) {
    return { name, url, status: 'UNOBSERVABLE', httpStatus: null, error: String(error) };
  }

  let body = null;
  if (text) {
    try { body = JSON.parse(text); }
    catch { body = { nonJsonPreview: text.slice(0, 800) }; }
  }
  const status = classifyHttp(response.status, body, { emptyStatuses });
  let summary = null;
  if (response.ok && summarize) {
    try { summary = summarize(body); }
    catch (error) { summary = { summarizerError: String(error) }; }
  }
  const result = { name, url, status, httpStatus: response.status, summary };
  if (!response.ok) {
    result.error = typeof body?.message === 'string' ? body.message : `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      result.note = 'Failure may reflect token scope, feature state, or endpoint visibility; do not infer absence from this result alone.';
    }
  }
  return result;
}

function listTreeFiles(ref, treePath) {
  const result = run('git', ['ls-tree', '-r', '--name-only', ref, '--', treePath]);
  if (result.status !== 0) return { status: 'UNOBSERVABLE', error: (result.stderr || result.stdout).trim(), files: [] };
  const files = result.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  return { status: files.length ? 'OBSERVED' : 'EMPTY', files };
}

const probes = {};
probes.repository = await probe('repository', '', {
  summarize: (r) => ({
    id: r.id,
    fullName: r.full_name,
    private: r.private,
    visibility: r.visibility,
    defaultBranch: r.default_branch,
    archived: r.archived,
    disabled: r.disabled,
    hasIssues: r.has_issues,
    hasWiki: r.has_wiki,
    hasPages: r.has_pages,
    hasDiscussions: r.has_discussions,
    deleteBranchOnMerge: r.delete_branch_on_merge,
    allowSquashMerge: r.allow_squash_merge,
    allowMergeCommit: r.allow_merge_commit,
    allowRebaseMerge: r.allow_rebase_merge,
    allowAutoMerge: r.allow_auto_merge,
    webCommitSignoffRequired: r.web_commit_signoff_required,
  }),
});
probes.branches = await probe('branches', '/branches?per_page=100', {
  summarize: (rows) => ({ count: rows.length, protectedCount: rows.filter((r) => r.protected).length, protectedBranches: rows.filter((r) => r.protected).map((r) => r.name) }),
});
probes.mainBranch = await probe('main-branch', '/branches/main', {
  summarize: (r) => ({ name: r.name, sha: r.commit?.sha ?? null, protected: r.protected ?? null, protectionEnabled: r.protection?.enabled ?? null }),
});
probes.mainProtection = await probe('main-protection', '/branches/main/protection', {
  summarize: (r) => ({ requiredStatusChecks: Boolean(r.required_status_checks), enforceAdmins: r.enforce_admins?.enabled ?? null, requiredPullRequestReviews: Boolean(r.required_pull_request_reviews) }),
});
probes.rulesets = await probe('rulesets', '/rulesets?per_page=100', {
  summarize: (rows) => ({ count: rows.length, names: rows.map((r) => r.name) }),
});
probes.workflows = await probe('actions-workflows', '/actions/workflows?per_page=100', {
  summarize: (r) => ({ count: r.total_count ?? r.workflows?.length ?? 0, activeCount: (r.workflows ?? []).filter((w) => w.state === 'active').length, workflows: (r.workflows ?? []).map((w) => ({ id: w.id, name: w.name, path: w.path, state: w.state })) }),
});
probes.deployments = await probe('deployments', '/deployments?per_page=100', {
  summarize: (rows) => ({ count: rows.length, refs: [...new Set(rows.map((d) => d.ref).filter(Boolean))].sort(), environments: [...new Set(rows.map((d) => d.environment).filter(Boolean))].sort() }),
});
probes.environments = await probe('environments', '/environments?per_page=100', {
  summarize: (r) => ({ count: r.total_count ?? r.environments?.length ?? 0, names: (r.environments ?? []).map((e) => e.name).sort() }),
});
probes.pages = await probe('pages', '/pages', {
  summarize: (r) => ({ status: r.status ?? null, buildType: r.build_type ?? null, sourceBranch: r.source?.branch ?? null, sourcePath: r.source?.path ?? null, htmlUrl: r.html_url ?? null }),
});
probes.actionsPermissions = await probe('actions-permissions', '/actions/permissions', {
  summarize: (r) => ({ enabled: r.enabled ?? null, allowedActions: r.allowed_actions ?? null, shaPinningRequired: r.sha_pinning_required ?? null }),
});
probes.workflowPermissions = await probe('workflow-permissions', '/actions/permissions/workflow', {
  summarize: (r) => ({ defaultWorkflowPermissions: r.default_workflow_permissions ?? null, canApprovePullRequestReviews: r.can_approve_pull_request_reviews ?? null }),
});
probes.artifactLogRetention = await probe('artifact-log-retention', '/actions/permissions/artifact-and-log-retention', {
  summarize: (r) => ({ days: r.days ?? null }),
});
probes.actionsCaches = await probe('actions-caches', '/actions/caches?per_page=100', {
  summarize: (r) => ({ count: r.total_count ?? r.actions_caches?.length ?? 0, totalSizeBytes: (r.actions_caches ?? []).reduce((sum, c) => sum + (c.size_in_bytes ?? 0), 0) }),
});
probes.webhooks = await probe('webhooks', '/hooks?per_page=100', {
  summarize: (rows) => ({ count: rows.length, activeCount: rows.filter((h) => h.active).length, events: [...new Set(rows.flatMap((h) => h.events ?? []))].sort() }),
});
probes.immutableReleases = await probe('immutable-releases', '/immutable-releases', {
  summarize: (r) => ({ enabled: r.enabled ?? r.immutable_releases_enabled ?? null }),
});
probes.releases = await probe('releases', '/releases?per_page=100', {
  summarize: (rows) => ({ count: rows.length, tags: rows.map((r) => r.tag_name) }),
});
probes.tags = await probe('tags', '/tags?per_page=100', {
  summarize: (rows) => ({ count: rows.length, names: rows.map((t) => t.name) }),
});

const mainWorkflowTree = listTreeFiles('refs/remotes/origin/main', '.github/workflows');
const helperWorkflowTree = listTreeFiles('HEAD', '.github/workflows');
const registry = probes.workflows.summary?.workflows ?? [];
const mainWorkflowSet = new Set(mainWorkflowTree.files);
const helperWorkflowSet = new Set(helperWorkflowTree.files);
const workflowRegistryClassification = registry.map((w) => ({
  ...w,
  existsOnMain: mainWorkflowSet.has(w.path),
  existsOnHelper: helperWorkflowSet.has(w.path),
  registryResidueRelativeToMain: !mainWorkflowSet.has(w.path),
}));

const wikiUrl = `https://github.com/${owner}/${repo}.wiki.git`;
const wiki = run('git', ['ls-remote', wikiUrl]);
let wikiProbe;
if (wiki.status === 0) {
  const refs = wiki.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  wikiProbe = { name: 'wiki-git-remote', url: wikiUrl, status: refs.length ? 'OBSERVED' : 'EMPTY', exitCode: 0, refCount: refs.length, refs: refs.slice(0, 20) };
} else {
  wikiProbe = {
    name: 'wiki-git-remote',
    url: wikiUrl,
    status: 'UNOBSERVABLE',
    exitCode: wiki.status,
    error: (wiki.stderr || wiki.stdout).trim().slice(0, 1000),
    note: 'A missing public wiki Git remote can mean the wiki is uninitialized/empty; this probe does not convert that ambiguity into EMPTY.',
  };
}

const observed = Object.values(probes).filter((p) => p.status === 'OBSERVED').length + (wikiProbe.status === 'OBSERVED' ? 1 : 0);
const empty = Object.values(probes).filter((p) => p.status === 'EMPTY').length + (wikiProbe.status === 'EMPTY' ? 1 : 0);
const unobservable = Object.values(probes).filter((p) => p.status === 'UNOBSERVABLE').length + (wikiProbe.status === 'UNOBSERVABLE' ? 1 : 0);

const snapshot = {
  schema: 'box3d-character-controller-platform-state-snapshot-v1',
  generatedAt: new Date().toISOString(),
  repository,
  execution: {
    helperSha: run('git', ['rev-parse', 'HEAD']).stdout.trim(),
    canonicalSha: run('git', ['rev-parse', 'refs/remotes/origin/main']).stdout.trim(),
  },
  probes,
  wiki: wikiProbe,
  workflowTopology: {
    mainTree: mainWorkflowTree,
    helperTree: helperWorkflowTree,
    registry: workflowRegistryClassification,
    registryCount: registry.length,
    registryResidueRelativeToMainCount: workflowRegistryClassification.filter((w) => w.registryResidueRelativeToMain).length,
  },
  summary: { observed, empty, unobservable },
  interpretationBoundary: [
    'OBSERVED means the endpoint/tool returned inspectable state; it is not a value judgement that the state is desirable.',
    'EMPTY means an observable collection or explicitly interpreted endpoint is empty.',
    'UNOBSERVABLE means permission, feature-state, endpoint visibility, or transport ambiguity prevents a reliable absence claim.',
    'Git branch cleanup, GitHub platform cleanup, and off-site backup are separate concerns.',
  ],
};

fs.writeFileSync(path.join(outDir, 'github-platform-state-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);

const md = [];
md.push('# GitHub platform-state snapshot');
md.push('');
md.push(`Generated: ${snapshot.generatedAt}`);
md.push(`Repository: \`${repository}\``);
md.push(`Helper: \`${snapshot.execution.helperSha}\``);
md.push(`Canonical: \`${snapshot.execution.canonicalSha}\``);
md.push('');
md.push('## Observation status');
md.push('');
md.push(`- OBSERVED: **${observed}**`);
md.push(`- EMPTY: **${empty}**`);
md.push(`- UNOBSERVABLE: **${unobservable}**`);
md.push('');
md.push('## Key repository lifecycle state');
md.push('');
const repoSummary = probes.repository.summary ?? {};
md.push(`- default branch: \`${repoSummary.defaultBranch ?? 'unobserved'}\``);
md.push(`- delete branch on merge: **${String(repoSummary.deleteBranchOnMerge)}**`);
md.push(`- wiki enabled flag: **${String(repoSummary.hasWiki)}**`);
md.push(`- Pages enabled flag: **${String(repoSummary.hasPages)}**`);
md.push(`- live branches: **${probes.branches.summary?.count ?? 'unobserved'}**, protected: **${probes.branches.summary?.protectedCount ?? 'unobserved'}**`);
md.push(`- rulesets: **${probes.rulesets.summary?.count ?? probes.rulesets.status}**`);
md.push(`- releases: **${probes.releases.summary?.count ?? probes.releases.status}**`);
md.push(`- tags: **${probes.tags.summary?.count ?? probes.tags.status}**`);
md.push('');
md.push('## Workflow topology');
md.push('');
md.push(`- workflow registry entries: **${snapshot.workflowTopology.registryCount}**`);
md.push(`- workflow files on canonical main: **${mainWorkflowTree.files.length}**`);
md.push(`- workflow files on cleanup helper: **${helperWorkflowTree.files.length}**`);
md.push(`- registry entries absent from canonical main tree: **${snapshot.workflowTopology.registryResidueRelativeToMainCount}**`);
for (const w of workflowRegistryClassification) {
  md.push(`  - ${w.id} \`${w.path}\` state=${w.state} main=${w.existsOnMain} helper=${w.existsOnHelper}`);
}
md.push('');
md.push('## Platform surfaces');
md.push('');
for (const p of [...Object.values(probes), wikiProbe]) {
  const detail = p.summary ? ` — ${JSON.stringify(p.summary)}` : p.error ? ` — ${p.error}` : '';
  md.push(`- ${p.name}: **${p.status}** (HTTP ${p.httpStatus ?? 'n/a'})${detail}`);
}
md.push('');
md.push('## Boundary');
md.push('');
md.push('- `UNOBSERVABLE` is intentionally not treated as empty or safe.');
md.push('- This snapshot does not authorize ref deletion or platform mutations.');
md.push('- The final cleanup still requires explicit Owner authorization for destructive operations.');
fs.writeFileSync(path.join(outDir, 'github-platform-state-summary.md'), `${md.join('\n')}\n`);

console.log(`PLATFORM_STATE observed=${observed} empty=${empty} unobservable=${unobservable} liveBranches=${probes.branches.summary?.count ?? 'n/a'} mainWorkflows=${mainWorkflowTree.files.length} registry=${registry.length} registryResidue=${snapshot.workflowTopology.registryResidueRelativeToMainCount}`);
