import Box3D from 'box3d.js/inline';

const b3 = await Box3D();

const required = [
  'b3DefaultWorldDef',
  'b3CreateWorld',
  'b3World_Step',
  'b3DefaultBodyDef',
  'b3CreateBody',
  'b3DefaultShapeDef',
  'b3CreateBoxShape',
  'b3DefaultQueryFilter',
  'b3World_CollideMover',
  'b3SolvePlanes',
  'b3World_CastMover',
  'b3ClipVector',
  'createPlaneResult',
  'getNumPlaneResults',
  'getPlaneResultAt',
  'b3Shape_GetBody',
  'b3Body_GetMass',
  'b3DestroyWorld',
];

for (const name of required) {
  if (typeof b3[name] !== 'function') throw new Error(`Missing required box3d.js API: ${name}`);
}

const DT = 1 / 60;
const GRAVITY = 10;
const HALF_SEGMENT = 0.55;
const RADIUS = 0.35;
const HALF_HEIGHT = HALF_SEGMENT + RADIUS;
const SUPPORT_MIN_Y = 0.55;
const capsule = {
  center1: [0, -HALF_SEGMENT, 0],
  center2: [0, HALF_SEGMENT, 0],
  radius: RADIUS,
};

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -GRAVITY, 0];
const world = b3.b3CreateWorld(worldDef);
const scratch = b3.createPlaneResult();
const filter = b3.b3DefaultQueryFilter();

function createStaticBox(position, halfExtents) {
  const def = b3.b3DefaultBodyDef();
  def.position = [...position];
  const body = b3.b3CreateBody(world, def);
  b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), halfExtents[0], halfExtents[1], halfExtents[2]);
}

createStaticBox([0, -0.25, 0], [1.5, 0.25, 1.5]);

function moveStep(state) {
  state.velocity[1] -= GRAVITY * DT;
  const target = [
    state.position[0] + state.velocity[0] * DT,
    state.position[1] + state.velocity[1] * DT,
    state.position[2] + state.velocity[2] * DT,
  ];

  let lastPlanes = [];
  for (let iteration = 0; iteration < 5; iteration++) {
    const planes = [];
    b3.b3World_CollideMover(world, state.position, capsule, filter, (_shapeId, buffer) => {
      const count = b3.getNumPlaneResults(buffer);
      for (let i = 0; i < count; i++) {
        b3.getPlaneResultAt(scratch, buffer, i);
        planes.push({
          plane: {
            normal: [...scratch.plane.normal],
            offset: scratch.plane.offset,
          },
          pushLimit: 3.4e38,
          push: 0,
          clipVelocity: true,
        });
      }
      return true;
    });

    const targetDelta = [
      target[0] - state.position[0],
      target[1] - state.position[1],
      target[2] - state.position[2],
    ];
    const solved = b3.b3SolvePlanes(targetDelta, planes);
    let delta = solved.delta;
    const fraction = b3.b3World_CastMover(world, state.position, capsule, delta, filter, () => true);
    delta = delta.map((value) => value * fraction);
    state.position = state.position.map((value, index) => value + delta[index]);
    lastPlanes = planes;
    if (delta[0] * delta[0] + delta[1] * delta[1] + delta[2] * delta[2] < 0.000004) break;
  }

  state.velocity = b3.b3ClipVector(state.velocity, lastPlanes);
  state.supported = state.velocity[1] <= 0.05 && lastPlanes.some((plane) => plane.plane.normal[1] > SUPPORT_MIN_Y);
  if (state.supported && state.velocity[1] < 0) state.velocity[1] = 0;
  b3.b3World_Step(world, DT, 4);
}

try {
  const state = {
    position: [0, 3.0, 0],
    velocity: [0, 0, 0],
    supported: false,
  };

  let landed = false;
  for (let i = 0; i < 240; i++) {
    moveStep(state);
    if (state.supported) {
      landed = true;
      break;
    }
  }

  if (!landed) throw new Error(`Static landing failed: y=${state.position[1].toFixed(3)}`);
  if (Math.abs(state.position[1] - HALF_HEIGHT) > 0.08) {
    throw new Error(`Unexpected supported height: y=${state.position[1].toFixed(3)}`);
  }

  state.velocity[1] = 4.6;
  state.supported = false;
  let apex = state.position[1];
  let returned = false;
  for (let i = 0; i < 180; i++) {
    moveStep(state);
    apex = Math.max(apex, state.position[1]);
    if (i > 10 && state.supported) {
      returned = true;
      break;
    }
  }

  if (apex < HALF_HEIGHT + 0.7) throw new Error(`Jump apex too low: ${apex.toFixed(3)}`);
  if (!returned) throw new Error(`Jump did not return to support: y=${state.position[1].toFixed(3)}`);

  state.position = [2.4, HALF_HEIGHT + 0.02, 0];
  state.velocity = [0, 0, 0];
  state.supported = false;
  const startY = state.position[1];
  for (let i = 0; i < 30; i++) moveStep(state);

  if (state.supported) throw new Error('Support-loss probe incorrectly stayed supported outside platform');
  if (!(state.position[1] < startY - 0.2)) throw new Error(`Support-loss probe did not fall: y=${state.position[1].toFixed(3)}`);

  console.log(`E1-A2 Gate 1 smoke PASS: landingY=${HALF_HEIGHT.toFixed(2)}, apex=${apex.toFixed(2)}, fallY=${state.position[1].toFixed(2)}`);
} finally {
  b3.b3DestroyWorld(world);
}