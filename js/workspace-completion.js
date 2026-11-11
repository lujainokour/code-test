(() => {
    if (window.learningUnavailable) return;
    const id = new URLSearchParams(location.search).get("task") || "student-profile";
    if (!window.pythonWorkspaceTasks?.[id]) return;
    const panel = document.getElementById("submission-completion");
    const download = document.getElementById("download-submission");
    const editor = document.getElementById("code-editor");
    function state() {
        const progress = window.pythonCurriculum.read();
        const latest = progress.taskResults?.[id];
        const stored = progress.submissions?.[id];
        const valid = value => value && typeof value.code === "string" && Number.isInteger(value.total) && value.total > 0 && value.passed === value.total;
        const submission = valid(stored) ? stored : valid(latest) ? latest : null;
        return { progress, submission, completed: progress.tasks.includes(id) };
    }
    function render() {
        try {
            const { progress, submission, completed } = state();
            panel.hidden = !completed;
            if (!completed) return;
            document.getElementById("submission-completion-title").textContent = id === "task-manager" ? "Project completed!" : "Task completed!";
            document.getElementById("submission-completion-description").textContent = submission
                ? `All ${submission.total} checks passed. Your passing code and completion are saved on this device for your demo profile. You can reopen this page or download your submission below.`
                : "Completion was previously recorded on this device. No passing code snapshot is available; submit a passing solution again to save a downloadable copy.";
            download.disabled = !submission;
            document.getElementById("submission-draft-note").textContent = submission && submission.code !== editor.value ? "Your editor draft has changed. The download contains your last passing submission. Submit again to check your changes." : "Saving a draft is separate from submitting. Returning to this page restores your saved completion.";
            const course = window.pythonCurriculum;
            const eligible = course.levels.filter(level => level.id <= 3).every(level => course.completed(level, progress) && level.tasks.every(taskId => progress.tasks.includes(taskId)));
            document.getElementById("submission-certificate-link").textContent = eligible ? "View your Completion badge (local demo)" : "Check Completion badge (local demo) requirements";
        } catch { panel.hidden = true; download.disabled = true; }
    }
    download.addEventListener("click", () => {
        try {
            const { submission } = state(); if (!submission) return;
            const url = URL.createObjectURL(new Blob([submission.code], { type: window.pythonCurriculum.id === "python" ? "text/x-python;charset=utf-8" : "text/javascript;charset=utf-8" }));
            const link = document.createElement("a"); link.href = url; link.download = `${id}-submitted.${window.pythonCurriculum.extension}`; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { document.getElementById("submission-draft-note").textContent = "Saved submission could not be read. Your records were kept."; }
    });
    window.addEventListener("learning-progress-changed", render);
    window.addEventListener("pageshow", render);
    editor.addEventListener("input", render);
    render();
})();
