import Box3D from 'box3d.js/inline';
import { sagittalAngleFromRotation } from '../src/e3-balance-organism.js';
import { DONOR_QUALIFIED_ENVELOPE_V1 } from '../src/donor/profile.js';

const b3 = await Box3D();
const DT = DONOR_QUALIFIED_ENVELOPE_V1.fixedDt;
const SUBSTEPS = DONOR_QUALIFIED_ENVELOPE_V1.substeps;
const SEGMENT_MASS = 0.5;
const SEGMENT_LENGTH = 0.45;
const HALF = [0.06, SEGMENT_LENGTH / 2, 0.06];
const IDENTITY = [0, 0, 0, 1];
const MAX_ANCHOR_GAP = 0.005; // reuse E8 exact-lock linear envelope
const MAX_REL_ANGLE = 0.25 * Math.PI / 180; // reuse E7/E8 inactive angular envelope

function densityForMass(mass, half) {
  return mass / (8 * half[0] * half[1] * half[2]);
}

function rotation(body) {
  const q = [0, 0, 0, 1];
  b3.b3Body_GetRotation(q, body);
  return q;
}

function worldPoint(body, localPoint) {
  const out = [0, 0, 0];
  b3.b3Body_GetWorldPoint(out, body, localPoint);
  return out;
}

function distance(a, c) {
  return Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
}

function makeBody(world, position) {
  const bd = b3.b3DefaultBodyDef();
  bd.type = b3.b3BodyType.b3_dynamicBody;
  bd.position = [...position];
  bd.enableSleep = false;
  bd.enableContactRecycling = false;
  bd.motionLocks.linearX = true;
  bd.motionLocks.angularY = true;
  bd.motionLocks.angularZ = true;
  const body = b3.b3CreateBody(world, bd);
  const sd = b3.b3DefaultShapeDef();
  sd.density = densityForMass(SEGMENT_MASS, HALF);
  sd.baseMaterial.friction = 0;
  sd.baseMaterial.restitution = 0;
  b3.b3CreateBoxShape(body, sd, ...HALF);
  return body;
}

function makeRig(withWeld) {
  const wd = b3.b3DefaultWorldDef();
  wd.gravity = [0, 0, 0];
  const world = b3.b3CreateWorld(wd);
  const proximal = makeBody(world, [0, HALF[1], 0]);
  const distal = makeBody(world, [0, HALF[1] + SEGMENT_LENGTH, 0]);

  if (!withWeld) {
    return { world, proximal, distal, joint: null };
  }

  if (typeof b3.b3DefaultWeldJointDef !== 'function' || typeof b3.b3CreateWeldJoint !== 'function') {
    throw new Error('E9.0a requires weld-joint bindings in box3d.js@0.1.1');
  }

  const weld = b3.b3DefaultWeldJointDef();
  weld.base.bodyIdA = proximal;
  weld.base.bodyIdB = distal;
  weld.base.localFrameA = { position: [0, HALF[1], 0], quaternion: IDENTITY };
  weld.base.localFrameB = { position: [0, -HALF[1], 0], quaternion: IDENTITY };
  weld.base.collideConnected = false;
  weld.linearHertz = 0;
  weld.angularHertz = 0;
  weld.linearDampingRatio = 1;
  weld.angularDampingRatio = 1;
  const joint = b3.b3CreateWeldJoint(world, weld);

  if (weld.linearHertz !== 0 || weld.angularHertz !== 0) {
    throw new Error('E9.0a expected explicit zero-Hz maximum-stiffness weld definition');
  }

  return { world, proximal, distal, joint };
}

function observe(rig) {
  const anchorA = worldPoint(rig.proximal, [0, HALF[1], 0]);
  const anchorB = worldPoint(rig.distal, [0, -HALF[1], 0]);
  const proximalTilt = sagittalAngleFromRotation(rotation(rig.proximal));
  const distalTilt = sagittalAngleFromRotation(rotation(rig.distal));
  return {
    gap: distance(anchorA, anchorB),
    angle: Math.abs(distalTilt - proximalTilt),
  };
}

function runCase(name, applyChallenge, withWeld) {
  const rig = makeRig(withWeld);
  for (let i = 0; i < 4; i++) b3.b3World_Step(rig.world, DT, SUBSTEPS);
  applyChallenge(rig);

  let maxGap = 0;
  let maxAngle = 0;
  let maxForce = 0;
  let maxTorque = 0;
  for (let i = 0; i < 120; i++) {
    b3.b3World_Step(rig.world, DT, SUBSTEPS);
    const o = observe(rig);
    maxGap = Math.max(maxGap, o.gap);
    maxAngle = Math.max(maxAngle, o.angle);
    if (rig.joint) {
      // Diagnostic terminal-reaction telemetry only. The pinned solver performs
      // bias solve followed by relaxation within each substep, so the final
      // accumulated reaction may return to zero after a finite disturbance.
      const force = [0, 0, 0];
      const torque = [0, 0, 0];
      b3.b3Joint_GetConstraintForce(force, rig.joint);
      b3.b3Joint_GetConstraintTorque(torque, rig.joint);
      maxForce = Math.max(maxForce, Math.hypot(...force));
      maxTorque = Math.max(maxTorque, Math.hypot(...torque));
    }
  }

  const result = { name, withWeld, maxGap, maxAngle, maxForce, maxTorque };
  b3.b3DestroyWorld(rig.world);
  return result;
}

if (DT !== 1 / 60 || SUBSTEPS !== 4) {
  throw new Error('E9.0a expected canonical Donor-v1 solver cadence');
}

const challenges = [
  {
    name: 'axial',
    apply: ({ proximal, distal }) => {
      b3.b3Body_ApplyLinearImpulseToCenter(proximal, [0, -0.5, 0], true);
      b3.b3Body_ApplyLinearImpulseToCenter(distal, [0, 0.5, 0], true);
    },
    freeMustViolate: result => result.maxGap > MAX_ANCHOR_GAP,
  },
  {
    name: 'shear',
    apply: ({ proximal, distal }) => {
      b3.b3Body_ApplyLinearImpulseToCenter(proximal, [0, 0, -0.5], true);
      b3.b3Body_ApplyLinearImpulseToCenter(distal, [0, 0, 0.5], true);
    },
    freeMustViolate: result => result.maxGap > MAX_ANCHOR_GAP,
  },
  {
    name: 'sagittal-rotation',
    apply: ({ proximal, distal }) => {
      b3.b3Body_ApplyAngularImpulse(proximal, [-0.02, 0, 0], true);
      b3.b3Body_ApplyAngularImpulse(distal, [0.02, 0, 0], true);
    },
    freeMustViolate: result => result.maxAngle > MAX_REL_ANGLE,
  },
];

console.log('E9.0a rigid weld binding calibration');
console.log('  two 0.5kg x 0.45m segments, zero gravity, zero-Hz max-stiffness weld');
console.log(`  declared envelope: anchorGap<=${MAX_ANCHOR_GAP}m relativeAngle<=${(MAX_REL_ANGLE * 180 / Math.PI).toFixed(3)}deg`);
console.log('  control rule: identical disconnected rig must violate the relevant declared envelope under the same finite challenge');

for (const challenge of challenges) {
  const free = runCase(challenge.name, challenge.apply, false);
  const welded = runCase(challenge.name, challenge.apply, true);
  console.log(
    `  ${challenge.name}: free gap=${free.maxGap.toExponential(3)}m relAngle=${(free.maxAngle * 180 / Math.PI).toFixed(3)}deg | ` +
    `weld gap=${welded.maxGap.toExponential(3)}m relAngle=${(welded.maxAngle * 180 / Math.PI).toFixed(6)}deg ` +
    `terminalReaction(max sampled)=${welded.maxForce.toFixed(3)}N/${welded.maxTorque.toFixed(3)}Nm`,
  );

  if (!challenge.freeMustViolate(free)) {
    throw new Error(`E9.0a ${challenge.name} challenge is not material: disconnected control stayed inside the relevant envelope`);
  }
  if (welded.maxGap > MAX_ANCHOR_GAP) {
    throw new Error(`E9.0a ${challenge.name} weld anchor gap exceeded envelope: ${welded.maxGap}`);
  }
  if (welded.maxAngle > MAX_REL_ANGLE) {
    throw new Error(`E9.0a ${challenge.name} weld relative angle exceeded envelope: ${welded.maxAngle}`);
  }
}

console.log('E9.0a PASS: under three finite disturbances that push an otherwise identical disconnected two-body control outside the already-declared E8 linear or E7/E8 angular inactive envelope, the pinned zero-Hz weld keeps the split pair inside both envelopes at canonical 1/60 x4 cadence. Generic post-step reaction force/torque is retained as diagnostic telemetry only because the pinned solver performs solve then relaxation inside each substep. This qualifies the weld primitive only; it does not qualify an embodied rigid split, clutch transition, support placement or load transfer.');
