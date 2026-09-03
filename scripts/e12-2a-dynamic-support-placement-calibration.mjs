import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const PLAYER_MASS = DONOR_PROFILE_V1.virtualMass;
const FINITE_TORQUE = 320;
const SUPPORT_MASS = 800;
const SETTLE_FRAMES = 90;
const LOAD_EPS = 1e-6;
const MOMENTUM_EPS = 1e-3;
const RELATIVE_DV_EPS = 1e-4;
const REFERENCE_MU = 0.95;
const STATIC_FRAME_LOAD = PLAYER_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = REFERENCE_MU * STATIC_FRAME_LOAD;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const DIRECTIONS = [-1, 1];
const FRICTION_CASES = [
  { name: 'normal', mu: 0.95 },
  { name: 'weak', mu: 0.20 },
];
const MODES = ['physical', 'world-external', 'reciprocal'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makeDynamicPlatform(world, friction) {
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
  sd.density = densityForBoxMass(SUPPORT_MASS, HALF);
  sd.baseMaterial.friction = friction;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...HALF);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

function createSupportReader(organism, platformShape) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function sameId(a, b) {
    return Boolean(
      a && b &&
      a.index1 === b.index1 &&
      a.world0 === b.world0 &&
      a.generation === b.generation
    );
  }

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    let totalNormalImpulse = 0;
    let matchedPlatform = false;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      const footIsA = sameId(contact.shapeIdA, organism.footShape);
      const footIsB = sameId(contact.shapeIdB, organism.footShape);
      if (!footIsA && !footIsB) continue;
      const otherShape = footIsA ? contact.shapeIdB : contact.shapeIdA;
      if (!sameId(otherShape, platformShape)) continue;
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
      matchedPlatform,
      reactive: matchedPlatform && (touching > 0 || loaded > 0),
      touching,
      loaded,
      frameNormalImpulse: 0.5 * totalNormalImpulse,
    };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function bodyVelocity(body) {
  const v = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(v, body);
  return v;
}

function playerState(organism) {
  organism._sync();
  const footV = bodyVelocity(organism.foot);
  const torsoV = bodyVelocity(organism.torso);
  const mass = organism.footMass + organism.torsoMass;
  return {
    mass,
    vz: (organism.footMass * footV[2] + organism.torsoMass * torsoV[2]) / mass,
  };
}

function applyPlayerImpulse(organism, signedImpulse) {
  if (Math.abs(signedImpulse) <= 1e-12) return;
  const footImpulse = signedImpulse * organism.footMass / PLAYER_MASS;
  const torsoImpulse = signedImpulse * organism.torsoMass / PLAYER_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [0, 0, footImpulse], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [0, 0, torsoImpulse], true);
}

function runCase({ frictionCase, direction, mode }) {
  const world = makeWorld();
  const platform = makeDynamicPlatform(world, frictionCase.mu);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: frictionCase.mu,
  });
  const reader = createSupportReader(organism, platform.shape);
  let support = reader.read();

  for (let i = 0; i < SETTLE_FRAMES; i++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    support = reader.read();
  }

  if (!support.reactive) {
    throw new Error(`E12.2a failed to establish dynamic support ${frictionCase.name} dir=${direction} mode=${mode}`);
  }
  const playerMass = playerState(organism).mass;
  if (Math.abs(playerMass - PLAYER_MASS) > 1e-3 || Math.abs(platform.mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E12.2a mass contract changed player=${playerMass} support=${platform.mass}`);
  }

  // One neutral physics-first frame establishes the instantaneous traction
  // capacity signal. Authority is applied only after that solve, so no mode can
  // contaminate q or the pre-authority state.
  const beforeSolvePlayer = playerState(organism);
  const beforeSolveSupportV = bodyVelocity(platform.body)[2];
  organism.preStep(DT);
  b3.b3World_Step(world, DT, SUBSTEPS);
  organism.postStep();
  support = reader.read();
  if (!support.reactive) {
    throw new Error(`E12.2a lost support before authority ${frictionCase.name} dir=${direction} mode=${mode}`);
  }

  const beforeAuthorityPlayer = playerState(organism);
  const beforeAuthoritySupportV = bodyVelocity(platform.body)[2];
  const preAuthorityTotalMomentum = PLAYER_MASS * beforeAuthorityPlayer.vz + SUPPORT_MASS * beforeAuthoritySupportV;
  const physicalPlayerImpulse = PLAYER_MASS * (beforeAuthorityPlayer.vz - beforeSolvePlayer.vz);
  const physicalSupportImpulse = SUPPORT_MASS * (beforeAuthoritySupportV - beforeSolveSupportV);
  const q = clamp(
    frictionCase.mu * support.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY,
    0,
    1,
  );

  const reducedMass = 1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS);
  const nominalExternalImpulse = PLAYER_MASS * ACCEL * DT;
  const nominalReciprocalImpulse = reducedMass * ACCEL * DT;
  let appliedImpulse = 0;

  if (mode === 'world-external') {
    appliedImpulse = q * nominalExternalImpulse;
    applyPlayerImpulse(organism, direction * appliedImpulse);
  } else if (mode === 'reciprocal') {
    appliedImpulse = q * nominalReciprocalImpulse;
    applyPlayerImpulse(organism, direction * appliedImpulse);
    b3.b3Body_ApplyLinearImpulseToCenter(platform.body, [0, 0, -direction * appliedImpulse], true);
  } else if (mode !== 'physical') {
    throw new Error(`Unknown E12.2a mode ${mode}`);
  }

  const afterPlayer = playerState(organism);
  const afterSupportV = bodyVelocity(platform.body)[2];
  const postAuthorityTotalMomentum = PLAYER_MASS * afterPlayer.vz + SUPPORT_MASS * afterSupportV;
  const signedRelativeDeltaV = direction * (
    (afterPlayer.vz - afterSupportV) -
    (beforeAuthorityPlayer.vz - beforeAuthoritySupportV)
  );
  const expectedRelativeDeltaV = mode === 'physical' ? 0 : q * ACCEL * DT;
  const playerAuthorityImpulse = direction * PLAYER_MASS * (afterPlayer.vz - beforeAuthorityPlayer.vz);
  const supportAuthorityImpulse = direction * SUPPORT_MASS * (afterSupportV - beforeAuthoritySupportV);
  const totalAuthorityImpulse = direction * (postAuthorityTotalMomentum - preAuthorityTotalMomentum);

  const result = {
    frictionCase,
    direction,
    mode,
    q,
    frameNormalImpulse: support.frameNormalImpulse,
    physicalPlayerImpulse: direction * physicalPlayerImpulse,
    physicalSupportImpulse: direction * physicalSupportImpulse,
    appliedImpulse,
    expectedRelativeDeltaV,
    relativeDeltaV: signedRelativeDeltaV,
    playerAuthorityImpulse,
    supportAuthorityImpulse,
    totalAuthorityImpulse,
    playerVz: direction * afterPlayer.vz,
    supportVz: direction * afterSupportV,
    peakTiltDeg: organism.telemetry().peakAbsTilt * 180 / Math.PI,
  };

  reader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 ||
  PLAYER_MASS !== 80
) {
  throw new Error('E12.2a expected canonical Donor-v1 current31 substrate');
}

console.log('E12.2a graded-entitlement dynamic-support placement calibration');
console.log(`  dynamic support mass=${SUPPORT_MASS}kg; accepted relative acceleration=${ACCEL}m/s^2; outer dt=${DT.toFixed(6)}s`);
console.log(`  q=clamp(mu*Jn~/${NOMINAL_TRACTION_CAPACITY.toFixed(4)},0,1) from a neutral physics-first solve on real dynamic support`);
console.log(`  world-external nominal J=${(PLAYER_MASS * ACCEL * DT).toFixed(4)}Ns; reciprocal nominal J=${((1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS)) * ACCEL * DT).toFixed(4)}Ns`);
console.log('  reciprocal J uses reduced mass so both placements map the same q to the same support-relative delta-v; this is mechanics, not a fitted gain.');
console.log('  positive-horizontal-impulse eligibility is intentionally not reused here: its sign is placement-dependent on dynamic support. This gate isolates entitlement from reaction placement.');

const results = [];
for (const frictionCase of FRICTION_CASES) {
  for (const direction of DIRECTIONS) {
    for (const mode of MODES) {
      const r = runCase({ frictionCase, direction, mode });
      results.push(r);
      console.log(
        `  ${frictionCase.name.padEnd(6)} mu=${frictionCase.mu.toFixed(2)} dir=${direction > 0 ? '+' : '-'} ${mode.padEnd(14)} ` +
        `q=${r.q.toFixed(3)} Jn~=${r.frameNormalImpulse.toFixed(3)}Ns ` +
        `dVrel=${r.relativeDeltaV.toFixed(5)}/${r.expectedRelativeDeltaV.toFixed(5)}m/s ` +
        `Jauth player/support/total=${r.playerAuthorityImpulse.toFixed(3)}/${r.supportAuthorityImpulse.toFixed(3)}/${r.totalAuthorityImpulse.toFixed(3)}Ns ` +
        `Jphys=${r.physicalPlayerImpulse.toFixed(4)}/${r.physicalSupportImpulse.toFixed(4)}Ns ` +
        `v player/support=${r.playerVz.toFixed(5)}/${r.supportVz.toFixed(5)}m/s peak=${r.peakTiltDeg.toFixed(3)}deg`,
      );
    }
  }
}

function find(name, direction, mode) {
  return results.find((r) => r.frictionCase.name === name && r.direction === direction && r.mode === mode);
}

for (const frictionCase of FRICTION_CASES) {
  for (const direction of DIRECTIONS) {
    const physical = find(frictionCase.name, direction, 'physical');
    const external = find(frictionCase.name, direction, 'world-external');
    const reciprocal = find(frictionCase.name, direction, 'reciprocal');

    if (Math.abs(physical.relativeDeltaV) > RELATIVE_DV_EPS || Math.abs(physical.totalAuthorityImpulse) > MOMENTUM_EPS) {
      throw new Error(`E12.2a physical control moved without authority ${frictionCase.name} dir=${direction}`);
    }
    for (const candidate of [external, reciprocal]) {
      if (Math.abs(candidate.relativeDeltaV - candidate.expectedRelativeDeltaV) > RELATIVE_DV_EPS) {
        throw new Error(`E12.2a ${candidate.mode} relative authority mismatch ${frictionCase.name} dir=${direction}`);
      }
    }
    if (Math.abs(external.supportAuthorityImpulse) > MOMENTUM_EPS) {
      throw new Error(`E12.2a world-external unexpectedly reacted on dynamic support ${frictionCase.name} dir=${direction}`);
    }
    if (Math.abs(external.totalAuthorityImpulse - external.appliedImpulse) > MOMENTUM_EPS) {
      throw new Error(`E12.2a world-external momentum accounting mismatch ${frictionCase.name} dir=${direction}`);
    }
    if (
      Math.abs(reciprocal.playerAuthorityImpulse - reciprocal.appliedImpulse) > MOMENTUM_EPS ||
      Math.abs(reciprocal.supportAuthorityImpulse + reciprocal.appliedImpulse) > MOMENTUM_EPS ||
      Math.abs(reciprocal.totalAuthorityImpulse) > MOMENTUM_EPS
    ) {
      throw new Error(`E12.2a reciprocal momentum accounting mismatch ${frictionCase.name} dir=${direction}`);
    }
  }
}

const normal = DIRECTIONS.map((d) => find('normal', d, 'world-external'));
const weak = DIRECTIONS.map((d) => find('weak', d, 'world-external'));
if (!normal.every((r) => r.q >= 0.95)) {
  throw new Error(`E12.2a normal dynamic support failed to provide near-full entitlement q=${normal.map((r) => r.q.toFixed(3)).join('/')}`);
}
if (!weak.every((r) => r.q >= 0.15 && r.q <= 0.30)) {
  throw new Error(`E12.2a weak dynamic support entitlement outside derived neighborhood q=${weak.map((r) => r.q.toFixed(3)).join('/')}`);
}
for (let i = 0; i < DIRECTIONS.length; i++) {
  if (weak[i].relativeDeltaV > normal[i].relativeDeltaV * 0.35) {
    throw new Error(`E12.2a weak support became too translationally similar to normal dir=${DIRECTIONS[i]}`);
  }
}

console.log(
  'E12.2a PASS: the E12 traction-capacity entitlement composes with two causally distinct authority placements on real dynamic support. ' +
  'Using reduced-mass support-relative scaling, world-external and reciprocal placement deliver the same q-scaled current31 relative delta-v in the isolated outer-step gate, while weak support remains materially weaker. ' +
  'World-external placement injects the granted horizontal system momentum; reciprocal placement produces equal-and-opposite platform reaction and keeps player+support horizontal momentum neutral inside the declared numerical envelope. ' +
  'This qualifies placement/accounting semantics only. It does not prove a multi-frame dynamic-support controller, accepted 5.2m/s launch, braking, disturbances, moving-support behavior, solver-resolution robustness or Owner feel.',
);
