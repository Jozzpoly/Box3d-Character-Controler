import fs from 'node:fs';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function length(v) {
  return Math.hypot(...v);
}

function normalize(v) {
  const n = length(v);
  return n > 1e-12 ? scale(v, 1 / n) : [1, 0, 0];
}

function createDynamicBox(world, position, half, density) {
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

function pointDirectionalMass(objectMass, coreMass, r, n, inverseInertiaDiagonal) {
  const rn = cross(r, n);
  const rotational =
    rn[0] * rn[0] * inverseInertiaDiagonal[0] +
    rn[1] * rn[1] * inverseInertiaDiagonal[1] +
    rn[2] * rn[2] * inverseInertiaDiagonal[2];
  const k = 1 / objectMass + 1 / coreMass + rotational;
  return {
    mass: 1 / k,
    rotational,
    rn,
  };
}

function samplePointVelocity(body, point) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, point);
  return out;
}

function runCase(anchorOffset, mode) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);

  const objectHalf = [0.35, 0.25, 0.20];
  const objectDensity = 80;
  const objectCenter = [0, 0, 0];
  const object = createDynamicBox(world, objectCenter, objectHalf, objectDensity);
  const objectMass = b3.b3Body_GetMass(object);

  const coreHalf = [0.25, 0.25, 0.25];
  const desiredCoreMass = 35;
  const coreVolume = (2 * coreHalf[0]) * (2 * coreHalf[1]) * (2 * coreHalf[2]);
  const core = createDynamicBox(world, [-3, 0, 0], coreHalf, desiredCoreMass / coreVolume);
  const coreMass = b3.b3Body_GetMass(core);

  const anchor = add(objectCenter, anchorOffset);
  const coreCenter = [0, 0, 0];
  b3.b3Body_GetPosition(coreCenter, core);

  const direction = normalize([-1, 0.15, 0.2]);
  const desiredRelativeDeltaSpeed = 1;
  const inverseInertia = inverseBoxInertiaDiagonal(objectMass, objectHalf);
  const scalarMass = 1 / (1 / objectMass + 1 / coreMass);
  const point = pointDirectionalMass(objectMass, coreMass, anchorOffset, direction, inverseInertia);
  const actuatorMass = mode === 'point' ? point.mass : scalarMass;
  const impulse = scale(direction, actuatorMass * desiredRelativeDeltaSpeed);

  const objectBefore = samplePointVelocity(object, anchor);
  const coreBefore = samplePointVelocity(core, coreCenter);
  const relativeBefore = sub(objectBefore, coreBefore);

  b3.b3Body_ApplyLinearImpulse(object, impulse, anchor, true);
  b3.b3Body_ApplyLinearImpulseToCenter(core, scale(impulse, -1), true);

  const objectAfter = samplePointVelocity(object, anchor);
  const coreAfter = samplePointVelocity(core, coreCenter);
  const relativeAfter = sub(objectAfter, coreAfter);
  const relativeDelta = sub(relativeAfter, relativeBefore);
  const projectedDeltaSpeed = dot(relativeDelta, direction);
  const lateralDelta = sub(relativeDelta, scale(direction, projectedDeltaSpeed));
  const angularVelocity = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(angularVelocity, object);

  const result = {
    mode,
    objectMass,
    coreMass,
    anchorOffset,
    direction,
    scalarMass,
    pointDirectionalMass: point.mass,
    scalarOverPoint: scalarMass / point.mass,
    rotationalTerm: point.rotational,
    impulseMagnitude: length(impulse),
    desiredRelativeDeltaSpeed,
    projectedRelativeDeltaSpeed: projectedDeltaSpeed,
    projectedGain: projectedDeltaSpeed / desiredRelativeDeltaSpeed,
    lateralDeltaSpeed: length(lateralDelta),
    angularSpeed: length(angularVelocity),
  };

  b3.b3DestroyWorld(world);
  return result;
}

const caseOffsets = {
  center: [0, 0, 0],
  corner: [0, 0.25, 0.20],
};

const report = {
  schema: 'e17-point-impulse-ab-v1',
  cases: {},
  boundary: 'Instantaneous Box3D impulse-response A/B. It isolates only the scalar reduced-mass assumption versus inertia-aware directional point mass. It does not change E17 runtime, tune force/rate, or establish Owner feel.',
};

for (const [name, offset] of Object.entries(caseOffsets)) {
  report.cases[name] = {
    scalar: runCase(offset, 'scalar'),
    point: runCase(offset, 'point'),
  };
}

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

const center = report.cases.center;
const corner = report.cases.corner;
if (Math.abs(center.scalar.projectedGain - 1) > 1e-4 || Math.abs(center.point.projectedGain - 1) > 1e-4) {
  throw new Error(`Center A/B should both reproduce requested response: ${JSON.stringify(center)}`);
}
if (!(corner.scalar.projectedGain > 2.0)) {
  throw new Error(`Current scalar actuator did not show expected off-centre overshoot: ${JSON.stringify(corner.scalar)}`);
}
if (Math.abs(corner.point.projectedGain - 1) > 1e-4) {
  throw new Error(`Point-mass actuator did not reproduce requested projected response: ${JSON.stringify(corner.point)}`);
}
if (!(corner.point.angularSpeed > 0) || !(corner.point.angularSpeed < corner.scalar.angularSpeed)) {
  throw new Error(`Point correction should preserve leverage while reducing overdrive: ${JSON.stringify(corner)}`);
}
