import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { installVelocityOnlyContactMemoryProbe } from '../src/momentum-semantics-probe.js';

const b3 = await Box3D();
const dt = 1 / 60;
const zeroIntent = {
  forward: [0, 0, -1],
  right: [1, 0, 0],
  moveForward: 0,
  moveRight: 0,
  jump: false,
  jumpHeld: false,
  sprint: false,
};

function bodyType(type) {
  if (type === 'dynamic') return b3.b3BodyType.b3_dynamicBody;
  if (type === 'kinematic') return b3.b3BodyType.b3_kinematicBody;
  return b3.b3BodyType.b3_staticBody;
}

function makeWorld(gravity = 20) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -gravity, 0];
  const world = b3.b3CreateWorld(worldDef);

  function box(type, position, half, options = {}) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = bodyType(type);
    bodyDef.position = [...position];
    bodyDef.rotation = [...(options.rotation ?? [0, 0, 0, 1])];
    bodyDef.enableSleep = false;
    bodyDef.linearDamping = options.linearDamping ?? 0.08;
    bodyDef.angularDamping = options.angularDamping ?? 0.10;
    const body = b3.b3CreateBody(world, bodyDef);

    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = options.friction ?? 0.78;
    shapeDef.baseMaterial.restitution = options.restitution ?? 0.03;
    if (type === 'dynamic') shapeDef.density = options.density ?? 42;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  return { world, box };
}

function makeCharacter(setup, position, gravity = 20) {
  const character = new ControllerOwnedCharacter(b3, setup.world, {
    startPosition: position,
    gravity,
    virtualMass: 80,
    reciprocityMode: 'causal-components',
  });
  return installVelocityOnlyContactMemoryProbe(character);
}

function horizontal(v) {
  return Math.hypot(v[0], v[2]);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function tick(setup, character, groundedHint = false) {
  if (groundedHint && !character.currentSupport) character.currentSupport = { type: 'STATIC' };
  const beforePre = [...character.velocity];
  character.preStep(dt, zeroIntent);
  const afterPre = [...character.velocity];
  b3.b3World_Step(setup.world, dt, 4);
  character.postStep(dt);
  return {
    beforePre,
    afterPre,
    afterPost: [...character.velocity],
    position: [...character.position],
    contacts: character.lastDynamicContacts,
    support: character.currentSupport?.type ?? 'AIR',
  };
}

function freeMomentumTrial(grounded) {
  const setup = makeWorld(20);
  if (grounded) setup.box('static', [0, -0.5, 0], [20, 0.5, 20], { restitution: 0 });
  const character = makeCharacter(setup, grounded ? [0, 0.9, 0] : [0, 5, 0]);
  character.velocity = [3, 0, 4];
  if (grounded) character.currentSupport = { type: 'STATIC' };

  const frames = [];
  for (let i = 0; i < 30; i++) frames.push(tick(setup, character, grounded));
  const sample = (frame) => frames[Math.min(frame, frames.length - 1)];
  const stopped = frames.findIndex((frame) => horizontal(frame.afterPost) < 0.01);
  return {
    after1: horizontal(sample(0).afterPost),
    after6: horizontal(sample(5).afterPost),
    after15: horizontal(sample(14).afterPost),
    after30: horizontal(sample(29).afterPost),
    stopFrame: stopped,
    distance30: Math.hypot(sample(29).position[0], sample(29).position[2]),
  };
}

function clipContractIsolate() {
  // This isolate intentionally does NOT test approach/cast timing. It starts with a
  // shallow overlap so CollideMover gives us the actual Box3D wall plane, then calls
  // b3ClipVector directly with both signs of the normal component. We therefore learn
  // the engine's one-sided clipping convention empirically instead of encoding a sign
  // assumption into the fixture.
  const setup = makeWorld(0);
  setup.box('static', [0.6, 2.5, 0], [0.1, 3.0, 5.0], { restitution: 0 });
  const character = makeCharacter(setup, [0.16, 2.5, 0], 0);
  const capsule = {
    center1: [0, -character.halfSegment, 0],
    center2: [0, character.halfSegment, 0],
    radius: character.radius,
  };
  const { planes } = character._collectPlanes(capsule);
  const wall = planes.find((entry) => Math.abs(entry.plane.normal[0]) > 0.8);
  if (!wall) throw new Error(`E2.3 clip isolate could not recover wall plane; planes=${JSON.stringify(planes)}`);

  const normal = [...wall.plane.normal];
  const tangentLength = Math.hypot(normal[0], normal[2]);
  const tangent = [-normal[2] / tangentLength, 0, normal[0] / tangentLength];

  function probe(normalSpeed) {
    const incoming = [
      normalSpeed * normal[0] + 4 * tangent[0],
      normalSpeed * normal[1] + 4 * tangent[1],
      normalSpeed * normal[2] + 4 * tangent[2],
    ];
    const clipped = [...b3.b3ClipVector(incoming, planes)];
    return {
      incoming,
      clipped,
      normalBefore: dot(incoming, normal),
      normalAfter: dot(clipped, normal),
      tangentBefore: dot(incoming, tangent),
      tangentAfter: dot(clipped, tangent),
    };
  }

  const positive = probe(3);
  const negative = probe(-3);
  return {
    planeCount: planes.length,
    normal,
    positive,
    negative,
  };
}

function owner1MotorAttribution() {
  const setup = makeWorld(20);
  setup.box('static', [0, -0.5, 0], [10, 0.5, 10], { friction: 0.78, restitution: 0.03 });
  setup.box(
    'dynamic',
    [-0.003587838029488921, 0.6198593378067017, 0.8623996376991272],
    [0.62, 0.62, 0.62],
    {
      density: 42,
      friction: 0.78,
      restitution: 0.03,
      linearDamping: 0.08,
      angularDamping: 0.10,
      rotation: [-7.062492812792698e-8, -0.007878727279603481, -2.6476740799807885e-8, 0.9999690055847168],
    },
  );

  const character = makeCharacter(setup, [-0.3988331901690951, 1.4734998316617105, 1.8500304795045481]);
  character.velocity = [-0.1852537840604782, -3.5533342361450195, -4.444461345672607];
  character.externalVelocity = [-0.004569879202282509, 0, 0.49020405070806333];

  const frames = [];
  let previousContacts = 0;
  let separationFrame = -1;
  for (let i = 0; i < 40; i++) {
    const frame = tick(setup, character, false);
    frame.i = i;
    frames.push(frame);
    if (previousContacts > 0 && frame.contacts === 0 && separationFrame < 0) separationFrame = i;
    previousContacts = frame.contacts;
  }
  if (separationFrame < 1) throw new Error('E2.3 owner-1 attribution failed to find contact separation');

  const beforeSeparationMotor = frames[separationFrame].beforePre;
  const afterSeparationMotor = frames[separationFrame].afterPre;
  const motorDelta = [
    afterSeparationMotor[0] - beforeSeparationMotor[0],
    0,
    afterSeparationMotor[2] - beforeSeparationMotor[2],
  ];
  const f6 = frames[Math.min(separationFrame + 5, frames.length - 1)];

  return {
    separationFrame,
    beforeSeparationMotor,
    afterSeparationMotor,
    motorDelta,
    speedBeforeMotor: horizontal(beforeSeparationMotor),
    speedAfterMotor: horizontal(afterSeparationMotor),
    speedAfter6: horizontal(f6.afterPost),
    supportAtSeparation: frames[separationFrame].support,
  };
}

function fmt(v) {
  return `(${v[0].toFixed(3)}, ${v[2].toFixed(3)})`;
}

function clipFmt(label, sample) {
  return `${label} in=${fmt(sample.incoming)} out=${fmt(sample.clipped)} n=${sample.normalBefore.toFixed(3)}->${sample.normalAfter.toFixed(3)} tangent=${sample.tangentBefore.toFixed(3)}->${sample.tangentAfter.toFixed(3)}`;
}

const groundFree = freeMomentumTrial(true);
const airFree = freeMomentumTrial(false);
const clip = clipContractIsolate();
const owner1 = owner1MotorAttribution();

console.log('E2.3 momentum-preservation boundary diagnostic (A-double-prime runtime semantics):');
console.log(
  `  free grounded: 5.000 -> 1f ${groundFree.after1.toFixed(3)} -> 6f ${groundFree.after6.toFixed(3)} -> 15f ${groundFree.after15.toFixed(3)} m/s; stopFrame=${groundFree.stopFrame} distance=.50s ${groundFree.distance30.toFixed(3)}m`,
);
console.log(
  `  free airborne: 5.000 -> 1f ${airFree.after1.toFixed(3)} -> 6f ${airFree.after6.toFixed(3)} -> 15f ${airFree.after15.toFixed(3)} -> 30f ${airFree.after30.toFixed(3)} m/s`,
);
console.log(
  `  direct wall clip: planes=${clip.planeCount} normal=${fmt(clip.normal)} | ${clipFmt('+normal', clip.positive)} | ${clipFmt('-normal', clip.negative)}`,
);
console.log(
  `  owner-1 A-double-prime first clean no-contact tick=${owner1.separationFrame}: beforeMotor=${fmt(owner1.beforeSeparationMotor)} afterMotor=${fmt(owner1.afterSeparationMotor)} motorDelta=${fmt(owner1.motorDelta)} speed=${owner1.speedBeforeMotor.toFixed(3)}->${owner1.speedAfterMotor.toFixed(3)} 6f=${owner1.speedAfter6.toFixed(3)} support=${owner1.supportAtSeparation}`,
);

const positiveClipped = Math.abs(clip.positive.normalAfter) < 0.05;
const negativeClipped = Math.abs(clip.negative.normalAfter) < 0.05;
if (positiveClipped === negativeClipped) {
  throw new Error(`E2.3 expected a one-sided clip convention; +normal clipped=${positiveClipped} -normal clipped=${negativeClipped}`);
}
for (const sample of [clip.positive, clip.negative]) {
  if (Math.abs(sample.tangentAfter - sample.tangentBefore) > 1e-6) {
    throw new Error(`E2.3 direct clip changed wall tangent: ${sample.tangentBefore} -> ${sample.tangentAfter}`);
  }
}
if (!(groundFree.after6 < airFree.after6 - 2.0)) {
  throw new Error('E2.3 fixture did not expose the intended grounded-vs-air motor authority boundary');
}
if (!(owner1.speedAfterMotor < owner1.speedBeforeMotor - 0.5)) {
  throw new Error('E2.3 owner-1 recovered anchor did not expose the grounded motor as a large immediate momentum sink');
}

console.log(`  structural gate PASS: Box3D clip is one-sided (+normal clipped=${positiveClipped}, -normal clipped=${negativeClipped}) and preserves the wall tangent exactly; rapid grounded momentum loss is dominated by locomotion motor policy.`);
console.log('  no runtime behavior, desired slide amount, or recovery constant is selected by this diagnostic.');
