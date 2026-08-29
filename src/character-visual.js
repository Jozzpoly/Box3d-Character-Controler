import * as THREE from 'three';
import { clamp, yawFromForwardXZ } from './math.js';

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function createCharacterVisual(character) {
  const root = new THREE.Group();
  const bodyRig = new THREE.Group();
  root.add(bodyRig);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9544d,
    roughness: 0.52,
    metalness: 0.015,
    emissive: 0x4a0c08,
    emissiveIntensity: 0,
  });
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(character.radius, character.halfSegment * 2, 12, 24),
    bodyMaterial,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  bodyRig.add(body);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.18, 0.055),
    new THREE.MeshStandardMaterial({ color: 0x18242b, roughness: 0.35, metalness: 0.08 }),
  );
  // Provisional visual contract: the character's face points along local -Z.
  visor.position.set(0, 0.27, -character.radius * 0.965);
  bodyRig.add(visor);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xeaf6ff });
  for (const x of [-0.085, 0.085]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), eyeMaterial);
    eye.position.set(x, 0.285, -character.radius * 1.045);
    bodyRig.add(eye);
  }

  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(character.radius * 0.78, 0.024, 8, 28),
    new THREE.MeshStandardMaterial({ color: 0xf0c35a, roughness: 0.5 }),
  );
  belt.rotation.x = Math.PI / 2;
  belt.position.y = -0.16;
  bodyRig.add(belt);

  const groundRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x8fe2c0,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const groundRing = new THREE.Mesh(
    new THREE.RingGeometry(character.radius * 0.72, character.radius * 1.15, 32),
    groundRingMaterial,
  );
  groundRing.rotation.x = -Math.PI / 2;
  groundRing.position.y = -character.halfHeight + 0.018;
  root.add(groundRing);

  let facingYaw = 0;
  let landingPulse = 0;
  let leanX = 0;
  let leanZ = 0;

  function reset() {
    facingYaw = 0;
    landingPulse = 0;
    leanX = 0;
    leanZ = 0;
    root.rotation.set(0, 0, 0);
    bodyRig.scale.set(1, 1, 1);
  }

  function update(dt) {
    root.position.set(character.position[0], character.position[1], character.position[2]);

    // Facing follows deliberate player intent, not physical recoil.
    if (character.desiredSpeed > 0.08) {
      const desiredYaw = yawFromForwardXZ(character.desiredDirection);
      facingYaw += shortestAngleDelta(facingYaw, desiredYaw) * (1 - Math.exp(-dt * 13));
    }
    root.rotation.y = facingYaw;

    const speedRatio = clamp(character.desiredSpeed / (character.maxSpeed * character.sprintMultiplier), 0, 1);
    const targetLeanX = speedRatio * 0.055;

    // local +X transformed by yaw is (cos(yaw), 0, -sin(yaw)).
    const sideLocal =
      Math.cos(facingYaw) * character.externalVelocity[0] -
      Math.sin(facingYaw) * character.externalVelocity[2];
    const targetLeanZ = clamp(-sideLocal * 0.022, -0.09, 0.09);
    leanX += (targetLeanX - leanX) * (1 - Math.exp(-dt * 9));
    leanZ += (targetLeanZ - leanZ) * (1 - Math.exp(-dt * 9));
    bodyRig.rotation.x = leanX;
    bodyRig.rotation.z = leanZ;

    if (character.justLanded) {
      landingPulse = Math.max(landingPulse, clamp(character.landingSpeed / 9, 0, 1));
    }
    landingPulse *= Math.exp(-dt * 10);
    bodyRig.scale.set(
      1 + landingPulse * 0.035,
      1 - landingPulse * 0.07,
      1 + landingPulse * 0.035,
    );

    const grounded = Boolean(character.currentSupport);
    groundRingMaterial.opacity +=
      ((grounded ? 0.48 : 0.08) - groundRingMaterial.opacity) * (1 - Math.exp(-dt * 14));
    groundRing.scale.setScalar(1 + clamp(character.lastContactImpulse / 240, 0, 0.22));
    bodyMaterial.emissiveIntensity +=
      (clamp(character.lastContactImpulse / 140, 0, 0.7) - bodyMaterial.emissiveIntensity) *
      (1 - Math.exp(-dt * 18));
  }

  return { object3d: root, update, reset };
}
