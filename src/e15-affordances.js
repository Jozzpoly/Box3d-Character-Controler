function bodyKey(body) {
  return `${body.index1}:${body.world0}:${body.generation}`;
}

/**
 * Small E15-only ecology for Owner free play.
 *
 * These obstacles occupy the narrow vertical band above the accepted Donor mover
 * capsule but inside the physical upper-body box. They are intentionally absent
 * from the normal playground so the default Donor experience remains unchanged.
 * The goal is not level design; it is to make the new body/world consequence
 * channel easy to discover through ordinary movement, timing and route choice.
 */
export function createE15Affordances(b3, world, appearance) {
  const created = [];
  let time = 0;

  function createBox({ type = 'static', position, half, color, roughness = 0.58 }) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.position = [...position];
    if (type === 'kinematic') bodyDef.type = b3.b3BodyType.b3_kinematicBody;
    const body = b3.b3CreateBody(world, bodyDef);

    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = 0.45;
    shapeDef.baseMaterial.restitution = type === 'kinematic' ? 0.02 : 0;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    appearance?.set(bodyKey(body), { color, roughness });
    created.push({ body, type, position: [...position] });
    return body;
  }

  // Directly ahead of spawn: a thin beam in the torso-only vertical band.
  createBox({
    position: [0, 1.98, 5.15],
    half: [1.55, 0.06, 0.12],
    color: 0xe3a65a,
  });

  // A larger roof patch: sustained scraping should remain a contact constraint,
  // not accumulate frame-by-frame as artificial knockback momentum.
  createBox({
    position: [4.55, 1.98, 0.15],
    half: [1.25, 0.06, 1.25],
    color: 0xc9835f,
    roughness: 0.68,
  });

  // A moving upper-body ram. Its lower face remains above the carrier capsule's
  // settled top while crossing the physical torso envelope.
  const ramStart = [-3.1, 1.98, 0.35];
  const ram = createBox({
    type: 'kinematic',
    position: ramStart,
    half: [0.38, 0.07, 0.38],
    color: 0x6ec4c2,
    roughness: 0.45,
  });

  function preStep(dt) {
    time += dt;
    b3.b3Body_SetTargetTransform(
      ram,
      {
        position: [
          ramStart[0] + Math.sin(time * 1.05) * 1.55,
          ramStart[1],
          ramStart[2] + Math.sin(time * 0.47) * 0.28,
        ],
        quaternion: [0, 0, 0, 1],
      },
      dt,
      true,
    );
  }

  function reset() {
    time = 0;
    for (const record of created) {
      b3.b3Body_SetTransform(record.body, record.position, [0, 0, 0, 1]);
      b3.b3Body_SetLinearVelocity(record.body, [0, 0, 0]);
      b3.b3Body_SetAngularVelocity(record.body, [0, 0, 0]);
    }
  }

  return { preStep, reset };
}
