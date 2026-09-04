import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import {
  E16_CAPABILITY_LIMITS,
  chooseGrabCandidate,
  horizontalOrganTargetOffset,
} from '../src/e16-capability-interaction.js';
import { createE16ContactQualifiedGrabCharacter } from '../src/e16-contact-qualified-grab-character.js';
import { createE16Toybox } from '../src/e16-toybox.js';
import { createPlayground } from '../src/playground.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;
const FORWARD = [0, 0, -1];
const RIGHT = [1, 0, 0];

function intent(moveForward = 0) {
  return {
    moveForward,
    moveRight: 0,
    forward: FORWARD,
    right: RIGHT,
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function tick(playground, toybox, character, { moveForward = 0, reach, grabHeld = true }) {
  playground.preStep(DT);
  toybox.preStep(DT);
  character.setOrganTargetOffset(horizontalOrganTargetOffset(FORWARD, reach));
  if (!grabHeld && character.grabJoint) character.releaseGrab();
  character.preStep(DT, intent(moveForward));
  b3.b3World_Step(playground.world, DT, SUBSTEPS);
  character.postStep(DT);
  if (grabHeld && !character.grabJoint && character.grabCandidates.length > 0) {
    const candidate = chooseGrabCandidate(character.grabCandidates, character.organTarget);
    if (candidate) character.grabContactCandidate(candidate);
  }
}

const playground = createPlayground(b3);
const toybox = createE16Toybox(b3, playground.world, playground.appearance);
const character = createE16ContactQualifiedGrabCharacter(b3, playground.world, {
  startPosition: playground.spawn,
  gravity: playground.gravity,
  subsystemFeedbackGain: 1,
  constraintTransportGain: 1,
});

for (let i = 0; i < 24; i++) {
  tick(playground, toybox, character, {
    moveForward: 0,
    reach: E16_CAPABILITY_LIMITS.restReach,
    grabHeld: false,
  });
}

const spawn = [...character.position];
let grabFrame = null;
let rootAtGrab = null;
let candidateBodiesAtGrab = [];
let maxCandidates = 0;

for (let i = 0; i < 90 && !character.grabJoint; i++) {
  tick(playground, toybox, character, {
    moveForward: 0.72,
    reach: E16_CAPABILITY_LIMITS.engageReach,
    grabHeld: true,
  });
  maxCandidates = Math.max(maxCandidates, character.grabCandidates.length);
  if (character.grabJoint) {
    grabFrame = i;
    rootAtGrab = [...character.position];
    candidateBodiesAtGrab = character.telemetry().grabCandidateBodies;
  }
}

if (!character.grabJoint || !rootAtGrab) {
  throw new Error(`E16.2a integrated yard never earned a grab from spawn; root=${JSON.stringify(character.position)} candidates=${maxCandidates}`);
}

let persistentFrames = 0;
let appliedTransport = 0;
let peakTransport = 0;
for (let i = 0; i < 100; i++) {
  tick(playground, toybox, character, {
    moveForward: 0,
    reach: E16_CAPABILITY_LIMITS.minReach,
    grabHeld: true,
  });
  if (character.lastSubsystemFeedbackPersistent) persistentFrames += 1;
  appliedTransport += character.lastAppliedGrabTransportDistance;
  peakTransport = Math.max(peakTransport, character.lastAppliedGrabTransportDistance);
}

const rootAfterReel = [...character.position];
const horizontalPull = Math.hypot(rootAfterReel[0] - rootAtGrab[0], rootAfterReel[2] - rootAtGrab[2]);
const grabbedBeforeRelease = Boolean(character.grabJoint);
tick(playground, toybox, character, {
  moveForward: 0,
  reach: E16_CAPABILITY_LIMITS.restReach,
  grabHeld: false,
});
const released = !character.grabJoint;

const report = {
  schema: 'e16-capability-yard-integrated-smoke-v0',
  spawn,
  grabFrame,
  rootAtGrab,
  rootAfterReel,
  horizontalPull,
  maxCandidates,
  candidateBodiesAtGrab,
  persistentFrames,
  appliedTransport,
  peakTransport,
  grabbedBeforeRelease,
  released,
  toybox: toybox.stats(),
  boundary: 'Integrated machine path for E16.2a composition. It does not establish Owner feel, discoverability or fun.',
};

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (grabFrame === null || maxCandidates < 1 || !grabbedBeforeRelease) {
  throw new Error(`E16.2a failed to compose reach/contact/grab: ${JSON.stringify(report)}`);
}
if (horizontalPull < 0.04) {
  throw new Error(`E16.2a reel produced too little geometry-checked carrier movement: ${horizontalPull}`);
}
if (persistentFrames !== 0) {
  throw new Error(`E16.2a live grab leaked persistent impulse on ${persistentFrames} frames`);
}
if (!released) throw new Error('E16.2a release did not destroy earned grab topology');

b3.b3DestroyWorld(playground.world);
