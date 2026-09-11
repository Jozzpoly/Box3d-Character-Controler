import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function neutralIntent() {
  return { moveForward:0, moveRight:0, forward:[0,0,-1], right:[1,0,0], jump:false, jumpHeld:false, sprint:false };
}

function staticBox(world, position, half) {
  const bd = b3.b3DefaultBodyDef(); bd.position=[...position];
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef(); sd.baseMaterial.friction=0; sd.baseMaterial.restitution=0;
  return b3.b3CreateBoxShape(body, sd, half[0], half[1], half[2]);
}

function runCeiling() {
  const wd=b3.b3DefaultWorldDef(); wd.gravity=[0,0,0];
  const world=b3.b3CreateWorld(wd);
  try {
    const ceilingBottom=2.15;
    staticBox(world,[0,ceilingBottom+0.10,0],[3,0.10,3]);
    const character=createCurrentDonorCharacter(b3,world,{startPosition:[0,1,0],gravity:0,airAcceleration:0,airDeceleration:0,externalAirDrag:0});
    character.velocity=[0,6,0];
    const expectedMaxCenterY=ceilingBottom-character.halfHeight;
    const samples=[];
    for(let frame=0;frame<24;frame++){
      character.preStep(DT,neutralIntent());
      b3.b3World_Step(world,DT,SUBSTEPS);
      character.postStep(DT);
      samples.push({frame,y:character.position[1],vy:character.velocity[1],planes:character.lastPlaneCount,clips:character.lastConstraintClips,conflict:character.lastVerticalConstraintConflict});
    }
    const constrained=samples.filter(s=>s.planes>0);
    assert.ok(constrained.length>=5,`ceiling constraint too brief: ${constrained.length}`);
    const first=constrained[0];
    const settled=constrained.slice(1);
    assert.ok(Math.max(...settled.map(s=>Math.abs(s.vy)))<1e-6,`stored upward velocity survived ceiling: ${JSON.stringify(constrained)}`);
    assert.ok(Math.max(...samples.map(s=>s.y))-expectedMaxCenterY<0.03,'geometry exceeded historical ceiling envelope');
    assert.equal(constrained.some(s=>s.conflict),false,'single ceiling must not be classified as crush conflict');
    assert.ok(constrained.some(s=>s.clips>0),'vertical repair never reported a constraint clip');
    return {first,final:samples.at(-1),constrainedFrames:constrained.length,maxY:Math.max(...samples.map(s=>s.y)),expectedMaxCenterY};
  } finally { b3.b3DestroyWorld(world); }
}

function runFreeFlight() {
  const wd=b3.b3DefaultWorldDef(); wd.gravity=[0,0,0];
  const world=b3.b3CreateWorld(wd);
  try {
    const character=createCurrentDonorCharacter(b3,world,{startPosition:[0,1,0],gravity:0,airAcceleration:0,airDeceleration:0,externalAirDrag:0});
    character.velocity=[0,6,0];
    for(let i=0;i<10;i++){
      character.preStep(DT,neutralIntent()); b3.b3World_Step(world,DT,SUBSTEPS); character.postStep(DT);
      assert.ok(Math.abs(character.velocity[1]-6)<1e-9,`free-flight vy changed on frame ${i}: ${character.velocity[1]}`);
      assert.equal(character.lastVerticalConstraintConflict,false);
    }
    return {finalY:character.position[1],finalVy:character.velocity[1]};
  } finally { b3.b3DestroyWorld(world); }
}

const free=runFreeFlight();
const ceiling=runCeiling();
console.log('R4 A2 VERTICAL RUNTIME CRUCIBLE PASS');
console.log(JSON.stringify({free,ceiling,result:'free upward velocity preserved until active ceiling; sustained blocked velocity settles instead of remaining stored',boundary:'near-vertical static/kinematic active constraints only; crush conflicts and oblique slope coupling remain outside A2a'},null,2));
