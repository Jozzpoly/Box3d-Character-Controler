import fs from 'node:fs';

function count(text, needle) {
  return text.split(needle).length - 1;
}

function requireCount(label, text, needle, expected) {
  const actual = count(text, needle);
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected} occurrence(s), got ${actual}: ${needle}`);
  }
}

const main = fs.readFileSync('src/main.js', 'utf8');
const e19 = fs.readFileSync('src/e19-owner-browser.js', 'utf8');

requireCount('main fixed-step basis', main, 'const basis = followCamera.controlBasis();', 1);
requireCount('main fixed-step advance', main, 'followCamera.advanceControl(dt);', 1);
requireCount('E19 fixed-step basis', e19, 'const basis = followCamera.controlBasis();', 1);
requireCount('E19 fixed-step advance', e19, 'followCamera.advanceControl(dt);', 1);
requireCount('E19 mechanical reach basis plumbing', e19, 'updateReachAndAcquire(hand, basis)', 2);
requireCount('E19 render-preview visual basis boundary', e19, 'function aimForHand(hand, basis = followCamera.basis())', 1);

if (main.includes('const basis = followCamera.basis();\n    const intent = playerInput.sample(basis);')) {
  throw new Error('main physicsTick still samples render camera basis');
}
if (e19.includes('const basis = followCamera.basis();\n    const intent = playerInput.sample(basis);')) {
  throw new Error('E19 physicsTick still samples render camera basis');
}

console.log('R1 A4 browser integration contract PASS');
