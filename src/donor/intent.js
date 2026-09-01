function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

export function normalizeMoveAxes(moveForward = 0, moveRight = 0) {
  let forward = finiteOrZero(moveForward);
  let right = finiteOrZero(moveRight);
  const length = Math.hypot(forward, right);
  if (length > 1) {
    forward /= length;
    right /= length;
  }
  return { moveForward: forward, moveRight: right };
}

export function createDonorIntent({
  moveForward = 0,
  moveRight = 0,
  forward = [0, 0, -1],
  right = [1, 0, 0],
  jump = false,
  jumpHeld = false,
  sprint = false,
} = {}) {
  const movement = normalizeMoveAxes(moveForward, moveRight);
  return {
    ...movement,
    forward: [...forward],
    right: [...right],
    jump: Boolean(jump),
    jumpHeld: Boolean(jumpHeld),
    sprint: Boolean(sprint),
  };
}

export const DONOR_INTENT_CONTRACT_V0 = Object.freeze({
  movementAxes: 'camera-relative moveForward/moveRight, normalized to unit magnitude',
  forwardBasis: 'world-space horizontal forward vector',
  rightBasis: 'world-space horizontal right vector',
  jump: 'edge/queued jump request for this physics tick',
  jumpHeld: 'continuous jump hold state for jump shaping',
  sprint: 'continuous sprint modifier state',
});
