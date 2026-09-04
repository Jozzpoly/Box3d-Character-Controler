import fs from 'node:fs';
import {
  E16_CAPABILITY_LIMITS,
  chooseGrabCandidate,
  horizontalOrganTargetOffset,
  updateCapabilityReach,
} from '../src/e16-capability-interaction.js';

const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function near(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

const forward = horizontalOrganTargetOffset([3, 7, 4], 0.5);
const fallback = horizontalOrganTargetOffset([0, 1, 0], 0.5);
const retract = updateCapabilityReach(0.88, -100);
const extendClamp = updateCapabilityReach(0.88, 1000);
const retractClamp = updateCapabilityReach(0.20, -1000);

const candidates = [
  { key: 'solver-first-but-worse', anchorMidpointWorld: [0.45, 0, 0] },
  { key: 'nearest-to-intent', anchorMidpointWorld: [0.91, 0, 0] },
  { key: 'far', anchorMidpointWorld: [2.0, 0, 0] },
];
const selectedForwardOrder = chooseGrabCandidate(candidates, [0.9, 0, 0]);
const selectedReverseOrder = chooseGrabCandidate([...candidates].reverse(), [0.9, 0, 0]);

const report = {
  schema: 'e16-capability-interaction-policy-smoke-v0',
  forward,
  fallback,
  retract,
  extendClamp,
  retractClamp,
  selectedForwardOrder: selectedForwardOrder?.key ?? null,
  selectedReverseOrder: selectedReverseOrder?.key ?? null,
  limits: E16_CAPABILITY_LIMITS,
  boundary: 'Pure interaction-policy qualification only; Owner usability and fun remain hands-on questions.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (!near(Math.hypot(forward[0], forward[2]), 0.5)) {
  throw new Error(`E16 horizontal target did not preserve requested reach: ${JSON.stringify(forward)}`);
}
if (!near(forward[1], 0)) throw new Error(`E16.2a unexpectedly introduced vertical aim: ${forward[1]}`);
if (!near(fallback[0], 0) || !near(fallback[2], -0.5)) {
  throw new Error(`E16 fallback aim is not deterministic: ${JSON.stringify(fallback)}`);
}
if (!(retract < 0.88)) throw new Error(`Wheel-up did not retract: ${retract}`);
if (!near(extendClamp, E16_CAPABILITY_LIMITS.maxReach)) {
  throw new Error(`Reach extension escaped max bound: ${extendClamp}`);
}
if (!near(retractClamp, E16_CAPABILITY_LIMITS.minReach)) {
  throw new Error(`Reach retraction escaped min bound: ${retractClamp}`);
}
if (selectedForwardOrder?.key !== 'nearest-to-intent' || selectedReverseOrder?.key !== 'nearest-to-intent') {
  throw new Error('Grab candidate selection depends on solver enumeration order');
}
