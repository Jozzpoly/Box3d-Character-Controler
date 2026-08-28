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
  'b3Body_GetLinearVelocity',
  'b3Body_ApplyLinearImpulse',
  'b3DestroyWorld',
];

for (const name of required) {
  if (typeof b3[name] !== 'function') {
    throw new Error(`Missing required box3d.js API: ${name}`);
  }
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);

try {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [0, 0, 0];
  const body = b3.b3CreateBody(world, bodyDef);

  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.density = 25;
  const shape = b3.b3CreateBoxShape(body, shapeDef, 0.65, 0.65, 0.65);

  const ownerBody = b3.b3Shape_GetBody(shape);
  const mass = b3.b3Body_GetMass(ownerBody);
  if (!Number.isFinite(mass) || mass <= 0) {
    throw new Error(`Unexpected dynamic body mass: ${mass}`);
  }

  const capsule = {
    center1: [0, -0.55, 0],
    center2: [0, 0.55, 0],
    radius: 0.35,
  };
  const moverPosition = [0, 0, 0.95];
  const filter = b3.b3DefaultQueryFilter();
  const scratch = b3.createPlaneResult();
  const planes = [];

  b3.b3World_CollideMover(world, moverPosition, capsule, filter, (_shapeId, buffer) => {
    const count = b3.getNumPlaneResults(buffer);
    for (let i = 0; i < count; i++) {
      b3.getPlaneResultAt(scratch, buffer, i);
      const normal = scratch.plane.normal;
      planes.push({
        plane: {
          normal: [normal[0], normal[1], normal[2]],
          offset: scratch.plane.offset,
        },
        pushLimit: 3.4e38,
        push: 0,
        clipVelocity: true,
      });
    }
    return true;
  });

  if (planes.length === 0) {
    throw new Error('Mover collision probe produced no planes');
  }

  const solved = b3.b3SolvePlanes([0, 0, -0.5], planes);
  if (!solved || !Array.isArray(solved.delta) || solved.delta.some((value) => !Number.isFinite(value))) {
    throw new Error('b3SolvePlanes did not return a finite delta');
  }

  const fraction = b3.b3World_CastMover(world, moverPosition, capsule, solved.delta, filter, () => true);
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new Error(`Unexpected mover cast fraction: ${fraction}`);
  }

  b3.b3Body_ApplyLinearImpulse(body, [0, 0, -mass * 2], [0.3, 0, 0], true);
  b3.b3World_Step(world, 1 / 60, 4);

  const velocity = [0, 0, 0];
  b3.b3Body_GetLinearVelocity(velocity, body);
  if (!Number.isFinite(velocity[2]) || velocity[2] >= -0.5) {
    throw new Error(`Dynamic impulse probe failed, vz=${velocity[2]}`);
  }

  console.log(`E1-A1 smoke PASS: planes=${planes.length}, mass=${mass.toFixed(2)}, vz=${velocity[2].toFixed(2)}`);
} finally {
  b3.b3DestroyWorld(world);
}
