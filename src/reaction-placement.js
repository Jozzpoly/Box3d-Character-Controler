export const REACTION_PLACEMENTS = Object.freeze(['world-external', 'reciprocal']);

export function reducedMass(massA, massB) {
  if (!(massA > 0) || !(massB > 0)) throw new Error('reaction placement masses must be positive');
  return 1 / (1 / massA + 1 / massB);
}

export function placementImpulseForRelativeDeltaV({
  placement,
  relativeDeltaV,
  playerMass,
  supportMass,
}) {
  if (!Number.isFinite(relativeDeltaV)) throw new Error('relativeDeltaV must be finite');
  if (!(playerMass > 0) || !(supportMass > 0)) throw new Error('reaction placement masses must be positive');

  if (placement === 'world-external') {
    const playerImpulse = playerMass * relativeDeltaV;
    return {
      placement,
      playerImpulse,
      supportImpulse: 0,
      systemImpulse: playerImpulse,
      expectedRelativeDeltaV: relativeDeltaV,
    };
  }

  if (placement === 'reciprocal') {
    const impulse = reducedMass(playerMass, supportMass) * relativeDeltaV;
    return {
      placement,
      playerImpulse: impulse,
      supportImpulse: -impulse,
      systemImpulse: 0,
      expectedRelativeDeltaV: relativeDeltaV,
    };
  }

  throw new Error(`unknown reaction placement: ${placement}`);
}

export function relativeDeltaVFromImpulses({
  playerImpulse,
  supportImpulse,
  playerMass,
  supportMass,
}) {
  return playerImpulse / playerMass - supportImpulse / supportMass;
}
