import { TemporalFrameEpochMapper } from '../src/temporal-frame-epoch.js';

const DT = 1 / 60;
const EPS = 1e-9;
function approx(a, b, eps = EPS) { return Math.abs(a - b) <= eps; }
function fail(message) { throw new Error(message); }

// Continuous frames stay inside one epoch and preserve normal fixed-step behavior.
const c = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
let f = c.advanceFrame(DT);
if (f.kind !== 'continuous' || f.epoch !== 0 || f.ticks.length !== 1) fail('continuous frame contract failed');
let ev = c.classifyEvent(f, DT * 0.5);
if (ev.classification !== 'retained' || !approx(ev.entitlement, DT * 0.5)) fail('continuous event mapping failed');

// 500 ms visible stall becomes a new tail-window epoch retaining the most recent 100 ms.
c.advanceFrame(0.1);
f = c.advanceFrame(0.6);
if (f.kind !== 'tail-window' || f.epoch !== 1) fail('long stall did not create tail-window epoch');
if (!approx(f.rawDt, 0.5) || !approx(f.acceptedDt, 0.1) || !approx(f.discardedDt, 0.4)) fail('long stall accounting failed');
if (!approx(f.retainedWallStart, 0.5) || !approx(f.retainedWallEnd, 0.6)) fail('tail window bounds wrong');
if (f.ticks.length !== 6) fail(`tail window should contribute six ticks, got ${f.ticks.length}`);

ev = c.classifyEvent(f, 0.35);
if (ev.classification !== 'discarded-past') fail('stale event was not classified as discarded past');
ev = c.classifyEvent(f, 0.55);
if (ev.classification !== 'retained') fail('recent tail event was not retained');
if (!approx(ev.entitlement, f.acceptedClockStart + 0.05)) fail('tail event entitlement wrong');
const late = c.classifyEvent(f, 0.55, { afterFrameConsumed: true });
if (late.classification !== 'late-after-consume') fail('post-consume event did not expose late delivery');

// Hard cuts reset fractional accumulator ownership and create a fresh epoch with no historical window.
const beforeCutEpoch = c.epoch;
const beforeCutSim = c.simTickTime;
f = c.hardCut(2.0);
if (f.kind !== 'hard-cut' || f.epoch !== beforeCutEpoch + 1) fail('hard cut did not create a new epoch');
if (f.acceptedDt !== 0 || f.ticks.length !== 0 || c.accumulator !== 0) fail('hard cut leaked old time');
if (!approx(c.simTickTime, beforeCutSim)) fail('hard cut advanced simulation');
ev = c.classifyEvent(f, 1.9);
if (ev.classification !== 'discarded-past') fail('pre-cut event survived hard epoch boundary');
ev = c.classifyEvent(f, 2.0);
if (ev.classification !== 'epoch-boundary') fail('boundary event not recognized');

// Repeated random schedules: accounting identity, monotonic simulation and classification invariants.
function random(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

let randomFrames = 0;
let tailWindows = 0;
let hardCuts = 0;
let retainedChecks = 0;
let lastGlobalSim = 0;

for (let seed = 1; seed <= 256; seed++) {
  const r = random(seed * 2654435761);
  const m = new TemporalFrameEpochMapper({ fixedDt: DT, maxFrameDt: 0.1, startWallTime: 0 });
  let wall = 0;
  let previousEpoch = 0;
  let previousSim = 0;
  for (let i = 0; i < 180; i++) {
    const hard = r() < 0.015;
    const gap = hard ? 0.02 + r() * 2 : (r() < 0.08 ? 0.101 + r() * 0.8 : 0.002 + r() * 0.03);
    wall += gap;
    const frame = m.advanceFrame(wall, { hardCut: hard });
    randomFrames++;

    if (!approx(frame.rawDt, frame.acceptedDt + frame.discardedDt)) fail('frame accounting identity failed');
    if (frame.acceptedDt > 0.1 + EPS) fail('accepted frame budget exceeded cap');
    if (m.simTickTime + EPS < previousSim) fail('simulation tick time moved backwards');

    if (hard) {
      hardCuts++;
      if (frame.kind !== 'hard-cut' || frame.epoch !== previousEpoch + 1) fail('random hard cut epoch failed');
      if (frame.acceptedDt !== 0 || frame.accumulatorAfter !== 0) fail('random hard cut time leak');
    } else if (gap > 0.1) {
      tailWindows++;
      if (frame.kind !== 'tail-window' || frame.epoch !== previousEpoch + 1) fail('random tail window epoch failed');
      if (!approx(frame.retainedWallStart, wall - 0.1)) fail('random tail retained start wrong');
      const middle = frame.retainedWallStart + frame.acceptedDt * 0.5;
      const mapped = m.classifyEvent(frame, middle);
      if (mapped.classification !== 'retained') fail('retained middle event rejected');
      if (mapped.entitlement < frame.acceptedClockStart - EPS || mapped.entitlement > frame.acceptedClockEnd + EPS) fail('retained entitlement escaped accepted clock window');
      retainedChecks++;
      const stale = m.classifyEvent(frame, frame.retainedWallStart - Math.min(0.001, frame.discardedDt * 0.5));
      if (frame.discardedDt > 0 && stale.classification !== 'discarded-past') fail('discarded past leaked in random tail window');
    } else {
      if (frame.kind !== 'continuous' || frame.epoch !== previousEpoch) fail('continuous frame changed epoch');
    }

    previousEpoch = frame.epoch;
    previousSim = m.simTickTime;
  }
  lastGlobalSim = Math.max(lastGlobalSim, m.simTickTime);
}

console.log('R2 FRAME EPOCH MAPPER CRUCIBLE PASS');
console.log(JSON.stringify({
  randomFrames,
  tailWindows,
  hardCuts,
  retainedChecks,
  maxObservedSimTime: lastGlobalSim,
  classification: 'FRAME_EPOCH_MAPPER_MAKES_CONTINUITY_TAIL_WINDOW_AND_HARD_CUT_EXPLICIT_WITH_MONOTONIC_FIXED_STEP_ACCOUNTING',
}, null, 2));
