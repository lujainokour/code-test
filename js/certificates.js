(() => {
    if (window.learningUnavailable) return;
    "use strict";
    const course = window.pythonCurriculum;
    // Preserve the existing Foundations award when the curriculum grows.
    // New levels must never silently revoke a previously earned milestone.
    const certificateLevels = course.levels.filter(level => level.id <= 3);
    const button = document.getElementById("print-certificate");
    const byId = id => document.getElementById(id);
    function readState() {
        const raw = window.cmStorage.getItem("codementor-demo-session");
        const account = raw === null ? null : JSON.parse(raw);
        const signedIn = account?.role === "student" && account.isDemo === true && typeof account.email === "string" && Boolean(account.email.trim()) && typeof account.name === "string" && Boolean(account.name.trim());
        const progress = course.read();
        const tasks = certificateLevels.flatMap(level => level.tasks);
        const lessonsDone = certificateLevels.flatMap(level => level.lessons).every(lesson => progress.lessons.includes(lesson.id));
        const quizzesDone = certificateLevels.every(level => course.completed(level, progress));
        const tasksDone = tasks.every(id => progress.tasks.includes(id));
        const timestamps = [...certificateLevels.map(level => progress.assessments[level.id]?.submittedAt), ...tasks.map(id => progress.taskResults?.[id]?.submittedAt)].map(value => Date.parse(value)).filter(Number.isFinite);
        return { account, signedIn, lessonsDone, quizzesDone, tasksDone, ready: signedIn && lessonsDone && quizzesDone && tasksDone, date: timestamps.length ? new Date(Math.max(...timestamps)) : null };
    }
    function render() {
        button.disabled = true; document.body.classList.add("certificate-locked");
        try {
            const state = readState();
            const requirements = byId("certificate-requirements"); requirements.replaceChildren();
            [[state.signedIn, "Sign in with your student profile"], [state.lessonsDone, `Complete all ${certificateLevels.flatMap(level => level.lessons).length} ${course.name} lessons`], [state.quizzesDone, "Pass each level quiz with at least 70%"], [state.tasksDone, "Pass all 6 coding tasks, including the Study Task Manager project"]].forEach(([done, label]) => {
                const item = document.createElement("li"); item.textContent = `${done ? "Done" : "Remaining"}: ${label}`; requirements.append(item);
            });
            byId("certificate-recipient").textContent = state.signedIn ? state.account.name.trim() : "Your name";
            byId("certificate-recipient").classList.toggle("certificate-name-long", state.signedIn && state.account.name.trim().length > 32);
            byId("certificate-status-title").textContent = state.ready ? "Your certificate is ready" : "Your certificate is ahead";
            byId("certificate-status-description").textContent = state.ready ? "Your saved records meet the completion requirements. Print your certificate or save it as a PDF." : "Preview the design below. Printing becomes available after completing the remaining requirements.";
            byId("certificate-date").textContent = state.ready && state.date ? state.date.toLocaleDateString("en-GB", {day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Amman"}) : state.ready ? "Completion date not recorded" : "—";
            if (state.ready && state.date) byId("certificate-date").dateTime = state.date.toISOString(); else byId("certificate-date").removeAttribute("datetime");
            byId("certificate-preview-label").textContent = state.ready ? "PLATFORM COMPLETION · BROWSER LEARNING RECORDS" : "PREVIEW — COMPLETE THE REQUIREMENTS TO PRINT";
            button.disabled = !state.ready;
            document.body.classList.toggle("certificate-locked", !state.ready);
            byId("workspace-message").textContent = "";
        } catch {
            byId("certificate-status-title").textContent = "Certificate unavailable";
            byId("workspace-message").textContent = "Your saved profile or progress could not be read. Existing records were kept.";
            byId("certificate-recipient").textContent = "Your name";
            byId("certificate-date").textContent = "—";
            byId("certificate-preview-label").textContent = "PREVIEW — SAVED RECORDS UNAVAILABLE";
        }
    }
    button.addEventListener("click", () => { render(); if (!button.disabled) window.print(); });
    window.addEventListener("beforeprint", render);
    window.addEventListener("pageshow", render);
    window.addEventListener("learning-progress-changed", render);
    render();
})();
