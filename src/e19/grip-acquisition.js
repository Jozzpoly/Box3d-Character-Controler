import { rankE19GripCandidates } from './grip-candidate-ranking.js';

function finiteVec3(v) {
  return Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Compose the qualified E19.1a current-contact tracker with the E19.1b interaction
 * ranker. Physics owns what candidates exist; interaction intent owns which fresh one is
 * preferred. The tracker remains final topology authority when converting the winner to
 * a latch descriptor.
 */
export function acquireRankedE19Grip({
  tracker,
  reachOrigin,
  reachDirection,
  maxReach,
  rankingOptions = {},
}) {
  if (!tracker || !Array.isArray(tracker.candidates) || typeof tracker.makeLatchDescriptor !== 'function') {
    throw new Error('tracker must be a current E19 contact candidate tracker');
  }

  const ranking = rankE19GripCandidates({
    candidates: tracker.candidates,
    reachOrigin,
    reachDirection,
    maxReach,
    ...rankingOptions,
  });
  const latch = ranking.best ? tracker.makeLatchDescriptor(ranking.best) : null;
  return Object.freeze({ latch, ranking });
}

/**
 * E19 intentionally keeps one actuator grip schema for STATIC/KINEMATIC/DYNAMIC bodies.
 * Body type changes responsiveness inside the actuator; acquisition does not switch to a
 * different Owner-facing interaction mode.
 */
export function actuatorGripFromE19Latch(latch) {
  if (!latch?.body || !finiteVec3(latch.localAnchor)) throw new Error('valid E19 latch descriptor required');
  return Object.freeze({
    body: latch.body,
    localAnchor: Object.freeze([...latch.localAnchor]),
  });
}

/**
 * Start a newly acquired semantic grip without an acquisition snap. Later interaction
 * intent may move this desired relative offset to pull, climb, brace or manipulate.
 */
export function desiredOffsetAtE19Acquisition(latch, playerPosition) {
  if (!finiteVec3(latch?.worldAnchorAtAcquisition)) throw new Error('latch world anchor required');
  if (!finiteVec3(playerPosition)) throw new Error('playerPosition must be a finite vec3');
  return sub3(latch.worldAnchorAtAcquisition, playerPosition);
}
