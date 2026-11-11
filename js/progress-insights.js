/* Derived, read-only insights from saved progress. Never writes storage and never invents numbers:
   activity comes only from timestamps already saved with each record (lesson checks, task runs,
   quiz attempts, placement submission). Lesson completions carry no timestamp, so they are not
   counted as dated activity. */
(() => {
    "use strict";
    const valid = iso => typeof iso === "string" && Number.isFinite(Date.parse(iso));
    const dayKey = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    const startOfDay = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

    function events(progress, placement) {
        const list = [];
        if (progress && typeof progress === "object") {
            for (const [id, check] of Object.entries(progress.checks || {})) if (valid(check?.checkedAt)) list.push({ type: "lesson-check", id, at: check.checkedAt });
            for (const [id, run] of Object.entries(progress.taskResults || {})) if (valid(run?.submittedAt)) list.push({ type: "task-run", id, at: run.submittedAt, passed: Number.isInteger(run.passed) && run.passed === run.total });
            for (const [id, quiz] of Object.entries(progress.assessments || {})) if (valid(quiz?.submittedAt)) list.push({ type: "quiz", id, at: quiz.submittedAt, score: quiz.lastScore ?? quiz.score });
        }
        if (placement && placement.status === "submitted" && valid(placement.submittedAt)) list.push({ type: "placement", id: placement.id || "placement", at: placement.submittedAt });
        return list.filter(e => Date.parse(e.at) <= Date.now() + 60000).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    }
    // Seven local calendar days ending today.
    function weekly(list, now = Date.now()) {
        const today = startOfDay(now), days = [];
        for (let i = 6; i >= 0; i--) {
            const start = new Date(today); start.setDate(start.getDate() - i);
            const key = dayKey(start.getTime());
            days.push({ date: key, label: start.toLocaleDateString(undefined, { weekday: "short" }), count: list.filter(e => dayKey(Date.parse(e.at)) === key).length });
        }
        return days;
    }
    // Consecutive active days ending today (or yesterday, so the streak survives until the day is over).
    function streak(list, now = Date.now()) {
        const active = new Set(list.map(e => dayKey(Date.parse(e.at))));
        const step = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
        let cursor = startOfDay(now);
        if (!active.has(dayKey(cursor))) cursor = step(cursor, -1);
        let current = 0;
        while (active.has(dayKey(cursor))) { current++; cursor = step(cursor, -1); }
        const sorted = [...active].sort();
        let longest = 0, run = 0, previous = null;
        for (const key of sorted) {
            const ms = Date.parse(key + "T12:00:00");
            run = previous !== null && dayKey(step(previous, 1)) === key ? run + 1 : 1;
            longest = Math.max(longest, run); previous = ms;
        }
        return { current, longest, lastActive: list[0]?.at || null };
    }
    /* ACHIEVEMENT RULES — the single documented list. Every rule reads real saved records of the
       signed-in student in the active language only:
         lessons  = lesson ids in progress.lessons that belong to the active curriculum (real completions;
                    placement never writes lessons, so placed-out levels add nothing)
         tasks    = task ids in progress.tasks (all tests passed) that belong to the active curriculum
         streak   = longest run of consecutive local days with a dated activity (see events())
         placement= a submitted placement attempt for the active language
         level    = course.completed(level): all lessons + best quiz score >= 70%. A placed-out level is
                    by definition not completed, so it never earns a badge.
       earnedAt is shown only when a real timestamp exists; otherwise the UI says "date not recorded". */
    const ACHIEVEMENT_RULES = Object.freeze([
        { id: "first-lesson", art: "spark", title: "First steps", description: "You completed your first lesson.", rule: "Complete 1 lesson in this language.", metric: "lessons", target: 1, unit: ["lesson", "lessons"] },
        { id: "five-lessons", art: "book", title: "Steady learner", description: "Five lessons done. Concepts are adding up.", rule: "Complete 5 lessons in this language.", metric: "lessons", target: 5, unit: ["lesson", "lessons"] },
        { id: "first-task", art: "code", title: "First passing code", description: "Your code passed every test of a task.", rule: "Pass all tests of 1 coding task.", metric: "tasks", target: 1, unit: ["task", "tasks"] },
        { id: "three-tasks", art: "gear", title: "Problem solver", description: "Three coding tasks fully passed.", rule: "Pass all tests of 3 coding tasks.", metric: "tasks", target: 3, unit: ["task", "tasks"] },
        { id: "streak-3", art: "flame", title: "Three-day streak", description: "You practised three days in a row.", rule: "Save activity on 3 consecutive days (lesson checks, task runs, quizzes or placement).", metric: "streak", target: 3, unit: ["day", "days"] },
        { id: "placement", art: "compass", title: "Know your start", description: "You checked where to begin.", rule: "Submit the placement check for this language.", metric: "placement", target: 1, unit: ["check", "checks"] },
        { id: "level", art: "shield", title: "Level {n} complete", description: "{title}: every lesson done and the quiz passed.", rule: "Complete all Level {n} lessons and score at least 70% in its quiz. Placed-out levels do not count.", metric: "level", target: 1, unit: ["level", "levels"] },
        { id: "path-complete", art: "trophy", title: "Path complete", description: "Every level of this language completed for real.", rule: "Complete every level of this language (placed-out levels do not count).", metric: "path", target: 1, unit: ["level", "levels"] }
    ]);
    // Date on which a running count first reached n (sorted ISO strings), or null.
    const nth = (dates, n) => dates.length >= n ? dates[n - 1] : null;
    function streakReachedOn(list, target) {
        const days = [...new Set(list.map(e => dayKey(Date.parse(e.at))))].sort();
        let run = 0, previous = null;
        for (const key of days) {
            const ms = Date.parse(key + "T12:00:00");
            run = previous !== null && dayKey(previous + 86400000) === key ? run + 1 : 1;
            if (run >= target) return new Date(ms).toISOString();
            previous = ms;
        }
        return null;
    }
    function achievements(progress, course, placement) {
        const empty = { lessons: [], tasks: [], assessments: {} };
        const p = progress && typeof progress === "object" ? progress : empty;
        const lessons = Array.isArray(p.lessons) ? p.lessons : [], tasks = Array.isArray(p.tasks) ? p.tasks : [];
        const known = new Set(course.allLessons.map(l => l.id)), knownTasks = new Set(course.levels.flatMap(l => l.tasks));
        const lessonCount = new Set(lessons.filter(id => known.has(id))).size, passedTasks = [...new Set(tasks.filter(id => knownTasks.has(id)))];
        const passedRuns = Object.entries(p.taskResults || {}).filter(([id, r]) => knownTasks.has(id) && tasks.includes(id) && valid(r?.submittedAt)).map(([, r]) => r.submittedAt).sort();
        const list = events(p, placement), longest = streak(list).longest;
        const submitted = placement?.status === "submitted";
        const levelsDone = course.levels.filter(level => course.completed(level, p));
        const values = { lessons: lessonCount, tasks: passedTasks.length, streak: longest, placement: submitted ? 1 : 0 };
        const out = [];
        for (const rule of ACHIEVEMENT_RULES) {
            if (rule.metric === "level") {
                for (const level of course.levels) {
                    const done = course.completed(level, p), fill = s => s.replaceAll("{n}", level.id).replaceAll("{title}", level.title);
                    const remaining = Math.max(0, level.lessons.filter(l => !lessons.includes(l.id)).length);
                    out.push({ id: `level-${level.id}`, art: rule.art, level: level.id, title: fill(rule.title), description: fill(rule.description), rule: fill(rule.rule), earned: done,
                        earnedAt: done ? (valid(p.assessments?.[level.id]?.submittedAt) ? p.assessments[level.id].submittedAt : null) : null,
                        placedOut: !done && Boolean(course.placedOut?.(level, p)),
                        hint: done ? "" : remaining ? `${remaining} more ${remaining === 1 ? "lesson" : "lessons"}, then the quiz` : "Pass the level quiz with 70%" });
                }
                continue;
            }
            if (rule.metric === "path") {
                const done = levelsDone.length === course.levels.length && course.levels.length > 0, left = course.levels.length - levelsDone.length;
                const dates = levelsDone.map(l => p.assessments?.[l.id]?.submittedAt).filter(valid).sort();
                out.push({ ...rule, earned: done, earnedAt: done && dates.length === course.levels.length ? dates[dates.length - 1] : null, hint: done ? "" : `${left} more ${left === 1 ? "level" : "levels"} to complete` });
                continue;
            }
            const current = values[rule.metric], earned = current >= rule.target, left = rule.target - current;
            let earnedAt = null;
            if (earned && rule.metric === "tasks") earnedAt = nth(passedRuns, rule.target);
            if (earned && rule.metric === "placement") earnedAt = valid(placement.submittedAt) ? placement.submittedAt : null;
            if (earned && rule.metric === "streak") earnedAt = streakReachedOn(list, rule.target);
            out.push({ ...rule, earned, earnedAt, current: Math.min(current, rule.target), hint: earned ? "" : rule.metric === "placement" ? "Take the placement check" : `${left} more ${left === 1 ? rule.unit[0] : rule.unit[1]}` });
        }
        return out;
    }
    // Distinct local days with dated activity in this and the previous calendar month.
    function activeDays(list, now = Date.now()) {
        const d = new Date(now), thisMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const p = new Date(d.getFullYear(), d.getMonth() - 1, 1), previousMonth = `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`;
        const days = new Set(list.map(e => dayKey(Date.parse(e.at))));
        const count = month => [...days].filter(k => k.startsWith(month)).length;
        // A comparison is shown only when dated history reaches back before this month.
        const earliest = list.length ? dayKey(Date.parse(list[list.length - 1].at)) : null;
        return { thisMonth: count(thisMonth), previousMonth: count(previousMonth), hasHistoryBefore: Boolean(earliest && earliest < thisMonth + "-01") };
    }
    // Human-readable timeline entry for one saved event (titles come from the active curriculum).
    function describe(event, course) {
        const lesson = course.allLessons.find(l => l.id === event.id);
        const level = course.levels.find(l => String(l.id) === String(event.id));
        if (event.type === "lesson-check") return `Answered the check in “${lesson ? lesson.title : event.id}”`;
        if (event.type === "task-run") return `Ran the tests for “${event.id.replaceAll("-", " ")}”${event.passed ? " · all passed" : ""}`;
        if (event.type === "quiz") return `Level ${level ? level.id : event.id} quiz${Number.isFinite(event.score) ? ` · ${event.score}%` : ""}`;
        if (event.type === "placement") return "Submitted the placement check";
        return "Saved activity";
    }
    // Where to continue: the most recent dated activity, else the first unfinished lesson of the current level.
    function continueTarget(progress, course, list) {
        const level = course.current(progress);
        const latest = list.find(e => e.type === "task-run" || e.type === "lesson-check");
        if (latest?.type === "task-run" && !(progress.tasks || []).includes(latest.id)) return { kind: "task", href: `workspace.html?task=${encodeURIComponent(latest.id)}`, title: `Return to the coding task “${latest.id.replaceAll("-", " ")}”`, at: latest.at, level };
        if (latest?.type === "lesson-check") {
            const lesson = course.allLessons.find(l => l.id === latest.id);
            if (lesson && !(progress.lessons || []).includes(lesson.id)) return { kind: "lesson", href: `lesson.html?lesson=${encodeURIComponent(lesson.id)}`, title: `Continue “${lesson.title}”`, at: latest.at, level };
        }
        const lesson = level.lessons.find(l => !(progress.lessons || []).includes(l.id));
        if (lesson) return { kind: "lesson", href: `lesson.html?lesson=${encodeURIComponent(lesson.id)}`, title: `Next lesson: “${lesson.title}”`, at: latest?.at || null, level };
        const task = level.tasks.find(id => !(progress.tasks || []).includes(id));
        if (task) return { kind: "task", href: `workspace.html?task=${encodeURIComponent(task)}`, title: `Practise “${task.replaceAll("-", " ")}”`, at: latest?.at || null, level };
        return { kind: "quiz", href: `level-assessment.html?level=${level.id}`, title: `Take the Level ${level.id} quiz`, at: latest?.at || null, level };
    }
    window.progressInsights = Object.freeze({ ACHIEVEMENT_RULES, events, weekly, streak, achievements, activeDays, describe, continueTarget, dayKey });
})();
