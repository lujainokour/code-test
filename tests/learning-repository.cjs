/* Slice 1: the demo adapter of the learning repository: legacy compatibility, revisions, conflicts, no silent overwrite. */
const assert = require('node:assert/strict');
const domain = require('../js/domain/learning.js');
const { createLearningRepository, UNREADABLE, CONFLICT } = require('../js/data/learning-repository.js');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const KEY = 'codementor-demo-learning';
function fakeStorage(initial) {
    const map = new Map(initial === undefined ? [] : [[KEY, initial]]); let writes = 0;
    return { map, get writes() { return writes; }, getItem: key => (map.has(key) ? map.get(key) : null), setItem(key, value) { writes++; map.set(key, String(value)); } };
}
const repoOn = storage => createLearningRepository({ storage, domain });
const legacyRecord = JSON.stringify({ version: 1, lessons: ['a', 'b'], tasks: ['t'], assessments: { 1: { score: 80, lastScore: 80, kind: 'local-quiz-demo' } }, checks: { a: { correct: true, answer: 1, checkedAt: 'x' } }, taskResults: { t: { passed: 1, total: 1 } }, support: { t: { attempted: true } } });

check('Empty storage reads as an empty progress record with revision 0 and writes nothing', () => {
    const storage = fakeStorage(), repo = repoOn(storage);
    const { progress, revision } = repo.read();
    assert.deepEqual(progress, domain.emptyProgress()); assert.equal(revision, 0); assert.equal(storage.writes, 0);
});

check('A legacy record (no revision field) reads unchanged with revision 0; reading never rewrites it', () => {
    const storage = fakeStorage(legacyRecord), repo = repoOn(storage);
    const { progress, revision } = repo.read({ strict: true });
    assert.equal(revision, 0); assert.deepEqual(progress.lessons, ['a', 'b']); assert.equal(storage.map.get(KEY), legacyRecord); assert.equal(storage.writes, 0);
});

check('update stores revision + 1, keeps every existing field, and returns the saved record', () => {
    const storage = fakeStorage(legacyRecord), repo = repoOn(storage);
    const result = repo.update(p => domain.applySelfCheckedLesson(p, 'c'));
    assert.equal(result.revision, 1); assert.deepEqual(result.progress.lessons, ['a', 'b', 'c']);
    const stored = JSON.parse(storage.map.get(KEY));
    assert.equal(stored.revision, 1); assert.deepEqual(stored.checks, JSON.parse(legacyRecord).checks); assert.deepEqual(stored.taskResults, JSON.parse(legacyRecord).taskResults); assert.deepEqual(stored.support, JSON.parse(legacyRecord).support);
    assert.equal(repo.update(p => domain.applySelfCheckedLesson(p, 'd')).revision, 2, 'revisions increase by one per write');
});

check('Conflict: a stale expectedRevision is refused with code "conflict" and nothing is written', () => {
    const storage = fakeStorage(), repo = repoOn(storage);
    const snapshot = repo.read().revision;                       // a screen opens at revision 0
    repo.update(p => domain.applySelfCheckedLesson(p, 'x'));    // another tab saves
    const before = storage.map.get(KEY), writes = storage.writes;
    assert.throws(() => repo.update(p => domain.applySelfCheckedLesson(p, 'y'), { expectedRevision: snapshot }), error => error.code === 'conflict' && error.message === CONFLICT && error.details.expectedRevision === 0 && error.details.actualRevision === 1);
    assert.equal(storage.map.get(KEY), before); assert.equal(storage.writes, writes);
    assert.equal(repo.update(p => domain.applySelfCheckedLesson(p, 'y'), { expectedRevision: 1 }).revision, 2, 'the current revision is accepted');
});

check('Without expectedRevision the newest stored record is always the base, so another tab\'s data is never overwritten', () => {
    const storage = fakeStorage(), repo = repoOn(storage);
    const stale = repo.read().progress;                          // a page keeps this copy
    repo.update(p => domain.applySelfCheckedLesson(p, 'from-other-tab'));
    repo.update(p => domain.applySelfCheckedLesson(p, 'from-this-tab'));   // the change is applied to the fresh record, not to `stale`
    assert.deepEqual(JSON.parse(storage.map.get(KEY)).lessons, ['from-other-tab', 'from-this-tab']);
    assert.deepEqual(stale.lessons, [], 'the old copy is untouched');
});

check('Unreadable or invalid stored data is never replaced: code "unavailable", the page-specific message is kept', () => {
    for (const bad of ['{not json', JSON.stringify({ version: 2, lessons: [], tasks: [], assessments: {} }), JSON.stringify({ version: 1, lessons: 'x', tasks: [], assessments: {} }), '[]', 'null']) {
        const storage = fakeStorage(bad), repo = repoOn(storage);
        assert.throws(() => repo.read(), error => error.code === 'unavailable' && error.message === UNREADABLE);
        assert.throws(() => repo.update(p => p, { unreadableMessage: 'Custom page message.' }), error => error.code === 'unavailable' && error.message === 'Custom page message.');
        assert.equal(storage.map.get(KEY), bad); assert.equal(storage.writes, 0);
    }
    const strictBad = fakeStorage(JSON.stringify({ version: 1, lessons: [], tasks: [], assessments: { 1: { score: 150 } } }));
    assert.doesNotThrow(() => repoOn(strictBad).read(), 'basic mode accepts what the lesson page accepted');
    assert.throws(() => repoOn(strictBad).read({ strict: true }), error => error.code === 'unavailable');
});

check('If the change, the owner/access check or the result is invalid, nothing is stored', () => {
    const storage = fakeStorage(legacyRecord), repo = repoOn(storage), before = storage.map.get(KEY);
    assert.throws(() => repo.update(() => { throw new Error('rule failed'); }), /rule failed/);
    assert.throws(() => repo.update(p => p, { beforeWrite() { throw new Error('Your account changed.'); } }), /Your account changed/);
    assert.throws(() => repo.update(() => null), error => error.code === 'validation');
    assert.throws(() => repo.update(() => [1]), error => error.code === 'validation');
    assert.equal(storage.map.get(KEY), before); assert.equal(storage.writes, 0);
});

check('beforeWrite runs after the change is computed and before the write (same order as the former pages)', () => {
    const storage = fakeStorage(), repo = repoOn(storage), order = [];
    repo.update(p => { order.push('change'); return p; }, { beforeWrite() { order.push('beforeWrite'); assert.equal(storage.writes, 0); } });
    assert.deepEqual(order, ['change', 'beforeWrite']); assert.equal(storage.writes, 1);
});

check('A revision that is not a non-negative integer is treated as 0 (hand-edited or damaged value)', () => {
    for (const odd of [-3, 1.5, '4', null, 'x']) {
        const storage = fakeStorage(JSON.stringify({ ...domain.emptyProgress(), revision: odd })), repo = repoOn(storage);
        assert.equal(repo.read().revision, 0);
        assert.equal(repo.update(p => p).revision, 1);
    }
});

check('The repository needs a storage facade and the domain', () => {
    assert.throws(() => createLearningRepository({}), /required/);
});

console.log(`${count} learning repository checks passed.`);
