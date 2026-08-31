const CAPTURE_SCHEMA_VERSION = 1;

function copy3(value) {
  return [value[0], value[1], value[2]];
}

function sanitizeIntent(intent) {
  return {
    moveForward: intent.moveForward ?? 0,
    moveRight: intent.moveRight ?? 0,
    forward: copy3(intent.forward ?? [0, 0, -1]),
    right: copy3(intent.right ?? [1, 0, 0]),
    jump: Boolean(intent.jump),
    jumpHeld: Boolean(intent.jumpHeld),
    sprint: Boolean(intent.sprint),
  };
}

function characterSnapshot(character) {
  return {
    position: copy3(character.position),
    velocity: copy3(character.velocity),
    externalVelocity: copy3(character.externalVelocity),
    desiredSpeed: character.desiredSpeed,
    desiredDirection: copy3(character.desiredDirection),
    supportType: character.currentSupport?.type ?? 'AIR',
    dynamicContacts: character.lastDynamicContacts,
    contactImpulse: character.lastContactImpulse,
    planeCount: character.lastPlaneCount,
    supportTransport: character.supportTransportDistance,
    justLanded: character.justLanded,
    landingSpeed: character.landingSpeed,
  };
}

function exportEvent(event, complete = event.complete) {
  return {
    id: event.id,
    epoch: event.epoch,
    markerFrame: event.markerFrame,
    markerIndex: event.markerIndex,
    markedAt: event.markedAt,
    complete,
    truncatedBy: event.truncatedBy ?? null,
    frames: event.frames,
  };
}

export function createFreePlayCapture({
  playground,
  character,
  fixedDt,
  substeps,
  sourceUrl = '',
  userAgent = '',
  preRollSeconds = 3,
  postRollSeconds = 1.5,
}) {
  const preRollFrames = Math.max(1, Math.round(preRollSeconds / fixedDt));
  const postRollFrames = Math.max(1, Math.round(postRollSeconds / fixedDt));
  const playgroundDefinition = playground.captureDefinitions();

  let frameIndex = 0;
  let epoch = 0;
  let markSequence = 0;
  let ring = [];
  let pending = [];
  const completed = [];

  function record(intent) {
    const world = playground.captureSnapshot();
    const frame = {
      frame: frameIndex,
      epoch,
      simulationTime: frameIndex * fixedDt,
      playgroundTime: world.time,
      intent: sanitizeIntent(intent),
      character: characterSnapshot(character),
      bodies: world.bodies,
    };
    frameIndex += 1;

    ring.push(frame);
    if (ring.length > preRollFrames) ring.shift();

    const stillPending = [];
    for (const event of pending) {
      event.frames.push(frame);
      event.remaining -= 1;
      if (event.remaining <= 0) {
        event.complete = true;
        completed.push(event);
      } else {
        stillPending.push(event);
      }
    }
    pending = stillPending;
    return frame;
  }

  function mark(markedAt = new Date().toISOString()) {
    if (ring.length === 0) return null;
    const markerFrame = ring[ring.length - 1].frame;
    const event = {
      id: `owner-${++markSequence}`,
      epoch,
      markerFrame,
      markerIndex: ring.length - 1,
      markedAt,
      complete: false,
      truncatedBy: null,
      frames: ring.slice(),
      remaining: postRollFrames,
    };
    pending.push(event);
    return event.id;
  }

  function resetEpoch(reason = 'reset') {
    for (const event of pending) {
      event.truncatedBy = reason;
      completed.push(event);
    }
    pending = [];
    ring = [];
    epoch += 1;
  }

  function summary() {
    return {
      completed: completed.length,
      pending: pending.length,
      marked: completed.length + pending.length,
      epoch,
      bufferedFrames: ring.length,
    };
  }

  function exportData(exportedAt = new Date().toISOString()) {
    return {
      schema: 'box3d-character-owner-capture',
      schemaVersion: CAPTURE_SCHEMA_VERSION,
      researchStage: 'E2.2c-1',
      runtime: 'A-prime causal-component reciprocity',
      exportedAt,
      sourceUrl,
      userAgent,
      fixedDt,
      substeps,
      preRollFrames,
      postRollFrames,
      playgroundDefinition,
      events: [
        ...completed.map((event) => exportEvent(event)),
        ...pending.map((event) => exportEvent(event, false)),
      ],
    };
  }

  function download() {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      throw new Error('Capture download requires a browser environment');
    }
    const data = exportData();
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `e2-2c1-owner-capture-${stamp}.json`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return data.events.length;
  }

  return {
    record,
    mark,
    resetEpoch,
    summary,
    exportData,
    download,
  };
}
