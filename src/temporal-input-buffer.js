function requireFiniteTime(time, label) {
  if (!Number.isFinite(time)) throw new TypeError(`${label} must be finite`);
}

function requireOrder(order) {
  if (!Number.isSafeInteger(order) || order < 0) throw new TypeError('event order must be a non-negative safe integer');
}

export class TemporalInputBuffer {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.events = [];
    this.nextOrder = 0;
    this.usedOrders = new Set();
    this.lastSampleTime = -Infinity;
  }

  _claimOrder(explicitOrder) {
    const order = explicitOrder ?? this.nextOrder;
    requireOrder(order);
    if (this.usedOrders.has(order)) throw new Error(`duplicate event order ${order}`);
    this.usedOrders.add(order);
    this.nextOrder = Math.max(this.nextOrder, order + 1);
    return order;
  }

  _enqueue(event) {
    requireFiniteTime(event.time, 'event time');
    const order = this._claimOrder(event.order);
    this.events.push({ ...event, order });
    this.events.sort((a, b) => a.time - b.time || a.order - b.order);
    return order;
  }

  enqueueState(name, value, time, order = undefined) {
    return this._enqueue({ kind: 'state', name, value, time, order });
  }

  enqueueEdge(name, payload, time, order = undefined) {
    return this._enqueue({ kind: 'edge', name, payload, time, order });
  }

  sampleAt(simTime) {
    requireFiniteTime(simTime, 'simulation time');
    if (simTime < this.lastSampleTime) {
      throw new Error(`simulation time moved backwards (${simTime} < ${this.lastSampleTime}); clear() before starting a new epoch`);
    }
    this.lastSampleTime = simTime;

    const edges = [];
    let consumed = 0;
    for (const event of this.events) {
      if (event.time > simTime) break;
      consumed++;
      if (event.kind === 'state') this.state[event.name] = event.value;
      else edges.push({ name: event.name, payload: event.payload, time: event.time, order: event.order });
    }
    if (consumed) this.events.splice(0, consumed);
    return { state: { ...this.state }, edges };
  }

  clear(nextState = {}) {
    this.state = { ...nextState };
    this.events.length = 0;
    this.nextOrder = 0;
    this.usedOrders.clear();
    this.lastSampleTime = -Infinity;
  }

  get pendingCount() {
    return this.events.length;
  }
}
