import Box3D from 'box3d.js/inline';
import { createConstraintVelocityCharacter } from '../src/constraint-velocity-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const WALL_YAW = Math.PI / 6;
const PARTIAL_INWARD_RATIO = 0.5;

function quatYaw(angle) {
  return [0, Math.sin(angle * 0.5), 0, Math.cos(angle * 0.5)];
}

function dotXZ(a, b) {
  return a[0] * b[0] + a[2] * b[2];
}

function normalizeXZ(v) {
  const length = Math.hypot(v[0], v[2]);
  if (length < 1e-9) throw new Error('E2.3d oblique test received degenerate vector');
  return [v[0] / length, 0, v[2] / length];
}

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  function box(position, half, rotation = [0, 0, 0, 1]) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_staticBody;
    bodyDef.position = [...position];
    bodyDef.rotation = [...rotation];
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = 0.8;
    shapeDef.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  box([0, -0.5, 0], [14, 0.5, 14]);
  box([2.0, 0.3, 0], [0.1, 0.3, 8.0], quatYaw(WALL_YAW));
  return { world };
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

function tick(setup, character, control = intent()) {
  character.preStep(DT, control);
  b3.b3World_Step(setup.world, DT, SUBSTEPS);
  character.postStep(DT);
  return {
    position: [...character.position],
    velocity: [...character.velocity],
    clips: character.lastConstraintClips,
    solveError: character.lastConstraintSolveError,
    planes: character.lastPlaneCount,
  };
}

function settle(setup, character) {
  for (let i = 0; i < 25; i++) tick(setup, character);
  if (!character.currentSupport) throw new Error('E2.3d oblique setup failed to settle');
}

function activeHorizontalNormal(character) {
  const capsule = {
    center1: [0, -character.halfSegment, 0],
    center2: [0, character.halfSegment, 0],
    radius: character.radius,
  };
  const { planes } = character._collectPlanes(capsule);
  let best = null;
  let bestInward = Infinity;
  for (const plane of planes) {
    const normal = plane.plane.normal;
    const h = Math.hypot(normal[0], normal[2]);
    if (h < 0.8) continue;
    const n = [normal[0] / h, 0, normal[2] / h];
    const inward = dotXZ(character.velocity, n);
    if (inward < bestInward) {
      bestInward = inward;
      best = n;
    }
  }
  if (!best || bestInward > -0.5) {
    throw new Error(`E2.3d oblique wall did not expose an inward horizontal constraint (best=${bestInward})`);
  }
  return best;
}

function makeBlockedTrial() {
  const setup = makeWorld();
  const character = createConstraintVelocityCharacter(b3, setup.world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
  });
  settle(setup, character);

  let constrainedFrames = 0;
  let maxSolveError = 0;
  for (let i = 0; i < 90; i++) {
    const frame = tick(setup, character, intent({ moveForward: 1 }));
    if (frame.planes > 1) constrainedFrames += 1;
    maxSolveError = Math.max(maxSolveError, frame.solveError);
  }
  if (constrainedFrames < 20) {
    b3.b3DestroyWorld(setup.world);
    throw new Error(`E2.3d oblique wall failed sustained contact (${constrainedFrames}f)`);
  }

  const normal = activeHorizontalNormal(character);
  let tangent = normalizeXZ([-normal[2], 0, normal[0]]);
  if (dotXZ(character.velocity, tangent) < 0) tangent = [-tangent[0], 0, -tangent[2]];
  return { setup, character, normal, tangent, maxSolveError };
}

function tangentReleaseTrial() {
  const trial = makeBlockedTrial();
  const { setup, character, normal, tangent } = trial;
  let maxSolveError = trial.maxSolveError;
  const start = [...character.position];
  let clipCount = 0;

  const first = tick(
    setup,
    character,
    intent({ forward: tangent, moveForward: 1, jump: true, jumpHeld: true }),
  );
  clipCount += first.clips;
  maxSolveError = Math.max(maxSolveError, first.solveError);
  const firstNormalVelocity = dotXZ(first.velocity, normal);

  let maxNormalTravel = Math.abs(dotXZ([
    first.position[0] - start[0],
    0,
    first.position[2] - start[2],
  ], normal));
  let maxTangentTravel = dotXZ([
    first.position[0] - start[0],
    0,
    first.position[2] - start[2],
  ], tangent);

  for (let i = 0; i < 35; i++) {
    const frame = tick(
      setup,
      character,
      intent({ forward: tangent, moveForward: 1, jumpHeld: i < 7 }),
    );
    clipCount += frame.clips;
    maxSolveError = Math.max(maxSolveError, frame.solveError);
    const displacement = [frame.position[0] - start[0], 0, frame.position[2] - start[2]];
    maxNormalTravel = Math.max(maxNormalTravel, Math.abs(dotXZ(displacement, normal)));
    maxTangentTravel = Math.max(maxTangentTravel, dotXZ(displacement, tangent));
  }

  const result = {
    normal,
    firstNormalVelocity,
    maxNormalTravel,
    maxTangentTravel,
    clipCount,
    maxSolveError,
  };
  b3.b3DestroyWorld(setup.world);
  return result;
}

function partialInwardTrial() {
  const trial = makeBlockedTrial();
  const { setup, character, normal, tangent } = trial;
  let maxSolveError = trial.maxSolveError;
  const desiredDirection = normalizeXZ([
    tangent[0] - PARTIAL_INWARD_RATIO * normal[0],
    0,
    tangent[2] - PARTIAL_INWARD_RATIO * normal[2],
  ]);
  const expectedNormalVelocity = 5.2 * dotXZ(desiredDirection, normal);

  const first = tick(
    setup,
    character,
    intent({ forward: desiredDirection, moveForward: 1 }),
  );
  maxSolveError = Math.max(maxSolveError, first.solveError);
  const firstNormalVelocity = dotXZ(first.velocity, normal);
  const firstTangentVelocity = dotXZ(first.velocity, tangent);

  let clipCount = first.clips;
  let maxNormalError = Math.abs(firstNormalVelocity - expectedNormalVelocity);
  let tangentTravel = 0;
  const start = [...character.position];
  for (let i = 0; i < 20; i++) {
    const frame = tick(setup, character, intent({ forward: desiredDirection, moveForward: 1 }));
    clipCount += frame.clips;
    maxSolveError = Math.max(maxSolveError, frame.solveError);
    const currentNormalVelocity = dotXZ(frame.velocity, normal);
    // While the wall remains active, the candidate may not carry more inward
    // authority than current intent justifies. Once it slides clear the
    // constraint no longer owns that component, so only inspect constrained frames.
    if (frame.planes > 1) {
      maxNormalError = Math.max(
        maxNormalError,
        Math.max(0, expectedNormalVelocity - currentNormalVelocity),
      );
    }
    tangentTravel = Math.max(
      tangentTravel,
      dotXZ([frame.position[0] - start[0], 0, frame.position[2] - start[2]], tangent),
    );
  }

  const result = {
    normal,
    desiredDirection,
    expectedNormalVelocity,
    firstNormalVelocity,
    firstTangentVelocity,
    maxNormalError,
    tangentTravel,
    clipCount,
    maxSolveError,
  };
  b3.b3DestroyWorld(setup.world);
  return result;
}

function f(value) {
  return Number.isFinite(value) ? value.toFixed(3) : 'n/a';
}

const tangent = tangentReleaseTrial();
const partial = partialInwardTrial();

if (Math.abs(tangent.firstNormalVelocity) > 0.08 || tangent.maxNormalTravel > 0.16) {
  throw new Error(`E2.3d oblique tangent release leaked stale normal authority: ${JSON.stringify(tangent)}`);
}
if (tangent.maxTangentTravel < 1.2 || tangent.clipCount <= 0) {
  throw new Error(`E2.3d oblique tangent release lost tangential authority: ${JSON.stringify(tangent)}`);
}
if (Math.abs(partial.firstNormalVelocity - partial.expectedNormalVelocity) > 0.08) {
  throw new Error(`E2.3d oblique partial-intent cap missed projected target: ${JSON.stringify(partial)}`);
}
if (partial.firstTangentVelocity < 1.5 || partial.tangentTravel < 0.8 || partial.clipCount <= 0) {
  throw new Error(`E2.3d oblique partial-intent trial lost tangent motion: ${JSON.stringify(partial)}`);
}
if (partial.maxNormalError > 0.10) {
  throw new Error(`E2.3d oblique partial-intent trial exceeded allowed inward normal authority: ${JSON.stringify(partial)}`);
}
const maxSolveError = Math.max(tangent.maxSolveError, partial.maxSolveError);
if (maxSolveError > 2e-5) throw new Error(`E2.3d oblique solve reconstruction diverged: ${maxSolveError}`);

const angleDeg = Math.atan2(tangent.normal[2], tangent.normal[0]) * 180 / Math.PI;
console.log(
  `E2.3d oblique constraint qualification PASS: normal=${angleDeg.toFixed(1)}deg tangentVn=${f(tangent.firstNormalVelocity)} tangentTravel=${f(tangent.maxTangentTravel)} normalTravel=${f(tangent.maxNormalTravel)} partialExpected=${f(partial.expectedNormalVelocity)} partialVn=${f(partial.firstNormalVelocity)} partialVt=${f(partial.firstTangentVelocity)} partialTravel=${f(partial.tangentTravel)} clips=${tangent.clipCount}/${partial.clipCount} maxSolveErr=${maxSolveError.toExponential(2)}`,
);
