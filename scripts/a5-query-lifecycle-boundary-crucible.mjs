import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter, CURRENT_DONOR_REVISION } from '../src/donor/index.js';
import { castE19GripReach } from '../src/e19/swept-grip-reach.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function sameId(a, c) {
  return Boolean(a && c && a.index1 === c.index1 && a.world0 === c.world0 && a.generation === c.generation);
}

function moveIntent() {
  return {
    moveForward: 1,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function neutralIntent() {
  return { ...moveIntent(), moveForward: 0 };
}

function createBox(world, position, half, { sensor = false } = {}) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.8;
  shapeDef.baseMaterial.restitution = 0;
  shapeDef.isSensor = sensor;
  if (sensor) shapeDef.enableSensorEvents = true;
  const shape = b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return { body, shape };
}

function runDonorPath(kind) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);
  try {
    createBox(world, [0, -0.5, 0], [8, 0.5, 4]);
    let obstacle = null;
    if (kind === 'solid') obstacle = createBox(world, [1.0, 1.2, 0], [0.05, 1.2, 2.0], { sensor: false });
    if (kind === 'sensor') obstacle = createBox(world, [1.0, 1.2, 0], [0.05, 1.2, 2.0], { sensor: true });

    if (obstacle && b3.b3Shape_IsSensor(obstacle.shape) !== (kind === 'sensor')) {
      throw new Error(`${kind}: sensor identity mismatch`);
    }

    const character = createCurrentDonorCharacter(b3, world, {
      startPosition: [0, 0.92, 0],
      gravity: 20,
    });
    character.reset([0, character.halfHeight + 0.02, 0]);
    for (let i = 0; i < 30; i++) {
      character.preStep(DT, neutralIntent());
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
    }

    let maxX = character.position[0];
    let maxPlanes = 0;
    let constrainedFrames = 0;
    for (let i = 0; i < 90; i++) {
      character.preStep(DT, moveIntent());
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
      maxX = Math.max(maxX, character.position[0]);
      maxPlanes = Math.max(maxPlanes, character.lastPlaneCount);
      if (character.lastPlaneCount > 1) constrainedFrames += 1;
    }

    return {
      kind,
      obstacleIsSensor: obstacle ? b3.b3Shape_IsSensor(obstacle.shape) : null,
      finalX: character.position[0],
      maxX,
      maxPlanes,
      constrainedFrames,
      finalSupport: character.currentSupport?.type ?? 'AIR',
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

function runE19Reach() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(def);
  try {
    const sensor = createBox(world, [1.0, 1.0, 0], [0.08, 0.8, 0.8], { sensor: true });
    const solid = createBox(world, [2.0, 1.0, 0], [0.08, 0.8, 0.8], { sensor: false });
    const hit = castE19GripReach({
      b3,
      world,
      origin: [0, 1.0, 0],
      translation: [3, 0, 0],
      radius: 0.14,
    });
    return {
      hit: Boolean(hit),
      hitSensor: Boolean(hit && sameId(hit.shape, sensor.shape)),
      hitSolid: Boolean(hit && sameId(hit.shape, solid.shape)),
      hitFraction: hit?.fraction ?? null,
      hitBodyKind: hit?.bodyKind ?? null,
      sensorIsSensor: b3.b3Shape_IsSensor(sensor.shape),
      solidIsSensor: b3.b3Shape_IsSensor(solid.shape),
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

function runDestroyedSupportChild() {
  const child = spawnSync(process.execPath, ['scripts/a5-destroyed-support-child.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 15000,
  });
  if (child.error) throw child.error;
  const stdout = child.stdout ?? '';
  const stderr = child.stderr ?? '';
  const acquired = stdout.includes('SUPPORT_ACQUIRED:KINEMATIC');
  const validBefore = stdout.includes('VALID_BEFORE_DESTROY:true');
  const invalidAfter = stdout.includes('VALID_AFTER_DESTROY:false');
  const survivedPreStep = stdout.includes('PRESTEP_SURVIVED');
  const survivedPostStep = stdout.includes('POSTSTEP_SURVIVED');
  const relationError = stderr.includes('RELATION_ACCESS_ERROR:');
  return {
    status: child.status,
    signal: child.signal,
    acquired,
    validBefore,
    invalidAfter,
    survivedPreStep,
    survivedPostStep,
    relationError,
    stdoutTail: stdout.slice(-2000),
    stderrTail: stderr.slice(-3000),
    classification: acquired && validBefore && invalidAfter && child.status !== 0
      ? 'DESTROYED_SUPPORT_ID_IS_ORPHANED_AND_CURRENT_RELATION_ACCESS_FAILS'
      : acquired && validBefore && invalidAfter && survivedPostStep
        ? 'DESTROYED_SUPPORT_RELATION_SURVIVED_UNEXPECTEDLY'
        : 'LIFECYCLE_PROBE_INCONCLUSIVE',
  };
}

if (CURRENT_DONOR_REVISION !== 'v1') {
  throw new Error(`A5 expected current Donor v1, got ${CURRENT_DONOR_REVISION}`);
}
if (typeof b3.b3Shape_IsSensor !== 'function' || typeof b3.b3Body_IsValid !== 'function' || typeof b3.b3DestroyBody !== 'function') {
  throw new Error('A5 required pinned box3d.js lifecycle/sensor APIs are missing');
}

const donorNoObstacle = runDonorPath('none');
const donorSolid = runDonorPath('solid');
const donorSensor = runDonorPath('sensor');
const reach = runE19Reach();
const lifecycle = runDestroyedSupportChild();

if (donorNoObstacle.maxX < 3.0) {
  throw new Error(`A5 free-path control did not travel far enough: ${JSON.stringify(donorNoObstacle)}`);
}
if (donorSolid.maxX > 0.70 || donorSolid.constrainedFrames < 10) {
  throw new Error(`A5 solid-wall control did not block cleanly: ${JSON.stringify(donorSolid)}`);
}
if (!lifecycle.acquired || !lifecycle.validBefore || !lifecycle.invalidAfter) {
  throw new Error(`A5 lifecycle child did not establish valid->orphaned identity transition: ${JSON.stringify(lifecycle)}`);
}

const sensorBlocksDonorLikeSolid = donorSensor.maxX < 0.70 && donorSensor.constrainedFrames >= 10;
const payload = {
  experiment: 'A5 query and lifecycle boundary crucible',
  donorRevision: CURRENT_DONOR_REVISION,
  dt: DT,
  substeps: SUBSTEPS,
  interpretationBoundary: 'Characterization only. Default query/filter behavior is tested exactly as current Donor/E19 use it. The lifecycle child intentionally isolates any invalid-ID failure. No filtering or validity guard is added.',
  donorNoObstacle,
  donorSolid,
  donorSensor,
  sensorBlocksDonorLikeSolid,
  reach,
  lifecycle,
  classifications: {
    donorSensor: sensorBlocksDonorLikeSolid
      ? 'SENSOR_BLOCKS_CURRENT_DONOR_MOVER_LIKE_SOLID_GEOMETRY'
      : 'SENSOR_DOES_NOT_BLOCK_CURRENT_DONOR_IN_THIS_CASE',
    e19Reach: reach.hitSensor
      ? 'E19_DEFAULT_SWEPT_REACH_TREATS_SENSOR_AS_FIRST_OBSTRUCTION'
      : reach.hitSolid
        ? 'E19_DEFAULT_SWEPT_REACH_SKIPS_SENSOR_AND_HITS_SOLID'
        : 'E19_DEFAULT_SWEPT_REACH_RESULT_OTHER_OR_NONE',
    lifecycle: lifecycle.classification,
  },
};

fs.mkdirSync(path.join('tmp', 'a5'), { recursive: true });
fs.writeFileSync(path.join('tmp', 'a5', 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('A5 query/lifecycle CHARACTERIZATION COMPLETE');
console.log(`donor none=${donorNoObstacle.maxX.toFixed(4)} solid=${donorSolid.maxX.toFixed(4)} sensor=${donorSensor.maxX.toFixed(4)} sensorBlocks=${sensorBlocksDonorLikeSolid}`);
console.log(`e19 reach: hit=${reach.hit} sensor=${reach.hitSensor} solid=${reach.hitSolid} fraction=${reach.hitFraction}`);
console.log(`lifecycle: status=${lifecycle.status} signal=${lifecycle.signal ?? 'none'} invalidAfter=${lifecycle.invalidAfter} preSurvived=${lifecycle.survivedPreStep} postSurvived=${lifecycle.survivedPostStep} class=${lifecycle.classification}`);
console.log(JSON.stringify(payload));
