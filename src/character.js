import {
  add3,
  cross3,
  dot3,
  inverseTransformPoint,
  length3,
  lengthXZ,
  mulMat3Vec3,
  scale3,
  sub3,
  transformPoint,
} from './math.js';

const FLT_MAX = 3.4e38;

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

export class ControllerOwnedCharacter {
  constructor(b3, world, options = {}) {
    this.b3 = b3;
    this.world = world;
    this.radius = options.radius ?? 0.36;
    this.halfSegment = options.halfSegment ?? 0.54;
    this.virtualMass = options.virtualMass ?? 80;
    this.maxSpeed = options.maxSpeed ?? 5.5;
    this.sprintMultiplier = options.sprintMultiplier ?? 1.35;
    this.accelerate = options.accelerate ?? 7.0;
    this.friction = options.friction ?? 7.0;
    this.stopSpeed = options.stopSpeed ?? 1.0;
    this.gravity = options.gravity ?? 18.0;
    this.jumpSpeed = options.jumpSpeed ?? 7.0;
    this.supportNormalMinY = options.supportNormalMinY ?? 0.52;
    this.startPosition = [...(options.startPosition ?? [0, 1.0, 7])];
    this.position = [...this.startPosition];
    this.velocity = [0, 0, 0];
    this.desiredSpeed = 0;
    this.desiredDirection = [0, 0, -1];
    this.currentSupport = null;
    this.supportTransportDistance = 0;
    this.lastContactImpulse = 0;
    this.lastDynamicContacts = 0;
    this.lastPlaneCount = 0;
    this.queryFilter = b3.b3DefaultQueryFilter();
    this.planeScratch = b3.createPlaneResult();
    this._supportProbe = null;
    this._bodyPosition = [0, 0, 0];
    this._bodyRotation = [0, 0, 0, 1];
    this._bodyLinearVelocity = [0, 0, 0];
    this._bodyAngularVelocity = [0, 0, 0];
    this._bodyCenter = [0, 0, 0];
  }

  get halfHeight() {
    return this.radius + this.halfSegment;
  }

  reset(position = this.startPosition) {
    this.position = [...position];
    this.velocity = [0, 0, 0];
    this.desiredSpeed = 0;
    this.desiredDirection = [0, 0, -1];
    this.currentSupport = null;
    this._supportProbe = null;
    this.supportTransportDistance = 0;
    this.lastContactImpulse = 0;
    this.lastDynamicContacts = 0;
    this.lastPlaneCount = 0;
  }

  preStep(dt, intent) {
    this._captureSupportTransport();
    this._integrateIntent(dt, intent);
  }

  postStep(dt) {
    this._applySupportTransport();
    this._solveMovement(dt);
  }

  _integrateIntent(dt, intent) {
    const forward = intent.forward ?? [0, 0, -1];
    const right = intent.right ?? [1, 0, 0];
    let forwardAmount = intent.moveForward ?? 0;
    let rightAmount = intent.moveRight ?? 0;
    const inputLength = Math.hypot(forwardAmount, rightAmount);
    if (inputLength > 1) {
      forwardAmount /= inputLength;
      rightAmount /= inputLength;
    }
    const speedLimit = this.maxSpeed * (intent.sprint ? this.sprintMultiplier : 1);
    const desiredVelocity = [
      speedLimit * (forwardAmount * forward[0] + rightAmount * right[0]),
      0,
      speedLimit * (forwardAmount * forward[2] + rightAmount * right[2]),
    ];
    this.desiredSpeed = lengthXZ(desiredVelocity);
    if (this.desiredSpeed > 1e-6) {
      this.desiredDirection = [desiredVelocity[0] / this.desiredSpeed, 0, desiredVelocity[2] / this.desiredSpeed];
    }
    const horizontalSpeed = lengthXZ(this.velocity);
    if (horizontalSpeed > 1e-6) {
      const control = horizontalSpeed < this.stopSpeed ? this.stopSpeed : horizontalSpeed;
      const drop = control * this.friction * dt;
      const nextSpeed = Math.max(0, horizontalSpeed - drop);
      const ratio = nextSpeed / horizontalSpeed;
      this.velocity[0] *= ratio;
      this.velocity[2] *= ratio;
    } else {
      this.velocity[0] = 0;
      this.velocity[2] = 0;
    }
    if (this.desiredSpeed > 1e-6) {
      const currentAlongDesired = this.velocity[0] * this.desiredDirection[0] + this.velocity[2] * this.desiredDirection[2];
      const addSpeed = this.desiredSpeed - currentAlongDesired;
      if (addSpeed > 0) {
        const accelSpeed = Math.min(this.accelerate * speedLimit * dt, addSpeed);
        this.velocity[0] += accelSpeed * this.desiredDirection[0];
        this.velocity[2] += accelSpeed * this.desiredDirection[2];
      }
    }
    if (intent.jump && this.currentSupport) {
      const supportVelocity = this._supportPointVelocity(this.currentSupport);
      this.velocity[0] += supportVelocity[0];
      this.velocity[1] = supportVelocity[1] + this.jumpSpeed;
      this.velocity[2] += supportVelocity[2];
      this.currentSupport = null;
      this._supportProbe = null;
    }
    this.velocity[1] -= this.gravity * dt;
  }

  _captureSupportTransport() {
    this._supportProbe = null;
    const support = this.currentSupport;
    if (!support || support.type === 'STATIC' || !support.localPoint) return;
    this.b3.b3Body_GetPosition(this._bodyPosition, support.body);
    this.b3.b3Body_GetRotation(this._bodyRotation, support.body);
    const before = transformPoint(this._bodyPosition, this._bodyRotation, support.localPoint);
    this._supportProbe = { body: support.body, localPoint: [...support.localPoint], before };
  }

  _applySupportTransport() {
    this.supportTransportDistance = 0;
    const probe = this._supportProbe;
    this._supportProbe = null;
    if (!probe) return;
    this.b3.b3Body_GetPosition(this._bodyPosition, probe.body);
    this.b3.b3Body_GetRotation(this._bodyRotation, probe.body);
    const after = transformPoint(this._bodyPosition, this._bodyRotation, probe.localPoint);
    const delta = sub3(after, probe.before);
    this.position = add3(this.position, delta);
    this.supportTransportDistance = length3(delta);
  }

  _collectPlanes(capsule) {
    const planes = [];
    const extras = [];
    this.b3.b3World_CollideMover(this.world, this.position, capsule, this.queryFilter, (shapeId, buffer) => {
      const count = this.b3.getNumPlaneResults(buffer);
      for (let i = 0; i < count; i++) {
        this.b3.getPlaneResultAt(this.planeScratch, buffer, i);
        const normal = this.planeScratch.plane.normal;
        planes.push({ plane: { normal: [normal[0], normal[1], normal[2]], offset: this.planeScratch.plane.offset }, pushLimit: FLT_MAX, push: 0, clipVelocity: true });
        extras.push({ shapeId, point: [this.position[0] + this.planeScratch.point[0], this.position[1] + this.planeScratch.point[1], this.position[2] + this.planeScratch.point[2]] });
      }
      return true;
    });
    return { planes, extras };
  }

  _solveMovement(dt) {
    const capsule = { center1: [0, -this.halfSegment, 0], center2: [0, this.halfSegment, 0], radius: this.radius };
    const target = [this.position[0] + dt * this.velocity[0], this.position[1] + dt * this.velocity[1], this.position[2] + dt * this.velocity[2]];
    let lastPlanes = [];
    let lastExtras = [];
    const tolerance = 0.002;
    for (let iteration = 0; iteration < 5; iteration++) {
      const { planes, extras } = this._collectPlanes(capsule);
      const solved = this.b3.b3SolvePlanes(sub3(target, this.position), planes);
      let delta = solved.delta;
      const fraction = this.b3.b3World_CastMover(this.world, this.position, capsule, delta, this.queryFilter, () => true);
      delta = scale3(delta, fraction);
      this.position = add3(this.position, delta);
      lastPlanes = planes;
      lastExtras = extras;
      if (dot3(delta, delta) < tolerance * tolerance) break;
    }
    this.lastPlaneCount = lastPlanes.length;
    this._exchangeDynamicContactImpulses(lastPlanes, lastExtras);
    const preClipVelocity = [...this.velocity];
    this.velocity = this.b3.b3ClipVector(this.velocity, lastPlanes);
    this.currentSupport = this._findSupport(lastPlanes, lastExtras, preClipVelocity);
    if (this.currentSupport && this.velocity[1] < 0) this.velocity[1] = 0;
  }

  _exchangeDynamicContactImpulses(planes, extras) {
    this.lastContactImpulse = 0;
    this.lastDynamicContacts = 0;
    const invMassA = 1 / this.virtualMass;
    for (let i = 0; i < planes.length; i++) {
      const extra = extras[i];
      if (!extra) continue;
      const body = this.b3.b3Shape_GetBody(extra.shapeId);
      const type = bodyTypeValue(this.b3.b3Body_GetType(body));
      if (type !== bodyTypeValue(this.b3.b3BodyType.b3_dynamicBody)) continue;
      const normal = [-planes[i].plane.normal[0], -planes[i].plane.normal[1], -planes[i].plane.normal[2]];
      const invMassB = this.b3.b3Body_GetInverseMass(body);
      const invIB = this.b3.b3Body_GetWorldInverseRotationalInertia(body);
      this.b3.b3Body_GetWorldCenterOfMass(this._bodyCenter, body);
      const rB = sub3(extra.point, this._bodyCenter);
      const rnB = cross3(rB, normal);
      const kNormal = invMassA + invMassB + dot3(rnB, mulMat3Vec3(invIB, rnB));
      if (!(kNormal > 0)) continue;
      const pointVelocity = this._bodyPointVelocity(body, extra.point);
      const vn = dot3(sub3(pointVelocity, this.velocity), normal);
      if (vn >= 0) continue;
      const impulseMagnitude = -vn / kNormal;
      const impulse = scale3(normal, impulseMagnitude);
      this.velocity[0] -= invMassA * impulse[0];
      this.velocity[1] -= invMassA * impulse[1];
      this.velocity[2] -= invMassA * impulse[2];
      this.b3.b3Body_ApplyLinearImpulse(body, impulse, extra.point, true);
      this.lastContactImpulse += impulseMagnitude;
      this.lastDynamicContacts += 1;
    }
  }

  _findSupport(planes, extras, preClipVelocity) {
    let bestIndex = -1;
    let bestUp = this.supportNormalMinY;
    for (let i = 0; i < planes.length; i++) {
      const up = planes[i].plane.normal[1];
      if (up > bestUp) {
        bestUp = up;
        bestIndex = i;
      }
    }
    if (bestIndex < 0 || preClipVelocity[1] > 0.15) return null;
    const extra = extras[bestIndex];
    if (!extra) return null;
    const body = this.b3.b3Shape_GetBody(extra.shapeId);
    const typeValue = bodyTypeValue(this.b3.b3Body_GetType(body));
    let type = 'STATIC';
    if (typeValue === bodyTypeValue(this.b3.b3BodyType.b3_dynamicBody)) type = 'DYNAMIC';
    if (typeValue === bodyTypeValue(this.b3.b3BodyType.b3_kinematicBody)) type = 'KINEMATIC';
    let localPoint = null;
    if (type !== 'STATIC') {
      this.b3.b3Body_GetPosition(this._bodyPosition, body);
      this.b3.b3Body_GetRotation(this._bodyRotation, body);
      localPoint = inverseTransformPoint(this._bodyPosition, this._bodyRotation, extra.point);
    }
    return { body, type, point: [...extra.point], localPoint, normal: [...planes[bestIndex].plane.normal] };
  }

  _bodyPointVelocity(body, worldPoint) {
    this.b3.b3Body_GetLinearVelocity(this._bodyLinearVelocity, body);
    this.b3.b3Body_GetAngularVelocity(this._bodyAngularVelocity, body);
    this.b3.b3Body_GetWorldCenterOfMass(this._bodyCenter, body);
    return add3(this._bodyLinearVelocity, cross3(this._bodyAngularVelocity, sub3(worldPoint, this._bodyCenter)));
  }

  _supportPointVelocity(support) {
    if (!support || support.type === 'STATIC') return [0, 0, 0];
    return this._bodyPointVelocity(support.body, support.point ?? this.position);
  }

  telemetry() {
    return { speed: lengthXZ(this.velocity), verticalSpeed: this.velocity[1], desiredSpeed: this.desiredSpeed, grounded: Boolean(this.currentSupport), supportType: this.currentSupport?.type ?? 'NONE', supportTransport: this.supportTransportDistance, dynamicContacts: this.lastDynamicContacts, contactImpulse: this.lastContactImpulse, planeCount: this.lastPlaneCount, virtualMass: this.virtualMass };
  }
}
