function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

function sameId(a, b) {
  return Boolean(
    a &&
      b &&
      a.index1 === b.index1 &&
      a.world0 === b.world0 &&
      a.generation === b.generation,
  );
}

function clampVector2(x, z, maxLength) {
  const length = Math.hypot(x, z);
  if (length <= maxLength || length < 1e-9) return [x, z];
  const scale = maxLength / length;
  return [x * scale, z * scale];
}

/**
 * E2 disposable contrast specimen.
 *
 * Position and linear velocity belong to a real finite-mass Box3D body. Player intent
 * is expressed only through bounded centre-of-mass impulses. Rotation is deliberately
 * locked so E2 changes translational state ownership without also testing balance,
 * falling or orientation recovery.
 *
 * No-input is intentionally not an active velocity command. Horizontal stopping and
 * moving-support transport are left to ordinary rigid-body contact/friction. This keeps
 * the first E2 control law from silently cancelling the physical consequence we want to
 * observe or reconstructing the H-A support-transport bridge above the solver.
 */
export class SolverOwnedCharacter {
  constructor(b3, world, options = {}) {
    this.b3 = b3;
    this.world = world;
    this.radius = options.radius ?? 0.36;
    this.halfSegment = options.halfSegment ?? 0.54;
    this.targetMass = options.mass ?? 80;
    this.maxSpeed = options.maxSpeed ?? 5.2;
    this.sprintMultiplier = options.sprintMultiplier ?? 1.32;
    this.groundAcceleration = options.groundAcceleration ?? 26;
    this.groundDeceleration = options.groundDeceleration ?? 0;
    this.airAcceleration = options.airAcceleration ?? 7.5;
    this.airDeceleration = options.airDeceleration ?? 0;
    this.gravity = options.gravity ?? 20;
    this.fallGravityMultiplier = options.fallGravityMultiplier ?? 1.22;
    this.jumpReleaseGravityMultiplier = options.jumpReleaseGravityMultiplier ?? 1.75;
    this.jumpSpeed = options.jumpSpeed ?? 7.2;
    this.coyoteTime = options.coyoteTime ?? 0.11;
    this.jumpBufferTime = options.jumpBufferTime ?? 0.12;
    this.supportNormalMinY = options.supportNormalMinY ?? 0.58;
    this.startPosition = [...(options.startPosition ?? [0, 1.0, 7])];

    this.position = [...this.startPosition];
    this.velocity = [0, 0, 0];
    this.externalVelocity = [0, 0, 0];
    this.desiredSpeed = 0;
    this.desiredDirection = [0, 0, -1];
    this.currentSupport = null;
    this.supportTransportDistance = 0;
    this.lastContactImpulse = 0;
    this.lastControlImpulse = 0;
    this.lastDynamicContacts = 0;
    this.justLanded = false;
    this.landingSpeed = 0;
    this.coyoteRemaining = 0;
    this.jumpBufferRemaining = 0;
    this.modeLabel = 'E2 solver-owned root';

    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [...this.startPosition];
    bodyDef.linearDamping = 0;
    bodyDef.angularDamping = 0;
    bodyDef.enableSleep = false;
    bodyDef.enableContactRecycling = false;
    bodyDef.motionLocks.angularX = true;
    bodyDef.motionLocks.angularY = true;
    bodyDef.motionLocks.angularZ = true;
    this.body = b3.b3CreateBody(world, bodyDef);

    this.capsule = {
      center1: [0, -this.halfSegment, 0],
      center2: [0, this.halfSegment, 0],
      radius: this.radius,
    };
    const unitMass = b3.b3ComputeCapsuleMass(this.capsule, 1).mass;
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.density = this.targetMass / unitMass;
    shapeDef.baseMaterial.friction = options.friction ?? 0.82;
    shapeDef.baseMaterial.restitution = 0;
    this.shape = b3.b3CreateCapsuleShape(this.body, shapeDef, this.capsule);
    this.mass = b3.b3Body_GetMass(this.body);

    this._contacts = b3.createContactsBuffer();
    this._contact = b3.createContact();
    this._manifold = b3.createManifold();
    this._preSolveVelocity = [0, 0, 0];
    this._desiredWorldVelocity = [0, 0, 0];
    this._wasSupportedBeforeStep = false;

    this._syncFromBody();
  }

  get halfHeight() {
    return this.radius + this.halfSegment;
  }

  reset(position = this.startPosition) {
    this.b3.b3Body_SetTransform(this.body, position, [0, 0, 0, 1]);
    this.b3.b3Body_SetLinearVelocity(this.body, [0, 0, 0]);
    this.b3.b3Body_SetAngularVelocity(this.body, [0, 0, 0]);
    this.position = [...position];
    this.velocity = [0, 0, 0];
    this.externalVelocity = [0, 0, 0];
    this.desiredSpeed = 0;
    this.desiredDirection = [0, 0, -1];
    this.currentSupport = null;
    this.supportTransportDistance = 0;
    this.lastContactImpulse = 0;
    this.lastControlImpulse = 0;
    this.lastDynamicContacts = 0;
    this.justLanded = false;
    this.landingSpeed = 0;
    this.coyoteRemaining = 0;
    this.jumpBufferRemaining = 0;
    this._desiredWorldVelocity = [0, 0, 0];
  }

  preStep(dt, intent) {
    this.justLanded = false;
    this.landingSpeed = 0;
    this.supportTransportDistance = 0;
    this.lastControlImpulse = 0;
    this._syncFromBody();

    const grounded = Boolean(this.currentSupport);
    this._wasSupportedBeforeStep = grounded;
    if (grounded) this.coyoteRemaining = this.coyoteTime;
    else this.coyoteRemaining = Math.max(0, this.coyoteRemaining - dt);

    if (intent.jump) this.jumpBufferRemaining = this.jumpBufferTime;
    else this.jumpBufferRemaining = Math.max(0, this.jumpBufferRemaining - dt);

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
    this._desiredWorldVelocity = [...desiredVelocity];
    this.desiredSpeed = Math.hypot(desiredVelocity[0], desiredVelocity[2]);
    if (this.desiredSpeed > 1e-6) {
      this.desiredDirection = [
        desiredVelocity[0] / this.desiredSpeed,
        0,
        desiredVelocity[2] / this.desiredSpeed,
      ];
    }

    const acceleration = grounded
      ? (this.desiredSpeed > 0.01 ? this.groundAcceleration : this.groundDeceleration)
      : (this.desiredSpeed > 0.01 ? this.airAcceleration : this.airDeceleration);
    if (acceleration > 0) {
      const [deltaVx, deltaVz] = clampVector2(
        desiredVelocity[0] - this.velocity[0],
        desiredVelocity[2] - this.velocity[2],
        acceleration * dt,
      );
      if (Math.abs(deltaVx) > 1e-8 || Math.abs(deltaVz) > 1e-8) {
        const impulse = [this.mass * deltaVx, 0, this.mass * deltaVz];
        this.b3.b3Body_ApplyLinearImpulseToCenter(this.body, impulse, true);
        this.lastControlImpulse += Math.hypot(impulse[0], impulse[2]);
        this.velocity[0] += deltaVx;
        this.velocity[2] += deltaVz;
      }
    }

    const canJump = grounded || this.coyoteRemaining > 0;
    if (this.jumpBufferRemaining > 0 && canJump) {
      const targetVy = Math.max(0, this.velocity[1]) + this.jumpSpeed;
      const deltaVy = targetVy - this.velocity[1];
      this.b3.b3Body_ApplyLinearImpulseToCenter(this.body, [0, this.mass * deltaVy, 0], true);
      this.lastControlImpulse += Math.abs(this.mass * deltaVy);
      this.velocity[1] = targetVy;
      this.currentSupport = null;
      this.jumpBufferRemaining = 0;
      this.coyoteRemaining = 0;
    }

    let gravityMultiplier = 1;
    if (this.velocity[1] < -0.05) gravityMultiplier = this.fallGravityMultiplier;
    else if (this.velocity[1] > 0.05 && !intent.jumpHeld) gravityMultiplier = this.jumpReleaseGravityMultiplier;
    if (gravityMultiplier > 1) {
      const extraGravityImpulse = -this.mass * this.gravity * (gravityMultiplier - 1) * dt;
      this.b3.b3Body_ApplyLinearImpulseToCenter(this.body, [0, extraGravityImpulse, 0], true);
      this.lastControlImpulse += Math.abs(extraGravityImpulse);
      this.velocity[1] += extraGravityImpulse / this.mass;
    }

    this.b3.b3Body_GetLinearVelocity(this._preSolveVelocity, this.body);
  }

  postStep() {
    const preSolveY = this._preSolveVelocity[1];
    const beforeX = this._preSolveVelocity[0];
    const beforeZ = this._preSolveVelocity[2];
    this._syncFromBody();

    // Rough solver-response telemetry only; this is not used as a cross-architecture
    // impulse equivalence metric because contact friction and constraints are coupled.
    this.lastContactImpulse =
      this.mass * Math.hypot(this.velocity[0] - beforeX, this.velocity[2] - beforeZ);

    this._refreshContacts();
    if (!this._wasSupportedBeforeStep && this.currentSupport && preSolveY < -0.5) {
      this.justLanded = true;
      this.landingSpeed = -preSolveY;
    }
    if (this.currentSupport) this.coyoteRemaining = this.coyoteTime;

    this.externalVelocity[0] = this.velocity[0] - this._desiredWorldVelocity[0];
    this.externalVelocity[1] = 0;
    this.externalVelocity[2] = this.velocity[2] - this._desiredWorldVelocity[2];
  }

  telemetry() {
    return {
      mode: 'solver',
      mass: this.mass,
      speed: Math.hypot(this.velocity[0], this.velocity[2]),
      externalSpeed: Math.hypot(this.externalVelocity[0], this.externalVelocity[2]),
      verticalSpeed: this.velocity[1],
      grounded: Boolean(this.currentSupport),
      supportType: this.currentSupport?.type ?? 'AIR',
      dynamicContacts: this.lastDynamicContacts,
      contactImpulse: this.lastContactImpulse,
      controlImpulse: this.lastControlImpulse,
      supportTransport: 0,
    };
  }

  _syncFromBody() {
    this.b3.b3Body_GetPosition(this.position, this.body);
    this.b3.b3Body_GetLinearVelocity(this.velocity, this.body);
  }

  _refreshContacts() {
    this.b3.getBodyContactData(this._contacts, this.body);
    const count = this.b3.getNumContacts(this._contacts);
    let bestSupport = null;
    let bestUp = this.supportNormalMinY;
    let dynamicContacts = 0;

    for (let i = 0; i < count; i++) {
      this.b3.getContactAt(this._contact, this._contacts, i);
      const playerIsA = sameId(this._contact.shapeIdA, this.shape);
      const playerIsB = sameId(this._contact.shapeIdB, this.shape);
      if (!playerIsA && !playerIsB) continue;

      const otherShape = playerIsA ? this._contact.shapeIdB : this._contact.shapeIdA;
      const otherBody = this.b3.b3Shape_GetBody(otherShape);
      const typeValue = bodyTypeValue(this.b3.b3Body_GetType(otherBody));
      let type = 'STATIC';
      if (typeValue === bodyTypeValue(this.b3.b3BodyType.b3_dynamicBody)) {
        type = 'DYNAMIC';
        dynamicContacts += 1;
      } else if (typeValue === bodyTypeValue(this.b3.b3BodyType.b3_kinematicBody)) {
        type = 'KINEMATIC';
      }

      for (let m = 0; m < this._contact.manifoldCount; m++) {
        this.b3.getManifoldAt(this._manifold, this._contact, m);
        if (this._manifold.pointCount <= 0) continue;
        const sign = playerIsA ? -1 : 1;
        const normal = [
          this._manifold.normal[0] * sign,
          this._manifold.normal[1] * sign,
          this._manifold.normal[2] * sign,
        ];
        if (normal[1] > bestUp && this.velocity[1] <= 0.35) {
          bestUp = normal[1];
          bestSupport = { body: otherBody, type, normal };
        }
      }
    }

    this.currentSupport = bestSupport;
    this.lastDynamicContacts = dynamicContacts;
  }
}