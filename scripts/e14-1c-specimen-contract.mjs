import assert from 'node:assert/strict';
import { E14_AUTHORITY_POLICIES } from '../src/e14-authority-kernel.js';
import { E14_DEFAULTS } from '../src/e14-continuous-sim.js';
import {
  E14_SPECIMEN_LOCK_QUERY_KEY,
  E14_SPECIMEN_QUERY_KEY,
  E14_SPECIMEN_SUBSTRATE,
  e14SpecimenId,
  e14SpecimenToSimConfig,
  isE14SpecimenLockedSearch,
  normalizeE14Specimen,
  parseE14Specimen,
  readE14SpecimenFromSearch,
  serializeE14Specimen,
  writeE14SpecimenToSearch,
} from '../src/e14-specimen-config.js';

const reference = {
  supportMass: 800,
  friction: 0.95,
  acceleration: 31,
  braking: 36,
  maxBalanceTorque: 320,
  policy: E14_AUTHORITY_POLICIES.ENTITLED_RECIPROCAL,
};

const canonical = 'e14c1|s1|m=800|f=0.95|a=31|b=36|t=320|p=entitled-reciprocal';
assert.equal(serializeE14Specimen(reference), canonical, 'canonical specimen serialization drifted');
assert.deepEqual(parseE14Specimen(canonical), normalizeE14Specimen(reference), 'canonical roundtrip failed');
assert.equal(e14SpecimenId(reference), 'E14C1-befd707b', 'stable specimen identity drifted');
assert.equal(e14SpecimenId(parseE14Specimen(canonical)), e14SpecimenId(reference), 'ID must survive roundtrip');

const search = writeE14SpecimenToSearch('?mode=e14lab&unrelated=keep', reference, { locked: true });
assert.equal(search.get('mode'), 'e14lab');
assert.equal(search.get('unrelated'), 'keep');
assert.equal(search.get(E14_SPECIMEN_QUERY_KEY), canonical);
assert.equal(search.get(E14_SPECIMEN_LOCK_QUERY_KEY), '1');
assert.equal(isE14SpecimenLockedSearch(search), true);
assert.deepEqual(readE14SpecimenFromSearch(search), normalizeE14Specimen(reference));

const unlocked = writeE14SpecimenToSearch(search, reference, { locked: false });
assert.equal(unlocked.has(E14_SPECIMEN_LOCK_QUERY_KEY), false, 'unlock must remove lock marker');

for (const invalid of [
  { ...reference, supportMass: 0 },
  { ...reference, friction: Number.NaN },
  { ...reference, acceleration: Number.POSITIVE_INFINITY },
  { ...reference, braking: 999 },
  { ...reference, maxBalanceTorque: -1 },
  { ...reference, policy: 'ground-mode' },
]) {
  assert.throws(() => normalizeE14Specimen(invalid));
}
assert.throws(() => parseE14Specimen('e14c0|s1|m=800|f=.95|a=31|b=36|t=320|p=entitled-reciprocal'));
assert.throws(() => parseE14Specimen(`${canonical}|x=surprise`));
assert.throws(() => parseE14Specimen(canonical.replace('|t=320', '')));

const simConfig = e14SpecimenToSimConfig(reference);
assert.deepEqual(simConfig.supportHalf, [...E14_SPECIMEN_SUBSTRATE.supportHalf]);
for (const key of ['dt', 'substeps', 'gravity', 'playerMass', 'maxSpeed', 'referenceFriction', 'preparationFrames', 'settleFrames']) {
  assert.equal(simConfig[key], E14_SPECIMEN_SUBSTRATE[key], `specimen substrate ${key} missing from sim config`);
  assert.equal(E14_SPECIMEN_SUBSTRATE[key], E14_DEFAULTS[key], `versioned specimen substrate ${key} drifted from current E14 implementation`);
}
assert.deepEqual([...E14_SPECIMEN_SUBSTRATE.supportHalf], [...E14_DEFAULTS.supportHalf], 'versioned support geometry drifted');
assert.equal(simConfig.policy, reference.policy);
assert.equal(simConfig.supportMass, reference.supportMass);

console.log(JSON.stringify({
  status: 'PASS',
  contract: 'E14.1C versioned pinned specimen configuration',
  canonical,
  specimenId: e14SpecimenId(reference),
  substrate: E14_SPECIMEN_SUBSTRATE,
}, null, 2));
