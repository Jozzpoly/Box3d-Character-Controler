import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { installVelocityOnlyContactMemoryProbe } from '../src/momentum-semantics-probe.js';

const b3 = await Box3D();
const dt = 1 / 60;
const LINEAR_SLOP = 0.005; // native Box3D 8441b4a default length-units scale = 1
const FLT_MAX = 3.4e38;
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

function dot3(a, c) {
  return a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
}

function horizontal(v) {
  return Math.hypot(v[0], v[2]);
}

function maxAbsDelta(a, c) {
  return Math.max(Math.abs(a[0] - c[0]), Math.abs(a[1] - c[1]), Math.abs(a[2] - c[2]));
}

function clonePlane(entry) {
  return {
    plane: {
      normal: [...entry.plane.normal],
      offset: entry.plane.offset,
    },
    pushLimit: entry.pushLimit ?? FLT_MAX,
    push: 0,
    clipVelocity: entry.clipVelocity !== false,
  };
}

// Faithful JS transcription of native Box3D 8441b4a src/mover.c::b3SolvePlanes.
// It exists only to recover the per-plane `push` state that box3d.js@0.1.1 loses
// when its embind wrapper copies the JS planes into a temporary std::vector.
function solvePlanesWithPush(targetDelta, inputPlanes) {
  const planes = inputPlanes.map(clonePlane);
  const delta = [...targetDelta];
  let iteration = 0;

  for (; iteration < 20; iteration++) {
    let totalPush = 0;
    for (const plane of planes) {
      const separation = dot3(plane.plane.normal, delta) - plane.plane.offset + LINEAR_SLOP;
      let push = -separation;
      const accumulatedPush = plane.push;
      plane.push = Math.min(Math.max(plane.push + push, 0), plane.pushLimit);
      push = plane.push - accumulatedPush;
      delta[0] += push * plane.plane.normal[0];
      delta[1] += push * plane.plane.normal[1];
      delta[2] += push * plane.plane.normal[2];
      totalPush += Math.abs(push);
    }
    if (totalPush < LINEAR_SLOP) break;
  }

  return { delta, iterationCount: iteration, planes };
}

function clipVectorJs(vector, planes) {
  const out = [...vector];
  for (const plane of planes) {
    if (plane.push === 0 || plane.clipVelocity === false) continue;
    const d = dot3(out, plane.plane.normal);
    const remove = Math.min(0, d);
    out[0] -= remove * plane.plane.normal[0];
    out[1] -= remove * plane.plane.normal[1];
    out[2] -= remove * plane.plane.normal[2];
  }
  return out;
}

function makePushPropagatingModule() {
  const shim = Object.create(b3);
  const nativeSolve = b3.b3SolvePlanes.bind(b3);
  let calls = 0;
  let maxSolveDeltaError = 0;
  let activatedPlanes = 0;

  shim.b3SolvePlanes = (targetDelta, planes) => {
    const nativeResult = nativeSolve(targetDelta, planes);
    const reconstructed = solvePlanesWithPush(targetDelta, planes);
    const error = maxAbsDelta(nativeResult.delta, reconstructed.delta);
    maxSolveDeltaError = Math.max(maxSolveDeltaError, error);
    if (error > 2e-5) {
      throw new Error(`E2.3 JS plane-solver reconstruction diverged from native delta by ${error}`);
    }

    for (let i = 0; i < planes.length; i++) {
      planes[i].push = reconstructed.planes[i].push;
      if (planes[i].push > 0) activatedPlanes += 1;
    }
    calls += 1;
    return nativeResult;
  };

  shim._e23Stats = () => ({ calls, maxSolveDeltaError, activatedPlanes });
  return shim;
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

function makeCharacter(setup, module = b3, position = [0, 0.9, 0], gravity = 20) {
  const character = new ControllerOwnedCharacter(module, setup.world, {
    startPosition: position,
    gravity,
    virtualMass: 80,
    reciprocityMode: 'causal-components',
  });
  return installVelocityOnlyContactMemoryProbe(character);
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
    impulse: character.lastContactImpulse,
    planes: character.lastPlaneCount,
    support: character.currentSupport?.type ?? 'AIR',
  };
}

function bindingContractProbe() {
  const setup = makeWorld(0);
  setup.box('static', [0.6, 2.5, 0], [0.1, 3.0, 5.0], { restitution: 0 });
  const character = makeCharacter(setup, b3, [0.16, 2.5, 0], 0);
  const capsule = {
    center1: [0, -character.halfSegment, 0],
    center2: [0, character.halfSegment, 0],
    radius: character.radius,
  };
  const { planes } = character._collectPlanes(capsule);
  const wall = planes.find((entry) => Math.abs(entry.plane.normal[0]) > 0.8);
  if (!wall) throw new Error('E2.3 binding probe could not recover a wall collision plane');

  const targetDelta = [0, 0, 0];
  const nativeSolved = b3.b3SolvePlanes(targetDelta, planes);
  const reconstructed = solvePlanesWithPush(targetDelta, planes);
  const solveDeltaError = maxAbsDelta(nativeSolved.delta, reconstructed.delta);
  const nativeVisiblePush = Math.max(...planes.map((entry) => entry.push ?? 0));
  const recoveredPush = Math.max(...reconstructed.planes.map((entry) => entry.push));

  const normal = [...wall.plane.normal];
  const tangentLength = Math.hypot(normal[0], normal[2]);
  const tangent = [-normal[2] / tangentLength, 0, normal[0] / tangentLength];
  const constrainedVelocity = [
    -3 * normal[0] + 4 * tangent[0],
    -3 * normal[1] + 4 * tangent[1],
    -3 * normal[2] + 4 * tangent[2],
  ];
  const bindingClip = [...b3.b3ClipVector(constrainedVelocity, planes)];
  const intendedClipViaBinding = [...b3.b3ClipVector(constrainedVelocity, reconstructed.planes)];
  const intendedClipJs = clipVectorJs(constrainedVelocity, reconstructed.planes);

  return {
    planeCount: planes.length,
    nativeSolved,
    reconstructed,
    solveDeltaError,
    nativeVisiblePush,
    recoveredPush,
    constrainedVelocity,
    bindingClip,
    intendedClipViaBinding,
    intendedClipJs,
    staleClipChange: maxAbsDelta(bindingClip, constrainedVelocity),
    intendedClipChange: maxAbsDelta(intendedClipViaBinding, constrainedVelocity),
    intendedImplementationsError: maxAbsDelta(intendedClipViaBinding, intendedClipJs),
  };
}

function freeMomentumTrial(grounded) {
  const setup = makeWorld(20);
  if (grounded) setup.box('static', [0, -0.5, 0], [20, 0.5, 20], { restitution: 0 });
  const character = makeCharacter(setup);
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

function owner1Trial(useIntendedClip) {
  const setup = makeWorld(20);
  setup.box('static', [0, -0.5, 0], [10, 0.5, 10], { friction: 0.78, restitution: 0.03 });
  const body = setup.box(
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
  b3.b3Body_SetLinearVelocity(body, [-0.00713647436350584, -0.009636489674448967, -0.0645877867937088]);
  b3.b3Body_SetAngularVelocity(body, [0.02313126064836979, -0.01097759511321783, -0.0017958738608285785]);

  const module = useIntendedClip ? makePushPropagatingModule() : b3;
  const character = makeCharacter(
    setup,
    module,
    [-0.3988331901690951, 1.4734998316617105, 1.8500304795045481],
    20,
  );
  character.velocity = [-0.1852537840604782, -3.5533342361450195, -4.444461345672607];
  character.externalVelocity = [-0.004569879202282509, 0, 0.49020405070806333];

  const frames = [];
  let contactStart = -1;
  let contactEnd = -1;
  let previousContacts = 0;
  for (let i = 0; i < 60; i++) {
    const frame = tick(setup, character, false);
    frame.i = i;
    frames.push(frame);
    if (frame.contacts > 0 && contactStart < 0) contactStart = i;
    if (previousContacts > 0 && frame.contacts === 0 && contactEnd < 0) contactEnd = i - 1;
    previousContacts = frame.contacts;
  }
  if (contactStart < 0 || contactEnd < contactStart) {
    throw new Error(`E2.3 owner-1 ${useIntendedClip ? 'intended' : 'current'} trial failed to isolate contact episode`);
  }

  const separationFrame = contactEnd + 1;
  const separationPosition = frames[separationFrame].position;
  const frameAt = (offset) => frames[Math.min(separationFrame + offset, frames.length - 1)];
  const displacement = (offset) => {
    const p = frameAt(offset).position;
    return Math.hypot(p[0] - separationPosition[0], p[2] - separationPosition[2]);
  };

  return {
    contactStart,
    contactEnd,
    contactFrames: contactEnd - contactStart + 1,
    firstImpulse: frames[contactStart].impulse,
    separationFrame,
    beforeSeparationMotor: [...frames[separationFrame].beforePre],
    afterSeparationMotor: [...frames[separationFrame].afterPre],
    speedBeforeSeparationMotor: horizontal(frames[separationFrame].beforePre),
    speedAfterSeparationMotor: horizontal(frames[separationFrame].afterPre),
    speedAfter6: horizontal(frameAt(5).afterPost),
    tail25: displacement(15),
    tail50: displacement(30),
    supportAtSeparation: frames[separationFrame].support,
    shimStats: useIntendedClip ? module._e23Stats() : null,
  };
}

function fmt(v) {
  return `(${v[0].toFixed(3)}, ${v[2].toFixed(3)})`;
}

const binding = bindingContractProbe();
const groundFree = freeMomentumTrial(true);
const airFree = freeMomentumTrial(false);
const currentOwner1 = owner1Trial(false);
const intendedOwner1 = owner1Trial(true);

console.log('E2.3 momentum-preservation boundary / box3d.js binding-contract diagnostic:');
console.log(
  `  binding contract: planes=${binding.planeCount} nativeDelta=${fmt(binding.nativeSolved.delta)} reconstructedDelta=${fmt(binding.reconstructed.delta)} error=${binding.solveDeltaError.toExponential(2)} visiblePush=${binding.nativeVisiblePush.toFixed(6)} recoveredPush=${binding.recoveredPush.toFixed(6)}`,
);
console.log(
  `  clip path: constrained=${fmt(binding.constrainedVelocity)} staleBinding=${fmt(binding.bindingClip)} intendedBinding=${fmt(binding.intendedClipViaBinding)} intendedJS=${fmt(binding.intendedClipJs)} staleChange=${binding.staleClipChange.toFixed(3)} intendedChange=${binding.intendedClipChange.toFixed(3)}`,
);
console.log(
  `  free grounded: 5.000 -> 1f ${groundFree.after1.toFixed(3)} -> 6f ${groundFree.after6.toFixed(3)} -> 15f ${groundFree.after15.toFixed(3)} m/s; stopFrame=${groundFree.stopFrame} distance=.50s ${groundFree.distance30.toFixed(3)}m`,
);
console.log(
  `  free airborne: 5.000 -> 1f ${airFree.after1.toFixed(3)} -> 6f ${airFree.after6.toFixed(3)} -> 15f ${airFree.after15.toFixed(3)} -> 30f ${airFree.after30.toFixed(3)} m/s`,
);
for (const [label, trial] of [['current-binding A-double-prime', currentOwner1], ['push-propagated intended-clip A-double-prime', intendedOwner1]]) {
  console.log(
    `  owner-1 ${label}: contact=${trial.contactStart}-${trial.contactEnd} (${trial.contactFrames}f) firstI=${trial.firstImpulse.toFixed(2)}Ns sepV=${trial.speedBeforeSeparationMotor.toFixed(3)}->motor ${trial.speedAfterSeparationMotor.toFixed(3)} 6f=${trial.speedAfter6.toFixed(3)} tail=.25 ${trial.tail25.toFixed(3)}m/.50 ${trial.tail50.toFixed(3)}m support=${trial.supportAtSeparation}${trial.shimStats ? ` solveCalls=${trial.shimStats.calls} activePlanes=${trial.shimStats.activatedPlanes} maxSolveErr=${trial.shimStats.maxSolveDeltaError.toExponential(2)}` : ''}`,
  );
}

if (binding.solveDeltaError > 2e-5) {
  throw new Error(`E2.3 JS solver reconstruction failed native-delta gate: ${binding.solveDeltaError}`);
}
if (!(binding.nativeVisiblePush === 0 && binding.recoveredPush > 0)) {
  throw new Error(`E2.3 expected box3d.js solve wrapper to lose plane.push: visible=${binding.nativeVisiblePush} recovered=${binding.recoveredPush}`);
}
if (binding.staleClipChange > 1e-9) {
  throw new Error(`E2.3 expected stale JS planes to make b3ClipVector a no-op; change=${binding.staleClipChange}`);
}
if (!(binding.intendedClipChange > 2.5 && binding.intendedImplementationsError < 1e-6)) {
  throw new Error(`E2.3 intended clip reconstruction failed: change=${binding.intendedClipChange} js-vs-binding=${binding.intendedImplementationsError}`);
}
if (!(groundFree.after6 < airFree.after6 - 2.0)) {
  throw new Error('E2.3 grounded-vs-air motor boundary was not reproduced');
}
if (!(currentOwner1.speedAfterSeparationMotor < currentOwner1.speedBeforeSeparationMotor - 0.5)) {
  throw new Error('E2.3 owner-1 current A-double-prime did not expose grounded motor as a large immediate momentum sink');
}
if (!(intendedOwner1.shimStats.calls > 0 && intendedOwner1.shimStats.activatedPlanes > 0)) {
  throw new Error('E2.3 intended-clip trial did not activate reconstructed plane pushes');
}

console.log('  binding gate PASS: box3d.js@0.1.1 loses b3SolvePlanes push mutations across the JS boundary, making the subsequent b3ClipVector call inert for freshly collected JS planes.');
console.log('  motor gate PASS: A-double-prime grounded zero-input recovery remains a strong momentum sink independently of that binding defect.');
console.log('  intended-clip comparison is diagnostic only: no substrate patch, slide amount, recovery constant, or new baseline is selected here.');
