import Box3D from 'box3d.js/inline';
import { BalanceOrganism3D } from '../src/e3-balance-organism-3d.js';

const b3 = await Box3D();
const dt = 1 / 60;
const substeps = 4;
const finiteTorque = 320;
const forward = [0, 0, 1];
const loadEpsilon = 1e-5;

function makeWorld() {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -20, 0];
  const world = b3.b3CreateWorld(wd);
  const bd = b3.b3DefaultBodyDef();
  bd.position = [0, -0.10, 0];
  const ground = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.baseMaterial.friction = 0.95;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(ground, sd, 6, 0.10, 6);
  return world;
}

function createSupportReader(organism) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();
  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let points = 0;
    let touching = 0;
    let loaded = 0;
    let minSeparation = Infinity;
    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          points += 1;
          minSeparation = Math.min(minSeparation, point.separation);
          if (point.separation <= 0) touching += 1;
          if (point.normalImpulse > loadEpsilon || point.totalNormalImpulse > loadEpsilon) loaded += 1;
        }
      }
    }
    return {
      manifold: points > 0,
      reactive: touching > 0 || loaded > 0,
      loadOnly: loaded > 0,
      points,
      touching,
      loaded,
      minSeparation: points > 0 ? minSeparation : null,
    };
  }
  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function supportFor(policy, signal) {
  if (policy === 'manifold') return signal.manifold;
  if (policy === 'reactive') return signal.reactive;
  if (policy === 'load-only') return signal.loadOnly;
  return false;
}

function torqueMagnitude(t) {
  return Math.hypot(t.balanceTorque[0], t.balanceTorque[2]);
}

function createStepper(world, organism, policy) {
  const reader = createSupportReader(organism);
  let signal = reader.read();
  let frame = 0;
  let speculativeActuationFrames = 0;
  let speculativeAngularImpulse = 0;
  let policyFalseWhileManifoldFrames = 0;

  function step() {
    const before = signal;
    const supported = supportFor(policy, before);
    organism.maxTorque = supported ? finiteTorque : 0;
    organism.preStep(dt);
    const appliedTorque = torqueMagnitude(organism.telemetry());
    if (before.manifold && !before.reactive) {
      if (!supported) policyFalseWhileManifoldFrames += 1;
      if (appliedTorque > 1e-7) {
        speculativeActuationFrames += 1;
        speculativeAngularImpulse += appliedTorque * dt;
      }
    }
    b3.b3World_Step(world, dt, substeps);
    organism.postStep();
    signal = reader.read();
    return {
      frame: frame++, before, after: signal, supported, appliedTorque,
      telemetry: organism.telemetry(),
    };
  }

  return {
    step,
    get signal() { return signal; },
    stats: () => ({ speculativeActuationFrames, speculativeAngularImpulse, policyFalseWhileManifoldFrames }),
    destroy: () => reader.destroy(),
  };
}

function settle(stepper, frames = 60) {
  for (let i = 0; i < frames; i++) stepper.step();
}

function quietContinuity(policy) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createStepper(world, organism, policy);
  let falseAfterSettled = 0;
  let manifoldFrames = 0;
  let minSep = Infinity;
  let loadedFrames = 0;
  for (let i = 0; i < 180; i++) {
    const r = stepper.step();
    if (i >= 60) {
      if (r.before.manifold) manifoldFrames += 1;
      if (r.before.loaded > 0) loadedFrames += 1;
      if (!r.supported) falseAfterSettled += 1;
      if (r.before.minSeparation !== null) minSep = Math.min(minSep, r.before.minSeparation);
    }
  }
  const t = organism.telemetry();
  const out = {
    policy, falseAfterSettled, manifoldFrames, loadedFrames,
    minSep: Number.isFinite(minSep) ? minSep : null,
    finalTiltDeg: t.torsoTilt * 180 / Math.PI,
  };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

function runDirect(policy, impulseNs) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createStepper(world, organism, policy);
  settle(stepper, 60);
  organism.applyPush({ impulseNs, direction: forward });
  let stable = 0;
  let recovered = false;
  for (let i = 0; i < 480; i++) {
    const t = stepper.step().telemetry;
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30) recovered = true;
  }
  const t = organism.telemetry();
  const out = {
    policy, impulseNs,
    outcome: t.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakTilt * 180 / Math.PI,
    ...stepper.stats(),
  };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

function createRam(world, organism, speed, mass = 35) {
  const half = [0.22, 0.22, 0.22];
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [organism.torsoCom[0], organism.torsoCom[1] + 0.25, organism.torsoCom[2] - 0.78];
  bd.enableSleep = false;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = mass / (8 * half[0] * half[1] * half[2]);
  sd.baseMaterial.friction = 0.45;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...half);
  b3.b3Body_SetLinearVelocity(body, [0, 0, speed]);
}

function runRam(policy, speed) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createStepper(world, organism, policy);
  settle(stepper, 60);
  createRam(world, organism, speed);
  let stable = 0;
  let recovered = false;
  for (let i = 0; i < 480; i++) {
    const t = stepper.step().telemetry;
    stable = t.recovered ? stable + 1 : 0;
    if (stable >= 30) recovered = true;
  }
  const t = organism.telemetry();
  const out = {
    policy, speed,
    outcome: t.fallObserved ? 'FALL' : recovered ? 'RECOVER' : 'UNRESOLVED',
    peakTiltDeg: t.peakTilt * 180 / Math.PI,
    ...stepper.stats(),
  };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

function runTakeoff(policy, { impulseNs = 64, launchSpeed = 3 } = {}) {
  const world = makeWorld();
  const organism = new BalanceOrganism3D(b3, world, { mode: 'finite', maxTorque: finiteTorque });
  const stepper = createStepper(world, organism, policy);
  settle(stepper, 60);
  organism.applyPush({ impulseNs, direction: forward });
  b3.b3Body_SetLinearVelocity(organism.foot, [0, launchSpeed, 0]);
  b3.b3Body_SetLinearVelocity(organism.torso, [0, launchSpeed, 0]);
  let peakTilt = 0;
  for (let i = 0; i < 60; i++) {
    const t = stepper.step().telemetry;
    peakTilt = Math.max(peakTilt, t.torsoTilt * 180 / Math.PI);
  }
  const out = { policy, peakTiltDeg: peakTilt, ...stepper.stats() };
  stepper.destroy();
  b3.b3DestroyWorld(world);
  return out;
}

console.log('E3.1k quiet support-signal continuity:');
const quiet = new Map();
for (const policy of ['manifold', 'reactive', 'load-only']) {
  const r = quietContinuity(policy);
  quiet.set(policy, r);
  console.log(`  ${policy}: false=${r.falseAfterSettled}/120 manifold=${r.manifoldFrames}/120 loaded=${r.loadedFrames}/120 minSep=${r.minSep === null ? 'n/a' : (r.minSep * 1000).toFixed(3) + 'mm'} finalTilt=${r.finalTiltDeg.toFixed(3)}deg`);
}
if (quiet.get('manifold').falseAfterSettled !== 0) throw new Error('E3.1k manifold baseline lost quiet support.');
if (quiet.get('reactive').falseAfterSettled !== 0) throw new Error('E3.1k reactive candidate is not continuous on quiet grounded support.');

console.log('E3.1k grounded direct A/B:');
const direct = {};
for (const policy of ['manifold', 'reactive']) {
  direct[policy] = [64, 80].map((impulseNs) => runDirect(policy, impulseNs));
  console.log(`  ${policy}: ${direct[policy].map((r) => `${r.impulseNs}:${r.outcome}(peak=${r.peakTiltDeg.toFixed(1)}deg,specAct=${r.speculativeActuationFrames})`).join(' ')}`);
}
if (direct.manifold[0].outcome !== 'RECOVER' || direct.manifold[1].outcome !== 'FALL') throw new Error('E3.1k manifold baseline lost canonical 64R/80F.');
if (direct.reactive[0].outcome !== direct.manifold[0].outcome || direct.reactive[1].outcome !== direct.manifold[1].outcome) throw new Error('E3.1k reactive candidate changed the tested grounded direct boundary.');

console.log('E3.1k dynamic ram A/B:');
const ram = {};
for (const policy of ['manifold', 'reactive']) {
  ram[policy] = [3, 4].map((speed) => runRam(policy, speed));
  console.log(`  ${policy}: ${ram[policy].map((r) => `${r.speed}:${r.outcome}(peak=${r.peakTiltDeg.toFixed(1)}deg,specAct=${r.speculativeActuationFrames})`).join(' ')}`);
}
if (ram.manifold[0].outcome !== 'RECOVER' || ram.manifold[1].outcome !== 'FALL') throw new Error('E3.1k manifold ram baseline lost canonical 3R/4F.');
if (ram.reactive[0].outcome !== ram.manifold[0].outcome || ram.reactive[1].outcome !== ram.manifold[1].outcome) throw new Error('E3.1k reactive candidate changed the tested ram boundary.');

console.log('E3.1k physics-driven 64Ns/3mps takeoff A/B:');
const takeoffManifold = runTakeoff('manifold');
const takeoffReactive = runTakeoff('reactive');
console.log(`  manifold: peak=${takeoffManifold.peakTiltDeg.toFixed(2)}deg specAct=${takeoffManifold.speculativeActuationFrames}f/${takeoffManifold.speculativeAngularImpulse.toFixed(3)}Nms`);
console.log(`  reactive: peak=${takeoffReactive.peakTiltDeg.toFixed(2)}deg specAct=${takeoffReactive.speculativeActuationFrames}f/${takeoffReactive.speculativeAngularImpulse.toFixed(3)}Nms rejectedSpecFrames=${takeoffReactive.policyFalseWhileManifoldFrames}`);
if (takeoffManifold.speculativeActuationFrames <= 0) throw new Error('E3.1k did not reproduce the manifold-only speculative actuation control.');
if (takeoffReactive.speculativeActuationFrames !== 0) throw new Error('E3.1k reactive candidate still actuated on no-touch/no-load speculative-only support.');

console.log('E3.1k PASS: touching-or-loaded reactive support preserves tested grounded balance/ram behavior and removes the reproduced speculative-only takeoff actuation; candidate remains diagnostic, not promoted player policy.');
