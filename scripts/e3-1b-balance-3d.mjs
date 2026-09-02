import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;

function makeWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);
  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.10, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.95;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, shapeDef, 5, 0.10, 5);
  return world;
}

function tick(world, organism) {
  organism.preStep(dt);
  b3.b3World_Step(world, dt, substeps);
  organism.postStep();
}

function runTrial({ name, direction, impulseNs, maxTorque = finiteTorque, mode = 'finite' }) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode, maxTorque });
  const settleFrames = mode === 'passive' ? 8 : 60;
  for (let i = 0; i < settleFrames; i++) tick(world, organism);
  const quiet = organism.telemetry();
  if (quiet.fallObserved) {
    throw new Error(`E3.1b specimen fell before perturbation: mode=${mode} ${name}`);
  }
  if (mode !== 'passive' && (quiet.torsoTilt > 0.02 || quiet.footTilt > 0.02)) {
    throw new Error(`E3.1b active quiet-state instability: ${name} torso=${quiet.torsoTilt} foot=${quiet.footTilt}`);
  }
  if (mode === 'passive' && quiet.torsoTilt > 0.08) {
    throw new Error(`E3.1b passive control drifted too far before perturbation: ${name} torso=${quiet.torsoTilt}`);
  }

  const startFoot = [...quiet.footCom];
  organism.applyPush({ impulseNs, direction });
  let stableFrames = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let peakTorqueUtilization = 0;
  for (let i = 0; i < 480; i++) {
    tick(world, organism);
    const t = organism.telemetry();
    maxFootTravel = Math.max(
      maxFootTravel,
      Math.hypot(t.footCom[0] - startFoot[0], t.footCom[2] - startFoot[2]),
    );
    peakTorqueUtilization = Math.max(peakTorqueUtilization, t.torqueUtilization);
    if (t.recovered) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }

  const final = organism.telemetry();
  return {
    name,
    direction,
    impulseNs,
    outcome: final.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: final.peakTilt * 180 / Math.PI,
    finalTiltDeg: final.torsoTilt * 180 / Math.PI,
    maxFootTravel,
    peakTorqueUtilization,
    recoveredFrame,
    supportMomentScale: organism.supportMomentScaleFor(direction),
  };
}

function compact(rows) {
  return rows.map((r) => `${r.impulseNs}:${r.outcome[0]}(${r.peakTiltDeg.toFixed(0)}°,foot=${r.maxFootTravel.toFixed(2)}m,u=${r.peakTorqueUtilization.toFixed(2)})`).join(' ');
}

function frontier(rows) {
  const recovers = rows.filter((r) => r.outcome === 'RECOVER');
  const falls = rows.filter((r) => r.outcome === 'FALL');
  return {
    maxRecover: recovers.length ? Math.max(...recovers.map((r) => r.impulseNs)) : 0,
    minFall: falls.length ? Math.min(...falls.map((r) => r.impulseNs)) : null,
    maxRecoveredFootTravel: recovers.length ? Math.max(...recovers.map((r) => r.maxFootTravel)) : 0,
  };
}

const invSqrt2 = 1 / Math.sqrt(2);
const directions = [
  { name: 'forward', direction: [0, 0, 1] },
  { name: 'side', direction: [1, 0, 0] },
  { name: 'diagonal', direction: [invSqrt2, 0, invSqrt2] },
];
const impulses = [12, 24, 36, 48, 64, 80, 96, 128];
const results = new Map();

for (const spec of directions) {
  const passive = runTrial({ ...spec, impulseNs: 2, maxTorque: 0, mode: 'passive' });
  if (passive.outcome !== 'FALL') {
    throw new Error(`E3.1b passive ${spec.name} control did not naturally fall: ${passive.outcome}`);
  }

  const rows = impulses.map((impulseNs) => runTrial({ ...spec, impulseNs }));
  const summary = frontier(rows);
  results.set(spec.name, { rows, summary });
  console.log(
    `E3.1b ${spec.name} (${(rows[0].supportMomentScale).toFixed(1)}Nm support scale): ${compact(rows)} => maxRecover=${summary.maxRecover}Ns minFall=${summary.minFall ?? 'OPEN'}Ns maxRecoveredFoot=${summary.maxRecoveredFootTravel.toFixed(3)}m`,
  );
  if (summary.maxRecover <= 0 || summary.minFall === null) {
    throw new Error(`E3.1b ${spec.name} did not demonstrate both recovery and natural fall.`);
  }
}

for (const spec of directions) {
  const positive = runTrial({ ...spec, impulseNs: 48 });
  const negativeDirection = [-spec.direction[0], 0, -spec.direction[2]];
  const negative = runTrial({ name: `${spec.name}-mirror`, direction: negativeDirection, impulseNs: 48 });
  if (positive.outcome !== negative.outcome) {
    throw new Error(`E3.1b ${spec.name} mirrored outcome diverged: ${positive.outcome}/${negative.outcome}`);
  }
  if (Math.abs(positive.peakTiltDeg - negative.peakTiltDeg) > 5) {
    throw new Error(`E3.1b ${spec.name} mirrored peak tilt diverged: ${positive.peakTiltDeg.toFixed(2)}/${negative.peakTiltDeg.toFixed(2)}deg`);
  }
}

const forward = results.get('forward').summary;
const side = results.get('side').summary;
const diagonal = results.get('diagonal').summary;
const maxCleanRecoveredFootTravel = Math.max(
  forward.maxRecoveredFootTravel,
  side.maxRecoveredFootTravel,
  diagonal.maxRecoveredFootTravel,
);
if (maxCleanRecoveredFootTravel > 0.12) {
  throw new Error(`E3.1b demonstrated recovery is contaminated by material support relocation: ${maxCleanRecoveredFootTravel.toFixed(3)}m`);
}

console.log(
  `E3.1b 3D balance PASS: torque=${finiteTorque}Nm forward=${forward.maxRecover}/${forward.minFall}Ns side=${side.maxRecover}/${side.minFall}Ns diagonal=${diagonal.maxRecover}/${diagonal.minFall}Ns maxRecoveredFootTravel=${maxCleanRecoveredFootTravel.toFixed(3)}m mirrored=PASS`,
);
