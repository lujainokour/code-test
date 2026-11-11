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
    // Milestones from real records only. Placed-out levels are not completed, so they never count.
    function achievements(progress, course, placement) {
        const lessons = Array.isArray(progress?.lessons) ? progress.lessons : [], tasks = Array.isArray(progress?.tasks) ? progress.tasks : [];
        const known = new Set(course.allLessons.map(l => l.id)), knownTasks = new Set(course.levels.flatMap(l => l.tasks));
        const passedRuns = Object.entries(progress?.taskResults || {}).filter(([id, r]) => knownTasks.has(id) && tasks.includes(id) && valid(r?.submittedAt)).map(([, r]) => r.submittedAt).sort();
        const list = [
            { id: "first-lesson", title: "First lesson completed", earned: lessons.some(id => known.has(id)), earnedAt: null },
            { id: "first-task", title: "First coding task passed", earned: tasks.some(id => knownTasks.has(id)), earnedAt: passedRuns[0] || null },
            { id: "placement", title: "Placement check taken", earned: placement?.status === "submitted", earnedAt: placement?.status === "submitted" && valid(placement.submittedAt) ? placement.submittedAt : null }
        ];
        for (const level of course.levels) {
            const done = course.completed(level, progress || { lessons: [], tasks: [], assessments: {} });
            list.push({ id: `level-${level.id}`, title: `Level ${level.id} complete: ${level.title}`, earned: done, earnedAt: done ? progress.assessments?.[level.id]?.submittedAt || null : null, level: level.id });
        }
        return list;
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
    window.progressInsights = Object.freeze({ events, weekly, streak, achievements, continueTarget, dayKey });
})();
