export class TemporalInputBuffer {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.events = [];
    this.nextOrder = 0;
  }

  enqueueState(name, value, time, order = this.nextOrder++) {
    this.events.push({ kind: 'state', name, value, time, order });
    this.events.sort((a, b) => a.time - b.time || a.order - b.order);
  }

  enqueueEdge(name, payload, time, order = this.nextOrder++) {
    this.events.push({ kind: 'edge', name, payload, time, order });
    this.events.sort((a, b) => a.time - b.time || a.order - b.order);
  }

  sampleAt(simTime) {
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
  }

  get pendingCount() {
    return this.events.length;
  }
}
