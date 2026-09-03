import assert from 'node:assert/strict';
import {
  E14_AUTHORITY_POLICIES,
  authorityGrantForShortfall,
  entitlementFromLoad,
  physicsFirstShortfall,
  relativeDeltaVFromGrant,
  targetRelativeVelocity,
} from '../src/e14-authority-kernel.js';

const DT = 1 / 60;
const PLAYER_MASS = 80;
const SUPPORT_MASS = 800;
const G = 20;
const MU = 0.95;
const ACCEPTED_ACCEL = 31;
const ACCEPTED_BRAKE = 36;
const MAX_SPEED = 5.2;
const EPS = 1e-12;

function near(actual, expected, eps = 1e-10, label = 'value') {
  assert.ok(Math.abs(actual - expected) <= eps, `${label}: ${actual} != ${expected}`);
}

const fullLoad = PLAYER_MASS * G * DT;
const qFull = entitlementFromLoad({
  friction: MU,
  frameNormalImpulse: fullLoad,
  referenceFriction: MU,
  playerMass: PLAYER_MASS,
  gravity: G,
  dt: DT,
});
near(qFull, 1, EPS, 'full q');

const qWeak = entitlementFromLoad({
  friction: 0.2,
  frameNormalImpulse: fullLoad,
  referenceFriction: MU,
  playerMass: PLAYER_MASS,
  gravity: G,
  dt: DT,
});
near(qWeak, 0.2 / 0.95, 1e-12, 'weak q');

const qZero = entitlementFromLoad({
  friction: 0,
  frameNormalImpulse: fullLoad,
  referenceFriction: MU,
  playerMass: PLAYER_MASS,
  gravity: G,
  dt: DT,
});
near(qZero, 0, EPS, 'zero q');

const requested = ACCEPTED_ACCEL * DT;
for (const policy of [
  E14_AUTHORITY_POLICIES.NATURAL_ONLY,
  E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL,
  E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL,
]) {
  const grant = authorityGrantForShortfall({
    policy,
    playerMass: PLAYER_MASS,
    supportMass: SUPPORT_MASS,
    requestedRelativeDeltaV: requested,
    entitlement: 1,
  });

  if (policy === E14_AUTHORITY_POLICIES.NATURAL_ONLY) {
    near(grant.playerImpulse, 0, EPS, 'natural player impulse');
    near(grant.supportImpulse, 0, EPS, 'natural support impulse');
    near(grant.grantedRelativeDeltaV, 0, EPS, 'natural grant');
    continue;
  }

  const reconstructed = relativeDeltaVFromGrant({
    playerImpulse: grant.playerImpulse,
    supportImpulse: grant.supportImpulse,
    playerMass: PLAYER_MASS,
    supportMass: SUPPORT_MASS,
  });
  near(reconstructed, requested, 1e-12, `${policy} relative grant`);

  if (policy === E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL) {
    near(grant.playerImpulse, PLAYER_MASS * requested, 1e-12, 'external player impulse');
    near(grant.supportImpulse, 0, EPS, 'external support impulse');
    near(grant.totalAuthorityMomentum, PLAYER_MASS * requested, 1e-12, 'external momentum');
  } else {
    near(grant.playerImpulse + grant.supportImpulse, 0, 1e-12, 'reciprocal momentum');
    near(grant.totalAuthorityMomentum, 0, EPS, 'reciprocal total momentum');
  }
}

const weakGrant = authorityGrantForShortfall({
  policy: E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL,
  playerMass: PLAYER_MASS,
  supportMass: SUPPORT_MASS,
  requestedRelativeDeltaV: requested,
  entitlement: qWeak,
});
near(weakGrant.grantedRelativeDeltaV, requested * qWeak, 1e-12, 'weak grant scale');

const zeroGrant = authorityGrantForShortfall({
  policy: E14_AUTHORITY_POLICIES.ENTITLED_EXTERNAL,
  playerMass: PLAYER_MASS,
  supportMass: SUPPORT_MASS,
  requestedRelativeDeltaV: requested,
  entitlement: 0,
});
near(zeroGrant.playerImpulse, 0, EPS, 'zero entitlement impulse');

let target = 0;
for (let i = 0; i < 20; i++) {
  target = targetRelativeVelocity({
    currentTarget: target,
    input: 1,
    maxSpeed: MAX_SPEED,
    acceleration: ACCEPTED_ACCEL,
    braking: ACCEPTED_BRAKE,
    dt: DT,
  });
}
near(target, MAX_SPEED, 1e-12, 'accelerated target');

const released = targetRelativeVelocity({
  currentTarget: target,
  input: 0,
  maxSpeed: MAX_SPEED,
  acceleration: ACCEPTED_ACCEL,
  braking: ACCEPTED_BRAKE,
  dt: DT,
});
near(released, MAX_SPEED - ACCEPTED_BRAKE * DT, 1e-12, 'release brake');

const reverse = targetRelativeVelocity({
  currentTarget: released,
  input: -1,
  maxSpeed: MAX_SPEED,
  acceleration: ACCEPTED_ACCEL,
  braking: ACCEPTED_BRAKE,
  dt: DT,
});
near(reverse, released - ACCEPTED_BRAKE * DT, 1e-12, 'reversal brakes first');

near(
  physicsFirstShortfall({
    targetRelativeVelocity: 1,
    relativeVelocityAfterPhysics: 0.4,
    maxRelativeDeltaV: 0.3,
  }),
  0.3,
  EPS,
  'bounded shortfall',
);

console.log(JSON.stringify({
  status: 'PASS',
  qFull,
  qWeak,
  requestedRelativeDeltaV: requested,
  acceptedTarget: target,
  releaseTarget: released,
}, null, 2));
