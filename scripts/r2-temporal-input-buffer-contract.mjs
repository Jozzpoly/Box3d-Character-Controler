import { TemporalInputBuffer } from '../src/temporal-input-buffer.js';

function expectThrow(fn, message) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) throw new Error(message);
}

const b = new TemporalInputBuffer({ move: 0 });
b.enqueueState('move', 1, 0.02, 2);
b.enqueueEdge('jump', true, 0.02, 1);
b.enqueueState('move', -1, 0.02, 3);
b.enqueueEdge('jump', true, 0.04, 4);

let s = b.sampleAt(0.016);
if (s.state.move !== 0 || s.edges.length !== 0) throw new Error('future events leaked before eligibility');

s = b.sampleAt(0.02);
if (s.state.move !== -1) throw new Error('same-time state ordering failed');
if (s.edges.length !== 1 || s.edges[0].name !== 'jump' || s.edges[0].order !== 1) throw new Error('eligible edge ordering failed');
if (b.pendingCount !== 1) throw new Error('pending queue count wrong after partial consume');

s = b.sampleAt(0.04);
if (s.edges.length !== 1 || s.edges[0].order !== 4) throw new Error('later edge eligibility failed');
if (b.pendingCount !== 0) throw new Error('queue did not drain');

// Explicit replay/import order must advance the automatic sequence.
const c = new TemporalInputBuffer();
const explicit = c.enqueueEdge('explicit', null, 1, 10);
const automatic = c.enqueueEdge('automatic', null, 1);
if (explicit !== 10 || automatic !== 11) throw new Error('automatic order did not advance past explicit order');
expectThrow(() => c.enqueueEdge('duplicate', null, 1, 10), 'duplicate event order was accepted');

// Time within an epoch is monotonic; rewind requires an explicit new epoch.
const d = new TemporalInputBuffer({ held: false });
d.enqueueState('held', true, 0.5);
d.sampleAt(0.5);
expectThrow(() => d.sampleAt(0.49), 'simulation rewind was silently accepted');
expectThrow(() => d.enqueueState('held', false, 0.49), 'late event before consumed simulation time was silently accepted');
expectThrow(() => d.enqueueEdge('jump', null, 0.5), 'late event exactly on an already-consumed tick was silently accepted');
d.clear({ held: false });
if (d.sampleAt(0.1).state.held !== false) throw new Error('clear did not reset epoch time/state');

// Invalid clocks/order are rejected at the boundary rather than poisoning ordering.
expectThrow(() => d.enqueueEdge('bad-time', null, Number.NaN), 'NaN event time accepted');
expectThrow(() => d.enqueueEdge('bad-order', null, 1, -1), 'negative order accepted');
expectThrow(() => d.sampleAt(Number.POSITIVE_INFINITY), 'non-finite simulation time accepted');

// Burst edges at the same timestamp must all survive, in deterministic order.
const e = new TemporalInputBuffer();
for (let i = 0; i < 64; i++) e.enqueueEdge('burst', i, 2);
const burst = e.sampleAt(2).edges;
if (burst.length !== 64) throw new Error('same-time edge burst lost events');
for (let i = 0; i < burst.length; i++) {
  if (burst[i].payload !== i || burst[i].order !== i) throw new Error('same-time edge burst ordering corrupted');
}

// Large future queues must not leak when simulation advances incrementally.
const f = new TemporalInputBuffer({ axis: 0 });
for (let i = 0; i < 2000; i++) f.enqueueState('axis', i, i / 1000);
for (let tick = 0; tick < 120; tick++) {
  const t = tick / 60;
  const sample = f.sampleAt(t);
  const expected = Math.floor(t * 1000 + 1e-9);
  if (sample.state.axis !== expected) throw new Error(`incremental eligibility mismatch at tick ${tick}: ${sample.state.axis} != ${expected}`);
}

b.clear({ move: 0 });
if (b.pendingCount !== 0 || b.sampleAt(2).state.move !== 0) throw new Error('clear/reset contract failed');

console.log('R2 TEMPORAL INPUT BUFFER CONTRACT PASS');
