export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

export function lengthXZ(v) {
  return Math.hypot(v[0], v[2]);
}

export function normalize3(v) {
  const len = length3(v);
  if (len < 1e-9) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale3(v, scalar) {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

export function mulMat3Vec3(matrix, v) {
  return [
    matrix.cx[0] * v[0] + matrix.cy[0] * v[1] + matrix.cz[0] * v[2],
    matrix.cx[1] * v[0] + matrix.cy[1] * v[1] + matrix.cz[1] * v[2],
    matrix.cx[2] * v[0] + matrix.cy[2] * v[1] + matrix.cz[2] * v[2],
  ];
}

// Visual convention used by the provisional capsule: local -Z is "forward".
// Three.js positive yaw rotates local -Z toward world -X, so world +X is -90°.
export function yawFromForwardXZ(direction) {
  const x = direction[0] ?? 0;
  const z = direction[2] ?? 0;
  if (Math.hypot(x, z) < 1e-9) return 0;
  return Math.atan2(-x, -z);
}

export function quatFromAxisAngle(axis, angle) {
  const n = normalize3(axis);
  const half = angle * 0.5;
  const s = Math.sin(half);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(half)];
}

export function rotateVecByQuat(q, v) {
  const qv = [q[0], q[1], q[2]];
  const uv = cross3(qv, v);
  const uuv = cross3(qv, uv);
  const twoW = 2 * q[3];
  return [
    v[0] + twoW * uv[0] + 2 * uuv[0],
    v[1] + twoW * uv[1] + 2 * uuv[1],
    v[2] + twoW * uv[2] + 2 * uuv[2],
  ];
}

export function inverseRotateVecByQuat(q, v) {
  return rotateVecByQuat([-q[0], -q[1], -q[2], q[3]], v);
}

export function transformPoint(position, rotation, localPoint) {
  return add3(position, rotateVecByQuat(rotation, localPoint));
}

export function inverseTransformPoint(position, rotation, worldPoint) {
  return inverseRotateVecByQuat(rotation, sub3(worldPoint, position));
}
