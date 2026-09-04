import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { createE15ContactSemanticCharacter } from '../src/e15-contact-semantic-character.js';

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
    const roofDef = b3.b3DefaultBodyDef();
    roofDef.position = [2.0, 1.99, 0];
    const body = b3.b3CreateBody(world, roofDef);
    const shape = b3.b3DefaultShapeDef();
    shape.baseMaterial.friction = 0.45;
    b3.b3CreateBoxShape(body, shape, 0.70, 0.06, 0.80);
  }
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

function run({ roof }) {
  const world = makeWorld({ roof });
  const character = createE15ContactSemanticCharacter(b3, world, {
    startPosition: [0, 0.9, 0],
    gravity: 20,
    feedbackGain: 0,
  });
  const postWorldVelocity = [0, 0, 0];
  const postWorldPosition = [0, 0, 0];
  const contacts = b3.createContactsBuffer();
  const samples = [];
  let maxHorizontalPositionLag = 0;
  let maxHorizontalSolverDeltaV = 0;
  let maxHorizontalSolverDeltaVWithoutContact = 0;
  let maxHorizontalSolverDeltaVWithContact = 0;
  let contactFrames = 0;
  let firstContact = null;
  let frame = 0;

  function step(control, phase, phaseFrame) {
    character.preStep(DT, control);

    const rootBeforeWorld = [...character.position];
    const bodyBeforeWorld = [...character.bodyPosition];
    const preSolveVelocity = [...character._bodyPreSolveVelocity];
    const horizontalLagBefore = Math.hypot(
      rootBeforeWorld[0] - bodyBeforeWorld[0],
      rootBeforeWorld[2] - bodyBeforeWorld[2],
    );

    b3.b3World_Step(world, DT, SUBSTEPS);
    b3.b3Body_GetLinearVelocity(postWorldVelocity, character.embodimentBody);
    b3.b3Body_GetPosition(postWorldPosition, character.embodimentBody);
    b3.getBodyContactData(contacts, character.embodimentBody);
    const contactCount = b3.getNumContacts(contacts);

    const solverDeltaV = [
      postWorldVelocity[0] - preSolveVelocity[0],
      postWorldVelocity[1] - preSolveVelocity[1],
      postWorldVelocity[2] - preSolveVelocity[2],
    ];
    const horizontalSolverDeltaV = Math.hypot(solverDeltaV[0], solverDeltaV[2]);
    maxHorizontalPositionLag = Math.max(maxHorizontalPositionLag, horizontalLagBefore);
    maxHorizontalSolverDeltaV = Math.max(maxHorizontalSolverDeltaV, horizontalSolverDeltaV);
    if (contactCount > 0) {
      contactFrames += 1;
      maxHorizontalSolverDeltaVWithContact = Math.max(
        maxHorizontalSolverDeltaVWithContact,
        horizontalSolverDeltaV,
      );
      firstContact ??= {
        frame,
        phase,
        phaseFrame,
        rootBeforeWorld,
        bodyBeforeWorld,
        bodyAfterWorld: [...postWorldPosition],
        preSolveVelocity,
        postWorldVelocity: [...postWorldVelocity],
        solverDeltaV,
        horizontalSolverDeltaV,
        horizontalLagBefore,
      };
    } else {
      maxHorizontalSolverDeltaVWithoutContact = Math.max(
        maxHorizontalSolverDeltaVWithoutContact,
        horizontalSolverDeltaV,
      );
    }

    character.postStep(DT);

    if (
      phaseFrame % 10 === 0 ||
      contactCount > 0 ||
      horizontalSolverDeltaV > 1e-5
    ) {
      samples.push({
        frame,
        phase,
        phaseFrame,
        rootAfterPost: [...character.position],
        bodyAfterWorld: [...postWorldPosition],
        horizontalLagBefore,
        contactCount,
        preSolveVelocity,
        postWorldVelocity: [...postWorldVelocity],
        solverDeltaV,
        horizontalSolverDeltaV,
      });
    }
    frame += 1;
  }

  for (let i = 0; i < 45; i++) step(intent(0), 'settle', i);
  for (let i = 0; i < 120; i++) step(intent(1), 'forward', i);
  for (let i = 0; i < 60; i++) step(intent(0), 'release', i);

  const result = {
    roof,
    maxHorizontalPositionLag,
    maxHorizontalSolverDeltaV,
    maxHorizontalSolverDeltaVWithoutContact,
    maxHorizontalSolverDeltaVWithContact,
    contactFrames,
    firstContact,
    finalRoot: [...character.position],
    finalBody: [...character.bodyPosition],
    samples,
  };
  b3.b3DestroyWorld(world);
  return result;
}

const report = {
  schema: 'e16-solver-residual-diagnostic-v0',
  open: run({ roof: false }),
  roof: run({ roof: true }),
  interpretationBoundary:
    'Diagnostic only. A useful obstruction signal requires small open-floor horizontal post-solver residual despite ordinary positional follow lag, and a materially larger residual during body/world contact. This does not establish a VETO policy or gameplay value.',
};

// Save before any interpretation assertion so a failed hypothesis still retains evidence.
if (outPath) fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `E16 residual diagnostic: open lag=${report.open.maxHorizontalPositionLag.toFixed(4)}m ` +
  `open residual=${report.open.maxHorizontalSolverDeltaV.toExponential(3)}m/s ` +
  `roof contacts=${report.roof.contactFrames} ` +
  `roof residual=${report.roof.maxHorizontalSolverDeltaVWithContact.toFixed(4)}m/s`,
);

if (report.open.maxHorizontalPositionLag < 0.05) {
  throw new Error(`Open-floor finite follow did not exercise meaningful positional lag: ${report.open.maxHorizontalPositionLag}`);
}
if (report.open.maxHorizontalSolverDeltaV > 1e-4) {
  throw new Error(`Open-floor solver residual is not clean enough to isolate obstruction: ${report.open.maxHorizontalSolverDeltaV}`);
}
if (!(report.roof.contactFrames > 0 && report.roof.maxHorizontalSolverDeltaVWithContact > 0.05)) {
  throw new Error(
    `Roof did not create a distinct solver-caused horizontal residual: contacts=${report.roof.contactFrames} residual=${report.roof.maxHorizontalSolverDeltaVWithContact}`,
  );
}
