import { quatFromAxisAngle } from './math.js';

function enumValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

export function createPlayground(b3) {
  const gravity = 20;
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(worldDef);
  const resettableBodies = [];
  const appearance = new Map();
  const spawn = [0, 1.05, 7.2];
  let time = 0;

  function styleBody(body, style) {
    appearance.set(bodyKey(body), style);
  }

  function createBox({
    type = 'static',
    position,
    half,
    rotation = [0, 0, 0, 1],
    density = 0,
    friction = 0.78,
    restitution = 0.03,
    linearDamping = 0.08,
    angularDamping = 0.14,
    resettable = type !== 'static',
    color = type === 'static' ? 0x7a8182 : 0x6f9fc6,
    roughness = 0.72,
  }) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [...position];
    bodyDef.rotation = [...rotation];
    bodyDef.linearDamping = linearDamping;
    bodyDef.angularDamping = angularDamping;
    if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;

    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = friction;
    shapeDef.baseMaterial.restitution = restitution;
    if (type === 'dynamic') shapeDef.density = density;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    styleBody(body, { color, roughness });
    if (resettable) {
      resettableBodies.push({ body, position: [...position], rotation: [...rotation], type });
    }
    return body;
  }

  function createSphere({
    position,
    radius,
    density = 28,
    friction = 0.62,
    restitution = 0.12,
    color = 0x75ad7d,
  }) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [...position];
    bodyDef.linearDamping = 0.04;
    bodyDef.angularDamping = 0.06;
    const body = b3.b3CreateBody(world, bodyDef);

    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.density = density;
    shapeDef.baseMaterial.friction = friction;
    shapeDef.baseMaterial.restitution = restitution;
    b3.b3CreateSphereShape(body, shapeDef, { center: [0, 0, 0], radius });
    styleBody(body, { color, roughness: 0.56 });
    resettableBodies.push({
      body,
      position: [...position],
      rotation: [0, 0, 0, 1],
      type: 'dynamic',
    });
    return body;
  }

  createBox({
    position: [0, -0.5, 0],
    half: [11, 0.5, 11],
    color: 0x8a9090,
    roughness: 0.94,
  });
  createBox({
    position: [0, -4.7, 0],
    half: [22, 0.5, 22],
    color: 0x4e575a,
    roughness: 0.98,
  });

  // Deliberate traversal boundary: ordinary 22 cm stairs plus a nearby 52 cm ledge.
  // The rounded provisional capsule should walk the stairs naturally; the ledge still requires jump.
  const stairX = -6.5;
  const stairStartZ = 5.25;
  const stairDepth = 0.72;
  const stairRise = 0.22;
  for (let i = 0; i < 4; i++) {
    const top = stairRise * (i + 1);
    createBox({
      position: [stairX, top * 0.5, stairStartZ - i * stairDepth * 2],
      half: [1.35, top * 0.5, stairDepth],
      color: 0x727a7c,
    });
  }
  createBox({
    position: [-3.45, 0.26, 4.9],
    half: [1.0, 0.26, 0.72],
    color: 0x697174,
  });

  createBox({
    position: [6.2, 0.56, 3.8],
    half: [1.9, 0.28, 3.0],
    rotation: quatFromAxisAngle([1, 0, 0], -13 * Math.PI / 180),
    color: 0x737b7d,
  });

  createBox({
    type: 'dynamic',
    position: [-2.6, 0.46, 2.0],
    half: [0.46, 0.46, 0.46],
    density: 14,
    color: 0xe1b85d,
    angularDamping: 0.08,
  });
  createBox({
    type: 'dynamic',
    position: [0.0, 0.62, 1.2],
    half: [0.62, 0.62, 0.62],
    density: 42,
    color: 0x5c91bd,
    angularDamping: 0.10,
  });
  createBox({
    type: 'dynamic',
    position: [3.0, 0.78, 1.6],
    half: [0.78, 0.78, 0.78],
    density: 88,
    color: 0xb66e5f,
    angularDamping: 0.16,
  });
  createSphere({
    position: [4.5, 0.58, -1.1],
    radius: 0.58,
    density: 24,
    color: 0x6fa27a,
    restitution: 0.16,
  });
  createSphere({
    position: [2.9, 0.42, 4.8],
    radius: 0.42,
    density: 16,
    color: 0x8eab6e,
    restitution: 0.24,
  });

  for (let i = 0; i < 3; i++) {
    createBox({
      type: 'dynamic',
      position: [-4.5, 0.46 + i * 0.92, -3.1],
      half: [0.46, 0.46, 0.46],
      density: 24,
      color: [0x6e9fbd, 0xd18a66, 0xd7bd66][i],
      angularDamping: 0.06,
    });
  }

  createBox({
    type: 'dynamic',
    position: [-1.7, 0.24, -5.5],
    half: [1.65, 0.24, 1.30],
    density: 20,
    friction: 0.9,
    color: 0x70aeb0,
    angularDamping: 0.16,
  });
  createBox({
    type: 'dynamic',
    position: [4.2, 0.24, -5.1],
    half: [2.35, 0.24, 0.48],
    density: 13,
    friction: 0.82,
    color: 0xcaa85d,
    angularDamping: 0.055,
  });

  const moverStart = [6.0, 1.05, 6.0];
  const movingPlatform = createBox({
    type: 'kinematic',
    position: moverStart,
    half: [1.45, 0.18, 1.45],
    friction: 0.92,
    color: 0x55a9ad,
    roughness: 0.62,
  });

  function preStep(dt) {
    time += dt;
    b3.b3Body_SetTargetTransform(
      movingPlatform,
      {
        position: [
          moverStart[0] + Math.sin(time * 0.52) * 2.65,
          moverStart[1] + Math.sin(time * 0.84) * 0.22,
          moverStart[2] + Math.sin(time * 0.29) * 0.55,
        ],
        quaternion: quatFromAxisAngle([0, 1, 0], Math.sin(time * 0.40) * 0.48),
      },
      dt,
      true,
    );
  }

  function reset() {
    time = 0;
    for (const record of resettableBodies) {
      b3.b3Body_SetTransform(record.body, record.position, record.rotation);
      b3.b3Body_SetLinearVelocity(record.body, [0, 0, 0]);
      b3.b3Body_SetAngularVelocity(record.body, [0, 0, 0]);
    }
  }

  function stats() {
    let dynamicCount = 0;
    let kinematicCount = 0;
    for (const record of resettableBodies) {
      const type = enumValue(b3.b3Body_GetType(record.body));
      if (type === enumValue(b3.b3BodyType.b3_dynamicBody)) dynamicCount += 1;
      if (type === enumValue(b3.b3BodyType.b3_kinematicBody)) kinematicCount += 1;
    }
    return { dynamicCount, kinematicCount };
  }

  return { world, gravity, spawn, preStep, reset, stats, appearance };
}
