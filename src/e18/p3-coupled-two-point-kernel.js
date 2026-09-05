function assertFinitePositive(value, name) {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(`${name} must be finite and > 0, got ${value}`);
  }
}

function assertVector3(vector, name) {
  if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite)) {
    throw new Error(`${name} must be a finite vec3`);
  }
}

function zeroMatrix(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

function identity3() {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function scaleMatrix(matrix, scalar) {
  return matrix.map((row) => row.map((value) => scalar * value));
}

function addMatrices(a, b) {
  return a.map((row, i) => row.map((value, j) => value + b[i][j]));
}

function subtractMatrices(a, b) {
  return a.map((row, i) => row.map((value, j) => value - b[i][j]));
}

function transpose(matrix) {
  const result = zeroMatrix(matrix[0].length, matrix.length);
  for (let row = 0; row < matrix.length; row++) {
    for (let column = 0; column < matrix[row].length; column++) {
      result[column][row] = matrix[row][column];
    }
  }
  return result;
}

function multiplyMatrices(a, b) {
  const result = zeroMatrix(a.length, b[0].length);
  for (let row = 0; row < a.length; row++) {
    for (let column = 0; column < b[0].length; column++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[row][k] * b[k][column];
      result[row][column] = sum;
    }
  }
  return result;
}

export function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, column) => sum + value * vector[column], 0));
}

function addDiagonal(matrix, value) {
  return matrix.map((row, i) => row.map((entry, j) => entry + (i === j ? value : 0)));
}

function skew(vector) {
  const [x, y, z] = vector;
  return [
    [0, -z, y],
    [z, 0, -x],
    [-y, x, 0],
  ];
}

function inverseInertiaToRows(matrix) {
  if (
    matrix &&
    Array.isArray(matrix.cx) &&
    Array.isArray(matrix.cy) &&
    Array.isArray(matrix.cz)
  ) {
    return [
      [matrix.cx[0], matrix.cy[0], matrix.cz[0]],
      [matrix.cx[1], matrix.cy[1], matrix.cz[1]],
      [matrix.cx[2], matrix.cy[2], matrix.cz[2]],
    ];
  }

  if (
    Array.isArray(matrix) &&
    matrix.length === 3 &&
    matrix.every((row) => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite))
  ) {
    return matrix.map((row) => [...row]);
  }

  throw new Error('inverseInertiaWorld must be a finite 3x3 row matrix or Box3D column matrix');
}

function blockInto(matrix, block, blockRow, blockColumn) {
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      matrix[blockRow * 3 + row][blockColumn * 3 + column] = block[row][column];
    }
  }
}

function flattenPair(first, second) {
  return [...first, ...second];
}

function splitPair(vector6) {
  return [vector6.slice(0, 3), vector6.slice(3, 6)];
}

function norm3(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normN(vector) {
  return Math.hypot(...vector);
}

function solveLinearSystem(matrix, rhs, pivotTolerance = 1e-14) {
  const size = matrix.length;
  const augmented = matrix.map((row, i) => [...row, rhs[i]]);

  for (let column = 0; column < size; column++) {
    let pivotRow = column;
    let pivotMagnitude = Math.abs(augmented[column][column]);
    for (let row = column + 1; row < size; row++) {
      const magnitude = Math.abs(augmented[row][column]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }

    if (pivotMagnitude < pivotTolerance || !Number.isFinite(pivotMagnitude)) {
      throw new Error(`regularized P3 solve became singular/non-finite at column ${column}: ${pivotMagnitude}`);
    }

    if (pivotRow !== column) [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];

    const pivot = augmented[column][column];
    for (let j = column; j <= size; j++) augmented[column][j] /= pivot;

    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (Math.abs(factor) < 1e-18) continue;
      for (let j = column; j <= size; j++) augmented[row][j] -= factor * augmented[column][j];
    }
  }

  return augmented.map((row) => row[size]);
}

/**
 * Build the 6x6 operator that maps two impulses on one rigid body to the change in
 * the two object-point velocities relative to a finite physical-core COM.
 *
 * For point i and impulse j:
 *
 *   K_ij = (1/mObject + 1/mCore) I - [r_i]x I^-1 [r_j]x
 *
 * The same opposite reaction -(J1 + J2) is applied at the core COM. Therefore each
 * impulse changes both relative point velocities by +J/mCore in addition to the
 * object's translational and rotational response.
 */
export function assembleCoupledTwoPointOperator({
  objectMass,
  coreMass,
  inverseInertiaWorld,
  offset1,
  offset2,
}) {
  assertFinitePositive(objectMass, 'objectMass');
  assertFinitePositive(coreMass, 'coreMass');
  assertVector3(offset1, 'offset1');
  assertVector3(offset2, 'offset2');

  const inverseInertia = inverseInertiaToRows(inverseInertiaWorld);
  if (!inverseInertia.flat().every(Number.isFinite)) throw new Error('inverse inertia contains non-finite values');

  const baseInverseMass = 1 / objectMass + 1 / coreMass;
  const base = scaleMatrix(identity3(), baseInverseMass);
  const offsets = [offset1, offset2];
  const operator = zeroMatrix(6, 6);

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const rotational = multiplyMatrices(
        multiplyMatrices(skew(offsets[i]), inverseInertia),
        skew(offsets[j]),
      );
      const block = subtractMatrices(base, rotational);
      blockInto(operator, block, i, j);
    }
  }

  return operator;
}

/**
 * Solve one coupled two-point relative-velocity task with damped least squares, then
 * enforce a single shared impulse budget. DLS is deliberate: the two-point task has
 * a rank-deficient mode (internal tension/free-twist dual) and an ordinary inverse
 * would either fail or amplify an unreachable component.
 */
export function solveCoupledTwoPointImpulse({
  operator,
  desiredDeltaV1,
  desiredDeltaV2,
  maxImpulseSum = Number.POSITIVE_INFINITY,
  regularizationRelative = 1e-6,
}) {
  if (!Array.isArray(operator) || operator.length !== 6 || operator.some((row) => !Array.isArray(row) || row.length !== 6)) {
    throw new Error('operator must be 6x6');
  }
  if (!operator.flat().every(Number.isFinite)) throw new Error('operator contains non-finite values');
  assertVector3(desiredDeltaV1, 'desiredDeltaV1');
  assertVector3(desiredDeltaV2, 'desiredDeltaV2');
  if (!(maxImpulseSum >= 0) || Number.isNaN(maxImpulseSum)) throw new Error('maxImpulseSum must be >= 0');
  if (!(regularizationRelative > 0) || !Number.isFinite(regularizationRelative)) {
    throw new Error('regularizationRelative must be finite and > 0');
  }

  const desired = flattenPair(desiredDeltaV1, desiredDeltaV2);
  const operatorTranspose = transpose(operator);
  const normal = multiplyMatrices(operatorTranspose, operator);
  const rhs = multiplyMatrixVector(operatorTranspose, desired);
  const maxOperatorDiagonal = Math.max(...operator.map((row, i) => Math.abs(row[i])), 1e-12);
  const lambda = regularizationRelative * maxOperatorDiagonal;
  const regularizedNormal = addDiagonal(normal, lambda * lambda);
  const raw = solveLinearSystem(regularizedNormal, rhs);
  if (!raw.every(Number.isFinite)) throw new Error('P3 raw impulse solve became non-finite');

  const [rawImpulse1, rawImpulse2] = splitPair(raw);
  const rawImpulseSum = norm3(rawImpulse1) + norm3(rawImpulse2);
  const budgetScale = rawImpulseSum > maxImpulseSum && rawImpulseSum > 1e-15
    ? maxImpulseSum / rawImpulseSum
    : 1;
  const solved = raw.map((value) => budgetScale * value);
  const [impulse1, impulse2] = splitPair(solved);
  const achieved = multiplyMatrixVector(operator, solved);
  const residual = desired.map((value, i) => value - achieved[i]);

  return {
    impulse1,
    impulse2,
    rawImpulse1,
    rawImpulse2,
    rawImpulseSum,
    appliedImpulseSum: norm3(impulse1) + norm3(impulse2),
    budgetScale,
    saturated: budgetScale < 1 - 1e-12,
    lambda,
    desiredDeltaV: desired,
    achievedDeltaV: achieved,
    residual,
    residualNorm: normN(residual),
  };
}

export function coupledTwoPointResponse(operator, impulse1, impulse2) {
  assertVector3(impulse1, 'impulse1');
  assertVector3(impulse2, 'impulse2');
  return splitPair(multiplyMatrixVector(operator, flattenPair(impulse1, impulse2)));
}

export function matrixSymmetryError(matrix) {
  let error = 0;
  for (let row = 0; row < matrix.length; row++) {
    for (let column = row + 1; column < matrix[row].length; column++) {
      error = Math.max(error, Math.abs(matrix[row][column] - matrix[column][row]));
    }
  }
  return error;
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
