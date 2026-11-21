(() => {
    if (window.learningUnavailable) return;
    "use strict";
    const report = document.getElementById("learning-report");
    const status = document.getElementById("report-message");
    const print = document.getElementById("print-report");
    const labels = window.languageCatalog.labels;
    const lessons = Object.fromEntries(window.pythonCurriculum.allLessons.map(lesson => [lesson.id, lesson.title]));
    const tasks = { "student-profile": "Create a student profile", receipt: "Build a simple receipt", "grade-checker": "Check a grade", "sum-numbers": "Sum a range", "list-summary": "Summarise a list", "task-manager": "Study Task Manager project" };
    Object.keys(tasks).forEach(id => delete tasks[id]);
    Object.assign(tasks, Object.fromEntries(Object.values(window.pythonCurriculum.tasks).map(task => [task.id, task.title])));
    const object = value => value && typeof value === "object" && !Array.isArray(value);
    function read(key) {
        const raw = window.cmStorage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
    }
    function add(tag, value, parent = report) { const node = document.createElement(tag); node.textContent = value; parent.append(node); return node; }
    function list(title, values, empty) {
        add("h2", title);
        if (!values.length) { add("p", empty); return; }
        const ul = add("ul", ""); values.forEach(value => add("li", value, ul));
    }
    function load() {
        report.hidden = true; print.disabled = true; report.replaceChildren(); status.textContent = ""; status.classList.remove("is-error");
        try {
            const session = read("codementor-demo-session");
            if (!object(session) || session.role !== "student" || session.isDemo !== true || typeof session.name !== "string" || !session.name.trim()) {
                status.textContent = "Sign in to a student demo account to view your learning report."; return;
            }
            const preferences = read("codementor-demo-onboarding");
            if (preferences !== null && (!object(preferences) || !Object.hasOwn(labels, preferences.language))) throw new Error("Invalid preferences");
            const learning = read("codementor-demo-learning");
            if (learning !== null && (!object(learning) || learning.version !== 1 || !Array.isArray(learning.lessons) || !learning.lessons.every(value => typeof value === "string") || !Array.isArray(learning.tasks) || !learning.tasks.every(value => typeof value === "string") || !object(learning.assessments))) throw new Error("Invalid learning data");
            if (learning && !Object.values(learning.assessments).every(value => object(value) && typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100)) throw new Error("Invalid assessment data");
            add("p", "CODEMENTOR AI · FRONTEND DEMO", report).className = "eyebrow";
            add("h1", "Learning Report"); add("p", `Student: ${session.name.trim()}`);
            add("p", `Selected path: ${preferences || read("codementor-demo-language") ? labels[window.cmStorage.activeLanguage()] : "Not selected"}`);
            add("p", `Prepared: ${new Date().toLocaleString("en-GB")}`);
            add("p", "This report contains browser-tab demo records, which may be manually changed and are not verified achievements. It is not an official certificate.").className = "services-notice";
            add("p", "Learning records are saved on this device for the current demo profile. They are not synced to a server or verified by an instructor.");
            const choice = window.pythonCurriculum.placementChoice();
            if (choice) {
                add("p", `Placement starting choice: Level ${choice.startLevel}. This is separate from completed work.`);
                list("Placed out — not completed", window.pythonCurriculum.levels.filter(level => window.pythonCurriculum.placedOut(level, learning || { lessons: [], assessments: {} })).map(level => level.title), "No uncompleted levels are currently placed out.");
            }
            const done = learning ? Object.keys(lessons).filter(id => learning.lessons.includes(id)) : [];
            const passed = learning ? Object.keys(tasks).filter(id => learning.tasks.includes(id)) : [];
            add("h2", "Available progress");
            if (!learning) add("p", "No learning progress has been saved in this tab.");
            else {
                add("p", `${window.pythonCurriculum.name} lessons completed: ${done.length} of ${Object.keys(lessons).length}. Coding tasks passed: ${passed.length} of ${Object.keys(tasks).length}.`);
                // Slice 3: each lesson says how it was completed (check passed / task passed / self-checked), from the shared domain rules.
                const kindOf = id => window.cmDomain.learning.lessonEvidence(learning, id, window.pythonCurriculum.taskTopics), evidenceUi = window.cmUi.evidence;
                list("Recorded lessons", done.map(id => `${lessons[id]} (${evidenceUi.label(kindOf(id))})`), "No completed lessons recorded.");
                list("Recorded tasks", passed.map(id => tasks[id]), "No passed tasks recorded.");
                const known = window.pythonCurriculum.levels.map(level => String(level.id));
                list("Saved assessment results", known.filter(id => Object.hasOwn(learning.assessments, id)).map(id => { const quiz = window.cmDomain.learning.quizSummary(learning, Number(id)); return `Level ${id}: best ${quiz.best}% · last ${quiz.last}% · ${quiz.hasHistory ? `${quiz.attempts} recorded ${quiz.attempts === 1 ? "attempt" : "attempts"}` : "earlier attempts not recorded"} (saved demo result)`; }), "No assessment scores recorded.");
                const unknown = learning.lessons.filter(id => !Object.hasOwn(lessons, id)).length + learning.tasks.filter(id => !Object.hasOwn(tasks, id)).length;
                if (unknown) add("p", `${unknown} unrecognised activity records were excluded from this summary. Saved data was not changed.`);
            }
            list("Skills and topics studied", done.map(id => `${lessons[id]} — ${kindOf(id) === "self_checked" ? "self-checked" : "assessed by a lesson check or coding task in this browser"}, a demo record and not verified proficiency`), "No completed lesson evidence is available to summarise skills.");
            add("h2", "Projects");
            add("p", learning?.tasks.includes("task-manager") ? "Study Task Manager: passed the automated browser checks." : "Study Task Manager: no passing solution recorded yet. Build and submit the project in the coding workspace.");
            add("h2", "Report scope");
            add("p", "Source: demo identity, selected learning path and learning activities saved on this device. Age, email, password and private requests are excluded. No official certificates are inferred.");
            report.hidden = false; print.disabled = false;
        } catch {
            report.replaceChildren();
            status.textContent = "Your saved report data could not be read. No records were deleted or replaced. Check your profile and progress before trying again.";
            status.classList.add("is-error");
        }
    }
    print.addEventListener("click", () => { if (!print.disabled) window.print(); });
    window.addEventListener("pageshow", load);
})();

