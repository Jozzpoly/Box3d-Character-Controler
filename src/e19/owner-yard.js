function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

export function createE19OwnerYard(b3, world, appearance) {
  const resettable = [];

  function style(body, color, roughness = 0.68) {
    appearance?.set(bodyKey(body), { color, roughness });
  }

  function createBox({
    type = 'static',
    position,
    half,
    density = 0,
    friction = 0.82,
    restitution = 0.02,
    color = type === 'dynamic' ? 0x6d9fbd : 0x6c7476,
    roughness = 0.72,
  }) {
    const bodyDef = b3.b3DefaultBodyDef();
    if (type === 'dynamic') bodyDef.type = b3.b3BodyType.b3_dynamicBody;
    bodyDef.position = [...position];
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = type === 'dynamic' ? 0.08 : 0;
    bodyDef.angularDamping = type === 'dynamic' ? 0.12 : 0;
    const body = b3.b3CreateBody(world, bodyDef);

    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.density = type === 'dynamic' ? density : 0;
    shapeDef.baseMaterial.friction = friction;
    shapeDef.baseMaterial.restitution = restitution;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    style(body, color, roughness);

    if (type === 'dynamic') {
      resettable.push({ body, position: [...position], rotation: [0, 0, 0, 1] });
    }
    return body;
  }

  // Compact grip gym around the normal playground spawn. It is deliberately simple:
  // the point is to expose E19 hand/grip mechanics to Owner judgement, not redesign map.
  // Default camera faces -Z from spawn [0, 1.05, 7.2].
  createBox({
    position: [0, 2.82, 5.72],
    half: [2.15, 0.16, 0.30],
    color: 0x59676b,
    roughness: 0.58,
  });
  createBox({
    position: [-2.02, 1.55, 5.72],
    half: [0.16, 1.55, 0.30],
    color: 0x5f6d70,
  });
  createBox({
    position: [2.02, 1.55, 5.72],
    half: [0.16, 1.55, 0.30],
    color: 0x5f6d70,
  });

  // A climbable wall starts behind the overhead beam. Its top edge is deliberately
  // reachable only after walking/jumping closer, so reach distance remains meaningful.
  createBox({
    position: [0, 1.42, 3.88],
    half: [2.75, 1.42, 0.20],
    color: 0x70787a,
    roughness: 0.86,
  });
  createBox({
    position: [0, 3.06, 3.54],
    half: [1.55, 0.18, 0.55],
    color: 0x626e70,
    roughness: 0.70,
  });

  // Unequal side holds make two-hand bracing visibly different from one-hand pulling.
  createBox({
    position: [-1.38, 2.05, 4.78],
    half: [0.34, 0.16, 0.34],
    color: 0xb8795d,
    roughness: 0.52,
  });
  createBox({
    position: [1.22, 2.34, 4.62],
    half: [0.34, 0.16, 0.34],
    color: 0x5e91b6,
    roughness: 0.52,
  });

  // Dynamic specimens close enough to grab without first solving traversal. Different
  // size/density should make the same reciprocal law feel materially different.
  createBox({
    type: 'dynamic',
    position: [-1.55, 0.46, 6.18],
    half: [0.46, 0.46, 0.46],
    density: 14,
    color: 0xe0b358,
    roughness: 0.48,
  });
  createBox({
    type: 'dynamic',
    position: [1.65, 0.62, 6.08],
    half: [0.62, 0.62, 0.62],
    density: 48,
    color: 0x658fb6,
    roughness: 0.54,
  });

  function reset() {
    for (const record of resettable) {
      b3.b3Body_SetTransform(record.body, record.position, record.rotation);
      b3.b3Body_SetLinearVelocity(record.body, [0, 0, 0]);
      b3.b3Body_SetAngularVelocity(record.body, [0, 0, 0]);
    }
  }

  return {
    reset,
    dynamicBodies: resettable.length,
  };
}
