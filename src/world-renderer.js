import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const HUGE_BOUNDS = [-1e9, -1e9, -1e9, 1e9, 1e9, 1e9];
const POSITION = [0, 0, 0];
const ROTATION = [0, 0, 0, 1];
const PALETTE = [0xff6b6b, 0xffc857, 0x6bcb77, 0x4d96ff, 0xc78bff, 0xff8e72, 0x22d3ee];
function enumValue(value) { return typeof value === 'object' && value !== null && 'value' in value ? value.value : value; }
function shapeKey(shape) { return `${shape.index1}:${shape.world0}:${shape.generation}`; }
function colorFor(b3, body, dynamicIndex) {
  const type = enumValue(b3.b3Body_GetType(body));
  const color = new THREE.Color();
  if (type === enumValue(b3.b3BodyType.b3_staticBody)) {
    const hash = body.index1 * 137.5;
    color.setHSL(0.58, 0.05, 0.23 + ((hash % 100) / 100) * 0.12);
  } else if (type === enumValue(b3.b3BodyType.b3_kinematicBody)) color.setHex(0x52c7d9);
  else color.setHex(PALETTE[dynamicIndex % PALETTE.length]);
  return color;
}

export function createWorldRenderer(b3, world) {
  const group = new THREE.Group();
  const meshes = new Map();
  const filter = b3.b3DefaultQueryFilter();
  const seen = new Set();
  let dynamicIndex = 0;
  function geometryFor(shapeId) {
    const type = enumValue(b3.b3Shape_GetType(shapeId));
    if (type === enumValue(b3.b3ShapeType.b3_sphereShape)) {
      const sphere = b3.b3Shape_GetSphere(shapeId);
      const geometry = new THREE.SphereGeometry(sphere.radius, 20, 14);
      geometry.translate(sphere.center[0], sphere.center[1], sphere.center[2]);
      return geometry;
    }
    if (type === enumValue(b3.b3ShapeType.b3_capsuleShape)) {
      const capsule = b3.b3Shape_GetCapsule(shapeId);
      const axis = new THREE.Vector3(capsule.center2[0] - capsule.center1[0], capsule.center2[1] - capsule.center1[1], capsule.center2[2] - capsule.center1[2]);
      const geometry = new THREE.CapsuleGeometry(capsule.radius, axis.length(), 8, 16);
      if (axis.lengthSq() > 1e-9) geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize()));
      geometry.translate((capsule.center1[0] + capsule.center2[0]) * 0.5, (capsule.center1[1] + capsule.center2[1]) * 0.5, (capsule.center1[2] + capsule.center2[2]) * 0.5);
      return geometry;
    }
    if (type === enumValue(b3.b3ShapeType.b3_hullShape)) {
      const flat = b3.b3Shape_GetHullVertices(shapeId);
      const points = [];
      for (let i = 0; i < flat.length; i += 3) points.push(new THREE.Vector3(flat[i], flat[i + 1], flat[i + 2]));
      return new ConvexGeometry(points);
    }
    return null;
  }
  function update() {
    seen.clear();
    b3.b3World_OverlapAABB(world, HUGE_BOUNDS, filter, (shapeId) => {
      const key = shapeKey(shapeId);
      seen.add(key);
      const body = b3.b3Shape_GetBody(shapeId);
      let mesh = meshes.get(key);
      if (!mesh) {
        const geometry = geometryFor(shapeId);
        if (!geometry) return true;
        const type = enumValue(b3.b3Body_GetType(body));
        mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colorFor(b3, body, dynamicIndex), roughness: 0.62, metalness: 0.02 }));
        if (type !== enumValue(b3.b3BodyType.b3_staticBody)) dynamicIndex += 1;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.set(key, mesh);
        group.add(mesh);
      }
      b3.b3Body_GetPosition(POSITION, body);
      b3.b3Body_GetRotation(ROTATION, body);
      mesh.position.set(POSITION[0], POSITION[1], POSITION[2]);
      mesh.quaternion.set(ROTATION[0], ROTATION[1], ROTATION[2], ROTATION[3]);
      mesh.visible = true;
      return true;
    });
    for (const [key, mesh] of meshes) if (!seen.has(key)) mesh.visible = false;
  }
  return { object3d: group, update };
}
