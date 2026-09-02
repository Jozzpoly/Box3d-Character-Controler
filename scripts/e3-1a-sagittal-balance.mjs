import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;

function makeWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.10, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0.95;
  groundShape.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, groundShape, 4, 0.10, 4);
  return world;
}

function tick(world, organism) {
  organism.preStep(dt);
  b3.b3World_Step(world, dt, substeps);
  organism.postStep();
}

function runTrial({ mode, maxTorque, impulseNs, direction = 1, leverArm = 0.36, footFriction = 0.95 }) {
  const world = makeWorld();
  const organism = new SagittalBalanceOrganism(b3, world, { mode, maxTorque, footFriction });
  for (let i = 0; i < 45; i++) tick(world, organism);
  const quiet = organism.telemetry();
  if (Math.abs(quiet.torsoTilt) > 0.02 || Math.abs(quiet.footTilt) > 0.02) {
    throw new Error(`E3.1a quiet-state instability before push: mode=${mode} torso=${quiet.torsoTilt} foot=${quiet.footTilt}`);
  }

  const startFootZ = quiet.footCom[2];
  organism.applyPush({ impulseNs, direction, leverArm });
  let stableFrames = 0;
  let recoveredFrame = -1;
  let peakTorqueUtilization = 0;
  let maxFootTilt = 0;
  let maxFootTravel = 0;
  for (let i = 0; i < 420; i++) {
    tick(world, organism);
    const t = organism.telemetry();
    peakTorqueUtilization = Math.max(peakTorqueUtilization, t.torqueUtilization);
    maxFootTilt = Math.max(maxFootTilt, Math.abs(t.footTilt));
    maxFootTravel = Math.max(maxFootTravel, Math.abs(t.footCom[2] - startFootZ));
    if (t.recovered) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }

  const final = organism.telemetry();
  const outcome = final.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  return {
    mode,
    maxTorque: organism.maxTorque,
    supportMomentScale: organism.supportMomentScale,
    impulseNs,
    direction,
    leverArm,
    footFriction,
    outcome,
    recoveredFrame,
    peakTiltDeg: final.peakAbsTilt * 180 / Math.PI,
    maxFootTiltDeg: maxFootTilt * 180 / Math.PI,
    maxFootTravel,
    peakTorqueUtilization,
    finalTiltDeg: final.torsoTilt * 180 / Math.PI,
    finalOmega: final.torsoAngularSpeed,
  };
}

function compact(rows) {
  return rows
    .map((r) => `${r.impulseNs}:${r.outcome[0]}(${r.peakTiltDeg.toFixed(0)}°,foot=${r.maxFootTravel.toFixed(2)}m,u=${r.peakTorqueUtilization.toFixed(2)})`)
    .join(' ');
}

function summarizeFrontier(rows) {
  const recovers = rows.filter((r) => r.outcome === 'RECOVER');
  const falls = rows.filter((r) => r.outcome === 'FALL');
  return {
    maxRecover: recovers.length ? Math.max(...recovers.map((r) => r.impulseNs)) : 0,
    minFall: falls.length ? Math.min(...falls.map((r) => r.impulseNs)) : null,
    maxRecoveredFootTravel: recovers.length ? Math.max(...recovers.map((r) => r.maxFootTravel)) : 0,
  };
}

const impulseSweep = [2, 4, 6, 8, 10, 12, 16, 20, 24, 30, 36, 48, 64, 80, 96, 128];
const passive = impulseSweep.map((impulseNs) => runTrial({ mode: 'passive', maxTorque: 0, impulseNs }));
const finiteTorque = 320;
const finite = impulseSweep.map((impulseNs) => runTrial({ mode: 'finite', maxTorque: finiteTorque, impulseNs }));
const lowFriction = [12, 24, 48, 80].map((impulseNs) => runTrial({
  mode: 'finite',
  maxTorque: finiteTorque,
  impulseNs,
  footFriction: 0.18,
}));

const mirrorPositive = runTrial({ mode: 'finite', maxTorque: finiteTorque, impulseNs: 12, direction: 1 });
const mirrorNegative = runTrial({ mode: 'finite', maxTorque: finiteTorque, impulseNs: 12, direction: -1 });
if (mirrorPositive.outcome !== mirrorNegative.outcome) {
  throw new Error(`Mirrored E3.1a outcomes diverged: +${mirrorPositive.outcome} / -${mirrorNegative.outcome}`);
}
if (Math.abs(mirrorPositive.peakTiltDeg - mirrorNegative.peakTiltDeg) > 4.0) {
  throw new Error(`Mirrored E3.1a peak tilt diverged: +${mirrorPositive.peakTiltDeg.toFixed(2)} / -${mirrorNegative.peakTiltDeg.toFixed(2)} deg`);
}

console.log(`E3.1a passive frontier: ${compact(passive)}`);
console.log(`E3.1a finite frontier:  ${compact(finite)}`);
console.log(`E3.1a low-friction localization: ${compact(lowFriction)}`);

const passiveSummary = summarizeFrontier(passive);
const finiteSummary = summarizeFrontier(finite);
if (passiveSummary.minFall === null) throw new Error('Passive organism never lost balance across the perturbation sweep.');
if (finiteSummary.maxRecover <= 0) throw new Error('Finite-authority organism never recovered across the perturbation sweep.');
if (finiteSummary.maxRecover <= passiveSummary.minFall) {
  throw new Error(`Finite balance authority did not expand demonstrated recoverability: passiveMinFall=${passiveSummary.minFall}Ns finiteMaxRecover=${finiteSummary.maxRecover}Ns`);
}

const authorityImpulses = [12, 24, 36, 48, 64, 80, 96, 128];
const authorityBudgets = [80, 160, 240, 320, 480, 800];
const authorityMatrix = authorityBudgets.map((maxTorque) => {
  const rows = authorityImpulses.map((impulseNs) => runTrial({
    mode: 'finite',
    maxTorque,
    impulseNs,
  }));
  const summary = summarizeFrontier(rows);
  console.log(
    `E3.1a authority ${maxTorque}Nm (${(maxTorque / rows[0].supportMomentScale).toFixed(2)}x support moment): ${compact(rows)} => maxRecover=${summary.maxRecover}Ns minFall=${summary.minFall ?? 'OPEN'}Ns`,
  );
  return { maxTorque, rows, ...summary };
});

const weak = authorityMatrix.find((entry) => entry.maxTorque === 160);
const reference = authorityMatrix.find((entry) => entry.maxTorque === 320);
if (!(weak && reference && reference.maxRecover > weak.maxRecover)) {
  throw new Error(`E3.1a authority-dependence falsifier failed: 160Nm maxRecover=${weak?.maxRecover ?? 'missing'}Ns 320Nm maxRecover=${reference?.maxRecover ?? 'missing'}Ns`);
}
const reference64 = reference.rows.find((row) => row.impulseNs === 64);
if (!reference64 || reference64.peakTorqueUtilization < 0.95) {
  throw new Error(`E3.1a 64Ns boundary-near recovery did not use the finite torque budget: utilization=${reference64?.peakTorqueUtilization ?? 'missing'}`);
}

console.log(
  `E3.1a recovery localization PASS: supportMoment=${finite[0].supportMomentScale.toFixed(1)}Nm finiteTorque=${finiteTorque}Nm passiveMinFall=${passiveSummary.minFall}Ns finiteMaxRecover=${finiteSummary.maxRecover}Ns finiteMinFall=${finiteSummary.minFall ?? 'OPEN'}Ns maxRecoveredFootTravel=${finiteSummary.maxRecoveredFootTravel.toFixed(3)}m mirror=${mirrorPositive.outcome}/${mirrorNegative.outcome} authority160=${weak.maxRecover}Ns authority320=${reference.maxRecover}Ns`,
);
