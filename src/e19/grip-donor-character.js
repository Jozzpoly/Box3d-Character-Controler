import { ConstraintVelocityCharacter } from '../constraint-velocity-character.js';
import { installVelocityOnlyDynamicContactMemory } from '../donor/contact-memory.js';

const VERTICAL_NORMAL_MIN = 0.7;
const VELOCITY_EPSILON = 1e-7;

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Branch-local Donor variant for the E19 grip-consequence experiment.
 *
 * Accepted Donor v1 intentionally owns only horizontal static/kinematic constraint-
 * velocity cleanup. That is correct provenance for its locomotion problem, but E19.0d
 * exposed a new case: a grip can drive the analytical player upward into a ceiling,
 * the capsule mover blocks position, yet the unhandled vertical velocity remains stored.
 *
 * This class does NOT globally change Donor semantics. While an E19 grip relation is
 * active, it extends the existing relative constraint-velocity cleanup only to planes
 * whose normal is predominantly vertical. Ungripped behavior delegates exactly to the
 * accepted Donor policy.
 */
export class E19GripDonorCharacter extends ConstraintVelocityCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);
    this.gripConstraintActive = false;
    this.lastGripVerticalConstraintClips = 0;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this.gripConstraintActive = false;
    this.lastGripVerticalConstraintClips = 0;
  }

  setGripConstraintActive(active) {
    this.gripConstraintActive = Boolean(active);
  }

  _applyConstraintVelocityPolicy(args) {
    const base = super._applyConstraintVelocityPolicy(args);
    this.lastGripVerticalConstraintClips = 0;
    if (!this.gripConstraintActive) return base;

    const out = [...base.velocity];
    const staticType = bodyTypeValue(this.b3.b3BodyType.b3_staticBody);
    const kinematicType = bodyTypeValue(this.b3.b3BodyType.b3_kinematicBody);

    for (let i = 0; i < args.planes.length; i++) {
      const plane = args.planes[i];
      if (!((args.recoveredPushes?.[i] ?? 0) > 0) || plane.clipVelocity === false) continue;

      const extra = args.extras[i];
      if (!extra?.shapeId) continue;
      const body = this.b3.b3Shape_GetBody(extra.shapeId);
      const type = bodyTypeValue(this.b3.b3Body_GetType(body));
      if (type !== staticType && type !== kinematicType) continue;

      const normal = plane.plane.normal;
      if (Math.abs(normal[1]) < VERTICAL_NORMAL_MIN) continue;

      const surfaceVelocity = type === staticType
        ? [0, 0, 0]
        : this._bodyPointVelocity(body, extra.point);
      const relativeVelocity = sub3(out, surfaceVelocity);
      const desiredRelativeVelocity = sub3(args.desiredVelocity, surfaceVelocity);
      const relativeInward = dot3(relativeVelocity, normal);
      const desiredRelativeInward = dot3(desiredRelativeVelocity, normal);
      const allowedRelativeInward = Math.min(0, desiredRelativeInward);

      if (relativeInward >= allowedRelativeInward - VELOCITY_EPSILON) continue;
      const excess = relativeInward - allowedRelativeInward;
      out[0] -= excess * normal[0];
      out[1] -= excess * normal[1];
      out[2] -= excess * normal[2];
      this.lastGripVerticalConstraintClips += 1;
    }

    return {
      velocity: out,
      clippedComponents: base.clippedComponents + this.lastGripVerticalConstraintClips,
    };
  }

  telemetry() {
    return {
      ...super.telemetry(),
      gripConstraintActive: this.gripConstraintActive,
      gripVerticalConstraintClips: this.lastGripVerticalConstraintClips,
    };
  }
}

export function createE19GripDonorCharacter(b3, world, options = {}) {
  return installVelocityOnlyDynamicContactMemory(new E19GripDonorCharacter(b3, world, options));
}
