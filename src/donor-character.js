import { ControllerOwnedCharacter } from './character.js';
import { installVelocityOnlyContactMemoryProbe } from './momentum-semantics-probe.js';

// Stabilized donor entry point for the current Owner-preferred A″ behavior.
//
// This intentionally composes the already-qualified runtime path instead of
// rewriting contact semantics during stabilization. The resulting character is:
// - controller-owned;
// - 80 kg virtual interaction mass by default;
// - causal-component dynamic reciprocity;
// - dynamic-contact Δv applied to current velocity/body response once, without
//   retaining that Δv as a persistent externalVelocity target;
// - moving-support inheritance unchanged from the existing A″ specimen.
//
// E2.3 substrate debt remains explicit: this does not repair/activate lost
// b3CollisionPlane.push state or otherwise change mover velocity clipping.
export function createDonorCharacter(b3, world, options = {}) {
  const character = new ControllerOwnedCharacter(b3, world, {
    ...options,
    virtualMass: options.virtualMass ?? 80,
    reciprocityMode: 'causal-components',
  });

  return installVelocityOnlyContactMemoryProbe(character);
}

export const DONOR_BEHAVIOR = Object.freeze({
  specimen: 'A″',
  sourceStage: 'E2.3 current-runtime boundary',
  reciprocity: 'causal-components',
  dynamicContactMemory: 'velocity-only-contact-consequence',
  constraintVelocityPolicy: 'current box3d.js@0.1.1 binding behavior',
});
