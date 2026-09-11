export const QUERY_CHANNEL = Object.freeze({ MOVER_COLLISION: 'mover-collision', GRIP_REACH: 'grip-reach' });
export const SENSOR_BEHAVIOR = Object.freeze({ BLOCK: 'block', IGNORE: 'ignore' });

function validateBehavior(value, label) {
  if (value !== SENSOR_BEHAVIOR.BLOCK && value !== SENSOR_BEHAVIOR.IGNORE) throw new Error(`${label} must be "block" or "ignore"`);
}

export function createQuerySemantics({ moverSensors = SENSOR_BEHAVIOR.BLOCK, gripReachSensors = SENSOR_BEHAVIOR.BLOCK } = {}) {
  validateBehavior(moverSensors, 'moverSensors');
  validateBehavior(gripReachSensors, 'gripReachSensors');
  const behaviorByChannel = Object.freeze({
    [QUERY_CHANNEL.MOVER_COLLISION]: moverSensors,
    [QUERY_CHANNEL.GRIP_REACH]: gripReachSensors,
  });
  return Object.freeze({
    behaviorByChannel,
    allowsShape(b3, channel, shapeId) {
      if (!(channel in behaviorByChannel)) throw new Error(`Unknown query channel: ${channel}`);
      if (!b3.b3Shape_IsSensor(shapeId)) return true;
      return behaviorByChannel[channel] === SENSOR_BEHAVIOR.BLOCK;
    },
  });
}

export const CURRENT_QUERY_SEMANTICS = createQuerySemantics();
