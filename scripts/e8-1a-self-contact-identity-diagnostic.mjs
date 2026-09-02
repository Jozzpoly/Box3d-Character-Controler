import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism, E3_SAGITTAL_DEFAULTS } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const G = DONOR_PROFILE_V1.gravity;
const IDENTITY = [0, 0, 0, 1];
const SQRT_HALF = Math.SQRT1_2;
const SAGITTAL_HINGE_FRAME = [SQRT_HALF, 0, SQRT_HALF, 0];
const AXIAL_FRAME = [0, 0, SQRT_HALF, SQRT_HALF];

const SEGMENT_MASS = 0.5;
const SEGMENT_LENGTH = 0.45;
const SEGMENT_HALF = [0.06, SEGMENT_LENGTH / 2, 0.06];
const TORSO_MASS = E3_SAGITTAL_DEFAULTS.torsoMass - 1;
const PLATFORM_HALF = [2, 0.25, 30];
const PLATFORM_Y = -PLATFORM_HALF[1];

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function sameBody(a, b) {
  return a.index1 === b.index1 && a.world0 === b.world0 && a.generation === b.generation;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makePlatform(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, PLATFORM_Y, 0];
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
  b3.b3CreateBoxShape(body, sd, ...PLATFORM_HALF);
  return body;
}

function makeSegment(world, position) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [...position];
  bd.linearDamping = 0.015;
  bd.angularDamping = 0.015;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  bd.motionLocks.linearX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForMass(SEGMENT_MASS, SEGMENT_HALF);
  sd.baseMaterial.friction = E3_SAGITTAL_DEFAULTS.footFriction;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...SEGMENT_HALF);
  return { body, shape };
}

function labelBody(body, ids) {
  for (const [label, id] of Object.entries(ids)) {
    if (sameBody(body, id)) return label;
  }
  return 'unknown';
}

function collectPairs(buffer, queriedLabel, ids, pairs) {
  const contact = b3.createContact();
  b3.getBodyContactData(buffer, ids[queriedLabel]);
  for (let i = 0; i < b3.getNumContacts(buffer); i++) {
    b3.getContactAt(contact, buffer, i);
    const bodyA = b3.b3Shape_GetBody(contact.shapeIdA);
    const bodyB = b3.b3Shape_GetBody(contact.shapeIdB);
    const a = labelBody(bodyA, ids);
    const b = labelBody(bodyB, ids);
    pairs.add([a, b].sort().join('<->'));
  }
}

if (typeof b3.b3Shape_GetBody !== 'function') {
  throw new Error('E8.1a contact identity diagnostic requires b3Shape_GetBody');
}

const world = makeWorld();
const platform = makePlatform(world);
const base = new SagittalBalanceOrganism(b3, world, {
  mode: 'finite',
  maxTorque: 320,
  torsoMass: TORSO_MASS,
});
const pivot = base.startTorsoPosition;
const proximal = makeSegment(world, [pivot[0], pivot[1] + SEGMENT_LENGTH / 2, pivot[2]]);
const distal = makeSegment(world, [pivot[0], pivot[1] + SEGMENT_LENGTH * 1.5, pivot[2]]);

const hinge = b3.b3DefaultRevoluteJointDef();
hinge.base.bodyIdA = base.torso;
hinge.base.bodyIdB = proximal.body;
hinge.base.localFrameA = { position: [0, 0, 0], quaternion: SAGITTAL_HINGE_FRAME };
hinge.base.localFrameB = { position: [0, -SEGMENT_LENGTH / 2, 0], quaternion: SAGITTAL_HINGE_FRAME };
hinge.enableSpring = false;
hinge.enableLimit = true;
hinge.lowerAngle = 0;
hinge.upperAngle = 0;
hinge.enableMotor = false;
b3.b3CreateRevoluteJoint(world, hinge);

const guide = b3.b3DefaultPrismaticJointDef();
guide.base.bodyIdA = proximal.body;
guide.base.bodyIdB = distal.body;
guide.base.localFrameA = { position: [0, 0, 0], quaternion: AXIAL_FRAME };
guide.base.localFrameB = { position: [0, 0, 0], quaternion: AXIAL_FRAME };
guide.enableSpring = false;
guide.enableLimit = true;
guide.lowerTranslation = SEGMENT_LENGTH;
guide.upperTranslation = SEGMENT_LENGTH;
guide.enableMotor = false;
b3.b3CreatePrismaticJoint(world, guide);

const spring = b3.b3DefaultDistanceJointDef();
spring.base.bodyIdA = proximal.body;
spring.base.bodyIdB = distal.body;
spring.base.localFrameA = { position: [0, 0, 0], quaternion: IDENTITY };
spring.base.localFrameB = { position: [0, 0, 0], quaternion: IDENTITY };
spring.length = SEGMENT_LENGTH;
spring.enableSpring = true;
spring.lowerSpringForce = 0;
spring.upperSpringForce = 200;
spring.hertz = 8;
spring.dampingRatio = 1;
spring.enableLimit = false;
spring.enableMotor = false;
const springJoint = b3.b3CreateDistanceJoint(world, spring);
b3.b3DistanceJoint_SetSpringForceRange(springJoint, 0, 200);

const ids = {
  torso: base.torso,
  foot: base.foot,
  proximal: proximal.body,
  distal: distal.body,
  platform,
};
const proximalBuffer = b3.createContactsBuffer();
const distalBuffer = b3.createContactsBuffer();
const pairs = new Set();

for (let frame = 0; frame < 12; frame++) {
  b3.b3World_Step(world, DT, SUBSTEPS);
  collectPairs(proximalBuffer, 'proximal', ids, pairs);
  collectPairs(distalBuffer, 'distal', ids, pairs);
}

const torsoTop = pivot[1] + E3_SAGITTAL_DEFAULTS.torsoHalf[1];
const distalBottom = pivot[1] + SEGMENT_LENGTH;
const geometricOverlap = torsoTop - distalBottom;
const orderedPairs = [...pairs].sort();

console.log('E8.1a split-probe self-contact identity diagnostic');
console.log(
  `  geometry: torsoTop=${torsoTop.toFixed(6)}m distalBottom=${distalBottom.toFixed(6)}m ` +
  `nominalOverlap=${geometricOverlap.toFixed(6)}m`,
);
console.log(`  observed auxiliary contact pairs: ${orderedPairs.length ? orderedPairs.join(', ') : 'none'}`);
console.log(
  '  direct torso<->proximal and proximal<->distal joint pairs are expected to have connected-body collision disabled by default; distal<->torso is not a direct joint pair.',
);

if (geometricOverlap < 0.09 || geometricOverlap > 0.11) {
  throw new Error(`E8.1a diagnostic expected ~0.10m nominal torso/distal overlap, got ${geometricOverlap}`);
}
if (!pairs.has('distal<->torso')) {
  throw new Error(`E8.1a diagnostic did not reproduce distal<->torso self-contact: ${orderedPairs.join(', ')}`);
}
if (pairs.has('proximal<->torso')) {
  throw new Error('E8.1a diagnostic unexpectedly found torso<->proximal contact despite direct revolute connection');
}
if (pairs.has('distal<->proximal')) {
  throw new Error('E8.1a diagnostic unexpectedly found proximal<->distal contact despite direct guide connection');
}

b3.destroyContactsBuffer(proximalBuffer);
b3.destroyContactsBuffer(distalBuffer);
b3.b3DestroyWorld(world);

console.log(
  'E8.1a contact-identity PASS: splitting the E7 probe creates a real distal<->torso self-contact because the distal segment overlaps the torso while no longer being directly joint-connected to it. This diagnoses the first E8.1a mechanism-integrity failure; it does not qualify any collision-filter correction or embodied representation.',
);
