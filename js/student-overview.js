/* Student overview model: one read-only snapshot of the signed-in student's ACTIVE language.
   Shared by the Dashboard and My progress so both show the same numbers. Never writes storage.
   Sources: cmStorage (learning-storage.js) for identity, preferences and progress; pythonCurriculum
   (curriculum registry, active language); placementStore/placementQuestions; studentServicesStore
   for owner-only request counts; progressInsights for dated activity and achievement rules. */
(() => {
    "use strict";
    const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
    function read(key) { const raw = window.cmStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
    function validLearning(learning) {
        return object(learning) && learning.version === 1 && Array.isArray(learning.lessons) && learning.lessons.every(value => typeof value === "string") &&
            Array.isArray(learning.tasks) && learning.tasks.every(value => typeof value === "string") && object(learning.assessments) &&
            Object.values(learning.assessments).every(value => object(value) && typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100);
    }
    function build() {
        const catalog = window.languageCatalog, course = window.pythonCurriculum, insights = window.progressInsights;
        const issues = [];
        const model = { issues, account: null, language: null, preferenceError: false, course, learning: null, learningError: false };
        try { model.account = window.studentServicesStore.session(); } catch { issues.push("Sign in with a valid student demo session to view private activity counts. Existing identity data was not changed."); }
        try {
            const preferences = read("codementor-demo-onboarding");
            if (preferences !== null) {
                if (!object(preferences) || !catalog.has(preferences.language) || !["beginner", "basics", "practising"].includes(preferences.experience) || !["foundations", "problem-solving", "projects"].includes(preferences.goal)) throw new Error("Invalid preferences");
                model.language = catalog.get(window.cmStorage.activeLanguage());
            }
            if (!model.language && read("codementor-demo-language") !== null) model.language = catalog.get(window.cmStorage.activeLanguage());
        } catch { model.preferenceError = true; issues.push("Saved learning preferences could not be read. They were not replaced."); }
        try {
            const learning = read("codementor-demo-learning");
            if (learning !== null && !validLearning(learning)) throw new Error("Invalid learning records");
            model.learning = learning;
        } catch { model.learningError = true; issues.push("Shared learning records could not be read. No progress was deleted or replaced."); }
        const ready = Boolean(model.language?.builtInContent) && !model.preferenceError;
        model.ready = ready;
        const progress = !model.learningError && model.learning ? model.learning : { version: 1, lessons: [], tasks: [], assessments: {} };
        model.progress = progress;
        let currentLevel = course.levels[0];
        try { currentLevel = course.current(course.read()); } catch { /* reported above */ }
        model.currentLevel = currentLevel;
        const lessonData = currentLevel.lessons, tasks = currentLevel.tasks.map(id => ({ id, title: id.replaceAll("-", " ") }));
        const done = lessonData.filter(lesson => progress.lessons.includes(lesson.id));
        const passed = tasks.filter(task => progress.tasks.includes(task.id));
        const assessment = !model.learningError ? progress.assessments[currentLevel.id] || null : null;
        const levelDone = done.length === lessonData.length && assessment?.score >= 70;
        model.level = { done: done.length, total: lessonData.length, tasksPassed: passed.length, tasksTotal: tasks.length, assessment, completion: Math.round((done.length + (levelDone ? 1 : 0)) / (lessonData.length + 1) * 100) };
        model.pathDone = !model.learningError && Boolean(model.learning) && course.levels.every(level => course.completed(level, progress));
        const allTasks = course.levels.flatMap(level => level.tasks);
        model.totals = {
            lessonsDone: course.allLessons.filter(lesson => progress.lessons.includes(lesson.id)).length, lessonsTotal: course.allLessons.length,
            tasksDone: allTasks.filter(id => progress.tasks.includes(id)).length, tasksTotal: allTasks.length,
            levelsDone: course.levels.filter(level => course.completed(level, progress)).length, levelsTotal: course.levels.length
        };
        // Ring: share of all lessons of the active language really completed (placed-out lessons are never written).
        model.overallPercent = model.totals.lessonsTotal ? Math.round(model.totals.lessonsDone / model.totals.lessonsTotal * 100) : 0;
        if (model.learning && !model.learningError) {
            const unknown = model.learning.lessons.filter(id => !course.allLessons.some(lesson => lesson.id === id)).length + model.learning.tasks.filter(id => !course.levels.some(level => level.tasks.includes(id))).length;
            if (unknown) issues.push("Unrecognised learning activities were excluded from these counts; saved records were kept.");
        }
        // What unlocks next
        const nextLevel = course.levels.find(level => level.id === currentLevel.id + 1);
        const lessonsLeft = model.level.total - model.level.done;
        model.unlock = model.pathDone ? "Every level is complete. Review any topic or build your project."
            : lessonsLeft ? `Finish ${lessonsLeft} more ${lessonsLeft === 1 ? "lesson" : "lessons"} and score 70% in the quiz to ${nextLevel ? `unlock Level ${nextLevel.id}` : "complete the path"}.`
            : `Score at least 70% in the Level ${currentLevel.id} quiz to ${nextLevel ? `unlock Level ${nextLevel.id}` : "complete the path"}.`;
        // Placement (active language only)
        model.placement = { state: "missing", score: "", topics: [], link: { href: "../student/onboarding.html", label: "Choose learning preferences" }, choice: null, note: "" };
        const pl = model.placement;
        if (model.preferenceError || !model.language || !model.language.builtInContent) {
            pl.score = model.preferenceError ? "Unavailable" : !model.language ? "Choose a language" : "Content not available";
            pl.note = model.language ? `The ${model.language.name} full path and placement are coming soon.` : "Choose valid learning preferences to see matching placement options.";
            pl.link = { href: model.preferenceError ? "../student/profile.html" : model.language ? `../public/languages.html?language=${model.language.id}` : "../student/onboarding.html", label: model.preferenceError ? "Review preferences" : model.language ? "View content availability" : "Choose learning preferences" };
        } else if (!window.placementBanks.get(course.id)) {
            pl.score = "No placement bank"; pl.note = `${course.name} placement is not available. Start Level 1; no placement result or skipped levels were inferred.`;
            pl.link = { href: "learning-path.html", label: "Start this learning path" };
        } else {
            pl.link = { href: "../student/placement-intro.html", label: `Start ${course.name} placement` };
            try {
                const attempt = window.placementStore.read(), questions = window.placementQuestions;
                if (attempt !== null) {
                    if (!object(attempt) || attempt.version !== 1 || !["in-progress", "submitted"].includes(attempt.status) || !Array.isArray(attempt.answers) || attempt.answers.length !== questions.length || !attempt.answers.every((answer, index) => (answer === null && attempt.status === "in-progress") || answer === "unsure" || (Number.isInteger(answer) && answer >= 0 && answer < questions[index].options.length))) throw new Error("Invalid placement");
                    pl.state = attempt.status; pl.attempt = attempt;
                    if (attempt.status === "in-progress") {
                        const answered = attempt.answers.filter(value => value !== null).length;
                        pl.score = `${answered} / ${questions.length} answered`; pl.note = `Your ${course.name} placement attempt is in progress.`;
                        pl.link = { href: "../student/placement-intro.html", label: `Resume ${course.name} placement` };
                    } else {
                        const correct = attempt.answers.filter((answer, index) => answer === questions[index].correct).length;
                        pl.score = `${correct} / ${questions.length} correct`;
                        const topics = new Map();
                        questions.forEach((question, index) => { const value = topics.get(question.topic) || { topic: question.topic, correct: 0, total: 0 }; value.total++; if (attempt.answers[index] === question.correct) value.correct++; topics.set(question.topic, value); });
                        pl.topics = [...topics.values()];
                        pl.link = { href: "../student/placement-results.html", label: "View placement result" };
                    }
                } else { pl.score = "No saved attempt"; pl.note = "Take the optional placement check to find your starting level and topics to practise."; }
            } catch {
                pl.state = "unavailable"; pl.score = "Unavailable"; pl.note = "Saved placement evidence could not be read. Existing answers were kept.";
                pl.link.label = "Review placement storage issue"; issues.push("Shared placement data is unavailable; no result was inferred.");
            }
            try { pl.choice = course.placementChoice(); } catch { pl.choice = null; }
            try { pl.recommendation = window.placementStore.recommendation?.() || null; } catch { pl.recommendation = null; }
        }
        // Roadmap states: completed / current / available / locked / placed-out. Placed-out never counts as completed.
        model.levels = course.levels.map(level => {
            const completed = !model.learningError && course.completed(level, progress);
            const placedOut = !completed && !model.learningError && course.placedOut(level, progress);
            const available = !model.learningError && course.available(level, progress);
            const state = model.learningError ? "unavailable" : completed ? "completed" : placedOut ? "placed-out" : level.id === currentLevel.id && !model.pathDone ? "current" : available ? "available" : "locked";
            return { id: level.id, title: level.title, state, lessonsDone: level.lessons.filter(l => progress.lessons.includes(l.id)).length, lessonsTotal: level.lessons.length, quizBest: progress.assessments?.[level.id]?.score ?? null, premium: Boolean(window.subscriptionStore && !window.subscriptionStore.canAccessLevel(level.id)) };
        });
        // The ONE next action (identical routing to the previous dashboard).
        const action = (title, description, label, href, secondary) => { model.next = { title, description, label, href, secondary: secondary || null }; };
        if (model.preferenceError) action("Preferences unavailable", "Your saved preferences could not be read. No path was selected automatically.", "Review profile settings", "../student/profile.html");
        else if (!model.language) action("Choose a learning language", "Select your preferences before starting a language-specific activity.", "Choose preferences", "../student/onboarding.html");
        else if (!model.language.builtInContent) action(`${model.language.name}: coming soon`, "The full learning path is not available yet. Your other language progress is kept.", "Browse language catalogue", `../public/languages.html?language=${model.language.id}`);
        else if (model.learningError) action("Learning records unavailable", "Saved progress could not be read. No starting state was inferred and no records were replaced.", "Review shared progress", "../student/progress.html");
        else {
            const nextLesson = lessonData.find(lesson => !done.some(value => value.id === lesson.id));
            const nextTask = tasks.find(task => !passed.some(value => value.id === task.id));
            if (model.pathDone) action(`${course.name} learning path completed`, `You passed all ${course.levels.length} published levels. Review your progress, practise any topic or build your project.`, "View progress", "../student/progress.html");
            else if (!window.subscriptionStore.canAccessLevel(currentLevel.id)) action("Continue with Premium", "Your free Levels 1–5 remain available. Review the Premium preview to continue into Level 6.", "View plans", "../student/subscription.html");
            else if (nextLesson) action(nextLesson.title, "Read the explanation, try the example and answer the lesson check to save your progress.", "Continue", `../student/lesson.html?lesson=${encodeURIComponent(nextLesson.id)}`);
            else if (nextTask) action(`Practise: ${nextTask.title}`, `Coding task · ${course.name} · Level ${currentLevel.id}. Practice is recommended before the quiz.`, "Continue", `../student/workspace.html?task=${nextTask.id}`, { label: "Go to level quiz", href: `level-assessment.html?level=${currentLevel.id}` });
            else if (!model.level.assessment || model.level.assessment.score < 70) action(`Level ${currentLevel.id} quiz`, `Your ${lessonData.length} lessons are complete. Score at least 70% to unlock the next level.`, "Continue", `../student/level-assessment.html?level=${currentLevel.id}`);
            else action(`${course.name} learning path completed`, "You passed all published levels. Review your progress or complete the Study Task Manager project.", "View progress", "../student/progress.html");
        }
        // Dated activity (Part 5 helpers): only times saved with real records.
        model.events = ready && !model.learningError ? insights.events(progress, pl.state === "submitted" ? pl.attempt : null) : [];
        model.weekly = insights.weekly(model.events);
        model.streak = insights.streak(model.events);
        model.activeDays = insights.activeDays(model.events);
        model.achievements = ready && !model.learningError ? insights.achievements(progress, course, pl.state === "submitted" ? pl.attempt : null) : [];
        const weekMs = 7 * 86400000, now = Date.now();
        const passedRuns = Object.entries(progress.taskResults || {}).filter(([id, r]) => progress.tasks.includes(id) && Number.isFinite(Date.parse(r?.submittedAt))).map(([, r]) => Date.parse(r.submittedAt));
        model.tasksLast7 = passedRuns.length ? passedRuns.filter(t => now - t < weekMs).length : null;
        try { model.reviewPlan = ready && !model.learningError ? window.learningSupport.reviewPlan(progress, course) : []; } catch { model.reviewPlan = []; }
        // Owner-only request counts (moved from the dashboard to My progress).
        model.counts = {};
        for (const type of ["booking", "request", "draft"]) {
            if (!model.account) { model.counts[type] = "Sign in"; continue; }
            try { model.counts[type] = String(window.studentServicesStore.ownRecords(type, model.account.email).length); }
            catch { model.counts[type] = "Unavailable"; issues.push(`Your ${type} records could not be read. They were not deleted or replaced.`); }
        }
        return model;
    }
    // One sentence from real progress for the hero.
    function headline(model) {
        if (!model.ready || model.learningError) return model.next.description;
        const t = model.totals, s = model.streak.current;
        if (model.pathDone) return `You completed every ${model.course.name} level. Nicely done.`;
        if (!t.lessonsDone && !model.events.length) return `Your ${model.course.name} path starts here. The first lesson takes a few minutes.`;
        const left = model.level.total - model.level.done;
        const level = left ? `${left} more ${left === 1 ? "lesson" : "lessons"} to finish Level ${model.currentLevel.id}.` : `Level ${model.currentLevel.id} lessons are done. The quiz is next.`;
        return `${s >= 2 ? `${s}-day streak. ` : ""}You have completed ${t.lessonsDone} of ${t.lessonsTotal} ${model.course.name} lessons. ${level}`;
    }
    window.studentOverview = Object.freeze({ build, headline, validLearning });
})();
