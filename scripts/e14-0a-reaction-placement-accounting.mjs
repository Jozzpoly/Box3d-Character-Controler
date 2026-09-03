import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';
import {
  placementImpulseForRelativeDeltaV,
  reducedMass,
  relativeDeltaVFromImpulses,
} from '../src/reaction-placement.js';

const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const SUPPORT_MASS = 800;
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const REQUESTED_RELATIVE_DV = DONOR_PROFILE_V1.groundAcceleration * DT;
const EPS = 1e-12;

function near(actual, expected, eps = EPS) {
  return Math.abs(actual - expected) <= eps;
}

const reduced = reducedMass(PLAYER_MASS, SUPPORT_MASS);
const worldExternal = placementImpulseForRelativeDeltaV({
  placement: 'world-external',
  relativeDeltaV: REQUESTED_RELATIVE_DV,
  playerMass: PLAYER_MASS,
  supportMass: SUPPORT_MASS,
});
const reciprocal = placementImpulseForRelativeDeltaV({
  placement: 'reciprocal',
  relativeDeltaV: REQUESTED_RELATIVE_DV,
  playerMass: PLAYER_MASS,
  supportMass: SUPPORT_MASS,
});

const worldExternalRelative = relativeDeltaVFromImpulses({
  ...worldExternal,
  playerMass: PLAYER_MASS,
  supportMass: SUPPORT_MASS,
});
const reciprocalRelative = relativeDeltaVFromImpulses({
  ...reciprocal,
  playerMass: PLAYER_MASS,
  supportMass: SUPPORT_MASS,
});

if (!near(worldExternal.playerImpulse, PLAYER_MASS * REQUESTED_RELATIVE_DV)) {
  throw new Error(`E14.0a world-external player impulse drifted: ${worldExternal.playerImpulse}`);
}
if (!near(worldExternal.supportImpulse, 0) || !near(worldExternal.systemImpulse, worldExternal.playerImpulse)) {
  throw new Error('E14.0a world-external momentum accounting drifted');
}
if (!near(reciprocal.playerImpulse, reduced * REQUESTED_RELATIVE_DV)) {
  throw new Error(`E14.0a reciprocal player impulse drifted: ${reciprocal.playerImpulse}`);
}
if (!near(reciprocal.supportImpulse, -reciprocal.playerImpulse) || !near(reciprocal.systemImpulse, 0)) {
  throw new Error('E14.0a reciprocal momentum accounting drifted');
}
if (!near(worldExternalRelative, REQUESTED_RELATIVE_DV) || !near(reciprocalRelative, REQUESTED_RELATIVE_DV)) {
  throw new Error(`E14.0a support-relative fairness drifted external=${worldExternalRelative} reciprocal=${reciprocalRelative}`);
}

console.log('E14.0a PASS — Owner-surface placement accounting preserves matched support-relative agency.');
console.log(`current31 one-frame relative Δv: ${REQUESTED_RELATIVE_DV.toFixed(9)} m/s`);
console.log(`world-external: player ${worldExternal.playerImpulse.toFixed(6)} N·s, support ${worldExternal.supportImpulse.toFixed(6)}, system ${worldExternal.systemImpulse.toFixed(6)}`);
console.log(`reciprocal: player ${reciprocal.playerImpulse.toFixed(6)} N·s, support ${reciprocal.supportImpulse.toFixed(6)}, system ${reciprocal.systemImpulse.toFixed(6)}`);
