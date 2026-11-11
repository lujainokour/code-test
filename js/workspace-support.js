(() => {
    if (window.learningUnavailable) return;
    const id = new URLSearchParams(location.search).get("task") || "student-profile";
    const guide = window.learningSupport.tasks[id]; if (!guide) return;
    const hints = document.getElementById("task-hints"), hintButton = document.getElementById("reveal-hint");
    const solutionButton = document.getElementById("reveal-solution"), solution = document.getElementById("task-solution");
    const status = document.getElementById("task-support-status");
    let shown = 0, attempted = false;
    let supportOwner; try { supportOwner = window.cmStorage.captureOwner(); } catch { /* Saving remains blocked. */ }
    function read() {
        const raw = window.cmStorage.getItem("codementor-demo-learning");
        const value = raw === null ? { version: 1, lessons: [], tasks: [], assessments: {} } : JSON.parse(raw);
        if (value?.version !== 1 || !Array.isArray(value.lessons) || !Array.isArray(value.tasks) || !value.assessments || typeof value.assessments !== "object" || Array.isArray(value.assessments)) throw new Error("Saved learning support is unavailable. Existing records were kept.");
        return value;
    }
    function save(change) {
        try {
            window.cmStorage.assertOwner(supportOwner);
            const progress = read();
            progress.support = { ...progress.support, [id]: { ...progress.support?.[id], ...change } };
            window.cmStorage.setItem("codementor-demo-learning", JSON.stringify(progress));
        } catch (error) { status.textContent = error.message; }
    }
    function render() {
        hints.replaceChildren();
        guide.hints.slice(0, shown).forEach(text => { const item = document.createElement("li"); item.textContent = text; hints.append(item); });
        hintButton.disabled = shown >= guide.hints.length;
        hintButton.textContent = shown >= guide.hints.length ? "All hints revealed" : `Show hint ${shown + 1} of ${guide.hints.length}`;
        solutionButton.disabled = !attempted;
        document.getElementById("solution-help").textContent = attempted ? "Compare the explanation with your approach. Viewing a solution does not complete the task." : "Run your own code or submit a solution once to unlock the explained solution.";
    }
    try {
        const progress = read(), saved = progress.support?.[id];
        shown = Number.isInteger(saved?.hintsUsed) ? Math.max(0, Math.min(guide.hints.length, saved.hintsUsed)) : 0;
        attempted = saved?.attempted === true || Array.isArray(progress.taskResults?.[id]?.cases);
    } catch (error) { status.textContent = error.message; }
    hintButton.addEventListener("click", () => { shown = Math.min(guide.hints.length, shown + 1); save({ hintsUsed: shown }); render(); });
    solutionButton.addEventListener("click", () => {
        if (!attempted) return;
        const opening = solution.hidden; solution.hidden = !opening;
        solutionButton.setAttribute("aria-expanded", String(opening));
        solutionButton.textContent = opening ? "Hide explained solution" : "Show explained solution";
        if (opening) save({ solutionViewed: true });
    });
    document.getElementById("task-solution-code").textContent = guide.solution;
    document.getElementById("task-solution-explanation").textContent = guide.explanation;
    window.addEventListener("task-attempt-recorded", event => {
        if (event.detail?.taskId !== id) return;
        attempted = true; save({ attempted: true }); render();
    });
    render();
})();
