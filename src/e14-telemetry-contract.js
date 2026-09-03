export const E14_REQUIRED_FINITE_TELEMETRY = Object.freeze([
  'frame',
  'input',
  'targetRelativeVelocity',
  'desiredAcceleration',
  'playerVelocity',
  'supportVelocity',
  'relativeVelocity',
  'physicalRelativeDeltaV',
  'requestedShortfall',
  'entitlement',
  'frameNormalImpulse',
  'playerImpulse',
  'supportImpulse',
  'grantedRelativeDeltaV',
  'totalAuthorityMomentum',
  'combinedMomentum',
  'playerAxisPosition',
  'supportAxisPosition',
  'targetLean',
  'signedLean',
  'torsoTilt',
  'torsoAngularVelocity',
  'balanceTorque',
]);

export function assertE14TelemetrySample(sample, label = 'E14 telemetry') {
  if (!sample || typeof sample !== 'object') throw new Error(`${label}: sample missing`);
  if (Object.prototype.hasOwnProperty.call(sample, 'signedLeanX')) {
    throw new Error(`${label}: stale signedLeanX field is forbidden; use signedLean`);
  }
  if (sample.axis !== 'z') throw new Error(`${label}: expected sagittal axis=z, got ${sample.axis}`);
  for (const key of E14_REQUIRED_FINITE_TELEMETRY) {
    if (!Object.prototype.hasOwnProperty.call(sample, key)) throw new Error(`${label}: missing required field ${key}`);
    if (!Number.isFinite(sample[key])) throw new Error(`${label}: ${key} must be finite, got ${sample[key]}`);
  }
  for (const key of ['preparing', 'reactiveSupport', 'fallen', 'recovered']) {
    if (typeof sample[key] !== 'boolean') throw new Error(`${label}: ${key} must be boolean`);
  }
  if (typeof sample.policy !== 'string' || !sample.policy) throw new Error(`${label}: policy missing`);
  return sample;
}

export function assertE14TelemetrySeries(samples, label = 'E14 telemetry series') {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error(`${label}: expected non-empty samples`);
  samples.forEach((sample, index) => assertE14TelemetrySample(sample, `${label}[${index}]`));
  return samples;
}
