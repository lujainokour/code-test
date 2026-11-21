/* Pure learning rules (Slice 1). No DOM, no storage, no network: plain objects in, plain objects out.
   Extracted unchanged from lesson.js, level-assessment.js, workspace.js, workspace-support.js and
   python-curriculum.js so that the same rules can later run on a server. Every "apply*" function returns a NEW
   progress object and never mutates its input.

   Progress record (stored by the repository in js/data/learning-repository.js):
     { version: 1, lessons: [id], tasks: [id], assessments: { levelId: { score, lastScore, answers, bestAnswers, kind, submittedAt } },
       checks?: { lessonId: { correct, answer, checkedAt } }, taskResults?: {...}, submissions?: {...}, support?: {...},
       revision?: integer }                       // revision is added by the repository; absent = 0 (legacy record)

   Evidence kinds for a completed lesson (derived, nothing new is stored):
     "check_passed"  the lesson's knowledge check was answered correctly (assessed evidence)
     "self_checked"  the learner pressed "mark complete" (or the record predates checks): self-reported, never verified
   Coding tasks use their own evidence (progress.taskResults, runner "client" in demo mode). Client-side grading is
   NOT tamper-resistant; the demo labels already say so. */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.cmDomain = Object.assign(root.cmDomain || {}, { learning: api });
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : globalThis, function () {
    "use strict";
    const PASS_MARK = 70;

    class DomainError extends Error {
        constructor(code, message, details) { super(message); this.name = "DomainError"; this.code = code; if (details) this.details = details; }
    }

    const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const emptyProgress = () => ({ version: 1, lessons: [], tasks: [], assessments: {} });

    // "basic" is what lesson.js / workspace.js / workspace-support.js always required;
    // "strict" is what python-curriculum.js and level-assessment.js required (also checks the stored values).
    function validateProgress(value, mode = "basic") {
        if (!isObject(value) || value.version !== 1 || !Array.isArray(value.lessons) || !Array.isArray(value.tasks) || !isObject(value.assessments)) return false;
        if (mode !== "strict") return true;
        return value.lessons.every(id => typeof id === "string") && value.tasks.every(id => typeof id === "string") &&
            Object.values(value.assessments).every(item => isObject(item) && typeof item.score === "number" && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100);
    }

    // ---- level rules (identical to the former python-curriculum.js closures; `choice` is the placement choice or null) ----
    const startLevelOf = choice => (choice && choice.startLevel) || 1;
    const isLevelCompleted = (level, progress) => level.lessons.every(item => progress.lessons.includes(item.id)) &&
        Number.isFinite(progress.assessments[level.id]?.score) && progress.assessments[level.id].score >= PASS_MARK;
    const isPlacedOut = (level, progress, choice) => !isLevelCompleted(level, progress) && level.id < startLevelOf(choice);
    function isLevelAvailable(levels, level, progress, choice) {
        if (!choice) return levels.filter(value => value.id < level.id).every(value => isLevelCompleted(value, progress));
        const highestRealCompletion = Math.max(0, ...levels.filter(value => isLevelCompleted(value, progress)).map(value => value.id));
        return level.id <= Math.max(choice.startLevel, highestRealCompletion + 1);
    }
    function currentLevel(levels, progress, choice) {
        const start = startLevelOf(choice);
        return levels.find(level => level.id >= start && !isLevelCompleted(level, progress)) || levels.find(level => !isLevelCompleted(level, progress)) || levels[levels.length - 1];
    }

    // ---- lessons ----
    // Evidence kinds of a COMPLETED lesson, derived from what is stored (nothing extra is written):
    //   check_passed  the lesson's knowledge check was answered correctly      (assessed)
    //   task_passed   a coding task that covers this lesson (task.topics) is passed (assessed)
    //   self_checked  the learner pressed "mark complete", or the record predates checks (self-reported, never verified)
    // taskTopics: { taskId: [lessonId, ...] } from the curriculum; without it task evidence is simply not considered.
    const EVIDENCE_ORDER = Object.freeze(["check_passed", "task_passed", "self_checked"]);
    const isAssessedEvidence = kind => kind === "check_passed" || kind === "task_passed";
    function lessonEvidenceKinds(progress, lessonId, taskTopics = {}) {
        if (!progress.lessons.includes(lessonId)) return [];
        const kinds = [];
        if (progress.checks?.[lessonId]?.correct === true) kinds.push("check_passed");
        if (progress.tasks.some(taskId => Array.isArray(taskTopics[taskId]) && taskTopics[taskId].includes(lessonId))) kinds.push("task_passed");
        if (!kinds.length) kinds.push("self_checked");
        return kinds;
    }
    /** The strongest kind (check_passed > task_passed > self_checked), or null when the lesson is not completed. */
    function lessonEvidence(progress, lessonId, taskTopics) { return lessonEvidenceKinds(progress, lessonId, taskTopics)[0] || null; }
    function applyLessonCheck(progress, lessonId, { correct, answer, now }) {
        const next = { ...progress, checks: { ...progress.checks, [lessonId]: { correct, answer, checkedAt: now } } };
        if (correct && !progress.lessons.includes(lessonId)) next.lessons = [...progress.lessons, lessonId];
        return next;
    }
    function applySelfCheckedLesson(progress, lessonId) {
        return progress.lessons.includes(lessonId) ? { ...progress } : { ...progress, lessons: [...progress.lessons, lessonId] };
    }

    // ---- quizzes ----
    function scoreQuiz(questions, answers) {
        const correct = answers.filter((answer, index) => answer === questions[index].correct).length;
        const score = Math.round(correct / questions.length * 100);
        return { score, correct, total: questions.length, passed: score >= PASS_MARK };
    }
    // Quiz attempt history (Slice 3): progress.quizAttempts is an append-only list of
    //   { attempt, levelId, language, score, correct, total, passed, answers, at }
    // The summary fields in progress.assessments (best score, last score, answers, kind, submittedAt) are written exactly as before.
    const isoOk = value => typeof value === "string" && Number.isFinite(Date.parse(value));
    const isAttempt = item => isObject(item) && Number.isInteger(item.levelId) && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100 &&
        Number.isInteger(item.total) && item.total > 0 && typeof item.passed === "boolean" && isoOk(item.at);
    const quizAttemptsOf = (progress, levelId) => (Array.isArray(progress.quizAttempts) ? progress.quizAttempts.filter(item => isAttempt(item) && item.levelId === Number(levelId)) : []);
    /** extra (optional): { total, correct, language }. Without `total` only the summary fields are written (the previous behaviour). */
    function applyQuizAttempt(progress, levelId, { answers, score, now, total, correct, language }) {
        const previous = progress.assessments[levelId] || {};
        const next = {
            ...progress,
            assessments: {
                ...progress.assessments,
                [levelId]: { ...previous, score: Math.max(previous.score || 0, score), lastScore: score, answers, bestAnswers: score >= (previous.score || 0) ? answers : previous.bestAnswers || previous.answers, kind: "local-quiz-demo", submittedAt: now }
            }
        };
        if (total !== undefined) {
            const existing = Array.isArray(progress.quizAttempts) ? progress.quizAttempts : [];
            // Entries that cannot be read are kept in the list untouched; a list that is not an array is kept aside, never dropped.
            if (progress.quizAttempts !== undefined && !Array.isArray(progress.quizAttempts)) next.quizAttemptsUnreadable = progress.quizAttempts;
            const entry = { attempt: quizAttemptsOf(progress, levelId).length + 1, levelId: Number(levelId), ...(typeof language === "string" ? { language } : {}), score, correct, total, passed: score >= PASS_MARK, answers, at: now };
            next.quizAttempts = [...existing, entry];
        }
        return next;
    }
    /** Best / last score and the recorded attempts of one level. Old records (summary only) are reported as legacyOnly, never given invented attempts. */
    function quizSummary(progress, levelId) {
        const history = quizAttemptsOf(progress, levelId), saved = progress.assessments?.[levelId];
        const best = Number.isFinite(saved?.score) ? saved.score : null;
        const last = Number.isFinite(saved?.lastScore) ? saved.lastScore : best;
        return { best, last, attempts: history.length, history, passed: best !== null && best >= PASS_MARK, hasHistory: history.length > 0, legacyOnly: best !== null && history.length === 0, lastAt: history.length ? history[history.length - 1].at : (isoOk(saved?.submittedAt) ? saved.submittedAt : null) };
    }
    const quizUnlocked = (levelLessons, progress) => levelLessons.every(lesson => progress.lessons.includes(lesson.id));

    /** One level seen the same way by every page. level: { id, lessons[{id,title}], tasks[ids] }. */
    function summarizeLevel(level, progress, { taskTopics = {} } = {}) {
        const lessons = level.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, done: progress.lessons.includes(lesson.id), evidence: lessonEvidence(progress, lesson.id, taskTopics), kinds: lessonEvidenceKinds(progress, lesson.id, taskTopics) }));
        const evidence = { check_passed: 0, task_passed: 0, self_checked: 0 };
        lessons.forEach(lesson => { if (lesson.evidence) evidence[lesson.evidence]++; });
        const done = lessons.filter(lesson => lesson.done).length;
        return {
            levelId: level.id, lessons, lessonsDone: done, lessonsTotal: lessons.length,
            evidence: { ...evidence, assessed: evidence.check_passed + evidence.task_passed },
            quiz: quizSummary(progress, level.id), quizUnlocked: quizUnlocked(level.lessons, progress),
            tasksPassed: level.tasks.filter(id => progress.tasks.includes(id)).length, tasksTotal: level.tasks.length,
            completed: isLevelCompleted(level, progress)
        };
    }

    // ---- feedback after a lesson check, a self-checked completion or a quiz (one headline, plain lists, exactly ONE next action) ----
    const joinNumbers = list => (list.length <= 1 ? String(list[0]) : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);
    /**
     * input: { lesson: {id,title}, level: {id, lessons[]}, via: "check"|"self", correct?: boolean, progress (AFTER the change), taskTopics?, alreadyCompleted?: boolean }
     * output: { result: "passed"|"not_passed"|"self_checked", headline, completed[], improve[], next: {id, label, target, ...} }
     */
    function lessonFeedback({ lesson, level, via, correct, progress, taskTopics = {}, alreadyCompleted = false }) {
        const done = progress.lessons.includes(lesson.id);
        const order = level.lessons, at = order.findIndex(item => item.id === lesson.id);
        const incomplete = order.filter(item => !progress.lessons.includes(item.id));
        const nextLesson = incomplete.find(item => order.indexOf(item) > at) || incomplete.find(item => item.id !== lesson.id) || null;
        const forward = nextLesson ? { id: "next-lesson", label: `Continue with “${nextLesson.title}”`, target: "lesson", lessonId: nextLesson.id }
            : quizUnlocked(order, progress) ? { id: "level-quiz", label: `Take the Level ${level.id} quiz`, target: "quiz", levelId: level.id } : { id: "level-overview", label: "Back to the level overview", target: "module", levelId: level.id };
        const kinds = lessonEvidenceKinds(progress, lesson.id, taskTopics);
        if (via === "check" && correct) {
            return { result: "passed", headline: "Check passed", completed: [alreadyCompleted ? `“${lesson.title}” was already complete; this passed check is now recorded as assessed evidence.` : `“${lesson.title}” is complete, with a passed check.`], improve: [], next: forward };
        }
        if (via === "check") {
            return {
                result: "not_passed", headline: "Not passed yet",
                completed: [done ? `Your answer was recorded. “${lesson.title}” stays complete (${kinds[0] === "self_checked" ? "self-checked" : "earlier evidence"}).` : "Your answer was recorded. The lesson is not complete yet."],
                improve: ["Re-read the explanation and the example, then answer the check again."],
                next: { id: "retry-check", label: "Try the check again", target: "stay" }
            };
        }
        const assessed = kinds.some(isAssessedEvidence);
        return {
            result: "self_checked", headline: assessed ? "Lesson complete" : "Marked complete (self-checked)",
            completed: [assessed ? `“${lesson.title}” is complete and already backed by ${kinds[0] === "check_passed" ? "a passed check" : "a passed coding task"}.` : `“${lesson.title}” is marked complete. A self-checked lesson counts for progress but is not assessed evidence.`],
            improve: assessed ? [] : ["Answer the lesson check correctly to record assessed evidence."],
            next: forward
        };
    }
    /**
     * input: { level: {id, lessons[]}, attempt: {score, correct, total, passed}, answers, questions, previousBest (number|null), progress (AFTER), taskTopics?, nextLevel: {id,title}|null }
     * output: { result: "passed"|"not_passed", headline, completed[], improve[], next }
     */
    function quizFeedback({ level, attempt, answers, questions, previousBest, progress, taskTopics = {}, nextLevel, nextLocked = false }) {
        const summary = summarizeLevel(level, progress, { taskTopics }), best = summary.quiz.best;
        const completed = [`Level ${level.id} quiz: ${attempt.correct} of ${attempt.total} correct (${attempt.score}%).`];
        if (previousBest === null || previousBest === undefined) completed.push("This is your first recorded attempt.");
        else if (attempt.score > previousBest) completed.push(`New best score: ${attempt.score}% (it was ${previousBest}%).`);
        else if (attempt.score === previousBest) completed.push(`This matches your best score of ${best}%.`);
        else completed.push(`Your best score stays ${best}%.`);
        const improve = [];
        const missed = questions.map((question, index) => (answers[index] === question.correct ? null : index + 1)).filter(Boolean);
        if (!attempt.passed) improve.push(`You need at least ${PASS_MARK}% to pass this quiz.`);
        if (!attempt.passed && summary.quiz.passed) improve.push(`Your best score of ${best}% already passes, so the level stays complete.`);
        if (missed.length) improve.push(`${missed.length === 1 ? "Question" : "Questions"} ${joinNumbers(missed)} ${missed.length === 1 ? "needs" : "need"} another look; the explanations are below.`);
        if (summary.lessonsDone === summary.lessonsTotal && summary.evidence.self_checked > 0) improve.push(`${summary.evidence.self_checked} of ${summary.lessonsTotal} lessons are self-checked only. Answer their lesson checks for assessed evidence.`);
        const next = nextAfterLevelQuiz(level, progress, nextLevel, { nextLocked });
        return { result: attempt.passed ? "passed" : "not_passed", headline: attempt.passed ? `Passed: ${attempt.score}%` : `Not passed yet: ${attempt.score}%`, completed, improve, next };
    }
    /** The single next action once a level quiz has been taken (also used when the quiz page opens with saved results). */
    function nextAfterLevelQuiz(level, progress, nextLevel, { nextLocked = false } = {}) {
        if (isLevelCompleted(level, progress) && nextLevel && nextLocked) return { id: "learning-path", label: "See your learning path", target: "path" };
        if (isLevelCompleted(level, progress)) return nextLevel ? { id: "next-level", label: `Continue to Level ${nextLevel.id}`, target: "module", levelId: nextLevel.id } : { id: "final-project", label: "Start the final project", target: "project" };
        return { id: "review-lessons", label: `Review the Level ${level.id} lessons`, target: "module", levelId: level.id };
    }

    // ---- coding tasks (grading of one test case and recording of the whole attempt) ----
    const normalizeOutput = text => text.replace(/\r\n/g, "\n").trimEnd();
    const isCaseCorrect = (result, test) => !result.error && normalizeOutput(result.output) === normalizeOutput(test.output);
    function applyTaskResult(progress, taskId, { passed, total, cases, code, now }) {
        const next = { ...progress };
        if (passed === total && !progress.tasks.includes(taskId)) next.tasks = [...progress.tasks, taskId];
        next.taskResults = { ...progress.taskResults, [taskId]: { passed, total, cases, code, submittedAt: now } };
        if (passed === total) next.submissions = { ...progress.submissions, [taskId]: { code, passed, total, submittedAt: now } };
        return next;
    }
    /** Which lessons a PASSED task backs as assessed evidence (completed lessons it covers) and which it will back once completed. */
    function taskCoverage(progress, taskId, taskTopics = {}) {
        const covers = Array.isArray(taskTopics[taskId]) ? taskTopics[taskId] : [], passed = progress.tasks.includes(taskId);
        return { passed, backed: passed ? covers.filter(id => progress.lessons.includes(id)) : [], pending: passed ? covers.filter(id => !progress.lessons.includes(id)) : [] };
    }
    function applySupport(progress, taskId, change) {
        return { ...progress, support: { ...progress.support, [taskId]: { ...progress.support?.[taskId], ...change } } };
    }

    /** What the quiz page shows when it OPENS with saved results: null before any attempt, otherwise the same shape as quizFeedback. */
    function levelOverviewFeedback({ level, progress, taskTopics = {}, nextLevel, nextLocked = false }) {
        const summary = summarizeLevel(level, progress, { taskTopics }), quiz = summary.quiz;
        if (quiz.best === null) return null;
        const next = nextAfterLevelQuiz(level, progress, nextLevel, { nextLocked });
        const completed = [`Best quiz score: ${quiz.best}%; last score: ${quiz.last}%.`];
        const improve = [];
        if (summary.completed) completed.unshift(`Level ${level.id} is complete: every lesson is done and the quiz is passed.`);
        else if (!quiz.passed) improve.push(`You need at least ${PASS_MARK}% to pass this quiz.`);
        if (summary.lessonsDone === summary.lessonsTotal && summary.evidence.self_checked > 0) improve.push(`${summary.evidence.self_checked} of ${summary.lessonsTotal} lessons are self-checked only. Answer their lesson checks for assessed evidence.`);
        return { result: summary.completed ? "passed" : "not_passed", headline: summary.completed ? "Level complete" : `Not passed yet: best ${quiz.best}%`, completed, improve, next };
    }

    return Object.freeze({
        PASS_MARK, DomainError, emptyProgress, validateProgress,
        isLevelCompleted, isPlacedOut, isLevelAvailable, currentLevel,
        EVIDENCE_ORDER, isAssessedEvidence, lessonEvidence, lessonEvidenceKinds, applyLessonCheck, applySelfCheckedLesson,
        scoreQuiz, applyQuizAttempt, quizAttemptsOf, quizSummary, quizUnlocked, summarizeLevel, lessonFeedback, quizFeedback, nextAfterLevelQuiz, levelOverviewFeedback,
        normalizeOutput, isCaseCorrect, applyTaskResult, taskCoverage, applySupport
    });
});
