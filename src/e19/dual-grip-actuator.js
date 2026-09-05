import {
  assembleDualGripRelativeOperator,
  solveDualGripRelativeImpulses,
} from './dual-grip-relative-kernel.js';

function bodyTypeValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

function finiteVec3(v) {
  return Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
}

function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale3(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
function norm3(v) { return Math.hypot(v[0], v[1], v[2]); }

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

function worldPoint(b3, body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function worldCenter(b3, body) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(out, body);
  return out;
}

function pointVelocity(b3, body, point) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, point);
  return out;
}

function snapshotGrip(b3, grip, index) {
  if (!grip || typeof grip !== 'object') throw new Error(`grips[${index}] must be an object`);

  if (grip.staticWorldAnchor) {
    if (!finiteVec3(grip.staticWorldAnchor)) throw new Error(`grips[${index}].staticWorldAnchor must be a finite vec3`);
    return {
      body: null,
      bodyKey: `static:${index}`,
      responsive: false,
      anchorWorld: [...grip.staticWorldAnchor],
      anchorVelocity: [0, 0, 0],
      targetOffset: [0, 0, 0],
      inverseMass: 0,
      inverseInertiaWorld: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      type: 'STATIC',
    };
  }

  if (!grip.body || !finiteVec3(grip.localAnchor)) {
    throw new Error(`grips[${index}] must provide staticWorldAnchor or body + localAnchor`);
  }

  const body = grip.body;
  const type = bodyTypeValue(b3.b3Body_GetType(body));
  const dynamicType = bodyTypeValue(b3.b3BodyType.b3_dynamicBody);
  const kinematicType = bodyTypeValue(b3.b3BodyType.b3_kinematicBody);
  const responsive = type === dynamicType;
  const anchorWorld = worldPoint(b3, body, grip.localAnchor);
  const anchorVelocity = type === kinematicType || responsive
    ? pointVelocity(b3, body, anchorWorld)
    : [0, 0, 0];
  const center = worldCenter(b3, body);

  return {
    body,
    bodyKey: bodyKey(body),
    responsive,
    anchorWorld,
    anchorVelocity,
    targetOffset: sub3(anchorWorld, center),
    inverseMass: responsive ? b3.b3Body_GetInverseMass(body) : 0,
    inverseInertiaWorld: responsive
      ? b3.b3Body_GetWorldInverseRotationalInertia(body)
      : [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
    type: responsive ? 'DYNAMIC' : (type === kinematicType ? 'KINEMATIC' : 'STATIC'),
  };
}

/**
 * Execute one finite dual-grip relative-velocity step.
 *
 * `desiredOffsets[i]` is the world-space vector from player position to where hand i
 * wants its latched anchor to be. This is deliberately RELATIVE hand intent rather than
 * an object-owned world target.
 *
 * The returned playerDeltaV is the equal/opposite reaction divided by the accepted
 * player virtual mass. The caller decides how that consequence enters its controller
 * velocity/external-velocity policy.
 */
export function stepDualGripActuator({
  b3,
  playerPosition,
  playerVelocity,
  playerMass,
  grips,
  desiredOffsets,
  desiredOffsetVelocities = null,
  dt,
  rate = 10,
  maxForcePerGrip = Number.POSITIVE_INFINITY,
  maxForceSum = Number.POSITIVE_INFINITY,
  regularizationRelative = 1e-6,
}) {
  if (!b3) throw new Error('b3 is required');
  if (!finiteVec3(playerPosition) || !finiteVec3(playerVelocity)) throw new Error('player position/velocity must be finite vec3');
  if (!(playerMass > 0) || !Number.isFinite(playerMass)) throw new Error('playerMass must be finite and > 0');
  if (!Array.isArray(grips) || grips.length < 1 || grips.length > 2) throw new Error('one or two grips required');
  if (!Array.isArray(desiredOffsets) || desiredOffsets.length !== grips.length) throw new Error('desiredOffsets length mismatch');
  desiredOffsets.forEach((v, i) => { if (!finiteVec3(v)) throw new Error(`desiredOffsets[${i}] must be finite vec3`); });
  if (!(dt > 0) || !Number.isFinite(dt)) throw new Error('dt must be finite and > 0');
  if (!(rate >= 0) || !Number.isFinite(rate)) throw new Error('rate must be finite and >= 0');

  const offsetVelocities = desiredOffsetVelocities ?? desiredOffsets.map(() => [0, 0, 0]);
  if (!Array.isArray(offsetVelocities) || offsetVelocities.length !== grips.length) throw new Error('desiredOffsetVelocities length mismatch');
  offsetVelocities.forEach((v, i) => { if (!finiteVec3(v)) throw new Error(`desiredOffsetVelocities[${i}] must be finite vec3`); });

  const snapshots = grips.map((grip, index) => snapshotGrip(b3, grip, index));
  const descriptors = snapshots.map((snapshot) => ({
    bodyKey: snapshot.bodyKey,
    responsive: snapshot.responsive,
    inverseMass: snapshot.inverseMass,
    inverseInertiaWorld: snapshot.inverseInertiaWorld,
    targetOffset: snapshot.targetOffset,
  }));
  const operator = assembleDualGripRelativeOperator({ playerMass, grips: descriptors });

  const desiredDeltaVs = snapshots.map((snapshot, index) => {
    const currentRelativePosition = sub3(snapshot.anchorWorld, playerPosition);
    const error = sub3(desiredOffsets[index], currentRelativePosition);
    const currentRelativeVelocity = sub3(snapshot.anchorVelocity, playerVelocity);
    const desiredRelativeVelocity = add3(offsetVelocities[index], scale3(error, rate));
    return sub3(desiredRelativeVelocity, currentRelativeVelocity);
  });

  const maxImpulsePerGrip = Array.isArray(maxForcePerGrip)
    ? maxForcePerGrip.map((force) => force * dt)
    : maxForcePerGrip * dt;
  const maxImpulseSum = maxForceSum * dt;
  const solution = solveDualGripRelativeImpulses({
    operator,
    desiredDeltaVs,
    maxImpulsePerGrip,
    maxImpulseSum,
    regularizationRelative,
  });

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const impulse = solution.impulses[i];
    if (snapshot.responsive && norm3(impulse) > 1e-12) {
      b3.b3Body_ApplyLinearImpulse(snapshot.body, impulse, snapshot.anchorWorld, true);
    }
  }

  const totalTargetImpulse = solution.impulses.reduce((sum, impulse) => add3(sum, impulse), [0, 0, 0]);
  const playerDeltaV = scale3(totalTargetImpulse, -1 / playerMass);

  return {
    snapshots,
    desiredOffsets: desiredOffsets.map((v) => [...v]),
    desiredDeltaVs,
    impulses: solution.impulses,
    playerDeltaV,
    totalTargetImpulse,
    rawImpulseSum: solution.rawImpulseSum,
    appliedImpulseSum: solution.appliedImpulseSum,
    perGripSaturated: solution.perGripSaturated,
    sharedSaturated: solution.sharedSaturated,
    residualNorm: solution.residualNorm,
    lambda: solution.lambda,
  };
}
