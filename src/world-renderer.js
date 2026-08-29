import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const HUGE_BOUNDS = [-1e9, -1e9, -1e9, 1e9, 1e9, 1e9];
const POSITION = [0, 0, 0];
const ROTATION = [0, 0, 0, 1];
function enumValue(value) { return typeof value === 'object' && value !== null && 'value' in value ? value.value : value; }
function shapeKey(shape) { return `${shape.index1}:${shape.world0}:${shape.generation}`; }
function bodyKey(body) { return `${body.index1}:${body.world0}:${body.generation}`; }
function fallbackStyle(b3, body) {
  const type = enumValue(b3.b3Body_GetType(body));
  if (type === enumValue(b3.b3BodyType.b3_staticBody)) return { color: 0x7c8384, roughness: 0.9 };
  if (type === enumValue(b3.b3BodyType.b3_kinematicBody)) return { color: 0x58aeb4, roughness: 0.62 };
  return { color: 0x6d96b9, roughness: 0.68 };
}

export function createWorldRenderer(b3, world, options = {}) {
  const group = new THREE.Group();
  const meshes = new Map();
  const filter = b3.b3DefaultQueryFilter();
  const seen = new Set();
  const appearance = options.appearance ?? new Map();
  function geometryFor(shapeId) {
    const type = enumValue(b3.b3Shape_GetType(shapeId));
    if (type === enumValue(b3.b3ShapeType.b3_sphereShape)) {
      const sphere = b3.b3Shape_GetSphere(shapeId);
      const geometry = new THREE.SphereGeometry(sphere.radius, 24, 18);
      geometry.translate(sphere.center[0], sphere.center[1], sphere.center[2]);
      return geometry;
    }
    if (type === enumValue(b3.b3ShapeType.b3_capsuleShape)) {
      const capsule = b3.b3Shape_GetCapsule(shapeId);
      const axis = new THREE.Vector3(capsule.center2[0] - capsule.center1[0], capsule.center2[1] - capsule.center1[1], capsule.center2[2] - capsule.center1[2]);
      const geometry = new THREE.CapsuleGeometry(capsule.radius, axis.length(), 10, 20);
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
        const style = appearance.get(bodyKey(body)) ?? fallbackStyle(b3, body);
        const material = new THREE.MeshStandardMaterial({ color: style.color, roughness: style.roughness ?? 0.7, metalness: style.metalness ?? 0.015 });
        mesh = new THREE.Mesh(geometry, material);
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
