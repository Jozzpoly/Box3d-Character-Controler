const DT = 1 / 60;
const EPS = 1e-9;

function makeSchedules(duration) {
  function uniform(hz) {
    const frames = [];
    let t = 0;
    while (t < duration - EPS) {
      t = Math.min(duration, t + 1 / hz);
      frames.push(t);
    }
    return frames;
  }
  const hitch = [0.1];
  let t = 0.1;
  while (t < duration - EPS) {
    t = Math.min(duration, t + 1 / 60);
    hitch.push(t);
  }
  return { hz30: uniform(30), hz60: uniform(60), hz144: uniform(144), hitch100: hitch };
}

function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

function makeEvents(seed, duration = 1) {
  const r = rng(seed);
  const events = [];
  const types = ['move', 'yaw', 'jump'];
  for (let i = 0; i < 40; i++) {
    const type = types[Math.floor(r() * types.length)];
    const t = 0.002 + r() * (duration - 0.01);
    const value = type === 'move' ? [-1, 0, 1][Math.floor(r() * 3)] : type === 'yaw' ? (r() * 2 - 1) * Math.PI : true;
    events.push({ id: `${seed}:${i}`, t, order: i, type, value });
  }
  // Deliberate boundary/same-time events.
  events.push({ id: `${seed}:before`, t: DT - 1e-6, order: 1000, type: 'jump', value: true });
  events.push({ id: `${seed}:after`, t: DT + 1e-6, order: 1001, type: 'jump', value: true });
  events.push({ id: `${seed}:sameA`, t: 0.25, order: 1002, type: 'move', value: 1 });
  events.push({ id: `${seed}:sameB`, t: 0.25, order: 1003, type: 'move', value: -1 });
  return events.sort((a, b) => a.t - b.t || a.order - b.order);
}

function process(policy, frameTimes, events) {
  let sim = 0;
  let prevFrame = 0;
  let accumulator = 0;
  let eventIndex = 0;
  const live = { move: 0, yaw: 0 };
  const queued = [];
  const applied = new Map();
  const samples = [];

  function apply(ev, tickIndex) {
    if (ev.type !== 'jump') live[ev.type] = ev.value;
    applied.set(ev.id, tickIndex);
  }

  for (const frameTime of frameTimes) {
    const available = [];
    while (eventIndex < events.length && events[eventIndex].t <= frameTime + EPS) available.push(events[eventIndex++]);
    if (policy === 'latest-frame') {
      for (const ev of available) queued.push(ev);
    } else {
      for (const ev of available) queued.push(ev);
    }

    accumulator += frameTime - prevFrame;
    prevFrame = frameTime;
    while (accumulator + EPS >= DT) {
      const tickIndex = samples.length;
      const tickStart = sim;
      const jumpIds = [];

      if (policy === 'latest-frame') {
        while (queued.length) {
          const ev = queued.shift();
          if (ev.type === 'jump') jumpIds.push(ev.id);
          apply(ev, tickIndex);
        }
      } else if (policy === 'earliest-causal') {
        let i = 0;
        while (i < queued.length) {
          const ev = queued[i];
          if (ev.t <= tickStart + EPS) {
            queued.splice(i, 1);
            if (ev.type === 'jump') jumpIds.push(ev.id);
            apply(ev, tickIndex);
          } else i++;
        }
      } else if (policy === 'hybrid-fast-edge') {
        let i = 0;
        while (i < queued.length) {
          const ev = queued[i];
          const eligible = ev.type === 'jump' || ev.t <= tickStart + EPS;
          if (eligible) {
            queued.splice(i, 1);
            if (ev.type === 'jump') jumpIds.push(ev.id);
            apply(ev, tickIndex);
          } else i++;
        }
      }

      samples.push({ tickIndex, tickStart, move: live.move, yaw: live.yaw, jumpIds });
      sim += DT;
      accumulator -= DT;
    }
  }
  return { samples, applied };
}

function compareRuns(runs) {
  const names = Object.keys(runs);
  let mismatchTicks = 0;
  let eventEntitlementMismatches = 0;
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const A = runs[names[i]], B = runs[names[j]];
      const n = Math.min(A.samples.length, B.samples.length);
      let pair = 0;
      for (let k = 0; k < n; k++) {
        const a = A.samples[k], b = B.samples[k];
        if (a.move !== b.move || Math.abs(a.yaw - b.yaw) > EPS || a.jumpIds.join(',') !== b.jumpIds.join(',')) pair++;
      }
      mismatchTicks = Math.max(mismatchTicks, pair + Math.abs(A.samples.length - B.samples.length));
      const ids = new Set([...A.applied.keys(), ...B.applied.keys()]);
      for (const id of ids) if (A.applied.get(id) !== B.applied.get(id)) eventEntitlementMismatches++;
    }
  }
  return { mismatchTicks, eventEntitlementMismatches };
}

function causalViolations(run, events) {
  let violations = 0;
  let maxLatency = -Infinity;
  let minLatency = Infinity;
  for (const ev of events) {
    const tick = run.applied.get(ev.id);
    if (tick == null) continue;
    const tickStart = tick * DT;
    const latency = tickStart - ev.t;
    if (latency < -EPS) violations++;
    maxLatency = Math.max(maxLatency, latency);
    minLatency = Math.min(minLatency, latency);
  }
  return { violations, maxLatencyMs: maxLatency * 1000, minLatencyMs: minLatency * 1000 };
}

const policies = ['latest-frame', 'earliest-causal', 'hybrid-fast-edge'];
const aggregate = Object.fromEntries(policies.map(p => [p, { maxMismatchTicks: 0, entitlementMismatches: 0, causalViolations: 0, maxLatencyMs: -Infinity, minLatencyMs: Infinity }]));

for (let seed = 1; seed <= 128; seed++) {
  const events = makeEvents(seed);
  const schedules = makeSchedules(1.05);
  for (const policy of policies) {
    const runs = Object.fromEntries(Object.entries(schedules).map(([name, frames]) => [name, process(policy, frames, events)]));
    const cmp = compareRuns(runs);
    const agg = aggregate[policy];
    agg.maxMismatchTicks = Math.max(agg.maxMismatchTicks, cmp.mismatchTicks);
    agg.entitlementMismatches += cmp.eventEntitlementMismatches;
    for (const run of Object.values(runs)) {
      const c = causalViolations(run, events);
      agg.causalViolations += c.violations;
      agg.maxLatencyMs = Math.max(agg.maxLatencyMs, c.maxLatencyMs);
      agg.minLatencyMs = Math.min(agg.minLatencyMs, c.minLatencyMs);
    }
  }
}

if (aggregate['earliest-causal'].maxMismatchTicks !== 0) throw new Error('earliest-causal lost schedule invariance');
if (aggregate['earliest-causal'].entitlementMismatches !== 0) throw new Error('earliest-causal event entitlement differs by schedule');
if (aggregate['earliest-causal'].causalViolations !== 0) throw new Error('earliest-causal applied event before event time');
if (aggregate['earliest-causal'].maxLatencyMs > DT * 1000 + 1e-4) throw new Error('earliest-causal exceeds one tick quantization latency');
if (aggregate['latest-frame'].maxMismatchTicks === 0) throw new Error('latest-frame unexpectedly invariant');
if (aggregate['latest-frame'].causalViolations === 0) throw new Error('latest-frame unexpectedly has no retroactive event application under catch-up');
if (aggregate['hybrid-fast-edge'].causalViolations === 0) throw new Error('hybrid edge policy unexpectedly causal');

console.log('R2B TEMPORAL POLICY ADVERSARIAL PASS');
console.log(JSON.stringify(aggregate, null, 2));
console.log('interpretation=earliest-causal uniquely satisfied both schedule-invariant event entitlement and zero retroactive application in this adversarial matrix; hybrid-fast-edge preserved lower edge delay by deliberately reintroducing retroactive/schedule-sensitive semantics for edges.');
