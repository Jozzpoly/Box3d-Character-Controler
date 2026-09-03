export const E14_AUTHORITY_POLICIES = Object.freeze({
  NATURAL_ONLY: 'natural-only',
  ENTITLED_EXTERNAL: 'entitled-external',
  ENTITLED_RECIPROCAL: 'entitled-reciprocal',
});

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

export function reducedMass(playerMass, supportMass) {
  if (!(playerMass > 0) || !(supportMass > 0)) {
    throw new Error('playerMass and supportMass must be positive');
  }
  return 1 / (1 / playerMass + 1 / supportMass);
}

export function targetRelativeVelocity({
  currentTarget,
  input,
  maxSpeed,
  acceleration,
  braking,
  dt,
}) {
  const normalizedInput = clamp(input, -1, 1);
  const desired = normalizedInput * maxSpeed;
  const sameDirection = Math.sign(desired) === Math.sign(currentTarget) || Math.abs(currentTarget) < 1e-12;
  const speedingUp = Math.abs(desired) > Math.abs(currentTarget) && sameDirection;
  const rate = speedingUp ? acceleration : braking;
  return moveToward(currentTarget, desired, rate * dt);
}

export function entitlementFromLoad({
  friction,
  frameNormalImpulse,
  referenceFriction,
  playerMass,
  gravity,
  dt,
}) {
  const nominal = referenceFriction * playerMass * gravity * dt;
  if (!(nominal > 0)) return 0;
  return clamp((friction * Math.max(0, frameNormalImpulse)) / nominal, 0, 1);
}

export function authorityGrantForShortfall({
  policy,
  playerMass,
  supportMass,
  requestedRelativeDeltaV,
  entitlement,
}) {
  const q = clamp(entitlement, 0, 1);
  const grantedRelativeDeltaV = requestedRelativeDeltaV * q;

  if (policy === E14_AUTHORITY_POLICIES.NATURAL_ONLY || Math.abs(grantedRelativeDeltaV) <= 1e-12) {
    return {
      policy,
      grantedRelativeDeltaV: 0,
      playerImpulse: 0,
      supportImpulse: 0,
      totalAuthorityMomentum: 0,
    };
  }

  if (policy === E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL) {
    const playerImpulse = playerMass * grantedRelativeDeltaV;
    return {
      policy,
      grantedRelativeDeltaV,
      playerImpulse,
      supportImpulse: 0,
      totalAuthorityMomentum: playerImpulse,
    };
  }

  if (policy === E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL) {
    const impulse = reducedMass(playerMass, supportMass) * grantedRelativeDeltaV;
    return {
      policy,
      grantedRelativeDeltaV,
      playerImpulse: impulse,
      supportImpulse: -impulse,
      totalAuthorityMomentum: 0,
    };
  }

  throw new Error(`Unknown E14 authority policy: ${policy}`);
}

export function relativeDeltaVFromGrant({ playerImpulse, supportImpulse, playerMass, supportMass }) {
  return playerImpulse / playerMass - supportImpulse / supportMass;
}

export function physicsFirstShortfall({
  targetRelativeVelocity: target,
  relativeVelocityAfterPhysics,
  maxRelativeDeltaV,
}) {
  const raw = target - relativeVelocityAfterPhysics;
  if (!(maxRelativeDeltaV >= 0)) return raw;
  return clamp(raw, -maxRelativeDeltaV, maxRelativeDeltaV);
}
