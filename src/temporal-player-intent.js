import { createDonorIntent } from './donor/intent.js';

export const TEMPORAL_INPUT_INITIAL_STATE = Object.freeze({
  moveForward: 0,
  moveRight: 0,
  jumpHeld: false,
  sprint: false,
});

export function sampleTemporalDonorIntent(buffer, simTimeSeconds, basis) {
  const { state, edges } = buffer.sampleAt(simTimeSeconds);
  return createDonorIntent({
    moveForward: state.moveForward ?? 0,
    moveRight: state.moveRight ?? 0,
    forward: basis.forward,
    right: basis.right,
    jump: edges.some((edge) => edge.name === 'jump'),
    jumpHeld: state.jumpHeld ?? false,
    sprint: state.sprint ?? false,
  });
}

export function eventTimeSeconds(event) {
  const milliseconds = event?.timeStamp;
  if (!Number.isFinite(milliseconds)) throw new TypeError('browser input event requires a finite timeStamp');
  return milliseconds / 1000;
}
