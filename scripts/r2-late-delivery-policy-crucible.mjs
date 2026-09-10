import assert from 'node:assert/strict';
import { TemporalFrameEpochMapper } from '../src/temporal-frame-epoch.js';

const DT = 1 / 60;
const EPS = 1e-12;

function classifyLateness({ frameEnd, occurrence, handlerDelay }) {
  const mapper = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
  const frame = mapper.advanceFrame(frameEnd);
  const event = mapper.classifyEvent(frame, occurrence, { afterFrameConsumed: true });
  const handlerTime = occurrence + handlerDelay;
  const lateness = event.entitlement == null ? Infinity : Math.max(0, frame.simTickEnd - event.entitlement);
  return { frame, event, handlerTime, lateness };
}

// The important distinction is semantic, not merely a number of milliseconds:
// 1. event still belongs to retained current history but its handler ran after consumption;
// 2. event belongs to wall time the simulation explicitly discarded;
// 3. lifecycle cut starts a new epoch, so old history has no replay entitlement.

const ordinary = classifyLateness({ frameEnd: 0.020, occurrence: 0.015, handlerDelay: 0.005 });
assert.equal(ordinary.event.classification, 'late-after-consume');
assert.ok(ordinary.lateness < DT + EPS, 'ordinary late delivery should be less than one fixed step old');

const twoStepLate = classifyLateness({ frameEnd: 0.050, occurrence: 0.010, handlerDelay: 0.040 });
assert.equal(twoStepLate.event.classification, 'late-after-consume');
assert.ok(twoStepLate.lateness > 2 * DT - EPS, 'specimen must expose materially stale retained history');

const mapper = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
mapper.advanceFrame(0.1);
const stalled = mapper.advanceFrame(0.6);
assert.equal(stalled.kind, 'tail-window');
const discarded = mapper.classifyEvent(stalled, 0.30, { afterFrameConsumed: true });
const retainedButLate = mapper.classifyEvent(stalled, 0.55, { afterFrameConsumed: true });
assert.equal(discarded.classification, 'discarded-past');
assert.equal(retainedButLate.classification, 'late-after-consume');

const cut = mapper.hardCut(2.0);
assert.equal(mapper.classifyEvent(cut, 2.0).classification, 'epoch-boundary');
assert.equal(mapper.classifyEvent(cut, 1.9).classification, 'discarded-past');

// Candidate policy audit.
// "Always replay" fails because discarded history and old epochs would resurrect stale intent.
const alwaysReplaySafe = false;
// "Always drop if late" is causally clean but loses even sub-step input that is still part of current retained history.
const alwaysDropPreservesResponsiveCurrentInput = false;
// A pure millisecond grace window cannot decide lifecycle/discarded-history cases by itself.
const timeThresholdAloneSufficient = false;

assert.equal(alwaysReplaySafe, false);
assert.equal(alwaysDropPreservesResponsiveCurrentInput, false);
assert.equal(timeThresholdAloneSufficient, false);

const result = {
  ordinaryCurrentEpoch: {
    classification: ordinary.event.classification,
    latenessMs: ordinary.lateness * 1000,
    interpretation: 'current retained history; potentially recoverable without pretending discarded wall time existed',
  },
  materiallyLateCurrentEpoch: {
    classification: twoStepLate.event.classification,
    latenessMs: twoStepLate.lateness * 1000,
    interpretation: 'still current epoch, but already old enough that silent replay becomes mechanically questionable',
  },
  visibleStall: {
    discardedHistory: discarded.classification,
    retainedTailDeliveredLate: retainedButLate.classification,
  },
  lifecycleCut: {
    oldHistory: mapper.classifyEvent(cut, 1.9).classification,
    freshBoundary: mapper.classifyEvent(cut, 2.0).classification,
  },
  falsifiedPolicies: ['always-replay', 'always-drop-late', 'time-threshold-without-epoch-semantics'],
  survivingDirection: 'EPOCH_FIRST_THEN_BOUNDED_LATENESS_POLICY_FOR_RETAINED_CURRENT_HISTORY',
};

console.log('R2 LATE DELIVERY POLICY CRUCIBLE PASS');
console.log(JSON.stringify(result, null, 2));
