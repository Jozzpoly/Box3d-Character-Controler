let NEXT_TRACKER_ID = 1;

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

export function e19IdKey(id) {
  if (!id) return 'null';
  return `${id.index1}:${id.world0}:${id.generation}`;
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function negate3(v) {
  return [-v[0], -v[1], -v[2]];
}

function midpoint3(a, b) {
  return [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function bodyTypeValue(type) {
  return typeof type === 'object' && type !== null && 'value' in type ? type.value : type;
}

function bodyKind(b3, body) {
  const type = bodyTypeValue(b3.b3Body_GetType(body));
  if (type === bodyTypeValue(b3.b3BodyType.b3_dynamicBody)) return 'DYNAMIC';
  if (type === bodyTypeValue(b3.b3BodyType.b3_kinematicBody)) return 'KINEMATIC';
  return 'STATIC';
}

/**
 * E19.1a physics-provenance kernel extracted from the qualified E16 contact work.
 *
 * This helper deliberately knows nothing about left/right intent, aim ranking, reach
 * assistance, hand control or gameplay selection. It answers only:
 *
 *   “What body/shape is this probe truly touching in THIS current contact epoch, and
 *    what exact manifold anchor pair did Box3D report?”
 *
 * The caller owns the probe representation. It may eventually be a hand endpoint,
 * reach probe or another earned physical representation; this kernel does not make that
 * architectural decision.
 *
 * Candidate lifetime is intentionally one refresh epoch. A candidate copied from an
 * earlier post-step cannot later be converted into a latch descriptor.
 */
export class E19ContactGripCandidateTracker {
  constructor({ b3, probeBody, probeShape }) {
    if (!b3) throw new Error('b3 is required');
    if (!probeBody || !probeShape) throw new Error('probeBody and probeShape are required');
    this.b3 = b3;
    this.probeBody = probeBody;
    this.probeShape = probeShape;
    this.trackerId = NEXT_TRACKER_ID++;
    this.epoch = 0;
    this.candidates = [];

    this._contactBuffer = b3.createContactsBuffer();
    this._contactScratch = b3.createContact();
    this._manifoldScratch = b3.createManifold();
    this._bodyPositionA = [0, 0, 0];
    this._bodyPositionB = [0, 0, 0];
    this._localOther = [0, 0, 0];
    this._localProbe = [0, 0, 0];
  }

  invalidate() {
    this.epoch += 1;
    this.candidates = [];
  }

  refresh() {
    this.epoch += 1;
    const epoch = this.epoch;
    const candidates = [];

    this.b3.getBodyContactData(this._contactBuffer, this.probeBody);
    const contactCount = this.b3.getNumContacts(this._contactBuffer);

    for (let i = 0; i < contactCount; i++) {
      this.b3.getContactAt(this._contactScratch, this._contactBuffer, i);
      const contact = this._contactScratch;
      const probeIsA = sameId(contact.shapeIdA, this.probeShape);
      const probeIsB = sameId(contact.shapeIdB, this.probeShape);
      if (!probeIsA && !probeIsB) continue;

      const otherShape = probeIsA ? contact.shapeIdB : contact.shapeIdA;
      const otherBody = this.b3.b3Shape_GetBody(otherShape);
      const bodyA = this.b3.b3Shape_GetBody(contact.shapeIdA);
      const bodyB = this.b3.b3Shape_GetBody(contact.shapeIdB);
      this.b3.b3Body_GetPosition(this._bodyPositionA, bodyA);
      this.b3.b3Body_GetPosition(this._bodyPositionB, bodyB);

      for (let m = 0; m < contact.manifoldCount; m++) {
        this.b3.getManifoldAt(this._manifoldScratch, contact, m);
        const manifold = this._manifoldScratch;
        const rawNormal = manifold.normal ? [...manifold.normal] : null;
        // Box3D's manifold normal is oriented from shape A toward shape B. Contact order
        // is not stable gameplay semantics, so expose explicit probe/target orientation.
        const probeToOtherNormal = rawNormal
          ? (probeIsA ? rawNormal : negate3(rawNormal))
          : null;
        const otherToProbeNormal = probeToOtherNormal ? negate3(probeToOtherNormal) : null;

        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];

          // box3d.js exposes manifold anchors as world-space offsets from each body
          // origin. This is the same reconstruction convention already qualified in E16.
          const worldA = add3(this._bodyPositionA, point.anchorA);
          const worldB = add3(this._bodyPositionB, point.anchorB);
          const probeAnchorWorld = probeIsA ? worldA : worldB;
          const otherAnchorWorld = probeIsA ? worldB : worldA;

          this.b3.b3Body_GetLocalPoint(this._localOther, otherBody, otherAnchorWorld);
          this.b3.b3Body_GetLocalPoint(this._localProbe, this.probeBody, probeAnchorWorld);

          const otherShapeKey = e19IdKey(otherShape);
          const otherBodyKey = e19IdKey(otherBody);
          const key = `${this.trackerId}:${epoch}:${otherShapeKey}:${i}:${m}:${p}`;

          candidates.push(Object.freeze({
            trackerId: this.trackerId,
            epoch,
            key,
            probeBody: this.probeBody,
            probeShape: this.probeShape,
            probeBodyKey: e19IdKey(this.probeBody),
            probeShapeKey: e19IdKey(this.probeShape),
            otherShape,
            otherBody,
            otherShapeKey,
            otherBodyKey,
            otherBodyKind: bodyKind(this.b3, otherBody),
            probeAnchorWorld: Object.freeze([...probeAnchorWorld]),
            otherAnchorWorld: Object.freeze([...otherAnchorWorld]),
            anchorMidpointWorld: Object.freeze(midpoint3(probeAnchorWorld, otherAnchorWorld)),
            probeLocalAnchor: Object.freeze([...this._localProbe]),
            otherLocalAnchor: Object.freeze([...this._localOther]),
            anchorPairGap: distance3(probeAnchorWorld, otherAnchorWorld),
            separation: point.separation,
            normalImpulse: point.normalImpulse,
            manifoldNormal: rawNormal ? Object.freeze([...rawNormal]) : null,
            probeToOtherNormal: probeToOtherNormal
              ? Object.freeze([...probeToOtherNormal])
              : null,
            otherToProbeNormal: otherToProbeNormal
              ? Object.freeze([...otherToProbeNormal])
              : null,
          }));
        }
      }
    }

    this.candidates = candidates;
    return candidates;
  }

  resolve(candidate) {
    if (!candidate || candidate.trackerId !== this.trackerId || candidate.epoch !== this.epoch) return null;
    const current = this.candidates.find((entry) => entry.key === candidate.key);
    if (!current) return null;
    if (!sameId(current.probeBody, candidate.probeBody)) return null;
    if (!sameId(current.probeShape, candidate.probeShape)) return null;
    if (!sameId(current.otherBody, candidate.otherBody)) return null;
    if (!sameId(current.otherShape, candidate.otherShape)) return null;
    return current;
  }

  /**
   * Convert only a fresh current candidate into a neutral E19 latch descriptor.
   * Selection/ranking must happen before this call in the interaction layer.
   *
   * The descriptor keeps body + local anchor for STATIC/KINEMATIC/DYNAMIC targets alike;
   * the E19 actuator already knows how body type changes physical responsiveness.
   */
  makeLatchDescriptor(candidate) {
    const current = this.resolve(candidate);
    if (!current) return null;
    return Object.freeze({
      source: 'contact-manifold',
      candidateKey: current.key,
      epoch: current.epoch,
      body: current.otherBody,
      bodyKey: current.otherBodyKey,
      shape: current.otherShape,
      shapeKey: current.otherShapeKey,
      bodyKind: current.otherBodyKind,
      localAnchor: Object.freeze([...current.otherLocalAnchor]),
      worldAnchorAtAcquisition: Object.freeze([...current.otherAnchorWorld]),
      targetSurfaceNormalAtAcquisition: current.otherToProbeNormal
        ? Object.freeze([...current.otherToProbeNormal])
        : null,
      probeToTargetNormalAtAcquisition: current.probeToOtherNormal
        ? Object.freeze([...current.probeToOtherNormal])
        : null,
      separationAtAcquisition: current.separation,
      normalImpulseAtAcquisition: current.normalImpulse,
      anchorPairGapAtAcquisition: current.anchorPairGap,
    });
  }
}
