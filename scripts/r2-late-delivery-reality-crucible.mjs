const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1;

function simulateFrames(frameTimes) {
  let previous = frameTimes[0] ?? 0;
  let accumulator = 0;
  let simTime = 0;
  const rows = [];
  for (let i = 1; i < frameTimes.length; i++) {
    const now = frameTimes[i];
    const rawDt = now - previous;
    const acceptedDt = Math.min(rawDt, MAX_FRAME_DT);
    const discardedDt = Math.max(0, rawDt - acceptedDt);
    previous = now;
    accumulator += acceptedDt;
    let ticks = 0;
    while (accumulator + 1e-12 >= FIXED_DT) {
      simTime += FIXED_DT;
      accumulator -= FIXED_DT;
      ticks++;
    }
    rows.push({ now, rawDt, acceptedDt, discardedDt, ticks, simTime, wallMinusSim: now - simTime });
  }
  return rows;
}

function steady60(duration) {
  const out = [0];
  for (let t = FIXED_DT; t <= duration + 1e-12; t += FIXED_DT) out.push(Number(t.toFixed(12)));
  return out;
}

function withStall(stallStart, resumeAt, duration) {
  const out = [0];
  for (let t = FIXED_DT; t <= stallStart + 1e-12; t += FIXED_DT) out.push(Number(t.toFixed(12)));
  out.push(resumeAt);
  for (let t = resumeAt + FIXED_DT; t <= duration + 1e-12; t += FIXED_DT) out.push(Number(t.toFixed(12)));
  return out;
}

const steady = simulateFrames(steady60(1.0));
const stalled = simulateFrames(withStall(0.1, 0.6, 1.0));
const hidden = simulateFrames([0, FIXED_DT, 2.0, 2.0 + FIXED_DT, 2.0 + 2 * FIXED_DT]);

const stallResume = stalled.find((r) => Math.abs(r.now - 0.6) < 1e-9);
if (!stallResume) throw new Error('stall resume frame missing');
if (Math.abs(stallResume.rawDt - 0.5) > 1e-9) throw new Error(`expected 500 ms raw gap, got ${stallResume.rawDt}`);
if (Math.abs(stallResume.discardedDt - 0.4) > 1e-9) throw new Error(`expected 400 ms discarded time, got ${stallResume.discardedDt}`);
if (stallResume.ticks !== 6) throw new Error(`100 ms clamp should permit six 60 Hz ticks, got ${stallResume.ticks}`);

const hiddenResume = hidden.find((r) => Math.abs(r.now - 2.0) < 1e-9);
if (!hiddenResume || hiddenResume.discardedDt < 1.88) throw new Error('hidden-tab style pause did not create a large temporal discontinuity');

// If event occurrence time is mapped directly to simulation time since epoch start,
// discarded wall time becomes extra mechanical wait after a long stall.
const eventDuringStallWallTime = 0.35;
const simAtResume = stallResume.simTime;
const directTimestampRemaining = Math.max(0, eventDuringStallWallTime - simAtResume);
if (directTimestampRemaining < 0.15) throw new Error('direct timestamp model did not expose post-stall input age');

// Conversely, applying the event immediately on resume would assign it to simulation
// time earlier than its wall-clock entitlement under the original epoch mapping.
const immediateRetroactivity = Math.max(0, eventDuringStallWallTime - simAtResume);
if (immediateRetroactivity <= 0) throw new Error('immediate resume policy unexpectedly preserved original epoch causality');

const summary = {
  fixedDtMs: FIXED_DT * 1000,
  maxAcceptedFrameDtMs: MAX_FRAME_DT * 1000,
  steadyFinalWallMinusSimMs: steady.at(-1).wallMinusSim * 1000,
  stall: {
    rawGapMs: stallResume.rawDt * 1000,
    acceptedMs: stallResume.acceptedDt * 1000,
    discardedMs: stallResume.discardedDt * 1000,
    catchupTicks: stallResume.ticks,
    simTimeAtResumeMs: simAtResume * 1000,
    wallTimeAtResumeMs: stallResume.now * 1000,
    wallMinusSimMs: stallResume.wallMinusSim * 1000,
    eventDuringStallWallTimeMs: eventDuringStallWallTime * 1000,
    directTimestampRemainingMs: directTimestampRemaining * 1000,
    immediateRetroactivityMs: immediateRetroactivity * 1000,
  },
  hiddenStylePause: {
    rawGapMs: hiddenResume.rawDt * 1000,
    discardedMs: hiddenResume.discardedDt * 1000,
    catchupTicks: hiddenResume.ticks,
    wallMinusSimMs: hiddenResume.wallMinusSim * 1000,
  },
  classification: 'FRAME_DT_CLAMP_ALREADY_CREATES_TEMPORAL_DISCONTINUITY; LATE_EVENT_POLICY_MUST_BE_CO-DESIGNED_WITH_EPOCH_POLICY',
};

console.log('R2 LATE DELIVERY REALITY CRUCIBLE PASS');
console.log(JSON.stringify(summary, null, 2));
