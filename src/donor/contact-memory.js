// Stable donor form of the E2.2c-2 velocity-only dynamic-contact semantics.
//
// The controller's full postStep remains authoritative. Dynamic-contact reaction
// still changes current character velocity and the contacted rigid body. This
// adapter removes only the extra horizontal persistent target that the legacy
// controller writes into externalVelocity during that same contact.
export function installVelocityOnlyDynamicContactMemory(character) {
  const basePostStep = character.postStep.bind(character);

  character.postStep = (dt) => {
    const externalBeforeContact = [...character.externalVelocity];
    basePostStep(dt);

    if (character.lastDynamicContacts > 0) {
      character.externalVelocity[0] = externalBeforeContact[0];
      character.externalVelocity[2] = externalBeforeContact[2];
    }
  };

  return character;
}
