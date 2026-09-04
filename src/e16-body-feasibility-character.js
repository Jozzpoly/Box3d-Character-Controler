import { E15ContactSemanticCharacter } from './e15-contact-semantic-character.js';
import { add3, dot3, scale3, sub3 } from './math.js';
import {
  applyIntentCappedRelativeConstraintVelocity,
  maxAbsVectorDelta,
  recoverSolvedPlanePushes,
} from './constraint-velocity.js';

const SOLVE_EQUIVALENCE_TOLERANCE = 2e-5;

function projectXZToDisk(target, center, radius) {
  const dx = target[0] - center[0];
  const dz = target[2] - center[2];
  const distance = Math.hypot(dx, dz);
  if (distance <= radius || distance < 1e-12) {
    return { point: [...target], clipped: false, requestedExtension: distance };
  }
  const scale = radius / distance;
  return {
    point: [center[0] + dx * scale, target[1], center[2] + dz * scale],
    clipped: true,
    requestedExtension: distance,
  };
}

/**
 * E16.0 disposable authority-topology probe.
 *
 * E15.1 proved that a finite physical upper-body can coexist with accepted Donor
 * traversal, but Owner free play showed that the body was mostly secondary motion:
 * Donor performed the game, the body followed, and body/world events merely perturbed
 * velocity afterward.
 *
 * E16.0 changes one thing: the physical body's current horizontal state owns a bounded
 * feasibility workspace for the carrier. Donor still proposes its normal movement
 * target, but the carrier target is projected into a disk around the solver-owned body.
 * If the body is stopped by world geometry, the carrier can no longer move arbitrarily
 * far away and pretend the body was irrelevant.
 *
 * This is intentionally NOT a physical joint or final anatomy model. It is a topology
 * test: does giving the body veto power over feasible carrier displacement create a
 * useful class of gameplay without surrendering neutral Donor agency?
 *
 * Body->velocity feedback is disabled by default so the crucible isolates feasibility
 * ownership from E15's post-contact impulse channel.
 */
export class E16BodyFeasibilityCharacter extends E15ContactSemanticCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, {
      ...options,
      feedbackGain: options.feedbackGain ?? 0,
    });
    this.attachmentRadius = options.attachmentRadius ?? 0.22;
    this.lastFeasibilityClipped = false;
    this.lastFeasibilityRequestedExtension = 0;
    this.lastFeasibilityAppliedCorrection = 0;
    this.lastFeasibilityMoveFraction = 1;
    this.peakFeasibilityRequestedExtension = 0;
    this.feasibilityClipFrames = 0;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this.lastFeasibilityClipped = false;
    this.lastFeasibilityRequestedExtension = 0;
    this.lastFeasibilityAppliedCorrection = 0;
    this.lastFeasibilityMoveFraction = 1;
    this.peakFeasibilityRequestedExtension = 0;
    this.feasibilityClipFrames = 0;
  }

  _solveMovement(dt) {
    // Called after the Box3D world step. Syncing here means the feasibility workspace
    // is defined by the body's actual post-solver state, including world contacts.
    this._syncBody();

    const wasSupported = Boolean(this.currentSupport);
    const capsule = {
      center1: [0, -this.halfSegment, 0],
      center2: [0, this.halfSegment, 0],
      radius: this.radius,
    };

    const movementStart = [...this.position];
    const donorTarget = [
      this.position[0] + dt * this.velocity[0],
      this.position[1] + dt * this.velocity[1],
      this.position[2] + dt * this.velocity[2],
    ];

    const projected = projectXZToDisk(donorTarget, this.bodyPosition, this.attachmentRadius);
    const target = projected.point;
    const requestedCorrection = Math.hypot(
      donorTarget[0] - target[0],
      donorTarget[2] - target[2],
    );
    const requestedMove = Math.hypot(
      donorTarget[0] - movementStart[0],
      donorTarget[2] - movementStart[2],
    );
    const projectedMove = Math.hypot(
      target[0] - movementStart[0],
      target[2] - movementStart[2],
    );

    this.lastFeasibilityClipped = projected.clipped;
    this.lastFeasibilityRequestedExtension = projected.requestedExtension;
    this.lastFeasibilityAppliedCorrection = requestedCorrection;
    this.lastFeasibilityMoveFraction = requestedMove > 1e-9
      ? Math.min(1, projectedMove / requestedMove)
      : 1;
    this.peakFeasibilityRequestedExtension = Math.max(
      this.peakFeasibilityRequestedExtension,
      projected.requestedExtension,
    );
    if (projected.clipped) this.feasibilityClipFrames += 1;

    let lastPlanes = [];
    let lastExtras = [];
    let lastRecoveredPushes = [];
    this.lastConstraintClips = 0;
    this.lastConstraintSolveError = 0;

    const tolerance = 0.002;
    for (let iteration = 0; iteration < 5; iteration++) {
      const { planes, extras } = this._collectPlanes(capsule);
      const solveInput = sub3(target, this.position);
      const solved = this.b3.b3SolvePlanes(solveInput, planes);
      const recovered = recoverSolvedPlanePushes(solveInput, planes);
      const solveError = maxAbsVectorDelta(solved.delta, recovered.delta);
      this.lastConstraintSolveError = Math.max(this.lastConstraintSolveError, solveError);
      if (solveError > SOLVE_EQUIVALENCE_TOLERANCE) {
        throw new Error(
          `E16 feasibility probe cannot trust recovered plane state: solve delta divergence ${solveError}`,
        );
      }

      let delta = solved.delta;
      const fraction = this.b3.b3World_CastMover(
        this.world,
        this.position,
        capsule,
        delta,
        this.queryFilter,
        () => true,
      );
      delta = scale3(delta, fraction);
      this.position = add3(this.position, delta);
      lastPlanes = planes;
      lastExtras = extras;
      lastRecoveredPushes = recovered.pushes;
      if (dot3(delta, delta) < tolerance * tolerance) break;
    }

    this.lastPlaneCount = lastPlanes.length;
    this._exchangeDynamicContactImpulses(lastPlanes, lastExtras);
    const preClipVelocity = [...this.velocity];
    const desiredVelocity = [
      this.desiredDirection[0] * this.desiredSpeed,
      0,
      this.desiredDirection[2] * this.desiredSpeed,
    ];
    const constrained = applyIntentCappedRelativeConstraintVelocity({
      b3: this.b3,
      velocity: this.velocity,
      desiredVelocity,
      planes: lastPlanes,
      extras: lastExtras,
      recoveredPushes: lastRecoveredPushes,
      bodyPointVelocity: (body, point) => this._bodyPointVelocity(body, point),
    });
    this.velocity = constrained.velocity;
    this.lastConstraintClips = constrained.clippedComponents;

    // Body feasibility behaves like an additional geometric movement constraint.
    // When it clips the proposed target, root horizontal velocity is reconciled to
    // the displacement that was actually feasible this outer step. This prevents a
    // hidden full-speed carrier from accumulating behind a body-owned veto.
    if (projected.clipped) {
      this.velocity[0] = (this.position[0] - movementStart[0]) / dt;
      this.velocity[2] = (this.position[2] - movementStart[2]) / dt;
    }

    this.currentSupport = this._findSupport(lastPlanes, lastExtras, preClipVelocity);
    if (this.currentSupport && this.velocity[1] < 0) this.velocity[1] = 0;

    if (!wasSupported && this.currentSupport && preClipVelocity[1] < -0.5) {
      this.justLanded = true;
      this.landingSpeed = -preClipVelocity[1];
    }
    if (this.currentSupport) this.coyoteRemaining = this.coyoteTime;
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e16-body-feasibility',
      attachmentRadius: this.attachmentRadius,
      feasibilityClipped: this.lastFeasibilityClipped,
      feasibilityRequestedExtension: this.lastFeasibilityRequestedExtension,
      feasibilityAppliedCorrection: this.lastFeasibilityAppliedCorrection,
      feasibilityMoveFraction: this.lastFeasibilityMoveFraction,
      feasibilityClipFrames: this.feasibilityClipFrames,
      peakFeasibilityRequestedExtension: this.peakFeasibilityRequestedExtension,
    };
  }
}

export function createE16BodyFeasibilityCharacter(b3, world, options = {}) {
  return new E16BodyFeasibilityCharacter(b3, world, options);
}
