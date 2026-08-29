import { quatFromAxisAngle } from './math.js';

function enumValue(value) {
  return typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
}

export function createPlayground(b3) {
  const gravity = 18;
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(worldDef);
  const resettableBodies = [];
  const spawn = [0, 1.05, 7.5];
  let time = 0;

  function createBox({ type = 'static', position, half, rotation = [0, 0, 0, 1], density = 0, friction = 0.75, restitution = 0.05, linearDamping = 0.05, angularDamping = 0.15, resettable = type !== 'static' }) {
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
    if (resettable) resettableBodies.push({ body, position: [...position], rotation: [...rotation], type });
    return body;
  }

  function createSphere({ position, radius, density = 30, friction = 0.65, restitution = 0.18 }) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [...position];
    bodyDef.linearDamping = 0.04;
    bodyDef.angularDamping = 0.08;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.density = density;
    shapeDef.baseMaterial.friction = friction;
    shapeDef.baseMaterial.restitution = restitution;
    b3.b3CreateSphereShape(body, shapeDef, { center: [0, 0, 0], radius });
    resettableBodies.push({ body, position: [...position], rotation: [0, 0, 0, 1], type: 'dynamic' });
    return body;
  }

  createBox({ position: [0, -0.5, 0], half: [12, 0.5, 12] });
  createBox({ position: [0, -5.0, 0], half: [24, 0.5, 24] });
  createBox({ position: [6.4, 0.55, 4.0], half: [2.0, 0.3, 3.2], rotation: quatFromAxisAngle([1, 0, 0], -14 * Math.PI / 180) });
  createBox({ position: [-6.3, 0.15, 5.0], half: [1.4, 0.15, 1.0] });
  createBox({ position: [-6.3, 0.35, 3.1], half: [1.4, 0.35, 0.9] });
  createBox({ position: [-6.3, 0.60, 1.3], half: [1.4, 0.60, 0.8] });
  createBox({ type: 'dynamic', position: [-2.5, 0.55, 1.0], half: [0.55, 0.55, 0.55], density: 20 });
  createBox({ type: 'dynamic', position: [0.0, 0.75, 0.0], half: [0.75, 0.75, 0.75], density: 55 });
  createBox({ type: 'dynamic', position: [3.2, 0.9, 0.6], half: [0.9, 0.9, 0.9], density: 90 });
  createSphere({ position: [5.0, 0.72, -2.0], radius: 0.72, density: 28 });
  createSphere({ position: [3.4, 0.48, 3.7], radius: 0.48, density: 18, restitution: 0.3 });
  for (let i = 0; i < 3; i++) {
    createBox({ type: 'dynamic', position: [-4.2, 0.48 + i * 0.96, -3.4], half: [0.48, 0.48, 0.48], density: 26, angularDamping: 0.08 });
  }
  createBox({ type: 'dynamic', position: [4.8, 0.28, -5.3], half: [2.3, 0.28, 0.62], density: 16, friction: 0.8, angularDamping: 0.06 });
  createBox({ type: 'dynamic', position: [-1.5, 0.26, -6.2], half: [1.8, 0.26, 1.5], density: 22, friction: 0.9, angularDamping: 0.2 });
  const moverStart = [6.0, 1.15, 6.2];
  const movingPlatform = createBox({ type: 'kinematic', position: moverStart, half: [1.5, 0.20, 1.5], friction: 0.9 });

  function preStep(dt) {
    time += dt;
    b3.b3Body_SetTargetTransform(movingPlatform, { position: [moverStart[0] + Math.sin(time * 0.58) * 3.0, moverStart[1] + Math.sin(time * 0.9) * 0.28, moverStart[2] + Math.sin(time * 0.31) * 0.7], quaternion: quatFromAxisAngle([0, 1, 0], Math.sin(time * 0.42) * 0.55) }, dt, true);
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

  return { world, gravity, spawn, preStep, reset, stats };
}
