const IDENTITY_QUAT = [0, 0, 0, 1];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function rotateUpByQuat(q) {
  const [x, y, z, w] = q;
  return [
    2 * (x * y - w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z + w * x),
  ];
}

function sagittalAngleFromQuat(q) {
  const up = rotateUpByQuat(q);
  return Math.atan2(up[2], up[1]);
}

function createDynamicBox(b3, world, { position, half, mass, friction, motionLocks }) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0.015;
  bodyDef.angularDamping = 0.015;
  bodyDef.enableSleep = false;
  bodyDef.enableContactRecycling = false;
  Object.assign(bodyDef.motionLocks, motionLocks);
  const body = b3.b3CreateBody(world, bodyDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForBoxMass(mass, half);
  shapeDef.baseMaterial.friction = friction;
  shapeDef.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

export const E3_SAGITTAL_DEFAULTS = Object.freeze({
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

export class SagittalBalanceOrganism {
  constructor(b3, world, options = {}) {
    this.b3 = b3;
    this.world = world;
    this.options = { ...E3_SAGITTAL_DEFAULTS, ...options };
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

    const sagittalLocks = {
      linearX: true,
      angularY: true,
      angularZ: true,
    };

    const foot = createDynamicBox(b3, world, {
      position: this.startFootPosition,
      half: footHalf,
      mass: this.options.footMass,
      friction: this.options.footFriction,
      motionLocks: sagittalLocks,
    });
    const torso = createDynamicBox(b3, world, {
      position: this.startTorsoPosition,
      half: torsoHalf,
      mass: this.options.torsoMass,
      friction: this.options.torsoFriction,
      motionLocks: sagittalLocks,
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
    this.lastBalanceTorque = 0;
    this.peakAbsTilt = 0;
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
    this.lastBalanceTorque = 0;
    this.peakAbsTilt = 0;
    this.fallObserved = false;
    this._sync();
  }

  preStep(dt) {
    this._sync();
    const theta = this.torsoTilt;
    const omega = this.torsoAngularVelocity[0];
    const requested = -this.kp * theta - this.kd * omega;
    const torque = clamp(requested, -this.maxTorque, this.maxTorque);
    this.lastBalanceTorque = torque;

    if (Math.abs(torque) > 1e-9) {
      const impulse = torque * dt;
      this.b3.b3Body_ApplyAngularImpulse(this.torso, [impulse, 0, 0], true);
      this.b3.b3Body_ApplyAngularImpulse(this.foot, [-impulse, 0, 0], true);
    }
  }

  postStep() {
    this._sync();
    this.peakAbsTilt = Math.max(this.peakAbsTilt, Math.abs(this.torsoTilt));
    if (Math.abs(this.torsoTilt) >= this.options.fallTiltRadians) this.fallObserved = true;
  }

  applyPush({ impulseNs, leverArm = 0.36, direction = 1 }) {
    this._sync();
    const point = [
      this.torsoCom[0],
      this.torsoCom[1] + leverArm,
      this.torsoCom[2],
    ];
    this.b3.b3Body_ApplyLinearImpulse(
      this.torso,
      [0, 0, direction * impulseNs],
      point,
      true,
    );
  }

  get torsoTilt() {
    return sagittalAngleFromQuat(this.torsoRotation);
  }

  get footTilt() {
    return sagittalAngleFromQuat(this.footRotation);
  }

  get supportMomentScale() {
    return (this.footMass + this.torsoMass) * this.options.gravity * this.options.footHalf[2];
  }

  isRecovered() {
    return (
      !this.fallObserved &&
      Math.abs(this.torsoTilt) <= this.options.recoverTiltRadians &&
      Math.abs(this.torsoAngularVelocity[0]) <= this.options.recoverAngularSpeed &&
      Math.abs(this.footTilt) <= this.options.recoverTiltRadians * 1.5
    );
  }

  telemetry() {
    return {
      mode: this.mode,
      torsoTilt: this.torsoTilt,
      footTilt: this.footTilt,
      torsoAngularSpeed: this.torsoAngularVelocity[0],
      footAngularSpeed: this.footAngularVelocity[0],
      torsoCom: [...this.torsoCom],
      footCom: [...this.footCom],
      balanceTorque: this.lastBalanceTorque,
      torqueUtilization: this.maxTorque > 0 ? Math.abs(this.lastBalanceTorque) / this.maxTorque : 0,
      peakAbsTilt: this.peakAbsTilt,
      fallObserved: this.fallObserved,
      recovered: this.isRecovered(),
      supportMomentScale: this.supportMomentScale,
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

export function sagittalAngleFromRotation(q) {
  return sagittalAngleFromQuat(q);
}
