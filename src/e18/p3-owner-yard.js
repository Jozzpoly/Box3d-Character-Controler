function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

/**
 * Small P3.1 orientation yard placed mostly behind the normal spawn/toybox lane.
 * It is an affordance ecology, not a scripted challenge: several objects merely make
 * axis control, depth, mass and placement matter during free play.
 */
export function createE18P3OwnerYard(b3, world, appearance) {
  const resettable = [];
  let dynamicBodies = 0;
  let staticBodies = 0;

  function style(body, color, roughness = 0.58, metalness = 0.015) {
    appearance?.set(bodyKey(body), { color, roughness, metalness });
  }

  function createBox({
    type = 'static',
    position,
    half,
    density = 0,
    friction = 0.68,
    restitution = 0.02,
    linearDamping = 0.04,
    angularDamping = 0.07,
    color = type === 'static' ? 0x788184 : 0x70a5c9,
    roughness = 0.60,
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
      dynamicBodies += 1;
      resettable.push({ body, position: [...position], rotation: [0, 0, 0, 1] });
    } else {
      staticBodies += 1;
    }
    return body;
  }

  // Orientation gate: the long beam cannot pass through the gap while broadside, but
  // can be deliberately yawed into the opening. No success trigger is attached.
  createBox({ position: [-3.82, 1.15, -5.05], half: [0.18, 1.15, 0.34], color: 0xb6785e });
  createBox({ position: [-2.58, 1.15, -5.05], half: [0.18, 1.15, 0.34], color: 0xb6785e });
  createBox({ position: [-3.20, 2.22, -5.05], half: [0.80, 0.10, 0.34], color: 0x8d6f62 });
  createBox({
    type: 'dynamic',
    position: [-3.20, 0.16, -2.85],
    half: [1.05, 0.16, 0.16],
    density: 17,
    friction: 0.70,
    angularDamping: 0.035,
    color: 0xe1b955,
  });

  // Narrow placement shelf/cubby. A flat rectangular piece is easier to place when its
  // axis can be owned deliberately, but rough throwing/stacking remains possible.
  createBox({ position: [3.55, 0.12, -5.10], half: [1.05, 0.12, 0.62], color: 0x687579 });
  createBox({ position: [2.58, 0.82, -5.10], half: [0.12, 0.82, 0.62], color: 0x687579 });
  createBox({ position: [4.52, 0.82, -5.10], half: [0.12, 0.82, 0.62], color: 0x687579 });
  createBox({ position: [3.55, 1.52, -5.10], half: [1.05, 0.12, 0.62], color: 0x687579 });
  createBox({
    type: 'dynamic',
    position: [3.55, 0.18, -2.85],
    half: [0.72, 0.18, 0.30],
    density: 22,
    angularDamping: 0.045,
    color: 0x72b2a2,
  });

  // A clearly heavier awkward slab makes the shared force budget perceptible.
  createBox({
    type: 'dynamic',
    position: [0.20, 0.34, -4.05],
    half: [0.62, 0.34, 0.42],
    density: 105,
    friction: 0.78,
    angularDamping: 0.12,
    color: 0xa96862,
  });

  // Small pieces for free stacking and object↔object placement.
  createBox({
    type: 'dynamic',
    position: [1.25, 0.20, -3.25],
    half: [0.20, 0.20, 0.20],
    density: 10,
    color: 0xd8c66c,
  });
  createBox({
    type: 'dynamic',
    position: [1.75, 0.26, -3.55],
    half: [0.26, 0.26, 0.26],
    density: 18,
    color: 0x7ea8ce,
  });

  // Two low islands + a loose plank make bridge/traversal-aid play possible without
  // dictating that it is the intended use of the object.
  createBox({ position: [-0.85, 0.30, -7.05], half: [0.85, 0.30, 0.95], color: 0x7c8588 });
  createBox({ position: [1.75, 0.30, -7.05], half: [0.85, 0.30, 0.95], color: 0x7c8588 });
  createBox({
    type: 'dynamic',
    position: [0.45, 0.16, -5.95],
    half: [1.35, 0.16, 0.24],
    density: 20,
    friction: 0.76,
    angularDamping: 0.04,
    color: 0xc99a52,
  });

  function preStep(_dt) {
    // No scripted motion. All state changes should come from player action or Box3D.
  }

  function reset() {
    for (const record of resettable) {
      b3.b3Body_SetTransform(record.body, record.position, record.rotation);
      b3.b3Body_SetLinearVelocity(record.body, [0, 0, 0]);
      b3.b3Body_SetAngularVelocity(record.body, [0, 0, 0]);
    }
  }

  function stats() {
    return {
      dynamicBodies,
      staticBodies,
      orientationAffordances: 4,
    };
  }

  return { preStep, reset, stats };
}
