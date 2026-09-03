// Temporary E8.1b harness shim: the reference wrapper has no spring, so its
// preload-capture operation is intentionally a no-op. Define it non-enumerably
// because Embind iterates plain-object fields while decoding Box2D structs.
Object.defineProperty(Object.prototype, 'captureSettledSpringPreload', {
  value() {},
  configurable: true,
  writable: true,
  enumerable: false,
});
await import('./e8-1b-constraint-topology-decomposition-source.mjs');
