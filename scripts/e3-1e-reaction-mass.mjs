import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;
const totalMass = 80;
const forward = [0, 0, 1];

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

function tick(world, organism) {
  organism.preStep(dt);
  b3.b3World_Step(world, dt, substeps);
  organism.postStep();
}

function runGrounded({ footMass, impulseNs }) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, {
    maxTorque: finiteTorque,
    footMass,
    torsoMass: totalMass - footMass,
  });

  for (let i = 0; i < 60; i++) tick(world, organism);
  const start = organism.telemetry();
  const startFoot = [...start.footCom];
  organism.applyPush({ impulseNs, direction: forward });

  let stableFrames = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let maxFootAngularSpeed = 0;
  let maxTorqueUtilization = 0;

  for (let i = 0; i < 480; i++) {
    tick(world, organism);
    const t = organism.telemetry();
    const footW = Math.hypot(t.footAngularVelocity[0], t.footAngularVelocity[2]);
    maxFootAngularSpeed = Math.max(maxFootAngularSpeed, footW);
    maxFootTravel = Math.max(
      maxFootTravel,
      Math.hypot(t.footCom[0] - startFoot[0], t.footCom[2] - startFoot[2]),
    );
    maxTorqueUtilization = Math.max(maxTorqueUtilization, t.torqueUtilization);
    stableFrames = t.recovered ? stableFrames + 1 : 0;
    if (stableFrames >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }

  const final = organism.telemetry();
  return {
    impulseNs,
    outcome: final.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: final.peakTilt * 180 / Math.PI,
    maxFootTravel,
    maxFootAngularSpeed,
    maxTorqueUtilization,
  };
}

function frontier(rows) {
  const recovers = rows.filter((r) => r.outcome === 'RECOVER');
  const falls = rows.filter((r) => r.outcome === 'FALL');
  return {
    maxRecover: recovers.length ? Math.max(...recovers.map((r) => r.impulseNs)) : 0,
    minFall: falls.length ? Math.min(...falls.map((r) => r.impulseNs)) : null,
    maxRecoveredFootTravel: recovers.length
      ? Math.max(...recovers.map((r) => r.maxFootTravel))
      : 0,
    maxRecoveredFootAngularSpeed: recovers.length
      ? Math.max(...recovers.map((r) => r.maxFootAngularSpeed))
      : 0,
  };
}

function runAirborne({ footMass, impulseNs }) {
  const world = makeWorld({ ground: false, gravity: 0 });
  const organism = new BalanceOrganism3D(b3, world, {
    maxTorque: finiteTorque,
    footMass,
    torsoMass: totalMass - footMass,
  });

  for (let i = 0; i < 30; i++) tick(world, organism);
  organism.applyPush({ impulseNs, direction: forward });

  let minTorsoTiltAfterOneSecond = Infinity;
  let minTorsoSpeedAfterOneSecond = Infinity;
  let peakFootAngularSpeed = 0;
  let peakFootTilt = 0;
  let finalTorqueUtilization = 0;

  for (let i = 0; i < 480; i++) {
    tick(world, organism);
    const t = organism.telemetry();
    const footW = Math.hypot(t.footAngularVelocity[0], t.footAngularVelocity[2]);
    peakFootAngularSpeed = Math.max(peakFootAngularSpeed, footW);
    peakFootTilt = Math.max(peakFootTilt, t.footTilt);
    if (i >= 60) {
      minTorsoTiltAfterOneSecond = Math.min(minTorsoTiltAfterOneSecond, t.torsoTilt);
      minTorsoSpeedAfterOneSecond = Math.min(minTorsoSpeedAfterOneSecond, t.horizontalAngularSpeed);
    }
    finalTorqueUtilization = t.torqueUtilization;
  }

  const final = organism.telemetry();
  return {
    impulseNs,
    finalTorsoTiltDeg: final.torsoTilt * 180 / Math.PI,
    finalTorsoAngularSpeed: final.horizontalAngularSpeed,
    finalFootTiltDeg: final.footTilt * 180 / Math.PI,
    finalFootAngularSpeed: Math.hypot(final.footAngularVelocity[0], final.footAngularVelocity[2]),
    minTorsoTiltAfterOneSecondDeg: minTorsoTiltAfterOneSecond * 180 / Math.PI,
    minTorsoSpeedAfterOneSecond,
    peakFootTiltDeg: peakFootTilt * 180 / Math.PI,
    peakFootAngularSpeed,
    finalTorqueUtilization,
  };
}

const masses = [2, 10, 30];
const groundedImpulses = [48, 64, 80, 96];

const groundedSummaries = new Map();
for (const footMass of masses) {
  const rows = groundedImpulses.map((impulseNs) => runGrounded({ footMass, impulseNs }));
  const summary = frontier(rows);
  groundedSummaries.set(footMass, summary);
  console.log(
    `E3.1e grounded footMass=${footMass}kg torsoMass=${totalMass - footMass}kg: ` +
    rows.map((r) => `${r.impulseNs}:${r.outcome[0]}(${r.peakTiltDeg.toFixed(0)}°,foot=${r.maxFootTravel.toFixed(2)}m,w=${r.maxFootAngularSpeed.toFixed(1)})`).join(' ') +
    ` => maxRecover=${summary.maxRecover}Ns minFall=${summary.minFall ?? 'OPEN'}Ns maxRecoveredFoot=${summary.maxRecoveredFootTravel.toFixed(3)}m`,
  );
}

const standard = groundedSummaries.get(10);
if (standard.maxRecover < 64 || standard.minFall === null || standard.minFall > 96) {
  throw new Error(`E3.1e standard-mass control drifted: ${standard.maxRecover}/${standard.minFall ?? 'OPEN'}Ns`);
}

for (const footMass of masses) {
  for (const impulseNs of [48, 64]) {
    const r = runAirborne({ footMass, impulseNs });
    console.log(
      `E3.1e airborne footMass=${footMass}kg impulse=${impulseNs}Ns: ` +
      `finalTorso=${r.finalTorsoTiltDeg.toFixed(2)}deg/${r.finalTorsoAngularSpeed.toFixed(3)}rad/s ` +
      `finalFoot=${r.finalFootTiltDeg.toFixed(1)}deg/${r.finalFootAngularSpeed.toFixed(2)}rad/s ` +
      `minTorsoAfter1s=${r.minTorsoTiltAfterOneSecondDeg.toFixed(2)}deg ` +
      `peakFoot=${r.peakFootTiltDeg.toFixed(1)}deg/${r.peakFootAngularSpeed.toFixed(2)}rad/s`,
    );
  }
}

console.log(
  'E3.1e diagnostic complete: total mass, footprint, torque budget and control gains were held fixed while reaction-mass distribution changed.',
);
