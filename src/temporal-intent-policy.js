function finiteNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be a finite non-negative number`);
}

export function resolveTemporalIntent({
  classification,
  kind,
  age = 0,
  lifetime = Infinity,
  contextDependence = 'none',
}) {
  if (kind !== 'state' && kind !== 'edge') throw new Error(`unknown temporal intent kind: ${kind}`);
  if (contextDependence !== 'none' && contextDependence !== 'world-state') {
    throw new Error(`unknown context dependence: ${contextDependence}`);
  }
  finiteNonNegative(age, 'intent age');
  if (lifetime !== Infinity) finiteNonNegative(lifetime, 'intent lifetime');

  const residualLifetime = lifetime === Infinity ? Infinity : Math.max(0, lifetime - age);

  if (classification === 'discarded-past') {
    return kind === 'state'
      ? { action: 'reconcile-current-state', exact: false, residualLifetime: Infinity, reason: 'history-discarded' }
      : { action: 'drop', exact: true, residualLifetime: 0, reason: 'history-discarded' };
  }

  if (classification === 'epoch-boundary') {
    return kind === 'state'
      ? { action: 'reconcile-current-state', exact: false, residualLifetime: Infinity, reason: 'new-epoch' }
      : { action: 'drop', exact: true, residualLifetime: 0, reason: 'new-epoch' };
  }

  if (classification === 'future') {
    return { action: 'keep-queued', exact: true, residualLifetime, reason: 'not-entitled-yet' };
  }

  if (classification === 'retained') {
    return { action: 'apply-at-entitlement', exact: true, residualLifetime, reason: 'retained-history' };
  }

  if (classification !== 'late-after-consume') {
    throw new Error(`unknown event classification: ${classification}`);
  }

  if (kind === 'state') {
    return { action: 'reconcile-current-state', exact: false, residualLifetime: Infinity, reason: 'state-arrived-after-consume' };
  }

  if (residualLifetime <= 0) {
    return { action: 'drop', exact: true, residualLifetime: 0, reason: 'edge-expired' };
  }

  if (contextDependence === 'none') {
    return { action: 'forward-with-residual-age', exact: false, residualLifetime, reason: 'fresh-edge-missed-entitlement' };
  }

  return {
    action: 'requires-bounded-approximation',
    exact: false,
    residualLifetime,
    reason: 'world-state-opportunity-already-consumed',
  };
}
