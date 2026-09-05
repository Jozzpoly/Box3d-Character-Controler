function finiteScalar(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function positiveScalar(value, label) {
  finiteScalar(value, label);
  if (!(value > 0)) throw new RangeError(`${label} must be > 0`);
  return value;
}

function finiteVector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite [x, y, z] vector`);
  }
  return value;
}

function normalized3(value, label) {
  finiteVector3(value, label);
  const length = Math.hypot(value[0], value[1], value[2]);
  if (!(length > 1e-12)) throw new RangeError(`${label} must have non-zero length`);
  return [value[0] / length, value[1] / length, value[2] / length];
}

/**
 * Perspective screen-plane scale at a known forward depth.
 *
 * `forwardDepth` is distance along camera forward, not Euclidean camera distance.
 * At that depth, one vertical screen pixel spans the same world distance as one
 * horizontal pixel when viewport aspect matches the projection aspect.
 *
 * This is geometry only. Any feel multiplier, acceleration curve or device sensitivity
 * belongs in the browser/input adapter above this function.
 */
export function screenPlaneMetresPerPixel({
  forwardDepth,
  verticalFovRadians,
  viewportHeightPx,
}) {
  positiveScalar(forwardDepth, 'forwardDepth');
  positiveScalar(verticalFovRadians, 'verticalFovRadians');
  positiveScalar(viewportHeightPx, 'viewportHeightPx');
  if (!(verticalFovRadians < Math.PI)) {
    throw new RangeError('verticalFovRadians must be < PI');
  }
  return (2 * forwardDepth * Math.tan(verticalFovRadians * 0.5)) / viewportHeightPx;
}

/**
 * Measure signed camera-forward depth of a world point. The supplied forward vector is
 * normalized internally so browser code cannot accidentally scale depth with basis
 * magnitude.
 */
export function cameraForwardDepth(pointWorld, cameraPositionWorld, cameraForward) {
  finiteVector3(pointWorld, 'pointWorld');
  finiteVector3(cameraPositionWorld, 'cameraPositionWorld');
  const forward = normalized3(cameraForward, 'cameraForward');
  return (
    (pointWorld[0] - cameraPositionWorld[0]) * forward[0] +
    (pointWorld[1] - cameraPositionWorld[1]) * forward[1] +
    (pointWorld[2] - cameraPositionWorld[2]) * forward[2]
  );
}

/**
 * Convert a deliberate pointer delta into camera-plane command metres while leaving
 * depth as a separate explicit world-distance channel.
 *
 * Browser client coordinates use +Y downward, hence `vertical = -deltaYPx * scale`.
 * The result feeds `cameraRelativeManipulationDelta(...)`; it does not move intent by
 * itself, and therefore camera motion with zero pointer delta cannot create a command.
 */
export function screenPixelDeltaToManipulationCommand({
  deltaXPx = 0,
  deltaYPx = 0,
  forwardDepth,
  verticalFovRadians,
  viewportHeightPx,
  depthDeltaMetres = 0,
}) {
  finiteScalar(deltaXPx, 'deltaXPx');
  finiteScalar(deltaYPx, 'deltaYPx');
  finiteScalar(depthDeltaMetres, 'depthDeltaMetres');
  const metresPerPixel = screenPlaneMetresPerPixel({
    forwardDepth,
    verticalFovRadians,
    viewportHeightPx,
  });
  return {
    lateral: deltaXPx * metresPerPixel,
    vertical: -deltaYPx * metresPerPixel,
    depth: depthDeltaMetres,
    metresPerPixel,
  };
}
