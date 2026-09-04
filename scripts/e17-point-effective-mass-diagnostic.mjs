import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17IntentManipulatorCharacter } from '../src/e17-intent-manipulator-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function mulMatVec(m, v) {
  return [
    m.cx.x * v[0] + m.cy.x * v[1] + m.cz.x * v[2],
    m.cx.y * v[0] + m.cy.y * v[1] + m.cz.y * v[2],
    m.cx.z * v[0] + m.cy.z * v[1] + m.cz.z * v[2],
  ];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v) {
  const n = Math.hypot(...v);
  return n > 1e-12 ? v.map((x) => x / n) : [1, 0, 0];
}

function createDynamicBox(world, position, half = [0.35, 0.25, 0.20], density = 80) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = density;
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function exactDirectionalEffectiveMass(body, coreMass, worldAnchor, direction) {
  const n = normalize(direction);
  const center = [0, 0, 0];
  b3.b3Body_GetWorldCenter(center, body);
  const r = [
    worldAnchor[0] - center[0],
    worldAnchor[1] - center[1],
    worldAnchor[2] - center[2],
  ];
  const invI = b3.b3Body_GetWorldInverseRotationalInertia(body);
  const rn = cross(r, n);
  const rotational = dot(rn, mulMatVec(invI, rn));
  const invMassObject = b3.b3Body_GetInverseMass(body);
  const invMassCore = 1 / coreMass;
  const k = invMassObject + invMassCore + rotational;
  return {
    r,
    n,
    rotational,
    invMassObject,
    invMassCore,
    exactEffectiveMass: k > 0 ? 1 / k : 0,
  };
}

function scalarEffectiveMass(body, coreMass) {
  const objectMass = b3.b3Body_GetMass(body);
  return 1 / (1 / objectMass + 1 / coreMass);
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  return b3.b3CreateWorld(wd);
}

const world = makeWorld();
const character = createE17IntentManipulatorCharacter(b3, world, {
  startPosition: [0, 0, 0],
  gravity: 0,
  feedbackGain: 0,
  manipulatorMaxForce: 900,
});

const center = [1.1, character.bodyPosition[1], 0];
const box = createDynamicBox(world, center);
const objectMass = b3.b3Body_GetMass(box);
const halfY = 0.25;
const halfZ = 0.20;

const cases = [
  { name: 'center', anchor: [...center], direction: [-1, 0.15, 0.2] },
  { name: 'mid-y', anchor: [center[0], center[1] + halfY * 0.5, center[2]], direction: [-1, 0.15, 0.2] },
  { name: 'edge-y', anchor: [center[0], center[1] + halfY, center[2]], direction: [-1, 0.15, 0.2] },
  { name: 'corner-yz', anchor: [center[0], center[1] + halfY, center[2] + halfZ], direction: [-1, 0.15, 0.2] },
];

const scalar = scalarEffectiveMass(box, character.bodyMass);
const evaluated = cases.map((entry) => {
  const exact = exactDirectionalEffectiveMass(box, character.bodyMass, entry.anchor, entry.direction);
  return {
    ...entry,
    scalarEffectiveMass: scalar,
    ...exact,
    scalarOverExact: exact.exactEffectiveMass > 0 ? scalar / exact.exactEffectiveMass : null,
  };
});

const report = {
  schema: 'e17-point-effective-mass-diagnostic-v1',
  objectMass,
  coreMass: character.bodyMass,
  scalarEffectiveMass: scalar,
  inverseInertiaShape: b3.b3Body_GetWorldInverseRotationalInertia(box),
  cases: evaluated,
  boundary: 'Measurement-only diagnostic. It tests whether E17 scalar effective mass diverges from Box3D directional point effective mass as leverage increases. No runtime behavior is changed.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const centerCase = evaluated[0];
const cornerCase = evaluated.at(-1);
if (Math.abs(centerCase.scalarOverExact - 1) > 1e-4) {
  throw new Error(`Center grab should reduce to scalar effective mass: ${JSON.stringify(centerCase)}`);
}
if (!(cornerCase.scalarOverExact > 1.15) || !(cornerCase.rotational > 0)) {
  throw new Error(`Off-centre leverage did not expose a meaningful scalar effective-mass mismatch: ${JSON.stringify(cornerCase)}`);
}

b3.b3DestroyWorld(world);
