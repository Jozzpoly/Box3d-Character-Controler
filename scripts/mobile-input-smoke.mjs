import { mergeMovement, normalizeVirtualStick } from '../src/player-input.js';

function near(actual, expected, label, tolerance = 1e-9) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: ${actual} != ${expected}`);
  }
}

const centered = normalizeVirtualStick(0, 0, 100);
near(centered.moveForward, 0, 'center forward');
near(centered.moveRight, 0, 'center right');

const deadZone = normalizeVirtualStick(6, -5, 100);
near(deadZone.moveForward, 0, 'deadzone forward');
near(deadZone.moveRight, 0, 'deadzone right');

const forward = normalizeVirtualStick(0, -100, 100);
near(forward.moveForward, 1, 'full forward');
near(forward.moveRight, 0, 'full forward lateral');

const right = normalizeVirtualStick(100, 0, 100);
near(right.moveForward, 0, 'full right forward');
near(right.moveRight, 1, 'full right');

const diagonal = normalizeVirtualStick(100, -100, 100);
if (Math.hypot(diagonal.moveForward, diagonal.moveRight) > 1 + 1e-9) {
  throw new Error('diagonal virtual stick exceeded unit magnitude');
}
near(diagonal.moveForward, Math.SQRT1_2, 'diagonal forward');
near(diagonal.moveRight, Math.SQRT1_2, 'diagonal right');

const outside = normalizeVirtualStick(250, 0, 100);
near(outside.moveRight, 1, 'outside-radius clamp');
if (Math.abs(outside.knobX) > 100 + 1e-9 || Math.abs(outside.knobY) > 100 + 1e-9) {
  throw new Error('virtual-stick knob escaped radius');
}

const keyboardOnly = mergeMovement(1, 1, 0, 0);
near(Math.hypot(keyboardOnly.moveForward, keyboardOnly.moveRight), 1, 'keyboard diagonal clamp');

const mixed = mergeMovement(0, 1, 1, 0);
near(Math.hypot(mixed.moveForward, mixed.moveRight), 1, 'mixed input diagonal clamp');
near(mixed.moveForward, Math.SQRT1_2, 'mixed forward');
near(mixed.moveRight, Math.SQRT1_2, 'mixed right');

console.log('Mobile input smoke PASS: dead zone, axial input, diagonal clamp, knob radius and keyboard+touch merge');
