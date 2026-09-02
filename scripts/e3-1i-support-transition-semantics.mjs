import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;
const forward = [0, 0, 1];
const identityQuat = [0, 0, 0, 1];
const groundPresentY = -0.10;
const groundAbsentY = -4.0;

function makeWorld({ gravity = -20, groundPresent = true } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, gravity, 0];
  const world = b3.b3CreateWorld(worldDef);

  const groundDef = b3.b3DefaultBodyDef();
  groundDef.position = [0, groundPresent ? groundPresentY : groundAbsentY, 0];
  const ground = b3.b3CreateBody(world, groundDef);
  const shapeDef = b3.b3DefaultShapeDef();
  shapeDef.baseMaterial.friction = 0.95;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, shapeDef, 6, 0.10, 6);

  return { world, ground };
}

function setGroundPresent(ground, present) {
  b3.b3Body_SetTransform(
    ground,
    [0, present ? groundPresentY : groundAbsentY, 0],
    identityQuat,
  );
}

function createSupportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let supportPoints = 0;
    let contactCount = b3.getNumContacts(buffer);
    let peakAbsNormalY = 0;

    for (let i = 0; i < contactCount; i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        const absNormalY = Math.abs(manifold.normal[1]);
        peakAbsNormalY = Math.max(peakAbsNormalY, absNormalY);
        if (absNormalY < 0.5) continue;
        supportPoints += manifold.pointCount;
      }
    }

    return {
      supported: supportPoints > 0,
      supportPoints,
      contactCount,
      peakAbsNormalY,
    };
  }

  return {
    read,
    destroy() {
      b3.destroyContactsBuffer(buffer);
    },
  };
}

function torqueMagnitude(t) {
  return Math.hypot(t.balanceTorque[0], t.balanceTorque[2]);
}

function createTransitionStepper(world, organism, policy) {
  const supportReader = createSupportReader(organism);
  let cachedSupport = supportReader.read();
  let frame = 0;

  function step({ eventSupportHint = null } = {}) {
    let supportUsedForControl = false;
    if (policy === 'lagged-contact') supportUsedForControl = cachedSupport.supported;
    else if (policy === 'event-oracle') {
      supportUsedForControl = eventSupportHint === null
        ? cachedSupport.supported
        : eventSupportHint;
    }

    organism.maxTorque = supportUsedForControl ? finiteTorque : 0;
    organism.preStep(dt);
    const requested = organism.telemetry();
    const appliedTorque = torqueMagnitude(requested);
    const appliedAngularImpulse = appliedTorque * dt;

    b3.b3World_Step(world, dt, substeps);
    organism.postStep();
    const supportAfterStep = supportReader.read();
    cachedSupport = supportAfterStep;
    frame += 1;

    return {
      frame: frame - 1,
      supportUsedForControl,
      supportAfterStep,
      appliedTorque,
      appliedAngularImpulse,
      telemetry: organism.telemetry(),
    };
  }

  return {
    step,
    get support() { return cachedSupport; },
    destroy() { supportReader.destroy(); },
  };
}

function settle(stepper, frames) {
  for (let i = 0; i < frames; i++) stepper.step();
}

function readHorizontalOmega(organism) {
  const omega = [0, 0, 0];
  b3.b3Body_GetAngularVelocity(omega, organism.torso);
  return omega;
}

function setVerticalVelocity(organism, speedDown) {
  const v = [0, -Math.abs(speedDown), 0];
  b3.b3Body_SetLinearVelocity(organism.foot, v);
  b3.b3Body_SetLinearVelocity(organism.torso, v);
}

function followFor(stepper, organism, frames) {
  let peakTilt = organism.telemetry().torsoTilt;
  let peakAngularSpeed = organism.telemetry().horizontalAngularSpeed;
  let supportFrames = 0;
  let footAngularTravel = 0;

  for (let i = 0; i < frames; i++) {
    const result = stepper.step();
    const t = result.telemetry;
    peakTilt = Math.max(peakTilt, t.torsoTilt);
    peakAngularSpeed = Math.max(peakAngularSpeed, t.horizontalAngularSpeed);
    if (result.supportAfterStep.supported) supportFrames += 1;
    footAngularTravel += Math.hypot(t.footAngularVelocity[0], t.footAngularVelocity[2]) * dt;
  }

  const final = organism.telemetry();
  return {
    finalTiltDeg: final.torsoTilt * 180 / Math.PI,
    finalAngularSpeed: final.horizontalAngularSpeed,
    peakTiltDeg: peakTilt * 180 / Math.PI,
    peakAngularSpeed,
    supportFrames,
    footAngularTravel,
  };
}

function runSupportLoss(policy, impulseNs) {
  const { world, ground } = makeWorld({ gravity: -20, groundPresent: true });
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createTransitionStepper(world, organism, policy);
  settle(stepper, 60);

  if (!stepper.support.supported) {
    throw new Error(`E3.1i ${policy} loss setup did not settle on support.`);
  }

  organism.applyPush({ impulseNs, direction: forward });
  const preOmega = readHorizontalOmega(organism);

  // Deliberately change physical support between observation and the next solve.
  // lagged-contact still sees the previous manifold; event-oracle knows only this event.
  setGroundPresent(ground, false);
  const transition = stepper.step({ eventSupportHint: false });
  const follow = followFor(stepper, organism, 29);

  const result = {
    policy,
    impulseNs,
    preOmegaX: preOmega[0],
    transitionSupportUsed: transition.supportUsedForControl,
    supportAfterTransition: transition.supportAfterStep.supported,
    transitionTorque: transition.appliedTorque,
    transitionAngularImpulse: transition.appliedAngularImpulse,
    transitionOmegaX: transition.telemetry.torsoAngularVelocity[0],
    transitionTiltDeg: transition.telemetry.torsoTilt * 180 / Math.PI,
    ...follow,
  };

  stepper.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

function runSupportReacquisition(policy, { impulseNs, landingSpeed }) {
  const { world, ground } = makeWorld({ gravity: 0, groundPresent: false });
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createTransitionStepper(world, organism, policy);
  settle(stepper, 10);

  if (stepper.support.supported) {
    throw new Error(`E3.1i ${policy} reacquisition setup unexpectedly has support.`);
  }

  setVerticalVelocity(organism, landingSpeed);
  organism.applyPush({ impulseNs, direction: forward });
  const preOmega = readHorizontalOmega(organism);

  // Put the floor back directly below a descending foot. Contact is created by
  // the upcoming Box3D solve. lagged-contact cannot see it yet; event-oracle
  // represents the zero-observation-latency upper bound, not a proposed policy.
  setGroundPresent(ground, true);
  const transition = stepper.step({ eventSupportHint: true });
  const follow = followFor(stepper, organism, 29);

  const result = {
    policy,
    impulseNs,
    landingSpeed,
    preOmegaX: preOmega[0],
    transitionSupportUsed: transition.supportUsedForControl,
    supportAfterTransition: transition.supportAfterStep.supported,
    transitionSupportPoints: transition.supportAfterStep.supportPoints,
    transitionTorque: transition.appliedTorque,
    transitionAngularImpulse: transition.appliedAngularImpulse,
    transitionOmegaX: transition.telemetry.torsoAngularVelocity[0],
    transitionTiltDeg: transition.telemetry.torsoTilt * 180 / Math.PI,
    ...follow,
  };

  stepper.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

function close(a, b, tolerance = 1e-7) {
  return Math.abs(a - b) <= tolerance;
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

console.log('E3.1i support-loss observation-latency crucible:');
let maxLossRelativeOmegaDelta = 0;
let maxLossAngularImpulse = 0;
for (const impulseNs of [24, 48, 64]) {
  const lagged = runSupportLoss('lagged-contact', impulseNs);
  const oracle = runSupportLoss('event-oracle', impulseNs);
  const passive = runSupportLoss('passive', impulseNs);

  if (!lagged.transitionSupportUsed || lagged.supportAfterTransition) {
    throw new Error(`E3.1i loss did not exercise stale supported observation at ${impulseNs}Ns.`);
  }
  if (oracle.transitionSupportUsed || passive.transitionSupportUsed) {
    throw new Error(`E3.1i loss oracle/passive used authority after physical support removal at ${impulseNs}Ns.`);
  }
  if (lagged.transitionTorque <= 1e-6) {
    throw new Error(`E3.1i loss stale frame carried no measurable torque at ${impulseNs}Ns.`);
  }
  if (!close(oracle.transitionOmegaX, passive.transitionOmegaX) ||
      !close(oracle.transitionTiltDeg, passive.transitionTiltDeg)) {
    throw new Error(`E3.1i loss event-oracle diverged from passive transition control at ${impulseNs}Ns.`);
  }

  const omegaDelta = Math.abs(lagged.transitionOmegaX - oracle.transitionOmegaX);
  const relativeOmegaDelta = omegaDelta / Math.max(1e-9, Math.abs(oracle.preOmegaX));
  maxLossRelativeOmegaDelta = Math.max(maxLossRelativeOmegaDelta, relativeOmegaDelta);
  maxLossAngularImpulse = Math.max(maxLossAngularImpulse, lagged.transitionAngularImpulse);

  console.log(
    `  ${impulseNs}Ns staleTorque=${lagged.transitionTorque.toFixed(1)}Nm ` +
    `J=${lagged.transitionAngularImpulse.toFixed(3)}Nms ` +
    `dOmega=${omegaDelta.toFixed(4)}rad/s (${pct(relativeOmegaDelta)} of pre-step |omega|) ` +
    `tilt30 lag/oracle=${lagged.finalTiltDeg.toFixed(2)}/${oracle.finalTiltDeg.toFixed(2)}deg`,
  );
}

console.log('E3.1i support-reacquisition observation-latency crucible:');
const landingCases = [
  { impulseNs: 48, landingSpeed: 0.5 },
  { impulseNs: 48, landingSpeed: 1.0 },
  { impulseNs: 48, landingSpeed: 2.0 },
  { impulseNs: 24, landingSpeed: 1.0 },
  { impulseNs: 64, landingSpeed: 1.0 },
];
let maxLandingRelativeOmegaDelta = 0;
let maxLandingMissedAngularImpulse = 0;

for (const test of landingCases) {
  const lagged = runSupportReacquisition('lagged-contact', test);
  const oracle = runSupportReacquisition('event-oracle', test);
  const passive = runSupportReacquisition('passive', test);

  if (lagged.transitionSupportUsed || !lagged.supportAfterTransition) {
    throw new Error(`E3.1i landing did not exercise stale unsupported observation at ${test.impulseNs}Ns/${test.landingSpeed}m/s.`);
  }
  if (!oracle.transitionSupportUsed || !oracle.supportAfterTransition) {
    throw new Error(`E3.1i landing oracle did not exercise first-solve support authority at ${test.impulseNs}Ns/${test.landingSpeed}m/s.`);
  }
  if (oracle.transitionTorque <= 1e-6) {
    throw new Error(`E3.1i landing oracle carried no measurable first-contact torque at ${test.impulseNs}Ns/${test.landingSpeed}m/s.`);
  }
  if (!close(lagged.transitionOmegaX, passive.transitionOmegaX) ||
      !close(lagged.transitionTiltDeg, passive.transitionTiltDeg)) {
    throw new Error(`E3.1i landing lagged path did not match passive on the missed-authority frame at ${test.impulseNs}Ns/${test.landingSpeed}m/s.`);
  }

  const omegaDelta = Math.abs(lagged.transitionOmegaX - oracle.transitionOmegaX);
  const relativeOmegaDelta = omegaDelta / Math.max(1e-9, Math.abs(lagged.preOmegaX));
  maxLandingRelativeOmegaDelta = Math.max(maxLandingRelativeOmegaDelta, relativeOmegaDelta);
  maxLandingMissedAngularImpulse = Math.max(maxLandingMissedAngularImpulse, oracle.transitionAngularImpulse);

  console.log(
    `  ${test.impulseNs}Ns @ ${test.landingSpeed.toFixed(1)}m/s ` +
    `firstContactPts=${lagged.transitionSupportPoints} ` +
    `missedTorque=${oracle.transitionTorque.toFixed(1)}Nm ` +
    `J=${oracle.transitionAngularImpulse.toFixed(3)}Nms ` +
    `dOmega=${omegaDelta.toFixed(4)}rad/s (${pct(relativeOmegaDelta)} of pre-step |omega|) ` +
    `peak30 lag/oracle=${lagged.peakTiltDeg.toFixed(2)}/${oracle.peakTiltDeg.toFixed(2)}deg`,
  );
}

console.log(
  `E3.1i observation: max stale-loss J=${maxLossAngularImpulse.toFixed(3)}Nms, ` +
  `max loss dOmega/pre=${pct(maxLossRelativeOmegaDelta)}; ` +
  `max missed-landing J=${maxLandingMissedAngularImpulse.toFixed(3)}Nms, ` +
  `max landing dOmega/pre=${pct(maxLandingRelativeOmegaDelta)}.`,
);
console.log('E3.1i PASS: transition latency is causally isolated; magnitude remains an observation, not a tuned pass threshold.');
