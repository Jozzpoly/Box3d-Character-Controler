import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { castE19GripReach } from '../src/e19/swept-grip-reach.js';
import { createQuerySemantics, SENSOR_BEHAVIOR } from '../src/query-semantics.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function sameId(a, b) {
  return Boolean(a && b && a.index1 === b.index1 && a.world0 === b.world0 && a.generation === b.generation);
}

function intent(moving) {
  return { moveForward: moving ? 1 : 0, moveRight: 0, forward: [1,0,0], right: [0,0,1], jump: false, jumpHeld: false, sprint: false };
}

function createBox(world, position, half, sensor = false) {
  const bd = b3.b3DefaultBodyDef();
  bd.position = [...position];
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.isSensor = sensor;
  if (sensor) sd.enableSensorEvents = true;
  const shape = b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
  return { body, shape };
}

function runMover(querySemantics, withSolidBehind = true) {
  const wd = b3.b3DefaultWorldDef(); wd.gravity = [0,-20,0];
  const world = b3.b3CreateWorld(wd);
  try {
    createBox(world, [0,-0.5,0], [8,0.5,4]);
    createBox(world, [1.0,1.2,0], [0.05,1.2,2], true);
    if (withSolidBehind) createBox(world, [2.0,1.2,0], [0.05,1.2,2], false);
    const character = createCurrentDonorCharacter(b3, world, { startPosition:[0,0.92,0], gravity:20, querySemantics });
    character.reset([0, character.halfHeight + 0.02, 0]);
    for (let i=0;i<30;i++) { character.preStep(DT,intent(false)); b3.b3World_Step(world,DT,SUBSTEPS); character.postStep(DT); }
    let maxX = character.position[0];
    for (let i=0;i<120;i++) { character.preStep(DT,intent(true)); b3.b3World_Step(world,DT,SUBSTEPS); character.postStep(DT); maxX=Math.max(maxX,character.position[0]); }
    return maxX;
  } finally { b3.b3DestroyWorld(world); }
}

function runReach(querySemantics) {
  const wd = b3.b3DefaultWorldDef(); wd.gravity = [0,0,0];
  const world = b3.b3CreateWorld(wd);
  try {
    const sensor = createBox(world,[1,1,0],[0.08,0.8,0.8],true);
    const solid = createBox(world,[2,1,0],[0.08,0.8,0.8],false);
    const hit = castE19GripReach({ b3, world, origin:[0,1,0], translation:[3,0,0], radius:0.14, querySemantics });
    return { hitSensor: sameId(hit?.shape,sensor.shape), hitSolid: sameId(hit?.shape,solid.shape), fraction: hit?.fraction ?? null };
  } finally { b3.b3DestroyWorld(world); }
}

const defaultPolicy = createQuerySemantics();
const ignoreMover = createQuerySemantics({ moverSensors:SENSOR_BEHAVIOR.IGNORE });
const ignoreReach = createQuerySemantics({ gripReachSensors:SENSOR_BEHAVIOR.IGNORE });

const moverDefault = runMover(defaultPolicy);
const moverIgnore = runMover(ignoreMover);
const moverIgnoreNoSolid = runMover(ignoreMover, false);
assert.ok(moverDefault < 0.75, `default mover no longer blocked by sensor: ${moverDefault}`);
assert.ok(moverIgnore > 1.2 && moverIgnore < 1.8, `ignore mover did not pass sensor and stop at solid: ${moverIgnore}`);
assert.ok(moverIgnoreNoSolid > 3.0, `ignore mover did not pass sensor on open route: ${moverIgnoreNoSolid}`);

const reachDefault = runReach(defaultPolicy);
const reachIgnore = runReach(ignoreReach);
assert.equal(reachDefault.hitSensor, true, `default reach no longer hits sensor first: ${JSON.stringify(reachDefault)}`);
assert.equal(reachIgnore.hitSolid, true, `ignore reach did not skip sensor for solid: ${JSON.stringify(reachIgnore)}`);
assert.ok(reachIgnore.fraction > reachDefault.fraction, 'solid behind sensor should have later hit fraction');

// Channel independence in real query paths.
assert.ok(runMover(ignoreReach) < 0.75, 'reach-only policy leaked into mover channel');
assert.equal(runReach(ignoreMover).hitSensor, true, 'mover-only policy leaked into reach channel');

console.log('R4 A5 QUERY RUNTIME CRUCIBLE PASS');
console.log(JSON.stringify({
  mover:{defaultSensorBlock:moverDefault, ignoreSensorThenSolid:moverIgnore, ignoreSensorOpenRoute:moverIgnoreNoSolid},
  reach:{default:reachDefault, ignoreSensor:reachIgnore},
  result:'CURRENT BLOCK semantics preserved explicitly; IGNORE works independently per named query channel',
  evidenceBoundary:'qualifies query-policy routing, not a gameplay decision that sensors should be BLOCK or IGNORE',
}, null, 2));
