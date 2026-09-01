import { add3, dot3, scale3, sub3 } from './math.js';
import { ControllerOwnedCharacter } from './character.js';
import { DONOR_PROFILE_V0 } from './donor/profile.js';
import { installVelocityOnlyDynamicContactMemory } from './donor/contact-memory.js';
import {
  applyIntentCappedRelativeConstraintVelocity,
  maxAbsVectorDelta,
  recoverSolvedPlanePushes,
} from './constraint-velocity.js';

const SOLVE_EQUIVALENCE_TOLERANCE = 2e-5;

export const E23D_BEHAVIOR = Object.freeze({
  specimen: 'A‴',
  base: 'A″ / Donor v0 mechanical constants',
  reciprocity: 'causal-components',
  dynamicContactMemory: 'velocity-only-contact-consequence',
  constraintVelocityPolicy: 'intent-capped surface-relative active horizontal static/kinematic normal velocity',
  status: 'Owner-qualified current-best mechanics; Donor v1 source behavior',
});

export class ConstraintVelocityCharacter extends ControllerOwnedCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, {
      ...DONOR_PROFILE_V0,
      ...options,
      reciprocityMode: 'causal-components',
    });
    this.lastConstraintClips = 0;
    this.lastConstraintSolveError = 0;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this.lastConstraintClips = 0;
    this.lastConstraintSolveError = 0;
  }

  _solveMovement(dt) {
    const wasSupported = Boolean(this.currentSupport);
    const capsule = {
      center1: [0, -this.halfSegment, 0],
      center2: [0, this.halfSegment, 0],
      radius: this.radius,
    };
    const target = [
      this.position[0] + dt * this.velocity[0],
      this.position[1] + dt * this.velocity[1],
      this.position[2] + dt * this.velocity[2],
    ];

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
          `E2.3d constraint policy cannot trust recovered plane state: solve delta divergence ${solveError}`,
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
      constraintClips: this.lastConstraintClips,
      constraintSolveError: this.lastConstraintSolveError,
    };
  }
}

export function createConstraintVelocityCharacter(b3, world, options = {}) {
  const character = new ConstraintVelocityCharacter(b3, world, options);
  return installVelocityOnlyDynamicContactMemory(character);
}
