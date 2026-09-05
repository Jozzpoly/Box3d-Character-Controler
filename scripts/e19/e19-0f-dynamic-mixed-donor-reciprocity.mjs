import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE19GripDonorCharacter } from '../../src/e19/grip-donor-character.js';
import { stepDualGripActuator } from '../../src/e19/dual-grip-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const START = [0, 5, 0];
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function add3InPlace(target, delta) {
  target[0] += delta[0];
  target[1] += delta[1];
  target[2] += delta[2];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
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

function createWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createStaticBox(world, { position, half }) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createDynamicBox(world, { position, half, mass }) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [...position];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = densityForBoxMass(mass, half);
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  b3.b3Body_SetLinearVelocity(body, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(body, [0, 0, 0]);
  return body;
}

function bodyPosition(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetPosition(out, body);
  return out;
}

function bodyLinearVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function bodyAngularVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, body);
  return out;
}

function bodyRotation(body) {
  const out = [0, 0, 0, 1];
  b3.b3Body_GetRotation(out, body);
  return out;
}

function rotationAngleFromIdentity(q) {
  const w = Math.max(-1, Math.min(1, Math.abs(q[3])));
  return 2 * Math.acos(w);
}

function createDonor(world, start = START) {
  return createE19GripDonorCharacter(b3, world, {
    startPosition: start,
    gravity: 0,
  });
}

function step(world, character, gripStep = null) {
  character.setGripConstraintActive(Boolean(gripStep));
  character.preStep(DT, neutralIntent());
  let telemetry = null;
  if (gripStep) {
    telemetry = stepDualGripActuator({
      b3,
      playerPosition: character.position,
      playerVelocity: character.velocity,
      playerMass: character.virtualMass,
      grips: gripStep.grips,
      desiredOffsets: gripStep.desiredOffsets,
      desiredOffsetVelocities: gripStep.desiredOffsetVelocities ?? null,
      dt: DT,
      rate: gripStep.rate ?? 8,
      maxForcePerGrip: gripStep.maxForcePerGrip ?? 3000,
      maxForceSum: gripStep.maxForceSum ?? Number.POSITIVE_INFINITY,
    });
    add3InPlace(character.velocity, telemetry.playerDeltaV);
  }
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  return telemetry;
}

function runSingleDynamicMassCase({ name, mass, frames = 90 }) {
  const world = createWorld();
  const character = createDonor(world);
  const body = createDynamicBox(world, {
    position: [3, 5, 0],
    half: [0.4, 0.4, 0.4],
    mass,
  });
  const initialBody = bodyPosition(body);
  const initialPlayer = [...character.position];
  const grip = {
    grips: [{ body, localAnchor: [0, 0, 0] }],
    desiredOffsets: [[2.0, 0, 0]],
    maxForcePerGrip: 3000,
    rate: 8,
  };

  let saturatedFrames = 0;
  let peakPlayerSpeed = 0;
  let peakBodySpeed = 0;
  let finalTelemetry = null;
  for (let frame = 0; frame < frames; frame++) {
    finalTelemetry = step(world, character, grip);
    if (finalTelemetry.perGripSaturated[0]) saturatedFrames += 1;
    peakPlayerSpeed = Math.max(peakPlayerSpeed, norm3(character.velocity));
    peakBodySpeed = Math.max(peakBodySpeed, norm3(bodyLinearVelocity(body)));
  }

  const finalBody = bodyPosition(body);
  const currentAnchor = finalBody;
  const relative = sub3(currentAnchor, character.position);
  const result = {
    name,
    mass,
    frames,
    initialPlayer,
    finalPlayer: [...character.position],
    playerDx: character.position[0] - initialPlayer[0],
    initialBody,
    finalBody,
    bodyDx: finalBody[0] - initialBody[0],
    finalRelativeOffset: relative,
    finalRelativeError: sub3([2, 0, 0], relative),
    peakPlayerSpeed,
    peakBodySpeed,
    saturatedFrames,
    saturationFraction: saturatedFrames / frames,
    finalPlayerVelocity: [...character.velocity],
    finalBodyVelocity: bodyLinearVelocity(body),
    finalExternalVelocity: [...character.externalVelocity],
    finalAppliedForce: finalTelemetry.appliedImpulseSum / DT,
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runSameBodyDualTorqueCase(frames = 90) {
  const world = createWorld();
  const character = createDonor(world);
  const body = createDynamicBox(world, {
    position: [3, 5, 0],
    half: [0.45, 0.35, 0.9],
    mass: 55,
  });
  const grip = {
    grips: [
      { body, localAnchor: [0, 0, -0.7] },
      { body, localAnchor: [0, 0, 0.7] },
    ],
    desiredOffsets: [
      [2.45, 0, -0.7],
      [3.55, 0, 0.7],
    ],
    maxForcePerGrip: 2600,
    maxForceSum: 5200,
    rate: 8,
  };

  let peakAngularSpeed = 0;
  let peakPlayerSpeed = 0;
  let saturatedFrames = 0;
  for (let frame = 0; frame < frames; frame++) {
    const telemetry = step(world, character, grip);
    peakAngularSpeed = Math.max(peakAngularSpeed, norm3(bodyAngularVelocity(body)));
    peakPlayerSpeed = Math.max(peakPlayerSpeed, norm3(character.velocity));
    if (telemetry.perGripSaturated.some(Boolean) || telemetry.sharedSaturated) saturatedFrames += 1;
  }

  const q = bodyRotation(body);
  const result = {
    frames,
    playerDisplacement: sub3(character.position, START),
    finalBodyPosition: bodyPosition(body),
    finalBodyRotation: q,
    finalRotationAngle: rotationAngleFromIdentity(q),
    finalAngularVelocity: bodyAngularVelocity(body),
    peakAngularSpeed,
    peakPlayerSpeed,
    saturatedFrames,
    finalExternalVelocity: [...character.externalVelocity],
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runMixedBraceCase({ braced, frames = 90 }) {
  const world = createWorld();
  const character = createDonor(world);
  const body = createDynamicBox(world, {
    position: [3, 5, 0],
    half: [0.4, 0.4, 0.4],
    mass: 80,
  });
  const initialBody = bodyPosition(body);
  const grip = braced
    ? {
        grips: [
          { staticWorldAnchor: [-1.2, 5, 0] },
          { body, localAnchor: [0, 0, 0] },
        ],
        desiredOffsets: [[-1.2, 0, 0], [2.0, 0, 0]],
        maxForcePerGrip: [3000, 3000],
        maxForceSum: 6000,
        rate: 8,
      }
    : {
        grips: [{ body, localAnchor: [0, 0, 0] }],
        desiredOffsets: [[2.0, 0, 0]],
        maxForcePerGrip: 3000,
        rate: 8,
      };

  let saturationFrames = 0;
  for (let frame = 0; frame < frames; frame++) {
    const telemetry = step(world, character, grip);
    if (telemetry.perGripSaturated.some(Boolean) || telemetry.sharedSaturated) saturationFrames += 1;
  }

  const finalBody = bodyPosition(body);
  const result = {
    braced,
    frames,
    playerDx: character.position[0] - START[0],
    bodyDx: finalBody[0] - initialBody[0],
    finalPlayer: [...character.position],
    finalBody,
    finalRelativeOffset: sub3(finalBody, character.position),
    finalPlayerVelocity: [...character.velocity],
    finalBodyVelocity: bodyLinearVelocity(body),
    finalExternalVelocity: [...character.externalVelocity],
    saturationFrames,
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runBlockedDynamicCase({ frames = 150, releaseFrames = 45 } = {}) {
  const world = createWorld();
  const character = createDonor(world);
  const bodyHalf = [0.5, 0.5, 0.5];
  const wallCenter = [4.0, 5, 0];
  const wallHalf = [0.1, 2, 2];
  createStaticBox(world, { position: wallCenter, half: wallHalf });
  const body = createDynamicBox(world, {
    position: [3.0, 5, 0],
    half: bodyHalf,
    mass: 60,
  });
  const maxBodyCenterX = wallCenter[0] - wallHalf[0] - bodyHalf[0];
  const grip = {
    grips: [{ body, localAnchor: [0, 0, 0] }],
    desiredOffsets: [[4.0, 0, 0]],
    maxForcePerGrip: 4000,
    rate: 8,
  };

  let peakBodyX = bodyPosition(body)[0];
  let peakPlayerSpeed = 0;
  let saturatedFrames = 0;
  for (let frame = 0; frame < frames; frame++) {
    const telemetry = step(world, character, grip);
    peakBodyX = Math.max(peakBodyX, bodyPosition(body)[0]);
    peakPlayerSpeed = Math.max(peakPlayerSpeed, norm3(character.velocity));
    if (telemetry.perGripSaturated[0]) saturatedFrames += 1;
  }

  const atRelease = {
    playerPosition: [...character.position],
    playerVelocity: [...character.velocity],
    bodyPosition: bodyPosition(body),
    bodyVelocity: bodyLinearVelocity(body),
    externalVelocity: [...character.externalVelocity],
  };
  for (let frame = 0; frame < releaseFrames; frame++) step(world, character, null);
  const afterRelease = {
    playerPosition: [...character.position],
    playerVelocity: [...character.velocity],
    bodyPosition: bodyPosition(body),
    bodyVelocity: bodyLinearVelocity(body),
    externalVelocity: [...character.externalVelocity],
  };

  const result = {
    frames,
    releaseFrames,
    wallCenter,
    wallHalf,
    bodyHalf,
    maxBodyCenterX,
    peakBodyX,
    peakPlayerSpeed,
    saturatedFrames,
    atRelease,
    afterRelease,
  };
  b3.b3DestroyWorld(world);
  return result;
}

const light = runSingleDynamicMassCase({ name: 'light-20kg', mass: 20 });
const heavy = runSingleDynamicMassCase({ name: 'heavy-200kg', mass: 200 });
const sameBodyDual = runSameBodyDualTorqueCase();
const unbraced = runMixedBraceCase({ braced: false });
const braced = runMixedBraceCase({ braced: true });
const blocked = runBlockedDynamicCase();

// Same code path, same desired relative offset and same force cap: mass alone should
// determine how closure is partitioned between player and target.
assert.ok(light.bodyDx < -0.25, `light body did not move materially toward player: ${light.bodyDx}`);
assert.ok(heavy.bodyDx < -0.08, `heavy body did not move materially toward player: ${heavy.bodyDx}`);
assert.ok(Math.abs(light.bodyDx) > Math.abs(heavy.bodyDx) * 1.5, `light/heavy target motion split too weak: light=${light.bodyDx} heavy=${heavy.bodyDx}`);
assert.ok(heavy.playerDx > light.playerDx * 1.5, `heavy target did not move player more than light target: light=${light.playerDx} heavy=${heavy.playerDx}`);
assert.ok(norm3(light.finalRelativeError) < 0.08, `light case failed to settle relative task: ${light.finalRelativeError}`);
assert.ok(norm3(heavy.finalRelativeError) < 0.12, `heavy case failed to settle relative task: ${heavy.finalRelativeError}`);
assert.deepEqual(light.finalExternalVelocity, [0, 0, 0]);
assert.deepEqual(heavy.finalExternalVelocity, [0, 0, 0]);

// Two grips on one body should be able to generate substantial body rotation while the
// net player translation remains much smaller than a one-sided pull. No pose is written.
assert.ok(sameBodyDual.finalRotationAngle > 0.25, `dual same-body grips did not produce meaningful rotation: ${sameBodyDual.finalRotationAngle}`);
assert.ok(sameBodyDual.peakAngularSpeed > 0.5, `dual same-body angular response too small: ${sameBodyDual.peakAngularSpeed}`);
assert.ok(norm3(sameBodyDual.playerDisplacement) < 0.75, `same-body torque task translated Donor excessively: ${sameBodyDual.playerDisplacement}`);
assert.deepEqual(sameBodyDual.finalExternalVelocity, [0, 0, 0]);

// Adding one static grip uses the same coupled law and should brace player translation
// while still allowing the dynamic target to move. No special “brace mode” exists.
assert.ok(Math.abs(braced.playerDx) < Math.abs(unbraced.playerDx) * 0.45, `static grip did not materially brace player: unbraced=${unbraced.playerDx} braced=${braced.playerDx}`);
assert.ok(Math.abs(braced.bodyDx) > 0.2, `braced dynamic target did not move materially: ${braced.bodyDx}`);
assert.deepEqual(braced.finalExternalVelocity, [0, 0, 0]);

// A real Box3D wall must be able to defeat the requested object motion. The finite grip
// may move the analytical player instead, but it must not teleport the body through the
// wall or create an unbounded player velocity source.
assert.ok(blocked.peakBodyX <= blocked.maxBodyCenterX + 0.015, `blocked body crossed wall: peak=${blocked.peakBodyX} max=${blocked.maxBodyCenterX}`);
assert.ok(blocked.peakBodyX >= blocked.maxBodyCenterX - 0.08, `blocked specimen never reached wall: peak=${blocked.peakBodyX} max=${blocked.maxBodyCenterX}`);
assert.ok(blocked.peakPlayerSpeed < 12, `blocked target drove runaway Donor speed: ${blocked.peakPlayerSpeed}`);
assert.deepEqual(blocked.atRelease.externalVelocity, [0, 0, 0]);
assert.deepEqual(blocked.afterRelease.externalVelocity, [0, 0, 0]);
assert.ok(norm3(blocked.afterRelease.playerVelocity) < norm3(blocked.atRelease.playerVelocity) + 1e-9, 'release added player speed without an active grip');

const report = {
  schema: 'e19-0f-dynamic-mixed-donor-reciprocity-v1',
  hypothesis: 'One multi-frame finite reciprocal grip law can couple the accepted Donor virtual mass to dynamic Box3D targets and static anchors without mass-class branches: target mass/inertia and world contacts determine the motion split, while release leaves no persistent grip velocity state.',
  boundary: 'Headless zero-world-gravity horizontal/rotational mechanics crucible. Synthetic latches only. Donor gravity, static hanging and ceiling arbitration were qualified separately in E19.0d/e. Acquisition, arbitrary 3D grip-contact policy, player angular state, hand bodies and gameplay feel remain unqualified.',
  light,
  heavy,
  sameBodyDual,
  unbraced,
  braced,
  blocked,
  classification: 'DYNAMIC_AND_MIXED_GRIP_RECIPROCITY_IS_MULTI_FRAME_COHERENT_ON_DONOR',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
