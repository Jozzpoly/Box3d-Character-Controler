import { E17IntentManipulatorCharacter } from './e17-intent-manipulator-character.js';

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function mulMatrix3Columns(matrix, vector) {
  return [
    matrix.cx[0] * vector[0] + matrix.cy[0] * vector[1] + matrix.cz[0] * vector[2],
    matrix.cx[1] * vector[0] + matrix.cy[1] * vector[1] + matrix.cz[1] * vector[2],
    matrix.cx[2] * vector[0] + matrix.cy[2] * vector[1] + matrix.cz[2] * vector[2],
  ];
}

/**
 * E17-depth: the same one-point intent-first manipulation lifecycle as E17, with one
 * mechanical override: requested impulse uses the directional effective mass of the
 * grabbed rigid-body point instead of scalar reduced linear mass.
 *
 * Acquisition, target clamping, reach break, force budget, +J/-J application, release
 * semantics and browser input are inherited from E17 so the two variants cannot drift
 * independently in those behaviors. Off-centre leverage remains physical because +J
 * is still applied at the exact clicked surface point.
 */
export class E17PointMassManipulatorCharacter extends E17IntentManipulatorCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);
    this._resetPointMassTelemetry();
  }

  _resetPointMassTelemetry() {
    this.lastManipulatorPointEffectiveMass = 0;
    this.lastManipulatorScalarEffectiveMass = 0;
    this.lastManipulatorEffectiveMassRatio = 1;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this._resetPointMassTelemetry();
  }

  releaseManipulation(reason = 'owner-release') {
    const released = super.releaseManipulation(reason);
    if (released) this._resetPointMassTelemetry();
    return released;
  }

  _computeManipulatorEffectiveMass(deltaV) {
    const scalarMass = super._computeManipulatorEffectiveMass(deltaV);
    const deltaSpeed = Math.hypot(...deltaV);
    this.lastManipulatorScalarEffectiveMass = scalarMass;

    if (deltaSpeed < 1e-10) {
      this.lastManipulatorPointEffectiveMass = scalarMass;
      this.lastManipulatorEffectiveMassRatio = 1;
      return scalarMass;
    }

    const objectMass = this.b3.b3Body_GetMass(this.manipulatedBody);
    const n = [deltaV[0] / deltaSpeed, deltaV[1] / deltaSpeed, deltaV[2] / deltaSpeed];
    const center = [0, 0, 0];
    this.b3.b3Body_GetWorldCenterOfMass(center, this.manipulatedBody);
    const r = [
      this.manipulatedAnchorWorld[0] - center[0],
      this.manipulatedAnchorWorld[1] - center[1],
      this.manipulatedAnchorWorld[2] - center[2],
    ];
    const rn = cross3(r, n);
    const inverseInertia = this.b3.b3Body_GetWorldInverseRotationalInertia(this.manipulatedBody);
    const inverseInertiaRn = mulMatrix3Columns(inverseInertia, rn);
    const rotational = Math.max(0, dot3(rn, inverseInertiaRn));
    const k = 1 / objectMass + 1 / this.bodyMass + rotational;
    const pointMass = k > 1e-12 ? 1 / k : scalarMass;

    this.lastManipulatorPointEffectiveMass = pointMass;
    this.lastManipulatorEffectiveMassRatio = pointMass > 1e-12 ? scalarMass / pointMass : 1;
    return pointMass;
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e17-point-mass-manipulator',
      manipulatorPointEffectiveMass: this.lastManipulatorPointEffectiveMass,
      manipulatorScalarEffectiveMass: this.lastManipulatorScalarEffectiveMass,
      manipulatorEffectiveMassRatio: this.lastManipulatorEffectiveMassRatio,
    };
  }
}

export function createE17PointMassManipulatorCharacter(b3, world, options = {}) {
  return new E17PointMassManipulatorCharacter(b3, world, options);
}
