import fs from 'node:fs';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function idKey(id) {
  if (!id) return 'null';
  return `${id.index1}:${id.world0}:${id.generation}`;
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

b3.b3World_Step(world, 1 / 60, 4);
const buffer = b3.createContactsBuffer();
const contact = b3.createContact();
b3.getBodyContactData(buffer, organBody);
const count = b3.getNumContacts(buffer);

const rows = [];
for (let i = 0; i < count; i++) {
  b3.getContactAt(contact, buffer, i);
  const bodyA = b3.b3Shape_GetBody(contact.shapeIdA);
  const bodyB = b3.b3Shape_GetBody(contact.shapeIdB);
  rows.push({
    index: i,
    contactKeys: Object.keys(contact).sort(),
    shapeA: idKey(contact.shapeIdA),
    shapeB: idKey(contact.shapeIdB),
    bodyA: idKey(bodyA),
    bodyB: idKey(bodyB),
    manifoldCount: contact.manifoldCount,
    containsOrgan: idKey(bodyA) === idKey(organBody) || idKey(bodyB) === idKey(organBody),
    containsTarget: idKey(bodyA) === idKey(targetBody) || idKey(bodyB) === idKey(targetBody),
  });
}

const report = {
  schema: 'e16-contact-identity-binding-probe-v0',
  surface: {
    createContact: typeof b3.createContact,
    getContactAt: typeof b3.getContactAt,
    b3Shape_GetBody: typeof b3.b3Shape_GetBody,
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

if (count < 1) throw new Error('E16 contact identity probe produced no contact');
if (!rows.some((row) => row.containsOrgan && row.containsTarget)) {
  throw new Error(`E16 contact identity could not recover the opposite body: ${JSON.stringify(rows)}`);
}

b3.destroyContactsBuffer?.(buffer);
b3.b3DestroyWorld(world);
