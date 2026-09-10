import assert from 'node:assert/strict';
import { TemporalFrameEpochMapper } from '../src/temporal-frame-epoch.js';
import { TemporalInputTimelineProbe } from '../src/temporal-input-timeline-probe.js';

const DT = 1 / 60;
const mapper = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
const probe = new TemporalInputTimelineProbe();

const event = (occurrenceTime, deliveryTime, lifecycleEpoch = 0) => ({
  occurrenceTime,
  deliveryTime,
  deliveryDelay: Math.max(0, deliveryTime - occurrenceTime),
  lifecycleEpoch,
  source: 'keyboard',
  kind: 'down',
  control: 'jump',
});

const f1 = mapper.advanceFrame(0.020);
probe.observeFrame(f1);

const missedFirstEligibleTick = probe.classifyDelivered(event(0.015, 0.021), mapper);
assert.equal(missedFirstEligibleTick.classification, 'delivered-after-entitlement');
assert.equal(missedFirstEligibleTick.missedTicks, 1);

const stillFutureToPhysics = probe.classifyDelivered(event(0.019, 0.021), mapper);
assert.equal(stillFutureToPhysics.classification, 'retained');
assert.equal(stillFutureToPhysics.missedTicks, 0);

const f2 = mapper.advanceFrame(0.040);
probe.observeFrame(f2);
const previousFrameDeliveredLater = probe.classifyDelivered(event(0.019, 0.041), mapper);
assert.equal(previousFrameDeliveredLater.classification, 'delivered-after-entitlement');
assert.equal(previousFrameDeliveredLater.missedTicks, 1);
assert.equal(previousFrameDeliveredLater.frameKind, 'continuous');

const stall = mapper.advanceFrame(0.540);
probe.observeFrame(stall);
assert.equal(stall.kind, 'tail-window');
const staleGapEvent = probe.classifyDelivered(event(0.200, 0.541), mapper);
assert.equal(staleGapEvent.classification, 'discarded-gap');
const retainedTailEvent = probe.classifyDelivered(event(0.500, 0.541), mapper);
assert.notEqual(retainedTailEvent.classification, 'discarded-gap');
assert.equal(retainedTailEvent.frameKind, 'tail-window');

const cut = mapper.hardCut(1.0);
probe.observeFrame(cut);
const beforeHardCut = probe.classifyDelivered(event(0.900, 1.001, 0), mapper);
assert.equal(beforeHardCut.classification, 'discarded-hard-cut');
const atBoundary = probe.classifyDelivered(event(1.000, 1.001, 1), mapper);
assert.equal(atBoundary.classification, 'epoch-boundary');
assert.equal(atBoundary.frameKind, 'hard-cut');

console.log('R2 REAL INPUT TIMELINE PROBE CRUCIBLE PASS');
console.log(JSON.stringify({
  missedFirstEligibleTick: {
    deliveryDelayMs: missedFirstEligibleTick.deliveryDelay * 1000,
    mechanicalLatenessMs: missedFirstEligibleTick.mechanicalLateness * 1000,
    missedTicks: missedFirstEligibleTick.missedTicks,
  },
  stillFutureToPhysics: {
    deliveryDelayMs: stillFutureToPhysics.deliveryDelay * 1000,
    missedTicks: stillFutureToPhysics.missedTicks,
  },
  previousFrameDeliveredLater: {
    missedTicks: previousFrameDeliveredLater.missedTicks,
  },
  stall: {
    staleGap: staleGapEvent.classification,
    retainedTail: retainedTailEvent.classification,
  },
  hardCut: {
    oldEvent: beforeHardCut.classification,
    boundaryEvent: atBoundary.classification,
  },
  interpretation: 'HANDLER_DELAY_AND_MISSED_PHYSICS_OPPORTUNITIES_ARE_DISTINCT_MEASUREMENTS; FRAME_HISTORY_IS_REQUIRED_TO_CLASSIFY_REAL_DELIVERED_INPUT',
}, null, 2));
