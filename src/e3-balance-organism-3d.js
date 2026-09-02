const IDENTITY_QUAT = [0, 0, 0, 1];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampVectorMagnitude(v, maxMagnitude) {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (length <= maxMagnitude || length < 1e-12) return [...v];
  const scale = maxMagnitude / length;
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function upFromQuat(q) {
  const [x, y, z, w] = q;
  return [
    2 * (x * y - w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z + w * x),
  ];
}

function tiltFromQuat(q) {
  const up = upFromQuat(q);
  return Math.acos(clamp(up[1], -1, 1));
}

function createDynamicBox(b3, world, { position, half, mass, friction }) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0.015;
  bodyDef.angularDamping = 0.015;
  bodyDef.enableSleep = false;
  bodyDef.enableContactRecycling = false;
  bodyDef.motionLocks.angularY = true;
  const body = b3.b3CreateBody(world, bodyDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForBoxMass(mass, half);
  shapeDef.baseMaterial.friction = friction;
  shapeDef.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

export const E3_BALANCE_3D_DEFAULTS = Object.freeze({
  gravity: 20,
  footHalf: Object.freeze([0.24, 0.055, 0.34]),
  torsoHalf: Object.freeze([0.22, 0.55, 0.18]),
  footMass: 10,
  torsoMass: 70,
  footFriction: 0.95,
  torsoFriction: 0.55,
  balanceKp: 1600,
  balanceKd: 210,
  finiteMaxTorque: 320,
  fallTiltRadians: 72 * Math.PI / 180,
  recoverTiltRadians: 4 * Math.PI / 180,
  recoverAngularSpeed: 0.16,
});

export class BalanceOrganism3D {
  constructor(b3, world, options = {}) {
    this.b3 = b3;
    this.world = world;
    this.options = { ...E3_BALANCE_3D_DEFAULTS, ...options };
    this.mode = options.mode ?? 'finite';
    this.maxTorque = options.maxTorque ?? (
      this.mode === 'passive' ? 0 : this.options.finiteMaxTorque
    );
    this.kp = options.balanceKp ?? this.options.balanceKp;
    this.kd = options.balanceKd ?? this.options.balanceKd;

    const footHalf = this.options.footHalf;
    const torsoHalf = this.options.torsoHalf;
    this.startFootPosition = [0, footHalf[1] + 0.002, 0];
    const ankleWorldY = this.startFootPosition[1] + footHalf[1];
    this.startTorsoPosition = [0, ankleWorldY + torsoHalf[1], 0];

    const foot = createDynamicBox(b3, world, {
      position: this.startFootPosition,
      half: footHalf,
      mass: this.options.footMass,
      friction: this.options.footFriction,
    });
    const torso = createDynamicBox(b3, world, {
      position: this.startTorsoPosition,
      half: torsoHalf,
      mass: this.options.torsoMass,
      friction: this.options.torsoFriction,
    });
    this.foot = foot.body;
    this.footShape = foot.shape;
    this.footMass = foot.mass;
    this.torso = torso.body;
    this.torsoShape = torso.shape;
    this.torsoMass = torso.mass;

    const ankle = b3.b3DefaultSphericalJointDef();
    ankle.base.bodyIdA = this.foot;
    ankle.base.bodyIdB = this.torso;
    ankle.base.localFrameA = {
      position: [0, footHalf[1], 0],
      quaternion: IDENTITY_QUAT,
    };
    ankle.base.localFrameB = {
      position: [0, -torsoHalf[1], 0],
      quaternion: IDENTITY_QUAT,
    };
    this.ankle = b3.b3CreateSphericalJoint(world, ankle);

    this.torsoPosition = [0, 0, 0];
    this.footPosition = [0, 0, 0];
    this.torsoRotation = [0, 0, 0, 1];
    this.footRotation = [0, 0, 0, 1];
    this.torsoAngularVelocity = [0, 0, 0];
    this.footAngularVelocity = [0, 0, 0];
    this.torsoCom = [0, 0, 0];
    this.footCom = [0, 0, 0];
    this.lastBalanceTorque = [0, 0, 0];
    this.peakTilt = 0;
    this.fallObserved = false;
    this._sync();
  }

  reset() {
    this.b3.b3Body_SetTransform(this.foot, this.startFootPosition, IDENTITY_QUAT);
    this.b3.b3Body_SetTransform(this.torso, this.startTorsoPosition, IDENTITY_QUAT);
    this.b3.b3Body_SetLinearVelocity(this.foot, [0, 0, 0]);
    this.b3.b3Body_SetLinearVelocity(this.torso, [0, 0, 0]);
    this.b3.b3Body_SetAngularVelocity(this.foot, [0, 0, 0]);
    this.b3.b3Body_SetAngularVelocity(this.torso, [0, 0, 0]);
    this.lastBalanceTorque = [0, 0, 0];
    this.peakTilt = 0;
    this.fallObserved = false;
    this._sync();
  }

  preStep(dt) {
    this._sync();
    const up = upFromQuat(this.torsoRotation);
    // cross(bodyUp, worldUp): the shortest local pitch/roll correction axis.
    const errorAxis = [-up[2], 0, up[0]];
    const requested = [
      this.kp * errorAxis[0] - this.kd * this.torsoAngularVelocity[0],
      0,
      this.kp * errorAxis[2] - this.kd * this.torsoAngularVelocity[2],
    ];
    const torque = clampVectorMagnitude(requested, this.maxTorque);
    this.lastBalanceTorque = torque;

    const magnitude = Math.hypot(torque[0], torque[2]);
    if (magnitude > 1e-9) {
      const impulse = [torque[0] * dt, 0, torque[2] * dt];
      this.b3.b3Body_ApplyAngularImpulse(this.torso, impulse, true);
      this.b3.b3Body_ApplyAngularImpulse(this.foot, [-impulse[0], 0, -impulse[2]], true);
    }
  }

  postStep() {
    this._sync();
    this.peakTilt = Math.max(this.peakTilt, this.torsoTilt);
    if (this.torsoTilt >= this.options.fallTiltRadians) this.fallObserved = true;
  }

  applyPush({ impulseNs, direction, leverArm = 0.36 }) {
    this._sync();
    const horizontalLength = Math.hypot(direction[0], direction[2]);
    if (horizontalLength < 1e-9) throw new Error('E3 3D push direction must have a horizontal component.');
    const dir = [direction[0] / horizontalLength, 0, direction[2] / horizontalLength];
    const point = [this.torsoCom[0], this.torsoCom[1] + leverArm, this.torsoCom[2]];
    this.b3.b3Body_ApplyLinearImpulse(
      this.torso,
      [dir[0] * impulseNs, 0, dir[2] * impulseNs],
      point,
      true,
    );
  }

  get torsoTilt() {
    return tiltFromQuat(this.torsoRotation);
  }

  get footTilt() {
    return tiltFromQuat(this.footRotation);
  }

  get horizontalAngularSpeed() {
    return Math.hypot(this.torsoAngularVelocity[0], this.torsoAngularVelocity[2]);
  }

  supportMomentScaleFor(direction) {
    const horizontalLength = Math.hypot(direction[0], direction[2]);
    const dx = Math.abs(direction[0] / horizontalLength);
    const dz = Math.abs(direction[2] / horizontalLength);
    const supportRadius = dx * this.options.footHalf[0] + dz * this.options.footHalf[2];
    return (this.footMass + this.torsoMass) * this.options.gravity * supportRadius;
  }

  isRecovered() {
    return (
      !this.fallObserved &&
      this.torsoTilt <= this.options.recoverTiltRadians &&
      this.horizontalAngularSpeed <= this.options.recoverAngularSpeed &&
      this.footTilt <= this.options.recoverTiltRadians * 1.5
    );
  }

  telemetry() {
    const torqueMagnitude = Math.hypot(this.lastBalanceTorque[0], this.lastBalanceTorque[2]);
    return {
      mode: this.mode,
      torsoTilt: this.torsoTilt,
      footTilt: this.footTilt,
      horizontalAngularSpeed: this.horizontalAngularSpeed,
      torsoAngularVelocity: [...this.torsoAngularVelocity],
      footAngularVelocity: [...this.footAngularVelocity],
      torsoCom: [...this.torsoCom],
      footCom: [...this.footCom],
      balanceTorque: [...this.lastBalanceTorque],
      torqueUtilization: this.maxTorque > 0 ? torqueMagnitude / this.maxTorque : 0,
      peakTilt: this.peakTilt,
      fallObserved: this.fallObserved,
      recovered: this.isRecovered(),
    };
  }

  _sync() {
    this.b3.b3Body_GetPosition(this.footPosition, this.foot);
    this.b3.b3Body_GetPosition(this.torsoPosition, this.torso);
    this.b3.b3Body_GetRotation(this.footRotation, this.foot);
    this.b3.b3Body_GetRotation(this.torsoRotation, this.torso);
    this.b3.b3Body_GetAngularVelocity(this.footAngularVelocity, this.foot);
    this.b3.b3Body_GetAngularVelocity(this.torsoAngularVelocity, this.torso);
    this.b3.b3Body_GetWorldCenterOfMass(this.footCom, this.foot);
    this.b3.b3Body_GetWorldCenterOfMass(this.torsoCom, this.torso);
  }
}
