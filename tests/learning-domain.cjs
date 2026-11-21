/* Slice 1: pure learning rules. Every rule is compared with a verbatim copy of the code it replaced
   (python-curriculum.js, level-assessment.js, workspace.js, lesson.js, workspace-support.js), over many generated states,
   so "no user-visible change" is checked rather than assumed. */
const assert = require('node:assert/strict');
const domain = require('../js/domain/learning.js');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }

// ---------- verbatim legacy implementations ----------
const legacy = {
    completed: (level, progress) => level.lessons.every(item => progress.lessons.includes(item.id)) && Number.isFinite(progress.assessments[level.id]?.score) && progress.assessments[level.id].score >= 70,
    make(levels, choice) {
        const completed = legacy.completed;
        const placedOut = (level, progress) => !completed(level, progress) && level.id < (choice?.startLevel || 1);
        const available = (level, progress) => {
            if (!choice) return levels.filter(value => value.id < level.id).every(value => completed(value, progress));
            const highestRealCompletion = Math.max(0, ...levels.filter(value => completed(value, progress)).map(value => value.id));
            return level.id <= Math.max(choice.startLevel, highestRealCompletion + 1);
        };
        const current = progress => {
            const start = choice?.startLevel || 1;
            return levels.find(level => level.id >= start && !completed(level, progress)) || levels.find(level => !completed(level, progress)) || levels[levels.length - 1];
        };
        return { placedOut, available, current };
    },
    quiz(questions, answers, progress, levelId, now) {
        const score = Math.round(answers.filter((answer, index) => answer === questions[index].correct).length / questions.length * 100);
        const previous = progress.assessments[levelId] || {};
        const updated = { ...progress, assessments: { ...progress.assessments, [levelId]: { ...previous, score: Math.max(previous.score || 0, score), lastScore: score, answers, bestAnswers: score >= (previous.score || 0) ? answers : previous.bestAnswers || previous.answers, kind: 'local-quiz-demo', submittedAt: now } } };
        return { score, updated };
    },
    task(progressIn, task, taskId, passed, cases, solution, now) {
        const progress = JSON.parse(JSON.stringify(progressIn));
        if (passed === task.tests.length && !progress.tasks.includes(taskId)) progress.tasks.push(taskId);
        progress.taskResults = { ...progress.taskResults, [taskId]: { passed, total: task.tests.length, cases, code: solution, submittedAt: now } };
        if (passed === task.tests.length) progress.submissions = { ...progress.submissions, [taskId]: { code: solution, passed, total: task.tests.length, submittedAt: progress.taskResults[taskId].submittedAt } };
        return progress;
    },
    check(progressIn, lessonId, correct, answer, now) {
        const progress = JSON.parse(JSON.stringify(progressIn));
        progress.checks = { ...progress.checks, [lessonId]: { correct, answer, checkedAt: now } };
        if (correct && !progress.lessons.includes(lessonId)) progress.lessons.push(lessonId);
        return progress;
    },
    self(progressIn, lessonId) { const progress = JSON.parse(JSON.stringify(progressIn)); if (!progress.lessons.includes(lessonId)) progress.lessons.push(lessonId); return progress; },
    support(progressIn, id, change) { const progress = JSON.parse(JSON.stringify(progressIn)); progress.support = { ...progress.support, [id]: { ...progress.support?.[id], ...change } }; return progress; }
};

// ---------- deterministic generator ----------
let seed = 20261121; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = list => list[Math.floor(rnd() * list.length)];
const levels = [1, 2, 3, 4, 5, 6].map(id => ({ id, lessons: [1, 2, 3, 4].map(n => ({ id: `l${id}-${n}` })) }));
const allLessonIds = levels.flatMap(level => level.lessons.map(lesson => lesson.id));
function randomProgress() {
    const progress = { version: 1, lessons: allLessonIds.filter(() => rnd() < 0.55), tasks: ['t1', 't2'].filter(() => rnd() < 0.5), assessments: {} };
    for (const level of levels) if (rnd() < 0.6) progress.assessments[level.id] = { score: pick([0, 25, 50, 69, 70, 75, 100]) };
    return progress;
}
const clone = value => JSON.parse(JSON.stringify(value));

check('Level rules (completed / placed out / available / current) equal the former python-curriculum.js over 3,000 generated states', () => {
    for (let i = 0; i < 500; i++) {
        const progress = randomProgress();
        for (const choice of [null, { startLevel: 1 }, { startLevel: 3 }, { startLevel: 5 }]) {
            const old = legacy.make(levels, choice);
            for (const level of levels) {
                assert.equal(domain.isLevelCompleted(level, progress), legacy.completed(level, progress));
                assert.equal(domain.isPlacedOut(level, progress, choice), old.placedOut(level, progress));
                assert.equal(domain.isLevelAvailable(levels, level, progress, choice), old.available(level, progress));
            }
            assert.equal(domain.currentLevel(levels, progress, choice).id, old.current(progress).id);
        }
    }
});

check('Pass mark boundary: 69 does not complete a level, 70 does; missing lessons never complete it', () => {
    const full = { version: 1, lessons: levels[0].lessons.map(l => l.id), tasks: [], assessments: { 1: { score: 69 } } };
    assert.equal(domain.isLevelCompleted(levels[0], full), false);
    full.assessments[1].score = 70; assert.equal(domain.isLevelCompleted(levels[0], full), true);
    full.lessons.pop(); assert.equal(domain.isLevelCompleted(levels[0], full), false);
    assert.equal(domain.PASS_MARK, 70);
});

check('Progress validation: basic and strict modes match the former per-page checks', () => {
    assert.equal(domain.validateProgress(domain.emptyProgress()), true);
    assert.equal(domain.validateProgress(null), false); assert.equal(domain.validateProgress([]), false);
    assert.equal(domain.validateProgress({ version: 2, lessons: [], tasks: [], assessments: {} }), false);
    assert.equal(domain.validateProgress({ version: 1, lessons: {}, tasks: [], assessments: {} }), false);
    assert.equal(domain.validateProgress({ version: 1, lessons: [], tasks: [], assessments: [] }), false);
    const odd = { version: 1, lessons: [1], tasks: [], assessments: { 1: { score: 'x' } } };
    assert.equal(domain.validateProgress(odd, 'basic'), true, 'basic never inspected the contents');
    assert.equal(domain.validateProgress(odd, 'strict'), false);
    assert.equal(domain.validateProgress({ version: 1, lessons: [], tasks: [], assessments: { 1: { score: 101 } } }, 'strict'), false);
    assert.equal(domain.validateProgress({ version: 1, lessons: ['a'], tasks: ['b'], assessments: { 1: { score: 100, extra: true } }, revision: 7, checks: {} }, 'strict'), true, 'extra fields (revision, checks, ...) are accepted');
});

check('Quiz: scoring and the stored attempt equal the former level-assessment.js; best score never decreases', () => {
    const questions = [0, 1, 2, 3].map(n => ({ correct: n % 3 }));
    for (let i = 0; i < 300; i++) {
        const progress = randomProgress(), levelId = String(pick([1, 2, 3])), answers = questions.map(() => pick([0, 1, 2, 3]));
        const now = '2026-11-21T10:00:00.000Z';
        const old = legacy.quiz(questions, answers, progress, levelId, now);
        const scored = domain.scoreQuiz(questions, answers);
        assert.equal(scored.score, old.score); assert.equal(scored.passed, old.score >= 70); assert.equal(scored.total, 4);
        const before = clone(progress);
        const next = domain.applyQuizAttempt(progress, levelId, { answers, score: scored.score, now });
        assert.deepEqual(next, old.updated); assert.deepEqual(progress, before, 'input was not mutated');
        assert.ok((next.assessments[levelId].score) >= (progress.assessments[levelId]?.score || 0));
    }
});

check('Lessons: check and self-checked completion equal the former lesson.js; evidence is derived, never promoted', () => {
    for (let i = 0; i < 300; i++) {
        const progress = randomProgress(), id = pick(allLessonIds), correct = rnd() < 0.5, answer = pick([0, 1, 2]), now = '2026-11-21T09:00:00.000Z';
        const before = clone(progress);
        assert.deepEqual(domain.applyLessonCheck(progress, id, { correct, answer, now }), legacy.check(progress, id, correct, answer, now));
        assert.deepEqual(domain.applySelfCheckedLesson(progress, id), legacy.self(progress, id));
        assert.deepEqual(progress, before, 'input was not mutated');
    }
    const base = domain.emptyProgress();
    const wrong = domain.applyLessonCheck(base, 'a', { correct: false, answer: 1, now: 'x' });
    assert.deepEqual(wrong.lessons, [], 'a wrong answer does not complete the lesson');
    assert.equal(domain.lessonEvidence(wrong, 'a'), null);
    const self = domain.applySelfCheckedLesson(wrong, 'a');
    assert.equal(domain.lessonEvidence(self, 'a'), 'self_checked', 'a failed check followed by the button stays self-checked');
    const passed = domain.applyLessonCheck(base, 'b', { correct: true, answer: 0, now: 'x' });
    assert.equal(domain.lessonEvidence(passed, 'b'), 'check_passed');
    assert.equal(domain.lessonEvidence({ ...base, lessons: ['legacy'] }, 'legacy'), 'self_checked', 'legacy records without a check are never treated as assessed');
    assert.equal(domain.lessonEvidence(self, 'missing'), null);
    assert.equal(domain.applySelfCheckedLesson(self, 'a').lessons.length, 1, 'completing twice stores one record');
});

check('Quiz unlock: all lessons of the level must be complete', () => {
    const level = levels[1];
    assert.equal(domain.quizUnlocked(level.lessons, { lessons: level.lessons.map(l => l.id).slice(1) }), false);
    assert.equal(domain.quizUnlocked(level.lessons, { lessons: level.lessons.map(l => l.id) }), true);
});

check('Coding tasks: output normalisation, case grading and the stored attempt equal the former workspace.js', () => {
    const normalizeLegacy = text => text.replace(/\r\n/g, '\n').trimEnd();
    for (const [a, b, ok] of [['3\r\n', '3', true], ['3  \n\n', '3', true], [' 3', '3', false], ['a\nb', 'a\r\nb', true], ['', '', true]]) {
        assert.equal(domain.normalizeOutput(a), normalizeLegacy(a));
        assert.equal(domain.isCaseCorrect({ output: a }, { output: b }), ok);
    }
    assert.equal(domain.isCaseCorrect({ output: '3', error: 'boom' }, { output: '3' }), false, 'a runtime error is never a pass');
    const task = { tests: [{ output: '1' }, { output: '2' }, { output: '3' }] };
    for (let i = 0; i < 200; i++) {
        const progress = randomProgress(), passed = pick([0, 1, 2, 3]), cases = [{ passed: true }], now = '2026-11-21T11:00:00.000Z', taskId = pick(['t1', 't3']);
        const before = clone(progress);
        assert.deepEqual(domain.applyTaskResult(progress, taskId, { passed, total: task.tests.length, cases, code: 'print(1)', now }), legacy.task(progress, task, taskId, passed, cases, 'print(1)', now));
        assert.deepEqual(progress, before, 'input was not mutated');
    }
    const partial = domain.applyTaskResult(domain.emptyProgress(), 't', { passed: 2, total: 3, cases: [], code: 'x', now: 'n' });
    assert.deepEqual(partial.tasks, []); assert.equal(partial.submissions, undefined, 'a partial pass is recorded but never submitted');
    assert.equal(partial.taskResults.t.passed, 2);
});

check('Task support notes (hints used, attempted) equal the former workspace-support.js and keep earlier values', () => {
    for (let i = 0; i < 100; i++) {
        const progress = { ...randomProgress(), support: rnd() < 0.5 ? { t1: { hintsUsed: 1, attempted: true } } : undefined };
        const change = pick([{ hintsUsed: 2 }, { attempted: true }, { solutionOpened: true }]);
        assert.deepEqual(domain.applySupport(progress, 't1', change), legacy.support(progress, 't1', change));
    }
    assert.deepEqual(domain.applySupport({ ...domain.emptyProgress(), support: { t1: { hintsUsed: 1, attempted: true } } }, 't1', { hintsUsed: 2 }).support.t1, { hintsUsed: 2, attempted: true });
});

check('Extra stored fields survive every change (nothing is dropped when a record carries newer data)', () => {
    const rich = { ...domain.emptyProgress(), revision: 9, futureField: { keep: true }, checks: { a: { correct: true, answer: 0, checkedAt: 'x' } } };
    for (const next of [domain.applySelfCheckedLesson(rich, 'z'), domain.applyQuizAttempt(rich, '1', { answers: [0], score: 10, now: 'n' }), domain.applyTaskResult(rich, 't', { passed: 0, total: 1, cases: [], code: '', now: 'n' }), domain.applySupport(rich, 't', { attempted: true }), domain.applyLessonCheck(rich, 'q', { correct: false, answer: 1, now: 'n' })]) {
        assert.deepEqual(next.futureField, { keep: true }); assert.equal(next.revision, 9); assert.equal(next.checks.a.correct, true);
    }
});

console.log(`${count} learning domain checks passed.`);
