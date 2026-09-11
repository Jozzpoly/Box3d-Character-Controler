import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const GRAVITY = 20;

function createBox(world, type, position, half, friction = 0.9) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  bodyDef.enableSleep = false;
  if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = friction;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, ...half);
  return body;
}

function neutralIntent() {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function run(magnitude) {
  const platformY = 0.25;
  const platformHalfY = 0.25;
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  const platform = createBox(world, 'kinematic', [0, platformY, 0], [1, platformHalfY, 1], 0.95);
  const character = createCurrentDonorCharacter(b3, world, { startPosition: [0, 1.42, 0], gravity: GRAVITY });
  character.reset([0, platformY + platformHalfY + character.halfHeight + 0.02, 0]);
  const initialTop = character.position[1] + character.halfHeight;
  const ceilingBottom = initialTop + 0.18;
  createBox(world, 'static', [0, ceilingBottom + 0.20, 0], [2, 0.20, 2], 0);

  const originalApply = character._applySupportTransport.bind(character);
  character._applySupportTransport = function instrumentedApplySupportTransport() {
    originalApply();
    this._r3AfterCarryY = this.position[1];
    this._r3AfterCarryTransport = this.supportTransportDistance;
  };

  function tick(y) {
    b3.b3Body_SetTargetTransform(platform, { position: [0, y, 0], quaternion: [0, 0, 0, 1] }, DT, true);
    character.preStep(DT, neutralIntent());
    b3.b3World_Step(world, DT, SUBSTEPS);
    character.postStep(DT);
  }

  try {
    for (let i = 0; i < 60; i++) tick(platformY);
    assert.equal(character.currentSupport?.type, 'KINEMATIC');
    const beforeY = character.position[1];
    tick(platformY + magnitude);
    const afterCarryY = character._r3AfterCarryY;
    const finalY = character.position[1];
    const afterCarryTop = afterCarryY + character.halfHeight;
    const finalTop = finalY + character.halfHeight;
    const movedPlatformTop = platformY + magnitude + platformHalfY;
    const afterCarryBottom = afterCarryY - character.halfHeight;
    return {
      magnitude,
      beforeY,
      afterCarryY,
      finalY,
      carryDy: afterCarryY - beforeY,
      solverDyAfterCarry: finalY - afterCarryY,
      transport: character._r3AfterCarryTransport,
      ceilingBottom,
      afterCarryTop,
      finalTop,
      carryCeilingOvershoot: afterCarryTop - ceilingBottom,
      finalCeilingOvershoot: finalTop - ceilingBottom,
      movedPlatformTop,
      afterCarryBottom,
      sourceSupportIntrusionAfterClippedCarry: movedPlatformTop - afterCarryBottom,
      finalSupport: character.currentSupport?.type ?? 'AIR',
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

const results = [0.10, 0.18, 0.20, 0.30, 0.40, 0.75, 1.0].map(run);

// The A3 carry path itself must remain clipped to the mover binding envelope.
for (const result of results) {
  assert.ok(result.carryCeilingOvershoot <= 0.011,
    `support carry itself exceeded the expected mover envelope: ${JSON.stringify(result)}`);
}

const squeezeCases = results.filter((result) => result.sourceSupportIntrusionAfterClippedCarry > 0.01);
assert.ok(squeezeCases.length > 0, 'characterization must include source-support squeeze cases');
assert.ok(squeezeCases.some((result) => result.finalCeilingOvershoot > result.carryCeilingOvershoot + 0.01),
  'characterization must demonstrate post-carry solver contribution in a squeeze case');

console.log('R3 A3 CEILING SQUEEZE CHARACTERIZATION PASS');
console.log(JSON.stringify({
  results,
  conclusion: 'A3_CARRY_CLIPS_AT_THIRD_PARTY_TOPOLOGY; ADDITIONAL_PENETRATION_APPEARS_WHEN_MOVED_SOURCE_SUPPORT_CREATES_AN_OVERCONSTRAINED_CRUSH_STATE',
  evidenceBoundary: 'THIS_SEPARATES_SUPPORT_TRANSPORT_PATH_AUTHORITY_FROM_CRUSH_RESOLUTION; IT_DOES_NOT_QUALIFY_CRUSH_BEHAVIOR',
}, null, 2));
