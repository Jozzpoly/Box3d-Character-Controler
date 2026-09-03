// Temporary E8.1b harness shim: the reference wrapper has no spring, so its
// preload-capture operation is intentionally a no-op. Candidate SplitBranch
// defines its own method and is unaffected by this prototype fallback.
Object.prototype.captureSettledSpringPreload ??= function captureSettledSpringPreload() {};
await import('./e8-1b-constraint-topology-decomposition-source.mjs');
