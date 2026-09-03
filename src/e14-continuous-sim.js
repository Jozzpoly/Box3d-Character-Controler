import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from './e3-balance-organism-3d.js';
import {
  E14_AUTHORITY_POLICIES,
  authorityGrantForShortfall,
  entitlementFromLoad,
  physicsFirstShortfall,
  relativeDeltaVFromGrant,
  targetRelativeVelocity,
} from './e14-authority-kernel.js';

const LOAD_EPS = 1e-6;
const RELATIVE_DV_EPS = 1e-4;

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
  preparationFrames: 0,
  settleFrames: 90,
  supportHalf: Object.freeze([2.2, 0.16, 2.2]),
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function vec3(getter, body) {
  const out = [0, 0, 0];
  getter(out, body);
  return out;
}

function upFromQuat(q) {
  const [x, y, z, w] = q;
  return [
    2 * (x * y - w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z + w * x),
  ];
}

function signedLeanX(rotation) {
  const up = upFromQuat(rotation);
  return Math.atan2(up[0], up[1]);
}

export async function createE14ContinuousSim(userConfig = {}) {
  const config = { ...E14_DEFAULTS, ...userConfig };
  if (!(config.supportMass > 0)) throw new Error('E14 supportMass must be positive');
  if (!(config.playerMass > 0)) throw new Error('E14 playerMass must be positive');
  if (!(config.dt > 0) || !(config.substeps >= 1)) throw new Error('E14 solver configuration invalid');
  if (!Number.isInteger(config.preparationFrames) || config.preparationFrames < 0) {
    throw new Error('E14 preparationFrames must be a non-negative integer');
  }

  const b3 = await Box3D();
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -config.gravity, 0];
  const world = b3.b3CreateWorld(worldDef);

  // Preserve the qualified E12.2b / E14.0 support family: physically free only
  // along browser X, with no hidden wider-world horizontal reaction path.
  const supportDef = b3.b3DefaultBodyDef();
  supportDef.type = b3.b3BodyType.b3_dynamicBody;
  supportDef.position = [0, -config.supportHalf[1], 0];
  supportDef.linearDamping = 0;
  supportDef.angularDamping = 0;
  supportDef.enableSleep = false;
  supportDef.enableContactRecycling = false;
  supportDef.motionLocks.linearY = true;
  supportDef.motionLocks.linearZ = true;
  supportDef.motionLocks.angularX = true;
  supportDef.motionLocks.angularY = true;
  supportDef.motionLocks.angularZ = true;
  const support = b3.b3CreateBody(world, supportDef);

  const supportShapeDef = b3.b3DefaultShapeDef();
  supportShapeDef.density = densityForBoxMass(config.supportMass, config.supportHalf);
  supportShapeDef.baseMaterial.friction = config.friction;
  supportShapeDef.baseMaterial.restitution = 0;
  const supportShape = b3.b3CreateBoxShape(support, supportShapeDef, ...config.supportHalf);
  const actualSupportMass = b3.b3Body_GetMass(support);
  if (Math.abs(actualSupportMass - config.supportMass) > 1e-3) {
    throw new Error(`E14 support mass contract drifted: ${actualSupportMass}`);
  }

  const organism = new BalanceOrganism3D(b3, world, {
    mode: 'finite',
    maxTorque: config.maxBalanceTorque,
    footFriction: config.friction,
  });
  const actualPlayerMass = organism.footMass + organism.torsoMass;
  if (Math.abs(actualPlayerMass - config.playerMass) > 1e-3) {
    throw new Error(`E14 player mass contract drifted: ${actualPlayerMass}`);
  }

  const contactsBuffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  let policy = userConfig.policy ?? E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL;
  let input = 0;
  let targetRelV = 0;
  let paused = false;
  let frame = 0;
  let preparationRemaining = 0;
  let preparationAcceleration = 0;
  let lastSupport = { reactive: false, frameNormalImpulse: 0 };
  let last = null;

  function readSupport() {
    b3.getBodyContactData(contactsBuffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    let totalNormalImpulse = 0;
    let matchedPlatform = false;

    for (let i = 0; i < b3.getNumContacts(contactsBuffer); i++) {
      b3.getContactAt(contact, contactsBuffer, i);
      const footIsA = sameId(contact.shapeIdA, organism.footShape);
      const footIsB = sameId(contact.shapeIdB, organism.footShape);
      if (!footIsA && !footIsB) continue;
      const otherShape = footIsA ? contact.shapeIdB : contact.shapeIdA;
      if (!sameId(otherShape, supportShape)) continue;
      matchedPlatform = true;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          totalNormalImpulse += totalJn;
          if (finalJn > LOAD_EPS || totalJn > LOAD_EPS) loaded += 1;
        }
      }
    }

    return {
      reactive: matchedPlatform && (touching > 0 || loaded > 0),
      touching,
      loaded,
      frameNormalImpulse: 0.5 * totalNormalImpulse,
    };
  }

  function playerState() {
    organism._sync();
    const footV = vec3(b3.b3Body_GetLinearVelocity, organism.foot);
    const torsoV = vec3(b3.b3Body_GetLinearVelocity, organism.torso);
    return {
      x: (organism.footMass * organism.footCom[0] + organism.torsoMass * organism.torsoCom[0]) / actualPlayerMass,
      vx: (organism.footMass * footV[0] + organism.torsoMass * torsoV[0]) / actualPlayerMass,
    };
  }

  function applyPlayerImpulseX(impulse) {
    if (Math.abs(impulse) <= 1e-12) return;
    b3.b3Body_ApplyLinearImpulseToCenter(
      organism.foot,
      [impulse * organism.footMass / actualPlayerMass, 0, 0],
      true,
    );
    b3.b3Body_ApplyLinearImpulseToCenter(
      organism.torso,
      [impulse * organism.torsoMass / actualPlayerMass, 0, 0],
      true,
    );
  }

  function applySupportImpulseX(impulse) {
    if (Math.abs(impulse) <= 1e-12) return;
    b3.b3Body_ApplyLinearImpulseToCenter(support, [impulse, 0, 0], true);
  }

  // BalanceOrganism3D's normal preStep targets upright posture. For the E14
  // longitudinal lab we use the same finite internal ankle authority but target
  // a signed X lean derived from effective-up acceleration. Positive lean means
  // the torso top leans toward +X; its physical actuator is torque about Z.
  function posturePreStep(desiredAccel) {
    organism._sync();
    const targetLean = Math.atan2(desiredAccel, config.gravity);
    const currentLean = signedLeanX(organism.torsoRotation);
    const omegaZ = organism.torsoAngularVelocity[2];
    const requestedZ = organism.kp * (currentLean - targetLean) - organism.kd * omegaZ;
    const maxTorque = lastSupport.reactive ? config.maxBalanceTorque : 0;
    const torqueZ = clamp(requestedZ, -maxTorque, maxTorque);
    organism.lastBalanceTorque = [0, 0, torqueZ];
    if (Math.abs(torqueZ) > 1e-9) {
      const angularImpulse = torqueZ * config.dt;
      b3.b3Body_ApplyAngularImpulse(organism.torso, [0, 0, angularImpulse], true);
      b3.b3Body_ApplyAngularImpulse(organism.foot, [0, 0, -angularImpulse], true);
    }
    return { targetLean, currentLean, torqueZ };
  }

  function nextCommandTarget(nextInput = input) {
    return targetRelativeVelocity({
      currentTarget: targetRelV,
      input: nextInput,
      maxSpeed: config.maxSpeed,
      acceleration: config.acceleration,
      braking: config.braking,
      dt: config.dt,
    });
  }

  function beginPreparationFor(nextInput) {
    if (config.preparationFrames <= 0) {
      preparationRemaining = 0;
      preparationAcceleration = 0;
      return;
    }
    const previewTarget = nextCommandTarget(nextInput);
    const previewAcceleration = (previewTarget - targetRelV) / config.dt;
    if (Math.abs(previewAcceleration) <= 1e-12) {
      preparationRemaining = 0;
      preparationAcceleration = 0;
      return;
    }
    preparationRemaining = config.preparationFrames;
    preparationAcceleration = previewAcceleration;
  }

  function step(force = false) {
    if (paused && !force) return last;

    const preparing = preparationRemaining > 0;
    const beforeTarget = targetRelV;
    let desiredAccel = 0;
    if (preparing) {
      // E4-style temporal oracle: posture may physically prepare, but no
      // translational authority or command-target advance is allowed during lead.
      desiredAccel = preparationAcceleration;
    } else {
      targetRelV = nextCommandTarget(input);
      desiredAccel = (targetRelV - beforeTarget) / config.dt;
    }

    const playerBefore = playerState();
    const supportVBefore = vec3(b3.b3Body_GetLinearVelocity, support)[0];
    const posture = posturePreStep(desiredAccel);

    // Physics earns first claim on the requested motion.
    b3.b3World_Step(world, config.dt, config.substeps);
    organism.postStep();

    const playerAfterPhysics = playerState();
    const supportVAfterPhysics = vec3(b3.b3Body_GetLinearVelocity, support)[0];
    const relativeBefore = playerBefore.vx - supportVBefore;
    const relativeAfterPhysics = playerAfterPhysics.vx - supportVAfterPhysics;
    const physicalRelativeDeltaV = relativeAfterPhysics - relativeBefore;
    const supportNow = readSupport();
    const q = supportNow.reactive && lastSupport.reactive
      ? entitlementFromLoad({
          friction: config.friction,
          frameNormalImpulse: supportNow.frameNormalImpulse,
          referenceFriction: config.referenceFriction,
          playerMass: actualPlayerMass,
          gravity: config.gravity,
          dt: config.dt,
        })
      : 0;

    const requestedShortfall = preparing ? 0 : physicsFirstShortfall({
      targetRelativeVelocity: targetRelV,
      relativeVelocityAfterPhysics: relativeAfterPhysics,
      maxRelativeDeltaV: Math.max(config.acceleration, config.braking) * config.dt,
    });

    const grant = authorityGrantForShortfall({
      policy,
      playerMass: actualPlayerMass,
      supportMass: actualSupportMass,
      requestedRelativeDeltaV: requestedShortfall,
      entitlement: q,
    });

    const reconstructedGrant = relativeDeltaVFromGrant({
      playerImpulse: grant.playerImpulse,
      supportImpulse: grant.supportImpulse,
      playerMass: actualPlayerMass,
      supportMass: actualSupportMass,
    });
    if (Math.abs(reconstructedGrant - grant.grantedRelativeDeltaV) > 1e-10) {
      throw new Error(`E14 authority accounting mismatch expected=${grant.grantedRelativeDeltaV} reconstructed=${reconstructedGrant}`);
    }

    applyPlayerImpulseX(grant.playerImpulse);
    applySupportImpulseX(grant.supportImpulse);

    const playerFinal = playerState();
    const supportVFinal = vec3(b3.b3Body_GetLinearVelocity, support)[0];
    const immediateMeasuredGrant = (playerFinal.vx - supportVFinal) - relativeAfterPhysics;
    if (Math.abs(immediateMeasuredGrant - grant.grantedRelativeDeltaV) > RELATIVE_DV_EPS) {
      throw new Error(`E14 immediate relative Δv mismatch expected=${grant.grantedRelativeDeltaV} measured=${immediateMeasuredGrant}`);
    }

    if (preparing) {
      preparationRemaining -= 1;
      if (preparationRemaining === 0) preparationAcceleration = 0;
    }

    const supportPosition = vec3(b3.b3Body_GetPosition, support);
    const combinedMomentum = actualPlayerMass * playerFinal.vx + actualSupportMass * supportVFinal;

    lastSupport = supportNow;
    frame += 1;
    last = {
      frame,
      input,
      policy,
      targetRelativeVelocity: targetRelV,
      desiredAcceleration: desiredAccel,
      preparing,
      preparationFramesConfigured: config.preparationFrames,
      preparationFramesRemaining: preparationRemaining,
      playerVelocity: playerFinal.vx,
      supportVelocity: supportVFinal,
      relativeVelocity: playerFinal.vx - supportVFinal,
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
      playerX: playerFinal.x,
      supportX: supportPosition[0],
      targetLean: posture.targetLean,
      signedLeanX: posture.currentLean,
      torsoTilt: organism.torsoTilt,
      torsoAngularVelocity: organism.torsoAngularVelocity[2],
      balanceTorque: posture.torqueZ,
      fallen: organism.fallObserved,
      recovered: organism.isRecovered(),
    };
    return last;
  }

  for (let i = 0; i < config.settleFrames; i++) {
    lastSupport = readSupport();
    step(true);
  }
  if (!lastSupport.reactive) throw new Error('E14 continuous sim failed to establish platform support');

  function setInput(next) {
    const normalized = clamp(Number(next) || 0, -1, 1);
    if (normalized === input) return;
    input = normalized;
    beginPreparationFor(input);
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
    b3.b3DestroyWorld(world);
  }

  return {
    b3,
    world,
    support,
    supportShape,
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
