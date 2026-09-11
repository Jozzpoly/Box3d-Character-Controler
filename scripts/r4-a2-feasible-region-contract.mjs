import assert from 'node:assert/strict';

function projectedBound({ nx, nz, surfaceVelocity, desiredVelocity }) {
  const surfaceDot = surfaceVelocity[0] * nx + surfaceVelocity[2] * nz;
  const desiredDot = desiredVelocity[0] * nx + desiredVelocity[2] * nz;
  const allowedRelativeInward = Math.min(0, desiredDot - surfaceDot);
  return surfaceDot + allowedRelativeInward;
}

let checked = 0;
for (let i = 0; i < 1000; i++) {
  const angle = ((i * 137.50776405) % 360) * Math.PI / 180;
  const nx = Math.cos(angle);
  const nz = Math.sin(angle);
  const surfaceVelocity = [
    Math.sin(i * 0.73) * 8,
    0,
    Math.cos(i * 0.41) * 8,
  ];
  const desiredVelocity = [
    Math.sin(i * 0.19 + 0.4) * 10,
    0,
    Math.cos(i * 0.31 - 0.2) * 10,
  ];
  const desiredDot = desiredVelocity[0] * nx + desiredVelocity[2] * nz;
  const surfaceDot = surfaceVelocity[0] * nx + surfaceVelocity[2] * nz;
  const bound = projectedBound({ nx, nz, surfaceVelocity, desiredVelocity });

  assert.ok(Math.abs(bound - Math.min(surfaceDot, desiredDot)) < 1e-10,
    'intent-capped affine bound no longer simplifies to min(surfaceDot, desiredDot)');
  assert.ok(desiredDot >= bound - 1e-10,
    'desired velocity must remain feasible for every individual A2 constraint');
  checked += 1;
}

console.log('R4 A2 FEASIBLE-REGION CONTRACT PASS');
console.log(JSON.stringify({
  checked,
  invariant: 'Each horizontal constraint bound is min(surfaceDot, desiredDot), therefore desiredVelocity satisfies every constraint and their intersection is non-empty.',
  consequence: 'A2 nearest-feasible solve needs no arbitrary infeasible/crush fallback within this intent-capped policy.',
}, null, 2));
