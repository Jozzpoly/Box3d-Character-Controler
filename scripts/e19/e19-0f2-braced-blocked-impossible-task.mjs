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

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function add3InPlace(target, delta) {
  target[0] += delta[0];
  target[1] += delta[1];
  target[2] += delta[2];
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

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, 0, 0];
  return b3.b3CreateWorld(def);
}

function createStaticBox(world, position, half) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  return body;
}

function createDynamicBox(world, position, half, mass) {
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

function bodyVelocity(body) {
  const out = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(out, body);
  return out;
}

function step(world, character, grip) {
  character.setGripConstraintActive(Boolean(grip));
  character.preStep(DT, neutralIntent());
  let telemetry = null;
  if (grip) {
    telemetry = stepDualGripActuator({
      b3,
      playerPosition: character.position,
      playerVelocity: character.velocity,
      playerMass: character.virtualMass,
      grips: grip.grips,
      desiredOffsets: grip.desiredOffsets,
      dt: DT,
      rate: grip.rate,
      maxForcePerGrip: grip.maxForcePerGrip,
      maxForceSum: grip.maxForceSum,
    });
    add3InPlace(character.velocity, telemetry.playerDeltaV);
  }
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  return telemetry;
}

const world = makeWorld();
const character = createE19GripDonorCharacter(b3, world, {
  startPosition: START,
  gravity: 0,
});
const bodyHalf = [0.5, 0.5, 0.5];
const wallCenter = [3.7, 5, 0];
const wallHalf = [0.1, 2, 2];
createStaticBox(world, wallCenter, wallHalf);
const body = createDynamicBox(world, [3.0, 5, 0], bodyHalf, 60);
const maxBodyCenterX = wallCenter[0] - wallHalf[0] - bodyHalf[0];

// This task is intentionally impossible in steady state. The static grip asks the
// analytical player to remain braced at its starting world relation, while the dynamic
// grip asks the box center to sit far beyond a real Box3D wall. The correct result is
// persistent finite saturation + residual geometric error, not teleportation, stored
// Donor velocity or a mass-class escape branch.
const desiredDynamicOffsetX = 3.8;
const grip = {
  grips: [
    { staticWorldAnchor: [-1.2, 5, 0] },
    { body, localAnchor: [0, 0, 0] },
  ],
  desiredOffsets: [
    [-1.2, 0, 0],
    [desiredDynamicOffsetX, 0, 0],
  ],
  rate: 8,
  maxForcePerGrip: [4000, 4000],
  maxForceSum: 8000,
};

const frames = 180;
let peakBodyX = bodyPosition(body)[0];
let minBodyX = peakBodyX;
let peakPlayerDisplacement = 0;
let peakPlayerSpeed = 0;
let peakBodySpeed = 0;
let saturatedFrames = 0;
let bothPerGripSaturatedFrames = 0;
let peakConstraintSolveError = 0;
let finalTelemetry = null;

for (let frame = 0; frame < frames; frame++) {
  finalTelemetry = step(world, character, grip);
  const bodyPos = bodyPosition(body);
  peakBodyX = Math.max(peakBodyX, bodyPos[0]);
  minBodyX = Math.min(minBodyX, bodyPos[0]);
  peakPlayerDisplacement = Math.max(peakPlayerDisplacement, Math.abs(character.position[0] - START[0]));
  peakPlayerSpeed = Math.max(peakPlayerSpeed, norm3(character.velocity));
  peakBodySpeed = Math.max(peakBodySpeed, norm3(bodyVelocity(body)));
  if (finalTelemetry.perGripSaturated.some(Boolean) || finalTelemetry.sharedSaturated) saturatedFrames += 1;
  if (finalTelemetry.perGripSaturated.every(Boolean)) bothPerGripSaturatedFrames += 1;
  peakConstraintSolveError = Math.max(peakConstraintSolveError, character.lastConstraintSolveError);
}

const atReleaseBody = bodyPosition(body);
const atRelease = {
  playerPosition: [...character.position],
  playerVelocity: [...character.velocity],
  externalVelocity: [...character.externalVelocity],
  bodyPosition: atReleaseBody,
  bodyVelocity: bodyVelocity(body),
  actualDynamicOffsetX: atReleaseBody[0] - character.position[0],
  geometricResidualX: desiredDynamicOffsetX - (atReleaseBody[0] - character.position[0]),
  solverResidualNormBeforeWorldContact: finalTelemetry.residualNorm,
  finalAppliedForces: finalTelemetry.impulses.map((impulse) => norm3(impulse) / DT),
  perGripSaturated: finalTelemetry.perGripSaturated,
  sharedSaturated: finalTelemetry.sharedSaturated,
};

for (let frame = 0; frame < 45; frame++) step(world, character, null);
const afterRelease = {
  playerPosition: [...character.position],
  playerVelocity: [...character.velocity],
  externalVelocity: [...character.externalVelocity],
  bodyPosition: bodyPosition(body),
  bodyVelocity: bodyVelocity(body),
};

assert.ok(peakBodyX <= maxBodyCenterX + 0.015, `impossible-task body crossed wall: peak=${peakBodyX} max=${maxBodyCenterX}`);
assert.ok(peakBodyX >= maxBodyCenterX - 0.04, `impossible-task body never loaded wall: peak=${peakBodyX} max=${maxBodyCenterX}`);
assert.ok(minBodyX > 2.95, `impossible-task body escaped backward instead of remaining wall-loaded: min=${minBodyX}`);
assert.ok(Math.abs(atRelease.bodyPosition[0] - maxBodyCenterX) < 0.04, `body did not remain wall-loaded at release: ${atRelease.bodyPosition[0]}`);
assert.ok(peakPlayerDisplacement < 0.02, `static brace failed to hold Donor: ${peakPlayerDisplacement}`);
assert.ok(peakPlayerSpeed < 0.05, `impossible mixed task accumulated Donor speed: ${peakPlayerSpeed}`);
assert.ok(norm3(atRelease.playerVelocity) < 0.01, `Donor retained latent velocity under impossible task: ${atRelease.playerVelocity}`);
assert.ok(norm3(atRelease.bodyVelocity) < 0.08, `wall-loaded body retained runaway velocity: ${atRelease.bodyVelocity}`);
assert.ok(atRelease.geometricResidualX > 0.6, `task unexpectedly became geometrically satisfiable: residual=${atRelease.geometricResidualX}`);
assert.ok(saturatedFrames / frames > 0.95, `impossible task did not remain finitely saturated: ${saturatedFrames}/${frames}`);
assert.ok(bothPerGripSaturatedFrames / frames > 0.9, `both sides were not persistently capacity-limited: ${bothPerGripSaturatedFrames}/${frames}`);
assert.ok(peakConstraintSolveError <= 2e-5, `Donor mover solve exceeded trusted tolerance: ${peakConstraintSolveError}`);
assert.deepEqual(atRelease.externalVelocity, [0, 0, 0]);
assert.deepEqual(afterRelease.externalVelocity, [0, 0, 0]);
assert.ok(norm3(afterRelease.playerVelocity) < 0.01, `release created latent player motion: ${afterRelease.playerVelocity}`);

const report = {
  schema: 'e19-0f2-braced-blocked-impossible-task-v1',
  hypothesis: 'When a static grip braces the Donor and a dynamic grip requests motion through an immovable Box3D wall, the shared finite grip law should tolerate the impossible task as sustained bounded saturation and geometric residual, without teleportation or hidden velocity accumulation.',
  boundary: 'Synthetic mixed static/dynamic latch, zero world gravity, axis-aligned wall. This strengthens the blocked-target clause of E19.0f; it does not qualify general contact acquisition or arbitrary 3D constraint geometry.',
  frames,
  wallCenter,
  wallHalf,
  bodyHalf,
  maxBodyCenterX,
  desiredDynamicOffsetX,
  peakBodyX,
  minBodyX,
  peakPlayerDisplacement,
  peakPlayerSpeed,
  peakBodySpeed,
  saturatedFrames,
  bothPerGripSaturatedFrames,
  peakConstraintSolveError,
  atRelease,
  afterRelease,
  classification: 'IMPOSSIBLE_MIXED_GRIP_TASK_REMAINS_FINITE_SATURATED_AND_GEOMETRICALLY_BLOCKED',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
b3.b3DestroyWorld(world);
