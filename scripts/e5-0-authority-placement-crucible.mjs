import Box3D from 'box3d.js/inline';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const MASS = DONOR_PROFILE_V1.virtualMass;
const CURRENT_ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const CURRENT_DECEL = DONOR_PROFILE_V1.groundDeceleration;
const MAX_SPEED = DONOR_PROFILE_V1.maxSpeed;
const TRACTION_MU = 0.95;
const LOAD_EPSILON = 1e-6;
const SETTLE_FRAMES = 90;
const DRIVE_FRAMES = 6;
const ACCEL_SWEEP = [4, 12, 19, 24, CURRENT_ACCEL, CURRENT_DECEL];
const DIRECTIONS = [-1, 1];
const MODES = ['world-external', 'support-uncapped', 'support-coulomb'];
const ROOT_RADIUS = 0.36;
const ROOT_HALF_SEGMENT = 0.54;
const ROOT_START_Y = ROOT_RADIUS + ROOT_HALF_SEGMENT + 0.002;
const FLOOR_HALF = [4, 0.25, 10];
const FLOOR_Y = -FLOOR_HALF[1];
const DYNAMIC_SUPPORT_MASS = 800;
const IDENTITY = [0, 0, 0, 1];

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function makeWorld(gravity = G) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -gravity, 0];
  return b3.b3CreateWorld(wd);
}

function createRoot(world, { y = ROOT_START_Y } = {}) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, y, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  bd.motionLocks.angularX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);

  const capsule = {
    center1: [0, -ROOT_HALF_SEGMENT, 0],
    center2: [0, ROOT_HALF_SEGMENT, 0],
    radius: ROOT_RADIUS,
  };
  const unitMass = b3.b3ComputeCapsuleMass(capsule, 1).mass;
  const sd = b3.b3DefaultShapeDef();
  sd.density = MASS / unitMass;
  // Horizontal contact consequence in this crucible comes only from the declared
  // authority model. Passive shape friction is zero so it cannot hide where the
  // tangential impulse came from.
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateCapsuleShape(body, sd, capsule);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

function createStaticFloor(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.position = [0, FLOOR_Y, 0];
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...FLOOR_HALF);
  return { body, shape, mass: Infinity, dynamic: false };
}

function createDynamicSupport(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, FLOOR_Y, 0];
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
  sd.density = DYNAMIC_SUPPORT_MASS / (8 * FLOOR_HALF[0] * FLOOR_HALF[1] * FLOOR_HALF[2]);
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...FLOOR_HALF);
  return { body, shape, mass: b3.b3Body_GetMass(body), dynamic: true };
}

function createSupportReader(root) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, root.body);
    let best = null;
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      const playerIsA = sameId(contact.shapeIdA, root.shape);
      const playerIsB = sameId(contact.shapeIdB, root.shape);
      if (!playerIsA && !playerIsB) continue;
      const otherShape = playerIsA ? contact.shapeIdB : contact.shapeIdA;
      const otherBody = b3.b3Shape_GetBody(otherShape);
      let touching = 0;
      let normalImpulse = 0;
      let bestUp = -Infinity;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (manifold.pointCount <= 0) continue;
        const sign = playerIsA ? -1 : 1;
        const up = manifold.normal[1] * sign;
        if (up < 0.58) continue;
        bestUp = Math.max(bestUp, up);
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const solved = Math.max(
            Math.abs(point.normalImpulse ?? 0),
            Math.abs(point.totalNormalImpulse ?? 0),
          );
          normalImpulse += solved;
        }
      }

      const reactive = touching > 0 || normalImpulse > LOAD_EPSILON;
      if (!reactive) continue;
      if (!best || bestUp > best.up) {
        best = {
          body: otherBody,
          up: bestUp,
          touching,
          normalImpulse,
          type: bodyTypeValue(b3.b3Body_GetType(otherBody)),
        };
      }
    }
    return best;
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function getVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function applyAuthority({ mode, root, support, direction, acceleration }) {
  const requestedDv = direction * acceleration * DT;
  const requestedImpulse = root.mass * requestedDv;
  let appliedImpulse = 0;
  let tractionCap = Infinity;

  if (mode === 'world-external') {
    appliedImpulse = requestedImpulse;
  } else {
    if (!support) return { requestedImpulse, appliedImpulse: 0, tractionCap: 0 };
    if (mode === 'support-coulomb') {
      tractionCap = TRACTION_MU * support.normalImpulse;
      appliedImpulse = Math.sign(requestedImpulse) * Math.min(Math.abs(requestedImpulse), tractionCap);
    } else if (mode === 'support-uncapped') {
      appliedImpulse = requestedImpulse;
    } else {
      throw new Error(`Unknown authority mode: ${mode}`);
    }
  }

  if (Math.abs(appliedImpulse) > 1e-12) {
    b3.b3Body_ApplyLinearImpulseToCenter(root.body, [0, 0, appliedImpulse], true);
    if (mode !== 'world-external' && support) {
      const dynamicType = bodyTypeValue(b3.b3BodyType.b3_dynamicBody);
      if (support.type === dynamicType) {
        b3.b3Body_ApplyLinearImpulseToCenter(support.body, [0, 0, -appliedImpulse], true);
      }
    }
  }

  return { requestedImpulse, appliedImpulse, tractionCap };
}

function settle(world, root, supportReader, frames = SETTLE_FRAMES) {
  let support = supportReader?.read() ?? null;
  for (let i = 0; i < frames; i++) {
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = supportReader?.read() ?? null;
  }
  return support;
}

function runAirborne({ mode, direction, acceleration = CURRENT_ACCEL }) {
  const world = makeWorld(0);
  const root = createRoot(world, { y: 3 });
  const reader = createSupportReader(root);
  let support = reader.read();
  let totalApplied = 0;
  const before = getVelocity(root.body)[2];

  for (let i = 0; i < DRIVE_FRAMES; i++) {
    const result = applyAuthority({ mode, root, support, direction, acceleration });
    totalApplied += result.appliedImpulse;
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = reader.read();
  }

  const after = getVelocity(root.body)[2];
  const achievedAccel = (after - before) / (DRIVE_FRAMES * DT);
  reader.destroy();
  b3.b3DestroyWorld(world);
  return { mode, direction, achievedAccel, totalApplied, support: Boolean(support) };
}

function runStaticThroughput({ mode, direction, acceleration }) {
  const world = makeWorld(G);
  const root = createRoot(world);
  createStaticFloor(world);
  const reader = createSupportReader(root);
  let support = settle(world, root, reader);
  if (!support) throw new Error(`E5.0 failed to settle static support for ${mode}`);

  const before = getVelocity(root.body)[2];
  let totalApplied = 0;
  let totalRequested = 0;
  let minCap = Infinity;
  let maxCap = 0;
  let supportLoss = 0;
  let normalImpulseSum = 0;

  for (let i = 0; i < DRIVE_FRAMES; i++) {
    const result = applyAuthority({ mode, root, support, direction, acceleration });
    totalApplied += result.appliedImpulse;
    totalRequested += result.requestedImpulse;
    if (Number.isFinite(result.tractionCap)) {
      minCap = Math.min(minCap, result.tractionCap);
      maxCap = Math.max(maxCap, result.tractionCap);
    }
    normalImpulseSum += support?.normalImpulse ?? 0;
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = reader.read();
    if (!support) supportLoss += 1;
  }

  const after = getVelocity(root.body)[2];
  const achievedAccel = (after - before) / (DRIVE_FRAMES * DT);
  const meanNormalImpulse = normalImpulseSum / DRIVE_FRAMES;
  const inferredTractionAccel = TRACTION_MU * meanNormalImpulse / root.mass / DT;

  reader.destroy();
  b3.b3DestroyWorld(world);
  return {
    mode,
    direction,
    requestedAccel: acceleration,
    achievedAccel,
    totalApplied,
    totalRequested,
    supportLoss,
    meanNormalImpulse,
    inferredTractionAccel,
    minCap: Number.isFinite(minCap) ? minCap : null,
    maxCap: maxCap || null,
  };
}

function runDynamicReciprocity({ mode, direction, acceleration }) {
  const world = makeWorld(G);
  const root = createRoot(world);
  const platform = createDynamicSupport(world);
  const reader = createSupportReader(root);
  let support = settle(world, root, reader);
  if (!support) throw new Error(`E5.0 failed to settle dynamic support for ${mode}`);

  const rootBefore = getVelocity(root.body)[2];
  const platformBefore = getVelocity(platform.body)[2];
  let totalApplied = 0;
  let supportLoss = 0;

  for (let i = 0; i < DRIVE_FRAMES; i++) {
    const result = applyAuthority({ mode, root, support, direction, acceleration });
    totalApplied += result.appliedImpulse;
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = reader.read();
    if (!support) supportLoss += 1;
  }

  const rootAfter = getVelocity(root.body)[2];
  const platformAfter = getVelocity(platform.body)[2];
  const rootMomentumDelta = root.mass * (rootAfter - rootBefore);
  const platformMomentumDelta = platform.mass * (platformAfter - platformBefore);
  const totalMomentumDelta = rootMomentumDelta + platformMomentumDelta;

  reader.destroy();
  b3.b3DestroyWorld(world);
  return {
    mode,
    direction,
    requestedAccel: acceleration,
    rootMomentumDelta,
    platformMomentumDelta,
    totalMomentumDelta,
    totalApplied,
    supportLoss,
  };
}

if (
  DT !== 1 / 60 ||
  SUBSTEPS !== 4 ||
  G !== 20 ||
  MASS !== 80 ||
  CURRENT_ACCEL !== 31 ||
  CURRENT_DECEL !== 36 ||
  MAX_SPEED !== 5.2
) {
  throw new Error('E5.0 expected current Donor v1 envelope changed; requalify authority crucible');
}

console.log('E5.0 authority placement crucible');
console.log(`  expected steady Coulomb acceleration scale μg=${(TRACTION_MU * G).toFixed(2)}m/s²`);

const airborne = [];
for (const mode of MODES) {
  for (const direction of DIRECTIONS) {
    const r = runAirborne({ mode, direction });
    airborne.push(r);
    console.log(
      `air mode=${mode.padEnd(16)} dir=${direction > 0 ? '+' : '-'} ` +
      `a=${r.achievedAccel.toFixed(3)}m/s² J=${r.totalApplied.toFixed(3)} support=${r.support}`,
    );
  }
}

const staticResults = [];
for (const acceleration of ACCEL_SWEEP) {
  for (const mode of MODES) {
    for (const direction of DIRECTIONS) {
      const r = runStaticThroughput({ mode, direction, acceleration });
      staticResults.push(r);
      console.log(
        `static req=${String(acceleration).padStart(2)} mode=${mode.padEnd(16)} dir=${direction > 0 ? '+' : '-'} ` +
        `a=${r.achievedAccel.toFixed(3)}m/s² load=${r.meanNormalImpulse.toFixed(3)}Ns ` +
        `traction≈${r.inferredTractionAccel.toFixed(2)}m/s² loss=${r.supportLoss}`,
      );
    }
  }
}

const dynamicResults = [];
for (const acceleration of [12, CURRENT_ACCEL]) {
  for (const mode of MODES) {
    for (const direction of DIRECTIONS) {
      const r = runDynamicReciprocity({ mode, direction, acceleration });
      dynamicResults.push(r);
      console.log(
        `dynamic req=${acceleration} mode=${mode.padEnd(16)} dir=${direction > 0 ? '+' : '-'} ` +
        `ΔPplayer=${r.rootMomentumDelta.toFixed(3)} ΔPsupport=${r.platformMomentumDelta.toFixed(3)} ` +
        `ΔPtotal=${r.totalMomentumDelta.toFixed(3)} Jctrl=${r.totalApplied.toFixed(3)} loss=${r.supportLoss}`,
      );
    }
  }
}

function pair(results, predicate) {
  return DIRECTIONS.map((direction) => results.find((r) => predicate(r) && r.direction === direction));
}

const airExternal = pair(airborne, (r) => r.mode === 'world-external');
const airUncapped = pair(airborne, (r) => r.mode === 'support-uncapped');
const airCoulomb = pair(airborne, (r) => r.mode === 'support-coulomb');
if (!airExternal.every((r) => Math.abs(r.achievedAccel) > 30.5)) {
  throw new Error('E5.0 world-external airborne authority did not reproduce requested 31m/s² response');
}
if (![...airUncapped, ...airCoulomb].every((r) => Math.abs(r.achievedAccel) < 1e-6)) {
  throw new Error('E5.0 support-mediated authority acted without support');
}

for (const requested of [4, 12, 19, 24, CURRENT_ACCEL, CURRENT_DECEL]) {
  const external = pair(staticResults, (r) => r.mode === 'world-external' && r.requestedAccel === requested);
  const uncapped = pair(staticResults, (r) => r.mode === 'support-uncapped' && r.requestedAccel === requested);
  if (![...external, ...uncapped].every((r) => Math.abs(Math.abs(r.achievedAccel) - requested) < 0.15)) {
    throw new Error(`E5.0 uncapped authority failed requested static throughput at ${requested}m/s²`);
  }
}

const coulomb12 = pair(staticResults, (r) => r.mode === 'support-coulomb' && r.requestedAccel === 12);
const coulomb31 = pair(staticResults, (r) => r.mode === 'support-coulomb' && r.requestedAccel === CURRENT_ACCEL);
const coulomb36 = pair(staticResults, (r) => r.mode === 'support-coulomb' && r.requestedAccel === CURRENT_DECEL);
if (!coulomb12.every((r) => Math.abs(Math.abs(r.achievedAccel) - 12) < 0.25)) {
  throw new Error('E5.0 Coulomb authority unexpectedly clipped a 12m/s² request');
}
if (![...coulomb31, ...coulomb36].every((r) => {
  const a = Math.abs(r.achievedAccel);
  return a > 17.5 && a < 20.5;
})) {
  throw new Error('E5.0 Coulomb authority did not expose the expected ~μg traction ceiling');
}
if (!staticResults.every((r) => r.supportLoss === 0)) {
  throw new Error('E5.0 static throughput lost support; traction comparison is confounded');
}

const dynamicExternal = dynamicResults.filter((r) => r.mode === 'world-external');
const dynamicExchange = dynamicResults.filter((r) => r.mode !== 'world-external');
if (!dynamicExternal.every((r) => Math.abs(r.totalMomentumDelta - r.totalApplied) < 0.5)) {
  throw new Error('E5.0 world-external dynamic-support momentum accounting was not unilateral as expected');
}
if (!dynamicExchange.every((r) => Math.abs(r.totalMomentumDelta) < 0.5)) {
  throw new Error('E5.0 support-exchange failed equal-and-opposite total momentum accounting');
}
if (!dynamicResults.every((r) => r.supportLoss === 0)) {
  throw new Error('E5.0 dynamic reciprocity lost support; momentum comparison is confounded');
}

console.log('E5.0 PASS: authority placement was causally separated before posture integration. World-external authority acts without support and injects net player+support momentum; support-exchange authority is support-gated and reciprocal; adding a Coulomb tangential budget exposes a ~μg throughput ceiling below current Donor-v1 31/36m/s² ground response demands. This is a translation-only contract probe, not a locomotion implementation or a selected traction architecture.');
