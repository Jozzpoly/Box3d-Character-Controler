import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;

function makeWorld({ ground = true, gravity = -20 } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, gravity, 0];
  const world = b3.b3CreateWorld(worldDef);

  if (ground) {
    const groundDef = b3.b3DefaultBodyDef();
    groundDef.position = [0, -0.10, 0];
    const groundBody = b3.b3CreateBody(world, groundDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = 0.95;
    shapeDef.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(groundBody, shapeDef, 6, 0.10, 6);
  }
  return world;
}

function inspectFootContacts(organism, contactsBuffer, contact, manifold) {
  b3.getBodyContactData(contactsBuffer, organism.foot);
  const contactCount = b3.getNumContacts(contactsBuffer);
  let manifoldCount = 0;
  let pointCount = 0;
  let supportPoints = 0;
  let maxNormalImpulse = 0;
  let maxAbsNormalY = 0;

  for (let i = 0; i < contactCount; i++) {
    b3.getContactAt(contact, contactsBuffer, i);
    manifoldCount += contact.manifoldCount;
    for (let m = 0; m < contact.manifoldCount; m++) {
      b3.getManifoldAt(manifold, contact, m);
      maxAbsNormalY = Math.max(maxAbsNormalY, Math.abs(manifold.normal[1]));
      for (let p = 0; p < manifold.pointCount; p++) {
        const point = manifold.points[p];
        pointCount += 1;
        maxNormalImpulse = Math.max(maxNormalImpulse, point.normalImpulse);
        if (Math.abs(manifold.normal[1]) >= 0.5 && point.normalImpulse > 1e-5) {
          supportPoints += 1;
        }
      }
    }
  }

  return {
    contactCount,
    manifoldCount,
    pointCount,
    supportPoints,
    maxNormalImpulse,
    maxAbsNormalY,
  };
}

function runCase({ name, ground, gravity }) {
  const world = makeWorld({ ground, gravity });
  const organism = new BalanceOrganism3D(b3, world, { maxTorque: 0, mode: 'passive' });
  const contactsBuffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  let maxSupportPoints = 0;
  let maxContactCount = 0;
  let final = null;

  for (let i = 0; i < 90; i++) {
    organism.preStep(dt);
    b3.b3World_Step(world, dt, substeps);
    organism.postStep();
    final = inspectFootContacts(organism, contactsBuffer, contact, manifold);
    maxSupportPoints = Math.max(maxSupportPoints, final.supportPoints);
    maxContactCount = Math.max(maxContactCount, final.contactCount);
  }

  b3.destroyContactsBuffer(contactsBuffer);
  b3.b3DestroyWorld(world);

  console.log(
    `E3.1g ${name}: contacts=${final.contactCount} manifolds=${final.manifoldCount} points=${final.pointCount} ` +
    `supportPoints=${final.supportPoints} maxSupportPoints=${maxSupportPoints} maxContacts=${maxContactCount} ` +
    `maxNormalImpulse=${final.maxNormalImpulse.toFixed(5)} maxAbsNormalY=${final.maxAbsNormalY.toFixed(3)}`,
  );
  return { ...final, maxSupportPoints, maxContactCount };
}

for (const name of [
  'createContactsBuffer',
  'getBodyContactData',
  'getNumContacts',
  'createContact',
  'getContactAt',
  'createManifold',
  'getManifoldAt',
  'destroyContactsBuffer',
]) {
  if (typeof b3[name] !== 'function') {
    throw new Error(`E3.1g exact box3d.js binding is missing ${name}().`);
  }
}

const grounded = runCase({ name: 'grounded', ground: true, gravity: -20 });
const unsupported = runCase({ name: 'unsupported-zero-g', ground: false, gravity: 0 });

if (grounded.maxSupportPoints <= 0 || grounded.maxContactCount <= 0) {
  throw new Error('E3.1g body-contact binding did not expose grounded foot support.');
}
if (grounded.maxAbsNormalY < 0.5 || grounded.maxNormalImpulse <= 1e-5) {
  throw new Error('E3.1g grounded contact data lacks a load-bearing near-vertical manifold point.');
}
if (unsupported.maxContactCount !== 0 || unsupported.maxSupportPoints !== 0) {
  throw new Error('E3.1g unsupported control unexpectedly reported foot contact.');
}

console.log(
  'E3.1g support-contact binding PASS: exact box3d.js@0.1.1 reusable body-contact facade distinguishes loaded foot/ground support from an unsupported control.',
);
