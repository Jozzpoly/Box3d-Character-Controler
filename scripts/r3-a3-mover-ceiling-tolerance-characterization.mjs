import assert from 'node:assert/strict';
import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const RADIUS = 0.36;
const HALF_SEGMENT = 0.54;
const HALF_HEIGHT = RADIUS + HALF_SEGMENT;
const START_Y = 1.42;
const CEILING_BOTTOM = START_Y + HALF_HEIGHT + 0.18;
const REQUESTED_DY = 0.40;

function createStaticBox(world, position, half) {
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.position = [...position];
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  b3.b3CreateBoxShape(body, shapeDef, ...half);
  return body;
}

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);
try {
  createStaticBox(world, [0, CEILING_BOTTOM + 0.20, 0], [2, 0.20, 2]);
  const capsule = {
    center1: [0, -HALF_SEGMENT, 0],
    center2: [0, HALF_SEGMENT, 0],
    radius: RADIUS,
  };
  const position = [0, START_Y, 0];
  const delta = [0, REQUESTED_DY, 0];
  const filter = b3.b3DefaultQueryFilter();
  const fraction = b3.b3World_CastMover(world, position, capsule, delta, filter, () => true);
  const appliedDy = REQUESTED_DY * fraction;
  const initialTop = START_Y + HALF_HEIGHT;
  const mathematicalGap = CEILING_BOTTOM - initialTop;
  const resultingTop = initialTop + appliedDy;
  const geometricOvershoot = resultingTop - CEILING_BOTTOM;

  assert.ok(fraction > 0 && fraction < 1, 'ceiling must clip the mover cast');
  assert.ok(appliedDy < REQUESTED_DY, 'mover cast must reject the full requested displacement');
  assert.ok(Math.abs(mathematicalGap - 0.18) < 1e-9);

  console.log('R3 A3 MOVER CEILING TOLERANCE CHARACTERIZATION PASS');
  console.log(JSON.stringify({
    binding: 'box3d.js@0.1.1',
    radius: RADIUS,
    halfSegment: HALF_SEGMENT,
    halfHeight: HALF_HEIGHT,
    initialTop,
    ceilingBottom: CEILING_BOTTOM,
    mathematicalGap,
    requestedDy: REQUESTED_DY,
    fraction,
    appliedDy,
    resultingTop,
    geometricOvershoot,
    geometricOvershootCm: geometricOvershoot * 100,
    interpretation: 'THIS_IS_BINDING_CHARACTERIZATION_ONLY; IT_DOES_NOT_DECLARE_THE_OBSERVED_OVERSHOOT_DESIRABLE',
  }, null, 2));
} finally {
  b3.b3DestroyWorld(world);
}
