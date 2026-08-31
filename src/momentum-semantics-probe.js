// E2.2c-2 disposable Owner-test probe.
//
// Production A-prime writes a dynamic-contact reaction into both current velocity
// and externalVelocity. This wrapper preserves the complete production postStep,
// including mover solve, reciprocity, body impulse, clipping and support discovery,
// then removes only the newly written dynamic-contact memory from externalVelocity.
// Current velocity and the contacted rigid body retain the physical reaction.
//
// This is intentionally an experiment adapter rather than a new controller model.
export function installVelocityOnlyContactMemoryProbe(character) {
  const basePostStep = character.postStep.bind(character);

  character.postStep = (dt) => {
    // preStep has already applied drag, input and any support inheritance. Box3D's
    // world step does not mutate this controller-owned vector, so its value here is
    // exactly the external state immediately before dynamic reciprocity runs.
    const externalBeforeContact = [...character.externalVelocity];
    basePostStep(dt);

    if (character.lastDynamicContacts > 0) {
      character.externalVelocity[0] = externalBeforeContact[0];
      character.externalVelocity[2] = externalBeforeContact[2];
    }
  };

  return character;
}
