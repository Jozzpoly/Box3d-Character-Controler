import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function neutralIntent() {
  return { moveForward:0, moveRight:0, forward:[0,0,-1], right:[1,0,0], jump:false, jumpHeld:false, sprint:false };
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0,-20,0];
const world = b3.b3CreateWorld(worldDef);

const bodyDef = b3.b3DefaultBodyDef();
bodyDef.type = b3.b3BodyType.b3_dynamicBody;
bodyDef.position = [0,2,0];
bodyDef.enableSleep = false;
const platform = b3.b3CreateBody(world, bodyDef);
const shapeDef = b3.b3DefaultShapeDef();
shapeDef.baseMaterial.friction = 0.9;
shapeDef.density = 60;
b3.b3CreateBoxShape(platform, shapeDef, 1.2, 0.25, 1.2);

const character = createCurrentDonorCharacter(b3, world, { startPosition:[0,3.17,0], gravity:20 });
character.reset([0, 2.25 + character.halfHeight + 0.02, 0]);

const platformPos = [0,0,0];
const platformVel = [0,0,0];
const samples = [];
let firstSupport = null;
let lastSupport = null;
for (let frame=0; frame<90; frame++) {
  character.preStep(DT, neutralIntent());
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  b3.b3Body_GetPosition(platformPos, platform);
  b3.b3Body_GetLinearVelocity(platformVel, platform);
  const supported = Boolean(character.currentSupport);
  if (supported && firstSupport === null) firstSupport = frame;
  if (supported) lastSupport = frame;
  if (frame < 12 || frame % 10 === 9 || (frame > 0 && supported !== Boolean(samples.at(-1)?.supported))) {
    samples.push({
      frame,
      supported,
      supportType: character.currentSupport?.type ?? 'AIR',
      characterY: character.position[1],
      characterVy: character.velocity[1],
      platformY: platformPos[1],
      platformVy: platformVel[1],
      reactionY: character.lastPersistentSupportReactionY ?? 0,
    });
  }
}

console.log('R4 INTEGRATION A5 DYNAMIC LIFECYCLE DIAGNOSTIC');
console.log(JSON.stringify({ firstSupport, lastSupport, finalSupported:Boolean(character.currentSupport), samples }, null, 2));
b3.b3DestroyWorld(world);
