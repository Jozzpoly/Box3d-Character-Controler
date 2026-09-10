import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function neutralIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

const def = b3.b3DefaultWorldDef();
def.gravity = [0, -20, 0];
const world = b3.b3CreateWorld(def);

const bodyDef = b3.b3DefaultBodyDef();
bodyDef.type = b3.b3BodyType.b3_kinematicBody;
bodyDef.position = [0, 2, 0];
bodyDef.enableSleep = false;
const platform = b3.b3CreateBody(world, bodyDef);
const shapeDef = b3.b3DefaultShapeDef();
shapeDef.baseMaterial.friction = 0.9;
b3.b3CreateBoxShape(platform, shapeDef, 1.2, 0.25, 1.2);

const character = createCurrentDonorCharacter(b3, world, {
  startPosition: [0, 3.17, 0],
  gravity: 20,
});
character.reset([0, 2.25 + character.halfHeight + 0.02, 0]);

for (let i = 0; i < 60; i++) {
  character.preStep(DT, neutralIntent());
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

if (character.currentSupport?.type !== 'KINEMATIC') {
  console.error(`SETUP_SUPPORT_FAILED:${character.currentSupport?.type ?? 'AIR'}`);
  process.exit(31);
}
console.log(`SUPPORT_ACQUIRED:${character.currentSupport.type}`);
console.log(`VALID_BEFORE_DESTROY:${b3.b3Body_IsValid(platform)}`);
b3.b3DestroyBody(platform);
console.log(`VALID_AFTER_DESTROY:${b3.b3Body_IsValid(platform)}`);

try {
  character.preStep(DT, neutralIntent());
  console.log('PRESTEP_SURVIVED');
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  console.log('POSTSTEP_SURVIVED');
  b3.b3DestroyWorld(world);
  process.exit(0);
} catch (error) {
  console.error(`RELATION_ACCESS_ERROR:${error instanceof Error ? error.message : String(error)}`);
  process.exit(42);
}
