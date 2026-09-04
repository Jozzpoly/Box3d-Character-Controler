import fs from 'node:fs';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function idKey(id) {
  if (!id) return 'null';
  return `${id.index1}:${id.world0}:${id.generation}`;
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);

const staticDef = b3.b3DefaultBodyDef();
staticDef.position = [0.65, 0, 0];
const targetBody = b3.b3CreateBody(world, staticDef);
const targetShape = b3.b3CreateBoxShape(targetBody, b3.b3DefaultShapeDef(), 0.35, 0.5, 0.5);

const dynamicDef = b3.b3DefaultBodyDef();
dynamicDef.type = b3.b3BodyType.b3_dynamicBody;
dynamicDef.position = [0, 0, 0];
dynamicDef.enableSleep = false;
const organBody = b3.b3CreateBody(world, dynamicDef);
const organShape = b3.b3CreateSphereShape(
  organBody,
  b3.b3DefaultShapeDef(),
  { center: [0, 0, 0], radius: 0.4 },
);

// Let the solver establish a stable contact manifold instead of inspecting the raw
// initial overlap. This is the same post-step timing the Owner-facing grab path will use.
for (let i = 0; i < 4; i++) b3.b3World_Step(world, 1 / 60, 4);

const contacts = b3.createContactsBuffer();
const contact = b3.createContact();
const manifold = b3.createManifold();
b3.getBodyContactData(contacts, organBody);
const count = b3.getNumContacts(contacts);

const bodyPositionA = [0, 0, 0];
const bodyPositionB = [0, 0, 0];
const rows = [];

for (let i = 0; i < count; i++) {
  b3.getContactAt(contact, contacts, i);
  const bodyA = b3.b3Shape_GetBody(contact.shapeIdA);
  const bodyB = b3.b3Shape_GetBody(contact.shapeIdB);
  b3.b3Body_GetPosition(bodyPositionA, bodyA);
  b3.b3Body_GetPosition(bodyPositionB, bodyB);

  const manifolds = [];
  for (let m = 0; m < contact.manifoldCount; m++) {
    b3.getManifoldAt(manifold, contact, m);
    const points = [];
    for (let p = 0; p < manifold.pointCount; p++) {
      const point = manifold.points[p];
      const anchorA = [...point.anchorA];
      const anchorB = [...point.anchorB];
      const worldA = add3(bodyPositionA, anchorA);
      const worldB = add3(bodyPositionB, anchorB);
      points.push({
        index: p,
        anchorA,
        anchorB,
        worldA,
        worldB,
        anchorGap: distance3(worldA, worldB),
        separation: point.separation,
        normalImpulse: point.normalImpulse,
      });
    }
    manifolds.push({
      index: m,
      pointCount: manifold.pointCount,
      normal: manifold.normal ? [...manifold.normal] : null,
      points,
    });
  }

  rows.push({
    index: i,
    shapeA: idKey(contact.shapeIdA),
    shapeB: idKey(contact.shapeIdB),
    bodyA: idKey(bodyA),
    bodyB: idKey(bodyB),
    containsOrgan: idKey(bodyA) === idKey(organBody) || idKey(bodyB) === idKey(organBody),
    containsTarget: idKey(bodyA) === idKey(targetBody) || idKey(bodyB) === idKey(targetBody),
    manifolds,
  });
}

const report = {
  schema: 'e16-contact-manifold-anchor-probe-v0',
  surface: {
    createManifold: typeof b3.createManifold,
    getManifoldAt: typeof b3.getManifoldAt,
    getBodyContactData: typeof b3.getBodyContactData,
    b3Body_GetPosition: typeof b3.b3Body_GetPosition,
  },
  ids: {
    organBody: idKey(organBody),
    targetBody: idKey(targetBody),
    organShape: idKey(organShape),
    targetShape: idKey(targetShape),
  },
  count,
  rows,
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (typeof b3.createManifold !== 'function' || typeof b3.getManifoldAt !== 'function') {
  throw new Error('E16 manifold reader surface is unavailable in installed box3d.js');
}
const matching = rows.find((row) => row.containsOrgan && row.containsTarget);
if (!matching) throw new Error('E16 manifold probe did not recover organ-target contact identity');
const points = matching.manifolds.flatMap((entry) => entry.points);
if (points.length < 1) throw new Error('E16 organ-target contact exposes no manifold points');
if (!points.every((point) => point.worldA.every(Number.isFinite) && point.worldB.every(Number.isFinite))) {
  throw new Error('E16 manifold anchors contain non-finite coordinates');
}

b3.destroyContactsBuffer?.(contacts);
b3.b3DestroyWorld(world);
