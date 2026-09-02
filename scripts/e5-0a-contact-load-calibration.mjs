import Box3D from 'box3d.js/inline';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const G = DONOR_PROFILE_V1.gravity;
const MASS = DONOR_PROFILE_V1.virtualMass;
const ROOT_RADIUS = 0.36;
const ROOT_HALF_SEGMENT = 0.54;
const ROOT_START_Y = ROOT_RADIUS + ROOT_HALF_SEGMENT + 0.002;
const SUBSTEP_SWEEP = [1, 2, 4, 8];
const SETTLE = 90;
const SAMPLE = 30;
const EXPECTED_FRAME_IMPULSE = MASS * G * DT;

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function makeRig() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  const world = b3.b3CreateWorld(wd);

  const floorDef = b3.b3DefaultBodyDef();
  floorDef.position = [0, -0.25, 0];
  const floor = b3.b3CreateBody(world, floorDef);
  const floorShapeDef = b3.b3DefaultShapeDef();
  floorShapeDef.baseMaterial.friction = 0;
  floorShapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(floor, floorShapeDef, 4, 0.25, 4);

  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [0, ROOT_START_Y, 0];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  bodyDef.enableSleep = false;
  bodyDef.enableContactRecycling = false;
  bodyDef.motionLocks.angularX = true;
  bodyDef.motionLocks.angularY = true;
  bodyDef.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bodyDef);

  const capsule = {
    center1: [0, -ROOT_HALF_SEGMENT, 0],
    center2: [0, ROOT_HALF_SEGMENT, 0],
    radius: ROOT_RADIUS,
  };
  const unitMass = b3.b3ComputeCapsuleMass(capsule, 1).mass;
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = MASS / unitMass;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  const shape = b3.b3CreateCapsuleShape(body, shapeDef, capsule);

  return { world, body, shape, mass: b3.b3Body_GetMass(body) };
}

function makeReader(rig) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, rig.body);
    let normalImpulse = 0;
    let totalNormalImpulse = 0;
    let points = 0;
    let touching = 0;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      const rootIsA = sameId(contact.shapeIdA, rig.shape);
      const rootIsB = sameId(contact.shapeIdB, rig.shape);
      if (!rootIsA && !rootIsB) continue;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.58) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          points += 1;
          if (point.separation <= 0) touching += 1;
          normalImpulse += Math.abs(point.normalImpulse ?? 0);
          totalNormalImpulse += Math.abs(point.totalNormalImpulse ?? 0);
        }
      }
    }

    return { normalImpulse, totalNormalImpulse, points, touching };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function run(substeps) {
  const rig = makeRig();
  const reader = makeReader(rig);

  for (let i = 0; i < SETTLE; i++) b3.b3World_Step(rig.world, DT, substeps);

  let sumFinal = 0;
  let sumTotal = 0;
  let minPoints = Infinity;
  let minTouching = Infinity;
  for (let i = 0; i < SAMPLE; i++) {
    b3.b3World_Step(rig.world, DT, substeps);
    const s = reader.read();
    sumFinal += s.normalImpulse;
    sumTotal += s.totalNormalImpulse;
    minPoints = Math.min(minPoints, s.points);
    minTouching = Math.min(minTouching, s.touching);
  }

  const meanFinal = sumFinal / SAMPLE;
  const meanTotal = sumTotal / SAMPLE;
  const finalScaled = meanFinal * substeps;
  const nativeForceEquivalent = 0.5 * meanTotal;

  reader.destroy();
  b3.b3DestroyWorld(rig.world);

  return {
    substeps,
    mass: rig.mass,
    meanFinal,
    meanTotal,
    finalScaled,
    nativeForceEquivalent,
    minPoints,
    minTouching,
  };
}

if (DT !== 1 / 60 || G !== 20 || MASS !== 80) {
  throw new Error('E5.0a expected Donor-v1 mass/gravity/dt envelope changed; requalify contact-load calibration');
}

console.log('E5.0a Box3D contact-load calibration');
console.log(`  expected outer-step support impulse mg·dt=${EXPECTED_FRAME_IMPULSE.toFixed(6)}Ns`);
console.log('  pinned native Box3D v0.1.0 debug-force convention: force = 0.5 * totalNormalImpulse * inv_dt (relax-iteration correction)');

const results = SUBSTEP_SWEEP.map(run);
for (const r of results) {
  console.log(
    `sub=${r.substeps} normal(final-substep)=${r.meanFinal.toFixed(6)}Ns ` +
    `normal*sub=${r.finalScaled.toFixed(6)}Ns total=${r.meanTotal.toFixed(6)}Ns ` +
    `0.5*total=${r.nativeForceEquivalent.toFixed(6)}Ns points>=${r.minPoints} touching>=${r.minTouching}`,
  );
}

const tolerance = 0.03 * EXPECTED_FRAME_IMPULSE;
if (!results.every((r) => Math.abs(r.mass - MASS) < 1e-3)) {
  throw new Error('E5.0a root mass does not match the 80kg Donor-v1 comparison mass');
}
if (!results.every((r) => r.minPoints > 0 && r.minTouching > 0)) {
  throw new Error('E5.0a support contact was not continuous during calibration');
}
if (!results.every((r) => Math.abs(r.nativeForceEquivalent - EXPECTED_FRAME_IMPULSE) <= tolerance)) {
  throw new Error('E5.0a 0.5*totalNormalImpulse did not reproduce mg*dt across the declared substep sweep');
}
if (!results.every((r) => Math.abs(r.finalScaled - EXPECTED_FRAME_IMPULSE) <= tolerance)) {
  throw new Error('E5.0a final-substep normalImpulse*substeps did not reproduce mg*dt in the settled control');
}

const totalRatios = results.map((r) => r.meanTotal / EXPECTED_FRAME_IMPULSE);
if (!totalRatios.every((ratio) => ratio > 1.9 && ratio < 2.1)) {
  throw new Error('E5.0a totalNormalImpulse did not retain the expected ~2x relax-iteration accumulation in the settled control');
}

console.log('E5.0a PASS: on the pinned Box3D substrate, settled support confirms two distinct quantitative signals: normalImpulse is the final-substep impulse (normalImpulse*substeps ~= mg*dt here), while raw totalNormalImpulse is ~2*mg*dt because the solver accumulation includes the relax iteration. The pinned native debug-force path corrects this with 0.5*totalNormalImpulse. E5 may therefore use 0.5*totalNormalImpulse as an outer-step normal-load estimate; this calibration does not make it a universal gameplay support policy.');
