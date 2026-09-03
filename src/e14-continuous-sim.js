import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism3D } from './e3-balance-organism-3d.js';
import {
  E14_AUTHORITY_POLICIES,
  authorityGrantForShortfall,
  entitlementFromLoad,
  physicsFirstShortfall,
  targetRelativeVelocity,
} from './e14-authority-kernel.js';

const IDENTITY = [0, 0, 0, 1];

export const E14_DEFAULTS = Object.freeze({
  dt: 1 / 60,
  substeps: 4,
  gravity: 20,
  playerMass: 80,
  supportMass: 800,
  friction: 0.95,
  referenceFriction: 0.95,
  acceleration: 31,
  braking: 36,
  maxSpeed: 5.2,
  maxBalanceTorque: 320,
  leadFrames: 8,
  settleFrames: 90,
  supportHalf: [2.2, 0.25, 2.2],
});

function bodyVelocity(b3, body) {
  const v = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(v, body);
  return v;
}

function bodyPosition(b3, body) {
  const p = [0, 0, 0];
  b3.b3Body_GetPosition(p, body);
  return p;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export async function createE14ContinuousSim(userConfig = {}) {
  const config = { ...E14_DEFAULTS, ...userConfig };
  const b3 = await Box3D();
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -config.gravity, 0];
  const world = b3.b3CreateWorld(worldDef);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.type = b3.b3BodyType.b3_staticBody;
  groundDef.position = [0, -2.25, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0;
  groundShape.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, groundShape, 20, 0.25, 20);

  const supportDef = b3.b3DefaultBodyDef();
  supportDef.type = b3.b3BodyType.b3_dynamicBody;
  supportDef.position = [0, -0.25, 0];
  supportDef.enableSleep = false;
  supportDef.linearDamping = 0;
  supportDef.angularDamping = 0;
  supportDef.motionLocks = {
    linearX: false,
    linearY: true,
    linearZ: true,
    angularX: true,
    angularY: true,
    angularZ: true,
  };
  const support = b3.b3CreateBody(world, supportDef);
  const supportShape = b3.b3DefaultShapeDef();
  supportShape.baseMaterial.friction = config.friction;
  supportShape.baseMaterial.restitution = 0;
  supportShape.density = 1;
  b3.b3CreateBoxShape(support, supportShape, ...config.supportHalf);
  b3.b3Body_SetMassData(support, {
    mass: config.supportMass,
    center: [0, 0, 0],
    rotationalInertia: [1, 1, 1],
  });

  const organism = new SagittalBalanceOrganism3D(b3, world, {
    mode: 'finite',
    maxTorque: config.maxBalanceTorque,
    footFriction: config.friction,
  });

  const contactsBuffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  let policy = userConfig.policy ?? E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL;
  let input = 0;
  let targetRelV = 0;
  let paused = false;
  let frame = 0;
  let lastSupport = { reactive: false, frameNormalImpulse: 0 };
  let last = null;

  function readSupport() {
    b3.getBodyContactData(contactsBuffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    let totalNormalImpulse = 0;

    for (let i = 0; i < b3.getNumContacts(contactsBuffer); i++) {
      b3.getContactAt(contact, contactsBuffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          totalNormalImpulse += totalJn;
          if (finalJn > 1e-6 || totalJn > 1e-6) loaded += 1;
        }
      }
    }

    return {
      reactive: touching > 0 || loaded > 0,
      touching,
      loaded,
      frameNormalImpulse: 0.5 * totalNormalImpulse,
    };
  }

  function wholeBodyVelocityX() {
    const fv = bodyVelocity(b3, organism.foot);
    const tv = bodyVelocity(b3, organism.torso);
    const mass = organism.footMass + organism.torsoMass;
    return (organism.footMass * fv[0] + organism.torsoMass * tv[0]) / mass;
  }

  function applyPlayerImpulseX(impulse) {
    if (Math.abs(impulse) <= 1e-12) return;
    const total = organism.footMass + organism.torsoMass;
    b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [impulse * organism.footMass / total, 0, 0], true);
    b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [impulse * organism.torsoMass / total, 0, 0], true);
  }

  function applySupportImpulseX(impulse) {
    if (Math.abs(impulse) <= 1e-12) return;
    b3.b3Body_ApplyLinearImpulseToCenter(support, [impulse, 0, 0], true);
  }

  function posturePreStep(desiredAccel) {
    organism._sync();
    const targetTilt = Math.atan2(desiredAccel, config.gravity);
    const error = organism.torsoTilt - targetTilt;
    const omega = organism.torsoAngularVelocity[0];
    const requested = -organism.kp * error - organism.kd * omega;
    const maxTorque = lastSupport.reactive ? config.maxBalanceTorque : 0;
    const torque = clamp(requested, -maxTorque, maxTorque);
    organism.lastBalanceTorque = torque;
    if (Math.abs(torque) > 1e-9) {
      const angularImpulse = torque * config.dt;
      b3.b3Body_ApplyAngularImpulse(organism.torso, [angularImpulse, 0, 0], true);
      b3.b3Body_ApplyAngularImpulse(organism.foot, [-angularImpulse, 0, 0], true);
    }
  }

  function step(force = false) {
    if (paused && !force) return last;

    const beforeTarget = targetRelV;
    targetRelV = targetRelativeVelocity({
      currentTarget: targetRelV,
      input,
      maxSpeed: config.maxSpeed,
      acceleration: config.acceleration,
      braking: config.braking,
      dt: config.dt,
    });
    const desiredAccel = (targetRelV - beforeTarget) / config.dt;

    const playerBefore = wholeBodyVelocityX();
    const supportBefore = bodyVelocity(b3, support)[0];
    posturePreStep(desiredAccel);

    b3.b3World_Step(world, config.dt, config.substeps);
    organism.postStep();

    const playerAfterPhysics = wholeBodyVelocityX();
    const supportAfterPhysics = bodyVelocity(b3, support)[0];
    const relativeAfterPhysics = playerAfterPhysics - supportAfterPhysics;
    const physicalRelativeDeltaV = relativeAfterPhysics - (playerBefore - supportBefore);
    const supportNow = readSupport();
    const q = supportNow.reactive && lastSupport.reactive
      ? entitlementFromLoad({
          friction: config.friction,
          frameNormalImpulse: supportNow.frameNormalImpulse,
          referenceFriction: config.referenceFriction,
          playerMass: config.playerMass,
          gravity: config.gravity,
          dt: config.dt,
        })
      : 0;

    const requestedShortfall = physicsFirstShortfall({
      targetRelativeVelocity: targetRelV,
      relativeVelocityAfterPhysics: relativeAfterPhysics,
      maxRelativeDeltaV: Math.max(config.acceleration, config.braking) * config.dt,
    });

    const grant = authorityGrantForShortfall({
      policy,
      playerMass: config.playerMass,
      supportMass: config.supportMass,
      requestedRelativeDeltaV: requestedShortfall,
      entitlement: q,
    });

    applyPlayerImpulseX(grant.playerImpulse);
    applySupportImpulseX(grant.supportImpulse);

    organism._sync();
    const playerFinal = wholeBodyVelocityX();
    const supportFinal = bodyVelocity(b3, support)[0];
    const playerPos = organism.getCenterOfMass();
    const supportPos = bodyPosition(b3, support);
    const combinedMomentum = config.playerMass * playerFinal + config.supportMass * supportFinal;

    lastSupport = supportNow;
    frame += 1;
    last = {
      frame,
      input,
      policy,
      targetRelativeVelocity: targetRelV,
      playerVelocity: playerFinal,
      supportVelocity: supportFinal,
      relativeVelocity: playerFinal - supportFinal,
      physicalRelativeDeltaV,
      requestedShortfall,
      entitlement: q,
      frameNormalImpulse: supportNow.frameNormalImpulse,
      reactiveSupport: supportNow.reactive,
      playerImpulse: grant.playerImpulse,
      supportImpulse: grant.supportImpulse,
      grantedRelativeDeltaV: grant.grantedRelativeDeltaV,
      totalAuthorityMomentum: grant.totalAuthorityMomentum,
      combinedMomentum,
      playerX: playerPos[0],
      supportX: supportPos[0],
      torsoTilt: organism.torsoTilt,
      torsoAngularVelocity: organism.torsoAngularVelocity[0],
      balanceTorque: organism.lastBalanceTorque,
      fallen: organism.isFallen(),
      recovered: organism.isRecovered(),
    };
    return last;
  }

  for (let i = 0; i < config.settleFrames; i++) {
    lastSupport = readSupport();
    step(true);
  }

  function setInput(next) {
    input = clamp(Number(next) || 0, -1, 1);
  }

  function setPolicy(next) {
    if (!Object.values(E14_AUTHORITY_POLICIES).includes(next)) {
      throw new Error(`Unknown E14 policy: ${next}`);
    }
    policy = next;
  }

  function setPaused(next) {
    paused = Boolean(next);
  }

  function shovePlayer(impulse = 50) {
    applyPlayerImpulseX(impulse);
  }

  function shoveSupport(impulse = 200) {
    applySupportImpulseX(impulse);
  }

  function snapshot() {
    return last;
  }

  function destroy() {
    b3.destroyContactsBuffer(contactsBuffer);
    organism.destroy();
    b3.b3DestroyWorld(world);
  }

  return {
    b3,
    world,
    ground,
    support,
    organism,
    config,
    step,
    snapshot,
    setInput,
    setPolicy,
    setPaused,
    shovePlayer,
    shoveSupport,
    destroy,
  };
}
