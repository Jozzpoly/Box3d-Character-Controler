import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { createDonorCharacter, DONOR_BEHAVIOR } from '../src/donor-character.js';
import { installVelocityOnlyContactMemoryProbe } from '../src/momentum-semantics-probe.js';
import { createPlayground } from '../src/playground.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const TOLERANCE = 1e-9;

function createReference(playground) {
  const character = new ControllerOwnedCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
    virtualMass: 80,
    reciprocityMode: 'causal-components',
  });
  return installVelocityOnlyContactMemoryProbe(character);
}

function createCandidate(playground) {
  return createDonorCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
  });
}

function intentForFrame(frame) {
  let moveForward = 0;
  let moveRight = 0;
  let jump = false;
  let jumpHeld = false;
  let sprint = false;

  if (frame >= 90 && frame < 220) {
    moveForward = 1;
    sprint = frame >= 165;
  } else if (frame === 220) {
    moveForward = 0.6;
    jump = true;
    jumpHeld = true;
  } else if (frame > 220 && frame < 236) {
    moveForward = 0.6;
    jumpHeld = true;
  } else if (frame >= 236 && frame < 300) {
    moveRight = 1;
  }

  return {
    moveForward,
    moveRight,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump,
    jumpHeld,
    sprint,
  };
}

function step(playground, character, intent) {
  playground.preStep(DT);
  character.preStep(DT, intent);
  b3.b3World_Step(playground.world, DT, SUBSTEPS);
  character.postStep(DT);
}

function assertNear(a, b, label) {
  if (Math.abs(a - b) > TOLERANCE) {
    throw new Error(`${label}: ${a} != ${b}`);
  }
}

function assertVector(a, b, label) {
  if (a.length !== b.length) throw new Error(`${label}: length mismatch`);
  for (let i = 0; i < a.length; i++) assertNear(a[i], b[i], `${label}[${i}]`);
}

function compareCharacter(reference, candidate, frame) {
  assertVector(reference.position, candidate.position, `frame ${frame} position`);
  assertVector(reference.velocity, candidate.velocity, `frame ${frame} velocity`);
  assertVector(reference.externalVelocity, candidate.externalVelocity, `frame ${frame} externalVelocity`);
  assertVector(reference.desiredDirection, candidate.desiredDirection, `frame ${frame} desiredDirection`);
  assertNear(reference.desiredSpeed, candidate.desiredSpeed, `frame ${frame} desiredSpeed`);
  assertNear(reference.lastContactImpulse, candidate.lastContactImpulse, `frame ${frame} contactImpulse`);
  assertNear(reference.supportTransportDistance, candidate.supportTransportDistance, `frame ${frame} supportTransport`);
  if (reference.lastDynamicContacts !== candidate.lastDynamicContacts) {
    throw new Error(`frame ${frame} dynamicContacts mismatch`);
  }
  if ((reference.currentSupport?.type ?? 'AIR') !== (candidate.currentSupport?.type ?? 'AIR')) {
    throw new Error(`frame ${frame} support type mismatch`);
  }
}

function compareWorld(reference, candidate, frame) {
  const a = reference.captureSnapshot();
  const b = candidate.captureSnapshot();
  assertNear(a.time, b.time, `frame ${frame} world time`);
  if (a.bodies.length !== b.bodies.length) throw new Error(`frame ${frame} body count mismatch`);

  for (let i = 0; i < a.bodies.length; i++) {
    const aa = a.bodies[i];
    const bb = b.bodies[i];
    if (aa.id !== bb.id || aa.type !== bb.type) throw new Error(`frame ${frame} body ${i} identity mismatch`);
    assertVector(aa.position, bb.position, `frame ${frame} ${aa.id} position`);
    assertVector(aa.rotation, bb.rotation, `frame ${frame} ${aa.id} rotation`);
    assertVector(aa.linearVelocity, bb.linearVelocity, `frame ${frame} ${aa.id} linearVelocity`);
    assertVector(aa.angularVelocity, bb.angularVelocity, `frame ${frame} ${aa.id} angularVelocity`);
  }
}

const referencePlayground = createPlayground(b3);
const candidatePlayground = createPlayground(b3);
const reference = createReference(referencePlayground);
const candidate = createCandidate(candidatePlayground);
let dynamicContactFrames = 0;
let jumpFrames = 0;

try {
  for (let frame = 0; frame < 360; frame++) {
    const intent = intentForFrame(frame);
    if (intent.jump || intent.jumpHeld) jumpFrames += 1;

    step(referencePlayground, reference, intent);
    step(candidatePlayground, candidate, intent);

    if (reference.lastDynamicContacts > 0) dynamicContactFrames += 1;
    compareCharacter(reference, candidate, frame);
    compareWorld(referencePlayground, candidatePlayground, frame);
  }

  if (dynamicContactFrames === 0) {
    throw new Error('Donor equivalence route never exercised dynamic contact');
  }
  if (jumpFrames === 0) {
    throw new Error('Donor equivalence route never exercised jump input');
  }

  console.log(
    `Donor smoke PASS: ${DONOR_BEHAVIOR.specimen} matches current public A″ composition for 360 ticks; dynamicContactFrames=${dynamicContactFrames}; jumpInputFrames=${jumpFrames}`,
  );
} finally {
  b3.b3DestroyWorld(referencePlayground.world);
  b3.b3DestroyWorld(candidatePlayground.world);
}
