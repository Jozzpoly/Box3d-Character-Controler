import { E15HybridCharacter } from './e15-hybrid-character.js';

function clampMagnitude3(vector, maxLength) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= maxLength || length < 1e-12) return [...vector];
  const scale = maxLength / length;
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

/**
 * E15.1 contact-episode consequence semantics.
 *
 * E15 V0 proved that a real torso/world collision can causally perturb the Donor
 * carrier, but it also exposed a semantic failure: every solver reaction while the
 * torso remained pressed against a wall was accumulated into persistent
 * externalVelocity as if every frame were a fresh knockback.
 *
 * This bounded variant changes only where the already-measured body response is
 * stored:
 *   - every horizontal body response still affects current carrier velocity;
 *   - a free-body response with no contact remains a persistent external impulse;
 *   - the first frame of a new body-contact episode is persistent;
 *   - subsequent frames of the same sustained contact are current-only constraint
 *     response and do not accumulate new persistent momentum.
 *
 * Geometry, finite follow authority, upright control, Donor traversal, body mass,
 * and the feedback cap are inherited unchanged from E15HybridCharacter.
 */
export class E15ContactSemanticCharacter extends E15HybridCharacter {
  constructor(b3, world, options = {}) {
    const requestedFeedbackGain = options.feedbackGain ?? 1;
    super(b3, world, { ...options, feedbackGain: 0 });
    this.contactSemanticFeedbackGain = requestedFeedbackGain;
    this._bodyContactActive = false;
    this.lastBodyFeedbackImpulse = 0;
    this.lastBodyPersistentFeedbackImpulse = 0;
    this.lastBodyConstraintFeedbackImpulse = 0;
    this.lastFeedbackPersistent = false;
    this.bodyContactEpisodeCount = 0;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this._bodyContactActive = false;
    this.lastBodyFeedbackImpulse = 0;
    this.lastBodyPersistentFeedbackImpulse = 0;
    this.lastBodyConstraintFeedbackImpulse = 0;
    this.lastFeedbackPersistent = false;
    this.bodyContactEpisodeCount = 0;
  }

  postStep(dt) {
    // Parent performs Donor movement, body synchronization, contact capture and
    // physics-delta measurement. Its feedbackGain is forced to zero above so it
    // cannot mutate carrier velocity before E15.1 classifies the response.
    super.postStep(dt);

    const physicsDeltaV = [
      this.bodyVelocity[0] - this._bodyPreSolveVelocity[0],
      0,
      this.bodyVelocity[2] - this._bodyPreSolveVelocity[2],
    ];
    const horizontalPhysicsImpulse = [
      this.bodyMass * physicsDeltaV[0],
      0,
      this.bodyMass * physicsDeltaV[2],
    ];
    this.lastBodyPhysicsImpulse = Math.hypot(
      horizontalPhysicsImpulse[0],
      horizontalPhysicsImpulse[2],
    );

    const requestedFeedback = [
      this.contactSemanticFeedbackGain * horizontalPhysicsImpulse[0] / this.virtualMass,
      0,
      this.contactSemanticFeedbackGain * horizontalPhysicsImpulse[2] / this.virtualMass,
    ];
    const feedback = clampMagnitude3(requestedFeedback, this.maxFeedbackDeltaV);
    const feedbackMagnitude = Math.hypot(feedback[0], feedback[2]);
    this.lastFeedbackClipped = Math.hypot(...requestedFeedback) > this.maxFeedbackDeltaV + 1e-12;
    this.lastBodyFeedbackImpulse = this.virtualMass * feedbackMagnitude;

    const inContact = this.lastBodyContacts > 0;
    const contactStarted = inContact && !this._bodyContactActive;
    if (contactStarted) this.bodyContactEpisodeCount += 1;

    // A response outside body contact is an impulse applied directly to the body.
    // A response on the first frame of contact is the impact transient. Both are
    // allowed to create persistent external momentum. Sustained contact thereafter
    // is a constraint reaction and remains current-only.
    const persistent = feedbackMagnitude > 1e-12 && (!inContact || contactStarted);
    this.lastFeedbackPersistent = persistent;
    this.lastBodyPersistentFeedbackImpulse = persistent ? this.lastBodyFeedbackImpulse : 0;
    this.lastBodyConstraintFeedbackImpulse = inContact && !contactStarted
      ? this.lastBodyFeedbackImpulse
      : 0;

    this.velocity[0] += feedback[0];
    this.velocity[2] += feedback[2];
    if (persistent) {
      this.externalVelocity[0] += feedback[0];
      this.externalVelocity[2] += feedback[2];
    }

    this._bodyContactActive = inContact;
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e15-contact-semantic',
      bodyFeedbackImpulse: this.lastBodyFeedbackImpulse,
      bodyPersistentFeedbackImpulse: this.lastBodyPersistentFeedbackImpulse,
      bodyConstraintFeedbackImpulse: this.lastBodyConstraintFeedbackImpulse,
      bodyFeedbackPersistent: this.lastFeedbackPersistent,
      bodyContactEpisodes: this.bodyContactEpisodeCount,
    };
  }
}

export function createE15ContactSemanticCharacter(b3, world, options = {}) {
  return new E15ContactSemanticCharacter(b3, world, options);
}
