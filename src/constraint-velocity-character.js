import {
  add3,
  dot3,
  inverseRotateVecByQuat,
  length3,
  rotateVecByQuat,
  scale3,
  sub3,
  transformPoint,
} from './math.js';
import { ControllerOwnedCharacter } from './character.js';
import { DONOR_PROFILE_V0 } from './donor/profile.js';
import { installVelocityOnlyDynamicContactMemory } from './donor/contact-memory.js';
import { CURRENT_QUERY_SEMANTICS, QUERY_CHANNEL } from './query-semantics.js';
import {
  applyIntentCappedRelativeConstraintVelocity,
  applyUnilateralVerticalConstraintVelocity,
  maxAbsVectorDelta,
  recoverSolvedPlanePushes,
} from './constraint-velocity.js';

const SOLVE_EQUIVALENCE_TOLERANCE = 2e-5;
const FLT_MAX = 3.4e38;

function sameBodyId(a, b) {
  return Boolean(a && b)
    && a.index1 === b.index1
    && a.world0 === b.world0
    && a.generation === b.generation;
}

export const E23D_BEHAVIOR = Object.freeze({
  specimen: 'A‴',
  base: 'A″ / Donor v0 mechanical constants',
  reciprocity: 'causal-components',
  dynamicContactMemory: 'velocity-only-contact-consequence',
  constraintVelocityPolicy: 'order-independent intent-capped horizontal + unilateral near-vertical static/kinematic relative velocity',
  foundationRepairs: 'A1 + A2 + A3/A3b + A5 combined research specimen',
  status: 'Research integration candidate; Owner-qualified Donor v1 behavior remains the comparison authority',
});

export class ConstraintVelocityCharacter extends ControllerOwnedCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, {
      ...DONOR_PROFILE_V0,
      ...options,
      reciprocityMode: 'causal-components',
    });
    this.querySemantics = options.querySemantics ?? CURRENT_QUERY_SEMANTICS;
    this.lastConstraintClips = 0;
    this.lastConstraintSolveError = 0;
    this.lastPersistentSupportReactionY = 0;
    this.lastVerticalConstraintConflict = false;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this.lastConstraintClips = 0;
    this.lastConstraintSolveError = 0;
    this.lastPersistentSupportReactionY = 0;
    this.lastVerticalConstraintConflict = false;
  }

  preStep(dt, intent) {
    const support = this.currentSupport;
    if (support && !this.b3.b3Body_IsValid(support.body)) {
      this.currentSupport = null;
      this._supportProbe = null;
    }
    super.preStep(dt, intent);
  }

  _allowsMoverShape(shapeId) {
    return this.querySemantics.allowsShape(this.b3, QUERY_CHANNEL.MOVER_COLLISION, shapeId);
  }

  _collectPlanes(capsule) {
    const planes = [];
    const extras = [];
    this.b3.b3World_CollideMover(this.world, this.position, capsule, this.queryFilter, (shapeId, buffer) => {
      if (!this._allowsMoverShape(shapeId)) return false;
      const count = this.b3.getNumPlaneResults(buffer);
      for (let i = 0; i < count; i++) {
        this.b3.getPlaneResultAt(this.planeScratch, buffer, i);
        const normal = this.planeScratch.plane.normal;
        planes.push({
          plane: { normal: [normal[0], normal[1], normal[2]], offset: this.planeScratch.plane.offset },
          pushLimit: FLT_MAX,
          push: 0,
          clipVelocity: true,
        });
        extras.push({
          shapeId,
          point: [
            this.position[0] + this.planeScratch.point[0],
            this.position[1] + this.planeScratch.point[1],
            this.position[2] + this.planeScratch.point[2],
          ],
        });
      }
      return true;
    });
    return { planes, extras };
  }

  _captureSupportTransport() {
    this._supportProbe = null;
    const support = this.currentSupport;
    if (!support || support.type === 'STATIC' || !support.localPoint || !support.normal) return;
    if (!this.b3.b3Body_IsValid(support.body)) {
      this.currentSupport = null;
      return;
    }

    this.b3.b3Body_GetPosition(this._bodyPosition, support.body);
    this.b3.b3Body_GetRotation(this._bodyRotation, support.body);
    const before = transformPoint(this._bodyPosition, this._bodyRotation, support.localPoint);
    const localNormal = inverseRotateVecByQuat(this._bodyRotation, support.normal);
    this._supportProbe = {
      body: support.body,
      localPoint: [...support.localPoint],
      localNormal,
      before,
    };
  }

  _applySupportTransport() {
    this.supportTransportDistance = 0;
    const probe = this._supportProbe;
    this._supportProbe = null;
    if (!probe || !this.b3.b3Body_IsValid(probe.body)) return;

    this.b3.b3Body_GetPosition(this._bodyPosition, probe.body);
    this.b3.b3Body_GetRotation(this._bodyRotation, probe.body);
    const after = transformPoint(this._bodyPosition, this._bodyRotation, probe.localPoint);
    const currentNormal = rotateVecByQuat(this._bodyRotation, probe.localNormal);
    const normalLength = length3(currentNormal);
    const normal = normalLength > 1e-9 ? scale3(currentNormal, 1 / normalLength) : [0, 1, 0];
    const rawDelta = sub3(after, probe.before);
    const normalDelta = dot3(rawDelta, normal);
    const requested = normalDelta < 0
      ? sub3(rawDelta, scale3(normal, normalDelta))
      : rawDelta;

    const capsule = {
      center1: [0, -this.halfSegment, 0],
      center2: [0, this.halfSegment, 0],
      radius: this.radius,
    };
    const fraction = this.b3.b3World_CastMover(
      this.world,
      this.position,
      capsule,
      requested,
      this.queryFilter,
      (shapeId) => {
        const body = this.b3.b3Shape_GetBody(shapeId);
        return !sameBodyId(body, probe.body) && this._allowsMoverShape(shapeId);
      },
    );
    const applied = scale3(requested, fraction);
    this.position = add3(this.position, applied);
    this.supportTransportDistance = length3(applied);
  }

  _solveMovement(dt) {
    const previousSupport = this.currentSupport;
    const wasSupported = Boolean(previousSupport);
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
    this.lastPersistentSupportReactionY = 0;
    this.lastVerticalConstraintConflict = false;

    const tolerance = 0.002;
    for (let iteration = 0; iteration < 5; iteration++) {
      const { planes, extras } = this._collectPlanes(capsule);
      const solveInput = sub3(target, this.position);
      const solved = this.b3.b3SolvePlanes(solveInput, planes);
      const recovered = recoverSolvedPlanePushes(solveInput, planes);
      const solveError = maxAbsVectorDelta(solved.delta, recovered.delta);
      this.lastConstraintSolveError = Math.max(this.lastConstraintSolveError, solveError);
      if (solveError > SOLVE_EQUIVALENCE_TOLERANCE) {
        throw new Error(`E2.3d constraint policy cannot trust recovered plane state: solve delta divergence ${solveError}`);
      }

      let delta = solved.delta;
      const fraction = this.b3.b3World_CastMover(
        this.world,
        this.position,
        capsule,
        delta,
        this.queryFilter,
        (shapeId) => this._allowsMoverShape(shapeId),
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
    const constrained = this._applyConstraintVelocityPolicy({
      velocity: this.velocity,
      desiredVelocity,
      planes: lastPlanes,
      extras: lastExtras,
      recoveredPushes: lastRecoveredPushes,
    });
    this.velocity = constrained.velocity;
    this.lastConstraintClips = constrained.clippedComponents;
    this.lastVerticalConstraintConflict = constrained.verticalConflict;

    this.currentSupport = this._findSupport(lastPlanes, lastExtras, preClipVelocity);
    if (this.currentSupport && this.velocity[1] < 0) this.velocity[1] = 0;
    this._reciprocatePersistentDynamicSupportVerticalClip(previousSupport, preClipVelocity);

    if (!wasSupported && this.currentSupport && preClipVelocity[1] < -0.5) {
      this.justLanded = true;
      this.landingSpeed = -preClipVelocity[1];
    }
    if (this.currentSupport) this.coyoteRemaining = this.coyoteTime;
  }

  _reciprocatePersistentDynamicSupportVerticalClip(previousSupport, preClipVelocity) {
    const support = this.currentSupport;
    if (previousSupport?.type !== 'DYNAMIC' || support?.type !== 'DYNAMIC') return;
    if (!sameBodyId(previousSupport.body, support.body)) return;
    const upwardCorrection = this.velocity[1] - preClipVelocity[1];
    if (!(upwardCorrection > 1e-10)) return;
    const reactionY = -this.virtualMass * upwardCorrection;
    this.b3.b3Body_ApplyLinearImpulse(support.body, [0, reactionY, 0], support.point, true);
    this.lastPersistentSupportReactionY = reactionY;
  }

  _applyConstraintVelocityPolicy({ velocity, desiredVelocity, planes, extras, recoveredPushes }) {
    const horizontal = applyIntentCappedRelativeConstraintVelocity({
      b3: this.b3,
      velocity,
      desiredVelocity,
      planes,
      extras,
      recoveredPushes,
      bodyPointVelocity: (body, point) => this._bodyPointVelocity(body, point),
    });
    const vertical = applyUnilateralVerticalConstraintVelocity({
      b3: this.b3,
      velocity: horizontal.velocity,
      planes,
      extras,
      recoveredPushes,
      bodyPointVelocity: (body, point) => this._bodyPointVelocity(body, point),
    });
    return {
      velocity: vertical.velocity,
      clippedComponents: horizontal.clippedComponents + vertical.clippedComponents,
      verticalConflict: vertical.conflict,
    };
  }

  telemetry() {
    return {
      ...super.telemetry(),
      constraintClips: this.lastConstraintClips,
      constraintSolveError: this.lastConstraintSolveError,
      persistentSupportReactionY: this.lastPersistentSupportReactionY,
      verticalConstraintConflict: this.lastVerticalConstraintConflict,
    };
  }
}

export function createConstraintVelocityCharacter(b3, world, options = {}) {
  const character = new ConstraintVelocityCharacter(b3, world, options);
  return installVelocityOnlyDynamicContactMemory(character);
}
