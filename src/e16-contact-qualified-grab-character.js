import { E16GrabTransportCharacter } from './e16-grab-transport-character.js';

function sameId(a, b) {
  return Boolean(
    a && b &&
    a.index1 === b.index1 &&
    a.world0 === b.world0 &&
    a.generation === b.generation
  );
}

function idKey(id) {
  if (!id) return 'null';
  return `${id.index1}:${id.world0}:${id.generation}`;
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function midpoint3(a, b) {
  return [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * E16.1c contact-qualified explicit grab kernel.
 *
 * Earlier E16.1 crucibles deliberately called grabBody() with a known lab obstacle.
 * That is sufficient for causality, but not for Owner gameplay: a real capability must
 * earn its topology change through the solver-owned organ's ACTUAL current contact.
 *
 * This class therefore exposes immutable per-tick grab candidates recovered from the
 * organ's Box3D contact manifolds. Each candidate carries:
 *   - exact opposite shape/body identity,
 *   - separate organ-side and world-side manifold anchors,
 *   - separation / normal impulse evidence,
 *   - a contact epoch that prevents stale contacts from being grabbed later.
 *
 * Candidate selection is intentionally NOT owned here. The interaction layer may rank
 * candidates by aim, timing, impulse, etc.; the physics kernel only says what is truly
 * touching now. This avoids turning solver iteration order into hidden gameplay policy.
 *
 * Bounded current assumption: E16 toybox bodies use one centred primitive per body, so
 * body origin == centre of mass and Box3D manifold world-offset anchors can be rebuilt
 * from b3Body_GetPosition. If future compound/off-centre bodies are introduced, this
 * conversion must be upgraded rather than silently generalized.
 */
export class E16ContactQualifiedGrabCharacter extends E16GrabTransportCharacter {
  constructor(b3, world, options = {}) {
    super(b3, world, options);
    this._grabContactBuffer = b3.createContactsBuffer();
    this._grabContactScratch = b3.createContact();
    this._grabManifoldScratch = b3.createManifold();
    this._grabBodyPositionA = [0, 0, 0];
    this._grabBodyPositionB = [0, 0, 0];
    this._grabContactEpoch = 0;
    this.grabCandidates = [];
    this.lastGrabSource = null;
    this.lastGrabAnchorPairGap = 0;
    this.lastGrabCandidateKey = null;
  }

  reset(position = this.startPosition) {
    super.reset(position);
    this._grabContactEpoch += 1;
    this.grabCandidates = [];
    this.lastGrabSource = null;
    this.lastGrabAnchorPairGap = 0;
    this.lastGrabCandidateKey = null;
  }

  postStep(dt) {
    super.postStep(dt);
    this._refreshGrabCandidates();
  }

  /**
   * Create a spherical joint from one candidate generated THIS postStep.
   * Returns false for stale / foreign / malformed candidates.
   */
  grabContactCandidate(candidate) {
    if (!candidate || candidate.epoch !== this._grabContactEpoch) return false;
    const current = this.grabCandidates.find((entry) => entry.key === candidate.key);
    if (!current) return false;
    if (!sameId(current.otherBody, candidate.otherBody)) return false;

    this.releaseGrab();

    const localOther = [0, 0, 0];
    const localOrgan = [0, 0, 0];
    this.b3.b3Body_GetLocalPoint(localOther, current.otherBody, current.otherAnchorWorld);
    this.b3.b3Body_GetLocalPoint(localOrgan, this.organBody, current.organAnchorWorld);

    const def = this.b3.b3DefaultSphericalJointDef();
    def.base.bodyIdA = current.otherBody;
    def.base.bodyIdB = this.organBody;
    def.base.localFrameA.position = localOther;
    def.base.localFrameB.position = localOrgan;
    def.base.collideConnected = false;

    this.grabJoint = this.b3.b3CreateSphericalJoint(this.world, def);
    this.grabbedBody = current.otherBody;
    this.grabAnchorWorld = midpoint3(current.organAnchorWorld, current.otherAnchorWorld);
    this.grabCount += 1;
    this.lastGrabSource = 'contact-manifold';
    this.lastGrabAnchorPairGap = current.anchorPairGap;
    this.lastGrabCandidateKey = current.key;
    return true;
  }

  releaseGrab() {
    const released = super.releaseGrab();
    if (released) {
      this.lastGrabSource = null;
      this.lastGrabAnchorPairGap = 0;
      this.lastGrabCandidateKey = null;
    }
    return released;
  }

  telemetry() {
    return {
      ...super.telemetry(),
      mode: 'e16-contact-qualified-grab',
      grabCandidateCount: this.grabCandidates.length,
      grabCandidateBodies: [...new Set(this.grabCandidates.map((candidate) => candidate.otherBodyKey))],
      grabSource: this.lastGrabSource,
      grabAnchorPairGap: this.lastGrabAnchorPairGap,
      grabCandidateKey: this.lastGrabCandidateKey,
    };
  }

  _refreshGrabCandidates() {
    this._grabContactEpoch += 1;
    const epoch = this._grabContactEpoch;
    const candidates = [];

    // While a joint is live collideConnected=false suppresses the pair's collision.
    // The joint itself is the topology authority; fresh contact candidates are only
    // needed while ungrabbed.
    if (this.grabJoint) {
      this.grabCandidates = candidates;
      return;
    }

    this.b3.getBodyContactData(this._grabContactBuffer, this.organBody);
    const contactCount = this.b3.getNumContacts(this._grabContactBuffer);

    for (let i = 0; i < contactCount; i++) {
      this.b3.getContactAt(this._grabContactScratch, this._grabContactBuffer, i);
      const contact = this._grabContactScratch;
      const organIsA = sameId(contact.shapeIdA, this.organShape);
      const organIsB = sameId(contact.shapeIdB, this.organShape);
      if (!organIsA && !organIsB) continue;

      const otherShape = organIsA ? contact.shapeIdB : contact.shapeIdA;
      const otherBody = this.b3.b3Shape_GetBody(otherShape);
      const bodyA = this.b3.b3Shape_GetBody(contact.shapeIdA);
      const bodyB = this.b3.b3Shape_GetBody(contact.shapeIdB);
      this.b3.b3Body_GetPosition(this._grabBodyPositionA, bodyA);
      this.b3.b3Body_GetPosition(this._grabBodyPositionB, bodyB);

      for (let m = 0; m < contact.manifoldCount; m++) {
        this.b3.getManifoldAt(this._grabManifoldScratch, contact, m);
        const manifold = this._grabManifoldScratch;
        for (let p = 0; p < manifold.pointCount; p++) {
          const point = manifold.points[p];
          const worldA = add3(this._grabBodyPositionA, point.anchorA);
          const worldB = add3(this._grabBodyPositionB, point.anchorB);
          const organAnchorWorld = organIsA ? worldA : worldB;
          const otherAnchorWorld = organIsA ? worldB : worldA;
          const key = `${epoch}:${idKey(otherShape)}:${i}:${m}:${p}`;

          candidates.push(Object.freeze({
            epoch,
            key,
            otherShape,
            otherBody,
            otherShapeKey: idKey(otherShape),
            otherBodyKey: idKey(otherBody),
            organAnchorWorld: Object.freeze([...organAnchorWorld]),
            otherAnchorWorld: Object.freeze([...otherAnchorWorld]),
            anchorMidpointWorld: Object.freeze(midpoint3(organAnchorWorld, otherAnchorWorld)),
            anchorPairGap: distance3(organAnchorWorld, otherAnchorWorld),
            separation: point.separation,
            normalImpulse: point.normalImpulse,
            manifoldNormal: manifold.normal ? Object.freeze([...manifold.normal]) : null,
          }));
        }
      }
    }

    this.grabCandidates = candidates;
  }
}

export function createE16ContactQualifiedGrabCharacter(b3, world, options = {}) {
  return new E16ContactQualifiedGrabCharacter(b3, world, options);
}
