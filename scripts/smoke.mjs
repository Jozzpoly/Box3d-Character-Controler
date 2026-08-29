import Box3D from 'box3d.js/inline';

const b3 = await Box3D();
const required = [
  'b3DefaultWorldDef', 'b3CreateWorld', 'b3World_Step', 'b3DefaultBodyDef', 'b3CreateBody',
  'b3DefaultShapeDef', 'b3CreateBoxShape', 'b3DefaultQueryFilter', 'b3World_CollideMover',
  'b3SolvePlanes', 'b3World_CastMover', 'b3ClipVector', 'createPlaneResult', 'getNumPlaneResults',
  'getPlaneResultAt', 'b3Shape_GetBody', 'b3Body_GetMass', 'b3Body_GetPosition',
  'b3Body_GetLinearVelocity', 'b3Body_ApplyLinearImpulse', 'b3DestroyWorld',
];
for (const name of required) {
  if (typeof b3[name] !== 'function') throw new Error(`Missing required box3d.js API: ${name}`);
}

const DT = 1 / 60;
const GRAVITY = 10;
const PLAYER_MASS = 80;
const HALF_SEGMENT = 0.55;
const RADIUS = 0.35;
const SUPPORT_MIN_Y = 0.55;
const capsule = { center1: [0, -HALF_SEGMENT, 0], center2: [0, HALF_SEGMENT, 0], radius: RADIUS };
const filter = b3.b3DefaultQueryFilter();
const scratch = b3.createPlaneResult();

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -GRAVITY, 0];
const world = b3.b3CreateWorld(worldDef);

function createStaticBox(position, half) {
  const def = b3.b3DefaultBodyDef();
  def.position = [...position];
  const body = b3.b3CreateBody(world, def);
  b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), half[0], half[1], half[2]);
}

createStaticBox([0, -0.25, 0], [8, 0.25, 8]);
const platformDef = b3.b3DefaultBodyDef();
platformDef.type = b3.b3BodyType.b3_dynamicBody;
platformDef.position = [0, 0.3, 0];
platformDef.linearDamping = 0.15;
platformDef.angularDamping = 0.7;
const platform = b3.b3CreateBody(world, platformDef);
const platformShapeDef = b3.b3DefaultShapeDef();
platformShapeDef.density = 35;
platformShapeDef.baseMaterial.friction = 0.7;
b3.b3CreateBoxShape(platform, platformShapeDef, 1.25, 0.3, 1.25);
const platformMass = b3.b3Body_GetMass(platform);
if (!(platformMass > PLAYER_MASS)) throw new Error(`Unexpected platform mass ${platformMass}`);

const bodyVelocity = [0, 0, 0];
const bodyPosition = [0, 0, 0];

function collectPlanes(position) {
  const planes = [];
  const extras = [];
  b3.b3World_CollideMover(world, position, capsule, filter, (shapeId, buffer) => {
    const count = b3.getNumPlaneResults(buffer);
    for (let i = 0; i < count; i++) {
      b3.getPlaneResultAt(scratch, buffer, i);
      planes.push({
        plane: { normal: [...scratch.plane.normal], offset: scratch.plane.offset },
        pushLimit: 3.4e38,
        push: 0,
        clipVelocity: true,
      });
      extras.push({
        shapeId,
        point: [position[0] + scratch.point[0], position[1] + scratch.point[1], position[2] + scratch.point[2]],
      });
    }
    return true;
  });
  return { planes, extras };
}

function moveCharacter(state) {
  state.velocity[1] -= GRAVITY * DT;
  const target = state.position.map((value, i) => value + state.velocity[i] * DT);
  let lastPlanes = [];
  let lastExtras = [];

  for (let iteration = 0; iteration < 5; iteration++) {
    const { planes, extras } = collectPlanes(state.position);
    const targetDelta = target.map((value, i) => value - state.position[i]);
    const solved = b3.b3SolvePlanes(targetDelta, planes);
    let delta = solved.delta;
    const fraction = b3.b3World_CastMover(world, state.position, capsule, delta, filter, () => true);
    delta = delta.map((value) => value * fraction);
    state.position = state.position.map((value, i) => value + delta[i]);
    lastPlanes = planes;
    lastExtras = extras;
    if (delta.reduce((sum, value) => sum + value * value, 0) < 0.000004) break;
  }

  const preClip = [...state.velocity];
  let support = null;
  let bestUp = SUPPORT_MIN_Y;
  for (let i = 0; i < lastPlanes.length; i++) {
    const up = lastPlanes[i].plane.normal[1];
    if (up > bestUp && preClip[1] <= 0.05) {
      const body = b3.b3Shape_GetBody(lastExtras[i].shapeId);
      const mass = b3.b3Body_GetMass(body);
      support = {
        body,
        type: mass > 0 ? 'DYNAMIC' : 'STATIC',
        normal: lastPlanes[i].plane.normal,
        point: lastExtras[i].point,
      };
      bestUp = up;
    }
  }

  let loadImpulse = 0;
  if (support?.type === 'DYNAMIC') {
    b3.b3Body_GetLinearVelocity(bodyVelocity, support.body);
    const relative = preClip.map((value, i) => value - bodyVelocity[i]);
    const closing = relative.reduce((sum, value, i) => sum + value * support.normal[i], 0);
    if (closing < 0) {
      loadImpulse = PLAYER_MASS * -closing;
      const impulse = support.normal.map((value) => -value * loadImpulse);
      b3.b3Body_ApplyLinearImpulse(support.body, impulse, support.point, true);
    }
  }

  state.velocity = b3.b3ClipVector(state.velocity, lastPlanes);
  if (support && state.velocity[1] < 0) state.velocity[1] = 0;
  state.support = support;
  return loadImpulse;
}

function captureAndStepSupport(state) {
  let before = null;
  if (state.support?.type === 'DYNAMIC') {
    b3.b3Body_GetPosition(bodyPosition, state.support.body);
    before = [...bodyPosition];
  }
  b3.b3World_Step(world, DT, 4);
  if (before) {
    b3.b3Body_GetPosition(bodyPosition, state.support.body);
    state.position = state.position.map((value, i) => value + bodyPosition[i] - before[i]);
  }
}

try {
  for (let i = 0; i < 90; i++) b3.b3World_Step(world, DT, 4);

  const state = { position: [0, 3.0, 0], velocity: [0, 0, 0], support: null };
  let dynamicLanding = false;
  let peakLoad = 0;
  for (let i = 0; i < 240; i++) {
    captureAndStepSupport(state);
    peakLoad = Math.max(peakLoad, moveCharacter(state));
    if (state.support?.type === 'DYNAMIC') {
      dynamicLanding = true;
      break;
    }
  }
  if (!dynamicLanding) throw new Error(`Dynamic landing failed, y=${state.position[1].toFixed(3)}`);
  if (peakLoad < PLAYER_MASS) throw new Error(`Landing load impulse too small: ${peakLoad.toFixed(2)}`);

  let standingLoad = 0;
  for (let i = 0; i < 45; i++) {
    captureAndStepSupport(state);
    standingLoad += moveCharacter(state);
  }
  if (standingLoad < 300) throw new Error(`Standing load did not accumulate: ${standingLoad.toFixed(2)}`);
  if (state.support?.type !== 'DYNAMIC') throw new Error('Dynamic support was lost during standing-load probe');

  b3.b3Body_GetPosition(bodyPosition, platform);
  const startPlatformX = bodyPosition[0];
  const startRelativeX = state.position[0] - startPlatformX;
  b3.b3Body_ApplyLinearImpulse(platform, [platformMass * 1.5, 0, 0], [...bodyPosition], true);
  for (let i = 0; i < 30; i++) {
    captureAndStepSupport(state);
    moveCharacter(state);
  }
  b3.b3Body_GetPosition(bodyPosition, platform);
  const platformDx = bodyPosition[0] - startPlatformX;
  const endRelativeX = state.position[0] - bodyPosition[0];
  if (platformDx < 0.08) throw new Error(`Dynamic support nudge barely moved: dx=${platformDx.toFixed(3)}`);
  if (Math.abs(endRelativeX - startRelativeX) > 0.12) {
    throw new Error(`Support transport drifted: startRel=${startRelativeX.toFixed(3)}, endRel=${endRelativeX.toFixed(3)}`);
  }

  state.velocity[0] = -4;
  let lostSupport = false;
  let yAtLoss = state.position[1];
  for (let i = 0; i < 90; i++) {
    captureAndStepSupport(state);
    moveCharacter(state);
    if (!state.support) {
      lostSupport = true;
      yAtLoss = state.position[1];
      break;
    }
  }
  if (!lostSupport) throw new Error('Walking-off probe never lost dynamic support');
  for (let i = 0; i < 12; i++) {
    captureAndStepSupport(state);
    moveCharacter(state);
  }
  if (!(state.position[1] < yAtLoss - 0.05)) throw new Error('Character did not resume falling after dynamic support loss');

  console.log(`E1-A2 Gate 2 smoke PASS: platformMass=${platformMass.toFixed(1)}, peakLoad=${peakLoad.toFixed(1)}, standingLoad=${standingLoad.toFixed(1)}, platformDx=${platformDx.toFixed(2)}`);
} finally {
  b3.b3DestroyWorld(world);
}