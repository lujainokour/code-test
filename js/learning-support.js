/* Prepared teaching guidance. No AI requests or automatic completion awards. */
(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const tasks = window.pythonCurriculum.guides || window.pythonCurriculum.tasks;
    function reviewPlan(progress, course) {
        if (!progress) return [];
        const priorities = new Map();
        function add(id, reason, weight, taskId) {
            const lesson = course.allLessons.find(value => value.id === id);
            const level = course.levels.find(value => value.lessons.some(item => item.id === id));
            if (!lesson || !level || !course.available(level, progress) || (window.subscriptionStore && !window.subscriptionStore.canAccessLevel(level.id))) return;
            const item = priorities.get(id) || { id, title: lesson.title, reasons: [], weight: 0, taskIds: [] };
            if (!item.reasons.includes(reason)) item.reasons.push(reason);
            if (taskId && !item.taskIds.includes(taskId)) item.taskIds.push(taskId);
            item.weight += weight; priorities.set(id, item);
        }
        course.allLessons.forEach(lesson => {
            if (progress.checks?.[lesson.id]?.correct === false) add(lesson.id, "Your latest lesson answer needs another look.", 3);
        });
        course.levels.forEach(level => {
            const attempt = progress.assessments?.[level.id];
            if (!Array.isArray(attempt?.answers) || attempt.answers.length !== level.quiz.length) return;
            level.quiz.forEach((question, index) => {
                const answer = attempt.answers[index], lesson = level.lessons[index];
                if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length || answer === question.correct) return;
                const check = progress.checks?.[lesson.id];
                const correctedLater = check?.correct === true && Number.isFinite(Date.parse(check.checkedAt)) && Number.isFinite(Date.parse(attempt.submittedAt)) && Date.parse(check.checkedAt) > Date.parse(attempt.submittedAt);
                if (!correctedLater) add(lesson.id, `A question in your latest Level ${level.id} quiz needs review.`, 2);
            });
        });
        for (const [taskId, guide] of Object.entries(tasks)) {
            const attempt = progress.taskResults?.[taskId];
            if (!Number.isInteger(attempt?.passed) || !Number.isInteger(attempt?.total) || attempt.total < 1 || attempt.passed >= attempt.total || !Array.isArray(attempt.cases) || !attempt.cases.some(test => test?.passed === false)) continue;
            guide.topics.forEach(id => add(id, `Your latest ${guide.title} solution has failing checks.`, 2, taskId));
        }
        return [...priorities.values()].sort((a, b) => b.weight - a.weight || course.allLessons.findIndex(item => item.id === a.id) - course.allLessons.findIndex(item => item.id === b.id));
    }
    window.learningSupport = Object.freeze({ tasks, reviewPlan });
})();
