function finiteVec3(v) {
  return Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize3(v, label) {
  if (!finiteVec3(v)) throw new Error(`${label} must be a finite vec3`);
  const length = norm3(v);
  if (length < 1e-9) throw new Error(`${label} must be non-zero`);
  return [v[0] / length, v[1] / length, v[2] / length];
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function stableGeometryKey(candidate) {
  const anchor = candidate.otherAnchorWorld ?? candidate.anchorMidpointWorld ?? [0, 0, 0];
  return [
    candidate.otherBodyKey ?? '',
    candidate.otherShapeKey ?? '',
    ...anchor.map((value) => Number.isFinite(value) ? value.toFixed(9) : 'nan'),
  ].join('|');
}

/**
 * E19.1b interaction-layer ranking over already-qualified CURRENT contact truth.
 *
 * This function does not fabricate candidates, move a probe, ray-pick remote bodies or
 * create latch descriptors. It can only rank the candidate objects handed to it by the
 * physics-provenance layer.
 *
 * Left/right hands do not need separate ranking algorithms: each hand supplies its own
 * `reachOrigin` and `reachDirection`. This keeps the interaction grammar low-dimensional
 * and avoids hidden body-type modes.
 *
 * The default weights are an experiment policy, not canonical gameplay constants. They
 * deliberately favour directional intent first, then target-facing contact orientation,
 * then shorter reach, with only a small anchor-quality preference.
 */
export function rankE19GripCandidates({
  candidates,
  reachOrigin,
  reachDirection,
  maxReach,
  minAimAlignment = 0,
  minSurfaceAlignment = -0.25,
  aimWeight = 0.60,
  surfaceWeight = 0.20,
  reachWeight = 0.15,
  contactWeight = 0.05,
  contactGapScale = 0.05,
}) {
  if (!Array.isArray(candidates)) throw new Error('candidates must be an array');
  if (!finiteVec3(reachOrigin)) throw new Error('reachOrigin must be a finite vec3');
  const direction = normalize3(reachDirection, 'reachDirection');
  finiteNumber(maxReach, 'maxReach');
  if (!(maxReach > 0)) throw new Error('maxReach must be > 0');
  finiteNumber(minAimAlignment, 'minAimAlignment');
  finiteNumber(minSurfaceAlignment, 'minSurfaceAlignment');
  finiteNumber(contactGapScale, 'contactGapScale');
  if (!(contactGapScale > 0)) throw new Error('contactGapScale must be > 0');

  const weights = [aimWeight, surfaceWeight, reachWeight, contactWeight];
  weights.forEach((value, index) => finiteNumber(value, `weight[${index}]`));
  if (weights.some((value) => value < 0)) throw new Error('ranking weights must be >= 0');
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (!(weightSum > 0)) throw new Error('at least one ranking weight must be > 0');

  const ranked = [];
  const rejected = [];

  candidates.forEach((candidate, sourceIndex) => {
    const anchor = candidate?.otherAnchorWorld ?? candidate?.anchorMidpointWorld;
    if (!candidate || !finiteVec3(anchor)) {
      rejected.push(Object.freeze({ candidate, sourceIndex, reason: 'MALFORMED_ANCHOR' }));
      return;
    }

    const delta = sub3(anchor, reachOrigin);
    const distance = norm3(delta);
    if (distance > maxReach + 1e-9) {
      rejected.push(Object.freeze({ candidate, sourceIndex, reason: 'OUT_OF_REACH', distance }));
      return;
    }

    // When the chosen origin already lies essentially on the contact anchor, direction
    // has no geometric lever. Treat that one degenerate scalar as fully aligned rather
    // than introducing an unstable normalization.
    const aimAlignment = distance > 1e-9
      ? dot3(direction, [delta[0] / distance, delta[1] / distance, delta[2] / distance])
      : 1;
    if (aimAlignment < minAimAlignment) {
      rejected.push(Object.freeze({ candidate, sourceIndex, reason: 'OUTSIDE_AIM_CONE', distance, aimAlignment }));
      return;
    }

    const surfaceAlignment = finiteVec3(candidate.probeToOtherNormal)
      ? dot3(direction, candidate.probeToOtherNormal)
      : aimAlignment;
    if (surfaceAlignment < minSurfaceAlignment) {
      rejected.push(Object.freeze({
        candidate,
        sourceIndex,
        reason: 'WRONG_CONTACT_FACE',
        distance,
        aimAlignment,
        surfaceAlignment,
      }));
      return;
    }

    const reachScore = clamp01(1 - distance / maxReach);
    const gap = Number.isFinite(candidate.anchorPairGap) ? Math.max(0, candidate.anchorPairGap) : contactGapScale;
    const contactScore = clamp01(1 - gap / contactGapScale);
    const score = (
      aimWeight * aimAlignment +
      surfaceWeight * surfaceAlignment +
      reachWeight * reachScore +
      contactWeight * contactScore
    ) / weightSum;

    ranked.push(Object.freeze({
      candidate,
      sourceIndex,
      score,
      distance,
      aimAlignment,
      surfaceAlignment,
      reachScore,
      contactScore,
      stableGeometryKey: stableGeometryKey(candidate),
    }));
  });

  ranked.sort((a, b) => {
    const scoreDelta = b.score - a.score;
    if (Math.abs(scoreDelta) > 1e-12) return scoreDelta;
    const aimDelta = b.aimAlignment - a.aimAlignment;
    if (Math.abs(aimDelta) > 1e-12) return aimDelta;
    const surfaceDelta = b.surfaceAlignment - a.surfaceAlignment;
    if (Math.abs(surfaceDelta) > 1e-12) return surfaceDelta;
    const distanceDelta = a.distance - b.distance;
    if (Math.abs(distanceDelta) > 1e-12) return distanceDelta;
    return a.stableGeometryKey.localeCompare(b.stableGeometryKey);
  });

  return Object.freeze({
    best: ranked[0]?.candidate ?? null,
    bestEntry: ranked[0] ?? null,
    ranked: Object.freeze(ranked),
    rejected: Object.freeze(rejected),
  });
}
