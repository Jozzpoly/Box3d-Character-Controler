import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;
const forward = [0, 0, 1];
const identityQuat = [0, 0, 0, 1];
const loadEpsilon = 1e-5;

function makeWorld() {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(worldDef);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, -0.10, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.95;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, shapeDef, 6, 0.10, 6);
  return world;
}

function createSupportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let supportPoints = 0;
    let touchingPoints = 0;
    let loadedSupportPoints = 0;
    let minSeparation = Infinity;
    let maxSeparation = -Infinity;
    let maxNormalImpulse = 0;
    let maxTotalNormalImpulse = 0;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          supportPoints += 1;
          minSeparation = Math.min(minSeparation, point.separation);
          maxSeparation = Math.max(maxSeparation, point.separation);
          maxNormalImpulse = Math.max(maxNormalImpulse, point.normalImpulse);
          maxTotalNormalImpulse = Math.max(maxTotalNormalImpulse, point.totalNormalImpulse);
          if (point.separation <= 0) touchingPoints += 1;
          if (point.normalImpulse > loadEpsilon || point.totalNormalImpulse > loadEpsilon) {
            loadedSupportPoints += 1;
          }
        }
      }
    }

    return {
      supported: supportPoints > 0,
      supportPoints,
      touchingPoints,
      loadedSupportPoints,
      minSeparation: supportPoints > 0 ? minSeparation : null,
      maxSeparation: supportPoints > 0 ? maxSeparation : null,
      maxNormalImpulse,
      maxTotalNormalImpulse,
      speculativeOnly: supportPoints > 0 && touchingPoints === 0 && loadedSupportPoints === 0,
    };
  }

  return {
    read,
    destroy() { b3.destroyContactsBuffer(buffer); },
  };
}

function torqueMagnitude(t) {
  return Math.hypot(t.balanceTorque[0], t.balanceTorque[2]);
}

function createCachedManifoldStepper(world, organism) {
  const reader = createSupportReader(organism);
  let support = reader.read();
  let frame = 0;

  function step() {
    const supportBefore = support;
    organism.maxTorque = supportBefore.supported ? finiteTorque : 0;
    organism.preStep(dt);
    const appliedTorque = torqueMagnitude(organism.telemetry());
    b3.b3World_Step(world, dt, substeps);
    organism.postStep();
    const supportAfter = reader.read();
    support = supportAfter;
    return {
      frame: frame++,
      supportBefore,
      supportAfter,
      appliedTorque,
      appliedAngularImpulse: appliedTorque * dt,
      telemetry: organism.telemetry(),
    };
  }

  return {
    step,
    get support() { return support; },
    destroy() { reader.destroy(); },
  };
}

function settle(stepper, frames = 60) {
  for (let i = 0; i < frames; i++) stepper.step();
}

function setSharedVerticalVelocity(organism, vy) {
  const v = [0, vy, 0];
  b3.b3Body_SetLinearVelocity(organism.foot, v);
  b3.b3Body_SetLinearVelocity(organism.torso, v);
}

function footY(organism) {
  const p = [0, 0, 0];
  b3.b3Body_GetPosition(p, organism.foot);
  return p[1];
}

function translateOrganism(organism, dy) {
  b3.b3Body_SetTransform(
    organism.foot,
    [organism.startFootPosition[0], organism.startFootPosition[1] + dy, organism.startFootPosition[2]],
    identityQuat,
  );
  b3.b3Body_SetTransform(
    organism.torso,
    [organism.startTorsoPosition[0], organism.startTorsoPosition[1] + dy, organism.startTorsoPosition[2]],
    identityQuat,
  );
  b3.b3Body_SetLinearVelocity(organism.foot, [0, 0, 0]);
  b3.b3Body_SetLinearVelocity(organism.torso, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(organism.foot, [0, 0, 0]);
  b3.b3Body_SetAngularVelocity(organism.torso, [0, 0, 0]);
  organism.postStep();
}

function sepText(s) {
  return s === null ? 'none' : `${(s * 1000).toFixed(2)}mm`;
}

function runTakeoff({ impulseNs, launchSpeed }) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createCachedManifoldStepper(world, organism);
  settle(stepper, 60);
  if (!stepper.support.supported) throw new Error('E3.1j takeoff setup is not manifold-supported.');

  const startY = footY(organism);
  organism.applyPush({ impulseNs, direction: forward });
  setSharedVerticalVelocity(organism, launchSpeed);

  let firstSpeculativeFrame = -1;
  let firstManifoldLossFrame = -1;
  let firstPostLossTorque = null;
  let speculativeActuationFrames = 0;
  let speculativeAngularImpulse = 0;
  let maxFootRise = 0;
  let peakPositiveSeparation = 0;
  let peakLoad = 0;

  for (let i = 0; i < 60; i++) {
    const r = stepper.step();
    maxFootRise = Math.max(maxFootRise, footY(organism) - startY);
    if (r.supportAfter.maxSeparation !== null) {
      peakPositiveSeparation = Math.max(peakPositiveSeparation, r.supportAfter.maxSeparation);
    }
    peakLoad = Math.max(peakLoad, r.supportAfter.maxNormalImpulse, r.supportAfter.maxTotalNormalImpulse);

    if (r.supportBefore.speculativeOnly && r.appliedTorque > 1e-7) {
      speculativeActuationFrames += 1;
      speculativeAngularImpulse += r.appliedAngularImpulse;
      if (firstSpeculativeFrame < 0) firstSpeculativeFrame = r.frame;
    }

    if (firstManifoldLossFrame < 0 && r.supportBefore.supported && !r.supportAfter.supported) {
      firstManifoldLossFrame = r.frame;
      const next = stepper.step();
      firstPostLossTorque = next.appliedTorque;
      maxFootRise = Math.max(maxFootRise, footY(organism) - startY);
      if (next.appliedTorque > 1e-7) {
        throw new Error(`E3.1j manifold support survived into a full post-loss control tick at ${launchSpeed}m/s / ${impulseNs}Ns.`);
      }
      break;
    }
  }

  const out = {
    impulseNs,
    launchSpeed,
    firstSpeculativeFrame,
    firstManifoldLossFrame,
    firstPostLossTorque,
    speculativeActuationFrames,
    speculativeAngularImpulse,
    maxFootRise,
    peakPositiveSeparation,
    peakLoad,
    finalSupport: stepper.support,
  };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

function runLanding({ impulseNs, dropHeight, initialDownSpeed }) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  translateOrganism(organism, dropHeight);
  const stepper = createCachedManifoldStepper(world, organism);
  if (stepper.support.supported) throw new Error('E3.1j landing setup unexpectedly manifold-supported.');

  organism.applyPush({ impulseNs, direction: forward });
  setSharedVerticalVelocity(organism, -Math.abs(initialDownSpeed));

  let firstManifoldFrame = -1;
  let firstTouchingFrame = -1;
  let firstLoadedFrame = -1;
  let firstManifoldState = null;
  let firstTouchingState = null;
  let firstLoadedState = null;
  let torqueOnManifoldSolve = null;
  let torqueNextTick = null;

  for (let i = 0; i < 180; i++) {
    const r = stepper.step();
    if (firstManifoldFrame < 0 && r.supportAfter.supported) {
      firstManifoldFrame = r.frame;
      firstManifoldState = r.supportAfter;
      torqueOnManifoldSolve = r.appliedTorque;
    }
    if (firstTouchingFrame < 0 && r.supportAfter.touchingPoints > 0) {
      firstTouchingFrame = r.frame;
      firstTouchingState = r.supportAfter;
    }
    if (firstLoadedFrame < 0 && r.supportAfter.loadedSupportPoints > 0) {
      firstLoadedFrame = r.frame;
      firstLoadedState = r.supportAfter;
    }
    if (firstManifoldFrame >= 0) {
      const next = stepper.step();
      torqueNextTick = next.appliedTorque;
      if (!next.supportBefore.supported) {
        throw new Error('E3.1j manifold was not available on the tick immediately after first manifold appearance.');
      }
      break;
    }
  }

  if (firstManifoldFrame < 0) {
    throw new Error(`E3.1j no landing manifold observed from ${dropHeight}m / ${initialDownSpeed}m/s.`);
  }

  const out = {
    impulseNs,
    dropHeight,
    initialDownSpeed,
    firstManifoldFrame,
    firstTouchingFrame,
    firstLoadedFrame,
    firstManifoldState,
    firstTouchingState,
    firstLoadedState,
    torqueOnManifoldSolve,
    torqueNextTick,
  };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

console.log('E3.1j physics-driven takeoff / speculative-manifold timeline:');
let highLaunchLosses = 0;
let speculativeCases = 0;
for (const impulseNs of [24, 48, 64]) {
  for (const launchSpeed of [1.0, 3.0, 7.2]) {
    const r = runTakeoff({ impulseNs, launchSpeed });
    if (r.firstSpeculativeFrame >= 0) speculativeCases += 1;
    if (launchSpeed === 7.2 && r.firstManifoldLossFrame >= 0) highLaunchLosses += 1;
    console.log(
      `  ${impulseNs}Ns launch=${launchSpeed.toFixed(1)}m/s rise=${r.maxFootRise.toFixed(3)}m ` +
      `specF=${r.firstSpeculativeFrame} specAct=${r.speculativeActuationFrames}f/${r.speculativeAngularImpulse.toFixed(3)}Nms ` +
      `manifoldLossF=${r.firstManifoldLossFrame} postLossTorque=${r.firstPostLossTorque === null ? 'n/a' : r.firstPostLossTorque.toFixed(1)}Nm ` +
      `maxSep=${sepText(r.peakPositiveSeparation)} peakLoad=${r.peakLoad.toFixed(4)}`,
    );
  }
}
if (highLaunchLosses !== 3) {
  throw new Error(`E3.1j high-launch control did not clear the support manifold in all cases (${highLaunchLosses}/3).`);
}

console.log('E3.1j physics-driven landing manifold/touch/load timeline:');
let landingCases = 0;
for (const test of [
  { impulseNs: 24, dropHeight: 0.25, initialDownSpeed: 0.0 },
  { impulseNs: 48, dropHeight: 0.25, initialDownSpeed: 0.0 },
  { impulseNs: 48, dropHeight: 0.50, initialDownSpeed: 0.0 },
  { impulseNs: 48, dropHeight: 0.25, initialDownSpeed: 2.0 },
  { impulseNs: 64, dropHeight: 0.50, initialDownSpeed: 0.0 },
]) {
  const r = runLanding(test);
  landingCases += 1;
  console.log(
    `  ${r.impulseNs}Ns drop=${r.dropHeight.toFixed(2)}m v0=${r.initialDownSpeed.toFixed(1)}m/s ` +
    `manifoldF=${r.firstManifoldFrame} touchF=${r.firstTouchingFrame} loadF=${r.firstLoadedFrame} ` +
    `firstSep=${sepText(r.firstManifoldState?.minSeparation ?? null)} ` +
    `manifoldSolveTorque=${r.torqueOnManifoldSolve.toFixed(1)}Nm nextTorque=${r.torqueNextTick.toFixed(1)}Nm`,
  );
}
if (landingCases !== 5) throw new Error('E3.1j landing matrix did not complete.');

console.log(
  `E3.1j PASS: physics-driven transition timelines captured; speculative-only manifold actuation appeared in ${speculativeCases}/9 takeoff cases. ` +
  'Manifold presence, geometric touching/separation, and transient load are retained as distinct evidence signals; no new support policy is selected here.',
);
