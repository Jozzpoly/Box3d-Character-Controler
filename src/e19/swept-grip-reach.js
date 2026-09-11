import { CURRENT_QUERY_SEMANTICS, QUERY_CHANNEL } from '../query-semantics.js';

function finiteVec3(v) {
  return Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
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

function idKey(id) {
  if (!id) return 'null';
  return `${id.index1}:${id.world0}:${id.generation}`;
}

export function castE19GripReach({
  b3,
  world,
  origin,
  translation,
  radius = 0.14,
  queryFilter = null,
  querySemantics = CURRENT_QUERY_SEMANTICS,
}) {
  if (!b3 || !world) throw new Error('b3 and world are required');
  if (!finiteVec3(origin) || !finiteVec3(translation)) throw new Error('origin/translation must be finite vec3');
  if (!(radius > 0) || !Number.isFinite(radius)) throw new Error('radius must be finite and > 0');

  const filter = queryFilter ?? b3.b3DefaultQueryFilter();
  let best = null;
  let bestFraction = Number.POSITIVE_INFINITY;
  const proxyPoints = [0, 0, 0];
  b3.b3World_CastShape(
    world,
    origin,
    proxyPoints,
    radius,
    translation,
    filter,
    (shapeId, point, normal, fraction, userMaterialId = 0, triangleIndex = -1, childIndex = -1) => {
      if (!shapeId || !Number.isFinite(fraction)) return bestFraction;
      if (!querySemantics.allowsShape(b3, QUERY_CHANNEL.GRIP_REACH, shapeId)) return bestFraction;
      if (fraction < 0 || fraction > 1) return bestFraction;
      if (!finiteVec3(point) || !finiteVec3(normal)) return bestFraction;
      if (fraction >= bestFraction) return bestFraction;
      const body = b3.b3Shape_GetBody(shapeId);
      const localAnchor = [0, 0, 0];
      b3.b3Body_GetLocalPoint(localAnchor, body, point);
      bestFraction = fraction;
      best = Object.freeze({
        source: 'swept-reach', shape: shapeId, shapeKey: idKey(shapeId), body, bodyKey: idKey(body), bodyKind: bodyKind(b3, body),
        localAnchor: Object.freeze([...localAnchor]), worldAnchorAtAcquisition: Object.freeze([...point]),
        targetSurfaceNormalAtAcquisition: Object.freeze([...normal]), reachOriginAtAcquisition: Object.freeze([...origin]),
        reachTranslationAtAcquisition: Object.freeze([...translation]), reachRadiusAtAcquisition: radius,
        fraction, userMaterialId, triangleIndex, childIndex,
      });
      return fraction;
    },
  );
  return best;
}
