/* Slice 2: onboarding state, starting plan, dashboard guidance line and placement explanation (pure rules + repository). */
const assert = require('node:assert/strict');
const domain = require('../js/domain/onboarding.js');
const { createOnboardingRepository, UNREADABLE } = require('../js/data/onboarding-repository.js');
const engine = require('../js/placement-engine.js');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const known = id => ['python', 'javascript', 'csharp'].includes(id);
const NOW = '2026-11-21T12:00:00.000Z', LATER = '2026-11-22T12:00:00.000Z';
const full = { language: 'python', experience: 'practising', goal: 'projects' };
const python = { id: 'python', name: 'Python', ready: true }, csharp = { id: 'csharp', name: 'C#', ready: false };
const alternatives = [{ id: 'python', name: 'Python' }, { id: 'javascript', name: 'JavaScript' }];
const plan = overrides => domain.planFor({ track: python, experience: 'beginner', goal: 'foundations', confirmed: true, lessonsDone: 0, placement: { available: true, state: 'missing', maxSkip: 2 }, alternatives, ...overrides });

// ---------- completion state ----------
check('Brand-new student: nothing saved is not_started', () => {
    const s = domain.statusOf({ record: null, draft: null, knownLanguage: known });
    assert.equal(s.status, 'not_started'); assert.equal(s.answered, 0); assert.deepEqual(s.missing, ['language', 'experience', 'goal']);
});

check('Interrupted onboarding: a partial draft is in_progress and lists what is missing; invalid draft values are ignored', () => {
    const s = domain.statusOf({ record: null, draft: { language: 'python', experience: 'practising', updatedAt: NOW }, knownLanguage: known });
    assert.equal(s.status, 'in_progress'); assert.equal(s.answered, 2); assert.deepEqual(s.missing, ['goal']);
    const junk = domain.statusOf({ record: null, draft: { language: 'cobol', experience: 'expert', goal: 5 }, knownLanguage: known });
    assert.equal(junk.status, 'not_started'); assert.equal(junk.answered, 0);
    assert.equal(domain.statusOf({ record: null, draft: 'text', knownLanguage: known }).status, 'not_started');
});

check('Explicit completion needs a valid completedAt; the record is completed / explicit', () => {
    const s = domain.statusOf({ record: { ...full, completedAt: NOW }, draft: null, knownLanguage: known });
    assert.deepEqual([s.status, s.source, s.completedAt, s.confirmed], ['completed', 'explicit', NOW, true]);
    const bad = domain.statusOf({ record: { ...full, completedAt: 'not a date' }, draft: null, knownLanguage: known });
    assert.equal(bad.source, 'legacy', 'an invalid completedAt is ignored, never trusted');
});

check('Old users: a valid record without completedAt stays completed (legacy) and is never asked to repeat', () => {
    const legacy = { language: 'python', experience: 'beginner', goal: 'foundations' };
    const s = domain.statusOf({ record: legacy, draft: null, knownLanguage: known });
    assert.deepEqual([s.status, s.source, s.completedAt, s.confirmed], ['completed', 'legacy', null, true]);
    const withDraft = domain.statusOf({ record: legacy, draft: { goal: 'projects' }, knownLanguage: known });
    assert.equal(withDraft.status, 'completed', 'a leftover draft never reopens a completed onboarding');
});

check('A record created from a language choice alone (defaults) is completed but unconfirmed', () => {
    const s = domain.statusOf({ record: { language: 'javascript', experience: 'beginner', goal: 'foundations', answersDefaulted: true }, draft: null, knownLanguage: known });
    assert.deepEqual([s.status, s.confirmed], ['completed', false]);
});

check('Corrupted or invalid records are unreadable and never repaired', () => {
    for (const record of [{}, { language: 'python' }, { language: 'cobol', experience: 'beginner', goal: 'foundations' }, { language: 'python', experience: 'expert', goal: 'foundations' }, 'text', [], 7]) {
        assert.equal(domain.statusOf({ record, draft: null, knownLanguage: known }).status, 'unreadable', JSON.stringify(record));
    }
});

check('Draft answers and completion: invalid answers are rejected, completion keeps unknown fields and the FIRST completedAt', () => {
    assert.throws(() => domain.applyDraftAnswer(null, 'experience', 'expert', NOW, known), /listed options/);
    assert.throws(() => domain.applyDraftAnswer(null, 'language', 'cobol', NOW, known), /listed options/);
    let draft = domain.applyDraftAnswer(null, 'language', 'python', NOW, known);
    draft = domain.applyDraftAnswer(draft, 'experience', 'basics', NOW, known);
    assert.deepEqual(draft, { language: 'python', experience: 'basics', updatedAt: NOW });
    assert.throws(() => domain.completeRecord(null, draft, NOW, known), /Choose a language, your experience and your learning goal/);
    const first = domain.completeRecord({ futureField: { keep: true }, answersDefaulted: true }, { ...draft, goal: 'foundations' }, NOW, known);
    assert.deepEqual(first, { futureField: { keep: true }, language: 'python', experience: 'basics', goal: 'foundations', completedAt: NOW, updatedAt: NOW });
    const again = domain.completeRecord(first, { language: 'javascript', experience: 'practising', goal: 'projects' }, LATER, known);
    assert.equal(again.completedAt, NOW, 'completedAt records the first completion'); assert.equal(again.updatedAt, LATER); assert.equal(again.language, 'javascript');
});

// ---------- starting plan ----------
check('Beginner: start Level 1; the placement check is only an optional second action', () => {
    const p = plan({ experience: 'beginner' });
    assert.equal(p.primary.id, 'start-level-1'); assert.equal(p.primary.target, 'learning-path');
    assert.deepEqual(p.secondary.map(a => a.id), ['placement']); assert.match(p.reasons[0], /just starting/);
});

check('Experienced students (basics / practising): placement is the one primary action, with a way to skip it', () => {
    for (const experience of ['basics', 'practising']) {
        const p = plan({ experience });
        assert.equal(p.primary.id, 'placement'); assert.equal(p.primary.target, 'placement-intro');
        assert.equal(p.secondary[0].id, 'start-level-1', 'never forced to take it');
        assert.ok(p.reasons.some(r => /at most 2 levels/.test(r)));
    }
    assert.match(plan({ experience: 'practising' }).reasons[0], /avoid repeating/);
});

check('Goals add one deterministic line and at most one extra secondary action; at most two secondary actions in total', () => {
    assert.match(plan({ goal: 'foundations' }).reasons[1], /build foundations/);
    assert.match(plan({ goal: 'problem-solving' }).reasons[1], /coding task in Practice/);
    assert.match(plan({ goal: 'projects' }).reasons[1], /final project/);
    assert.ok(plan({ goal: 'problem-solving', experience: 'basics' }).secondary.some(a => a.id === 'browse-practice'));
    assert.ok(plan({ goal: 'projects', experience: 'basics' }).secondary.some(a => a.id === 'see-project'));
    for (const experience of ['beginner', 'basics', 'practising']) for (const goal of ['foundations', 'problem-solving', 'projects']) assert.ok(plan({ experience, goal }).secondary.length <= 2);
});

check('Existing activity and placement state decide the single next action (no repeated steps)', () => {
    assert.equal(plan({ experience: 'practising', lessonsDone: 3 }).primary.id, 'continue');
    assert.equal(plan({ experience: 'practising', placement: { available: true, state: 'submitted', applied: false } }).primary.id, 'review-placement');
    assert.equal(plan({ experience: 'practising', placement: { available: true, state: 'submitted', applied: true } }).primary.target, 'learning-path');
    assert.equal(plan({ experience: 'basics', placement: { available: true, state: 'in-progress' } }).primary.id, 'resume-placement');
    assert.equal(plan({ experience: 'practising', placement: { available: false, state: 'missing' } }).primary.id, 'start-level-1', 'a track without a placement bank goes straight to Level 1');
});

check('Unavailable tracks are labelled coming soon, never offered a path, and point to ready tracks', () => {
    const p = plan({ track: csharp, experience: 'practising' });
    assert.equal(p.headline, 'C# is coming soon'); assert.equal(p.trackNotice, 'C#: coming soon');
    assert.equal(p.primary.id, 'see-availability'); assert.equal(p.primary.language, 'csharp');
    assert.deepEqual(p.secondary.map(a => [a.id, a.language]), [['switch-track', 'python'], ['switch-track', 'javascript']]);
    assert.match(p.reasons.join(' '), /Python and JavaScript are ready/);
});

check('Unconfirmed (defaulted) answers are never used to personalise', () => {
    const p = plan({ confirmed: false, experience: 'practising', goal: 'projects' });
    assert.equal(p.primary.id, 'start-level-1'); assert.match(p.reasons[0], /Tell us your experience and goal/);
    assert.equal(domain.guidanceLine({ experience: 'practising', goal: 'projects', confirmed: false }), null);
});

check('Dashboard guidance line: one deterministic sentence for each answer pair, none for unavailable tracks or bad data', () => {
    const lines = new Set();
    for (const experience of Object.keys(domain.EXPERIENCES)) for (const goal of Object.keys(domain.GOALS)) { const line = domain.guidanceLine({ experience, goal }); assert.match(line, /^Your plan: .+\.$/); lines.add(line); }
    assert.equal(lines.size, 9);
    assert.equal(domain.guidanceLine({ experience: 'beginner', goal: 'foundations', trackReady: false }), null);
    assert.equal(domain.guidanceLine({ experience: 'expert', goal: 'foundations' }), null);
});

// ---------- placement explanation (uses the real placement engine) ----------
function bankOf(levels, topicsPerLevel) {
    const questions = []; for (let level = 1; level <= levels; level++) for (let t = 1; t <= topicsPerLevel; t++) for (let n = 0; n < 2; n++) questions.push({ id: `q-${level}-${t}-${n}`, level, topic: `topic-${level}.${t}`, title: 't', code: 'c', options: ['a', 'b', 'c'], correct: 0, explanation: 'e' });
    return { id: 'python', version: 1, levelCount: levels, questions };
}
function evaluation(levels, correctLevels, partial = {}) {
    const bank = bankOf(levels, 2);
    const answers = bank.questions.map(q => (correctLevels.includes(q.level) && partial[q.topic] !== 'wrong' ? 0 : partial[q.topic] === 'half' && q.id.endsWith('-0') ? 0 : 1));
    return engine.evaluate(bank, { version: 1, status: 'submitted', answers, languageId: 'python', bankVersion: 1 });
}
check('Placement explanation: all levels failed -> Level 1 with the weak topics named', () => {
    const e = evaluation(4, []), x = domain.explainPlacement(e);
    assert.equal(e.recommendedStart, 1); assert.equal(x.headline, 'Why Level 1?');
    assert.ok(x.lines.length >= 2 && x.lines.every(line => /^Level 1: topic-1\.\d scored 0%, below the 75% needed, so you start here\.$/.test(line)));
    assert.match(x.summary, /Nothing is placed out/);
});
check('Placement explanation: Level 1 passed, Level 2 missed -> start at Level 2 and say which topic', () => {
    const e = evaluation(4, [1]), x = domain.explainPlacement(e);
    assert.equal(e.recommendedStart, 2); assert.equal(x.headline, 'Why Level 2?');
    assert.equal(x.lines[0], 'Level 1: every topic reached 75% or more, so you are placed out of it.');
    assert.ok(x.lines.some(line => /^Level 2: topic-2\.\d scored 0%, below the 75% needed/.test(line)));
    assert.match(x.summary, /^Level 1 is placed out, not completed./);
});
check('Placement explanation: the skip cap is explained when the student would pass more levels', () => {
    const e = evaluation(4, [1, 2, 3, 4]), x = domain.explainPlacement(e);
    assert.equal(e.recommendedStart, 3, 'the engine policy is unchanged (max skip 2)');
    assert.deepEqual(x.lines.slice(0, 2), ['Level 1: every topic reached 75% or more, so you are placed out of it.', 'Level 2: every topic reached 75% or more, so you are placed out of it.']);
    assert.match(x.lines[2], /At most 2 levels can be placed out, so you start at Level 3, even though its topics also reached the threshold/);
    assert.match(x.summary, /Levels 1, 2 are placed out, not completed/);
});
check('Placement explanation: boundary at the threshold (75% meets, 50% does not)', () => {
    const synthetic = { recommendedStart: 2, threshold: 75, maxSkip: 2, topicScores: [{ level: 1, topic: 'a', correct: 3, total: 4, percentage: 75, meetsThreshold: true }, { level: 2, topic: 'b', correct: 2, total: 4, percentage: 50, meetsThreshold: false }] };
    const x = domain.explainPlacement(synthetic);
    assert.deepEqual(x.lines, ['Level 1: every topic reached 75% or more, so you are placed out of it.', 'Level 2: b scored 50%, below the 75% needed, so you start here.']);
});

// ---------- repository (demo adapter) ----------
function fakeStorage(initial = {}) {
    const map = new Map(Object.entries(initial)); const writes = [];
    return { map, writes, getItem: key => (map.has(key) ? map.get(key) : null), setItem(key, value) { writes.push(key); map.set(key, String(value)); }, removeItem(key) { writes.push('remove:' + key); map.delete(key); } };
}
const repoOn = storage => createOnboardingRepository({ storage, domain, knownLanguage: known });
const RK = 'codementor-demo-onboarding', DK = 'codementor-demo-onboarding-draft';

check('Repository: draft answers are stored only in the draft key; the main record is untouched until completion', () => {
    const storage = fakeStorage(), repo = repoOn(storage);
    repo.saveDraftAnswer('language', 'python', { now: NOW }); const r = repo.saveDraftAnswer('experience', 'basics', { now: NOW });
    assert.equal(r.state.status, 'in_progress'); assert.equal(storage.map.has(RK), false); assert.equal(JSON.parse(storage.map.get(DK)).experience, 'basics');
    repo.saveDraftAnswer('goal', 'foundations', { now: NOW });
    assert.equal(storage.map.has(RK), false, 'even a fully answered draft is not a record until the student finishes');
    const done = repo.complete({ language: 'python', experience: 'basics', goal: 'foundations' }, { now: LATER });
    assert.equal(done.state.status, 'completed'); assert.equal(done.state.source, 'explicit'); assert.equal(storage.map.has(DK), false, 'the draft is removed');
    assert.deepEqual(JSON.parse(storage.map.get(RK)), { language: 'python', experience: 'basics', goal: 'foundations', completedAt: LATER, updatedAt: LATER });
});

check('Repository: resume reads the saved draft after a reload', () => {
    const storage = fakeStorage({ [DK]: JSON.stringify({ language: 'javascript', goal: 'projects', updatedAt: NOW }) });
    const { state, draft } = repoOn(storage).read();
    assert.deepEqual([state.status, state.answered, state.missing], ['in_progress', 2, ['experience']]); assert.equal(draft.goal, 'projects');
});

check('Repository: existing stored profiles are read unchanged and keep working (legacy), with unknown fields preserved on edit', () => {
    const legacy = JSON.stringify({ language: 'python', experience: 'practising', goal: 'projects', extra: { x: 1 } }), storage = fakeStorage({ [RK]: legacy }), repo = repoOn(storage);
    const before = repo.read(); assert.equal(before.state.source, 'legacy'); assert.equal(storage.map.get(RK), legacy); assert.equal(storage.writes.length, 0, 'reading never writes');
    repo.updateAnswer('goal', 'foundations', { now: NOW });
    assert.deepEqual(JSON.parse(storage.map.get(RK)), { language: 'python', experience: 'practising', goal: 'foundations', extra: { x: 1 }, updatedAt: NOW });
    assert.throws(() => repo.updateAnswer('goal', 'nope', { now: NOW }), /listed options/);
});

check('Repository: missing or corrupted data never overwrites a record', () => {
    for (const bad of ['{broken', JSON.stringify({ language: 'python' }), JSON.stringify([]), JSON.stringify({ language: 'cobol', experience: 'beginner', goal: 'foundations' })]) {
        const storage = fakeStorage({ [RK]: bad }), repo = repoOn(storage);
        assert.equal(repo.read().state.status, 'unreadable');
        assert.throws(() => repo.complete(full, { now: NOW }), error => error.message === UNREADABLE);
        assert.throws(() => repo.saveDraftAnswer('goal', 'projects', { now: NOW }), error => error.message === UNREADABLE);
        assert.throws(() => repo.updateAnswer('goal', 'projects', { now: NOW }), error => error.message === UNREADABLE);
        assert.equal(storage.map.get(RK), bad); assert.equal(storage.writes.length, 0);
    }
    const noRecord = fakeStorage({ [DK]: '{bad draft' }), repo = repoOn(noRecord);
    const read = repo.read(); assert.equal(read.draftCorrupt, true); assert.equal(read.state.status, 'not_started');
    repo.saveDraftAnswer('language', 'python', { now: NOW }); assert.equal(JSON.parse(noRecord.map.get(DK)).language, 'python', 'a corrupt draft is replaced by the next answer');
});

check('Repository: the owner check runs before every write and blocks it', () => {
    const storage = fakeStorage(), repo = repoOn(storage), stop = () => { throw new Error('Your account changed.'); };
    assert.throws(() => repo.saveDraftAnswer('language', 'python', { now: NOW, beforeWrite: stop }), /account changed/);
    assert.throws(() => repo.complete(full, { now: NOW, beforeWrite: stop }), /account changed/);
    assert.equal(storage.writes.length, 0);
});

check('Repository: python and javascript both complete; the language is stored as chosen', () => {
    for (const language of ['python', 'javascript']) {
        const storage = fakeStorage(), repo = repoOn(storage);
        assert.equal(repo.complete({ language, experience: 'beginner', goal: 'foundations' }, { now: NOW }).record.language, language);
    }
});

check('Repository: a completed record that is completed again keeps the first completedAt', () => {
    const storage = fakeStorage(), repo = repoOn(storage);
    repo.complete(full, { now: NOW }); repo.complete({ ...full, goal: 'foundations' }, { now: LATER });
    const record = JSON.parse(storage.map.get(RK)); assert.equal(record.completedAt, NOW); assert.equal(record.goal, 'foundations');
});

console.log(`${count} onboarding checks passed.`);
