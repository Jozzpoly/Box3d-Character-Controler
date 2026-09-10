import { TemporalInputBuffer } from '../src/temporal-input-buffer.js';
import { TEMPORAL_INPUT_INITIAL_STATE, eventTimeSeconds, sampleTemporalDonorIntent } from '../src/temporal-player-intent.js';

const basis = { forward: [0, 0, -1], right: [1, 0, 0] };

function buildBuffer(events) {
  const buffer = new TemporalInputBuffer(TEMPORAL_INPUT_INITIAL_STATE);
  for (const event of events) {
    if (event.kind === 'state') buffer.enqueueState(event.name, event.value, event.time, event.order);
    else buffer.enqueueEdge(event.name, event.payload, event.time, event.order);
  }
  return buffer;
}

const events = [
  { kind: 'state', name: 'moveForward', value: 1, time: 0.011, order: 0 },
  { kind: 'state', name: 'sprint', value: true, time: 0.019, order: 1 },
  { kind: 'edge', name: 'jump', payload: null, time: 0.021, order: 2 },
  { kind: 'state', name: 'jumpHeld', value: true, time: 0.021, order: 3 },
  { kind: 'state', name: 'moveRight', value: 1, time: 0.034, order: 4 },
  { kind: 'state', name: 'jumpHeld', value: false, time: 0.046, order: 5 },
  { kind: 'state', name: 'moveForward', value: 0, time: 0.071, order: 6 },
  { kind: 'state', name: 'sprint', value: false, time: 0.081, order: 7 },
];

const tickTimes = Array.from({ length: 8 }, (_, i) => i / 60);

function sequenceForDelivery(frameTimes) {
  const buffer = new TemporalInputBuffer(TEMPORAL_INPUT_INITIAL_STATE);
  let eventCursor = 0;
  let tickCursor = 0;
  const sequence = [];

  for (const frameTime of frameTimes) {
    while (eventCursor < events.length && events[eventCursor].time <= frameTime) {
      const event = events[eventCursor++];
      if (event.kind === 'state') buffer.enqueueState(event.name, event.value, event.time, event.order);
      else buffer.enqueueEdge(event.name, event.payload, event.time, event.order);
    }

    while (tickCursor < tickTimes.length && tickTimes[tickCursor] <= frameTime) {
      const simTime = tickTimes[tickCursor++];
      sequence.push(sampleTemporalDonorIntent(buffer, simTime, basis));
    }
  }
  return sequence;
}

const schedules = {
  '30hz': [0, 1/30, 2/30, 3/30, 4/30, 5/30],
  '60hz': [0, 1/60, 2/60, 3/60, 4/60, 5/60, 6/60, 7/60, 8/60],
  '144hz': Array.from({ length: 25 }, (_, i) => i / 144),
  '100ms-hitch': [0, 0.1, 0.1167, 0.1334, 0.1501],
};

const baseline = sequenceForDelivery(schedules['60hz']);
for (const [name, frames] of Object.entries(schedules)) {
  const sequence = sequenceForDelivery(frames);
  if (sequence.length < baseline.length) continue;
  for (let i = 0; i < baseline.length; i++) {
    const a = baseline[i];
    const b = sequence[i];
    const keys = ['moveForward', 'moveRight', 'jump', 'jumpHeld', 'sprint'];
    for (const key of keys) {
      if (!Object.is(a[key], b[key])) throw new Error(`${name}: intent mismatch at tick ${i} field ${key}`);
    }
  }
}

// Donor normalization contract must remain intact at the temporal boundary.
const normalized = buildBuffer([
  { kind: 'state', name: 'moveForward', value: 1, time: 0, order: 0 },
  { kind: 'state', name: 'moveRight', value: 1, time: 0, order: 1 },
]);
const diagonal = sampleTemporalDonorIntent(normalized, 0, basis);
const magnitude = Math.hypot(diagonal.moveForward, diagonal.moveRight);
if (Math.abs(magnitude - 1) > 1e-12) throw new Error('temporal boundary bypassed Donor movement normalization');

// Browser event timestamps must stay in the same seconds scale used by the simulation clock.
if (eventTimeSeconds({ timeStamp: 1234.5 }) !== 1.2345) throw new Error('event timestamp conversion failed');
let invalidRejected = false;
try { eventTimeSeconds({ timeStamp: Number.NaN }); } catch { invalidRejected = true; }
if (!invalidRejected) throw new Error('invalid browser event timestamp accepted');

console.log('R2 TEMPORAL INTENT BOUNDARY CRUCIBLE PASS');
