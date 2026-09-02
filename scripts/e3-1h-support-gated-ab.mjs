import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;
const forward = [0, 0, 1];

function makeWorld({ ground = true, gravity = -20 } = {}) {
  const worldDef = b3.b3DefaultWorldDef();
  worldDef.gravity = [0, gravity, 0];
  const world = b3.b3CreateWorld(worldDef);

  if (ground) {
    const groundDef = b3.b3DefaultBodyDef();
    groundDef.position = [0, -0.10, 0];
    const groundBody = b3.b3CreateBody(world, groundDef);
    const shapeDef = b3.b3DefaultShapeDef();
    shapeDef.baseMaterial.friction = 0.95;
    shapeDef.baseMaterial.restitution = 0;
    b3.b3CreateBoxShape(groundBody, shapeDef, 6, 0.10, 6);
  }
  return world;
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

function policyTorque(policy, supported) {
  if (policy === 'always') return finiteTorque;
  if (policy === 'gated') return supported ? finiteTorque : 0;
  return 0;
}

function createPolicyStepper(world, organism, policy) {
  const supportReader = createSupportReader(organism);
  let support = supportReader.read();
  let unsupportedActuationFrames = 0;
  let supportedActuationFrames = 0;
  let supportFrames = 0;
  let unsupportedFrames = 0;
  let firstSupportLossFrame = -1;
  let frame = 0;

  function step() {
    const supportUsedForControl = support.supported;
    organism.maxTorque = policyTorque(policy, supportUsedForControl);
    organism.preStep(dt);
    const requestedTelemetry = organism.telemetry();
    const appliedTorque = torqueMagnitude(requestedTelemetry);

    if (supportUsedForControl) supportFrames += 1;
    else unsupportedFrames += 1;
    if (appliedTorque > 1e-7) {
      if (supportUsedForControl) supportedActuationFrames += 1;
      else unsupportedActuationFrames += 1;
    }

    b3.b3World_Step(world, dt, substeps);
    organism.postStep();
    const nextSupport = supportReader.read();
    if (support.supported && !nextSupport.supported && firstSupportLossFrame < 0) {
      firstSupportLossFrame = frame;
    }
    support = nextSupport;
    frame += 1;

    return {
      telemetry: organism.telemetry(),
      supportUsedForControl,
      supportAfterStep: support,
      appliedTorque,
    };
  }

  return {
    step,
    get support() { return support; },
    stats() {
      return {
        unsupportedActuationFrames,
        supportedActuationFrames,
        supportFrames,
        unsupportedFrames,
        firstSupportLossFrame,
      };
    },
    destroy() {
      supportReader.destroy();
    },
  };
}

function settle(stepper, frames = 60) {
  for (let i = 0; i < frames; i++) stepper.step();
}

function runAirborne(policy, impulseNs) {
  const world = makeWorld({ ground: false, gravity: 0 });
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createPolicyStepper(world, organism, policy);
  settle(stepper, 30);

  organism.applyPush({ impulseNs, direction: forward });
  let cumulativeFootAngularTravel = 0;
  let peakFootAngularSpeed = 0;

  for (let i = 0; i < 480; i++) {
    const { telemetry: t } = stepper.step();
    const footW = Math.hypot(t.footAngularVelocity[0], t.footAngularVelocity[2]);
    cumulativeFootAngularTravel += footW * dt;
    peakFootAngularSpeed = Math.max(peakFootAngularSpeed, footW);
  }

  const final = organism.telemetry();
  const stats = stepper.stats();
  stepper.destroy();
  b3.b3DestroyWorld(world);

  return {
    policy,
    impulseNs,
    finalTorsoTiltDeg: final.torsoTilt * 180 / Math.PI,
    finalTorsoAngularSpeed: final.horizontalAngularSpeed,
    finalFootTiltDeg: final.footTilt * 180 / Math.PI,
    finalFootAngularSpeed: Math.hypot(final.footAngularVelocity[0], final.footAngularVelocity[2]),
    cumulativeFootAngularTravel,
    peakFootAngularSpeed,
    ...stats,
  };
}

function runDirect(policy, impulseNs) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createPolicyStepper(world, organism, policy);
  settle(stepper, 60);

  const quiet = organism.telemetry();
  if (quiet.torsoTilt > 0.02 || quiet.footTilt > 0.02 || !stepper.support.supported) {
    throw new Error(
      `E3.1h ${policy} quiet direct control invalid before ${impulseNs}Ns: torso=${quiet.torsoTilt} foot=${quiet.footTilt} support=${stepper.support.supported}`,
    );
  }

  const startFoot = [...quiet.footCom];
  organism.applyPush({ impulseNs, direction: forward });

  let stableFrames = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let peakTorqueUtilization = 0;
  let peakFootAngularSpeed = 0;

  for (let i = 0; i < 480; i++) {
    const { telemetry: t } = stepper.step();
    maxFootTravel = Math.max(
      maxFootTravel,
      Math.hypot(t.footCom[0] - startFoot[0], t.footCom[2] - startFoot[2]),
    );
    peakTorqueUtilization = Math.max(peakTorqueUtilization, t.torqueUtilization);
    peakFootAngularSpeed = Math.max(
      peakFootAngularSpeed,
      Math.hypot(t.footAngularVelocity[0], t.footAngularVelocity[2]),
    );
    stableFrames = t.recovered ? stableFrames + 1 : 0;
    if (stableFrames >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }

  const final = organism.telemetry();
  const stats = stepper.stats();
  const outcome = final.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  stepper.destroy();
  b3.b3DestroyWorld(world);

  return {
    policy,
    impulseNs,
    outcome,
    peakTiltDeg: final.peakTilt * 180 / Math.PI,
    finalTiltDeg: final.torsoTilt * 180 / Math.PI,
    maxFootTravel,
    peakTorqueUtilization,
    peakFootAngularSpeed,
    recoveredFrame,
    ...stats,
  };
}

function createRam(world, organism, speed, mass = 35) {
  const half = [0.22, 0.22, 0.22];
  const bodyDef = b3.b3DefaultBodyDef();
  bodyDef.type = b3.b3BodyType.b3_dynamicBody;
  bodyDef.position = [
    organism.torsoCom[0],
    organism.torsoCom[1] + 0.25,
    organism.torsoCom[2] - 0.78,
  ];
  bodyDef.linearDamping = 0;
  bodyDef.angularDamping = 0.02;
  bodyDef.enableSleep = false;
  const body = b3.b3CreateBody(world, bodyDef);
  const shapeDef = b3.b3DefaultShapeDef();
  const volume = 8 * half[0] * half[1] * half[2];
  shapeDef.density = mass / volume;
  shapeDef.baseMaterial.friction = 0.45;
  shapeDef.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, shapeDef, half[0], half[1], half[2]);
  b3.b3Body_SetLinearVelocity(body, [0, 0, speed]);
  return { body, mass: b3.b3Body_GetMass(body) };
}

function runRam(policy, speed) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createPolicyStepper(world, organism, policy);
  settle(stepper, 60);

  const quiet = organism.telemetry();
  if (quiet.torsoTilt > 0.02 || quiet.footTilt > 0.02 || !stepper.support.supported) {
    throw new Error(`E3.1h ${policy} ram quiet control invalid before ${speed}m/s.`);
  }

  const ram = createRam(world, organism, speed);
  const ramVelocity = [0, 0, 0];
  const startFoot = [...quiet.footCom];
  let stableFrames = 0;
  let recoveredFrame = -1;
  let maxFootTravel = 0;
  let peakTorqueUtilization = 0;
  let maxRamVelocityChange = 0;
  let firstMaterialTiltFrame = -1;

  for (let i = 0; i < 480; i++) {
    const { telemetry: t } = stepper.step();
    b3.b3Body_GetLinearVelocity(ramVelocity, ram.body);
    maxRamVelocityChange = Math.max(maxRamVelocityChange, Math.abs(ramVelocity[2] - speed));
    maxFootTravel = Math.max(
      maxFootTravel,
      Math.hypot(t.footCom[0] - startFoot[0], t.footCom[2] - startFoot[2]),
    );
    peakTorqueUtilization = Math.max(peakTorqueUtilization, t.torqueUtilization);
    if (firstMaterialTiltFrame < 0 && t.torsoTilt > 0.015) firstMaterialTiltFrame = i;
    stableFrames = t.recovered ? stableFrames + 1 : 0;
    if (stableFrames >= 30 && recoveredFrame < 0) recoveredFrame = i - 28;
  }

  const final = organism.telemetry();
  const stats = stepper.stats();
  const outcome = final.fallObserved ? 'FALL' : recoveredFrame >= 0 ? 'RECOVER' : 'UNRESOLVED';
  stepper.destroy();
  b3.b3DestroyWorld(world);

  return {
    policy,
    speed,
    ramMass: ram.mass,
    outcome,
    peakTiltDeg: final.peakTilt * 180 / Math.PI,
    maxFootTravel,
    peakTorqueUtilization,
    maxRamVelocityChange,
    firstMaterialTiltFrame,
    recoveredFrame,
    ...stats,
  };
}

function close(a, b, tolerance = 1e-8) {
  return Math.abs(a - b) <= tolerance;
}

console.log('E3.1h airborne causal A/B:');
for (const impulseNs of [48, 64]) {
  const always = runAirborne('always', impulseNs);
  const gated = runAirborne('gated', impulseNs);
  const passive = runAirborne('passive', impulseNs);
  console.log(
    `  ${impulseNs}Ns always torso=${always.finalTorsoTiltDeg.toFixed(2)}deg/${always.finalTorsoAngularSpeed.toFixed(3)} footTravel=${always.cumulativeFootAngularTravel.toFixed(1)}rad unsupportedTorqueF=${always.unsupportedActuationFrames}`,
  );
  console.log(
    `  ${impulseNs}Ns gated  torso=${gated.finalTorsoTiltDeg.toFixed(2)}deg/${gated.finalTorsoAngularSpeed.toFixed(3)} footTravel=${gated.cumulativeFootAngularTravel.toFixed(1)}rad unsupportedTorqueF=${gated.unsupportedActuationFrames}`,
  );
  console.log(
    `  ${impulseNs}Ns passive torso=${passive.finalTorsoTiltDeg.toFixed(2)}deg/${passive.finalTorsoAngularSpeed.toFixed(3)} footTravel=${passive.cumulativeFootAngularTravel.toFixed(1)}rad unsupportedTorqueF=${passive.unsupportedActuationFrames}`,
  );

  if (always.unsupportedActuationFrames <= 0) {
    throw new Error(`E3.1h always-active control did not exercise unsupported actuation at ${impulseNs}Ns.`);
  }
  if (gated.unsupportedActuationFrames !== 0) {
    throw new Error(`E3.1h gated control actuated while unsupported at ${impulseNs}Ns.`);
  }
  if (
    !close(gated.finalTorsoTiltDeg, passive.finalTorsoTiltDeg, 1e-7) ||
    !close(gated.finalTorsoAngularSpeed, passive.finalTorsoAngularSpeed, 1e-7) ||
    !close(gated.cumulativeFootAngularTravel, passive.cumulativeFootAngularTravel, 1e-7)
  ) {
    throw new Error(`E3.1h unsupported gated path diverged from passive control at ${impulseNs}Ns.`);
  }
  if (always.cumulativeFootAngularTravel <= gated.cumulativeFootAngularTravel * 1.5) {
    throw new Error(`E3.1h always-active path did not materially recruit internal angular travel at ${impulseNs}Ns.`);
  }
}

console.log('E3.1h grounded direct A/B:');
const directResults = new Map();
for (const policy of ['always', 'gated']) {
  const rows = [48, 64, 80, 96].map((impulseNs) => runDirect(policy, impulseNs));
  directResults.set(policy, rows);
  console.log(
    `  ${policy}: ` + rows.map((r) => (
      `${r.impulseNs}:${r.outcome[0]}(${r.peakTiltDeg.toFixed(0)}°,foot=${r.maxFootTravel.toFixed(2)}m,loss=${r.firstSupportLossFrame},uAir=${r.unsupportedActuationFrames})`
    )).join(' '),
  );
}

const alwaysDirect = directResults.get('always');
if (alwaysDirect.find((r) => r.impulseNs === 64)?.outcome !== 'RECOVER' ||
    alwaysDirect.find((r) => r.impulseNs === 80)?.outcome !== 'FALL') {
  throw new Error('E3.1h always-active direct control failed to reproduce the canonical 64R/80F frontier.');
}
for (const r of directResults.get('gated')) {
  if (r.unsupportedActuationFrames !== 0) {
    throw new Error(`E3.1h gated direct trial actuated while unsupported at ${r.impulseNs}Ns.`);
  }
}

console.log('E3.1h dynamic-ram A/B:');
const ramResults = new Map();
for (const policy of ['always', 'gated']) {
  const rows = [3, 4].map((speed) => runRam(policy, speed));
  ramResults.set(policy, rows);
  for (const r of rows) {
    console.log(
      `  ${policy} ${r.speed.toFixed(1)}m/s => ${r.outcome} peak=${r.peakTiltDeg.toFixed(1)}deg foot=${r.maxFootTravel.toFixed(3)}m ramDv=${r.maxRamVelocityChange.toFixed(2)}m/s loss=${r.firstSupportLossFrame} uAir=${r.unsupportedActuationFrames}`,
    );
    if (r.firstMaterialTiltFrame < 0 || r.maxRamVelocityChange <= 0.25) {
      throw new Error(`E3.1h ${policy} ram ${r.speed}m/s did not materially couple into the organism.`);
    }
    if (policy === 'gated' && r.unsupportedActuationFrames !== 0) {
      throw new Error(`E3.1h gated ram actuated while unsupported at ${r.speed}m/s.`);
    }
  }
}

const alwaysRam = ramResults.get('always');
if (alwaysRam.find((r) => r.speed === 3)?.outcome !== 'RECOVER' ||
    alwaysRam.find((r) => r.speed === 4)?.outcome !== 'FALL') {
  throw new Error('E3.1h always-active ram control failed to reproduce the canonical 3R/4F boundary.');
}

const gated64 = directResults.get('gated').find((r) => r.impulseNs === 64);
const gated80 = directResults.get('gated').find((r) => r.impulseNs === 80);
const gatedRam3 = ramResults.get('gated').find((r) => r.speed === 3);
const gatedRam4 = ramResults.get('gated').find((r) => r.speed === 4);

console.log(
  `E3.1h causal summary: unsupported always!=gated/passive by construction+measurement; ` +
  `grounded-gated direct64=${gated64.outcome} direct80=${gated80.outcome} ` +
  `ram3=${gatedRam3.outcome} ram4=${gatedRam4.outcome}. ` +
  `Interpret these grounded outcomes as discovery evidence, not a preselected pass criterion.`,
);
