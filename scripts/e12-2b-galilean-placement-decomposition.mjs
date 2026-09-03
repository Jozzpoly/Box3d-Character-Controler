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
const RELEASE_FRAMES = 60; // one established 1 s observation horizon
const LOAD_EPS = 1e-6;
const REFERENCE_MU = 0.95;
const STATIC_FRAME_LOAD = PLAYER_MASS * G * DT;
const NOMINAL_TRACTION_CAPACITY = REFERENCE_MU * STATIC_FRAME_LOAD;
const HALF = [2, 0.25, 30];
const PLATFORM_Y = -HALF[1];
const NUMERIC_VELOCITY_EPS = 1e-4;
const NUMERIC_POSITION_EPS = 1e-4;
const NUMERIC_ANGLE_EPS = 1e-5;
const MOMENTUM_EPS = 2e-3;
const DIRECTIONS = [-1, 1];
const FRICTION_CASES = [
  { name: 'normal', mu: 0.95 },
  { name: 'weak', mu: 0.20 },
];
const DAMPING_CASES = [
  { name: 'canonical', playerLinearDamping: 0.015 },
  { name: 'zero-damping-control', playerLinearDamping: 0 },
];

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
      reactive: matchedPlatform && (touching > 0 || loaded > 0),
      touching,
      loaded,
      frameNormalImpulse: 0.5 * totalNormalImpulse,
    };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
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
    torsoW: organism.torsoAngularVelocity[0],
    footW: organism.footAngularVelocity[0],
    fall: organism.fallObserved,
  };
}

function applyPlayerImpulse(organism, signedImpulse) {
  const footImpulse = signedImpulse * organism.footMass / PLAYER_MASS;
  const torsoImpulse = signedImpulse * organism.torsoMass / PLAYER_MASS;
  b3.b3Body_ApplyLinearImpulseToCenter(organism.foot, [0, 0, footImpulse], true);
  b3.b3Body_ApplyLinearImpulseToCenter(organism.torso, [0, 0, torsoImpulse], true);
}

function snapshot(organism, platform, reader, direction, frame) {
  const player = playerState(organism);
  const supportV = bodyVelocityZ(platform.body);
  const supportZ = bodyComZ(platform.body);
  const support = reader.read();
  return {
    frame,
    playerV: direction * player.vz,
    supportV: direction * supportV,
    relativeV: direction * (player.vz - supportV),
    playerZ: direction * player.z,
    supportZ: direction * supportZ,
    relativeZ: direction * (player.z - supportZ),
    torsoTilt: direction * player.torsoTilt,
    footTilt: direction * player.footTilt,
    torsoW: direction * player.torsoW,
    footW: direction * player.footW,
    totalMomentum: direction * (PLAYER_MASS * player.vz + SUPPORT_MASS * supportV),
    reactive: support.reactive,
    frameNormalImpulse: support.frameNormalImpulse,
    fall: player.fall,
  };
}

function runPlacement({ frictionCase, dampingCase, direction, mode }) {
  const world = makeWorld();
  const platform = makeDynamicPlatform(world, frictionCase.mu);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: FINITE_TORQUE,
    footFriction: frictionCase.mu,
  });
  b3.b3Body_SetLinearDamping(organism.foot, dampingCase.playerLinearDamping);
  b3.b3Body_SetLinearDamping(organism.torso, dampingCase.playerLinearDamping);
  const reader = createSupportReader(organism, platform.shape);

  for (let i = 0; i < SETTLE_FRAMES; i++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
  }

  organism.preStep(DT);
  b3.b3World_Step(world, DT, SUBSTEPS);
  organism.postStep();
  const support = reader.read();
  if (!support.reactive) {
    throw new Error(`E12.2b failed to establish support ${dampingCase.name}/${frictionCase.name}/dir=${direction}/${mode}`);
  }

  const q = clamp(frictionCase.mu * support.frameNormalImpulse / NOMINAL_TRACTION_CAPACITY, 0, 1);
  const reducedMass = 1 / (1 / PLAYER_MASS + 1 / SUPPORT_MASS);
  const relativeDeltaV = q * ACCEL * DT;
  let appliedImpulse;
  if (mode === 'world-external') {
    appliedImpulse = PLAYER_MASS * relativeDeltaV;
    applyPlayerImpulse(organism, direction * appliedImpulse);
  } else if (mode === 'reciprocal') {
    appliedImpulse = reducedMass * relativeDeltaV;
    applyPlayerImpulse(organism, direction * appliedImpulse);
    b3.b3Body_ApplyLinearImpulseToCenter(platform.body, [0, 0, -direction * appliedImpulse], true);
  } else {
    throw new Error(`Unknown E12.2b mode ${mode}`);
  }

  const trace = [snapshot(organism, platform, reader, direction, 0)];
  for (let frame = 1; frame <= RELEASE_FRAMES; frame++) {
    organism.preStep(DT);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    trace.push(snapshot(organism, platform, reader, direction, frame));
  }

  reader.destroy();
  b3.b3DestroyWorld(world);
  return { frictionCase, dampingCase, direction, mode, q, relativeDeltaV, appliedImpulse, trace };
}

function comparePair(external, reciprocal) {
  if (external.trace.length !== reciprocal.trace.length) throw new Error('E12.2b trace length mismatch');
  const initialBoost = external.trace[0].playerV - reciprocal.trace[0].playerV;
  let maxRelVDelta = 0;
  let maxRelZDelta = 0;
  let maxTorsoTiltDelta = 0;
  let maxFootTiltDelta = 0;
  let maxTorsoWDelta = 0;
  let maxFootWDelta = 0;
  let maxLoadDelta = 0;
  let maxPlayerBoostResidual = 0;
  let maxSupportBoostResidual = 0;
  let maxReciprocalMomentum = 0;
  let minExternalMomentum = Infinity;
  let maxExternalMomentum = -Infinity;
  let supportLossExternal = 0;
  let supportLossReciprocal = 0;

  for (let i = 0; i < external.trace.length; i++) {
    const e = external.trace[i];
    const r = reciprocal.trace[i];
    maxRelVDelta = Math.max(maxRelVDelta, Math.abs(e.relativeV - r.relativeV));
    maxRelZDelta = Math.max(maxRelZDelta, Math.abs(e.relativeZ - r.relativeZ));
    maxTorsoTiltDelta = Math.max(maxTorsoTiltDelta, Math.abs(e.torsoTilt - r.torsoTilt));
    maxFootTiltDelta = Math.max(maxFootTiltDelta, Math.abs(e.footTilt - r.footTilt));
    maxTorsoWDelta = Math.max(maxTorsoWDelta, Math.abs(e.torsoW - r.torsoW));
    maxFootWDelta = Math.max(maxFootWDelta, Math.abs(e.footW - r.footW));
    maxLoadDelta = Math.max(maxLoadDelta, Math.abs(e.frameNormalImpulse - r.frameNormalImpulse));
    maxPlayerBoostResidual = Math.max(maxPlayerBoostResidual, Math.abs((e.playerV - r.playerV) - initialBoost));
    maxSupportBoostResidual = Math.max(maxSupportBoostResidual, Math.abs((e.supportV - r.supportV) - initialBoost));
    maxReciprocalMomentum = Math.max(maxReciprocalMomentum, Math.abs(r.totalMomentum));
    minExternalMomentum = Math.min(minExternalMomentum, e.totalMomentum);
    maxExternalMomentum = Math.max(maxExternalMomentum, e.totalMomentum);
    if (!e.reactive) supportLossExternal += 1;
    if (!r.reactive) supportLossReciprocal += 1;
  }

  const e0 = external.trace[0];
  const r0 = reciprocal.trace[0];
  const eN = external.trace.at(-1);
  const rN = reciprocal.trace.at(-1);
  return {
    initialBoost,
    expectedBoost: external.appliedImpulse / (PLAYER_MASS + SUPPORT_MASS),
    initialRelativeVExternal: e0.relativeV,
    initialRelativeVReciprocal: r0.relativeV,
    terminalRelativeVExternal: eN.relativeV,
    terminalRelativeVReciprocal: rN.relativeV,
    maxRelVDelta,
    maxRelZDelta,
    maxTorsoTiltDelta,
    maxFootTiltDelta,
    maxTorsoWDelta,
    maxFootWDelta,
    maxLoadDelta,
    maxPlayerBoostResidual,
    maxSupportBoostResidual,
    maxReciprocalMomentum,
    initialExternalMomentum: e0.totalMomentum,
    terminalExternalMomentum: eN.totalMomentum,
    externalMomentumRange: maxExternalMomentum - minExternalMomentum,
    supportLossExternal,
    supportLossReciprocal,
    externalFall: eN.fall,
    reciprocalFall: rN.fall,
  };
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || ACCEL !== 31 || PLAYER_MASS !== 80) {
  throw new Error('E12.2b expected canonical Donor-v1 current31 substrate');
}

console.log('E12.2b Galilean placement / world-damping decomposition');
console.log(`  one q-entitled current31 outer-step pulse on an ${SUPPORT_MASS}kg dynamic platform, followed by ${RELEASE_FRAMES}f (${(RELEASE_FRAMES * DT).toFixed(2)}s) with zero further translational authority.`);
console.log('  matched world-external vs reciprocal pulses start with the same support-relative delta-v; reciprocal uses the exact reduced mass from E12.2a.');
console.log('  causal control: player linear damping is either canonical 0.015 or exactly zero; platform damping remains zero.');
console.log('  hypothesis: with zero player damping, placements should be Galilean-equivalent in relative/contact/posture coordinates and differ only by a uniform world-frame boost.');
console.log('  canonical damping is reported as evidence: Box3D damping reduces world velocity and may therefore break that equivalence. No production damping change is selected here.');

const summaries = [];
for (const dampingCase of DAMPING_CASES) {
  for (const frictionCase of FRICTION_CASES) {
    for (const direction of DIRECTIONS) {
      const external = runPlacement({ frictionCase, dampingCase, direction, mode: 'world-external' });
      const reciprocal = runPlacement({ frictionCase, dampingCase, direction, mode: 'reciprocal' });
      if (Math.abs(external.q - reciprocal.q) > 1e-6) {
        throw new Error(`E12.2b q mismatch before placement ${dampingCase.name}/${frictionCase.name}/dir=${direction}`);
      }
      const s = comparePair(external, reciprocal);
      summaries.push({ dampingCase, frictionCase, direction, q: external.q, ...s });
      console.log(
        `  ${dampingCase.name.padEnd(20)} ${frictionCase.name.padEnd(6)} dir=${direction > 0 ? '+' : '-'} q=${external.q.toFixed(3)} ` +
        `boost=${s.initialBoost.toFixed(6)}/${s.expectedBoost.toFixed(6)}m/s ` +
        `relV 0=${s.initialRelativeVExternal.toFixed(6)}/${s.initialRelativeVReciprocal.toFixed(6)} end=${s.terminalRelativeVExternal.toFixed(6)}/${s.terminalRelativeVReciprocal.toFixed(6)} ` +
        `maxDelta relV=${s.maxRelVDelta.toExponential(2)} relZ=${s.maxRelZDelta.toExponential(2)} tilt=${(s.maxTorsoTiltDelta * 180 / Math.PI).toExponential(2)}deg ` +
        `load=${s.maxLoadDelta.toExponential(2)}Ns boostResidual P/S=${s.maxPlayerBoostResidual.toExponential(2)}/${s.maxSupportBoostResidual.toExponential(2)}m/s ` +
        `P recipMax=${s.maxReciprocalMomentum.toExponential(2)}Ns ext=${s.initialExternalMomentum.toFixed(4)}->${s.terminalExternalMomentum.toFixed(4)}Ns ` +
        `loss=${s.supportLossExternal}/${s.supportLossReciprocal} fall=${s.externalFall}/${s.reciprocalFall}`,
      );
    }
  }
}

for (const s of summaries.filter((x) => x.dampingCase.name === 'zero-damping-control')) {
  if (Math.abs(s.initialBoost - s.expectedBoost) > NUMERIC_VELOCITY_EPS) {
    throw new Error(`E12.2b zero-damping initial boost mismatch ${s.frictionCase.name} dir=${s.direction}`);
  }
  if (
    s.maxRelVDelta > NUMERIC_VELOCITY_EPS ||
    s.maxRelZDelta > NUMERIC_POSITION_EPS ||
    s.maxTorsoTiltDelta > NUMERIC_ANGLE_EPS ||
    s.maxFootTiltDelta > NUMERIC_ANGLE_EPS ||
    s.maxTorsoWDelta > NUMERIC_VELOCITY_EPS ||
    s.maxFootWDelta > NUMERIC_VELOCITY_EPS ||
    s.maxLoadDelta > MOMENTUM_EPS ||
    s.maxPlayerBoostResidual > NUMERIC_VELOCITY_EPS ||
    s.maxSupportBoostResidual > NUMERIC_VELOCITY_EPS
  ) {
    throw new Error(`E12.2b zero-damping Galilean-equivalence gate failed ${s.frictionCase.name} dir=${s.direction}`);
  }
  if (s.maxReciprocalMomentum > MOMENTUM_EPS) {
    throw new Error(`E12.2b zero-damping reciprocal momentum drift ${s.frictionCase.name} dir=${s.direction}`);
  }
  if (Math.abs(s.terminalExternalMomentum - s.initialExternalMomentum) > MOMENTUM_EPS) {
    throw new Error(`E12.2b zero-damping external momentum drift ${s.frictionCase.name} dir=${s.direction}`);
  }
  if (s.supportLossExternal !== 0 || s.supportLossReciprocal !== 0 || s.externalFall || s.reciprocalFall) {
    throw new Error(`E12.2b zero-damping release lost qualified support/posture ${s.frictionCase.name} dir=${s.direction}`);
  }
}

for (const frictionCase of FRICTION_CASES) {
  const canonical = summaries.filter((x) => x.dampingCase.name === 'canonical' && x.frictionCase.name === frictionCase.name);
  const control = summaries.filter((x) => x.dampingCase.name === 'zero-damping-control' && x.frictionCase.name === frictionCase.name);
  const canonicalMax = Math.max(...canonical.map((x) => x.maxRelVDelta));
  const controlMax = Math.max(...control.map((x) => x.maxRelVDelta));
  const scale = Math.max(...canonical.map((x) => x.initialRelativeVExternal));
  console.log(
    `  decomposition ${frictionCase.name}: canonical max relative-velocity divergence=${canonicalMax.toExponential(3)}m/s ` +
    `(${(100 * canonicalMax / Math.max(scale, 1e-12)).toFixed(3)}% of granted relative pulse); zero-damping=${controlMax.toExponential(3)}m/s.`,
  );
}

console.log(
  'E12.2b PASS: after an identical q-entitled support-relative pulse, world-external and equal-and-opposite placement are Galilean-equivalent over the declared one-second isolated player+dynamic-support release when player linear damping is removed: relative motion, contact load and posture match while only the common world-frame boost and total horizontal momentum differ. ' +
  'The canonical 0.015 player linear damping cases quantify how much the current representation itself breaks that equivalence by damping world velocity. This is a causal decomposition, not a production damping change or architecture selection. ' +
  'If canonical divergence is small, further isolated two-body relative tests cannot meaningfully choose placement; a later discriminating experiment must introduce a genuine external world reference or interaction.',
);
