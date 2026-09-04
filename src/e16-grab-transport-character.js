import { E16GrabCharacter } from './e16-grab-character.js';

/**
 * E16.1b explicit constraint-transport authority lease.
 *
 * A live grab is a player-created physical topology. While it exists, the measured
 * horizontal displacement residual of the complete solver-owned {core + organ}
 * subsystem is allowed to contribute to the analytical carrier's displacement for
 * that same tick.
 *
 * This is intentionally neither persistent knockback nor a bespoke pullPlayer().
 * The signal is zero under momentum-neutral internal actuation, changes sign with the
 * solver-owned constraint response, and enters the existing capsule mover as an
 * instantaneous transport velocity. The mover therefore still decides whether the
 * resulting carrier displacement is geometrically feasible.
 */
export class E16GrabTransportCharacter extends E16GrabCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);
    this.constraintTransportGain = options.constraintTransportGain ?? this.subsystemFeedbackGain;
    this.lastAppliedGrabTransport = [0, 0, 0];
    this.lastAppliedGrabTransportDistance = 0;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this.lastAppliedGrabTransport = [0, 0, 0];
    this.lastAppliedGrabTransportDistance = 0;
  }

  _applyGrabConstraintTransport(dt) {
    this.lastAppliedGrabTransport = [0, 0, 0];
    this.lastAppliedGrabTransportDistance = 0;
    if (!this.grabJoint || this.constraintTransportGain === 0 || dt <= 0) return;

    const dx = this.constraintTransportGain * this.lastAggregateWorldTransport[0];
    const dz = this.constraintTransportGain * this.lastAggregateWorldTransport[2];
    if (!Number.isFinite(dx) || !Number.isFinite(dz)) {
      throw new Error(`E16.1b non-finite constraint transport: ${dx}, ${dz}`);
    }

    // Express the solver-owned displacement as an instantaneous velocity contribution
    // so the normal Donor capsule plane/cast solve remains the final geometric arbiter.
    this.velocity[0] += dx / dt;
    this.velocity[2] += dz / dt;
    this.lastAppliedGrabTransport = [dx, 0, dz];
    this.lastAppliedGrabTransportDistance = Math.hypot(dx, dz);
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e16-grab-constraint-transport',
      constraintTransportGain: this.constraintTransportGain,
      appliedGrabTransport: [...this.lastAppliedGrabTransport],
      appliedGrabTransportDistance: this.lastAppliedGrabTransportDistance,
    };
  }
}

export function createE16GrabTransportCharacter(b3, world, options = {}) {
  return new E16GrabTransportCharacter(b3, world, options);
}
