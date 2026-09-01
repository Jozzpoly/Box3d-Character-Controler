import Box3D from 'box3d.js/inline';
import { createConstraintVelocityCharacter } from '../src/constraint-velocity-character.js';
import {
  createCurrentDonorCharacter,
  createDonorCharacter,
  createDonorCharacterV1,
  DONOR_BEHAVIOR_V1,
} from '../src/donor/index.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const TOLERANCE = 1e-9;

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  function box(position, half) {
    const bodyDef = b3.b3DefaultBodyDef();
    bodyDef.type = b3.b3BodyType.b3_staticBody;
    bodyDef.position = [...position];
    bodyDef.enableSleep = false;
    const body = b3.b3CreateBody(world, bodyDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = 0.8;
    shapeDef.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
    return body;
  }

  box([0, -0.5, 0], [12, 0.5, 6]);
  box([2.0, 0.3, 0], [0.1, 0.3, 2.0]);
  return world;
}

function intent(overrides = {}) {
  return {
    moveForward: 0,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function create(factory, world) {
  return factory(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
  });
}

function tick(world, character, control) {
  character.preStep(DT, control);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function near(a, b, label, tolerance = TOLERANCE) {
  if (Math.abs(a - b) > tolerance) throw new Error(`${label}: ${a} != ${b}`);
}

function vectorNear(a, b, label) {
  if (a.length !== b.length) throw new Error(`${label}: length mismatch`);
  for (let i = 0; i < a.length; i++) near(a[i], b[i], `${label}[${i}]`);
}

function compareCharacters(reference, candidate, frame) {
  vectorNear(reference.position, candidate.position, `frame ${frame} position`);
  vectorNear(reference.velocity, candidate.velocity, `frame ${frame} velocity`);
  vectorNear(reference.externalVelocity, candidate.externalVelocity, `frame ${frame} externalVelocity`);
  vectorNear(reference.desiredDirection, candidate.desiredDirection, `frame ${frame} desiredDirection`);
  near(reference.desiredSpeed, candidate.desiredSpeed, `frame ${frame} desiredSpeed`);
  near(reference.lastContactImpulse, candidate.lastContactImpulse, `frame ${frame} impulse`);
  near(reference.supportTransportDistance, candidate.supportTransportDistance, `frame ${frame} support transport`);
  near(reference.lastConstraintSolveError, candidate.lastConstraintSolveError, `frame ${frame} solve error`, 1e-12);
  if (reference.lastConstraintClips !== candidate.lastConstraintClips) {
    throw new Error(`frame ${frame} constraint clip count mismatch`);
  }
  if ((reference.currentSupport?.type ?? 'AIR') !== (candidate.currentSupport?.type ?? 'AIR')) {
    throw new Error(`frame ${frame} support mismatch`);
  }
}

function runPair() {
  const referenceWorld = makeWorld();
  const donorWorld = makeWorld();
  const reference = create(createConstraintVelocityCharacter, referenceWorld);
  const donor = create(createDonorCharacterV1, donorWorld);
  let frame = 0;
  let capEvents = 0;
  let maxSolveError = 0;

  const stepBoth = (control) => {
    tick(referenceWorld, reference, control);
    tick(donorWorld, donor, control);
    compareCharacters(reference, donor, frame++);
    capEvents += donor.lastConstraintClips;
    maxSolveError = Math.max(maxSolveError, donor.lastConstraintSolveError);
  };

  for (let i = 0; i < 20; i++) stepBoth(intent());
  if (!reference.currentSupport || !donor.currentSupport) throw new Error('v1 equivalence setup did not settle');

  let blockedFrames = 0;
  for (let i = 0; i < 75; i++) {
    stepBoth(intent({ moveForward: 1 }));
    if (donor.lastPlaneCount > 1) blockedFrames += 1;
  }
  if (blockedFrames < 20) throw new Error(`v1 equivalence route did not establish blocking: ${blockedFrames}f`);

  for (let i = 0; i < 3; i++) stepBoth(intent());
  const releaseStart = [...donor.position];
  let peakX = releaseStart[0];
  for (let i = 0; i < 75; i++) {
    stepBoth(intent({ jump: i === 0, jumpHeld: i < 8 }));
    peakX = Math.max(peakX, donor.position[0]);
  }

  const releaseDx = peakX - releaseStart[0];
  if (releaseDx > 0.03) throw new Error(`donor v1 reintroduced stale blocked-velocity release: ${releaseDx}m`);
  if (capEvents < 1) throw new Error('donor v1 route never exercised the promoted constraint policy');
  if (maxSolveError > 2e-5) throw new Error(`donor v1 solve reconstruction exceeded gate: ${maxSolveError}`);

  b3.b3DestroyWorld(referenceWorld);
  b3.b3DestroyWorld(donorWorld);
  return { releaseDx, capEvents, maxSolveError };
}

function runV0Control() {
  const world = makeWorld();
  const character = create(createDonorCharacter, world);
  for (let i = 0; i < 20; i++) tick(world, character, intent());
  for (let i = 0; i < 75; i++) tick(world, character, intent({ moveForward: 1 }));
  for (let i = 0; i < 3; i++) tick(world, character, intent());
  const start = [...character.position];
  let peakX = start[0];
  for (let i = 0; i < 75; i++) {
    tick(world, character, intent({ jump: i === 0, jumpHeld: i < 8 }));
    peakX = Math.max(peakX, character.position[0]);
  }
  const releaseDx = peakX - start[0];
  b3.b3DestroyWorld(world);
  if (releaseDx < 0.8) {
    throw new Error(`frozen donor v0 control unexpectedly lost its historical blocked-velocity behavior: ${releaseDx}m`);
  }
  return releaseDx;
}

if (createCurrentDonorCharacter !== createDonorCharacterV1) {
  throw new Error('current donor factory is not the qualified v1 factory');
}

const v1 = runPair();
const v0Release = runV0Control();

console.log(
  `Donor v1 smoke PASS: ${DONOR_BEHAVIOR_V1.specimen} matches exact E2.3d runtime through active constraint policy; ` +
    `v1Release=${v1.releaseDx.toFixed(3)}m v0Control=${v0Release.toFixed(3)}m caps=${v1.capEvents} ` +
    `maxSolveErr=${v1.maxSolveError.toExponential(2)}`,
);
