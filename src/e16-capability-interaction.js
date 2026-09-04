function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export const E16_CAPABILITY_LIMITS = Object.freeze({
  restReach: 0.42,
  engageReach: 0.88,
  minReach: 0.18,
  maxReach: 0.90,
  wheelMetresPerDelta: 0.0008,
});

/**
 * Map camera-relative horizontal intent into the organ's task-space target.
 * This intentionally ignores camera pitch in E16.2a. Vertical aiming is a separate
 * future hypothesis, not an accidental extra variable in the first Owner toybox.
 */
export function horizontalOrganTargetOffset(forward, reach) {
  const x = forward?.[0] ?? 0;
  const z = forward?.[2] ?? -1;
  const length = Math.hypot(x, z);
  if (length < 1e-9) return [0, 0, -reach];
  return [reach * x / length, 0, reach * z / length];
}

/**
 * While capability input is held, wheel-up retracts and wheel-down extends.
 * The value is a desired internal reach, not a direct displacement or joint motor.
 */
export function updateCapabilityReach(currentReach, wheelDeltaY, limits = E16_CAPABILITY_LIMITS) {
  return clamp(
    currentReach + wheelDeltaY * limits.wheelMetresPerDelta,
    limits.minReach,
    limits.maxReach,
  );
}

/**
 * Solver order is not gameplay semantics. If the organ touches multiple objects in one
 * tick, choose the manifold candidate whose actual contact point is closest to the
 * current task-space target. The physics kernel remains agnostic to this policy.
 */
export function chooseGrabCandidate(candidates, targetWorld) {
  let best = null;
  let bestDistanceSq = Infinity;
  for (const candidate of candidates ?? []) {
    const point = candidate.anchorMidpointWorld;
    if (!point) continue;
    const dx = point[0] - targetWorld[0];
    const dy = point[1] - targetWorld[1];
    const dz = point[2] - targetWorld[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      best = candidate;
    }
  }
  return best;
}
