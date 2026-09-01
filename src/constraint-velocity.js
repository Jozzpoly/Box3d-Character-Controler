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
  let clippedComponents = 0;

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
    const relativeInward = (out[0] - surfaceVelocity[0]) * nx
      + (out[2] - surfaceVelocity[2]) * nz;
    const desiredRelativeInward = (desiredVelocity[0] - surfaceVelocity[0]) * nx
      + (desiredVelocity[2] - surfaceVelocity[2]) * nz;
    const allowedRelativeInward = Math.min(0, desiredRelativeInward);

    if (relativeInward >= allowedRelativeInward - VELOCITY_EPSILON) continue;
    const excess = relativeInward - allowedRelativeInward;
    out[0] -= excess * nx;
    out[2] -= excess * nz;
    clippedComponents += 1;
  }

  return { velocity: out, clippedComponents };
}
