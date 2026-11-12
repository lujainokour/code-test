/* Weekly community challenge: one real practice task of the student's active language, picked by
   ISO week number. Ids and titles mirror js/curricula/*.js (levels 1-5, no premium tasks);
   tests/community-v2.cjs checks every entry against the curricula. */
(() => {
    "use strict";
    const TASKS = Object.freeze({
        python: Object.freeze([
            ["student-profile", "Create a student profile"], ["receipt", "Build a simple receipt"], ["grade-checker", "Check a grade"],
            ["sum-numbers", "Sum a range"], ["list-summary", "Summarise a list"], ["task-manager", "Build a Study Task Manager"],
            ["safe-average", "Calculate a safe average"], ["word-frequency", "Count normalized words"], ["bank-account", "Model an account"], ["unique-values", "Sort unique values"]
        ]),
        javascript: Object.freeze([
            ["student-profile", "Create a JavaScript learner profile"], ["receipt", "Build a JavaScript receipt"], ["grade-checker", "Check a JavaScript grade"],
            ["sum-numbers", "Sum a JavaScript range"], ["list-summary", "Summarise a JavaScript array"], ["task-manager", "Build a JavaScript Study Task Manager"]
        ])
    });
    function isoWeek(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
        const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return {year: d.getUTCFullYear(), week: Math.ceil(((d - start) / 86400000 + 1) / 7)};
    }
    // Returns null for languages without practice tasks yet (C#, C++).
    function weekly(language, date = new Date()) {
        const list = TASKS[language];
        if (!list) return null;
        const {year, week} = isoWeek(date), [id, title] = list[(year * 53 + week) % list.length];
        return {language, id, title, week, href: `../student/workspace.html?task=${encodeURIComponent(id)}`};
    }
    window.communityChallenges = Object.freeze({TASKS, weekly, isoWeek});
})();
