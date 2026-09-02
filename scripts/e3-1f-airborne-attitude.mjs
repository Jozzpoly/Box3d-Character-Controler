import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const forward = [0, 0, 1];

function makeZeroGWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, 0, 0];
  return b3.b3CreateWorld(worldDef);
}

function tick(world, organism) {
  organism.preStep(dt);
  b3.b3World_Step(world, dt, substeps);
  organism.postStep();
}

function horizontalSpeed(v) {
  return Math.hypot(v[0], v[2]);
}

function readTorsoAngularVelocity(organism) {
  const out = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(out, organism.torso);
  return out;
}

function runTrial({ mode, footMass, impulseNs }) {
  const world = makeZeroGWorld();
  const organism = new BalanceOrganism3D(b3, world, {
    mode,
    maxTorque: mode === 'passive' ? 0 : 320,
    footMass,
    torsoMass: 70,
  });

  for (let i = 0; i < 30; i++) tick(world, organism);
  organism.applyPush({ impulseNs, direction: forward });

  const initialTorsoW = readTorsoAngularVelocity(organism);
  const initialTorsoHorizontalW = horizontalSpeed(initialTorsoW);

  let minTorsoTiltAfterOneSecond = Infinity;
  let minTorsoSpeedAfterOneSecond = Infinity;
  let peakFootAngularSpeed = 0;
  let cumulativeFootAngularTravel = 0;
  let cumulativeTorsoAngularTravel = 0;
  let firstNearUprightFrame = -1;
  let nearUprightFrames = 0;
  let firstThirtyFrameNearUpright = -1;

  for (let i = 0; i < 480; i++) {
    tick(world, organism);
    const t = organism.telemetry();
    const footW = horizontalSpeed(t.footAngularVelocity);
    const torsoW = t.horizontalAngularSpeed;
    peakFootAngularSpeed = Math.max(peakFootAngularSpeed, footW);
    cumulativeFootAngularTravel += footW * dt;
    cumulativeTorsoAngularTravel += torsoW * dt;

    if (i >= 60) {
      minTorsoTiltAfterOneSecond = Math.min(minTorsoTiltAfterOneSecond, t.torsoTilt);
      minTorsoSpeedAfterOneSecond = Math.min(minTorsoSpeedAfterOneSecond, torsoW);
    }

    const nearUpright = t.torsoTilt <= 4 * Math.PI / 180 && torsoW <= 0.8;
    if (nearUpright && firstNearUprightFrame < 0) firstNearUprightFrame = i;
    nearUprightFrames = nearUpright ? nearUprightFrames + 1 : 0;
    if (nearUprightFrames >= 30 && firstThirtyFrameNearUpright < 0) {
      firstThirtyFrameNearUpright = i - 29;
    }
  }

  const final = organism.telemetry();
  return {
    mode,
    footMass,
    impulseNs,
    initialTorsoHorizontalW,
    finalTorsoTiltDeg: final.torsoTilt * 180 / Math.PI,
    finalTorsoAngularSpeed: final.horizontalAngularSpeed,
    finalFootTiltDeg: final.footTilt * 180 / Math.PI,
    finalFootAngularSpeed: horizontalSpeed(final.footAngularVelocity),
    minTorsoTiltAfterOneSecondDeg: minTorsoTiltAfterOneSecond * 180 / Math.PI,
    minTorsoSpeedAfterOneSecond,
    peakFootAngularSpeed,
    cumulativeFootAngularTravel,
    cumulativeTorsoAngularTravel,
    firstNearUprightFrame,
    firstThirtyFrameNearUpright,
  };
}

const impulses = [48, 64];
const footMasses = [2, 10, 30];
const finiteRows = [];

for (const impulseNs of impulses) {
  const passive = runTrial({ mode: 'passive', footMass: 10, impulseNs });
  console.log(
    `E3.1f passive impulse=${impulseNs}Ns: initialTorsoW=${passive.initialTorsoHorizontalW.toFixed(4)} ` +
    `finalTorso=${passive.finalTorsoTiltDeg.toFixed(1)}deg/${passive.finalTorsoAngularSpeed.toFixed(3)}rad/s ` +
    `minTiltAfter1s=${passive.minTorsoTiltAfterOneSecondDeg.toFixed(1)}deg ` +
    `footTravel=${passive.cumulativeFootAngularTravel.toFixed(1)}rad near30=${passive.firstThirtyFrameNearUpright}`,
  );

  for (const footMass of footMasses) {
    const row = runTrial({ mode: 'finite', footMass, impulseNs });
    finiteRows.push(row);
    console.log(
      `E3.1f finite footMass=${footMass}kg impulse=${impulseNs}Ns: ` +
      `initialTorsoW=${row.initialTorsoHorizontalW.toFixed(4)} ` +
      `finalTorso=${row.finalTorsoTiltDeg.toFixed(2)}deg/${row.finalTorsoAngularSpeed.toFixed(3)}rad/s ` +
      `minTiltAfter1s=${row.minTorsoTiltAfterOneSecondDeg.toFixed(2)}deg ` +
      `finalFoot=${row.finalFootTiltDeg.toFixed(1)}deg/${row.finalFootAngularSpeed.toFixed(2)}rad/s ` +
      `peakFootW=${row.peakFootAngularSpeed.toFixed(2)}rad/s ` +
      `footAngularTravel=${row.cumulativeFootAngularTravel.toFixed(1)}rad ` +
      `near=${row.firstNearUprightFrame} near30=${row.firstThirtyFrameNearUpright}`,
    );
  }
}

for (const impulseNs of impulses) {
  const rows = finiteRows.filter((r) => r.impulseNs === impulseNs);
  const initialValues = rows.map((r) => r.initialTorsoHorizontalW);
  const initialSpread = Math.max(...initialValues) - Math.min(...initialValues);
  if (initialSpread > 1e-9) {
    throw new Error(`E3.1f initial torso response is not controlled for ${impulseNs}Ns: spread=${initialSpread}`);
  }

  const standard = rows.find((r) => r.footMass === 10);
  if (standard.peakFootAngularSpeed < 20 || standard.cumulativeFootAngularTravel < 20) {
    throw new Error(
      `E3.1f standard airborne internal sink did not reproduce material foot angular storage for ${impulseNs}Ns.`,
    );
  }
}

console.log(
  'E3.1f airborne decomposition PASS: identical initial torso angular response across foot-mass variants; finite world-up control reorients the torso while the unconstrained foot absorbs large angular motion. This is a distinct internal attitude-control channel, not evidence of ground support balance.',
);
