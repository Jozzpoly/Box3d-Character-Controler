import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { ConstraintVelocityCharacter } from '../src/constraint-velocity-character.js';
import { createE19GripDonorCharacter } from '../src/e19/grip-donor-character.js';
import { stepDualGripActuator } from '../src/e19/dual-grip-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function intent() {
  return { moveForward:0, moveRight:0, forward:[1,0,0], right:[0,0,1], jump:false, jumpHeld:false, sprint:false };
}

function staticBox(world, position, half) {
  const bd = b3.b3DefaultBodyDef(); bd.position=[...position];
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef(); sd.baseMaterial.friction=0.8; sd.baseMaterial.restitution=0;
  b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
}

function makeWorld({ ceiling=false }={}) {
  const wd=b3.b3DefaultWorldDef(); wd.gravity=[0,-20,0];
  const world=b3.b3CreateWorld(wd);
  if (ceiling) staticBox(world,[0,2.7,0],[5,0.2,5]);
  return world;
}

function add3InPlace(target, delta) {
  target[0]+=delta[0]; target[1]+=delta[1]; target[2]+=delta[2];
}

function disableLegacyGripVerticalOverride(character) {
  character._applyConstraintVelocityPolicy = function(args) {
    const result = ConstraintVelocityCharacter.prototype._applyConstraintVelocityPolicy.call(this, args);
    this.lastGripVerticalConstraintClips = 0;
    return result;
  };
  return character;
}

function stepGrip(world, character, gripStep) {
  character.setGripConstraintActive(Boolean(gripStep));
  character.preStep(DT,intent());
  let telemetry=null;
  if (gripStep) {
    telemetry=stepDualGripActuator({
      b3,
      playerPosition:character.position,
      playerVelocity:character.velocity,
      playerMass:character.virtualMass,
      grips:gripStep.grips,
      desiredOffsets:gripStep.desiredOffsets,
      dt:DT,
      rate:gripStep.rate ?? 12,
      maxForcePerGrip:gripStep.forcePerHand,
      maxForceSum:gripStep.maxForceSum ?? Number.POSITIVE_INFINITY,
    });
    add3InPlace(character.velocity,telemetry.playerDeltaV);
  }
  b3.b3World_Step(world,DT,SUBSTEPS);
  character.postStep(DT);
  return telemetry;
}

function runCeiling({ legacyOverride }) {
  const world=makeWorld({ceiling:true});
  try {
    let character=createE19GripDonorCharacter(b3,world,{startPosition:[0,0.9,0],gravity:20});
    if (!legacyOverride) character=disableLegacyGripVerticalOverride(character);
    const grip={grips:[{staticWorldAnchor:[0,4,0]}],desiredOffsets:[[0,1.5,0]],forcePerHand:5000,rate:12};
    let peakY=character.position[1];
    let peakBlockedVy=0;
    let baseVerticalClips=0;
    let legacyGripClips=0;
    for(let frame=0;frame<120;frame++){
      stepGrip(world,character,grip);
      peakY=Math.max(peakY,character.position[1]);
      if(character.lastPlaneCount>0) peakBlockedVy=Math.max(peakBlockedVy,Math.max(0,character.velocity[1]));
      baseVerticalClips+=Math.max(0,(character.lastConstraintClips ?? 0)-(character.lastGripVerticalConstraintClips ?? 0));
      legacyGripClips+=character.lastGripVerticalConstraintClips ?? 0;
    }
    const atRelease={y:character.position[1],vy:character.velocity[1]};
    stepGrip(world,character,null);
    const afterRelease={y:character.position[1],vy:character.velocity[1]};
    return {peakY,peakBlockedVy,atRelease,afterRelease,baseVerticalClips,legacyGripClips,verticalConflict:character.lastVerticalConstraintConflict};
  } finally { b3.b3DestroyWorld(world); }
}

function runHang({ legacyOverride }) {
  const world=makeWorld();
  try {
    let character=createE19GripDonorCharacter(b3,world,{startPosition:[0,8,0],gravity:20});
    if (!legacyOverride) character=disableLegacyGripVerticalOverride(character);
    const grip={
      grips:[{staticWorldAnchor:[-0.28,9.25,0]},{staticWorldAnchor:[0.28,9.25,0]}],
      desiredOffsets:[[-0.28,1.25,0],[0.28,1.25,0]],
      forcePerHand:900,
      rate:12,
    };
    let telemetry=null;
    for(let frame=0;frame<360;frame++) telemetry=stepGrip(world,character,grip);
    return {y:character.position[1],vy:character.velocity[1],forces:telemetry.impulses.map((impulse)=>Math.hypot(...impulse)/DT)};
  } finally { b3.b3DestroyWorld(world); }
}

const both={ceiling:runCeiling({legacyOverride:true}),hang:runHang({legacyOverride:true})};
const a2Only={ceiling:runCeiling({legacyOverride:false}),hang:runHang({legacyOverride:false})};
const expectedMaxY=2.5-1.15;

for(const [label,result] of Object.entries({both,a2Only})){
  assert.ok(result.ceiling.peakY<=expectedMaxY+0.01,`${label}: bypassed ceiling ${result.ceiling.peakY}`);
  assert.ok(result.ceiling.peakY>=expectedMaxY-0.08,`${label}: never reached ceiling boundary ${result.ceiling.peakY}`);
  assert.ok(result.ceiling.peakBlockedVy<0.05,`${label}: latent blocked vy ${result.ceiling.peakBlockedVy}`);
  assert.ok(Math.abs(result.ceiling.atRelease.vy)<0.05,`${label}: blocked vy survived at release ${result.ceiling.atRelease.vy}`);
  assert.ok(result.ceiling.afterRelease.vy<0,`${label}: release produced upward burst ${result.ceiling.afterRelease.vy}`);
  assert.ok(Math.abs(result.hang.y-8)<0.03,`${label}: two-hand hang moved ${result.hang.y}`);
  assert.ok(result.hang.forces.every((force)=>force>770&&force<830),`${label}: load sharing changed ${result.hang.forces}`);
}

assert.ok(a2Only.ceiling.baseVerticalClips>0,'A2a alone never engaged in E19 ceiling specimen');
assert.equal(a2Only.ceiling.legacyGripClips,0,'legacy E19 override unexpectedly remained active');

console.log('R4 INTEGRATION E19 VERTICAL POLICY DECOMPOSITION PASS');
console.log(JSON.stringify({
  both,
  a2Only,
  conclusion:'A2a alone preserves the historical E19 ceiling/release/hang contract; the old grip-scoped vertical override is redundant on the integrated foundation',
  next:'remove the legacy override from combined E19 class, retain grip telemetry compatibility if useful, and rerun exact historical witness plus foundation exam',
},null,2));
