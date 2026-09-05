import assert from 'node:assert/strict';
import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createConstraintVelocityCharacter } from '../../src/constraint-velocity-character.js';
import { createE19GripDonorCharacter } from '../../src/e19/grip-donor-character.js';
import { stepDualGripActuator } from '../../src/e19/dual-grip-actuator.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const TOLERANCE = 1e-9;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function add3InPlace(target, delta) {
  target[0] += delta[0];
  target[1] += delta[1];
  target[2] += delta[2];
}

function intent(overrides = {}) {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function makeWorld({ floorWall = false, ceiling = false } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  function staticBox(position, half) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [...position];
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = 0.8;
    shapeDef.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  }

  if (floorWall) {
    staticBox([0, -0.5, 0], [12, 0.5, 6]);
    staticBox([2.0, 0.3, 0], [0.1, 0.3, 2.0]);
  }
  if (ceiling) staticBox([0, 2.7, 0], [5, 0.2, 5]);
  return world;
}

function near(a, b, label, tolerance = TOLERANCE) {
  if (Math.abs(a - b) > tolerance) throw new Error(`${label}: ${a} != ${b}`);
}

function vectorNear(a, b, label, tolerance = TOLERANCE) {
  for (let i = 0; i < a.length; i++) near(a[i], b[i], `${label}[${i}]`, tolerance);
}

function stepPlain(world, character, control) {
  character.preStep(DT, control);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function stepGrip(world, character, control, gripStep = null) {
  character.setGripConstraintActive(Boolean(gripStep));
  character.preStep(DT, control);
  let telemetry = null;
  if (gripStep) {
    telemetry = stepDualGripActuator({
      b3,
      playerPosition: character.position,
      playerVelocity: character.velocity,
      playerMass: character.virtualMass,
      grips: gripStep.grips,
      desiredOffsets: gripStep.desiredOffsets,
      dt: DT,
      rate: gripStep.rate ?? 12,
      maxForcePerGrip: gripStep.forcePerHand,
      maxForceSum: gripStep.maxForceSum ?? Number.POSITIVE_INFINITY,
    });
    add3InPlace(character.velocity, telemetry.playerDeltaV);
  }
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
  return telemetry;
}

function runUngroppedEquivalence() {
  const referenceWorld = makeWorld({ floorWall: true });
  const candidateWorld = makeWorld({ floorWall: true });
  const options = { startPosition: [0, 0.9, 0], gravity: 20 };
  const reference = createConstraintVelocityCharacter(b3, referenceWorld, options);
  const candidate = createE19GripDonorCharacter(b3, candidateWorld, options);
  let frames = 0;
  let maxPositionError = 0;
  let maxVelocityError = 0;

  const stepBoth = (control) => {
    stepPlain(referenceWorld, reference, control);
    stepGrip(candidateWorld, candidate, control, null);
    for (let axis = 0; axis < 3; axis++) {
      maxPositionError = Math.max(maxPositionError, Math.abs(reference.position[axis] - candidate.position[axis]));
      maxVelocityError = Math.max(maxVelocityError, Math.abs(reference.velocity[axis] - candidate.velocity[axis]));
    }
    vectorNear(reference.position, candidate.position, `frame ${frames} position`);
    vectorNear(reference.velocity, candidate.velocity, `frame ${frames} velocity`);
    vectorNear(reference.externalVelocity, candidate.externalVelocity, `frame ${frames} externalVelocity`);
    near(reference.lastConstraintSolveError, candidate.lastConstraintSolveError, `frame ${frames} solve error`, 1e-12);
    assert.equal(candidate.lastGripVerticalConstraintClips, 0);
    frames += 1;
  };

  for (let i = 0; i < 20; i++) stepBoth(intent());
  for (let i = 0; i < 75; i++) stepBoth(intent({ moveForward: 1 }));
  for (let i = 0; i < 3; i++) stepBoth(intent());
  for (let i = 0; i < 75; i++) stepBoth(intent({ jump: i === 0, jumpHeld: i < 8 }));

  const result = {
    frames,
    maxPositionError,
    maxVelocityError,
    finalPosition: [...candidate.position],
    finalVelocity: [...candidate.velocity],
    groundAcceleration: candidate.groundAcceleration,
    groundBraking: candidate.groundDeceleration,
  };
  b3.b3DestroyWorld(referenceWorld);
  b3.b3DestroyWorld(candidateWorld);
  return result;
}

function runCeilingSpecimen() {
  const world = makeWorld({ ceiling: true });
  const character = createE19GripDonorCharacter(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
  });
  const grip = {
    grips: [{ staticWorldAnchor: [0, 4.0, 0] }],
    desiredOffsets: [[0, 1.5, 0]],
    forcePerHand: 5000,
    rate: 12,
  };

  let peakY = character.position[1];
  let verticalClipFrames = 0;
  let peakBlockedVelocityAfterPolicy = 0;
  for (let frame = 0; frame < 120; frame++) {
    stepGrip(world, character, intent(), grip);
    peakY = Math.max(peakY, character.position[1]);
    if (character.lastGripVerticalConstraintClips > 0) verticalClipFrames += 1;
    if (character.lastPlaneCount > 0) {
      peakBlockedVelocityAfterPolicy = Math.max(peakBlockedVelocityAfterPolicy, Math.max(0, character.velocity[1]));
    }
  }

  const atRelease = {
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
  };
  stepGrip(world, character, intent(), null);
  const oneFrameAfterRelease = {
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
  };
  for (let frame = 1; frame < 30; frame++) stepGrip(world, character, intent(), null);

  const result = {
    ceilingUndersideY: 2.5,
    capsuleHalfHeight: character.halfHeight,
    expectedMaxCenterY: 2.5 - character.halfHeight,
    peakY,
    verticalClipFrames,
    peakBlockedVelocityAfterPolicy,
    atRelease,
    oneFrameAfterRelease,
    afterThirtyReleaseFrames: {
      position: [...character.position],
      velocity: [...character.velocity],
      externalVelocity: [...character.externalVelocity],
    },
    finalPlaneCount: character.lastPlaneCount,
    constraintSolveError: character.lastConstraintSolveError,
  };
  b3.b3DestroyWorld(world);
  return result;
}

function runTwoHandHang() {
  const world = makeWorld();
  const character = createE19GripDonorCharacter(b3, world, {
    startPosition: [0, 8, 0],
    gravity: 20,
  });
  const grips = [
    { staticWorldAnchor: [-0.28, 9.25, 0] },
    { staticWorldAnchor: [0.28, 9.25, 0] },
  ];
  const grip = {
    grips,
    desiredOffsets: [[-0.28, 1.25, 0], [0.28, 1.25, 0]],
    forcePerHand: 900,
    rate: 12,
  };
  let finalTelemetry = null;
  for (let frame = 0; frame < 360; frame++) finalTelemetry = stepGrip(world, character, intent(), grip);
  const result = {
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
    perGripForces: finalTelemetry.impulses.map((impulse) => Math.hypot(...impulse) / DT),
    verticalConstraintClips: character.lastGripVerticalConstraintClips,
  };
  b3.b3DestroyWorld(world);
  return result;
}

const ungripped = runUngroppedEquivalence();
const ceiling = runCeilingSpecimen();
const twoHandHang = runTwoHandHang();

assert.equal(ungripped.groundAcceleration, 31);
assert.equal(ungripped.groundBraking, 36);
assert.ok(ungripped.maxPositionError <= 1e-12, `ungripped E19 Donor changed accepted position behavior: ${ungripped.maxPositionError}`);
assert.ok(ungripped.maxVelocityError <= 1e-12, `ungripped E19 Donor changed accepted velocity behavior: ${ungripped.maxVelocityError}`);

assert.ok(ceiling.peakY <= ceiling.expectedMaxCenterY + 0.01, `grip-aware Donor bypassed ceiling geometry: ${ceiling.peakY}`);
assert.ok(ceiling.peakY >= ceiling.expectedMaxCenterY - 0.08, `ceiling specimen never reached geometry boundary: ${ceiling.peakY}`);
assert.ok(ceiling.verticalClipFrames > 60, `vertical constraint policy did not materially engage: ${ceiling.verticalClipFrames} frames`);
assert.ok(Math.abs(ceiling.atRelease.velocity[1]) < 0.05, `blocked upward velocity survived grip-aware policy: ${ceiling.atRelease.velocity[1]}`);
assert.ok(ceiling.peakBlockedVelocityAfterPolicy < 0.05, `latent blocked velocity remained after policy: ${ceiling.peakBlockedVelocityAfterPolicy}`);
assert.ok(ceiling.oneFrameAfterRelease.velocity[1] < 0, `release produced upward burst instead of gravity: ${ceiling.oneFrameAfterRelease.velocity[1]}`);
assert.ok(ceiling.oneFrameAfterRelease.position[1] < ceiling.atRelease.position[1], 'release did not immediately move away from ceiling');
assert.deepEqual(ceiling.atRelease.externalVelocity, [0, 0, 0]);
assert.deepEqual(ceiling.oneFrameAfterRelease.externalVelocity, [0, 0, 0]);

assert.ok(Math.abs(twoHandHang.position[1] - 8) < 0.03, `grip-aware policy broke two-hand hang: ${twoHandHang.position[1]}`);
assert.ok(twoHandHang.perGripForces.every((force) => force > 770 && force < 830), `two-hand load sharing changed unexpectedly: ${twoHandHang.perGripForces}`);
assert.deepEqual(twoHandHang.externalVelocity, [0, 0, 0]);
assert.equal(twoHandHang.verticalConstraintClips, 0);

const report = {
  schema: 'e19-0e-grip-aware-donor-vertical-constraint-v1',
  hypothesis: 'E19 can extend Donor constraint-velocity cleanup only while a grip is active, removing grip-induced vertical blocked velocity without changing ungripped A‴ behavior or static-grip load sharing.',
  boundary: 'Branch-local vertical-normal policy qualifier. It does not yet qualify slopes, arbitrary 3D contact normals, moving kinematic anchors, dynamic/mixed multi-frame grips, acquisition, hand bodies or gameplay feel.',
  ungripped,
  ceiling,
  twoHandHang,
  classification: 'GRIP_SCOPED_VERTICAL_CONSTRAINT_POLICY_REMOVES_LATENT_CEILING_VELOCITY_WITHOUT_UNGRIPPED_DONOR_REGRESSION',
};

console.log(JSON.stringify(report, null, 2));
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
