import fs from 'node:fs';
import Box3D from 'box3d.js/inline';
import { SagittalBalanceOrganism } from '../src/e3-balance-organism.js';
import { entitlementFromLoad } from '../src/e14-authority-kernel.js';

const DT = 1 / 60;
const SUBSTEPS = 4;
const G = 20;
const PLAYER_MASS = 80;
const SUPPORT_MASS = 800;
const FRICTION = 0.95;
const ACCEL = 31;
const TORQUE = 320;
const SETTLE_FRAMES = 90;
const PREP_FRAMES = 8;
const SUPPORT_HALF = [2.2, 0.16, 2.2];
const PLATFORM_Y = -SUPPORT_HALF[1];
const IDENTITY = [0, 0, 0, 1];
const LOAD_EPS = 1e-6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function densityForBoxMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function vec3(getter, body) {
  const out = [0, 0, 0];
  getter(out, body);
  return out;
}

function makeWorld(b3) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, -G, 0];
  return b3.b3CreateWorld(wd);
}

function makeSupport(b3, world, axisLocked) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [0, PLATFORM_Y, 0];
  bd.linearDamping = 0;
  bd.angularDamping = 0;
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  bd.motionLocks.linearX = true;
  bd.motionLocks.linearY = true;
  bd.motionLocks.linearZ = axisLocked;
  bd.motionLocks.angularX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);

  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForBoxMass(SUPPORT_MASS, SUPPORT_HALF);
  sd.baseMaterial.friction = FRICTION;
  sd.baseMaterial.restitution = 0;
  const shape = b3.b3CreateBoxShape(body, sd, ...SUPPORT_HALF);
  return { body, shape, mass: b3.b3Body_GetMass(body) };
}

function createSupportReader(b3, organism, supportShape) {
  const buffer = b3.createContactsBuffer();
  const contact = b3.createContact();
  const manifold = b3.createManifold();

  function read() {
    b3.getBodyContactData(buffer, organism.foot);
    let touching = 0;
    let loaded = 0;
    let totalNormalImpulse = 0;
    let matched = false;

    for (let i = 0; i < b3.getNumContacts(buffer); i++) {
      b3.getContactAt(contact, buffer, i);
      const footIsA = sameId(contact.shapeIdA, organism.footShape);
      const footIsB = sameId(contact.shapeIdB, organism.footShape);
      if (!footIsA && !footIsB) continue;
      const other = footIsA ? contact.shapeIdB : contact.shapeIdA;
      if (!sameId(other, supportShape)) continue;
      matched = true;

      for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m);
        if (Math.abs(manifold.normal[1]) < 0.5) continue;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          if (point.separation <= 0) touching += 1;
          const finalJn = Math.abs(point.normalImpulse ?? 0);
          const totalJn = Math.abs(point.totalNormalImpulse ?? 0);
          totalNormalImpulse += totalJn;
          if (finalJn > LOAD_EPS || totalJn > LOAD_EPS) loaded += 1;
        }
      }
    }

    const frameNormalImpulse = 0.5 * totalNormalImpulse;
    const reactive = matched && (touching > 0 || loaded > 0);
    const q = reactive ? entitlementFromLoad({
      friction: FRICTION,
      frameNormalImpulse,
      referenceFriction: FRICTION,
      playerMass: PLAYER_MASS,
      gravity: G,
      dt: DT,
    }) : 0;

    return { reactive, touching, loaded, frameNormalImpulse, q };
  }

  return { read, destroy: () => b3.destroyContactsBuffer(buffer) };
}

function playerState(b3, organism) {
  organism._sync();
  const footV = vec3(b3.b3Body_GetLinearVelocity, organism.foot);
  const torsoV = vec3(b3.b3Body_GetLinearVelocity, organism.torso);
  return {
    z: (organism.footMass * organism.footCom[2] + organism.torsoMass * organism.torsoCom[2]) / PLAYER_MASS,
    vz: (organism.footMass * footV[2] + organism.torsoMass * torsoV[2]) / PLAYER_MASS,
  };
}

function posturePreStep(b3, organism, targetTilt, supportReactive) {
  organism._sync();
  const error = organism.torsoTilt - targetTilt;
  const omega = organism.torsoAngularVelocity[0];
  const requested = -organism.kp * error - organism.kd * omega;
  const torque = clamp(requested, supportReactive ? -TORQUE : 0, supportReactive ? TORQUE : 0);
  organism.lastBalanceTorque = torque;
  if (Math.abs(torque) > 1e-9) {
    const impulse = torque * DT;
    b3.b3Body_ApplyAngularImpulse(organism.torso, [impulse, 0, 0], true);
    b3.b3Body_ApplyAngularImpulse(organism.foot, [-impulse, 0, 0], true);
  }
  return torque;
}

async function runCase({ axisLocked, direction }) {
  const b3 = await Box3D();
  const world = makeWorld(b3);
  const support = makeSupport(b3, world, axisLocked);
  if (Math.abs(support.mass - SUPPORT_MASS) > 1e-3) {
    throw new Error(`E14.1e support mass drifted: ${support.mass}`);
  }

  const organism = new SagittalBalanceOrganism(b3, world, {
    mode: 'finite',
    maxTorque: TORQUE,
    footFriction: FRICTION,
  });
  const actualPlayerMass = organism.footMass + organism.torsoMass;
  if (Math.abs(actualPlayerMass - PLAYER_MASS) > 1e-3) {
    throw new Error(`E14.1e player mass drifted: ${actualPlayerMass}`);
  }

  const reader = createSupportReader(b3, organism, support.shape);
  let signal = reader.read();

  function step(targetTilt) {
    const playerBefore = playerState(b3, organism);
    const supportVBefore = vec3(b3.b3Body_GetLinearVelocity, support.body)[2];
    const torque = posturePreStep(b3, organism, targetTilt, signal.reactive);
    b3.b3World_Step(world, DT, SUBSTEPS);
    organism.postStep();
    signal = reader.read();
    const playerAfter = playerState(b3, organism);
    const supportVAfter = vec3(b3.b3Body_GetLinearVelocity, support.body)[2];
    const supportPos = vec3(b3.b3Body_GetPosition, support.body)[2];
    const relativeBefore = playerBefore.vz - supportVBefore;
    const relativeAfter = playerAfter.vz - supportVAfter;
    return {
      q: signal.q,
      frameNormalImpulse: signal.frameNormalImpulse,
      reactiveSupport: signal.reactive,
      playerVelocity: playerAfter.vz,
      supportVelocity: supportVAfter,
      relativeVelocity: relativeAfter,
      naturalRelativeDeltaV: relativeAfter - relativeBefore,
      combinedMomentum: PLAYER_MASS * playerAfter.vz + SUPPORT_MASS * supportVAfter,
      playerZ: playerAfter.z,
      supportZ: supportPos,
      torsoTilt: organism.torsoTilt,
      torsoAngularVelocity: organism.torsoAngularVelocity[0],
      balanceTorque: torque,
      fallen: organism.fallObserved,
    };
  }

  for (let i = 0; i < SETTLE_FRAMES; i++) step(0);
  if (!signal.reactive) throw new Error('E14.1e failed to establish support after settle');

  const baseline = step(0);
  const targetTilt = direction * Math.atan2(ACCEL, G);
  const samples = [];
  for (let i = 0; i < PREP_FRAMES; i++) samples.push(step(targetTilt));

  if (axisLocked && samples.some((s) => Math.abs(s.supportVelocity) > 1e-8 || Math.abs(s.supportZ) > 1e-8)) {
    throw new Error('E14.1e locked support moved along the experiment axis');
  }

  const result = {
    supportMode: axisLocked ? 'locked-dynamic' : 'free-dynamic',
    direction,
    targetTiltDeg: targetTilt * 180 / Math.PI,
    baseline,
    samples,
    summary: {
      qMin: Math.min(...samples.map((s) => s.q)),
      qMean: samples.reduce((sum, s) => sum + s.q, 0) / samples.length,
      supportLossFrames: samples.filter((s) => !s.reactiveSupport).length,
      fallenFrames: samples.filter((s) => s.fallen).length,
      torqueSaturationFrames: samples.filter((s) => Math.abs(s.balanceTorque) >= TORQUE - 1e-6).length,
      finalRelativeVelocity: samples.at(-1).relativeVelocity,
      finalPlayerVelocity: samples.at(-1).playerVelocity,
      finalSupportVelocity: samples.at(-1).supportVelocity,
      finalCombinedMomentum: samples.at(-1).combinedMomentum,
      supportTravel: samples.at(-1).supportZ - baseline.supportZ,
      playerTravel: samples.at(-1).playerZ - baseline.playerZ,
      naturalRelativeDeltaVSum: samples.reduce((sum, s) => sum + s.naturalRelativeDeltaV, 0),
      finalTorsoTiltDeg: samples.at(-1).torsoTilt * 180 / Math.PI,
      finalTorsoAngularVelocity: samples.at(-1).torsoAngularVelocity,
    },
  };

  reader.destroy();
  b3.b3DestroyWorld(world);
  return result;
}

const cases = {};
for (const axisLocked of [false, true]) {
  for (const direction of [-1, 1]) {
    const key = `${axisLocked ? 'locked' : 'free'}_${direction > 0 ? 'plus' : 'minus'}`;
    cases[key] = await runCase({ axisLocked, direction });
  }
}

const output = {
  generatedBy: 'scripts/e14-1e-preparation-coupling-crucible.mjs',
  note: 'Observation-only preparation crucible. Same sagittal organism and 8f posture command; no translational authority. Only support-axis mobility changes.',
  reference: {
    dt: DT,
    substeps: SUBSTEPS,
    gravity: G,
    playerMass: PLAYER_MASS,
    supportMass: SUPPORT_MASS,
    friction: FRICTION,
    accelerationReference: ACCEL,
    maxBalanceTorque: TORQUE,
    preparationFrames: PREP_FRAMES,
  },
  cases,
};

const outputPath = process.argv[2] ?? 'e14-1e-preparation-crucible.json';
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`E14.1e preparation crucible written to ${outputPath}`);
