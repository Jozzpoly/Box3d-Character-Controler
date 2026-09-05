function finiteVector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite [x, y, z] vector`);
  }
  return value;
}

function finiteScalar(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function clone3(value) {
  return [value[0], value[1], value[2]];
}

/**
 * E18 manipulation intent is deliberately more abstract than the current E17 browser
 * drag plane. It stores what the player requests in world space, independently of how
 * the physical executor attempts to satisfy it.
 *
 * `transportOriginWorld` names the frame translation that should carry the requested
 * target when the player moves. The caller chooses that origin (Donor carrier,
 * physical core, a future hand frame, etc.); this module intentionally does not own
 * that architectural decision.
 *
 * Camera observation is NOT state here. Rotating or moving a camera cannot alter the
 * target unless the caller supplies an explicit manipulation delta.
 */
export function createManipulationIntent({ targetWorld, transportOriginWorld }) {
  finiteVector3(targetWorld, 'targetWorld');
  finiteVector3(transportOriginWorld, 'transportOriginWorld');
  return {
    targetWorld: clone3(targetWorld),
    transportOriginWorld: clone3(transportOriginWorld),
  };
}

/**
 * Carry the requested target by exactly the translation of the chosen transport frame.
 * This is pure translation: no camera yaw/pitch and no implicit orientation policy are
 * introduced here.
 */
export function transportManipulationIntent(state, nextTransportOriginWorld) {
  finiteVector3(state?.targetWorld, 'state.targetWorld');
  finiteVector3(state?.transportOriginWorld, 'state.transportOriginWorld');
  finiteVector3(nextTransportOriginWorld, 'nextTransportOriginWorld');

  const dx = nextTransportOriginWorld[0] - state.transportOriginWorld[0];
  const dy = nextTransportOriginWorld[1] - state.transportOriginWorld[1];
  const dz = nextTransportOriginWorld[2] - state.transportOriginWorld[2];
  state.targetWorld[0] += dx;
  state.targetWorld[1] += dy;
  state.targetWorld[2] += dz;
  state.transportOriginWorld[0] = nextTransportOriginWorld[0];
  state.transportOriginWorld[1] = nextTransportOriginWorld[1];
  state.transportOriginWorld[2] = nextTransportOriginWorld[2];
  return clone3(state.targetWorld);
}

/**
 * Apply an explicit world-space manipulation command. This intentionally has no reach
 * clamp: requested intent and physically feasible task/execution are separate layers.
 */
export function applyManipulationWorldDelta(state, deltaWorld) {
  finiteVector3(state?.targetWorld, 'state.targetWorld');
  finiteVector3(deltaWorld, 'deltaWorld');
  state.targetWorld[0] += deltaWorld[0];
  state.targetWorld[1] += deltaWorld[1];
  state.targetWorld[2] += deltaWorld[2];
  return clone3(state.targetWorld);
}

/**
 * Convert explicit camera-relative command distances into a world-space delta.
 * Values are metres of deliberate manipulation command, not pixels or wheel deltas;
 * browser/device mapping stays outside the intent contract.
 *
 * Positive depth follows the supplied camera forward vector. The input layer remains
 * free to choose wheel/keyboard/pointer sign and sensitivity later.
 */
export function cameraRelativeManipulationDelta({
  right,
  up,
  forward,
  lateral = 0,
  vertical = 0,
  depth = 0,
}) {
  finiteVector3(right, 'right');
  finiteVector3(up, 'up');
  finiteVector3(forward, 'forward');
  finiteScalar(lateral, 'lateral');
  finiteScalar(vertical, 'vertical');
  finiteScalar(depth, 'depth');
  return [
    right[0] * lateral + up[0] * vertical + forward[0] * depth,
    right[1] * lateral + up[1] * vertical + forward[1] * depth,
    right[2] * lateral + up[2] * vertical + forward[2] * depth,
  ];
}

export function applyManipulationCameraDelta(state, command) {
  return applyManipulationWorldDelta(state, cameraRelativeManipulationDelta(command));
}

export function snapshotManipulationIntent(state) {
  finiteVector3(state?.targetWorld, 'state.targetWorld');
  finiteVector3(state?.transportOriginWorld, 'state.transportOriginWorld');
  return {
    targetWorld: clone3(state.targetWorld),
    transportOriginWorld: clone3(state.transportOriginWorld),
  };
}
