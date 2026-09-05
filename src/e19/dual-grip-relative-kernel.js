function assertFinitePositive(value, name) {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(`${name} must be finite and > 0, got ${value}`);
  }
}

function assertVec3(value, name) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new Error(`${name} must be a finite vec3`);
  }
}

function zeros(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

function identity3() {
  return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}

function scaleMatrix(matrix, scalar) {
  return matrix.map((row) => row.map((value) => value * scalar));
}

function addMatrices(a, b) {
  return a.map((row, i) => row.map((value, j) => value + b[i][j]));
}

function subtractMatrices(a, b) {
  return a.map((row, i) => row.map((value, j) => value - b[i][j]));
}

function transpose(matrix) {
  const result = zeros(matrix[0].length, matrix.length);
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) result[j][i] = matrix[i][j];
  }
  return result;
}

function multiplyMatrices(a, b) {
  const result = zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
      result[i][j] = sum;
    }
  }
  return result;
}

export function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, j) => sum + value * vector[j], 0));
}

function addDiagonal(matrix, value) {
  return matrix.map((row, i) => row.map((entry, j) => entry + (i === j ? value : 0)));
}

function skew([x, y, z]) {
  return [[0, -z, y], [z, 0, -x], [-y, x, 0]];
}

function inertiaRows(matrix) {
  if (
    matrix &&
    Array.isArray(matrix.cx) && Array.isArray(matrix.cy) && Array.isArray(matrix.cz)
  ) {
    return [
      [matrix.cx[0], matrix.cy[0], matrix.cz[0]],
      [matrix.cx[1], matrix.cy[1], matrix.cz[1]],
      [matrix.cx[2], matrix.cy[2], matrix.cz[2]],
    ];
  }
  if (
    Array.isArray(matrix) && matrix.length === 3 &&
    matrix.every((row) => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite))
  ) return matrix.map((row) => [...row]);
  throw new Error('inverse inertia must be a finite 3x3 row matrix or Box3D column matrix');
}

function blockInto(matrix, block, blockRow, blockColumn) {
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      matrix[blockRow * 3 + row][blockColumn * 3 + column] = block[row][column];
    }
  }
}

function solveLinearSystem(matrix, rhs, pivotTolerance) {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let column = 0; column < n; column++) {
    let pivotRow = column;
    let pivotMagnitude = Math.abs(a[column][column]);
    for (let row = column + 1; row < n; row++) {
      const magnitude = Math.abs(a[row][column]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }
    if (!Number.isFinite(pivotMagnitude) || pivotMagnitude < pivotTolerance) {
      throw new Error(`regularized grip solve singular/non-finite at column ${column}: ${pivotMagnitude}`);
    }
    if (pivotRow !== column) [a[column], a[pivotRow]] = [a[pivotRow], a[column]];
    const pivot = a[column][column];
    for (let j = column; j <= n; j++) a[column][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = a[row][column];
      if (Math.abs(factor) < pivotTolerance * 1e-2) continue;
      for (let j = column; j <= n; j++) a[row][j] -= factor * a[column][j];
    }
  }
  return a.map((row) => row[n]);
}

function norm3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function flattenVec3s(vectors) {
  return vectors.flatMap((v) => v);
}

function splitVec3s(vector) {
  const result = [];
  for (let i = 0; i < vector.length; i += 3) result.push(vector.slice(i, i + 3));
  return result;
}

/**
 * Build the relative-velocity response operator for one or two semantic grips.
 *
 * Relative velocity for grip i is:
 *   v_targetPoint_i - v_player
 *
 * Every target impulse J_j receives an equal/opposite reaction on the player's
 * virtual mass, so every block always contains +1/m_player * I.
 *
 * When grips i and j address the SAME responsive rigid body, that body's translation
 * and rotational point response are added as well:
 *   K_ij = 1/m_player I + 1/m_body I - [r_i]x I^-1 [r_j]x
 *
 * When target bodies differ, their only coupling is through the shared player mass.
 * Static/kinematic anchors set responsive=false and contribute no target-body response;
 * therefore the same grip API naturally makes the player move instead of the world.
 */
export function assembleDualGripRelativeOperator({ playerMass, grips }) {
  assertFinitePositive(playerMass, 'playerMass');
  if (!Array.isArray(grips) || grips.length < 1 || grips.length > 2) {
    throw new Error('grips must contain one or two grip descriptors');
  }

  const normalized = grips.map((grip, index) => {
    if (!grip || typeof grip !== 'object') throw new Error(`grips[${index}] must be an object`);
    assertVec3(grip.targetOffset ?? [0, 0, 0], `grips[${index}].targetOffset`);
    const responsive = Boolean(grip.responsive);
    if (!responsive) {
      return {
        bodyKey: grip.bodyKey ?? `static-${index}`,
        responsive: false,
        inverseMass: 0,
        inverseInertia: zeros(3, 3),
        targetOffset: [...(grip.targetOffset ?? [0, 0, 0])],
      };
    }

    const inverseMass = grip.inverseMass;
    if (!(inverseMass >= 0) || !Number.isFinite(inverseMass)) {
      throw new Error(`grips[${index}].inverseMass must be finite and >= 0`);
    }
    return {
      bodyKey: grip.bodyKey,
      responsive: true,
      inverseMass,
      inverseInertia: inertiaRows(grip.inverseInertiaWorld),
      targetOffset: [...grip.targetOffset],
    };
  });

  const playerBlock = scaleMatrix(identity3(), 1 / playerMass);
  const operator = zeros(3 * grips.length, 3 * grips.length);

  for (let i = 0; i < normalized.length; i++) {
    for (let j = 0; j < normalized.length; j++) {
      let block = playerBlock.map((row) => [...row]);
      const gi = normalized[i];
      const gj = normalized[j];
      if (gi.responsive && gj.responsive && gi.bodyKey === gj.bodyKey) {
        const bodyTranslation = scaleMatrix(identity3(), gi.inverseMass);
        const rotational = multiplyMatrices(
          multiplyMatrices(skew(gi.targetOffset), gi.inverseInertia),
          skew(gj.targetOffset),
        );
        block = addMatrices(block, subtractMatrices(bodyTranslation, rotational));
      }
      blockInto(operator, block, i, j);
    }
  }

  return operator;
}

/**
 * Damped least-squares solve for one/two grip relative-velocity tasks.
 *
 * Authority is explicit at two levels:
 * - optional per-grip caps (useful when each hand represents its own finite actuator),
 * - optional shared cap (useful when an experiment wants a total body-level budget).
 *
 * Caps are applied after the coupled solve, then achieved response/residual are
 * recomputed from the actually applied impulses. This is intentionally transparent
 * saturation, not an attempt to hide an impossible task.
 */
export function solveDualGripRelativeImpulses({
  operator,
  desiredDeltaVs,
  maxImpulsePerGrip = Number.POSITIVE_INFINITY,
  maxImpulseSum = Number.POSITIVE_INFINITY,
  regularizationRelative = 1e-6,
}) {
  if (!Array.isArray(desiredDeltaVs) || desiredDeltaVs.length < 1 || desiredDeltaVs.length > 2) {
    throw new Error('desiredDeltaVs must contain one or two vec3 values');
  }
  desiredDeltaVs.forEach((v, i) => assertVec3(v, `desiredDeltaVs[${i}]`));
  const n = desiredDeltaVs.length * 3;
  if (!Array.isArray(operator) || operator.length !== n || operator.some((row) => !Array.isArray(row) || row.length !== n)) {
    throw new Error(`operator must be ${n}x${n}`);
  }
  if (!operator.flat().every(Number.isFinite)) throw new Error('operator contains non-finite values');
  if (!(regularizationRelative > 0) || !Number.isFinite(regularizationRelative)) {
    throw new Error('regularizationRelative must be finite and > 0');
  }

  let perGripCaps;
  if (Array.isArray(maxImpulsePerGrip)) {
    if (maxImpulsePerGrip.length !== desiredDeltaVs.length) throw new Error('maxImpulsePerGrip length mismatch');
    perGripCaps = [...maxImpulsePerGrip];
  } else {
    perGripCaps = Array(desiredDeltaVs.length).fill(maxImpulsePerGrip);
  }
  if (perGripCaps.some((value) => !(value >= 0) || Number.isNaN(value))) {
    throw new Error('per-grip impulse caps must be >= 0');
  }
  if (!(maxImpulseSum >= 0) || Number.isNaN(maxImpulseSum)) throw new Error('maxImpulseSum must be >= 0');

  const desired = flattenVec3s(desiredDeltaVs);
  const kt = transpose(operator);
  const normal = multiplyMatrices(kt, operator);
  const rhs = multiplyMatrixVector(kt, desired);
  const maxDiagonal = Math.max(...operator.map((row, i) => Math.abs(row[i])), 1e-12);
  const lambda = regularizationRelative * maxDiagonal;
  const lambdaSquared = lambda * lambda;
  const regularized = addDiagonal(normal, lambdaSquared);
  const raw = solveLinearSystem(regularized, rhs, Math.max(lambdaSquared * 1e-8, Number.MIN_VALUE));
  if (!raw.every(Number.isFinite)) throw new Error('grip solve produced non-finite raw impulses');

  const rawImpulses = splitVec3s(raw);
  const appliedImpulses = rawImpulses.map((impulse, index) => {
    const magnitude = norm3(impulse);
    const cap = perGripCaps[index];
    const scale = magnitude > cap && magnitude > 1e-15 ? cap / magnitude : 1;
    return impulse.map((value) => value * scale);
  });

  let appliedSum = appliedImpulses.reduce((sum, impulse) => sum + norm3(impulse), 0);
  let sharedScale = 1;
  if (appliedSum > maxImpulseSum && appliedSum > 1e-15) {
    sharedScale = maxImpulseSum / appliedSum;
    for (const impulse of appliedImpulses) {
      for (let axis = 0; axis < 3; axis++) impulse[axis] *= sharedScale;
    }
    appliedSum = maxImpulseSum;
  }

  const appliedFlat = flattenVec3s(appliedImpulses);
  const achieved = multiplyMatrixVector(operator, appliedFlat);
  const residual = desired.map((value, i) => value - achieved[i]);
  const rawMagnitudes = rawImpulses.map(norm3);
  const appliedMagnitudes = appliedImpulses.map(norm3);

  return {
    impulses: appliedImpulses,
    rawImpulses,
    rawMagnitudes,
    appliedMagnitudes,
    rawImpulseSum: rawMagnitudes.reduce((a, b) => a + b, 0),
    appliedImpulseSum: appliedMagnitudes.reduce((a, b) => a + b, 0),
    perGripSaturated: rawMagnitudes.map((value, i) => value > perGripCaps[i] + 1e-12),
    sharedSaturated: sharedScale < 1 - 1e-12,
    sharedScale,
    lambda,
    desiredDeltaV: desired,
    achievedDeltaV: achieved,
    residual,
    residualNorm: Math.hypot(...residual),
  };
}

export function estimateMatrixRank(matrix, relativeTolerance = 1e-9) {
  const work = matrix.map((row) => [...row]);
  const rows = work.length;
  const columns = work[0].length;
  const maxEntry = Math.max(...work.flat().map(Math.abs), 1e-30);
  const tolerance = relativeTolerance * maxEntry;
  let rank = 0;
  let pivotColumn = 0;
  while (rank < rows && pivotColumn < columns) {
    let pivotRow = rank;
    let pivotMagnitude = Math.abs(work[pivotRow][pivotColumn]);
    for (let row = rank + 1; row < rows; row++) {
      const magnitude = Math.abs(work[row][pivotColumn]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }
    if (pivotMagnitude <= tolerance) {
      pivotColumn += 1;
      continue;
    }
    if (pivotRow !== rank) [work[rank], work[pivotRow]] = [work[pivotRow], work[rank]];
    const pivot = work[rank][pivotColumn];
    for (let row = rank + 1; row < rows; row++) {
      const factor = work[row][pivotColumn] / pivot;
      for (let column = pivotColumn; column < columns; column++) {
        work[row][column] -= factor * work[rank][column];
      }
    }
    rank += 1;
    pivotColumn += 1;
  }
  return rank;
}

export function matrixSymmetryError(matrix) {
  let error = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) error = Math.max(error, Math.abs(matrix[i][j] - matrix[j][i]));
  }
  return error;
}
