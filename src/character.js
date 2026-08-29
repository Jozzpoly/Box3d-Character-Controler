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

function moveToward2(currentX, currentZ, targetX, targetZ, maxDelta) {
  const dx = targetX - currentX;
  const dz = targetZ - currentZ;
  const distance = Math.hypot(dx, dz);
  if (distance <= maxDelta || distance < 1e-9) return [targetX, targetZ];
  const scale = maxDelta / distance;
  return [currentX + dx * scale, currentZ + dz * scale];
}

export class ControllerOwnedCharacter {
  constructor(b3, world, options = {}) {
    this.b3 = b3;
    this.world = world;
    this.radius = options.radius ?? 0.36;
    this.halfSegment = options.halfSegment ?? 0.54;
    this.virtualMass = options.virtualMass ?? 80;
    this.maxSpeed = options.maxSpeed ?? 5.2;
    this.sprintMultiplier = options.sprintMultiplier ?? 1.32;
    this.groundAcceleration = options.groundAcceleration ?? 31;
    this.groundDeceleration = options.groundDeceleration ?? 36;
    this.airAcceleration = options.airAcceleration ?? 7.5;
    this.airDeceleration = options.airDeceleration ?? 1.2;
    this.externalGroundDrag = options.externalGroundDrag ?? 2.0;
    this.externalAirDrag = options.externalAirDrag ?? 0.22;
    this.gravity = options.gravity ?? 20.0;
    this.fallGravityMultiplier = options.fallGravityMultiplier ?? 1.22;
    this.jumpReleaseGravityMultiplier = options.jumpReleaseGravityMultiplier ?? 1.75;
    this.jumpSpeed = options.jumpSpeed ?? 7.2;
    this.coyoteTime = options.coyoteTime ?? 0.11;
    this.jumpBufferTime = options.jumpBufferTime ?? 0.12;
    this.supportNormalMinY = options.supportNormalMinY ?? 0.58;
    // Provisional traversal polish only: keep ordinary stair-sized downward transitions
    // attached to static ground without converting larger drops into hidden teleportation.
    this.groundStickDistance = options.groundStickDistance ?? 0.27;
    this.startPosition = [...(options.startPosition ?? [0, 1.0, 7])];

    this.position = [...this.startPosition];
    this.velocity = [0, 0, 0];
    this.externalVelocity = [0, 0, 0];
    this.desiredSpeed = 0;
    this.desiredDirection = [0, 0, -1];
    this.currentSupport = null;
    this.supportTransportDistance = 0;
    this.lastGroundStickDistance = 0;
    this.lastContactImpulse = 0;
    this.lastDynamicContacts = 0;
    this.lastPlaneCount = 0;
    this.justLanded = false;
    this.landingSpeed = 0;
    this.coyoteRemaining = 0;
    this.jumpBufferRemaining = 0;

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
    this.externalVelocity = [0, 0, 0];
    this.desiredSpeed = 0;
    this.desiredDirection = [0, 0, -1];
    this.currentSupport = null;
    this._supportProbe = null;
    this.supportTransportDistance = 0;
    this.lastGroundStickDistance = 0;
    this.lastContactImpulse = 0;
    this.lastDynamicContacts = 0;
    this.lastPlaneCount = 0;
    this.justLanded = false;
    this.landingSpeed = 0;
    this.coyoteRemaining = 0;
    this.jumpBufferRemaining = 0;
  }

  preStep(dt, intent) {
    this.justLanded = false;
    this.landingSpeed = 0;
    this.lastGroundStickDistance = 0;
    this._captureSupportTransport();
    this._integrateIntent(dt, intent);
  }

  postStep(dt) {
    this._applySupportTransport();
    this._solveMovement(dt);
  }

  _integrateIntent(dt, intent) {
    const grounded = Boolean(this.currentSupport);
    if (grounded) this.coyoteRemaining = this.coyoteTime;
    else this.coyoteRemaining = Math.max(0, this.coyoteRemaining - dt);

    if (intent.jump) this.jumpBufferRemaining = this.jumpBufferTime;
    else this.jumpBufferRemaining = Math.max(0, this.jumpBufferRemaining - dt);

    const externalDrag = grounded ? this.externalGroundDrag : this.externalAirDrag;
    const dragFactor = Math.exp(-externalDrag * dt);
    this.externalVelocity[0] *= dragFactor;
    this.externalVelocity[2] *= dragFactor;
    if (Math.hypot(this.externalVelocity[0], this.externalVelocity[2]) < 0.01) {
      this.externalVelocity[0] = 0;
      this.externalVelocity[2] = 0;
    }

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

    const targetX = desiredVelocity[0] + this.externalVelocity[0];
    const targetZ = desiredVelocity[2] + this.externalVelocity[2];
    const acceleration = grounded
      ? (this.desiredSpeed > 0.01 ? this.groundAcceleration : this.groundDeceleration)
      : (this.desiredSpeed > 0.01 ? this.airAcceleration : this.airDeceleration);
    const [nextX, nextZ] = moveToward2(this.velocity[0], this.velocity[2], targetX, targetZ, acceleration * dt);
    this.velocity[0] = nextX;
    this.velocity[2] = nextZ;

    const canJump = grounded || this.coyoteRemaining > 0;
    if (this.jumpBufferRemaining > 0 && canJump) {
      const supportVelocity = grounded ? this._supportPointVelocity(this.currentSupport) : [0, 0, 0];
      this.externalVelocity[0] += supportVelocity[0];
      this.externalVelocity[2] += supportVelocity[2];
      this.velocity[0] += supportVelocity[0];
      this.velocity[1] = Math.max(0, supportVelocity[1]) + this.jumpSpeed;
      this.velocity[2] += supportVelocity[2];
      this.currentSupport = null;
      this._supportProbe = null;
      this.jumpBufferRemaining = 0;
      this.coyoteRemaining = 0;
    }

    let gravityMultiplier = 1;
    if (this.velocity[1] < -0.05) gravityMultiplier = this.fallGravityMultiplier;
    else if (this.velocity[1] > 0.05 && !intent.jumpHeld) gravityMultiplier = this.jumpReleaseGravityMultiplier;
    this.velocity[1] -= this.gravity * gravityMultiplier * dt;
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

  _collectPlanesAt(position, capsule) {
    const planes = [];
    const extras = [];
    this.b3.b3World_CollideMover(this.world, position, capsule, this.queryFilter, (shapeId, buffer) => {
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
            position[0] + this.planeScratch.point[0],
            position[1] + this.planeScratch.point[1],
            position[2] + this.planeScratch.point[2],
          ],
        });
      }
      return true;
    });
    return { planes, extras };
  }

  _collectPlanes(capsule) {
    return this._collectPlanesAt(this.position, capsule);
  }

  _hasStaticHorizontalBlocker(planes, extras, horizontalDelta) {
    const distance = lengthXZ(horizontalDelta);
    if (distance < 1e-6) return false;
    const direction = [horizontalDelta[0] / distance, 0, horizontalDelta[2] / distance];

    for (let i = 0; i < planes.length; i++) {
      const extra = extras[i];
      if (!extra) continue;
      const normal = planes[i].plane.normal;
      if (Math.abs(normal[1]) > 0.45) continue;
      if (normal[0] * direction[0] + normal[2] * direction[2] > -0.25) continue;
      const body = this.b3.b3Shape_GetBody(extra.shapeId);
      const type = bodyTypeValue(this.b3.b3Body_GetType(body));
      if (type === bodyTypeValue(this.b3.b3BodyType.b3_staticBody)) return true;
    }
    return false;
  }

  _probeStaticGroundStick(capsule) {
    const origin = [...this.position];
    const target = [origin[0], origin[1] - this.groundStickDistance, origin[2]];
    let probePosition = [...origin];
    const tolerance = 0.002;

    for (let iteration = 0; iteration < 5; iteration++) {
      const { planes } = this._collectPlanesAt(probePosition, capsule);
      const solved = this.b3.b3SolvePlanes(sub3(target, probePosition), planes);
      let delta = solved.delta;
      const fraction = this.b3.b3World_CastMover(
        this.world,
        probePosition,
        capsule,
        delta,
        this.queryFilter,
        () => true,
      );
      delta = scale3(delta, fraction);
      probePosition = add3(probePosition, delta);
      if (dot3(delta, delta) < tolerance * tolerance) break;
    }

    const contacts = this._collectPlanesAt(probePosition, capsule);
    const support = this._findSupport(contacts.planes, contacts.extras, [0, -1, 0]);
    const distance = origin[1] - probePosition[1];
    if (!support || support.type !== 'STATIC') return null;
    if (distance < 0.004 || distance > this.groundStickDistance + 0.005) return null;

    return {
      position: probePosition,
      planes: contacts.planes,
      extras: contacts.extras,
      distance,
    };
  }

  _solveMovement(dt) {
    const previousSupport = this.currentSupport;
    const wasSupported = Boolean(previousSupport);
    const capsule = {
      center1: [0, -this.halfSegment, 0],
      center2: [0, this.halfSegment, 0],
      radius: this.radius,
    };
    const horizontalDelta = [dt * this.velocity[0], 0, dt * this.velocity[2]];
    const requestedHorizontal = lengthXZ(horizontalDelta);
    const target = [
      this.position[0] + horizontalDelta[0],
      this.position[1] + dt * this.velocity[1],
      this.position[2] + horizontalDelta[2],
    ];
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

    // CastMover can stop exactly at a new obstacle that was not present in the planes
    // collected before the cast. Re-query the final position before classifying support,
    // blockers, or impulses so those decisions use the actual end-of-tick contact state.
    const finalContacts = this._collectPlanes(capsule);
    lastPlanes = finalContacts.planes;
    lastExtras = finalContacts.extras;

    const preClipVelocity = [...this.velocity];
    let support = this._findSupport(lastPlanes, lastExtras, preClipVelocity);

    if (
      !support &&
      previousSupport?.type === 'STATIC' &&
      this.desiredSpeed > 0.05 &&
      preClipVelocity[1] <= 0.20 &&
      requestedHorizontal > 0.001 &&
      !this._hasStaticHorizontalBlocker(lastPlanes, lastExtras, horizontalDelta)
    ) {
      const adhesion = this._probeStaticGroundStick(capsule);
      if (adhesion) {
        this.position = [...adhesion.position];
        lastPlanes = adhesion.planes;
        lastExtras = adhesion.extras;
        this.lastGroundStickDistance = adhesion.distance;
        support = this._findSupport(lastPlanes, lastExtras, preClipVelocity);
      }
    }

    this.lastPlaneCount = lastPlanes.length;
    this._exchangeDynamicContactImpulses(lastPlanes, lastExtras);
    this.velocity = this.b3.b3ClipVector(this.velocity, lastPlanes);
    this.currentSupport = support ?? this._findSupport(lastPlanes, lastExtras, preClipVelocity);
    if (this.currentSupport && this.velocity[1] < 0) this.velocity[1] = 0;

    if (!wasSupported && this.currentSupport && preClipVelocity[1] < -0.5) {
      this.justLanded = true;
      this.landingSpeed = -preClipVelocity[1];
    }
    if (this.currentSupport) this.coyoteRemaining = this.coyoteTime;
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
      const reaction = scale3(impulse, -invMassA);
      this.velocity[0] += reaction[0];
      this.velocity[1] += reaction[1];
      this.velocity[2] += reaction[2];
      this.externalVelocity[0] += reaction[0];
      this.externalVelocity[2] += reaction[2];
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
    if (bestIndex < 0 || preClipVelocity[1] > 0.18) return null;
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
    return {
      body,
      type,
      point: [...extra.point],
      localPoint,
      normal: [...planes[bestIndex].plane.normal],
    };
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
    return {
      speed: lengthXZ(this.velocity),
      externalSpeed: lengthXZ(this.externalVelocity),
      verticalSpeed: this.velocity[1],
      desiredSpeed: this.desiredSpeed,
      grounded: Boolean(this.currentSupport),
      supportType: this.currentSupport?.type ?? 'NONE',
      supportTransport: this.supportTransportDistance,
      groundStickDistance: this.lastGroundStickDistance,
      dynamicContacts: this.lastDynamicContacts,
      contactImpulse: this.lastContactImpulse,
      planeCount: this.lastPlaneCount,
      virtualMass: this.virtualMass,
      justLanded: this.justLanded,
      landingSpeed: this.landingSpeed,
      coyoteRemaining: this.coyoteRemaining,
      jumpBufferRemaining: this.jumpBufferRemaining,
    };
  }
}
