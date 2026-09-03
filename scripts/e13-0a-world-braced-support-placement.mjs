import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const SUPPORT_MASS = 800;
const FINITE_TORQUE = 320;
const SETTLE_FRAMES = 90;
const LOAD_EPS = 1e-6;
const MOMENTUM_EPS = 2e-3;
const RELATIVE_DV_EPS = 1e-4;
const REFERENCE_MU = 0.95;
const STATIC_FRAME_LOAD = PLAYER_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = REFERENCE_MU * STATIC_FRAME_LOAD;
const PLATFORM_HALF = [2, 0.25, 30];
const PLATFORM_Y = -PLATFORM_HALF[1];
const WALL_HALF = [2, 0.5, 0.25];
const WALL_Y = PLATFORM_Y;
const DIRECTIONS = [-1, 1];
const MODES = ['world-external', 'reciprocal'];
const WORLD_CASES = ['free', 'braced'];

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

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makeDynamicPlatform(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  bd.motionLocks.linearX = true;
  bd.motionLocks.linearY = true;
  bd.motionLocks.angularX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(SUPPORT_MASS, PLATFORM_HALF);
  sd.baseMaterial.friction = REFERENCE_MU;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...PLATFORM_HALF);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

function makeRecoilWall(world, direction, settledPlatformZ) {
  const bd = b3.b3DefaultBodyDef();
  // Default Box3D bodies are static. The first draft created this wall before
  // the 90f settle and contaminated one mirror with ~0.8446Ns of pre-authority
  // momentum. The corrected harness first qualifies the exact free settled
  // player+support state, then places the wall exactly tangent to the *actual*
  // settled platform COM. There is still no tuned gap or compliance parameter.
  bd.position = [
    0,
    WALL_Y,
    settledPlatformZ - direction * (PLATFORM_HALF[2] + WALL_HALF[2]),
  ];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...WALL_HALF);
  return { body, shape };
}

function createPairReader(body, shapeA, shapeB, normalAxis) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, body);
    let touching = 0;
    let loaded = 0;
    let finalNormalImpulse = 0;
    let totalNormalImpulse = 0;
    let matched = false;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      const direct = sameId(contact.shapeIdA, shapeA) && sameId(contact.shapeIdB, shapeB);
      const reverse = sameId(contact.shapeIdA, shapeB) && sameId(contact.shapeIdB, shapeA);
      if (!direct && !reverse) continue;
      matched = true;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[normalAxis]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          finalNormalImpulse += finalJn;
          totalNormalImpulse += totalJn;
          if (finalJn > LOAD_EPS || totalJn > LOAD_EPS) loaded += 1;
        }
      }
    }

    return {
      matched,
      reactive: matched && (touching > 0 || loaded > 0),
      touching,
      loaded,
      finalNormalImpulse,
      totalNormalImpulse,
    };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function createSupportReader(organism, platform) {
  const pair = createPairReader(organism.foot, organism.footShape, platform.shape, 1);
  return {
    read() {
      const r = pair.read();
      return {
        ...r,
        // Preserve the pinned E5.0a native-equivalent load estimate.
        frameNormalImpulse: 0.5 * r.totalNormalImpulse,
      };
    },
    destroy: pair.destroy,
  };
}

function bodyVelocityZ(body) {
  const v = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(v, body);
  return v[2];
}

function bodyComZ(body) {
  const p = [0, 0, 0];
  b3.b3Body_GetWorldCenterOfMass(p, body);
  return p[2];
}

function playerState(organism) {
  organism._sync();
  const footV = bodyVelocityZ(organism.foot);
  const torsoV = bodyVelocityZ(organism.torso);
  const mass = organism.footMass + organism.torsoMass;
  return {
    mass,
    vz: (organism.footMass * footV + organism.torsoMass * torsoV) / mass,
    z: (organism.footMass * organism.footCom[2] + organism.torsoMass * organism.torsoCom[2]) / mass,
    torsoTilt: organism.torsoTilt,
    footTilt: organism.footTilt,
    fall: organism.fallObserved,
  };
}

function applyPlayerImpulse(organism, signedImpulse) {
  const footImpulse = signedImpulse * organism.footMass / PLAYER_MASS;
  const torsoImpulse = signedImpulse * organism.torsoMass / PLAYER_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [0, 0, footImpulse], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [0, 0, torsoImpulse], true);
}

function snapshot(organism, platform, supportReader, wallReader, direction) {
  const player = playerState(organism);
  const supportV = bodyVelocityZ(platform.body);
  const supportZ = bodyComZ(platform.body);
  return {
    playerV: direction * player.vz,
    supportV: direction * supportV,
    relativeV: direction * (player.vz - supportV),
    playerZ: direction * player.z,
    supportZ: direction * supportZ,
    relativeZ: direction * (player.z - supportZ),
    combinedMomentum: direction * (PLAYER_MASS * player.vz + SUPPORT_MASS * supportV),
    torsoTiltDeg: direction * player.torsoTilt * 180 / Math.PI,
    footTiltDeg: direction * player.footTilt * 180 / Math.PI,
    fall: player.fall,
    support: supportReader.read(),
    wall: wallReader ? wallReader.read() : null,
  };
}

function neutralStep(world, organism) {
  organism.preStep(DT);
  b3.b3World_Step(world, DT, SUBSTEPS);
  organism.postStep();
}

function runCase({ direction, mode, worldCase }) {
  const world = makeWorld();
  const platform = makeDynamicPlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: REFERENCE_MU,
  });

  // E12.2b already showed canonical 0.015 linear damping changes matched placement
  // relative velocity by only ~0.006% over one second. E13.0a deliberately uses
  // the qualified zero-damping diagnostic control so any horizontal system-
  // momentum change during the causal post-pulse solve must come from the wall.
  b3.b3Body_SetLinearDamping(organism.foot, 0);
  b3.b3Body_SetLinearDamping(organism.torso, 0);

  const supportReader = createSupportReader(organism, platform);
  let wall = null;
  let wallReader = null;

  // Crucially, every specimen settles *without* the wall. This preserves the
  // exact E12 free player+support representation before the new world reference
  // is introduced.
  for (let i = 0; i < SETTLE_FRAMES; i++) {
    neutralStep(world, organism);
  }

  const settledFree = snapshot(organism, platform, supportReader, null, direction);
  if (!settledFree.support.reactive || settledFree.fall) {
    throw new Error(`E13.0a failed free settle ${worldCase}/${mode}/dir=${direction}`);
  }
  if (Math.abs(playerState(organism).mass - PLAYER_MASS) > 1e-3 || Math.abs(platform.mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E13.0a mass contract changed ${worldCase}/${mode}/dir=${direction}`);
  }

  // The braced specimen receives its wall only after free settle. Its center is
  // derived from the actual settled platform COM and exact box half-extents.
  // Both free and braced cases then receive the same one neutral qualification
  // step, so authority starts at the same history depth.
  if (worldCase === 'braced') {
    wall = makeRecoilWall(world, direction, bodyComZ(platform.body));
    wallReader = createPairReader(platform.body, platform.shape, wall.shape, 2);
  }

  const preQualification = snapshot(organism, platform, supportReader, wallReader, direction);
  neutralStep(world, organism);
  const beforeAuthority = snapshot(organism, platform, supportReader, wallReader, direction);
  const qualificationMomentumDelta = beforeAuthority.combinedMomentum - preQualification.combinedMomentum;
  const qualificationRelativeDelta = beforeAuthority.relativeV - preQualification.relativeV;

  if (!beforeAuthority.support.reactive || beforeAuthority.fall) {
    throw new Error(`E13.0a lost support during inactive qualification ${worldCase}/${mode}/dir=${direction}`);
  }
  if (worldCase === 'braced' && beforeAuthority.wall?.loaded > 0) {
    throw new Error(`E13.0a recoil wall is preloaded before authority dir=${direction}`);
  }

  const q = clamp(
    REFERENCE_MU * beforeAuthority.support.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY,
    0,
    1,
  );
  const relativeDeltaV = q * ACCEL * DT;
  const reducedMass = 1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS);
  let appliedImpulse = 0;

  if (mode === 'world-external') {
    appliedImpulse = PLAYER_MASS * relativeDeltaV;
    applyPlayerImpulse(organism, direction * appliedImpulse);
  } else if (mode === 'reciprocal') {
    appliedImpulse = reducedMass * relativeDeltaV;
    applyPlayerImpulse(organism, direction * appliedImpulse);
    b3.b3Body_ApplyLinearImpulseToCenter(platform.body, [0, 0, -direction * appliedImpulse], true);
  } else {
    throw new Error(`Unknown E13.0a mode ${mode}`);
  }

  const immediate = snapshot(organism, platform, supportReader, wallReader, direction);
  const immediateGrantedDeltaV = immediate.relativeV - beforeAuthority.relativeV;
  const immediateMomentumDelta = immediate.combinedMomentum - beforeAuthority.combinedMomentum;

  // No more locomotion authority. This single solver step is the causal probe:
  // the free system has no external horizontal reaction, while the braced
  // reciprocal support is already tangent to a static world reference on its
  // recoil side.
  neutralStep(world, organism);

  const afterSolve = snapshot(organism, platform, supportReader, wallReader, direction);
  const solverMomentumDelta = afterSolve.combinedMomentum - immediate.combinedMomentum;

  const result = {
    direction,
    mode,
    worldCase,
    q,
    frameNormalImpulse: beforeAuthority.support.frameNormalImpulse,
    relativeDeltaV,
    appliedImpulse,
    settledFree,
    preQualification,
    beforeAuthority,
    qualificationMomentumDelta,
    qualificationRelativeDelta,
    immediate,
    immediateGrantedDeltaV,
    immediateMomentumDelta,
    afterSolve,
    solverMomentumDelta,
  };

  wallReader?.destroy();
  supportReader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  PLAYER_MASS !== 80
) {
  throw new Error('E13.0a expected canonical Donor-v1 current31 substrate');
}

console.log('E13.0a corrected world-braced dynamic-support placement falsifier');
console.log('  first draft 8acf32df / workflow 33763112049 is preserved as a confounded harness failure: creating the wall before settle contaminated dir=- with ~0.8446Ns pre-authority momentum.');
console.log(`  player=${PLAYER_MASS}kg support=${SUPPORT_MASS}kg; current31 relative pulse; dt=${DT.toFixed(6)}s substeps=${SUBSTEPS}`);
console.log('  corrected harness: all specimens free-settle first; only then is the recoil wall created exactly tangent to the actual settled platform COM, followed by one neutral inactive-qualification solve.');
console.log('  wall has zero gap, zero restitution and no spring/motor/stiffness parameter; no epsilon offset is used to rescue contact.');
console.log('  q is measured from the normal mu=.95 E5 load scale after inactive qualification; both placements receive the same q-entitled support-relative delta-v.');
console.log('  zero player linear damping is the already-qualified E12.2b causal control, isolating external horizontal momentum exchange to the wall.');
console.log('  after the pulse there is exactly one solver step and zero further translational authority.');

const results = [];
for (const direction of DIRECTIONS) {
  for (const worldCase of WORLD_CASES) {
    for (const mode of MODES) {
      const r = runCase({ direction, mode, worldCase });
      results.push(r);
      console.log(
        `  dir=${direction > 0 ? '+' : '-'} ${worldCase.padEnd(6)} ${mode.padEnd(14)} ` +
        `qual dP=${r.qualificationMomentumDelta.toExponential(2)}Ns dVrel=${r.qualificationRelativeDelta.toExponential(2)} wallPre=${r.beforeAuthority.wall ? `${r.beforeAuthority.wall.loaded}pts` : 'none'} | ` +
        `q=${r.q.toFixed(4)} Jn~=${r.frameNormalImpulse.toFixed(4)}Ns ` +
        `grant dVrel=${r.immediateGrantedDeltaV.toFixed(6)}/${r.relativeDeltaV.toFixed(6)}m/s dPgrant=${r.immediateMomentumDelta.toFixed(4)}Ns ` +
        `P immediate->post=${r.immediate.combinedMomentum.toFixed(4)}->${r.afterSolve.combinedMomentum.toFixed(4)}Ns ` +
        `dPsolve=${r.solverMomentumDelta.toFixed(4)}Ns ` +
        `vP/vS/rel post=${r.afterSolve.playerV.toFixed(5)}/${r.afterSolve.supportV.toFixed(5)}/${r.afterSolve.relativeV.toFixed(5)}m/s ` +
        `wall=${r.afterSolve.wall ? `${r.afterSolve.wall.loaded}pts/${r.afterSolve.wall.totalNormalImpulse.toFixed(4)}raw` : 'none'} ` +
        `tilt=${r.afterSolve.torsoTiltDeg.toFixed(3)}deg`,
      );
    }
  }
}

function find(direction, worldCase, mode) {
  return results.find((r) => r.direction === direction && r.worldCase === worldCase && r.mode === mode);
}

for (const direction of DIRECTIONS) {
  const freeExternal = find(direction, 'free', 'world-external');
  const freeReciprocal = find(direction, 'free', 'reciprocal');
  const bracedExternal = find(direction, 'braced', 'world-external');
  const bracedReciprocal = find(direction, 'braced', 'reciprocal');

  for (const r of [freeExternal, freeReciprocal, bracedExternal, bracedReciprocal]) {
    if (r.q < 0.95) {
      throw new Error(`E13.0a normal support entitlement unexpectedly weak q=${r.q} ${r.worldCase}/${r.mode}/dir=${direction}`);
    }
    if (Math.abs(r.immediateGrantedDeltaV - r.relativeDeltaV) > RELATIVE_DV_EPS) {
      throw new Error(`E13.0a initial relative grant mismatch ${r.worldCase}/${r.mode}/dir=${direction}`);
    }
    if (!r.afterSolve.support.reactive || r.afterSolve.fall) {
      throw new Error(`E13.0a support/posture failed during one-step probe ${r.worldCase}/${r.mode}/dir=${direction}`);
    }
  }

  // Before authority, adding the zero-gap wall must be mechanically inert versus
  // the matched free specimen. This is the representation-match-before-actuation
  // gate that the first draft omitted.
  for (const mode of MODES) {
    const free = find(direction, 'free', mode);
    const braced = find(direction, 'braced', mode);
    if (Math.abs(braced.beforeAuthority.combinedMomentum - free.beforeAuthority.combinedMomentum) > MOMENTUM_EPS) {
      throw new Error(`E13.0a inactive wall changed combined momentum ${mode}/dir=${direction}`);
    }
    if (Math.abs(braced.beforeAuthority.relativeV - free.beforeAuthority.relativeV) > RELATIVE_DV_EPS) {
      throw new Error(`E13.0a inactive wall changed relative velocity ${mode}/dir=${direction}`);
    }
    if (Math.abs(braced.q - free.q) > RELATIVE_DV_EPS) {
      throw new Error(`E13.0a inactive wall changed traction entitlement ${mode}/dir=${direction}`);
    }
  }

  // Authority bookkeeping is measured relative to each specimen's qualified
  // pre-authority state, rather than assuming exact absolute zero momentum.
  if (Math.abs(freeExternal.immediateMomentumDelta - freeExternal.appliedImpulse) > MOMENTUM_EPS) {
    throw new Error(`E13.0a free external granted momentum mismatch dir=${direction}`);
  }
  if (Math.abs(bracedExternal.immediateMomentumDelta - bracedExternal.appliedImpulse) > MOMENTUM_EPS) {
    throw new Error(`E13.0a braced external granted momentum mismatch dir=${direction}`);
  }
  if (Math.abs(freeReciprocal.immediateMomentumDelta) > MOMENTUM_EPS) {
    throw new Error(`E13.0a free reciprocal granted net momentum dir=${direction}`);
  }
  if (Math.abs(bracedReciprocal.immediateMomentumDelta) > MOMENTUM_EPS) {
    throw new Error(`E13.0a braced reciprocal granted net momentum dir=${direction}`);
  }

  // With zero damping and no world brace, player+support momentum must stay
  // closed through the post-pulse solve for either placement.
  if (Math.abs(freeExternal.solverMomentumDelta) > MOMENTUM_EPS) {
    throw new Error(`E13.0a free external leaked horizontal momentum dir=${direction}`);
  }
  if (Math.abs(freeReciprocal.solverMomentumDelta) > MOMENTUM_EPS) {
    throw new Error(`E13.0a free reciprocal leaked horizontal momentum dir=${direction}`);
  }

  // The rear wall is unilateral. World-external authority gives the support no
  // recoil toward it, so the wall must not become a horizontal authority path.
  if (Math.abs(bracedExternal.solverMomentumDelta) > MOMENTUM_EPS) {
    throw new Error(`E13.0a braced external unexpectedly exchanged momentum with world dir=${direction}`);
  }
  if (bracedExternal.afterSolve.wall?.loaded > 0) {
    throw new Error(`E13.0a braced external loaded recoil wall dir=${direction}`);
  }

  // Reciprocal authority does push the support into the already-tangent wall.
  // A loaded wall contact plus a solver-scale system momentum change proves that
  // the support reaction has propagated into a genuine external world reference.
  if (!bracedReciprocal.afterSolve.wall || bracedReciprocal.afterSolve.wall.loaded <= 0) {
    throw new Error(`E13.0a reciprocal brace failed to load world wall dir=${direction}`);
  }
  if (bracedReciprocal.solverMomentumDelta <= MOMENTUM_EPS) {
    throw new Error(`E13.0a reciprocal brace failed to transmit positive world reaction dir=${direction}`);
  }

  // The free reciprocal control must still carry recoil after one friction solve;
  // otherwise this specimen would not actually discriminate support mobility.
  if (freeReciprocal.afterSolve.supportV >= -RELATIVE_DV_EPS) {
    throw new Error(`E13.0a free reciprocal support no longer carries recoil dir=${direction}`);
  }
  if (bracedReciprocal.afterSolve.supportV <= freeReciprocal.afterSolve.supportV + RELATIVE_DV_EPS) {
    throw new Error(`E13.0a wall did not materially change reciprocal support motion dir=${direction}`);
  }
}

const mirrorRows = [];
for (const worldCase of WORLD_CASES) {
  for (const mode of MODES) {
    const neg = find(-1, worldCase, mode);
    const pos = find(1, worldCase, mode);
    mirrorRows.push({
      worldCase,
      mode,
      qGap: Math.abs(neg.q - pos.q),
      momentumDeltaGap: Math.abs(neg.solverMomentumDelta - pos.solverMomentumDelta),
      relativePostGap: Math.abs(neg.afterSolve.relativeV - pos.afterSolve.relativeV),
    });
  }
}

for (const row of mirrorRows) {
  console.log(
    `  mirror ${row.worldCase.padEnd(6)} ${row.mode.padEnd(14)} ` +
    `qGap=${row.qGap.toExponential(2)} dPGap=${row.momentumDeltaGap.toFixed(5)}Ns ` +
    `postRelGap=${row.relativePostGap.toFixed(6)}m/s`,
  );
}

console.log('E13.0a PASS');
console.log('  after an explicit inactive representation gate, a zero-gap world brace is causally inert for world-external placement but becomes a real reaction path for reciprocal placement.');
console.log('  therefore support mobility / wider-world coupling is a substantive reciprocal-authority variable, not bookkeeping; placement is no longer Galilean-equivalent once the support reaction reaches the world.');
