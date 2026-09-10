// Read-only observer for R2: captures real browser input timing without owning gameplay.
export class TemporalInputShadow {
  constructor({ now = () => performance.now() / 1000 } = {}) {
    this.now = now;
    this.events = [];
    this.sequence = 0;
    this.epoch = 0;
    this.listeners = [];
    this.counts = { total: 0, key: 0, pointer: 0, cut: 0 };
  }

  install({ windowTarget = window, touchRoot = null } = {}) {
    const recordKey = (kind) => (event) => {
      const key = event.key?.toLowerCase?.() ?? '';
      if (!['w', 'a', 's', 'd', 'shift', ' '].includes(key)) return;
      this.record({
        source: 'keyboard',
        kind,
        control: event.code === 'Space' ? 'jump' : key,
        repeat: Boolean(event.repeat),
        occurrenceTime: this._eventTime(event),
      });
    };
    this._listen(windowTarget, 'keydown', recordKey('down'), true);
    this._listen(windowTarget, 'keyup', recordKey('up'), true);
    this._listen(windowTarget, 'blur', (event) => this.cut('blur', this._eventTime(event)), true);
    this._listen(windowTarget.document ?? document, 'visibilitychange', (event) => {
      if ((windowTarget.document ?? document).hidden) this.cut('hidden', this._eventTime(event));
    }, true);

    if (touchRoot) {
      const pointer = (kind) => (event) => {
        const control = event.target?.closest?.('[id]')?.id ?? 'touch';
        if (!control.startsWith('touch-')) return;
        this.record({
          source: 'pointer',
          kind,
          control,
          pointerId: event.pointerId,
          occurrenceTime: this._eventTime(event),
        });
      };
      for (const kind of ['pointerdown', 'pointerup', 'pointercancel']) this._listen(touchRoot, kind, pointer(kind), true);
    }
    return this;
  }

  _listen(target, type, listener, capture) {
    target.addEventListener(type, listener, capture);
    this.listeners.push(() => target.removeEventListener(type, listener, capture));
  }

  _eventTime(event) {
    const stamp = event?.timeStamp;
    return Number.isFinite(stamp) ? stamp / 1000 : this.now();
  }

  record(payload) {
    const deliveryTime = this.now();
    const occurrenceTime = Number.isFinite(payload.occurrenceTime) ? payload.occurrenceTime : deliveryTime;
    const event = Object.freeze({
      sequence: ++this.sequence,
      occurrenceTime,
      deliveryTime,
      deliveryDelay: Math.max(0, deliveryTime - occurrenceTime),
      epoch: this.epoch,
      ...payload,
    });
    this.events.push(event);
    this.counts.total += 1;
    if (payload.source === 'keyboard') this.counts.key += 1;
    if (payload.source === 'pointer') this.counts.pointer += 1;
    return event;
  }

  cut(reason, occurrenceTime = this.now()) {
    this.epoch += 1;
    this.counts.cut += 1;
    return this.record({ source: 'epoch', kind: 'cut', control: reason, occurrenceTime });
  }

  drain() {
    return this.events.splice(0);
  }

  summary() {
    return { ...this.counts, pending: this.events.length, epoch: this.epoch };
  }

  destroy() {
    for (const remove of this.listeners.splice(0)) remove();
    this.events.length = 0;
  }
}
