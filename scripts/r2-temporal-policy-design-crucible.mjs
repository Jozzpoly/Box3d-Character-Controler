const FIXED_DT = 1 / 60;
const EPS = 1e-9;

const events = [
  { t: 0.021, type: 'move', value: 1 },
  { t: 0.047, type: 'yaw', value: 0.8 },
  { t: 0.081, type: 'jump', value: true },
  { t: 0.093, type: 'move', value: -1 },
  { t: 0.121, type: 'yaw', value: -1.1 },
  { t: 0.167, type: 'jump', value: true },
  { t: 0.199, type: 'move', value: 0 },
  { t: 0.244, type: 'yaw', value: 2.2 },
  { t: 0.311, type: 'move', value: 1 },
  { t: 0.379, type: 'jump', value: true },
  { t: 0.442, type: 'move', value: 0 },
];

function uniform(hz, duration = 0.6) {
  const out = [];
  let t = 0;
  while (t < duration - EPS) {
    t = Math.min(duration, t + 1 / hz);
    out.push(t);
  }
  return out;
}

function hitch() {
  const out = [0.1];
  let t = 0.1;
  while (t < 0.6 - EPS) {
    t = Math.min(0.6, t + 1 / 60);
    out.push(t);
  }
  return out;
}

const schedules = {
  '30hz': uniform(30),
  '60hz': uniform(60),
  '144hz': uniform(144),
  '100ms-hitch': hitch(),
};

function cloneState(s) {
  return { move: s.move, yaw: s.yaw, jump: s.jump };
}

function applyEvent(state, ev, edgeQueue) {
  if (ev.type === 'jump') edgeQueue.push(ev);
  else state[ev.type] = ev.value;
}

function runLatestRaf(frameTimes) {
  const state = { move: 0, yaw: 0, jump: false };
  const samples = [];
  const edgeQueue = [];
  let eventIndex = 0;
  let simTime = 0;
  let prevFrame = 0;
  let accumulator = 0;

  for (const frameTime of frameTimes) {
    while (eventIndex < events.length && events[eventIndex].t <= frameTime + EPS) {
      applyEvent(state, events[eventIndex], edgeQueue);
      eventIndex++;
    }
    accumulator += frameTime - prevFrame;
    prevFrame = frameTime;
    while (accumulator + EPS >= FIXED_DT) {
      samples.push({
        tickStart: simTime,
        ...cloneState(state),
        jump: edgeQueue.length ? edgeQueue.shift().t : null,
      });
      simTime += FIXED_DT;
      accumulator -= FIXED_DT;
    }
  }
  return samples;
}

function runEarliestCausal(frameTimes, coalesceHeld = false) {
  const state = { move: 0, yaw: 0, jump: false };
  const samples = [];
  const edgeQueue = [];
  let eventIndex = 0;
  let simTime = 0;
  let prevFrame = 0;
  let accumulator = 0;

  for (const frameTime of frameTimes) {
    accumulator += frameTime - prevFrame;
    prevFrame = frameTime;
    while (accumulator + EPS >= FIXED_DT) {
      const eligible = [];
      while (eventIndex < events.length && events[eventIndex].t <= simTime + EPS) {
        eligible.push(events[eventIndex++]);
      }
      if (coalesceHeld) {
        const held = new Map();
        for (const ev of eligible) {
          if (ev.type === 'jump') edgeQueue.push(ev);
          else held.set(ev.type, ev);
        }
        for (const ev of held.values()) applyEvent(state, ev, edgeQueue);
      } else {
        for (const ev of eligible) applyEvent(state, ev, edgeQueue);
      }
      samples.push({
        tickStart: simTime,
        ...cloneState(state),
        jump: edgeQueue.length ? edgeQueue.shift().t : null,
      });
      simTime += FIXED_DT;
      accumulator -= FIXED_DT;
    }
  }
  return samples;
}

function maxScheduleMismatch(results) {
  const names = Object.keys(results);
  let differingTicks = 0;
  let maxValueDelta = 0;
  let jumpMismatchTicks = 0;
  for (let a = 0; a < names.length; a++) {
    for (let b = a + 1; b < names.length; b++) {
      const A = results[names[a]];
      const B = results[names[b]];
      const n = Math.min(A.length, B.length);
      let pairDiff = 0;
      let pairJump = 0;
      for (let i = 0; i < n; i++) {
        const delta = Math.max(Math.abs(A[i].move - B[i].move), Math.abs(A[i].yaw - B[i].yaw));
        if (delta > EPS) pairDiff++;
        maxValueDelta = Math.max(maxValueDelta, delta);
        if (A[i].jump !== B[i].jump) pairJump++;
      }
      differingTicks = Math.max(differingTicks, pairDiff + Math.abs(A.length - B.length));
      jumpMismatchTicks = Math.max(jumpMismatchTicks, pairJump);
    }
  }
  return { differingTicks, maxValueDelta, jumpMismatchTicks };
}

function eventLatencies(samples) {
  const out = [];
  for (const ev of events) {
    let applied = null;
    if (ev.type === 'jump') {
      applied = samples.find(s => s.jump === ev.t);
    } else {
      const idx = events.indexOf(ev);
      const previousSame = [...events.slice(0, idx)].reverse().find(e => e.type === ev.type);
      applied = samples.find(s => s.tickStart + EPS >= ev.t && s[ev.type] === ev.value && (!previousSame || s.tickStart + EPS >= ev.t));
    }
    if (applied) out.push(applied.tickStart - ev.t);
  }
  return out;
}

const policies = {
  latestRaf: runLatestRaf,
  earliestCausal: (frames) => runEarliestCausal(frames, false),
  causalCoalescedHeld: (frames) => runEarliestCausal(frames, true),
};

const report = {};
for (const [policyName, fn] of Object.entries(policies)) {
  const results = Object.fromEntries(Object.entries(schedules).map(([name, frames]) => [name, fn(frames)]));
  const invariance = maxScheduleMismatch(results);
  const latencyBySchedule = Object.fromEntries(Object.entries(results).map(([name, samples]) => [name, eventLatencies(samples)]));
  const allLatencies = Object.values(latencyBySchedule).flat();
  report[policyName] = {
    invariance,
    maxLatencyMs: Math.max(...allLatencies) * 1000,
    minLatencyMs: Math.min(...allLatencies) * 1000,
    latencyBySchedule,
  };
}

if (report.latestRaf.invariance.differingTicks === 0) throw new Error('latestRaf unexpectedly schedule invariant');
if (report.earliestCausal.invariance.differingTicks !== 0) throw new Error('earliestCausal is not schedule invariant');
if (report.earliestCausal.invariance.jumpMismatchTicks !== 0) throw new Error('earliestCausal jump edge mapping differs by schedule');
if (report.causalCoalescedHeld.invariance.differingTicks !== 0) throw new Error('coalesced causal policy is not schedule invariant');
if (report.earliestCausal.maxLatencyMs > FIXED_DT * 1000 + 1e-6) throw new Error('causal policy exceeds one-tick latency bound');

console.log('R2 TEMPORAL POLICY DESIGN CRUCIBLE PASS');
console.log(JSON.stringify(report, null, 2));
console.log('interpretation=latest RAF is responsive but schedule-dependent; earliest-causal policies restore schedule-invariant tick entitlement with <1 fixed-tick quantization latency in this model. Held-state coalescing changes queue representation, not tick semantics, for the tested chronology.');
