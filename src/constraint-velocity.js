const LINEAR_SLOP = 0.005;
const FLT_MAX = 3.4e38;
const MAX_SOLVE_ITERATIONS = 20;
const HORIZONTAL_NORMAL_MIN = 0.35;
const VELOCITY_EPSILON = 1e-7;

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clonePlane(entry) {
  return {
    plane: {
      normal: [...entry.plane.normal],
      offset: entry.plane.offset,
    },
    pushLimit: entry.pushLimit ?? FLT_MAX,
    push: 0,
    clipVelocity: entry.clipVelocity !== false,
  };
}

function horizontalFeasible(x, z, constraints) {
  return constraints.every(({ nx, nz, minimumDot }) => (
    x * nx + z * nz >= minimumDot - VELOCITY_EPSILON
  ));
}

function horizontalDistanceSquared(x, z, sourceX, sourceZ) {
  const dx = x - sourceX;
  const dz = z - sourceZ;
  return dx * dx + dz * dz;
}

function nearestFeasibleHorizontalVelocity(sourceX, sourceZ, desiredX, desiredZ, constraints) {
  if (horizontalFeasible(sourceX, sourceZ, constraints)) return [sourceX, sourceZ];

  let best = null;
  let bestDistance = Infinity;
  const consider = (x, z) => {
    if (!horizontalFeasible(x, z, constraints)) return;
    const distance = horizontalDistanceSquared(x, z, sourceX, sourceZ);
    if (
      distance < bestDistance - 1e-12
      || (
        Math.abs(distance - bestDistance) <= 1e-12
        && (best === null || x < best[0] - 1e-12 || (Math.abs(x - best[0]) <= 1e-12 && z < best[1]))
      )
    ) {
      best = [x, z];
      bestDistance = distance;
    }
  };

  for (const constraint of constraints) {
    const sourceDot = sourceX * constraint.nx + sourceZ * constraint.nz;
    const correction = constraint.minimumDot - sourceDot;
    consider(
      sourceX + correction * constraint.nx,
      sourceZ + correction * constraint.nz,
    );
  }

  for (let i = 0; i < constraints.length; i++) {
    const a = constraints[i];
    for (let j = i + 1; j < constraints.length; j++) {
      const b = constraints[j];
      const det = a.nx * b.nz - a.nz * b.nx;
      if (Math.abs(det) < 1e-10) continue;
      consider(
        (a.minimumDot * b.nz - a.nz * b.minimumDot) / det,
        (a.nx * b.minimumDot - a.minimumDot * b.nx) / det,
      );
    }
  }

  // Intent-capped bounds are min(surfaceDot, desiredDot), so desired velocity
  // satisfies every individual constraint and guarantees a non-empty intersection.
  consider(desiredX, desiredZ);
  if (!best) {
    throw new Error('constraint velocity policy lost its guaranteed feasible region');
  }
  return best;
}

export function maxAbsVectorDelta(a, b) {
  return Math.max(
    Math.abs(a[0] - b[0]),
    Math.abs(a[1] - b[1]),
    Math.abs(a[2] - b[2]),
  );
}

// box3d.js@0.1.1 copies collision planes into temporary native vectors for
// b3SolvePlanes and does not copy solved `push` state back to JavaScript.
// Reconstruct only that missing state while verifying the solved delta against
// the native result at the call site.
export function recoverSolvedPlanePushes(targetDelta, inputPlanes) {
  const planes = inputPlanes.map(clonePlane);
  const delta = [...targetDelta];

  for (let iteration = 0; iteration < MAX_SOLVE_ITERATIONS; iteration++) {
    let totalPush = 0;
    for (const plane of planes) {
      const separation = dot3(plane.plane.normal, delta) - plane.plane.offset + LINEAR_SLOP;
      let push = -separation;
      const accumulated = plane.push;
      plane.push = Math.min(Math.max(plane.push + push, 0), plane.pushLimit);
      push = plane.push - accumulated;
      delta[0] += push * plane.plane.normal[0];
      delta[1] += push * plane.plane.normal[1];
      delta[2] += push * plane.plane.normal[2];
      totalPush += Math.abs(push);
    }
    if (totalPush < LINEAR_SLOP) break;
  }

  return {
    delta,
    pushes: planes.map((plane) => plane.push),
  };
}

export function applyIntentCappedRelativeConstraintVelocity({
  b3,
  velocity,
  desiredVelocity,
  planes,
  extras,
  recoveredPushes,
  bodyPointVelocity,
}) {
  const out = [...velocity];
  const staticType = bodyTypeValue(b3.b3BodyType.b3_staticBody);
  const kinematicType = bodyTypeValue(b3.b3BodyType.b3_kinematicBody);
  const constraints = [];

  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i];
    if (!((recoveredPushes?.[i] ?? 0) > 0) || plane.clipVelocity === false) continue;

    const extra = extras[i];
    if (!extra?.shapeId) continue;
    const body = b3.b3Shape_GetBody(extra.shapeId);
    const type = bodyTypeValue(b3.b3Body_GetType(body));
    if (type !== staticType && type !== kinematicType) continue;

    const normal = plane.plane.normal;
    const horizontalLength = Math.hypot(normal[0], normal[2]);
    if (horizontalLength < HORIZONTAL_NORMAL_MIN) continue;
    const nx = normal[0] / horizontalLength;
    const nz = normal[2] / horizontalLength;

    const surfaceVelocity = type === staticType
      ? [0, 0, 0]
      : bodyPointVelocity(body, extra.point);
    const surfaceDot = surfaceVelocity[0] * nx + surfaceVelocity[2] * nz;
    const desiredDot = desiredVelocity[0] * nx + desiredVelocity[2] * nz;
    constraints.push({
      nx,
      nz,
      minimumDot: Math.min(surfaceDot, desiredDot),
    });
  }

  let clippedComponents = 0;
  for (const constraint of constraints) {
    const sourceDot = velocity[0] * constraint.nx + velocity[2] * constraint.nz;
    if (sourceDot < constraint.minimumDot - VELOCITY_EPSILON) clippedComponents += 1;
  }

  if (clippedComponents > 0) {
    const [x, z] = nearestFeasibleHorizontalVelocity(
      velocity[0],
      velocity[2],
      desiredVelocity[0],
      desiredVelocity[2],
      constraints,
    );
    out[0] = x;
    out[2] = z;
  }

  return { velocity: out, clippedComponents };
}
