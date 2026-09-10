import assert from 'node:assert/strict';
import { TemporalFrameEpochMapper } from '../src/temporal-frame-epoch.js';

const DT = 1 / 60;

function nextTickAfter(simTickEnd) {
  return simTickEnd + DT;
}

function probeContinuous(frameEnd, eventTime) {
  const mapper = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
  const frame = mapper.advanceFrame(frameEnd);
  const event = mapper.classifyEvent(frame, eventTime, { afterFrameConsumed: true });
  assert.equal(event.classification, 'late-after-consume');
  const lateness = frame.simTickEnd - event.entitlement;
  const placedAt = nextTickAfter(frame.simTickEnd);
  return {
    lateness,
    placedAt,
    forwardShift: placedAt - event.entitlement,
    frame,
    event,
  };
}

const nearBoundary = probeContinuous(0.020, 0.015);
const almostOneTickOld = probeContinuous(0.033, 0.017);
const olderCurrentEpoch = probeContinuous(0.050, 0.010);

assert.ok(nearBoundary.forwardShift < 1.2 * DT, 'fresh late input should move only about one tick forward');
assert.ok(almostOneTickOld.forwardShift < 2 * DT, 'sub-step late input should not accumulate unbounded delay');
assert.ok(olderCurrentEpoch.forwardShift > 2 * DT, 'older retained intent exposes why forward placement cannot be unconditional');

// A visible stall creates a new epoch and retains only the accepted tail.
const mapper = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
mapper.advanceFrame(0.1);
const resume = mapper.advanceFrame(0.6);
assert.equal(resume.kind, 'tail-window');
const stale = mapper.classifyEvent(resume, 0.30, { afterFrameConsumed: true });
const freshTail = mapper.classifyEvent(resume, 0.595, { afterFrameConsumed: true });
assert.equal(stale.classification, 'discarded-past');
assert.equal(freshTail.classification, 'late-after-consume');
const freshTailPlacement = nextTickAfter(resume.simTickEnd);
const freshTailShift = freshTailPlacement - freshTail.entitlement;
assert.ok(freshTailShift < 1.5 * DT, 'fresh retained tail should remain cheaply recoverable');

// A hard lifecycle cut is categorical: no forward placement of pre-cut intent.
const cut = mapper.hardCut(2.0);
assert.equal(mapper.classifyEvent(cut, 1.99, { afterFrameConsumed: true }).classification, 'discarded-past');

const summary = {
  nearBoundary: { latenessMs: nearBoundary.lateness * 1000, forwardShiftMs: nearBoundary.forwardShift * 1000 },
  almostOneTickOld: { latenessMs: almostOneTickOld.lateness * 1000, forwardShiftMs: almostOneTickOld.forwardShift * 1000 },
  olderCurrentEpoch: { latenessMs: olderCurrentEpoch.lateness * 1000, forwardShiftMs: olderCurrentEpoch.forwardShift * 1000 },
  retainedTailAfterStall: { forwardShiftMs: freshTailShift * 1000 },
  result: 'FORWARD_PLACEMENT_IS_PLAUSIBLE_ONLY_FOR_FRESH_RETAINED_CURRENT_EPOCH_INTENT; IT_IS_NOT_A_GENERAL_LATE_EVENT_POLICY',
  nextQuestion: 'define freshness from simulation semantics / perceptual tolerance, not arbitrary wall-time alone',
};

console.log('R2 LATE INTENT FORWARD PLACEMENT CRUCIBLE PASS');
console.log(JSON.stringify(summary, null, 2));
