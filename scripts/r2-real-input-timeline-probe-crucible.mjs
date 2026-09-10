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

// Mirror the real browser order around a long visible stall:
// input handlers have already run when RAF resumes, then all catch-up ticks execute.
const catchupMapper = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
const catchupProbe = new TemporalInputTimelineProbe();
const warmup = catchupMapper.advanceFrame(0.100);
catchupProbe.observeFrame(warmup);
const resume = catchupMapper.advanceFrame(0.600);
catchupProbe.registerFrame(resume);
assert.equal(resume.kind, 'tail-window');
assert.equal(resume.ticks.length, 6);

const nearResumeInput = event(0.590, 0.599);
const earlyAudit = catchupProbe.auditCurrentFrameApplication(nearResumeInput, resume, catchupMapper);
assert.equal(earlyAudit.classification, 'would-apply-too-early');
assert.equal(earlyAudit.prematureTicks, 5);
assert.ok(earlyAudit.earliestEligibleTick > earlyAudit.firstCatchupTick);
catchupProbe.consumeFrame(resume);

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
  resumedCatchup: {
    catchupTicks: resume.ticks.length,
    occurrenceMs: nearResumeInput.occurrenceTime * 1000,
    firstCatchupTickMs: earlyAudit.firstCatchupTick * 1000,
    earliestEligibleTickMs: earlyAudit.earliestEligibleTick * 1000,
    prematureTicksIfMutableStateIsSampledImmediately: earlyAudit.prematureTicks,
  },
  interpretation: 'REAL_INPUT_CAN_BE_BOTH_LATE_AFTER_AN_ELIGIBLE_TICK_AND_TOO_EARLY_INSIDE_A_CATCHUP_BATCH; OCCURRENCE_TIME_MUST_SURVIVE_DELIVERY_TO_PREVENT_BOTH',
}, null, 2));
