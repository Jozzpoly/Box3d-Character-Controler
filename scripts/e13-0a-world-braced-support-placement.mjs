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

function makeRecoilWall(world, direction) {
  const bd = b3.b3DefaultBodyDef();
  // Default Box3D bodies are static. The wall face is exactly tangent to the
  // platform end on the recoil side: no tuned gap and no compliance parameter.
  bd.position = [
    0,
    WALL_Y,
    -direction * (PLATFORM_HALF[2] + WALL_HALF[2]),
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

function runCase({ direction, mode, worldCase }) {
  const world = makeWorld();
  const platform = makeDynamicPlatform(world);
  const wall = worldCase === 'braced' ? makeRecoilWall(world, direction) : null;
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: REFERENCE_MU,
  });

  // E12.2b already showed canonical 0.015 linear damping changes matched placement
  // relative velocity by only ~0.006% over one second. E13.0a deliberately uses
  // the qualified zero-damping diagnostic control so any horizontal system-
  // momentum change during the single post-pulse solve must come from the wall.
  b3.b3Body_SetLinearDamping(organism.foot, 0);
  b3.b3Body_SetLinearDamping(organism.torso, 0);

  const supportReader = createSupportReader(organism, platform);
  const wallReader = wall
    ? createPairReader(platform.body, platform.shape, wall.shape, 2)
    : null;

  for (let i = 0; i < SETTLE_FRAMES; i++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
  }

  let settled = snapshot(organism, platform, supportReader, wallReader, direction);
  if (!settled.support.reactive || settled.fall) {
    throw new Error(`E13.0a failed to settle ${worldCase}/${mode}/dir=${direction}`);
  }
  if (Math.abs(playerState(organism).mass - PLAYER_MASS) > 1e-3 || Math.abs(platform.mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E13.0a mass contract changed ${worldCase}/${mode}/dir=${direction}`);
  }

  // One neutral physics-first frame measures the same traction-capacity
  // entitlement as E12. Authority is applied only after this solve.
  organism.preStep(DT);
  b3.b3World_Step(world, DT, SUBSTEPS);
  organism.postStep();

  const beforeAuthority = snapshot(organism, platform, supportReader, wallReader, direction);
  if (!beforeAuthority.support.reactive || beforeAuthority.fall) {
    throw new Error(`E13.0a lost support before authority ${worldCase}/${mode}/dir=${direction}`);
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

  // No more locomotion authority. This single solver step is the causal probe:
  // the free system has no external horizontal reaction, while the braced
  // reciprocal support is already touching a static world reference on its
  // recoil side.
  organism.preStep(DT);
  b3.b3World_Step(world, DT, SUBSTEPS);
  organism.postStep();

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
    beforeAuthority,
    immediate,
    afterSolve,
    immediateGrantedDeltaV,
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

console.log('E13.0a world-braced dynamic-support placement falsifier');
console.log(`  player=${PLAYER_MASS}kg support=${SUPPORT_MASS}kg; current31 relative pulse; dt=${DT.toFixed(6)}s substeps=${SUBSTEPS}`);
console.log('  braced support is exactly tangent to a static wall on the recoil side: zero gap, zero restitution, no spring/motor/stiffness parameter.');
console.log('  q is measured from the normal mu=.95 E5 load scale before authority; both placements receive the same q-entitled support-relative delta-v.');
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
        `q=${r.q.toFixed(4)} Jn~=${r.frameNormalImpulse.toFixed(4)}Ns ` +
        `grant dVrel=${r.immediateGrantedDeltaV.toFixed(6)}/${r.relativeDeltaV.toFixed(6)}m/s ` +
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

  if (Math.abs(freeExternal.immediate.combinedMomentum - freeExternal.appliedImpulse) > MOMENTUM_EPS) {
    throw new Error(`E13.0a free external immediate momentum mismatch dir=${direction}`);
  }
  if (Math.abs(bracedExternal.immediate.combinedMomentum - bracedExternal.appliedImpulse) > MOMENTUM_EPS) {
    throw new Error(`E13.0a braced external immediate momentum mismatch dir=${direction}`);
  }
  if (Math.abs(freeReciprocal.immediate.combinedMomentum) > MOMENTUM_EPS) {
    throw new Error(`E13.0a free reciprocal immediate momentum mismatch dir=${direction}`);
  }
  if (Math.abs(bracedReciprocal.immediate.combinedMomentum) > MOMENTUM_EPS) {
    throw new Error(`E13.0a braced reciprocal immediate momentum mismatch dir=${direction}`);
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

  // Reciprocal authority does push the support into the already-touching wall.
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
console.log('  a zero-gap world brace is causally inert for world-external placement but becomes a real reaction path for reciprocal placement.');
console.log('  therefore support mobility / wider-world coupling is a substantive reciprocal-authority variable, not bookkeeping; placement is no longer Galilean-equivalent once the support reaction reaches the world.');
