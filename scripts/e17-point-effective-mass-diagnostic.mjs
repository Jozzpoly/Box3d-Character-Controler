import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE17IntentManipulatorCharacter } from '../src/e17-intent-manipulator-character.js';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
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

function inverseBoxInertiaDiagonal(mass, half) {
  const [hx, hy, hz] = half;
  const width = 2 * hx;
  const height = 2 * hy;
  const depth = 2 * hz;
  const ix = mass * (height * height + depth * depth) / 12;
  const iy = mass * (width * width + depth * depth) / 12;
  const iz = mass * (width * width + height * height) / 12;
  return [1 / ix, 1 / iy, 1 / iz];
}

function exactDirectionalEffectiveMass(body, coreMass, worldAnchor, direction, inverseInertiaDiagonal) {
  const n = normalize(direction);

  // This diagnostic intentionally uses a centred, axis-aligned primitive and evaluates
  // it before stepping the world. For that bounded fixture, body origin == COM and the
  // local principal-inertia axes are world axes. We therefore need no private binding API.
  const center = [0, 0, 0];
  b3.b3Body_GetPosition(center, body);
  const r = [worldAnchor[0] - center[0], worldAnchor[1] - center[1], worldAnchor[2] - center[2]];
  const rn = cross(r, n);
  const rotational =
    rn[0] * rn[0] * inverseInertiaDiagonal[0] +
    rn[1] * rn[1] * inverseInertiaDiagonal[1] +
    rn[2] * rn[2] * inverseInertiaDiagonal[2];
  const objectMass = b3.b3Body_GetMass(body);
  const invMassObject = 1 / objectMass;
  const invMassCore = 1 / coreMass;
  const k = invMassObject + invMassCore + rotational;
  return { r, n, rn, rotational, invMassObject, invMassCore, exactEffectiveMass: k > 0 ? 1 / k : 0 };
}

function scalarEffectiveMass(body, coreMass) {
  const objectMass = b3.b3Body_GetMass(body);
  return 1 / (1 / objectMass + 1 / coreMass);
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);
const character = createE17IntentManipulatorCharacter(b3, world, {
  startPosition: [0, 0, 0],
  gravity: 0,
  feedbackGain: 0,
});

const half = [0.35, 0.25, 0.20];
const center = [1.1, character.bodyPosition[1], 0];
const box = createDynamicBox(world, center, half);
const objectMass = b3.b3Body_GetMass(box);
const analyticInverseInertia = inverseBoxInertiaDiagonal(objectMass, half);
const direction = [-1, 0.15, 0.2];
const cases = [
  { name: 'center', anchor: [...center] },
  { name: 'mid-y', anchor: [center[0], center[1] + half[1] * 0.5, center[2]] },
  { name: 'edge-y', anchor: [center[0], center[1] + half[1], center[2]] },
  { name: 'corner-yz', anchor: [center[0], center[1] + half[1], center[2] + half[2]] },
];

const scalar = scalarEffectiveMass(box, character.bodyMass);
const evaluated = cases.map((entry) => {
  const exact = exactDirectionalEffectiveMass(box, character.bodyMass, entry.anchor, direction, analyticInverseInertia);
  return {
    ...entry,
    direction,
    scalarEffectiveMass: scalar,
    ...exact,
    scalarOverExact: exact.exactEffectiveMass > 0 ? scalar / exact.exactEffectiveMass : null,
  };
});

const report = {
  schema: 'e17-point-effective-mass-diagnostic-v3',
  objectMass,
  coreMass: character.bodyMass,
  halfExtents: half,
  scalarEffectiveMass: scalar,
  analyticInverseInertia,
  cases: evaluated,
  boundary: 'Measurement-only diagnostic. The fixture is a centred axis-aligned box evaluated before world stepping, so body position is the COM and analytic principal inertia is exact for this bounded case. Runtime behavior is unchanged.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const centerCase = evaluated[0];
const cornerCase = evaluated.at(-1);
if (Math.abs(centerCase.scalarOverExact - 1) > 1e-4) {
  throw new Error(`Center grab should reduce to scalar effective mass: ${JSON.stringify(centerCase)}`);
}
if (!(cornerCase.scalarOverExact > 2.0) || !(cornerCase.rotational > 0)) {
  throw new Error(`Off-centre leverage did not expose the expected strong scalar effective-mass mismatch: ${JSON.stringify(cornerCase)}`);
}

b3.b3DestroyWorld(world);
