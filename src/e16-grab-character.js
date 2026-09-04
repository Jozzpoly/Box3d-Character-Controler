import { E16ActiveContactOrganCharacter } from './e16-active-contact-organ-character.js';

function clampMagnitude3(vector, maxLength) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= maxLength || length < 1e-12) return [...vector];
  const scale = maxLength / length;
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

/**
 * E16.1 explicit-grab topology probe.
 *
 * A grab is NOT treated as neutral world plumbing. It is a deliberate player action
 * that changes topology after a real contact has been established: a spherical joint
 * fixes one point on the solver-owned organ to one point on a world body.
 *
 * Retraction is still produced by E16's momentum-neutral internal organ/core actuator.
 * The grab joint therefore has to provide any net momentum needed to hold the organ,
 * and aggregate subsystem momentum remains the causal bridge back to the analytical
 * Donor carrier.
 *
 * While the grab exists, joint reaction is a sustained constraint response. It may
 * alter current carrier velocity, but it must not be accumulated into persistent
 * externalVelocity every frame as if each solver iteration were a fresh knockback.
 */
export class E16GrabCharacter extends E16ActiveContactOrganCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);
    this.grabJoint = null;
    this.grabbedBody = null;
    this.grabAnchorWorld = [0, 0, 0];
    this.grabCount = 0;
    this.releaseCount = 0;
    this.lastGrabConstraintFeedbackImpulse = 0;
  }

  grabBody(bodyId, worldAnchor = this.organPosition) {
    if (!bodyId) return false;
    this.releaseGrab();

    const localA = [0, 0, 0];
    const localB = [0, 0, 0];
    this.b3.b3Body_GetLocalPoint(localA, bodyId, worldAnchor);
    this.b3.b3Body_GetLocalPoint(localB, this.organBody, worldAnchor);

    const def = this.b3.b3DefaultSphericalJointDef();
    def.base.bodyIdA = bodyId;
    def.base.bodyIdB = this.organBody;
    def.base.localFrameA.position = localA;
    def.base.localFrameB.position = localB;
    def.base.collideConnected = false;

    this.grabJoint = this.b3.b3CreateSphericalJoint(this.world, def);
    this.grabbedBody = bodyId;
    this.grabAnchorWorld = [...worldAnchor];
    this.grabCount += 1;
    return true;
  }

  releaseGrab() {
    if (!this.grabJoint) return false;
    this.b3.b3DestroyJoint(this.grabJoint);
    this.grabJoint = null;
    this.grabbedBody = null;
    this.releaseCount += 1;
    this.lastGrabConstraintFeedbackImpulse = 0;
    return true;
  }

  reset(position = this.startPosition) {
    if (this.grabJoint) this.releaseGrab();
    super.reset(position);
    this.grabAnchorWorld = [0, 0, 0];
    this.grabCount = 0;
    this.releaseCount = 0;
    this.lastGrabConstraintFeedbackImpulse = 0;
  }

  postStep(dt) {
    super.postStep(dt);

    // E16 classifies non-contact world response as persistent. A live grab is a
    // different semantic state: the world is continuously enforcing a player-created
    // constraint. Reclassify exactly the feedback vector that the parent just applied
    // from persistent external momentum to current-only constraint response.
    if (this.grabJoint && this.lastSubsystemFeedbackPersistent) {
      const requestedFeedback = [
        this.subsystemFeedbackGain * this.lastAggregateWorldImpulse[0] / this.virtualMass,
        0,
        this.subsystemFeedbackGain * this.lastAggregateWorldImpulse[2] / this.virtualMass,
      ];
      const feedback = clampMagnitude3(requestedFeedback, this.maxSubsystemFeedbackDeltaV);
      this.externalVelocity[0] -= feedback[0];
      this.externalVelocity[2] -= feedback[2];
      this.lastSubsystemFeedbackPersistent = false;
      this.lastPersistentSubsystemFeedbackImpulse = 0;
      this.lastConstraintSubsystemFeedbackImpulse = this.lastSubsystemFeedbackImpulse;
    }

    this.lastGrabConstraintFeedbackImpulse = this.grabJoint
      ? this.lastConstraintSubsystemFeedbackImpulse
      : 0;
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e16-explicit-grab',
      grabbed: Boolean(this.grabJoint),
      grabAnchorWorld: [...this.grabAnchorWorld],
      grabCount: this.grabCount,
      releaseCount: this.releaseCount,
      grabConstraintFeedbackImpulse: this.lastGrabConstraintFeedbackImpulse,
    };
  }
}

export function createE16GrabCharacter(b3, world, options = {}) {
  return new E16GrabCharacter(b3, world, options);
}
