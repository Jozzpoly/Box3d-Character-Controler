// Read-only R2 probe: relates delivered browser input to recent frame/epoch windows.
export class TemporalInputTimelineProbe {
  constructor({ maxFrames = 32 } = {}) {
    this.maxFrames = maxFrames;
    this.frames = [];
    this.consumedSimTime = 0;
    this.lastHardCutWallTime = null;
  }

  registerFrame(frame) {
    if (!frame || !Number.isFinite(frame.simTickEnd)) throw new TypeError('valid frame required');
    if (frame.kind === 'hard-cut') {
      this.frames.length = 0;
      this.lastHardCutWallTime = frame.retainedWallStart;
    }
    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) this.frames.splice(0, this.frames.length - this.maxFrames);
    return frame;
  }

  consumeFrame(frame) {
    if (!frame || !Number.isFinite(frame.simTickEnd)) throw new TypeError('valid frame required');
    this.consumedSimTime = Math.max(this.consumedSimTime, frame.simTickEnd);
    return frame;
  }

  observeFrame(frame) {
    this.registerFrame(frame);
    this.consumeFrame(frame);
    return frame;
  }

  classifyDelivered(event, mapper) {
    if (!event || !Number.isFinite(event.occurrenceTime) || !Number.isFinite(event.deliveryTime)) {
      throw new TypeError('timed shadow event required');
    }
    if (!mapper || typeof mapper.classifyEvent !== 'function') throw new TypeError('frame mapper required');

    if (this.lastHardCutWallTime != null && event.occurrenceTime < this.lastHardCutWallTime - 1e-12) {
      return { classification: 'discarded-hard-cut', entitlement: null, missedTicks: null, event };
    }

    const frame = this._findOwningFrame(event.occurrenceTime);
    if (!frame) {
      const gap = this._findDiscardedGap(event.occurrenceTime);
      if (gap) {
        return {
          classification: 'discarded-gap',
          entitlement: null,
          missedTicks: null,
          event,
          frameKind: gap.kind,
          frameEpoch: gap.epoch,
        };
      }
      return { classification: 'unresolved-history', entitlement: null, missedTicks: null, event };
    }

    const mapped = mapper.classifyEvent(frame, event.occurrenceTime, { afterFrameConsumed: false });
    if (mapped.entitlement == null) {
      return { ...mapped, missedTicks: null, event, frameKind: frame.kind, frameEpoch: frame.epoch };
    }

    const fixedDt = mapper.fixedDt;
    const mechanicalLateness = Math.max(0, this.consumedSimTime - mapped.entitlement);
    const missedTicks = mechanicalLateness <= 1e-12 ? 0 : Math.ceil((mechanicalLateness - 1e-12) / fixedDt);
    return {
      classification: missedTicks > 0 ? 'delivered-after-entitlement' : mapped.classification,
      originalClassification: mapped.classification,
      entitlement: mapped.entitlement,
      mechanicalLateness,
      missedTicks,
      deliveryDelay: event.deliveryDelay,
      event,
      frameKind: frame.kind,
      frameEpoch: frame.epoch,
    };
  }

  auditCurrentFrameApplication(event, frame, mapper) {
    if (!frame?.ticks || !mapper) throw new TypeError('frame and mapper required');
    const mapped = mapper.classifyEvent(frame, event.occurrenceTime, { afterFrameConsumed: false });
    if (mapped.entitlement == null || frame.ticks.length === 0) {
      return {
        classification: mapped.classification,
        entitlement: mapped.entitlement,
        firstCatchupTick: frame.ticks[0] ?? null,
        earliestEligibleTick: null,
        prematureTicks: 0,
      };
    }
    const earliestEligibleTick = frame.ticks.find((tick) => tick + 1e-12 >= mapped.entitlement) ?? null;
    const prematureTicks = frame.ticks.filter((tick) => tick < mapped.entitlement - 1e-12).length;
    return {
      classification: prematureTicks > 0 ? 'would-apply-too-early' : mapped.classification,
      entitlement: mapped.entitlement,
      firstCatchupTick: frame.ticks[0] ?? null,
      earliestEligibleTick,
      prematureTicks,
      frameKind: frame.kind,
      frameEpoch: frame.epoch,
    };
  }

  _findOwningFrame(wallTime) {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const frame = this.frames[i];
      if (wallTime >= frame.retainedWallStart - 1e-12 && wallTime <= frame.retainedWallEnd + 1e-12) return frame;
    }
    return null;
  }

  _findDiscardedGap(wallTime) {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const frame = this.frames[i];
      if (frame.kind !== 'tail-window' || !(frame.discardedDt > 0)) continue;
      const rawWallStart = frame.retainedWallEnd - frame.rawDt;
      if (wallTime >= rawWallStart - 1e-12 && wallTime < frame.retainedWallStart - 1e-12) return frame;
    }
    return null;
  }
}
