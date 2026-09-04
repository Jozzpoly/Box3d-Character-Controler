function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

/**
 * E16.2a capability yard.
 *
 * This is deliberately an affordance ecology, not a challenge course. Nothing here
 * encodes a required verb or success condition. The layout merely puts different mass,
 * leverage and anchoring situations close enough together that Owner free play can
 * discover push / pull / drag / brace / release / momentum combinations quickly.
 *
 * Current E16.1c manifold-anchor reconstruction assumes centred primitive shapes, so
 * every grab-eligible body created here owns exactly one centred primitive.
 */
export function createE16Toybox(b3, world, appearance) {
  const resettable = [];

  function style(body, color, roughness = 0.58, metalness = 0.015) {
    appearance?.set(bodyKey(body), { color, roughness, metalness });
  }

  function createBox({
    type = 'static',
    position,
    half,
    density = 0,
    friction = 0.72,
    restitution = 0.02,
    linearDamping = 0.04,
    angularDamping = 0.08,
    color = type === 'static' ? 0x747c7f : 0x6f9fc6,
    roughness = 0.62,
  }) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [...position];
    bodyDef.linearDamping = linearDamping;
    bodyDef.angularDamping = angularDamping;
    if (type === 'dynamic') {
      bodyDef.type = b3.b3BodyType.b3_dynamicBody;
      bodyDef.enableSleep = false;
    }
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = friction;
    shapeDef.baseMaterial.restitution = restitution;
    if (type === 'dynamic') shapeDef.density = density;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    style(body, color, roughness);
    if (type === 'dynamic') {
      resettable.push({ body, position: [...position], rotation: [0, 0, 0, 1] });
    }
    return body;
  }

  function createSphere({
    position,
    radius,
    density,
    friction = 0.62,
    restitution = 0.12,
    color = 0x79ae78,
  }) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [...position];
    bodyDef.linearDamping = 0.025;
    bodyDef.angularDamping = 0.045;
    bodyDef.enableSleep = false;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.density = density;
    shapeDef.baseMaterial.friction = friction;
    shapeDef.baseMaterial.restitution = restitution;
    b3.b3CreateSphereShape(body, shapeDef, { center: [0, 0, 0], radius });
    style(body, color, 0.5);
    resettable.push({ body, position: [...position], rotation: [0, 0, 0, 1] });
    return body;
  }

  // Broad static anchor in the first forward lane. It is intentionally wider than the
  // organ's reach but easy to walk around; it supports both pull and push/brace play.
  createBox({
    position: [0, 1.15, 4.72],
    half: [1.55, 1.15, 0.11],
    color: 0xc9855e,
    roughness: 0.72,
  });

  // Two narrow posts create side anchors without defining a route through them.
  createBox({
    position: [-2.55, 1.18, 5.35],
    half: [0.18, 1.18, 0.18],
    color: 0xd3ae5b,
  });
  createBox({
    position: [2.55, 1.18, 5.35],
    half: [0.18, 1.18, 0.18],
    color: 0x68afb2,
  });

  // Nearby dynamic spectrum: light object, medium object, heavy object.
  createBox({
    type: 'dynamic',
    position: [-1.35, 0.34, 6.00],
    half: [0.34, 0.34, 0.34],
    density: 8,
    color: 0xe1c266,
    angularDamping: 0.035,
  });
  createBox({
    type: 'dynamic',
    position: [1.35, 0.46, 5.92],
    half: [0.46, 0.46, 0.46],
    density: 30,
    color: 0x6f9fc6,
  });
  createBox({
    type: 'dynamic',
    position: [0, 0.58, 3.35],
    half: [0.58, 0.58, 0.58],
    density: 95,
    color: 0xa9685c,
    angularDamping: 0.16,
  });

  // Long low beam: awkward leverage and rotation matter more than raw translation.
  createBox({
    type: 'dynamic',
    position: [3.35, 0.20, 3.85],
    half: [1.28, 0.20, 0.20],
    density: 18,
    color: 0xd0a954,
    friction: 0.78,
    angularDamping: 0.035,
  });

  // Rolling object produces a different consequence ecology under the same grab rule.
  createSphere({
    position: [-3.20, 0.46, 3.95],
    radius: 0.46,
    density: 14,
    restitution: 0.16,
    color: 0x79a977,
  });

  // A chunky side anchor encourages circling, bracing and momentum-release without
  // claiming any specific intended solution.
  createBox({
    position: [4.65, 0.78, 2.45],
    half: [0.70, 0.78, 0.70],
    color: 0x7c8588,
    roughness: 0.84,
  });

  function preStep(_dt) {
    // No scripted motion in E16.2a. Any movement in this ecology should come from the
    // player, rigid-body dynamics, or existing base-playground systems.
  }

  function reset() {
    for (const record of resettable) {
      b3.b3Body_SetTransform(record.body, record.position, record.rotation);
      b3.b3Body_SetLinearVelocity(record.body, [0, 0, 0]);
      b3.b3Body_SetAngularVelocity(record.body, [0, 0, 0]);
    }
  }

  function stats() {
    return { dynamicBodies: resettable.length, totalAffordances: 8 };
  }

  return { preStep, reset, stats };
}
