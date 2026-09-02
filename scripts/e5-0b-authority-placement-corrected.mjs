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
const MU = 0.95;
const LOAD_EPS = 1e-6;
const SETTLE = 90;
const DRIVE = 6;
const ROOT_RADIUS = 0.36;
const ROOT_HALF_SEGMENT = 0.54;
const ROOT_START_Y = ROOT_RADIUS + ROOT_HALF_SEGMENT + 0.002;
const FLOOR_HALF = [4, 0.25, 10];
const FLOOR_Y = -FLOOR_HALF[1];
const SUPPORT_MASS = 800;
const MODES = ['world-external', 'support-uncapped', 'support-coulomb'];
const DIRECTIONS = [-1, 1];
const STATIC_SWEEP = [12, 19, 24, CURRENT_ACCEL, CURRENT_DECEL];

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

function createRoot(world, y = ROOT_START_Y) {
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
  // Horizontal passive friction is deliberately disabled. Every horizontal
  // impulse in this crucible must come from the declared authority semantics.
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateCapsuleShape(body, sd, capsule);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

function createStaticSupport(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.position = [0, FLOOR_Y, 0];
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...FLOOR_HALF);
  return { body, mass: Infinity };
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
  sd.density = SUPPORT_MASS / (8 * FLOOR_HALF[0] * FLOOR_HALF[1] * FLOOR_HALF[2]);
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...FLOOR_HALF);
  return { body, mass: b3.b3Body_GetMass(body) };
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
      const rootIsA = sameId(contact.shapeIdA, root.shape);
      const rootIsB = sameId(contact.shapeIdB, root.shape);
      if (!rootIsA && !rootIsB) continue;
      const otherShape = rootIsA ? contact.shapeIdB : contact.shapeIdA;
      const otherBody = b3.b3Shape_GetBody(otherShape);
      let touching = 0;
      let finalNormalImpulse = 0;
      let totalNormalImpulse = 0;
      let up = -Infinity;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (manifold.pointCount <= 0) continue;
        const sign = rootIsA ? -1 : 1;
        const candidateUp = manifold.normal[1] * sign;
        if (candidateUp < 0.58) continue;
        up = Math.max(up, candidateUp);
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          finalNormalImpulse += Math.abs(point.normalImpulse ?? 0);
          totalNormalImpulse += Math.abs(point.totalNormalImpulse ?? 0);
        }
      }

      const reactive = (
        touching > 0 ||
        finalNormalImpulse > LOAD_EPS ||
        totalNormalImpulse > LOAD_EPS
      );
      if (!reactive) continue;

      // E5.0a calibrated this against mg*dt across substeps [1,2,4,8].
      // The exact pinned Box3D v0.1.0 debug-force path likewise uses
      // 0.5*totalNormalImpulse because the accumulation includes relaxation.
      const frameNormalImpulse = 0.5 * totalNormalImpulse;
      if (!best || up > best.up) {
        best = {
          body: otherBody,
          type: bodyTypeValue(b3.b3Body_GetType(otherBody)),
          up,
          touching,
          finalNormalImpulse,
          totalNormalImpulse,
          frameNormalImpulse,
        };
      }
    }

    return best;
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function getVz(body) {
  const v = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(v, body);
  return v[2];
}

function settle(world, reader) {
  let support = reader.read();
  for (let i = 0; i < SETTLE; i++) {
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = reader.read();
  }
  return support;
}

function applyAuthority({ mode, root, support, direction, acceleration }) {
  const requestedImpulse = direction * acceleration * DT * root.mass;
  let appliedImpulse = 0;
  let cap = Infinity;

  if (mode === 'world-external') {
    appliedImpulse = requestedImpulse;
  } else {
    if (!support) return { requestedImpulse, appliedImpulse: 0, cap: 0 };
    if (mode === 'support-coulomb') {
      cap = MU * support.frameNormalImpulse;
      appliedImpulse = Math.sign(requestedImpulse) * Math.min(Math.abs(requestedImpulse), cap);
    } else if (mode === 'support-uncapped') {
      appliedImpulse = requestedImpulse;
    } else {
      throw new Error(`Unknown E5 authority mode: ${mode}`);
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

  return { requestedImpulse, appliedImpulse, cap };
}

function runAir({ mode, direction }) {
  const world = makeWorld(0);
  const root = createRoot(world, 3);
  const reader = createSupportReader(root);
  let support = reader.read();
  const before = getVz(root.body);
  let impulse = 0;

  for (let i = 0; i < DRIVE; i++) {
    const a = applyAuthority({ mode, root, support, direction, acceleration: CURRENT_ACCEL });
    impulse += a.appliedImpulse;
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = reader.read();
  }

  const achieved = (getVz(root.body) - before) / (DRIVE * DT);
  reader.destroy();
  b3.b3DestroyWorld(world);
  return { mode, direction, achieved, impulse, support: Boolean(support) };
}

function runStatic({ mode, direction, acceleration }) {
  const world = makeWorld(G);
  const root = createRoot(world);
  createStaticSupport(world);
  const reader = createSupportReader(root);
  let support = settle(world, reader);
  if (!support) throw new Error(`E5.0b could not establish static support for ${mode}`);
  const before = getVz(root.body);
  let applied = 0;
  let requested = 0;
  let frameLoad = 0;
  let supportLoss = 0;

  for (let i = 0; i < DRIVE; i++) {
    frameLoad += support?.frameNormalImpulse ?? 0;
    const a = applyAuthority({ mode, root, support, direction, acceleration });
    applied += a.appliedImpulse;
    requested += a.requestedImpulse;
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = reader.read();
    if (!support) supportLoss += 1;
  }

  const achieved = (getVz(root.body) - before) / (DRIVE * DT);
  const meanFrameLoad = frameLoad / DRIVE;
  const tractionScale = MU * meanFrameLoad / root.mass / DT;
  reader.destroy();
  b3.b3DestroyWorld(world);
  return {
    mode,
    direction,
    acceleration,
    achieved,
    applied,
    requested,
    meanFrameLoad,
    tractionScale,
    supportLoss,
  };
}

function runDynamic({ mode, direction, acceleration }) {
  const world = makeWorld(G);
  const root = createRoot(world);
  const platform = createDynamicSupport(world);
  const reader = createSupportReader(root);
  let support = settle(world, reader);
  if (!support) throw new Error(`E5.0b could not establish dynamic support for ${mode}`);

  const playerBefore = getVz(root.body);
  const supportBefore = getVz(platform.body);
  let applied = 0;
  let supportLoss = 0;

  for (let i = 0; i < DRIVE; i++) {
    const a = applyAuthority({ mode, root, support, direction, acceleration });
    applied += a.appliedImpulse;
    b3.b3World_Step(world, DT, SUBSTEPS);
    support = reader.read();
    if (!support) supportLoss += 1;
  }

  const dpPlayer = root.mass * (getVz(root.body) - playerBefore);
  const dpSupport = platform.mass * (getVz(platform.body) - supportBefore);
  const dpTotal = dpPlayer + dpSupport;
  reader.destroy();
  b3.b3DestroyWorld(world);
  return { mode, direction, acceleration, dpPlayer, dpSupport, dpTotal, applied, supportLoss };
}

function paired(results, predicate) {
  return DIRECTIONS.map((direction) => results.find((r) => predicate(r) && r.direction === direction));
}

if (
  DT !== 1 / 60 || SUBSTEPS !== 4 || G !== 20 || MASS !== 80 ||
  CURRENT_ACCEL !== 31 || CURRENT_DECEL !== 36 || MAX_SPEED !== 5.2
) {
  throw new Error('E5.0b expected accepted Donor-v1 envelope changed; requalify authority placement');
}

console.log('E5.0b corrected authority-placement crucible');
console.log(`  ordinary support traction scale in settled control: μg=${(MU * G).toFixed(2)}m/s²`);

const air = [];
for (const mode of MODES) {
  for (const direction of DIRECTIONS) {
    const r = runAir({ mode, direction });
    air.push(r);
    console.log(
      `air mode=${mode.padEnd(16)} dir=${direction > 0 ? '+' : '-'} ` +
      `a=${r.achieved.toFixed(3)}m/s² J=${r.impulse.toFixed(3)} support=${r.support}`,
    );
  }
}

const statics = [];
for (const acceleration of STATIC_SWEEP) {
  for (const mode of MODES) {
    for (const direction of DIRECTIONS) {
      const r = runStatic({ mode, direction, acceleration });
      statics.push(r);
      console.log(
        `static req=${String(acceleration).padStart(2)} mode=${mode.padEnd(16)} dir=${direction > 0 ? '+' : '-'} ` +
        `a=${r.achieved.toFixed(3)}m/s² load=${r.meanFrameLoad.toFixed(3)}Ns ` +
        `μ-load≈${r.tractionScale.toFixed(2)}m/s² J=${r.applied.toFixed(2)}/${r.requested.toFixed(2)} loss=${r.supportLoss}`,
      );
    }
  }
}

const dynamics = [];
for (const acceleration of [12, CURRENT_ACCEL]) {
  for (const mode of MODES) {
    for (const direction of DIRECTIONS) {
      const r = runDynamic({ mode, direction, acceleration });
      dynamics.push(r);
      console.log(
        `dynamic req=${acceleration} mode=${mode.padEnd(16)} dir=${direction > 0 ? '+' : '-'} ` +
        `ΔPplayer=${r.dpPlayer.toFixed(3)} ΔPsupport=${r.dpSupport.toFixed(3)} ` +
        `ΔPtotal=${r.dpTotal.toFixed(3)} Jctrl=${r.applied.toFixed(3)} loss=${r.supportLoss}`,
      );
    }
  }
}

const externalAir = paired(air, (r) => r.mode === 'world-external');
const supportAir = air.filter((r) => r.mode !== 'world-external');
if (!externalAir.every((r) => Math.abs(Math.abs(r.achieved) - CURRENT_ACCEL) < 0.05)) {
  throw new Error('E5.0b world-external authority failed to reproduce requested airborne acceleration');
}
if (!supportAir.every((r) => Math.abs(r.achieved) < 1e-6 && Math.abs(r.impulse) < 1e-6)) {
  throw new Error('E5.0b support-mediated authority acted without support');
}

for (const requested of STATIC_SWEEP) {
  const external = paired(statics, (r) => r.mode === 'world-external' && r.acceleration === requested);
  const uncapped = paired(statics, (r) => r.mode === 'support-uncapped' && r.acceleration === requested);
  if (![...external, ...uncapped].every((r) => Math.abs(Math.abs(r.achieved) - requested) < 0.15)) {
    throw new Error(`E5.0b uncapped authority failed ${requested}m/s² static throughput control`);
  }
}

const c12 = paired(statics, (r) => r.mode === 'support-coulomb' && r.acceleration === 12);
const c19 = paired(statics, (r) => r.mode === 'support-coulomb' && r.acceleration === 19);
const c24 = paired(statics, (r) => r.mode === 'support-coulomb' && r.acceleration === 24);
const c31 = paired(statics, (r) => r.mode === 'support-coulomb' && r.acceleration === CURRENT_ACCEL);
const c36 = paired(statics, (r) => r.mode === 'support-coulomb' && r.acceleration === CURRENT_DECEL);
if (![...c12, ...c19].every((r) => Math.abs(Math.abs(r.achieved) - r.acceleration) < 0.25)) {
  throw new Error('E5.0b Coulomb authority clipped a request at or below the calibrated μg scale');
}
if (![...c24, ...c31, ...c36].every((r) => Math.abs(Math.abs(r.achieved) - MU * G) < 0.35)) {
  throw new Error('E5.0b Coulomb authority did not expose the calibrated ~μg throughput ceiling');
}
if (!statics.every((r) => r.supportLoss === 0)) {
  throw new Error('E5.0b static support was lost; throughput comparison is confounded');
}

const dynExternal = dynamics.filter((r) => r.mode === 'world-external');
const dynExchange = dynamics.filter((r) => r.mode !== 'world-external');
if (!dynExternal.every((r) => Math.abs(r.dpTotal - r.applied) < 0.5)) {
  throw new Error('E5.0b world-external authority did not show unilateral net momentum injection');
}
if (!dynExchange.every((r) => Math.abs(r.dpTotal) < 0.5)) {
  throw new Error('E5.0b support exchange failed equal-and-opposite total momentum accounting');
}
if (!dynamics.every((r) => r.supportLoss === 0)) {
  throw new Error('E5.0b dynamic support was lost; reciprocity comparison is confounded');
}

const dyn31Uncapped = dynamics.filter((r) => r.mode === 'support-uncapped' && r.acceleration === CURRENT_ACCEL);
const dyn31Coulomb = dynamics.filter((r) => r.mode === 'support-coulomb' && r.acceleration === CURRENT_ACCEL);
if (!dyn31Uncapped.every((r) => Math.abs(Math.abs(r.dpPlayer) - 248) < 0.6)) {
  throw new Error('E5.0b uncapped dynamic-support control did not preserve current 31m/s² demand');
}
if (!dyn31Coulomb.every((r) => Math.abs(Math.abs(r.dpPlayer) - 152) < 1.5)) {
  throw new Error('E5.0b Coulomb dynamic-support case did not show the expected ~19m/s² capped exchange');
}

console.log('E5.0b PASS: authority placement is causally separated before posture integration. World-external authority reproduces accepted acceleration without support but injects net system momentum. Support-exchange authority requires support and can preserve equal-and-opposite momentum accounting. When that exchange is constrained by the calibrated ordinary Coulomb budget μ=0.95, the simple single-support specimen saturates near 19m/s², below current Donor-v1 31m/s² launch and 36m/s² braking response demands. This does not select traction, force-assist, hybrid authority, or stepping; it establishes the conflict those future mechanisms must resolve.');
