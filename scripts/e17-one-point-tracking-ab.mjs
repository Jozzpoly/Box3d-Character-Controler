import fs from 'node:fs';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
const DT = 1 / 60;
const SUBSTEPS = 4;
const RATE = 10;
const MAX_FORCE = 900;

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
function length(v) { return Math.hypot(...v); }
function normalize(v) {
  const n = length(v);
  return n > 1e-12 ? scale(v, 1 / n) : [1, 0, 0];
}
function clampMagnitude(v, maxLength) {
  const n = length(v);
  return n > maxLength && n > 1e-12 ? scale(v, maxLength / n) : [...v];
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
  const w = 2 * hx;
  const h = 2 * hy;
  const d = 2 * hz;
  return [
    1 / (mass * (h * h + d * d) / 12),
    1 / (mass * (w * w + d * d) / 12),
    1 / (mass * (w * w + h * h) / 12),
  ];
}

function getPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}
function getWorldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}
function getPointVelocity(body, worldPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPointVelocity(out, body, worldPoint);
  return out;
}
function getAngularSpeed(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return length(out);
}

function worldPrincipalAxes(body) {
  const center = getPosition(body);
  return [
    normalize(sub(getWorldPoint(body, [1, 0, 0]), center)),
    normalize(sub(getWorldPoint(body, [0, 1, 0]), center)),
    normalize(sub(getWorldPoint(body, [0, 0, 1]), center)),
  ];
}

function directionalPointMass(body, objectMass, coreMass, anchorWorld, direction, inverseInertiaDiagonal) {
  const center = getPosition(body);
  const r = sub(anchorWorld, center);
  const n = normalize(direction);
  const rn = cross(r, n);
  const axes = worldPrincipalAxes(body);
  const rotational =
    dot(rn, axes[0]) ** 2 * inverseInertiaDiagonal[0] +
    dot(rn, axes[1]) ** 2 * inverseInertiaDiagonal[1] +
    dot(rn, axes[2]) ** 2 * inverseInertiaDiagonal[2];
  return 1 / (1 / objectMass + 1 / coreMass + rotational);
}

function runCase(anchorLocal, mode) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);

  const objectHalf = [0.35, 0.25, 0.20];
  const object = createDynamicBox(world, [0, 0, 0], objectHalf, 80);
  const objectMass = b3.b3Body_GetMass(object);
  const inverseInertia = inverseBoxInertiaDiagonal(objectMass, objectHalf);

  const coreHalf = [0.25, 0.25, 0.25];
  const coreVolume = 8 * coreHalf[0] * coreHalf[1] * coreHalf[2];
  const core = createDynamicBox(world, [-3, 0, 0], coreHalf, 35 / coreVolume);
  const coreMass = b3.b3Body_GetMass(core);

  const initialAnchor = getWorldPoint(object, anchorLocal);
  const targetDirection = normalize([-1, 0.15, 0.2]);
  const targetDistance = 0.12;
  const target = add(initialAnchor, scale(targetDirection, targetDistance));
  const scalarMass = 1 / (1 / objectMass + 1 / coreMass);

  let peakError = 0;
  let sumError = 0;
  let peakAngularSpeed = 0;
  let maxOvershoot = 0;
  let peakCrossTrack = 0;
  let saturationFrames = 0;
  let totalImpulse = 0;
  let signCrossings = 0;
  let previousAlongError = targetDistance;
  const frames = [];

  for (let frame = 0; frame < 120; frame++) {
    const anchor = getWorldPoint(object, anchorLocal);
    const anchorVelocity = getPointVelocity(object, anchor);
    const error = sub(target, anchor);
    const errorLength = length(error);
    const desiredVelocity = scale(error, RATE);
    const requestedDeltaV = sub(desiredVelocity, anchorVelocity);

    let actuatorMass = scalarMass;
    if (mode === 'point' && length(requestedDeltaV) > 1e-9) {
      actuatorMass = directionalPointMass(
        object,
        objectMass,
        coreMass,
        anchor,
        requestedDeltaV,
        inverseInertia,
      );
    }

    const requestedImpulse = scale(requestedDeltaV, actuatorMass);
    const impulse = clampMagnitude(requestedImpulse, MAX_FORCE * DT);
    if (length(requestedImpulse) > MAX_FORCE * DT + 1e-9) saturationFrames += 1;
    totalImpulse += length(impulse);

    if (length(impulse) > 1e-10) {
      b3.b3Body_ApplyLinearImpulse(object, impulse, anchor, true);
      b3.b3Body_ApplyLinearImpulseToCenter(core, scale(impulse, -1), true);
    }

    b3.b3World_Step(world, DT, SUBSTEPS);

    const afterAnchor = getWorldPoint(object, anchorLocal);
    const displacement = sub(afterAnchor, initialAnchor);
    const progress = dot(displacement, targetDirection);
    const crossTrack = length(sub(displacement, scale(targetDirection, progress)));
    const alongError = targetDistance - progress;

    if (Math.sign(alongError) !== Math.sign(previousAlongError) && Math.abs(alongError) > 1e-5) signCrossings += 1;
    previousAlongError = alongError;
    maxOvershoot = Math.max(maxOvershoot, Math.max(0, progress - targetDistance));
    peakCrossTrack = Math.max(peakCrossTrack, crossTrack);
    peakError = Math.max(peakError, errorLength);
    sumError += errorLength;
    peakAngularSpeed = Math.max(peakAngularSpeed, getAngularSpeed(object));

    if (frame % 10 === 0 || frame === 119) {
      frames.push({ frame, error: errorLength, progress, crossTrack, angularSpeed: getAngularSpeed(object), impulse: length(impulse) });
    }
  }

  const finalAnchor = getWorldPoint(object, anchorLocal);
  const finalError = length(sub(target, finalAnchor));
  const finalAngularSpeed = getAngularSpeed(object);
  const result = {
    mode,
    anchorLocal,
    objectMass,
    coreMass,
    scalarMass,
    targetDistance,
    finalError,
    meanError: sumError / 120,
    peakError,
    maxOvershoot,
    peakCrossTrack,
    peakAngularSpeed,
    finalAngularSpeed,
    saturationFrames,
    totalImpulse,
    signCrossings,
    frames,
  };

  b3.b3DestroyWorld(world);
  return result;
}

const report = {
  schema: 'e17-one-point-tracking-ab-v1',
  center: {
    scalar: runCase([0, 0, 0], 'scalar'),
    point: runCase([0, 0, 0], 'point'),
  },
  corner: {
    scalar: runCase([0, 0.25, 0.20], 'scalar'),
    point: runCase([0, 0.25, 0.20], 'point'),
  },
  boundary: '120-frame zero-gravity tracking A/B with one grip, one fixed target, identical rate=10 and maxForce=900. Point mode changes only directional point effective-mass accounting. No browser/runtime E17 change and no Owner-feel claim.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

for (const group of [report.center, report.corner]) {
  for (const result of [group.scalar, group.point]) {
    for (const key of ['finalError', 'meanError', 'peakAngularSpeed', 'totalImpulse']) {
      if (!Number.isFinite(result[key])) throw new Error(`Non-finite ${key}: ${JSON.stringify(result)}`);
    }
  }
}

// Harness invariant only: at the COM the rotational term is zero, so both modes should remain equivalent.
if (Math.abs(report.center.scalar.finalError - report.center.point.finalError) > 1e-5 ||
    Math.abs(report.center.scalar.totalImpulse - report.center.point.totalImpulse) > 1e-4) {
  throw new Error(`Center tracking A/B unexpectedly diverged: ${JSON.stringify(report.center)}`);
}
