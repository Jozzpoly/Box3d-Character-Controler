import { TemporalInputBuffer } from '../src/temporal-input-buffer.js';

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

b.enqueueState('move', 1, 1.0);
b.clear({ move: 0 });
if (b.pendingCount !== 0 || b.sampleAt(2).state.move !== 0) throw new Error('clear/reset contract failed');

console.log('R2 TEMPORAL INPUT BUFFER CONTRACT PASS');
