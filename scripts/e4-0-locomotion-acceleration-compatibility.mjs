import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { DONOR_PROFILE_V1, DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const TARGET_SPEED = DONOR_PROFILE_V1.maxSpeed;
const CURRENT_ACCEL = DONOR_PROFILE_V1.groundAcceleration;
const FINITE_TORQUE = 320;
const ACCEL_SWEEP = [4, 8, 12, 16, 20, 24, CURRENT_ACCEL];
const DIRECTIONS = [-1, 1];
const MODES = ['passive', 'finite'];
const LOAD_EPSILON = 1e-5;
const HOLD_FRAMES = 120;
const SETTLE_FRAMES = 90;
const STABLE_FRAMES_REQUIRED = 30;
const PLATFORM_HALF = [2.0, 0.25, 30.0];
const PLATFORM_Y = -PLATFORM_HALF[1];
const IDENTITY_QUAT = [0, 0, 0, 1];

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -DONOR_PROFILE_V1.gravity, 0];
  return b3.b3CreateWorld(wd);
}

function makePlatform(world) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_kinematicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0.95;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...PLATFORM_HALF);
  return { body, shape };
}

function createSupportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let points = 0;
    let touching = 0;
    let loaded = 0;
    let peakNormalImpulse = 0;
    let minSeparation = Infinity;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          points += 1;
          minSeparation = Math.min(minSeparation, point.separation);
          peakNormalImpulse = Math.max(
            peakNormalImpulse,
            Math.abs(point.normalImpulse ?? 0),
            Math.abs(point.totalNormalImpulse ?? 0),
          );
          if (point.separation <= 0) touching += 1;
          if (
            Math.abs(point.normalImpulse ?? 0) > LOAD_EPSILON ||
            Math.abs(point.totalNormalImpulse ?? 0) > LOAD_EPSILON
          ) loaded += 1;
        }
      }
    }

    return {
      manifold: points > 0,
      reactive: touching > 0 || loaded > 0,
      points,
      touching,
      loaded,
      peakNormalImpulse,
      minSeparation: points > 0 ? minSeparation : null,
    };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function classify(organism, recovered) {
  if (organism.fallObserved) return 'FALL';
  if (recovered) return 'RECOVER';
  return 'UNRESOLVED';
}

function runLaunch({ mode, direction, acceleration, substeps = SUBSTEPS }) {
  const world = makeWorld();
  const platform = makePlatform(world);
  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: mode === 'finite' ? FINITE_TORQUE : 0,
  });
  const support = createSupportReader(organism);
  let signal = support.read();

  const footLinearVelocity = [0, 0, 0];
  let platformZ = 0;
  let platformSpeed = 0;
  let frame = 0;
  let targetReachedFrame = -1;
  let firstSupportLossFrame = -1;
  let supportLossFrames = 0;
  let stableFrames = 0;
  let recovered = false;
  let maxFootRelativeDrift = 0;
  let maxFootSpeedError = 0;
  let maxAbsFootTilt = 0;
  let peakBalanceTorque = 0;
  let peakSupportImpulse = 0;
  let initialFootRelativeZ = 0;

  function step({ movePlatform = false } = {}) {
    if (movePlatform) {
      const target = direction * TARGET_SPEED;
      platformSpeed = moveToward(platformSpeed, target, acceleration * DT);
      platformZ += platformSpeed * DT;
      b3.b3Body_SetTargetTransform(
        platform.body,
        { position: [0, PLATFORM_Y, platformZ], quaternion: IDENTITY_QUAT },
        DT,
        true,
      );
      if (targetReachedFrame < 0 && Math.abs(platformSpeed - target) < 1e-9) {
        targetReachedFrame = frame;
      }
    }

    const supportedBefore = signal.reactive;
    organism.maxTorque = mode === 'finite' && supportedBefore ? FINITE_TORQUE : 0;
    organism.preStep(DT);
    peakBalanceTorque = Math.max(peakBalanceTorque, Math.abs(organism.lastBalanceTorque));
    b3.b3World_Step(world, DT, substeps);
    organism.postStep();
    signal = support.read();

    if (!signal.reactive) {
      supportLossFrames += 1;
      if (firstSupportLossFrame < 0) firstSupportLossFrame = frame;
    }
    peakSupportImpulse = Math.max(peakSupportImpulse, signal.peakNormalImpulse);

    b3.b3Body_GetLinearVelocity(footLinearVelocity, organism.foot);
    const relativeZ = organism.footCom[2] - platformZ - initialFootRelativeZ;
    maxFootRelativeDrift = Math.max(maxFootRelativeDrift, Math.abs(relativeZ));
    maxFootSpeedError = Math.max(maxFootSpeedError, Math.abs(footLinearVelocity[2] - platformSpeed));
    maxAbsFootTilt = Math.max(maxAbsFootTilt, Math.abs(organism.footTilt));

    if (targetReachedFrame >= 0) {
      const stableNow = organism.isRecovered() && signal.reactive;
      stableFrames = stableNow ? stableFrames + 1 : 0;
      if (stableFrames >= STABLE_FRAMES_REQUIRED) recovered = true;
    }

    frame += 1;
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step();
  if (!signal.reactive) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.0 ${mode} failed to establish reactive support before launch`);
  }
  initialFootRelativeZ = organism.footCom[2] - platformZ;
  supportLossFrames = 0;
  firstSupportLossFrame = -1;
  maxFootRelativeDrift = 0;
  maxFootSpeedError = 0;
  maxAbsFootTilt = 0;
  peakBalanceTorque = 0;
  peakSupportImpulse = 0;

  const maxRampFrames = Math.ceil(TARGET_SPEED / acceleration / DT) + 3;
  for (let i = 0; i < maxRampFrames && targetReachedFrame < 0; i++) step({ movePlatform: true });
  if (targetReachedFrame < 0) {
    support.destroy();
    b3.b3DestroyWorld(world);
    throw new Error(`E4.0 ${mode} acceleration=${acceleration} never reached target speed`);
  }
  for (let i = 0; i < HOLD_FRAMES; i++) step({ movePlatform: true });

  const telemetry = organism.telemetry();
  const result = {
    mode,
    direction,
    acceleration,
    targetSpeed: direction * TARGET_SPEED,
    substeps,
    outcome: classify(organism, recovered),
    peakTiltDeg: telemetry.peakAbsTilt * 180 / Math.PI,
    finalTiltDeg: telemetry.torsoTilt * 180 / Math.PI,
    maxFootTiltDeg: maxAbsFootTilt * 180 / Math.PI,
    maxFootRelativeDrift,
    maxFootSpeedError,
    supportLossFrames,
    firstSupportLossFrame,
    targetReachedFrame,
    peakBalanceTorque,
    peakSupportImpulse,
  };

  support.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

function printResult(r) {
  const dir = r.direction > 0 ? '+' : '-';
  console.log(
    `E4.0 ${r.mode.padEnd(7)} ${dir} a=${String(r.acceleration).padStart(2)} ` +
    `${r.outcome.padEnd(10)} peak=${r.peakTiltDeg.toFixed(2)}deg ` +
    `footDrift=${r.maxFootRelativeDrift.toFixed(3)}m ` +
    `vErr=${r.maxFootSpeedError.toFixed(3)}m/s supportLoss=${r.supportLossFrames} ` +
    `tau=${r.peakBalanceTorque.toFixed(1)}Nm`,
  );
}

if (DT !== 1 / 60 || SUBSTEPS !== 4 || TARGET_SPEED !== 5.2 || CURRENT_ACCEL !== 31) {
  throw new Error('E4.0 expected current Donor v1 locomotion envelope changed; requalify the experiment contract');
}

const results = [];
for (const mode of MODES) {
  for (const acceleration of ACCEL_SWEEP) {
    for (const direction of DIRECTIONS) {
      const result = runLaunch({ mode, direction, acceleration });
      results.push(result);
      printResult(result);
    }
  }
}

const finiteCurrent = results.filter(
  (r) => r.mode === 'finite' && r.acceleration === CURRENT_ACCEL,
);
if (finiteCurrent.length !== 2) throw new Error('E4.0 missing mirrored current-profile results');

const finiteRecoverAccel = {};
for (const direction of DIRECTIONS) {
  const side = results.filter((r) => r.mode === 'finite' && r.direction === direction);
  finiteRecoverAccel[direction] = side
    .filter((r) => r.outcome === 'RECOVER')
    .reduce((best, r) => Math.max(best, r.acceleration), -Infinity);
}

console.log('E4.0 current A‴ acceleration compatibility:', finiteCurrent.map((r) => ({
  direction: r.direction,
  outcome: r.outcome,
  peakTiltDeg: Number(r.peakTiltDeg.toFixed(3)),
  footDrift: Number(r.maxFootRelativeDrift.toFixed(4)),
  supportLossFrames: r.supportLossFrames,
})));
console.log('E4.0 highest recovered finite acceleration in declared sweep:', finiteRecoverAccel);
console.log('E4.0 PASS: harness completed; outcomes are observations, not tuning gates.');
