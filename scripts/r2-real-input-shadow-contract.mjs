import assert from 'node:assert/strict';
import { TemporalInputShadow } from '../src/temporal-input-shadow.js';

class Target {
  constructor() { this.map = new Map(); }
  addEventListener(type, fn) { if (!this.map.has(type)) this.map.set(type, new Set()); this.map.get(type).add(fn); }
  removeEventListener(type, fn) { this.map.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.map.get(type) ?? []) fn(event); }
}

let t = 10;
const windowTarget = new Target();
const documentTarget = new Target();
documentTarget.hidden = false;
windowTarget.document = documentTarget;
const shadow = new TemporalInputShadow({ now: () => t }).install({ windowTarget });

windowTarget.emit('keydown', { key: 'w', code: 'KeyW', repeat: false });
t += 0.004;
windowTarget.emit('keydown', { key: ' ', code: 'Space', repeat: false });
t += 0.003;
windowTarget.emit('keyup', { key: 'w', code: 'KeyW' });
const beforeCut = shadow.drain();
assert.deepEqual(beforeCut.map((e) => [e.control, e.kind, e.epoch]), [['w','down',0],['jump','down',0],['w','up',0]]);
assert.deepEqual(beforeCut.map((e) => e.wallTime), [10, 10.004, 10.007]);

windowTarget.emit('blur');
const cut = shadow.drain();
assert.equal(cut.length, 1);
assert.equal(cut[0].kind, 'cut');
assert.equal(cut[0].epoch, 1);
assert.equal(cut[0].control, 'blur');

// Observer must not mutate, prevent, or consume the gameplay event.
let prevented = false;
const gameplayEvent = { key: 'd', code: 'KeyD', repeat: false, preventDefault() { prevented = true; } };
windowTarget.emit('keydown', gameplayEvent);
assert.equal(prevented, false);
assert.equal(shadow.drain()[0].control, 'd');

shadow.destroy();
assert.equal(shadow.summary().pending, 0);
console.log('R2 real input shadow contract PASS');
