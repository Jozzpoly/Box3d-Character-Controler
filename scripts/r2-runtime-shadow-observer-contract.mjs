import assert from 'node:assert/strict';
import { TemporalRuntimeShadowObserver } from '../src/temporal-runtime-shadow-observer.js';

class Target {
  constructor() { this.map = new Map(); this.document = new TargetDocument(); }
  addEventListener(type, fn) { if (!this.map.has(type)) this.map.set(type, new Set()); this.map.get(type).add(fn); }
  removeEventListener(type, fn) { this.map.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.map.get(type) ?? []) fn(event); }
}
class TargetDocument {
  constructor() { this.map = new Map(); this.hidden = false; }
  addEventListener(type, fn) { if (!this.map.has(type)) this.map.set(type, new Set()); this.map.get(type).add(fn); }
  removeEventListener(type, fn) { this.map.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.map.get(type) ?? []) fn(event); }
}

const DT = 1 / 60;
let now = 0;
const target = new Target();
const observer = new TemporalRuntimeShadowObserver({
  fixedDt: DT,
  maxFrameDt: 0.1,
  startWallTime: 0,
  windowTarget: target,
  now: () => now,
});

// Warm up to 100 ms of simulation and prove predicted tick counts can be cross-checked.
for (let i = 1; i <= 6; i++) {
  now = i * DT;
  const { frame } = observer.beginFrame(now);
  observer.endFrame(frame, { actualTicks: frame.ticks.length });
}

// Visible 500 ms stall: key arrives near the resume end before RAF consumes six catch-up ticks.
now = 0.599;
target.emit('keydown', { key: 'w', code: 'KeyW', repeat: false, timeStamp: 590 });
now = 0.600;
const resumed = observer.beginFrame(now);
assert.equal(resumed.frame.kind, 'tail-window');
assert.equal(resumed.frame.ticks.length, 6);
assert.equal(resumed.audits.length, 1);
assert.equal(resumed.audits[0].frameApplication.classification, 'would-apply-too-early');
assert.equal(resumed.audits[0].frameApplication.prematureTicks, 5);
observer.endFrame(resumed.frame, { actualTicks: 6 });

// A lifecycle event remains observational and separately counted.
now = 0.610;
target.emit('blur', { timeStamp: 609 });
now = 0.617;
const afterBlur = observer.beginFrame(now);
assert.equal(afterBlur.audits[0].classification, 'lifecycle-cut');
observer.endFrame(afterBlur.frame, { actualTicks: afterBlur.frame.ticks.length });

let summary = observer.summary();
assert.equal(summary.counts.events, 2);
assert.equal(summary.counts.lifecycleCuts, 1);
assert.equal(summary.counts.frameTickMismatches, 0);
assert.equal(summary.trustworthyTimeline, true);
assert.equal(summary.maxPrematureTicks, 5);
assert.equal(summary.controls['keyboard:w'], 1);
assert.equal(summary.controls['lifecycle:blur'], 1);
assert.equal(summary.lifecycleEpoch, 1);
assert.ok(summary.classifications['would-apply-too-early'] >= 1);

// The observer must invalidate its own timeline trust if runtime and mapper ever diverge.
now = 0.634;
const mismatch = observer.beginFrame(now);
observer.endFrame(mismatch.frame, { actualTicks: mismatch.frame.ticks.length + 1 });
summary = observer.summary();
assert.equal(summary.counts.frameTickMismatches, 1);
assert.equal(summary.trustworthyTimeline, false);
assert.equal(observer.publicApi().recent().at(-1).classification, 'frame-tick-mismatch');

const api = observer.publicApi();
assert.equal(typeof api.summary, 'function');
assert.equal(typeof api.recent, 'function');
observer.destroy();

console.log('R2 RUNTIME SHADOW OBSERVER CONTRACT PASS');
console.log(JSON.stringify(summary, null, 2));
