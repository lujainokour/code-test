(() => {
    if (window.learningUnavailable) return;
    "use strict";
    const catalog = window.languageCatalog, store = window.studentServicesStore;
    const course = window.pythonCurriculum;
    const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const byId = id => document.getElementById(id);
    function node(tag, text, cls) { const result = document.createElement(tag); if (text !== undefined) result.textContent = text; if (cls) result.className = cls; return result; }
    function read(key) { const raw = window.cmStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
    function action(title, description, label, href) {
        byId("next-title").textContent = title; byId("next-description").textContent = description;
        const link = node("a", label, "button button-primary"); link.href = href; byId("next-actions").replaceChildren(link);
    }
    function render() {
        let currentLevel = course.levels[0];
        try { currentLevel = course.current(course.read()); } catch { /* Reported by the progress reader below. */ }
        const lessonData = currentLevel.lessons;
        const tasks = currentLevel.tasks.map(id => ({ id, title: id.replaceAll("-", " ") }));
        const issues = [];
        let account = null, language = null, preferenceError = false, learning = null, learningError = false;
        try { account = store.session(); } catch { issues.push("Sign in with a valid student demo session to view private activity counts. Existing identity data was not changed."); }
        byId("dashboard-greeting").textContent = account ? `Welcome back, ${account.name.trim().split(/\s+/u)[0]}.` : "Your demo workspace.";
        try {
            const preferences = read("codementor-demo-onboarding");
            if (preferences !== null) {
                if (!object(preferences) || !catalog.has(preferences.language) || !["beginner", "basics", "practising"].includes(preferences.experience) || !["foundations", "problem-solving", "projects"].includes(preferences.goal)) throw new Error("Invalid preferences");
                language = catalog.get(window.cmStorage.activeLanguage());
            }
            if (!language && read("codementor-demo-language") !== null) language = catalog.get(window.cmStorage.activeLanguage());
            byId("selected-language").textContent = language?.name || "Not selected";
        } catch { preferenceError = true; byId("selected-language").textContent = "Unavailable"; issues.push("Saved learning preferences could not be read. They were not replaced."); }
        try {
            learning = read("codementor-demo-learning");
            if (learning !== null && (!object(learning) || learning.version !== 1 || !Array.isArray(learning.lessons) || !learning.lessons.every(value => typeof value === "string") || !Array.isArray(learning.tasks) || !learning.tasks.every(value => typeof value === "string") || !object(learning.assessments) || !Object.values(learning.assessments).every(value => object(value) && typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100))) throw new Error("Invalid learning records");
        } catch { learningError = true; issues.push("Shared learning records could not be read. No progress was deleted or replaced."); }
        const done = !learningError && learning ? lessonData.filter(lesson => learning.lessons.includes(lesson.id)) : [];
        const passed = !learningError && learning ? tasks.filter(task => learning.tasks.includes(task.id)) : [];
        const assessment = !learningError ? learning?.assessments[currentLevel.id] : null;
        const pythonSelected = language?.builtInContent && !preferenceError;
        const levelDone = done.length === lessonData.length && assessment?.score >= 70;
        const completion = Math.round((done.length + (levelDone ? 1 : 0)) / (lessonData.length + 1) * 100);
        const pathDone = !learningError && learning && course.levels.every(level => course.completed(level, learning));
        byId("current-level").textContent = learningError ? "Unavailable" : !pythonSelected ? "Choose a path" : pathDone ? `${course.name} path completed` : `Level ${currentLevel.id} / ${currentLevel.title}`;
        byId("level-progress-label").textContent = pythonSelected && !learningError ? `${completion}% of this level. ${pathDone ? "Review your achievements or build your project." : `${lessonData.length} lessons + a quiz with at least 70%.`}` : `Select a ready language to see its level progress.`;
        byId("level-progress-bar").value = pythonSelected && !learningError ? completion : 0;
        const review = byId("dashboard-review"); review.replaceChildren();
        if (learningError) review.append(node("p", "Saved answers could not be read."));
        else if (!pythonSelected) review.append(node("p", "Choose a ready language to start its lessons."));
        else {
            const plan = window.learningSupport.reviewPlan(learning, course);
            if (!plan.length) review.append(node("p", "No topics need review right now. Continue your next lesson or practise a coding task."));
            else {
                review.append(node("p", `${plan.length} topics to practise, ordered by your saved answers and test results. Start with the first one.`));
                const list = node("ol", undefined, "review-plan");
                plan.forEach((topic, index) => {
                    const item = node("li", undefined, "review-plan-item");
                    item.append(node("h3", topic.title));
                    topic.reasons.forEach(reason => item.append(node("p", reason)));
                    const actions = node("div", undefined, "review-plan-actions");
                    const lesson = node("a", index === 0 ? "Start this review" : "Review lesson", "dashboard-text-link");
                    lesson.href = `lesson.html?lesson=${encodeURIComponent(topic.id)}`; actions.append(lesson);
                    topic.taskIds.forEach(id => {
                        const task = node("a", `Retry ${window.learningSupport.tasks[id].title}`, "dashboard-text-link");
                        task.href = `workspace.html?task=${encodeURIComponent(id)}`; actions.append(task);
                    });
                    item.append(actions); list.append(item);
                });
                review.append(list);
            }
        }
        const totalDone = !learningError && learning ? course.allLessons.filter(lesson => learning.lessons.includes(lesson.id)).length : 0;
        const allTasks = course.levels.flatMap(level => level.tasks);
        const totalTasksDone = !learningError && learning ? allTasks.filter(id => learning.tasks.includes(id)).length : 0;
        byId("recorded-lessons").textContent = learningError ? "Unavailable" : `${totalDone} / ${course.allLessons.length}`;
        byId("recorded-tasks").textContent = learningError ? "Task records unavailable." : `Coding tasks passed: ${totalTasksDone} / ${allTasks.length}. Saved on this device.`;
        byId("level-progress-bar").setAttribute("aria-label", `${course.name} Level ${currentLevel.id} completion`);
        if (learning && !learningError) {
            const unknown = learning.lessons.filter(id => !course.allLessons.some(lesson => lesson.id === id)).length + learning.tasks.filter(id => !course.levels.some(level => level.tasks.includes(id))).length;
            if (unknown) issues.push("Unrecognised learning activities were excluded from these counts; saved records were kept.");
        }
        let placementState = "missing";
        const snapshot = byId("skill-snapshot"); snapshot.replaceChildren();
        const placementLink = byId("placement-link");
        if (preferenceError || !language || !language.builtInContent) {
            byId("placement-score").textContent = preferenceError ? "Unavailable" : !language ? "Choose a language" : "Content not available";
            snapshot.append(node("p", language ? `The ${language.name} full path and placement are coming soon. Stored Python results, if any, are separate shared tab history.` : "Choose valid learning preferences to see matching placement options."));
            placementLink.href = preferenceError ? "../student/profile.html" : language ? `../public/languages.html?language=${language.id}` : "../student/onboarding.html";
            placementLink.textContent = preferenceError ? "Review preferences" : language ? "View content availability" : "Choose learning preferences";
        } else if (!window.placementBanks.get(course.id)) {
            byId("placement-score").textContent = "No placement bank";
            snapshot.append(node("p", `${course.name} placement is not available. Start Level 1; no placement result or skipped levels were inferred.`));
            placementLink.href = "learning-path.html"; placementLink.textContent = "Start this learning path";
        } else {
            placementLink.href = "../student/placement-intro.html"; placementLink.textContent = `Start ${course.name} placement`;
            try {
                const attempt = window.placementStore.read(), questions = window.placementQuestions;
                if (attempt !== null) {
                    if (!object(attempt) || attempt.version !== 1 || !["in-progress", "submitted"].includes(attempt.status) || !Array.isArray(attempt.answers) || attempt.answers.length !== questions.length || !attempt.answers.every((answer, index) => (answer === null && attempt.status === "in-progress") || answer === "unsure" || (Number.isInteger(answer) && answer >= 0 && answer < questions[index].options.length)) || (attempt.status === "in-progress" && (!Number.isInteger(attempt.currentQuestion) || attempt.currentQuestion < 0 || attempt.currentQuestion >= questions.length))) throw new Error("Invalid placement");
                    placementState = attempt.status;
                    if (placementState === "in-progress") {
                        const answered = attempt.answers.filter(value => value !== null).length;
                        byId("placement-score").textContent = `${answered} / ${questions.length} answered`;
                        snapshot.append(node("p", `Your ${course.name} placement attempt is in progress.`)); placementLink.textContent = `Resume ${course.name} placement`;
                    } else {
                        const correct = attempt.answers.filter((answer, index) => answer === questions[index].correct).length;
                        byId("placement-score").textContent = `${correct} / ${questions.length} correct`;
                        const topics = new Map();
                        questions.forEach((question, index) => { const value = topics.get(question.topic) || { correct: 0, total: 0 }; value.total++; if (attempt.answers[index] === question.correct) value.correct++; topics.set(question.topic, value); });
                        topics.forEach((value, topic) => snapshot.append(node("p", `${topic}: ${value.correct} / ${value.total}`)));
                        placementLink.href = "../student/placement-results.html"; placementLink.textContent = "View placement result";
                    }
                } else { byId("placement-score").textContent = "No saved attempt"; snapshot.append(node("p", "Take the optional placement quiz to identify topics to practise.")); }
            } catch {
                placementState = "unavailable"; byId("placement-score").textContent = "Unavailable";
                snapshot.append(node("p", "Saved placement evidence could not be read. Existing answers were kept.")); placementLink.textContent = "Review placement storage issue";
                issues.push("Shared placement data is unavailable; no result was inferred.");
            }
        }
        const levels = byId("dashboard-levels"); levels.replaceChildren();
        const pathLink = byId("path-link"); pathLink.href = language ? `../public/languages.html?language=${language.id}` : "../public/languages.html"; pathLink.textContent = "Browse matching content";
        if (!language || !language.builtInContent) levels.append(node("li", preferenceError ? "Saved path unavailable." : language ? `${language.name}: full path coming soon.` : "No learning language selected."));
        else {
            course.levels.forEach(level => levels.append(node("li", `${level.title}: ${learningError ? "Unavailable" : course.completed(level, learning || {lessons:[],assessments:{}}) ? "Completed" : course.placedOut(level, learning || {lessons:[],assessments:{}}) ? "Placed out — not completed" : course.available(level, learning || {lessons:[],assessments:{}}) ? "Available" : "Complete earlier levels"}`)));
            const choice = course.placementChoice();
            if (choice) levels.append(node("li", `Saved placement start: Level ${choice.startLevel}. Placed-out levels remain open for review and do not count toward completion.`));
            if (assessment) levels.append(node("li", `Current level quiz best score: ${assessment.score}%.`));
            pathLink.href = "../student/learning-path.html"; pathLink.textContent = "View my learning path";
        }
        if (preferenceError) action("Preferences unavailable", "Your saved preferences could not be read. No Python path was selected automatically.", "Review profile settings", "../student/profile.html");
        else if (!language) action("Choose a learning language", "Select your preferences before starting a language-specific activity.", "Choose preferences", "../student/onboarding.html");
        else if (!language.builtInContent) action(`${language.name}: coming soon`, "The full learning path is not available. Browse any locally authored lessons separately.", "Browse language catalogue", `../public/languages.html?language=${language.id}`);
        else if (learningError) action("Learning records unavailable", "Saved progress could not be read. No starting state was inferred and no records were replaced.", "Review shared progress", "../student/progress.html");
        else {
            const nextLesson = lessonData.find(lesson => !done.some(value => value.id === lesson.id));
            const nextTask = tasks.find(task => !passed.some(value => value.id === task.id));
            if (pathDone) action(`${course.name} learning path completed`, `You passed all ${course.levels.length} published levels. Review your progress, practise any topic or continue your projects.`, "View progress", "../student/progress.html");
            else if (!window.subscriptionStore.canAccessLevel(currentLevel.id)) action("Continue with Premium", "Your free Levels 1–5 remain available. Review the Premium preview to continue into Level 6.", "View plans", "../student/subscription.html");
            else if (nextLesson) action(`Continue with ${nextLesson.title}`, "Read the explanation, review the sources and answer the lesson question to save your progress.", "Continue lesson", `../student/lesson.html?lesson=${encodeURIComponent(nextLesson.id)}`);
            else if (nextTask && !pathDone) {
                action(`Practise Level ${currentLevel.id}: ${nextTask.title}`, "Try a coding task before the quiz. Practice is recommended; the level quiz remains available from your level overview.", "Open practice task", `../student/workspace.html?task=${nextTask.id}`);
                const quiz = node("a", "Go to level quiz", "button button-outline"); quiz.href = `level-assessment.html?level=${currentLevel.id}`; byId("next-actions").append(quiz);
            }
            else if (!assessment || assessment.score < 70) action(`Take your Level ${currentLevel.id} quiz`, `Your ${lessonData.length} lessons are complete. Score at least 70% to unlock the next level.`, "Start or retry quiz", `../student/level-assessment.html?level=${currentLevel.id}`);
            else action(`${course.name} learning path completed`, "You passed all published levels. Review your progress or complete the Study Task Manager project.", "View progress", "../student/progress.html");
        }
        ["booking", "request", "draft"].forEach(type => {
            const count = byId(`${type}-count`);
            if (!account) { count.textContent = "Sign in"; return; }
            try { count.textContent = String(store.ownRecords(type, account.email).length); }
            catch { count.textContent = "Unavailable"; issues.push(`Your ${type} records could not be read. They were not deleted or replaced.`); }
        });
        byId("dashboard-message").textContent = issues.join(" "); byId("dashboard-message").classList.toggle("is-error", issues.length > 0);
    }
    render(); window.addEventListener("pageshow", render);
})();
