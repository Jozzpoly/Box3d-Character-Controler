import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import {
  add3,
  dot3,
  inverseRotateVecByQuat,
  length3,
  quatFromAxisAngle,
  rotateVecByQuat,
  scale3,
  sub3,
  transformPoint,
} from '../src/math.js';

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

function filterUnilateral(delta, normal) {
  const nLen = length3(normal);
  if (!(nLen > 1e-9)) return [...delta];
  const n = scale3(normal, 1 / nLen);
  const along = dot3(delta, n);
  return along < 0 ? sub3(delta, scale3(n, along)) : [...delta];
}

// Geometry-only adversary: stale world normal vs a normal transported with the support.
// This deliberately isolates the contact-frame question from Box2D contact reacquisition.
const localPoint = [-1.0, 0.25, 0];
const beforeRotation = [0, 0, 0, 1];
const afterRotation = quatFromAxisAngle([0, 0, 1], Math.PI / 4);
const beforePosition = [0, 0, 0];
const afterPosition = [0, 0, 0];
const beforePoint = transformPoint(beforePosition, beforeRotation, localPoint);
const afterPoint = transformPoint(afterPosition, afterRotation, localPoint);
const pointDelta = sub3(afterPoint, beforePoint);
const staleWorldNormal = [0, 1, 0];
const localNormal = inverseRotateVecByQuat(beforeRotation, staleWorldNormal);
const transportedWorldNormal = rotateVecByQuat(afterRotation, localNormal);
const staleFiltered = filterUnilateral(pointDelta, staleWorldNormal);
const transportedFiltered = filterUnilateral(pointDelta, transportedWorldNormal);

assert.ok(dot3(staleFiltered, transportedWorldNormal) < -0.05,
  'stale world normal should leave a materially receding component in the rotated support frame');
assert.ok(dot3(transportedFiltered, transportedWorldNormal) >= -1e-9,
  'transported local normal must remove receding motion in the support current frame');

function makeCeilingSetup(policy) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -GRAVITY, 0];
  const world = b3.b3CreateWorld(worldDef);
  const platformY = 0.25;
  const platformHalf = [1.0, 0.25, 1.0];
  const platform = createBox(world, 'kinematic', [0, platformY, 0], platformHalf, 0.95);
  const character = createCurrentDonorCharacter(b3, world, {
    startPosition: [0, 1.42, 0],
    gravity: GRAVITY,
  });
  character.reset([0, platformY + platformHalf[1] + character.halfHeight + 0.02, 0]);

  // Ceiling leaves a small initial gap but blocks a 1 m upward carry.
  const initialTop = character.position[1] + character.halfHeight;
  const ceilingBottom = initialTop + 0.18;
  createBox(world, 'static', [0, ceilingBottom + 0.20, 0], [2.0, 0.20, 2.0], 0);

  if (policy !== 'legacy') {
    character._applySupportTransport = function applyCandidateSupportTransport() {
      this.supportTransportDistance = 0;
      const probe = this._supportProbe;
      this._supportProbe = null;
      if (!probe) return;
      this.b3.b3Body_GetPosition(this._bodyPosition, probe.body);
      this.b3.b3Body_GetRotation(this._bodyRotation, probe.body);
      const after = transformPoint(this._bodyPosition, this._bodyRotation, probe.localPoint);
      const rawDelta = sub3(after, probe.before);
      const requested = policy === 'unilateral-swept'
        ? filterUnilateral(rawDelta, this.currentSupport?.normal ?? [0, 1, 0])
        : rawDelta;
      const capsule = {
        center1: [0, -this.halfSegment, 0],
        center2: [0, this.halfSegment, 0],
        radius: this.radius,
      };
      const fraction = this.b3.b3World_CastMover(
        this.world,
        this.position,
        capsule,
        requested,
        this.queryFilter,
        (shapeId) => this.b3.b3Shape_GetBody(shapeId) !== probe.body,
      );
      const applied = scale3(requested, fraction);
      this.position = add3(this.position, applied);
      this.supportTransportDistance = length3(applied);
    };
  }

  return { world, platform, character, platformY, ceilingBottom };
}

function tick(setup, y) {
  b3.b3Body_SetTargetTransform(
    setup.platform,
    { position: [0, y, 0], quaternion: [0, 0, 0, 1] },
    DT,
    true,
  );
  setup.character.preStep(DT, neutralIntent());
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  setup.character.postStep(DT);
}

function ceilingCase(policy) {
  const setup = makeCeilingSetup(policy);
  try {
    for (let i = 0; i < 60; i++) tick(setup, setup.platformY);
    assert.equal(setup.character.currentSupport?.type, 'KINEMATIC', 'ceiling setup must acquire support');
    const beforeY = setup.character.position[1];
    tick(setup, setup.platformY + 1.0);
    const top = setup.character.position[1] + setup.character.halfHeight;
    return {
      beforeY,
      afterY: setup.character.position[1],
      characterDy: setup.character.position[1] - beforeY,
      top,
      ceilingBottom: setup.ceilingBottom,
      penetratedCeiling: top > setup.ceilingBottom + 0.01,
      transport: setup.character.supportTransportDistance,
    };
  } finally {
    b3.b3DestroyWorld(setup.world);
  }
}

const ceiling = {
  legacy: ceilingCase('legacy'),
  swept: ceilingCase('swept'),
  unilateralSwept: ceilingCase('unilateral-swept'),
};

// The candidate path-safety property is the important assertion. Legacy is characterization only:
// its later solver may partially depenetrate, so do not require a specific failure shape here.
assert.equal(ceiling.swept.penetratedCeiling, false,
  'third-party sweep must prevent full support carry from crossing a ceiling');
assert.equal(ceiling.unilateralSwept.penetratedCeiling, false,
  'unilateral swept carry must remain clipped by a ceiling');
assert.ok(ceiling.swept.characterDy < 0.40 && ceiling.unilateralSwept.characterDy < 0.40,
  'candidate carry should be clipped close to the available ceiling gap, not inherit the full 1 m support move');

console.log('R3 A3 ADVERSARIAL SUPPORT FRAME CRUCIBLE PASS');
console.log(JSON.stringify({
  rotatingSupportFrame: {
    pointDelta,
    staleWorldNormal,
    transportedWorldNormal,
    staleFiltered,
    transportedFiltered,
    staleResidualAlongCurrentNormal: dot3(staleFiltered, transportedWorldNormal),
    transportedResidualAlongCurrentNormal: dot3(transportedFiltered, transportedWorldNormal),
    conclusion: 'STALE_WORLD_NORMAL_IS_NOT_A_SAFE_UNILATERAL_FRAME_FOR_ROTATING_SUPPORTS',
  },
  ceiling,
  interpretation: 'third-party sweep handles topology; rotating supports require the contact normal to live in the support local frame rather than remaining stale in world space',
}, null, 2));
