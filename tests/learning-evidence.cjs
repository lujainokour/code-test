/* Slice 3: lesson evidence kinds, quiz attempt history, level summary and student feedback (pure domain rules). */
const assert = require('node:assert/strict');
const domain = require('../js/domain/learning.js');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const clone = value => JSON.parse(JSON.stringify(value));
const T = n => `2026-11-21T10:0${n}:00.000Z`;

const levels = [1, 2, 3].map(id => ({ id, title: `Level ${id}`, lessons: ['a', 'b', 'c', 'd'].map(n => ({ id: `l${id}${n}`, title: `Lesson ${id}${n}` })), tasks: [`t${id}1`, `t${id}2`] }));
const level1 = levels[0];
const taskTopics = { t11: ['l1a', 'l1b'], t12: ['l1c'], t21: ['l2a'] };
const questions = [0, 1, 2, 3].map(n => ({ correct: n }));
const answersWith = rightCount => questions.map((question, index) => (index < rightCount ? question.correct : (question.correct + 1) % 4));
const quiz = (progress, levelId, rightCount, now, extra = {}) => {
    const answers = answersWith(rightCount), scored = domain.scoreQuiz(questions, answers);
    return domain.applyQuizAttempt(progress, levelId, { answers, score: scored.score, now, total: scored.total, correct: scored.correct, ...extra });
};
const empty = () => domain.emptyProgress();
const withLessons = (progress, ids) => ({ ...progress, lessons: [...progress.lessons, ...ids] });

// ---------- evidence kinds ----------
check('A lesson that is not complete has no evidence', () => {
    assert.deepEqual(domain.lessonEvidenceKinds(empty(), 'l1a', taskTopics), []);
    assert.equal(domain.lessonEvidence(empty(), 'l1a', taskTopics), null);
});

check('Self-checked: "mark complete" without a passed check or task is self_checked and is not assessed', () => {
    const progress = domain.applySelfCheckedLesson(empty(), 'l1a');
    assert.equal(domain.lessonEvidence(progress, 'l1a', taskTopics), 'self_checked');
    assert.equal(domain.isAssessedEvidence('self_checked'), false);
    const afterWrong = domain.applySelfCheckedLesson(domain.applyLessonCheck(empty(), 'l1b', { correct: false, answer: 0, now: T(1) }), 'l1b');
    assert.equal(domain.lessonEvidence(afterWrong, 'l1b'), 'self_checked', 'a failed check followed by the button stays self-checked');
});

check('check_passed: a correct lesson check is assessed evidence', () => {
    const progress = domain.applyLessonCheck(empty(), 'l1a', { correct: true, answer: 2, now: T(1) });
    assert.equal(domain.lessonEvidence(progress, 'l1a'), 'check_passed'); assert.equal(domain.isAssessedEvidence('check_passed'), true);
});

check('task_passed: a passed coding task that covers the lesson counts for completed lessons only', () => {
    let progress = domain.applySelfCheckedLesson(empty(), 'l1a');
    assert.equal(domain.lessonEvidence(progress, 'l1a', taskTopics), 'self_checked');
    progress = domain.applyTaskResult(progress, 't11', { passed: 1, total: 1, cases: [], code: 'x', now: T(2) });
    assert.equal(domain.lessonEvidence(progress, 'l1a', taskTopics), 'task_passed');
    assert.equal(domain.lessonEvidence(progress, 'l1a'), 'self_checked', 'without the curriculum mapping the task is simply not considered');
    assert.equal(domain.lessonEvidence(domain.applySelfCheckedLesson(progress, 'l1d'), 'l1d', taskTopics), 'self_checked', 'a task covering other lessons does not help this one');
    const partial = domain.applyTaskResult(domain.applySelfCheckedLesson(empty(), 'l1a'), 't11', { passed: 0, total: 1, cases: [], code: 'x', now: T(2) });
    assert.equal(domain.lessonEvidence(partial, 'l1a', taskTopics), 'self_checked', 'a failed task attempt is not evidence');
    assert.equal(domain.lessonEvidence({ ...empty(), tasks: ['t11'] }, 'l1a', taskTopics), null, 'task evidence never completes a lesson');
});

check('Both kinds: check_passed is reported first, task_passed is kept in the list', () => {
    let progress = domain.applyLessonCheck(empty(), 'l1a', { correct: true, answer: 1, now: T(1) });
    progress = domain.applyTaskResult(progress, 't11', { passed: 1, total: 1, cases: [], code: 'x', now: T(2) });
    assert.deepEqual(domain.lessonEvidenceKinds(progress, 'l1a', taskTopics), ['check_passed', 'task_passed']);
    assert.equal(domain.lessonEvidence(progress, 'l1a', taskTopics), 'check_passed');
});

// ---------- quiz attempt history ----------
check('Each attempt is stored with attempt number, level, language, score, totals, pass result, answers and timestamp', () => {
    const a1 = quiz(empty(), 1, 2, T(1), { language: 'python' });
    assert.deepEqual(a1.quizAttempts, [{ attempt: 1, levelId: 1, language: 'python', score: 50, correct: 2, total: 4, passed: false, answers: answersWith(2), at: T(1) }]);
    const a2 = quiz(a1, 1, 3, T(2), { language: 'python' });
    assert.equal(a2.quizAttempts.length, 2); assert.equal(a2.quizAttempts[1].attempt, 2); assert.equal(a2.quizAttempts[1].score, 75); assert.equal(a2.quizAttempts[1].passed, true);
    const other = quiz(a2, 2, 4, T(3), { language: 'python' });
    assert.equal(other.quizAttempts[2].attempt, 1, 'attempt numbers count per level'); assert.equal(other.quizAttempts[2].levelId, 2);
    assert.deepEqual(a1.quizAttempts.length, 1, 'earlier records are never rewritten');
});

check('The 70% threshold is unchanged: 50 and 75 are the only reachable scores here, 69/70 boundary is checked on scoring', () => {
    assert.equal(domain.PASS_MARK, 70);
    const tenQuestions = Array.from({ length: 10 }, () => ({ correct: 0 }));
    const score = right => domain.scoreQuiz(tenQuestions, tenQuestions.map((q, i) => (i < right ? 0 : 1)));
    assert.deepEqual([score(6).score, score(6).passed], [60, false]); assert.deepEqual([score(7).score, score(7).passed], [70, true]);
    const progress = quiz(empty(), 1, 3, T(1)); assert.equal(progress.quizAttempts[0].passed, true);
});

check('Best and last score keep the exact previous behaviour (verified against the summary fields), with or without attempt history', () => {
    let progress = empty(), legacy = empty();
    for (const [right, when] of [[2, T(1)], [4, T(2)], [1, T(3)], [3, T(4)]]) {
        const answers = answersWith(right), score = domain.scoreQuiz(questions, answers).score;
        legacy = domain.applyQuizAttempt(legacy, 1, { answers, score, now: when });
        progress = quiz(progress, 1, right, when);
        const { quizAttempts, ...rest } = progress;
        assert.deepEqual(rest, legacy, 'summary fields are identical to the version without history');
    }
    const summary = domain.quizSummary(progress, 1);
    assert.deepEqual([summary.best, summary.last, summary.attempts, summary.passed, summary.hasHistory, summary.legacyOnly, summary.lastAt], [100, 75, 4, true, true, false, T(4)]);
    assert.deepEqual(summary.history.map(item => item.score), [50, 100, 25, 75]);
});

check('Old records without attempt history load: the best/last summary is reported as legacyOnly and nothing is invented', () => {
    const old = { ...empty(), assessments: { 1: { score: 80, lastScore: 60, kind: 'local-quiz-demo', submittedAt: T(5), answers: [0, 1, 2, 3] } } };
    const summary = domain.quizSummary(old, 1);
    assert.deepEqual([summary.best, summary.last, summary.attempts, summary.legacyOnly, summary.hasHistory, summary.passed, summary.lastAt], [80, 60, 0, true, false, true, T(5)]);
    const veryOld = { ...empty(), assessments: { 2: { score: 40 } } };
    const s2 = domain.quizSummary(veryOld, 2); assert.deepEqual([s2.best, s2.last, s2.lastAt, s2.legacyOnly], [40, 40, null, true]);
    assert.deepEqual(domain.quizSummary(empty(), 3), { best: null, last: null, attempts: 0, history: [], passed: false, hasHistory: false, legacyOnly: false, lastAt: null });
    const next = quiz(old, 1, 3, T(6));
    assert.equal(next.assessments[1].score, 80, 'the old best is kept'); assert.equal(next.quizAttempts.length, 1, 'history starts with the first attempt recorded now');
    assert.equal(next.quizAttempts[0].attempt, 1);
});

check('Corrupted history is never lost: unreadable lists are kept aside, unreadable entries stay in the list and are ignored', () => {
    const broken = { ...empty(), quizAttempts: 'oops' };
    assert.equal(domain.quizSummary(broken, 1).attempts, 0);
    const fixed = quiz(broken, 1, 2, T(1));
    assert.equal(fixed.quizAttemptsUnreadable, 'oops'); assert.equal(fixed.quizAttempts.length, 1);
    const mixed = { ...empty(), quizAttempts: [{ nonsense: true }, null, { attempt: 1, levelId: 1, score: 50, correct: 2, total: 4, passed: false, answers: [], at: T(1) }, { levelId: 1, score: 500, total: 4, passed: false, at: T(2) }] };
    assert.equal(domain.quizSummary(mixed, 1).attempts, 1, 'only well-formed entries count');
    const appended = quiz(mixed, 1, 3, T(3));
    assert.equal(appended.quizAttempts.length, 5, 'unreadable entries are kept'); assert.equal(appended.quizAttempts[4].attempt, 2);
    assert.equal(appended.quizAttemptsUnreadable, undefined);
});

check('Records without a total (callers from before this slice) behave exactly as before and add no history', () => {
    const before = clone(empty()), next = domain.applyQuizAttempt(before, 1, { answers: [0, 1, 2, 3], score: 100, now: T(1) });
    assert.equal(next.quizAttempts, undefined); assert.deepEqual(before, empty());
});

// ---------- level summary (one view for every page) ----------
check('Level summary: lessons, evidence counts, tasks and quiz agree with each other and with the unchanged completion rule', () => {
    let progress = empty();
    progress = domain.applyLessonCheck(progress, 'l1a', { correct: true, answer: 0, now: T(1) });
    progress = domain.applySelfCheckedLesson(progress, 'l1b');
    progress = domain.applySelfCheckedLesson(progress, 'l1c');
    progress = domain.applyTaskResult(progress, 't11', { passed: 1, total: 1, cases: [], code: 'x', now: T(2) });
    let s = domain.summarizeLevel(level1, progress, { taskTopics });
    assert.deepEqual([s.lessonsDone, s.lessonsTotal, s.tasksPassed, s.tasksTotal, s.quizUnlocked, s.completed], [3, 4, 1, 2, false, false]);
    assert.deepEqual(s.evidence, { check_passed: 1, task_passed: 1, self_checked: 1, assessed: 2 }, 'each completed lesson is counted once, in its strongest kind');
    assert.equal(s.evidence.check_passed + s.evidence.task_passed + s.evidence.self_checked, s.lessonsDone);
    progress = domain.applySelfCheckedLesson(progress, 'l1d');
    progress = quiz(progress, 1, 2, T(3)); s = domain.summarizeLevel(level1, progress, { taskTopics });
    assert.deepEqual([s.quizUnlocked, s.completed, s.quiz.best], [true, false, 50], 'a failed quiz does not complete the level');
    progress = quiz(progress, 1, 3, T(4)); s = domain.summarizeLevel(level1, progress, { taskTopics });
    assert.deepEqual([s.completed, s.quiz.best, s.quiz.last, s.quiz.attempts], [true, 75, 75, 2]);
    assert.equal(s.completed, domain.isLevelCompleted(level1, progress));
});

check('Level unlocking is unchanged by attempts and evidence: only lessons plus a best score of at least 70 complete a level', () => {
    const everyLesson = withLessons(empty(), level1.lessons.map(l => l.id));
    for (const right of [0, 1, 2]) assert.equal(domain.isLevelCompleted(level1, quiz(everyLesson, 1, right, T(1))), false);
    assert.equal(domain.isLevelCompleted(level1, quiz(everyLesson, 1, 3, T(1))), true);
    const passedThenFailed = quiz(quiz(everyLesson, 1, 4, T(1)), 1, 0, T(2));
    assert.equal(domain.isLevelCompleted(level1, passedThenFailed), true, 'a later failed attempt never un-completes a level (best score counts)');
    assert.equal(domain.isLevelAvailable(levels, levels[1], passedThenFailed, null), true);
    assert.equal(domain.isLevelAvailable(levels, levels[1], withLessons(empty(), level1.lessons.map(l => l.id)), null), false);
});

// ---------- feedback ----------
check('Lesson check feedback: passed, failed, and already-complete lessons', () => {
    const lesson = level1.lessons[0];
    let progress = domain.applyLessonCheck(empty(), lesson.id, { correct: true, answer: 1, now: T(1) });
    let f = domain.lessonFeedback({ lesson, level: level1, via: 'check', correct: true, progress, taskTopics });
    assert.deepEqual([f.result, f.headline], ['passed', 'Check passed']); assert.match(f.completed[0], /is complete, with a passed check/); assert.deepEqual(f.improve, []);
    assert.deepEqual([f.next.id, f.next.target, f.next.lessonId], ['next-lesson', 'lesson', 'l1b']);
    const wrong = domain.applyLessonCheck(empty(), lesson.id, { correct: false, answer: 0, now: T(2) });
    f = domain.lessonFeedback({ lesson, level: level1, via: 'check', correct: false, progress: wrong, taskTopics });
    assert.deepEqual([f.result, f.headline], ['not_passed', 'Not passed yet']); assert.match(f.completed[0], /not complete yet/); assert.match(f.improve[0], /Re-read the explanation/); assert.equal(f.next.target, 'stay');
    const selfDone = domain.applySelfCheckedLesson(empty(), lesson.id), wrongAgain = domain.applyLessonCheck(selfDone, lesson.id, { correct: false, answer: 0, now: T(3) });
    f = domain.lessonFeedback({ lesson, level: level1, via: 'check', correct: false, progress: wrongAgain, taskTopics, alreadyCompleted: true });
    assert.match(f.completed[0], /stays complete \(self-checked\)/);
    const upgraded = domain.applyLessonCheck(selfDone, lesson.id, { correct: true, answer: 1, now: T(4) });
    f = domain.lessonFeedback({ lesson, level: level1, via: 'check', correct: true, progress: upgraded, taskTopics, alreadyCompleted: true });
    assert.match(f.completed[0], /now recorded as assessed evidence/);
});

check('Self-checked feedback: says so plainly, asks for the check once, never calls it verified', () => {
    const lesson = level1.lessons[0], progress = domain.applySelfCheckedLesson(empty(), lesson.id);
    const f = domain.lessonFeedback({ lesson, level: level1, via: 'self', progress, taskTopics });
    assert.equal(f.result, 'self_checked'); assert.equal(f.headline, 'Marked complete (self-checked)');
    assert.match(f.completed[0], /not assessed evidence/); assert.match(f.improve[0], /lesson check correctly/);
    assert.doesNotMatch(JSON.stringify(f), /verified/i);
    const backed = domain.applyTaskResult(progress, 't11', { passed: 1, total: 1, cases: [], code: 'x', now: T(1) });
    const g = domain.lessonFeedback({ lesson, level: level1, via: 'self', progress: backed, taskTopics });
    assert.match(g.completed[0], /passed coding task/); assert.deepEqual(g.improve, []);
});

check('The next action after a lesson is exactly one and moves forward: next lesson, then the quiz, never a dead end', () => {
    const ids = level1.lessons.map(l => l.id);
    let progress = withLessons(empty(), ids.slice(0, 3));
    let f = domain.lessonFeedback({ lesson: level1.lessons[2], level: level1, via: 'self', progress, taskTopics });
    assert.equal(f.next.lessonId, 'l1d', 'the remaining lesson comes first');
    progress = withLessons(empty(), ids);
    f = domain.lessonFeedback({ lesson: level1.lessons[3], level: level1, via: 'self', progress, taskTopics });
    assert.deepEqual([f.next.id, f.next.target, f.next.levelId], ['level-quiz', 'quiz', 1]);
    progress = withLessons(empty(), ['l1d', 'l1b', 'l1c']);
    f = domain.lessonFeedback({ lesson: level1.lessons[3], level: level1, via: 'self', progress, taskTopics });
    assert.equal(f.next.lessonId, 'l1a', 'an earlier unfinished lesson is offered when none is left ahead');
});

check('Quiz feedback: first attempt passed -> next level; new best; same best; lower than best', () => {
    const lessonsDone = withLessons(empty(), level1.lessons.map(l => l.id));
    const attempts = [];
    let progress = lessonsDone, previousBest = null;
    for (const right of [3, 4, 3, 2]) {
        const answers = answersWith(right), scored = domain.scoreQuiz(questions, answers);
        progress = domain.applyQuizAttempt(progress, 1, { answers, score: scored.score, now: T(attempts.length), total: scored.total, correct: scored.correct });
        attempts.push(domain.quizFeedback({ level: level1, attempt: scored, answers, questions, previousBest, progress, taskTopics, nextLevel: levels[1] }));
        previousBest = progress.assessments[1].score;
    }
    assert.equal(attempts[0].headline, 'Passed: 75%'); assert.match(attempts[0].completed[0], /3 of 4 correct \(75%\)/); assert.equal(attempts[0].completed[1], 'This is your first recorded attempt.');
    assert.match(attempts[0].improve[0], /^Question 4 needs another look/); assert.deepEqual([attempts[0].next.id, attempts[0].next.levelId], ['next-level', 2]);
    assert.equal(attempts[1].completed[1], 'New best score: 100% (it was 75%).'); assert.deepEqual(attempts[1].improve.filter(line => !/self-checked only/.test(line)), [], 'a perfect score leaves nothing to improve in the quiz itself (the self-checked note is about lessons)');
    assert.equal(attempts[2].completed[1], 'Your best score stays 100%.');
    assert.equal(attempts[3].result, 'not_passed'); assert.match(attempts[3].improve.join(' '), /best score of 100% already passes/);
    assert.match(attempts[3].improve.join(' '), /Questions 3 and 4 need another look/);
    assert.equal(attempts[3].next.id, 'next-level', 'the level stays complete, so the next level is still the single action');
});

check('Quiz feedback: a failed first attempt names the pass mark and the missed questions and points to the lessons', () => {
    const progress0 = withLessons(empty(), level1.lessons.map(l => l.id)), answers = answersWith(1), scored = domain.scoreQuiz(questions, answers);
    const progress = domain.applyQuizAttempt(progress0, 1, { answers, score: scored.score, now: T(1), total: scored.total, correct: scored.correct });
    const f = domain.quizFeedback({ level: level1, attempt: scored, answers, questions, previousBest: null, progress, taskTopics, nextLevel: levels[1] });
    assert.deepEqual([f.result, f.headline], ['not_passed', 'Not passed yet: 25%']);
    assert.ok(f.improve.some(line => /at least 70%/.test(line))); assert.ok(f.improve.some(line => /Questions 2, 3 and 4 need another look/.test(line)));
    assert.deepEqual([f.next.id, f.next.target, f.next.levelId], ['review-lessons', 'module', 1]);
});

check('Quiz feedback: the last level points to the final project; self-checked lessons are mentioned once, not as a second action', () => {
    const last = levels[2], done = withLessons(empty(), last.lessons.map(l => l.id)), answers = answersWith(4), scored = domain.scoreQuiz(questions, answers);
    const progress = domain.applyQuizAttempt(done, 3, { answers, score: scored.score, now: T(1), total: scored.total, correct: scored.correct });
    const f = domain.quizFeedback({ level: last, attempt: scored, answers, questions, previousBest: null, progress, taskTopics, nextLevel: null });
    assert.deepEqual([f.next.id, f.next.target], ['final-project', 'project']);
    assert.ok(f.improve.some(line => /4 of 4 lessons are self-checked only/.test(line)));
    assert.equal(typeof f.next, 'object'); assert.equal(Array.isArray(f.next), false);
});

check('Feedback and summary functions never mutate their inputs', () => {
    const progress = quiz(withLessons(empty(), level1.lessons.map(l => l.id)), 1, 3, T(1), { language: 'python' }), snapshot = clone(progress);
    domain.summarizeLevel(level1, progress, { taskTopics }); domain.quizSummary(progress, 1); domain.lessonEvidenceKinds(progress, 'l1a', taskTopics);
    domain.lessonFeedback({ lesson: level1.lessons[0], level: level1, via: 'self', progress, taskTopics });
    domain.quizFeedback({ level: level1, attempt: { score: 75, correct: 3, total: 4, passed: true }, answers: answersWith(3), questions, previousBest: null, progress, taskTopics, nextLevel: levels[1] });
    assert.deepEqual(progress, snapshot);
});

console.log(`${count} learning evidence checks passed.`);
