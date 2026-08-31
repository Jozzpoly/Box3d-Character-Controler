import Box3D from 'box3d.js/inline';
import { ControllerOwnedCharacter } from '../src/character.js';
import { createFreePlayCapture } from '../src/free-play-capture.js';
import { createPlayground } from '../src/playground.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;

function intentForFrame(frame) {
  return {
    moveForward: frame < 110 ? 1 : 0,
    moveRight: 0,
    forward: [0, 0, -1],
    right: [1, 0, 0],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function characterFingerprint(character) {
  return {
    position: [...character.position],
    velocity: [...character.velocity],
    externalVelocity: [...character.externalVelocity],
    desiredSpeed: character.desiredSpeed,
    desiredDirection: [...character.desiredDirection],
    supportType: character.currentSupport?.type ?? 'AIR',
    dynamicContacts: character.lastDynamicContacts,
    contactImpulse: character.lastContactImpulse,
    planeCount: character.lastPlaneCount,
    supportTransport: character.supportTransportDistance,
  };
}

function run(withCapture) {
  const playground = createPlayground(b3);
  const character = new ControllerOwnedCharacter(b3, playground.world, {
    startPosition: playground.spawn,
    gravity: playground.gravity,
    virtualMass: 80,
    reciprocityMode: 'causal-components',
  });
  const capture = withCapture
    ? createFreePlayCapture({
      playground,
      character,
      fixedDt: dt,
      substeps,
      sourceUrl: 'noninterference-test',
      userAgent: 'node',
    })
    : null;

  let maxDynamicContacts = 0;
  for (let frame = 0; frame < 310; frame++) {
    const intent = intentForFrame(frame);
    playground.preStep(dt);
    character.preStep(dt, intent);
    b3.b3World_Step(playground.world, dt, substeps);
    character.postStep(dt);
    maxDynamicContacts = Math.max(maxDynamicContacts, character.lastDynamicContacts);
    capture?.record(intent);
    if (capture && frame === 190) capture.mark('machine-marker-complete');
    if (capture && frame === 300) capture.mark('machine-marker-before-reset');
  }

  const final = {
    character: characterFingerprint(character),
    playground: playground.captureSnapshot(),
  };

  if (capture) capture.resetEpoch('machine-reset');

  return {
    final,
    maxDynamicContacts,
    capture: capture?.exportData('machine-export') ?? null,
  };
}

function compare(a, b, path = 'root') {
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > 1e-12) {
      throw new Error(`E2.2c-1 non-interference mismatch at ${path}: ${a} vs ${b}`);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) throw new Error(`E2.2c-1 length mismatch at ${path}`);
    for (let i = 0; i < a.length; i++) compare(a[i], b[i], `${path}[${i}]`);
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.join('|') !== bKeys.join('|')) throw new Error(`E2.2c-1 key mismatch at ${path}`);
    for (const key of aKeys) compare(a[key], b[key], `${path}.${key}`);
    return;
  }
  if (a !== b) throw new Error(`E2.2c-1 value mismatch at ${path}: ${String(a)} vs ${String(b)}`);
}

const control = run(false);
const observed = run(true);
compare(control.final, observed.final);

if (control.maxDynamicContacts <= 0 || observed.maxDynamicContacts <= 0) {
  throw new Error('E2.2c-1 non-interference trial never exercised a dynamic contact');
}

const exported = observed.capture;
if (!exported || exported.events.length !== 2) {
  throw new Error('E2.2c-1 capture did not export the two expected marked events');
}

const completedEvent = exported.events[0];
if (!completedEvent.complete) throw new Error('E2.2c-1 completed event did not finish its post-roll');
if (completedEvent.markerIndex !== 179) {
  throw new Error(`E2.2c-1 pre-roll expected markerIndex=179, got ${completedEvent.markerIndex}`);
}
if (completedEvent.frames.length !== 270) {
  throw new Error(`E2.2c-1 expected 270 captured frames, got ${completedEvent.frames.length}`);
}
if (completedEvent.frames[completedEvent.markerIndex].frame !== completedEvent.markerFrame) {
  throw new Error('E2.2c-1 marker does not point at the marked physics frame');
}

const truncatedEvent = exported.events[1];
if (truncatedEvent.complete) throw new Error('E2.2c-1 reset-boundary event was incorrectly marked complete');
if (truncatedEvent.truncatedBy !== 'machine-reset') {
  throw new Error(`E2.2c-1 reset-boundary event missing truncation reason: ${truncatedEvent.truncatedBy}`);
}
if (truncatedEvent.frames.some((frame) => frame.epoch !== truncatedEvent.epoch)) {
  throw new Error('E2.2c-1 reset-boundary event crossed capture epochs');
}
if (truncatedEvent.frames.length !== 189) {
  throw new Error(`E2.2c-1 expected 189 frames before reset truncation, got ${truncatedEvent.frames.length}`);
}

console.log(
  `E2.2c-1 capture non-interference PASS: dynamicContacts=${control.maxDynamicContacts} finalPos=${control.final.character.position.map((v) => v.toFixed(4)).join(',')} completeFrames=${completedEvent.frames.length} truncatedFrames=${truncatedEvent.frames.length} resetBoundary=PASS bodiesPerFrame=${completedEvent.frames[0].bodies.length}`,
);
