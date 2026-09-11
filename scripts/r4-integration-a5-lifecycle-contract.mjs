import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function neutralIntent() {
  return { moveForward:0, moveRight:0, forward:[0,0,-1], right:[1,0,0], jump:false, jumpHeld:false, sprint:false };
}

function createFixture(kind) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0,-20,0];
  const world = b3.b3CreateWorld(wd);
  const bd = b3.b3DefaultBodyDef();
  if (kind === 'KINEMATIC') bd.type = b3.b3BodyType.b3_kinematicBody;
  if (kind === 'DYNAMIC') bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0,2,0];
  bd.enableSleep = false;
  const platform = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0.9;
  if (kind === 'DYNAMIC') sd.density = 60;
  b3.b3CreateBoxShape(platform, sd, 1.2, 0.25, 1.2);
  const character = createCurrentDonorCharacter(b3, world, { startPosition:[0,3.17,0], gravity:20 });
  character.reset([0,2.25 + character.halfHeight + 0.02,0]);
  return { world, platform, character };
}

function acquireSupport(fixture, kind) {
  const { world, character } = fixture;
  for (let frame=0; frame<30; frame++) {
    character.preStep(DT, neutralIntent());
    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
    if (character.currentSupport?.type === kind) return frame;
  }
  throw new Error(`${kind}: support was never acquired inside isolation window`);
}

function destroyBeforePreStep(kind) {
  const fixture = createFixture(kind);
  const { world, platform, character } = fixture;
  try {
    const acquiredFrame = acquireSupport(fixture, kind);
    b3.b3DestroyBody(platform);
    assert.equal(b3.b3Body_IsValid(platform), false);
    assert.doesNotThrow(() => character.preStep(DT, neutralIntent()), `${kind}: stale currentSupport reached native code`);
    assert.equal(character.currentSupport, null, `${kind}: stale currentSupport survived preStep guard`);
    assert.doesNotThrow(() => b3.b3World_Step(world, DT, SUBSTEPS));
    assert.doesNotThrow(() => character.postStep(DT));
    assert.equal(character.telemetry().grounded, false, `${kind}: ghost grounding survived destroy`);
    return { kind, acquiredFrame, seam:'before-preStep', survived:true };
  } finally { b3.b3DestroyWorld(world); }
}

function destroyAfterCapture(kind) {
  const fixture = createFixture(kind);
  const { world, platform, character } = fixture;
  try {
    const acquiredFrame = acquireSupport(fixture, kind);
    character.preStep(DT, neutralIntent());
    assert.ok(character._supportProbe, `${kind}: expected transport probe after preStep`);
    b3.b3DestroyBody(platform);
    assert.equal(b3.b3Body_IsValid(platform), false);
    assert.doesNotThrow(() => b3.b3World_Step(world, DT, SUBSTEPS));
    assert.doesNotThrow(() => character.postStep(DT), `${kind}: stale _supportProbe reached native code`);
    assert.equal(character.currentSupport, null, `${kind}: destroyed support survived postStep solve`);
    assert.equal(character.telemetry().grounded, false, `${kind}: ghost grounding survived mid-step destroy`);
    return { kind, acquiredFrame, seam:'after-capture-before-postStep', survived:true };
  } finally { b3.b3DestroyWorld(world); }
}

const beforePre = ['STATIC','KINEMATIC','DYNAMIC'].map(destroyBeforePreStep);
const midStep = ['KINEMATIC','DYNAMIC'].map(destroyAfterCapture);

console.log('R4 INTEGRATION A5 LIFECYCLE CONTRACT PASS');
console.log(JSON.stringify({
  beforePre,
  midStep,
  contract:'persisted support handles are revalidated at every native-use seam; lifecycle witness does not require receding support to keep carrying the character',
  historicalWitnessStatus:'its 90-tick free-falling DYNAMIC precondition is intentionally invalidated by A3b unilateral support semantics',
},null,2));
