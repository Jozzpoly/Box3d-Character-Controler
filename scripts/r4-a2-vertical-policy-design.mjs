import assert from 'node:assert/strict';

const VERTICAL_NORMAL_MIN = 0.9;
const EPS = 1e-9;

function applyVerticalNonpenetration({ velocity, constraints }) {
  let minVy = Number.NEGATIVE_INFINITY;
  let maxVy = Number.POSITIVE_INFINITY;
  let active = 0;

  for (const { normal, surfaceVelocity = [0,0,0], pushed = true, clipVelocity = true } of constraints) {
    if (!pushed || !clipVelocity) continue;
    const ny = normal[1];
    if (Math.abs(ny) < VERTICAL_NORMAL_MIN) continue;
    active += 1;
    if (ny > 0) minVy = Math.max(minVy, surfaceVelocity[1]);
    else maxVy = Math.min(maxVy, surfaceVelocity[1]);
  }

  // For opposing moving surfaces a true crush policy is a separate problem. This design
  // only characterizes the feasible non-crush cases needed by A2a.
  if (minVy > maxVy + EPS) return { velocity:[...velocity], active, conflict:true };

  const vy = Math.min(maxVy, Math.max(minVy, velocity[1]));
  return { velocity:[velocity[0], vy, velocity[2]], active, conflict:false };
}

function solve(name, velocityY, constraints, expectedY) {
  const result = applyVerticalNonpenetration({ velocity:[0,velocityY,0], constraints });
  assert.equal(result.conflict, false, `${name}: unexpected conflict`);
  assert.ok(Math.abs(result.velocity[1] - expectedY) < EPS,
    `${name}: got vy=${result.velocity[1]}, expected ${expectedY}`);
  return { name, inputY:velocityY, outputY:result.velocity[1], active:result.active };
}

const cases = [
  solve('static ceiling blocks upward velocity', 6, [{normal:[0,-1,0]}], 0),
  solve('static floor blocks downward velocity', -6, [{normal:[0,1,0]}], 0),
  solve('ceiling does not kill motion away', -3, [{normal:[0,-1,0]}], -3),
  solve('floor does not kill motion away', 3, [{normal:[0,1,0]}], 3),
  solve('rising floor may push upward', 0, [{normal:[0,1,0],surfaceVelocity:[0,2,0]}], 2),
  solve('descending floor does not pull downward', 0, [{normal:[0,1,0],surfaceVelocity:[0,-2,0]}], 0),
  solve('descending ceiling may push downward', 0, [{normal:[0,-1,0],surfaceVelocity:[0,-2,0]}], -2),
  solve('rising ceiling does not pull upward', 0, [{normal:[0,-1,0],surfaceVelocity:[0,2,0]}], 0),
  solve('nonvertical slope stays outside A2a policy', 5, [{normal:[0.6,0.8,0]}], 5),
  solve('inactive plane cannot clip stored velocity', 6, [{normal:[0,-1,0],pushed:false}], 6),
];

console.log('R4 A2 VERTICAL POLICY DESIGN PASS');
console.log(JSON.stringify({
  verticalNormalMin:VERTICAL_NORMAL_MIN,
  cases,
  candidateLaw:'for active near-vertical static/kinematic constraints, clamp vy only enough to prevent relative motion into the surface; never pull character toward a receding surface',
  boundary:'design only; moving-surface conflict/crush and full oblique-slope coupling remain separate questions',
},null,2));
