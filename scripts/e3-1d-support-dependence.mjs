import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;
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

function runGroundedTrial({ footHalfZ, impulseNs }) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, {
    maxTorque: finiteTorque,
    footHalf: [0.24, 0.055, footHalfZ],
  });

  for (let i = 0; i < 60; i++) tick(world, organism);
  const quiet = organism.telemetry();
  const startFoot = [...quiet.footCom];

  organism.applyPush({ impulseNs, direction: forward });

  let stableFrames = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let maxTorqueUtilization = 0;

  for (let i = 0; i < 480; i++) {
    tick(world, organism);
    const t = organism.telemetry();
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
  };
}

function compact(rows) {
  return rows
    .map((r) => `${r.impulseNs}:${r.outcome[0]}(${r.peakTiltDeg.toFixed(0)}°,foot=${r.maxFootTravel.toFixed(2)}m,u=${r.maxTorqueUtilization.toFixed(2)})`)
    .join(' ');
}

function runAirborneTrial({ impulseNs }) {
  const world = makeWorld({ ground: false, gravity: 0 });
  const organism = new BalanceOrganism3D(b3, world, { maxTorque: finiteTorque });

  for (let i = 0; i < 30; i++) tick(world, organism);
  organism.applyPush({ impulseNs, direction: forward });

  let torsoStableFrames = 0;
  let torsoRecoveredFrame = -1;
  let footTiltAtTorsoRecovery = null;
  let footAngularSpeedAtTorsoRecovery = null;
  let peakFootTilt = 0;
  let peakFootAngularSpeed = 0;

  for (let i = 0; i < 480; i++) {
    tick(world, organism);
    const t = organism.telemetry();
    const footAngularSpeed = Math.hypot(t.footAngularVelocity[0], t.footAngularVelocity[2]);
    peakFootTilt = Math.max(peakFootTilt, t.footTilt);
    peakFootAngularSpeed = Math.max(peakFootAngularSpeed, footAngularSpeed);

    const torsoOnlyStable = (
      t.torsoTilt <= 4 * Math.PI / 180 &&
      t.horizontalAngularSpeed <= 0.16
    );
    torsoStableFrames = torsoOnlyStable ? torsoStableFrames + 1 : 0;

    if (torsoStableFrames >= 30 && torsoRecoveredFrame < 0) {
      torsoRecoveredFrame = i - 28;
      footTiltAtTorsoRecovery = t.footTilt;
      footAngularSpeedAtTorsoRecovery = footAngularSpeed;
    }
  }

  const final = organism.telemetry();
  return {
    impulseNs,
    torsoRecovered: torsoRecoveredFrame >= 0,
    torsoRecoveredFrame,
    finalTorsoTiltDeg: final.torsoTilt * 180 / Math.PI,
    finalFootTiltDeg: final.footTilt * 180 / Math.PI,
    footTiltAtTorsoRecoveryDeg: footTiltAtTorsoRecovery === null
      ? null
      : footTiltAtTorsoRecovery * 180 / Math.PI,
    footAngularSpeedAtTorsoRecovery,
    peakFootTiltDeg: peakFootTilt * 180 / Math.PI,
    peakFootAngularSpeed,
    wholeOrganismRecovered: final.recovered,
  };
}

const impulses = [24, 36, 48, 64, 80, 96, 128];
const footprintCases = [
  { name: 'narrow', footHalfZ: 0.17 },
  { name: 'standard', footHalfZ: 0.34 },
  { name: 'wide', footHalfZ: 0.68 },
];

const footprintResults = new Map();
for (const spec of footprintCases) {
  const rows = impulses.map((impulseNs) => runGroundedTrial({ ...spec, impulseNs }));
  const summary = frontier(rows);
  footprintResults.set(spec.name, summary);
  console.log(
    `E3.1d footprint ${spec.name} zHalf=${spec.footHalfZ.toFixed(2)}m: ${compact(rows)} => maxRecover=${summary.maxRecover}Ns minFall=${summary.minFall ?? 'OPEN'}Ns maxRecoveredFoot=${summary.maxRecoveredFootTravel.toFixed(3)}m`,
  );
}

const standard = footprintResults.get('standard');
if (standard.maxRecover < 64 || standard.minFall === null || standard.minFall > 96) {
  throw new Error(
    `E3.1d control failed to reproduce the known standard-support frontier: ${standard.maxRecover}/${standard.minFall ?? 'OPEN'}Ns`,
  );
}

const airborne = [24, 48, 64, 80].map((impulseNs) => runAirborneTrial({ impulseNs }));
for (const r of airborne) {
  console.log(
    `E3.1d airborne ${r.impulseNs}Ns: torsoRecovered=${r.torsoRecovered} wholeRecovered=${r.wholeOrganismRecovered} finalTorso=${r.finalTorsoTiltDeg.toFixed(1)}deg finalFoot=${r.finalFootTiltDeg.toFixed(1)}deg footAtTorsoRecovery=${r.footTiltAtTorsoRecoveryDeg === null ? 'n/a' : r.footTiltAtTorsoRecoveryDeg.toFixed(1)}deg footW=${r.footAngularSpeedAtTorsoRecovery === null ? 'n/a' : r.footAngularSpeedAtTorsoRecovery.toFixed(2)}rad/s peakFoot=${r.peakFootTiltDeg.toFixed(1)}deg/${r.peakFootAngularSpeed.toFixed(2)}rad/s`,
  );
}

console.log(
  'E3.1d diagnostic complete: footprint sensitivity and support-free internal reorientation are observations only; interpret before promoting any new balance claim or capability.',
);
