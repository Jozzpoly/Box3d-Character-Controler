const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1;

function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

function earliestTickOffset(eventOffset, accumulatorBefore) {
  const first = FIXED_DT - accumulatorBefore;
  if (eventOffset <= first + 1e-12) return first;
  return first + Math.ceil((eventOffset - first - 1e-12) / FIXED_DT) * FIXED_DT;
}

let trials = 0;
let retainedEvents = 0;
let staleEdges = 0;
let maxQuantizationLatency = 0;
let minQuantizationLatency = Infinity;
let maxCatchupTicks = 0;
let minCatchupTicks = Infinity;

for (let seed = 1; seed <= 512; seed++) {
  const random = rng(seed * 0x9e3779b1);
  const previousWall = random() * 5;
  const rawGap = MAX_FRAME_DT + 0.001 + random() * 1.4;
  const resumeWall = previousWall + rawGap;
  const retainedStart = resumeWall - MAX_FRAME_DT;
  const accumulatorBefore = random() * (FIXED_DT - 1e-9);

  let accumulator = accumulatorBefore + MAX_FRAME_DT;
  let catchupTicks = 0;
  while (accumulator + 1e-12 >= FIXED_DT) {
    accumulator -= FIXED_DT;
    catchupTicks++;
  }
  maxCatchupTicks = Math.max(maxCatchupTicks, catchupTicks);
  minCatchupTicks = Math.min(minCatchupTicks, catchupTicks);
  if (catchupTicks !== 6) throw new Error(`accepted 100 ms should always add six 60 Hz ticks, got ${catchupTicks}`);
  if (Math.abs(accumulator - accumulatorBefore) > 1e-9) throw new Error('100 ms tail window changed accumulator phase');

  const events = [
    { kind: 'edge', wall: retainedStart - random() * (rawGap - MAX_FRAME_DT) },
    { kind: 'state', wall: retainedStart - random() * (rawGap - MAX_FRAME_DT) },
    { kind: 'edge', wall: retainedStart },
    { kind: 'state', wall: retainedStart + random() * MAX_FRAME_DT },
    { kind: 'edge', wall: retainedStart + random() * MAX_FRAME_DT },
    { kind: 'edge', wall: resumeWall },
  ].sort((a, b) => a.wall - b.wall);

  let lastTickOffset = -Infinity;
  for (const event of events) {
    if (event.wall < retainedStart - 1e-12) {
      if (event.kind === 'edge') staleEdges++;
      continue;
    }
    const offset = Math.max(0, Math.min(MAX_FRAME_DT, event.wall - retainedStart));
    const tickOffset = earliestTickOffset(offset, accumulatorBefore);
    const latency = tickOffset - offset;
    if (latency < -1e-10) throw new Error('retained event was assigned retroactively');
    if (latency > FIXED_DT + 1e-9) throw new Error(`retained event exceeded one-tick quantization latency: ${latency}`);
    if (tickOffset + 1e-12 < lastTickOffset) throw new Error('retained chronological order mapped backwards');
    lastTickOffset = tickOffset;
    maxQuantizationLatency = Math.max(maxQuantizationLatency, latency);
    minQuantizationLatency = Math.min(minQuantizationLatency, latency);
    retainedEvents++;
  }

  trials++;
}

if (staleEdges !== 512) throw new Error(`expected one stale edge per trial, got ${staleEdges}`);
if (maxQuantizationLatency > FIXED_DT + 1e-9) throw new Error('quantization latency bound violated');

console.log('R2 TAIL WINDOW PHASE STRESS PASS');
console.log(JSON.stringify({
  trials,
  retainedEvents,
  staleEdgesDropped: staleEdges,
  catchupTicks: { min: minCatchupTicks, max: maxCatchupTicks },
  quantizationLatencyMs: {
    min: minQuantizationLatency * 1000,
    max: maxQuantizationLatency * 1000,
    bound: FIXED_DT * 1000,
  },
  classification: 'TAIL_WINDOW_MAPPING_PRESERVES_CAUSAL_ORDER_AND_ONE_TICK_LATENCY_BOUND_ACROSS_ACCUMULATOR_PHASES',
}, null, 2));
