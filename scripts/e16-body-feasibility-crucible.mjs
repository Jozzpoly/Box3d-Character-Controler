import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createCurrentDonorCharacter } from '../src/donor/index.js';
import { createE15ContactSemanticCharacter } from '../src/e15-contact-semantic-character.js';
import { createE16BodyFeasibilityCharacter } from '../src/e16-body-feasibility-character.js';

const b3 = await Box3D();
const DT = 1 / 60;
const SUBSTEPS = 4;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) ?? null;

function makeWorld({ roof = false } = {}) {
  const def = b3.b3DefaultWorldDef();
  def.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(def);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.5, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const groundShape = b3.b3DefaultShapeDef();
  groundShape.baseMaterial.friction = 0.8;
  b3.b3CreateBoxShape(ground, groundShape, 30, 0.5, 30);

  if (roof) {
    // Bottom face = 1.93 m. Settled Donor capsule top is ~1.795 m, while the E15/E16
    // physical torso top is ~2.03 m. The analytical carrier can pass underneath but
    // the physical upper body cannot remain upright through this volume.
    const roofDef = b3.b3DefaultBodyDef();
    roofDef.position = [2.0, 1.99, 0];
    const body = b3.b3CreateBody(world, roofDef);
    const shape = b3.b3DefaultShapeDef();
    shape.baseMaterial.friction = 0.45;
    b3.b3CreateBoxShape(body, shape, 0.70, 0.06, 0.80);
  }

  return world;
}

function intent(moveForward = 0, moveRight = 0, overrides = {}) {
  return {
    moveForward,
    moveRight,
    forward: [1, 0, 0],
    right: [0, 0, 1],
    jump: false,
    jumpHeld: false,
    sprint: false,
    ...overrides,
  };
}

function tick(world, character, control) {
  character.preStep(DT, control);
  b3.b3World_Step(world, DT, SUBSTEPS);
  character.postStep(DT);
}

function rootSignature(character) {
  return [
    ...character.position,
    ...character.velocity,
    ...character.externalVelocity,
    character.desiredSpeed,
    ...character.desiredDirection,
  ];
}

function maxDelta(a, b) {
  const av = rootSignature(a);
  const bv = rootSignature(b);
  return Math.max(...av.map((value, index) => Math.abs(value - bv[index])));
}

function finiteCharacter(character, label) {
  const values = [
    ...character.position,
    ...character.velocity,
    ...character.externalVelocity,
    ...(character.bodyPosition ?? []),
    ...(character.bodyVelocity ?? []),
  ];
  if (!values.every(Number.isFinite)) {
    throw new Error(`${label} produced non-finite state: ${JSON.stringify(values)}`);
  }
}

function runNeutralEquivalence() {
  const donorWorld = makeWorld();
  const e16World = makeWorld();
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const donor = createCurrentDonorCharacter(b3, donorWorld, common);
  const e16 = createE16BodyFeasibilityCharacter(b3, e16World, {
    ...common,
    feedbackGain: 0,
    attachmentRadius: 0.22,
  });
  let worstRootDelta = 0;
  let maxRequestedExtension = 0;
  let clipFrames = 0;

  const step = (control) => {
    tick(donorWorld, donor, control);
    tick(e16World, e16, control);
    worstRootDelta = Math.max(worstRootDelta, maxDelta(donor, e16));
    maxRequestedExtension = Math.max(maxRequestedExtension, e16.lastFeasibilityRequestedExtension);
    if (e16.lastFeasibilityClipped) clipFrames += 1;
    finiteCharacter(e16, 'E16 neutral');
  };

  for (let i = 0; i < 45; i++) step(intent());
  for (let i = 0; i < 75; i++) step(intent(1, 0, { sprint: i > 30 }));
  for (let i = 0; i < 40; i++) step(intent(0.45, 0.72));
  for (let i = 0; i < 8; i++) step(intent());
  for (let i = 0; i < 80; i++) {
    step(intent(i < 42 ? 0.55 : 0, 0, { jump: i === 0, jumpHeld: i < 12 }));
  }
  for (let i = 0; i < 60; i++) step(intent());

  const result = {
    worstRootDelta,
    maxRequestedExtension,
    clipFrames,
    finalPosition: [...e16.position],
  };
  b3.b3DestroyWorld(donorWorld);
  b3.b3DestroyWorld(e16World);
  return result;
}

function runRoofPath({ escape = false } = {}) {
  const donorWorld = makeWorld({ roof: true });
  const e15World = makeWorld({ roof: true });
  const e16World = makeWorld({ roof: true });
  const common = { startPosition: [0, 0.9, 0], gravity: 20 };
  const donor = createCurrentDonorCharacter(b3, donorWorld, common);
  const e15 = createE15ContactSemanticCharacter(b3, e15World, { ...common, feedbackGain: 0 });
  const e16 = createE16BodyFeasibilityCharacter(b3, e16World, {
    ...common,
    feedbackGain: 0,
    attachmentRadius: 0.22,
  });

  const result = {
    bodyContactFramesE15: 0,
    bodyContactFramesE16: 0,
    feasibilityClipFrames: 0,
    maxRequestedExtension: 0,
    maxAppliedCorrection: 0,
    minMoveFraction: 1,
    firstBodyContact: null,
    firstFeasibilityClip: null,
    samples: [],
  };
  let frame = 0;

  function stepAll(control, phase, phaseFrame) {
    tick(donorWorld, donor, control);
    tick(e15World, e15, control);
    tick(e16World, e16, control);

    if (e15.lastBodyContacts > 0) result.bodyContactFramesE15 += 1;
    if (e16.lastBodyContacts > 0) result.bodyContactFramesE16 += 1;
    if (e16.lastFeasibilityClipped) result.feasibilityClipFrames += 1;
    result.maxRequestedExtension = Math.max(
      result.maxRequestedExtension,
      e16.lastFeasibilityRequestedExtension,
    );
    result.maxAppliedCorrection = Math.max(
      result.maxAppliedCorrection,
      e16.lastFeasibilityAppliedCorrection,
    );
    result.minMoveFraction = Math.min(result.minMoveFraction, e16.lastFeasibilityMoveFraction);

    if (e16.lastBodyContacts > 0 && !result.firstBodyContact) {
      result.firstBodyContact = {
        frame,
        phase,
        phaseFrame,
        root: [...e16.position],
        body: [...e16.bodyPosition],
        requestedExtension: e16.lastFeasibilityRequestedExtension,
      };
    }
    if (e16.lastFeasibilityClipped && !result.firstFeasibilityClip) {
      result.firstFeasibilityClip = {
        frame,
        phase,
        phaseFrame,
        root: [...e16.position],
        body: [...e16.bodyPosition],
        requestedExtension: e16.lastFeasibilityRequestedExtension,
        appliedCorrection: e16.lastFeasibilityAppliedCorrection,
        moveFraction: e16.lastFeasibilityMoveFraction,
      };
    }

    if (
      phaseFrame % 10 === 0 ||
      e16.lastBodyContacts > 0 ||
      e16.lastFeasibilityClipped
    ) {
      result.samples.push({
        frame,
        phase,
        phaseFrame,
        donor: [...donor.position],
        e15: [...e15.position],
        e16: [...e16.position],
        body: [...e16.bodyPosition],
        bodyContacts: e16.lastBodyContacts,
        feasibilityClipped: e16.lastFeasibilityClipped,
        requestedExtension: e16.lastFeasibilityRequestedExtension,
        correction: e16.lastFeasibilityAppliedCorrection,
        moveFraction: e16.lastFeasibilityMoveFraction,
        velocity: [...e16.velocity],
      });
    }

    finiteCharacter(e16, `E16 roof frame ${frame}`);
    frame += 1;
  }

  for (let i = 0; i < 45; i++) stepAll(intent(), 'settle', i);
  for (let i = 0; i < 100; i++) stepAll(intent(1, 0), 'direct-approach', i);

  result.afterDirect = {
    donor: [...donor.position],
    e15: [...e15.position],
    e16: [...e16.position],
    body: [...e16.bodyPosition],
    e16Velocity: [...e16.velocity],
  };

  if (escape) {
    for (let i = 0; i < 90; i++) stepAll(intent(0, 1), 'lateral-escape', i);
    for (let i = 0; i < 100; i++) stepAll(intent(1, 0), 'forward-after-escape', i);
  } else {
    for (let i = 0; i < 60; i++) stepAll(intent(), 'release', i);
  }

  result.final = {
    donor: [...donor.position],
    e15: [...e15.position],
    e16: [...e16.position],
    body: [...e16.bodyPosition],
    e16Velocity: [...e16.velocity],
  };

  b3.b3DestroyWorld(donorWorld);
  b3.b3DestroyWorld(e15World);
  b3.b3DestroyWorld(e16World);
  return result;
}

const report = {
  schema: 'e16-body-owned-feasibility-crucible-v0',
  hypothesis:
    'A solver-owned body can own a bounded feasibility workspace for an otherwise accepted Donor carrier, preserving neutral traversal while preventing body-only geometry from becoming merely secondary motion.',
  neutral: runNeutralEquivalence(),
  directRoof: runRoofPath({ escape: false }),
  escapeRoof: runRoofPath({ escape: true }),
  boundary:
    'Topology crucible only. It does not establish that body-owned veto is fun, desirable, anatomically correct, or superior to a body-led executor. It should be rejected if it only behaves like an annoying larger collider without creating route/posture strategy.',
};

if (report.neutral.worstRootDelta > 1e-9 || report.neutral.clipFrames !== 0) {
  throw new Error(
    `E16 changed neutral Donor traversal before body feasibility was exercised: ${JSON.stringify(report.neutral)}`,
  );
}
if (!(report.directRoof.bodyContactFramesE16 > 0 && report.directRoof.feasibilityClipFrames > 0)) {
  throw new Error(
    `E16 roof failed to exercise body-owned feasibility: contacts=${report.directRoof.bodyContactFramesE16} clips=${report.directRoof.feasibilityClipFrames}`,
  );
}
if (!(report.directRoof.afterDirect.e15[0] > report.directRoof.afterDirect.e16[0] + 0.5)) {
  throw new Error(
    `E16 body veto did not materially change a body-only blocked route: e15X=${report.directRoof.afterDirect.e15[0]} e16X=${report.directRoof.afterDirect.e16[0]}`,
  );
}

if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `E16 feasibility crucible PASS: neutral=${report.neutral.worstRootDelta.toExponential(2)} ` +
  `directX e15/e16=${report.directRoof.afterDirect.e15[0].toFixed(3)}/${report.directRoof.afterDirect.e16[0].toFixed(3)} ` +
  `clips=${report.directRoof.feasibilityClipFrames} ` +
  `escapeFinal=${report.escapeRoof.final.e16[0].toFixed(3)},${report.escapeRoof.final.e16[2].toFixed(3)}`,
);
