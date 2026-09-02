import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;
const forward = [0, 0, 1];
const identityQuat = [0, 0, 0, 1];

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
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        supportPoints += manifold.pointCount;
      }
    }
    return { supported: supportPoints > 0, supportPoints };
  }

  return {
    read,
    destroy() { b3.destroyContactsBuffer(buffer); },
  };
}

function torqueMagnitude(t) {
  return Math.hypot(t.balanceTorque[0], t.balanceTorque[2]);
}

function createCachedSupportStepper(world, organism) {
  const reader = createSupportReader(organism);
  let support = reader.read();
  let frame = 0;

  function step() {
    const supportBefore = support;
    organism.maxTorque = supportBefore.supported ? finiteTorque : 0;
    organism.preStep(dt);
    const pre = organism.telemetry();
    const appliedTorque = torqueMagnitude(pre);
    b3.b3World_Step(world, dt, substeps);
    organism.postStep();
    const supportAfter = reader.read();
    support = supportAfter;
    const result = {
      frame: frame++,
      supportBefore,
      supportAfter,
      appliedTorque,
      appliedAngularImpulse: appliedTorque * dt,
      telemetry: organism.telemetry(),
    };
    return result;
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

function runTakeoff({ impulseNs, launchSpeed }) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createCachedSupportStepper(world, organism);
  settle(stepper, 60);
  if (!stepper.support.supported) throw new Error('E3.1j takeoff setup is not supported.');

  organism.applyPush({ impulseNs, direction: forward });
  setSharedVerticalVelocity(organism, launchSpeed);

  let loss = null;
  let afterLoss = null;
  let supportedTransitionSteps = 0;
  for (let i = 0; i < 12; i++) {
    const r = stepper.step();
    if (r.supportBefore.supported && r.supportAfter.supported) supportedTransitionSteps += 1;
    if (!loss && r.supportBefore.supported && !r.supportAfter.supported) {
      loss = r;
      afterLoss = stepper.step();
      break;
    }
  }

  if (!loss) {
    throw new Error(`E3.1j no physical takeoff observed at ${launchSpeed}m/s / ${impulseNs}Ns.`);
  }
  if (afterLoss.supportBefore.supported || afterLoss.appliedTorque > 1e-7) {
    throw new Error(`E3.1j cached support survived into a full post-loss tick at ${launchSpeed}m/s / ${impulseNs}Ns.`);
  }

  const out = {
    impulseNs,
    launchSpeed,
    supportedTransitionSteps,
    lossFrame: loss.frame,
    lossTorque: loss.appliedTorque,
    lossAngularImpulse: loss.appliedAngularImpulse,
    lossTiltDeg: loss.telemetry.torsoTilt * 180 / Math.PI,
    lossOmega: loss.telemetry.horizontalAngularSpeed,
    nextTorque: afterLoss.appliedTorque,
    nextTiltDeg: afterLoss.telemetry.torsoTilt * 180 / Math.PI,
  };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

function runLanding({ impulseNs, dropHeight, initialDownSpeed }) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  translateOrganism(organism, dropHeight);
  const stepper = createCachedSupportStepper(world, organism);
  if (stepper.support.supported) throw new Error('E3.1j landing setup unexpectedly supported.');

  organism.applyPush({ impulseNs, direction: forward });
  setSharedVerticalVelocity(organism, -Math.abs(initialDownSpeed));

  let landing = null;
  let firstSupportedControl = null;
  let airActuationFrames = 0;
  for (let i = 0; i < 180; i++) {
    const r = stepper.step();
    if (!r.supportBefore.supported && r.appliedTorque > 1e-7) airActuationFrames += 1;
    if (!landing && !r.supportBefore.supported && r.supportAfter.supported) {
      landing = r;
      firstSupportedControl = stepper.step();
      break;
    }
  }

  if (!landing) {
    throw new Error(`E3.1j no physical landing observed from ${dropHeight}m / ${initialDownSpeed}m/s.`);
  }
  if (landing.appliedTorque > 1e-7) {
    throw new Error('E3.1j support-gated controller actuated on the first-contact solve despite cached unsupported state.');
  }
  if (!firstSupportedControl.supportBefore.supported) {
    throw new Error('E3.1j support was not available on the tick immediately after first contact.');
  }
  if (firstSupportedControl.appliedTorque <= 1e-6) {
    throw new Error('E3.1j first post-landing supported tick carried no measurable balance torque.');
  }
  if (airActuationFrames !== 0) {
    throw new Error(`E3.1j observed ${airActuationFrames} unsupported actuation frames before landing.`);
  }

  const out = {
    impulseNs,
    dropHeight,
    initialDownSpeed,
    landingFrame: landing.frame,
    firstContactPoints: landing.supportAfter.supportPoints,
    landingTorque: landing.appliedTorque,
    landingTiltDeg: landing.telemetry.torsoTilt * 180 / Math.PI,
    landingOmega: landing.telemetry.horizontalAngularSpeed,
    nextTorque: firstSupportedControl.appliedTorque,
    nextAngularImpulse: firstSupportedControl.appliedAngularImpulse,
    nextTiltDeg: firstSupportedControl.telemetry.torsoTilt * 180 / Math.PI,
  };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

console.log('E3.1j physics-driven takeoff lifecycle:');
for (const impulseNs of [24, 48, 64]) {
  for (const launchSpeed of [1.0, 3.0, 7.2]) {
    const r = runTakeoff({ impulseNs, launchSpeed });
    console.log(
      `  ${impulseNs}Ns launch=${launchSpeed.toFixed(1)}m/s ` +
      `lossF=${r.lossFrame} preSupportedSteps=${r.supportedTransitionSteps} ` +
      `lossStepTorque=${r.lossTorque.toFixed(1)}Nm J=${r.lossAngularImpulse.toFixed(3)}Nms ` +
      `nextTorque=${r.nextTorque.toFixed(1)}Nm ` +
      `tilt loss/next=${r.lossTiltDeg.toFixed(2)}/${r.nextTiltDeg.toFixed(2)}deg`,
    );
  }
}

console.log('E3.1j physics-driven landing lifecycle:');
for (const test of [
  { impulseNs: 24, dropHeight: 0.25, initialDownSpeed: 0.0 },
  { impulseNs: 48, dropHeight: 0.25, initialDownSpeed: 0.0 },
  { impulseNs: 48, dropHeight: 0.50, initialDownSpeed: 0.0 },
  { impulseNs: 48, dropHeight: 0.25, initialDownSpeed: 2.0 },
  { impulseNs: 64, dropHeight: 0.50, initialDownSpeed: 0.0 },
]) {
  const r = runLanding(test);
  console.log(
    `  ${r.impulseNs}Ns drop=${r.dropHeight.toFixed(2)}m v0=${r.initialDownSpeed.toFixed(1)}m/s ` +
    `contactF=${r.landingFrame} pts=${r.firstContactPoints} ` +
    `landingTorque=${r.landingTorque.toFixed(1)}Nm nextTorque=${r.nextTorque.toFixed(1)}Nm ` +
    `nextJ=${r.nextAngularImpulse.toFixed(3)}Nms ` +
    `tilt land/next=${r.landingTiltDeg.toFixed(2)}/${r.nextTiltDeg.toFixed(2)}deg`,
  );
}

console.log(
  'E3.1j PASS: normal physics-driven transitions use start-of-step support on the takeoff solve, ' +
  'drop authority on the immediately following tick, and acquire support only after the landing solve; ' +
  'there is no extra whole post-loss tick, while landing has one preStep of unavoidable contact-observation latency in this lifecycle.',
);
