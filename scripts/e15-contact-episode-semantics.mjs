import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE15HybridCharacter } from '../src/e15-hybrid-character.js';
import { createE15ContactSemanticCharacter } from '../src/e15-contact-semantic-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function makeWorld() {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShapeDef = b3.b3DefaultShapeDef();
  groundShapeDef.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShapeDef, 30, 0.5, 30);

  const barDef = b3.b3DefaultBodyDef();
  barDef.position = [1.45, 2.0, 0];
  const bar = b3.b3CreateBody(world, barDef);
  const barShapeDef = b3.b3DefaultShapeDef();
  barShapeDef.baseMaterial.friction = 0.4;
  b3.b3CreateBoxShape(bar, barShapeDef, 0.08, 0.08, 1.2);
  return world;
}

function intent(moveForward = 0) {
  return {
    moveForward,
    moveRight: 0,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
  };
}

function tick(world, character, control) {
  character.preStep(DT, control);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function rootSignature(character) {
  return [...character.position, ...character.velocity, ...character.externalVelocity];
}

function maxDelta(a, b) {
  const av = rootSignature(a);
  const bv = rootSignature(b);
  return Math.max(...av.map((v, i) => Math.abs(v - bv[i])));
}

const donorWorld = makeWorld();
const v0World = makeWorld();
const v1World = makeWorld();
const controlWorld = makeWorld();
const common = { startPosition: [0, 0.9, 0], gravity: 20 };
const donor = createCurrentDonorCharacter(b3, donorWorld, common);
const v0 = createE15HybridCharacter(b3, v0World, { ...common, feedbackGain: 1 });
const v1 = createE15ContactSemanticCharacter(b3, v1World, { ...common, feedbackGain: 1 });
const control = createE15ContactSemanticCharacter(b3, controlWorld, { ...common, feedbackGain: 0 });

const metrics = {
  controlVsDonorMaxDelta: 0,
  v0: {
    contactFrames: 0,
    minExternalX: 0,
    maxFeedbackImpulse: 0,
    maxBodyOffset: 0,
    firstContact: null,
  },
  v1: {
    contactFrames: 0,
    feedbackFrames: 0,
    persistentFeedbackFrames: 0,
    constraintFeedbackFrames: 0,
    minExternalX: 0,
    maxFeedbackImpulse: 0,
    maxPersistentFeedbackImpulse: 0,
    maxConstraintFeedbackImpulse: 0,
    maxBodyOffset: 0,
    firstContact: null,
  },
};
const samples = [];
let frame = 0;

function record(character, target, phase, phaseFrame) {
  target.contactFrames += character.lastBodyContacts > 0 ? 1 : 0;
  target.minExternalX = Math.min(target.minExternalX, character.externalVelocity[0]);
  target.maxFeedbackImpulse = Math.max(target.maxFeedbackImpulse, character.lastBodyFeedbackImpulse);
  target.maxBodyOffset = Math.max(target.maxBodyOffset, character.bodyOffsetDistance);
  if (character.lastBodyContacts > 0 && !target.firstContact) {
    target.firstContact = {
      frame,
      phase,
      phaseFrame,
      rootX: character.position[0],
      bodyX: character.bodyPosition[0],
      velocityX: character.velocity[0],
      externalX: character.externalVelocity[0],
      physicsImpulse: character.lastBodyPhysicsImpulse,
      feedbackImpulse: character.lastBodyFeedbackImpulse,
      bodyOffset: character.bodyOffsetDistance,
    };
  }
}

function stepAll(controlIntent, phase, phaseFrame) {
  tick(donorWorld, donor, controlIntent);
  tick(v0World, v0, controlIntent);
  tick(v1World, v1, controlIntent);
  tick(controlWorld, control, controlIntent);

  metrics.controlVsDonorMaxDelta = Math.max(metrics.controlVsDonorMaxDelta, maxDelta(control, donor));
  record(v0, metrics.v0, phase, phaseFrame);
  record(v1, metrics.v1, phase, phaseFrame);

  if (v1.lastBodyFeedbackImpulse > 1e-8) metrics.v1.feedbackFrames += 1;
  if (v1.lastBodyPersistentFeedbackImpulse > 1e-8) metrics.v1.persistentFeedbackFrames += 1;
  if (v1.lastBodyConstraintFeedbackImpulse > 1e-8) metrics.v1.constraintFeedbackFrames += 1;
  metrics.v1.maxPersistentFeedbackImpulse = Math.max(
    metrics.v1.maxPersistentFeedbackImpulse,
    v1.lastBodyPersistentFeedbackImpulse,
  );
  metrics.v1.maxConstraintFeedbackImpulse = Math.max(
    metrics.v1.maxConstraintFeedbackImpulse,
    v1.lastBodyConstraintFeedbackImpulse,
  );

  if (
    phaseFrame % 10 === 0 ||
    v0.lastBodyContacts > 0 ||
    v1.lastBodyContacts > 0 ||
    v1.lastBodyPersistentFeedbackImpulse > 1e-8
  ) {
    samples.push({
      frame,
      phase,
      phaseFrame,
      donorX: donor.position[0],
      v0X: v0.position[0],
      v1X: v1.position[0],
      controlX: control.position[0],
      v0VelocityX: v0.velocity[0],
      v1VelocityX: v1.velocity[0],
      v0ExternalX: v0.externalVelocity[0],
      v1ExternalX: v1.externalVelocity[0],
      v0Contacts: v0.lastBodyContacts,
      v1Contacts: v1.lastBodyContacts,
      v0FeedbackImpulse: v0.lastBodyFeedbackImpulse,
      v1FeedbackImpulse: v1.lastBodyFeedbackImpulse,
      v1PersistentImpulse: v1.lastBodyPersistentFeedbackImpulse,
      v1ConstraintImpulse: v1.lastBodyConstraintFeedbackImpulse,
      v0BodyOffset: v0.bodyOffsetDistance,
      v1BodyOffset: v1.bodyOffsetDistance,
    });
  }
  frame += 1;
}

for (let i = 0; i < 45; i++) stepAll(intent(0), 'settle', i);
for (let i = 0; i < 120; i++) stepAll(intent(1), 'drive-under-bar', i);
for (let i = 0; i < 120; i++) stepAll(intent(0), 'release', i);

metrics.v0.final = {
  x: v0.position[0],
  velocityX: v0.velocity[0],
  externalX: v0.externalVelocity[0],
};
metrics.v1.final = {
  x: v1.position[0],
  velocityX: v1.velocity[0],
  externalX: v1.externalVelocity[0],
  contactEpisodes: v1.bodyContactEpisodeCount,
};
metrics.controlFinalX = control.position[0];
metrics.donorFinalX = donor.position[0];

const episodeExternalBound = v1.maxFeedbackDeltaV * Math.max(1, v1.bodyContactEpisodeCount) + 1e-6;
const firstImpactDelta = Math.abs(
  (metrics.v0.firstContact?.externalX ?? 0) - (metrics.v1.firstContact?.externalX ?? 0),
);

const report = {
  schema: 'e15-contact-episode-semantics-v1',
  hypothesis:
    'Sustained contact response should affect current movement but should not accumulate every contact frame as new persistent external momentum.',
  metrics,
  derived: {
    episodeExternalBound,
    firstImpactExternalDeltaV0VsV1: firstImpactDelta,
    v0PathDeficitVsDonor: donor.position[0] - v0.position[0],
    v1PathDeficitVsDonor: donor.position[0] - v1.position[0],
  },
  samples,
  boundary:
    'Bounded semantics A/B only. A PASS means contact-episode classification prevents frame-by-frame persistent accumulation while preserving immediate contact response. It does not establish preferred feel or production correctness.',
};

if (metrics.controlVsDonorMaxDelta > 1e-9) {
  throw new Error(`E15.1 feedback-off control diverged from Donor: ${metrics.controlVsDonorMaxDelta}`);
}
if (!(metrics.v1.contactFrames > 1 && metrics.v1.constraintFeedbackFrames > 0)) {
  throw new Error(
    `E15.1 did not exercise sustained current-only contact response: contacts=${metrics.v1.contactFrames} constraintFrames=${metrics.v1.constraintFeedbackFrames}`,
  );
}
if (!(metrics.v1.persistentFeedbackFrames > 0 && metrics.v1.persistentFeedbackFrames < metrics.v1.feedbackFrames)) {
  throw new Error(
    `E15.1 failed to separate persistent impact from sustained constraint response: persistent=${metrics.v1.persistentFeedbackFrames} feedback=${metrics.v1.feedbackFrames}`,
  );
}
if (Math.abs(metrics.v1.minExternalX) > episodeExternalBound) {
  throw new Error(
    `E15.1 persistent external velocity exceeded one capped contribution per contact episode: min=${metrics.v1.minExternalX} bound=${episodeExternalBound}`,
  );
}
if (firstImpactDelta > 1e-5) {
  throw new Error(`E15.1 changed the first-impact transient instead of only sustained storage semantics: delta=${firstImpactDelta}`);
}
if (!(metrics.v1.maxConstraintFeedbackImpulse > 1e-4)) {
  throw new Error('E15.1 sustained body/world contact no longer affects current carrier motion');
}

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `E15.1 contact semantics PASS: episodes=${v1.bodyContactEpisodeCount} ` +
  `contactFrames=${metrics.v1.contactFrames} persistentFrames=${metrics.v1.persistentFeedbackFrames} ` +
  `constraintFrames=${metrics.v1.constraintFeedbackFrames} ` +
  `minExternal v0/v1=${metrics.v0.minExternalX.toFixed(3)}/${metrics.v1.minExternalX.toFixed(3)}m/s ` +
  `finalX donor/v0/v1=${donor.position[0].toFixed(3)}/${v0.position[0].toFixed(3)}/${v1.position[0].toFixed(3)}`,
);

b3.b3DestroyWorld(donorWorld);
b3.b3DestroyWorld(v0World);
b3.b3DestroyWorld(v1World);
b3.b3DestroyWorld(controlWorld);
