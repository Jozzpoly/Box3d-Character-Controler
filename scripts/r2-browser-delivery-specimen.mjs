import assert from 'node:assert/strict';
import { TemporalFrameEpochMapper } from '../src/temporal-frame-epoch.js';
import { TemporalInputBuffer } from '../src/temporal-input-buffer.js';

const EPS = 1e-9;
const mapper = new TemporalFrameEpochMapper({ fixedDt: 1 / 60, maxFrameDt: 0.1, startWallTime: 0 });
const input = new TemporalInputBuffer({ moveForward: false });

function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < EPS, `${label}: ${actual} != ${expected}`);
}

// Continuous delivery: occurrence and handler time are separate facts, while entitlement follows occurrence time.
const f1 = mapper.advanceFrame(0.05);
const normal = mapper.classifyEvent(f1, 0.03);
assert.equal(normal.classification, 'retained');
near(normal.entitlement, 0.03, 'continuous entitlement');
input.enqueueState('moveForward', true, normal.entitlement);
for (const tick of f1.ticks) input.sampleAt(tick);
assert.equal(input.sampleAt(f1.acceptedClockEnd).state.moveForward, true);

// Visible 500 ms main-thread stall. Only the recent 100 ms tail remains owned by the simulation.
const f2 = mapper.advanceFrame(0.55);
assert.equal(f2.kind, 'tail-window');
near(f2.retainedWallStart, 0.45, 'tail start');
const staleEdge = mapper.classifyEvent(f2, 0.30);
const recentEdge = mapper.classifyEvent(f2, 0.50);
assert.equal(staleEdge.classification, 'discarded-past');
assert.equal(recentEdge.classification, 'retained');
near(recentEdge.entitlement, f2.acceptedClockStart + 0.05, 'recent edge entitlement');

// If a retained event's handler runs only after the catch-up frame consumed its entitlement,
// the mapper must expose the conflict rather than silently retime it.
const late = mapper.classifyEvent(f2, 0.47, { afterFrameConsumed: true });
assert.equal(late.classification, 'late-after-consume');
assert.ok(late.entitlement <= f2.simTickEnd + EPS);

// State reconciliation is semantically different from replaying stale history.
// A stale state transition is not replayed; current physical key state can seed a fresh boundary state.
assert.equal(mapper.classifyEvent(f2, 0.20).classification, 'discarded-past');
const reconciledState = { moveForward: false };
input.clear(reconciledState);
assert.deepEqual(input.sampleAt(f2.simTickEnd).state, reconciledState);

// Visibility/blur is a hard lifecycle boundary: no historical edge survives it.
const cut = mapper.hardCut(1.50);
assert.equal(cut.kind, 'hard-cut');
assert.equal(cut.ticks.length, 0);
input.clear({ moveForward: false });
assert.equal(input.pendingCount, 0);
assert.deepEqual(input.sampleAt(cut.simTickEnd), { state: { moveForward: false }, edges: [] });

// A new event at the fresh epoch boundary is explicit, not backdated into the old epoch.
const boundary = mapper.classifyEvent(cut, 1.50);
assert.equal(boundary.classification, 'epoch-boundary');
near(boundary.entitlement, cut.simTickEnd, 'boundary entitlement');

console.log('R2 BROWSER DELIVERY SPECIMEN PASS');
console.log(JSON.stringify({
  continuous: { occurrence: 0.03, handlerBeforeFrameConsume: true, entitlement: normal.entitlement },
  visibleStall: {
    rawGap: f2.rawDt,
    retainedWindow: [f2.retainedWallStart, f2.retainedWallEnd],
    staleEdge: staleEdge.classification,
    recentEdge: recentEdge.classification,
    lateHandler: late.classification,
  },
  visibilityCut: { epoch: cut.epoch, classificationAtBoundary: boundary.classification },
  interpretation: 'OCCURRENCE_TIME_CAN_DEFINE_ENTITLEMENT_ONLY_WHILE_DELIVERY_PRECEDES_CONSUMPTION; LATE DELIVERY REQUIRES AN EXPLICIT POLICY',
}, null, 2));
