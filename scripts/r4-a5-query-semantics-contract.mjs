import assert from 'node:assert/strict';
import {
  CURRENT_QUERY_SEMANTICS,
  QUERY_CHANNEL,
  SENSOR_BEHAVIOR,
  createQuerySemantics,
} from '../src/query-semantics.js';

const solid = { sensor: false };
const sensor = { sensor: true };
const b3 = { b3Shape_IsSensor: (shape) => shape.sensor };

for (const channel of Object.values(QUERY_CHANNEL)) {
  assert.equal(CURRENT_QUERY_SEMANTICS.behaviorByChannel[channel], SENSOR_BEHAVIOR.BLOCK);
  assert.equal(CURRENT_QUERY_SEMANTICS.allowsShape(b3, channel, solid), true);
  assert.equal(CURRENT_QUERY_SEMANTICS.allowsShape(b3, channel, sensor), true,
    `${channel}: current/default behavior must preserve existing sensor blocking`);
}

const ignoreMover = createQuerySemantics({ moverSensors: SENSOR_BEHAVIOR.IGNORE });
assert.equal(ignoreMover.allowsShape(b3, QUERY_CHANNEL.MOVER_COLLISION, sensor), false);
assert.equal(ignoreMover.allowsShape(b3, QUERY_CHANNEL.MOVER_COLLISION, solid), true);
assert.equal(ignoreMover.allowsShape(b3, QUERY_CHANNEL.GRIP_REACH, sensor), true,
  'changing mover policy must not silently change grip-reach policy');

const ignoreReach = createQuerySemantics({ gripReachSensors: SENSOR_BEHAVIOR.IGNORE });
assert.equal(ignoreReach.allowsShape(b3, QUERY_CHANNEL.GRIP_REACH, sensor), false);
assert.equal(ignoreReach.allowsShape(b3, QUERY_CHANNEL.GRIP_REACH, solid), true);
assert.equal(ignoreReach.allowsShape(b3, QUERY_CHANNEL.MOVER_COLLISION, sensor), true,
  'changing grip policy must not silently change mover policy');

assert.throws(() => createQuerySemantics({ moverSensors: 'magic' }), /block|ignore/);
assert.throws(() => CURRENT_QUERY_SEMANTICS.allowsShape(b3, 'unknown-channel', solid), /Unknown query channel/);

console.log('R4 A5 QUERY SEMANTICS CONTRACT PASS');
console.log(JSON.stringify({
  defaultPolicy: CURRENT_QUERY_SEMANTICS.behaviorByChannel,
  result: 'sensor participation is now a named per-query-channel decision; current behavior is preserved explicitly',
  evidenceBoundary: 'design contract only; runtime query sites are not yet routed through this policy on this branch',
}, null, 2));
