import { E14_AUTHORITY_POLICIES } from './e14-authority-kernel.js';

export const E14_SPECIMEN_FORMAT_VERSION = 1;
export const E14_SPECIMEN_QUERY_KEY = 'e14spec';
export const E14_SPECIMEN_LOCK_QUERY_KEY = 'e14lock';

export const E14_SPECIMEN_SUBSTRATE = Object.freeze({
  version: 1,
  representation: 'e14.1-sagittal-e4-e12',
  dt: 1 / 60,
  substeps: 4,
  gravity: 20,
  playerMass: 80,
  maxSpeed: 5.2,
  referenceFriction: 0.95,
  preparationFrames: 0,
  settleFrames: 90,
  supportHalf: Object.freeze([2.2, 0.16, 2.2]),
});

const POLICY_VALUES = new Set(Object.values(E14_AUTHORITY_POLICIES));
const FIELD_SPECS = Object.freeze({
  supportMass: Object.freeze({ min: 20, max: 2000 }),
  friction: Object.freeze({ min: 0, max: 1.5 }),
  acceleration: Object.freeze({ min: 2, max: 70 }),
  braking: Object.freeze({ min: 2, max: 80 }),
  maxBalanceTorque: Object.freeze({ min: 0, max: 1000 }),
});

const FIELD_ORDER = Object.freeze([
  ['m', 'supportMass'],
  ['f', 'friction'],
  ['a', 'acceleration'],
  ['b', 'braking'],
  ['t', 'maxBalanceTorque'],
  ['p', 'policy'],
]);

function normalizedNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`E14 specimen ${name} must be finite`);
  const bounds = FIELD_SPECS[name];
  if (number < bounds.min || number > bounds.max) {
    throw new Error(`E14 specimen ${name} outside [${bounds.min}, ${bounds.max}]`);
  }
  return Number(number.toFixed(9));
}

export function normalizeE14Specimen(input = {}) {
  const policy = String(input.policy ?? '');
  if (!POLICY_VALUES.has(policy)) throw new Error(`E14 specimen policy invalid: ${policy || '(missing)'}`);
  return Object.freeze({
    supportMass: normalizedNumber(input.supportMass, 'supportMass'),
    friction: normalizedNumber(input.friction, 'friction'),
    acceleration: normalizedNumber(input.acceleration, 'acceleration'),
    braking: normalizedNumber(input.braking, 'braking'),
    maxBalanceTorque: normalizedNumber(input.maxBalanceTorque, 'maxBalanceTorque'),
    policy,
  });
}

function canonicalNumber(value) {
  return Number(value).toString();
}

export function serializeE14Specimen(input) {
  const specimen = normalizeE14Specimen(input);
  const parts = [`e14c${E14_SPECIMEN_FORMAT_VERSION}`, `s${E14_SPECIMEN_SUBSTRATE.version}`];
  for (const [short, key] of FIELD_ORDER) {
    parts.push(`${short}=${key === 'policy' ? specimen[key] : canonicalNumber(specimen[key])}`);
  }
  return parts.join('|');
}

export function parseE14Specimen(serialized) {
  if (typeof serialized !== 'string' || !serialized.trim()) throw new Error('E14 specimen serialization missing');
  const parts = serialized.trim().split('|');
  if (parts[0] !== `e14c${E14_SPECIMEN_FORMAT_VERSION}`) {
    throw new Error(`Unsupported E14 specimen format: ${parts[0] ?? '(missing)'}`);
  }
  if (parts[1] !== `s${E14_SPECIMEN_SUBSTRATE.version}`) {
    throw new Error(`Unsupported E14 specimen substrate: ${parts[1] ?? '(missing)'}`);
  }
  const values = new Map();
  for (const token of parts.slice(2)) {
    const index = token.indexOf('=');
    if (index <= 0) throw new Error(`Malformed E14 specimen token: ${token}`);
    const key = token.slice(0, index);
    const value = token.slice(index + 1);
    if (values.has(key)) throw new Error(`Duplicate E14 specimen token: ${key}`);
    values.set(key, value);
  }
  const expectedKeys = new Set(FIELD_ORDER.map(([short]) => short));
  for (const key of values.keys()) {
    if (!expectedKeys.has(key)) throw new Error(`Unknown E14 specimen token: ${key}`);
  }
  if (values.size !== FIELD_ORDER.length) throw new Error('E14 specimen is missing required fields');
  const decoded = {};
  for (const [short, key] of FIELD_ORDER) decoded[key] = values.get(short);
  return normalizeE14Specimen(decoded);
}

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function e14SpecimenId(input) {
  const canonical = serializeE14Specimen(input);
  return `E14C1-${fnv1a32(canonical).toString(16).padStart(8, '0')}`;
}

export function e14SpecimenToSimConfig(input) {
  const specimen = normalizeE14Specimen(input);
  return {
    ...E14_SPECIMEN_SUBSTRATE,
    supportHalf: [...E14_SPECIMEN_SUBSTRATE.supportHalf],
    supportMass: specimen.supportMass,
    friction: specimen.friction,
    acceleration: specimen.acceleration,
    braking: specimen.braking,
    maxBalanceTorque: specimen.maxBalanceTorque,
    policy: specimen.policy,
  };
}

export function readE14SpecimenFromSearch(search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const raw = params.get(E14_SPECIMEN_QUERY_KEY);
  if (!raw) return null;
  return parseE14Specimen(raw);
}

export function writeE14SpecimenToSearch(search, specimen, { locked = false } = {}) {
  const params = search instanceof URLSearchParams
    ? new URLSearchParams(search)
    : new URLSearchParams(search ?? '');
  params.set(E14_SPECIMEN_QUERY_KEY, serializeE14Specimen(specimen));
  if (locked) params.set(E14_SPECIMEN_LOCK_QUERY_KEY, '1');
  else params.delete(E14_SPECIMEN_LOCK_QUERY_KEY);
  return params;
}

export function isE14SpecimenLockedSearch(search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  return params.get(E14_SPECIMEN_LOCK_QUERY_KEY) === '1';
}
