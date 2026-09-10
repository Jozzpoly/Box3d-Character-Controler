const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1;

const previousWall = 0.1;
const resumeWall = 0.6;
const simBeforeGap = 0.1;
const rawGap = resumeWall - previousWall;
const accepted = Math.min(rawGap, MAX_FRAME_DT);
const simAfterCatchup = simBeforeGap + accepted;

const events = [
  { id: 'old-held-down', kind: 'state', name: 'moveForward', value: 1, wall: 0.20 },
  { id: 'old-held-up', kind: 'state', name: 'moveForward', value: 0, wall: 0.36 },
  { id: 'old-jump', kind: 'edge', name: 'jump', wall: 0.35 },
  { id: 'recent-held-down', kind: 'state', name: 'moveForward', value: 1, wall: 0.51 },
  { id: 'recent-jump', kind: 'edge', name: 'jump', wall: 0.55 },
  { id: 'recent-held-up', kind: 'state', name: 'moveForward', value: 0, wall: 0.59 },
];

function oldEpochEntitlement(event) {
  return event.wall;
}

function tailWindowEntitlement(event) {
  const retainedWallStart = resumeWall - accepted;
  if (event.wall < retainedWallStart) return null;
  return simBeforeGap + (event.wall - retainedWallStart);
}

function hardCutEntitlement() {
  return null;
}

const retainedWallStart = resumeWall - accepted;
if (Math.abs(retainedWallStart - 0.5) > 1e-12) throw new Error('tail retained window should begin at 500 ms');

const oldEpoch = events.map((e) => ({ ...e, sim: oldEpochEntitlement(e) }));
const tailWindow = events.map((e) => ({ ...e, sim: tailWindowEntitlement(e) }));
const hardCut = events.map((e) => ({ ...e, sim: hardCutEntitlement(e) }));

const oldRecentJump = oldEpoch.find((e) => e.id === 'recent-jump');
const tailRecentJump = tailWindow.find((e) => e.id === 'recent-jump');
const tailOldJump = tailWindow.find((e) => e.id === 'old-jump');

const oldEpochPostResumeWait = Math.max(0, oldRecentJump.sim - simAfterCatchup);
if (oldEpochPostResumeWait < 0.34) throw new Error('old epoch mapping did not expose long post-resume wait for recent input');

if (tailOldJump.sim !== null) throw new Error('tail-window policy retained stale edge from discarded wall interval');
if (Math.abs(tailRecentJump.sim - 0.15) > 1e-12) throw new Error(`recent jump mapped to ${tailRecentJump.sim}, expected 0.15`);
if (tailRecentJump.sim > simAfterCatchup + 1e-12) throw new Error('tail-window recent event fell beyond retained catch-up interval');

const recentRetained = tailWindow.filter((e) => e.sim !== null);
for (let i = 1; i < recentRetained.length; i++) {
  if (recentRetained[i].sim < recentRetained[i - 1].sim) throw new Error('tail-window event order was not preserved');
}

// State from the discarded interval is not replayed as historical motion. Instead the
// latest pre-boundary state can be reconciled once as the new epoch initial state.
const staleStates = events.filter((e) => e.kind === 'state' && e.wall < retainedWallStart);
const latestStaleStateByName = new Map();
for (const e of staleStates) latestStaleStateByName.set(e.name, e.value);
if (latestStaleStateByName.get('moveForward') !== 0) throw new Error('stale held-state reconciliation did not collapse to latest boundary state');

// Hard-cut is intentionally strongest: no historical event survives. It is a suitable
// candidate for explicit visibility/session discontinuities, not ordinary short hitches.
if (hardCut.some((e) => e.sim !== null)) throw new Error('hard-cut retained historical event');

const summary = {
  gap: {
    previousWallMs: previousWall * 1000,
    resumeWallMs: resumeWall * 1000,
    rawGapMs: rawGap * 1000,
    retainedTailStartMs: retainedWallStart * 1000,
    acceptedMs: accepted * 1000,
    discardedMs: (rawGap - accepted) * 1000,
    simBeforeGapMs: simBeforeGap * 1000,
    simAfterCatchupMs: simAfterCatchup * 1000,
  },
  oldEpoch: {
    recentJumpEntitlementMs: oldRecentJump.sim * 1000,
    postResumeWaitMs: oldEpochPostResumeWait * 1000,
  },
  tailWindow: {
    staleEdgeDropped: tailOldJump.sim === null,
    recentJumpEntitlementMs: tailRecentJump.sim * 1000,
    retainedEventIds: recentRetained.map((e) => e.id),
    boundaryState: Object.fromEntries(latestStaleStateByName),
  },
  hardCut: {
    retainedEvents: 0,
  },
  candidateInterpretation: {
    visibleLongStall: 'tail-window bounded catch-up: cut discarded past, reconcile held state at boundary, preserve exact causal timing only inside retained recent window',
    visibilityOrSessionBreak: 'hard epoch cut: clear historical input and restart from a fresh boundary',
    continuousFrames: 'earliest-causal mapping inside the existing epoch',
  },
  classification: 'TAIL_WINDOW_REBASE_AVOIDS_STALE_POST_STALL_LATENCY_WITHOUT_RETROACTIVITY_INSIDE_THE_RETAINED_WINDOW',
};

console.log('R2 DISCONTINUITY POLICY CRUCIBLE PASS');
console.log(JSON.stringify(summary, null, 2));
