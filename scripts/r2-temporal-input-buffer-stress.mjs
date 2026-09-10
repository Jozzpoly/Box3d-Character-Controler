import { TemporalInputBuffer } from '../src/temporal-input-buffer.js';

function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

const TRIALS = 128;
const EVENTS = 400;
const TICKS = 240;
const DT = 1 / 60;
let totalSamples = 0;
let totalEdges = 0;

for (let trial = 0; trial < TRIALS; trial++) {
  const random = rng(0x9e3779b9 ^ trial);
  const initial = { x: 0, y: 0, sprint: false };
  const buffer = new TemporalInputBuffer(initial);
  const events = [];

  for (let i = 0; i < EVENTS; i++) {
    // Deliberately cluster many events around fixed-tick boundaries and same timestamps.
    const tick = Math.floor(random() * (TICKS - 1));
    const mode = i % 5;
    const offset = mode === 0 ? 0 : mode === 1 ? -1e-9 : mode === 2 ? 1e-9 : (random() - 0.5) * DT;
    const time = Math.max(0, tick * DT + offset);
    const order = i;

    if (random() < 0.72) {
      const names = ['x', 'y', 'sprint'];
      const name = names[Math.floor(random() * names.length)];
      const value = name === 'sprint' ? random() < 0.5 : Math.round((random() * 2 - 1) * 1000) / 1000;
      const event = { kind: 'state', name, value, time, order };
      events.push(event);
      buffer.enqueueState(name, value, time, order);
    } else {
      const event = { kind: 'edge', name: 'jump', payload: { id: i }, time, order };
      events.push(event);
      buffer.enqueueEdge(event.name, event.payload, time, order);
    }
  }

  events.sort((a, b) => a.time - b.time || a.order - b.order);
  const referenceState = { ...initial };
  let cursor = 0;

  for (let tick = 0; tick < TICKS; tick++) {
    const simTime = tick * DT;
    const expectedEdges = [];
    while (cursor < events.length && events[cursor].time <= simTime) {
      const event = events[cursor++];
      if (event.kind === 'state') referenceState[event.name] = event.value;
      else expectedEdges.push(event);
    }

    const actual = buffer.sampleAt(simTime);
    totalSamples++;
    for (const key of Object.keys(referenceState)) {
      if (!Object.is(actual.state[key], referenceState[key])) {
        throw new Error(`trial ${trial} tick ${tick}: state mismatch for ${key}`);
      }
    }
    if (actual.edges.length !== expectedEdges.length) {
      throw new Error(`trial ${trial} tick ${tick}: edge count mismatch`);
    }
    for (let i = 0; i < expectedEdges.length; i++) {
      const a = actual.edges[i];
      const e = expectedEdges[i];
      if (a.order !== e.order || a.time !== e.time || a.payload.id !== e.payload.id) {
        throw new Error(`trial ${trial} tick ${tick}: edge ordering/payload mismatch`);
      }
      totalEdges++;
    }
  }

  // New epoch must erase all old temporal authority, including pending future events and order history.
  buffer.clear(initial);
  if (buffer.pendingCount !== 0) throw new Error(`trial ${trial}: pending events survived clear`);
  const order = buffer.enqueueEdge('epoch-edge', { trial }, 0);
  if (order !== 0) throw new Error(`trial ${trial}: order authority did not reset with epoch`);
  const epochSample = buffer.sampleAt(0);
  if (epochSample.edges.length !== 1 || epochSample.edges[0].payload.trial !== trial) {
    throw new Error(`trial ${trial}: new epoch edge failed`);
  }
}

console.log('R2 TEMPORAL INPUT BUFFER STRESS PASS');
console.log(`trials=${TRIALS} eventsPerTrial=${EVENTS} samples=${totalSamples} deliveredEdges=${totalEdges}`);
