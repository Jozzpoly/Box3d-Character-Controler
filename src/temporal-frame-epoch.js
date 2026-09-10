function finite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

export class TemporalFrameEpochMapper {
  constructor({ fixedDt = 1 / 60, maxFrameDt = 0.1, startWallTime = 0 } = {}) {
    finite(fixedDt, 'fixedDt');
    finite(maxFrameDt, 'maxFrameDt');
    finite(startWallTime, 'startWallTime');
    if (fixedDt <= 0 || maxFrameDt <= 0) throw new RangeError('fixedDt and maxFrameDt must be > 0');
    this.fixedDt = fixedDt;
    this.maxFrameDt = maxFrameDt;
    this.previousWallTime = startWallTime;
    this.simTickTime = 0;
    this.accumulator = 0;
    this.epoch = 0;
  }

  advanceFrame(now, { hardCut = false } = {}) {
    finite(now, 'frame wall time');
    if (now < this.previousWallTime) throw new Error('frame wall time moved backwards');

    const rawDt = now - this.previousWallTime;
    const before = {
      wall: this.previousWallTime,
      simTickTime: this.simTickTime,
      accumulator: this.accumulator,
      acceptedClock: this.simTickTime + this.accumulator,
      epoch: this.epoch,
    };

    if (hardCut) {
      this.previousWallTime = now;
      this.accumulator = 0;
      this.epoch += 1;
      return {
        kind: 'hard-cut',
        epoch: this.epoch,
        previousEpoch: before.epoch,
        rawDt,
        acceptedDt: 0,
        discardedDt: rawDt,
        retainedWallStart: now,
        retainedWallEnd: now,
        acceptedClockStart: this.simTickTime,
        acceptedClockEnd: this.simTickTime,
        simTickStart: before.simTickTime,
        simTickEnd: this.simTickTime,
        accumulatorBefore: before.accumulator,
        accumulatorAfter: this.accumulator,
        ticks: [],
      };
    }

    const acceptedDt = Math.min(rawDt, this.maxFrameDt);
    const discardedDt = rawDt - acceptedDt;
    const discontinuity = discardedDt > 0;
    if (discontinuity) this.epoch += 1;

    const retainedWallStart = discontinuity ? now - acceptedDt : this.previousWallTime;
    const acceptedClockStart = before.acceptedClock;

    this.previousWallTime = now;
    this.accumulator += acceptedDt;
    const ticks = [];
    while (this.accumulator + 1e-12 >= this.fixedDt) {
      this.simTickTime += this.fixedDt;
      this.accumulator -= this.fixedDt;
      ticks.push(this.simTickTime);
    }

    return {
      kind: discontinuity ? 'tail-window' : 'continuous',
      epoch: this.epoch,
      previousEpoch: before.epoch,
      rawDt,
      acceptedDt,
      discardedDt,
      retainedWallStart,
      retainedWallEnd: now,
      acceptedClockStart,
      acceptedClockEnd: acceptedClockStart + acceptedDt,
      simTickStart: before.simTickTime,
      simTickEnd: this.simTickTime,
      accumulatorBefore: before.accumulator,
      accumulatorAfter: this.accumulator,
      ticks,
    };
  }

  classifyEvent(frame, eventWallTime, { afterFrameConsumed = false } = {}) {
    finite(eventWallTime, 'event wall time');
    if (!frame || !Number.isFinite(frame.retainedWallStart) || !Number.isFinite(frame.retainedWallEnd)) {
      throw new TypeError('valid frame window required');
    }

    if (eventWallTime < frame.retainedWallStart - 1e-12) {
      return { classification: 'discarded-past', epoch: frame.epoch, entitlement: null };
    }
    if (eventWallTime > frame.retainedWallEnd + 1e-12) {
      return { classification: 'future', epoch: frame.epoch, entitlement: null };
    }
    if (frame.kind === 'hard-cut') {
      return { classification: 'epoch-boundary', epoch: frame.epoch, entitlement: frame.acceptedClockStart };
    }

    const offset = Math.max(0, eventWallTime - frame.retainedWallStart);
    const entitlement = frame.acceptedClockStart + offset;
    if (afterFrameConsumed && entitlement <= frame.simTickEnd + 1e-12) {
      return { classification: 'late-after-consume', epoch: frame.epoch, entitlement };
    }
    return { classification: 'retained', epoch: frame.epoch, entitlement };
  }

  hardCut(now) {
    return this.advanceFrame(now, { hardCut: true });
  }
}
