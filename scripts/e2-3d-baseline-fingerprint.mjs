import crypto from 'node:crypto';
import Box3D from 'box3d.js/inline';
import { createDonorCharacter } from '../src/donor/index.js';
import { createPlayground } from '../src/playground.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const SCALE = 1e8;

function q(value) {
  return Number.isFinite(value) ? Math.round(value * SCALE) : String(value);
}

function intentForFrame(frame) {
  let moveForward = 0;
  let moveRight = 0;
  let jump = false;
  let jumpHeld = false;
  let sprint = false;

  if (frame >= 90 && frame < 220) {
    moveForward = 1;
    sprint = frame >= 165;
  } else if (frame === 220) {
    moveForward = 0.6;
    jump = true;
    jumpHeld = true;
  } else if (frame > 220 && frame < 236) {
    moveForward = 0.6;
    jumpHeld = true;
  } else if (frame >= 236 && frame < 300) {
    moveRight = 1;
  } else if (frame >= 315 && frame < 345) {
    moveForward = -0.55;
    moveRight = 0.35;
  }

  return {
    moveForward,
    moveRight,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump,
    jumpHeld,
    sprint,
  };
}

function addVector(parts, vector) {
  for (const value of vector) parts.push(q(value));
}

function captureFrame(parts, frame, playground, character) {
  parts.push(frame);
  addVector(parts, character.position);
  addVector(parts, character.velocity);
  addVector(parts, character.externalVelocity);
  addVector(parts, character.desiredDirection);
  parts.push(q(character.desiredSpeed));
  parts.push(q(character.lastContactImpulse));
  parts.push(q(character.supportTransportDistance));
  parts.push(character.lastDynamicContacts);
  parts.push(character.currentSupport?.type ?? 'AIR');

  const world = playground.captureSnapshot();
  parts.push(q(world.time));
  for (const body of world.bodies) {
    parts.push(body.id, body.type);
    addVector(parts, body.position);
    addVector(parts, body.rotation);
    addVector(parts, body.linearVelocity);
    addVector(parts, body.angularVelocity);
  }
}

const playground = createPlayground(b3);
const character = createDonorCharacter(b3, playground.world, {
  startPosition: playground.spawn,
  gravity: playground.gravity,
});
const parts = [];
let dynamicContactFrames = 0;
let supportFrames = 0;

try {
  for (let frame = 0; frame < 360; frame++) {
    playground.preStep(DT);
    const intent = intentForFrame(frame);
    character.preStep(DT, intent);
    b3.b3World_Step(playground.world, DT, SUBSTEPS);
    character.postStep(DT);

    if (character.lastDynamicContacts > 0) dynamicContactFrames += 1;
    if (character.currentSupport) supportFrames += 1;
    captureFrame(parts, frame, playground, character);
  }

  const fingerprint = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  console.log(
    `E2.3d pre-change A″ fingerprint: sha256=${fingerprint} dynamicContactFrames=${dynamicContactFrames} supportFrames=${supportFrames} finalPos=${character.position.map((v) => v.toFixed(8)).join(',')} finalV=${character.velocity.map((v) => v.toFixed(8)).join(',')}`,
  );
} finally {
  b3.b3DestroyWorld(playground.world);
}
