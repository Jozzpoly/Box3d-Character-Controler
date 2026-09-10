import fs from 'node:fs';
import path from 'node:path';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter, CURRENT_DONOR_REVISION } from '../src/donor/index.js';
import { applyIntentCappedRelativeConstraintVelocity } from '../src/constraint-velocity.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;

function enumValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

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

function createStaticBox(world, position, half) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0;
  shapeDef.baseMaterial.restitution = 0;
  return b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
}

function dot3(a, c) {
  return a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
}

function sub3(a, c) {
  return [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
}

function maxAbsDelta(a, c) {
  return Math.max(Math.abs(a[0] - c[0]), Math.abs(a[1] - c[1]), Math.abs(a[2] - c[2]));
}

function runCeilingRuntimeCase() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);

  try {
    const ceilingBottom = 2.15;
    createStaticBox(world, [0, ceilingBottom + 0.10, 0], [3, 0.10, 3]);
    const character = createCurrentDonorCharacter(b3, world, {
      startPosition: [0, 1.0, 0],
      gravity: 0,
      airAcceleration: 0,
      airDeceleration: 0,
      externalAirDrag: 0,
    });
    character.velocity = [0, 6, 0];

    const expectedMaxCenterY = ceilingBottom - character.halfHeight;
    const samples = [];
    let firstConstraintFrame = -1;
    let firstConstraintY = null;
    let firstConstraintVy = null;
    let maxY = character.position[1];

    for (let frame = 0; frame < 24; frame++) {
      character.preStep(DT, neutralIntent());
      b3.b3World_Step(world, DT, SUBSTEPS);
      character.postStep(DT);
      maxY = Math.max(maxY, character.position[1]);
      if (character.lastPlaneCount > 0 && firstConstraintFrame < 0) {
        firstConstraintFrame = frame;
        firstConstraintY = character.position[1];
        firstConstraintVy = character.velocity[1];
      }
      samples.push({
        frame,
        y: character.position[1],
        vy: character.velocity[1],
        planes: character.lastPlaneCount,
        constraintClips: character.lastConstraintClips,
        support: character.currentSupport?.type ?? 'AIR',
      });
    }

    if (firstConstraintFrame < 0) throw new Error('A2a ceiling case never activated a mover constraint');
    const constrained = samples.filter((sample) => sample.planes > 0);
    if (constrained.length < 5) throw new Error(`A2a ceiling contact too brief: ${constrained.length} frames`);
    const minConstrainedVy = Math.min(...constrained.map((sample) => sample.vy));
    const maxConstrainedVy = Math.max(...constrained.map((sample) => sample.vy));
    const maxBoundaryOvershoot = maxY - expectedMaxCenterY;
    const final = samples.at(-1);

    return {
      ceilingBottom,
      characterHalfHeight: character.halfHeight,
      expectedMaxCenterY,
      initialVelocityY: 6,
      firstConstraintFrame,
      firstConstraintY,
      firstConstraintVy,
      constrainedFrames: constrained.length,
      minConstrainedVy,
      maxConstrainedVy,
      final,
      maxY,
      maxBoundaryOvershoot,
      classification:
        Math.abs(final.vy) > 1 && final.planes > 0
          ? 'GEOMETRY_BLOCKED_BUT_UPWARD_VELOCITY_REMAINS_STORED'
          : 'UPWARD_VELOCITY_SETTLED_OR_CONTACT_NOT_SUSTAINED',
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

function makePlane(normal) {
  return {
    plane: { normal: [...normal], offset: 0 },
    pushLimit: 3.4e38,
    push: 0,
    clipVelocity: true,
  };
}

function runPolicyOrderCase({ name, normals, velocity }) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(worldDef);

  try {
    const shapeA = createStaticBox(world, [20, 0, 0], [0.5, 0.5, 0.5]);
    const shapeB = createStaticBox(world, [22, 0, 0], [0.5, 0.5, 0.5]);
    const staticType = enumValue(b3.b3BodyType.b3_staticBody);
    const typeA = enumValue(b3.b3Body_GetType(b3.b3Shape_GetBody(shapeA)));
    const typeB = enumValue(b3.b3Body_GetType(b3.b3Shape_GetBody(shapeB)));
    if (typeA !== staticType || typeB !== staticType) throw new Error(`${name}: dummy shapes are not static`);

    function evaluate(order) {
      const orderedNormals = order.map((index) => normals[index]);
      const orderedShapes = order.map((index) => (index === 0 ? shapeA : shapeB));
      const result = applyIntentCappedRelativeConstraintVelocity({
        b3,
        velocity,
        desiredVelocity: [0, 0, 0],
        planes: orderedNormals.map(makePlane),
        extras: orderedShapes.map((shapeId) => ({ shapeId, point: [0, 0, 0] })),
        recoveredPushes: order.map(() => 1),
        bodyPointVelocity: () => [0, 0, 0],
      });
      return {
        order,
        output: result.velocity,
        clippedComponents: result.clippedComponents,
        finalDotAgainstNormal0: dot3(result.velocity, normals[0]),
        finalDotAgainstNormal1: dot3(result.velocity, normals[1]),
        maxInwardViolation: Math.max(
          0,
          -dot3(result.velocity, normals[0]),
          -dot3(result.velocity, normals[1]),
        ),
      };
    }

    const forward = evaluate([0, 1]);
    const reverse = evaluate([1, 0]);
    return {
      name,
      normals,
      normalDot: dot3(normals[0], normals[1]),
      inputVelocity: velocity,
      inputDots: [dot3(velocity, normals[0]), dot3(velocity, normals[1])],
      forward,
      reverse,
      orderOutputDelta: maxAbsDelta(forward.output, reverse.output),
      classification:
        maxAbsDelta(forward.output, reverse.output) > 1e-6
          ? 'OUTPUT_DEPENDS_ON_ACTIVE_PLANE_ORDER'
          : 'ORDER_INVARIANT_FOR_THIS_CASE',
    };
  } finally {
    b3.b3DestroyWorld(world);
  }
}

if (CURRENT_DONOR_REVISION !== 'v1') {
  throw new Error(`A2 expected current Donor v1, got ${CURRENT_DONOR_REVISION}`);
}

const ceiling = runCeilingRuntimeCase();

// Accessible free-space wedge of 75 degrees => inward-facing constraint normals are
// separated by 105 degrees. Input velocity points into both constraints symmetrically.
const angle = 105 * Math.PI / 180;
const acuteNormals = [
  [1, 0, 0],
  [Math.cos(angle), 0, Math.sin(angle)],
];
const acuteVelocity = [
  -(acuteNormals[0][0] + acuteNormals[1][0]),
  0,
  -(acuteNormals[0][2] + acuteNormals[1][2]),
];
const acuteCorner = runPolicyOrderCase({
  name: '75deg-free-space-wedge',
  normals: acuteNormals,
  velocity: acuteVelocity,
});

const orthogonalCorner = runPolicyOrderCase({
  name: '90deg-orthogonal-control',
  normals: [[1, 0, 0], [0, 0, 1]],
  velocity: [-1, 0, -1],
});

if (ceiling.classification !== 'GEOMETRY_BLOCKED_BUT_UPWARD_VELOCITY_REMAINS_STORED') {
  throw new Error(`A2a did not reproduce stored ceiling velocity: ${JSON.stringify(ceiling)}`);
}
if (Math.abs(ceiling.maxBoundaryOvershoot) > 0.03) {
  throw new Error(`A2a geometry did not remain bounded near ceiling: overshoot=${ceiling.maxBoundaryOvershoot}`);
}
if (acuteCorner.classification !== 'OUTPUT_DEPENDS_ON_ACTIVE_PLANE_ORDER') {
  throw new Error(`A2b acute corner did not reproduce order dependence: ${JSON.stringify(acuteCorner)}`);
}
if (acuteCorner.forward.maxInwardViolation < 0.05 || acuteCorner.reverse.maxInwardViolation < 0.05) {
  throw new Error(`A2b acute corner did not leave a meaningful re-violated constraint`);
}
if (orthogonalCorner.orderOutputDelta > 1e-9 || orthogonalCorner.forward.maxInwardViolation > 1e-9 || orthogonalCorner.reverse.maxInwardViolation > 1e-9) {
  throw new Error(`A2b orthogonal control unexpectedly depends on order: ${JSON.stringify(orthogonalCorner)}`);
}

const payload = {
  experiment: 'A2 constraint-velocity boundary crucible',
  donorRevision: CURRENT_DONOR_REVISION,
  dt: DT,
  substeps: SUBSTEPS,
  interpretationBoundary: 'Characterizes current Donor v1. No repair is applied and no generalized 3D policy is endorsed by this test.',
  ceiling,
  acuteCorner,
  orthogonalCorner,
};

fs.mkdirSync(path.join('tmp', 'a2'), { recursive: true });
fs.writeFileSync(path.join('tmp', 'a2', 'results.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('A2 constraint-velocity CHARACTERIZATION COMPLETE');
console.log(`ceiling: constraintFrame=${ceiling.firstConstraintFrame} y=${ceiling.final.y.toFixed(4)} vy=${ceiling.final.vy.toFixed(4)} planes=${ceiling.final.planes} clips=${ceiling.final.constraintClips}`);
console.log(`acute-corner: orderDelta=${acuteCorner.orderOutputDelta.toFixed(6)} forwardViolation=${acuteCorner.forward.maxInwardViolation.toFixed(6)} reverseViolation=${acuteCorner.reverse.maxInwardViolation.toFixed(6)}`);
console.log(`orthogonal-control: orderDelta=${orthogonalCorner.orderOutputDelta.toExponential(3)} maxViolation=${Math.max(orthogonalCorner.forward.maxInwardViolation, orthogonalCorner.reverse.maxInwardViolation).toExponential(3)}`);
console.log(JSON.stringify(payload));
