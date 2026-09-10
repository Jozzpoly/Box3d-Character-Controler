const FIXED_DT = 1 / 60;
const DURATION = 1.0;
const EPS = 1e-9;

function uniformFrames(hz) {
  const frames = [];
  let time = 0;
  while (time < DURATION - EPS) {
    const next = Math.min(DURATION, time + 1 / hz);
    frames.push(next - time);
    time = next;
  }
  return frames;
}

function hitchFrames() {
  const frames = [0.1];
  let time = 0.1;
  while (time < DURATION - EPS) {
    const next = Math.min(DURATION, time + 1 / 60);
    frames.push(next - time);
    time = next;
  }
  return frames;
}

const events = [
  { time: 0.041, type: 'key', key: 'w', down: true },
  { time: 0.083, type: 'jump' },
  { time: 0.119, type: 'touch', forward: 0.6, right: -0.25 },
  { time: 0.203, type: 'key', key: 'd', down: true },
  { time: 0.277, type: 'key', key: 'w', down: false },
  { time: 0.377, type: 'jump' },
  { time: 0.511, type: 'touch', forward: -0.35, right: 0.75 },
  { time: 0.693, type: 'key', key: 'd', down: false },
  { time: 0.827, type: 'touch', forward: 0, right: 0 },
];

function freshState() {
  return {
    keys: new Set(),
    touchForward: 0,
    touchRight: 0,
    jumpQueued: false,
  };
}

function applyEvent(state, event) {
  if (event.type === 'key') {
    if (event.down) state.keys.add(event.key);
    else state.keys.delete(event.key);
  } else if (event.type === 'touch') {
    state.touchForward = event.forward;
    state.touchRight = event.right;
  } else if (event.type === 'jump') {
    state.jumpQueued = true;
  }
}

function sample(state, simulatedTime) {
  const moveForward = (state.keys.has('w') ? 1 : 0) + state.touchForward;
  const moveRight = (state.keys.has('d') ? 1 : 0) + state.touchRight;
  const jump = state.jumpQueued;
  state.jumpQueued = false;
  return {
    simulatedTime,
    moveForward,
    moveRight,
    jump,
    wHeld: state.keys.has('w'),
    dHeld: state.keys.has('d'),
  };
}

function runBrowserStyle(name, frames) {
  const state = freshState();
  let wallTime = 0;
  let simulatedTime = 0;
  let accumulator = 0;
  let eventIndex = 0;
  const samples = [];

  for (const frameDt of frames) {
    const frameEnd = wallTime + frameDt;
    while (eventIndex < events.length && events[eventIndex].time <= frameEnd + EPS) {
      applyEvent(state, events[eventIndex]);
      eventIndex += 1;
    }
    accumulator += Math.min(frameDt, 0.1);
    while (accumulator + EPS >= FIXED_DT && simulatedTime < DURATION - EPS) {
      samples.push(sample(state, simulatedTime));
      simulatedTime += FIXED_DT;
      accumulator -= FIXED_DT;
    }
    wallTime = frameEnd;
  }
  return { name, samples };
}

function valueDiff(a, b) {
  return Math.max(
    Math.abs(a.moveForward - b.moveForward),
    Math.abs(a.moveRight - b.moveRight),
    a.jump === b.jump ? 0 : 1,
    a.wHeld === b.wHeld ? 0 : 1,
    a.dHeld === b.dHeld ? 0 : 1,
  );
}

function compare(a, b) {
  const count = Math.min(a.samples.length, b.samples.length);
  let maxDelta = 0;
  let differingTicks = 0;
  let jumpMismatchTicks = 0;
  for (let i = 0; i < count; i += 1) {
    const delta = valueDiff(a.samples[i], b.samples[i]);
    if (delta > 0) differingTicks += 1;
    if (a.samples[i].jump !== b.samples[i].jump) jumpMismatchTicks += 1;
    maxDelta = Math.max(maxDelta, delta);
  }
  return { maxDelta, differingTicks, jumpMismatchTicks };
}

const runs = {
  '30hz': runBrowserStyle('30hz', uniformFrames(30)),
  '60hz': runBrowserStyle('60hz', uniformFrames(60)),
  '144hz': runBrowserStyle('144hz', uniformFrames(144)),
  '100ms-leading-hitch': runBrowserStyle('100ms-leading-hitch', hitchFrames()),
};

let globalMaxDelta = 0;
let globalDifferingTicks = 0;
let globalJumpMismatchTicks = 0;
const pairwise = [];
const names = Object.keys(runs);
for (let i = 0; i < names.length; i += 1) {
  for (let j = i + 1; j < names.length; j += 1) {
    const result = compare(runs[names[i]], runs[names[j]]);
    globalMaxDelta = Math.max(globalMaxDelta, result.maxDelta);
    globalDifferingTicks = Math.max(globalDifferingTicks, result.differingTicks);
    globalJumpMismatchTicks = Math.max(globalJumpMismatchTicks, result.jumpMismatchTicks);
    pairwise.push({ a: names[i], b: names[j], ...result });
  }
}

if (globalDifferingTicks === 0 || globalJumpMismatchTicks === 0) {
  throw new Error(`matrix failed to expose cross-input temporal batching: differing=${globalDifferingTicks} jumpMismatch=${globalJumpMismatchTicks}`);
}

console.log('A4C CROSS-INPUT TEMPORAL BATCHING BOUNDARY CONFIRMED');
console.log(`maxInputStateDelta=${globalMaxDelta}`);
console.log(`maxDifferingTicks=${globalDifferingTicks}`);
console.log(`maxJumpMismatchTicks=${globalJumpMismatchTicks}`);
console.log('classification=KEY_TOUCH_AND_EDGE_INPUT_MAPPING_DEPENDS_ON_FRAME_BATCHING');
console.log(JSON.stringify(pairwise));
