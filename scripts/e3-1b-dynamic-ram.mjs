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

function createRam(world, organism, speed, mass = 35) {
  const half = [0.22, 0.22, 0.22];
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [
    organism.torsoCom[0],
    organism.torsoCom[1] + 0.25,
    organism.torsoCom[2] - 0.78,
  ];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0.02;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  const volume = 8 * half[0] * half[1] * half[2];
  shapeDef.density = mass / volume;
  shapeDef.baseMaterial.friction = 0.45;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  b3.b3Body_SetLinearVelocity(body, [0, 0, speed]);
  return { body, mass: b3.b3Body_GetMass(body), initialSpeed: speed };
}

function tick(world, organism) {
  organism.preStep(dt);
  b3.b3World_Step(world, dt, substeps);
  organism.postStep();
}

function runTrial(speed) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, {
    mode: 'finite',
    maxTorque: finiteTorque,
  });
  for (let i = 0; i < 60; i++) tick(world, organism);
  const quiet = organism.telemetry();
  if (quiet.torsoTilt > 0.02 || quiet.footTilt > 0.02) {
    throw new Error(`E3 ram active quiet-state instability before speed=${speed}: torso=${quiet.torsoTilt} foot=${quiet.footTilt}`);
  }

  const ram = createRam(world, organism, speed);
  const ramVelocity = [0, 0, 0];
  const startFoot = [...quiet.footCom];
  let stableFrames = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let peakTorqueUtilization = 0;
  let minRamVz = speed;
  let maxRamVelocityChange = 0;
  let firstMaterialTiltFrame = -1;

  for (let i = 0; i < 480; i++) {
    tick(world, organism);
    const t = organism.telemetry();
    b3.b3Body_GetLinearVelocity(ramVelocity, ram.body);
    minRamVz = Math.min(minRamVz, ramVelocity[2]);
    maxRamVelocityChange = Math.max(maxRamVelocityChange, Math.abs(ramVelocity[2] - speed));
    maxFootTravel = Math.max(
      maxFootTravel,
      Math.hypot(t.footCom[0] - startFoot[0], t.footCom[2] - startFoot[2]),
    );
    peakTorqueUtilization = Math.max(peakTorqueUtilization, t.torqueUtilization);
    if (firstMaterialTiltFrame < 0 && t.torsoTilt > 0.015) firstMaterialTiltFrame = i;
    if (t.recovered) stableFrames += 1;
    else stableFrames = 0;
    if (stableFrames >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }

  const final = organism.telemetry();
  const outcome = final.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  return {
    speed,
    ramMass: ram.mass,
    incomingMomentum: ram.mass * speed,
    outcome,
    peakTiltDeg: final.peakTilt * 180 / Math.PI,
    maxFootTravel,
    peakTorqueUtilization,
    firstMaterialTiltFrame,
    minRamVz,
    maxRamVelocityChange,
    recoveredFrame,
  };
}

const speeds = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.5, 8.0, 10.0];
const rows = speeds.map(runTrial);
for (const row of rows) {
  console.log(
    `E3.1b dynamic ram v=${row.speed.toFixed(1)}m/s p=${row.incomingMomentum.toFixed(1)}Ns => ${row.outcome} peak=${row.peakTiltDeg.toFixed(1)}deg foot=${row.maxFootTravel.toFixed(3)}m torque=${row.peakTorqueUtilization.toFixed(2)} ramDv=${row.maxRamVelocityChange.toFixed(2)}m/s`,
  );
}

const materiallyHit = rows.filter((row) => row.firstMaterialTiltFrame >= 0 && row.maxRamVelocityChange > 0.25);
if (materiallyHit.length < Math.ceil(rows.length * 0.7)) {
  throw new Error(`E3 dynamic ram did not reliably couple into the organism: materialHits=${materiallyHit.length}/${rows.length}`);
}
const recovers = rows.filter((row) => row.outcome === 'RECOVER');
const falls = rows.filter((row) => row.outcome === 'FALL');
if (recovers.length === 0 || falls.length === 0) {
  throw new Error(`E3 dynamic ram failed to demonstrate both recovery and natural fall: recovers=${recovers.length} falls=${falls.length}`);
}
const maxRecoverSpeed = Math.max(...recovers.map((row) => row.speed));
const minFallSpeed = Math.min(...falls.map((row) => row.speed));
const cleanRecoveredTravel = Math.max(...recovers.map((row) => row.maxFootTravel));
if (cleanRecoveredTravel > 0.15) {
  throw new Error(`E3 dynamic-ram recovery is materially contaminated by support relocation: ${cleanRecoveredTravel.toFixed(3)}m`);
}
if (maxRecoverSpeed >= minFallSpeed) {
  throw new Error(`E3 dynamic-ram frontier is non-monotonic in this sweep: maxRecover=${maxRecoverSpeed} minFall=${minFallSpeed}`);
}

console.log(
  `E3.1b dynamic-ram PASS: mass=${rows[0].ramMass.toFixed(1)}kg maxRecover=${maxRecoverSpeed.toFixed(1)}m/s minFall=${minFallSpeed.toFixed(1)}m/s maxRecoveredFootTravel=${cleanRecoveredTravel.toFixed(3)}m`,
);
