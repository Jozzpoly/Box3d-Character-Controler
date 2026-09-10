import { TemporalFrameEpochMapper } from './temporal-frame-epoch.js';
import { TemporalInputShadow } from './temporal-input-shadow.js';
import { TemporalInputTimelineProbe } from './temporal-input-timeline-probe.js';

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

export class TemporalRuntimeShadowObserver {
  constructor({ fixedDt, maxFrameDt, startWallTime, touchRoot = null, recentLimit = 64, now = null, windowTarget = null } = {}) {
    const target = windowTarget ?? window;
    this.mapper = new TemporalFrameEpochMapper({ fixedDt, maxFrameDt, startWallTime });
    this.probe = new TemporalInputTimelineProbe();
    this.shadow = new TemporalInputShadow(now ? { now } : {}).install({ windowTarget: target, touchRoot });
    this.recentLimit = recentLimit;
    this.recent = [];
    this.counts = { frames: 0, events: 0, lifecycleCuts: 0, missedTicks: 0, prematureTicks: 0 };
    this.classifications = Object.create(null);
    this.controls = Object.create(null);
    this.maxDeliveryDelay = 0;
    this.maxMechanicalLateness = 0;
    this.maxPrematureTicks = 0;
  }

  beginFrame(nowSeconds) {
    const frame = this.mapper.advanceFrame(nowSeconds);
    this.probe.registerFrame(frame);
    this.counts.frames += 1;

    const events = this.shadow.drain();
    const audits = [];
    for (const event of events) {
      this.counts.events += 1;
      bump(this.controls, `${event.source}:${event.control}`);
      this.maxDeliveryDelay = Math.max(this.maxDeliveryDelay, event.deliveryDelay ?? 0);

      if (event.source === 'lifecycle') {
        this.counts.lifecycleCuts += 1;
        const audit = { event, classification: 'lifecycle-cut', frameKind: frame.kind };
        bump(this.classifications, audit.classification);
        this._remember(audit);
        audits.push(audit);
        continue;
      }

      const delivered = this.probe.classifyDelivered(event, this.mapper);
      const frameApplication = this.probe.auditCurrentFrameApplication(event, frame, this.mapper);
      const missedTicks = delivered.missedTicks ?? 0;
      const prematureTicks = frameApplication.prematureTicks ?? 0;
      this.counts.missedTicks += missedTicks;
      this.counts.prematureTicks += prematureTicks;
      this.maxMechanicalLateness = Math.max(this.maxMechanicalLateness, delivered.mechanicalLateness ?? 0);
      this.maxPrematureTicks = Math.max(this.maxPrematureTicks, prematureTicks);
      bump(this.classifications, delivered.classification);
      if (prematureTicks > 0) bump(this.classifications, 'would-apply-too-early');

      const audit = { event, delivered, frameApplication };
      this._remember(audit);
      audits.push(audit);
    }

    return { frame, audits };
  }

  endFrame(frame) {
    this.probe.consumeFrame(frame);
  }

  summary() {
    return {
      counts: { ...this.counts },
      classifications: { ...this.classifications },
      controls: { ...this.controls },
      maxDeliveryDelayMs: this.maxDeliveryDelay * 1000,
      maxMechanicalLatenessMs: this.maxMechanicalLateness * 1000,
      maxPrematureTicks: this.maxPrematureTicks,
      simulationEpoch: this.mapper.epoch,
      lifecycleEpoch: this.shadow.lifecycleEpoch,
      pendingEvents: this.shadow.summary().pending,
    };
  }

  publicApi() {
    return Object.freeze({
      summary: () => this.summary(),
      recent: () => this.recent.map((entry) => entry),
    });
  }

  destroy() {
    this.shadow.destroy();
  }

  _remember(entry) {
    this.recent.push(entry);
    if (this.recent.length > this.recentLimit) this.recent.splice(0, this.recent.length - this.recentLimit);
  }
}
